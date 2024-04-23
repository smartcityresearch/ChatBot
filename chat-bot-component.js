import {
  LitElement,
  html,
  css,
} from "https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js";
import { conversationTree } from "./conversation.js";

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

  async fetchDataAndAskContinue(
    buildingIdentifier,
    verticalIdentifier,
    floorIdentifier
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

    // if 0 nodes found, return No data found
    if (filteredNodes.length === 0) {
      this.addMessage(
        "No data found for the identifiers: Building - " +
          buildingIdentifier +
          ", Vertical - " +
          verticalIdentifier +
          ", Floor - " +
          floorIdentifier,
        "bot"
      );
      return false;
    }

    // if more than 1 node is found return the first node
    console.log(filteredNodes);
    if (filteredNodes.length >= 1) {
      let responseMessage = "";
      filteredNodes.forEach((node, index) => {
        responseMessage += "Node " + (index + 1) + ":\n";
        for (const [key, value] of Object.entries(node)) {
          responseMessage += key + ": " + value + "\n";
        }
        responseMessage += "\n"; // Add a newline between nodes
      });
      this.addMessage(responseMessage, "bot");
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
          this.floorIdentifier
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
        line.textContent = part;
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
    <img src="https://static-00.iconduck.com/assets.00/bot-icon-1024x806-28qq4icl.png" alt="Chat Icon" width="40" height="40">
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
