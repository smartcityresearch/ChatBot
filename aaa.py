import json
import requests
import os
from fastapi import FastAPI, Query, Body
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
    with open('merge1.txt', 'r') as file:
        prompts['merge'] = file.read()
    
    # Load node id.txt
    with open('node id.txt', 'r') as file:
        prompts['node_id'] = file.read()
    
    # Load prompt2.txt
    with open('prompt2.txt', 'r') as file:
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
    stats = {}
    
    for node_id, node_info in node_data.items():
        if "filtered_data" not in node_info or not node_info["filtered_data"]:
            stats[node_id] = {"error": "No data available"}
            continue
            
        node_stats = {}
        
        for category, category_data in node_info["filtered_data"].items():
            if "data" not in category_data or not category_data["data"]:
                continue
                
            # Extract all numeric values for each parameter
            params = {}
            for entry in category_data["data"]:
                timestamp = entry.get("timestamp", "")
                
                for key, value in entry.items():
                    if key not in ["node_id", "timestamp", "id", "name", "latitude", "longitude", "type", "created_at"]:
                        try:
                            # Try to convert to float for numeric processing
                            float_value = float(value)
                            if key not in params:
                                params[key] = {"values": [], "timestamps": []}
                            params[key]["values"].append(float_value)
                            params[key]["timestamps"].append(timestamp)
                        except (ValueError, TypeError):
                            pass
            
            # Calculate statistics for each parameter
            param_stats = {}
            for param_name, param_data in params.items():
                values = param_data["values"]
                if values:
                    min_idx = values.index(min(values))
                    max_idx = values.index(max(values))
                    param_stats[param_name] = {
                        "min": min(values),
                        "min_timestamp": param_data["timestamps"][min_idx] if param_data["timestamps"] else None,
                        "max": max(values),
                        "max_timestamp": param_data["timestamps"][max_idx] if param_data["timestamps"] else None,
                        "avg": sum(values) / len(values),
                        "count": len(values),
                        "first_timestamp": param_data["timestamps"][0] if param_data["timestamps"] else None,
                        "last_timestamp": param_data["timestamps"][-1] if param_data["timestamps"] else None
                    }
            
            node_stats[category] = param_stats
        
        stats[node_id] = node_stats
    
    return stats

# Query Mistral API for generating response based on classification
def generate_response(prompts, classification, user_query, node_data, is_temporal=False, time_period=None):
    # Check if we have any valid data
    has_valid_data = False
    data_summary = {}
    
    # For temporal data, format it and check if we have valid data
    if is_temporal and time_period:
        # Fetch today's data for the same nodes
        today_data = fetch_todays_data(list(node_data.keys()))
        
        # Process data and calculate statistics as before
        formatted_data = {}
        formatted_today_data = {}
        
        for node_id, node_info in node_data.items():
            data_summary[node_id] = {
                "type": node_id.split('-')[0] if '-' in node_id else "unknown",
                "has_data": False
            }
            
            if "filtered_data" in node_info:
                if node_info["filtered_data"]:
                    has_valid_data = True
                    data_summary[node_id]["has_data"] = True
                formatted_data[node_id] = node_info["filtered_data"]
            elif "error" in node_info:
                formatted_data[node_id] = {"error": node_info["error"]}
                data_summary[node_id]["error"] = node_info["error"]
            else:
                formatted_data[node_id] = {"note": "No data available for this node"}
        
        # Format today's data
        for node_id, node_info in today_data.items():
            if "filtered_data" in node_info and node_info["filtered_data"]:
                formatted_today_data[node_id] = node_info["filtered_data"]
            else:
                formatted_today_data[node_id] = {"note": "No data available for today"}
        
        # Calculate statistics
        stats = process_temporal_data(node_data)
        today_stats = process_temporal_data(today_data)
        
        formatted_data_str = json.dumps(formatted_data, indent=2)
        formatted_today_data_str = json.dumps(formatted_today_data, indent=2)
        stats_str = json.dumps(stats, indent=2)
        today_stats_str = json.dumps(today_stats, indent=2)
        data_summary_str = json.dumps(data_summary, indent=2)
        
        # Create enhanced prompt with explicit instructions for concise response
        enhanced_prompt = prompts['temporal'].replace("{query}", user_query) \
                                         .replace("{data}", formatted_data_str) \
                                         .replace("{today_data}", formatted_today_data_str) \
                                         .replace("{time_period}", time_period)
        
        enhanced_prompt += f"\n\nStatistics summary for historical period:\n{stats_str}\n\n"
        enhanced_prompt += f"\nToday's statistics summary:\n{today_stats_str}\n\n"
        enhanced_prompt += f"\nData availability:\n{data_summary_str}\n\n"
        
        # Add explicit instructions for brevity while including key statistics
        enhanced_prompt += "\nIMPORTANT: Your response must be ONLY 3-4 lines maximum. Include the most important statistics (min, max, avg) for key parameters in this brief response. Be direct and concise."
        
        if not has_valid_data:
            enhanced_prompt += "\nNOTE: No data found for requested sensors. Explain this briefly in 1-2 sentences."
        
        prompt_template = enhanced_prompt
    else:
        # Prepare data for the prompt
        formatted_data = json.dumps(node_data, indent=2)
        
        if classification == "SPECIFIC":
            prompt_template = prompts['specific'].replace("{query}", user_query).replace("{data}", formatted_data)
        elif classification == "GENERIC" or classification == "GENERIC WITH PARAMETER INFERENCE":
            prompt_template = prompts['generic'].replace("{query}", user_query).replace("{data}", formatted_data)
        elif classification == "LIVING_LAB":
            prompt_template = prompts['living_lab'].replace("{query}", user_query)
        else:
            # Default to generic if classification is unknown
            prompt_template = prompts['generic'].replace("{query}", user_query).replace("{data}", formatted_data)
        
        # Add brevity instruction for non-temporal queries as well
        prompt_template += "\n\nIMPORTANT: Your response must be ONLY 3-4 lines maximum. Be direct and concise with the most important information."
    
    # Update system prompt to emphasize brevity
    # Update system prompt to emphasize brevity and fix encoding issues
    messages = [
        ChatMessage(role="system", content="You are a smart city assistant providing extremely concise answers (3-4 lines maximum). When analyzing temporal data, include key statistics (min/max/avg) while keeping responses brief. Always compare historical data with today's readings when appropriate. IMPORTANT: When displaying temperature values, use the proper degree symbol '°C' (Unicode U+00B0) rather than 'Â°C'. Format all units correctly in your responses."),
        ChatMessage(role="user", content=prompt_template)
    ]
    
    response = client.chat(
        model="mistral-large-latest",
        messages=messages
    )
    
    # Fix encoding issues in the response
    response_text = response.choices[0].message.content
    # Replace incorrect degree symbol encoding with the correct one
    response_text = response_text.replace("Â°C", "°C")
    response_text = response_text.replace("Â°F", "°F")
    
    return response_text

