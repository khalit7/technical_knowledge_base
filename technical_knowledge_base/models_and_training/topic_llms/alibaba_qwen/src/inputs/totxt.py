import re,html,sys
for f in sys.argv[1:]:
    s=open(f,errors='ignore').read()
    s=re.sub(r'<math[^>]*alttext="([^"]*)".*?</math>',lambda m:' $'+m.group(1)+'$ ',s,flags=re.S)
    t=re.sub(r'<script.*?</script>|<style.*?</style>','',s,flags=re.S);t=re.sub(r'</(p|div|h[1-6]|tr|li|figcaption)>','\n',t);t=re.sub(r'<td[^>]*>',' | ',t);t=html.unescape(re.sub(r'<[^>]+>',' ',t));t=re.sub(r'[ \t]+',' ',t);t=re.sub(r'\n\s*\n+','\n',t)
    open(f.replace('.html','.txt'),'w').write(t)
