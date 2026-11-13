// ---- Scene: Fig. 1 (stg-fam), five ways to generate one pullover, three ways to read it (renderer v2, 25_js_s3.js) ----
// Five generation lanes (VAE, GAN, autoregressive, diffusion, flow), one sequential network call per white marker, then a reading block
// (vision encoder, VLM, native model). Every frame is exact arithmetic on the real Fashion-MNIST test pullover (window.RDG.img, 22_js_rd_data.js)
// and one seeded noise draw, as the retired section 1 card computed it:
//   diffusion: x_t = sqrt(abar_t) x0 + sqrt(1 - abar_t) eps, DDPM linear betas 1e-4..0.02 over T = 1000, DDIM timesteps 980, 960, ..., 0 (50 calls)
//   flow:      x_t = (1 - t) x0 + t eps, t = 1, 7/8, ..., 0 (8 Euler steps; with the exact velocity the path is a straight line)
//   autoregressive: 49 tokens of 4 x 4 pixels revealed in raster order (49 calls)
// The VAE and GAN lanes decode in one call; their output is the same target image (an oracle path, not a trained model's sample: labelled so).
// The 8 code numbers on the VAE lane are the first 8 values of the same seeded N(0, 1) draw. Positions and sizes are a layout.
(function(){
  if(!document.getElementById('stg-fam')||!window.S3||!window.RDG)return;
  const {mix,cl,lerp}=S3,G=window.RDG;
  const win=(e,a,b)=>cl((e-a)/(b-a),0,1);
  // ---- the data: the pullover, one seeded noise draw, the DDPM schedule ----
  const raw=atob(G.img),x0=new Float32Array(784);for(let i=0;i<784;i++)x0[i]=raw.charCodeAt(i)/127.5-1;
  let s=20261017;const rnd=()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
  const eps=new Float32Array(784);for(let i=0;i<784;i+=2){const u=Math.max(rnd(),1e-12),v=rnd(),r=Math.sqrt(-2*Math.log(u));eps[i]=r*Math.cos(2*Math.PI*v);eps[i+1]=r*Math.sin(2*Math.PI*v)}
  const T=1000,ab=new Float64Array(T);{let p=1;for(let t=0;t<T;t++){const b=1e-4+(0.02-1e-4)*t/(T-1);p*=1-b;ab[t]=p}}
  const NS=50,NE=8,NT=49,ts=[];for(let k=NS-1;k>=0;k--)ts.push(k*20);
  const dco=f=>f<=0?[0,1]:[Math.sqrt(ab[ts[f-1]]),Math.sqrt(1-ab[ts[f-1]])];   // frame f of 50: coefficients of image and noise
  const tokOf=i=>((i/28|0)>>2)*7+((i%28)>>2);
  const F={noise:i=>eps[i],img:i=>x0[i],ar:k=>i=>tokOf(i)<k?x0[i]:-1,df:f=>{const c=dco(f);return i=>c[0]*x0[i]+c[1]*eps[i]},fl:n=>{const t=1-n/NE;return i=>(1-t)*x0[i]+t*eps[i]}};
  // numbers the step list quotes (check_stages.mjs compares them with the list text)
  window.GMF={calls:[1,1,NT,NS,NE],imgVar:f=>dco(f)[0]**2,flowVar:n=>(n/NE)**2/((n/NE)**2+(1-n/NE)**2),code:Array.from(eps.slice(0,8))};
  // ---- an image as an upright tile facing the camera (+z): bottom centre c, side sz; fn(i) in [-1, 1] per pixel, res 28 or 14 ----
  function tile(R,c,sz,fn,a,o){o=o||{};if(a<=.01)return;const P=R.P,x0w=c[0]-sz/2,y0=c[1],z=c[2],res=o.res||28,d=sz/res;
    R.quad([[x0w-.05,y0-.05,z-.01],[x0w+sz+.05,y0-.05,z-.01],[x0w+sz+.05,y0+sz+.05,z-.01],[x0w-.05,y0+sz+.05,z-.01]],{fill:P.paper,a,ec:o.ec||P.edge,lw:o.lw||1,dash:o.dash});
    if(!fn)return;const ink=o.tint||P.ink,q=new Uint8Array(res*res),st=28/res;
    for(let r=0;r<res;r++)for(let j=0;j<res;j++){let v=0;for(let u=0;u<st;u++)for(let w=0;w<st;w++)v+=fn((r*st+u)*28+j*st+w);v/=st*st;q[r*res+j]=Math.round(cl((v+1)/2,0,1)*10)}
    for(let r=0;r<res;r++){let j=0;while(j<res){const v=q[r*res+j];let e=j+1;while(e<res&&q[r*res+e]===v)e++;
      if(v>0){const xa=x0w+j*d,xb=x0w+e*d,yt=y0+sz-r*d,yb=yt-d;R.quad([[xa,yb,z+.002],[xb,yb,z+.002],[xb,yt,z+.002],[xa,yt,z+.002]],{fill:mix(P.paper,ink,v/10),a,edge:false,dz:-.6})}
      j=e}}}
  // ---- layout ----
  const LZ=[-3.2,-1.6,0,1.6,3.2],SX=-4.6,C0=-3.3,C1=1.7,OX=3.0,TS=1.1,FY=.3;
  const NAME=['VAE','GAN','Autoregressive','Diffusion','Flow matching'],COL=['c4','mute','c5','c1','c2'];
  const RZ=-.9,NZ=1.7,RX0=6.0,EX=7.35,GX=8.75,CX=10.15,LX=11.35,OX2=12.75;   // reading block: lane RZ (encoder, VLM), lane NZ (native)
  const lab=(R,p,t,o,mv)=>{if(!mv)R.label(p,t,o)};
  const f0=n=>n.toLocaleString('en-US');
  function calls(R,i,lit,a,P){const n=GMF.calls[i],c=P[COL[i]],z=LZ[i];if(n===1)return;
    const span=C1-C0,w=Math.min(.5,span/n*.72);
    for(let j=0;j<n;j++){const x=C0+span*(j+.5)/n;
      if(j<lit)R.box([x,0,z],[w,.2,.42],{fill:mix(P.paper,c,.55),a,shadow:false,lw:.6});
      else R.quad([[x-w/2,.004,z-.21],[x+w/2,.004,z-.21],[x+w/2,.004,z+.21],[x-w/2,.004,z+.21]],{a:a*.7,dash:[3,3],ec:P.line,lw:1})}}
  function plate(R,x,z,c,a,h){R.glass([x,.02,z-.55],[0,0,1.1],[0,h||1.05,0],{c,a,nu:4,nv:4})}
  function code(R,c,vals,a,P,col){if(a<=.01)return;const nb=vals.length,wd=.9,bw=wd/nb;R.box([c[0],c[1]-.04,c[2]],[wd+.14,.04,.34],{a,shadow:false});
    vals.forEach((v,j)=>{const h=Math.max(.014,Math.abs(v)/2.5*.42),bx=c[0]-wd/2+bw*(j+.5);R.box([bx,v>=0?c[1]:c[1]-.04-h,c[2]],[bw*.7,h,.11],{fill:mix(P.paper,col,.6),a,shadow:false,lw:.6})})}
  function chips(R,x,z,n,a,col,P,dx){for(let j=0;j<n;j++)R.box([x+j*(dx||.3),0,z],[.22,.16,.3],{fill:col,a,shadow:false,lw:.6})}
  function draw(R,k,e,st){const P=R.P,pk=st&&st.pk!=null?st.pk:k,mv=e<.55&&k!==pk,late=win(e,.55,1),u=win(e,.15,.95),wide=R.W>=520;
    R.grid(-6.4,13.6,-3.4,3.3,.5);
    const AL=i=>k===i?1:(k===5||k===9)?.9:k<5?(i<k?.22:.06):.12;
    // ---- the five generation lanes ----
    for(let i=0;i<5;i++){const a=AL(i),c=P[COL[i]],z=LZ[i],n=GMF.calls[i],cur=k===i,prog=cur?u:k>i?1:0;
      // source
      if(i===0)code(R,[SX,.35,z],GMF.code,a,P,c);
      else if(i===2)tile(R,[SX,.05,z],TS*.8,null,a,{dash:[4,3]});
      else tile(R,[SX,.05,z],TS*.8,F.noise,a,{res:cur?28:14});
      // the network: one call (a glass plate), or one marker per sequential call
      let lit=0,fr=null;
      if(n===1){plate(R,(C0+C1)/2,z,c,a*(cur?1:.8));lit=prog>.5?1:0;fr=prog>.5?F.img:null}
      else{lit=Math.round(n*prog);calls(R,i,lit,a,P);fr=i===2?F.ar(lit):i===3?F.df(lit):F.fl(lit)}
      if(i===1&&(k===1||k===9)){ // the judge, used only in training
        R.glass([OX+1.35,.02,z-.45],[0,0,.9],[0,.85,0],{c:P.bad,a:a*.8,nu:3,nv:3});
        R.flowArc([OX+.4,.7,z],[OX+1.35,.55,z],.25,{c:P.bad,a:a*.7,r:.05,n:4,speed:.9})}
      // the data moving down the lane
      const xEnd=n===1?(prog>.5?OX-.7:(C0+C1)/2):C0+(C1-C0)*Math.max(.02,lit/n);
      if(a>.3)R.flow([[SX+.55,FY,z],[xEnd,FY,z]],{c,a:a*.85,r:.06,n:Math.max(3,Math.round((xEnd-SX)*1.6)),speed:1.1});
      if(a>.3&&(n===1?prog>.5:lit>0))R.flow([[xEnd,FY,z],[OX-.7,FY,z]],{c,a:a*.5,r:.05,n:3,speed:1.1});
      // the output
      tile(R,[OX,.05,z],TS,i===2&&lit===0?null:fr||F.noise,a,{res:a>.5?28:14,dash:i===2&&lit===0?[4,3]:null,ec:cur?c:null,lw:cur?1.6:1});
      // labels
      if(cur){const head=[SX,i===0?.9:TS*.8+.05,z];
        lab(R,head,(i+1)+' · '+NAME[i],{fs:14.5,b:1,c,dy:-14,a:late},mv);
        const cnt=i===0?'1 call: the decoder':i===1?'1 call: the generator':i===2?'call '+lit+' of 49: token '+lit:i===3?'call '+lit+' of 50 (DDIM)':'call '+lit+' of 8 (Euler)';
        lab(R,i>=2?[(C0+C1)/2,0,z+.4]:[(C0+C1)/2,1.07,z],cnt,{fs:13,b:1,mono:1,c,dy:i>=2?22:-14,a:late},mv);
        if(i===3)lab(R,[OX,0,z],(100*GMF.imgVar(lit)).toFixed(0)+'% image by variance',{fs:12.5,b:1,mono:1,c:P.ink,dy:16,a:late},mv);
        if(i===4)lab(R,[OX,0,z],(100*GMF.flowVar(lit)).toFixed(0)+'% image by variance',{fs:12.5,b:1,mono:1,c:P.ink,dy:16,a:late},mv);
        if(i===0)lab(R,[SX,0,z+.2],'z ~ N(0, I): 8 numbers',{fs:12.5,mono:1,c:P.mute,dy:16,a:late},mv);
        if(i===1)lab(R,[OX+1.35,0,z+.45],'judge D (training only)',{fs:12.5,b:1,c:P.bad,dy:16,a:late,wide:1},mv);
        if(i===2)lab(R,[SX,0,z],'empty canvas',{fs:12.5,c:P.mute,dy:16,a:late},mv);
        if(i>=3)lab(R,[SX,0,z],i===3?'pure noise':'the same noise',{fs:12.5,c:P.mute,dy:16,a:late},mv);
        if(i<3)lab(R,[OX,0,z],i<2?'the target, decoded at once':'the target pullover',{fs:12.5,c:P.mute,dy:16,a:late,wide:1},mv)}
      if(k===5||k===9){
        lab(R,[SX-.6,.3,z],NAME[i],{fs:13,b:1,c,al:'right',dx:-6,a:late,grp:'ln'},mv);
        if(k===5)lab(R,[OX+TS/2+.1,.55,z],f0(n)+(i>=2?' calls, '+f0(2*n)+' with guidance':(n===1?' call':' calls')),{fs:12.5,b:1,mono:1,c,al:'left',dx:8,a:late,grp:'cnt'},mv)}
    }
    // ---- the reading block ----
    const ra=k===6||k===7?1:k===9?.9:k===8?.25:.1,va=k===7?1:k===9?.9:k===8?.25:k===6?.15:.1,na=k===8?1:k===9?.9:.1;
    tile(R,[RX0,.05,RZ],TS,F.img,Math.max(ra,va),{res:ra>.5?28:14});
    plate(R,EX,RZ,P.c3,ra*.95);
    for(let r=0;r<7;r++)for(let j=0;j<7;j++){const x=GX-.6+j*.2,z=RZ-.6+r*.2,t=k===6?win(u,(r*7+j)/49*.8,(r*7+j)/49*.8+.2):1;
      R.box([x,0,z],[.15,.06+.18*t,.15],{fill:mix(P.paper,P.c3,.5),a:Math.max(ra,va*.9)*(k===6?Math.max(.15,t):1),shadow:false,lw:.5})}
    if(ra>.3){R.flow([[RX0+.65,FY,RZ],[EX,FY,RZ]],{c:P.c3,a:ra*.85,r:.06,n:3});R.flow([[EX,FY,RZ],[GX-.75,FY,RZ]],{c:P.c3,a:ra*.85*(k===6?win(u,0,.3):1),r:.06,n:3})}
    plate(R,CX,RZ,P.c6,va*.95,.85);
    R.box([LX,0,RZ],[1.1,.95,1.1],{fill:mix(P.paper,P.c6,.3),a:va});
    chips(R,OX2-.3,RZ,3,va*(k===7?win(u,.5,1):1),mix(P.paper,P.c6,.6),P);
    if(va>.3){R.flow([[GX+.75,FY,RZ],[CX,FY,RZ],[LX-.55,FY,RZ]],{c:P.c6,a:va*.85,r:.06,n:5});R.flow([[LX+.55,FY,RZ],[OX2-.4,FY,RZ]],{c:P.c6,a:va*.85*(k===7?win(u,.4,.8):1),r:.06,n:3})}
    // native: text and image tokens into one transformer, image tokens out
    chips(R,RX0-.45,NZ,3,na,mix(P.paper,P.ink,.12),P);chips(R,RX0+.5,NZ,4,na,mix(P.paper,P.c5,.6),P);
    R.box([(EX+CX)/2+.35,0,NZ],[3.4,.75,.95],{fill:mix(P.paper,P.c5,.25),a:na});
    chips(R,LX-.25,NZ,4,na*(k===8?win(u,.3,.7):1),mix(P.paper,P.c5,.6),P);
    tile(R,[OX2+.2,.05,NZ],TS*.85,k===8?F.ar(Math.round(49*win(u,.5,1))):F.img,na*(k===8?win(u,.45,.6):1),{res:na>.5?28:14});
    if(na>.3){R.flow([[RX0-.5,FY,NZ],[EX-.6,FY,NZ]],{c:P.c5,a:na*.85,r:.06,n:4});R.flow([[CX+1.0,FY,NZ],[OX2-.45,FY,NZ]],{c:P.c5,a:na*.85*(k===8?win(u,.3,.6):1),r:.06,n:4})}
    if(k===6){lab(R,[EX,1.07,RZ],'Vision encoder',{fs:14.5,b:1,c:P.c3,dy:-14,a:late},mv);
      lab(R,[GX,.24,RZ+.6],'49 patch tokens (4 × 4 pixels each)',{fs:12.5,b:1,mono:1,c:P.c3,dy:18,a:late},mv);
      lab(R,[RX0,0,RZ],'the pullover',{fs:12.5,c:P.mute,dy:16,a:late,wide:1},mv)}
    if(k===7){lab(R,[LX,.95,RZ],'Vision-language model',{fs:14.5,b:1,c:P.c6,dy:-14,a:late},mv);
      lab(R,[CX,0,RZ+.55],'connector',{fs:12.5,b:1,c:P.c6,dy:16,a:late},mv);
      lab(R,[OX2,.16,RZ],'text out',{fs:12.5,b:1,c:P.c6,dy:-12,a:late},mv);
      lab(R,[GX,0,RZ+.6],'image tokens, read like words',{fs:12.5,mono:1,c:P.c3,dy:18,a:late,wide:1},mv)}
    if(k===8){lab(R,[(EX+CX)/2+.35,.75,NZ-.48],'Native: one transformer reads and writes',{fs:14.5,b:1,c:P.c5,dy:-16,a:late},mv);
      lab(R,[RX0-.15,0,NZ+.2],'text and image tokens in',{fs:12.5,c:P.mute,dy:20,a:late,wide:1},mv);
      lab(R,[OX2+.2,0,NZ],'image tokens out',{fs:12.5,c:P.mute,dy:16,a:late,wide:1},mv)}
    if(k===9){lab(R,[EX,1.07,RZ],'encoder',{fs:13,b:1,c:P.c3,dy:-12,a:late,grp:'rd'},mv);lab(R,[LX,.95,RZ],'VLM',{fs:13,b:1,c:P.c6,dy:-12,a:late,grp:'rd'},mv);
      lab(R,[(EX+CX)/2+.35,0,NZ+.48],'native',{fs:13,b:1,c:P.c5,dy:16,a:late},mv)}
  }
  const full={cam:[.3,.8],bounds:[[-6.6,0,-3.8],[13.6,1.4,3.8]]};
  const V=k=>{if(k===9)return full;if(k===5)return document.getElementById('stg-fam').clientWidth<520?{cam:[.3,1.15],bounds:[[-5.9,0,-3.6],[5.0,1.3,3.6]]}:{cam:[.3,.8],bounds:[[-6.9,0,-3.8],[5.6,1.3,3.8]]}; // on a phone the five lanes turn into depth
    if(k<5)return {cam:[.5,.46],bounds:[[-5.4,0,LZ[k]-.7],[k===1?4.8:3.8,1.3,LZ[k]+.7]]};
    if(k===8)return {cam:[.3,.55],bounds:[[5.0,0,NZ-.7],[13.5,1.3,NZ+.7]]};
    return {cam:[.3,.55],bounds:[[5.2,0,RZ-.8],[13.4,1.3,RZ+.8]]}};
  S3.stage({id:'stg-fam',list:'sx-fam',fig:'Fig. 1 · one pullover, five ways to make it, three ways to read it',cam:full.cam,bounds:full.bounds,aspect:.5,dur:2600,hold:4600,draw,
    margin:w=>w<520?[30,10,22,10]:[40,18,26,18],view:V});
})();
