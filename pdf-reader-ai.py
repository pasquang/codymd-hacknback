from flask import Flask, request, render_template, redirect, url_for, jsonify
from werkzeug.utils import secure_filename
from pypdf import PdfReader
import requests
import os
import json
from flask_cors import CORS
import base64
import hashlib
import uuid
from datetime import datetime

app = Flask(__name__)


# In-memory store for status tracking (replace with database in production)
upload_status = {}

#curl -X POST -F "pdf_file=@sample-data/FILE_0617.pdf" http://localhost:5000/api/upload

from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)
CORS(app)
app.config['UPLOAD_FOLDER'] = 'uploads'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY:
    raise ValueError("Missing Anthropic API Key")

def extract_pdf_text(filepath):
    reader = PdfReader(filepath)
    return "\n".join([page.extract_text() or "" for page in reader.pages])

def build_prompt(pdf_text, proc_time="2025-06-21T08:00:00Z"):
    prompt = """You are a helpful assistant extracting structured tasks and medications from medical discharge instructions.
    
Please read the following text and extract two types of objects:
1. "tasks" activity restrictions or instructions
2. "medications" prescribed medications

Use the following enums:
// Enums
export enum TaskType {
  MEDICATION = 'medication',
  APPOINTMENT = 'appointment',
  EXERCISE = 'exercise',
  WOUND_CARE = 'wound_care',
  DIET = 'diet',
  ACTIVITY_RESTRICTION = 'activity_restriction',
  MONITORING = 'monitoring',
  EDUCATION = 'education',
  OTHER = 'other'
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
  OVERDUE = 'overdue'
}

export enum TaskActionType {
  DO = 'do',        // Green - things patient should do
  DO_NOT = 'do_not' // Red - things patient should not do
}

export enum TaskCategory {
  IMMEDIATE = 'immediate', // 0-24 hours
  SHORT_TERM = 'short_term', // 1-7 days
  MEDIUM_TERM = 'medium_term', // 1-4 weeks
  LONG_TERM = 'long_term' // 1+ months
}

export enum ReminderType {
  TASK_DUE = 'task_due',
  MEDICATION = 'medication',
  APPOINTMENT = 'appointment',
  CHECK_IN = 'check_in'
}

export enum ReminderFrequency {
  NONE = 'none',
  MINIMAL = 'minimal',
  NORMAL = 'normal',
  FREQUENT = 'frequent'
}

export enum NotificationMethod {
  BROWSER = 'browser',
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push'
}

Each task should follow this format:

```json
{
  "id": "auto-generated-uuid",  // use a placeholder like "auto-generated-uuid"
  "title": "Short summary (e.g. No Driving Restriction)",
  "description": "Full sentence describing the action (e.g. Do not drive for 24 hours)",
  "type": "TaskType",
  "status": "TaskStatus",
  "actionType": "TaskActionType",
  "category": "IMMEDIATE" if it applies today, or "FUTURE" if delayed,
  "scheduledTime": "2025-06-21T08:00:00Z",  //use this format, add task time to procedure time.
  "estimatedDuration": estimated time in hours,
  "instructions": ["List of explicit actions or warnings stated in the pdf"],
  "reminders": [
      {
        "id": "auto-generated-uuid",  // use a placeholder like "auto-generated-uuid",
        "taskId": "id field from task",
        "type": "ReminderType",
        "scheduledTime": "reminder time",
        "message": 'Time to take your aspirin',
        "isActive": "boolean",
        "isSent": "boolean"
      }
    ],
  "dependencies": [], //leave this field empty for now
  "category": "TaskCategory",
  "metadata": {
    "source": "discharge_instructions",
    "confidence": 0.95,
    "originalText": "Original text snippet",
    "pageNumber": "Page number from source pdf"
  }
}```"""

    prompt += f"""
    The time of the procedure is: {proc_time}
    Here is the PDF text:
    ```{pdf_text[:8000]}```
    Do not modify any of the message text.
    Only process the text above, and give a clean JSON result.
    """
    print(prompt)
    return prompt

def generate_checksum(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


@app.route('/api/status/<upload_id>', methods=['GET'])
def get_upload_status(upload_id):
    status = upload_status.get(upload_id)
    if not status:
        return jsonify({'error': 'Upload ID not found'}), 404
    return jsonify(status)

@app.route('/api/result/<upload_id>', methods=['GET'])
def get_processing_result(upload_id):
    status = upload_status.get(upload_id)
    if not status or status.get('status') != 'completed':
        return jsonify({'error': 'Result not ready'}), 404
    return jsonify(status['result'])


def call_claude(prompt):
    url = "https://api.anthropic.com/v1/messages"
    headers = {
        "x-api-key": os.getenv("ANTHROPIC_API_KEY"),  # Or use your API key as string
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
    }
    data = {
        "model": "claude-3-7-sonnet-20250219",
        "max_tokens": 8000,
        "messages": [
            {"role": "user", "content": prompt}
        ]
    }

    response = requests.post(url, headers=headers, json=data)
    response.raise_for_status()
    return response.json()

def extract_json_from_claude(claude_response_text):
    """
    Takes Claude's text response and extracts the JSON portion.
    """
    text = claude_response_text.strip()
    if text.startswith("```json"):
        text = text.removeprefix("```json").removesuffix("```").strip()
    elif text.startswith("```"):
        text = text.removeprefix("```").removesuffix("```").strip()
    return json.loads(text)

@app.route('/api/upload', methods=['POST'])
def upload_pdf():
    print("Received PDF upload request.")
    try:
        data = request.get_json()

        # --- Step 1: Unpack incoming package ---
        metadata = data['uploadMetadata']
        file_data = data['fileData']
        upload_id = metadata['uploadId']

        # --- Step 2: Decode base64 PDF ---
        pdf_binary = base64.b64decode(file_data['base64Content'])

        # --- Step 3: Validate checksum ---
        # expected_checksum = file_data['checksum']
        # actual_checksum = hashlib.sha256(pdf_binary).hexdigest()
        # if actual_checksum != expected_checksum:
        #     return jsonify({"error": "Checksum mismatch"}), 400

        # --- Step 4: Save PDF file ---
        filename = secure_filename(metadata['fileName'])
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], f"{upload_id}_{filename}")
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        with open(filepath, 'wb') as f:
            f.write(pdf_binary)

        # --- Step 5: Extract PDF content ---
        pdf_text = extract_pdf_text(filepath)

        # --- Step 6: Generate prompt for Claude ---
        prompt = build_prompt(pdf_text)
        claude_response = call_claude(prompt)

        # --- Step 7: Parse Claude response ---
        raw_text = claude_response["content"][0]["text"]
        if raw_text.startswith("```json"):
            raw_text = raw_text.removeprefix("```json").removesuffix("```").strip()
        elif raw_text.startswith("```"):
            raw_text = raw_text.removeprefix("```").removesuffix("```").strip()

        parsed_data = json.loads(raw_text)

        # --- Step 8: Return structured response ---
        result = {
            "uploadId": upload_id,
            "status": "completed",
            "progress": 100,
            "message": "Processing completed successfully.",
            "result": parsed_data
        }
        print(parsed_data)
        return jsonify(parsed_data), 200

    except Exception as e:
        return jsonify({
            "uploadId": data.get('uploadMetadata', {}).get('uploadId', 'unknown'),
            "status": "failed",
            "message": "Failed to process upload.",
            "error": str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True)
