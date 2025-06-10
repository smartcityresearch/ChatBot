import pytest
from fastapi.testclient import TestClient
import sys
import os
import json
import pytz
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
import asyncio
import aiohttp

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from chatbot import app, detect_temporal_query, extract_parameter_from_query, process_query

client = TestClient(app)

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Smart City API is running. Use /query endpoint to get sensor data."}

@patch('chatbot.process_query')
def test_query_get(mock_process):
    mock_process.return_value = {
        "classification": "SPECIFIC",
        "node_ids": ["aq-01"],
        "node_data": {},
        "response": "Test response",
        "is_temporal": False,
        "time_period": None
    }
    response = client.get("/query?q=test")
    assert response.status_code == 200
    assert "response" in response.json()

@patch('chatbot.process_query')
def test_query_post(mock_process):
    mock_process.return_value = {
        "classification": "SPECIFIC",
        "node_ids": ["aq-01"],
        "node_data": {},
        "response": "Test response",
        "is_temporal": False,
        "time_period": None
    }
    response = client.post("/query", json={"query": "test"})
    assert response.status_code == 200
    assert "response" in response.json()

@patch('chatbot.MistralClient')
@patch('chatbot.fetch_node_data')
def test_process_query_average(mock_fetch, mock_mistral):
    mock_fetch.return_value = {"temperature": 25}
    mock_chat = MagicMock()
    mock_chat.choices = [MagicMock(message=MagicMock(content="Test response"))]
    mock_mistral.return_value.chat.return_value = mock_chat
    
    response = client.post("/query", json={"query": "What is the average temperature?"})
    assert response.status_code == 200

def test_detect_temporal_query():
    assert detect_temporal_query("What was the temperature last week")[0] == True
    assert detect_temporal_query("What is the current temperature")[0] == False

def test_extract_parameter():
    assert extract_parameter_from_query("What is the temperature?") == "temperature"
    assert extract_parameter_from_query("Show me PM2.5 levels") == "pm25"
    assert extract_parameter_from_query("Invalid query") == None

@patch('chatbot.process_query')
def test_query_post_full(mock_process):
    mock_process.return_value = {
        "classification": "SPECIFIC",
        "node_ids": ["aq-01"],
        "node_data": {},
        "response": "Test response",
        "is_temporal": True,
        "time_period": "week"
    }
    response = client.post("/query/full", json={"query": "test"})
    assert response.status_code == 200
    assert "classification" in response.json()
    assert "is_temporal" in response.json()

@patch('chatbot.MistralClient')
def test_debug_endpoint(mock_mistral):
    mock_chat = MagicMock()
    mock_chat.choices = [MagicMock(message=MagicMock(content='{"classification": "SPECIFIC", "node_ids": ["aq-01"]}'))]
    mock_mistral.return_value.chat.return_value = mock_chat
    
    response = client.get("/debug?q=test")
    assert response.status_code == 200
    assert "query" in response.json()
    assert "parsed_response" in response.json()

def test_invalid_requests():
    response = client.get("/query")
    assert response.status_code == 422
    
    response = client.post("/query", json={})
    assert response.status_code == 422
    
    response = client.post("/query/full", json={"invalid": "data"})
    assert response.status_code == 422

@patch('chatbot.fetch_node_status')
def test_node_status_query(mock_status):
    mock_status.return_value = {"status": "active", "last_seen": "2024-03-19T10:00:00Z"}
    response = client.post("/query", json={"query": "What is the status of node aq-01?"})
    assert response.status_code == 200

@patch('chatbot.fetch_historical_data')
def test_temporal_data_processing(mock_fetch):
    mock_data = {
        "aq-01": {
            "filtered_data": {
                "data": [
                    {"timestamp": "2024-03-19T10:00:00Z", "temperature": 25}
                ]
            }
        }
    }
    mock_fetch.return_value = mock_data
    response = client.post("/query/full", json={"query": "What was the temperature last week?"})
    assert response.status_code == 200

@patch('chatbot.fetch_average_data')
def test_average_data_processing(mock_avg):
    mock_avg.return_value = {"aq": {"temperature": 25, "humidity": 60}}
    response = client.post("/query", json={"query": "What is the average temperature?"})
    assert response.status_code == 200

