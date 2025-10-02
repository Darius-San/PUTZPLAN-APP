import sys, time
from pathlib import Path

p = Path(__file__).resolve().parents[1] / 'debug-demo.html'
text = p.read_text(encoding='utf-8')
lines = text.splitlines(True)

line = 1
col = 0
stack = []
state = 'code'  # code|string: ', ", ` | regex | line_comment | block_comment
string_delim = None
escape = False

pairs = {'(' : ')', '[': ']', '{': '}'}
rev = {')': '(', ']': '[', '}': '{'}

def can_start_regex(prev_char):
    # Very simple heuristic: after these tokens a regex can begin
    return (
        prev_char in (None, '(', '[', '{', '=', ':', ',', ';', '\n', '\t', ' ')
        or prev_char in '+-*/%&|^!~?'
    )

prev_nonspace = None
start_ts = time.time()
last_report_line = 0
total_lines = len(lines)

for raw_line in lines:
    for ch in raw_line:
        if ch == '\n':
            line += 1; col = 0
            if state == 'line_comment':
                state = 'code'
            # progress report every 1000 lines
            if line - last_report_line >= 1000:
                elapsed = time.time() - start_ts
                pct = min(100, round((line / max(1, total_lines)) * 100))
                print(f"[balance] processed ~{line}/{total_lines} lines ({pct}%), elapsed {elapsed:.2f}s")
                last_report_line = line
            continue
        col += 1

    if state == 'line_comment':
        continue
    if state == 'block_comment':
        if prev_nonspace == '*' and ch == '/':
            state = 'code'
        prev_nonspace = ch
        continue
    if state in ('string', 'template'):
        if escape:
            escape = False
        elif ch == '\\':
            escape = True
        elif (state == 'string' and ch == string_delim) or (state == 'template' and ch == '`'):
            state = 'code'
        continue
    if state == 'regex':
        if escape:
            escape = False
        elif ch == '\\':
            escape = True
        elif ch == '/':
            state = 'code'
        continue

    # code state
    if ch == '/':
        if prev_nonspace == '/':
            state = 'line_comment'
            continue
        prev = prev_nonspace
        # Not perfect, but prevents many false positives
        if can_start_regex(prev):
            state = 'regex'
            escape = False
            continue
    if ch == '*':
        if prev_nonspace == '/':
            state = 'block_comment'
            continue
    if ch in ('"', "'"):
        state = 'string'
        string_delim = ch
        escape = False
        continue
    if ch == '`':
        state = 'template'
        escape = False
        continue
    if ch in pairs:
        stack.append((ch, line, col))
    elif ch in rev:
        if not stack or stack[-1][0] != rev[ch]:
            # Show small context for diagnostics
            ctx_start = max(0, line-3)
            ctx_end = min(total_lines, line+2)
            ctx = ''.join(lines[ctx_start:ctx_end])
            print(f'Unmatched closing {ch} at {line}:{col}')
            print('--- context ---')
            print(ctx)
            print('---------------')
            sys.exit(1)
        stack.pop()
    if not ch.isspace():
        prev_nonspace = ch

if state in ('string', 'template', 'regex'):
    print(f'Unclosed {state} at line {line}:{col}')
    ctx_start = max(0, line-3)
    ctx_end = min(total_lines, line+2)
    ctx = ''.join(lines[ctx_start:ctx_end])
    print('--- context ---')
    print(ctx)
    print('---------------')
    sys.exit(1)
if stack:
    opener, ol, oc = stack[-1]
    print(f'Unclosed opener {opener} at {ol}:{oc}')
    sys.exit(1)
print('OK: balanced')
