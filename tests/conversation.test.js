/**
 * @jest-environment jsdom
 */

// Import the actual conversation tree for testing
const { conversationTree, extractMessages } = require('../static/js/conversation.js');

describe('conversationTree structure', () => {
  test('should have a main message and options', () => {
    expect(conversationTree.message).toContain("how can I help you");
    expect(Array.isArray(conversationTree.options)).toBe(true);
    expect(conversationTree.options.length).toBeGreaterThan(0);
  });

  test('should contain AskQuestionNode with required properties', () => {
    expect(conversationTree.nodes.AskQuestionNode).toBeDefined();
    expect(conversationTree.nodes.AskQuestionNode.message).toContain("Please enter your question");
    expect(conversationTree.nodes.AskQuestionNode.input).toBe(true);
    expect(conversationTree.nodes.AskQuestionNode.textInput).toBe(true);
    expect(Array.isArray(conversationTree.nodes.AskQuestionNode.recommendedQuestions)).toBe(true);
    expect(conversationTree.nodes.AskQuestionNode.recommendedQuestions.length).toBeGreaterThan(0);
  });
  
  test('should contain BuildingNode with options', () => {
    expect(conversationTree.nodes.BuildingNode).toBeDefined();
    expect(conversationTree.nodes.BuildingNode.message).toContain("Building Specific Data");
    expect(Array.isArray(conversationTree.nodes.BuildingNode.options)).toBe(true);
    expect(conversationTree.nodes.BuildingNode.options.length).toBeGreaterThan(0);
  });

  test('should contain ConversationalModeOptions node', () => {
    expect(conversationTree.nodes.ConversationalModeOptions).toBeDefined();
    expect(Array.isArray(conversationTree.nodes.ConversationalModeOptions.options)).toBe(true);
    expect(conversationTree.nodes.ConversationalModeOptions.options[0].next).toBe("AskQuestionNode");
  });

  test('options should have valid next node references', () => {
    conversationTree.options.forEach(option => {
      expect(option.next).toBeDefined();
      expect(conversationTree.nodes[option.next]).toBeDefined();
    });
  });

  test('BuildingNode options should have identifiers', () => {
    conversationTree.nodes.BuildingNode.options.forEach(option => {
      expect(option.identifier).toBeDefined();
      expect(typeof option.identifier).toBe('string');
      expect(option.identifier.length).toBe(2); // Expect 2-character identifiers
    });
  });

  test('CommonVerticalNode options should have accumulators', () => {
    conversationTree.nodes.CommonVerticalNode.options.forEach(option => {
      expect(option.accumulator).toBeDefined();
      expect(['avg', 'max', 'min']).toContain(option.accumulator);
    });
  });

  test('ProcessQuestionNode should have process method', () => {
    expect(typeof conversationTree.nodes.ProcessQuestionNode.process).toBe('function');
  });

  test('extractMessages should extract all messages', () => {
    const messages = extractMessages(conversationTree);
    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBeGreaterThan(0);
    expect(messages).toContain(conversationTree.message);
    
    // Verify that at least one message from a deep node is included
    expect(messages.some(msg => msg.includes("Please enter your question"))).toBe(true);
  });

  test('extractMessages should handle nodes with no message property', () => {
    const simpleTree = {
      nodes: {
        node1: { message: "Message 1" },
        node2: { options: [{ text: "Option text" }] } // No message in node2 or its option
      }
    };
    const messages = extractMessages(simpleTree);
    expect(messages).toEqual(["Message 1"]);
  });

  test('extractMessages should handle empty options and nodes', () => {
    const emptyTree = {
      message: "Root message",
      options: [],
      nodes: {}
    };
    const messages = extractMessages(emptyTree);
    expect(messages).toEqual(["Root message"]);
  });

  test('extractMessages should traverse options if they are structured like nodes (though unusual)', () => {
    const treeWithOptionsAsNodes = {
      message: "Root",
      options: [
        { message: "Option Message 1", next: "SomeNode" },
        { text: "No Message Option", next: "AnotherNode" }
      ],
      nodes: {
        SomeNode: { message: "SomeNode Message" }
      }
    };
    const messages = extractMessages(treeWithOptionsAsNodes);
    // Based on current extractMessages, it will try to get .message from option objects
    expect(messages).toContain("Root");
    expect(messages).toContain("Option Message 1");
    expect(messages).toContain("SomeNode Message");
    expect(messages.filter(m => m === "Option Message 1").length).toBe(1); // Ensure it's not duplicated
  });

  test('all nodes should have valid structure', () => {
    const nodeKeys = Object.keys(conversationTree.nodes);
    expect(nodeKeys.length).toBeGreaterThan(10); // Expect a substantial number of nodes
    
    nodeKeys.forEach(key => {
      const node = conversationTree.nodes[key];
      
      // Every node should have a message
      expect(node.message).toBeDefined();
      expect(typeof node.message).toBe('string');
      
      // If it has options, they should be well-formed
      if (node.options) {
        expect(Array.isArray(node.options)).toBe(true);
        node.options.forEach(option => {
          expect(option.text).toBeDefined();
          expect(option.next).toBeDefined();
        });
      }
      
      // If it's an input node, it should have the right flags
      if (node.input) {
        expect(node.next).toBeDefined();
      }
      
      // If it's a terminal node, it should have the terminate flag
      if (node.terminate) {
        expect(node.terminate).toBe(true);
      }
    });
  });
  
  test('vertical navigation path should be complete', () => {
    // Test the path from main menu to Vertical to CommonVerticalNode to CommonNode
    const verticalOption = conversationTree.options.find(opt => opt.next === 'VerticalNode');
    expect(verticalOption).toBeDefined();
    
    const verticalNode = conversationTree.nodes.VerticalNode;
    expect(verticalNode).toBeDefined();
    
    // Check that the vertical node has options that lead to CommonVerticalNode
    const verticalToCommonOption = verticalNode.options.find(opt => opt.next === 'CommonVerticalNode');
    expect(verticalToCommonOption).toBeDefined();
    expect(verticalToCommonOption.identifier).toBeDefined();
    
    const commonVerticalNode = conversationTree.nodes.CommonVerticalNode;
    expect(commonVerticalNode).toBeDefined();
    
    // Check that CommonVerticalNode has options that lead to CommonNode with termination
    const commonVerticalToCommonOption = commonVerticalNode.options.find(opt => opt.next === 'CommonNode');
    expect(commonVerticalToCommonOption).toBeDefined();
    expect(commonVerticalToCommonOption.terminate).toBe(true);
    
    const commonNode = conversationTree.nodes.CommonNode;
    expect(commonNode).toBeDefined();
  });
  
  test('node specific path should be complete', () => {
    // Test the path from main menu to NodeSpecificFinalNode
    const nodeOption = conversationTree.options.find(opt => opt.next === 'NodeSpecificFinalNode');
    expect(nodeOption).toBeDefined();
    
    const nodeSpecificFinalNode = conversationTree.nodes.NodeSpecificFinalNode;
    expect(nodeSpecificFinalNode).toBeDefined();
    expect(nodeSpecificFinalNode.input).toBe(true);
    expect(nodeSpecificFinalNode.next).toBe('CommonNode');
    expect(nodeSpecificFinalNode.terminate).toBe(true);
  });
  
  test('BuildingNode should have correct number of options', () => {
    expect(conversationTree.nodes.BuildingNode.options.length).toBe(8);
    const verticals = ['AQ', 'EM', 'SL', 'SR', 'WE', 'WM', 'WN', 'CM'];
    const identifiers = conversationTree.nodes.BuildingNode.options.map(opt => opt.identifier);
    expect(identifiers.sort()).toEqual(verticals.sort());
  });
  
  test('VerticalNode should have correct number of options', () => {
    expect(conversationTree.nodes.VerticalNode.options.length).toBe(8);
    const verticals = ['AQ', 'EM', 'SL', 'SR', 'WE', 'WM', 'WN', 'CM'];
    const identifiers = conversationTree.nodes.VerticalNode.options.map(opt => opt.identifier);
    expect(identifiers.sort()).toEqual(verticals.sort());
  });
  
  test('MainMenu should have options matching root options', () => {
    const mainMenuOptions = conversationTree.nodes.MainMenu.options;
    const rootOptions = conversationTree.options;
    
    expect(mainMenuOptions.length).toBe(rootOptions.length);
    
    // Check that each option in MainMenu matches its counterpart in root options
    mainMenuOptions.forEach((option, index) => {
      expect(option.next).toBe(rootOptions[index].next);
      expect(option.text).toBe(rootOptions[index].text);
      if (rootOptions[index].textInput) {
        expect(option.textInput).toBe(rootOptions[index].textInput);
      }
    });
  });
});

