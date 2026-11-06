// ---- Scene: Fig. 3, a real HNSW graph in layers and one search descending it (renderer v2). Data: VIX.hnsw (data/hnsw_anim.json):
// 240 real passages (60 per collection, Qwen3-Embedding 1,024-d) inserted by the page's line-by-line port of hnswlib 0.8.0 at M 5,
// efConstruction 40, in three versions on the same points, order and levels (HNSW; the same layers with closest-M links; one layer).
// Positions are the recorded t-SNE map (drawing only); every distance, link, level and search step is the port's recorded trace. ----
(function(){
  const H=window.VIX&&window.VIX.hnsw;if(!H||!document.getElementById('stg-hn'))return;const {at,off,mix}=S3;
  const $=id=>document.getElementById(id),esc=RD.esc;
  const NAME={scifact:'SciFact',nfcorpus:'NFCorpus',hotpotqa:'HotpotQA',qasper:'QASPER'},SRC=['scifact','nfcorpus','hotpotqa','qasper'];
  const st={vr:'hnsw',q:0,k:0},N=H.n,LY=2;
  if($('vix-h-chk'))$('vix-h-chk').textContent=H.check||'';
  H.qtext.forEach((t,i)=>{const o=document.createElement('option');o.value=i;o.textContent=NAME[H.qsrc[i]]+': '+(t.length>70?t.slice(0,68)+'...':t);$('vix-h-q').appendChild(o)});
  const W=p=>[(p[0]-.5)*8,(p[1]-.5)*6],pos=(i,l)=>{const w=W(H.xy[i]);return [w[0],l*LY+.06,w[1]]};
  const lvl=i=>st.vr==='flat'?0:H.levels[i],G=()=>H.modes[st.vr],top=()=>st.vr==='flat'?0:G().maxlevel;
  // the insert shown in step 2: a layer-0 insert in the middle of the build whose heuristic both kept and rejected a few candidates
  const hb=H.modes.hnsw.build;let INS=hb[120].id;
  for(let t=100;t<hb.length;t++){const L0=hb[t].layers.find(l=>l.layer===0);if(L0&&L0.rejected&&L0.rejected.length>=3&&L0.rejected.length<=7&&L0.kept.length>=3){INS=hb[t].id;break}}
  const insRec=()=>{const b=G().build.find(x=>x.id===INS);return b&&b.layers.find(l=>l.layer===0)};
  // the search as stretches: upper-layer hops grouped by layer, then the layer-0 expansions in two halves
  function plan(){const S=G().searches.find(s=>s.q===st.q),tp=top(),hops=S.descent.map((d,i)=>Object.assign({from:i?S.descent[i-1].at:G().ep},d));
    const half=Math.ceil(S.steps.length/2);
    const seq=st.vr==='flat'?['layers','links','l0a','l0b','end']:['layers','links','up','up2','l0a','l0b','end'];
    return {S,tp,hops,half,seq,h2:hops.filter(h=>h.layer===tp),h1:hops.filter(h=>h.layer<tp)}}
  function ring(R,c,rad,col,a,w){const pts=[];for(let i=0;i<=24;i++){const t=i/24*Math.PI*2;pts.push([c[0]+rad*Math.cos(t),c[1]-.05,c[2]+rad*Math.sin(t)])}R.line(pts,{c:col,a,w:w||2})}
  // what has been evaluated by the end of step k (progress e within it)
  function state(pl,k,e){const kind=pl.seq[k],ev=new Map(),exp=[];let at=G().ep,layer=pl.tp,cur=null;ev.set(G().ep,1);
    const doHops=(hs,f)=>{const n=Math.max(0,Math.round(hs.length*f));hs.slice(0,n).forEach(h=>{h.evals.forEach(x=>ev.set(x[0],1));at=h.at;layer=h.layer;cur={hop:h}})};
    const doExp=(a,b)=>{pl.S.steps.slice(a,b).forEach(s=>{exp.push(s[0]);s[1].forEach(x=>ev.set(x[0],1));at=s[0];cur={exp:s}});layer=0};
    const i=pl.seq.indexOf(kind),ix=x=>pl.seq.indexOf(x);
    if(ix('up')>=0&&i>=ix('up'))doHops(pl.h2,i===ix('up')?e:1);
    if(ix('up2')>=0&&i>=ix('up2'))doHops(pl.h1,i===ix('up2')?e:1);
    if(i>=ix('l0a')){layer=0;doExp(0,i===ix('l0a')?Math.max(1,Math.round(pl.half*e)):pl.half)}
    if(i>=ix('l0b'))doExp(pl.half,i===ix('l0b')?pl.half+Math.max(1,Math.round((pl.S.steps.length-pl.half)*e)):pl.S.steps.length);
    return {ev,exp,at,layer,cur,nd:ev.size}}
  const COL=C=>({scifact:C.c1,nfcorpus:C.c2,hotpotqa:C.c3,qasper:C.c4});
  function draw(R,k,e){const C=R.P,pl=plan(),kind=pl.seq[k],tp=pl.tp,cl=COL(C),Gm=G();R.grid(-4.6,4.6,-3.6,3.6,.5);
    const search=k>=2,S0=state(pl,k,e),qw=W(H.qxy[st.q]);
    // the layers: glass plates, the nodes on each, the links
    // composition: steps about layer 0 (the links, the floor search) let the upper layers recede almost fully
    const floorStep=kind==='links'||kind==='l0a'||kind==='l0b'||kind==='end',up=l=>l>0&&floorStep?.08:1;
    for(let l=tp;l>=0;l--){const y=l*LY;if(l>0)R.glass([-4.3,y,-3.3],[8.6,0,0],[0,0,6.6],{c:C.c1,nu:8,nv:6,a:.3*up(l),th:.02});
      R.label([-4.3,y,3.3],'layer '+l+' · '+H.levels.filter((v,i)=>lvl(i)>=l).length+' nodes',{al:'right',dx:-8,fs:12,b:1,c:C.mute,grp:'ly',a:up(l)>.5?1:.3});
      const la=kind==='links'?(l===0?.12:.06):search?(S0.layer===l?.32:.1):(l===0?.22:.5),done=new Set();
      for(let a=0;a<N;a++){if(lvl(a)<l)continue;const lk=Gm.links[a][l]||[];lk.forEach(b=>{const key=a<b?a+'-'+b:b+'-'+a;if(done.has(key))return;done.add(key);R.line([pos(a,l),pos(b,l)],{c:C.mute,w:l?1.1:.7,a:la*up(l)})})}
      for(let a=0;a<N;a++){if(lvl(a)<l)continue;const p=pos(a,l);let na=search?(S0.ev.has(a)?1:(S0.layer===l?.4:.18)):kind==='links'?(a===INS?1:.3):1;
        R.ball(p,l?.075:.06,{c:cl[H.src[a]],a:na*(up(l)<1?.15:1)});if(l>0&&!search&&kind==='layers')R.line([p,pos(a,0)],{c:C.mute,w:.6,a:.22,dash:[2,4]})}}
    // step 2: one insert, its kept links green, the candidates the heuristic rejected red dashed, each tied to the kept neighbour that blocked it
    if(kind==='links'){const L0=insRec(),p0=pos(INS,0);if(L0){L0.kept.forEach(b=>R.line([p0,pos(b,0)],{c:C.good,w:4,a:e}));
        (L0.rejected||[]).forEach(([c,r])=>{R.line([p0,pos(c,0)],{c:C.bad,w:2.6,a:e,dash:[6,4]});R.line([pos(c,0),pos(r,0)],{c:C.bad,w:1.4,a:.8*e});R.ball(pos(c,0),.08,{c:C.bad,a:e})});
        L0.kept.forEach(b=>R.flow([p0,pos(b,0)],{c:C.good,a:e,r:.04,n:3,speed:.9}))}
      ring(R,p0,.2,C.ink,1,2);R.label(p0,'new node',{dy:-14,fs:12.5,b:1,c:C.ink})}
    // the query: a pin through every layer
    if(search){R.line([[qw[0],0,qw[1]],[qw[0],tp*LY+.5,qw[1]]],{c:C.q,w:2,a:.85});for(let l=0;l<=tp;l++){const y=l*LY+.03;R.line([[qw[0]-.2,y,qw[1]],[qw[0]+.2,y,qw[1]]],{c:C.q,w:2.4});R.line([[qw[0],y,qw[1]-.2],[qw[0],y,qw[1]+.2]],{c:C.q,w:2.4})}
      R.label([qw[0],tp*LY+.5,qw[1]],'query',{dy:-12,fs:12.5,b:1,c:C.q})}
    // upper layers: the greedy hops, flows from the current node to the neighbours it compares, an arrow to the one it moves to
    if(kind==='up'||kind==='up2'){const hs=kind==='up'?pl.h2:pl.h1,n=Math.max(1,Math.round(hs.length*e));
      hs.slice(0,n).forEach((h,j)=>{const l=h.layer,last=j===n-1;h.evals.forEach(x=>R.flow([pos(h.from,l),pos(x[0],l)],{c:C.q,a:last?.9:.25,r:.045,n:3,speed:1.3}));
        if(h.from!==h.at)R.line([pos(h.from,l),pos(h.at,l)],{c:C.acc,w:3,head:8})});
      if(kind==='up2'||pl.h1.length===0){}
      const fr=hs.length?hs[0].from:Gm.ep;ring(R,pos(fr,hs.length?hs[0].layer:tp),.2,C.ink,1,2);if(kind==='up')R.label(pos(Gm.ep,tp),'entry point',{dy:-14,fs:12,b:1,c:C.ink});
      // dropping to the next layer: a vertical flow from the node reached
      const lh=hs[Math.min(hs.length,n)-1];if(lh&&e>.6)R.flow([pos(lh.at,lh.layer),pos(lh.at,Math.max(0,lh.layer-1))],{c:C.acc,a:(e-.6)/.4,r:.05,speed:1})}
    // layer 0: the best-first search, expansion by expansion
    if(kind==='l0a'||kind==='l0b'||kind==='end'){const ex=S0.exp;for(let i=1;i<ex.length;i++)R.line([pos(ex[i-1],0),pos(ex[i],0)],{c:C.acc,w:2.4,a:kind==='end'?.5:.9});
      if(S0.cur&&S0.cur.exp&&kind!=='end'){const [c,nb]=S0.cur.exp;nb.forEach(x=>{R.line([pos(c,0),pos(x[0],0)],{c:x[2]?C.acc:C.mute,w:x[2]?2:1,a:.9,dash:x[2]?null:[3,3]});if(x[2])R.flow([pos(c,0),pos(x[0],0)],{c:C.q,r:.045,n:3,speed:1.2})});ring(R,pos(c,0),.2,C.ink,1,2)}}
    if(kind==='end'){const gt=H.gt[st.q].slice(0,4);pl.S.result.forEach(r=>ring(R,pos(r,0),.22,C.good,e,2.4));gt.forEach(g=>{if(!pl.S.result.includes(g))ring(R,pos(g,0),.3,C.bad,e,2.6)})}
  }
  function readout(k){const pl=plan(),S0=state(pl,k,1),kind=pl.seq[k],gt=H.gt[st.q].slice(0,4);
    const res=kind==='end'?pl.S.result:[];
    $('vix-h-stats').innerHTML=RD.stat('Distances computed',k>=2?S0.nd:'...','exact search: '+N)+RD.stat('Layer',k>=2?S0.layer:'all','')+RD.stat('Exact top 4 found',kind==='end'?res.filter(r=>gt.includes(r)).length+' / 4':'...','');
    $('vix-h-qt').innerHTML=k===1?(()=>{const L0=insRec();return 'New node: '+esc(NAME[H.src[INS]])+' &ldquo;'+esc(H.snip[INS])+'&rdquo;: '+(L0?L0.kept.length+' links kept'+(L0.rejected&&L0.rejected.length?', '+L0.rejected.length+' candidates rejected':'')+'.':'')})():'Question: &ldquo;'+esc(H.qtext[st.q])+'&rdquo;';
    $('vix-h-res').innerHTML=kind==='end'?'<table class="res"><tr><th>#</th><th>returned</th></tr>'+res.map((r,i)=>'<tr><td>'+(i+1)+'</td><td><span class="'+(gt.includes(r)?'ok':'no')+'">'+(gt.includes(r)?'&#10003;':'&#215;')+'</span> '+esc(NAME[H.src[r]])+': '+esc(H.snip[r].slice(0,70))+'</td></tr>').join('')+'</table>':''}
  function cmp(){const rows=['hnsw','simple','flat'].map(v=>{const S=H.modes[v].searches.find(s=>s.q===st.q);const ok=S.result.filter(r=>H.gt[st.q].slice(0,4).includes(r)).length;
      return '<tr><td>'+({hnsw:'HNSW (hnswlib)',simple:'Closest-M links',flat:'One layer'}[v])+'</td><td class="num">'+S.ndis+'</td><td class="num">'+S.descent.length+'</td><td class="num">'+S.steps.length+'</td><td class="num">'+ok+' / 4</td><td class="num">'+H.modes[v].reachable+' / '+N+'</td></tr>'}).join('');
    $('vix-h-cmp').innerHTML='<table><tr><th>Graph</th><th class="num">Distances</th><th class="num">Upper-layer steps</th><th class="num">Layer-0 expansions</th><th class="num">Exact top 4 found</th><th class="num">Reachable on layer 0</th></tr>'+rows+'</table><p class="small mute">This question only, ef = 8, k = 4. Over all eight questions: exact top 4 found on average '+['hnsw','simple','flat'].map(v=>({hnsw:'HNSW',simple:'closest-M',flat:'one layer'}[v])+' '+(H.modes[v].mean_recall4*4).toFixed(2)).join(', ')+' of 4, with '+['hnsw','simple','flat'].map(v=>H.modes[v].mean_ndis.toFixed(1)).join(', ')+' distances. Eight questions on 240 points is a small sample: read it as an illustration, and the charts below for the measurement at scale.</p>'}
  const full={cam:[.42,.3],bounds:[[-4.4,0,-3.4],[4.4,2*LY+.4,3.4]]};
  const stg=S3.stage({id:'stg-hn',list:'sx-hn',fig:'Fig. 3 · a real HNSW graph (240 passages, M 5) and one search',cam:full.cam,bounds:full.bounds,aspect:.75,dur:1500,hold:4800,draw,
    view:k=>{const kind=plan().seq[k];if(kind==='links'){const p=pos(INS,0);return {cam:[.42,.95],bounds:[[p[0]-3.2,0,p[2]-2.4],[p[0]+3.2,.3,p[2]+2.4]]}}
      if(kind==='l0a'||kind==='l0b'||kind==='end')return {cam:[.42,.85],bounds:[[-4.2,0,-3.2],[4.2,.4,3.2]]};return full},
    margin:w=>w<520?[12,8,12,8]:[16,14,16,150],onStep:k=>{st.k=k;try{readout(k)}catch(e){}}});
  RD.seg($('vix-h-var'),v=>{st.vr=v;cmp();stg.list(v==='flat'?'sx-hn1':'sx-hn');$('sx-hn').hidden=v==='flat';$('sx-hn1').hidden=v!=='flat'});
  $('vix-h-q').addEventListener('change',e=>{st.q=+e.target.value;cmp();readout(st.k);stg.draw()});
  cmp();readout(0);
})();
