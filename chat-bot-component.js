import {
  LitElement,
  html,
  css,
} from "https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js";
import { conversationTree } from "./conversation.js";

class DataProcessor {
  constructor(data) {
    this.data = data;
  }

  // Parse the first numeric part of a string if applicable
  parseValue(value) {
    const matches = value.match(/^[\d\.]+/);
    if (matches) {
      return parseFloat(matches[0]);
    }
    return value;
  }

  // Determines the mode (most frequently occurring value) in an array
  findMode(values) {
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

  // Calculates average for an array of numbers
  calculateAverage(values) {
    const sum = values.reduce((acc, val) => acc + val, 0);
    const average = sum / values.length;
    return isNaN(average) ? undefined : average;
  }

  // General aggregation function
  aggregateData(method) {
    const ignoreKeys = [
      "node_id",
      "name",
      "latitude",
      "longitude",
      "xcor",
      "ycor",
      "type",
    ];
    const results = {};

    Object.keys(this.data[0])
      .filter((key) => !ignoreKeys.includes(key))
      .forEach((key) => {
        const rawValues = this.data.map((node) => node[key]);
        const values = rawValues.map(this.parseValue);

        // Split data types
        const numericValues = values.filter(
          (value) => typeof value === "number"
        );
        const nonNumericValues = values.filter(
          (value) => typeof value !== "number"
        );

        if (numericValues.length === 0) {
          results[key] = this.findMode(nonNumericValues);
          return;
        }
        switch (method) {
          case "avg":
            results[key] = this.calculateAverage(numericValues);
            break;
          case "max":
            results[key] = Math.max(...numericValues);
            break;
          case "min":
            results[key] = Math.min(...numericValues);
            break;
        }
        // check if rawValues has any non-numeric values
        if(rawValues[0] !== values[0]) {
          results[key] = results[key] + " " + rawValues[0].split(" ")[1];
        }
          
      });

    return results;
  }
}

class ChatBotComponent extends LitElement {
  static styles = css`
    .chat-option {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: #007bff;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.2);
      transition: transform 0.3s ease-out;
    }

    .chat-option:active {
      transform: scale(1.2);
    }

    .chat-option i {
      font-size: 20px;
    }

    .chatbot-popup {
      position: absolute;
      bottom: 90px; /* Adjusted for improved visibility */
      right: 20px;
      width: 320px; /* Increased for better readability */
      background-color: #fff;
      border: 1px solid #ccc;
      border-radius: 10px; /* Rounded corners for a modern look */
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      display: none;
      overflow: hidden;
      font-family: Arial, sans-serif; /* Set font family for consistency */
    }

    .chatbot-popup.active {
      display: block;
    }

    .messages {
      height: 300px; /* Adjusted for better message visibility */
      padding: 10px;
      overflow-y: auto; /* Enable vertical scrolling */
    }

    .message a {
      color: #ff8400; /* White color for links */
      text-decoration: none; /* Remove underline from links */
    }

    .input-area {
      padding: 10px;
      border-top: 1px solid #ccc; /* Separator line between messages and input area */
    }

    .input-area input {
      width: 70%; /* Adjusted input width for better alignment */
      padding: 5px;
      margin-right: 10px; /* Add spacing between input and button */
      border: 1px solid #ccc;
      border-radius: 5px;
      outline: none; /* Remove default input focus outline */
    }

    .input-area button {
      padding: 5px 10px;
      background-color: #007bff;
      color: #fff;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      outline: none; /* Remove default button focus outline */
    }

    .message-row {
      display: flex;
      width: 100%;
      margin: 4px 0;
      align-items: center;
    }

    .bot-row {
      justify-content: flex-start; /* Align bot messages to the left */
    }

    .user-row {
      justify-content: flex-end; /* Align user messages to the right */
    }

    .message {
      padding: 8px 12px;
      border-radius: 12px;
      max-width: 80%;
      display: inline-block;
    }

    .bot-message {
      background-color: #123462; /* Updated color for bot messages */
      color: white; /* Adjust text color as needed for contrast */
      margin-left: 8px; /* Space between icon and message */
    }

    .user-message {
      background-color: #007bff; /* Blue for user */
      color: white;
      margin-right: 8px; /* Space between icon and message */
    }

    .icon {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
    }

    .bot-icon {
      background-color: #777; /* Darker shade for bot icon */
      color: #fff; /* White color for icon */
    }

    .user-icon {
      background-color: #dedede; /* Light gray for the user icon background */
      color: #555; /* Icon color */
    }

    .input-area button:hover {
      background-color: #0056b3; /* Darker shade on hover for visual feedback */
    }

    .chat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background-color: #123462;
      color: #fff;
      padding: 10px;
    }

    .chat-logo {
      height: 30px; /* Adjust based on your logo's size */
    }

    .chat-title {
      color: #fff;
      font-weight: bold;
    }

    .chat-close {
      cursor: pointer;
      font-size: 20px;
    }
  `;

