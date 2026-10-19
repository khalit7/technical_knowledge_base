import json,sys,shutil,os
S,R=sys.argv[1],sys.argv[2]
st=json.load(open(f"{S}/la/setup/st_totals.json"))
fetched={l.split('\t')[0]:l.rstrip('\n').split('\t') for l in open(f"{S}/la/dl/configs/fetched.tsv")}
orig={}
for L in ['cfg_list.tsv','cfg_list2.tsv']:
  for l in open(f"{S}/la/setup/{L}"):
    p=l.rstrip('\n').split('\t'); orig[p[0]]=p[1]
def num(s):
  if s=='-': return None
  m={'T':1e12,'B':1e9,'M':1e6}[s[-1]]; return round(float(s[:-1])*m)
out=[]
for l in open(f"{S}/la/setup/pub.tsv"):
  k,tot,act,kind,src,note=l.rstrip('\n').split('\t')
  f=fetched[k]; c=json.load(open(f"{S}/la/dl/configs/{k}.json"))
  shutil.copy(f"{S}/la/dl/configs/{k}.json",f"{R}/configs/{k}.json")
  s=st.get(k,{})
  out.append({'key':k,'file':f'{k}.json','official_repo':orig[k],'config_fetched_from':f[1],
    'config_url':f"https://huggingface.co/{f[1]}/raw/main/config.json",'revision':f[2],'fetched':f[3],
    'model_type':c.get('model_type'),'kind':kind,
    'published_total_params':num(tot),'published_active_params':num(act) if act!='-' else None,
    'published_label':tot+(' / '+act+' active' if act!='-' else ''),'published_source':src,
    'safetensors_total':s.get('st_total'),'safetensors_by_dtype':s.get('st_by_dtype'),'safetensors_source':f"https://huggingface.co/api/models/{s.get('repo')}?expand[]=safetensors" if s else None,
    'license':s.get('license_name') or s.get('license'),'hf_created':(s.get('created') or '')[:10],'note':note})
json.dump({'what':'config.json of real models (config only, no weights) for the calculator, the attention lab and the architecture map. Published counts are vendor claims from the source named; safetensors_total is the Hugging Face API count of stored tensors (includes vision towers, MTP heads, FP8 scale tensors; for the MXFP4 experts of gpt-oss it counts each value as one parameter, not packed bytes, as the exact match of the Config calculator shows, checked 2026-10-19).',
  'fetched':'2026-10-18','models':out},open(f"{R}/configs/manifest.json",'w'),indent=1)
print(len(out))
