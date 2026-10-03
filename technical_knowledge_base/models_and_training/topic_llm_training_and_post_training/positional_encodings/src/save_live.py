# Copies the Notion fetch of "Positional Encodings" (2026-10-03, page as of 2026-09-20) verbatim from the
# session transcript into live.md. Run once; the transcript path is the build session's.
import json,sys
T=sys.argv[1]
for line in open(T):
    o=json.loads(line)
    c=o.get('message',{}).get('content')
    if not isinstance(c,list): continue
    for b in c:
        if b.get('type')!='tool_result': continue
        cc=b.get('content');txt=cc if isinstance(cc,str) else ''.join(x.get('text','') for x in cc if isinstance(x,dict))
        if '"title":"Positional Encodings"' in txt and '<content>' in txt:
            d=json.loads(txt);t=d['text']
            open('live.md','w').write(t+'\n');print('saved',len(t));sys.exit()
print('not found')
