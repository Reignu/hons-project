from flask import Flask, request, jsonify, render_template
import requests
import json
import subprocess

app = Flask(__name__, 
            template_folder='../frontend/templates', 
            static_folder='../frontend/static')

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

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/product')
def product():
    return render_template('product.html')

@app.route('/milk')
def milk():
    return render_template('milk.html')

@app.route('/cart')
def cart():
    return render_template('cart.html')

@app.route('/api/guide', methods=['POST'])
def generate_guidance():
    data = request.json
    dom_elements = data.get('elements', [])
    is_struggling = data.get('is_struggling', False)
    shopping_list = data.get('shopping_list', [])
    current_path = data.get('current_path', '/')

    if is_struggling:
        prompt_instructions = "The user is struggling. Provide an EXTREMELY SIMPLE, DIRECT 5-word command telling them EXACTLY which element to click next."
    else:
        if current_path == '/':
            if not shopping_list:
                prompt_instructions = "The user's shopping list is empty. Tell them to type an item into the input box and click 'Add to List'."
            else:
                first_item = shopping_list[0]
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
            "prompt": prompt,
            "stream": False,
            "format": "json"
        }, timeout=10)
        llm_data = response.json()
        parsed_instruction = json.loads(llm_data.get("response", "{}"))
        instruction = parsed_instruction.get("instruction", "Follow the highlighted step.")
        target_id = parsed_instruction.get("target_id", "")
        speak_text(instruction)
        return jsonify({"instruction": instruction, "target_id": target_id})
    except Exception as e:
        return jsonify({"instruction": "I am here to help.", "target_id": ""})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
