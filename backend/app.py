from flask import Flask, request, jsonify
import requests
import json
import subprocess
from flask_cors import CORS
import re

# 1. Initialise as a Pure API Backend (No templates needed)
app = Flask(__name__)

CORS(app, resources={r"/api/*": {"origins": ["https://goldenfreshcart.ibithun.com", "http://127.0.0.1:5500", "http://localhost:5500"]}}) # This allows the extension to talk to the backend

current_audio_process = None

def speak_text(text):
    global current_audio_process
    try:
        # If a previous audio process is still running, kill it before starting the new one
        if current_audio_process is not None and current_audio_process.poll() is None:
            current_audio_process.kill()
        
        current_audio_process = subprocess.Popen(['say', text])
    except Exception as e:
        print(f"Speech error: {e}")

# 2. Add 'OPTIONS' to accepted methods to handle CORS Preflight
@app.route('/api/guide', methods=['POST', 'OPTIONS'])
def generate_guidance():
    # Immediately catch and approve the browser's preflight check
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    data = request.json
    dom_elements = data.get('elements', [])
    
    # 3. Print the payload length to the terminal so we can pass Test 1.1!
    print(f"Extracted {len(dom_elements)} elements from the DOM!")
    
    is_struggling = data.get('is_struggling', False)
    shopping_list = data.get('shopping_list', [])
    current_path = data.get('current_path', '/')

    prompt_instructions = "Analyze the page elements and guide the user to the next logical step to complete their shopping."

    if is_struggling:
        prompt_instructions = "The user is struggling. Provide an EXTREMELY SIMPLE, DIRECT 5-word command telling them EXACTLY which element to click next."
    else:
        if current_path == '/' or '/shop' in current_path:
            if not shopping_list:
                prompt_instructions = "The user's shopping list is empty. Tell them to type an item into the input box and click 'Add to List'."
            else:
                first_item = shopping_list
                list_str = ", ".join(shopping_list)
                prompt_instructions = f"""The user wants to buy: {list_str}. 
                Tell them they can add another item, OR type '{first_item}' into the Search Bar to start shopping."""
        elif current_path == '/product':
            prompt_instructions = "The user is viewing a product. Guide them to click 'Add to Cart'."
        elif current_path == '/cart':
            prompt_instructions = "The user is in their cart. Guide them to click 'Proceed to Secure Checkout'."
        elif current_path == '/product' or current_path == '/milk':
            prompt_instructions = "The user is viewing a product. Guide them to click 'Add to Cart'."

    prompt = f"""You are an assistive digital guide for elderly users with Mild Cognitive Impairment.
    Elements: {json.dumps(dom_elements)}
    {prompt_instructions}
    Respond ONLY in JSON: {{"instruction": "...", "target_id": "..."}}"""

    try:
        response = requests.post('http://localhost:11434/api/generate', json={
            "model": "phi3", 
            # TEMPORARILY FORCE FILLER FOR THE TEST
            "prompt": prompt,
            "stream": False,
            "format": "json"
        }, timeout=10)
        
        llm_data = response.json()
        raw_text = llm_data.get('response', '')
        print(f"DEBUG: Raw LLM response: {raw_text}")
        
        # REGEX PARSER: Find the first '{' and the last '}' to extract only the JSON
        match = re.search(r'\{.*\}', raw_text, re.DOTALL)
        clean_json = match.group(0) if match else "{}"
        
        parsed_instruction = json.loads(clean_json)
        instruction = parsed_instruction.get("instruction", "Follow the highlighted step.")
        target_id = parsed_instruction.get("target_id", "")
        
        return jsonify({"instruction": instruction, "target_id": target_id})
    except Exception as e:
        return jsonify({"instruction": "I am here to help.", "target_id": ""})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