@patch('chatbot.load_prompt_files')
def test_load_prompt_files(mock_load):
    mock_load.return_value = {
        'merge': 'test merge',
        'node_id': 'test node id',
        'prompt2': 'test prompt2',
        'classifier': 'test classifier',
        'specific': 'test specific',
        'generic': 'test generic',
        'living_lab': 'test living lab',
        'temporal': 'test temporal'
    }
    response = client.get("/query?q=test")
    assert response.status_code == 200

@patch('chatbot.prepare_system_prompt')
def test_prepare_system_prompt(mock_prepare):
    mock_prepare.return_value = "Test system prompt"
    response = client.get("/query?q=test")
    assert response.status_code == 200

@patch('chatbot.generate_response')
def test_generate_response(mock_generate):
    mock_generate.return_value = "Test response"
    response = client.post("/query", json={"query": "test"})
    assert response.status_code == 200

def test_date_range_generation():
    from chatbot import get_date_range
    from datetime import datetime, timedelta
    import pytz
    
    # Test day range
    from_date, to_date = get_date_range("day")
    now = datetime.now(pytz.UTC)
    assert (now - datetime.strptime(from_date, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=pytz.UTC)).days == 1
    
    # Test week range
    from_date, to_date = get_date_range("week")
    assert (now - datetime.strptime(from_date, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=pytz.UTC)).days == 7

@patch('chatbot.fetch_historical_data')
@patch('chatbot.fetch_todays_data')
def test_temporal_comparison(mock_today, mock_historical):
    mock_historical.return_value = {
        "aq-01": {
            "filtered_data": {
                "data": [{"timestamp": "2024-03-12T10:00:00Z", "temperature": 20}]
            }
        }
    }
    mock_today.return_value = {
        "aq-01": {
            "filtered_data": {
                "data": [{"timestamp": "2024-03-19T10:00:00Z", "temperature": 25}]
            }
        }
    }
    response = client.post("/query/full", json={
        "query": "Compare temperature from last week with today"
    })
    assert response.status_code == 200

@patch('chatbot.process_query')
def test_error_handling(mock_process):
    mock_process.side_effect = Exception("Test error")
    response = client.post("/query", json={"query": "test"})
    assert response.status_code == 500

def test_concurrent_requests():
    responses = [
        client.get("/query?q=test1"),
        client.get("/query?q=test2"),
        client.get("/query?q=test3")
    ]
    assert all(response.status_code in [200, 422] for response in responses)

@patch('requests.get')
def test_api_integration(mock_get):
    mock_get.return_value.status_code = 200
    mock_get.return_value.json.return_value = {"temperature": 25}
    
    response = client.post("/query", json={
        "query": "What is the current temperature?"
    })
    assert response.status_code == 200

@patch('chatbot.generate_node_status_response')
def test_node_status_response(mock_status_response):
    mock_status_response.return_value = "Node aq-01 is active"
    response = client.post("/query/full", json={
        "query": "What is the status of all nodes?"
    })
    assert response.status_code == 200

@patch('chatbot.extract_response_data')
def test_malformed_llm_response(mock_extract):
    mock_extract.return_value = None
    response = client.post("/query", json={"query": "test"})
    assert response.status_code in [200, 500]

def test_parameter_combinations():
    test_queries = [
        "What is the temperature and humidity?",
        "Show me PM2.5 and PM10 levels",
        "Get temperature, humidity, and noise levels"
    ]
    for query in test_queries:
        response = client.post("/query", json={"query": query})
        assert response.status_code == 200

@patch('chatbot.fetch_node_data')
def test_empty_node_data(mock_fetch):
    mock_fetch.return_value = {}
    response = client.post("/query/full", json={
        "query": "What are the current readings?"
    })
    assert response.status_code == 200

def test_query_validation():
    long_query = "a" * 1000
    response = client.post("/query", json={"query": long_query})
    assert response.status_code == 200
    
    empty_query = ""
    response = client.post("/query", json={"query": empty_query})
    assert response.status_code == 422

@patch('chatbot.process_query')
def test_response_structure(mock_process):
    mock_process.return_value = {
        "classification": "SPECIFIC",
        "node_ids": ["aq-01"],
        "node_data": {"aq-01": {"temperature": 25}},
        "response": "Test response",
        "is_temporal": True,
        "time_period": "week",
        "todays_data": {"aq-01": {"temperature": 26}}
    }
    response = client.post("/query/full", json={"query": "test"})
    assert response.status_code == 200
    data = response.json()
    assert all(key in data for key in ["classification", "node_ids", "node_data", "response"])

