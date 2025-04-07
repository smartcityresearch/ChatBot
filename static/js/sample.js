// Global variables
let chart;
let nodeData = {};
let timeSeriesData = {};
let currentData = {};
let parameterKeywords = {
    // Temperature parameters
    'temperature': ['temperature', 'temp', 'ambient temperature', 'celsius', 'fahrenheit'],

    // Humidity parameters
    'humidity': ['humidity', 'relative humidity', 'moisture'],

    // Air quality parameters
    'co2': ['co2', 'carbon dioxide'],
    'co': ['co', 'carbon monoxide'],
    'pm2.5': ['pm2.5', 'particulate matter', 'fine particles'],
    'pm10': ['pm10', 'coarse particles'],
    'gas': ['gas', 'tvoc', 'voc'],
    'air quality': ['aqi', 'air quality', 'air quality index'],

    // Water parameters
    'ph': ['ph', 'acidity'],
    'turbidity': ['turbidity', 'clarity', 'water clarity'],
    'tds': ['tds', 'total dissolved solids'],
    'conductivity': ['conductivity', 'water conductivity'],
    'water flow': ['flow', 'water flow', 'flow rate'],
    'water level': ['water level', 'level'],

    // Energy parameters
    'voltage': ['voltage', 'volts'],
    'current': ['current', 'ampere', 'amp'],
    'power': ['power', 'watt', 'kw', 'kilowatt'],
    'energy': ['energy', 'kwh', 'kilowatt hour'],

    // Pressure parameters
    'pressure': ['pressure', 'barometric pressure', 'atmospheric pressure'],

    // Noise parameters
    'noise': ['noise', 'sound', 'decibel', 'db']
};

// Initialize the page
document.addEventListener('DOMContentLoaded', function () {
    // Set up event listeners
    document.getElementById('queryForm').addEventListener('submit', handleSubmit);

    // Close popup when clicking on the close button
    document.getElementById('closePopup').addEventListener('click', closePopup);

    // Close popup when clicking outside the popup content
    document.getElementById('popupOverlay').addEventListener('click', function (event) {
        if (event.target === this) {
            closePopup();
        }
    });

    // View graph button click handler
    document.getElementById('viewGraphBtn').addEventListener('click', showGraph);

    // Check if there's a query parameter in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('query');

    if (query) {
        // Set the query in the input field
        document.getElementById('queryInput').value = query;
        // Process the query automatically
        processQueryFromURL(query);
    }
});

