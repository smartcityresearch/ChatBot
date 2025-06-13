/**
 * @jest-environment jsdom
 */

// Mocking fetch before import so it's available for any imported modules
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ response: "Test response" })
  })
);

// Import the actual conversation.js module - need to use the relative path from the test file
import { conversationTree, extractMessages } from '../../static/js/conversation.js';

describe('conversationTree structure', () => {
  test('should have root level properties (message, options, nodes)', () => {
    expect(conversationTree).toHaveProperty('message');
    expect(conversationTree).toHaveProperty('options');
    expect(conversationTree).toHaveProperty('nodes');

    expect(typeof conversationTree.message).toBe('string');
    expect(Array.isArray(conversationTree.options)).toBe(true);
    expect(typeof conversationTree.nodes).toBe('object');
  });

  test('should have valid options with next property', () => {
    conversationTree.options.forEach(option => {
      expect(option).toHaveProperty('text');
      expect(option).toHaveProperty('next');
      // Verify next points to a valid node
      expect(conversationTree.nodes[option.next]).toBeDefined();
    });
  });

  test('should have an AskQuestionNode with required properties', () => {
    const askQuestionNode = conversationTree.nodes.AskQuestionNode;
    expect(askQuestionNode).toBeDefined();
    expect(askQuestionNode.message).toContain('Please enter your question');
    expect(askQuestionNode.input).toBe(true);
    expect(askQuestionNode.next).toBe('ProcessQuestionNode');
    expect(askQuestionNode.textInput).toBe(true);
    expect(Array.isArray(askQuestionNode.recommendedQuestions)).toBe(true);
    expect(askQuestionNode.recommendedQuestions.length).toBeGreaterThan(0);
  });

  test('should have a BuildingNode with valid options structure', () => {
    const buildingNode = conversationTree.nodes.BuildingNode;
    expect(buildingNode).toBeDefined();
    expect(buildingNode.message).toContain('Building Specific Data');
    expect(Array.isArray(buildingNode.options)).toBe(true);

    // Verify options structure
    buildingNode.options.forEach(option => {
      expect(option).toHaveProperty('text');
      expect(option).toHaveProperty('next');
      expect(option).toHaveProperty('identifier');
      expect(typeof option.identifier).toBe('string');
      expect(option.identifier.length).toBe(2); // Two-character identifiers
    });

    // Check all building options exist
    const identifiers = buildingNode.options.map(opt => opt.identifier);
    const expectedIdentifiers = ['AQ', 'EM', 'SL', 'SR', 'WE', 'WM', 'WN', 'CM'];
    expect(identifiers.sort()).toEqual(expectedIdentifiers.sort());
  });

  test('should have CommonBuildingNode with building options', () => {
    const commonBuildingNode = conversationTree.nodes.CommonBuildingNode;
    expect(commonBuildingNode).toBeDefined();
    expect(commonBuildingNode.message).toContain('building data');
    expect(Array.isArray(commonBuildingNode.options)).toBe(true);

    // Check all building options
    const buildingCodes = commonBuildingNode.options.map(opt => opt.identifier);
    expect(buildingCodes).toContain('VN'); // Vindhya
    expect(buildingCodes).toContain('KB'); // Kohli

    // Check terminate flag
    commonBuildingNode.options.forEach(option => {
      expect(option.terminate).toBe(true);
    });
  });

  test('should have VerticalNode with same verticals as BuildingNode', () => {
    const verticalNode = conversationTree.nodes.VerticalNode;
    const buildingNode = conversationTree.nodes.BuildingNode;

    expect(verticalNode).toBeDefined();
    expect(verticalNode.message).toContain('Vertical Specific Data');

    const verticalIdentifiers = verticalNode.options.map(opt => opt.identifier);
    const buildingIdentifiers = buildingNode.options.map(opt => opt.identifier);

    expect(verticalIdentifiers.sort()).toEqual(buildingIdentifiers.sort());
  });

  test('should have CommonVerticalNode with aggregation options', () => {
    const commonVerticalNode = conversationTree.nodes.CommonVerticalNode;
    expect(commonVerticalNode).toBeDefined();
    expect(commonVerticalNode.message).toContain('value');

    // Check for aggregation options
    const accumulators = commonVerticalNode.options.map(opt => opt.accumulator);
    expect(accumulators).toContain('avg');
    expect(accumulators).toContain('max');
    expect(accumulators).toContain('min');

    // Verify all options have terminate flag
    commonVerticalNode.options.forEach(option => {
      expect(option.terminate).toBe(true);
    });
  });

  test('should have ConversationalModeOptions with valid structure', () => {
    const conversationalNode = conversationTree.nodes.ConversationalModeOptions;
    expect(conversationalNode).toBeDefined();
    expect(conversationalNode.message).toContain('Ask a Question');
    expect(Array.isArray(conversationalNode.options)).toBe(true);

    // Should have option to go to AskQuestionNode
    const askOption = conversationalNode.options.find(opt => opt.next === 'AskQuestionNode');
    expect(askOption).toBeDefined();

    // Should have option to go back to MainMenu
    const menuOption = conversationalNode.options.find(opt => opt.next === 'MainMenu');
    expect(menuOption).toBeDefined();
  });

  test('should have a ProcessQuestionNode with process method', () => {
    const processNode = conversationTree.nodes.ProcessQuestionNode;
    expect(processNode).toBeDefined();
    expect(processNode.message).toContain('Processing');
    expect(processNode.terminate).toBe(true);
    expect(processNode.apiCall).toBe(true);
    expect(typeof processNode.process).toBe('function');
  });

  test('should have MainMenu with same options as root', () => {
    const mainMenu = conversationTree.nodes.MainMenu;
    expect(mainMenu).toBeDefined();
    expect(mainMenu.message).toContain('Please choose an option');

    // Should have same number of options as root
    expect(mainMenu.options.length).toBe(conversationTree.options.length);

    // Should point to same nodes as root options
    const mainMenuNextNodes = mainMenu.options.map(opt => opt.next).sort();
    const rootNextNodes = conversationTree.options.map(opt => opt.next).sort();
    expect(mainMenuNextNodes).toEqual(rootNextNodes);
  });

  test('should have ExitChatNode with option to return to MainMenu', () => {
    const exitNode = conversationTree.nodes.ExitChatNode;
    expect(exitNode).toBeDefined();
    expect(exitNode.message).toContain('Thank you');
    expect(Array.isArray(exitNode.options)).toBe(true);

    // Should have an option to return to MainMenu
    const mainMenuOption = exitNode.options.find(opt => opt.next === 'MainMenu');
    expect(mainMenuOption).toBeDefined();
  });
});

