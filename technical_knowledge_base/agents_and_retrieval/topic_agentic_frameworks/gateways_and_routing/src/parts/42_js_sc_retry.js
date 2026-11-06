// ---- Scene: Fig. 3, retries multiply across layers (renderer v2). The three recorded cases of FGW.e3 (OpenAI SDK through the LiteLLM
// proxy to a provider that hangs 30 s; the gateway gives each attempt 5 s and retries twice). Time runs along x; the rows are the SDK,
// the gateway and the provider. Each provider call is matched to the SDK send whose gateway chain made it (first call after the send,
// then one about every 6 s: 5 s timeout plus backoff), which reproduces the recorded order exactly. ----
(function(){
  if(!document.getElementById('stg-retry'))return;const {mix}=S3;const F=window.FGW;if(!F)return;
  const CS={};F.e3.cases.forEach(c=>CS[c.key]=c);
  function chains(c){const sends=c.ev.filter(e=>e[0]==='client sends').map(e=>e[1]),used=new Set(),out=[];
    sends.forEach(s=>{const ch=[];let lo=s,hi=s+7.5;for(let j=0;j<3;j++){let best=-1;c.att.forEach((a,i)=>{if(!used.has(i)&&a[0]>=lo&&a[0]<=hi&&(best<0||a[0]<c.att[best][0]))best=i});
      if(best<0)break;used.add(best);ch.push(best);lo=c.att[best][0]+5;hi=c.att[best][0]+7.5}out.push({s,ch})});return out}
  const X=t=>-4.6+9.2*t/90,ZS=-1.7,ZG=-.55,ZP=.45,DZ=.22;
  const CASE=k=>k<=3?'sdk_default_t10':k===4?'sdk_noretry_t10':'sdk_default_t60';
  function draw(R,k,e){const P=R.P,c=CS[CASE(k)],ch=chains(c),nar=R.W<520;R.grid(-5.2,5.2,-2.6,2.9,.5);
    const show=k<=2?k:ch.length-1,fresh=k>=4?e:1; // steps 5 and 6 replace the picture with another recorded case
    // lanes
    [[ZS,'SDK · timeout '+c.tmo+' s'+(k===4?', 0 retries':', 2 retries')],[ZG,'gateway · 5 s per attempt, 2 retries'],[ZP+4*DZ,'provider · hangs 30 s on every call']].forEach(([z,t],j)=>{
      R.quad([[X(0),0.002,z-(j===2?5*DZ:.25)],[X(90),0.002,z-(j===2?5*DZ:.25)],[X(90),0.002,z+(j===2?5*DZ:.25)],[X(0),0.002,z+(j===2?5*DZ:.25)]],{fill:j===0?P.c1:j===1?P.acc:P.c5,fa:.07,edge:false});
      R.label([X(0),0,z],t,{al:'right',dx:-8,fs:12.5,b:1,c:j===0?P.c1:j===1?P.acc:P.c5,grp:'lane'})});
    for(let t=0;t<=90;t+=30)R.label([X(t),0,ZP+9*DZ+.1],t+' s',{mono:true,fs:12,c:P.mute,dy:12});
    // the chains: SDK send, the gateway's three attempts, the provider calls they start
    let calls=0;
    ch.forEach((q,ci)=>{if(ci>show)return;const cur=ci===show&&k<=2,a=(k<=2&&!cur?.55:1)*fresh,g=cur?e:1;
      R.ball([X(q.s),.18,ZS],.09,{c:P.c1,a});
      if(cur||k>=4)R.flowArc([X(q.s),.2,ZS],[X(c.att[q.ch[0]][0]),.2,ZG],.35,{c:P.c1,a:a*.9,r:.05,n:5});
      q.ch.forEach((i,j)=>{const at=c.att[i],t1=at[0]+(at[1]-at[0])*g,late=at[0]>c.done&&k>=3;calls++;
        R.box([(X(at[0])+X(at[0]+5))/2,0,ZG],[X(5)-X(0),.12,.22],{fill:mix(P.paper,P.acc,.35),a,shadow:false,lw:.6});
        if(cur||k>=4)R.flowArc([X(at[0]),.14,ZG],[X(at[0]),.12,ZP+i*DZ],.25,{c:P.acc,a:a*.9,r:.045,n:3,speed:1.2});
        R.box([(X(at[0])+X(t1))/2,0,ZP+i*DZ],[Math.max(.02,X(t1)-X(at[0])),.12,DZ*.7],{fill:late?mix(P.paper,P.mute,.5):mix(P.paper,P.c5,.6),a,shadow:false,lw:.6})})});
    // the user hears: a red glass wall at the moment the error reaches the user
    if(k>=3){const wa=(k===3?e:1)*fresh;R.line([[X(c.done),.01,ZS-.35],[X(c.done),.01,ZP+9*DZ]],{c:P.bad,w:2.5,a:wa});R.glass([X(c.done)-.35,0,ZS-.35],[.7,0,0],[0,.75,0],{c:P.bad,a:wa*.8,nu:1,nv:2,th:.01});
      R.label([X(c.done),.75,ZS-.35],'user gets '+c.err+' · '+c.done.toFixed(1)+' s',{fs:12.5,b:1,c:P.bad,dy:-10,a:wa})}
    const n=k<=2?ch.slice(0,show+1).reduce((s,q)=>s+q.ch.length,0):c.att.length;
    R.label([X(90),.3,ZS],n+' provider call'+(n===1?'':'s'),{al:'right',fs:14,b:1,c:P.c5,dy:-14,a:fresh});
    if(k===3&&!nar)R.label([X(70),0,ZP+9*DZ],'270 s of provider work · grey: sent after the user was told',{fs:12,c:P.mute,dy:30,a:e})
  }
  const full={cam:[.03,.72],bounds:[[-5.0,0,-2.1],[4.8,.9,2.4]]};
  S3.stage({id:'stg-retry',list:'sx-retry',fig:'Fig. 3 · one request, nine provider calls',cam:full.cam,bounds:full.bounds,aspect:.44,dur:1600,hold:4600,draw,
    margin:w=>w<520?[14,10,14,10]:[16,14,14,170],
    // the first three steps move along the time axis with the chain they add; the last three show each whole case
    view:k=>k===0?{cam:[.12,.62],bounds:[[-5.0,0,-2.1],[0.2,.9,2.4]]}:k===1?{cam:[.12,.62],bounds:[[-4.0,0,-2.1],[1.6,.9,2.4]]}:full});
})();
