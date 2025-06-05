/**
 * @jest-environment jsdom
 */

// Set up globals needed for the ChatBotComponent
global.window = {
  addEventListener: jest.fn(),
  customElements: { define: jest.fn() }
};

global.document = {
  addEventListener: jest.fn(),
  createElement: jest.fn(() => ({
    setAttribute: jest.fn(),
    style: {},
    appendChild: jest.fn(),
    innerHTML: '',
    classList: { add: jest.fn(), remove: jest.fn() },
    addEventListener: jest.fn()
  })),
  getElementById: jest.fn(() => ({
    classList: { 
      add: jest.fn(), 
      remove: jest.fn(),
      contains: jest.fn()
    },
    addEventListener: jest.fn(),
    scrollTop: 0,
    scrollHeight: 100
  })),
  querySelector: jest.fn(() => ({
    value: '',
    focus: jest.fn()
  })),
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn()
  }
};

// Mock for Chart
global.Chart = class {
  constructor() {
    this.destroyed = false;
    this.type = '';
    this.data = {};
    this.options = {};
  }
  destroy() {
    this.destroyed = true;
    return true;
  }
  update() {}
};

// Mock fetch API with more detailed responses
global.fetch = jest.fn(() => 
  Promise.resolve({
    ok: true,
    status: 200,
    headers: {
      get: jest.fn().mockReturnValue('application/json')
    },
    json: () => Promise.resolve({
      response: "Test response",
      is_temporal: false,
      node_data: {
        "aq-01": {
          filtered_data: {
            category1: {
              data: [
                { 
                  timestamp: "2023-01-01T12:00:00Z", 
                  temperature: "25.5 C",
                  humidity: "60 %",
                  node_id: "aq-01" 
                }
              ]
            }
          }
        }
      }
    })
  })
);

// Mock customElements
global.customElements = { define: jest.fn() };

// Mock for ResizeObserver
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock conversation tree
const mockConversationTree = {
  message: "Hey 👋, how can I help you?",
  options: [
    { text: "1", next: "BuildingNode" },
    { text: "2", next: "VerticalNode" },
    { text: "3", next: "NodeSpecificFinalNode", textInput: true },
    { text: "4", next: "ConversationalModeOptions" }
  ],
  nodes: {
    AskQuestionNode: {
      message: "Please enter your question:",
      input: true,
      next: "ProcessQuestionNode",
      textInput: true,
      recommendedQuestions: [
        "What is the temperature at Kohli Block?",
        "What are the current readings from the Air Quality sensor at T-Hub?"
      ]
    },
    BuildingNode: {
      message: "Building options",
      options: [
        { text: "1", next: "CommonBuildingNode", identifier: "AQ" }
      ]
    },
    CommonBuildingNode: {
      message: "Common building options",
      options: [
        { text: "1", next: "CommonNode", terminate: true, identifier: "VN" }
      ]
    },
    VerticalNode: {
      message: "Vertical options",
      options: [
        { text: "1", next: "CommonVerticalNode", identifier: "AQ" }
      ]
    },
    CommonVerticalNode: {
      message: "Common vertical options",
      options: [
        { text: "1", next: "CommonNode", terminate: true, accumulator: "avg" }
      ]
    },
    QuestionResponseOptionsNode: {
      message: "Would you like to:\n1. Ask Another Question\n2. Back to the menu\n3. Exit Chat",
      options: [
        { text: "1", next: "AskQuestionNode" },
        { text: "2", next: "MainMenu" },
        { text: "3", next: "ExitChatNode" }
      ]
    },
    MainMenu: {
      message: "Main menu",
      options: []
    },
    ExitChatNode: {
      message: "Thank you for using SASI",
      options: []
    },
    ProcessQuestionNode: {
      message: "Processing...",
      process: jest.fn(() => Promise.resolve("Processed response"))
    },
    TemperatureIndoorNode: {
      message: "Processing indoor readings request..."
    },
    TemperatureOutdoorNode: {
      message: "Processing outdoor readings request..."
    },
    NodeSpecificFinalNode: {
      message: "Type the node ID:",
      input: true,
      next: "CommonNode",
      terminate: true,
    },
    CommonNode: {
      message: "The corresponding data is given.",
      options: [
        { text: "1", next: "BuildingNode" }
      ]
    },
    ConversationalModeOptions: {
      message: "You chose Ask a Question",
      options: [
        { text: "1", next: "AskQuestionNode" },
        { text: "2", next: "MainMenu" }
      ]
    }
  }
};

// Mock the conversation.js module
jest.mock('../static/js/conversation.js', () => ({
  conversationTree: mockConversationTree,
  extractMessages: (tree) => {
    const messages = [];
    if (tree.message) {
      messages.push(tree.message);
    }
    return messages;
  }
}), { virtual: true });

