// ---- Reading section 12: compounding model error on Gymnasium's pendulum ----
(function(){
  const D=MB_DATA.pend;let mem=null,tests=null;
  const init=()=>{if(!mem){mem=D.members.map(w=>MB.PMember(w,D.out_scale));tests=MB.pendTests()}};
  // ---- animation: one rollout, open loop or restarted every 5 steps ----
  const card=document.getElementById('rd-pd');
  if(card){init();let mode='open';const EX=5;let ro=null;
    const P=document.getElementById('rd-pdP'),E=document.getElementById('rd-pdE'),T=document.getElementById('rd-pdT'),X=document.getElementById('rd-pdX'),N=document.getElementById('rd-pdN');
    const load=()=>{ro=MB.pendRollout(mem[0],tests[EX][0],tests[EX][1],tests[EX][2],mode==='k5'?5:0)};load();
    const err=t=>Math.abs(MB.wrap(ro.M[t]-ro.T[t]));
    function draw(i){const w=Math.min(RD.width(P),300),h=w,cx=w/2,cy=h/2,R=w*0.36;let s='<circle cx="'+cx+'" cy="'+cy+'" r="'+R+'" fill="none" stroke="var(--line)" stroke-dasharray="2 4"/>';
      s+=RD.t(cx,12,'upright (θ = 0)',{a:'middle',fs:10,fill:'var(--mute)'});
      // faint trails
      const trail=(arr,col)=>{let pts=[];for(let t=Math.max(0,i-12);t<=i;t++)pts.push((cx+R*Math.sin(arr[t])).toFixed(1)+','+(cy-R*Math.cos(arr[t])).toFixed(1));return '<polyline points="'+pts.join(' ')+'" fill="none" stroke="'+col+'" stroke-width="1.2" opacity=".45"/>'};
      s+=trail(ro.T,'var(--ink)')+trail(ro.M,'var(--c2)');
      const rod=(th,col,dash)=>{const x=cx+R*Math.sin(th),y=cy-R*Math.cos(th);return '<line x1="'+cx+'" y1="'+cy+'" x2="'+x.toFixed(1)+'" y2="'+y.toFixed(1)+'" stroke="'+col+'" stroke-width="'+(dash?3:4)+'"'+(dash?' stroke-dasharray="6 4"':'')+' stroke-linecap="round"/><circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+(dash?8:9)+'" fill="'+col+'" opacity="'+(dash?.75:1)+'"/>'};
      s+=rod(ro.T[i],'var(--ink)',false)+rod(ro.M[i],'var(--c2)',true)+'<circle cx="'+cx+'" cy="'+cy+'" r="4" fill="var(--mute)"/>';
      s+=RD.t(6,h-20,'solid: real',{fs:11,w:700})+RD.t(6,h-6,'dashed: model (network 1)',{fs:11,w:700,fill:'var(--c2)'});
      if(mode==='k5'&&i%5===0&&i>0)s+=RD.t(w-6,h-6,'restart from real state',{a:'end',fs:10.5,fill:'var(--c1)',w:700});
      P.innerHTML=RD.svg(w,h,s,'Pendulum: real and model');
      // error so far
      const ew=Math.max(160,RD.width(E)),eh=Math.min(300,Math.max(170,ew*0.7)),l=36,r=8,t=12,b=26,X0=k=>l+(ew-l-r)*k/50,Y0=v=>t+(eh-t-b)*(1-Math.min(v,Math.PI)/Math.PI);
      let g='';[[0,'0'],[Math.PI/2,'π/2'],[Math.PI,'π']].forEach(([v,lb])=>{g+='<line x1="'+l+'" x2="'+(ew-r)+'" y1="'+Y0(v)+'" y2="'+Y0(v)+'" stroke="var(--line)"/>'+RD.t(l-4,Y0(v)+4,lb,{a:'end',fs:10,fill:'var(--mute)'})});
      [0,10,20,30,40,50].forEach(k=>{g+=RD.t(X0(k),eh-b+14,String(k),{a:'middle',fs:10,fill:'var(--mute)'})});g+=RD.t((l+ew-r)/2,eh-2,'model step',{a:'middle',fs:10,fill:'var(--mute)'});
      g+=RD.t(l+4,t+8,'angle error (rad)',{fs:10,fill:'var(--mute)'});
      const pts=[];for(let k=0;k<=i;k++)pts.push(X0(k).toFixed(1)+','+Y0(err(k)).toFixed(1));g+='<polyline points="'+pts.join(' ')+'" fill="none" stroke="var(--c2)" stroke-width="1.8"/>';
      E.innerHTML=RD.svg(ew,eh,g,'Angle error by step');
      const e=err(i);
      if(i===0){T.textContent='Step 0: both start from the same state';X.innerHTML='θ = '+RD.n(ro.T[0],2)+' rad from upright, turning at '+RD.n(tests[EX][1],2)+' rad/s; both get the same 50 random torques. '+(mode==='open'?'The model now predicts 50 steps ahead by feeding its own predictions back in.':'The model predicts at most 5 steps before being reset to the real state, as MBPO\'s branched rollouts and MPC\'s replanning do.')}
      else if(mode==='open'){T.textContent='Step '+i+': error '+RD.n(e,3)+' rad';X.innerHTML=i<=10?'The one-step error is about a thousandth of a radian; each prediction starts from the previous one, so errors are carried forward.':i<=30?'The pendulum swings back up towards the top, where the dynamics amplify small differences: two nearly equal states can fall to opposite sides. The model is also being asked about states it predicted itself, not ones from its training data.':'The model\'s pendulum has gone its own way: after 50 steps it is '+RD.n(err(50),2)+' rad off, against '+RD.n(err(10),3)+' after 10 steps.'}
      else{T.textContent='Step '+i+': error '+RD.n(e,3)+' rad';X.innerHTML='Every 5 steps the model restarts from the real state, so its error never has more than 5 steps to grow. The largest error over the 50 steps is '+RD.n(Math.max(...ro.T.map((_,k)=>err(k))),3)+' rad.'}
      N.innerHTML=RD.stat('Step',i,'of 50 (0.05 s each)')+RD.stat('Real θ',RD.n(MB.wrap(ro.T[i]),2),'rad')+RD.stat('Model θ',RD.n(MB.wrap(ro.M[i]),2),'rad')+RD.stat('Error',RD.n(e,3),'rad')}
    const an=RD.anim({card:'rd-pd',ctl:'rd-pdC',n:51,draw,ms:240,label:'Step'});
    document.getElementById('rd-pdM').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
      document.querySelectorAll('#rd-pdM button').forEach(x=>x.classList.toggle('on',x===b));mode=b.dataset.m;load();an.reset(51);an.play()});
    RD.onResize(()=>an.redraw());}
  // ---- chart: error by horizon over 200 starts (log scale) ----
  const el=document.getElementById('rd-pc');let cv=null;
  function drawC(){if(!el)return;init();if(!cv)cv={o:MB.pendErrorCurves(mem,tests,0),b:MB.pendErrorCurves(mem,tests,5)};
    const P=document.getElementById('rd-pcP'),xs=[];for(let t=1;t<=50;t++)xs.push(t);const lg=v=>Math.log10(Math.max(v,1e-5));
    const mean=c=>xs.map(t=>c.err.reduce((a,e)=>a+e[t],0)/c.err.length);
    const se=cv.o.err.map((e,i)=>({xs,ys:xs.map(t=>lg(e[t])),col:'var(--c2)',w:.9,lab:i===0?'each of the 5 networks, open loop':null}));
    se.push({xs,ys:mean(cv.o).map(lg),col:'var(--c2)',w:2.6,lab:'mean of the 5, open loop'});
    se.push({xs,ys:xs.map(t=>lg(cv.o.spread[t])),col:'var(--c4)',w:1.8,dash:'5 3',lab:'spread between the 5 (std)'});
    se.push({xs,ys:mean(cv.b).map(lg),col:'var(--c3)',w:2.2,lab:'branched rollouts, restart every 5 steps'});
    RD.chart(P,se,{x0:1,x1:50,y0:-3.5,y1:0.5,H:240,xt:[[1,'1'],[10,'10'],[20,'20'],[30,'30'],[40,'40'],[50,'50 steps']],yt:[[-3,'0.001'],[-2,'0.01'],[-1,'0.1'],[0,'1 rad']],ylab:'mean |angle error|, log scale',label:'Model error by rollout length'});
    RD.legend(document.getElementById('rd-pcL'),se);
    const m=mean(cv.o),mb=mean(cv.b),avg=a=>a.reduce((x,y)=>x+y,0)/a.length;
    document.getElementById('rd-pcR').innerHTML='<b>Computed live from the five networks over 200 random starts and torque sequences; src/recompute.py gives the same values in Python.</b> Mean error: '+RD.n(m[0],4)+' rad after 1 step, '+RD.n(m[9],4)+' after 10, '+RD.n(m[24],3)+' after 25, '+RD.n(m[49],3)+' after 50 ('+Math.round(m[49]/m[0])+' times the one-step error). Mean over steps 1 to 50: '+RD.n(avg(m),4)+' open loop, '+RD.n(avg(mb),4)+' with restarts every 5 steps. Network 1 at step 50: median '+RD.n(D.m0_step50.median,3)+' rad, mean '+RD.n(D.m0_step50.mean,3)+', '+D.m0_step50.over_0p5+' of 200 starts off by more than 0.5 rad. The model, its data and its training are in src/fit_pendulum.py (illustrative in scale: one small ensemble on one environment).'}
  if(el&&'IntersectionObserver' in window){let done=false;new IntersectionObserver(es=>{if(!done&&es[es.length-1].isIntersecting){done=true;drawC()}},{rootMargin:'300px'}).observe(el)}
  RD.onResize(()=>{if(cv)drawC()});
})();
