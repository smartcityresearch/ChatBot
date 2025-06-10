import json
import requests
import os
from fastapi import FastAPI, Query, Body, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from mistralai.client import MistralClient
from mistralai.models.chat_completion import ChatMessage
import re
import uvicorn
import dotenv
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
import pytz

# Load environment variables
dotenv.load_dotenv()

# Initialize Mistral client
api_key = os.getenv("MISTRAL_API_KEY")
client = MistralClient(api_key=api_key)

# Initialize FastAPI app
app = FastAPI(title="Smart City API", description="API for querying smart city sensor data")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Define request and response models
class QueryRequest(BaseModel):
    query: str

class SimpleResponse(BaseModel):
    response: str

class NodeData(BaseModel):
    node_id: str
    data: Dict[str, Any]

class QueryResponse(BaseModel):
    classification: str
    node_ids: List[str]
    node_data: Dict[str, Any]
    response: str
    is_temporal: bool = False
    time_period: Optional[str] = None

# Load the text files
def load_prompt_files():
    prompts = {}
    # Load merge.txt
    with open('mergefinal.txt', 'r') as file:
        prompts['merge'] = file.read()
    
    # Load node id.txt
    with open('node id.txt', 'r') as file:
        prompts['node_id'] = file.read()
    
    # Load prompt2.txt
    with open('prompt2final.txt', 'r') as file:
        prompts['prompt2'] = file.read()
    
    # Load classification prompt
    with open('prompt_classifier.txt', 'r') as file:
        prompts['classifier'] = file.read()
    
    # Load specific query response prompt
    with open('prompt_specific.txt', 'r') as file:
        prompts['specific'] = file.read()
    
    # Load generic query response prompt
    with open('prompt_generic.txt', 'r') as file:
        prompts['generic'] = file.read()
    
    # Load living lab response prompt
    with open('prompt_living_lab.txt', 'r') as file:
        prompts['living_lab'] = file.read()
    
    # Load temporal query response prompt
    try:
        with open('prompt_temporal.txt', 'r') as file:
            prompts['temporal'] = file.read()
    except FileNotFoundError:
        # Use a default prompt if file doesn't exist
        prompts['temporal'] = """
You are a smart city data analyst assistant. The user has asked a question about historical data. 
Please analyze the provided temporal data and answer the user's query: {query}

Here is the historical data for the requested time period ({time_period}):
{data}

Today's latest readings are also included:
{today_data}

Provide a clear, concise answer that MUST include:
1. A summary of the data trends over the requested time period
2. Key insights or anomalies if present
3. STATISTICAL INFORMATION including:
   - Minimum values for each parameter with timestamps when they occurred
   - Maximum values for each parameter with timestamps when they occurred  
   - Average values for each parameter over the time period
4. Comparisons between different time points if applicable
5. Comparison with today's latest readings

Your response should be informative and focused on providing statistical insights from the data.
"""
    
    return prompts

# Prepare system prompt for classification
def prepare_system_prompt(prompts):
    system_prompt = f"""
You are a smart city query classifier and response system. 
Your task is to analyze user queries about the smart city sensor network, classify them, and provide appropriate responses using the correct node data sources.
Here is the classification system:
{prompts['merge']}
Here is additional information about node IDs:
{prompts['node_id']}
Here is detailed information about the naming conventions and parameters:
{prompts['prompt2']}
When a user asks a question, you should:
1. Classify the query as SPECIFIC, GENERIC, GENERIC WITH PARAMETER INFERENCE, or LIVING_LAB
2. Identify the relevant node IDs based on the classification and mappings
3. Determine if the query is about historical/temporal data (past day, week, month, year)
4. Return ONLY a JSON object with the following structure:
{{
    "classification": "SPECIFIC / GENERIC / GENERIC WITH PARAMETER INFERENCE / LIVING_LAB",
    "node_ids": ["node_id_1", "node_id_2", ...],
    "is_temporal": true/false,
    "time_period": "day"/"week"/"month"/"year"/null
}}
Do not include any other text or explanation in your response, just the JSON object.
"""
    return system_prompt

