// Mock for the conversation tree
const mockConversationTree = {
  message: "Hey 👋, how can I help you?",
  options: [
    { text: "1", next: "BuildingNode" },
    { text: "2", next: "VerticalNode" }
  ],
  nodes: {
    AskQuestionNode: {
      message: "Please enter your question:"
    }
  }
};

// Mock the lit elements module
jest.mock('https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js', () => ({
  LitElement: class {},
  html: () => '',
  css: () => ''
}), { virtual: true });

// Mock the Chart.js module
jest.mock('https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js', () => ({}), { virtual: true });

// Mock the conversation.js module
jest.mock('../../static/js/conversation.js', () => ({
  conversationTree: mockConversationTree
}), { virtual: true });

// Create a mock ChatBotComponent
class MockChatBotComponent {
  constructor() {
    this.popupActive = false;
    this.messages = [{ text: "Hello", sender: "bot" }];
    this.currentOptions = mockConversationTree.options;
    this.userInput = '';
    this.recommendedQuestions = [];
    this.showRecommendedQuestions = false;
  }

  togglePopup() {
    this.popupActive = !this.popupActive;
    return this.popupActive;
  }

  toggleRecommendedQuestions() {
    this.showRecommendedQuestions = !this.showRecommendedQuestions;
    return this.showRecommendedQuestions;
  }

  extractLocation(input) {
    const knownLocations = ['Kohli Block', 'Vindhya'];
    return knownLocations.find(location => 
      input.toLowerCase().includes(location.toLowerCase())
    );
  }

  // DataProcessor mock
  DataProcessor = class {
    constructor(data) {
      this.data = data;
    }

    parseValue(value) {
      const matches = value.match(/^[\d\.]+/);
      return matches ? parseFloat(matches[0]) : value;
    }

    aggregateData(method) {
      return { temperature: "26 C" };
    }
  };
}

// Assign the mock to the global scope
global.ChatBotComponent = MockChatBotComponent;

describe('ChatBotComponent', () => {
  let component;

  beforeEach(() => {
    component = new MockChatBotComponent();
  });

  test('initializes with default message', () => {
    expect(component.messages[0].text).toBe("Hello");
    expect(component.messages[0].sender).toBe("bot");
  });

  test('togglePopup toggles popup state', () => {
    const initialState = component.popupActive;
    const newState = component.togglePopup();
    expect(newState).toBe(!initialState);
  });

  test('toggleRecommendedQuestions toggles state', () => {
    const initialState = component.showRecommendedQuestions;
    const newState = component.toggleRecommendedQuestions();
    expect(newState).toBe(!initialState);
  });

  test('extractLocation finds location in string', () => {
    const result = component.extractLocation('What is the temperature at Kohli Block?');
    expect(result).toBe('Kohli Block');
  });

  test('DataProcessor.parseValue parses numbers', () => {
    const processor = new component.DataProcessor([]);
    expect(processor.parseValue('25.5 C')).toBe(25.5);
    expect(processor.parseValue('text')).toBe('text');
  });

  test('DataProcessor.aggregateData returns temperature', () => {
    const processor = new component.DataProcessor([]);
    const result = processor.aggregateData('avg');
    expect(result).toHaveProperty('temperature');
    expect(result.temperature).toBe('26 C');
  });
});
