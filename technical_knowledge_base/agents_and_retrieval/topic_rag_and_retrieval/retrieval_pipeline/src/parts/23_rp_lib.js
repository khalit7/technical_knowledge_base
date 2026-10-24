// ---- rp: shared library for the retrieval_pipeline page (chunkers ported line by line from the root's
// src/pipe/chunkers.py; checked against the Python output by src/check_js.mjs), a small BM25, fusion functions, SVG helpers.
window.RP=(function(){
  const D=window.RPD;
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const f3=x=>(x==null||isNaN(x))?'n/a':(+x).toFixed(3);
  const pct=(x,d)=>(x==null||isNaN(x))?'n/a':(100*x).toFixed(d==null?1:d)+'%';
  const fmt=x=>(x==null||isNaN(x))?'n/a':Math.round(x).toLocaleString('en-GB');
  function undelta(a){const o=new Array(a.length);let p=0;for(let i=0;i<a.length;i++){p+=a[i];o[i]=p}return o}
  function bisectLeft(a,x){let lo=0,hi=a.length;while(lo<hi){const m=(lo+hi)>>1;if(a[m]<x)lo=m+1;else hi=m}return lo}
  // ---------------------------------------------------------------- a paper, as chunkers.Doc
  function Doc(p){
    const d={id:p.id,title:p.title,text:p.text,starts:undelta(p.ts),ends:undelta(p.te),paras:p.paras,qs:p.qs};
    d.ntok=(s,e)=>bisectLeft(d.starts,e)-bisectLeft(d.starts,s);
    d.paragraphs=()=>d.paras.map(x=>[x[0],x[1],x[2]]);
    const SENT=/(?<=[.!?])\s+(?=[A-Z0-9\[(])/g;
    d.sentences=(s,e)=>{const out=[];let a=s;const t=d.text.slice(s,e);SENT.lastIndex=0;let m;
      while((m=SENT.exec(t))){const ms=s+m.index;if(ms>a)out.push([a,ms]);a=ms+m[0].length;if(m[0].length===0)SENT.lastIndex++}
      if(e>a)out.push([a,e]);return out};
    return d;
  }
  // ---------------------------------------------------------------- chunkers (character spans)
  function fixed(doc,size,over){const n=doc.starts.length;let i=0;const out=[];
    while(i<n){const j=Math.min(i+size,n);out.push([doc.starts[i],doc.ends[j-1]]);if(j===n)break;i=j-over}return out}
  function recursive(doc,size,over,seps){
    const text=doc.text;
    const findIn=(x,s,e)=>{const k=text.indexOf(x,s);return (k>=0&&k+x.length<=e)?k:-1};
    function fixedSpan(s,e){const i0=bisectLeft(doc.starts,s),i1=bisectLeft(doc.starts,e);const out=[];let i=i0;
      while(i<i1){const j=Math.min(i+size,i1);out.push([doc.starts[i],doc.ends[j-1]]);if(j===i1)break;i=j-over}return out}
    function merge(pieces){const docs=[];let cur=[],tot=0;
      for(const p of pieces){const n=doc.ntok(p[0],p[1]);
        if(cur.length&&tot+n>size){docs.push([cur[0][0],cur[cur.length-1][1]]);
          while(cur.length&&(tot>over||tot+n>size)){tot-=doc.ntok(cur[0][0],cur[0][1]);cur.shift()}}
        cur.push(p);tot+=n}
      if(cur.length)docs.push([cur[0][0],cur[cur.length-1][1]]);return docs}
    function split(s,e,seps){
      const sep=seps.find(x=>findIn(x,s,e)>=0);
      if(sep===undefined)return fixedSpan(s,e);
      const rest=seps.slice(seps.indexOf(sep)+1);
      let pieces=[],a=s;
      while(true){const k=findIn(sep,a,e);if(k<0){pieces.push([a,e]);break}pieces.push([a,k+sep.length]);a=k+sep.length}
      pieces=pieces.filter(p=>p[1]>p[0]);
      let out=[],good=[];
      for(const p of pieces){if(doc.ntok(p[0],p[1])<size)good.push(p);else{if(good.length){out=out.concat(merge(good));good=[]}
        out=out.concat(rest.length?split(p[0],p[1],rest):fixedSpan(p[0],p[1]))}}
      if(good.length)out=out.concat(merge(good));return out}
    return split(0,text.length,seps).filter(([a,b])=>text.slice(a,b).trim().length>0);
  }
  function pack(doc,units,size){const out=[];let cur=null;
    for(const [s,e] of units){if(cur===null)cur=[s,e];else if(doc.ntok(cur[0],e)<=size)cur[1]=e;else{out.push(cur);cur=[s,e]}}
    if(cur)out.push(cur);return out}
  function sentence(doc,size){let s=[];for(const [a,b] of doc.paragraphs())s=s.concat(doc.sentences(a,b));return pack(doc,s,size)}
  function structure(doc,size){let out=[],bySec=[],last=null;
    for(const [s,e,sec] of doc.paragraphs()){if(sec!==last){if(bySec.length)out=out.concat(pack(doc,bySec,size));bySec=[];last=sec}
      if(doc.ntok(s,e)>size)bySec=bySec.concat(doc.sentences(s,e));else bySec.push([s,e])}
    if(bySec.length)out=out.concat(pack(doc,bySec,size));return out}
  function paragraph(doc){return doc.paragraphs().map(p=>[p[0],p[1]])}
  // ---------------------------------------------------------------- evidence checks (chunk_eval.py)
  function covered(spans,ev){const s=ev[0],e=ev[1];const iv=spans.filter(([a,b])=>b>s&&a<e).map(([a,b])=>[Math.max(a,s),Math.min(b,e)]).sort((x,y)=>x[0]-y[0]);
    let tot=0,cur=null;for(const [a,b] of iv){if(!cur||a>cur[1]){if(cur)tot+=cur[1]-cur[0];cur=[a,b]}else cur[1]=Math.max(cur[1],b)}
    if(cur)tot+=cur[1]-cur[0];return tot/Math.max(1,e-s)}
  const intact=(spans,q)=>q.ev.some(ev=>spans.some(([a,b])=>a<=ev[0]&&ev[1]<=b));
  // ---------------------------------------------------------------- a small BM25 (Lucene idf; no stemmer: an approximation of bm25s)
  const STOP=new Set('a an and are as at be but by for if in into is it no not of on or such that the their then there these they this to was will with'.split(' '));  // bm25s STOPWORDS_EN (33 words)
  const toks=s=>(s.toLowerCase().match(/\b\w\w+\b/g)||[]).filter(w=>!STOP.has(w));
  function bm25(docsText,query,k1,b){k1=k1==null?1.2:k1;b=b==null?0.75:b;
    const D=docsText.map(toks),N=D.length,avg=D.reduce((s,d)=>s+d.length,0)/Math.max(1,N);const df={};
    D.forEach(d=>new Set(d).forEach(t=>df[t]=(df[t]||0)+1));
    const q=toks(query);return D.map(d=>{const tf={};d.forEach(t=>tf[t]=(tf[t]||0)+1);let s=0;
      for(const t of q){if(!tf[t])continue;const idf=Math.log(1+(N-df[t]+.5)/(df[t]+.5));s+=idf*tf[t]/(tf[t]+k1*(1-b+b*d.length/avg))}return s})}
  // ---------------------------------------------------------------- fusion (same conventions as src/exp/fusion_deep.py)
  function norm(list,how){const v=list.map(x=>x[1]);const o={};
    if(how==='minmax'){const lo=Math.min(...v),hi=Math.max(...v);list.forEach(([d,s])=>o[d]=hi>lo?(s-lo)/(hi-lo):0)}
    else{const mu=v.reduce((a,b)=>a+b,0)/v.length,sd=Math.sqrt(v.reduce((a,b)=>a+(b-mu)*(b-mu),0)/v.length);list.forEach(([d,s])=>o[d]=sd>0?(s-mu)/sd:0)}
    return o}
  function fuse(bm,de,method,p){const docs=[...new Set(bm.map(x=>x[0]).concat(de.map(x=>x[0])))];
    const rb={},rd={};bm.forEach((x,i)=>rb[x[0]]=i+1);de.forEach((x,i)=>rd[x[0]]=i+1);const sc={};
    if(method==='rrf')docs.forEach(d=>sc[d]=(rb[d]?1/(p+rb[d]):0)+(rd[d]?1/(p+rd[d]):0));
    else if(method==='wrrf')docs.forEach(d=>sc[d]=(1-p)*(rb[d]?1/(60+rb[d]):0)+p*(rd[d]?1/(60+rd[d]):0));
    else if(method==='raw'){const sb={},sd={};bm.forEach(x=>sb[x[0]]=x[1]);de.forEach(x=>sd[x[0]]=x[1]);
      const fb=Math.min(...bm.map(x=>x[1])),fd=Math.min(...de.map(x=>x[1]));docs.forEach(d=>sc[d]=(1-p)*(d in sb?sb[d]:fb)+p*(d in sd?sd[d]:fd))}
    else if(method==='minmax'||method==='zscore'){const nb=norm(bm,method),nd=norm(de,method);const fb=Math.min(...Object.values(nb)),fd=Math.min(...Object.values(nd));
      docs.forEach(d=>sc[d]=(1-p)*(d in nb?nb[d]:fb)+p*(d in nd?nd[d]:fd))}
    else if(method==='combmnz'){const nb=norm(bm,'minmax'),nd=norm(de,'minmax');docs.forEach(d=>sc[d]=((1-p)*(nb[d]||0)+p*(nd[d]||0))*((d in nb?1:0)+(d in nd?1:0)))}
    return docs.map(d=>[d,sc[d]]).sort((a,b)=>b[1]-a[1]||(a[0]<b[0]?-1:1))}
  function ndcg10(list,rel){let dcg=0;list.slice(0,10).forEach((d,i)=>{const g=rel[d]||0;if(g>0)dcg+=(Math.pow(2,g)-1)/Math.log2(i+2)});
    const ideal=Object.values(rel).filter(g=>g>0).sort((a,b)=>b-a).slice(0,10);let idcg=0;ideal.forEach((g,i)=>idcg+=(Math.pow(2,g)-1)/Math.log2(i+2));return idcg?dcg/idcg:0}
  // ---------------------------------------------------------------- small UI helpers
  const W=el=>RD.width(el);
  const svg=(w,h,body,label)=>RD.svg(w,h,body,label);
  const t=RD.t;
  function onTab(id,f){(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[id]=window.TAB_RENDER[id]||[]).push(f)}
  function seg(el,f){RD.seg(el,f)}
  function resizeFor(tabId,f){let tm=0;addEventListener('resize',()=>{const r=document.getElementById(tabId);if(!r||r.hidden||r.offsetParent===null)return;clearTimeout(tm);tm=setTimeout(f,60)})}
  // a bar row list: rows [{name, v, color, note}] scaled to max
  function bars(rows,max,fmtv){max=max||Math.max(...rows.map(r=>r.v),1e-9);fmtv=fmtv||f3;
    return '<div class="bars">'+rows.map(r=>'<div class="row'+(r.hl?' hl':'')+'"><span class="nm" title="'+esc(r.name)+'">'+esc(r.name)+'</span><span class="track"><span class="fill" style="width:'+Math.max(0,Math.min(100,100*r.v/max)).toFixed(1)+'%;background:'+(r.color||'var(--c1)')+'"></span></span><span class="val">'+fmtv(r.v)+'</span></div>').join('')+'</div>'}
  return {D,esc,f3,pct,fmt,Doc,fixed,recursive,sentence,structure,paragraph,pack,covered,intact,bm25,toks,fuse,ndcg10,W,svg,t,onTab,seg,resizeFor,bars,bisectLeft};
})();
