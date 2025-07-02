import {
  LitElement,
  html,
  css,
} from "https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js";
// Import Chart.js 
import 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
import { conversationTree } from "./conversation.js";

export class DataProcessor {
  constructor(data) {
    this.data = data;
  }

  parseValue(value) {
    if (typeof value === 'string') {
      const numericValue = parseFloat(value);
      return isNaN(numericValue) ? value : numericValue;
    }
    return value;
  }

  findMode(values) {
    if (!Array.isArray(values) || values.length === 0) return undefined;
    const frequency = {};
    let maxFreq = 0;
    let mode;
    values.forEach(value => {
      frequency[value] = (frequency[value] || 0) + 1;
      if (frequency[value] > maxFreq) {
        maxFreq = frequency[value];
        mode = value;
      }
    });
    return mode;
  }

  calculateAverage(values) {
    if (!Array.isArray(values) || values.length === 0) return 0;
    const numericValues = values
      .map(v => this.parseValue(v))
      .filter(v => typeof v === 'number');
    return numericValues.length ?
      numericValues.reduce((a, b) => a + b) / numericValues.length : 0;
  }

  aggregateData(method = 'avg') {
    const result = {};
    const numericProperties = ['temperature', 'humidity', 'pollution'];

    for (const prop of numericProperties) {
      const values = this.data
        .map(item => item[prop])
        .filter(v => v !== undefined);

      if (values.length === 0) continue;

      switch (method) {
        case 'max':
          result[prop] = `${Math.max(...values.map(this.parseValue))} C`;
          break;
        case 'min':
          result[prop] = `${Math.min(...values.map(this.parseValue))} C`;
          break;
        case 'mode':
          result[prop] = `${this.findMode(values)} C`;
          break;
        case 'avg':
        default:
          result[prop] = `${Math.round(this.calculateAverage(values))} C`;
      }
    }

    return result;
  }
}