describe('conversationTree additional node coverage', () => {
  test('should have TemperatureIndoorNode and TemperatureOutdoorNode with message', () => {
    const indoor = conversationTree.nodes.TemperatureIndoorNode;
    const outdoor = conversationTree.nodes.TemperatureOutdoorNode;
    expect(indoor).toBeDefined();
    expect(indoor.message).toContain('indoor');
    expect(outdoor).toBeDefined();
    expect(outdoor.message).toContain('outdoor');
  });

  test('should have NodeSpecificNode, NodeSp, FloorNode, NodeSpecificFinalNode with correct structure', () => {
    const nodeSpecific = conversationTree.nodes.NodeSpecificNode;
    expect(nodeSpecific).toBeDefined();
    expect(nodeSpecific.message).toContain('Node Specific Data');
    expect(Array.isArray(nodeSpecific.options)).toBe(true);

    const nodeSp = conversationTree.nodes.NodeSp;
    expect(nodeSp).toBeDefined();
    expect(nodeSp.message).toContain('Which building data');
    expect(Array.isArray(nodeSp.options)).toBe(true);

    const floorNode = conversationTree.nodes.FloorNode;
    expect(floorNode).toBeDefined();
    expect(floorNode.message).toContain('Please select a floor');
    expect(Array.isArray(floorNode.options)).toBe(true);

    const finalNode = conversationTree.nodes.NodeSpecificFinalNode;
    expect(finalNode).toBeDefined();
    expect(finalNode.input).toBe(true);
    expect(finalNode.terminate).toBe(true);
  });

  test('should traverse all nodes in extractMessages', () => {
    // This will traverse all nodes, including those without message
    const messages = extractMessages(conversationTree);
    // Should include all messages from nodes with a message property
    expect(messages).toContain(conversationTree.nodes.TemperatureIndoorNode.message);
    expect(messages).toContain(conversationTree.nodes.TemperatureOutdoorNode.message);
    expect(messages).toContain(conversationTree.nodes.FloorNode.message);
    expect(messages).toContain(conversationTree.nodes.NodeSp.message);
    expect(messages).toContain(conversationTree.nodes.NodeSpecificNode.message);
    expect(messages).toContain(conversationTree.nodes.NodeSpecificFinalNode.message);
  });

  test('extractMessages should handle option objects with message', () => {
    // Option objects can have a message property (edge case)
    const tree = {
      message: "Root",
      options: [
        { text: "Option 1", message: "Option message" }
      ]
    };
    const messages = extractMessages(tree);
    expect(messages).toContain("Root");
    expect(messages).toContain("Option message");
  });

  test('extractMessages should handle deeply nested nodes', () => {
    const tree = {
      nodes: {
        a: {
          message: "A",
          nodes: {
            b: { message: "B" }
          }
        }
      }
    };
    const messages = extractMessages(tree);
    expect(messages).toContain("A");
    expect(messages).toContain("B");
  });
});

