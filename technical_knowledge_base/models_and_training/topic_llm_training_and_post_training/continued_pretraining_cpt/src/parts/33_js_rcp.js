// ---- Recipes compared tab: sortable table, detail card, and the two levers as a scatter ----
(function(){
  const R=CPT.rcp,tbl=document.getElementById('rcpTbl');if(!tbl)return;
  const det=document.getElementById('rcpDet'),plot=document.getElementById('rcpPlot'),srt=document.getElementById('rcpSort');
  let sel=null;const show={cpt:1,mid:1,scratch:1};const esc=RD.esc;
  const KIND={cpt:'CPT',mid:'own mid-training',scratch:'from scratch'};
  const g=r=>r.general==null?'<span class="mute">not disclosed</span>':'<span class="gbar" style="width:'+Math.max(2,r.general*0.6)+'px"></span>'+r.general+'%';
  const lr=r=>r.lrr==null?'<span class="mute">'+(r.kind==='scratch'?'n/a':'not disclosed')+'</span>':String(+r.lrr.toPrecision(2))+'×';
  function rows(){let a=R.filter(r=>show[r.kind]);const k=srt.value;
    const num=(v)=>v==null?-1:v;
    if(k==='date')a.sort((x,y)=>x.date<y.date?-1:1);
    else if(k==='general')a.sort((x,y)=>num(y.general)-num(x.general));
    else if(k==='tok')a.sort((x,y)=>num(y.tokB)-num(x.tokB));
    else a.sort((x,y)=>num(y.lrr)-num(x.lrr));return a}
  function draw(){
    tbl.innerHTML='<thead><tr><th>Model</th><th>Domain</th><th>Base</th><th>CPT tokens</th><th>General share</th><th>Peak vs base peak</th><th>Forgetting measured?</th></tr></thead><tbody>'+
      rows().map(r=>'<tr data-id="'+r.id+'" class="'+(sel===r.id?'sel':'')+'" style="cursor:pointer"><td><b>'+esc(r.model)+'</b><br><span class="mute">'+esc(r.org)+', '+r.date+' · '+KIND[r.kind]+'</span></td><td>'+esc(r.domain)+'</td><td>'+esc(r.base)+'</td><td>'+esc(r.tokens)+'</td><td class="num">'+g(r)+'</td><td class="num">'+lr(r)+'</td><td>'+(/^measured/.test(r.forget)?'<span class="ok">yes</span>':'<span class="mute">'+(r.forget==='n/a'?'n/a':'no')+'</span>')+'</td></tr>').join('')+'</tbody>';
    tbl.querySelectorAll('tbody tr').forEach(tr=>tr.addEventListener('click',()=>{sel=tr.dataset.id;draw();detail()}));
    scatter()}
  function detail(){const r=R.find(x=>x.id===sel);if(!r)return;
    det.innerHTML='<h3>'+esc(r.model)+'</h3><span class="tag">'+KIND[r.kind]+'</span><span class="tag">'+esc(r.domain)+'</span><dl class="kv">'+
      [['Base',r.base],['Tokens',r.tokens],['Mix',r.gnote],['Learning rate',r.lr],['Tokenizer',r.tok],['After',r.after],['Result',r.result],['Forgetting',r.forget]].map(([k,v])=>'<dt>'+k+'</dt><dd>'+esc(v)+'</dd>').join('')+
      '</dl><p class="small">Source: <a href="'+r.url+'" target="_blank" rel="noopener noreferrer">'+esc(r.url.replace(/^https:\/\//,''))+'</a> ('+esc(r.src)+')</p>'}
  function scatter(){
    const pts=R.filter(r=>r.kind==='cpt'&&r.general!=null&&r.lrr!=null);
    const w=Math.min(RD.width(plot),860),h=Math.max(230,Math.min(320,w*0.5));
    const F=PL.frame({w,h,x:[0,85],y:[0.004,1.6],ylog:true,xt:[0,10,20,30,40,50,60,70,80],xf:v=>v+'%',yt:[0.01,0.03,0.1,0.3,1],yf:v=>v+'×',xlab:'general share of the CPT mix',ylab:'peak LR / base peak',m:{l:56,r:12,t:12,b:36}});
    let s=F.open()+F.axes;
    pts.forEach((r,i)=>{const X=F.sx(r.general),Y=F.sy(r.lrr),right=X>F.W-120;
      s+='<g data-id="'+r.id+'" style="cursor:pointer"><circle cx="'+X+'" cy="'+Y+'" r="11" fill="transparent"/><circle cx="'+X+'" cy="'+Y+'" r="'+(sel===r.id?6:4.5)+'" fill="var(--acc)" stroke="var(--bg)" stroke-width="1.5"/><text x="'+(right?X-7:X+7)+'" y="'+(Y+(i%2?12:-5))+'" text-anchor="'+(right?'end':'start')+'" font-size="10.5">'+esc(r.model.replace(/ \d.*$/,''))+'</text></g>'});
    plot.innerHTML=s+F.close();
    plot.querySelectorAll('g[data-id]').forEach(el=>el.addEventListener('click',()=>{sel=el.dataset.id;draw();detail()}))}
  document.querySelectorAll('#t-rcp input[data-k]').forEach(c=>c.addEventListener('change',()=>{show[c.dataset.k]=c.checked?1:0;draw()}));
  srt.addEventListener('change',draw);
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-rcp']=window.TAB_RENDER['t-rcp']||[]).push(draw);
  addEventListener('resize',()=>{if(!document.getElementById('t-rcp').hidden)scatter()});draw();
})();
