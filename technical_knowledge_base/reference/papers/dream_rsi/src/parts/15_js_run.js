// ---- Dream over a recorded tree: replay animation, the dream sweep, and the online test ----
(function(){
  if(!$('rp'))return;
  const ST={t:3,b1:0.002,b2:0.01,base:1,kind:'same',W:10};
  let hist=[],res=[],win=null,fixed=null;
  const scoreCol=v=>{const a=[232,240,250],b=[47,111,181],u=Math.max(0,Math.min(1,v));return 'rgb('+a.map((x,i)=>Math.round(x+(b[i]-x)*u)).join(',')+')'};
  function redream(){hist=[...Array(ST.t)].map((_,i)=>SIM.world(ST.base+i));res=SIM.dream(hist,ST.b1,ST.b2,ST.W);win=SIM.pick(res);fixed=res.find(r=>SIM.same(r.pol,SIM.FIXED))}
  redream();
  // ---- 1. the replay animation ----
  const wsel=$('rpW');
  function fillWorlds(){const cur=+wsel.value||0;wsel.innerHTML=hist.map((h,i)=>'<option value="'+i+'">'+(i+1)+' of '+hist.length+' (seed '+h.seed+')</option>').join('');wsel.value=String(Math.min(cur,hist.length-1))}
  fillWorlds();
  const W0=()=>hist[+wsel.value||0];
  const tr={fixed:null,dream:null};
  const retrace=()=>{tr.fixed=SIM.replay(W0(),SIM.FIXED,ST.W);tr.dream=SIM.replay(W0(),win.pol,ST.W)};retrace();
  function cap(m,k){const T=tr[m],R=T.rounds[k];if(!R)return '';const nr=R.opened.length,nf2=R.batch.length-nr;
    let c='The policy asks for '+R.batch.length+' cell'+(R.batch.length>1?'s':'')+': '+(nf2?(nf2>1?nf2+' refinements of open branches':'1 refinement of an open branch'):'')+(nf2&&nr?' and ':'')+(nr?nr+' new branch'+(nr>1?'es':'')+' from the root':'')+'. Replay reveals each one\'s recorded child; nothing is executed. ';
    if(R.closedNow.length)c+='It closes branch'+(R.closedNow.length>1?'es ':' ')+R.closedNow.map(([b,why])=>(b+1)+(why==='stale'?' (no gain for '+(win.pol.p)+' attempt'+(win.pol.p>1?'s':'')+')':' (well below the best seen)')).join(', ')+'. ';
    if(k===T.rounds.length-1)c+=m==='fixed'?'Every cell is revealed: this is the run that recorded the world (110 attempts in 11 rounds).':'Nothing is left to ask for, so the replay stops: '+T.N+' attempts in '+T.k+' rounds instead of 110 in 11.';
    return c}
  const modes={fixed:[],dream:[]};
  const fill=()=>{['fixed','dream'].forEach(m=>{modes[m].length=0;tr[m].rounds.forEach((R,k)=>modes[m].push({t:'Round '+(k+1)+(m==='fixed'?' of the fixed policy':' of the dreamed policy'),c:cap(m,k)}))})};fill();
  function drawGrid(m,k,e,w){const wd=W0(),T=tr[m],B=wd.B,D=wd.D;
    const revealed={},batch={},closed={};T.rounds.forEach((R,i)=>{if(i<=k)R.batch.forEach(([b,j])=>{revealed[b+','+j]=1});if(i===k)R.batch.forEach(([b,j])=>{batch[b+','+j]=1});if(i<=k)R.closedNow.forEach(([b])=>{closed[b]=1})});
    const pl=26,pt=22,cw=Math.min(40,(w-pl-6)/B),ch=Math.min(24,Math.max(17,cw*0.62)),H=pt+D*ch+28;let s='';
    for(let b=0;b<B;b++){s+=tx(pl+b*cw+cw/2,pt-7,'b'+(b+1),{fs:11,a:'middle',c:'var(--mute)'});
      for(let j=0;j<D;j++){const x=pl+b*cw+1,y=pt+j*ch+1,key=b+','+j,v=wd.s[b][j];
        let f='var(--dim)',op=0.55;if(revealed[key]){op=1;f=v==null?'var(--bad)':scoreCol(v)}
        s+=rc(x,y,cw-2,ch-2,f,{r:2,op,s:batch[key]?'var(--ink)':null,sw:2});
        if(revealed[key]&&v!=null&&cw>=30)s+=tx(x+(cw-2)/2,y+ch/2+3,(v*100).toFixed(0),{fs:11,a:'middle',c:v>0.55?'#fff':'#1d2a38'})}
      if(closed[b])s+=tx(pl+b*cw+cw/2,pt+D*ch+15,'✕',{fs:13,a:'middle',c:'var(--bad)'})}
    for(let j=0;j<D;j+=2)s+=tx(pl-4,pt+j*ch+ch/2+4,String(j+1),{fs:11,a:'end',c:'var(--mute)'});
    return svgW(w,H,s,'Recorded world: branches across, attempts down')}
  function counters(m,k){const T=tr[m],R=T.rounds[Math.min(k,T.rounds.length-1)],wd=W0(),kk=k+1;
    const V=R.best-ST.b1*R.N+ST.b2*R.N/Math.max(1,kk);
    return stat('Decision rounds k',String(kk),'of '+T.k)+stat('Attempts revealed N',String(R.N),'the fixed policy: 110')+stat('Best score so far',(R.best*100).toFixed(1),'share of recorded best '+Math.round(100*R.best/wd.best)+'%')+stat('Eq. 1 so far',V.toFixed(3),'β₁ = '+ST.b1+', β₂ = '+ST.b2)}
  const A=makeAnim({id:'rp',modes,mode:'fixed',draw:drawGrid,counters,dur:1700});
  function showPol(){$('rpPol').innerHTML='<b>Dreamed winner:</b> '+SIM.label(win.pol)+'. <b>Fixed:</b> 10 open at once, each refined to the end, no closing.'+(SIM.same(win.pol,SIM.FIXED)?' <span class="no">With these coefficients the fixed policy itself wins the dream.</span>':'')}
  showPol();
  const reset=()=>{retrace();fill();A.st.k=0;A.st.t=1;A.st.lk=-1;A.draw()};
  wsel.addEventListener('change',reset);
  // ---- 2. the dream sweep ----
  function drawDream(){fit($('drSvg'),w=>{const H=250,pl=50,pr=12,pt=12,pb=36,X=v=>pl+(w-pl-pr)*v/115,Y=v=>pt+(H-pt-pb)*(1-(v-0.5)/0.52);
      let s='';[0.5,0.6,0.7,0.8,0.9,1].forEach(v=>{s+=ln2(pl,Y(v),w-pr,Y(v),'var(--line)')+tx(pl-6,Y(v)+4,Math.round(v*100)+'%',{fs:11,a:'end',c:'var(--mute)'})});
      [0,20,40,60,80,100].forEach(v=>{if(w<480&&v%40)return;s+=ln2(X(v),H-pb,X(v),H-pb+4,'var(--mute)')+tx(X(v),H-pb+16,String(v),{fs:11,a:'middle',c:'var(--mute)'})});
      s+=tx((pl+w-pr)/2,H-3,'average attempts per world N (fixed policy: 110)',{fs:11,a:'middle',c:'var(--mute)'});
      s+='<text x="11" y="'+((pt+H-pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 11 '+((pt+H-pb)/2)+')">share of recorded best</text>';
      const vs=res.map(r=>r.V),lo=Math.min(...vs),hi=Math.max(...vs);
      res.forEach(r=>{const u=(r.V-lo)/((hi-lo)||1);s+='<circle cx="'+X(r.N).toFixed(1)+'" cy="'+Y(Math.max(0.5,r.share)).toFixed(1)+'" r="2.6" fill="'+scoreCol(0.15+0.85*u)+'" opacity="0.75"/>'});
      const mk=(r,c,t,a)=>'<circle cx="'+X(r.N)+'" cy="'+Y(r.share)+'" r="6" fill="none" stroke="'+c+'" stroke-width="2.4"/>'+tx(X(r.N)+(a==='end'?-9:9),Y(r.share)+(a==='end'?16:-8),t,{fs:11,a:a||'start',c,w:600});
      s+=mk(fixed,CF,'fixed','end')+mk(win,'var(--good)','winner');
      host2.innerHTML=svgW(w,H,s,'Every candidate policy: attempts against share of the recorded best')+'<p class="small mute">Each dot is one of the 504 candidates, averaged over the '+ST.t+' recorded world'+(ST.t>1?'s':'')+'; darker means a higher Eq. 1 score. Below 50% is drawn on the bottom edge. Nothing above 100% is possible: replay only reveals what was recorded.</p>'});
    const R=win;$('drOut').innerHTML=stat('Winner, Eq. 1 on the history',R.V.toFixed(3),'fixed policy: '+fixed.V.toFixed(3))+stat('Winner: attempts per world',R.N.toFixed(1),'fixed: 110, a '+Math.round(100*(1-R.N/110))+'% saving')+stat('Winner: share of recorded best',Math.round(100*R.share)+'%','fixed: 100% by construction')+stat('Winner: rounds per world',R.k.toFixed(1),'average batch '+(R.N/R.k).toFixed(1)+' (fixed: 10)');
    $('drSeed').textContent='History: worlds with seeds '+hist.map(h=>h.seed).join(', ')+'.'}
  const host2=$('drSvg');
  // ---- 3. online ----
  function online(){const M=300,o={w:{V:0,N:0,sh:0,k:0},f:{V:0,N:0,sh:0,k:0}};const ratio=[];
    for(let i=0;i<M;i++){const wd=SIM.world(9001+i,{later:ST.kind==='later'});const a=SIM.replay(wd,win.pol,ST.W),b=SIM.replay(wd,SIM.FIXED,ST.W);
      [[a,o.w],[b,o.f]].forEach(([t,x])=>{x.V+=SIM.V(t,ST.b1,ST.b2)/M;x.N+=t.N/M;x.k+=t.k/M;x.sh+=t.best/wd.best/M});ratio.push(a.best/b.best)}
    ratio.sort((p,q)=>p-q);const q=f=>ratio[Math.floor(f*(M-1))];
    const inS=win.share,onS=o.w.sh;
    fit($('onSvg'),w=>{const rows=[['Attempts per world N',o.f.N,o.w.N,110,v=>v.toFixed(0)],['Share of the world\'s best found',o.f.sh*100,o.w.sh*100,100,v=>v.toFixed(0)+'%'],['Eq. 1 score V',o.f.V,o.w.V,Math.max(o.f.V,o.w.V,0.01)*1.15,v=>v.toFixed(3)]];
      const pl=Math.min(190,w*0.42),pr=56,rh=40,H=rows.length*rh+8;let s='';
      rows.forEach((r,i)=>{const y=6+i*rh,X=v=>pl+(w-pl-pr)*Math.max(0,v)/r[3];s+=tx(pl-8,y+17,r[0],{fs:11,a:'end'});
        s+=rc(pl,y+3,X(r[1])-pl,13,CF,{r:2})+tx(X(r[1])+4,y+14,r[4](r[1]),{fs:11,c:'var(--mute)'});
        s+=rc(pl,y+19,X(r[2])-pl,13,'var(--good)',{r:2})+tx(X(r[2])+4,y+30,r[4](r[2]),{fs:11,c:'var(--mute)'})});
      const L=legend([['Fixed parallel refine',CF],['Dreamed winner','var(--good)']],pl,H+12,w-pl);
      $('onSvg').innerHTML=svgW(w,H+L.h+8,s+L.s,'Online test on 300 fresh worlds')});
    $('onOut').innerHTML=stat('Winner on the history','share '+Math.round(100*inS)+'%','V '+win.V.toFixed(3))+stat('Winner online','share '+Math.round(100*onS)+'%','V '+o.w.V.toFixed(3))+stat('Online: winner\'s best ÷ fixed\'s','median '+q(0.5).toFixed(2),'10th percentile '+q(0.1).toFixed(2));
    $('onNote').textContent='300 fresh worlds (seeds 9001 to 9300)'+(ST.kind==='later'?', from a generator where 75% of directions only improve after several refinements (30% in the history).':', from the same generator as the history.')+' The fixed policy explores the whole 10 × 11 grid, so it always finds the world\'s best; the winner trades some of it for '+Math.round(100*(1-o.w.N/110))+'% fewer attempts.'}
  function all(){redream();fillWorlds();showPol();reset();drawDream();online()}
  const bind=(id,key,f,lab)=>{const el=$(id);const show=()=>{$(id+'v').textContent=lab(+el.value)};show();el.addEventListener('input',()=>{ST[key]=+el.value;show();all()})};
  bind('drT','t',null,v=>String(v));bind('drB1','b1',null,v=>v.toFixed(4));bind('drB2','b2',null,v=>v.toFixed(4));
  $('drNew').addEventListener('click',()=>{ST.base+=17;all()});
  segBind('onK',m=>{ST.kind=m;online()});
  onTab('t-run',()=>{drawDream();online();A.draw()});
  const cs=PAPER.cs;$('csNote').innerHTML='Checked: the replay engine on this page and an independent Python implementation of §3 and Eq. 1 agree on attempts, rounds, best score and V for all '+cs.pairs+' (policy, world) pairs of the default history ('+cs.mismatches+' mismatches); the fixed policy reveals all 110 cells in 11 rounds; the winner never scores below the current policy on the history (src/check_sim.py).';
})();
