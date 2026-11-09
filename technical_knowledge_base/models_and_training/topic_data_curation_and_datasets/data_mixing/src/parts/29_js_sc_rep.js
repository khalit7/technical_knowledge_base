// ---- Scene (Reading 2, Fig. 2): each pass over the same unique data as one slab whose height is what that pass is worth,
// from Muennighoff et al.'s fitted R_D* (window.MX2.muennighoff), columns at 1 to 64 passes, the ceiling 1 + R_D* as a glass plate. ----
(function(){
  if(!document.getElementById('stg-rep'))return;const {at,lerp,mix}=S3;
  const RS=window.MX2.muennighoff.R_D_star,eff=e=>e<=0?0:1+RS*(1-Math.exp(-(e-1)/RS));
  const E=[1,2,4,8,16,32,64],STEP=[0,1,1,2,2,3,3],UH=.17,XS=1.3,FP=.82,x=i=>(i-3)*XS+1.1,PX=-4.4;
  const val=k=>eff(k)-eff(k-1);
  function draw(R,k,e){const P=R.P;R.grid(-5.5,5.5,-2,2,.5);
    // the unique data: one pool on the left that every column reads again and again
    R.box([PX,0,0],[FP,UH,FP],{fill:mix(P.paper,P.c1,.3)});
    R.label([PX,UH,0],'U unique tokens',{fs:12.5,b:1,dy:-14,c:P.c1});
    E.forEach((ep,i)=>{const s=STEP[i];if(k<s||(k===4&&i>2))return;const grow=k===s?e:1,a=1,shown=Math.max(1,Math.ceil(ep*grow-1e-9));
      let y=0;for(let p=1;p<=shown;p++){const v=val(p),h=Math.max(.0025,v*UH);
        R.box([x(i),y,0],[FP,h,FP],{fill:mix(P.paper,P.c1,.12+.68*v),a,shadow:p===1,lw:.6,ea:Math.min(.78,.15+v*.9)});y+=h}
      if(k===s)R.flowArc([PX+FP/2,UH*.7,0],[x(i),y+.05,0],.5+.12*i,{c:P.c1,a:.8*Math.sin(Math.PI*Math.min(1,e*1.15)),r:.06,n:6,speed:1.6});
      const done=grow>=.999;
      R.label([x(i),0,FP/2],ep+(ep===1?' pass':' passes'),{mono:true,fs:12,dy:14,c:P.mute,a,wide:1});
      R.label([x(i),y,0],done?(R.W<520?ep+'× → ':'')+eff(ep).toFixed(2)+' U':'',{mono:true,fs:12.5,b:1,dy:-11,c:P.ink,a:a*(done?1:0)*(R.W>=520||k===s||k===4&&i===2||i===6&&k===3?1:0)});
      if(done&&ep>1&&k===s)R.label([x(i),y,0],'= '+Math.round(100*eff(ep)/ep)+'%',{mono:true,fs:12,dy:-27,c:P.mute,a:e,wide:1})});
    // the ceiling: 1 + R_D*
    const ca=at(k,e,3)*(k===4?0:1);
    if(ca>0){const yc=(1+RS)*UH;R.glass([x(0)-FP,yc,-.9],[x(6)-x(0)+1.5*FP,0,0],[0,0,1.8],{c:P.c2,a:ca*.6,nu:12,nv:3});
      if(k<4)R.label([x(1),yc,-.9],'ceiling 1 + R* = '+(1+RS).toFixed(2)+' U',{dy:-12,mono:true,fs:12.5,b:1,c:P.c2,a:ca})}
    if(k===4){const xr=x(2)+FP/2,o={al:'left',dx:30,mono:true,fs:12.5,c:P.c2,a:e,grp:'rc'};
      R.label([xr,eff(2.3)*UH,0],'≈ 2.3 · DeepSeekMath, its maths corpus',o);
      R.label([xr,eff(3)*UH,0],'3 · The Pile\'s cap',o);
      R.label([xr,eff(4)*UH,0],'≈ 4 · OLMo 2 anneal, SmolLM2 code',o)}
  }
  const full={cam:[.18,.45],bounds:[[-5,0,-1],[6.1,3,1]]};
  S3.stage({id:'stg-rep',list:'sx-rep',fig:'Fig. 2 · repeated data, Muennighoff et al.',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1600,hold:4600,draw,
    margin:w=>w<520?[18,10,22,10]:[20,24,24,24],
    view:k=>k<3?{cam:full.cam,bounds:[[-5,0,-1],[x(k===0?1:k===1?3:5)+.8,[.45,.8,1.95][k],1]]}:k===4?{cam:[.25,.4],bounds:[[PX-.6,0,-1],[x(2)+4.2,eff(4)*UH+.5,1]]}:full});
})();