@patch('chatbot.detect_temporal_query')
@patch('chatbot.detect_status_query')
@patch('chatbot.detect_average_query')
def test_query_detection(mock_avg, mock_status, mock_temporal):
    mock_avg.return_value = True
    mock_status.return_value = False
    mock_temporal.return_value = (False, None)
    
    response = client.post("/query", json={
        "query": "What is the average temperature?"
    })
    assert response.status_code == 200
    
    mock_avg.return_value = False
    mock_status.return_value = True
    response = client.post("/query", json={
        "query": "What is the status of node aq-01?"
    })
    assert response.status_code == 200

@patch('chatbot.fetch_node_data')
def test_fetch_node_data_error(mock_fetch):
    mock_fetch.side_effect = Exception("API Error")
    response = client.post("/query", json={"query": "What is node aq-01 reading?"})
    assert response.status_code == 200
    assert "error" in response.json()["response"].lower()

@patch('chatbot.fetch_historical_data')
def test_fetch_historical_data_empty(mock_fetch):
    mock_fetch.return_value = {}
    response = client.post("/query/full", json={
        "query": "What was the temperature last week?"
    })
    assert response.status_code == 200
    assert "no data" in response.json()["response"].lower()

def test_date_range_all_periods():
    from chatbot import get_date_range
    periods = ["day", "week", "month", "year", "today", "invalid"]
    for period in periods:
        from_date, to_date = get_date_range(period)
        assert from_date is not None
        assert to_date is not None
        assert isinstance(from_date, str)
        assert isinstance(to_date, str)

@patch('chatbot.load_prompt_files')
def test_load_prompt_files_error(mock_load):
    mock_load.side_effect = FileNotFoundError("File not found")
    response = client.get("/query", params={"q": "test query"})
    assert response.status_code == 500

def test_process_temporal_data_empty():
    from chatbot import process_temporal_data
    empty_data = {"node1": {"filtered_data": {}}}
    result = process_temporal_data(empty_data)
    assert result["node1"] == {"error": "No data available"}

@patch('chatbot.MistralClient')
def test_malformed_llm_response(mock_mistral):
    mock_chat = MagicMock()
    mock_chat.choices = [MagicMock(message=MagicMock(content="Invalid JSON response"))]
    mock_mistral.return_value.chat.return_value = mock_chat
    
    response = client.post("/query", json={"query": "test query"})
    assert response.status_code == 200

def test_extract_parameter_edge_cases():
    params = [
        "What is the NON_EXISTENT_PARAM?",
        "",
        "Show me multiple parameters temperature and humidity",
        "123456789"
    ]
    for param in params:
        result = extract_parameter_from_query(param)
        assert result is None or isinstance(result, str)

@patch('chatbot.fetch_average_data')
def test_average_data_error(mock_avg):
    mock_avg.side_effect = Exception("API Error")
    response = client.post("/query", json={
        "query": "What is the average temperature?"
    })
    assert response.status_code == 200
    assert "error" in response.json()["response"].lower()

def test_query_validation_edge_cases():
    test_cases = [
        {"query": "?" * 1000},  # Very long query
        {"query": ""},  # Empty query
        {"query": "   "},  # Whitespace only
        {"query": "123"}  # Numbers only
    ]
    for case in test_cases:
        response = client.post("/query", json=case)
        assert response.status_code in [200, 422]

def test_concurrent_requests_stress():
    responses = []
    for _ in range(5):
        response = client.post("/query", json={"query": "test"})
        responses.append(response)
    assert all(response.status_code == 200 for response in responses)

@patch('chatbot.fetch_node_status')
def test_node_status_error(mock_status):
    mock_status.side_effect = Exception("Status API Error")
    response = client.post("/query", json={
        "query": "What is the status of node aq-01?"
    })
    assert response.status_code == 200
    response_data = response.json()
    assert "error" in response_data["response"].lower() or "failed" in response_data["response"].lower()