// Tests for navigation in the conversation tree
describe('conversationTree navigation', () => {
  test('should navigate from main menu to BuildingNode', () => {
    const option = conversationTree.options[0];
    expect(option.text).toBe("1");
    
    const nextNode = conversationTree.nodes[option.next];
    expect(nextNode).toBeDefined();
    expect(nextNode.message).toContain("Building Specific Data");
  });
  
  test('should navigate from BuildingNode to CommonBuildingNode', () => {
    const option = conversationTree.nodes.BuildingNode.options[0];
    expect(option.identifier).toBe("AQ");
    
    const nextNode = conversationTree.nodes[option.next];
    expect(nextNode).toBeDefined();
    expect(nextNode.message).toContain("building data");
  });

  test('should navigate to AskQuestionNode from ConversationalModeOptions', () => {
    const option = conversationTree.nodes.ConversationalModeOptions.options[0];
    expect(option.text).toBe("1");
    
    const nextNode = conversationTree.nodes[option.next];
    expect(nextNode).toBeDefined();
    expect(nextNode.message).toContain("Please enter your question");
  });
  
  test('should navigate from ConversationalModeOptions to MainMenu', () => {
    const option = conversationTree.nodes.ConversationalModeOptions.options[1];
    expect(option.text).toBe("2");
    
    const nextNode = conversationTree.nodes[option.next];
    expect(nextNode).toBeDefined();
    expect(nextNode.message).toContain("Please choose an option");
  });
  
  test('should navigate through questions flow', () => {
    // From AskQuestionNode to ProcessQuestionNode
    const askQuestionNode = conversationTree.nodes.AskQuestionNode;
    expect(askQuestionNode.next).toBe("ProcessQuestionNode");
    
    // ProcessQuestionNode should be terminal
    const processQuestionNode = conversationTree.nodes.ProcessQuestionNode;
    expect(processQuestionNode.terminate).toBe(true);
    
    // QuestionResponseOptionsNode should have options to ask another question or exit
    const questionResponseNode = conversationTree.nodes.QuestionResponseOptionsNode;
    expect(questionResponseNode.options.length).toBe(3);
    
    // First option should lead back to AskQuestionNode
    expect(questionResponseNode.options[0].next).toBe("AskQuestionNode");
    
    // Second option should lead to MainMenu
    expect(questionResponseNode.options[1].next).toBe("MainMenu");
    
    // Third option should lead to ExitChatNode
    expect(questionResponseNode.options[2].next).toBe("ExitChatNode");
  });
  
  test('should handle exit flow correctly', () => {
    const exitNode = conversationTree.nodes.ExitChatNode;
    expect(exitNode.message).toContain("Thank you");
    expect(exitNode.options.length).toBe(1);
    expect(exitNode.options[0].next).toBe("MainMenu");
  });
});

