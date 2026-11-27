"""Extract a blog post's main text to src/inputs/article.txt (the text every ar: link fragment is checked against).

usage (from this src/ folder):
  curl -sL -A 'Mozilla/5.0' <article url> -o <scratch>/post.html        # never into the repo: the HTML is not ours
  python3 -I extract_article.py <scratch>/post.html 2026-11-27            # the fetch date goes into the extract's header

What the next article builder changes: URL and START/END (the tags that bound the article's main text on its site:
Distill uses <d-article> ... </d-article>; Thinking Machines' Connectionism blog <article class="content">; a Substack post <div class="body markup">; a plain blog <article>), and DROP
(page furniture inside those bounds). Everything else is generic:
  - every block (paragraph, heading, list item, table cell) ends with a newline, so a fragment that would span two
    blocks (which browsers do not match) is not found and the build stops;
  - math is kept as its TeX/alttext, scripts, styles and SVG drawings are dropped, block ends become newlines;
  - footnotes (<d-footnote>) are kept inline in [brackets], citations (<d-cite key=..>) become [cite: key];
  - author emails become "[email removed]" and long dashes "--" (writing-style.md: no em-dashes in saved extracts);
  - curly quotes and apostrophes are kept exactly as the page has them, because a text fragment must match the page's
    own characters (build.sh normalises them on both sides before comparing, so a page part may type plain ones).
"""
import html, re, sys

URL = 'https://rohanbansal.com/qorl'
START, END = '<article class="research-prose">', '</article>'
DROP = [r'<d-cite[^>]*key="([^"]*)"[^>]*>\s*</d-cite>',  # Distill citations (unused on this site)
        r'<div class="horizontal-scroll-controls".*?</div>',  # table scroll buttons
        r'<button\b.*?</button>', r'<ui-segmented-control\b.*?</ui-segmented-control>',
        r'<label[^>]*class="sidenote-number"[^>]*>\s*</label>', r'<input[^>]*class="margin-toggle"[^>]*/?>',
        r'<span class="sidenote-citation-separator">.*?</span>']
# rohanbansal.com (Astro): code blocks are one <span class="line"> per line; each line becomes its own block below


def balanced(x, opener, repl):
    """replace every <span ...opener...> ... </span> (nested spans counted) by repl(inner html)"""
    out, i = [], 0
    while True:
        j = x.find(opener, i)
        if j < 0:
            return ''.join(out) + x[i:]
        k, depth = x.index('>', j) + 1, 1
        while depth:
            a, b = x.find('<span', k), x.find('</span>', k)
            if a != -1 and a < b:
                depth, k = depth + 1, x.index('>', a) + 1
            else:
                depth, k = depth - 1, b + 7
        out.append(x[i:j]); out.append(repl(x[x.index('>', j) + 1:k - 7])); i = k


def txt(x):
    x = re.sub(DROP[0], lambda m: ' [cite: ' + m.group(1) + ']', x)
    x = re.sub(r'<d-footnote>(.*?)</d-footnote>', lambda m: ' [footnote: ' + m.group(1) + ']', x, flags=re.S)
    x = balanced(x, '<span class="katex-html"', lambda inner: '')  # KaTeX's visual copy; the TeX annotation below is kept
    for d in DROP[1:]:
        x = re.sub(d, '', x, flags=re.S)
    # sidenotes become their own bracketed block, so no text fragment spans a note and the sentence around it
    x = balanced(x, '<span data-typography="article-note"', lambda inner: '\n[note: ' + inner + ']\n')
    x = re.sub(r'<math[^>]*alttext="([^"]*)"[^>]*>.*?</math>', lambda m: ' $' + m.group(1) + '$ ', x, flags=re.S)
    x = re.sub(r'<math\b.*?<annotation encoding="application/x-tex">(.*?)</annotation>.*?</math>', lambda m: ' $' + m.group(1) + '$ ', x, flags=re.S)
    x = re.sub(r'<(script|style|svg|noscript)\b[^>]*>.*?</\1>', '', x, flags=re.S | re.I)
    x = re.sub(r'<!--.*?-->', '', x, flags=re.S)
    x = re.sub(r'<span class="line">', '\n', x)  # one code line per line (rohanbansal.com's Shiki code blocks)
    x = re.sub(r'<br\s*/?>', '\n', x)
    x = re.sub(r'</(p|h\d|div|tr|li|figcaption|summary|table|ul|ol|figure)>', '\n', x)
    x = re.sub(r'<h(\d)[^>]*>', lambda m: '\n' + '#' * int(m.group(1)) + ' ', x)
    x = re.sub(r'</t[dh]>', '\n', x)  # table cells are separate blocks: a text fragment cannot span them in a browser
    x = re.sub(r'<[^>]+>', '', x)
    x = html.unescape(x)
    x = x.replace('\u2014', '--').replace('\u2013', '--')
    x = re.sub(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}', '[email removed]', x)
    x = re.sub(r'[ \t ]+', ' ', x)
    x = '\n'.join(l.strip() for l in x.split('\n'))
    return re.sub(r'\n{3,}', '\n\n', x).strip() + '\n'


if __name__ == '__main__':
    s = open(sys.argv[1], encoding='utf-8').read()
    fetched = sys.argv[2] if len(sys.argv) > 2 else 'unknown date'
    a, b = s.index(START), s.index(END)
    t = txt(s[a:b])
    words = len(t.split())
    head = 'Source: %s (fetched %s; main text extracted by extract_article.py; %d words, %d min at 230 words a minute)\n\n' % (URL, fetched, words, round(words / 230))
    open('inputs/article.txt', 'w', encoding='utf-8').write(head + t)
    # element ids inside the article: the only targets an ah:<id> link may use (build.sh checks them)
    ids = sorted(set(re.findall(r'\sid="([^"]+)"', s[a:b])))
    open('inputs/anchors.txt', 'w', encoding='utf-8').write('\n'.join(ids) + '\n')
    print('article.txt', words, 'words', round(words / 230), 'min')
