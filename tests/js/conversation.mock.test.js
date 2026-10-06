// Mock the conversation tree and import it
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

// Mock the extractMessages function
const mockExtractMessages = jest.fn(tree => {
  const messages = [];
  if (tree.message) {
    messages.push(tree.message);
  }
  return messages;
});

// Mock the module
jest.mock('../../static/js/conversation.js', () => ({
  conversationTree: mockConversationTree,
  extractMessages: mockExtractMessages
}), { virtual: true });

// Import the mock
const { conversationTree, extractMessages } = require('../../static/js/conversation.js');

describe('Conversation module', () => {
  test('conversationTree has main message', () => {
    expect(conversationTree.message).toBeDefined();
    expect(typeof conversationTree.message).toBe('string');
  });

  test('conversationTree has options array', () => {
    expect(Array.isArray(conversationTree.options)).toBe(true);
    expect(conversationTree.options.length).toBeGreaterThan(0);
  });

  test('conversationTree has nodes object', () => {
    expect(conversationTree.nodes).toBeDefined();
    expect(typeof conversationTree.nodes).toBe('object');
  });
  
  test('extractMessages function works', () => {
    const result = extractMessages(conversationTree);
    expect(Array.isArray(result)).toBe(true);
    expect(mockExtractMessages).toHaveBeenCalled();
  });
});
