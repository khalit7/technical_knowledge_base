"""What a keypress costs WorldTUI to decode: token counts for six illustrative 32x96 screen changes, written to
inputs/recompute.json (the hero widget's data and the values check_page.mjs compares the page's JavaScript against).

  python3 recompute.py        (from this src/ folder; stdlib only, deterministic)

The encoding follows the post's "How it sees a terminal" and "Copying rows" and the grammar of the author's public demo
(codec.js, "row-copy v3", read 27 November 2026; never run here):
  - a changed row is ROW_r, then either a start column and the characters from there (nothing is cleared first, so a
    span runs from the first to the last cell that differs), or COPY src (row src of the previous screen) optionally
    followed by a column and characters that overwrite part of the copied row;
  - after the rows: CURSOR row col visible (4 tokens), then OUTPUT_END.
The author's own encoder is not published; ours picks, for each changed row, the cheapest of "write a span" and "copy
row src, then patch a span" over every src. It gives the cost of a frame under the post's rules, not necessarily the
exact tokens the author's training data used.

Counting (stated on the page):
  sequential steps = every generated token: the row ops, CURSOR plus its 3 numbers, OUTPUT_END;
  row-parallel steps = the longest row's op (its ROW_r is given, plus one end token, so the same count) plus the 3
                       cursor numbers decoded after the rows (the demo's default; "3 extra single steps per frame").
The screens are illustrative: a made-up session with the post's own prompt string and screen size.
"""
import json, os

ROWS, COLS = 32, 96
P = 'simedw@laptop:~$ '


def pad(lines):
    out = [l[:COLS].ljust(COLS) for l in lines]
    return out + [' ' * COLS] * (ROWS - len(out))


def span(a, b):
    """first and last differing column of two equal-length rows, or None"""
    d = [i for i in range(COLS) if a[i] != b[i]]
    return (d[0], d[-1]) if d else None


def encode(before, after, allow_copy=True):
    """per changed row: (row, kind, src, col, text, tokens); kind is 'write' or 'copy'"""
    ops = []
    for r in range(ROWS):
        if after[r] == before[r]:
            continue
        s = span(before[r], after[r])
        best = (2 + s[1] - s[0] + 1, 'write', None, s[0], after[r][s[0]:s[1] + 1])
        if allow_copy:
            for src in range(ROWS):
                if src == r:
                    continue
                t = span(before[src], after[r])
                c = (3, 'copy', src, None, '') if t is None else (4 + t[1] - t[0] + 1, 'copy', src, t[0], after[r][t[0]:t[1] + 1])
                if c[0] < best[0]:  # strictly cheaper; ties keep the write, then the lowest src
                    best = c
        ops.append({'row': r, 'kind': best[1], 'src': best[2], 'col': best[3], 'text': best[4], 'tokens': best[0]})
    return ops


def cost(before, after, allow_copy=True):
    ops = encode(before, after, allow_copy)
    seq = sum(o['tokens'] for o in ops) + 4 + 1
    par = (max(o['tokens'] for o in ops) if ops else 1) + 3
    return ops, seq, par


# ---- the illustrative session: a full 32-row screen of an ordinary shell ----
HIST = [
    P + 'ls', 'notes.txt  projects  snake.py  test.txt', P + 'cat notes.txt', 'buy milk', 'fix the build', 'call Anna',
    P + 'cd projects', P.replace('~', '~/projects') + 'ls -l', 'total 12',
    'drwxr-xr-x 2 simedw simedw 4096 Oct 18 09:12 api', 'drwxr-xr-x 2 simedw simedw 4096 Oct 18 09:12 web',
    '-rw-r--r-- 1 simedw simedw  214 Oct 20 17:40 README.md', P.replace('~', '~/projects') + 'cd ..',
    P + 'echo $SHELL', '/bin/bash', P + 'python3 -c "print(6*7)"', '42', P + 'date', 'Tue Oct 21 10:02:11 UTC 2026',
    P + 'wc -l notes.txt', '3 notes.txt', P + 'head -2 test.txt', 'hello from vim', 'second line',
    P + 'echo green >> colors', P + 'cat colors', 'red', 'green', P + 'uname -s', 'Linux', P + 'whoami', 'simedw',
]
assert len(HIST) == 32 - 0, len(HIST)
FULL = HIST[1:]  # 31 history rows; the prompt row is added per scenario


def full_with(cmd):
    return pad(FULL + [P + cmd])


MAN = [
    'TEST(1)                              User Commands                              TEST(1)', '',
    'NAME', '       test - check file types and compare values', '',
    'SYNOPSIS', '       test EXPRESSION', '       test', '       [ EXPRESSION ]', '       [ ]', '       [ OPTION', '',
    'DESCRIPTION', '       Exit with the status determined by EXPRESSION.', '',
    '       An omitted EXPRESSION defaults to false.  Otherwise, EXPRESSION is true or false and sets',
    '       exit status.  It is one of:', '',
    '       ( EXPRESSION )', '              EXPRESSION is true', '',
    '       ! EXPRESSION', '              EXPRESSION is false', '',
    '       EXPRESSION1 -a EXPRESSION2', '              both EXPRESSION1 and EXPRESSION2 are true', '',
    '       EXPRESSION1 -o EXPRESSION2', '              either EXPRESSION1 or EXPRESSION2 is true', '',
    '       -n STRING',
    ' Manual page test(1) line 1 (press h for help or q to quit)',
]
assert len(MAN) == 32, len(MAN)

