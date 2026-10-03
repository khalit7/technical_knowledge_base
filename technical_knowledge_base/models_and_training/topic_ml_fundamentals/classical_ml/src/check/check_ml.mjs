// Compare the page's JS engine (parts/30_js_ml.js) with scikit-learn's outputs (check/ref.json from ref_sklearn.py).
// Run from src/: node check/check_ml.mjs   (writes check/summary.json)
import fs from 'fs';
eval(fs.readFileSync('parts/30_js_ml.js','utf8'));
const ML=globalThis.ML,R=JSON.parse(fs.readFileSync('check/ref.json')),D=JSON.parse(fs.readFileSync('inputs/datasets.json'));
const out={};const mx=(a,b)=>Math.max(...a.map((v,i)=>Math.abs(v-b[i])));
const agree=(a,b,t)=>a.filter((v,i)=>(v>t)===(b[i]>t)).length/a.length;
for(const [k,d] of Object.entries(D.lab)){
  const r=R.lab[k],X=d.Xtr,y=d.ytr,G=r.grid,o={};
  const lr=ML.logreg(X,y,1);o.logreg_coef=mx([...lr.coef,lr.b0],[...r.logreg.coef,r.logreg.b0]);o.logreg_p=mx(G.map(x=>lr.predict(x)),r.logreg.p);
  o.knn=Object.fromEntries(Object.entries(r.knn).map(([kk,p])=>[kk,mx(G.map(x=>ML.knn(X,y,+kk).predict(x)),p)]));
  o.tree=Object.fromEntries(Object.entries(r.tree).map(([dep,t])=>{const m=ML.tree(X,y,null,{maxDepth:dep==='None'?null:+dep});return [dep,{maxdiff:mx(G.map(x=>m.predict(x)),t.p),leaves:[m.leaves(),t.leaves]}]}));
  const bag=ML.forest(X,y,{nTrees:25,seed:7,treeSeed:ML.SK_SEEDS[0]});o.bag=mx(G.map(x=>bag.predict(x)),r.bag25_seed7);
  const accs=[];for(let s=0;s<10;s++){const f=ML.forest(X,y,{nTrees:100,seed:100+s,maxFeatures:1});accs.push(d.Xte.filter((x,i)=>(f.predict(x)>0.5?1:0)===d.yte[i]).length/d.yte.length)}
  const mean=a=>a.reduce((p,q)=>p+q,0)/a.length;o.rf_acc={js:mean(accs),sk:mean(r.rf_acc)};
  o.gb=Object.fromEntries(Object.entries(r.gb).map(([dep,dec])=>{const g=ML.gboost(X,y,{nStages:50,lr:0.1,maxDepth:+dep,seeds:ML.SK_SEEDS});return [dep,mx(G.map(x=>g.raw(x)),dec)]}));
  o.svm={};for(const [key,s] of Object.entries(r.svm)){const [kern,C,gam]=key.split('_');const m=ML.svm(X,y,{kernel:kern,C:+C,gamma:+gam});const dj=G.map(x=>m.decision(x));
    o.svm[key]={maxdiff:mx(dj,s.dec),maxdiff_noshrink:mx(dj,s.dec_noshrink),sign_agree:agree(dj,s.dec,0),nsv:[m.sv.length,s.nsv],sv_same:JSON.stringify(m.sv)===JSON.stringify(s.sv)}}
  out[k]=o;
}
const mc=D.mcycle,Xm=mc.x.map(v=>[v]),xg=R.mcycle.xg.map(v=>[v]);
const gb=ML.gboost(Xm,mc.y,{task:'reg',nStages:100,lr:0.3,maxDepth:2,seeds:ML.SK_SEEDS});
out.mcycle={gb:mx(xg.map(x=>gb.predict(x)),R.mcycle.gb),tree:mx(xg.map(x=>ML.tree(Xm,mc.y,null,{task:'reg'}).predict(x)),R.mcycle.tree),
  bag:mx(xg.map(x=>ML.forest(Xm,mc.y,{task:'reg',nTrees:50,seed:11,treeSeed:ML.SK_SEEDS[0]}).predict(x)),R.mcycle.bag50_seed11),
  gb_mse:mx([...Array(100).keys()].map(m=>Xm.reduce((a,x,i)=>a+(gb.predict(x,m+1)-mc.y[i])**2,0)/Xm.length),R.mcycle.gb_train_mse)};
const fa=D.faithful,P=fa.x.map((v,i)=>[v,fa.y[i]]),mu=[0,1].map(d=>P.reduce((a,p)=>a+p[d],0)/P.length),sd=[0,1].map(d=>Math.sqrt(P.reduce((a,p)=>a+(p[d]-mu[d])**2,0)/P.length));
const Z=P.map(p=>[(p[0]-mu[0])/sd[0],(p[1]-mu[1])/sd[1]]);
const km=ML.kmeans(Z,[Z[0],Z[1],Z[2]]);out.kmeans={centers:mx(km.C.flat(),R.kmeans.centers.flat()),inertia:[km.inertia,R.kmeans.inertia]};
const g0=ML.gmmInit(Z,[Z[0],Z[1]]);out.gmm={};
for(const it of [1,5,30]){const g=ML.gmm(Z,g0,it).g,r=R.gmm[it];out.gmm[it]=mx([...g.w,...g.mu.flat(),...g.S.flat(2)],[...r.w,...r.mu.flat(),...r.S.flat(2)])}
out.dbscan={};for(const [key,lab] of Object.entries(R.dbscan)){const [nm,eps,ms]=key.split('_');const Q=D[nm].x.map((v,i)=>[v,D[nm].y[i]]);const j=ML.dbscan(Q,+eps,+ms);out.dbscan[key]={same:JSON.stringify(j.lab)===JSON.stringify(lab),clusters:j.nClusters,diff:j.lab.filter((v,i)=>v!==lab[i]).length}}
out.pca={};for(const nm of ['std','raw']){const p=ML.pca(D.wine.X,nm==='std');out.pca[nm]={ratio:mx(p.ratio,R.pca[nm].ratio),c0:mx(p.comps[0],R.pca[nm].c0),c1:mx(p.comps[1],R.pca[nm].c1),r01:p.ratio.slice(0,2)}}
fs.writeFileSync('check/summary.json',JSON.stringify(out,null,1));console.log(JSON.stringify(out,null,0).slice(0,6000));