def test_process_query_invalid_json():
    from chatbot import process_query
    with pytest.raises((Exception, ValueError, TypeError)):
        process_query("")
    with pytest.raises((Exception, ValueError, TypeError)):
        process_query(None)

@patch('chatbot.generate_response')
def test_response_encoding(mock_generate):
    mock_generate.return_value = "Temperature: 25°C"
    response = client.post("/query", json={"query": "What is the temperature?"})
    assert response.status_code == 200
    assert "Â°C" not in response.json()["response"]
    assert "°C" in response.json()["response"]

@patch('chatbot.process_temporal_data')
def test_process_temporal_data_error(mock_process):
    mock_process.side_effect = ValueError("Invalid data format")
    from chatbot import process_temporal_data
    test_data = {"node1": {"filtered_data": "invalid"}}
    with pytest.raises(ValueError):
        process_temporal_data(test_data)

def test_extract_response_data_variations():
    from chatbot import extract_response_data
    test_cases = [
        '{"classification": "SPECIFIC", "node_ids": ["aq-01"]}',
        'CLASSIFICATION: SPECIFIC\nNode IDs: ["aq-01"]',
        'Invalid response without JSON',
        ""
    ]
    for case in test_cases:
        result = extract_response_data(case)
        assert isinstance(result, dict)
        assert "classification" in result
        assert "node_ids" in result

@patch('chatbot.MistralClient')
def test_mistral_api_error(mock_mistral):
    mock_mistral.return_value.chat.side_effect = Exception("API Error")
    response = client.post("/query", json={"query": "test query"})
    assert response.status_code == 200
    response_data = response.json()
    assert any(word in response_data["response"].lower() for word in ["error", "failed", "couldn't", "unable"])

@pytest.mark.asyncio
async def test_async_operations():
    async def make_request(query):
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "http://testserver/query",
                json={"query": query}
            ) as response:
                return await response.json()
    
    queries = [
        "What is the temperature?",
        "What was the humidity last week?",
        "Show me PM2.5 levels",
        "Get node status"
    ]
    
    tasks = [make_request(q) for q in queries]
    responses = await asyncio.gather(*tasks, return_exceptions=True)
    
    assert len(responses) == len(queries)
    for resp in responses:
        if not isinstance(resp, Exception):
            assert "response" in resp

def test_parameter_extraction_comprehensive():
    test_cases = {
        "What is the temperature?": "temperature",
        "Show me PM2.5 levels": "pm25",
        "Current humidity": "relative_humidity",
        "What's the noise level?": "noise",
        "Check AQI": "aqi",
        "Get AQL": "aql",
        "Invalid parameter": None,
        "Multiple params temperature and pm10": "temperature"
    }
    for query, expected in test_cases.items():
        result = extract_parameter_from_query(query)
        assert result == expected

@patch('chatbot.fetch_node_data')
@patch('chatbot.fetch_node_status')
def test_mixed_data_sources(mock_status, mock_data):
    mock_status.return_value = {"status": "active"}
    mock_data.return_value = {"temperature": 25}
    
    response = client.post("/query/full", json={
        "query": "What is the status and temperature of node aq-01?"
    })
    assert response.status_code == 200
    data = response.json()
    assert "node_data" in data
    assert "response" in data

def test_generate_response_formats():
    from chatbot import generate_response
    prompts = {
        'specific': 'Test specific prompt {query} {data}',
        'generic': 'Test generic prompt {query} {data}',
        'temporal': 'Test temporal prompt {query} {data} {time_period}',
        'living_lab': 'Test living lab prompt {query}'
    }
    
    test_cases = [
        ("SPECIFIC", False, None),
        ("GENERIC", False, None),
        ("GENERIC WITH PARAMETER INFERENCE", False, None),
        ("LIVING_LAB", False, None),
        ("SPECIFIC", True, "week")
    ]
    
    for classification, is_temporal, time_period in test_cases:
        with patch('chatbot.MistralClient') as mock_mistral:
            mock_chat = MagicMock()
            mock_chat.choices = [MagicMock(message=MagicMock(content="Test response"))]
            mock_mistral.return_value.chat.return_value = mock_chat
            
            response = generate_response(
                prompts,
                classification,
                "test query",
                {"node1": {"data": "test"}},
                is_temporal,
                time_period
            )
            assert isinstance(response, str)
            assert len(response) > 0