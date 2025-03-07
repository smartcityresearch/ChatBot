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
        if (rawValues[0] !== values[0]) {
          results[key] = results[key] + " " + rawValues[0].split(" ")[1];
        }

      });

    return results;
  }
}

class ChatBotComponent extends LitElement {
  static styles = css`
  /* Existing styles remain the same */
  
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
  }

  .chatbot-popup.active {
    display: block;
  }
  
/* Hide scrollbar but keep functionality */
.messages {
  height: 400px; /* Increased height */
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

  .message a {
    color: #ff8400; /* White color for links */
    text-decoration: none; /* Remove underline from links */
  }

  .input-area {
    border-top: none;

  /* Option 2: Make the border transparent */
  border-top: 1px solid transparent;

  /* Option 3: Set border color to match the background */
  border-top: 1px solid #fff; /* Assuming white background */

  /* Existing styles remain the same */
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
    transition: all 0.3s ease-in-out; /* Smooth transition */
  }

  .input-area input:hover {
    border-color: #007bff; /* Changes border color on hover */
    background-color: #f5f5f5; /* Slightly changes background */
    box-shadow: 0px 0px 5px rgba(0, 123, 255, 0.5); /* Adds subtle glow */
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
    width: 40px; /* Makes button circular */
    height: 40px;
  }

  .input-area button img {
    width: 20px; /* Adjust icon size */
    height: 20px;
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
  text-align: center;
  // /* Wave shape effect */
  // &::after {
  //   content: "";
  //   position: absolute;
  //   bottom: -10px;
  //   left: 0;
  //   right: 0;
  //   height: 10px;
  //   background: url('data:image/svg+xml;utf8,<svg viewBox="0 0 1200 120" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"><path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" opacity=".25" fill="%230056b3"/><path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" opacity=".5" fill="%230056b3"/><path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" fill="%230056b3"/></svg>');
  //   background-size: cover;

  // position: sticky;
  // top: 0;
  // z-index: 10;
  // display: flex;
  // align-items: center;
  // background: linear-gradient(135deg, #2a27da 0%, #00ccff 100%);
  // padding: 10px;
  // color: white;
  // border-top-left-radius: 10px;
  // border-top-right-radius: 10px;


  
  }

  .chat-header::after {
  content: "";
  position: absolute;
  bottom: -5px; /* Moves wave to bottom */
  left: 0;
  width: 100%;
  height: 20px; /* Adjust wave height */
  background-image: url('data:image/svg+xml;utf8,<svg width="100%" height="100%" viewBox="0 0 1440 590" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="gradient" x1="0%" y1="50%" x2="100%" y2="50%"><stop offset="5%" stop-color="%230693e3"></stop><stop offset="95%" stop-color="%238ed1fc"></stop></linearGradient></defs><path d="M 0,600 L 0,150 C 114.9282296650718,158.77511961722487 229.8564593301436,167.55023923444975 326,151 C 422.1435406698564,134.44976076555025 499.5023923444975,92.57416267942584 591,85 C 682.4976076555025,77.42583732057416 788.1339712918661,104.15311004784687 895,117 C 1001.8660287081339,129.84688995215313 1109.961722488038,128.81339712918663 1201,132 C 1292.038277511962,135.18660287081337 1366.019138755981,142.5933014354067 1440,150 L 1440,600 L 0,600 Z" fill="url(%23gradient)" fill-opacity="0.53"></path></svg>');
  background-size: cover;
  background-repeat: no-repeat;
  z-index: 5;
}
  
}

  .chat-logo {
    width: 30px;  /* Adjust the size as needed */
    height: 30px;
    border-radius: 50%;  /* Makes it a perfect circle */
    background-color: white;  /* White background */
    padding: 2px;  /* Space between image and border */
    border: 1px solid #ddd;  /* Optional: Light border for better visibility */
    object-fit: cover;  /* Ensures the image fits inside the circle */
  }

  .chat-title {
    margin-left: 10px;  /* Space between logo and title */
    font-weight: bold;
    font-size: 18px;
  }

  .chat-close {
    font-size: 25px;
    font-weight: bold;
    color: white; /* Text color */
    background: #00000000; /* Transparent background */
    border-radius: 50%; /* Keeps the circular shape */
    border: 2px solid white; /* Adds a white border */
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    margin-left: auto; /* Moves close button to the right */
    transition: background 0.3s ease-in-out;
  }

  .icon-image {
    width: 30px;  /* Adjust size */
    height: 30px;
    border-radius: 50%; /* Makes it circular */
    object-fit: cover;
  }

  img.icon-image{
    background-color: white;
  }

  .chat-box {
    padding: 16px;
    background: #e1e3e5;
    height: 600px;
    overflow-y: auto;
    width: 450px;
    border-radius: 8px;
  }

  /* General message container */
    /* Remove user avatar and make message boxes arrow-shaped */
  .chat_message_wrapper {
    display: flex;
    align-items: flex-end;
    margin-bottom: 15px;
    position: relative;
  }

  /* Avatar styling */
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
  }

  /* User (Right side) chat message */
  .chat_message_wrapper.chat_message_right {
    justify-content: flex-end;
    text-align: right
  }

  
  .chat_message_wrapper.chat_message_right .chat_message {
    background: linear-gradient(135deg, #2a27da 0%, #00ccff 100%);
  color: white;
  float: right;
  max-width: 70%; /* Prevents stretching */
  margin-left: auto; /* Aligns to the right */
  text-align: left; /* Keeps text readable */
  word-break: break-word; /* Ensures long words break */
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

  /* Bot (Left side) chat message with arrow */
  .chat_message_wrapper .chat_message {
    background: #F0F2F7;
    color: black;
    float: left;
    border-radius: 12px;
    position: relative;
    padding: 8px 14px;
    margin-left: 12px; /* Space for arrow */
  }
/* For older browsers that don't support the &::-webkit-scrollbar syntax */
.messages::-webkit-scrollbar {
  display: none;
}
  /* Message bubbles */
  .chat_message {
    max-width: 60%;
    padding: 8px 14px;  /* Proper spacing inside the bubble */
    border-radius: 12px;
    position: relative;
    margin: 4px 0;  /* Reduce margin for better spacing */
    font-size: 14px;
    display: inline-block; /* Makes sure the bubble wraps content */
    text-align: left; /* Ensure left alignment of text */
    line-height: 1.4; /* Improve readability */
    word-wrap: break-word; /* Ensure long words don't overflow */
  }
    
  /* Hide user avatar */
  .chat_message_wrapper.chat_message_right .chat_user_avatar {
    display: none;
  }
  
  .chat_message p {
    margin: 0;  /* Remove unnecessary margins */
    padding: 0;
    
  }

  #send-button {
    background: none; /* Remove default button background */
    border: none;
    padding: 5px;
    cursor: pointer;
    transition: transform 0.2s ease-in-out;
  }

  #send-button:hover {
    transform: scale(1.1); /* Slight zoom effect on hover */
  }

  .send-icon {
    width: 30px;  /* Adjust icon size */
    height: 30px;
  }

  .question-toggle {
     display: flex;
  justify-content: center; /* Center the button horizontally */
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

  /* Optional: adjust the toggle-questions-btn to better accommodate the arrow */
  .toggle-questions-btn {
   display: flex;
  align-items: center;
  justify-content: center;
  background-color: white; /* Always white */
  color:rgb(44, 47, 49); /* Blue text color */
  border: 2px solid white; /* Blue border */
  border-radius: 5px; /* Square shape */
  padding: 10px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: box-shadow 0.3s ease;
  width: fit-content; /* Adjust width based on text */
  box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.2); /* Shadow effect */
  margin: 0 auto; /* Center the button horizontally */
  }
  
  .toggle-questions-btn:hover {
    background-color: white; /* Keep white on hover */
  box-shadow: 4px 4px 8px rgba(0, 0, 0, 0.3); /* Increase shadow effect */
  }
  
/* Hidden scrolling for recommended questions */
.recommended-questions {
 display: flex;
  flex-direction: column; /* Stack items vertically */
  gap: 10px;
  margin: 10px;
  max-height: 200px; /* Set a maximum height to enable vertical scrolling */
  overflow-y: auto; /* Enable vertical scrolling */
  padding: 10px;
  background-color: #f1f2f3;
  border-radius: 12px;
  border: 2px solid #007bff;
  scrollbar-width: thin; 
  
  }
  .recommended-questions::-webkit-scrollbar {
  width: 8px; /* Width of the scrollbar (instead of height for vertical) */
  display: block
  
  
}
  .recommended-question {
  flex-shrink: 0; /* Prevent buttons from shrinking */
}

.recommended-questions::-webkit-scrollbar-thumb {
  background: #007bff; /* Blue scrollbar */
  border-radius: 10px;
}

.recommended-questions::-webkit-scrollbar-track {
  background: #ddd; /* Light grey background */
   border-radius: 10px;
}
}


/* For older browsers that might not support the & selector syntax */
.recommended-questions::-webkit-scrollbar {
  display: none;
}
  
  /* Updated: Added blue border to recommended question buttons */
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

  .recommended-question:hover {
    background-color: #0056b3;
    color: white;
  }

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

  .welcome-subtitle {
    font-size: 1em;
    opacity: 0.9;
  }
  
  /* New: Added divider style for the "or" text */
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
  
  .option-button:hover {
    background-color: #0056b3;
    color: white;
  }


  .chat-title-container {
  display: flex;
  flex-direction: column;
  align-items: center; /* Centers child elements horizontally */
  text-align: center; /* Ensures text alignment */
  width: 100%; /* Prevents shifting */
}



.chat-subtitle {
  font-size: 12px; /* Smaller font for subtitle */
  color: #ddd; /* Light gray text */
  margin-top: 2px; /* Space below title */
  font-weight: bold;
  text-align: center; /* Center text */
  width: 100%; /* Ensure it takes full width */
}



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
      this.addMessage(userInputTrimmed, "user");

      const lastBotMessage = this.messages.length >= 2 ? this.messages[this.messages.length - 2].text : "";
      if (lastBotMessage.includes("Please enter your question:")) {
        try {
          this.addMessage("Processing your question...", "bot");

          const response = await this.sendMessageToBackend(userInputTrimmed);

          this.messages.pop(); // Remove processing message
          this.addMessage(response, "bot");

          // Add continue/exit options after response
          this.addMessage(
            "Would you like to:\n1. Ask Another Question\n2. Back to the menu\n3. Exit Chat",
            "bot"
          );

          this.currentOptions = [
            { text: "1", next: "AskQuestionNode" },
            { text: "2", next: "MainMenu" },
            { text: "3", next: "ExitChatNode" }

          ];

          this.currentOptions = conversationTree.nodes.QuestionResponseOptionsNode.options;
          this.recommendedQuestions = [];
          this.conversationOptions = this.currentOptions;
          this.requestUpdate();
        } catch (error) {
          console.error("Error processing question:", error);
          this.messages.pop();
          this.addMessage("Sorry, I couldn't process your question. Please try again.", "bot");
          this.addMessage(conversationTree.nodes.MainMenu.message, "bot");
          this.currentOptions = conversationTree.nodes.MainMenu.options;
          this.recommendedQuestions = [];
          this.conversationOptions = [];
          this.requestUpdate();
        }
      } else if (lastBotMessage.includes("Would you like to:")) {
        // Handle continue/exit selection
        if (userInputTrimmed === "1") {
          this.addMessage(conversationTree.nodes.AskQuestionNode.message, "bot");
          this.currentOptions = [];
          this.stringInput = true;
          this.recommendedQuestions = conversationTree.nodes.AskQuestionNode.recommendedQuestions;
          // this.conversationOptions = [];
          this.requestUpdate();
        } else if (userInputTrimmed === "3") {
          this.addMessage(conversationTree.nodes.ExitChatNode.message, "bot");
          // Reset to main menu after exit
          setTimeout(() => {
            this.addMessage(conversationTree.nodes.MainMenu.message, "bot");
            this.currentOptions = conversationTree.nodes.MainMenu.options;
            this.recommendedQuestions = [];
            this.conversationOptions = [];
            this.requestUpdate();
          }, 1000);
        }
      } else {
        // Other existing logic remains the same
        let continueConversation = await this.fetchDataAndAskContinue(
          false,
          false,
          false,
          false,
          userInputTrimmed
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

    this.addMessage(userInputTrimmed, "user");

    if (selectedOption) {
      nextNodeKey = selectedOption.next;

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

        // New logic for handling recommended questions
        if (nextNodeKey === "AskQuestionNode") {
          this.stringInput = true;
          this.recommendedQuestions = nextNode.recommendedQuestions || [];
          this.conversationOptions = this.currentOptions; // Preserve conversation options
          this.requestUpdate();
        } else {
          this.recommendedQuestions = [];
          this.conversationOptions = this.currentOptions; // Preserve conversation options
        }

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

    this.addMessage(responseMessage, "bot");

    if (error) {
      const lastCorrectMessage = this.messages[this.lastCorrectMessageIndex];
      this.addMessage(lastCorrectMessage.text, "bot");
      error = false;
    }

    this.resetInputAndPopulateMessages();
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
      const response = await fetch("http://10.2.16.188:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      return data.response || "Sorry, I couldn't process your question.";
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

// Updated populateMessages method to implement the new styling
populateMessages() {
  const messageContainer = this.shadowRoot.getElementById("message-container");
  messageContainer.innerHTML = "";

  this.messages.forEach((msg) => {
    const messageWrapper = document.createElement("div");
    messageWrapper.className = `chat_message_wrapper ${msg.sender === "bot" ? "" : "chat_message_right"}`;

    // Only add avatar for bot messages
    if (msg.sender === "bot") {
      const avatarContainer = document.createElement("div");
      avatarContainer.className = "chat_user_avatar";
      avatarContainer.innerHTML = '<img src="/assets/images/pre1.png" alt="Bot" class="md-user-image">';
      messageWrapper.appendChild(avatarContainer);
    }

    const messageBubble = document.createElement("div");
    messageBubble.className = "chat_message";

    const messageContent = document.createElement("p");
    messageContent.innerHTML = msg.text.replace(/\n/g, "<br>");

    messageBubble.appendChild(messageContent);
    messageWrapper.appendChild(messageBubble);

    messageContainer.appendChild(messageWrapper);
  });

  // Add option buttons after the last bot message if there are current options
  if (this.currentOptions && this.currentOptions.length > 0 && this.messages.length > 0 && 
      this.messages[this.messages.length - 1].sender === "bot" && !this.stringInput) {
    const optionsContainer = document.createElement("div");
    optionsContainer.className = "option-buttons";
    
    this.currentOptions.forEach(option => {
      const button = document.createElement("button");
      button.className = "option-button";
      button.textContent = option.text;
      button.addEventListener("click", () => {
        this.userInput = option.text;
        this.sendMessage();
      });
      optionsContainer.appendChild(button);
    });
    
    messageContainer.appendChild(optionsContainer);
  }

  // Auto-scroll to the bottom after populating messages
  this.scrollToBottom();
}

// Modify the render method to implement the toggle button and conditional display
// Modify the render method to implement the requested changes
render() {
  return html`
    <div class="chat-option" @click="${this.togglePopup}">
      <img
        src="https://static-00.iconduck.com/assets.00/bot-icon-1024x806-28qq4icl.png"
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