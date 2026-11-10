// ---- Scene (section 2, Fig. 1): one riddle under best-of-n, Gao et al. Table 2 (renderer v2) ----
// Data: RHD.BON_EX from recompute.py (the paper's proxy and gold scores of the answer best-of-n keeps, recentred so the initial policy averages 0).
// One column per n: the proxy score (orange) and the gold score (green) as signed bars on a white plinth (positive up, negative hanging below).
// n samples stream from the 1.2B policy through the 12M proxy; the kept answer is scored by the 6B gold model; the last step joins the bar tops.
(function(){
  if(!document.getElementById('stg-bon')||!window.S3||!window.RHD)return;const {at,off,lerp,mix}=S3;
  const D=RHD.BON_EX,N=D.length,XS=1.25,x=i=>-3.35+i*XS,YP=1.15,HS=2.0,PW=.98;
  const lab=n=>n.replace(' to ','-').replace(/,000/g,'k');
  const fmt=v=>(v>=0?'+':'−')+Math.abs(v).toFixed(2);
  const cnt=n=>{const v=+String(n).split(' ')[0].replace(/,/g,'');return Math.max(1,Math.min(18,Math.round(2+3.2*Math.log10(v))))};
  // the step list carries the numbers as static text; write them from the data so the two cannot drift (check_stages.mjs compares them)
  document.querySelectorAll('[data-bx]').forEach(e=>{const k=e.dataset.bx,i=+k.slice(1);e.textContent=fmt(D[i][k[0]==='p'?'proxy':'gold'])});
  function bar(R,cx,v,c,a){const h=Math.max(.02,Math.abs(v)*HS);R.box([cx,v>=0?YP:YP-.05-h,0],[.3,h,.34],{fill:c,a,shadow:false})}
  function draw(R,k,e){const P=R.P;R.grid(-6,6,-2.2,2.6,.5);
    const pc=P.c2,gc=P.c3,ja=k===N-1?1-e:1,top=(i,key)=>[x(i)+(key==='proxy'?-.19:.19),D[i][key]>=0?YP+D[i][key]*HS:YP-.05+D[i][key]*HS,0];
    // the 1.2B policy and the two judges: the proxy (what best-of-n maximises) and the gold model (what we wanted)
    R.box([-5.55,0,0],[.9,.8,.8],{fill:P.paper});R.label([-5.55,0,.45],'policy · 1.2B',{mono:true,fs:12.5,dy:14,wide:1});
    R.glass([-4.5,.12,-.6],[0,0,1.2],[0,1.15,0],{c:pc,nu:5,nv:5,a:ja});R.label([-4.5,1.3,0],'proxy RM · 12M',{al:'right',mono:true,fs:12.5,c:pc,b:1,dy:-10,dx:6,wide:1,a:ja});
    R.glass([5.35,.12,-.6],[0,0,1.2],[0,1.15,0],{c:gc,nu:5,nv:5,a:ja});if(k<N-1)R.label([5.35,1.3,0],'gold RM · 6B',{mono:true,fs:12.5,c:gc,b:1,dy:-10,wide:1});
    for(let i=0;i<N;i++){
      // what has not happened yet is drawn faintly, so the whole row is there from the first step
      const fut=i>k,cur=i===k,a=fut?.16:cur?(i===k?Math.max(.35,e):1):(k===N-1?.9:.42);
      R.box([x(i),YP-.05,0],[PW,.05,.5],{a:fut?.25:1,shadow:false});
      [-1,1].forEach(sx=>R.box([x(i)+sx*PW*.44,0,0],[.03,YP-.05,.03],{a:fut?.25:.85}));
      R.label([x(i),0,.5],cur?'n = '+lab(D[i].n):lab(D[i].n),{mono:true,fs:12,dy:14,c:cur?P.ink:P.mute,b:cur,a:fut?.5:1,wide:cur?0:1});
      if(fut){R.quad([[x(i)-.36,YP,-.17],[x(i)+.36,YP,-.17],[x(i)+.36,YP,.17],[x(i)-.36,YP,.17]],{ec:P.mute,ea:.45,dash:[3,3],lw:.8});continue}
      const g=cur?e:1;bar(R,x(i)-.19,D[i].proxy*g,pc,a);bar(R,x(i)+.19,D[i].gold*g,gc,a);
      if(cur&&k<N-1){const hy=YP+Math.max(0,D[i].proxy,D[i].gold)*HS+.12;
        R.label([x(i)-.45,hy,0],'gold '+fmt(D[i].gold),{al:'left',mono:true,fs:12.5,c:gc,b:1,dy:-12,a:e});
        R.label([x(i)-.45,hy,0],'proxy '+fmt(D[i].proxy),{al:'left',mono:true,fs:12.5,c:pc,b:1,dy:-30,a:e})}
    }
    // samples: n answers stream from the policy through the proxy, one survives to the column; the gold model scores only that one
    if(k<N-1){const m=cnt(D[k].n);
      R.flow([[-4.95,.45,0],[-4.5,.6,0]],{c:P.mute,n:m,r:.06,speed:.9,a:.9});
      R.flowArc([-4.3,.9,0],[x(k)-.19,YP+.15,0],.45,{c:pc,n:5,r:.07,speed:1.3,a:e});
      R.flowArc([5.2,.9,0],[x(k)+.19,YP+.15,0],.4,{c:gc,n:5,r:.07,speed:1.3,a:e});
      R.label([-5.55,0,.45],D[k].n==='1'?'1 sample':lab(D[k].n)+' samples',{mono:true,fs:12,dy:30,c:P.mute,wide:1});
    }
    // the last step: the two lines through the bar tops; the proxy never falls, the gold rises, falls and rises
    if(k===N-1){const pp=D.map((_,i)=>[x(i)-.19,YP+D[i].proxy*HS,0]),gp=D.map((_,i)=>[x(i)+.19,YP+D[i].gold*HS,0]);
      R.line(pp.slice(0,Math.max(2,Math.ceil(e*N))),{c:pc,w:2.6,top:1});R.line(gp.slice(0,Math.max(2,Math.ceil(e*N))),{c:gc,w:2.6,top:1,dash:[6,4]});
      R.label(top(N-1,'proxy'),'proxy '+fmt(D[N-1].proxy)+(R.W<520?'':': it rose at every step'),{al:'right',mono:true,fs:12.5,b:1,c:pc,dx:-6,dy:-14,a:e});
      R.label(top(2,'gold'),'gold '+fmt(D[2].gold)+(R.W<520?'':' at n = 10'),{al:'right',mono:true,fs:12.5,b:1,c:gc,dx:-8,dy:-12,a:e});
      R.label([x(4)+.19,YP-.05+D[4].gold*HS,0],'gold '+fmt(D[4].gold),{al:'left',mono:true,fs:12.5,b:1,c:gc,dx:8,dy:24,a:e});
      R.label(top(N-1,'gold'),'gold '+fmt(D[N-1].gold),{al:'left',mono:true,fs:12.5,b:1,c:gc,dx:8,dy:2,a:e})}
  }
  S3.stage({id:'stg-bon',list:'sx-bon',fig:'Fig. 1 · one riddle under best-of-n (Gao et al., Table 2)',cam:[.16,.36],bounds:()=>innerWidth<560?[[-3.9,-.05,-.6],[4.1,3.2,.7]]:[[-6.0,-.05,-.6],[5.9,3.2,.7]],aspect:.46,dur:1400,hold:4800,draw,
    margin:w=>w<520?[16,10,26,10]:[20,20,34,20]});
})();
