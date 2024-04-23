const conversationTree = {
  message:
    "Hey, how can I help you? Please choose an option by entering the corresponding number:\n1. Building Specific Data\n2. Vertical Specific Data\n3. Node Specific Data",

  options: [
    { text: "1", next: "BuildingNode" },
    { text: "2", next: "VerticalNode" },
    { text: "3", next: "NodeSpecificFinalNode", textInput: true },
  ],
  nodes: {
    BuildingNode: {
      message:
        "You chose Building Specific Data. Please select a vertical by entering the corresponding number:\n1. Air Quality\n2. Energy monitoring\n3. Solar\n4. Smart Room\n5. Weather\n6. Weather Monitoring\n7. WiSun\n8. Crowd Monitoring",
      options: [
        { text: "1", next: "CommonBuildingNode", identifier: "AQ" },
        { text: "2", next: "CommonBuildingNode", identifier: "EM" },
        { text: "3", next: "CommonBuildingNode", identifier: "SL" },
        { text: "4", next: "CommonBuildingNode", identifier: "SR" },
        { text: "5", next: "CommonBuildingNode", identifier: "WE" },
        { text: "6", next: "CommonBuildingNode", identifier: "WM" },
        { text: "7", next: "CommonBuildingNode", identifier: "WN" },
        { text: "8", next: "CommonBuildingNode", identifier: "CM" },
      ],
    },

    CommonBuildingNode: {
      message:
        "Which building data do you need? Please select a building by entering the corresponding number:\n1. Vindhya\n2. Nilgiri\n3. Admin\n4. T-Hub\n5. Kohli\n6. Anand",
      options: [
        { text: "1", next: "CommonNode", terminate: true, identifier: "VN" },
        { text: "2", next: "CommonNode", terminate: true, identifier: "NI" },
        { text: "3", next: "CommonNode", terminate: true, identifier: "AD" },
        { text: "4", next: "CommonNode", terminate: true, identifier: "TH" },
        { text: "5", next: "CommonNode", terminate: true, identifier: "KB" },
        { text: "6", next: "CommonNode", terminate: true, identifier: "AN" },
      ],
    },

    CommonNode: {
      message:
        "The corresponding data is given. Which data do you need? Please choose an option by entering the corresponding number:\n1. Building Specific Data\n2. Vertical Specific Data\n3. Node Specific Data",
      options: [
        { text: "1", next: "BuildingNode" },
        { text: "2", next: "VerticalNode" },
        { text: "3", next: "NodeSpecificFinalNode" },
      ],
    },

    VerticalNode: {
      message:
        "You chose Vertical Specific Data. Please select a vertical by entering the corresponding number:\n1. Air Quality\n2. Energy monitoring\n3. Solar\n4. Smart Room\n5. Weather\n6. Weather Monitoring\n7. WiSun\n8. Crowd Monitoring",
      options: [
        { text: "1", next: "CommonVerticalNode", identifier: "AQ" },
        { text: "2", next: "CommonVerticalNode", identifier: "EM" },
        { text: "3", next: "CommonVerticalNode", identifier: "SL" },
        { text: "4", next: "CommonVerticalNode", identifier: "SR" },
        { text: "5", next: "CommonVerticalNode", identifier: "WE" },
        { text: "6", next: "CommonVerticalNode", identifier: "WM" },
        { text: "7", next: "CommonVerticalNode", identifier: "WN" },
        { text: "8", next: "CommonVerticalNode", identifier: "CM" },
      ],
    },

    CommonVerticalNode: {
      message:
        "Which value do you need? Please select an option by entering the corresponding number:\n1. Average value\n2. Maximum value\n3. Minimum value",
      options: [
        { text: "1", next: "CommonNode", terminate: true },
        { text: "2", next: "CommonNode", terminate: true },
        { text: "3", next: "CommonNode", terminate: true },
        // ... other value options ...
      ],
    },

    NodeSpecificNode: {
      message:
        "You chose Node Specific Data. Please select a vertical by entering the corresponding number:\n1. Air Quality\n2. Energy monitoring\n3. Solar\n4. Smart Room\n5. Weather\n6. Weather Monitoring\n7. WiSun\n8. Crowd Monitoring",
      options: [
        { text: "1", identifier: "AQ", next: "NodeSp" },
        { text: "2", identifier: "EM", next: "NodeSp" },
        { text: "3", identifier: "SL", next: "NodeSp" },
        { text: "4", identifier: "SR", next: "NodeSp" },
        { text: "5", identifier: "WE", next: "NodeSp" },
        { text: "6", identifier: "WM", next: "NodeSp" },
        { text: "7", identifier: "WN", next: "NodeSp" },
        { text: "8", identifier: "CM", next: "NodeSp" },
        // ... other vertical options ...
      ],
    },
    NodeSp: {
      message:
        "Which building data do you need? Please select a building by entering the corresponding number:\n1. Vindhya\n2. Nilgiri\n3. Admin\n4. T-Hub\n5. Kohli\n6. Anand",
      options: [
        { text: "1", identifier: "VN", next: "FloorNode" },
        { text: "2", identifier: "NI", next: "FloorNode" },
        { text: "3", identifier: "AD", next: "FloorNode" },
        { text: "4", identifier: "TH", next: "FloorNode" },
        { text: "5", identifier: "KB", next: "FloorNode" },
        { text: "6", identifier: "AN", next: "FloorNode" },
      ],
    },
    FloorNode: {
      message:
        "Please select a floor by entering the corresponding number:\n1.Ground floor \n2. First floor\n3. Second floor\n4.Third floor\n5. Fourth floor\n6. Library\n7. Computer Lab\n8. Overhead Tank \n9.SS Tank \n10. Sump\n11.Parking\n",
      options: [
        { text: "1", identifier: "00", next: "FinalNode" },
        { text: "2", identifier: "01", next: "FinalNode" },
        { text: "3", identifier: "02", next: "FinalNode" },
        { text: "4", identifier: "03", next: "FinalNode" },
        { text: "5", identifier: "04", next: "FinalNode" },
        { text: "6", identifier: "90", next: "FinalNode" },
        { text: "7", identifier: "91", next: "FinalNode" },
        { text: "8", identifier: "96", next: "FinalNode" },
        { text: "9", identifier: "97", next: "FinalNode" },
        { text: "10", identifier: "98", next: "FinalNode" },
        { text: "11", identifier: "99", next: "FinalNode" },
        // ... other floor options ...
      ],
    },

    NodeSpecificFinalNode: {
      message: "Type the node ID:",
      input: true,
      next: "CommonNode",
      terminate: true,
    },
  },
};

// rest of your code...

function extractMessages(tree) {
  const messages = [];

  function traverse(node) {
    if (node.message) {
      messages.push(node.message);
    }
    if (node.options) {
      for (const option of node.options) {
        traverse(option);
      }
    }
    if (node.nodes) {
      for (const key in node.nodes) {
        traverse(node.nodes[key]);
      }
    }
  }

  traverse(tree);
  return messages;
}

export { conversationTree, extractMessages };
