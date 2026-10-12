import os,re,json,sys
P={
 'ddp':r'\bDistributedDataParallel\b',
 'fsdp1':r'\bFullyShardedDataParallel\b',
 'fsdp2':r'\bfully_shard\b',
 'dtensor':r'\bDTensor\b|\bdistribute_tensor\b',
 'mesh':r'\binit_device_mesh\b|\bDeviceMesh\b',
 'tp':r'\bparallelize_module\b|\bColwiseParallel\b|\bRowwiseParallel\b',
 'pp':r'torch\.distributed\.pipelining|\bPipelineStage\b',
 'cp':r'\bcontext_parallel\b',
 'dcp':r'torch\.distributed\.checkpoint\b',
 'compile':r'\btorch\.compile\(',
 'export':r'\btorch\.export\.export\b|from torch\.export import|\btorch\.export\.load\b',
 'ckpt':r'torch\.utils\.checkpoint\b|\bcheckpoint_wrapper\b',
 'sdpa':r'\bscaled_dot_product_attention\b',
 'flex':r'\bflex_attention\b',
 'library':r'\btorch\.library\b',
 'triton':r'^\s*import triton\b|^\s*from triton\b|@triton\.jit',
 'torchao':r'^\s*(from|import) torchao\b',
 'afunc':r'torch\.autograd\.Function\b',
 'subclass':r'__torch_dispatch__',
 'deepspeed':r'^\s*(from|import) deepspeed\b',
 'megatron':r'^\s*(from|import) megatron\b',
 'te':r'^\s*(from|import) transformer_engine\b',
 'fsdp_mp':r'\bMixedPrecisionPolicy\b',
}
R={k:re.compile(v,re.M) for k,v in P.items()}
root=sys.argv[1];out={}
for lib in sorted(os.listdir(root)):
    res={k:{'files':0,'hits':0,'ex':None,'_s':9} for k in P}
    for dp,dn,fn in os.walk(os.path.join(root,lib)):
        if re.search(r'/(tests?|testing|examples?|benchmarks?|docs)(/|$)',dp): continue
        for f in fn:
            if not f.endswith('.py'): continue
            p=os.path.join(dp,f)
            try: s=open(p,encoding='utf-8',errors='ignore').read()
            except: continue
            for k,r in R.items():
                m=list(r.finditer(s))
                if m:
                    res[k]['files']+=1;res[k]['hits']+=len(m)
                    lines=s.split('\n')
                    def score(mm):
                        ln=s.count('\n',0,mm.start())+1;L=lines[ln-1].strip()
                        if L.startswith(('from ','import ')): return 0,ln
                        if L.startswith('#') or '``' in L or L.startswith(('"','>','*','-')): return 3,ln
                        if '(' in L or '@' in L: return 1,ln
                        return 2,ln
                    best=min(score(mm) for mm in m)
                    if res[k]['ex'] is None or best[0]<res[k]['_s']:
                        res[k]['_s']=best[0];ln=best[1]
                        line=s.split('\n')[ln-1].strip()[:140]
                        rel=os.path.relpath(p,os.path.join(root,lib))
                        rel=re.sub(r'^[^/]*-[0-9][^/]*/','',rel)  # strip sdist top dir
                        res[k]['ex']=f'{rel}:{ln}: {line}'
    out[lib]=res
    print(lib.ljust(15),' '.join(f"{k}={v['files']}" for k,v in res.items() if v['files']))
json.dump(out,open('scan.json','w'),indent=1)
