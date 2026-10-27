// ---- The toy world, rebuilt from window.RAGW.world exactly as world.py builds it ----
// WORLD.index(year) -> documents [{kind, ent, toks}], WORLD.questions -> [{task, tpl, x, y, gold, split}], WORLD.show(tokens) -> text
(function(g){
  const R=g.RAGW;if(!R)return;const w=R.world,SY=w.syl,CI={};[...w.sylc].forEach((c,i)=>CI[c]=i);
  const names=s=>{const o=[];for(let i=0;i<s.length;i+=3)o.push([0,1,2].map(j=>SY[CI[s[i+j]]]));return o};
  const C=names(w.countries),K=names(w.capitals),P18=names(w.pres18),P16x=names(w.pres16),A=names(w.authors),Bk=names(w.books);
  const P16=P18.slice();w.changed.forEach((i,j)=>P16[i]=P16x[j]);
  const books=A.map((_,i)=>[Bk[2*i],Bk[2*i+1]]),people=P18.concat(w.changed.map(i=>P16[i]));
  const born=new Map();people.forEach((p,i)=>born.set(p.join(' '),K[w.born[i]]));
  const testC=new Set(w.test_c),testA=new Set(w.test_a);
  const countryDoc=(i,pres)=>[...C[i],':','capital',...K[i],'.','president',...pres[i],'.'];
  const common=[];
  people.forEach(p=>common.push({kind:'person',ent:p,toks:[...p,':','born','in',...born.get(p.join(' ')),'.']}));
  A.forEach((a,i)=>{const [b1,b2]=books[i];common.push({kind:'book',ent:b1,toks:[...b1,':','first','novel','by',...a,'.']});common.push({kind:'book',ent:b2,toks:[...b2,':','second','novel','by',...a,'.']})});
  const idx={};['2018','2016'].forEach(y=>{const pres=y==='2018'?P18:P16;idx[y]=C.map((c,i)=>({kind:'country',ent:c,i,toks:countryDoc(i,pres)})).concat(common)});
  const nC=C.length,nP=people.length,qs=[];
  function q(task,ent,ans,gold,split,meta){w.templates[task].forEach((tpl,t)=>{const x=[];tpl.forEach(v=>{if(v==='X')x.push(...ent);else x.push(v)});qs.push(Object.assign({task,tpl:t,x,y:ans.slice(),gold,split},meta))})}
  for(let i=0;i<nC;i++){const sp=testC.has(i)?'test':'train';q('president',C[i],P18[i],[i],sp,{ci:i});q('capital',C[i],K[i],[i],sp,{ci:i})}
  const presC=new Map();P18.forEach((p,i)=>presC.set(p.join(' '),i));w.changed.forEach(i=>presC.set(P16[i].join(' '),i));
  people.forEach((p,k)=>{const sp=testC.has(presC.get(p.join(' ')))?'test':'train';q('born',p,born.get(p.join(' ')),[nC+k],sp,{pi:k})});
  A.forEach((a,i)=>{const sp=testA.has(i)?'test':'train';const [b1,b2]=books[i];q('novels',a,['first',...b1,'second',...b2],[nC+nP+2*i,nC+nP+2*i+1],sp,{ai:i})});
  // display: syllable runs become capitalised names ("ko ma bo" -> "Komabo")
  function show(toks){const out=[];let run=[];const flush=()=>{if(run.length){const s=run.join('');out.push(s[0].toUpperCase()+s.slice(1));run=[]}};
    toks.forEach(t=>{if(SY.includes(t))run.push(t);else{flush();out.push(t)}});flush();return out.join(' ').replace(/ ([.:?])/g,'$1')}
  const nm=n=>show(n);
  g.WORLD={C,K,P18,P16,A,books,people,changed:w.changed,testC,testA,index:y=>idx[y],questions:qs,show,nm,born,syl:SY};
})(typeof window!=='undefined'?window:globalThis);
