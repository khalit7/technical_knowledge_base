// ---- Scene, Fig. 4 (section 5): waves. The floor is the GPU's SMs; time rises upward, one layer per wave; blocks waiting in a queue on the left.
// Steps 1 to 3: NVIDIA's A100 example (108 SMs, one 256 x 128 tile per block, one block per SM; window.PM.wq: 108 tiles at N = 1,536, 117 at N = 1,544).
// Steps 4 and 5: the running example's row sum on an H100 (132 SMs, window.PM.gpus): 4,096 blocks of 256 threads, 8 resident per SM
// (block_sum's real registers and shared memory through the occupancy port, window.PM.occ), so 1,056 per wave and 4 waves (window.PM.rowsum).
// Every block is assumed to take the same time. Steps are explained by #sx-wave on the left. ----
(function(){
  if(!document.getElementById('stg-wave'))return;const {at,off,mix}=S3;
  const P0=window.PM,WQ=P0.wq,RS=P0.rowsum,smA=P0.gpus.find(g=>g.arch==='sm_80').sms,smH=P0.gpus.find(g=>g.arch==='sm_90a').sms,kH=P0.occ.sm_90a.block_sum.blocks[7];
  const perWave=smH*kH,full3=RS.rows-(RS.waves-1)*perWave,lastSMs=Math.ceil(full3/kH);
  window.PM_WAVE={a_before:WQ.before.tiles,a_after:WQ.after.tiles,a_tail:WQ.after.tiles-smA,a_idle:smA-(WQ.after.tiles-smA),a_util:WQ.after.util,
    h_sms:smH,h_k:kH,h_wave:perWave,h_waves:Math.ceil(RS.rows/perWave),h_last:full3,h_lastSMs:lastSMs,h_fill:Math.round(1000*full3/perWave)/10};
  const CS=.36,LH=.36,pos=(i,cols)=>[((i%cols)-(cols-1)/2)*CS+.8,0,(Math.floor(i/cols)-4.5)*CS];
  function layer(R,n,cols,total,y,col,a,P,t,hi){for(let i=0;i<total;i++){const p=pos(i,cols);
      if(i<n)R.box([p[0],y,p[2]],[.3,LH*.86*t,.3],{fill:mix(P.paper,col,.6),a:a*Math.min(1,t*1.5),shadow:false,lw:.45});
      else R.box([p[0],y,p[2]],[.3,LH*.86,.3],(hi?{fill:mix(P.paper,col,.15),a:a*.75*Math.min(1,t*1.5),fa:.3,ec:col,ea:.85,shadow:false,lw:.7,dz:-.01}:{fill:P.paper,a:a*.4,fa:.12,shadow:false,lw:.5,dz:-.01}))}}   // hi: the last wave's empty slots, a clear outline in its colour
  function floor(R,total,cols,P,a){for(let i=0;i<total;i++){const p=pos(i,cols);R.box(p,[.3,.05,.3],{fill:P.paper,a,shadow:false,lw:.4})}}
  function queue(R,n,col,P,a){if(n<=0||a<=.01)return;const h=Math.min(1.3,.12+n/90);R.box([-3.6,0,0],[.7,h,.7],{fill:mix(P.paper,col,.45),a});
    R.label([-3.6,h,0],n.toLocaleString('en-US')+' waiting',{mono:true,fs:12.5,b:1,dy:-14,a})}
  function draw(R,k,e){const P=R.P,H=P.acc,lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12.5},o||{}));R.grid(-5,5.5,-3,3,.5);
    const A=k<=2,aA=A?1:k===3?Math.max(0,1-2*e):0,aH=k>=3?(k===3?Math.max(0,2*e-1):1):0;
    if(aA>0){const cols=12;floor(R,smA,cols,P,aA);
      const n1=k===0?WQ.before.tiles:WQ.after.tiles,t1=k===0?e:1;
      queue(R,k===0?Math.round(n1*(1-e)):k===1?Math.round(n1-smA*e):k===2?Math.round((n1-smA)*(1-e)):0,P.c1,P,aA);
      layer(R,smA,cols,smA,0,P.c1,aA,P,k===1?e:t1);
      if(k===0&&e<1)for(let j=0;j<5;j++)R.flowArc([-3.3,.5,0],pos(j*21+3,cols),.9,{c:P.c1,a:aA*.85,r:.06,n:5,speed:1.6});
      if(k===1&&e<1)for(let j=0;j<5;j++)R.flowArc([-3.3,.5,0],pos(j*21+3,cols),.9,{c:P.c1,a:aA*.85,r:.06,n:5,speed:1.6});
      if(k>=2){layer(R,WQ.after.tiles-smA,cols,smA,LH,P.c2,aA,P,k===2?e:1);
        if(e<1)for(let j=0;j<3;j++)R.flowArc([-3.3,.5,0],[pos(j*4,cols)[0],LH,pos(j*4,cols)[2]],.9,{c:P.c2,a:aA*.85,r:.06,n:5,speed:1.6})}
      const w2=k>=2;
      lab([.8,LH*2,-1.9],'A100 · '+smA+' SMs · N = '+(k===0?WQ.before.N:WQ.after.N).toLocaleString('en-US'),{dy:-46,b:1,a:aA,wide:1});
      lab([.8,LH*2,-1.9],k===0?'1 wave, every SM busy':k===1?'wave 1: '+smA+' of '+WQ.after.tiles+' tiles':'wave 2: '+(WQ.after.tiles-smA)+' SMs busy, '+(2*smA-WQ.after.tiles)+' idle',{dy:-28,c:w2?P.c2:P.c1,b:1,a:aA});
      lab([pos(0,12)[0]-.2,w2?LH*2:LH,pos(0,12)[2]],w2?'2 tile times':'1 tile time',{al:'right',dx:-8,fs:12,c:P.mute,a:aA,wide:1})}
    if(aH>0){const cols=12,rows=11;floor(R,smH,cols,P,aH);
      const nl=k===3?3:4;
      for(let w=0;w<nl;w++){const t=k===3?Math.max(0,Math.min(1,e*3.2-w*1.0-.2)):(w<3?1:e);
        layer(R,w<3?smH:lastSMs,cols,smH,w*LH,w===3?P.c2:TAB(w),aH,P,t,w===3)}
      queue(R,k===3?Math.round(RS.rows-perWave*3*Math.min(1,e)):Math.round(full3*(1-e)),P.c1,P,aH);
      if(e<1)for(let j=0;j<5;j++)R.flowArc([-3.3,.5,0],[pos(j*25+5,cols)[0],(k===3?1:3)*LH,pos(j*25+5,cols)[2]],1,{c:k===3?P.c1:P.c2,a:aH*.85,r:.06,n:5,speed:1.6});
      lab([.8,LH*4,-1.9],'H100 · '+smH+' SMs × '+kH+' blocks = '+perWave.toLocaleString('en-US')+' per wave',{dy:-46,b:1,a:aH,wide:1});
      lab([.8,LH*4,-1.9],k===3?'waves 1 to 3: '+(3*perWave).toLocaleString('en-US')+' blocks':'wave 4: '+full3+' blocks, '+(Math.round(1000*full3/perWave)/10)+'% full',{dy:-28,b:1,c:k===3?P.c1:P.c2,a:aH});
      lab([pos(0,12)[0]-.2,nl*LH,pos(0,12)[2]],nl+' block times',{al:'right',dx:-8,fs:12,c:P.mute,a:aH,wide:1})}
    function TAB(w){return [P.c1,P.c6,P.c4][w%3]}
  }
  const vA={cam:[.35,.62],bounds:[[-4.2,0,-1.9],[3.2,.8,1.6]]},vH={cam:[.35,.58],bounds:[[-4.2,0,-1.9],[3.2,1.5,2.2]]};
  const st=S3.stage({id:'stg-wave',list:'sx-wave',fig:'Fig. 4 · blocks fill the SMs in waves',cam:vA.cam,bounds:vA.bounds,aspect:.62,dur:1800,hold:5000,draw,
    margin:w=>w<520?[40,10,16,10]:[64,24,24,20],view:k=>{const v=k<=2?vA:vH;return document.getElementById('stg-wave').clientWidth<520?{cam:[.8,.75],bounds:v.bounds}:v}});   // on a phone the camera looks down more, so the SM floor fills more of the card
  (window.PMSTG=window.PMSTG||{})['stg-wave']=st;
})();
