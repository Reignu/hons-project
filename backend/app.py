from flask import Flask, request, jsonify
import requests
import json
from flask_cors import CORS

app = Flask(__name__)
# Allows the Chrome Extension to talk to the backend
CORS(app, resources={r"/api/*": {"origins": ["https://goldenfreshcart.ibithun.com", "http://127.0.0.1:5500", "http://localhost:5500"]}})

@app.route('/api/guide', methods=['POST', 'OPTIONS'])
def generate_guidance():
    # Catch and approve the browser's preflight check
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    data = request.json
    dom_elements = data.get('elements', [])
    print(f"Extracted {len(dom_elements)} elements from the DOM!")
    
    is_struggling = data.get('is_struggling', False)
    shopping_list = data.get('shopping_list', [])
    current_path = data.get('current_path', '/')

    # Default fallback instruction
    prompt_instructions = "Analyze the page elements and guide the user to the next logical step to complete their shopping."

    # Fixed Routing Logic: Checks the list on both '/' and '/shop'
    if is_struggling:
        prompt_instructions = "The user is struggling. Provide an EXTREMELY SIMPLE, DIRECT 5-word command telling them EXACTLY which element to click next."
    else:
        if current_path == '/' or '/shop' in current_path:
            if not shopping_list:
                prompt_instructions = "The user's shopping list is empty. Tell them to type an item into the chatbot input box and click 'Add'."
            else:
                # Handle both string or array structures safely
                first_item = shopping_list if isinstance(shopping_list, list) else shopping_list
                list_str = ", ".join(shopping_list) if isinstance(shopping_list, list) else shopping_list
                prompt_instructions = f"The user wants to buy: {list_str}. Guide them to click on '{first_item}' or search for it."
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
        print(f"DEBUG: Raw LLM response: {llm_data.get('response')}")
        
        parsed_instruction = json.loads(llm_data.get("response", "{}"))
        instruction = parsed_instruction.get("instruction", "Follow the highlighted step.")
        target_id = parsed_instruction.get("target_id", "")
        
        # Audio has been removed from here and moved to the JavaScript frontend!
        return jsonify({"instruction": instruction, "target_id": target_id})
        
    except Exception as e:
        print(f"LLM Error: {e}")
        return jsonify({"instruction": "I am here to help.", "target_id": ""})

if __name__ == '__main__':
    app.run(debug=True, port=5000)