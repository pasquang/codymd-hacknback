from flask import Flask, request, render_template, redirect, url_for, jsonify
from werkzeug.utils import secure_filename
from pypdf import PdfReader
import requests
import os

#curl -X POST -F "pdf_file=@sample-data/FILE_0617.pdf" http://localhost:5000/api/upload

from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads' # Directory to save uploaded files
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024 # Limit file size (e.g., 16MB)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY:
    raise ValueError("Missing Anthropic API Key")

def extract_pdf_text(filepath):
    reader = PdfReader(filepath)
    return "\n".join([page.extract_text() or "" for page in reader.pages])

def build_prompt(pdf_text):
    return f"""You are a helpful assistant. The user has uploaded a PDF with guidelines. 
    Your task is to extract:
    - all rules that indicate what a patient should do and not do after their procedure
    - type defition:
        what the patient should do: 0
        what the patient shoudln't do: 1
    - and any associated timeframes (e.g., 'for 3 days', 'after 12 hours').

    Return your results as JSON with keys:
    - "time_frames": [{{"time": int, "unit": str, "message": str, "type": int}}]

    Here is the PDF text:
    ```{pdf_text[:8000]}```
    Do not modify any of the message text.
    Only process the text above, and give a clean JSON result.
    """


def call_claude(prompt):
    url = "https://api.anthropic.com/v1/messages"
    headers = {
        "x-api-key": os.getenv("ANTHROPIC_API_KEY"),  # Or use your API key as string
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
    }
    data = {
        "model": "claude-opus-4-20250514",
        "max_tokens": 8000,
        "messages": [
            {"role": "user", "content": prompt}
        ]
    }

    response = requests.post(url, headers=headers, json=data)
    response.raise_for_status()
    return response.json()

@app.route('/api/upload', methods=['POST'])
def api_upload():
    if 'pdf_file' not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files['pdf_file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if file and file.filename.lower().endswith('.pdf'):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        # 1. Extract text
        pdf_text = extract_pdf_text(filepath)

        # 2. Build Claude prompt
        prompt = build_prompt(pdf_text)

        # 3. Call Claude API
        try:
            result = call_claude(prompt)
            print(result)
            print("request sucessfully completed...")
            return jsonify({"parsed": result}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    return jsonify({"error": "Invalid file type"}), 400


if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    app.run(debug=True)
