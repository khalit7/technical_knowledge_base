// ---- Packing lab: pad, truncate, concatenate, best-fit decreasing (same rules as src/scripts/packing.py) ----
window.SLPACK=(function(){
  // each strategy returns placements in placement order: [win, doc, start_in_doc, len, cut] plus window count
  function pad(lens,L){const pl=[];let w=0;lens.forEach((n,d)=>{if(!n)return;let s=0;while(s<n){const t=Math.min(L,n-s);pl.push([w++,d,s,t,s+t<n||s>0]);s+=t}});return {pl,W:w,eos:false}}
  function trunc(lens,L){const pl=lens.map((n,d)=>[d,d,0,Math.min(n,L),n>L]);return {pl,W:lens.length,eos:false}}
  function concat(lens,L){const pl=[];let w=0,room=L;lens.forEach((n0,d)=>{const n=n0+1;let s=0;while(n-s>0){const t=Math.min(room,n-s);pl.push([w,d,s,t,false]);s+=t;room-=t;if(room===0){w++;room=L}}});
    const W=room<L?w+1:w;markCuts(pl);return {pl,W,eos:true}}
  function bfd(lens,L){const ch=[];lens.forEach((n0,d)=>{const n=n0+1;for(let s=0;s<n;s+=L)ch.push([Math.min(L,n-s),d,s])});
    ch.sort((a,b)=>b[0]-a[0]||a[1]-b[1]||a[2]-b[2]);
    const rooms=[],ids=[],pl=[];let W=0;
    const bl=(a,x)=>{let lo=0,hi=a.length;while(lo<hi){const m=(lo+hi)>>1;if(a[m]<x)lo=m+1;else hi=m}return lo};
    ch.forEach(([sz,d,s])=>{let i=bl(rooms,sz),room,w;if(i<rooms.length){room=rooms.splice(i,1)[0];w=ids.splice(i,1)[0]}else{room=L;w=W++}
      pl.push([w,d,s,sz,false]);room-=sz;if(room>0){const j=bl(rooms,room);rooms.splice(j,0,room);ids.splice(j,0,w)}});
    markCuts(pl);return {pl,W,eos:true}}
  function markCuts(pl){const c={};pl.forEach(p=>{c[p[1]]=(c[p[1]]||0)+1});pl.forEach(p=>{p[4]=c[p[1]]>1})}
  function stats(r,lens,L){const T=lens.reduce((a,b)=>a+b,0),wins=Array.from({length:r.W},()=>[]);r.pl.forEach(p=>wins[p[0]].push(p));
    let real=0,all=0,cross=0,orphan=0;wins.forEach(w=>{const m=w.reduce((a,p)=>a+p[3],0);real+=m;all+=m*(m+1)/2;cross+=m*(m+1)/2-w.reduce((a,p)=>a+p[3]*(p[3]+1)/2,0);orphan+=w.reduce((a,p)=>a+(p[2]>0?p[3]:0),0)});
    const cut=new Set(r.pl.filter(p=>p[4]).map(p=>p[1])).size;
    return {windows:r.W,fill:real/(r.W*L),docs_cut:cut,cross:all?cross/all:0,orphan:real?orphan/real:0,lost:Math.max(0,T-real+(r.eos?-lens.length:0))/T}}
  return {pad,trunc,concat,bfd,stats};
})();
(function(){
  const U=SLU,$=U.$,P=SLPACK;if(!$('sl-p-card'))return;
  const lens=SL.lens2k,demo=lens.slice(0,12),PAL=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)'];
  let S='concat',L=2048,mask=false,sel=0,cur=null;
  const NAMES={pad:'Pad',trunc:'Truncate',concat:'Concatenate',bfd:'Best-fit packing'};
  function run(){cur=P[S](demo,L);return cur}
  function draw(i){const W=RD.width($('sl-p-card')),r=cur,rowH=22,lab=56,sx=(W-lab-6)/L,shown=r.pl.slice(0,i);
    const used=new Set(shown.map(p=>p[0]));const nW=Math.min(r.W,used.size?Math.max(...used)+1:0);
    let body='';const fillw=new Array(r.W).fill(0);
    for(let w=0;w<r.W;w++){const y=w*(rowH+4)+4;body+='<rect x="'+lab+'" y="'+y+'" width="'+(L*sx).toFixed(1)+'" height="'+rowH+'" fill="'+(w<nW||S==='bfd'&&used.has(w)?'var(--dim)':'none')+'" stroke="var(--line)" data-w="'+w+'" style="cursor:pointer"/>'+
      RD.t(lab-6,y+15,'window '+(w+1),{a:'end',fs:10.5,fill:w===sel?'var(--acc)':'var(--mute)'})}
    // place pieces: offset within window = sum of earlier pieces in that window (placement order)
    const off=new Array(r.W).fill(0);
    shown.forEach((p,k)=>{const y=p[0]*(rowH+4)+4,x=lab+off[p[0]]*sx,w=Math.max(0.8,p[3]*sx);off[p[0]]+=p[3];
      body+='<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+w.toFixed(1)+'" height="'+rowH+'" fill="'+PAL[p[1]%6]+'" fill-opacity="'+(p[1]<6?1:0.6)+'" stroke="var(--bg)" stroke-width="0.8" data-w="'+p[0]+'" style="cursor:pointer"/>';
      if(w>16)body+=RD.t(x+3,y+15,'d'+(p[1]+1),{fs:10,fill:'var(--bg)'});
      if(p[4])body+='<rect x="'+(p[2]>0?x:x+w-3).toFixed(1)+'" y="'+y+'" width="3" height="'+rowH+'" fill="var(--bad)"/>'});
    body+='<rect x="'+lab+'" y="'+(sel*(rowH+4)+3)+'" width="'+(L*sx).toFixed(1)+'" height="'+(rowH+2)+'" fill="none" stroke="var(--acc)" stroke-width="2"/>';
    $('sl-p-plot').innerHTML=RD.svg(W,r.W*(rowH+4)+8,body,'Windows');
    const fin=i>=r.pl.length;
    const p=shown[shown.length-1];
    $('sl-p-cap').innerHTML=i===0?'<b>'+NAMES[S]+', L = '+U.f0(L)+'.</b> '+({pad:'Each document gets its own window(s); the rest is padding.',trunc:'One window per document; anything past L is thrown away.',concat:'Documents are laid end to end, each followed by an end-of-document token, and cut every L tokens.',bfd:'Documents longer than L are split into L-sized pieces first; then pieces are placed longest first, each into the window with the least room that still fits it (Best-Fit Decreasing).'})[S]+' Press play or step.':
      (fin?'<b>Done.</b> ':'')+'Placed document '+(p[1]+1)+' ('+U.f0(demo[p[1]]+(r.eos?1:0))+' tokens'+(p[2]>0||p[3]<demo[p[1]]+(r.eos?1:0)?', piece from token '+U.f0(p[2])+' of length '+U.f0(p[3]):'')+') in window '+(p[0]+1)+'.'+(p[4]?' This document is cut.':'');
    const fs=P.stats(r,demo,L);
    $('sl-p-out').innerHTML=RD.stat('Windows',String(fin?fs.windows:nW),'for 12 documents')+RD.stat('Real tokens',fin?U.pc(fs.fill):'...','of window positions')+RD.stat('Documents cut',fin?String(fs.docs_cut):'...','or truncated')+
      RD.stat('Cross-document pairs',fin?(mask&&(S==='concat'||S==='bfd')?'0 (masked, was '+U.pc(fs.cross,0)+')':U.pc(fs.cross,0)):'...','of causal attention pairs');
    drawAtt()}
  function drawAtt(){const r=cur,w=Math.min(sel,r.W-1),segs=r.pl.filter(p=>p[0]===w),m=segs.reduce((a,p)=>a+p[3],0),el=$('sl-p-att');
    const Wd=Math.min(RD.width(el),360),sz=Wd-20,sc=sz/L;let body='<rect x="10" y="10" width="'+sz+'" height="'+sz+'" fill="none" stroke="var(--line)"/>';
    // causal triangle per pair of segments: query segment a (rows), key segment b (cols), b <= a
    let o=[],acc=0;segs.forEach(p=>{o.push(acc);acc+=p[3]});
    segs.forEach((pa,a)=>{segs.forEach((pb,b)=>{if(b>a)return;const x=10+o[b]*sc,y=10+o[a]*sc,wx=pb[3]*sc,hy=pa[3]*sc;
      if(a===b)body+='<path d="M'+x.toFixed(1)+' '+y.toFixed(1)+' L'+x.toFixed(1)+' '+(y+hy).toFixed(1)+' L'+(x+wx).toFixed(1)+' '+(y+hy).toFixed(1)+' Z" fill="'+PAL[pa[1]%6]+'" fill-opacity="0.85"/>';
      else body+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+wx.toFixed(1)+'" height="'+hy.toFixed(1)+'" fill="'+(mask?'none':'var(--bad)')+'" fill-opacity="0.75" stroke="var(--bad)" stroke-width="0.6"'+(mask?' stroke-dasharray="3 2"':'')+'/>'})});
    if(m<L)body+='<rect x="'+(10+m*sc).toFixed(1)+'" y="10" width="'+((L-m)*sc).toFixed(1)+'" height="'+sz+'" fill="var(--dim)" fill-opacity="0.5"/><rect x="10" y="'+(10+m*sc).toFixed(1)+'" width="'+sz+'" height="'+((L-m)*sc).toFixed(1)+'" fill="var(--dim)" fill-opacity="0.5"/>';
    el.innerHTML=RD.svg(Wd,sz+20,body,'Attention pattern of one window');
    const tot=m*(m+1)/2,same=segs.reduce((a,p)=>a+p[3]*(p[3]+1)/2,0);
    $('sl-p-attcap').innerHTML='<b>Window '+(w+1)+'</b> (final layout): '+segs.length+' piece'+(segs.length>1?'s':'')+', '+U.f0(m)+' real tokens. Rows are queries, columns keys (to scale, L = '+U.f0(L)+'); coloured triangles are attention within a document, red blocks attention across documents'+(mask?' (dashed: removed by the document mask)':'')+', grey is padding. Cross-document pairs: '+(tot?U.pc((tot-same)/tot,0):'0%')+(mask&&tot>same?', all masked':'')+'. Click another window above.'}
  const A=RD.anim({card:'sl-p-card',ctl:'sl-p-ctl',n:run().pl.length+1,ms:700,label:'Placement',draw});
  $('sl-p-plot').addEventListener('click',e=>{const t=e.target.closest('[data-w]');if(!t)return;sel=+t.dataset.w;A.redraw()});
  function restart(){sel=0;A.reset(run().pl.length+1);table()}
  RD.seg($('sl-p-s'),v=>{S=v;restart()});RD.seg($('sl-p-l'),v=>{L=+v;restart()});$('sl-p-mask').addEventListener('change',e=>{mask=e.target.checked;A.redraw();table()});
  function table(){const rows=['pad','trunc','concat','bfd'].map(k=>[k,P.stats(P[k](lens,L),lens,L)]);
    $('sl-p-tbl').innerHTML='<tr><th>Strategy</th><th class="num">Windows</th><th class="num">Real tokens</th><th class="num">Tokens thrown away</th><th class="num">Documents cut</th><th class="num">Cross-document pairs</th><th class="num">Tokens without their document start</th></tr>'+
      rows.map(([k,s])=>'<tr'+(k===S?' style="background:var(--acc2)"':'')+'><td>'+NAMES[k]+'</td><td class="num">'+U.f0(s.windows)+'</td><td class="num">'+U.pc(s.fill,k==='concat'||k==='bfd'?2:1)+'</td><td class="num">'+(k==='trunc'?U.pc(s.lost):'0')+'</td><td class="num">'+U.f0(s.docs_cut)+'</td><td class="num">'+(mask&&(k==='concat'||k==='bfd')?'0 (masked)':U.pc(s.cross,0))+'</td><td class="num">'+(k==='trunc'||k==='pad'?(k==='pad'?U.pc(s.orphan):'0'):U.pc(s.orphan))+'</td></tr>').join('');
    // check against the Python run
    const py=SL.pack.k2[String(L)];let ok=true;const c=rows.map(([k,s])=>{const q=py[k];const same=q.windows===s.windows&&q.docs_cut===s.docs_cut&&(q.cross_pair_frac==null||Math.abs(q.cross_pair_frac-s.cross)<1e-9);ok=ok&&same;return k+' '+(same?'same':'DIFFERENT')});
    $('sl-p-chk').innerHTML='Check against <code>packing.py</code> at L = '+U.f0(L)+': '+(ok?'windows, documents cut and cross-document share identical for all four strategies':c.join(', '))+'. Tokens thrown away (truncation): '+U.pc(py.trunc.tokens_lost_frac)+' in Python.';
    const p5=SL.pack.k50[String(L)];
    $('sl-p-tbl50').innerHTML='<tr><th>Strategy</th><th class="num">Windows</th><th class="num">Real tokens</th><th class="num">Documents cut</th><th class="num">Cross-document pairs</th></tr>'+
      ['pad','trunc','concat','bfd'].map(k=>{const s=p5[k];return '<tr><td>'+NAMES[k]+'</td><td class="num">'+U.f0(s.windows)+'</td><td class="num">'+U.pc(s.fill,k==='concat'||k==='bfd'?3:1)+'</td><td class="num">'+U.f0(s.docs_cut)+'</td><td class="num">'+U.pc(s.cross_pair_frac,0)+'</td></tr>'}).join('');
    hist()}
  function hist(){const el=$('sl-p-hist'),W=RD.width(el),H=120,lo=Math.log10(1),hi=Math.log10(40000),nb=40,bins=new Array(nb).fill(0);
    lens.forEach(n=>{const b=Math.min(nb-1,Math.max(0,Math.floor((Math.log10(Math.max(1,n))-lo)/(hi-lo)*nb)));bins[b]++});const mx=Math.max(...bins),bw=(W-20)/nb;
    let body=bins.map((c,i)=>'<rect x="'+(10+i*bw).toFixed(1)+'" y="'+(H-20-c/mx*(H-34)).toFixed(1)+'" width="'+(bw-1).toFixed(1)+'" height="'+(c/mx*(H-34)).toFixed(1)+'" fill="var(--acc)"/>').join('');
    const xL=10+(Math.log10(L)-lo)/(hi-lo)*(W-20);body+='<line x1="'+xL.toFixed(1)+'" x2="'+xL.toFixed(1)+'" y1="6" y2="'+(H-20)+'" stroke="var(--bad)" stroke-width="2"/>'+RD.t(xL+(xL>W-90?-4:4),16,'L = '+U.f0(L),{fs:11,fill:'var(--bad)',a:xL>W-90?'end':null});
    [10,100,1000,10000].forEach(v=>{const x=10+(Math.log10(v)-lo)/(hi-lo)*(W-20);body+=RD.t(x,H-6,U.f0(v),{fs:10,a:'middle',fill:'var(--mute)'})});
    el.innerHTML=RD.svg(W,H,body,'Length histogram')}
  RD.onRender(()=>{A.redraw();table()});RD.onResize(()=>{A.redraw();hist()});table();
})();
