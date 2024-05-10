# SASI - Smart City Assistant for IIIT Hyderabad

[![GitHub license](https://img.shields.io/github/license/smartcityresearch/ChatBot)](https://github.com/smartcityresearch/ChatBot/blob/main/LICENSE)
[![GitHub issues](https://img.shields.io/github/issues/smartcityresearch/ChatBot)](https://github.com/smartcityresearch/ChatBot/issues)
[![GitHub stars](https://img.shields.io/github/stars/smartcityresearch/ChatBot)](https://github.com/smartcityresearch/ChatBot/stargazers)

SASI is an intelligent chatbot designed to provide real-time access to smart city data for IIIT Hyderabad. With its intuitive chat interface, users can easily retrieve information about buildings, verticals, and nodes within the campus.

## Table of Contents
- [Features](#features)
- [Demo](#demo)
- [Installation](#installation)
- [Usage](#usage)
- [Technologies Used](#technologies-used)
- [Configuration](#configuration)
- [API Integration](#api-integration)
- [Contributing](#contributing)
- [License](#license)

## Features
- Real-time access to smart city data of IIIT Hyderabad
- Interactive chat interface for easy navigation and data retrieval
- Retrieval of building-specific, vertical-specific, and node-specific data
- Aggregation of data based on average, maximum, and minimum values
- Web component-based architecture for seamless integration
- Hosted online for easy inclusion in web projects


## Tech Stack
- **LIT Element**: Utilizes Google's LIT Element for creating the web component, ensuring a lightweight and efficient user interface.
- **JavaScript**: Core functionality is implemented in JavaScript, handling UI interactions, data fetching, and processing.
- **HTML/CSS**: For structuring and styling the chatbot interface.

## Demo
Check out the live demo of SASI: [Live Demo](https://smartcitylivinglab.iiit.ac.in/home/)

## Installation
To use SASI in your web project, simply include the following script tag in your HTML file:

```html
<script type="module" src="https://smartcityresearch.github.io/ChatBot/chat-bot-component.js"></script>
```

Then, add the `<chat-bot-component>` element wherever you want the chatbot to appear:
```html
<head>
</head>
<body>
  ...
  ...
  <chat-bot-component></chat-bot-component>
  ...
  ...
</body>
```

## Usage
- Open your web application where you have included the SASI chatbot.
- Click on the chatbot icon to start a conversation.
- Follow the prompts and select the desired options to retrieve specific data.
- Enter the required identifiers when prompted (e.g., building name, floor, node ID).
- SASI will fetch the requested data from the Smart City Living Lab API and display it in the chat interface.

## Configuration
SASI can be configured by modifying the `conversationTree` object in the `conversation.js` file. This object defines the flow and structure of the conversation, including the messages, options, and corresponding actions.  
To customize the chatbot's appearance and styles, you can modify the CSS styles in the `chat-bot-component.js` file.

## Known Bugs and Future Updates

### Bugs
- **Reversion to Previous Input**: The chatbot reverts to the previous input when users provide invalid inputs.
- **Invalid Option Message**: Special characters trigger the invalid option message twice.
- **Missing Menu Option**: The menu list is missing the "Water" option.
- **Combination Nodes**: Some combination nodes, such as "Smart Room - Kohli Block," are not functioning properly.
- **Logo Update**: The chatbot's logo needs an update to a more graceful image.

### Future Updates
- **Chat Interface Name**: After displaying "chatM2M," the chatbot should be named "SASI".
- **Welcome Message**: The welcome message should be updated to prompt users to select a number more clearly.
- **Back to Menu Button**: A "Back to Menu" button needs to be included for better navigation.
- **Auto-Scroll**: Implementing auto-scroll functionality for the chat interface.
- **Color Differentiation**: The color for the "average" option needs to be differentiated to avoid confusion.
- **Enhanced User Interaction**: Improvements in the chatbot's user interaction to handle more dynamic conversations and inputs effectively.
- **Integration with Additional Data Points**: Expanding the chatbot's capabilities to include more verticals and data points, enhancing the depth and utility of the data provided.

