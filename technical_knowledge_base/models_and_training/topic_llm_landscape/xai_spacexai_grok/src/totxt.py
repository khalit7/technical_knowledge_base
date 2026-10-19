import re,html,sys
for f in sys.argv[1:]:
    s=open(f,errors='ignore').read()
    s=re.sub(r'<(script|style|noscript|svg)[^>]*>.*?</\1>','',s,flags=re.S|re.I)
    s=re.sub(r'<(br|p|div|li|h\d|tr)[^>]*>','\n',s,flags=re.I)
    t=html.unescape(re.sub(r'<[^>]+>',' ',s));t=re.sub(r'[ \t\xa0]+',' ',t);t=re.sub(r'\n\s*\n+','\n',t)
    open(f.rsplit('.',1)[0]+'.txt','w').write(t)
    print(f,len(t))
