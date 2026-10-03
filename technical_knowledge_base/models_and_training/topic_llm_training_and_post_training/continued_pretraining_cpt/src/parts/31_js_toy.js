// ---- Replay toy tab: the 3 x 3 grid of runs, curves per seed, samples, findings ----
(function(){
  const T=CPT.toy,grid=document.getElementById('tyGrid');if(!grid)return;
  if(!T){grid.innerHTML='<p class="small mute">Toy runs not packed yet.</p>';return}
  const M=T.meta,S=T.summary,PT=M.pt_steps,N=M.cpt_steps;let cur='p1.0_r0.0',seed='m',range='cpt';
  const nm=(pk,rp)=>'p'+(pk===1?'1.0':pk)+'_r'+(rp===0?'0.0':rp),f=v=>v.toFixed(2),esc=RD.esc;
  document.getElementById('tySetup').innerHTML=[
    ['Model','character-level GPT, '+M.layers+' layers, width '+M.d+', '+M.heads+' heads, context '+M.ctx+' characters, '+T.params.toLocaleString()+' parameters'],
    ['General data','six English books from Project Gutenberg ('+(M.en_train_chars/1e6).toFixed(1)+'M training characters)'],
    ['Domain data','six German books ('+(M.de_train_chars/1e6).toFixed(1)+'M characters; ä, ö, ü, ß written ae, oe, ue, ss)'],
    ['Pretraining',M.pt_steps.toLocaleString()+' steps × '+M.batch+' × '+M.ctx+' characters on English only; warmup '+M.warmup+', cosine from '+M.peak_lr+' to 10%'],
    ['CPT',N.toLocaleString()+' steps from that checkpoint, fresh AdamW; peak '+M.peaks.join(', ')+' × the pretraining peak, crossed with '+M.replays.map(r=>r*100+'%').join(', ')+' English replay; warmup 1%, cosine to 10% of the peak'],
    ['Reference','the same model from scratch on both languages for '+(PT+N).toLocaleString()+' steps, German share '+(100*N/(PT+N)).toFixed(1)+'% (as much German as the no-replay runs)'],
    ['Measure','loss in bits per character on '+M.eval_seqs+' held-out passages per language; seeds '+T.seeds.join(', ')+' (initialisation and data order)']
  ].map(([k,v])=>'<dt>'+k+'</dt><dd>'+v+'</dd>').join('');
  function heat(v){const t=Math.max(0,Math.min(1,v/3));return 'color-mix(in srgb, var(--bad) '+Math.round(t*70)+'%, var(--bg))'}
  function drawGrid(){
    let h='<div class="h"></div>'+M.replays.map(r=>'<div class="h">'+r*100+'% replay</div>').join('');
    M.peaks.forEach(pk=>{h+='<div class="h" style="text-align:right">peak '+pk+'×</div>';
      M.replays.forEach(rp=>{const n=nm(pk,rp),s=S[n];h+='<div class="c'+(n===cur?' on':'')+'" data-n="'+n+'" style="background:'+heat(s.forget)+'">+'+f(s.forget)+'<small>German '+f(s.de)+'</small></div>'})});
    grid.innerHTML=h;grid.querySelectorAll('.c').forEach(c=>c.addEventListener('click',()=>{cur=c.dataset.n;drawGrid();draw()}))}
  function series(name){const runs=T.cpt[name];
    if(seed!=='m')return runs[+seed].map(r=>[r[0],r[1],r[2]]);
    return runs[0].map((r,i)=>[r[0],runs.reduce((s,x)=>s+x[i][1],0)/runs.length,runs.reduce((s,x)=>s+x[i][2],0)/runs.length])}
  function ptSeries(){const runs=T.pt;if(seed!=='m')return runs[+seed];return runs[0].map((r,i)=>[r[0],runs.reduce((s,x)=>s+x[i][1],0)/runs.length,runs.reduce((s,x)=>s+x[i][2],0)/runs.length])}
  function draw(){
    const plot=document.getElementById('tyPlot'),w=Math.min(RD.width(plot),860),h=Math.max(230,Math.min(330,w*0.5));
    const x0=range==='cpt'?PT:0;
    const F=PL.frame({w,h,x:[x0,PT+N],y:[1.4,6],xt:(range==='cpt'?[5000,5250,5500,5750,6000,6250,6500]:[0,1000,2000,3000,4000,5000,6000]).filter(v=>v>=x0&&v<=PT+N),yt:[2,3,4,5,6],xlab:'training step ('+(range==='cpt'?'CPT starts at '+PT.toLocaleString():'pretraining, then CPT from '+PT.toLocaleString())+')',ylab:'bits per character',m:{l:40,r:18,t:10,b:34}});
    let s=F.open()+F.axes;
    if(range==='all')s+='<line x1="'+F.sx(PT)+'" x2="'+F.sx(PT)+'" y1="'+F.m.t+'" y2="'+(F.m.t+F.ih)+'" stroke="var(--mute)" stroke-dasharray="2 3"/>';
    const U=S.union;[U.en,U.de].forEach(v=>{s+='<line x1="'+F.m.l+'" x2="'+(F.W-F.m.r)+'" y1="'+F.sy(v)+'" y2="'+F.sy(v)+'" stroke="var(--c3)" stroke-dasharray="5 4"/>'});
    const base0=cur.replace(/_r.*/,'_r0.0');
    if(base0!==cur){const b=series(base0);s+='<path d="'+PL.path(b.map(r=>[r[0],r[1]]),F.sx,F.sy)+'" fill="none" stroke="var(--mute)" stroke-dasharray="4 4"/>'}
    let a=series(cur);if(range==='all')a=ptSeries().concat(a.slice(1));
    s+='<path d="'+PL.path(a.map(r=>[r[0],Math.min(6,r[1])]),F.sx,F.sy)+'" fill="none" stroke="var(--c1)" stroke-width="2.2"/>';
    s+='<path d="'+PL.path(a.map(r=>[r[0],Math.min(6,r[2])]),F.sx,F.sy)+'" fill="none" stroke="var(--c2)" stroke-width="2.2"/>';
    if(range==='all')s+='<text x="'+(F.sx(PT)-4)+'" y="'+(F.m.t+12)+'" text-anchor="end" font-size="10.5" fill="var(--mute)">German off the chart until CPT</text>';
    plot.innerHTML=s+F.close();
    const sm=S[cur],e=a[a.length-1];
    document.getElementById('tyOut').innerHTML=RD.stat('English after CPT',f(e[1]),'base '+f(S.base.en)+'; seeds '+f(sm.en_min)+' to '+f(sm.en_max))+
      RD.stat('German after CPT',f(e[2]),'base '+f(S.base.de)+'; seeds '+f(sm.de_min)+' to '+f(sm.de_max))+
      RD.stat('Worst English point',f(sm.peak_en),'highest English loss during the run (mean)')+
      RD.stat('Rise removed',sm.removed_pct==null||cur==='p1.0_r0.0'?'n/a':sm.removed_pct+'%','of the full-peak, no-replay English rise')+
      RD.stat('Retrained on both',f(S.union.en)+' / '+f(S.union.de),'English / German, from scratch');
    const k=seed==='m'?0:+seed,sp=T.samples[k];
    document.getElementById('tySmp').innerHTML='<p class="small" style="margin:6px 0 2px">Seed '+(k+1)+', temperature 0.7, prompts "it was a" and "es war ein":</p>'+
      ['base',cur,'union'].map(n=>'<div class="smp"><span class="pr">'+(n==='base'?'base':n==='union'?'retrained on both':'this run')+':</span> '+esc(sp[n].en)+'<br><span class="pr">'+(n==='base'?'base':n==='union'?'retrained on both':'this run')+':</span> '+esc(sp[n].de)+'</div>').join('')}
  function findings(){
    const a=S['p1.0_r0.0'],b=S['p0.1_r0.0'],c=S['p1.0_r0.05'],d=S['p1.0_r0.25'],m=S['p0.33_r0.0'];
    const lrShare=(a.forget-b.forget)/a.forget*100;
    document.getElementById('tyFind').innerHTML='<ul class="tight">'+
      '<li><b>Replay is the cheap lever.</b> At the full peak, 5% replay cuts the English rise from '+f(a.forget)+' to '+f(c.forget)+' ('+c.removed_pct+'% removed) and 25% to '+f(d.forget)+' ('+d.removed_pct+'%), while German ends at '+f(c.de)+' and '+f(d.de)+' against '+f(a.de)+' without replay.</li>'+
      '<li><b>The peak trades.</b> Without replay, peaks of 1×, 0.33× and 0.1× give English rises of '+f(a.forget)+', '+f(m.forget)+' and '+f(b.forget)+', and German losses of '+f(a.de)+', '+f(m.de)+' and '+f(b.de)+'.</li>'+
      '<li><b>How much of the forgetting is the re-warm?</b> Going from a 1× to a 0.1× peak removes '+lrShare.toFixed(0)+'% of the no-replay rise <i class="nl d">derived</i>; the rest comes with the data. Ibrahim et al.\'s 405M German run: 24% (Reading, The two levers).</li>'+
      '<li><b>Retraining on both</b> from scratch ends at English '+f(S.union.en)+' and German '+f(S.union.de)+'; the best continued runs are within '+f(Math.min(...Object.keys(S).filter(k=>/^p/.test(k)).map(k=>Math.abs(S[k].en-S.union.en))))+' of it on English.</li></ul>'}
  document.querySelectorAll('#tySeed button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('#tySeed button').forEach(x=>x.classList.toggle('on',x===b));seed=b.dataset.s;draw()}));
  document.querySelectorAll('#tyRange button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('#tyRange button').forEach(x=>x.classList.toggle('on',x===b));range=b.dataset.r;draw()}));
  document.querySelectorAll('#tySeed button').forEach(b=>{if(b.dataset.s!=='m'&&+b.dataset.s>=T.seeds.length)b.hidden=true});
  drawGrid();findings();
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-toy']=window.TAB_RENDER['t-toy']||[]).push(draw);
  addEventListener('resize',()=>{if(!document.getElementById('t-toy').hidden)draw()});draw();
})();
