// ---- Scene (Fig. 4, the edge models): where Gemma's edge checkpoints keep their parameters. Two memory plates, the accelerator's and
// fast storage off it; the decoder layers (blue, one slab per layer) and the embedding parameters (gold) as towers whose height is
// parameters to scale. Numbers from the Gemma 4 model card (E2B, E4B) and the Gemma 3n docs (3n E2B), as quoted on the page. ----
window.GGPL={e4:{n:'Gemma 4 E4B',L:42,eff:4.5,tot:8},e2:{n:'Gemma 4 E2B',L:35,eff:2.3,tot:5.1},n2:{n:'Gemma 3n E2B',tot:5,res:1.91}};
(function(){
  if(!document.getElementById('stg-pl'))return;const {lerp,mix}=S3,D=GGPL,HS=.42,FW=1.1;
  const AX=[-3.7,-.3],SX=[.5,3.7],PZ=1.25;
  // the model drawn at step k: E4B for steps 1 to 3, E2B for step 4
  const mod=k=>k>=3?D.e2:D.e4;
  function tower(R,x,L,h,fill,a,o){o=o||{};if(a<=.01||h<=.001)return;const g=Math.min(.02,h/L*.25),sh=h/L;
    for(let i=0;i<L;i++)R.box([x,i*sh,0],[FW,sh-g,FW],{fill,a,shadow:i===0,lw:.5,fa:o.fa});}
  function draw(R,k,e,st){const P=R.P,pk=st.pk,t=pk===k?1:e;R.grid(-5,5,-2.5,2.5,.5);
    // step 5 is the side-by-side comparison; steps 1 to 4 the two plates
    const cmp=k===4?Math.max(0,2*t-1):pk===4?Math.max(0,1-2*e):0,two=k===4?Math.max(0,1-2*t):pk===4?Math.max(0,2*e-1):1,pl=k===4?t:pk===4?1-e:0; // the old picture leaves before the new one comes
    // the plates: accelerator (left, widening to the whole floor for step 5) and fast storage (right)
    const ax0=lerp(AX[0],-4.4,pl),ax1=lerp(AX[1],4.6,pl);
    R.glass([ax0,0,-PZ],[ax1-ax0,0,0],[0,0,2*PZ],{c:P.c6,a:.85,nu:8,nv:4,th:.03,dz:100});
    R.glass([SX[0],0,-PZ],[SX[1]-SX[0],0,0],[0,0,2*PZ],{c:P.mute,a:.75*two,nu:8,nv:4,th:.03,dz:100});
    if(two>.01){
      const m0=mod(pk),m1=mod(k),L=t<.5?m0.L:m1.L,eff=lerp(m0.eff,m1.eff,t),emb=lerp(m0.tot-m0.eff,m1.tot-m1.eff,t);
      // where the embeddings stand: on the accelerator at step 1, off it from step 2
      const ex=k===0?(pk===0?-1.15:lerp(2.1,-1.15,t)):pk===0?lerp(-1.15,2.1,t):2.1,cx=-2.55;
      tower(R,cx,L,eff*HS,P.c1,two);tower(R,ex,L,emb*HS,P.c5,two);
      // step 3: a token climbs the stack; each layer's row comes up from its table
      const fa=(k===2?t:pk===2?1-e:0)*two;
      if(fa>.01){R.flow([[cx,.05,FW/2+.08],[cx,eff*HS,FW/2+.08]],{c:P.c1,a:fa,r:.045,speed:.9,n:7});
        for(let j=0;j<5;j++){const i=Math.round((j+.5)/5*L-.5),ye=(i+.5)*emb*HS/L,yc=(i+.5)*eff*HS/L;R.flowArc([ex-FW/2,ye,0],[cx+FW/2,yc,0],.25,{c:P.c5,a:fa,r:.035,speed:1.4,n:6})}}
      // labels: plate totals and the two towers (the outgoing set gone by mid-transition)
      const sv=t<.5?pk:k,mv=mod(sv),acc=sv===0?mv.tot:mv.eff,off=sv===0?'empty':(mv.tot-mv.eff).toFixed(1)+'B';
      R.label([(AX[0]+AX[1])/2,0,PZ],'accelerator memory · '+acc+'B',{fs:13,b:1,dy:20,c:P.c6,a:two});
      R.label([(SX[0]+SX[1])/2,0,PZ],'off the accelerator · '+off,{fs:13,b:1,dy:20,c:P.mute,a:two});
      R.label([cx-FW/2,eff*HS*.5,FW/2],L+' layers · '+(t<.5?m0:m1).eff+'B',{al:'right',dx:-14,wide:1,fs:12.5,b:1,c:P.c1,a:two});
      R.label([ex+.25,emb*HS,-FW/2],'embeddings · '+((t<.5?m0:m1).tot-(t<.5?m0:m1).eff).toFixed(1)+'B',{dy:-22,fs:12.5,b:1,c:P.c5,a:two});
      R.label([cx,eff*HS,-FW/2],(t<.5?m0:m1).n,{fs:13,b:1,dy:-22,c:P.ink,a:two})}
    // step 5: the three edge checkpoints to scale, the outline the checkpoint and the solid block what must be resident
    if(cmp>.01){[[D.n2,-3,'over 5B',D.n2.res],[D.e2,0,D.e2.tot+'B',D.e2.eff],[D.e4,3,D.e4.tot+'B',D.e4.eff]].forEach(([m,x,tl,res])=>{
        R.box([x,0,0],[FW,m.tot*HS,FW],{fill:P.paper,fa:.05,ea:.9,lw:1.1,a:cmp,shadow:false});
        R.box([x,0,0],[FW*.94,res*HS,FW*.94],{fill:P.c1,a:cmp,lw:.6});
        R.label([x,0,FW/2],m.n,{fs:13,b:1,dy:18,c:P.ink,a:cmp});R.label([x,0,FW/2],res+'B resident',{fs:12.5,mono:true,b:1,dy:35,wide:1,c:P.c1,a:cmp});
        R.label([x,m.tot*HS,-FW/2],'checkpoint '+tl,{dy:-16,wide:1,fs:12.5,mono:true,c:P.mute,a:cmp});
        })}
  }
  const full={cam:[.3,.4],bounds:[[-4.6,0,-1.4],[5.4,3.5,1.4]]};
  S3.stage({id:'stg-pl',list:'sx-pl',fig:'Fig. 4 · an edge checkpoint: what sits on the accelerator, what stays off it',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,8,44,8]:[24,20,48,20],
    view:k=>k===2?{cam:[.42,.36],bounds:[[-4.2,0,-1.3],[4,2.2,1.3]]}:k<4?{cam:[.32,.42],bounds:[[-4.4,0,-1.4],[4.4,2.3,1.4]]}:full});
})();
