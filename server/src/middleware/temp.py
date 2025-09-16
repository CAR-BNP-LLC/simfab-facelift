import csv

with open(r"C:\Users\sveto\Downloads\wc-product-export-16-9-2025-1758050942025.csv") as csv_file:
    csv_reader = csv.reader(csv_file, delimiter=',')
    header = next(csv_reader)

print("List of column names:", header)
