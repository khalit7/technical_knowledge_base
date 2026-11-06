// ---- Scene: Figure 8.3 as value surfaces: episode 2 of the Dyna maze with no planning (left) and with n planning steps per real step (right) ----
// Run 0 of this page's engine (the same real random numbers for every n, so episode 1 is identical); each bar is max_a Q(s, a) at that moment.
// The episode is played in four stretches (start, first quarter, to halfway, to the goal), each stretch tweening through its frames during its step.
(function(){
  if(!document.getElementById('stg-dyna'))return;const {lerp,mix}=S3;
  const DY={alpha:0.1,eps:0.1,gamma:0.95},mz=MB.MAZES.dyna,walls=MB.wallset(mz);
  let nR=50,E0=null,E1=null;const load=()=>{E0=MB.dynaEpisode2(0,0,DY);E1=MB.dynaEpisode2(nR,0,DY)};
  const CS=.42,GAP=4.3,HS=1.6,F=[0,0,.25,.5,1,1];
  // side by side on wide cards; on a phone the n = 0 maze sits behind the other so both are larger
  const narrow=()=>{const h=document.getElementById('stg-dyna');return !!h&&h.clientWidth>0&&h.clientWidth<520};
  const org=right=>narrow()?[0,right?1.75:-1.75]:[right?GAP/2+.2:-GAP/2-.2,0];
  const cell=(o,i)=>{const r=Math.floor(i/mz.C),c=i%mz.C;return [o[0]+(c-(mz.C-1)/2)*CS,o[1]+(r-(mz.R-1)/2)*CS]};
  function maze(R,o,ep,f,a,title,n){const P=R.P,fr=ep.frames[f],L=ep.frames.length-1,ox=o[0],oz=o[1],sm=R.W<520;
    R.box([ox,0,oz],[mz.C*CS+.16,.05,mz.R*CS+.16],{a,shadow:true,lw:.7,dz:6});
    for(let i=0;i<mz.R*mz.C;i++){const [x,z]=cell(o,i);
      if(walls.has(i)){R.box([x,.05,z],[CS*.94,.16,CS*.94],{fill:mix(P.paper,P.ink,.55),a,shadow:false});continue}
      const v=fr.v[i];if(v>0)R.box([x,.05,z],[CS*.7,Math.max(.015,v*HS),CS*.7],{fill:mix(P.paper,P.acc,Math.min(1,.3+v*1.4)),a,shadow:false,lw:.6})}
    const gi=mz.goal[0]*mz.C+mz.goal[1],si=mz.start[0]*mz.C+mz.start[1],[gx,gz]=cell(o,gi),[sx,sz]=cell(o,si),[ax,az]=cell(o,fr.pos);
    R.glow([gx,.12,gz],.4,{c:P.good,a:a*.8});R.label([gx,.1,gz],'G',{fs:13,b:1,c:P.good,a,dy:-2});R.label([sx,.1,sz],'S',{fs:13,b:1,c:P.mute,a,dx:-14});
    R.ball([ax,.2,az],.13,{c:P.q,a});R.glow([ax,.2,az],.3,{c:P.q,a:a*.5});
    R.label(sm?[ox-mz.C*CS/2,0,oz-mz.R*CS/2]:[ox,0,oz-mz.R*CS/2-.1],sm?title.split(' ·')[0].replace(' planning steps per real step',''):title,{fs:13,b:1,a,dy:sm?-4:-16,al:sm?'left':'center'});
    R.label(sm?[ox+mz.C*CS/2,0,oz+mz.R*CS/2]:[ox,0,oz+mz.R*CS/2+.1],(sm?'':'step ')+fr.k+(sm?'/':' of ')+L+' · '+(sm?'arrows ':'greedy arrows in ')+fr.pol.filter(x=>x>=0).length,{mono:true,fs:12,a,dy:sm?10:14,al:sm?'right':'center',c:P.mute});
    return n}
  function draw(R,k,e){const P=R.P;if(!E0)load();R.grid(-6,6,-2.6,2.6,.5);
    const fi=ep=>{const L=ep.frames.length-1,t=k===0?0:lerp(F[k],F[k+1],k>=4?1:e);return Math.round(t*L)};
    // which stretch is playing: step k plays frames from F[k] to F[k+1]
    const aL=k===4?.3:1;
    maze(R,org(0),E0,fi(E0),aL,'n = 0 · Q-learning only');
    maze(R,org(1),E1,fi(E1),1,'n = '+nR+' planning steps per real step');
    // the model: a glass table above the right maze, replaying remembered transitions into the values
    const [mx,mz0]=org(1),gz=mz0-1.1;R.glass([mx-.7,1.15,gz-.25],[1.4,0,0],[0,0,.5],{c:P.v,nu:6,nv:2,a:narrow()?0:.8});
    R.label([mx+.75,1.2,gz],'table model',{al:'left',fs:12.5,b:1,c:P.v,dx:6,wide:1});
    if(k>=1&&k<=3&&!narrow())[[-1.2,.3],[0,.6],[1.2,0]].forEach(([dx,dz])=>R.flowArc([mx+dx*.4,1.15,gz],[mx+dx,.3,mz0+dz],.15,{c:P.acc,r:.055,speed:1.6,n:6,a:.85}));
    if(k===4){const L=E1.frames.length-1;R.label([mx,1.2,mz0],'episode 2 took '+L+' steps (no planning: '+(E0.frames.length-1)+')',{fs:12.5,b:1,c:P.acc,a:e})}
  }
  const full=()=>narrow()?{cam:[.1,.78],bounds:[[-2.1,0,-3.2],[2.1,1.2,3.2]]}:{cam:[.1,.9],bounds:[[-4.3,0,-1.5],[4.3,1.0,1.6]]};
  const st=S3.stage({id:'stg-dyna',list:'sx-dyna',fig:'Fig. 2 · episode 2, values as heights',cam:full().cam,bounds:()=>full().bounds,aspect:.42,dur:2600,hold:4200,draw,
    view:k=>k===4?(narrow()?{cam:[.25,.7],bounds:[[-2.1,0,.2],[2.1,1.5,3.2]]}:{cam:[.25,.7],bounds:[[-.1,0,-1.6],[4.4,1.5,1.6]]}):full()});
  const M=document.getElementById('dynaM');
  if(M)M.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;M.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));nR=+b.dataset.n;load();st.list('sx-dyna')});
})();
