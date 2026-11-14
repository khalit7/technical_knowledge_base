// ---- Scene, Fig. 3 (section 5): one failure stops all 16,384 GPUs, and the job restarts from its last checkpoint. Numbers from the page's
// own model (window.PW.sim_defaults and the engine PWE, the same as section 6's simulator): Llama 3's rate, MTBF, Young's interval, the
// default day's failure times and its two lanes' saved hours. Each tile is 8 servers (64 GPUs), 16 by 16 = 2,048 servers; which tiles fail
// is illustrative (a fixed pseudo-random draw), when they fail is the default day. Steps: #sx-fail. ----
(function(){
  if(!document.getElementById('stg-fail')||!window.PW||!window.PWE)return;const {mix,lerp}=S3,E=PWE,S=PW.sim_defaults;
  const fails=E.arrivals(S.seed,S.mu,S.horizon),Ty=E.tYoung(S.mu,S.C),ry=E.simulate(fails,Ty,S.C,S.D,S.R,S.horizon,true),rb=E.simulate(fails,S.bad,S.C,S.D,S.R,S.horizon,true);
  const lost1=ry.segs.find(s=>s[0]==='lostmark');
  const F={servers:S.gpus/8,mu:S.mu,serverDays:S.mu*S.gpus/8/24,Ty,C:S.C,D:S.D,R:S.R,f1:fails[0],lost1:lost1?lost1[2]-lost1[1]:0,nf:fails.length,young:ry.committed,bad:rb.committed,badT:S.bad};
  window.PW_FAIL=F; // checked by check/check_stages.mjs
  const NT=16,PI=.5,TS=.42,x=c=>(c-(NT-1)/2)*PI,z=r=>(r-(NT-1)/2)*PI;
  // illustrative failing tiles: a fixed pseudo-random draw, one per failure of the day
  const rnd=E.mulberry32(7),FT=fails.map(()=>Math.floor(rnd()*NT*NT));
  const STO=[6.2,-1.6],BAR=[6.2,2.4];
  const lab=(R,p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12.5},o||{}));
  const f1=(v,d)=>v.toFixed(d==null?1:d);
  function draw(R,k,e,st){const P=R.P,pk=st.pk==null?k:st.pk;R.grid(-4.6,8,-4.4,4.4,.5);
    const work=mix(P.paper,P.c3,.45),stop=mix(P.paper,P.mute,.18);
    // how "stopped" the grid looks: 0 running, 1 stopped
    const sv=[0,0,1,0,0],stp=lerp(sv[pk],sv[k],e),hit=FT[0];
    for(let r=0;r<NT;r++)for(let c=0;c<NT;c++){const i=r*NT+c;let fill=mix(work,stop,stp),h=.12,a=1;
      if(k===2&&i===hit){fill=mix(work,P.bad,Math.min(1,e*2));h=.12+.1*e}
      if(k===3&&i===hit){fill=mix(mix(P.paper,P.bad,.7),mix(P.paper,P.c1,.6),e)}
      if(k===4){const j=FT.indexOf(i);if(j>=0){const t=(j+.5)/F.nf;const on=e>t?Math.max(0,1-(e-t)*F.nf*.9):0;fill=mix(work,P.bad,e>t?Math.max(.55,on):0);h=.12+.12*on}}
      R.box([x(c),0,z(r)],[TS,h,TS],{fill,a,shadow:false,lw:.5,ea:.45})}
    // checkpoint storage
    const sa=k===0?.35:k===4?lerp(1,.15,e):1; // in step 5 storage recedes so the bars in front of it read clearlyR.box([STO[0],0,STO[1]],[1.2,1.0,1.8],{fill:mix(P.paper,P.c4,.5),a:sa});
    const cols=[1,4,7,10,13];
    // 1. lockstep: every row exchanges gradients each step
    if(k===0){for(let r=1;r<NT;r+=3)R.flow([[x(0),.2,z(r)],[x(NT-1),.2,z(r)]],{c:P.acc,a:e,r:.06,n:12,speed:1.6});
      lab(R,[x(NT/2),.15,z(0)-.4],F.servers.toLocaleString('en-US')+' servers · 16,384 GPUs · one job',{dy:-14,b:1,a:e});
      lab(R,[x(0)-.4,.15,z(NT-1)],'1 tile = 8 servers',{al:'right',dx:-8,fs:12,a:e,wide:1});lab(R,[STO[0],1.0,STO[1]],'checkpoint storage',{dy:-14,fs:12,c:P.c4,a:e*.6+.3})}
    // 2. a checkpoint: state streams from the grid to storage
    if(k===1){cols.forEach(c=>R.flowArc([x(c),.2,z(c)],[STO[0]-.6,.8,STO[1]],.9,{c:P.c4,a:e,r:.06,n:9,speed:1.6}));
      lab(R,[STO[0],1.0,STO[1]],'checkpoint every '+f1(F.Ty*60)+' min · pause '+f1(F.C*60,0)+' min',{dy:-14,b:1,c:P.c4,a:e})}
    // 3. one server fails: everything stops
    if(k===2){const rr=Math.floor(hit/NT),cc=hit%NT;R.glow([x(cc),.3,z(rr)],.9,{c:P.bad,a:e});
      lab(R,[x(cc),.3,z(rr)],'1 server fails · '+f1(F.f1,2)+' h',{dy:-22,b:1,c:P.bad,a:e});lab(R,[x(NT/2),.15,z(NT-1)+.4],'all 16,384 GPUs stop · '+f1(F.lost1*60)+' min of training lost',{dy:22,b:1,a:e})}
    // 4. swap and reload
    if(k===3){const rr=Math.floor(hit/NT),cc=hit%NT;
      cols.forEach(c=>R.flowArc([STO[0]-.6,.8,STO[1]],[x(c),.2,z(15-c)],.9,{c:P.c4,a:e,r:.06,n:9,speed:1.6}));
      lab(R,[x(cc),.3,z(rr)],'spare server in',{dy:-22,b:1,c:P.c1,a:e});lab(R,[STO[0],1.0,STO[1]],'reload · down '+f1(F.D*60,0)+' + recover '+f1(F.R*60,0)+' min',{dy:-14,b:1,c:P.c4,a:e})}
    // 5. the day: eight failures, and the two lanes' saved hours as bars (24 h outlined)
    if(k===4){const hs=3.2/24;[[F.young,'Young · '+f1(F.young)+' h',P.c3,-.6],[F.bad,'every '+f1(F.badT,0)+' h · '+f1(F.bad)+' h',P.c2,.6]].forEach(([v,t,c,dx])=>{
        R.box([BAR[0]+dx,0,BAR[1]],[.7,24*hs,.7],{fill:P.paper,a:e*.25,fa:.15,shadow:false});R.box([BAR[0]+dx,0,BAR[1]],[.7,v*hs*e,.7],{fill:mix(P.paper,c,.7),a:e});
        lab(R,[BAR[0]+dx,v*hs*e,BAR[1]],t,{dy:-12,b:1,c,a:e,fs:12,al:dx<0?'right':'left',dx:dx<0?-6:6})});
      lab(R,[BAR[0],0,BAR[1]+.4],'saved training in 24 h',{dy:18,fs:12,a:e});lab(R,[x(NT/2),.15,z(0)-.4],F.nf+' failures in one day',{dy:-14,b:1,c:P.bad,a:e})}
  }
  const full={cam:[.45,.7],bounds:[[-4.4,0,-4.4],[7.4,2.0,4.2]]};
  const st=S3.stage({id:'stg-fail',list:'sx-fail',fig:'Fig. 3 · one failure stops every GPU',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:5200,draw,
    view:k=>k===4?{cam:[.45,.6],bounds:[[-4.4,0,-4.4],[7.6,3.6,4.2]]}:k===2||k===3?{cam:[.45,.85],bounds:[[-4.4,0,-4.4],[7.4,1.2,4.6]]}:full,
    margin:w=>w<520?[18,10,14,10]:[24,20,20,20]});
  (window.PWSTG=window.PWSTG||{})['stg-fail']=st;
})();