export class ChatBotComponent extends LitElement {
  showingTemperatureOptions = false;
  originalQuery = "";
  static styles = css`

  /* Existing styles remain the same */
  
/* Base styling remains the same */
/* Base styling remains the same */
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

/* Modified chatbot popup for responsiveness */
.chatbot-popup {
  position: absolute;
  bottom: 90px;
  right: 20px;
  width: 320px;
  background-color: #fff;
  border: 1px solid #ccc;
  border-radius: 10px;
  box-shadow: 0 2px 5px rgba(148, 43, 43, 0);
  display: none;
  overflow: hidden;
  font-family: Arial, sans-serif;
  max-width: 95vw; /* Limit width on smaller screens */
}

@media screen and (max-width: 480px) {
  .chatbot-popup {
    right: 10px;
    bottom: 80px;
    width: calc(100vw - 20px); /* Full width minus margins */
  }
  
  .chat-option {
    bottom: 10px;
    right: 10px;
  }
}

.chatbot-popup.active {
  display: block;
}

/* Message container - more adaptive height */
.messages {
  height: 400px;
  max-height: 50vh; /* Responsive height */
  padding: 10px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  /* Hide scrollbar for Chrome, Safari and Opera */
  &::-webkit-scrollbar {
    display: none;
  }
  /* Hide scrollbar for IE, Edge and Firefox */
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}

@media screen and (max-height: 600px) {
  .messages {
    height: 300px;
  }
}

.message a {
  color: #ff8400;
  text-decoration: none;
}

.input-area {
  border-top: 1px solid transparent;
  display: flex;
  align-items: center;
  padding: 5px;
}

.input-area input {
  width: 75%;
  padding: 10px;
  border: 1px solid #aaa;
  border-radius: 15px;
  outline: none;
  background-color: #f0f6ff;
  transition: all 0.3s ease-in-out;
}

.input-area input:hover {
  border-color: #007bff;
  background-color: #f5f5f5;
  box-shadow: 0px 0px 5px rgba(0, 123, 255, 0.5);
}

.input-area button {
  padding: 10px;
  border-radius: 50%;
  background-color: #007bff;
  color: #fff;
  border: none;
  cursor: pointer;
  outline: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
}

.input-area button img {
  width: 20px;
  height: 20px;
}

/* Message styling - adjusted for better mobile display */
.message-row {
  display: flex;
  width: 100%;
  margin: 4px 0;
  align-items: center;
}

.bot-row {
  justify-content: flex-start;
}

.user-row {
  justify-content: flex-end;
}

.message {
  padding: 8px 12px;
  border-radius: 12px;
  max-width: 80%;
  display: inline-block;
  word-wrap: break-word; /* Ensure long words don't break layout */
}

@media screen and (max-width: 480px) {
  .message {
    max-width: 85%; /* Wider messages on mobile */
  }
}

.bot-message {
  background-color: #123462;
  color: white;
  margin-left: 8px;
}

.user-message {
  background-color: #007bff;
  color: white;
  margin-right: 8px;
}

.icon {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0; /* Prevent icon from shrinking on small screens */
}

@media screen and (max-width: 350px) {
  .icon {
    width: 25px;
    height: 25px;
    font-size: 12px;
  }
}

.bot-icon {
  background-color: #777;
  color: #fff;
}

.user-icon {
  background-color: #dedede;
  color: #555;
}

.input-area button:hover {
  background-color: #0056b3;
}

/* Chat header with responsive adjustments */
.chat-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #2a27da 0%, #00ccff 100%);
  padding: 10px;
  color: white;
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
}

.chat-header::after {
  content: "";
  position: absolute;
  bottom: -5px;
  left: 0;
  width: 100%;
  height: 20px;
  background-image: url('data:image/svg+xml;utf8,<svg width="100%" height="100%" viewBox="0 0 1440 590" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="gradient" x1="0%" y1="50%" x2="100%" y2="50%"><stop offset="5%" stop-color="%230693e3"></stop><stop offset="95%" stop-color="%238ed1fc"></stop></linearGradient></defs><path d="M 0,600 L 0,150 C 114.9282296650718,158.77511961722487 229.8564593301436,167.55023923444975 326,151 C 422.1435406698564,134.44976076555025 499.5023923444975,92.57416267942584 591,85 C 682.4976076555025,77.42583732057416 788.1339712918661,104.15311004784687 895,117 C 1001.8660287081339,129.84688995215313 1109.961722488038,128.81339712918663 1201,132 C 1292.038277511962,135.18660287081337 1366.019138755981,142.5933014354067 1440,150 L 1440,600 L 0,600 Z" fill="url(%23gradient)" fill-opacity="0.53"></path></svg>');
  background-size: cover;
  background-repeat: no-repeat;
  z-index: 5;
}

/* Responsive chat logo */
.chat-logo {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background-color: white;
  padding: 2px;
  border: 1px solid #ddd;
  object-fit: cover;
}

.chat-title {
  margin-left: 10px;
  font-weight: bold;
  font-size: 18px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media screen and (max-width: 350px) {
  .chat-title {
    font-size: 16px;
  }
  
  .chat-subtitle {
    font-size: 10px;
  }
}

.chat-close {
  font-size: 25px;
  font-weight: bold;
  color: white;
  background: transparent;
  border-radius: 50%;
  border: 2px solid white;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  margin-left: auto;
  transition: background 0.3s ease-in-out;
}

.icon-image {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
}

img.icon-image {
  background-color: white;
}

/* Responsive chat box */
.chat-box {
  padding: 16px;
  background: #e1e3e5;
  height: 600px;
  max-height: 80vh; /* Responsive height */
  overflow-y: auto;
  width: 450px;
  max-width: 100%; /* Full width on smaller screens */
  border-radius: 8px;
}

@media screen and (max-width: 480px) {
  .chat-box {
    width: 100%;
    padding: 12px;
  }
}

/* Chat message wrapper styling */
.chat_message_wrapper {
  display: flex;
  align-items: flex-end;
  margin-bottom: 15px;
  position: relative;
}

.chat_user_avatar img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.chat_message_wrapper .chat_message:before {
  content: "";
  position: absolute;
  left: -10px;
  top: 10px;
  border-top: 8px solid transparent;
  border-bottom: 8px solid transparent;
  border-right: 10px solid #F0F2F7;
}

/* User chat message */
.chat_message_wrapper.chat_message_right {
  justify-content: flex-end;
  text-align: right;
}

.chat_message_wrapper.chat_message_right .chat_message {
  background: linear-gradient(135deg, #2a27da 0%, #00ccff 100%);
  color: white;
  float: right;
  max-width: 70%;
  margin-left: auto;
  text-align: left;
  word-break: break-word;
}

.chat_message_wrapper.chat_message_right .chat_message:after {
  content: "";
  position: absolute;
  right: 0;
  top: 10px;
  border-top: 8px solid transparent;
  border-bottom: 8px solid transparent;
  border-left: transparent;
  border-right: none;
  margin-left: 0;
}

/* Bot chat message */
.chat_message_wrapper .chat_message {
  background: #F0F2F7;
  color: black;
  float: left;
  border-radius: 12px;
  position: relative;
  padding: 8px 14px;
  margin-left: 12px;
}

/* Hide scrollbar for messages */
.messages::-webkit-scrollbar {
  display: none;
}

/* Message bubbles */
.chat_message {
  max-width: 60%;
  padding: 8px 14px;
  border-radius: 12px;
  position: relative;
  margin: 4px 0;
  font-size: 14px;
  display: inline-block;
  text-align: left;
  line-height: 1.4;
  word-wrap: break-word;
}

@media screen and (max-width: 480px) {
  .chat_message {
    max-width: 75%; /* Wider messages on mobile */
    font-size: 13px; /* Slightly smaller font */
  }
}

/* Hide user avatar */
.chat_message_wrapper.chat_message_right .chat_user_avatar {
  display: none;
}

.chat_message p {
  margin: 0;
  padding: 0;
}

/* Send button styling */
#send-button {
  background: none;
  border: none;
  padding: 5px;
  cursor: pointer;
  transition: transform 0.2s ease-in-out;
}

#send-button:hover {
  transform: scale(1.1);
}

.send-icon {
  width: 30px;
  height: 30px;
}

/* Question toggle section */
.question-toggle {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.arrow-icon {
  display: inline-block;
  font-size: 12px;
  transition: transform 0.3s ease;
  margin-left: 5px;
}

.arrow-icon.rotate {
  transform: rotate(180deg);
}

/* Responsive toggle questions button */
.toggle-questions-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: white;
  color: rgb(44, 47, 49);
  border: 2px solid white;
  border-radius: 5px;
  padding: 10px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: box-shadow 0.3s ease;
  width: fit-content;
  box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.2);
  margin: 0 auto;
}

@media screen and (max-width: 350px) {
  .toggle-questions-btn {
    padding: 8px 12px;
    font-size: 12px;
  }
}

.toggle-questions-btn:hover {
  background-color: white;
  box-shadow: 4px 4px 8px rgba(0, 0, 0, 0.3);
}

/* Recommended questions container */
.recommended-questions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 10px;
  max-height: 200px;
  overflow-y: auto;
  padding: 10px;
  background-color: #f1f2f3;
  border-radius: 12px;
  border: 2px solid #007bff;
  scrollbar-width: thin;
}

.recommended-questions::-webkit-scrollbar {
  width: 8px;
  display: block;
}

.recommended-question {
  flex-shrink: 0;
}

.recommended-questions::-webkit-scrollbar-thumb {
  background: #007bff;
  border-radius: 10px;
}

.recommended-questions::-webkit-scrollbar-track {
  background: #ddd;
  border-radius: 10px;
}

/* Recommended question button styling */
.recommended-question {
  background-color: white;
  color: #007bff;
  border: 1px solid #007bff;
  border-radius: 16px;
  padding: 8px 14px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.3s ease;
  text-align: center;
  width: calc(100% - 20px);
}

@media screen and (max-width: 350px) {
  .recommended-question {
    font-size: 12px;
    padding: 6px 10px;
  }
}

.recommended-question:hover {
  background-color: #0056b3;
  color: white;
}

/* Welcome section styling */
.welcome-section {
  background: linear-gradient(135deg, #2a27da 0%, #00ccff 100%);
  color: white;
  padding: 15px;
  text-align: center;
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
}

.welcome-title {
  font-size: 1.5em;
  font-weight: bold;
  margin-bottom: 10px;
}

@media screen and (max-width: 350px) {
  .welcome-title {
    font-size: 1.2em;
  }
}

.welcome-subtitle {
  font-size: 1em;
  opacity: 0.9;
}

@media screen and (max-width: 350px) {
  .welcome-subtitle {
    font-size: 0.9em;
  }
}

/* Question divider styling */
.question-divider {
  text-align: center;
  margin: 10px 0;
  font-size: 16px;
  font-weight: bold;
  color: #666;
  position: relative;
}

.question-divider::before,
.question-divider::after {
  content: "";
  display: inline-block;
  width: 40%;
  height: 1px;
  background-color: #ccc;
  position: absolute;
  top: 50%;
}

.question-divider::before {
  left: 0;
}

.question-divider::after {
  right: 0;
}

/* Option buttons styling */
.option-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 10px 0;
  justify-content: center;
}

.option-button {
  background-color: #f1f2f3;
  color: #2f2c2c;
  border: 2px solid #007bff;
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s;
  white-space: nowrap;
  margin: 5px;
}

@media screen and (max-width: 350px) {
  .option-button {
    padding: 6px 12px;
    font-size: 12px;
  }
}

/* Conversation options styling */
.conversation-options {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
  margin: 8px 0;
  padding: 0 15px;
  justify-content: center;
}

.option-button:hover {
  background-color: #0056b3;
  color: white;
}

/* Chat title container */
.chat-title-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  width: 100%;
}

.chat-subtitle {
  font-size: 12px;
  color: #ddd;
  margin-top: 2px;
  font-weight: bold;
  text-align: center;
  width: 100%;
}

/* Chat minimize button */
.chat-minimize {
  font-size: 15px;
  font-weight: bold;
  color: white;
  cursor: pointer;
  margin-left: 10px;
  padding: 5px;
  transition: transform 0.3s ease;
}

.chat-minimize:hover {
  transform: scale(1.1);
}

/* Chat button styling */
.chat-button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
}

.chat-button:hover {
  background-color: #0056b3;
}

/* Visualize button styling */
.visualize-btn {
  display: inline-block;
  background-color: #4a7bfa;
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  margin-top: 8px;
  transition: background-color 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.visualize-btn:hover {
  background-color: #3a5fd0;
}

.visualize-btn:active {
  background-color: #2a4cb0;
  transform: translateY(1px);
  box-shadow: 0 1px 2px rgba(234, 226, 226, 0.1);
}

/* Visualization icon styling */
.visualization-icon {
  width: 40px;
  height: 40px;
  cursor: pointer;
  transition: transform 0.2s ease;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: transparent;
  padding: 0;
  margin-top: 8px;
  margin-left: auto;
}

.visualization-icon img {
  width: 150%;
  height: 150%;
  object-fit: contain;
  background-color: white;
  border-radius: 50%;
  margin-bottom: 20px;
}

.visualization-icon:hover {
  transform: scale(1.1);
}

/* Inline visualization styling */
.inline-visualization {
  position: relative;
  width: 100%;
  margin-top: 10px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.inline-viz-close {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
}

/* Location button styling */
.location-btn {
  background-color: #4a7bfa;
  display: inline-block;
  padding: 8px 16px;
  margin-right: 10px;
  border-radius: 20px;
  color: white;
  cursor: pointer;
  text-align: center;
}

/* Message container */
#message-container {
  display: flex;
  flex-direction: column;
}

/* Buttons scroll container */
.buttons-scroll-container::after {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  width: 30px;
  background: linear-gradient(to right, transparent, rgba(245, 245, 245, 0.9) 70%);
  pointer-events: none;
  border-top-right-radius: 8px;
  border-bottom-right-radius: 8px;
}

.buttons-scroll-container {
  width: 100%;
  height: 30%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding: 6px 0;
  scrollbar-width: none;
  -ms-overflow-style: none;
  background-color: transparent;
  border-radius: 8px;
}

.buttons-scroll-container::-webkit-scrollbar {
  display: none;
}

/* Buttons section wrapper */
.buttons-section-wrapper {
  width: 100%;
  margin: 15px 0;
  position: relative;
}

/* Location buttons styling */
.location-buttons {
   display: flex;
  flex-wrap: nowrap; /* Prevent wrapping */
  gap: 10px;
  justify-content: center;
  margin-top: 10px;
}

.location-btn {
  min-width: auto; /* Remove any minimum width constraints */
  flex-shrink: 1; /* Allow buttons to shrink if needed */
  white-space: nowrap; /* Keep text on one line */
}

@media screen and (max-width: 350px) {
  .location-btn {
flex-direction: row;
  }
}

.location-btn:hover {
  background-color: #3a5fd0;
}

.location-btn:active {
  background-color: #2a4cb0;
  transform: translateY(1px);
}

/* Message editing functionality */
.chat_message_wrapper.chat_message_right .chat_message {
  position: relative;
}

.edit-message-icon {
  position: absolute;
  top: 5px;
  left: -25px;
  cursor: pointer;
  color: #888;
  font-size: 16px;
  opacity: 0.6;
  transition: opacity 0.3s ease;
}

@media screen and (max-width: 480px) {
  .edit-message-icon {
    left: -20px;
    font-size: 14px;
  }
}

.edit-message-icon:hover {
  opacity: 1;
}

.edit-message-input {
   display: flex;
  align-items: center;
  width: 100%;
  position: relative; 
}

.edit-message-input input {
  flex-grow: 1;
  padding: 5px 30px 5px 5px; /* Add right padding to make space for the save button */
  border: none; /* Remove the border */
  border-radius: 4px;
  margin-right: 5px;
  background-color: inherit; /* Inherit parent's background color */
  color: inherit; /* Inherit parent's text color */
  width: calc(100% - 40px); /* Adjust width to account for cancel button */
}

@media screen and (max-width: 350px) {
  .edit-message-input input {
    font-size: 12px;
  }
}

.edit-save-btn, .edit-cancel-btn {
  padding: 2px 6px;
  margin-left: 5px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background-color: transparent;
}

.edit-save-btn {
    position: absolute;
  right: 25px; /* Position it inside the input field, adjust as needed */
  top: 50%;
  transform: translateY(-50%);
  padding: 2px 6px;
  border: none;
  cursor: pointer;
  background-color: transparent;
  color:rgb(245, 243, 243);
  z-index: 2; /* Ensure it's above the input */
}

.edit-cancel-btn {
   padding: 2px 6px;
  margin-left: 5px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background-color: transparent;
  color:rgb(228, 222, 222);
}

/* Media query for landscape orientation on mobile */
@media screen and (max-height: 500px) and (orientation: landscape) {
.chatbot-popup {
  max-height: 80vh; /* Instead of fixed height */
}

.messages {
  height: clamp(250px, 50vh, 400px); /* Min, preferred, max */
}
  
  .chat-header {
    padding: 5px;
  }
  
  .input-area {
    padding: 3px;
  }
}

/* Media queries for very small screens */
@media screen and (max-width: 280px) {
  .chat-title {
    font-size: 14px;
  }
  
  .chat-subtitle {
    font-size: 9px;
  }
  
  .chat-logo {
    width: 25px;
    height: 25px;
  }
  
  .chat-close {
    width: 24px;
    height: 24px;
    font-size: 20px;
  }
  
  .input-area input {
    font-size: 12px;
  }
  
  .input-area button {
    width: 35px;
    height: 35px;
  }
}
`;

