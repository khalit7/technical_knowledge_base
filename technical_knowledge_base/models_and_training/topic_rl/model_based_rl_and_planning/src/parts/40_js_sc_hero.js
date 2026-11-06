// ---- Scene: the hero (Sutton and Barto's Figure 8.1 in space): real experience reaches the values directly and through a model ----
// The value bars are the Dyna maze's max_a Q per cell from this page's engine (section 2): after episode 1 with no planning (one non-zero value),
// then by the end of episode 2 with 50 planning steps per real step. Renderer v2: few large objects per step, flows on every path, camera per step.
(function(){
  if(!document.getElementById('stg-hero'))return;const {at,off,lerp,mix}=S3;
  const DY={alpha:0.1,eps:0.1,gamma:0.95},mz=MB.MAZES.dyna;let V0=null,V1=null,walls=null,cnt1=0;
  function data(){if(V0)return;const e0=MB.dynaEpisode2(0,0,DY);V0=e0.frames[e0.frames.length-1].v;const e=MB.dynaEpisode2(50,0,DY);V1=e.frames[e.frames.length-1].v;walls=MB.wallset(mz);
    cnt1=V1.filter(v=>v>0).length}
  const CS=.4,VX=0,VZ=-1.2,EX=3.1,EZ=1.9,MX=-3.1,MZ=1.9,HS=1.6;   // the value table at the back, the environment front right, the model front left
  const cell=(r,c)=>[VX+(c-(mz.C-1)/2)*CS,VZ+(r-(mz.R-1)/2)*CS];
  function draw(R,k,e){const P=R.P;data();R.grid(-5,5,-3.4,3,.5);
    const VT=[VX,1.0,VZ],ENV=[EX,.45,EZ],MOD=[MX,.6,MZ];
    // the value table: a plinth and one bar per open cell, height max_a Q(s, a)
    const fv=k<3?0:k===3?e:1,dim=k===2?.35:1;
    R.box([VX,0,VZ],[mz.C*CS+.2,.08,mz.R*CS+.2],{a:dim,shadow:true,dz:6});
    for(let r=0;r<mz.R;r++)for(let c=0;c<mz.C;c++){const i=r*mz.C+c,[x,z]=cell(r,c);if(walls.has(i)){R.box([x,.08,z],[CS*.86,.05,CS*.86],{fill:P.mute,a:.6*dim,shadow:false,edge:false});continue}
      const v=lerp(V0[i],V1[i],fv),h=Math.max(.012,v*HS);R.box([x,.08,z],[CS*.72,h,CS*.72],{fill:v>0?mix(P.paper,P.acc,Math.min(1,.25+v*1.6)):P.paper,a:dim,shadow:false,lw:.6})}
    const g=mz.goal,gc=cell(g[0],g[1]),sc=cell(mz.start[0],mz.start[1]);
    R.label([gc[0],.15,gc[1]],'G',{fs:12.5,b:1,c:P.good,dy:-10,a:dim});R.label([sc[0],.15,sc[1]],'S',{fs:12.5,b:1,c:P.mute,dy:-10,a:dim});
    R.label([VX,0,VZ+mz.R*CS/2+.1],'values Q · the maze of §2'+(k>=3?' · '+cnt1+' cells with a value':''),{fs:13,b:1,dy:14,a:Math.max(.5,dim),c:k>=3?P.acc:P.ink});
    // the environment: real experience
    R.box([EX,0,EZ],[1.4,.9,1.1],{fill:mix(P.paper,P.q,.18)});R.label([EX,.85,EZ],'environment',{fs:13,b:1,dy:-12});R.label([EX,0,EZ+.5],'real: s, a → r, s′',{mono:true,fs:12,dy:12,c:P.q});
    // the model: a glass table of remembered transitions, filling as it learns
    const ma=k<2?.18:k===2?lerp(.18,1,e):1;
    R.glass([MX-.65,.1,MZ],[1.3,0,0],[0,1.0,0],{c:P.v,a:ma,nu:4,nv:6});
    if(k>=2){const n=k===2?Math.round(24*e):24;for(let j=0;j<n;j++){const u=j%4,w=Math.floor(j/4);R.box([MX-.65+.1625+u*.325,.1+.1+w*.1667-.06,MZ+.03],[.2,.09,.02],{fill:P.v,a:.55,shadow:false,edge:false})}}
    R.label([MX,1.1,MZ],'model',{fs:13,b:1,dy:-12,a:Math.max(.45,ma)});
    R.label([MX,0,MZ+.5],k>=4?'table · rules · network':'(s, a) → r, s′',{mono:true,fs:12,dy:12,c:P.v,a:Math.max(.45,ma)});
    // the four paths: acting, direct RL, model learning, planning (dots stream along each while it is in use)
    const act=[[VX+1.9,.3,VZ+.2],[EX+.2,.9,EZ-.55]];
    R.arc(act[0],act[1],.3,{c:P.c3,w:1.6,a:.55});R.flowArc(act[0],act[1],.3,{c:P.c3,a:k===0||k===4?1:.35,r:.06,speed:1});
    R.label(R.arcPt(act[0],act[1],.3,.5),'acting',{al:'left',fs:12.5,b:1,c:P.c3,dx:12,wide:k===0||k===4?0:1});
    const dir=[[EX-.45,.9,EZ-.4],[VX+1.0,.6,VZ+.2]];const da=k===0?.15:k===1?Math.max(.15,e):k===2||k===3?.4:1;
    R.arc(dir[0],dir[1],.9,{c:P.q,w:1.6,a:.5*da+.1});R.flowArc(dir[0],dir[1],.9,{c:P.q,a:da,r:.07,speed:1.1});
    R.label(R.arcPt(dir[0],dir[1],.9,.5),'direct RL',{fs:12.5,b:1,c:P.q,a:Math.max(.4,da),dy:-12,wide:k===1||k===4?0:1});
    const ml=[[EX-.65,.3,EZ],[MX+.7,.4,MZ]];const la=k<2?.12:k===2?Math.max(.12,e):k===3?.4:1;
    R.arc(ml[0],ml[1],.35,{c:P.q,w:1.4,a:.4*la+.08,dash:[5,4]});R.flowArc(ml[0],ml[1],.35,{c:P.q,a:la,r:.065,speed:1});
    R.label(R.arcPt(ml[0],ml[1],.35,.5),'model learning',{fs:12.5,b:1,c:P.q,a:Math.max(.35,la),dy:14,wide:k===2||k===4?0:1});
    const pl=[[MX+.4,1.1,MZ-.1],[VX-1.3,.6,VZ+.2]];const pa=k<3?.1:k===3?Math.max(.1,e):1;
    R.arc(pl[0],pl[1],.8,{c:P.acc,w:2.2,a:.6*pa+.05});R.flowArc(pl[0],pl[1],.8,{c:P.acc,a:pa,r:.075,speed:2.2,n:26});
    R.label(R.arcPt(pl[0],pl[1],.8,.35),k===3?'planning · 50 updates per real step':'planning',{fs:13,b:1,c:P.acc,a:Math.max(.35,pa),dy:-12,wide:k>=3?0:1});
  }
  const full={cam:[.3,.68],bounds:[[-3.9,0,-2.6],[3.9,1.5,2.6]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · learning and planning, one backup',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:4600,draw,
    view:k=>k===1?{cam:[.45,.62],bounds:[[-1.9,0,-2.6],[3.9,1.5,2.6]]}:k===2?{cam:[.2,.55],bounds:[[-3.9,0,.6],[3.9,1.3,2.6]]}:k===3?{cam:[.12,.72],bounds:[[-3.9,0,-2.6],[3.9,1.5,2.6]]}:full});
})();
