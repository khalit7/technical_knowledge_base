// ---- Sections 11 and 13: ablation summary (from the decoded Figure 4) and one agent's medians under different protocols ----
(function(){
  const E=window.VBE,F=window.VB_F4;
  const NAMES={'no multi-step':'Multi-step','no priority':'Prioritised replay','no distribution':'Distributional','no noisy':'Noisy Nets','no dueling':'Dueling','no double':'Double Q'};
  const COLS={'no multi-step':'var(--c5)','no priority':'var(--c1)','no distribution':'var(--c2)','no noisy':'var(--bad)','no dueling':'var(--c3)','no double':'var(--c4)'};
  const keys=Object.keys(F.rows).map(k=>[k,E.fig4Stats(F.rows[k],F.hi[k])]).sort((a,b)=>b[1].median-a[1].median);
  RD.bars(document.getElementById('vb-abS'),keys.map(([k,s])=>({nm:'without '+NAMES[k],note:'hurt '+s.hurt+', helped '+s.helped+' of 55 games',v:s.median,lab:RD.n(s.median,2),col:COLS[k]})),{lo:0,hi:0.5});
  window.VB_ABL={NAMES,COLS};
  // one agent, several medians: every value printed in the table named
  const EV=[
    {nm:'DQN',note:'Double DQN paper, Table 1: no-op starts, 5 min, 49 games',v:93.5},
    {nm:'DQN',note:'Dueling paper, Table 1: 30 no-ops, 57 games',v:79.1},
    {nm:'DQN',note:'Dueling paper, Table 1: human starts, 57 games',v:68.5},
    {nm:'DQN',note:'Double DQN paper, Table 2: human starts, 30 min, 49 games (from Nair et al.)',v:47.5},
    {nm:'Rainbow',note:'IQN paper, Table 1: 30 no-ops, average of 2 seeds',v:230},
    {nm:'Rainbow',note:'Rainbow paper, Table 2: no-ops, best snapshot',v:223},
    {nm:'Rainbow',note:'Rainbow paper, Table 2: human starts, best snapshot',v:153},
    {nm:'QR-DQN',note:'QR-DQN paper, Table 1: best scores (QR-DQN-1)',v:211},
    {nm:'QR-DQN',note:'IQN paper, Table 1: 30 no-ops, average of 3 seeds',v:193}];
  const cm={DQN:'var(--c2)',Rainbow:'var(--c1)','QR-DQN':'var(--c3)'};
  RD.bars(document.getElementById('vb-ev'),EV.map(e=>({nm:e.nm,note:e.note,v:e.v,lab:RD.n(e.v,1)+'%',col:cm[e.nm]})),{lo:0,hi:240});
})();
