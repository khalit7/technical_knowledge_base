"""PII rail on 200 nvidia/Nemotron-PII test records (CC BY 4.0, synthetic, gold character spans).
Two detectors: (1) a regex rail written here (email, URL, IPv4, phone, card number, SSN, ISO and slash dates) and
(2) urchade/gliner_multi_pii-v1 (Apache 2.0) at threshold 0.2 with the label list below, keeping each span's score so
the page can apply any higher threshold. Writes pii_out.json: per record, predicted spans [start, end, label, score, src]."""
import json, re, time, torch
torch.set_num_threads(2)
from gliner import GLiNER
R = json.load(open('pii_sample.json'))
RX = [('email', r'[\w.+-]+@[\w-]+\.[\w.-]+'), ('url', r'https?://\S+|www\.\S+'), ('ipv4', r'\b\d{1,3}(?:\.\d{1,3}){3}\b'),
      ('card', r'\b(?:\d[ -]?){13,19}\b'), ('ssn', r'\b\d{3}-\d{2}-\d{4}\b'),
      ('phone', r'(?:\+?\d{1,3}[ .-]?)?\(?\d{3}\)?[ .-]?\d{3}[ .-]?\d{4}\b'),
      ('date', r'\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}/\d{1,2}/\d{2,4}\b')]
LAB = ['person', 'email', 'phone number', 'address', 'credit card number', 'social security number', 'date of birth',
       'bank account number', 'medical record number', 'passport number', 'ip address', 'username', 'password',
       'organization', 'date', 'location', 'license plate number', 'customer id']
m = GLiNER.from_pretrained('urchade/gliner_multi_pii-v1')
out = []
t_rx = t_gl = 0.0
for i, r in enumerate(R):
    t = r['text']; preds = []
    t0 = time.time()
    for lab, pat in RX:
        for mm in re.finditer(pat, t): preds.append([mm.start(), mm.end(), lab, 1.0, 'rx'])
    t_rx += time.time() - t0
    t0 = time.time()
    # GLiNER has a 384-word window: run it on chunks of about 150 words
    words = [(mm.start(), mm.end()) for mm in re.finditer(r'\S+', t)]
    for a in range(0, len(words), 150):
        s, e = words[a][0], words[min(a + 150, len(words)) - 1][1]
        for ent in m.predict_entities(t[s:e], LAB, threshold=0.2):
            preds.append([s + ent['start'], s + ent['end'], ent['label'], round(float(ent['score']), 4), 'gl'])
    t_gl += time.time() - t0
    out.append(dict(uid=r['uid'], preds=preds))
    if i % 20 == 0: print(i, flush=True)
json.dump(dict(out=out, ms_rx=round(1000 * t_rx / len(R), 3), ms_gl=round(1000 * t_gl / len(R), 1)), open('pii_out.json', 'w'))
print('done', t_rx, t_gl, flush=True)
