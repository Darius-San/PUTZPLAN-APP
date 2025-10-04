
import sys, re
from pathlib import Path
p = Path(__file__).resolve().parents[1] / 'debug-demo.html'
text = p.read_text(encoding='utf-8')
stack = []
line = 1
col = 0
in_str = None
escape = False
unclosed_backtick_line = None
for ch in text:
    if ch == '\n':
        line += 1; col = 0; continue
    col += 1
    if in_str is not None:
        if escape:
            escape = False
        elif ch == '\\':
            escape = True
        elif ch == in_str:
            in_str = None
            if ch == '`':
                unclosed_backtick_line = None
        continue
    if ch in ('"', "'", '`'):
        in_str = ch
        if ch == '`':
            unclosed_backtick_line = line
        continue
    if ch in '([{':
        stack.append((ch, line, col))
    elif ch in ')]}':
        if not stack:
            print(f'Unmatched closing {ch} at {line}:{col}')
            sys.exit(0)
        o, ol, oc = stack.pop()
        pairs = {'(' : ')', '[':']', '{':'}'}
        if pairs[o] != ch:
            print(f'Mismatched {o} opened at {ol}:{oc} closed by {ch} at {line}:{col}')
            sys.exit(0)
if in_str is not None:
    print(f'Unclosed string starts at line {unclosed_backtick_line or "<unknown>"} (type {in_str})')
    sys.exit(0)
if stack:
    o, ol, oc = stack[-1]
    print(f'Unclosed opener {o} at {ol}:{oc}')
    sys.exit(0)
print('OK: Brackets and strings balanced')