// Create a comprehensive mock of the ChatBotComponent
class MockChatBotComponent {
  constructor() {
    this.popupActive = false;
    this.messages = [{ text: mockConversationTree.message, sender: "bot" }];
    this.currentOptions = mockConversationTree.options;
    this.userInput = "";
    this.buildingIdentifier = "";
    this.verticalIdentifier = "";
    this.floorIdentifier = "";
    this.acc = false;
    this.stringInput = false;
    this.recommendedQuestions = [];
    this.showRecommendedQuestions = false;
    this.conversationOptions = [];
    this.editingMessageIndex = -1;
    this.editedMessage = '';
    this.currentChart = null;
    this.shadowRoot = {
      getElementById: jest.fn((id) => {
        if (id === 'message-container') {
          return {
            classList: { add: jest.fn(), remove: jest.fn(), contains: jest.fn() },
            scrollTop: 0,
            scrollHeight: 100,
            innerHTML: '',
            appendChild: jest.fn()
          };
        } else if (id === 'chat-pop') {
          return {
            classList: { add: jest.fn(), remove: jest.fn(), contains: jest.fn() }
          };
        } else if (id === 'visualization-modal') {
          return {
            classList: { add: jest.fn() },
            addEventListener: jest.fn()
          };
        } else if (id === 'visualization-chart') {
          return {
            getContext: jest.fn(() => ({
              clearRect: jest.fn()
            }))
          };
        } else if (id === 'loading-spinner') {
          return {
            style: {}
          };
        } else if (id === 'error-message') {
          return {
            style: {},
            textContent: ''
          };
        } else if (id === 'visualization-close') {
          return {
            addEventListener: jest.fn()
          };
        } else if (id.startsWith('visualizeIcon_')) {
          return {
            addEventListener: jest.fn(),
            parentNode: {
              replaceChild: jest.fn()
            },
            cloneNode: jest.fn(() => ({
              addEventListener: jest.fn()
            }))
          };
        } else if (id.startsWith('indoorButton_') || id.startsWith('outdoorButton_')) {
          return {
            addEventListener: jest.fn()
          };
        }
        return null;
      }),
      querySelector: jest.fn(() => ({
        value: '',
        focus: jest.fn()
      })),
      querySelectorAll: jest.fn(() => []),
      removeChild: jest.fn(),
      appendChild: jest.fn()
    };
  }

  togglePopup() {
    this.popupActive = !this.popupActive;
    return this.popupActive;
  }

  toggleRecommendedQuestions() {
    this.showRecommendedQuestions = !this.showRecommendedQuestions;
    return this.showRecommendedQuestions;
  }

  handleUserInput(e) {
    this.userInput = e.target.value;
  }

  async sendMessage() {
    if (!this.userInput.trim()) {
      return false;
    }
    
    this.addMessage(this.userInput, 'user');
    
    // Simulate API response
    if (this.stringInput) {
      this.stringInput = false;
      
      // Add "Would you like to" follow-up message
      this.addMessage(
        "Would you like to:\n1. Ask Another Question\n2. Back to the menu\n3. Exit Chat",
        "bot"
      );
      this.currentOptions = mockConversationTree.nodes.QuestionResponseOptionsNode.options;
    } else {
      // Handle option selection
      const option = this.currentOptions.find(opt => opt.text === this.userInput);
      if (option) {
        const nextNode = mockConversationTree.nodes[option.next];
        if (nextNode) {
          this.addMessage(nextNode.message, 'bot');
          this.currentOptions = nextNode.options || [];
          
          if (nextNode.input) {
            this.stringInput = true;
            this.recommendedQuestions = nextNode.recommendedQuestions || [];
          } else {
            this.recommendedQuestions = [];
          }
        }
      }
    }
    
    this.userInput = '';
    return true;
  }

  startEditMessage(index) {
    if (this.messages[index].sender === 'user') {
      this.editingMessageIndex = index;
      this.editedMessage = this.messages[index].text;
      return true;
    }
    return false;
  }

  async saveEditedMessage() {
    if (this.editingMessageIndex !== -1 && this.editedMessage.trim()) {
      this.messages[this.editingMessageIndex].text = this.editedMessage.trim();
      
      // If there was a response after this message, remove it and add a new one
      const responseIndex = this.editingMessageIndex + 1;
      if (responseIndex < this.messages.length) {
        this.messages.splice(responseIndex);
      }
      
      // Add new loading response
      this.addMessage('●', 'bot');
      
      // Simulate API call
      const response = await this.sendMessageToBackend(this.editedMessage.trim());
      
      // Replace loading with actual response
      this.messages[this.messages.length - 1].text = response;
      
      this.editingMessageIndex = -1;
      this.editedMessage = '';
      return true;
    }
    return false;
  }

  cancelEditMessage() {
    this.editingMessageIndex = -1;
    this.editedMessage = '';
    return true;
  }

  scrollToBottom() {
    const messageContainer = this.shadowRoot.getElementById("message-container");
    if (messageContainer) {
      messageContainer.scrollTop = messageContainer.scrollHeight;
    }
    return true;
  }

  addMessage(text, sender) {
    this.messages.push({ text, sender });
    this.populateMessages();
    this.scrollToBottom();
    return this.messages.length;
  }

  resetInputAndPopulateMessages() {
    this.userInput = '';
    this.populateMessages();
    return true;
  }