# Process and extract classification and node IDs from the response
def extract_response_data(response_text):
    try:
        # First, try to parse the entire response as JSON
        response_json = json.loads(response_text)
        if "node_ids" in response_json:
            # Ensure all expected fields exist
            if "is_temporal" not in response_json:
                response_json["is_temporal"] = False
            if "time_period" not in response_json:
                response_json["time_period"] = None
            return response_json
    except json.JSONDecodeError:
        # If the response is not a valid JSON, try to extract JSON using regex
        json_pattern = r'\{[\s\S]*"classification"\s*:\s*"[^"]+"\s*,\s*"node_ids"\s*:\s*\[[\s\S]*\][\s\S]*\}'
        match = re.search(json_pattern, response_text)
        if match:
            try:
                json_str = match.group(0)
                result = json.loads(json_str)
                if "is_temporal" not in result:
                    result["is_temporal"] = False
                if "time_period" not in result:
                    result["time_period"] = None
                return result
            except json.JSONDecodeError:
                pass
        
        # Try alternative pattern if classification might be missing
        json_pattern = r'\{[\s\S]*"node_ids"\s*:\s*\[[\s\S]*\][\s\S]*\}'
        match = re.search(json_pattern, response_text)
        if match:
            try:
                json_str = match.group(0)
                result = json.loads(json_str)
                if "classification" not in result:
                    result["classification"] = "UNKNOWN"
                if "is_temporal" not in result:
                    result["is_temporal"] = False
                if "time_period" not in result:
                    result["time_period"] = None
                return result
            except json.JSONDecodeError:
                pass
    
    # Extract temporal info from raw text if JSON parsing failed
    is_temporal = False
    time_period = None
    
    temporal_pattern = r'"is_temporal"\s*:\s*(true|false)'
    temporal_match = re.search(temporal_pattern, response_text, re.IGNORECASE)
    if temporal_match:
        is_temporal = (temporal_match.group(1).lower() == "true")
    
    time_period_pattern = r'"time_period"\s*:\s*"([^"]+)"'
    time_period_match = re.search(time_period_pattern, response_text)
    if time_period_match:
        time_period = time_period_match.group(1)
    
    # If no valid JSON found, try to extract classification separately
    classification_pattern = r'CLASSIFICATION:\s*(SPECIFIC|GENERIC|GENERIC WITH PARAMETER INFERENCE|LIVING_LAB)'
    classification_match = re.search(classification_pattern, response_text)
    classification = classification_match.group(1) if classification_match else "UNKNOWN"
    
    # Extract node IDs if possible
    node_ids_pattern = r'\["([^"]+)"(?:,\s*"([^"]+)")*\]'
    node_ids_match = re.search(node_ids_pattern, response_text)
    node_ids = []
    if node_ids_match:
        for group in node_ids_match.groups():
            if group is not None:
                node_ids.append(group)
    
    # If no valid JSON found, create a default response
    return {
        "classification": classification, 
        "node_ids": node_ids,
        "is_temporal": is_temporal,
        "time_period": time_period
    }

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

