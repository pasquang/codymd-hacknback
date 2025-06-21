from pypdf import PdfReader
from flask import Flask, request, redirect, url_for, flash
from werkzeug.utils import secure_filename
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
        text = text.replace("\n", "")
        text = text.replace("?", ".")
        text = text.replace("•", ".")
        split_text = text.split(".")
        line_split_page = []
        for j in range(len(split_text)):
            line = split_text[j].split(" ")
            k = 0
            while k < len(line):
                if line[k] == "":
                    del line[k]
                    k -= 1
                k += 1
            if line != []:
                line_split_page.append(line)
        data.append(line_split_page)
    return data
    
def print_all_pages(data):
    for page in data:
        print(page)
        print("----------------------------------------------------")

def find_donts(data):
    donts = []
    for page in data:
        for line in page:
            for i in range(len(line)):
                if (line[i] == "Do" or line[i] == "do") and i < len(line)-2:
                    if line[i+1] == "not":
                        print("Do not detected!")
                        print("full line: \n", line, "\n")
                        donts.append(line)
                        break
                elif (line[i] == "Avoid" or line[i] == "avoid"):
                    print("Avoid detected!")
                    print("full line: \n", line, "\n")
                    donts.append(line)
                    break
                elif (line[i] == "Stop" or line[i] == "stop"):
                    print("Stop detected!")
                    print("full line: \n", line, "\n")
                    donts.append(line)
                    break
    return donts

# def find_dos(data):
#     donts = []
#     for page in data:
#         for line in page:
#             for i in range(len(line)):
#                 if (line[i] == "Do" or line[i] == "do") and i < len(line)-2:
#                     if line[i+1] == "not":
#                         print("Do not detected!")
#                         print("full line: \n", line, "\n")
#                         donts.append(line)
#                         break
#                 elif (line[i] == "Avoid" or line[i] == "avoid"):
#                     print("Avoid detected!")
#                     print("full line: \n", line, "\n")
#                     donts.append(line)
#                     break
#                 elif (line[i] == "Stop" or line[i] == "stop"):
#                     print("Stop detected!")
#                     print("full line: \n", line, "\n")
#                     donts.append(line)
#                     break
#     return donts


def find_time_frame(line):
    for i in range(len(line)):
        time = -1
        try:
            time = int(line[i])
            unit = line[i+1]
            if (unit == "days" or unit == "minutes" or unit == "hours" or unit == "weeks"or unit == "day" 
                or unit == "minute" or unit == "hour" or unit == "week" or unit == "years" or unit == "year"
                ):
                return time, unit
        except:
            continue
    if time == -1:
        return -1, "not found"
    

def print_time_frames(data):
    for line in data:
        time, unit = find_time_frame(line)
        if time != -1:
            print("Time:", time,"Unit:", unit, "Line:", line_to_text(line))
            
def line_to_text(line):
    text = ""
    for i in range(len(line)):
        text += line[i] + " "
    return text

def main():
    pdf_name = "sample-data/FILE_0617.pdf"
    data = read_pdf(pdf_name)
    #print_all_pages(data)
    donts = find_donts(data)
    # dos = find_dos(data)
    print(donts)
    print_time_frames(donts)
    send_time_frames(donts)
    
'''
type: (int)
time: (int)
unit: (str)
message: (str)
'''
    
main()

# @app.route('/upload_pdf', methods=['POST'])
# def upload_pdf():
#     if 'pdf_file' not in request.files:
#         flash('No file part')
#         return redirect(request.url)

#     file = request.files['pdf_file']

#     if file.filename == '':
#         flash('No selected file')
#         return redirect(request.url)

#     if file and file.filename.endswith('.pdf'): # Basic validation for PDF extension
#         filename = secure_filename(file.filename)
#         file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
#         flash('PDF uploaded successfully!')
#         return 'PDF uploaded successfully!' # Or redirect to a success page
#     else:
#         flash('Invalid file type. Please upload a PDF.')
#         return redirect(request.url)

# if __name__ == '__main__':
#     os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True) # Create upload directory if it doesn't exist
#     app.run(debug=True)