  constructor() {
    super();
    this.popupActive = false;
    this.currentMessageIndex = 0;
    this.lastCorrectMessageIndex = 0;
    this.messages = [{ text: conversationTree.message, sender: "bot" }]; // Initialize with the bot's greeting message
    this.currentOptions = conversationTree.options;
    this.userInput = "";
    this.buildingIdentifier = ""; // To store building identifier
    this.verticalIdentifier = ""; // To store vertical identifier
    this.floorIdentifier = ""; // To store floor identifier
    this.acc = false; // To store accumulator
    this.stringInput = false;
  }

  togglePopup() {
    this.popupActive = !this.popupActive;
    let popup = this.shadowRoot.getElementById("chat-pop");
    if (this.popupActive) {
      // this.currentMessageIndex = 0;
      this.currentOptions = conversationTree.options;
      this.userInput = "";
      popup.classList.add("active");
      this.populateMessages();
    } else {
      popup.classList.remove("active");
    }
  }

  handleUserInput(e) {
    this.userInput = e.target.value;
  }

  getLevenshteinDistance(a, b) {
    const distanceMatrix = Array(a.length + 1)
      .fill(null)
      .map(() => Array(b.length + 1).fill(null));

    for (let i = 0; i <= a.length; i++) {
      distanceMatrix[i][0] = i;
    }

    for (let j = 0; j <= b.length; j++) {
      distanceMatrix[0][j] = j;
    }

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
        distanceMatrix[i][j] = Math.min(
          distanceMatrix[i - 1][j] + 1,
          distanceMatrix[i][j - 1] + 1,
          distanceMatrix[i - 1][j - 1] + indicator
        );
      }
    }