# Main function to handle user queries
def process_query(user_query):
    
    if detect_average_query(user_query):
        # Extract parameter if mentioned in the query
        parameter = extract_parameter_from_query(user_query)
        
        # Fetch average data
        avg_data = fetch_average_data()
        
        # Generate response based on average data
        response = generate_average_response(user_query, avg_data, parameter)
        
        # Return a simplified result structure for average queries
        return {
            "classification": "AVERAGE",
            "node_ids": [],
            "node_data": avg_data,
            "response": response,
            "is_temporal": False,
            "time_period": None,
            "parameter": parameter
        }
    prompts = load_prompt_files()
    system_prompt = prepare_system_prompt(prompts)
    response = query_mistral_classification(system_prompt, user_query)
    response_data = extract_response_data(response)
    
    # Check if the query is temporal (both from LLM and regex)
    is_temporal = response_data.get("is_temporal", False)
    time_period = response_data.get("time_period")
    
    # Double-check with regex if LLM didn't detect temporal query
    if not is_temporal:
        regex_is_temporal, regex_time_period = detect_temporal_query(user_query)
        if regex_is_temporal:
            is_temporal = True
            time_period = regex_time_period
    
    # Fetch data for the identified node IDs
    node_ids = response_data["node_ids"]
    
    # Fetch the appropriate data based on whether it's a temporal query
    if is_temporal and time_period:
        node_data = fetch_historical_data(node_ids, time_period)
        # Include today's data in the response structure but it will be fetched in generate_response
        response_node_data = node_data
    else:
        node_data = fetch_all_node_data(node_ids)
        response_node_data = node_data
    
    # Generate natural language response based on classification
    classification = response_data["classification"]
    natural_response = generate_response(
        prompts, 
        classification, 
        user_query, 
        response_node_data,
        is_temporal=is_temporal, 
        time_period=time_period
    )
    
    # Combine all results
    result = {
        "classification": classification,
        "node_ids": node_ids,
        "node_data": node_data,
        "response": natural_response,
        "is_temporal": is_temporal,
        "time_period": time_period
    }
    
    # Add today's data for temporal queries
    if is_temporal:
        result["todays_data"] = fetch_todays_data(node_ids)
    
    return result
# Add function to generate response for average queries
def generate_average_response(user_query, avg_data, parameter=None):
    # Handle case where API call failed
    if "error" in avg_data:
        return f"Sorry, I couldn't retrieve the average data. {avg_data['error']}"
    
    # Prepare system prompt for concise response
    prompt = f"""
You are a smart city assistant providing extremely concise answers (2-3 lines maximum).
The user has asked about average sensor readings: "{user_query}"

Here is the current average data across all sensor nodes:
{json.dumps(avg_data, indent=2)}
"""
    
    # Add specific instructions based on whether a parameter was detected
    if parameter:
        # Find which vertical (aq, solar, etc.) contains this parameter
        vertical_with_param = None
        param_value = None
        
        for vertical, data in avg_data.items():
            if isinstance(data, dict) and parameter in data:
                vertical_with_param = vertical
                param_value = data[parameter]
                break
        
        if vertical_with_param and param_value:
            prompt += f"\nThe user specifically asked about the '{parameter}' parameter, which has an average value of {param_value} across all {vertical_with_param} nodes. Focus your response on this specific parameter."
        else:
            prompt += f"\nThe user asked about the '{parameter}' parameter, but it wasn't found in the data. Mention this in your response."
    else:
        prompt += "\nThe user didn't specify a particular parameter. Provide a brief overview of key parameters from the data."
    
    prompt += "\nIMPORTANT: Your response must be ONLY 2-3 lines maximum. Be direct and concise with the most important information. Format all units correctly in your response."
    
    # Query Mistral for the response
    messages = [
        ChatMessage(role="system", content="You are a smart city assistant providing extremely concise answers (2-3 lines maximum). Always format units correctly, especially temperature with the proper degree symbol '°C' (Unicode U+00B0)."),
        ChatMessage(role="user", content=prompt)
    ]
    
    response = client.chat(
        model="mistral-large-latest",
        messages=messages
    )
    
    # Fix encoding issues in the response
    response_text = response.choices[0].message.content
    response_text = response_text.replace("Â°C", "°C")
    response_text = response_text.replace("Â°F", "°F")
    
    return response_text

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
    result = process_query(q)
    return result

# New POST endpoint that returns only the response string
@app.post("/query", response_model=SimpleResponse)
async def query_post(request: QueryRequest):
    """
    Process a natural language query about smart city data and return only the response text
    """
    result = process_query(request.query)
    return {"response": result["response"]}

# Original POST endpoint (renamed to /query/full for backward compatibility)
@app.post("/query/full", response_model=QueryResponse)
async def query_post_full(request: QueryRequest):
    """
    Process a natural language query about smart city data via POST request (full response)
    """
    result = process_query(request.query)
    return result

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