  constructor() {
    super();
    this.popupActive = false;
    this.currentMessageIndex = 0;
    this.lastCorrectMessageIndex = 0;
    this.messages = [{ text: conversationTree.message, sender: "bot" }];
    this.currentOptions = conversationTree.options;
    this.userInput = "";
    this.buildingIdentifier = "";
    this.verticalIdentifier = "";
    this.floorIdentifier = "";
    this.acc = false;
    this.stringInput = false;
    this.recommendedQuestions = [];
    this.conversationOptions = [];
    this.showRecommendedQuestions = false;// New property for conversation options
    this.editingMessageIndex = -1;
    this.editedMessage = '';
    this.currentChart = null;
  }
  startEditMessage(index) {
    // Only allow editing user messages
    if (this.messages[index].sender === 'user') {
      this.editingMessageIndex = index;
      this.editedMessage = this.messages[index].text;
      this.requestUpdate();

      setTimeout(() => {
        const editInput = this.shadowRoot.querySelector('.edit-message-input input');
        if (editInput) {
          editInput.focus();
        }
      }, 50);
    }
  }

  async saveEditedMessage() {
    if (this.editingMessageIndex === -1 || !this.editedMessage.trim()) return;

    // Update the user message with edited content
    this.messages[this.editingMessageIndex].text = this.editedMessage.trim();
    const responseIndex = this.editingMessageIndex + 1;

    // Remove all messages after the edited message
    if (responseIndex < this.messages.length) {
      this.messages.splice(responseIndex);
    }

    // Add a new bot response message with loading indicator
    this.messages.push({ sender: 'bot', text: '●' });
    this.populateMessages();

    // Animated dots for loading
    let dotCount = 0;
    const loadingInterval = setInterval(() => {
      dotCount = (dotCount % 3) + 1;
      const dots = '●'.repeat(dotCount);
      if (this.messages.length > responseIndex) {
        this.messages[this.messages.length - 1].text = dots;
        this.populateMessages();
      }
    }, 500);

    try {
      const response = await this.sendMessageToBackend(this.editedMessage.trim());
      clearInterval(loadingInterval);

      const lowerMsg = this.editedMessage.toLowerCase();
      const isTemporalDataQuery = [
        'past', 'last', 'history', 'historical', 'trend', 'over time',
        'yesterday', 'week', 'month', 'year', 'hour', 'day'
      ].some(keyword => lowerMsg.includes(keyword));
      const isSensorParameterQuery = [
        'temperature', 'humidity', 'co2', 'carbon dioxide', 'co', 'carbon monoxide',
        'pm2.5', 'particulate matter', 'pm10', 'gas', 'tvoc', 'voc', 'air quality',
        'ph', 'turbidity', 'tds', 'conductivity', 'water flow', 'water level',
        'voltage', 'current', 'power', 'energy', 'pressure', 'noise'
      ].some(keyword => lowerMsg.includes(keyword));

      if (isTemporalDataQuery && isSensorParameterQuery) {
        this._addVisualizationResponse(response, this.editedMessage.trim());
      } else {
        this.messages[this.messages.length - 1].text = response;
      }
    } catch (error) {
      clearInterval(loadingInterval);
      this.messages[this.messages.length - 1].text = "Sorry, I couldn't process your edited question. Please try again.";
      console.error("Error processing edited message:", error);
    }

    this.editingMessageIndex = -1;
    this.editedMessage = '';
    this.populateMessages();
  }

