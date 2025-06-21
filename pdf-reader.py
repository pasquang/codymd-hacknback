from pypdf import PdfReader

def read_pdf(reader_name):
    reader = PdfReader(reader_name)
    data = []
    num_pages = len(reader.pages)
    for i in range(num_pages):
        page = reader.pages[i]
        text = page.extract_text()
        text = text.replace("\n", "")
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
                elif (line[i] == "Avoid" or line[i] == "avoid"):
                    print("Avoid detected!")
                    print("full line: \n", line, "\n")
                    donts.append(line)
                elif (line[i] == "Stop" or line[i] == "stop"):
                    print("Stop detected!")
                    print("full line: \n", line, "\n")
                    donts.append(line)
    return donts

def main():
    pdf_name = "FILE_2736.pdf"
    data = read_pdf(pdf_name)
    print_all_pages(data)
    donts = find_donts(data)
    print(donts)
    
main()