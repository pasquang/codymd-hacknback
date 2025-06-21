"""
Enhanced logging configuration for PDF processing backend
"""

import logging
import sys
import json
import uuid
from datetime import datetime
from functools import wraps

# Configure logging
def setup_logging():
    """Setup comprehensive logging for the PDF processing backend"""
    
    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - [%(request_id)s] - %(message)s'
    )
    
    # File handler
    file_handler = logging.FileHandler('pdf_processing.log')
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(formatter)
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    
    # Root logger
    logger = logging.getLogger()
    logger.setLevel(logging.DEBUG)
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    return logger

def log_request(func):
    """Decorator to log API requests with unique request IDs"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        request_id = str(uuid.uuid4())[:8]
        
        # Add request_id to logging context
        old_factory = logging.getLogRecordFactory()
        def record_factory(*args, **kwargs):
            record = old_factory(*args, **kwargs)
            record.request_id = request_id
            return record
        logging.setLogRecordFactory(record_factory)
        
        logger = logging.getLogger(__name__)
        
        try:
            logger.info(f"API request started: {func.__name__}")
            result = func(*args, **kwargs)
            logger.info(f"API request completed successfully: {func.__name__}")
            return result
        except Exception as e:
            logger.error(f"API request failed: {func.__name__} - {str(e)}", exc_info=True)
            raise
        finally:
            # Restore original factory
            logging.setLogRecordFactory(old_factory)
    
    return wrapper

def log_pdf_processing(file_path, text_length):
    """Log PDF processing details"""
    logger = logging.getLogger(__name__)
    logger.info(f"PDF text extraction completed", extra={
        'file_path': file_path,
        'text_length': text_length,
        'text_preview': text_length > 100 and f"{text_length[:100]}..." or "Short text"
    })

def log_claude_request(prompt_length, response_data):
    """Log Claude API interaction"""
    logger = logging.getLogger(__name__)
    logger.info(f"Claude API request completed", extra={
        'prompt_length': prompt_length,
        'response_keys': list(response_data.keys()) if isinstance(response_data, dict) else 'non-dict response',
        'has_content': 'content' in response_data if isinstance(response_data, dict) else False
    })

def log_json_parsing(raw_text, parsed_success, task_count=0):
    """Log JSON parsing results"""
    logger = logging.getLogger(__name__)
    if parsed_success:
        logger.info(f"JSON parsing successful", extra={
            'raw_text_length': len(raw_text),
            'task_count': task_count,
            'text_preview': raw_text[:200] + '...' if len(raw_text) > 200 else raw_text
        })
    else:
        logger.error(f"JSON parsing failed", extra={
            'raw_text_length': len(raw_text),
            'text_preview': raw_text[:500] + '...' if len(raw_text) > 500 else raw_text
        })

# Example usage in pdf-reader-ai.py:
"""
from backend_logger import setup_logging, log_request, log_pdf_processing, log_claude_request, log_json_parsing

# At the top of pdf-reader-ai.py
logger = setup_logging()

# Decorate the upload endpoint
@app.route('/api/upload', methods=['POST'])
@log_request
def api_upload():
    # ... existing code ...
    
    # After PDF text extraction
    pdf_text = extract_pdf_text(filepath)
    log_pdf_processing(filepath, len(pdf_text))
    
    # After Claude API call
    claude_response = call_claude(prompt)
    log_claude_request(len(prompt), claude_response)
    
    # After JSON parsing
    try:
        parsed_json = json.loads(text)
        log_json_parsing(text, True, len(parsed_json.get('tasks', [])))
        return jsonify(parsed_json), 200
    except Exception as e:
        log_json_parsing(text, False)
        return jsonify({"error": "Failed to parse Claude JSON", "details": str(e)}), 500
"""