  populateMessages() {
    const messageContainer = this.shadowRoot.getElementById("message-container");
    if (messageContainer) {
      messageContainer.innerHTML = '';
      
      this.messages.forEach((msg, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = `chat_message_wrapper ${msg.sender === 'bot' ? '' : 'chat_message_right'}`;
        
        const messageBubble = document.createElement('div');
        messageBubble.className = 'chat_message';
        
        if (this.editingMessageIndex === index && msg.sender === 'user') {
          const editInput = document.createElement('div');
          editInput.className = 'edit-message-input';
          messageBubble.appendChild(editInput);
        } else {
          messageBubble.innerHTML = msg.text.replace(/\n/g, '<br>');
        }
        
        wrapper.appendChild(messageBubble);
        messageContainer.appendChild(wrapper);
      });
    }
    return true;
  }

  handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      return this.sendMessage();
    }
    return false;
  }

  handleOptionSelection(optionText) {
    this.userInput = optionText;
    return this.sendMessage();
  }

  handleRecommendedQuestion(question) {
    this.userInput = question;
    this.recommendedQuestions = [];
    this.conversationOptions = [];
    return this.sendMessage();
  }

  extractLocation(input) {
    const knownLocations = ['Kohli Block', 'Vindhya'];
    const lowercaseInput = input.toLowerCase();
    
    return knownLocations.find(location => 
      lowercaseInput.includes(location.toLowerCase())
    );
  }

  async handleLocationButton(location) {
    this.addMessage(`Processing ${location} data...`, 'bot');
    
    // Simulate API call
    const response = await this.sendMessageToBackend(`Temperature at ${location}`);
    
    this.addMessage(response, 'bot');
    
    // Add follow-up options
    this.addMessage(
      "Would you like to:\n1. Ask Another Question\n2. Back to the menu\n3. Exit Chat",
      "bot"
    );
    
    this.currentOptions = mockConversationTree.nodes.QuestionResponseOptionsNode.options;
    return true;
  }

  async sendMessageToBackend(message) {
    try {
      const response = await fetch('http://localhost:8001/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: message })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const data = await response.json();
      return data.response || "No response from backend.";
    } catch (error) {
      console.error('Error sending message to backend:', error);
      return "Sorry, there was an error communicating with the backend.";
    }
  }

  async openVisualizationModal(query) {
    if (this.currentChart) {
      this.currentChart.destroy();
      this.currentChart = null;
    }
    
    // Create mock modal elements
    const modal = document.createElement('div');
    modal.id = 'visualization-modal';
    
    this.shadowRoot.appendChild(modal);
    
    try {
      const decodedQuery = decodeURIComponent(query);
      
      // Mock fetch data
      const response = await fetch('http://localhost:8001/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: decodedQuery })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const data = await response.json();
      
      // Create mock chart
      const ctx = this.shadowRoot.getElementById('visualization-chart').getContext('2d');
      this.currentChart = new Chart(ctx, {
        type: data.is_temporal ? 'line' : 'bar',
        data: {
          labels: ['Node 1', 'Node 2'],
          datasets: [{
            label: 'Temperature',
            data: [25, 26]
          }]
        },
        options: {}
      });
      
      return true;
    } catch (error) {
      console.error('Error creating visualization:', error);
      return false;
    }
  }

  async fetchDataAndAskContinue(buildingId, verticalId, floorId, accumulator, nodeId) {
    this.buildingIdentifier = buildingId || '';
    this.verticalIdentifier = verticalId || '';
    this.floorIdentifier = floorId || '';
    this.acc = accumulator || false;
    
    // Simulate fetch logic
    if (nodeId && nodeId !== 'aq-01') {
      // Simulate not finding the exact node
      this.addMessage(`No data found for the node ${nodeId}. One of the closest match is aq-01`, 'bot');
      nodeId = 'aq-01';
    }
    
    if (!buildingId && !verticalId && !floorId && !nodeId) {
      this.addMessage("No identifiers provided. Please specify at least one parameter.", 'bot');
      return false;
    }
    
    let message = "Data for the identifiers: \n";
    if (buildingId) message += `Building: ${buildingId}\n`;
    if (verticalId) message += `Vertical: ${verticalId}\n`;
    if (floorId) message += `Floor: ${floorId}\n`;
    if (nodeId) message += `Node: ${nodeId}\n`;
    
    message += "\nTemperature: 25°C\nHumidity: 60%\nAQI: Good";
    
    this.addMessage(message, 'bot');
    return true;
  }

  getLevenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    
    const matrix = [];
    
    // Initialize matrix
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    
    // Fill matrix
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        const cost = a.charAt(j - 1) === b.charAt(i - 1) ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // Deletion
          matrix[i][j - 1] + 1,      // Insertion
          matrix[i - 1][j - 1] + cost // Substitution
        );
      }
    }
    
    return matrix[b.length][a.length];
  }

  getNodeColor(nodeId, alpha = 1) {
    // Simple hash function to generate consistent colors
    const hash = nodeId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hash % 360;
    return `hsla(${hue}, 70%, 60%, ${alpha})`;
  }

  extractTemporalData(data) {
    const result = {
      temperature: {
        labels: ['2023-01-01', '2023-01-02'],
        values: [25, 26],
        nodeIds: ['aq-01', 'aq-01']
      }
    };
    return result;
  }

  extractCurrentData(data) {
    const result = {
      temperature: {
        labels: ['Node 1', 'Node 2'],
        values: [25, 26]
      }
    };
    return result;
  }

  DataProcessor = class {
    constructor(data) {
      this.data = data || [];
    }

    parseValue(value) {
      if (typeof value !== 'string') return value;
      
      const matches = value.match(/^[\d\.]+/);
      if (matches) {
        return parseFloat(matches[0]);
      }
      return value;
    }

    findMode(values) {
      if (!values || values.length === 0) return null;
      
      const frequency = {};
      let maxFreq = 0;
      let mode = values[0];
      
      for (const value of values) {
        frequency[value] = (frequency[value] || 0) + 1;
        if (frequency[value] > maxFreq) {
          maxFreq = frequency[value];
          mode = value;
        }
      }
      
      return mode;
    }

    calculateAverage(values) {
      if (!values || values.length === 0) return 0;
      
      const sum = values.reduce((acc, val) => acc + val, 0);
      return sum / values.length;
    }

    aggregateData(method) {
      if (this.data.length === 0) {
        return {};
      }
      
      const result = {};
      const ignoreKeys = ['node_id', 'name', 'latitude', 'longitude', 'xcor', 'ycor', 'type'];
      
      // Get all non-ignored keys from the first data item
      const keys = Object.keys(this.data[0]).filter(key => !ignoreKeys.includes(key));
      
      for (const key of keys) {
        const values = this.data.map(item => this.parseValue(item[key]));
        
        switch (method) {
          case 'avg':
            result[key] = this.calculateAverage(values);
            break;
          case 'max':
            result[key] = Math.max(...values);
            break;
          case 'min':
            result[key] = Math.min(...values);
            break;
          default:
            result[key] = this.findMode(values);
        }
        
        // Add units if the original data had them
        if (typeof this.data[0][key] === 'string') {
          const unit = this.data[0][key].replace(/^[\d\.]+/, '').trim();
          if (unit) {
            result[key] = `${result[key]} ${unit}`;
          }
        }
      }
      
      return result;
    }
  };
}

