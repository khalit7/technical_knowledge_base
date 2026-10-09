// ---- Reading section 2: eight toy requests through the radix tree, then through hash blocks of 4 ----
// Frames come from running SG.Radix and SG.Blocks (22_js_sg_core.js) step by step on the toy trace.
(function(){
  const card=document.getElementById('sg-tree-card');if(!card||!window.SG)return;
  const S='You are a bank assistant . Be brief .'.split(' '),T='You are a travel agent . Be brief .'.split(' '),sp=s=>s.split(' ');
  const REQ=[[S.concat(sp('What is my balance ?')),sp('It is $40 .'),'Customer A asks for a balance'],
    [S.concat(sp('Can I open an account ?')),sp('Yes , online .'),'Customer B, same system prompt'],
    [S.concat(sp('What is my balance ?'),sp('It is $40 .'),sp('And savings ?')),sp('$9 .'),'Customer A, second turn: the whole first turn is resent'],
    [T.concat(sp('Book a flight .')),sp('Where to ?'),'A different assistant: only "You are a" is shared'],
    [S.concat(sp('What are your hours ?')),sp('Nine to five .'),'Customer C'],
    [S.concat(sp('What is my balance ?')),sp('It is $40 .'),'Customer D repeats customer A word for word'],
    [T.concat(sp('Book a flight .'),sp('Where to ?'),sp('Paris .')),sp('Done .'),'The travel customer, second turn'],
    [S.concat(sp('What is my loan ?')),sp('None .'),'Customer E: shares 12 tokens with customer A']];
  const CAP=40,BS=4,vocab=new Map(),words=[];
  const id=w=>{if(!vocab.has(w)){vocab.set(w,vocab.size+1);words[vocab.size]=w}return vocab.get(w)};
  const reqs=REQ.map(r=>({p:r[0].map(id),o:r[1].map(id),label:r[2]}));
  const W=i=>words[i];
  // ---- radix frames ----
  function snapRadix(t){const rows=[];(function walk(n,depth,start){for(const c of n.children.values()){rows.push({id:c.id,key:c.key.slice(),start:start,depth:depth,lock:c.lock});walk(c,depth+1,start+c.key.length)}})(t.root,0,0);return rows}
  function framesRadix(){const t=new SG.Radix(CAP),fr=[];let reused=0,prompt=0,ev=0;
    fr.push({rows:[],cap:'An empty tree and an empty pool of '+CAP+' KV slots.',hl:{},c:[0,0,0,0,0,0]});
    reqs.forEach((q,i)=>{const ids=q.p.concat(q.o),P=q.p.length,O=q.o.length;
      t.log=[];const m=t.match(ids.slice(0,P-1)),hit=m[0];t.lockPath(m[1],1);
      const path=new Set();for(let n=m[1];n&&n!==t.root;n=n.parent)path.add(n.id);
      const splitA=t.log.filter(x=>x[0]==='split').length;
      prompt+=P;reused+=hit;
      fr.push({rows:snapRadix(t),hl:{hit:path},req:i,cap:'<b>Request '+(i+1)+' arrives.</b> '+q.label+'. Match walks the tree: <b>'+hit+' of '+P+'</b> prompt tokens are already cached'+(splitA?' (a node was split where the walk stopped)':'')+'. The path is locked so nothing on it can be evicted while the request runs.',
        c:[i+1,prompt,reused,t.nodes-1,ev,CAP-t.free]});
      const need=(P-hit)+(O-1);t.log=[];let e=0;if(t.free<need)e=t.evict(need-t.free);ev+=e;
      const evk=t.log.filter(x=>x[0]==='evict').map(x=>x[2]);
      t.free-=need;t.log=[];const pre=t.insert(ids.slice(0,P+O-1));if(P<P+O-1)t.insert(ids.slice(0,P));t.free+=pre-hit;t.lockPath(m[1],-1);
      const nw=new Set(t.log.filter(x=>x[0]==='new').map(x=>x[1]));
      fr.push({rows:snapRadix(t),hl:{nw:nw},req:i,cap:'<b>Request '+(i+1)+' finishes.</b> It computed '+(P-hit)+' prompt token'+(P-hit===1?'':'s')+' and '+O+' output tokens; its prompt and output, minus the last token, are inserted'+(evk.length?'; to make room, <b>'+evk.length+' unlocked leaf node'+(evk.length>1?'s':'')+' ('+e+' tokens)</b> were evicted, least recently used first':'')+'. The new leaf is split at the prompt boundary so the answer is evicted before the question.',
        c:[i+1,prompt,reused,t.nodes-1,ev,CAP-t.free]})});
    return fr}
  // ---- block frames ----
  function snapBlocks(b){return b.hash.map((h,k)=>({h:h,ref:b.ref[k],lbl:b._lbl[k]||null}))}
  function framesBlocks(){const b=new SG.Blocks(CAP,BS);b._lbl=[];const fr=[];let reused=0,prompt=0,ev=0;
    const cachedN=()=>b.hash.filter(x=>x!==null).length;
    fr.push({blocks:snapBlocks(b),cap:'An empty table of '+(CAP/BS)+' blocks of '+BS+' slots.',c:[0,0,0,0,0,0]});
    reqs.forEach((q,i)=>{const ids=q.p.concat(q.o),P=q.p.length,O=q.o.length;
      const before=b.hash.slice();const r=b.serve(ids,P,O);const hit=r[0];ev+=r[1];prompt+=P;reused+=hit;
      // label blocks by their words (the hash stands for the whole prefix up to and including the block)
      for(let k=0;k<b.n;k++){if(b.hash[k]===null)b._lbl[k]=null;else if(b.hash[k]!==before[k]){/* newly cached */}}
      const nfull=Math.floor((P+O-1)/BS),hitb=hit/BS;
      // recover which block holds each of this request's full blocks: look its chain key up
      const own=[];let h=[0,0];const ch=(par,s,e)=>{let h1=par[0]^0x9e3779b9,h2=par[1]^0x85ebca6b;for(let x=s;x<e;x++){h1=Math.imul(h1^ids[x],0x01000193)>>>0;h2=Math.imul(h2+ids[x]|0,0x5bd1e995)>>>0;h2^=h2>>>13}return [h1>>>0,h2>>>0]};
      for(let k=0;k<nfull;k++){h=ch(h,k*BS,(k+1)*BS);const key=h[0]+':'+h[1];const l=b.cached.get(key);if(l&&l.length){own.push(l[0]);b._lbl[l[0]]=ids.slice(k*BS,(k+1)*BS).map(W).join(' ')}}
      const evicted=before.map((x,k)=>x!==null&&b.hash[k]!==x?k:-1).filter(k=>k>=0);
      fr.push({blocks:snapBlocks(b),req:i,hitset:new Set(own.slice(0,hitb)),newset:new Set(own.slice(hitb)),evset:new Set(evicted),
        cap:'<b>Request '+(i+1)+'.</b> '+q.label+'. Its first '+Math.floor((P-1)/BS)+' full blocks are hashed and looked up: <b>'+hit+' of '+P+'</b> prompt tokens reused ('+hitb+' block'+(hitb===1?'':'s')+'). '+(r[1]?'<b>'+evicted.length+' cached block'+(evicted.length>1?'s were':' was')+' evicted</b> to make room. ':'')+'Only full blocks of prompt and output are kept; '+((P+O-1)%BS)+(((P+O-1)%BS)===1?' token in the last partial block is':' tokens in the last partial block are')+' not reusable.',
        c:[i+1,prompt,reused,cachedN(),ev,cachedN()*BS]})});
    return fr}
  const FR={radix:framesRadix(),blocks:framesBlocks()};let mode='radix';
  const svgEl=document.getElementById('sg-tree-svg'),capEl=document.getElementById('sg-tree-cap'),cntEl=document.getElementById('sg-tree-cnt');
  const C={hit:'var(--good)',nw:'var(--acc)',ev:'var(--bad)',n:'var(--soft)'};
  function drawRadix(f){const w=RD.width(svgEl),maxT=22,x0=4,u=(w-x0-6)/maxT,rh=20,rows=f.rows;
    const h=Math.max(60,rows.length*rh+30);let b='';
    for(let t=0;t<=maxT;t+=2)b+=RD.t(x0+t*u,h-4,t,{fs:9,fill:'var(--mute)',a:'middle'});
    rows.forEach((r,k)=>{const y=6+k*rh,x=x0+r.start*u,ww=Math.max(2,r.key.length*u-2);
      const hit=f.hl.hit&&f.hl.hit.has(r.id),nw=f.hl.nw&&f.hl.nw.has(r.id);
      const fill=hit?C.hit:nw?C.nw:C.n,tc=hit||nw?'var(--bg)':'var(--ink)';
      b+='<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+ww.toFixed(1)+'" height="'+(rh-4)+'" rx="3" fill="'+fill+'" stroke="'+(r.lock>0?'var(--c4)':'var(--line)')+'" stroke-width="'+(r.lock>0?2:1)+'"><title>'+RD.esc(r.key.map(W).join(' '))+' ('+r.key.length+' tokens)</title></rect>';
      let lbl=r.key.map(W).join(' ');const maxc=Math.floor(ww/6.2);if(lbl.length>maxc)lbl=maxc>3?lbl.slice(0,maxc-1)+'…':'';
      if(lbl)b+=RD.t(x+3,y+12,RD.esc(lbl),{fs:10,fill:tc})});
    if(!rows.length)b+=RD.t(w/2,30,'(empty)',{a:'middle',fill:'var(--mute)'});
    svgEl.innerHTML=RD.svg(w,h,b,'Radix tree: one bar per node, placed at its token positions')}
  function drawBlocks(f){const w=RD.width(svgEl),cols=w<520?2:5,n=f.blocks.length,gap=6,bw=(w-gap*(cols-1)-4)/cols,bh=34,rows=Math.ceil(n/cols);
    const h=rows*(bh+gap)+4;let b='';
    f.blocks.forEach((bl,k)=>{const cx=2+(k%cols)*(bw+gap),cy=2+Math.floor(k/cols)*(bh+gap);
      const hit=f.hitset&&f.hitset.has(k),nw=f.newset&&f.newset.has(k),ev=f.evset&&f.evset.has(k)&&!nw;
      const fill=hit?C.hit:nw?C.nw:ev?C.ev:C.n,tc=hit||nw||ev?'var(--bg)':'var(--ink)';
      b+='<rect x="'+cx.toFixed(1)+'" y="'+cy+'" width="'+bw.toFixed(1)+'" height="'+bh+'" rx="4" fill="'+fill+'" stroke="var(--line)"/>';
      b+=RD.t(cx+5,cy+12,'block '+k+(bl.h===null?' (free)':bl.ref>0?' (in use)':' (cached)'),{fs:9.5,fill:tc});
      let lbl=bl.h===null?'':(bl.lbl||'');const maxc=Math.floor((bw-8)/6);if(lbl.length>maxc)lbl=lbl.slice(0,maxc-1)+'…';
      if(lbl)b+=RD.t(cx+5,cy+27,RD.esc(lbl),{fs:10.5,fill:tc,w:600})});
    svgEl.innerHTML=RD.svg(w,h,b,'Hash-block table: one cell per block')}
  function draw(i){const f=FR[mode][i];if(mode==='radix')drawRadix(f);else drawBlocks(f);
    capEl.innerHTML='<div class="t">Step '+i+' of '+(FR[mode].length-1)+'</div><p>'+f.cap+'</p>'+(mode==='radix'?'<p class="small"><span style="color:var(--good)">green</span>: matched path; <span style="color:var(--acc)">blue</span>: nodes created; thick border: locked.</p>':'<p class="small"><span style="color:var(--good)">green</span>: reused blocks; <span style="color:var(--acc)">blue</span>: blocks this request filled and cached; <span style="color:var(--bad)">red</span>: cached content evicted.</p>');
    const c=f.c;cntEl.innerHTML=RD.stat('Requests',c[0])+RD.stat('Prompt tokens sent',c[1])+RD.stat('Reused from cache',c[2],c[1]?Math.round(100*c[2]/c[1])+'% of prompt tokens':'')+RD.stat(mode==='radix'?'Tree nodes':'Cached blocks',c[3])+RD.stat('Tokens evicted',c[4])+RD.stat('Slots holding KV',(c[5]||0)+' of '+CAP)}
  const A=RD.anim({card:'sg-tree-card',ctl:'sg-tree-ctl',n:FR.radix.length,draw:draw,ms:1700,label:'Step'});
  RD.seg(document.getElementById('sg-tree-mode'),m=>{mode=m;A.reset(FR[m].length);A.play()});
  RD.onResize(()=>A.redraw());
  window.SG_TREE_TOTALS={radix:FR.radix[FR.radix.length-1].c,blocks:FR.blocks[FR.blocks.length-1].c};
})();
