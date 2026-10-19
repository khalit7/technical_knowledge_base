import sys,re,html
s=open(sys.argv[1],encoding='utf-8',errors='ignore').read()
s=re.sub(r'(?is)<(script|style|noscript|svg)[^>]*>.*?</\1>',' ',s)
s=re.sub(r'(?i)<br\s*/?>|</(p|div|h[1-6]|li|tr|table|section|article)>','\n',s)
s=re.sub(r'<[^>]+>',' ',s);s=html.unescape(s)
s=re.sub(r'[ \t\xa0]+',' ',s);s=re.sub(r'\n\s*\n+','\n',s)
print(s)
