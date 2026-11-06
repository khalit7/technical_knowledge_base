// ---- Reading section 8: the corridor, one backup per step, four ways; the step list on the left is written from the same steps ----
(function(){
  const D=window.DPE,w=D.W.corr,g=0.9,NM=['A','B','C','G'];
  const VS=[8.1,9,10,0],VPI=D.evalExact(w,D.uniform(w),g);
  const P=document.getElementById('dp-coP'),N=document.getElementById('dp-coN');
  const build=m=>{const a=D.corridorSteps(m,g,m==='pe'?40:6).map((x,i)=>Object.assign({idx:i},x));return m==='pe'?a.slice(0,10).concat([a[a.length-1]]):a};
  let mode='sync',steps=build('sync');
  const f=v=>{const r=Math.round(v*1e4)/1e4;return (Object.is(r,-0)?0:r).toString().replace('-','−')};
  // the step list on the left: one item per step, written from the same backups the figure draws
  const L=document.getElementById('sx-co');
  function item(i){const st=steps[i];if(i===0)return '<b>Start: V = (0, 0, 0).</b> '+(mode==='pe'?'Each backup averages left and right with probability 0.5: 0.45 × (neighbours) plus 0.5 × 10 for C.':mode==='sync'?'Each backup reads the previous sweep\'s values, so reward information moves one state per sweep.':'Each backup reads the current array, so a state can use a value written earlier in the same sweep.');
    const k=st.s,end=i===steps.length-1,jump=mode==='pe'&&end;
    // the backup itself: left and right as read (the in-place array's own old value comes from the step before)
    const q=st.Q,bk=mode==='pe'?'0.5 × left '+f(q[0])+' + 0.5 × right '+f(q[1]):'max(left '+f(q[0])+', right '+f(q[1])+')';
    let t='<b>'+(jump?'Sweep '+st.sweep+' (sweeps 4 to '+(st.sweep-1)+' skipped)':'Sweep '+st.sweep)+': '+NM[k]+' ← '+bk+' = '+f(st.V[k])+'.</b> ';
    if(end)t+=mode==='pe'?'The values are within '+RD.n(Math.max(...[0,1,2].map(j=>Math.abs(st.V[j]-VPI[j]))),4)+' of V<sub>π</sub> = (4.29, 5.24, 7.36), the solution of the three linear equations. Greedy on them is right everywhere: one improvement gives the optimal policy.':'A sweep changed nothing: converged to V<sub>*</sub> = (8.1, 9, 10) after '+st.sweep+' sweep'+(st.sweep>1?'s':'')+' ('+(steps.length-1)+' backups), counting the sweep that confirms it.';
    else if(mode==='cba'&&st.sweep===1)t+=k===2?'C reads G: right gives 10.':'Backing up in the order the reward flows lets '+NM[k]+' use the value just written to its right: one sweep reaches V<sub>*</sub>.';
    else if(mode==='abc'&&st.sweep===1&&k<2)t+=NM[k]+' is backed up before C has learned anything, so it reads zeros: this order is no faster than synchronous here.';
    else if(mode==='pe'&&st.sweep===3&&k===2)t+='After three sweeps, (1.0125, 2.25, 6.0125): greedy already picks right everywhere, though the values are far from V<sub>π</sub>.';
    else t+=st.V[k]!==steps[i-1].V[k]?'':'Unchanged.';
    return t}
  function fill(){L.innerHTML=steps.map((_,i)=>'<li>'+item(i)+'</li>').join('')}
  fill();
  function draw(i){const st=steps[i],W=RD.width(P),cw=Math.min(150,Math.floor((W-16)/4)),ox=Math.floor((W-cw*4)/2),H=cw*0.9+66;let s='';
    const tgt=mode==='pe'?VPI:VS;
    for(let k=0;k<4;k++){const x=ox+k*cw,y=18,h=cw*0.9-10,on=k===st.s,term=k===3;
      s+='<rect x="'+(x+3)+'" y="'+y+'" width="'+(cw-6)+'" height="'+h+'" rx="8" fill="'+(term?'var(--soft)':RD.colorScale(st.V[k],-10,10))+'" stroke="'+(on?'var(--ink)':'var(--line)')+'" stroke-width="'+(on?2.5:1)+'"/>';
      s+=RD.t(x+cw/2,y+16,NM[k]+(term?' (goal)':''),{a:'middle',fs:12,w:600,fill:'var(--mute)'});
      s+=RD.t(x+cw/2,y+h/2+8,term?'0':f(st.V[k]),{a:'middle',fs:cw<90?15:19,w:600});
      if(!term){const q=D.qs(w,st.V,g,k),best=q[1]>q[0]+1e-12?1:q[0]>q[1]+1e-12?0:-1;
        s+=RD.t(x+cw/2,y+h+18,best<0?'← →  (tie)':best?'greedy →':'← greedy',{a:'middle',fs:11,fill:'var(--mute)'})}}
    // reward arrow into the goal
    s+=RD.t(ox+3*cw-2,12,'+10 on entering',{a:'middle',fs:11,fill:'var(--c3)'});
    // what the backup read: its neighbours (and itself, for A's bump into the wall); an in-place array already holds the new value, so its own old value comes from the step before
    const ip=mode==='cba'||mode==='abc',rv=j=>j===st.s&&i>0&&ip?steps[i-1].V[j]:st.read[j],nb=st.s===0?[0,1]:st.s===1?[0,2]:[1];
    if(st.read)s+=RD.t(W/2,H-4,NM[st.s]+' reads '+nb.map(j=>'V('+NM[j]+') = '+f(rv(j))).join(', ')+(st.s===2?', V(G) = 0':''),{a:'middle',fs:12,fill:'var(--mute)'});
    P.innerHTML=RD.svg(W,H,s,'Corridor A, B, C, goal');
    const err=Math.max(...[0,1,2].map(k=>Math.abs(st.V[k]-tgt[k])));
    N.innerHTML=RD.stat('Sweep',String(st.sweep),'')+RD.stat('Backups',String(st.idx),'one state each')+RD.stat('Largest gap to '+(mode==='pe'?'V<sub>π</sub>':'V<sub>*</sub>'),RD.n(err,4),'over A, B, C')}
  const an=RD.anim({card:'dp-co',ctl:'dp-coC',n:steps.length,ms:3200,draw,label:'Backup',list:'sx-co'});
  document.getElementById('dp-coM').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mode=b.dataset.m;[...b.parentNode.children].forEach(x=>x.classList.toggle('on',x===b));steps=build(mode);fill();an.reset(steps.length,'sx-co')});
  RD.onResize(()=>an.redraw());
})();
