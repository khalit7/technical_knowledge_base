"""Extract the paper's text, with page markers, from the arXiv PDF (the arXiv HTML of 2608.15089v1 failed to convert:
only the title block renders), and list where each section, figure and table starts, for the page links.
usage: curl -sL https://arxiv.org/pdf/2608.15089v1 -o $SCRATCH/sm.pdf; python3 extract_paper.py $SCRATCH/sm.pdf
(needs poppler's pdftotext; writes inputs/paper_v1.txt and inputs/pages.txt). The LaTeX source (arxiv.org/src/2608.15089v1)
was used to transcribe the tables in mk_tables.py; it is not kept."""
import re, subprocess, sys
pdf = sys.argv[1]
n = int(re.search(r'Pages:\s+(\d+)', subprocess.run(['pdfinfo', pdf], capture_output=True, text=True).stdout).group(1))
out, idx = ['Source: https://arxiv.org/pdf/2608.15089v1 (extracted by extract_paper.py, one block per PDF page)\n'], []
for i in range(1, n + 1):
    t = subprocess.run(['pdftotext', '-f', str(i), '-l', str(i), pdf, '-'], capture_output=True, text=True).stdout
    out.append('\n=== page %d ===\n%s' % (i, t))
    for m in re.finditer(r'^(\d(?:\.\d)? [A-Z$][^\n]{3,80}|[A-C] [A-Z][a-z][^\n]{3,60}|(?:Figure|Table) \d+)', t, re.M):
        idx.append('p%d\t%s' % (i, m.group(1).strip()))
open('inputs/paper_v1.txt', 'w').write(''.join(out))
open('inputs/pages.txt', 'w').write('\n'.join(dict.fromkeys(idx)) + '\n')
print('pages', n, 'index lines', len(idx))
