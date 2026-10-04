// ---- Reading sections 2 and 3: Monte Carlo sampling of the student MRP, the student diagram (reused from the Topic: rl long Reading tab) ----
(function(){
  const E=window.RDE;
  // ---- Monte Carlo sampling of the student MRP from Class 1 ----
  (function(){
    const nm=['Class 1','Class 2','Class 3','Pass','Pub','Facebook','Sleep'];
    const P=document.getElementById('rd-mcP'),O=document.getElementById('rd-mcOut'),C=document.getElementById('rd-mcPath'),Gs=document.getElementById('rd-mcG');
    let r,ret,last;
    function reset(){r=E.rng(42);ret=[];last=null;draw()}
    function sample(n){const g=+Gs.value;for(let i=0;i<n;i++){last=E.mrpEpisode(0,g,r);ret.push(last.G)}draw()}
    function draw(){const g=+Gs.value,V=E.mrpValues(g)[0],N=ret.length,mean=N?ret.reduce((a,b)=>a+b,0)/N:0;
      const sd=N>1?Math.sqrt(ret.reduce((a,b)=>a+(b-mean)*(b-mean),0)/(N-1)):0;
      if(last){const p=last.path.slice(0,-1).map((s,i)=>'<span>'+nm[s]+' <b>'+RD.sg(last.rew[i],0)+'</b></span>');C.innerHTML=p.join('')+'<span>Sleep</span>'+(last.path.length>14?'<span class="mute">'+(last.path.length-1)+' steps</span>':'')}else C.innerHTML='<span class="mute">No episode yet: press Sample.</span>';
      O.innerHTML=RD.stat('Last return','<span>'+(last?RD.n(last.G,3):'none')+'</span>','one sample of G')+RD.stat('Episodes',String(N),'')+RD.stat('Mean of returns',N?RD.n(mean,3):'none',N>1?'± '+RD.n(sd/Math.sqrt(N),3)+' (one standard error)':'')+RD.stat('Exact V(Class 1)',RD.n(V,3),'Bellman solution at γ = '+g);
      const W=RD.width(P),H=150,l=44,rr=10,t=10,b=22;let s='';
      if(N){const xs=Math.max(N,10),run=[];let acc=0;ret.forEach((x,i)=>{acc+=x;run.push(acc/(i+1))});
        const lo=Math.min(V,...run)-1,hi=Math.max(V,...run)+1,X=i=>l+(W-l-rr)*(i/(xs-1||1)),Y=v=>t+(H-t-b)*(hi-v)/(hi-lo);
        s+='<line x1="'+l+'" x2="'+(W-rr)+'" y1="'+Y(V)+'" y2="'+Y(V)+'" stroke="var(--c2)" stroke-dasharray="5 4"/>';
        s+='<polyline fill="none" stroke="var(--c1)" stroke-width="2" points="'+run.map((v,i)=>X(i).toFixed(1)+','+Y(v).toFixed(1)).join(' ')+'"/>';
        s+=RD.t(l-4,Y(hi)+10,RD.n(hi,1),{a:'end',fill:'var(--mute)',fs:10})+RD.t(l-4,Y(lo),RD.n(lo,1),{a:'end',fill:'var(--mute)',fs:10});
        s+=RD.t(W-rr,Y(V)-4,'exact '+RD.n(V,2),{a:'end',fill:'var(--c2)',fs:10})+RD.t(l,H-6,'episode 1',{fill:'var(--mute)',fs:10})+RD.t(W-rr,H-6,'episode '+xs,{a:'end',fill:'var(--mute)',fs:10});
      }else s+=RD.t(W/2,H/2,'running mean of sampled returns appears here',{a:'middle',fill:'var(--mute)'});
      P.innerHTML=RD.svg(W,H,s,'Running mean of returns')}
    document.getElementById('rd-mc1').addEventListener('click',()=>sample(1));
    document.getElementById('rd-mc10').addEventListener('click',()=>sample(10));
    document.getElementById('rd-mc100').addEventListener('click',()=>sample(100));
    document.getElementById('rd-mcR').addEventListener('click',reset);Gs.addEventListener('change',reset);
    RD.onRender(draw);RD.onResize(draw);reset();
  })();

  // ---- the student MRP and MDP diagram ----
  (function(){
    const P=document.getElementById('rd-smP'),T=document.getElementById('rd-smT'),Eq=document.getElementById('rd-smE'),X=document.getElementById('rd-smX'),Gs=document.getElementById('rd-smG'),Gv=document.getElementById('rd-smGv');
    let mode='mrp',sel=2;
    const NM=['Class 1','Class 2','Class 3','Pass','Pub','Facebook','Sleep'];
    // MDP state index for each diagram node (C1, C2, C3, FB); Pass, Pub and Sleep are not MDP states
    const MI={0:0,1:1,2:2,5:3};
    const posW=[[.1,.76],[.37,.76],[.64,.76],[.9,.76],[.5,.3],[.1,.3],[.9,.3]],posN=[[.2,.12],[.2,.43],[.2,.74],[.78,.74],[.78,.43],[.78,.12],[.5,.94]];
    function solve(){const g=+Gs.value/100;
      if(mode==='mrp'){const V=E.mrpValues(g);return {g,V:V.concat([0])}}
      const res=mode==='opt'?E.mdpOptimal(g):E.mdpEval([.5,.5,.5,.5],g);const V=[res.V[0],res.V[1],res.V[2],null,null,res.V[3],0];return {g,V,Q:res.Q,mv:res.V}}
    function edges(){if(mode==='mrp')return [[0,1,'0.5'],[0,5,'0.5'],[1,2,'0.8'],[1,6,'0.2'],[2,3,'0.6'],[2,4,'0.4'],[3,6,'1'],[4,0,'0.2'],[4,1,'0.4'],[4,2,'0.4'],[5,0,'0.1'],[5,5,'0.9']];
      return [[0,1,'Study −2',0,0],[0,5,'Facebook −1',0,1],[1,2,'Study −2',1,0],[1,6,'Sleep 0',1,1],[2,3,'Study +10',2,0],[2,4,'Pub +1',2,1],[3,6,'',-1],[4,0,'0.2',-1],[4,1,'0.4',-1],[4,2,'0.4',-1],[5,0,'Quit 0',3,0],[5,5,'Facebook −1',3,1]]}
    function draw(){const st=solve();Gv.textContent=st.g.toFixed(2);const W=RD.width(P),narrow=W<560,H=narrow?400:310,pos=(narrow?posN:posW).map(p=>[p[0]*W,p[1]*H]),R=narrow?22:25;
      const vals=st.V.filter(v=>v!=null),lo=Math.min(0,...vals),hi=Math.max(0,...vals);let s='<defs><marker id="rd-smAr" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="9" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker></defs>';
      edges().forEach(e=>{const [a,b,lab,ms,ai]=e;const A=pos[a],B=pos[b];
        let w=1.2,dash='',col='var(--mute)';
        if(mode!=='mrp'&&ms>=0){if(mode==='opt'){const q=st.Q[ms],best=q.indexOf(Math.max(...q));if(ai===best){w=3;col='var(--c3)'}else dash=' stroke-dasharray="4 3"'}}
        if(mode!=='mrp'&&a===3){dash=' stroke-dasharray="2 3"'}
        if(a===b){const x=A[0],y=A[1]-R;s+='<path d="M'+(x-10)+','+(y+3)+' C'+(x-30)+','+(y-34)+' '+(x+30)+','+(y-34)+' '+(x+10)+','+(y+3)+'" fill="none" stroke="'+col+'" stroke-width="'+w+'"'+dash+' marker-end="url(#rd-smAr)"/>'+RD.t(x,y-30,lab,{a:'middle',fs:10,fill:'var(--mute)'});return}
        const dx=B[0]-A[0],dy=B[1]-A[1],L=Math.hypot(dx,dy),ux=dx/L,uy=dy/L,nx=-uy,ny=ux,bend=14;
        const sx=A[0]+ux*R,sy=A[1]+uy*R,ex=B[0]-ux*(R+2),ey=B[1]-uy*(R+2),cx=(sx+ex)/2+nx*bend,cy=(sy+ey)/2+ny*bend;
        s+='<path d="M'+sx.toFixed(1)+','+sy.toFixed(1)+' Q'+cx.toFixed(1)+','+cy.toFixed(1)+' '+ex.toFixed(1)+','+ey.toFixed(1)+'" fill="none" stroke="'+col+'" stroke-width="'+w+'"'+dash+' marker-end="url(#rd-smAr)"/>';
        if(lab)s+=RD.t(((sx+ex)/2+nx*(bend+9)).toFixed(1),((sy+ey)/2+ny*(bend+9)+3).toFixed(1),lab,{a:'middle',fs:10,fill:'var(--mute)'})});
      pos.forEach((p,i)=>{const v=st.V[i];const isState=mode==='mrp'||i in MI||i===6;
        if(mode!=='mrp'&&i===4){s+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="7" fill="var(--mute)"/>'+RD.t(p[0],p[1]-12,'chance',{a:'middle',fs:10,fill:'var(--mute)'});return}
        if(mode!=='mrp'&&i===3){s+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="'+(R-6)+'" fill="none" stroke="var(--dim)" stroke-dasharray="3 3"/>'+RD.t(p[0],p[1]+4,'end',{a:'middle',fs:10,fill:'var(--mute)'});return}
        const fill=i===6?'var(--soft)':RD.colorScale(v,lo,hi);
        s+='<g class="rd-smN" data-i="'+i+'" style="cursor:pointer"><circle cx="'+p[0]+'" cy="'+p[1]+'" r="'+R+'" fill="'+fill+'" stroke="'+(i===sel?'var(--ink)':'var(--line)')+'" stroke-width="'+(i===sel?2.5:1)+'"/>'+
          RD.t(p[0],p[1]-3,NM[i],{a:'middle',fs:narrow?9.5:10.5,w:600})+RD.t(p[0],p[1]+11,i===6?'0':RD.n(v,2),{a:'middle',fs:11})+'</g>'});
      P.innerHTML=RD.svg(W,H,s,'Student example');caption(st)}
    function caption(st){const g=st.g,f=v=>RD.n(v,2),gs=g.toFixed(2);
      if(mode==='mrp'){const i=sel;T.textContent=NM[i]+': V = '+(i===6?'0 (terminal)':f(st.V[i]));
        if(i===6){Eq.innerHTML='Sleep is terminal: its value is 0 by definition.';X.textContent='';return}
        const Pm=E.MRP.P[i],Rm=E.MRP.R[i];const terms=Pm.map(([t,p])=>p+' × '+f(st.V[t])).join(' + ');
        Eq.innerHTML='V('+NM[i]+') = R + γ Σ P V(s′) = '+RD.n(Rm,0)+' + '+gs+' × ('+terms+') = '+f(Rm+g*Pm.reduce((a,[t,p])=>a+p*st.V[t],0));
        X.textContent=i===5&&g>0.95?'Facebook loops on itself with probability 0.9: about 10 steps at −1 each, then Class 1.':(i===1?'Reward −2, yet the value can be positive: reward is not value.':'Each state satisfies its own one-step equation; that is what makes the vector the value function.');return}
      if(!(sel in MI)){T.textContent=NM[sel];Eq.innerHTML=sel===3?'In the MDP, Pass is folded into Class 3\'s Study action (+10, then the end).':sel===4?'In the MDP the Pub is a chance node: after the Pub action, chance sends you to Class 1, 2 or 3 with 0.2, 0.4 and 0.4.':'Sleep is terminal: value 0.';X.textContent='Click Class 1, 2, 3 or Facebook.';return}
      const m=MI[sel],acts=E.MDP.A[m],q=st.Q[m];const parts=acts.map((a,k)=>a[0]+': '+RD.n(a[1],0)+(a[2].some(([t])=>t<4)?' + '+gs+' × ('+a[2].map(([t,p])=>(p===1?'':p+' × ')+f(t<4?st.mv[t]:0)).join(' + ')+')':'')+' = '+f(q[k]));
      if(mode==='opt'){const b=q.indexOf(Math.max(...q));T.textContent=NM[sel]+': V* = '+f(st.mv[m])+', best action '+acts[b][0];Eq.innerHTML='V*('+NM[sel]+') = max( '+parts.join(', ')+' ) = '+f(st.mv[m]);
        X.textContent='Reading the policy off Q* needs no model: just pick the larger action value.'}
      else{T.textContent=NM[sel]+': V under the uniform policy = '+f(st.mv[m]);Eq.innerHTML='V<sub>π</sub>('+NM[sel]+') = 0.5 × Q('+acts[0][0]+') + 0.5 × Q('+acts[1][0]+'), with '+parts.join('; ')+' → '+f(st.mv[m]);
        const b=q.indexOf(Math.max(...q));X.textContent='Greedy on these Q values picks '+acts[b][0]+': one improvement step from the uniform policy already gives the optimal policy (Study, Study, Study, Quit).'}}
    P.addEventListener('click',e=>{const g=e.target.closest('.rd-smN');if(!g)return;sel=+g.dataset.i;draw()});
    document.getElementById('rd-smM').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mode=b.dataset.m;[...b.parentNode.children].forEach(x=>x.classList.toggle('on',x===b));if(mode!=='mrp'&&!(sel in MI))sel=2;draw()});
    Gs.addEventListener('input',draw);RD.onRender(draw);RD.onResize(draw);draw();
  })();
})();