describe('ProcessQuestionNode.process method edge cases', () => {
  test('should return "No response from backend." if response has no response property', async () => {
    fetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({})
    }));
    const processMethod = conversationTree.nodes.ProcessQuestionNode.process;
    const result = await processMethod("Test query");
    expect(result).toBe("No response from backend.");
  });

  test('should log error and return fallback on fetch exception', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    fetch.mockImplementationOnce(() => { throw new Error("fail"); });
    const processMethod = conversationTree.nodes.ProcessQuestionNode.process;
    const result = await processMethod("fail query");
    expect(result).toBe("Backend is not reachable.");
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test('should log error and return fallback on non-ok response', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    fetch.mockImplementationOnce(() => Promise.resolve({
      ok: false,
      status: 500,
      statusText: "Internal Server Error"
    }));
    const processMethod = conversationTree.nodes.ProcessQuestionNode.process;
    const result = await processMethod("fail query");
    expect(result).toBe("Backend is not reachable.");
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('extractMessages function', () => {
  test('should extract messages from conversationTree', () => {
    const messages = extractMessages(conversationTree);

    // Should be an array of messages
    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBeGreaterThan(0);

    // Should include the root message
    expect(messages).toContain(conversationTree.message);

    // Should include message from AskQuestionNode
    expect(messages.some(msg => msg.includes('Please enter your question'))).toBe(true);

    // Should include message from BuildingNode
    expect(messages.some(msg => msg.includes('Building Specific Data'))).toBe(true);
  });

  test('should handle missing message property', () => {
    const testTree = {
      nodes: {
        node1: { message: "Message 1" },
        node2: { options: [{ text: "Option text" }] } // No message property
      }
    };

    const messages = extractMessages(testTree);
    expect(messages).toContain("Message 1");
    expect(messages.length).toBe(1);
  });

  test('should handle empty tree', () => {
    const emptyTree = {};
    const messages = extractMessages(emptyTree);
    expect(messages).toEqual([]);
  });
});

describe('ProcessQuestionNode.process method', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test('should call fetch with correct parameters', async () => {
    const processMethod = conversationTree.nodes.ProcessQuestionNode.process;
    const inputText = "What is the temperature?";

    await processMethod(inputText);

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8001/query",  // Updated URL to match implementation
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: inputText })
      }
    );
  });

  test('should return response from API', async () => {
    const processMethod = conversationTree.nodes.ProcessQuestionNode.process;
    const result = await processMethod("Test query");

    expect(result).toBe("Test response");
  });

  test('should handle fetch error', async () => {
    // Mock fetch to throw an error
    fetch.mockImplementationOnce(() => Promise.reject(new Error("Network error")));

    const processMethod = conversationTree.nodes.ProcessQuestionNode.process;
    const result = await processMethod("Test query");

    expect(result).toContain("Backend is not reachable");
  });

  test('should handle non-ok response', async () => {
    // Mock fetch to return non-ok response
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: "Internal Server Error"
      })
    );

    const processMethod = conversationTree.nodes.ProcessQuestionNode.process;
    const result = await processMethod("Test query");

    expect(result).toContain("Backend is not reachable");
  });
});

