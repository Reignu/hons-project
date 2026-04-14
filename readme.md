# MCI Assistive Helper
A DOM-based, AI-powered multimodal digital helper to reduce cognitive load for users with Mild Cognitive Impairment (MCI). It uses a local Large Language Model (LLM) to provide visual and audio guidance during online shopping tasks.

## Prerequisites
- Python 3.x with Flask, 
- requests, 
- and flask-cors installed
- Ollama installed and running locally with the phi3 model
- Google Chrome (to load the frontend extension).

## Setup Instructions
1. Start the Local LLM: Ensure Ollama is running in the background so the backend can access http://localhost:11434/api/generate

2. Start the Backend: Navigate to the backend folder, install the requirements, and run python app.py. This will start the Flask server on http://127.0.0.1:5000

3. Install the Frontend: Open Chrome, go to chrome://extensions, enable "Developer mode", and click "Load unpacked". Select the frontend directory

## How to Use It
Navigate to the mock grocery testbed (e.g., goldenfreshcart.ibithun.com). The Chrome extension will automatically inject the dom_parser.js script, style.css, and the Helper UI panel into the page.