import os,re,json,sys
LIBS=['transformers','accelerate','peft','trl','datasets','deepspeed','megatron','vllm','sglang','torchao','lightning','pytorch_lightning','torchtitan','triton','kernels','liger_kernel','flash_attn','transformer_engine','apex','bitsandbytes','executorch','torchdata','safetensors','unsloth','composer','colossalai','ray','torchft','helion','diffusers','timm']
R={l:re.compile(r'^\s*(from|import)\s+'+l+r'\b',re.M) for l in LIBS}
root=sys.argv[1];out={}
for lib in sorted(os.listdir(root)):
    cnt={l:0 for l in LIBS}
    for dp,dn,fn in os.walk(os.path.join(root,lib)):
        if re.search(r'/(tests?|testing|examples?|benchmarks?|docs)(/|$)',dp): continue
        for f in fn:
            if not f.endswith('.py'): continue
            s=open(os.path.join(dp,f),encoding='utf-8',errors='ignore').read()
            for l,r in R.items():
                if r.search(s): cnt[l]+=1
    me={'megatron_core':'megatron','mosaicml':'composer','liger_kernel':'liger_kernel','lightning':'lightning'}.get(lib,lib)
    cnt.pop(me,None)
    if lib=='lightning': cnt.pop('pytorch_lightning',None)
    out[lib]={k:v for k,v in cnt.items() if v}
    print(lib.ljust(14),out[lib])
json.dump(out,open('deps.json','w'),indent=0)
