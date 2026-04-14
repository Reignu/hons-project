from flask import Flask, request, jsonify
import requests
import json
import subprocess
from flask_cors import CORS
import re

# Initialise pure API Backend
app = Flask(__name__)

CORS(app, resources={r"/api/*": {"origins": ["https://goldenfreshcart.ibithun.com", "http://127.0.0.1:5500", "http://localhost:5500"]}}) # This allows the extension to talk to the backend

current_audio_process = None

# Add OPTIONS to accepted methods to handle CORS preflight
@app.route('/api/guide', methods=['POST', 'OPTIONS'])
def generate_guidance():
    # Immediately catch and approve the browser's preflight check
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    data = request.json
    dom_elements = data.get('elements', [])
    
    # Print the payload length to the terminal
    print(f"Extracted {len(dom_elements)} elements from the DOM!")
    
    is_struggling = data.get('is_struggling', False)
    shopping_list = data.get('shopping_list', [])
    current_path = data.get('current_path', '/')

    prompt_instructions = "Analyse the page elements and guide the user to the next logical step to complete their shopping."

    if is_struggling:
        prompt_instructions = "The user is struggling. Provide an EXTREMELY SIMPLE, DIRECT 5-word command telling them EXACTLY which element to click next."
    else:
        if current_path == '/' or '/shop' in current_path:
            if not shopping_list:
                prompt_instructions = "The user's shopping list is empty. Tell them to type an item into the input box and click 'Add'."
            else:
                first_item = shopping_list
                list_str = ", ".join(shopping_list)
                prompt_instructions = f"""The user wants to buy: {list_str}. 
                Tell them they can add another item, OR type '{first_item}' into the Search Bar to start shopping."""
        elif current_path == '/product':
            prompt_instructions = "The user is viewing a product. Guide them to click 'Add'."
        elif current_path == '/cart':
            prompt_instructions = "The user is in their cart. Guide them to click 'Proceed to Secure Checkout'."

    prompt = f"""You are an assistive digital guide for elderly users with Mild Cognitive Impairment.
    Elements: {json.dumps(dom_elements)}
    {prompt_instructions}
    Respond ONLY in JSON: {{"instruction": "...", "target_id": "..."}}"""

    try:
        response = requests.post('http://localhost:11434/api/generate', json={
            "model": "phi3",
            "prompt": prompt,
            "stream": False,
            "format": "json"
        }, timeout=10)
        
        llm_data = response.json()
        raw_text = llm_data.get('response', '')
        print(f"DEBUG: Raw LLM response: {raw_text}")
        
        # Find the first '{' and the last '}' to extract only the JSON
        match = re.search(r'\{.*\}', raw_text, re.DOTALL)
        clean_json = match.group(0) if match else "{}"
        
        parsed_instruction = json.loads(clean_json)
        instruction = parsed_instruction.get("instruction", "Follow the highlighted step.")
        target_id = parsed_instruction.get("target_id", "")
        
        # Catch LLM array hallucinations
        if isinstance(target_id, list) and len(target_id) > 0:
            target_id = target_id[0]  # Force it to only take the first element
        
        return jsonify({"instruction": instruction, "target_id": target_id})
    except Exception as e:
        return jsonify({"instruction": "I am here to help.", "target_id": ""})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
