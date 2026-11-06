// ---- Scene (section 2, Fig. 2): the whole return against the reward-to-go on one four-step episode, as a field of signed bars
// (rows: the actions a0..a3, columns: the rewards r1..r4 = 1, 0, 2, -1, gamma = 1; illustrative). Causality turns the lower triangle to glass
// and each row's weight drops from 2 to its reward-to-go 2, 1, 1, -1. Renderer v2: flows where reward moves into a weight. ----
(function(){
  if(!document.getElementById('stg-rtg'))return;const {at,off,lerp,mix}=S3;
  const RW=[1,0,2,-1],n=4,G=RW.reduce((a,b)=>a+b,0),TOGO=RW.map((_,t)=>RW.slice(t).reduce((a,b)=>a+b,0));
  window.PG3=Object.assign(window.PG3||{},{rtg:{RW,G,TOGO}});
  const X=k=>(k-1.5)*1.3,Z=t=>(t-1.5)*1.25,ZR=Z(0)-1.6,XT=X(3)+1.8,YP=.55,SC=.4;
  const yv=v=>v>=0?YP+v*SC:YP-.04+v*SC;
  function sbar(R,x,z,v,col,a,o){o=o||{};if(a<=.01)return;R.box([x,YP-.04,z],[.86,.04,.62],{a,shadow:false,fa:o.fa});
    if(Math.abs(v)<1e-9){R.box([x,YP,z],[.5,.02,.32],{fill:col,a:a*.7,shadow:false});return}
    const h=Math.abs(v)*SC;R.box([x,v>=0?YP:YP-.04-h,z],[.5,h,.32],{fill:col,a,shadow:false,lw:.8,fa:o.fa})}
  // a cell that causality removes: a glass ghost of the bar it was
  function ghost(R,x,z,v,c,a){if(a<=.01)return;const y0=Math.min(YP,yv(v)),y1=Math.max(YP,yv(v))+.001;R.glass([x-.3,y0,z],[.6,0,0],[0,Math.max(.06,y1-y0),0],{c,a,nu:1,nv:2})}
  function draw(R,k,e){const P=R.P,nar=R.W<520;R.grid(-4,5.4,-3.9,3,.5);
    const cR=mix(P.paper,P.c5,.7),cW=mix(P.paper,P.ink,.12),cG=mix(P.paper,P.acc,.7);
    // the episode's rewards, a row at the back
    const ra=k===0?1:.55;RW.forEach((r,j)=>{sbar(R,X(j),ZR,r,cR,ra);R.label([X(j),Math.max(YP,yv(r)),ZR],'r'+'₁₂₃₄'[j]+' = '+(r<0?'−':'')+Math.abs(r),{mono:true,fs:12.5,dy:-11,b:1,c:P.c5,a:Math.max(.6,ra)})});
    R.label([X(0)-.7,YP,ZR],'rewards',{al:'right',dx:-6,mono:true,fs:12.5,c:P.c5,grp:'rows'});
    // the action rows (empty slots at step 1, so the whole layout is there from the start)
    for(let t=0;t<n;t++){const z=Z(t);R.label([X(0)-.7,YP,z],'a'+'₀₁₂₃'[t],{al:'right',dx:-6,mono:true,fs:13,b:1,c:P.ink});
      for(let j=0;j<n;j++){const after=j>=t,v=RW[j];
        if(k===0){R.quad([[X(j)-.35,0,z-.28],[X(j)+.35,0,z-.28],[X(j)+.35,0,z+.28],[X(j)-.35,0,z+.28]],{fill:P.soft,a:.9,ea:.25});continue}
        const appear=k===1?Math.min(1,Math.max(0,e*1.6-t*.18)):1;
        if(after||k<2)sbar(R,X(j),z,v,k>=2?cG:cW,appear*(k>=2&&!after?1:1));
        else{const g=k===2?e:1;sbar(R,X(j),z,v,cW,1-g);ghost(R,X(j),z,v,P.mute,g*.7)}
        if(k===1&&t===0)R.flowArc([X(j),yv(Math.max(0,v))+.05,ZR],[X(j),yv(Math.max(0,v))+.05,Z(3)],.5,{c:P.c5,a:.8*appear,r:.06,speed:1.5,n:9})}
      // the row's weight at the right end: the whole return, then the reward-to-go
      if(k>=1){const a=k===1?Math.min(1,Math.max(0,e*1.6-t*.18)):1,w=k<=2?G:lerp(G,TOGO[t],k===3?e:1),col=k===3?cG:cW;
        sbar(R,XT,z,w,col,a);R.label([XT,yv(w),z],(w<0?'−':'')+Math.abs(w).toFixed(k===3&&e<1?1:0),{mono:true,fs:13,b:1,dy:w>=0?-11:12,c:k===3?P.acc:P.ink,a});
        if(k===3)for(let j=t;j<n;j++)R.flowArc([X(j),YP+.25,z],[XT,YP+.25,z],.3,{c:P.acc,a:.75,r:.055,speed:1.6,n:5})}}
    if(k>=1)R.label([XT,0,Z(3)+.5],k===3?'reward-to-go':'weight G(τ)',{mono:true,fs:12.5,dy:14,b:1,c:k===3?P.acc:P.ink});
    if(k>=2)R.label([X(0),0,Z(3)+.5],nar?'glass: before the action':'glass: rewards earned before the action',{al:'left',mono:true,fs:12,dy:14,c:P.mute,a:k===2?e:1})}
  S3.stage({id:'stg-rtg',list:'sx-rtg',fig:'Fig. 2 · which rewards weight each action',cam:[-.32,.52],bounds:[[-3.4,0,-3.7],[4.9,1.5,2.7]],aspect:.68,dur:1500,hold:4600,draw,
    margin:w=>w<520?[14,10,18,10]:[16,16,18,70]});
})();