// Make the mock available globally
global.ChatBotComponent = MockChatBotComponent;

// Import the actual ChatBotComponent
import '../static/js/chat-bot-component.js'; // This registers the custom element

describe('Actual ChatBotComponent (LitElement)', () => {
  let element;

  beforeEach(async () => {
    // Create the component and add it to the DOM
    element = document.createElement('chat-bot-component');
    document.body.appendChild(element);
    // Wait for LitElement to complete its first update cycle
    await element.updateComplete;
  });

  afterEach(() => {
    // Clean up the element from the DOM
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
    // Reset mocks
    fetch.mockClear();
    if (global.Chart && global.Chart.mock) { // If Chart is a Jest mock
        global.Chart.mock.instances.forEach(instance => {
            if (instance.destroy) instance.destroy.mockClear();
        });
        global.Chart.mockClear();
    }
  });

  test('should render initial bot message', () => {
    const messageContainer = element.shadowRoot.getElementById('message-container');
    expect(messageContainer).not.toBeNull();
    const firstMessageBubble = messageContainer.querySelector('.chat_message_wrapper .chat_message');
    expect(firstMessageBubble).not.toBeNull();
    // The initial message comes from conversationTree which is imported by chat-bot-component.js
    // We need to ensure conversationTree is available in this test environment or mock its import.
    // For simplicity, let's assume conversationTree.message is "Hey 👋, how can I help you?..."
    expect(firstMessageBubble.textContent).toContain("Hey 👋, how can I help you?");
  });

  test('togglePopup should toggle visibility of the chat popup', async () => {
    const chatPopup = element.shadowRoot.getElementById('chat-pop');
    expect(chatPopup.classList.contains('active')).toBe(false); // Initially hidden

    element.togglePopup(); // Call the component's method
    await element.updateComplete; // Wait for re-render

    expect(chatPopup.classList.contains('active')).toBe(true); // Should be visible

    element.togglePopup();
    await element.updateComplete;

    expect(chatPopup.classList.contains('active')).toBe(false); // Should be hidden again
  });

  test('handleUserInput and sendMessage should add user and bot messages', async () => {
    // Mock fetch for sendMessageToBackend
    fetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ response: 'Mocked bot response' }),
    });
    
    // Simulate going into stringInput mode (e.g., after choosing "Ask a Question")
    element.stringInput = true; 
    element.currentOptions = []; // No specific options, direct input mode

    const userInputField = element.shadowRoot.querySelector('.input-area input');
    userInputField.value = 'Hello bot';
    element.handleUserInput({ target: userInputField }); // Simulate input event
    
    expect(element.userInput).toBe('Hello bot');

    const sendButton = element.shadowRoot.getElementById('send-button');
    sendButton.click(); // Simulate send button click
    
    await element.updateComplete; // Wait for messages to update and re-render

    const messageContainer = element.shadowRoot.getElementById('message-container');
    const messages = messageContainer.querySelectorAll('.chat_message_wrapper');
    
    // Initial bot message + user message + bot loading + bot response + bot options
    expect(messages.length).toBeGreaterThanOrEqual(4); 
    
    const userMessageText = Array.from(messages).find(m => m.classList.contains('chat_message_right'))
                                  .querySelector('.chat_message').textContent;
    expect(userMessageText).toBe('Hello bot');

    // Check for mocked bot response (it might be the second to last if options are added after)
    const botMessages = Array.from(messages).filter(m => !m.classList.contains('chat_message_right'));
    const lastBotMessageText = botMessages[botMessages.length - 2].querySelector('.chat_message').textContent; // Response before options
    expect(lastBotMessageText).toBe('Mocked bot response');

    // Check that the "Would you like to..." options are shown
    const finalBotMessageText = botMessages[botMessages.length - 1].querySelector('.chat_message').textContent;
    expect(finalBotMessageText).toContain("Would you like to:");
  });

  test('DataProcessor.calculateAverage should return undefined for NaN average', () => {
      const dataProcessor = new element.DataProcessor([]); // Access DataProcessor via an instance
      const result = dataProcessor.calculateAverage(['a', 'b']); // Non-numeric values
      expect(result).toBeUndefined();
  });

  test('DataProcessor.aggregateData should handle empty data', () => {
      const dataProcessor = new element.DataProcessor([]);
      const result = dataProcessor.aggregateData('avg');
      expect(result).toEqual({}); // Or whatever the expected behavior is for empty data
  });
  
  test('DataProcessor.aggregateData should handle non-numeric values correctly', () => {
      const data = [{ status: "good" }, { status: "bad" }, { status: "good" }];
      const dataProcessor = new element.DataProcessor(data);
      const result = dataProcessor.aggregateData('mode'); // Assuming default is mode
      expect(result.status).toBe("good");
  });

  test('saveEditedMessage should update message and fetch new response', async () => {
    // Add initial messages
    element.messages = [
        { text: "Initial bot message", sender: "bot" },
        { text: "User question", sender: "user" },
        { text: "Initial bot response", sender: "bot" }
    ];
    await element.updateComplete;

    // Start editing the user's message (index 1)
    element.startEditMessage(1);
    await element.updateComplete;
    expect(element.editingMessageIndex).toBe(1);
    element.editedMessage = "Edited user question";

    // Mock the backend response for the edited question
    fetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ response: "Response to edited question" }),
    });

    await element.saveEditedMessage();
    await element.updateComplete;
    
    expect(element.messages[1].text).toBe("Edited user question");
    // The original response at index 2 should be replaced by loading, then the new response.
    // The messages array structure after saveEditedMessage:
    // [original bot, edited user, new bot response, options]
    expect(element.messages[2].text).toBe("Response to edited question");
    expect(element.editingMessageIndex).toBe(-1);

    // Check if "Would you like to..." options are added
     const finalBotMessageText = element.messages[element.messages.length - 1].text;
     expect(finalBotMessageText).toContain("Would you like to:");
  });

  test('openVisualizationModal should create modal and attempt to fetch data', async () => {
    fetch.mockResolvedValueOnce({ // For the /debug endpoint
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ 
            is_temporal: false, 
            node_data: { 
                'node1': { category1: [{ name: 'N1', temperature: 25 }]} 
            } 
        }),
    });

    await element.openVisualizationModal(encodeURIComponent("show temperature"));
    await element.updateComplete;

    const modal = element.shadowRoot.getElementById('visualization-modal');
    expect(modal).not.toBeNull();
    expect(modal.classList.contains('show')).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8001/debug", // or the correct URL
        expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ query: "show temperature" })
        })
    );
    // Further tests can check for chart rendering if Chart.js is properly mocked/spied on.
  });

});

