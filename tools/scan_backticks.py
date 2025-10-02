from pathlib import Path
import sys

path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(r'd:\Daten\3-PROJECTS\5-PUTZPLAN\debug-demo.html')
s = path.read_text(encoding='utf-8')
line = 1
col = 0
in_bt = False
in_sq = False
in_dq = False
esc = False
stack = []
for ch in s:
    col += 1
    if ch == '\n':
        line += 1
        col = 0
    if esc:
        esc = False
        continue
    if ch == '\\':
        esc = True
        continue
    if not in_bt:
        if in_sq:
            if ch == "'":
                in_sq = False
            continue
        if in_dq:
            if ch == '"':
                in_dq = False
            continue
        if ch == '"':
            in_dq = True
            continue
        if ch == "'":
            in_sq = True
            continue
    if ch == '`' and not in_sq and not in_dq:
        if not in_bt:
            in_bt = True
            stack.append(('`', line, col))
        else:
            in_bt = False
            stack.pop()
        continue

if in_bt:
    print(f'UNTERMINATED backtick starting at line {stack[-1][1]}, col {stack[-1][2]}')
else:
    print('OK (all template literals closed)')
