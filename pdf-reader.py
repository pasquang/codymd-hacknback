from flask import Flask, request, render_template, redirect, url_for, jsonify
from werkzeug.utils import secure_filename
from pypdf import PdfReader
import os

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads' # Directory to save uploaded files
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024 # Limit file size (e.g., 16MB)

def read_pdf(reader_name):
    reader = PdfReader(reader_name)
    data = []
    num_pages = len(reader.pages)
    for i in range(num_pages):
        page = reader.pages[i]
        text = page.extract_text()
        text = text.replace("\n", "").replace("?", ".").replace("•", ".")
        split_text = text.split(".")
        page_lines = []
        for fragment in split_text:
            words = [w for w in fragment.strip().split(" ") if w]
            if words:
                page_lines.append(words)
        data.append(page_lines)
    return data
    
def print_all_pages(data):
    for page in data:
        print(page)
        print("----------------------------------------------------")

def find_donts(data):
    donts = []
    trigger_words = {"do not", "avoid", "stop", "don't"}

    for page_index, page in enumerate(data):
        new_page = []
        for line in page:
            sentence = " ".join(line).lower()
            if any(trigger in sentence for trigger in trigger_words):
                donts.append(line)
            else:
                new_page.append(line)
        data[page_index] = new_page  # Replace with filtered page

    return donts

def find_dos(data):
    dos = []
    trigger_words = {"do", "have", "start", "drink", "eat", "may", "when", "take"}

    for page_index, page in enumerate(data):
        new_page = []
        for line in page:
            sentence = " ".join(line).lower()
            if any(trigger in sentence for trigger in trigger_words):
                dos.append(line)
            else:
                new_page.append(line)
        data[page_index] = new_page  # Replace with filtered page

    return dos


def find_time_frame(line):
    for i in range(len(line) - 1):
        try:
            time = int(line[i])
            unit = line[i + 1].lower()
            if unit in ["second","seconds","day", "days", "minute", "minutes", "hour", "hours", "week", "weeks", "year", "years"]:
                return time, unit
        except ValueError:
            continue
    return -1, "not found"

def extract_time_frames(data, type):
    frames = []
    for line in data:
        time, unit = find_time_frame(line)
        if time != -1:
            frames.append({
                "type": type,
                "time": time,
                "unit": unit,
                "message": " ".join(line)
            })
    return frames

def pretty_print(data):
    for line in data:
        print(" ".join(line))
    print("\n\n")

# def main():
#     pdf_name = "sample-data/FILE_0617.pdf"
#     data = read_pdf(pdf_name)
#     #print_all_pages(data)
#     donts = find_donts(data)
#     #dos = find_dos(data)
#     print(donts)
#     print(extract_time_frames(donts, 1))
    
# '''
# type: (int)
# time: (int)
# unit: (str)
# message: (str)
# '''
    
# main()

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

        data = read_pdf(filepath)
        donts = find_donts(data)
        dos = find_dos(data)
        pretty_print(donts)
        pretty_print(dos)
        time_frames = extract_time_frames(donts, 1)
        time_frames += extract_time_frames(dos, 0)

        return jsonify({"time_frames": time_frames}), 200

    return jsonify({"error": "Invalid file type"}), 400

if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    app.run(debug=True)
