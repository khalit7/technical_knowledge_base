import json,sys,urllib.request
lists=sys.argv[1:-1]; out=sys.argv[-1]; res={}
for L in lists:
  for line in open(L):
    p=line.rstrip('\n').split('\t'); key=p[0]
    for r in p[1:]:
      if r=='-': continue
      try:
        d=json.load(urllib.request.urlopen(f"https://huggingface.co/api/models/{r}?expand[]=safetensors&expand[]=cardData&expand[]=createdAt",timeout=30))
      except Exception as e:
        continue
      st=d.get('safetensors') or {}
      cd=d.get('cardData') or {}
      res[key.replace('jamba-mini-1.5','jamba-v0.1')]={'repo':r,'st_total':st.get('total'),'st_by_dtype':st.get('parameters'),'license':cd.get('license'),'license_name':cd.get('license_name'),'created':d.get('createdAt')}
      if st.get('total'): break
json.dump(res,open(out,'w'),indent=1)
for k,v in res.items(): print(k,v['repo'],v['st_total'],v['st_by_dtype'],v['license'],(v['created'] or '')[:10])