    return distanceMatrix[a.length][b.length];
  }

  async fetchDataAndAskContinue(
    buildingIdentifier,
    verticalIdentifier,
    floorIdentifier,
    accumulator = false,
    nodeIdentifier = false
  ) {
    // fetch data from url
    const latest_data_url = new URL(
      "https://smartcitylivinglab.iiit.ac.in/verticals/all/latest/"
    );
    const options = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    };

    this.resetInputAndPopulateMessages();

    // Fetch data from the API
    let response = await fetch(latest_data_url, options);

    let data = await response.json();

    const data_dict = Object.values(data)
      .flat()
      .reduce((acc, element) => {
        acc[element.node_id] = element;
        return acc;
      }, {});

    let filteredNodes = Object.values(data_dict);
    // Check if vertical
    if (verticalIdentifier) {
      // get all with node_id starting with verticalIdentifier or if first 4 letters have verticalIdentifier
      filteredNodes = Object.values(data_dict).filter(
        (node) =>
          node.node_id.startsWith(verticalIdentifier) ||
          node.node_id.slice(0, 4).includes(verticalIdentifier)
      );
    }
    // Check if building
    if (buildingIdentifier) {
      // getall nodes in filtered nodes which have buildingIdentifier in their node_id
      filteredNodes = filteredNodes.filter((node) =>
        node.node_id.includes(buildingIdentifier)
      );
    }
    // Check if floor
    if (floorIdentifier) {
      // getall nodes in filtered nodes which have floorIdentifier in their node_id
      filteredNodes = filteredNodes.filter((node) =>
        node.node_id.includes(floorIdentifier)
      );
    }

    // Check nodeIdentifier
    if (nodeIdentifier) {
      // get node with node_id equal to nodeIdentifier
      filteredNodes = filteredNodes.filter(
        (node) => node.node_id === nodeIdentifier
      );
      // If no node found, try to find the closest match using Levenshtein distance
      if (filteredNodes.length === 0) {
        let closestMatch = "";
        let minDistance = Number.MAX_SAFE_INTEGER;
        for (const node of Object.values(data_dict)) {
          const distance = this.getLevenshteinDistance(
            node.node_id,
            nodeIdentifier
          );
          if (distance < minDistance) {
            minDistance = distance;
            closestMatch = node.node_id;
          }
        }
        console.log(
          "Closest match: " + closestMatch + " with distance: " + minDistance
        );
        this.addMessage(
          `No data found for the node ${nodeIdentifier}. One of the closest match is ${closestMatch}`,
          "bot"
        );

        // Show the data for the closest match
        filteredNodes = Object.values(data_dict).filter(
          (node) => node.node_id === closestMatch
        );
      }
    }

    // if 0 nodes found, return No data found
    if (filteredNodes.length === 0) {
      let message = "No data found for the identifiers: ";
      let identifiers = [];

      if (buildingIdentifier) {
        identifiers.push("Building - " + buildingIdentifier);
      }

      if (verticalIdentifier) {
        identifiers.push("Vertical - " + verticalIdentifier);
      }

      if (floorIdentifier) {
        identifiers.push("Floor - " + floorIdentifier);
      }

      if (nodeIdentifier) {
        identifiers.push("Node - " + nodeIdentifier);
      }

      message += identifiers.join(", ");

      this.addMessage(message, "bot");
      return false;
    }

    if (accumulator) {
      // Log all the data
      const processor = new DataProcessor(filteredNodes);
      const aggregatedData = processor.aggregateData(accumulator);
      filteredNodes = [aggregatedData];
      // Except for latitude, longitude, node_id, name, type, xcor and ycor Calculate for all the other keys
      // Some are numbers and some are strings like "good", "bad", "average" and others are strings like "43 something"
      // For numbers, calculate the average, for strings like "good", "bad", "average" calculate the most common value and for strings like "43 something" split the string and calculate average of the numbers and then reattach the string
    }

    // if more than 1 node is found return the first node
    console.log(filteredNodes);
    if (filteredNodes.length >= 1) {
      let responseMessage = "";
      // if accumulator is true, then the data is aggregated
      if (accumulator) {
        responseMessage += "Aggregated data with \n";
        responseMessage += "Accumulator: " + accumulator + "\n";
      } else {
        responseMessage += "Data for the identifiers: \n";
      }

      // Get the first node
      let node = filteredNodes[0];

      // Initialize the response message
      responseMessage += `${node["node_id"]}:\n`;

      // Iterate over the properties of the node
      for (const [key, value] of Object.entries(node)) {
        responseMessage += key + ": " + value + "\n";
      }

      this.addMessage(responseMessage, "bot");

      if (filteredNodes.length > 1) {
        // Create a markdown table for better readability
        // Add title and identifier names before the table
        let mkdwnTable = "# Data For the Identifiers:\n";
        if (buildingIdentifier) {
          mkdwnTable += "Building: " + buildingIdentifier + "\n";
        }
        if (verticalIdentifier) {
          mkdwnTable += "Vertical: " + verticalIdentifier + "\n";
        }
        if (floorIdentifier) {
          mkdwnTable += "Floor: " + floorIdentifier + "\n";
        }
        mkdwnTable += "\n";

        mkdwnTable += "|";
        for (const key of Object.keys(filteredNodes[0])) {
          mkdwnTable += key + "|";
        }
        mkdwnTable += "\n|";
        for (const key of Object.keys(filteredNodes[0])) {
          mkdwnTable += "-|";
        }
        mkdwnTable += "\n";
        for (const node of filteredNodes) {
          for (const value of Object.values(node)) {
            mkdwnTable += value + "|";
          }
          mkdwnTable += "\n";
        }

        // Post to stagbin
        const response = await fetch("https://api.stagb.in/dev/content", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            data: mkdwnTable,
          }),
        });
        console.log(response);
        const responseJson = await response.json();
        console.log(responseJson);

      // Add table link to the chat
      this.addMessage(
        `Data table for all the identifiers can be found <a href="https://stagb.in/${responseJson.id}.md" target="_blank">here</a>`,
        "bot"
      );
    }
      return false;
    }

    // Fetch data based on identifiers and return true or false
    return true;
  }

  handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault(); // Prevent form submission
      this.sendMessage();
    }
  }

  async sendMessage() {
    const userInputTrimmed = this.userInput.trim();
    // If string input is expected, send the input as is
    if (this.stringInput) {
      this.stringInput = false;
      // Add user's message to the chat
      this.addMessage(userInputTrimmed, "user");
      // Send a place holder message saying the data for your node is being fetched
      let continueConversation = await this.fetchDataAndAskContinue(
        false, // No building identifier
        false, // No vertical identifier
        false, // No floor identifier
        false, // No accumulator
        userInputTrimmed
      );
      if (!continueConversation) {
        // Send message to end the conversation
        this.addMessage(
          "Thank you for using the chatbot. Have a great day!",
          "bot"
        );
      }
      this.resetInputAndPopulateMessages();
      return;
    }
    const selectedOption = this.currentOptions.find(
      (option) => option.text === userInputTrimmed
    );
    let nextNodeKey = "";
    let responseMessage = "";
    let error = false;

    // Add user's message to the chat
    this.addMessage(userInputTrimmed, "user");

    if (selectedOption) {
      nextNodeKey = selectedOption.next;

      // Capture identifiers for Building and Vertical selections
      // check last message to identify the selection
      let lastBotMessage = this.messages[this.messages.length - 2].text;
      console.log("Last bot message: " + lastBotMessage);
      console.log(selectedOption);
      if (selectedOption.identifier) {
        console.log("Selected option identifier: " + selectedOption.identifier);
        if (lastBotMessage.includes("Which building data do you need?")) {
          this.buildingIdentifier = selectedOption.identifier;
        } else if (
          lastBotMessage.includes("Please select a floor by entering")
        ) {
          this.floorIdentifier = selectedOption.identifier;
        } else if (lastBotMessage.includes("Please select a vertical")) {
          this.verticalIdentifier = selectedOption.identifier;
        }
      }

      // Check if the conversation has an accumulator
      if (selectedOption.accumulator) {
        this.acc = selectedOption.accumulator;
      }

      if (selectedOption.textInput) {
        this.stringInput = true;
      }

      console.log(
        "Identifiers: Building - " +
          this.buildingIdentifier +
          ", Vertical - " +
          this.verticalIdentifier +
          ", Floor - " +
          this.floorIdentifier
      );

      if (selectedOption.terminate) {
        let continueConversation = await this.fetchDataAndAskContinue(
          this.buildingIdentifier,
          this.verticalIdentifier,
          this.floorIdentifier,
          this.acc
        );
        if (!continueConversation) {
          // Send message to end the conversation
          this.addMessage(
            "Thank you for using the chatbot. Have a great day!",
            "bot"
          );
          this.resetInputAndPopulateMessages();
          return;
        }

        // Reset identifiers when the conversation ends
        this.buildingIdentifier = "";
        this.verticalIdentifier = "";
        this.floorIdentifier = "";
      }

      const nextNode = conversationTree.nodes[nextNodeKey];
      if (nextNode) {
        responseMessage = nextNode.message;
        this.currentOptions = nextNode.options; // Update options for the next interaction
        this.currentMessageIndex++;
        this.lastCorrectMessageIndex = this.currentMessageIndex;
      } else {
        responseMessage = "Error: Invalid next node";
        error = true;
      }
    } else {
      responseMessage = "Error: Invalid option selected";
      error = true;
    }

    // Add bot's response to the chat
    this.addMessage(responseMessage, "bot");

    if (error) {
      // Send the last message
      const lastCorrectMessage = this.messages[this.lastCorrectMessageIndex];
      this.addMessage(lastCorrectMessage.text, "bot");
      error = false;
    }

    // Reset userInput and update UI
    this.resetInputAndPopulateMessages();
  }

  addMessage(text, sender) {
    this.messages.push({ text, sender });
  }

  resetInputAndPopulateMessages() {
    this.userInput = ""; // Clear userInput for the next input
    const inputField = this.shadowRoot.querySelector("input");
    if (inputField) inputField.value = ""; // Clear input field in the DOM
    this.populateMessages(); // Update displayed messages
  }

  populateMessages() {
    const messageContainer =
      this.shadowRoot.getElementById("message-container");
    messageContainer.innerHTML = ""; // Clear previous messages

    this.messages.forEach((msg) => {
      // Create a row to hold the icon and message
      const messageRow = document.createElement("div");
      messageRow.className =
        msg.sender === "bot" ? "message-row bot-row" : "message-row user-row";

      const iconElement = document.createElement("div");
      iconElement.className =
        msg.sender === "bot" ? "icon bot-icon" : "icon user-icon";
      iconElement.innerHTML =
        msg.sender === "bot"
          ? '<i class="fas fa-robot"></i>'
          : '<i class="fas fa-user"></i>';

      // Create a container for the message text
      const messageBubble = document.createElement("div");
      messageBubble.className =
        msg.sender === "bot" ? "message bot-message" : "message user-message";

      // Split message by '\n' and create a separate line for each part
      msg.text.split("\n").forEach((part) => {
        const line = document.createElement("div"); // You can also use <p> if preferred
        line.innerHTML = part; // Use innerHTML instead of textContent
        messageBubble.appendChild(line);
      });

      // const messageBubble = document.createElement("div");
      // messageBubble.textContent = msg.text;
      // messageBubble.className = msg.sender === "bot" ? "message bot-message" : "message user-message";

      if (msg.sender === "bot") {
        // For bot, icon then message
        messageRow.appendChild(iconElement);
        messageRow.appendChild(messageBubble);
      } else {
        // For user, message then icon
        messageRow.appendChild(messageBubble);
        messageRow.appendChild(iconElement);
      }

      messageContainer.appendChild(messageRow);
    });
  }

  render() {
    return html`
      <div class="chat-option" @click="${this.togglePopup}">
        <img
          src="data:image/jpeg;base64,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"
          alt="Chat Icon"
          width="40"
          height="40"
        />
      </div>
      <div id="chat-pop" class="chatbot-popup">
        <div class="chat-header">
          <img
            src="data:image/png;base64,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"
            class="chat-logo"
            alt="Chat Logo"
          />
          <div class="chat-title">SCRC Chat Assistant</div>
          <div class="chat-close" @click="${this.togglePopup}">&times;</div>
        </div>
        <div id="message-container" class="messages"></div>
        <div class="input-area">
          <input
            @keydown="${this.handleKeyDown}"
            type="text"
            @input="${this.handleUserInput}"
            .value="${this.userInput}"
          />
          <button @click="${this.sendMessage}">Send</button>
        </div>
      </div>
    `;
  }
}

customElements.define("chat-bot-component", ChatBotComponent);
