// ---- Scene: Fig. 1 (stg-layers), one change through the five layers, cheapest to most faithful (renderer v2, 25_js_s3.js) ----
// Five pedestals rising left to right, one per layer of section 1, each topped by a glass plate in its colour and named with its cost,
// what it catches and the child page that owns it (the words of the section's step list, kept in LAY below). Outputs of one change
// flow up from the box on the floor, layer by layer. The order is the page's; pedestal heights and sizes are a layout, not measured costs.
(function(){
  if(!document.getElementById('stg-layers')||!window.S3)return;
  const {mix,cl,lerp}=S3;
  const win=(e,a,b)=>cl((e-a)/(b-a),0,1);
  const LAY=[
    {n:'Static benchmarks',s:'1 · benchmarks',cost:'cents per item, deterministic',cat:'catches: capability on closed-form tasks',pg:'page: Eval harnesses'},
    {n:'LLM-as-judge',s:'2 · LLM judge',cost:'one model call per item',cat:'catches: quality, helpfulness, partial credit',pg:'page: LLM-as-judge'},
    {n:'Human evaluation',s:'3 · people',cost:'minutes and dollars per item',cat:'catches: what the judge is blind to',pg:'page: Human evaluation'},
    {n:'Regression gates',s:'4 · CI gates',cost:'minutes per change',cat:'catches: regressions on your product',pg:'page: Production eval engineering'},
    {n:'Online measurement',s:'5 · online',cost:'real traffic and real risk',cat:'catches: what no curated set imagined',pg:'page: Production eval engineering'}];
  const NL=LAY.length,X=i=>-3.6+2.05*i,Z=i=>.5-.25*i,H=i=>.4+.55*i,PW=1.5,PD=1.25;
  const OUT=[-6.1,0,.75];
  const top=(i,dy)=>[X(i),H(i)+(dy||0),Z(i)];
  let moving=false;
  const lab=(R,p,t,o)=>{if(!moving)R.label(p,t,o)};
  function draw(R,k,e,st){const P=R.P,C=[P.c1,P.c2,P.c4,P.c5,P.c6],late=win(e,.55,1),pk=st&&st.pk!=null?st.pk:k;moving=e<.55&&k!==pk;
    R.grid(-7.2,6.4,-2.6,2.6,.5);
    const all=k===0||k===NL+1,cur=k-1; // steps 2 to 6 are about one layer (index cur)
    // the change: a box on the floor whose outputs climb the stack
    R.box(OUT,[.95,.5,.95],{fill:mix(P.paper,P.acc,.22)});
    if(all){lab(R,[OUT[0],0,OUT[2]+.48],'one change',{fs:12.5,b:1,dy:14,c:P.ink,a:late});
      lab(R,[OUT[0],0,OUT[2]+.48],'prompt, model or retrieval',{fs:12,dy:32,c:P.mute,a:late,wide:1})}
    for(let i=0;i<NL;i++){
      const a=all?1:i===cur?1:i<cur?.42:.18,c=C[i];
      R.box([X(i),0,Z(i)],[PW,H(i),PD],{fill:mix(P.paper,c,.16),a});
      R.glass([X(i)-PW/2-.04,H(i)+.01,Z(i)-PD/2-.04],[PW+.08,0,0],[0,0,PD+.08],{c,a:a*(i===cur?1:.8),nu:6,nv:5,th:.03});
      // the stream: outputs go from the change up to this layer while a step is about this layer or above it
      const reach=all?NL-1:cur;
      if(i<=reach){const from=i===0?[OUT[0]+.2,.5,OUT[2]]:top(i-1,.06),to=top(i,.06);
        const fa=all?(k===0?win(e,.15*i,.15*i+.4):.75):i===cur?win(e,.1,.5):.45;
        R.flowArc(from,to,.55,{c,a:fa,r:.065,n:7,speed:1.2})}
    }
    if(!all){const i=cur,c=C[i],x=X(i),y=H(i),z=Z(i),u=win(e,.2,.75);
      R.glow(top(i,.08),.55,{c,a:.35*u});
      // what sits on each layer: questions, a judge, raters, a golden set, live traffic (shapes only; counts are not data)
      if(i===0)for(let j=0;j<5;j++)R.box([x-.56+j*.28,y,z],[.2,.12,.42],{fill:mix(P.paper,c,.45),a:win(e,.1+j*.08,.4+j*.08),shadow:false});
      if(i===1){R.glass([x-.42,y+.02,z],[.84,0,0],[0,.72,0],{c,a:u,nu:4,nv:4});R.flow([[x,y+.36,z+.7],[x,y+.36,z+.02]],{c:P.c1,a:u*.8,r:.06,n:4,speed:.8})}
      if(i===2){[-.42,0,.42].forEach((dx,j)=>{R.box([x+dx,y,z],[.16,.22,.16],{a:win(e,.1+j*.1,.4+j*.1),shadow:false});R.ball([x+dx,y+.32,z],.1,{c,a:win(e,.1+j*.1,.4+j*.1)})});
        R.flowArc(top(2,.1),top(1,.1),.7,{c:P.c4,a:win(e,.45,.9),r:.06,n:6,speed:1})}
      if(i===3)for(let r=0;r<4;r++)for(let j=0;j<5;j++)R.box([x-.5+j*.25,y,z-.39+r*.26],[.17,.07,.17],{fill:mix(P.paper,c,.5),a:win(e,.1+r*.08,.45+r*.08),shadow:false});
      if(i===4){R.flow([[x+2.2,y+.55,z-.2],[x+1.2,y+.4,z-.1],[x+.2,y+.12,z]],{c:P.c6,a:u,r:.06,n:10,speed:1.3});R.flow([[x+2.2,y+.15,z+.45],[x+1.2,y+.15,z+.3],[x+.25,y+.1,z+.1]],{c:P.c6,a:u*.8,r:.05,n:8,speed:1.6})}
      // labels: this step's only, once the camera has arrived
      // the layer's card, up and to the left of its plate, where the lower layers leave the canvas empty
      const lx=[x-PW/2-.15,y+1.05,z];
      lab(R,lx,LAY[i].n,{fs:14.5,b:1,al:'right',dx:-6,dy:-32,c,a:late});
      lab(R,lx,LAY[i].cost,{fs:12.5,mono:1,al:'right',dx:-6,dy:-10,c:P.ink,a:late});
      lab(R,lx,LAY[i].cat,{fs:12.5,al:'right',dx:-6,dy:10,c:P.mute,a:late,wide:1});
      lab(R,lx,LAY[i].pg,{fs:12.5,b:1,al:'right',dx:-6,dy:R.W<520?10:30,c,a:late});
      if(i===2)lab(R,top(1),'calibrates the judge',{fs:12.5,b:1,c:P.c4,dy:22,a:late,wide:1});
      if(i===3)lab(R,[x+PW/2,y,z],'100 to 500 items per surface',{fs:12,c:P.mute,al:'left',dx:10,a:late,wide:1});
      if(i===4)lab(R,[x+2.2,y+.55,z-.2],'live traffic',{fs:12.5,b:1,c:P.c6,al:'left',dx:6,a:late});
    }else{
      for(let i=0;i<NL;i++)lab(R,top(i),LAY[i].s,{fs:12.5,b:1,c:C[i],dy:-22,a:late,grp:'nm'});
      for(let i=0;i<NL;i++)lab(R,top(i),String(i+1),{fs:13,b:1,c:C[i],dy:-18,a:late*(R.W<520?1:0)});
      if(k===NL+1){const a=win(e,.3,.9),y0=H(0)+1.25,y1=H(NL-1)+1.25;
        R.line([[X(0)-.2,y0,Z(0)],[X(NL-1)-.4,y1,Z(NL-1)]],{c:P.mute,w:1.6,head:7,a});
        lab(R,[X(0)-.2,y0,Z(0)],'cheapest',{fs:12.5,b:1,al:'right',dx:-8,c:P.mute,a:late});
        lab(R,[X(NL-1)-.4,y1,Z(NL-1)],'most faithful to real use',{fs:12.5,b:1,al:'right',dx:-10,dy:-12,c:P.mute,a:late})}
    }
  }
  const full={cam:[.4,.62],bounds:[[-6.7,0,-1.0],[5.6,3.1,1.1]]};
  const V=k=>{if(k===0||k===NL+1)return full;const i=k-1;
    return {cam:[.34,.44],bounds:[[X(i)-2.9,0,Z(i)-.8],[X(i)+(i===4?2.4:1.0),H(i)+1.35,Z(i)+.8]]}};
  S3.stage({id:'stg-layers',list:'sx-layers',fig:'Fig. 1 · one change through the five layers',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1700,hold:5200,draw,
    margin:w=>w<520?[26,10,16,10]:[34,18,20,18],view:V});
})();