describe('Conversation tree navigation paths', () => {
  test('should have valid path from root to BuildingNode to CommonBuildingNode', () => {
    // Start at root
    const buildingOption = conversationTree.options.find(opt => opt.next === 'BuildingNode');
    expect(buildingOption).toBeDefined();

    // Navigate to BuildingNode
    const buildingNode = conversationTree.nodes[buildingOption.next];
    expect(buildingNode).toBeDefined();

    // Select first option in BuildingNode
    const firstBuildingOption = buildingNode.options[0];
    expect(firstBuildingOption).toBeDefined();
    expect(firstBuildingOption.next).toBe('CommonBuildingNode');

    // Navigate to CommonBuildingNode
    const commonBuildingNode = conversationTree.nodes[firstBuildingOption.next];
    expect(commonBuildingNode).toBeDefined();

    // Select first option in CommonBuildingNode
    const buildingSelectionOption = commonBuildingNode.options[0];
    expect(buildingSelectionOption).toBeDefined();
    expect(buildingSelectionOption.next).toBe('CommonNode');
    expect(buildingSelectionOption.terminate).toBe(true);

    // Navigate to final CommonNode
    const commonNode = conversationTree.nodes[buildingSelectionOption.next];
    expect(commonNode).toBeDefined();
    expect(commonNode.message).toContain('corresponding data');
  });

  test('should have valid path from root to AskQuestionNode to ProcessQuestionNode', () => {
    // Start at conversational mode option
    const conversationalOption = conversationTree.options.find(opt => opt.next === 'ConversationalModeOptions');
    expect(conversationalOption).toBeDefined();

    // Navigate to ConversationalModeOptions
    const conversationalNode = conversationTree.nodes[conversationalOption.next];
    expect(conversationalNode).toBeDefined();

    // Select option to go to AskQuestionNode
    const askOption = conversationalNode.options.find(opt => opt.next === 'AskQuestionNode');
    expect(askOption).toBeDefined();

    // Navigate to AskQuestionNode
    const askQuestionNode = conversationTree.nodes[askOption.next];
    expect(askQuestionNode).toBeDefined();
    expect(askQuestionNode.input).toBe(true);
    expect(askQuestionNode.next).toBe('ProcessQuestionNode');

    // Next should be ProcessQuestionNode
    const processNode = conversationTree.nodes[askQuestionNode.next];
    expect(processNode).toBeDefined();
    expect(processNode.terminate).toBe(true);
  });

  test('should have valid path to exit chat and return to menu', () => {
    // From QuestionResponseOptionsNode, we should be able to exit
    const questionResponseNode = conversationTree.nodes.QuestionResponseOptionsNode;
    expect(questionResponseNode).toBeDefined();

    // Option 3 should go to ExitChatNode
    const exitOption = questionResponseNode.options.find(opt => opt.text === "3");
    expect(exitOption).toBeDefined();
    expect(exitOption.next).toBe('ExitChatNode');

    // Navigate to ExitChatNode
    const exitNode = conversationTree.nodes[exitOption.next];
    expect(exitNode).toBeDefined();

    // ExitChatNode should have option to return to MainMenu
    const returnOption = exitNode.options[0];
    expect(returnOption).toBeDefined();
    expect(returnOption.next).toBe('MainMenu');
  });
});