// Process query from URL parameter
async function processQueryFromURL(query) {
    if (!query) return;

    // Extract parameter from query
    const parameterType = extractParameterFromQuery(query);

    // Show loading state
    document.getElementById('loading').style.display = 'block';
    document.getElementById('error').style.display = 'none';
    document.getElementById('noParameter').style.display = 'none';
    document.getElementById('response').style.display = 'none';

    if (chart) {
        chart.destroy();
    }

    try {
        // Fetch data from the API
        const API_URL = 'http://localhost:8001/debug'; // Update with your actual API URL
        const response = await axios.post(API_URL, { query });

        // Process the API response
        const result = processApiResponse(response.data, parameterType, query);

        // If a parameter was found, display the graph automatically
        if (result && result.parameterFound) {
            showGraph();
        }
    } catch (error) {
        showError('Error fetching data: ' + (error.response?.data?.message || error.message));
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

// Handle form submission
async function handleSubmit(event) {
    event.preventDefault();

    const query = document.getElementById('queryInput').value.trim();
    if (!query) return;

    // Extract parameter from query before sending
    const parameterType = extractParameterFromQuery(query);

    // Show loading state
    document.getElementById('loading').style.display = 'block';
    document.getElementById('error').style.display = 'none';
    document.getElementById('noParameter').style.display = 'none';
    document.getElementById('response').style.display = 'none';
    document.getElementById('viewGraphBtn').style.display = 'none';

    if (chart) {
        chart.destroy();
    }

    try {
        // Fetch data from the API
        const API_URL = 'http://localhost:8001/debug'; // Update with your actual API URL
        const response = await axios.post(API_URL, { query });

        // Process the API response
        processApiResponse(response.data, parameterType, query);
    } catch (error) {
        showError('Error fetching data: ' + (error.response?.data?.message || error.message));
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

// Function to extract parameter from query
function extractParameterFromQuery(query) {
    query = query.toLowerCase();

    // Check each parameter keyword
    for (const paramType in parameterKeywords) {
        for (const keyword of parameterKeywords[paramType]) {
            if (query.includes(keyword)) {
                return paramType;
            }
        }
    }

    return null;
}

// Function to find actual parameter name in data that matches the parameter type
function findMatchingParameter(paramType, availableParams) {
    paramType = paramType.toLowerCase();

    // First check for exact match
    for (const param of availableParams) {
        if (param.toLowerCase() === paramType) {
            return param;
        }
    }

    // Then check for keyword matches
    if (parameterKeywords[paramType]) {
        for (const keyword of parameterKeywords[paramType]) {
            for (const param of availableParams) {
                if (param.toLowerCase().includes(keyword)) {
                    return param;
                }
            }
        }
    }

    // Check if any available param contains the paramType
    for (const param of availableParams) {
        if (param.toLowerCase().includes(paramType)) {
            return param;
        }
    }

    return null;
}

// Process the API response
function processApiResponse(data, parameterType, originalQuery) {
    // Store the node data
    nodeData = data.node_data;

    // Display the query classification and response
    let responseText = '';
    if (data.parsed_response && data.parsed_response.classification) {
        responseText += `Query classified as: ${data.parsed_response.classification}\n`;
    }
    if (data.raw_classification_response) {
        responseText += `\n${data.raw_classification_response}`;
    }
    document.getElementById('response').textContent = responseText;
    document.getElementById('response').style.display = 'block';

    // Check if this is a temporal query
    const isTemporal = data.is_temporal || false;

    if (isTemporal && data.time_period) {
        // Extract time series data for temporal queries
        extractTimeSeriesData();

        // If no parameter was specified
        if (!parameterType) {
            document.getElementById('noParameter').style.display = 'block';
            return { parameterFound: false };
        }

        // Get all available parameters
        const availableParams = Object.keys(timeSeriesData);

        // Check if we have any parameters
        if (availableParams.length === 0) {
            showError('No numeric parameters found in the data.');
            return { parameterFound: false };
        }

        // Find the matching parameter in the actual data
        const matchedParam = findMatchingParameter(parameterType, availableParams);

        if (matchedParam) {
            // Store the matched parameter for later use
            document.getElementById('viewGraphBtn').dataset.parameter = matchedParam;
            document.getElementById('viewGraphBtn').dataset.dataType = 'temporal';
            // Show the View Graph button
            document.getElementById('viewGraphBtn').style.display = 'block';
            return { parameterFound: true, parameter: matchedParam };
        } else {
            showError(`No data found for parameter: "${parameterType}". Available parameters: ${availableParams.join(", ")}`);
            return { parameterFound: false };
        }
    } else {
        // Handle non-temporal data
        extractCurrentData();

        // If no parameter was specified
        if (!parameterType) {
            document.getElementById('noParameter').style.display = 'block';
            return { parameterFound: false };
        }

        // Get all available parameters
        const availableParams = Object.keys(currentData);

        // Check if we have any parameters
        if (availableParams.length === 0) {
            showError('No parameters found in the data.');
            return { parameterFound: false };
        }

        // Find the matching parameter in the actual data
        const matchedParam = findMatchingParameter(parameterType, availableParams);

        if (matchedParam) {
            // Store the matched parameter for later use
            document.getElementById('viewGraphBtn').dataset.parameter = matchedParam;
            document.getElementById('viewGraphBtn').dataset.dataType = 'current';
            // Show the View Graph button
            document.getElementById('viewGraphBtn').style.display = 'block';
            return { parameterFound: true, parameter: matchedParam };
        } else {
            showError(`No data found for parameter: "${parameterType}". Available parameters: ${availableParams.join(", ")}`);
            return { parameterFound: false };
        }
    }
}

// Extract time series data from the node data (for temporal queries)
function extractTimeSeriesData() {
    timeSeriesData = {};

    // Iterate through each node
    for (const nodeId in nodeData) {
        const nodeInfo = nodeData[nodeId];

        // Check if we have filtered data (for temporal queries)
        if (nodeInfo.filtered_data) {
            // Go through each category in the filtered data
            for (const category in nodeInfo.filtered_data) {
                const categoryData = nodeInfo.filtered_data[category];

                // Check if we have data points
                if (categoryData.data && categoryData.data.length > 0) {
                    // Extract all parameters except metadata
                    const firstDataPoint = categoryData.data[0];

                    for (const param in firstDataPoint) {
                        // Skip metadata fields
                        if (!['node_id', 'timestamp', 'id', 'name', 'latitude', 'longitude', 'type', 'created_at'].includes(param)) {
                            // Initialize this parameter if it doesn't exist
                            if (!timeSeriesData[param]) {
                                timeSeriesData[param] = {
                                    timestamps: [],
                                    values: [],
                                    nodeId: nodeId,
                                    category: category
                                };
                            }

                            // Add all data points for this parameter
                            categoryData.data.forEach(point => {
                                if (point[param] !== undefined) {
                                    // Use created_at if timestamp is not available
                                    const timestamp = new Date(point.timestamp || point.created_at);

                                    // Skip if date is invalid
                                    if (isNaN(timestamp.getTime())) {
                                        return;
                                    }

                                    // Try to convert to number if possible
                                    let value;
                                    try {
                                        value = parseFloat(point[param]);
                                        if (isNaN(value)) {
                                            value = point[param];
                                        }
                                    } catch (e) {
                                        value = point[param];
                                    }

                                    timeSeriesData[param].timestamps.push(timestamp);
                                    timeSeriesData[param].values.push(value);
                                }
                            });
                        }
                    }
                }
            }
        }
    }
}

// Extract current data from the node data (for non-temporal queries)
function extractCurrentData() {
    currentData = {};

    // Iterate through each node
    for (const nodeId in nodeData) {
        const nodeInfo = nodeData[nodeId];

        // For non-temporal data, it will be organized by category directly
        for (const category in nodeInfo) {
            const categoryData = nodeInfo[category];

            // Ensure it's an array and has data
            if (Array.isArray(categoryData) && categoryData.length > 0) {
                const firstDataPoint = categoryData[0];

                // Create data entries for all parameters
                for (const param in firstDataPoint) {
                    // Skip metadata fields
                    if (!['node_id', 'timestamp', 'id', 'name', 'latitude', 'longitude', 'type', 'created_at', 'xcor', 'ycor', 'timestamp_start', 'timestamp_end'].includes(param)) {
                        // Extract raw value
                        let rawValue = firstDataPoint[param];

                        // Extract numeric values if possible (e.g., "33 °C" -> 33)
                        let numericValue = null;
                        let unit = "";

                        if (typeof rawValue === 'string') {
                            // Try to extract numeric part and unit
                            const match = rawValue.trim().match(/^(-?\d+(\.\d+)?)\s*(.*)$/);
                            if (match) {
                                numericValue = parseFloat(match[1]);
                                unit = match[3].trim();
                            }
                        } else if (typeof rawValue === 'number') {
                            numericValue = rawValue;
                        }

                        // Store the data
                        if (!currentData[param]) {
                            currentData[param] = [];
                        }

                        currentData[param].push({
                            nodeId: nodeId,
                            name: firstDataPoint.name || nodeId,
                            rawValue: rawValue,
                            numericValue: numericValue,
                            unit: unit,
                            category: category,
                            timestamp: new Date(firstDataPoint.created_at || firstDataPoint.timestamp || Date.now())
                        });
                    }
                }
            }
        }
    }
}

// Format date for display
function formatDate(date) {
    if (!date || isNaN(date.getTime())) {
        return "Invalid Date";
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// Show the popup and create chart
function showGraph() {
    const parameter = document.getElementById('viewGraphBtn').dataset.parameter;
    const dataType = document.getElementById('viewGraphBtn').dataset.dataType;

    if (!parameter) {
        showError('No parameter selected for visualization.');
        return;
    }

    // Show the popup overlay
    document.getElementById('popupOverlay').style.display = 'flex';

    // Create the chart inside the popup
    if (dataType === 'temporal') {
        createTemporalChart(parameter);
    } else {
        createCurrentChart(parameter);
    }
}

// Close the popup
function closePopup() {
    document.getElementById('popupOverlay').style.display = 'none';

    // Destroy the chart to free up resources
    if (chart) {
        chart.destroy();
        chart = null;
    }
}

// Create a chart for temporal data
function createTemporalChart(parameter) {
    if (chart) {
        chart.destroy();
    }

    if (!timeSeriesData[parameter]) {
        showError(`No data available for parameter: ${parameter}`);
        return;
    }

    const data = timeSeriesData[parameter];

    // Sort data points by timestamp
    const sortedIndices = data.timestamps.map((_, idx) => idx)
        .sort((a, b) => data.timestamps[a] - data.timestamps[b]);

    const sortedTimestamps = sortedIndices.map(idx => data.timestamps[idx]);
    const sortedValues = sortedIndices.map(idx => data.values[idx]);

    // Format dates for display
    const formattedLabels = sortedTimestamps.map(timestamp => formatDate(timestamp));

    const ctx = document.getElementById('temporalChart').getContext('2d');

    // Create the chart
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: formattedLabels,
            datasets: [{
                label: `${parameter} (${data.nodeId})`,
                data: sortedValues,
                borderColor: '#4a7bfa',
                backgroundColor: 'rgba(74, 123, 250, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.2,
                pointRadius: 3,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#4a7bfa',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxRotation: 0,
                        color: '#888888',
                        font: {
                            size: 10
                        },
                        callback: function (value, index) {
                            return index % Math.ceil(formattedLabels.length / 6) === 0 ?
                                this.getLabelForValue(value) : '';
                        }
                    }
                },
                y: {
                    grid: {
                        color: '#f0f0f0'
                    },
                    ticks: {
                        color: '#888888',
                        font: {
                            size: 10
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        boxWidth: 12,
                        font: {
                            size: 11
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    titleColor: '#333',
                    bodyColor: '#666',
                    borderColor: '#ddd',
                    borderWidth: 1,
                    cornerRadius: 4,
                    boxPadding: 6,
                    callbacks: {
                        title: function (tooltipItems) {
                            const idx = tooltipItems[0].dataIndex;
                            return formatDate(sortedTimestamps[idx]);
                        }
                    }
                }
            }
        }
    });

    // Update the popup title
    document.querySelector('.popup-header').textContent = `${parameter} over time`;
}

// Create a chart for current (non-temporal) data
function createCurrentChart(parameter) {
    if (chart) {
        chart.destroy();
    }

    if (!currentData[parameter] || currentData[parameter].length === 0) {
        showError(`No data available for parameter: ${parameter}`);
        return;
    }

    const data = currentData[parameter];
    const ctx = document.getElementById('temporalChart').getContext('2d');

    // Extract node IDs and values
    const nodeIds = data.map(item => item.nodeId);
    const values = data.map(item => {
        if (item.numericValue !== null) {
            return item.numericValue;
        }
        // Try to extract number from rawValue if needed
        if (typeof item.rawValue === 'string') {
            const match = item.rawValue.match(/^(-?\d+(\.\d+)?)/);
            return match ? parseFloat(match[1]) : 0;
        }
        return 0; // Default
    });

    // Get unit from first data point that has one
    let unit = '';
    for (const item of data) {
        if (item.unit) {
            unit = item.unit;
            break;
        }
    }

    // Create a bar chart for non-temporal data
    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: nodeIds, // Use node IDs as x-axis labels
            datasets: [{
                label: parameter + (unit ? ` (${unit})` : ''),
                data: values,
                backgroundColor: 'rgba(74, 123, 250, 0.7)',
                borderColor: '#4a7bfa',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#888888',
                        font: {
                            size: 10
                        }
                    },
                    title: {
                        display: true,
                        text: 'Node ID', // Updated x-axis label
                        color: '#4a7bfa',
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    }
                },
                y: {
                    grid: {
                        color: '#f0f0f0'
                    },
                    ticks: {
                        color: '#888888',
                        font: {
                            size: 10
                        }
                    },
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        boxWidth: 12,
                        font: {
                            size: 11
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    titleColor: '#333',
                    bodyColor: '#666',
                    borderColor: '#ddd',
                    borderWidth: 1,
                    cornerRadius: 4,
                    boxPadding: 6,
                    callbacks: {
                        label: function (context) {
                            const dataIndex = context.dataIndex;
                            return `${parameter}: ${data[dataIndex].rawValue}`;
                        }
                    }
                }
            }
        }
    });

    // Update the popup title
    document.querySelector('.popup-header').textContent = `Current ${parameter} Values`;
}

// Show error message
function showError(message) {
    const errorElement = document.getElementById('error');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}