  // Helper to add visualization icon and event
  _addVisualizationResponse(response, queryToUse) {
    const iconId = `visualizeIcon_${Date.now()}`;
    this.messages[this.messages.length - 1].text = `${response}\n\n<div id="${iconId}" class="visualization-icon" data-query="${encodeURIComponent(queryToUse)}">
        <img src="/static/images/bar1.png" alt="Visualize" />
      </div>`;
    setTimeout(() => {
      const icon = this.shadowRoot.getElementById(iconId);
      if (icon) {
        const newIcon = icon.cloneNode(true);
        icon.parentNode.replaceChild(newIcon, icon);
        newIcon.addEventListener("click", () => {
          console.log("Visualization icon clicked for query:", queryToUse);
          const encodedQuery = encodeURIComponent(queryToUse);
          this.openVisualizationModal(encodedQuery);
        });
      }
    }, 100);
  }

  cancelEditMessage() {
    this.editingMessageIndex = -1;
    this.editedMessage = '';
    this.requestUpdate();
  }

  scrollToBottom() {
    const messageContainer = this.shadowRoot.getElementById("message-container");
    if (messageContainer) {
      messageContainer.scrollTop = messageContainer.scrollHeight;
    }
  }
  // Add this method to toggle recommended questions visibility
  toggleRecommendedQuestions() {
    this.showRecommendedQuestions = !this.showRecommendedQuestions;
    this.requestUpdate();
  }


  togglePopup() {
    this.popupActive = !this.popupActive;
    let popup = this.shadowRoot.getElementById("chat-pop");
    if (this.popupActive) {
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
    const latest_data_url = new URL(
      "https://smartcitylivinglab.iiit.ac.in/verticals/all/latest"
    );
    const options = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    };

    this.resetInputAndPopulateMessages();

    // Fetch and flatten data
    const response = await fetch(latest_data_url, options);
    const data = await response.json();
    const data_dict = Object.values(data)
      .flat()
      .reduce((acc, element) => {
        acc[element.node_id] = element;
        return acc;
      }, {});

    // Helper: filter nodes by identifier
    const filterNodes = (nodes, identifier, fn) =>
      identifier ? nodes.filter(fn) : nodes;

    let filteredNodes = Object.values(data_dict);

    filteredNodes = filterNodes(
      filteredNodes,
      verticalIdentifier,
      (node) =>
        node.node_id.startsWith(verticalIdentifier) ||
        node.node_id.slice(0, 4).includes(verticalIdentifier)
    );
    filteredNodes = filterNodes(
      filteredNodes,
      buildingIdentifier,
      (node) => node.node_id.includes(buildingIdentifier)
    );
    filteredNodes = filterNodes(
      filteredNodes,
      floorIdentifier,
      (node) => node.node_id.includes(floorIdentifier)
    );

    // Node identifier logic
    if (nodeIdentifier) {
      filteredNodes = filteredNodes.filter(
        (node) => node.node_id === nodeIdentifier
      );
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
        this.addMessage(
          `No data found for the node ${nodeIdentifier}. One of the closest match is ${closestMatch}`,
          "bot"
        );
        filteredNodes = Object.values(data_dict).filter(
          (node) => node.node_id === closestMatch
        );
      }
    }

    // No data found
    if (filteredNodes.length === 0) {
      const identifiers = [];
      if (buildingIdentifier) identifiers.push("Building - " + buildingIdentifier);
      if (verticalIdentifier) identifiers.push("Vertical - " + verticalIdentifier);
      if (floorIdentifier) identifiers.push("Floor - " + floorIdentifier);
      if (nodeIdentifier) identifiers.push("Node - " + nodeIdentifier);
      const message = "No data found for the identifiers: " + identifiers.join(", ");
      this.addMessage(message, "bot");
      return false;
    }

    // Aggregate if needed
    if (accumulator) {
      const processor = new DataProcessor(filteredNodes);
      const aggregatedData = processor.aggregateData(accumulator);
      filteredNodes = [aggregatedData];
    }

    // Compose response message
    let responseMessage = "";
    if (accumulator) {
      responseMessage += "Aggregated data with \n";
      responseMessage += "Accumulator: " + accumulator + "\n";
    } else {
      responseMessage += "Data for the identifiers: \n";
    }
    const node = filteredNodes[0];
    responseMessage += `${node["node_id"]}:\n`;
    for (const [k, value] of Object.entries(node)) {
      responseMessage += k + ": " + value + "\n";
    }
    this.addMessage(responseMessage, "bot");

