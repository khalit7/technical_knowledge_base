// ---- Attention work per decoded token (inline in Reading, IndexShare section): attention work per decoded token of every GLM attention design, from config.json (cache sizing moved to Long context's KV-cache calculator, 2026-10-23) ----
(function(){if(!$('cxFl'))return;
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
  const Lof=v=>Math.round(4096*Math.pow(256,v/100));
  const fK=L=>L>=1048000?fmt(L/1048576,0)+'M':fmt(Math.round(L/1024))+'K';
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
  function upd(){const L=Lof(+$('cxL').value),pool=$('cxPool').checked,wt=$('cxW').checked;
    $('cxLv').textContent=fK(L)+' tokens ('+fmt(L)+')';
    chart($('cxFl'),[1e9,2e13],[[1e9,'10⁹'],[1e10,'10¹⁰'],[1e11,'10¹¹'],[1e12,'10¹²'],[1e13,'10¹³']],'multiply-adds per token',(m,x)=>work(m,x,pool,wt).tot,L);
    let rows='<tr><th>Design</th><th class="num">Indexer work</th><th class="num">Attention work</th><th class="num">Total per token</th></tr>';
    M.forEach(m=>{const ok=L<=m.max,w=work(m,L,pool,wt);
      rows+='<tr'+(on[m.id]?'':' style="opacity:.45"')+'><td><span class="sw" style="background:'+m.c+'"></span>'+m.n+'</td>'
        +(ok?'<td class="num">'+sci(w.ix,1)+'</td><td class="num">'+sci(w.core+w.st,1)+'</td><td class="num">'+sci(w.tot,2)+'</td>':'<td class="num mute" colspan="3">beyond its '+fmt(m.max)+'-token context</td>')+'</tr>'});
    $('cxTab').innerHTML=rows;
    const f=M.find(m=>m.id==='fl'),g=M.find(m=>m.id==='g53'),g5=M.find(m=>m.id==='g5');
    const wf=work(f,L,pool,wt),wg=work(g,L,pool,wt),wi=wg.ix/wg.tot;
    $('cxOut').innerHTML=stat('GLM-5.3 against Flash, work',(wg.tot/wf.tot).toFixed(1)+'×','per decoded token at '+fK(L))+stat('Indexer share of GLM-5.3\'s work',(100*wi).toFixed(0)+'%',wt?'including active weights':'of attention work only');
  }
  $('cxL').addEventListener('input',upd);['cxPool','cxW'].forEach(id=>$(id).addEventListener('change',upd));
  $('cxM').querySelectorAll('input').forEach(c=>c.addEventListener('change',()=>{on[c.dataset.m]=c.checked?1:0;upd()}));
  onTab('t-read',upd);upd();
  let w=0;addEventListener('resize',()=>{const n=$('cxFl').clientWidth<520;if(n!==w){w=n;if($('t-read').hidden===false)upd()}});
})();
