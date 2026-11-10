// ---- Scene: two published layouts as a mesh of GPUs (Fig. 14), renderer v2 ----
// Numbers from the Layout calculator's core (window.LAY, mirrored in src/recompute.py and checked by check_calc.mjs), presets
// l405_8k_16k (Llama 3 405B, TP 8 x PP 16 x DP 128) and dsv3 (DeepSeek-V3, PP 16 x EP 64 inside DP 128). Each cube is a GPU: 8 in depth
// make a server (a tray), 16 servers along the floor are the pipeline, and levels stacked upwards are further groups of 128 servers' worth
// (3 levels drawn). Dots flow on the axis each step is about, coloured by its link: teal NVLink, pink network. The last step stands the
// seconds per GPU per step of each axis beside the compute time, as columns to scale.
(function(){
  if(!document.getElementById('stg-mesh')||!window.S3||!window.LAY)return;const {lerp,mix,rgb}=S3;
  let pre='l405_8k_16k';
  const XS=i=>-3.3+i*.44,ZS=j=>-1.19+j*.34,YL=l=>l*1.5,CB=.26;
  const ibc=()=>rgb(getComputedStyle(document.body).getPropertyValue('--ib').trim()||'#a8456b');
  function draw(R,k,e){const P=R.P,IB=ibc(),r=LAY.layout(LAY.PRESETS[pre]),ds=pre==='dsv3';R.grid(-4.5,6.5,-2,2,.5);
    // how lit each cube is at this step
    const lit=(i,j,l)=>{if(!ds){if(k===0)return i===0&&l===0?1:.1;if(k===1)return l===0?1:.12;return k===2?1:.6}
      if(k===0)return l===0?1:.15;if(k===1)return i===7?1:.15;return k===2?1:.6};
    for(let l=0;l<3;l++){for(let i=0;i<16;i++){const a=lit(i,0,l);R.quad([[XS(i)-.19,YL(l)+.01,-1.43],[XS(i)+.19,YL(l)+.01,-1.43],[XS(i)+.19,YL(l)+.01,1.43],[XS(i)-.19,YL(l)+.01,1.43]],{fill:P.paper,fa:.9,a:Math.max(.25,a),dz:1.2,lw:.7});
        for(let j=0;j<8;j++){const al=lit(i,j,l);R.box([XS(i),YL(l)+.035,ZS(j)],[CB,CB,CB],{fill:mix(P.paper,P.c1,.35+.35*al),a:.25+.75*al,shadow:false,lw:.6})}}}
    const fa=Math.min(1,e*2);
    if(!ds){
      if(k===0){for(let j=0;j<7;j++)R.flowArc([XS(0),.33,ZS(j)],[XS(0),.33,ZS(j+1)],.12,{c:P.c6,a:fa,r:.045,speed:1});R.flowArc([XS(0)+.1,.33,ZS(7)],[XS(0)+.1,.33,ZS(0)],.35,{c:P.c6,a:fa*.8,r:.045,speed:1.6})}
      if(k===1)for(let i=0;i<15;i++)R.flowArc([XS(i),.32,ZS(4)],[XS(i+1),.32,ZS(4)],.14,{c:IB,a:fa,r:.045,speed:1.1,n:3});
      if(k===2)[1,7,13].forEach(i=>{for(let l=0;l<2;l++){R.flow([[XS(i)+.12,YL(l)+.33,ZS(2)],[XS(i)+.12,YL(l+1)+.03,ZS(2)]],{c:IB,a:fa,r:.05,speed:.9,n:3});R.flow([[XS(i)-.12,YL(l+1)+.03,ZS(5)],[XS(i)-.12,YL(l)+.33,ZS(5)]],{c:IB,a:fa,r:.05,speed:.9,n:3})}})}
    else{
      if(k===1){for(let l=0;l<3;l++)for(let m=0;m<3;m++)if(l!==m)R.flowArc([XS(7)+.05*(l-m),YL(l)+.33,ZS(2+2*l)],[XS(7)+.05*(l-m),YL(m)+.33,ZS(2+2*m)],.18,{c:IB,a:fa,r:.05,speed:1.3,n:4});
        for(let j=0;j<7;j+=2)R.flowArc([XS(7),.33,ZS(j)],[XS(7),.33,ZS(j+1)],.1,{c:P.c6,a:fa,r:.04})}
      if(k===2){for(let i=0;i<15;i++)R.flowArc([XS(i),.32,ZS(4)],[XS(i+1),.32,ZS(4)],.14,{c:IB,a:fa,r:.045,speed:1.1,n:3});
        [3,11].forEach(i=>{for(let l=0;l<2;l++)R.flow([[XS(i),YL(l)+.33,ZS(1)],[XS(i),YL(l+1)+.03,ZS(1)]],{c:IB,a:fa,r:.05,speed:.9,n:3})})}}
    // axis labels
    R.label([XS(0)-.25,.15,ZS(7)],ds?'8 GPUs per server, no TP':'TP 8 · one server · NVLink',{al:'right',dx:-6,fs:12,c:ds?P.mute:P.c6,grp:'ax',a:k===0||k===3?1:.55});
    R.label([XS(15),.1,ZS(7)+.3],ds?'PP 16 stages of 128 GPUs':'PP 16 servers',{al:'left',dx:6,dy:10,fs:12,c:P.mute,wide:1,a:k===0||k===3?0:1});
    R.label([XS(0)-.25,YL(2)+.2,ZS(7)],ds?'16 servers per stage (3 drawn)':'DP 128 replicas (3 drawn)',{al:'right',dx:-6,fs:12,c:P.mute,grp:'ax',a:k>=2||ds?1:.4});
    // the last step: seconds per GPU per step, columns to scale against compute
    if(k===3){const rows=[['compute',r.t_comp,P.c3]].concat(['TP','EP','DP','PP'].filter(a=>r.comm[a]>0).map(a=>[a,r.t[a],r.link[a]==='nv'?P.c6:IB]));
      const mx=Math.max(...rows.map(q=>q[1])),hs=2.5/mx;
      rows.forEach((q,i)=>{const x=4.4+i*1.15,h=Math.max(.01,q[1]*hs*e);R.box([x,0,0],[.36,h,.36],{fill:q[2],lw:.8});
        R.label([x,h,0],q[1].toFixed(q[1]<.1?3:2)+' s',{mono:true,fs:12,b:1,dy:-10,a:e});R.label([x,0,.18],q[0],{fs:12,dy:13,c:P.mute,a:e})})}
  }
  const full={cam:[.42,.4],bounds:[[-4,0,-1.6],[8.4,3.4,1.6]]};
  const st=S3.stage({id:'stg-mesh',list:'sx-mesh',fig:'Fig. 14 · a published layout as a mesh of GPUs',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1800,hold:5000,draw,
    view:k=>pre!=='dsv3'&&k===0?{cam:[.62,.5],bounds:[[-4.6,0,-1.6],[-1.6,1.3,1.6]]}:full,
    margin:w=>w<520?[12,8,12,8]:[18,14,18,150]});
  (window.DTSTG=window.DTSTG||{})['stg-mesh']=st;
  const seg=document.getElementById('meshM');if(seg&&st)RD.seg(seg,m=>{pre=m;document.getElementById('sx-mesh').hidden=m!=='l405_8k_16k';document.getElementById('sx-meshd').hidden=m!=='dsv3';st.list(m==='dsv3'?'sx-meshd':'sx-mesh')});
})();