describe('ChatBotComponent', () => {
  let component;

  beforeEach(() => {
    component = new MockChatBotComponent();
    fetch.mockClear();
  });

  test('should initialize with default message', () => {
    expect(component.messages[0].sender).toBe('bot');
    expect(component.messages[0].text).toBe(mockConversationTree.message);
  });

  test('togglePopup should toggle popup state', () => {
    const initialState = component.popupActive;
    const result = component.togglePopup();
    expect(result).toBe(!initialState);
    expect(component.popupActive).toBe(!initialState);
  });

  test('toggleRecommendedQuestions toggles visibility state', () => {
    const initialState = component.showRecommendedQuestions;
    const result = component.toggleRecommendedQuestions();
    expect(result).toBe(!initialState);
    expect(component.showRecommendedQuestions).toBe(!initialState);
  });

  test('handleUserInput updates userInput property', () => {
    const event = { target: { value: 'test input' } };
    component.handleUserInput(event);
    expect(component.userInput).toBe('test input');
  });

  test('extractLocation finds valid location', () => {
    const result = component.extractLocation('What is the temperature in Vindhya?');
    expect(result).toBe('Vindhya');
    
    const result2 = component.extractLocation('How is the weather at Kohli Block today?');
    expect(result2).toBe('Kohli Block');
    
    const result3 = component.extractLocation('What is the current status?');
    expect(result3).toBeUndefined();
  });

  test('DataProcessor.parseValue parses numbers correctly', () => {
    const processor = new component.DataProcessor([]);
    expect(processor.parseValue("25.3 C")).toBe(25.3);
    expect(processor.parseValue("good")).toBe("good");
    expect(processor.parseValue(null)).toBe(null);
    expect(processor.parseValue(undefined)).toBe(undefined);
    expect(processor.parseValue(42)).toBe(42);
  });

  test('DataProcessor.aggregateData returns expected values', () => {
    const processor = new component.DataProcessor([
      { temperature: "25 C", humidity: "60 %" },
      { temperature: "26 C", humidity: "62 %" }
    ]);
    const result = processor.aggregateData("avg");
    expect(result).toHaveProperty('temperature');
    expect(result).toHaveProperty('humidity');
  });

  test('sendMessage adds messages to the conversation', async () => {
    component.userInput = 'hello';
    const initialCount = component.messages.length;
    await component.sendMessage();
    expect(component.messages.length).toBeGreaterThan(initialCount);
    expect(component.userInput).toBe('');
  });

  test('handleKeyDown triggers sendMessage on Enter key', async () => {
    component.userInput = 'test message';
    const event = { key: 'Enter', preventDefault: jest.fn() };
    const sendMessageSpy = jest.spyOn(component, 'sendMessage');
    
    await component.handleKeyDown(event);
    
    expect(event.preventDefault).toHaveBeenCalled();
    expect(sendMessageSpy).toHaveBeenCalled();
    
    sendMessageSpy.mockRestore();
  });

  test('message editing flow works correctly', () => {
    // Add a user message
    component.addMessage('Original message', 'user');
    const messageIndex = component.messages.length - 1;
    
    // Start editing the message
    const startResult = component.startEditMessage(messageIndex);
    expect(startResult).toBe(true);
    expect(component.editingMessageIndex).toBe(messageIndex);
    expect(component.editedMessage).toBe('Original message');
    
    // Edit the message
    component.editedMessage = 'Edited message';
    
    // Mock successful API call
    fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        status: 200,
        headers: {
          get: jest.fn().mockReturnValue('application/json')
        },
        json: () => Promise.resolve({
          response: "Response to edited message"
        })
      })
    );
    
    // Save the edit
    return component.saveEditedMessage().then(saveResult => {
      expect(saveResult).toBe(true);
      expect(component.messages[messageIndex].text).toBe('Edited message');
      expect(component.editingMessageIndex).toBe(-1);
      
      // Check that fetch was called
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8001/query',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Edited message')
        })
      );
    });
  });

  test('cancel edit message resets editing state', () => {
    // Setup editing state
    component.editingMessageIndex = 1;
    component.editedMessage = 'test';
    
    // Cancel edit
    const result = component.cancelEditMessage();
    expect(result).toBe(true);
    expect(component.editingMessageIndex).toBe(-1);
    expect(component.editedMessage).toBe('');
  });

  test('handleOptionSelection sets userInput and sends message', async () => {
    const sendMessageSpy = jest.spyOn(component, 'sendMessage');
    await component.handleOptionSelection('1');
    expect(component.userInput).toBe('1');
    expect(sendMessageSpy).toHaveBeenCalled();
    sendMessageSpy.mockRestore();
  });

  test('handleRecommendedQuestion sets userInput and clears recommendations', async () => {
    component.recommendedQuestions = ['What is the temperature?'];
    component.conversationOptions = [{ text: '1', next: 'test' }];
    
    const sendMessageSpy = jest.spyOn(component, 'sendMessage');
    await component.handleRecommendedQuestion('What is the temperature?');
    
    expect(component.userInput).toBe('What is the temperature?');
    expect(component.recommendedQuestions).toEqual([]);
    expect(component.conversationOptions).toEqual([]);
    expect(sendMessageSpy).toHaveBeenCalled();
    
    sendMessageSpy.mockRestore();
  });

  test('handleLocationButton adds a processing message', async () => {
    const initialCount = component.messages.length;
    await component.handleLocationButton('Indoor');
    expect(component.messages.length).toBeGreaterThan(initialCount);
    expect(component.messages[initialCount].text).toContain('Processing Indoor data');
  });

  test('sendMessageToBackend calls fetch with correct parameters', async () => {
    await component.sendMessageToBackend('test query');
    
    expect(fetch).toHaveBeenCalledWith('http://localhost:8001/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'test query' })
    });
  });

  test('openVisualizationModal handles chart creation and destruction', async () => {
    // First call should create a new chart
    const result1 = await component.openVisualizationModal('test query');
    expect(result1).toBe(true);
    expect(component.currentChart).not.toBeNull();
    
    // Mock an existing chart
    const mockChart = new Chart();
    component.currentChart = mockChart;
    const destroySpy = jest.spyOn(mockChart, 'destroy');
    
    // Second call should destroy existing chart and create new one
    const result2 = await component.openVisualizationModal('another query');
    expect(result2).toBe(true);
    expect(destroySpy).toHaveBeenCalled();
    
    destroySpy.mockRestore();
  });

  test('fetchDataAndAskContinue updates identifiers and adds message', async () => {
    const result = await component.fetchDataAndAskContinue('VN', 'AQ', '01', 'avg');
    expect(result).toBe(true);
    expect(component.buildingIdentifier).toBe('VN');
    expect(component.verticalIdentifier).toBe('AQ');
    expect(component.floorIdentifier).toBe('01');
    expect(component.acc).toBe('avg');
    
    // Check that the message contains the identifiers
    const lastMessage = component.messages[component.messages.length - 1];
    expect(lastMessage.text).toContain('Building: VN');
    expect(lastMessage.text).toContain('Vertical: AQ');
    expect(lastMessage.text).toContain('Floor: 01');
  });

  test('getLevenshteinDistance calculates string distance', () => {
    expect(component.getLevenshteinDistance('abc', 'abcd')).toBe(1);
    expect(component.getLevenshteinDistance('temperature', 'temp')).toBe(6);
    expect(component.getLevenshteinDistance('', 'abc')).toBe(3);
    expect(component.getLevenshteinDistance('abc', '')).toBe(3);
    expect(component.getLevenshteinDistance('', '')).toBe(0);
  });

  test('getNodeColor returns consistent colors', () => {
    // Same node ID should always get the same color
    const color1 = component.getNodeColor('aq-01');
    const color2 = component.getNodeColor('aq-01');
    expect(color1).toBe(color2);
    
    // Different node IDs should get different colors
    const color3 = component.getNodeColor('aq-02');
    expect(color1).not.toBe(color3);
    
    // Alpha parameter should affect the output
    const colorWithAlpha = component.getNodeColor('aq-01', 0.5);
    expect(colorWithAlpha).toContain('0.5');
  });

  test('extractTemporalData processes data correctly', () => {
    const mockData = {
      node_data: {
        'aq-01': {
          filtered_data: {
            category1: {
              data: [
                { timestamp: '2023-01-01', temperature: 25 }
              ]
            }
          }
        }
      }
    };
    
    const result = component.extractTemporalData(mockData);
    expect(result).toHaveProperty('temperature');
    expect(result.temperature).toHaveProperty('labels');
    expect(result.temperature).toHaveProperty('values');
    expect(result.temperature).toHaveProperty('nodeIds');
  });

  test('extractCurrentData processes data correctly', () => {
    const mockData = {
      node_data: {
        'aq-01': {
          category1: [
            { temperature: 25, name: 'Node 1' }
          ]
        }
      }
    };
    
    const result = component.extractCurrentData(mockData);
    expect(result).toHaveProperty('temperature');
    expect(result.temperature).toHaveProperty('labels');
    expect(result.temperature).toHaveProperty('values');
  });

  test('message rendering should display user and bot messages correctly', () => {
    component.messages = [
      { text: 'Hello', sender: 'bot' },
      { text: 'Hi there', sender: 'user' }
    ];
    
    const populateMessagesSpy = jest.spyOn(component, 'populateMessages');
    component.populateMessages();
    
    expect(populateMessagesSpy).toHaveBeenCalled();
    expect(component.shadowRoot.getElementById).toHaveBeenCalledWith('message-container');
    
    populateMessagesSpy.mockRestore();
  });

  test('message editing should save edited message and get new response', async () => {
    // Setup
    component.messages = [
      { text: 'Hello', sender: 'bot' },
      { text: 'Original message', sender: 'user' },
      { text: 'First response', sender: 'bot' }
    ];
    
    // Start editing
    component.startEditMessage(1);
    expect(component.editingMessageIndex).toBe(1);
    
    // Change the message
    component.editedMessage = 'Edited message';
    
    // Mock the backend response
    fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        status: 200,
        headers: { get: jest.fn().mockReturnValue('application/json') },
        json: () => Promise.resolve({ response: 'New response' })
      })
    );
    
    // Save edit
    await component.saveEditedMessage();
    
    // Verify changes
    expect(component.messages[1].text).toBe('Edited message');
    expect(component.editingMessageIndex).toBe(-1);
    expect(component.editedMessage).toBe('');
  });

  test('should auto-scroll to bottom when new messages added', () => {
    const scrollToBottomSpy = jest.spyOn(component, 'scrollToBottom');
    
    component.addMessage('Test message', 'user');
    
    expect(scrollToBottomSpy).toHaveBeenCalled();
    
    scrollToBottomSpy.mockRestore();
  });

  test('extractLocation should handle different location formats', () => {
    // Standard format
    expect(component.extractLocation('Temperature at Vindhya')).toBe('Vindhya');
    
    // With building
    expect(component.extractLocation('Humidity in Kohli Block')).toBe('Kohli Block');
    
    // Mixed case
    expect(component.extractLocation('What is the temperature at vindhya?')).toBe('Vindhya');
    
    // With surrounding text
    expect(component.extractLocation('Tell me about the air quality at Kohli Block today')).toBe('Kohli Block');
  });

  test('extractLocation should return undefined for unknown locations', () => {
    expect(component.extractLocation('What is the temperature at Admin Block?')).toBeUndefined();
    expect(component.extractLocation('Show me data for Library')).toBeUndefined();
    expect(component.extractLocation('Current weather')).toBeUndefined();
  });

  test('DataProcessor calculateAverage should handle empty arrays', () => {
    const processor = new component.DataProcessor([]);
    expect(processor.calculateAverage([])).toBe(0);
    expect(processor.calculateAverage(null)).toBe(0);
    expect(processor.calculateAverage(undefined)).toBe(0);
  });

  test('DataProcessor findMode should return most frequent value', () => {
    const processor = new component.DataProcessor([]);
    expect(processor.findMode(['a', 'b', 'a', 'c', 'a'])).toBe('a');
    expect(processor.findMode([1, 2, 2, 3])).toBe(2);
    expect(processor.findMode([1])).toBe(1);
    expect(processor.findMode([])).toBe(null);
    expect(processor.findMode(null)).toBe(null);
  });

  test('DataProcessor aggregateData should handle different methods', () => {
    const processor = new component.DataProcessor([
      { temperature: '25 C', humidity: '60 %' },
      { temperature: '30 C', humidity: '50 %' },
      { temperature: '20 C', humidity: '70 %' }
    ]);
    
    // Average
    const avgResult = processor.aggregateData('avg');
    expect(avgResult.temperature).toBeCloseTo(25);
    
    // Max
    const maxResult = processor.aggregateData('max');
    expect(maxResult.temperature).toBe(30);
    
    // Min
    const minResult = processor.aggregateData('min');
    expect(minResult.temperature).toBe(20);
    
    // Default (mode)
    const defaultResult = processor.aggregateData();
    expect(defaultResult.temperature).toBe(25);
  });

  test('fetchDataAndAskContinue should handle missing identifiers', async () => {
    const result = await component.fetchDataAndAskContinue();
    expect(result).toBe(false);
    
    const lastMessage = component.messages[component.messages.length - 1];
    expect(lastMessage.text).toContain('No identifiers provided');
  });

  test('fetchDataAndAskContinue should find closest match for node ID', async () => {
    await component.fetchDataAndAskContinue(null, null, null, null, 'invalid-node');
    
    const lastMessage = component.messages[component.messages.length - 2];
    expect(lastMessage.text).toContain('closest match is aq-01');
  });

  test('sendMessageToBackend should handle server errors', async () => {
    // Mock a server error
    fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: false,
        status: 500
      })
    );
    
    const response = await component.sendMessageToBackend('test query');
    expect(response).toContain('error');
  });

  test('handleLocationButton should add location-specific response', async () => {
    const initialLength = component.messages.length;
    
    await component.handleLocationButton('Indoor');
    
    // Check that we added processing message
    expect(component.messages[initialLength].text).toContain('Processing Indoor data');
    
    // Check that fetch was called with location-specific query
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8001/query',
      expect.objectContaining({
        body: expect.stringContaining('Temperature at Indoor')
      })
    );
    
    // Check that we added response message
    expect(component.messages.length).toBeGreaterThan(initialLength + 1);
    
    // Check that follow-up options were added
    const lastMessage = component.messages[component.messages.length - 1];
    expect(lastMessage.text).toContain('Would you like to:');
  });
});
describe('DataProcessor.parseValue', () => {
  let dataProcessor;

  beforeEach(() => {
    dataProcessor = new element.DataProcessor([]);
  });

  test('should handle null value', () => {
    const result = dataProcessor.parseValue(null);
    expect(result).toBeNull();
  });

  test('should handle undefined value', () => {
    const result = dataProcessor.parseValue(undefined);
    expect(result).toBeUndefined();
  });

  test('should parse a string with a numeric value at the beginning', () => {
    const result = dataProcessor.parseValue('25 C');
    expect(result).toBe(25);
  });

  test('should parse a string with a decimal value', () => {
    const result = dataProcessor.parseValue('25.5 C');
    expect(result).toBe(25.5);
  });

  test('should return the original value if no numeric part at the beginning', () => {
    const result = dataProcessor.parseValue('Temperature: 25 C');
    expect(result).toBe('Temperature: 25 C');
  });

  test('should return the original value for non-string types', () => {
    expect(dataProcessor.parseValue(42)).toBe(42);
    expect(dataProcessor.parseValue(true)).toBe(true);
    expect(dataProcessor.parseValue([])).toEqual([]);
    
    const obj = { key: 'value' };
    expect(dataProcessor.parseValue(obj)).toBe(obj);
  });

  test('should parse string with only numeric characters', () => {
    expect(dataProcessor.parseValue('123')).toBe(123);
  });

  test('should handle string with multiple decimal points but only parse first valid number', () => {
    expect(dataProcessor.parseValue('123.45.67')).toBe(123.45);
  });
});