// Tests for specific node types
describe('specific node types', () => {
  test('input nodes should have required properties', () => {
    const inputNodes = [
      conversationTree.nodes.AskQuestionNode,
      conversationTree.nodes.NodeSpecificFinalNode
    ];
    
    inputNodes.forEach(node => {
      expect(node.input).toBeTruthy();
      expect(node.next).toBeDefined();
    });
  });
  
  test('terminal nodes should have terminate flag', () => {
    const terminalNodes = [
      conversationTree.nodes.ProcessQuestionNode,
      conversationTree.nodes.NodeSpecificFinalNode
    ];
    
    terminalNodes.forEach(node => {
      expect(node.terminate).toBeTruthy();
    });
  });
  
  test('API nodes should have apiCall flag', () => {
    expect(conversationTree.nodes.ProcessQuestionNode.apiCall).toBeTruthy();
  });
});

// Tests for functional aspects of the conversation tree
describe('conversationTree functionality', () => {
  test('recommended questions should be valid', () => {
    const recommendedQuestions = conversationTree.nodes.AskQuestionNode.recommendedQuestions;
    expect(recommendedQuestions.length).toBeGreaterThan(0);
    
    // Each question should be a non-empty string
    recommendedQuestions.forEach(question => {
      expect(typeof question).toBe('string');
      expect(question.length).toBeGreaterThan(0);
    });
    
    // Check for specific question topics we expect to be covered
    const questionTopics = ['temperature', 'reading', 'node', 'average'];
    questionTopics.forEach(topic => {
      expect(recommendedQuestions.some(q => q.toLowerCase().includes(topic))).toBe(true);
    });
  });
  
  test('ProcessQuestionNode process method should make fetch request', async () => {
    // Mock the fetch function
    global.fetch = jest.fn().mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ response: "Test response" })
      })
    );
    
    const processMethod = conversationTree.nodes.ProcessQuestionNode.process;
    // Use the actual URL from conversation.js
    const expectedUrl = "https://smartcitylivinglab.iiit.ac.in/chatbot-api/query";
    const result = await processMethod("Test query");
    
    expect(global.fetch).toHaveBeenCalledWith(
      expectedUrl, // Check against the actual URL
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "Test query" })
      })
    );
    
    expect(result).toBe("Test response");
    
    // Clean up
    global.fetch.mockClear();
  });
  
  test('ProcessQuestionNode process method should handle fetch throwing an error', async () => {
    // Mock fetch to throw a network error
    global.fetch = jest.fn().mockImplementation(() => 
      Promise.reject(new Error("Network connection failed"))
    );
    
    const processMethod = conversationTree.nodes.ProcessQuestionNode.process;
    const result = await processMethod("Test query");
    
    expect(result).toContain("Backend is not reachable."); // Or whatever error message is returned
    
    // Clean up
    global.fetch.mockClear();
  });

  test('ProcessQuestionNode process method should handle non-ok response', async () => {
    // Mock fetch to return a non-ok response
    global.fetch = jest.fn().mockImplementation(() => 
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: () => Promise.resolve({ error: "Server error details" }) // Optional: if server sends JSON error
      })
    );
    
    const processMethod = conversationTree.nodes.ProcessQuestionNode.process;
    const result = await processMethod("Test query");
    
    // Check the console.error mock if you want to verify error logging
    // For the return value, it depends on how the catch block handles it.
    // Based on the code, it should return "Backend is not reachable."
    expect(result).toContain("Backend is not reachable."); 
    
    // Clean up
    global.fetch.mockClear();
  });
});
