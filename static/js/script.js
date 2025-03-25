document.addEventListener('DOMContentLoaded', function() {
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const sensorList = document.getElementById('sensorList');
    const sensorSearch = document.getElementById('sensorSearch');
    const exampleButtons = document.querySelectorAll('.example-btn');
    
    let isWaitingForResponse = false;

    // Load sensors when the page loads
    loadSensors();

    // Send message when send button is clicked
    sendButton.addEventListener('click', sendMessage);

    // Send message when Enter key is pressed
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Populate chat with example questions
    exampleButtons.forEach(button => {0
        button.addEventListener('click', function() {
            userInput.value = this.textContent;
            sendMessage();
        });
    });

    // Filter sensors when searching
    sensorSearch.addEventListener('input', function() {
        filterSensors(this.value);
    });

    // Function to load sensors from the API
    function loadSensors() {
        fetch('/api/sensors')
            .then(response => response.json())
            .then(data => {
                sensorList.innerHTML = '';
                if (Object.keys(data).length === 0) {
                    sensorList.innerHTML = '<div class="no-sensors">No sensors available</div>';
                    return;
                }

                // Sort buildings alphabetically
                const sortedBuildings = Object.keys(data).sort();
                
                sortedBuildings.forEach(building => {
                    const buildingSection = document.createElement('div');
                    buildingSection.className = 'building-section';
                    
                    const buildingHeader = document.createElement('div');
                    buildingHeader.className = 'building-header';
                    buildingHeader.innerHTML = `${building} <i class="fas fa-chevron-down"></i>`;
                    buildingHeader.addEventListener('click', function() {
                        this.classList.toggle('collapsed');
                        const sensorContent = this.nextElementSibling;
                        sensorContent.style.display = sensorContent.style.display === 'none' ? 'block' : 'none';
                    });
                    
                    const sensorContent = document.createElement('div');
                    sensorContent.className = 'sensor-content';
                    
                    // Sort sensor types alphabetically
                    const sortedSensorTypes = Object.keys(data[building]).sort();
                    
                    sortedSensorTypes.forEach(sensorType => {
                        const sensorTypeDiv = document.createElement('div');
                        sensorTypeDiv.className = 'sensor-type';
                        
                        const sensorTypeName = document.createElement('div');
                        sensorTypeName.className = 'sensor-type-name';
                        sensorTypeName.textContent = sensorType;
                        
                        sensorTypeDiv.appendChild(sensorTypeName);
                        
                        // Sort sensors by name
                        const sortedSensors = data[building][sensorType].sort((a, b) => 
                            a.name.localeCompare(b.name)
                        );
                        
                        sortedSensors.forEach(sensor => {
                            const sensorNode = document.createElement('div');
                            sensorNode.className = 'sensor-node';
                            sensorNode.textContent = sensor.name;
                            sensorNode.dataset.building = building;
                            sensorNode.dataset.type = sensorType;
                            sensorNode.dataset.id = sensor.node_id;
                            
                            sensorNode.addEventListener('click', function() {
                                const suggestion = `What are the current readings from the ${sensorType} sensor at ${building}?`;
                                userInput.value = suggestion;
                                userInput.focus();
                            });
                            
                            sensorTypeDiv.appendChild(sensorNode);
                        });
                        
                        sensorContent.appendChild(sensorTypeDiv);
                    });
                    
                    buildingSection.appendChild(buildingHeader);
                    buildingSection.appendChild(sensorContent);
                    sensorList.appendChild(buildingSection);
                });
            })
            .catch(error => {
                console.error('Error fetching sensors:', error);
                sensorList.innerHTML = '<div class="error-message">Error loading sensors. Please try again later.</div>';
            });
    }

    // Function to filter sensors based on search input
    function filterSensors(searchTerm) {
        searchTerm = searchTerm.toLowerCase();
        const buildingSections = document.querySelectorAll('.building-section');
        
        buildingSections.forEach(section => {
            const buildingHeader = section.querySelector('.building-header');
            const buildingName = buildingHeader.textContent.toLowerCase();
            const sensorNodes = section.querySelectorAll('.sensor-node');
            let hasVisibleSensors = false;
            
            // Check if building name matches search term
            const buildingMatches = buildingName.includes(searchTerm);
            
            sensorNodes.forEach(node => {
                const sensorName = node.textContent.toLowerCase();
                const sensorType = node.dataset.type.toLowerCase();
                
                // Show sensor if it matches search term or if building matches
                if (sensorName.includes(searchTerm) || sensorType.includes(searchTerm) || buildingMatches) {
                    node.style.display = 'block';
                    hasVisibleSensors = true;
                } else {
                    node.style.display = 'none';
                }
            });
            
            // Show/hide the entire building section based on whether it has visible sensors
            section.style.display = hasVisibleSensors ? 'block' : 'none';
        });
    }

    // Function to send a message to the chatbot
    function sendMessage() {
        const message = userInput.value.trim();
        if (message === '' || isWaitingForResponse) return;
        
        // Add user message to chat
        addMessage(message, 'user');
        
        // Clear input
        userInput.value = '';
        
        // Show typing indicator
        showTypingIndicator();
        
        // Set flag to prevent multiple requests
        isWaitingForResponse = true;
        
        // Send request to API
        fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        })
        .then(response => response.json())
        .then(data => {
            // Remove typing indicator
            removeTypingIndicator();
            
            // Add bot response to chat
            if (data.error) {
                addMessage('Sorry, I encountered an error. Please try again.', 'bot');
            } else {
                addMessage(data.response, 'bot');
            }
            
            // Reset flag
            isWaitingForResponse = false;
        })
        .catch(error => {
            console.error('Error:', error);
            removeTypingIndicator();
            addMessage('Sorry, I encountered an error. Please try again.', 'bot');
            isWaitingForResponse = false;
        });
    }

    // Function to add a message to the chat
    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        // Process markdown-like formatting in bot messages
        if (sender === 'bot') {
            // Convert newlines to <br>
            text = text.replace(/\n/g, '<br>');
            
            // Bold text between asterisks
            text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            
            // Italic text between single asterisks
            text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
            
            // Convert bullet lists
            text = text.replace(/^- (.*?)$/gm, '<li>$1</li>');
            text = text.replace(/<li>.*?<\/li>/s, '<ul>$&</ul>');
        }
        
        messageContent.innerHTML = text;
        messageDiv.appendChild(messageContent);
        
        chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Function to show typing indicator
    function showTypingIndicator() {
        const typing = document.createElement('div');
        typing.className = 'typing-indicator';
        typing.id = 'typingIndicator';
        
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('span');
            typing.appendChild(dot);
        }
        
        chatMessages.appendChild(typing);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Function to remove typing indicator
    function removeTypingIndicator() {
        const typing = document.getElementById('typingIndicator');
        if (typing) {
            typing.remove();
        }
    }
});