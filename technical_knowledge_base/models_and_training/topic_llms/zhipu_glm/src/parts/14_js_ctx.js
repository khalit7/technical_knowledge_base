// ---- Long-context cost tab: cache and attention work of every GLM attention design, from config.json ----
(function(){if(!$('cxKv'))return;
  const K=2048,IX=32*128;
  const M=[
    {id:'g45',n:'GLM-4.5 (GQA)',c:'var(--c2)',max:131072,act:32e9,lay:92,
      cache:p=>({lat:92*2*8*128,ix:0}),work:(L,p)=>({ix:0,core:92*96*L*256,st:0})},
    {id:'g5',n:'GLM-5 and 5.1 (MLA + DSA)',c:'var(--c6)',max:202752,act:40e9,lay:78,
      cache:p=>({lat:78*576,ix:78*128}),work:(L,p)=>({ix:78*IX*L,core:78*64*Math.min(K,L)*1088,st:0})},
    {id:'g53',n:'GLM-5.2 and 5.3 (IndexShare)',c:'var(--c1)',max:1048576,act:40e9,lay:78,
      cache:p=>({lat:78*576,ix:21*128}),work:(L,p)=>({ix:21*IX*L,core:78*64*Math.min(K,L)*1088,st:0})},
    {id:'fl',n:'GLM-5.3-Flash (hybrid)',c:'var(--c3)',max:1048576,act:18e9,lay:45,state:34*64*128*128,
      cache:p=>({lat:11*512,ix:11*128/(p?4:1)}),work:(L,p)=>({ix:11*IX*L/(p?4:1),core:11*64*Math.min(K,L)*1024,st:34*64*3*128*128})},
    {id:'mla',n:'MLA without DSA (reference)',c:'var(--mute)',max:1048576,act:40e9,lay:78,dash:1,
      cache:p=>({lat:78*576,ix:0}),work:(L,p)=>({ix:0,core:78*64*L*1088,st:0})}];
  const on={g45:1,g5:1,g53:1,fl:1,mla:1};
  $('cxM').innerHTML=M.map(m=>'<label><input type="checkbox" data-m="'+m.id+'" checked> <i style="background:'+m.c+'"></i>'+m.n+'</label>').join('');
  const Lof=v=>Math.round(4096*Math.pow(256,v/100)),Bof=v=>10*Math.pow(100,v/100);
  const fK=L=>L>=1048000?fmt(L/1048576,0)+'M':fmt(Math.round(L/1024))+'K';
  // bytes for one request at context L: growing cache in the chosen precision, KDA state kept at 16-bit
  function bytes(m,L,pr,pool){const c=m.cache(pool);return (c.lat+c.ix)*pr*L+(m.state||0)*2}
  function work(m,L,pool,wt){const w=m.work(L,pool);return {ix:w.ix,core:w.core,st:w.st,tot:w.ix+w.core+w.st+(wt?m.act:0)}}
  function chart(el,yr,yt,yl,f,L){const W=el.clientWidth<520?360:680,nar=W<500,H=nar?250:280;
    const xt=[[4096,'4K'],[32768,'32K'],[131072,'128K'],[262144,'256K'],[1048576,'1M']].filter((t,i)=>!nar||i!==3);
    const fr=logFrame({W,H,pl:nar?46:58,pr:nar?10:14,pt:10,pb:34,x:[4096,1048576],y:yr,xt,yt,xl:'context length (tokens, log scale)',yl:nar?'':yl});
    let s=fr.s;const ends=[];
    M.forEach(m=>{if(!on[m.id])return;let d='';const pts=[];for(let i=0;i<=60;i++){const x=4096*Math.pow(256,i/60);if(x>m.max*1.0001)break;pts.push(x)}if(pts[pts.length-1]<m.max&&m.max<=1048576)pts.push(m.max);
      pts.forEach((x,i)=>{const y=Math.max(yr[0],Math.min(yr[1],f(m,x)));d+=(i?'L':'M')+fr.lx(x).toFixed(1)+' '+fr.ly(y).toFixed(1)});
      s+='<path d="'+d+'" fill="none" stroke="'+m.c+'" stroke-width="2"'+(m.dash?' stroke-dasharray="5 4"':'')+'/>';
      if(L<=m.max){const y=f(m,L);s+='<circle cx="'+fr.lx(L).toFixed(1)+'" cy="'+fr.ly(Math.max(yr[0],Math.min(yr[1],y))).toFixed(1)+'" r="4" fill="'+m.c+'"/>'}
      else{const y=f(m,m.max);s+='<text x="'+(fr.lx(m.max)+4).toFixed(1)+'" y="'+(fr.ly(y)+4).toFixed(1)+'" font-size="10" fill="'+m.c+'">max</text>'}});
    s+='<line x1="'+fr.lx(L).toFixed(1)+'" x2="'+fr.lx(L).toFixed(1)+'" y1="10" y2="'+(H-34)+'" stroke="var(--acc)" stroke-dasharray="3 3"/>';
    el.innerHTML=svgEl(W,H,s,yl)}
  function upd(){const L=Lof(+$('cxL').value),B=Bof(+$('cxB').value)*GiB,pr=+$('cxP').value,pool=$('cxPool').checked,wt=$('cxW').checked;
    $('cxLv').textContent=fK(L)+' tokens ('+fmt(L)+')';$('cxBv').textContent=fmt(B/GiB,B/GiB<100?1:0)+' GiB';
    const gb=(v,l)=>[v*GiB,l];
    chart($('cxKv'),[0.01*GiB,1000*GiB],[gb(.01,'10 MiB'),gb(.1,'100 MiB'),gb(1,'1 GiB'),gb(10,'10 GiB'),gb(100,'100 GiB'),gb(1000,'1 TiB')],'cache per request',(m,x)=>bytes(m,x,pr,pool),L);
    chart($('cxFl'),[1e9,2e13],[[1e9,'10⁹'],[1e10,'10¹⁰'],[1e11,'10¹¹'],[1e12,'10¹²'],[1e13,'10¹³']],'multiply-adds per token',(m,x)=>work(m,x,pool,wt).tot,L);
    let rows='<tr><th>Design</th><th class="num">Cache per token</th><th class="num">Per request</th><th class="num">Requests in budget</th><th class="num">Indexer work</th><th class="num">Attention work</th><th class="num">Total per token</th></tr>';
    M.forEach(m=>{const c=m.cache(pool),ok=L<=m.max,b=bytes(m,L,pr,pool),w=work(m,L,pool,wt);
      rows+='<tr'+(on[m.id]?'':' style="opacity:.45"')+'><td><span class="sw" style="background:'+m.c+'"></span>'+m.n+'</td><td class="num">'+fmt(c.lat+c.ix)+' numbers<br><span class="mute">'+fmtBytes((c.lat+c.ix)*pr)+'</span></td>'
        +(ok?'<td class="num">'+fmtBytes(b)+(m.state?'<br><span class="mute">incl. '+fmtBytes(m.state*2)+' state</span>':'')+'</td><td class="num">'+fmt(Math.floor(B/b))+'</td><td class="num">'+sci(w.ix,1)+'</td><td class="num">'+sci(w.core+w.st,1)+'</td><td class="num">'+sci(w.tot,2)+'</td>':'<td class="num mute" colspan="5">beyond its '+fmt(m.max)+'-token context</td>')+'</tr>'});
    $('cxTab').innerHTML=rows;
    const f=M.find(m=>m.id==='fl'),g=M.find(m=>m.id==='g53'),g5=M.find(m=>m.id==='g5');
    const bf=bytes(f,L,pr,pool),bg=bytes(g,L,pr,pool),wf=work(f,L,pool,wt),wg=work(g,L,pool,wt),wi=wg.ix/wg.tot;
    $('cxOut').innerHTML=stat('GLM-5.3 against Flash, cache',(bg/bf).toFixed(1)+'×',fmtBytes(bg)+' against '+fmtBytes(bf))+stat('GLM-5.3 against Flash, work',(wg.tot/wf.tot).toFixed(1)+'×','per decoded token at '+fK(L))+stat('Indexer share of GLM-5.3\'s work',(100*wi).toFixed(0)+'%',wt?'including active weights':'of attention work only')+stat('Flash requests in the budget',fmt(Math.floor(B/bf)),'against '+fmt(Math.floor(B/bg))+' on GLM-5.3');
    // reproduction lines, always on Zhipu's conventions (16-bit, IndexPool on, 1M)
    const pl=m=>{const c=m.cache(true);return (c.lat+c.ix)/m.lay},r44=pl(g)/pl(f),r44n=pl(g)/((11*640)/45),Lm=1048576;
    const isr=work(g5,Lm,true,true).tot/work(g,Lm,true,true).tot;
    const ph=(m,LL)=>work(m,LL,true,false).tot/(m.lay*64),r30=ph(g,Lm)/ph(f,Lm);
    $('cxRepro').innerHTML='<b>Defaults reproduce</b>, independently from the configs:<ul class="tight">'
      +'<li>GLM-4.5: 2 × 8 × 128 × 92 = 188,416 numbers, 368 KiB per token at 16-bit and 46 GiB at 128K (the Reading tab\'s worked example).</li>'
      +'<li>GLM-5.3-Flash\'s 4.44x smaller cache ({{Z.ai docs|@dfl}}): on the same per-layer, 16-bit convention our count is <b>'+r44.toFixed(2)+'x</b> (GLM-5.3 '+pl(g).toFixed(0)+' against Flash '+pl(f).toFixed(0)+' numbers per layer and token), about 3% above the published figure, a gap no published detail explains; without IndexPool it would be '+r44n.toFixed(2)+'x.</li>'
      +'<li>IndexShare\'s 2.9x fewer per-token FLOPs at 1M ({{GLM-5.2 card|@c52}}): with active weights counted as 40 × 10⁹ multiply-adds, our count is <b>'+isr.toFixed(2)+'x</b>; it reaches 2.9x if the weights term is about 25 × 10⁹, so the result depends on what is counted as active work.</li>'
      +'<li><span class="no">Not reproduced:</span> Flash\'s 3.01x less attention compute, "per head per layer". At 1M our per-head count gives '+r30.toFixed(1)+'x; Zhipu does not state the context length or the terms counted. GLM-5\'s "1.5 to 2 times" saving from DSA ({{report|@r5}}) is not compared either: it refers to long-sequence attention in general, while this tab counts decode only.</li></ul>'
      +'<p class="small mute" style="margin:4px 0 0">Per whole model Flash caches '+fmt(f.cache(true).lat+f.cache(true).ix)+' numbers per token against GLM-5.3\'s '+fmt(g.cache(true).lat+g.cache(true).ix)+', '+((g.cache(true).lat+g.cache(true).ix)/(f.cache(true).lat+f.cache(true).ix)).toFixed(1)+' times less: more than the per-layer figure because Flash also has 45 layers against 78.</p>'}
  ['cxL','cxB'].forEach(id=>$(id).addEventListener('input',upd));['cxP','cxPool','cxW'].forEach(id=>$(id).addEventListener('change',upd));
  $('cxM').querySelectorAll('input').forEach(c=>c.addEventListener('change',()=>{on[c.dataset.m]=c.checked?1:0;upd()}));
  onTab('t-ctx',upd);
  let w=0;addEventListener('resize',()=>{const n=$('cxKv').clientWidth<520;if(n!==w){w=n;if($('t-ctx').hidden===false)upd()}});
})();
