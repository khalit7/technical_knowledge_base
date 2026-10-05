// ---- Part 2, Optimisation ladder tab ----
(function(){
  const X=window.RBX,RB=X.RB,fmt=X.fmt;const root=document.getElementById('t-rb-ladder');if(!root||!RB.ladder)return;
  const NOTE={python:'The baseline. The Python loop over characters takes about three quarters of the run; json.loads most of the rest.',
    percall:'Only the token loop moved, and it is called once per message: 199,992 crossings. The loop phase shrinks by more than 20x, the whole program by about 3x, because json.loads is untouched.',
    owned:'One crossing for the whole list, but Vec<String> copies all 25 million characters into new Rust strings first: its counting phase is slower than step 1\'s 199,992 calls, and end to end the two are within noise.',
    borrowed:'One crossing, no copies: &str views of the Python strings. Barely better than step 1: the program is now waiting on json.loads.',
    bytes:'The parsing moves too. Python reads the file as bytes and makes one call; serde parses each line into a typed struct and Rust tallies per user.',
    parallel:'py.detach releases the GIL and rayon splits the bytes into 8 chunks at newlines. The Rust phase shrinks; start-up and reading the file do not.'};
  const STEPS=X.STEPS;let cur='python',cmp='prev';
  const prevOf=id=>{const i=STEPS.findIndex(s=>s.id===id);return i>0?STEPS[i-1].id:null};
  function draw(){
    const L=RB.L,s=STEPS.find(x=>x.id===cur),p=prevOf(cur),t=L[cur].median;
    document.getElementById('rb-ld-stats').innerHTML=RD.stat('End to end',fmt(t*1000,0)+' ms','min '+fmt(L[cur].min*1000,0)+', max '+fmt(L[cur].max*1000,0))+
      RD.stat('vs pure Python',fmt(L.python.median/t,1)+'x faster')+RD.stat('vs previous step',p?fmt(L[p].median/t,2)+'x':'(first step)')+
      RD.stat('Calls into Rust',{python:'0',percall:'199,992',owned:'1',borrowed:'1',bytes:'1',parallel:'1'}[cur]);
    document.getElementById('rb-ld-cap').textContent=s.n+'. '+s.name+': '+NOTE[cur];
    X.bars(document.getElementById('rb-ld-bars'),X.ladderRows(cur),{unit:' s',d:3,log:document.getElementById('rb-ld-log').checked});
    const c=cmp==='prev'?p:cmp;const ids=c&&c!==cur?[c,cur]:[cur];
    const P=RB.phases;const tot=id=>Object.values(P[id]).reduce((a,b)=>a+b,0);
    X.phaseBars(document.getElementById('rb-ld-ph'),ids,{max:Math.max(...ids.map(tot))});
    root.querySelectorAll('[data-rb-step]').forEach(d=>{d.hidden=d.dataset.rbStep!==cur})}
  RD.seg(document.getElementById('rb-ld-seg'),v=>{cur=v;draw()});
  document.getElementById('rb-ld-cmp').addEventListener('change',e=>{cmp=e.target.value;draw()});
  document.getElementById('rb-ld-log').addEventListener('change',draw);
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-rb-ladder']=window.TAB_RENDER['t-rb-ladder']||[]).push(draw);
  draw();
})();
