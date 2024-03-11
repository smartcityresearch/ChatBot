import {
  LitElement,
  html,
  css,
} from "https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js";
import { conversationTree } from "./conversation.js";
import { extractMessages } from "./conversation.js";

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
      height: 250px; /* Adjusted for better message visibility */
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
      background-color: #f0f0f0; /* Lighter gray for bot messages */
      color: black;
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
  `;

  constructor() {
    super();
    this.popupActive = false;
    this.currentMessageIndex = 0;
    this.lastCorrectMessageIndex = 0;
    this.messages = [{ text: conversationTree.message, sender: "bot" }]; // Initialize with the bot's greeting message
    this.currentOptions = conversationTree.options;
    this.userInput = "";
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
      a;
    } else {
      popup.classList.remove("active");
    }
  }

  handleUserInput(e) {
    this.userInput = e.target.value;
  }

  handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault(); // Prevent form submission
      this.sendMessage();
    }
  }

  sendMessage() {
    const userInputTrimmed = this.userInput.trim();
    const selectedOption = this.currentOptions.find(option => option.text === userInputTrimmed);
    let nextNodeKey = "";
    let responseMessage = "";
    let error = false;
  
    // Add user's message to the chat
    this.addMessage(userInputTrimmed, "user");
  
    if (selectedOption) {
      nextNodeKey = selectedOption.next;
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
    const messageContainer = this.shadowRoot.getElementById("message-container");
    messageContainer.innerHTML = ""; // Clear previous messages
  
    this.messages.forEach((msg) => {
      // Create a row to hold the icon and message
      const messageRow = document.createElement("div");
      messageRow.className = msg.sender === "bot" ? "message-row bot-row" : "message-row user-row";
  
      const iconElement = document.createElement("div");
      iconElement.className = msg.sender === "bot" ? "icon bot-icon" : "icon user-icon";
      iconElement.innerHTML = msg.sender === "bot" ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user"></i>';
  
      const messageBubble = document.createElement("div");
      messageBubble.textContent = msg.text;
      messageBubble.className = msg.sender === "bot" ? "message bot-message" : "message user-message";
  
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
        <i class="fas fa-comments"></i>
      </div>
      <div id="chat-pop" class="chatbot-popup">
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
