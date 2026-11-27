"""Extract a blog post's main text to src/inputs/article.txt (the text every ar: link fragment is checked against).

usage (from this src/ folder):
  curl -sL -A 'Mozilla/5.0' <article url> -o <scratch>/post.html        # never into the repo: the HTML is not ours
  python3 -I extract_article.py <scratch>/post.html 2026-11-27            # the fetch date goes into the extract's header

What the next article builder changes: URL and START/END (the tags that bound the article's main text on its site:
Distill uses <d-article> ... </d-article>; a Substack post <div class="body markup">; a plain blog <article>), and DROP
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

URL = 'https://epoch.ai/publications/the-plunging-price-of-thought'
START, END = '<h2 id="key-takeaways">', '<h2 id="about-the-authors"'  # epoch.ai (Astro): key takeaways to the end of the appendices, before the author bios
DROP = [r'<d-cite[^>]*key="([^"]*)"[^>]*>\s*</d-cite>']


def txt(x):
    x = re.sub(DROP[0], lambda m: ' [cite: ' + m.group(1) + ']', x)
    x = re.sub(r'<d-footnote>(.*?)</d-footnote>', lambda m: ' [footnote: ' + m.group(1) + ']', x, flags=re.S)
    x = re.sub(r'<math[^>]*alttext="([^"]*)"[^>]*>.*?</math>', lambda m: ' $' + m.group(1) + '$ ', x, flags=re.S)
    x = re.sub(r'<svg\b[^>]*/>', '', x)  # self-closing figure placeholders (this site draws its figures with JS)
    x = re.sub(r'<(?=[\s\d=\\])', '&lt;', x)  # a bare "<" inside TeX (k^T x < 0) is not a tag
    x = re.sub(r'<(script|style|svg|noscript)\b[^>]*>.*?</\1>', '', x, flags=re.S | re.I)
    x = re.sub(r'<!--.*?-->', '', x, flags=re.S)
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
    ids = sorted(set(x or y for x, y in re.findall(r'\sid=(?:"([^"]+)"|([^\s>"]+))', s[a:b])))  # quoted or unquoted (Hugo minifies)
    open('inputs/anchors.txt', 'w', encoding='utf-8').write('\n'.join(ids) + '\n')
    print('article.txt', words, 'words', round(words / 230), 'min')
