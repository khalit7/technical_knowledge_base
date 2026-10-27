// ---- Dream over a recorded tree: replay animation and the area figure (Reading), the dream sweep and the online test (run tab) ----
(function(){
  if(!$('rp'))return;
  const ST={t:3,v:2,lam:0.05,b1:0.002,b2:0.01,base:1,kind:'same',W:10,rho:1,orho:1};
  let hist=[],res=[],win=null,fixed=null;
  const scoreCol=v=>{const a=[232,240,250],b=[47,111,181],u=Math.max(0,Math.min(1,v));return 'rgb('+a.map((x,i)=>Math.round(x+(b[i]-x)*u)).join(',')+')'};
  const cfg=()=>ST.v===2?{v:2,lam:ST.lam}:{v:1,b1:ST.b1,b2:ST.b2};
  function redream(){hist=[...Array(ST.t)].map((_,i)=>SIM.world(ST.base+i));res=SIM.dream(hist,cfg(),ST.W);win=SIM.pick(res);fixed=res.find(r=>SIM.same(r.pol,SIM.FIXED))}
  redream();
  const ck=PAPER.ck,ckTxt='identical to '+(Math.max(ck.max_diff_score_fn,ck.max_diff_end_to_end)<1e-15?'1 part in 10¹⁵':'1e-12')+' on all '+ck.n_candidates+' candidates and in '+ck.n_points_end_to_end+' end-to-end replays, released commit '+ck.commit.slice(0,7);
  $('ckLine').textContent='the two agree to 2 × 10⁻¹⁶ on all '+ck.n_candidates+' candidate policies of the toy, and the released replay environment reproduces the page\'s calls, rounds and best in all '+ck.n_points_end_to_end+' replays it was given ('+ck.n_end_to_end+' policies × 3 worlds × 5 budget preferences).';
  $('ckNote2').textContent=ckTxt;
  // ---- 1. the replay animation (Reading, Method) ----
  const wsel=$('rpW');
  function fillWorlds(){const cur=+wsel.value||0;wsel.innerHTML=hist.map((h,i)=>'<option value="'+i+'">'+(i+1)+' of '+hist.length+' (seed '+h.seed+')</option>').join('');wsel.value=String(Math.min(cur,hist.length-1))}
  fillWorlds();
  const W0=()=>hist[+wsel.value||0];
  const tr={fixed:null,dream:null};
  const dpol=()=>SIM.sched(win.pol,ST.rho);
  const retrace=()=>{tr.fixed=SIM.replay(W0(),SIM.FIXED,ST.W);tr.dream=SIM.replay(W0(),dpol(),ST.W)};retrace();
  function cap(m,k){const T=tr[m],R=T.rounds[k];if(!R)return '';const nr=R.opened.length,nf2=R.batch.length-nr,P=dpol();
    let c='The policy asks for '+R.batch.length+' cell'+(R.batch.length>1?'s':'')+': '+(nf2?(nf2>1?nf2+' refinements of open branches':'1 refinement of an open branch'):'')+(nf2&&nr?' and ':'')+(nr?nr+' new branch'+(nr>1?'es':'')+' from the root':'')+'. Replay reveals each one\'s recorded child; nothing is executed. ';
    if(R.closedNow.length)c+='It closes branch'+(R.closedNow.length>1?'es ':' ')+R.closedNow.map(([b,why])=>(b+1)+(why==='stale'?' (no gain for '+P.p+' attempt'+(P.p>1?'s':'')+')':' (well below the best seen)')).join(', ')+'. ';
    if(k===T.rounds.length-1)c+=m==='fixed'?'Every cell is revealed: this is the run that recorded the world (110 attempts in 11 rounds), whatever the budget preference.':'Nothing is left to ask for, so the replay stops: '+T.N+' attempts in '+T.k+' rounds instead of 110 in 11.';
    return c}
  const modes={fixed:[],dream:[]};
  const fill=()=>{['fixed','dream'].forEach(m=>{modes[m].length=0;tr[m].rounds.forEach((R,k)=>modes[m].push({t:'Round '+(k+1)+(m==='fixed'?' of the fixed policy':' of the dreamed policy at ρ = '+ST.rho),c:cap(m,k)}))})};fill();
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
    return stat('Decision rounds k',String(kk),'of '+T.k)+stat('Attempts revealed n',String(R.N),'the fixed policy: 110')+stat('Best score so far',(R.best*100).toFixed(1),'share of recorded best '+Math.round(100*R.best/wd.best)+'%')+stat('Rounds per call so far',(kk/R.N).toFixed(3),'serial: 1; full batches: 0.1')}
  const A=makeAnim({id:'rp',modes,mode:'fixed',draw:drawGrid,counters,dur:1700});
  function showPol(){$('rpPol').innerHTML='<b>Dreamed winner ('+(ST.v===2?'v2 score':'v1 Eq. 1')+'):</b> '+SIM.label(win.pol)+'. <b>Fixed:</b> 10 open at once, each refined to the end, no closing, no budget knob.'+(SIM.same(win.pol,SIM.FIXED)?' <span class="no">With these coefficients the fixed policy itself wins the dream.</span>':'')}
  showPol();
  // ---- the area of one world (Reading, under the replay score) ----
  function drawHV(){fit($('hvSvg'),w=>{const wd=W0(),lam=ST.lam,s1=SIM.Vhv(wd,win.pol,lam,ST.W),s0=SIM.Vhv(wd,SIM.FIXED,lam,ST.W),B=s1.B;
      const H=240,pl=46,pr=14,pt=14,pb=36,X=v=>pl+(w-pl-pr)*v/B,Y=v=>pt+(H-pt-pb)*(1-v);let s='';
      [0,0.25,0.5,0.75,1].forEach(v=>{s+=ln2(pl,Y(v),w-pr,Y(v),'var(--line)')+tx(pl-6,Y(v)+4,Math.round(v*100)+'%',{fs:11,a:'end',c:'var(--mute)'})});
      [0,20,40,60,80,100].forEach(v=>{if(w<480&&v%40)return;s+=ln2(X(v),H-pb,X(v),H-pb+4,'var(--mute)')+tx(X(v),H-pb+16,String(v),{fs:11,a:'middle',c:'var(--mute)'})});
      s+=tx(X(B),H-pb+16,String(B),{fs:11,a:'end',c:'var(--mute)'});
      s+=tx((pl+w-pr)/2,H-3,'calls n (the recorded run paid '+B+')',{fs:11,a:'middle',c:'var(--mute)'});
      s+='<text x="11" y="'+((pt+H-pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 11 '+((pt+H-pb)/2)+')">attainment a</text>';
      // the dominated area: for each frontier point, the box from its calls to B and up to its attainment
      let prev=0;s1.front.forEach(p=>{s+=rc(X(p.N),Y(p.a),X(B)-X(p.N),Y(prev)-Y(p.a),'var(--c1)',{r:0,op:0.18});prev=p.a});
      let d='';prev=0;s1.front.forEach((p,i)=>{d+=(i?' L':'M')+X(p.N).toFixed(1)+' '+Y(prev).toFixed(1)+' L'+X(p.N).toFixed(1)+' '+Y(p.a).toFixed(1);prev=p.a});if(d)s+='<path d="'+d+' L'+X(B).toFixed(1)+' '+Y(prev).toFixed(1)+'" fill="none" stroke="var(--c1)" stroke-width="1.6"/>';
      const lab=s1.pts.map(p=>({x:X(p.N),y:Y(p.a),t:'ρ '+p.rho,fs:11}));
      s1.pts.forEach(p=>{s+='<circle cx="'+X(p.N).toFixed(1)+'" cy="'+Y(p.a).toFixed(1)+'" r="4.2" fill="var(--c1)"'+(s1.front.includes(p)?'':' opacity="0.45"')+'/>'});
      s+='<circle cx="'+X(B)+'" cy="'+Y(1)+'" r="6" fill="none" stroke="'+CF+'" stroke-width="2.4"/>';
      placeLabels(lab.concat([]),w,H).forEach(p=>{s+=tx(p.lx,p.ly,p.t,{fs:11,a:p.la,c:'var(--ink)'})});
      s+=tx(X(B)-9,Y(1)+18,'fixed: all 5',{fs:11,a:'end',c:CF,w:600});
      $('hvSvg').innerHTML=svgW(w,H,s,'Budget sweep of one recorded world: calls against attainment, with the dominated area shaded');
      $('hvCap').innerHTML='World '+(+wsel.value+1)+' (seed '+wd.seed+'), illustrative. Dreamed winner\'s five replays: '+s1.pts.map(p=>'ρ '+p.rho+': '+p.N+' calls, '+Math.round(100*p.a)+'%').join('; ')+'. Shaded area '+s1.hv.toFixed(3)+' of the box; penalty '+s1.pen.toFixed(3)+' rounds per call; V = '+s1.hv.toFixed(3)+' − '+lam+' × '+s1.pen.toFixed(3)+' = '+s1.V.toFixed(4)+'. The fixed policy\'s five replays all sit at '+B+' calls and 100%: area 0, V = '+s0.V.toFixed(4)+'. Faded points are dominated. Same computation as the released eval.py.'})}
  const reset=()=>{retrace();fill();A.st.k=0;A.st.t=1;A.st.lk=-1;A.draw();drawHV()};
  wsel.addEventListener('change',reset);
  $('rpR').addEventListener('change',e=>{ST.rho=+e.target.value;reset()});
  // ---- 2. the dream sweep ----
  function drawDream(){fit($('drSvg'),w=>{const H=250,pl=50,pr=12,pt=12,pb=36,X=v=>pl+(w-pl-pr)*v/115,Y=v=>pt+(H-pt-pb)*(1-(v-0.5)/0.52);
      let s='';[0.5,0.6,0.7,0.8,0.9,1].forEach(v=>{s+=ln2(pl,Y(v),w-pr,Y(v),'var(--line)')+tx(pl-6,Y(v)+4,Math.round(v*100)+'%',{fs:11,a:'end',c:'var(--mute)'})});
      [0,20,40,60,80,100].forEach(v=>{if(w<480&&v%40)return;s+=ln2(X(v),H-pb,X(v),H-pb+4,'var(--mute)')+tx(X(v),H-pb+16,String(v),{fs:11,a:'middle',c:'var(--mute)'})});
      s+=tx((pl+w-pr)/2,H-3,(ST.v===2?'average calls per world, over the five ρ':'average attempts per world N')+' (fixed policy: 110)',{fs:11,a:'middle',c:'var(--mute)'});
      s+='<text x="11" y="'+((pt+H-pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 11 '+((pt+H-pb)/2)+')">share of recorded best</text>';
      const vs=res.map(r=>r.V),lo=Math.min(...vs),hi=Math.max(...vs);
      res.forEach(r=>{const u=(r.V-lo)/((hi-lo)||1);s+='<circle cx="'+X(r.N).toFixed(1)+'" cy="'+Y(Math.max(0.5,r.share)).toFixed(1)+'" r="2.6" fill="'+scoreCol(0.15+0.85*u)+'" opacity="0.75"/>'});
      const mk=(r,c,t,a)=>'<circle cx="'+X(r.N)+'" cy="'+Y(r.share)+'" r="6" fill="none" stroke="'+c+'" stroke-width="2.4"/>'+tx(X(r.N)+(a==='end'?-9:9),Y(r.share)+(a==='end'?16:-8),t,{fs:11,a:a||'start',c,w:600});
      s+=mk(fixed,CF,'fixed','end')+mk(win,'var(--good)','winner');
      $('drSvg').innerHTML=svgW(w,H,s,'Every candidate policy: calls against share of the recorded best')+'<p class="small mute">Each dot is one of the 505 candidates, averaged over the '+ST.t+' recorded world'+(ST.t>1?'s':'')+(ST.v===2?' and the five budget preferences':' at its own setting (ρ = 1)')+'; darker means a higher score. Below 50% is drawn on the bottom edge. Nothing above 100% is possible: replay only reveals what was recorded.</p>'});
    const R=win;
    $('drOut').innerHTML=(ST.v===2?stat('Winner, v2 score on the history',R.V.toFixed(4),'area '+R.hv.toFixed(3)+' − '+ST.lam+' × penalty '+R.pen.toFixed(3)+'; fixed: '+fixed.V.toFixed(4)):stat('Winner, v1 Eq. 1 on the history',R.V.toFixed(3),'fixed policy: '+fixed.V.toFixed(3)))+
      stat('Winner: calls per world',R.N.toFixed(1),(ST.v===2?'average of its five settings; ':'')+'fixed: 110, a '+Math.round(100*(1-R.N/110))+'% saving')+stat('Winner: share of recorded best',Math.round(100*R.share)+'%','fixed: 100% by construction')+stat('Winner: rounds per world',R.k.toFixed(1),'average batch '+(R.N/R.k).toFixed(1)+' (fixed: 10)');
    $('drSeed').textContent='History: worlds with seeds '+hist.map(h=>h.seed).join(', ')+'.'}
  // ---- 3. online ----
  function online(){const M=300,o={w:{N:0,sh:0,k:0},f:{N:0,sh:0,k:0}};const ratio=[];const P=SIM.sched(win.pol,ST.orho);
    for(let i=0;i<M;i++){const wd=SIM.world(9001+i,{later:ST.kind==='later'});const a=SIM.replay(wd,P,ST.W),b=SIM.replay(wd,SIM.FIXED,ST.W);
      [[a,o.w],[b,o.f]].forEach(([t,x])=>{x.N+=t.N/M;x.k+=t.k/M;x.sh+=t.best/wd.best/M});ratio.push(a.best/b.best)}
    ratio.sort((p,q)=>p-q);const q=f=>ratio[Math.floor(f*(M-1))];
    const inH=hist.map(wd=>SIM.replay(wd,P,ST.W)).reduce((s,t,i)=>s+t.best/hist[i].best,0)/hist.length;
    fit($('onSvg'),w=>{const rows=[['Calls per world n',o.f.N,o.w.N,110,v=>v.toFixed(0)],['Share of the world\'s best found',o.f.sh*100,o.w.sh*100,100,v=>v.toFixed(0)+'%'],['Rounds per world',o.f.k,o.w.k,Math.max(o.f.k,o.w.k,1)*1.15,v=>v.toFixed(1)]];
      const pl=Math.min(190,w*0.42),pr=56,rh=40,H=rows.length*rh+8;let s='';
      rows.forEach((r,i)=>{const y=6+i*rh,X=v=>pl+(w-pl-pr)*Math.max(0,v)/r[3];s+=tx(pl-8,y+17,r[0],{fs:11,a:'end'});
        s+=rc(pl,y+3,X(r[1])-pl,13,CF,{r:2})+tx(X(r[1])+4,y+14,r[4](r[1]),{fs:11,c:'var(--mute)'});
        s+=rc(pl,y+19,X(r[2])-pl,13,'var(--good)',{r:2})+tx(X(r[2])+4,y+30,r[4](r[2]),{fs:11,c:'var(--mute)'})});
      const L=legend([['Fixed parallel refine',CF],['Dreamed winner at ρ = '+ST.orho,'var(--good)']],pl,H+12,w-pl);
      $('onSvg').innerHTML=svgW(w,H+L.h+8,s+L.s,'Online test on 300 fresh worlds')});
    $('onOut').innerHTML=stat('Winner on the history','share '+Math.round(100*inH)+'%','at ρ = '+ST.orho)+stat('Winner online','share '+Math.round(100*o.w.sh)+'%',o.w.N.toFixed(1)+' calls per world')+stat('Online: winner\'s best ÷ fixed\'s','median '+q(0.5).toFixed(2),'10th percentile '+q(0.1).toFixed(2));
    $('onNote').textContent='300 fresh worlds (seeds 9001 to 9300)'+(ST.kind==='later'?', from a generator where 75% of directions only improve after several refinements (30% in the history).':', from the same generator as the history.')+' The fixed policy explores the whole 10 × 11 grid, so it always finds the world\'s best; the winner trades some of it for '+Math.round(100*(1-o.w.N/110))+'% fewer attempts.'}
  function all(){redream();fillWorlds();showPol();reset();drawDream();online()}
  const bind=(id,key,lab)=>{const el=$(id);const show=()=>{$(id+'v').textContent=lab(+el.value)};show();el.addEventListener('input',()=>{ST[key]=+el.value;show();all()})};
  bind('drT','t',v=>String(v));bind('drL','lam',v=>v.toFixed(2));bind('drB1','b1',v=>v.toFixed(4));bind('drB2','b2',v=>v.toFixed(4));
  $('drNew').addEventListener('click',()=>{ST.base+=17;all()});
  segBind('drV',m=>{ST.v=+m;document.querySelectorAll('#dr .v1only').forEach(e=>e.hidden=ST.v!==1);document.querySelectorAll('#dr .v2only').forEach(e=>e.hidden=ST.v!==2);$('drV').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));all()});
  segBind('onK',m=>{ST.kind=m;online()});
  $('onR').addEventListener('change',e=>{ST.orho=+e.target.value;online()});
  onTab('t-run',()=>{drawDream();online()});
  onTab('t-read',()=>{drawHV()});
  drawHV();
  const cs=PAPER.cs;$('csNote').innerHTML='Checked: the replay engine on this page and an independent Python implementation of §3 and v1\'s Eq. 1 agree on attempts, rounds, best score and V for all '+cs.pairs+' (policy, world) pairs of the default history ('+cs.mismatches+' mismatches; src/check_sim.py); v2\'s score is the released eval.py\'s, ported and compared with it ('+ckTxt+'; src/check_score.py). The fixed policy reveals all 110 cells in 11 rounds; the winner never scores below the current policy on the history.';
})();
