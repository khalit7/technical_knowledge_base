"""Does Milvus Lite build the HNSW index it reports? Uniform random 256-d unit vectors (hardest case for a graph index),
the same HNSW parameters in FAISS and in Milvus Lite, ef=10. A real HNSW loses recall here; a flat scan returns 1.0.
Run: <mapenv>/bin/python -I checks_milvus_lite.py <db path>. Result recorded in inputs/checks_stores.json (milvus_lite_hard)."""
import numpy as np, os, sys, faiss
from pymilvus import MilvusClient
N,D,K=20000,256,10
r=np.random.default_rng(3); X=r.normal(size=(N,D)).astype('float32'); X/=np.linalg.norm(X,axis=1,keepdims=True)
Q=r.normal(size=(50,D)).astype('float32'); Q/=np.linalg.norm(Q,axis=1,keepdims=True)
ex=np.argsort(-(Q@X.T),axis=1)[:,:K]
rec=lambda F: float(np.mean([len(set(map(int,f))&set(e))/K for f,e in zip(F,ex)]))
h=faiss.IndexHNSWFlat(D,16,faiss.METRIC_INNER_PRODUCT); h.hnsw.efConstruction=64; h.add(X); h.hnsw.efSearch=10; _,I=h.search(Q,K)
print('faiss HNSW M16 efc64 ef10 recall', rec(I))
c=MilvusClient(sys.argv[1])
if c.has_collection('h'): c.drop_collection('h')
from pymilvus import DataType
sch=c.create_schema(auto_id=False); sch.add_field('id',DataType.INT64,is_primary=True); sch.add_field('vector',DataType.FLOAT_VECTOR,dim=D)
ip=c.prepare_index_params(); ip.add_index(field_name='vector',index_type='HNSW',metric_type='COSINE',params={'M':16,'efConstruction':64})
c.create_collection('h',schema=sch,index_params=ip)
for s in range(0,N,5000): c.insert('h',[{'id':i,'vector':X[i].tolist()} for i in range(s,s+5000)])
c.flush('h') if hasattr(c,'flush') else None
print(c.describe_index('h','vector'))
res=c.search('h',data=Q.tolist(),limit=K,search_params={'params':{'ef':10}})
print('milvus lite "HNSW" ef10 recall', rec([[x['id'] for x in r] for r in res]))
