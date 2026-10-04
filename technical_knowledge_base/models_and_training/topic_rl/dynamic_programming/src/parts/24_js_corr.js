// ---- Reading section 10: the corridor, one backup per step, four ways ----
(function(){
  const D=window.DPE,w=D.W.corr,g=0.9,NM=['A','B','C','G'];
  const VS=[8.1,9,10,0],VPI=D.evalExact(w,D.uniform(w),g);
  const P=document.getElementById('dp-coP'),Tt=document.getElementById('dp-coT'),Eq=document.getElementById('dp-coE'),Xp=document.getElementById('dp-coX'),N=document.getElementById('dp-coN');
  let mode='sync',steps=D.corridorSteps('sync',g,6);
  const build=m=>D.corridorSteps(m,g,m==='pe'?40:6);
  const f=v=>{const r=Math.round(v*1e4)/1e4;return (Object.is(r,-0)?0:r).toString().replace('-','−')};
  function draw(i){const st=steps[i],W=RD.width(P),cw=Math.min(150,Math.floor((W-16)/4)),ox=Math.floor((W-cw*4)/2),H=cw*0.9+46;let s='';
    const tgt=mode==='pe'?VPI:VS;
    for(let k=0;k<4;k++){const x=ox+k*cw,y=18,h=cw*0.9-10,on=k===st.s,term=k===3;
      s+='<rect x="'+(x+3)+'" y="'+y+'" width="'+(cw-6)+'" height="'+h+'" rx="8" fill="'+(term?'var(--soft)':RD.colorScale(st.V[k],-10,10))+'" stroke="'+(on?'var(--ink)':'var(--line)')+'" stroke-width="'+(on?2.5:1)+'"/>';
      s+=RD.t(x+cw/2,y+16,NM[k]+(term?' (goal)':''),{a:'middle',fs:12,w:600,fill:'var(--mute)'});
      s+=RD.t(x+cw/2,y+h/2+8,term?'0':f(st.V[k]),{a:'middle',fs:cw<90?15:19,w:600});
      if(!term&&st.read&&on)s+=RD.t(x+cw/2,y+h-8,'reads '+NM.slice(0,3).map((n,j)=>n+' '+f(st.read[j])).join(', '),{a:'middle',fs:cw<110?8:9.5,fill:'var(--mute)'});
      if(!term){const q=D.qs(w,st.V,g,k),best=q[1]>q[0]+1e-12?1:q[0]>q[1]+1e-12?0:-1;
        s+=RD.t(x+cw/2,y+h+18,best<0?'← →  (tie)':best?'greedy →':'← greedy',{a:'middle',fs:11,fill:'var(--mute)'})}}
    // reward arrow into the goal
    s+=RD.t(ox+3*cw-2,12,'+10 on entering',{a:'middle',fs:10,fill:'var(--c3)'});
    P.innerHTML=RD.svg(W,H,s,'Corridor A, B, C, goal');
    const err=Math.max(...[0,1,2].map(k=>Math.abs(st.V[k]-tgt[k])));
    const name={sync:'Synchronous value iteration',cba:'In-place value iteration, order C, B, A',abc:'In-place value iteration, order A, B, C',pe:'Evaluating the uniform random policy (synchronous)'}[mode];
    if(i===0){Tt.textContent=name+': start';Eq.innerHTML='V = (0, 0, 0); V(G) = 0 always.';
      Xp.textContent=mode==='pe'?'Each backup averages left and right with probability 0.5: 0.45 × (neighbours) plus 0.5 × 10 for C.':mode==='sync'?'Each backup reads the previous sweep\'s values, so reward information moves one state per sweep.':'Each backup reads the current array, so a state can use a value written earlier in the same sweep.'}
    else{const k=st.s,q=st.Q,rd=st.read;Tt.textContent=name+': sweep '+st.sweep+', back up '+NM[k];
      const lt=k===0?'0.9 × V(A) = 0.9 × '+f(rd[0]):'0.9 × V('+NM[k-1]+') = 0.9 × '+f(rd[k-1]);
      const rt=k===2?'10 + 0.9 × V(G) = 10':'0.9 × V('+NM[k+1]+') = 0.9 × '+f(rd[k+1]);
      Eq.innerHTML=mode==='pe'?'V('+NM[k]+') ← 0.5 × ['+lt+'] + 0.5 × ['+rt+'] = '+f(st.V[k]):'V('+NM[k]+') ← max( left: '+lt+', right: '+rt+' ) = '+f(st.V[k]);
      const end=i===steps.length-1;
      Xp.textContent=end?(mode==='pe'?'After '+st.sweep+' sweeps the values are within '+RD.n(err,4)+' of V_π = (4.29, 5.24, 7.36), the solution of the three linear equations. Greedy on them is right everywhere: one improvement gives the optimal policy.':
        'A sweep changed nothing: converged to V* = (8.1, 9, 10) after '+st.sweep+' sweep'+(st.sweep>1?'s':'')+' ('+(steps.length-1)+' backups), counting the sweep that confirms it.'):
        mode==='cba'&&st.sweep===1?'Backing up in the order the reward flows lets each state use the value just written: one sweep reaches V*.':
        mode==='abc'&&st.sweep===1&&k<2?'A and B are backed up before C has learned anything, so they read zeros: this order is no faster than synchronous here.':
        mode==='pe'&&st.sweep===3&&k===2?'After three sweeps, (1.0125, 2.25, 6.0125): greedy already picks right everywhere, though the values are far from V_π.':
        mode==='sync'?'Synchronous: the backup reads the values from before this sweep, shown in the cell.':'In place: the backup reads the latest values, including any written earlier in this sweep.'}
    N.innerHTML=RD.stat('Sweep',String(st.sweep),'')+RD.stat('Backups',String(i),'one state each')+RD.stat('Largest gap to '+(mode==='pe'?'V<sub>π</sub>':'V<sub>*</sub>'),RD.n(err,4),'over A, B, C')}
  const an=RD.anim({card:'dp-co',ctl:'dp-coC',n:steps.length,ms:1100,draw,label:'Backup'});
  document.getElementById('dp-coM').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mode=b.dataset.m;[...b.parentNode.children].forEach(x=>x.classList.toggle('on',x===b));steps=build(mode);an.reset(steps.length);an.play()});
  RD.onResize(()=>an.redraw());
})();
