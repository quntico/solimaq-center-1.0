import sys

filename = r'c:\Users\fredd\OneDrive\Desktop\CENTERS\SOLIMAQ CENTER 1.0 GITHUB\src\pages\MasterPlan.jsx'
with open(filename, 'rb') as f:
    lines = f.readlines()

target_line = 3936
line = lines[target_line - 1]
print(f"Line {target_line} content (bytes):")
print(line)
print(f"Length: {len(line)}")

for i, b in enumerate(line):
    if b > 126 or b < 32 and b not in [10, 13, 9]:
        print(f"Non-ASCII/Hidden char found at pos {i+1}: {b}")
