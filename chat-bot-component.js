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

    .input-area button:hover {
      background-color: #0056b3; /* Darker shade on hover for visual feedback */
    }
  `;
  // static styles = css`
  //   .chat-option {
  //     position: fixed;
  //     bottom: 20px;
  //     right: 20px;
  //     width: 60px;
  //     height: 60px;
  //     border-radius: 50%;
  //     background-color: #007bff;
  //     color: #fff;
  //     display: flex;
  //     align-items: center;
  //     justify-content: center;
  //     cursor: pointer;
  //     box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.2);
  //     transition: transform 0.3s ease-out;
  //   }

  //   .chat-option:active {
  //     transform: scale(1.2);
  //   }

  //   .chat-option i {
  //     font-size: 20px;
  //   }

  //   .chatbot-popup {
  //     position: absolute;
  //     bottom: 60px;
  //     right: 20px;
  //     width: 300px;
  //     height: 400px;
  //     background-color: #fff;
  //     border: 1px solid #ccc;
  //     border-radius: 5px;
  //     box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  //     display: none;
  //     overflow: auto;
  //   }

  //   .messages {
  //     height: 300px;
  //     padding: 10px;
  //     overflow: auto;
  //   }

  //   .active {
  //     display: block;
  //   }
  // `;

  constructor() {
    super();
    this.popupActive = false;
    this.currentMessageIndex = 0;
    this.messages = extractMessages(conversationTree);
    this.currentOptions = conversationTree.options;
    this.userInput = "";
  }

  togglePopup() {
    this.popupActive = !this.popupActive;
    let popup = this.shadowRoot.getElementById("chat-pop");
    if (this.popupActive) {
      this.currentMessageIndex = 0;
      this.currentOptions = conversationTree.options;
      this.userInput = "";
      popup.classList.add("active");
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
    const selectedOption = this.currentOptions.find(
      (option) => option.text === this.userInput
    );
    if (selectedOption) {
      this.currentMessageIndex++;
      console.log(selectedOption);
      console.log(conversationTree);
      if (conversationTree.nodes.hasOwnProperty(selectedOption.next)) {
        this.currentOptions =
          conversationTree.nodes[selectedOption.next].options;
        this.messages = extractMessages(conversationTree);
      } else {
        console.error(
          `Key "${selectedOption.next}" not found in conversationTree`
        );
        this.messages.push("Error: Invalid next node");
      }
      this.userInput = "";
      // remove value from input
      let inp = this.shadowRoot.querySelector("input");
      inp.value = "";
      console.log(this.messages);
      this.populateMessages();
    }
  }

  populateMessages() {
    //         ${this.messages.slice(0, this.currentMessageIndex + 1).map(message => html`<p>${message}</p>`)}
    // and add to message-container
    const messageContainer =
      this.shadowRoot.getElementById("message-container");
    messageContainer.innerHTML = "";
    for (let i = 0; i <= this.currentMessageIndex; i++) {
      const message = document.createElement("p");
      message.textContent = this.messages[i];
      messageContainer.appendChild(message);
    }
  }

  render() {
    return html`
      <div class="chat-option" @click="${this.togglePopup}">
        <i class="fas fa-comments"></i>
      </div>
      <div id="chat-pop" class="chatbot-popup">
        <div id="message-container" class="messages">
          ${this.messages
            .slice(0, this.currentMessageIndex + 1)
            .map((message) => html`<p>${message}</p>`)}
        </div>
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