VIM = ['hello from vim', 'second line', 'third line, typed in insert mode', 'the end'] + ['~'] * 27 + [
    '"test.txt" 4L, 61B' + ' ' * 58 + '1,1           All']
assert len(VIM) == 32, len(VIM)

LOG = []
for i in range(31):
    l = '2026-10-21 10:%02d:%02d INFO worker-%d handled request %d in %d ms; queue depth %d; cache hit ratio 0.%02d; ok' % (
        i // 2, (i * 7) % 60, i % 4, 1000 + i * 37, 20 + (i * 13) % 70, (i * 5) % 9, 50 + (i * 11) % 49)
    LOG.append((l + ' ' + '-' * COLS)[:COLS])

SCEN = [
    {'id': 'type', 'label': 'Type a letter', 'what': 'one letter (l) at a fresh prompt',
     'before': pad([P]), 'after': pad([P + 'l']), 'cursor': [0, 18]},
    {'id': 'enter', 'label': 'Enter at the bottom', 'what': 'Enter on an empty prompt on a full screen: every row moves up one',
     'before': full_with(''), 'after': pad(FULL[1:] + [P, P]), 'cursor': [31, 17]},
    {'id': 'ls', 'label': 'ls (one line out)', 'what': 'ls on a full screen: one line of output, then a new prompt, so the screen scrolls by two',
     'before': full_with('ls'), 'after': pad(FULL[2:] + [P + 'ls', 'colors  notes.txt  projects  snake.py  test.txt', P]), 'cursor': [31, 17]},
    {'id': 'clear', 'label': 'clear', 'what': 'clear on a full screen: one prompt at the top, the rest blank',
     'before': full_with('clear'), 'after': pad([P]), 'cursor': [0, 17]},
    {'id': 'vim', 'label': 'vim test.txt', 'what': 'opening a 4-line file in vim: every row is redrawn',
     'before': full_with('vim test.txt'), 'after': pad(VIM), 'cursor': [0, 0]},
    {'id': 'man', 'label': 'man test', 'what': 'opening a man page: a full screen of new text',
     'before': full_with('man test'), 'after': pad(MAN), 'cursor': [31, 60]},
    {'id': 'wide', 'label': 'cat server.log', 'what': 'printing a log of 96-column lines: every row filled edge to edge, the worst case',
     'before': full_with('cat server.log'), 'after': pad(LOG + [P]), 'cursor': [31, 17]},
]

if __name__ == '__main__':
    out = []
    for s in SCEN:
        ops, seq, par = cost(s['before'], s['after'])
        _, seq0, par0 = cost(s['before'], s['after'], allow_copy=False)
        out.append({k: s[k] for k in ('id', 'label', 'what', 'cursor')} | {
            'before': [l.rstrip() for l in s['before']], 'after': [l.rstrip() for l in s['after']],
            'ops': ops, 'seq': seq, 'par': par, 'seq_nocopy': seq0, 'par_nocopy': par0,
            'rows_changed': len(ops), 'copies': sum(o['kind'] == 'copy' for o in ops)})
        print('%-6s rows %2d copies %2d  seq %4d  (no COPY %4d)  par %3d  ratio %.1f' % (
            s['id'], len(ops), out[-1]['copies'], seq, seq0, par, seq / par))
    # the post's own numbers, and what follows from them by arithmetic (derived; stated on the page with the formula)
    full_redraw = ROWS * (2 + COLS) + 5
    derived = {
        'full_redraw_tokens': full_redraw,                       # every row written in full, 32 x (ROW + col + 96) + cursor + end
        'scroll_copy_tokens_per_row': 3, 'scroll_write_tokens_per_row': 2 + COLS,
        'ms_per_token_4090': round(12000 / 3000, 1),             # "up to 12 s" for "around 3,000 tokens"
        'p95_speedup_4090': round(6.7 / 0.87, 1),                # 6.7 s to 0.87 s
        'man_speedup_m4': round(2.5 / 0.9, 1),                   # 2.5 s to 0.9 s, man test in the browser
        'params_trimmed_M': round(494 - 136 + 384 * 896 / 1e6, 1),  # 494M - 136M embedding + 384 x 896 kept rows
        'bf16_MB': round((494 - 136 + 0.344) * 2),               # 2 bytes a parameter
        'demo_quantized_params': 357826560, 'demo_weight_bytes': 208351744, 'demo_vocab': 334,  # the demo's manifest.json
    }
    print(derived)
    os.makedirs('inputs', exist_ok=True)
    json.dump({'scen': out, 'derived': derived}, open('inputs/recompute.json', 'w', encoding='utf-8'), separators=(',', ':'))
