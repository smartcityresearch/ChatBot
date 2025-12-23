# ChatBot for Smart City Living Lab 
<a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">
  <img src="https://licensebuttons.net/l/by-nc-sa/4.0/88x31.png" alt="License: CC BY-NC-SA 4.0" width="66" height="23"/>
  <img src="https://img.shields.io/badge/Maintained%3F-yes-green.svg" alt="Maintained? Yes" >
</a> 

This repository contains a simple yet powerful chatbot for answering smart city-related queries using a backend powered by Python and a frontend built with HTML and Javascript.

## 🌐 Project Structure

- `chatbot.py` - Backend chatbot logic (Python)
- `templates/index.html` - Frontend interface to interact with the chatbot
- `requirements.txt` - List of Python dependencies

---

## 🚀 Features

- Natural language interaction with a smart city-focused chatbot
- Easy-to-use web interface
- Lightweight and customizable

---

## 🛠️ Installation & Setup

Follow the steps below to clone and run the project locally.

### 1. Clone the Repository

```bash
git clone https://github.com/smartcityresearch/ChatBot.git
cd ChatBot
```

### 2. Create Virtual Environment (Optional but Recommended)

```bash
python -m venv venv
source venv/bin/activate        # On Linux/Mac
venv\Scripts\activate           # On Windows
```

### 3. Install Required Packages

```bash
pip install -r requirements.txt
```

---

## ▶ Running the Project

### 1) Start the Backend Server

```bash
python chatbot.py
```
python -m http.server 8000
The backend will start running on `http://localhost:5000` (or the port defined in your `chatbot.py` file).

### 2) Open the Frontend

You can open the frontend directly in your browser:

```text
templates/index.html
```

> 💡 Make sure your backend is running before opening the `index.html` file so that it can communicate properly with the chatbot server.

---

## 📂 Folder Structure

```
ChatBot/
├── chatbot.py
├── requirements.txt
└── templates/
    └── index.html
```

## License

This project is licensed under the [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License](https://creativecommons.org/licenses/by-nc-sa/4.0/).