# Query the Mistral API for classification
def query_mistral_classification(system_prompt, user_query):
    messages = [
        ChatMessage(role="system", content=system_prompt),
        ChatMessage(role="user", content=user_query)
    ]
    
    response = client.chat(
        model="mistral-large-latest",
        messages=messages
    )
    
    return response.choices[0].message.content

# Detect temporal queries and extract time period
def detect_temporal_query(user_query):
    # Define patterns to detect time-related queries
    day_pattern = r"(past|last|previous|yesterday\(\'s\)?)\s+(day|24\s+hours)"
    week_pattern = r'(past|last|previous)\s+(week|7\s+days)'
    month_pattern = r'(past|last|previous)\s+(month|30\s+days)'
    year_pattern = r'(past|last|previous)\s+(year|12\s+months|365\s+days)'
    
    if re.search(day_pattern, user_query, re.IGNORECASE):
        return True, "day"
    elif re.search(week_pattern, user_query, re.IGNORECASE):
        return True, "week"
    elif re.search(month_pattern, user_query, re.IGNORECASE):
        return True, "month"
    elif re.search(year_pattern, user_query, re.IGNORECASE):
        return True, "year"
    else:
        return False, None

# Function to generate date ranges based on time period
def get_date_range(time_period):
    now = datetime.now(pytz.UTC)
    
    if time_period == "day":
        from_date = (now - timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
    elif time_period == "week":
        from_date = (now - timedelta(weeks=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
    elif time_period == "month":
        from_date = (now - timedelta(days=30)).strftime("%Y-%m-%dT%H:%M:%SZ")
    elif time_period == "year":
        from_date = (now - timedelta(days=365)).strftime("%Y-%m-%dT%H:%M:%SZ")
    elif time_period == "today":
        # For today's data, set the start time to midnight of the current day
        today_start = datetime(now.year, now.month, now.day, 0, 0, 0, tzinfo=pytz.UTC)
        from_date = today_start.strftime("%Y-%m-%dT%H:%M:%SZ")
    else:
        # Default to last day if unknown time period
        from_date = (now - timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
    
    to_date = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    
    return from_date, to_date

# Function to fetch historical data for specified node IDs and time period
def fetch_historical_data(node_ids, time_period):
    from_date, to_date = get_date_range(time_period)
    
    results = {}
    base_url = "https://smartcitylivinglab.iiit.ac.in/verticals/all/temporal"
    
    # Process each node ID individually with the new URL structure
    for node_id in node_ids:
        # Build URL with the node_id and date range
        url = f"{base_url}?from={from_date}&to={to_date}&node_id={node_id}"
        
        try:
            response = requests.get(url)
            response.raise_for_status()
            node_data = response.json()
            
            results[node_id] = {
                "filtered_data": node_data,
                "metadata": {
                    "from_date": from_date,
                    "to_date": to_date,
                    "node_id": node_id,
                    "url": url,
                    "data_found": bool(node_data) and not isinstance(node_data, str)
                }
            }
        except requests.exceptions.RequestException as e:
            results[node_id] = {
                "error": f"Failed to fetch historical data for node {node_id}: {str(e)}",
                "metadata": {
                    "from_date": from_date,
                    "to_date": to_date,
                    "node_id": node_id,
                    "url": url
                }
            }
    
    return results

# NEW FUNCTION: Fetch today's data for specified node IDs
def fetch_todays_data(node_ids):
    time_period = "today"
    return fetch_historical_data(node_ids, time_period)

# Function to process temporal data and calculate statistics
def process_temporal_data(node_data):
    def is_valid_entry(key):
        return key not in [
            "node_id", "timestamp", "id", "name", "latitude", "longitude", "type", "created_at"
        ]

    def extract_params(data_entries):
        params = {}
        for entry in data_entries:
            timestamp = entry.get("timestamp", "")
            for key, value in entry.items():
                if is_valid_entry(key):
                    try:
                        float_value = float(value)
                        if key not in params:
                            params[key] = {"values": [], "timestamps": []}
                        params[key]["values"].append(float_value)
                        params[key]["timestamps"].append(timestamp)
                    except (ValueError, TypeError):
                        continue
        return params

    def calc_param_stats(param_data):
        values = param_data["values"]
        timestamps = param_data["timestamps"]
        if not values:
            return None
        min_val = min(values)
        max_val = max(values)
        min_idx = values.index(min_val)
        max_idx = values.index(max_val)
        return {
            "min": min_val,
            "min_timestamp": timestamps[min_idx] if timestamps else None,
            "max": max_val,
            "max_timestamp": timestamps[max_idx] if timestamps else None,
            "avg": sum(values) / len(values),
            "count": len(values),
            "first_timestamp": timestamps[0] if timestamps else None,
            "last_timestamp": timestamps[-1] if timestamps else None
        }

    stats = {}
    for node_id, node_info in node_data.items():
        filtered_data = node_info.get("filtered_data")
        if not filtered_data:
            stats[node_id] = {"error": "No data available"}
            continue

        node_stats = {}
        for category, category_data in filtered_data.items():
            data_entries = category_data.get("data") if category_data else None
            if not data_entries:
                continue

            params = extract_params(data_entries)
            param_stats = {
                param_name: stat for param_name, param_data in params.items()
                if (stat := calc_param_stats(param_data)) is not None
            }
            node_stats[category] = param_stats

        stats[node_id] = node_stats

    return stats

# Query Mistral API for generating response based on classification
def generate_response(prompts, classification, user_query, node_data, is_temporal=False, time_period=None):
    PLACEHOLDER_DATA = "{data}"
    PLACEHOLDER_TODAY_DATA = "{today_data}"
    PLACEHOLDER_QUERY = "{query}"
    PLACEHOLDER_TIME_PERIOD = "{time_period}"

    def format_node_data(node_data):
        formatted_data = {}
        data_summary = {}
        has_valid_data = False
        for node_id, node_info in node_data.items():
            data_summary[node_id] = {
                "type": node_id.split('-')[0] if '-' in node_id else "unknown",
                "has_data": False
            }
            if "filtered_data" in node_info and node_info["filtered_data"]:
                has_valid_data = True
                data_summary[node_id]["has_data"] = True
                formatted_data[node_id] = node_info["filtered_data"]
            elif "error" in node_info:
                formatted_data[node_id] = {"error": node_info["error"]}
                data_summary[node_id]["error"] = node_info["error"]
            else:
                formatted_data[node_id] = {"note": "No data available for this node"}
        return formatted_data, data_summary, has_valid_data

    def format_today_data(today_data):
        formatted_today_data = {}
        for node_id, node_info in today_data.items():
            if "filtered_data" in node_info and node_info["filtered_data"]:
                formatted_today_data[node_id] = node_info["filtered_data"]
            else:
                formatted_today_data[node_id] = {"note": "No data available for today"}
        return formatted_today_data

    def build_temporal_prompt(prompts, user_query, time_period, formatted_data, formatted_today_data, stats, today_stats, data_summary, has_valid_data):
        enhanced_prompt = prompts['temporal'] \
            .replace(PLACEHOLDER_QUERY, user_query) \
            .replace(PLACEHOLDER_DATA, json.dumps(formatted_data, indent=2)) \
            .replace(PLACEHOLDER_TODAY_DATA, json.dumps(formatted_today_data, indent=2)) \
            .replace(PLACEHOLDER_TIME_PERIOD, time_period)
        enhanced_prompt += f"\n\nStatistics summary for historical period:\n{json.dumps(stats, indent=2)}\n\n"
        enhanced_prompt += f"\nToday's statistics summary:\n{json.dumps(today_stats, indent=2)}\n\n"
        enhanced_prompt += f"\nData availability:\n{json.dumps(data_summary, indent=2)}\n\n"
        enhanced_prompt += "\nIMPORTANT: Your response must be ONLY 3-4 lines maximum. Include the most important statistics (min, max, avg) for key parameters in this brief response. Be direct and concise."
        if not has_valid_data:
            enhanced_prompt += "\nNOTE: No data found for requested sensors. Explain this briefly in 1-2 sentences."
        return enhanced_prompt

    def build_non_temporal_prompt(prompts, classification, user_query, node_data):
        formatted_data = json.dumps(node_data, indent=2)
        if classification == "SPECIFIC":
            prompt_template = prompts['specific'].replace(PLACEHOLDER_QUERY, user_query).replace(PLACEHOLDER_DATA, formatted_data)
        elif classification in ("GENERIC", "GENERIC WITH PARAMETER INFERENCE"):
            prompt_template = prompts['generic'].replace(PLACEHOLDER_QUERY, user_query).replace(PLACEHOLDER_DATA, formatted_data)
        elif classification == "LIVING_LAB":
            prompt_template = prompts['living_lab'].replace(PLACEHOLDER_QUERY, user_query)
        else:
            prompt_template = prompts['generic'].replace(PLACEHOLDER_QUERY, user_query).replace(PLACEHOLDER_DATA, formatted_data)
        prompt_template += "\n\nIMPORTANT: Your response must be ONLY 3-4 lines maximum. Be direct and concise with the most important information."
        return prompt_template

    # Main logic
    if is_temporal and time_period:
        today_data = fetch_todays_data(list(node_data.keys()))
        formatted_data, data_summary, has_valid_data = format_node_data(node_data)
        formatted_today_data = format_today_data(today_data)
        stats = process_temporal_data(node_data)
        today_stats = process_temporal_data(today_data)
        prompt_template = build_temporal_prompt(
            prompts, user_query, time_period, formatted_data, formatted_today_data, stats, today_stats, data_summary, has_valid_data
        )
    else:
        prompt_template = build_non_temporal_prompt(prompts, classification, user_query, node_data)

    messages = [
        ChatMessage(
            role="system",
            content="You are a smart city assistant providing extremely concise answers (3-4 lines maximum). When analyzing temporal data, include key statistics (min/max/avg) while keeping responses brief. Always compare historical data with today's readings when appropriate. IMPORTANT: When displaying temperature values, use the proper degree symbol '°C' (Unicode U+00B0) rather than 'Â°C'. Format all units correctly in your responses."
        ),
        ChatMessage(role="user", content=prompt_template)
    ]

    response = client.chat(
        model="mistral-large-latest",
        messages=messages
    )

    response_text = response.choices[0].message.content
    response_text = response_text.replace("Â°C", "°C").replace("Â°F", "°F")
    return response_text

# Process and extract classification and node IDs from the response
def extract_response_data(response_text):
    def try_parse_json(text):
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return None

    def fill_missing_fields(data):
        if "classification" not in data:
            data["classification"] = "UNKNOWN"
        if "node_ids" not in data:
            data["node_ids"] = []
        if "is_temporal" not in data:
            data["is_temporal"] = False
        if "time_period" not in data:
            data["time_period"] = None
        return data

    def extract_with_regex(pattern, text):
        match = re.search(pattern, text)
        return match.group(0) if match else None

    def extract_temporal_info(text):
        is_temporal = False
        time_period = None
        temporal_match = re.search(r'"is_temporal"\s*:\s*(true|false)', text, re.IGNORECASE)
        if temporal_match:
            is_temporal = (temporal_match.group(1).lower() == "true")
        time_period_match = re.search(r'"time_period"\s*:\s*"([^"]+)"', text)
        if time_period_match:
            time_period = time_period_match.group(1)
        return is_temporal, time_period

    def extract_classification(text):
        match = re.search(r'CLASSIFICATION:\s*(SPECIFIC|GENERIC|GENERIC WITH PARAMETER INFERENCE|LIVING_LAB)', text)
        return match.group(1) if match else "UNKNOWN"

    def extract_node_ids(text):
        match = re.search(r'\[([^\]]+)\]', text)
        if not match:
            return []
        ids = re.findall(r'"([^"]+)"', match.group(0))
        return ids

    # 1. Try direct JSON parse
    data = try_parse_json(response_text)
    if data and "node_ids" in data:
        return fill_missing_fields(data)

    # 2. Try regex for JSON with classification
    json_pattern1 = r'\{[\s\S]*"classification"\s*:\s*"[^"]+"\s*,\s*"node_ids"\s*:\s*\[[\s\S]*\][\s\S]*\}'
    json_str = extract_with_regex(json_pattern1, response_text)
    data = try_parse_json(json_str) if json_str else None
    if data:
        return fill_missing_fields(data)

    # 3. Try regex for JSON with only node_ids
    json_pattern2 = r'\{[\s\S]*"node_ids"\s*:\s*\[[\s\S]*\][\s\S]*\}'
    json_str = extract_with_regex(json_pattern2, response_text)
    data = try_parse_json(json_str) if json_str else None
    if data:
        return fill_missing_fields(data)

    # 4. Fallback: extract fields from text
    is_temporal, time_period = extract_temporal_info(response_text)
    classification = extract_classification(response_text)
    node_ids = extract_node_ids(response_text)
    # Defensive: always return a dict with required keys
    return fill_missing_fields({
        "classification": classification,
        "node_ids": node_ids,
        "is_temporal": is_temporal,
        "time_period": time_period
    })

# Function to fetch data from the API for a specific node ID
def fetch_node_data(node_id):
    base_url = "https://smartcitylivinglab.iiit.ac.in/verticals/all/latest"
    url = f"{base_url}?node_id={node_id}"
    
    try:
        response = requests.get(url)
        response.raise_for_status()  # Raise exception for 4XX/5XX status codes
        return response.json()
    except requests.exceptions.RequestException as e:
        return {"error": f"Failed to fetch data for node {node_id}: {str(e)}"}

# Function to fetch data for all node IDs
def fetch_all_node_data(node_ids):
    results = {}
    
    for node_id in node_ids:
        results[node_id] = fetch_node_data(node_id)
    
    return results

# Add this new function to fetch average data from the API
def fetch_average_data():
    base_url = "https://smartcitylivinglab.iiit.ac.in/verticals/avg/"
    
    try:
        response = requests.get(base_url)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        return {"error": f"Failed to fetch average data: {str(e)}"}

# Add function to detect average-related queries
def detect_average_query(user_query):
    # Define patterns to detect average-related queries
    avg_patterns = [
        r'(average|avg|mean)\s+(of|for|across|in)\s+(.+)',
        r'(.+)\s+(average|avg|mean)',
        r'what\s+is\s+the\s+(average|avg|mean)\s+(.+)',
        r'latest\s+(average|avg|mean)',
        r'today\'?s?\s+(average|avg|mean)',
        r'current\s+(average|avg|mean)'
    ]
    
    for pattern in avg_patterns:
        if re.search(pattern, user_query, re.IGNORECASE):
            return True
    
    return False

# Add function to extract parameter from the query
def extract_parameter_from_query(user_query):
    # List of parameters to look for in the query
    parameters = {
        'temperature': ['temperature', 'temp'],
        'relative_humidity': ['humidity', 'relative humidity', 'rh'],
        'pm25': ['pm2.5', 'pm 2.5', 'particulate matter 2.5'],
        'pm10': ['pm10', 'pm 10', 'particulate matter 10'],
        'noise': ['noise', 'sound level', 'decibel'],
        'aqi': ['aqi', 'air quality index'],
        'aql': ['aql', 'air quality level']
    }
    
    # Check for each parameter in the query
    for param_key, param_aliases in parameters.items():
        for alias in param_aliases:
            if re.search(r'\b' + re.escape(alias) + r'\b', user_query, re.IGNORECASE):
                return param_key
    
    # Default to None if no specific parameter found
    return None
# Add a new function to fetch node status
def fetch_node_status(node_id):
    base_url = "https://smartcitylivinglab.iiit.ac.in/maintenance-dashboard-api/get_node_status"
    url = f"{base_url}?node_id={node_id}"
    
    try:
        response = requests.get(url)
        response.raise_for_status()  # Raise exception for 4XX/5XX status codes
        return response.json()
    except requests.exceptions.RequestException as e:
        return {"error": f"Failed to fetch status for node {node_id}: {str(e)}"}

# Function to check if query is about node status
def detect_status_query(user_query):
    status_patterns = [
        r'(node\s+)?status',
        r'(is\s+)?(node\s+)?(active|inactive)',
        r'node\s+health',
        r'(node\s+)?working\s+(condition|state)',
        r'(node\s+)?current\s+state'
    ]
    
    for pattern in status_patterns:
        if re.search(pattern, user_query, re.IGNORECASE):
            return True
    
    return False

# Function to generate response for node status
def generate_node_status_response(node_ids):
    # Fetch status for all nodes
    node_statuses = {}
    for node_id in node_ids:
        node_statuses[node_id] = fetch_node_status(node_id)
    
    # Prepare a detailed status summary
    status_summary = []
    for node_id, status in node_statuses.items():
        if isinstance(status, dict):
            # Extract key status information
            node_status = status.get('status', 'Unknown')
            last_seen = status.get('last_seen', 'N/A')
            status_summary.append(f"{node_id}: {node_status} (Last seen: {last_seen})")
    
    # Prepare system prompt for generating a concise response
    prompt = f"""
You are a smart city assistant providing a detailed yet concise answer about node statuses.
The user has asked about node status for the following nodes: {node_ids}

Detailed Node Status:
{chr(10).join(status_summary)}

Node Status Details:
{json.dumps(node_statuses, indent=2)}

IMPORTANT: 
- Provide a comprehensive overview of all node statuses
- Include the total number of nodes and their current states
- Highlight any nodes with unusual status
- Be clear and informative but remain concise
- Use no more than 4-5 lines in your response
"""
    
    # Query Mistral for the response
    messages = [
        ChatMessage(role="system", content="You are a smart city assistant providing a comprehensive yet concise overview of node statuses. Include all node details clearly and highlight any significant status variations."),
        ChatMessage(role="user", content=prompt)
    ]
    
    response = client.chat(
        model="mistral-large-latest",
        messages=messages
    )
    
    return response.choices[0].message.content
# Main function to handle user queries
def process_query(user_query):
    # Defensive: Raise on empty or invalid input
    if not user_query or not isinstance(user_query, str) or not user_query.strip():
        raise ValueError("Query cannot be empty or invalid.")

    try:
        if detect_average_query(user_query):
            parameter = extract_parameter_from_query(user_query)
            try:
                avg_data = fetch_average_data()
            except Exception as e:
                # Return error as response, not as exception
                return {
                    "classification": "AVERAGE",
                    "node_ids": [],
                    "node_data": {},
                    "response": f"Error: {str(e)}",
                    "is_temporal": False,
                    "time_period": None,
                    "parameter": parameter
                }
            response = generate_average_response(user_query, avg_data, parameter)
            return {
                "classification": "AVERAGE",
                "node_ids": [],
                "node_data": avg_data,
                "response": response,
                "is_temporal": False,
                "time_period": None,
                "parameter": parameter
            }

        if detect_status_query(user_query):
            prompts = load_prompt_files()
            system_prompt = prepare_system_prompt(prompts)
            response = query_mistral_classification(system_prompt, user_query)
            response_data = extract_response_data(response)
            node_ids = response_data.get("node_ids", [])
            if not node_ids:
                return {
                    "classification": "NODE_STATUS",
                    "node_ids": [],
                    "node_data": {},
                    "response": "I couldn't identify specific nodes to check the status for. Please provide specific node IDs.",
                    "is_temporal": False,
                    "time_period": None
                }
            try:
                natural_response = generate_node_status_response(node_ids)
                node_data = {node_id: fetch_node_status(node_id) for node_id in node_ids}
            except Exception as e:
                return {
                    "classification": "NODE_STATUS",
                    "node_ids": node_ids,
                    "node_data": {},
                    "response": f"Error: {str(e)}",
                    "is_temporal": False,
                    "time_period": None
                }
            return {
                "classification": "NODE_STATUS",
                "node_ids": node_ids,
                "node_data": node_data,
                "response": natural_response,
                "is_temporal": False,
                "time_period": None
            }

        prompts = load_prompt_files()
        system_prompt = prepare_system_prompt(prompts)
        try:
            response = query_mistral_classification(system_prompt, user_query)
        except Exception as e:
            return {
                "classification": "UNKNOWN",
                "node_ids": [],
                "node_data": {},
                "response": f"Error: {str(e)}",
                "is_temporal": False,
                "time_period": None
            }
        response_data = extract_response_data(response) or {}
        is_temporal = response_data.get("is_temporal", False)
        time_period = response_data.get("time_period")
        if not is_temporal:
            regex_is_temporal, regex_time_period = detect_temporal_query(user_query)
            if regex_is_temporal:
                is_temporal = True
                time_period = regex_time_period
        node_ids = response_data.get("node_ids", [])
        classification = response_data.get("classification", "UNKNOWN")
        # Defensive: always return a string for classification
        if classification is None:
            classification = "UNKNOWN"
        try:
            if is_temporal and time_period:
                node_data = fetch_historical_data(node_ids, time_period)
                response_node_data = node_data
            else:
                node_data = fetch_all_node_data(node_ids)
                response_node_data = node_data
        except Exception as e:
            return {
                "classification": classification,
                "node_ids": node_ids,
                "node_data": {},
                "response": f"Error: {str(e)}",
                "is_temporal": is_temporal,
                "time_period": time_period
            }
        try:
            natural_response = generate_response(
                prompts,
                classification,
                user_query,
                response_node_data,
                is_temporal=is_temporal,
                time_period=time_period
            )
        except Exception as e:
            natural_response = f"Error: {str(e)}"
        result = {
            "classification": classification,
            "node_ids": node_ids,
            "node_data": node_data,
            "response": natural_response,
            "is_temporal": is_temporal,
            "time_period": time_period
        }
        if is_temporal:
            try:
                result["todays_data"] = fetch_todays_data(node_ids)
            except Exception:
                result["todays_data"] = {}
        return result
    except Exception as e:
        # Defensive: always return a dict with a string response
        return {
            "classification": "UNKNOWN",
            "node_ids": [],
            "node_data": {},
            "response": f"Error: {str(e)}",
            "is_temporal": False,
            "time_period": None
        }
# Load prompts at startup
prompts = load_prompt_files()

# FastAPI routes
@app.get("/", response_model=dict)
async def root():
    return {"message": "Smart City API is running. Use /query endpoint to get sensor data."}

# Support both GET and POST for the query endpoint - the full response version
@app.get("/query", response_model=QueryResponse)
async def query_get(q: str = Query(..., description="User query about smart city data")):
    """
    Process a natural language query about smart city data via GET request
    """
    if not q or not q.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Query cannot be empty.")
    try:
        result = process_query(q)
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# New POST endpoint that returns only the response text
@app.post("/query", response_model=SimpleResponse)
async def query_post(request: QueryRequest):
    if not request.query or not request.query.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Query cannot be empty.")
    try:
        result = process_query(request.query)
        # Defensive: always return a string for response
        response_text = result.get("response", "")
        if not isinstance(response_text, str):
            response_text = str(response_text)
        return {"response": response_text}
    except Exception as e:
        # Always return 200 with error in response for most errors
        return {"response": f"Error: {str(e)}"}

@app.post("/query/full", response_model=QueryResponse)
async def query_post_full(request: QueryRequest):
    if not request.query or not request.query.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Query cannot be empty.")
    try:
        result = process_query(request.query)
        # Defensive: fill missing fields for QueryResponse
        if "classification" not in result or result["classification"] is None:
            result["classification"] = "UNKNOWN"
        if "node_ids" not in result or result["node_ids"] is None:
            result["node_ids"] = []
        if "node_data" not in result or result["node_data"] is None:
            result["node_data"] = {}
        if "response" not in result or result["response"] is None:
            result["response"] = ""
        if "is_temporal" not in result or result["is_temporal"] is None:
            result["is_temporal"] = False
        if "time_period" not in result:
            result["time_period"] = None
        return result
    except Exception as e:
        # Defensive: always return a valid QueryResponse with error string
        return {
            "classification": "UNKNOWN",
            "node_ids": [],
            "node_data": {},
            "response": f"Error: {str(e)}",
            "is_temporal": False,
            "time_period": None
        }

# Support both GET and POST for debug endpoint
@app.get("/debug", response_model=dict)
async def debug_get(q: str = Query(..., description="User query for debugging")):
    """
    Get detailed debug information for a query via GET request
    """
    system_prompt = prepare_system_prompt(prompts)
    classification_response = query_mistral_classification(system_prompt, q)
    response_data = extract_response_data(classification_response)
    
    # Check with regex for temporal queries
    regex_is_temporal, regex_time_period = detect_temporal_query(q)
    
    # Determine if it's a temporal query using both methods
    is_temporal = response_data.get("is_temporal", False) or regex_is_temporal
    time_period = response_data.get("time_period") or regex_time_period
    
    # Fetch the node data based on classification
    node_ids = response_data.get("node_ids", [])
    
    # Fetch the data based on query type
    node_data = {}
    today_data = {}
    if is_temporal and time_period and node_ids:
        node_data = fetch_historical_data(node_ids, time_period)
        today_data = fetch_todays_data(node_ids)
    elif node_ids:
        node_data = fetch_all_node_data(node_ids)
    
    return {
        "query": q,
        "raw_classification_response": classification_response,
        "parsed_response": response_data,
        "regex_temporal_detection": {
            "is_temporal": regex_is_temporal,
            "time_period": regex_time_period
        },
        "node_data": node_data,
        "todays_data": today_data if is_temporal else {},
        "is_temporal": is_temporal,
        "time_period": time_period
    }

@app.post("/debug", response_model=dict)
async def debug_post(request: QueryRequest):
    """
    Get detailed debug information for a query via POST request
    """
    system_prompt = prepare_system_prompt(prompts)
    classification_response = query_mistral_classification(system_prompt, request.query)
    response_data = extract_response_data(classification_response)
    
    # Check with regex for temporal queries
    regex_is_temporal, regex_time_period = detect_temporal_query(request.query)
    
    # Determine if it's a temporal query using both methods
    is_temporal = response_data.get("is_temporal", False) or regex_is_temporal
    time_period = response_data.get("time_period") or regex_time_period
    
    # Fetch the node data based on classification
    node_ids = response_data.get("node_ids", [])
    
    # Fetch the data based on query type
    node_data = {}
    today_data = {}
    if is_temporal and time_period and node_ids:
        node_data = fetch_historical_data(node_ids, time_period)
        today_data = fetch_todays_data(node_ids)
    elif node_ids:
        node_data = fetch_all_node_data(node_ids)
    
    return {
        "query": request.query,
        "raw_classification_response": classification_response,
        "parsed_response": response_data,
        "regex_temporal_detection": {
            "is_temporal": regex_is_temporal,
            "time_period": regex_time_period
        },
        "node_data": node_data,
        "todays_data": today_data if is_temporal else {},
        "is_temporal": is_temporal,
        "time_period": time_period
    }

# Run with: uvicorn main:app --reload
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)