    // Markdown table for multiple nodes
    if (filteredNodes.length > 1) {
      let mkdwnTable = "# Data For the Identifiers:\n";
      if (buildingIdentifier) mkdwnTable += "Building: " + buildingIdentifier + "\n";
      if (verticalIdentifier) mkdwnTable += "Vertical: " + verticalIdentifier + "\n";
      if (floorIdentifier) mkdwnTable += "Floor: " + floorIdentifier + "\n";
      mkdwnTable += "\n|";
      Object.keys(filteredNodes[0]).forEach((k) => {
        mkdwnTable += k + "|";
      });
      mkdwnTable += "\n|";
      Object.keys(filteredNodes[0]).forEach(() => {
        mkdwnTable += "-|";
      });
      mkdwnTable += "\n";
      filteredNodes.forEach((n) => {
        Object.values(n).forEach((value) => {
          mkdwnTable += value + "|";
        });
        mkdwnTable += "\n";
      });

      const tableResponse = await fetch("https://api.stagb.in/dev/content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: mkdwnTable,
        }),
      });
      const responseJson = await tableResponse.json();
      this.addMessage(
        `Data table for all the identifiers can be found <a href="https://stagb.in/${responseJson.id}.md" target="_blank">here</a>`,
        "bot"
      );
    }
    return false;
  }

  handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault(); // Prevent form submission
      this.sendMessage();
    }
  }

  async sendMessage() {
    const userInputTrimmed = this.userInput.trim();
    if (!userInputTrimmed) return;

    // Helper: handle loading dots
    const startLoading = () => {
      let dotCount = 0;
      return setInterval(() => {
        dotCount = (dotCount % 3) + 1;
        const dots = '●'.repeat(dotCount);
        if (
          this.messages[this.messages.length - 1].sender === 'bot' &&
          this.messages[this.messages.length - 1].text.startsWith('●')
        ) {
          this.messages.pop();
        }
        this.addMessage(dots, "bot");
      }, 500);
    };

    // Helper: handle bot options after response
    const setBotOptions = (optionsNode) => {
      this.currentOptions = conversationTree.nodes[optionsNode].options;
      this.recommendedQuestions = [];
      this.conversationOptions = this.currentOptions;
      this.requestUpdate();
    };

    // Helper: handle continue/exit selection
    const handleContinueExit = async (input) => {
      if (input === "1") {
        this.addMessage(conversationTree.nodes.AskQuestionNode.message, "bot");
        this.currentOptions = [];
        this.stringInput = true;
        this.recommendedQuestions = conversationTree.nodes.AskQuestionNode.recommendedQuestions;
        this.requestUpdate();
      } else if (input === "3") {
        this.addMessage(conversationTree.nodes.ExitChatNode.message, "bot");
        setTimeout(() => {
          this.addMessage(conversationTree.nodes.MainMenu.message, "bot");
          this.currentOptions = conversationTree.nodes.MainMenu.options;
          this.recommendedQuestions = [];
          this.conversationOptions = [];
          this.requestUpdate();
        }, 1000);
      }
    };

    // Helper: handle fetchDataAndAskContinue fallback
    const handleFetchDataFallback = async (input) => {
      let continueConversation = await this.fetchDataAndAskContinue(
        false, false, false, false, input
      );
      if (!continueConversation) {
        this.addMessage(
          "Would you like to:\n1. Ask Another Question\n2. Exit Chat",
          "bot"
        );
        this.currentOptions = [
          { text: "1", next: "AskQuestionNode" },
          { text: "2", next: "ExitChatNode" }
        ];
        this.recommendedQuestions = [];
        this.conversationOptions = this.currentOptions;
        this.requestUpdate();
      }
      this.buildingIdentifier = "";
      this.verticalIdentifier = "";
      this.floorIdentifier = "";
    };

    // Helper: handle option selection
    const handleOptionSelection = async (selectedOption) => {
      let responseMessage = "";
      let nextNodeKey = selectedOption.next;
      let lastBotMessage = this.messages[this.messages.length - 2]?.text || "";

      if (selectedOption.identifier) {
        if (lastBotMessage.includes("Which building data do you need?")) {
          this.buildingIdentifier = selectedOption.identifier;
        } else if (lastBotMessage.includes("Please select a floor by entering")) {
          this.floorIdentifier = selectedOption.identifier;
        } else if (lastBotMessage.includes("Please select a vertical")) {
          this.verticalIdentifier = selectedOption.identifier;
        }
      }
      if (selectedOption.accumulator) this.acc = selectedOption.accumulator;
      if (selectedOption.textInput) this.stringInput = true;

      if (selectedOption.terminate) {
        let continueConversation = await this.fetchDataAndAskContinue(
          this.buildingIdentifier,
          this.verticalIdentifier,
          this.floorIdentifier,
          this.acc
        );
        if (!continueConversation) {
          this.addMessage(
            "Thank you for using the chatbot. Have a great day!",
            "bot"
          );
          this.currentOptions = [
            { text: "1", next: "BuildingNode" },
            { text: "2", next: "VerticalNode" },
            { text: "3", next: "NodeSpecificFinalNode", textInput: true },
            { text: "4", next: "ConversationalModeOptions" }
          ];
        }
        this.buildingIdentifier = "";
        this.verticalIdentifier = "";
        this.floorIdentifier = "";
      }

      const nextNode = conversationTree.nodes[nextNodeKey];
      if (nextNode) {
        responseMessage = nextNode.message;
        this.currentOptions = nextNode.options || [];
        if (nextNodeKey === "AskQuestionNode") {
          this.stringInput = true;
          this.recommendedQuestions = nextNode.recommendedQuestions || [];
          this.conversationOptions = this.currentOptions;
          this.requestUpdate();
        } else {
          this.recommendedQuestions = [];
          this.conversationOptions = this.currentOptions;
        }
        this.currentMessageIndex++;
        this.lastCorrectMessageIndex = this.currentMessageIndex;
      } else {
        responseMessage = "Error: Invalid next node";
      }
      this.addMessage(responseMessage, "bot");
    };

    // Main logic
    if (this.stringInput) {
      this.stringInput = false;
      this.addMessage(userInputTrimmed, "user");
      const lastBotMessage = this.messages.length >= 2 ? this.messages[this.messages.length - 2].text : "";

      if (lastBotMessage.includes("Please enter your question:")) {
        let loadingInterval = startLoading();
        try {
          const temporalDataKeywords = [
            'past', 'last', 'history', 'historical', 'trend', 'over time',
            'yesterday', 'week', 'month', 'year', 'hour', 'day'
          ];
          const tempHumidityKeywords = ['temperature', 'humidity'];
          const isTemporalDataQuery = temporalDataKeywords.some(keyword => userInputTrimmed.toLowerCase().includes(keyword));
          const isTempHumidityQuery = tempHumidityKeywords.some(keyword => userInputTrimmed.toLowerCase().includes(keyword));

          const response = await this.sendMessageToBackend(userInputTrimmed);
          let responseData;
          try {
            responseData = typeof response === 'string' ? JSON.parse(response) : response;
          } catch (parseError) {
            responseData = {
              response: response || "I received a response, but it couldn't be parsed.",
              is_temporal: false
            };
          }
          const extractedLocation = this.extractLocation(userInputTrimmed);

          if (loadingInterval) clearInterval(loadingInterval);
          if (this.messages[this.messages.length - 1].text.startsWith('●')) this.messages.pop();

          const isLocationValid =
            extractedLocation &&
            ['Kohli Block', 'Vindhya'].some(
              location => extractedLocation.toLowerCase() === location.toLowerCase()
            );

          if (isTemporalDataQuery && isTempHumidityQuery) {
            const iconId = `visualizeIcon_${Date.now()}`;
            this.addMessage(`${responseData.response}\n\n<div id="${iconId}" class="visualization-icon">
                    <img src="/static/images/bar1.png" alt="Visualize" />
                  </div>`, "bot");
            setTimeout(() => {
              const icon = this.shadowRoot.getElementById(iconId);
              if (icon) {
                icon.addEventListener("click", () => {
                  const encodedQuery = encodeURIComponent(userInputTrimmed);
                  this.openVisualizationModal(encodedQuery);
                });
              }
            }, 100);
            this.addMessage(
              "Would you like to:\n1. Ask Another Question\n2. Back to the menu\n3. Exit Chat",
              "bot"
            );
            setBotOptions("QuestionResponseOptionsNode");
          } else if (isTempHumidityQuery && isLocationValid) {
            const indoorButtonId = `indoorButton_${Date.now()}`;
            const outdoorButtonId = `outdoorButton_${Date.now()}`;
            this.addMessage(`${responseData.response}\n\n<div class="location-buttons">
                  <button id="${indoorButtonId}" class="location-btn">Indoor</button>
                  <button id="${outdoorButtonId}" class="location-btn">Outdoor</button>
                </div>`, "bot");
            setTimeout(() => {
              const indoorButton = this.shadowRoot.getElementById(indoorButtonId);
              const outdoorButton = this.shadowRoot.getElementById(outdoorButtonId);
              if (indoorButton) indoorButton.addEventListener('click', () => this.handleLocationButton('Indoor'));
              if (outdoorButton) outdoorButton.addEventListener('click', () => this.handleLocationButton('Outdoor'));
            }, 100);
          } else {
            this.addMessage(responseData.response, "bot");
            this.addMessage(
              "Would you like to:\n1. Ask Another Question\n2. Back to the menu\n3. Exit Chat",
              "bot"
            );
            setBotOptions("QuestionResponseOptionsNode");
          }
        } catch (error) {
          if (loadingInterval) clearInterval(loadingInterval);
          this.addMessage("Sorry, I couldn't process your question. Please try again.", "bot");
          this.addMessage(conversationTree.nodes.MainMenu.message, "bot");
          this.currentOptions = conversationTree.nodes.MainMenu.options;
          this.recommendedQuestions = [];
          this.conversationOptions = [];
          this.requestUpdate();
        }
      } else if (lastBotMessage.includes("Would you like to:")) {
        await handleContinueExit(userInputTrimmed);
      } else {
        await handleFetchDataFallback(userInputTrimmed);
      }
      this.resetInputAndPopulateMessages();
      return;
    }

    // Handle option selection (non-stringInput)
    const selectedOption = this.currentOptions.find(
      (option) => option.text === userInputTrimmed
    );
    this.addMessage(userInputTrimmed, "user");
    if (selectedOption) {
      await handleOptionSelection(selectedOption);
    } else {
      this.addMessage("Error: Invalid option selected", "bot");
      const lastCorrectMessage = this.messages[this.lastCorrectMessageIndex];
      this.addMessage(lastCorrectMessage.text, "bot");
    }
    this.resetInputAndPopulateMessages();
  }


  extractLocation(input) {
    const knownLocations = ['Kohli Block', 'Vindhya'];
    const lowercaseInput = input.toLowerCase();

    const matchedLocation = knownLocations.find(location =>
      lowercaseInput.includes(location.toLowerCase())
    );

    return matchedLocation;
  }


  async handleLocationButton(location) {
    // Send a follow-up query to get location-specific information
    try {
      const locationQuery = `${this.messages[this.messages.length - 2].text} ${location} temperature`;

      const lastMessage = this.messages[this.messages.length - 1];
      if (lastMessage.text.includes('<div class="location-buttons">')) {
        // Modify the last message to remove the buttons
        lastMessage.text = lastMessage.text.replace(
          /<div class="location-buttons">.*?<\/div>/s,
          ''
        );
        this.populateMessages(); // Refresh messages to reflect change
      }


      // Animated dots loading effect
      let dotCount = 0;
      const loadingInterval = setInterval(() => {
        dotCount = (dotCount % 3) + 1;
        const dots = '●'.repeat(dotCount);

        // Remove previous loading message if exists
        if (this.messages[this.messages.length - 1].sender === 'bot' &&
          this.messages[this.messages.length - 1].text.startsWith('●')) {
          this.messages.pop();
        }

        this.addMessage(dots, "bot");
      }, 500);

      const response = await this.sendMessageToBackend(locationQuery);

      // Stop the loading interval
      clearInterval(loadingInterval);

      // Remove the last loading message
      this.messages.pop();

      // Add the location-specific response
      this.addMessage(response, "bot");

      // Provide continuation options
      this.addMessage(
        "Would you like to:\n1. Ask Another Question\n2. Back to the menu\n3. Exit Chat",
        "bot"
      );
      this.currentOptions = conversationTree.nodes.QuestionResponseOptionsNode.options;
      this.recommendedQuestions = [];
      this.conversationOptions = this.currentOptions;
      this.requestUpdate();

    } catch (error) {
      console.error("Error processing location-specific query:", error);
      this.addMessage("Sorry, I couldn't process your location-specific query. Please try again.", "bot");
      this.addMessage(conversationTree.nodes.MainMenu.message, "bot");
      this.currentOptions = conversationTree.nodes.MainMenu.options;
      this.recommendedQuestions = [];
      this.conversationOptions = [];
      this.requestUpdate();
    }
  }



  async openVisualizationModal(query) {
    // Remove any existing modal and chart
    const existingModal = this.shadowRoot.getElementById('visualization-modal');
    if (existingModal) {
      if (this.currentChart) {
        this.currentChart.destroy();
        this.currentChart = null;
      }
      this.shadowRoot.removeChild(existingModal);
    }

    // Helper: extract parameter from query
    const extractParameterFromQuery = (query, parameterKeywords) => {
      query = query.toLowerCase();
      for (const paramType in parameterKeywords) {
        for (const keyword of parameterKeywords[paramType]) {
          if (query.includes(keyword)) {
            return paramType;
          }
        }
      }
      return null;
    };

    // Helper: find matching parameter in data
    const findMatchingParameter = (paramType, availableParams, parameterKeywords) => {
      paramType = paramType.toLowerCase();
      for (const param of availableParams) {
        if (param.toLowerCase() === paramType) return param;
      }
      if (parameterKeywords[paramType]) {
        for (const keyword of parameterKeywords[paramType]) {
          for (const param of availableParams) {
            if (param.toLowerCase().includes(keyword)) return param;
          }
        }
      }
      for (const param of availableParams) {
        if (param.toLowerCase().includes(paramType)) return param;
      }
      return null;
    };

    // Parameter keywords for identifying different types of parameters
    const parameterKeywords = {
      'temperature': ['temperature', 'temp', 'ambient temperature', 'celsius', 'fahrenheit'],
      'humidity': ['humidity', 'relative humidity', 'moisture'],
      'co2': ['co2', 'carbon dioxide'],
      'co': ['co', 'carbon monoxide'],
      'pm2.5': ['pm2.5', 'particulate matter', 'fine particles'],
      'pm10': ['pm10', 'coarse particles'],
      'gas': ['gas', 'tvoc', 'voc'],
      'air quality': ['aqi', 'air quality', 'air quality index'],
      'ph': ['ph', 'acidity'],
      'turbidity': ['turbidity', 'clarity', 'water clarity'],
      'tds': ['tds', 'total dissolved solids'],
      'conductivity': ['conductivity', 'water conductivity'],
      'water flow': ['flow', 'water flow', 'flow rate'],
      'water level': ['water level', 'level'],
      'voltage': ['voltage', 'volts'],
      'current': ['current', 'ampere', 'amp'],
      'power': ['power', 'watt', 'kw', 'kilowatt'],
      'energy': ['energy', 'kwh', 'kilowatt hour'],
      'pressure': ['pressure', 'barometric pressure', 'atmospheric pressure'],
      'noise': ['noise', 'sound', 'decibel', 'db']
    };

    // Create modal container
    const modal = document.createElement('div');
    modal.id = 'visualization-modal';
    modal.innerHTML = `
    <style>
      #visualization-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.4);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.3s ease-in-out;
    }
    #visualization-modal.show {
      opacity: 1;
    }
    #visualization-content {
      background-color: white;
      width: 70%;
      max-width: 800px;
      max-height: 70vh;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
      transform: scale(0.9);
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    #visualization-modal.show #visualization-content {
      transform: scale(1);
    }
    #visualization-close {
      position: absolute;
      top: 15px;
      right: 15px;
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #6b7280;
      transition: color 0.2s ease;
    }
    #visualization-close:hover {
      color: #3b82f6;
    }
    #visualization-header {
      padding: 15px 20px;
      background-color: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    #visualization-header h3 {
      margin: 0;
      font-size: 1.1rem;
      color: #374151;
      font-weight: 600;
    }
    #visualization-chart-container {
      padding: 15px;
      flex-grow: 1;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    #visualization-chart {
      width: 100%;
      max-height: 400px;
    }
    #loading-spinner {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100%;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #e5e7eb;
      border-top: 4px solid #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    #error-message {
      color: #ef4444;
      text-align: center;
      padding: 20px;
      background-color: #fef2f2;
    }
    </style>
    <div id="visualization-content">
      <div id="visualization-header">
        <h3>Data Visualization</h3>
        <button id="visualization-close">&times;</button>
      </div>
      <div id="loading-spinner" style="display: flex;">
        <div class="spinner"></div>
      </div>
      <canvas id="visualization-chart" style="display: none;"></canvas>
      <div id="error-message" style="display: none; color: red; text-align: center;"></div>
    </div>
  `;

    // Append to shadow root
    this.shadowRoot.appendChild(modal);
    requestAnimationFrame(() => {
      modal.classList.add('show');
    });

    // Modal event listeners
    const closeModal = () => {
      if (this.currentChart) {
        this.currentChart.destroy();
        this.currentChart = null;
      }
      this.shadowRoot.removeChild(modal);
    };
    const closeButton = this.shadowRoot.getElementById('visualization-close');
    const modalContainer = this.shadowRoot.getElementById('visualization-modal');
    closeButton.addEventListener('click', closeModal);
    modalContainer.addEventListener('click', (event) => {
      if (event.target === modalContainer) closeModal();
    });

    // Chart rendering logic
    const loadingSpinner = this.shadowRoot.getElementById('loading-spinner');
    const chartCanvas = this.shadowRoot.getElementById('visualization-chart');
    const errorMessage = this.shadowRoot.getElementById('error-message');

    try {
      const decodedQuery = decodeURIComponent(query);
      const response = await fetch("https://smartcitylivinglab.iiit.ac.in/chatbot-api/debug", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ query: decodedQuery })
      });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      const isTemporal = data.is_temporal || false;
      const parameterType = extractParameterFromQuery(decodedQuery, parameterKeywords);

      loadingSpinner.style.display = 'none';
      chartCanvas.style.display = 'block';
      const ctx = chartCanvas.getContext('2d');

      let chartData, chartOptions, matchedParam;
      if (isTemporal) {
        const temporalData = this.extractTemporalData(data);
        const availableParams = Object.keys(temporalData);
        matchedParam = parameterType ? findMatchingParameter(parameterType, availableParams, parameterKeywords) : availableParams[0];
        if (!matchedParam) throw new Error('No suitable parameter found for visualization');
        const paramData = temporalData[matchedParam];
        const nodeDatasets = {};
        paramData.labels.forEach((label, index) => {
          const nodeId = paramData.nodeIds[index];
          if (!nodeDatasets[nodeId]) {
            nodeDatasets[nodeId] = {
              label: `Node ${nodeId}`,
              data: [],
              labels: [],
              borderColor: this.getNodeColor(nodeId),
              backgroundColor: this.getNodeColor(nodeId, 0.1),
              borderWidth: 2,
              fill: true,
              tension: 0.2
            };
          }
          nodeDatasets[nodeId].data.push(paramData.values[index]);
          nodeDatasets[nodeId].labels.push(label);
        });
        chartData = {
          labels: [...new Set(paramData.labels)],
          datasets: Object.values(nodeDatasets)
        };
        chartOptions = {
          responsive: true,
          scales: {
            x: { title: { display: true, text: 'Time' } },
            y: { title: { display: true, text: matchedParam } }
          }
        };
      } else {
        const currentData = this.extractCurrentData(data);
        const availableParams = Object.keys(currentData);
        matchedParam = parameterType ? findMatchingParameter(parameterType, availableParams, parameterKeywords) : availableParams[0];
        if (!matchedParam) throw new Error(`No matching parameter found for "${decodedQuery}"`);
        const paramData = currentData[matchedParam];
        chartData = {
          labels: paramData.labels,
          datasets: [{
            label: matchedParam,
            data: paramData.values,
            backgroundColor: 'rgba(74, 123, 250, 0.7)'
          }]
        };
        chartOptions = {
          responsive: true,
          scales: {
            x: { title: { display: true, text: 'Nodes' } },
            y: { title: { display: true, text: matchedParam } }
          }
        };
      }

      if (this.currentChart) {
        this.currentChart.destroy();
        this.currentChart = null;
      }
      this.currentChart = new Chart(ctx, {
        type: isTemporal ? 'line' : 'bar',
        data: chartData,
        options: chartOptions
      });
    } catch (error) {
      loadingSpinner.style.display = 'none';
      errorMessage.textContent = `Error: ${error.message}`;
      errorMessage.style.display = 'block';
      console.error('Visualization error:', error);
    }
  }

  // Helper method to generate consistent colors for nodes
  getNodeColor(nodeId, alpha = 1) {
    // Simple color generation based on nodeId
    const colors = [
      `rgba(74, 123, 250, ${alpha})`,
      `rgba(255, 99, 132, ${alpha})`,
      `rgba(54, 162, 235, ${alpha})`,
      `rgba(255, 206, 86, ${alpha})`,
      `rgba(75, 192, 192, ${alpha})`,
      `rgba(153, 102, 255, ${alpha})`,
      `rgba(255, 159, 64, ${alpha})`
    ];

    // Use a simple hash to consistently map nodeId to a color
    let colorIndex = parseInt(nodeId.replace(/\D/g, ''));
    if (isNaN(colorIndex)) colorIndex = 0;
    colorIndex = colorIndex % colors.length;
    return colors[colorIndex];
  }

  // Modified helper method to extract temporal data
  extractTemporalData(data) {
    const temporalData = {};
    const nodeData = data.node_data;

    // Helper to process a single parameter
    const processParam = (param, categoryData, nodeId) => {
      if (!temporalData[param]) {
        temporalData[param] = {
          labels: [],
          values: [],
          nodeIds: []
        };
      }
      categoryData.data.forEach(point => {
        temporalData[param].labels.push(
          new Date(point.timestamp || point.created_at).toLocaleString()
        );
        temporalData[param].values.push(parseFloat(point[param]));
        temporalData[param].nodeIds.push(nodeId);
      });
    };

    // Helper to process a single category
    const processCategory = (categoryData, nodeId) => {
      if (categoryData.data && categoryData.data.length > 0) {
        const firstDataPoint = categoryData.data[0];
        Object.keys(firstDataPoint).forEach(param => {
          if (!['node_id', 'timestamp', 'id', 'name', 'created_at'].includes(param)) {
            processParam(param, categoryData, nodeId);
          }
        });
      }
    };

    // Main loop
    Object.entries(nodeData).forEach(([nodeId, nodeInfo]) => {
      if (nodeInfo.filtered_data) {
        Object.values(nodeInfo.filtered_data).forEach(categoryData => {
          processCategory(categoryData, nodeId);
        });
      }
    });

    return temporalData;
  }

  // Helper method to extract current data
  extractCurrentData(data) {
    const currentData = {};
    const nodeData = data.node_data;

    for (const nodeId in nodeData) {
      for (const category in nodeData[nodeId]) {
        const categoryData = nodeData[nodeId][category];
        if (Array.isArray(categoryData) && categoryData.length > 0) {
          const firstDataPoint = categoryData[0];

          for (const param in firstDataPoint) {
            if (!['node_id', 'timestamp', 'id', 'name', 'created_at'].includes(param)) {
              if (!currentData[param]) {
                currentData[param] = {
                  labels: [],
                  values: []
                };
              }

              categoryData.forEach(point => {
                currentData[param].labels.push(point.name || nodeId);
                currentData[param].values.push(parseFloat(point[param]));
              });
            }
          }
        }
      }
    }

    return currentData;
  }


  // Modified handleRecommendedQuestion method
  handleRecommendedQuestion(question) {
    this.userInput = question;
    this.recommendedQuestions = []; // Clear recommended questions
    this.conversationOptions = []; // Clear conversation options
    this.sendMessage();
  }

  handleConversationOption(option) {
    this.userInput = option;
    this.conversationOptions = []; // Clear conversation options
    this.sendMessage();
  }
  async sendMessageToBackend(message) {
    try {
      const response = await fetch("https://smartcitylivinglab.iiit.ac.in/chatbot-api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ query: message })
      });
      if (response.headers.get("content-type")?.includes("application/json")) {
        if (response.headers.get("content-type")?.includes("application/json")) {
          const data = await response.json();
          return data.response || "Sorry, I couldn't process your question.";
        } else {
          console.error("Server returned non-JSON response");
          return "Server returned an unexpected response format. Please try again later.";
        }
      } else {
        console.error("Server returned non-JSON response");
        return "Server returned an unexpected response format. Please try again later.";
      }

    } catch (error) {
      console.error("Error communicating with backend:", error);
      return "Sorry, I couldn't connect to the backend service. Please try again later.";
    }
  }

  addMessage(text, sender) {


    this.messages.push({ text, sender });
    this.populateMessages(); // Update the UI immediately
  }

  resetInputAndPopulateMessages() {
    this.userInput = ""; // Clear userInput for the next input
    const inputField = this.shadowRoot.querySelector("input");
    if (inputField) inputField.value = ""; // Clear input field in the DOM
    this.populateMessages(); // Update displayed messages
  }




  populateMessages() {
    const messageContainer = this.shadowRoot.getElementById("message-container");
    messageContainer.innerHTML = "";

    this.messages.forEach((msg, index) => {
      const messageWrapper = document.createElement("div");
      messageWrapper.className = `chat_message_wrapper ${msg.sender === "bot" ? "" : "chat_message_right"}`;

      // Only add avatar for bot messages
      if (msg.sender === "bot") {
        const avatarContainer = document.createElement("div");
        avatarContainer.className = "chat_user_avatar";
        avatarContainer.innerHTML = '<img src="https://smartcityresearch.github.io/ChatBot/static/images/pre1.png" alt="Bot" class="md-user-image">';
        messageWrapper.appendChild(avatarContainer);
      }

      const messageBubble = document.createElement("div");
      messageBubble.className = "chat_message";

      // Check if this message is currently being edited
      if (this.editingMessageIndex === index && msg.sender === 'user') {
        const editInput = document.createElement("div");
        editInput.className = "edit-message-input";

        const input = document.createElement("input");
        input.type = "text";
        input.value = this.editedMessage;
        input.addEventListener('input', (e) => {
          this.editedMessage = e.target.value;
        });

        const saveButton = document.createElement("button");
        saveButton.innerHTML = "✓";
        saveButton.className = "edit-save-btn";
        saveButton.addEventListener('click', () => this.saveEditedMessage());

        const cancelButton = document.createElement("button");
        cancelButton.innerHTML = "✗";
        cancelButton.className = "edit-cancel-btn";
        cancelButton.addEventListener('click', () => this.cancelEditMessage());

        editInput.appendChild(input);
        // Add save button inside the input
        editInput.appendChild(saveButton);
        // Add cancel button outside the input
        editInput.appendChild(cancelButton);

        messageBubble.appendChild(editInput);
      } else {
        // Check if the message contains visualization icon
        const hasVisualizationIcon = msg.text.includes('visualization-icon');

        // Create content container
        const messageContent = document.createElement("div");

        if (hasVisualizationIcon) {
          // For messages with visualization icons, we need to handle them specially
          // Split the message into text part and icon part
          const textAndIcon = msg.text.split('<div id="');

          // Add the text part
          if (textAndIcon[0]) {
            const textPart = document.createElement("div");
            textPart.innerHTML = textAndIcon[0].replace(/\n/g, "<br>");
            messageContent.appendChild(textPart);
          }

          // Add the icon part
          if (textAndIcon.length > 1) {
            const iconPart = document.createElement("div");
            iconPart.id = textAndIcon[1].split('"')[0];
            iconPart.className = "visualization-icon";
            iconPart.innerHTML = '<img src="https://smartcityresearch.github.io/ChatBot/static/images/bar1.png" alt="Visualize" />';

            // Add event listener to the icon
            setTimeout(() => {
              iconPart.addEventListener("click", () => {
                console.log("Visualization icon clicked!");
                const encodedQuery = encodeURIComponent(
                  this.messages[index - 1]?.text || ""
                );
                this.openVisualizationModal(encodedQuery);
              });
            }, 50);

            messageContent.appendChild(iconPart);
          }
        } else {
          // For regular messages
          messageContent.innerHTML = msg.text.replace(/\n/g, "<br>");
        }

        // Add edit icon for user messages
        if (msg.sender === 'user') {
          const editIcon = document.createElement("span");
          editIcon.className = "edit-message-icon";
          editIcon.innerHTML = "✎";
          editIcon.addEventListener('click', () => this.startEditMessage(index));

          messageBubble.appendChild(editIcon);
        }

        messageBubble.appendChild(messageContent);
      }

      messageWrapper.appendChild(messageBubble);
      messageContainer.appendChild(messageWrapper);
    });

    // Auto-scroll to the bottom after populating messages
    this.scrollToBottom();
  }

  handleOptionSelection(optionText) {
    this.userInput = optionText;
    this.sendMessage();
  }



  // Modify the render method to implement the toggle button and conditional display
  // Modify the render method to implement the requested changes
  render() {
    return html`
      <div class="chat-option" @click="${this.togglePopup}">
        <img
          // src="https://static-00.iconduck.com/assets.00/bot-icon-1024x806-28qq4icl.png"
          alt="Chat Icon"
          width="40"
          height="40"
               />
      </div>
      <div id="chat-pop" class="chatbot-popup">
        <div class="chat-header">
          <img
            src="https://avatars.tidiochat.com/pfa3b5japlafq34amyqd5ls29r88nt8n/avatars/f9b8d61a-7737-4119-8e1d-8b24116aac5e.png"
            class="chat-logo"
            alt="Chat Logo"
          />
          <div class="chat-title-container">
    <div class="chat-title">SASI </div>
    <div class="chat-subtitle">   Scalable Analytical Smart-city Interface
    
    </div>
    
  </div>
  <div class="chat-minimize" @click="${this.togglePopup}">▼</div>
  
          
        </div>
        <div id="message-container" class="messages"></div>
  
  
        ${this.conversationOptions && this.conversationOptions.length > 0 ? html`
          <div class="conversation-options">
            ${this.conversationOptions.map(option => html`
              <button 
                class="option-button"
                @click="${() => this.handleOptionSelection(option.text)}"
              >
                ${option.text}
              </button>
            `)}
          </div>
        ` : ''}
        
        ${this.recommendedQuestions && this.recommendedQuestions.length > 0 ? html`
          <div class="question-toggle">
            <button 
              class="toggle-questions-btn" 
              @click="${this.toggleRecommendedQuestions}"
            >
              ${this.showRecommendedQuestions ? 'Hide Questions ' : 'Show Suggested Questions '}
              <span class="arrow-icon ${this.showRecommendedQuestions ? 'rotate' : ''}">▼</span>
            </button>
          </div>
          
          ${this.showRecommendedQuestions ? html`
            <div class="recommended-questions">
              ${this.recommendedQuestions.map(question => html`
                <button 
                  class="recommended-question"
                  @click="${() => this.handleRecommendedQuestion(question)}"
                >
                  ${question}
                </button>
              `)}
            </div>
          ` : ''}
          
          <!-- Add "or" text here -->
          <div class="question-divider">or</div>
        ` : ''}
        
        <div class="input-area">
          <input
            @keydown="${this.handleKeyDown}"
            type="text"
            @input="${this.handleUserInput}"
            .value="${this.userInput}"
            placeholder="Enter any question..."
          />
          <button id="send-button" @click="${this.sendMessage}">
            <img src="https://cdn-icons-png.flaticon.com/512/3682/3682321.png" alt="Send" class="send-icon">
          </button>
        </div>
      </div>
    `;
  }
}

customElements.define("chat-bot-component", ChatBotComponent);
