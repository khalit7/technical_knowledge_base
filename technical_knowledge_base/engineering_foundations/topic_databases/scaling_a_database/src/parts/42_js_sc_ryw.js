// ---- Scene, Fig. 2 (section 3): read-your-writes under three routes (renderer v2; log positions illustrative) ----
// The user's app, a router, a primary and one replica; each server carries its write-ahead log as a row of records on its roof
// (0/3000010 to 0/3000080). The user's write is record 0/3000060 (purple). The replica replays the primary's log a little behind (gold stream).
(function(){
  if(!document.getElementById('stg-ryw'))return;const {at,lerp,mix,cl}=S3;
  let mode='naive';
  const APP=[-3.5,0,.05],RT=[-1.35,0,.05],PR=[1.9,0,-1.15],RE=[1.9,0,1.25],SS=[2.3,.62,1.05],NL=8,UW=5; // UW: the user's write, record 6
  const slot=(c,i)=>[c[0]-SS[0]/2+.2+i*((SS[0]-.4)/(NL-1)),SS[1]+.02,c[2]];
  function log(R,c,n,a,hl,lab,lc){const P=R.P;for(let i=0;i<NL;i++){const p=slot(c,i),on=i<n,f=Math.min(1,Math.max(0,n-i));
      if(on)R.box(p,[.22,.2*f+.01,.5],{fill:i===UW&&hl?P.c4:mix(P.paper,P.c5,.55),a,shadow:false,lw:.6});
      else R.quad([[p[0]-.11,p[1]+.005,p[2]-.25],[p[0]+.11,p[1]+.005,p[2]-.25],[p[0]+.11,p[1]+.005,p[2]+.25],[p[0]-.11,p[1]+.005,p[2]+.25]],{a:a*.6,dash:[3,3],ec:P.line,ea:.9})}
    R.label([c[0]+SS[0]/2,SS[1]+.1,c[2]],lab,{al:'left',dx:10,mono:true,fs:12,c:lc||P.mute,a,wide:1})}
  function box(R,c,s,fill,name,a,hot,hc){R.box(c,s,{fill,a});if(hot>0)R.glow([c[0],s[1]*.6,c[2]+s[2]/2],1.1,{c:hc||R.P.acc,a:hot*.45});R.label([c[0]-s[0]/2,s[1]*.5,c[2]],name,{al:'right',dx:-10,fs:12.5,b:1})}
  function draw(R,k,e){const P=R.P;R.grid(-4.6,4.4,-2.4,2.6,.5);
    const lsnCatch=mode==='lsn'&&k>=3,pn=k===0?5+e:lsnCatch?(k===3?6+2*e:8):6,rn=lsnCatch?(k===3?2+6*Math.min(1,e*1.6):8):2;
    // the four parties
    R.box(APP,[1.3,.3,.65],{fill:mix(P.paper,P.ink,.06)});R.label([APP[0],.32,APP[2]],'user + app',{fs:12.5,b:1,dy:-12});
    const rtHot=k===2&&mode==='lsn'?e:0;R.box(RT,[1.1,.28,.55],{fill:mix(P.paper,P.ink,.06)});R.label([RT[0],.3,RT[2]],'router',{fs:12.5,b:1,dy:-12});
    if(rtHot>0)R.glow([RT[0],.35,RT[2]],.8,{c:P.c5,a:rtHot*.6});
    const priHot=k===0?e:(mode==='sticky'&&(k===2||k===3))?1:(mode==='sticky'&&k===4)?e:0;
    box(R,PR,SS,mix(P.paper,P.c1,.38),'primary',1,priHot,mode==='sticky'&&k===4?P.bad:P.acc);
    const reHot=(mode!=='sticky'&&k===3)||(mode==='naive'&&k===4)?1:0;
    box(R,RE,SS,mix(P.paper,P.c1,.2),'replica',1,reHot,mode==='naive'?P.bad:P.good);
    log(R,PR,pn,1,true,'log at 0/30000'+(pn>7.5?'80':'60'),P.c4);
    log(R,RE,rn,1,true,'replayed to 0/30000'+(rn>7.5?'80':'20'),rn>7.5?P.good:P.c5);
    const p=(c,dx,dz)=>[c[0]+(dx||0),.3,c[2]+(dz||0)];
    // 1. the write: app to router to primary
    if(k===0){R.flow([p(APP,.6),p(RT,-.5)],{c:P.c4,a:e,r:.07,speed:1.2});R.flowArc(p(RT,.5),slot(PR,UW),.5,{c:P.c4,a:e,r:.07,speed:1.3})}
    // 2. the log streams to the replica, behind: it keeps streaming from here on
    if(k>=1){const a=k===1?e:.55;R.flowArc([PR[0]+SS[0]/2-.1,SS[1]*.6,PR[2]+.3],[RE[0]+SS[0]/2-.1,SS[1]*.6,RE[2]-.3],.55,{c:P.c5,a,r:.065,speed:.7,n:8});
      if(k===1)R.label([PR[0]+SS[0]/2+.25,SS[1]+.35,(PR[2]+RE[2])/2],'log stream',{al:'left',dx:6,fs:12,c:P.c5,b:1,a:e,wide:1})}
    // 3. the reload
    if(k>=2){const a=k===2?e:.35;R.flow([p(APP,.6,-.15),p(RT,-.5,-.15)],{c:P.c6,a,r:.07,speed:1.2});
      if(mode==='sticky')R.flowArc(p(RT,.5,-.1),[PR[0]-.6,SS[1],PR[2]+.3],.45,{c:P.c6,a,r:.07,speed:1.3});
      else if(mode==='naive')R.flowArc(p(RT,.5,.1),[RE[0]-.6,SS[1],RE[2]-.3],.45,{c:P.c6,a,r:.07,speed:1.3});
      else if(k===2){R.line([p(RT,.5,.1),R.arcPt(p(RT,.5,.1),[RE[0]-.6,SS[1],RE[2]-.3],.45,.4)],{c:P.c6,w:2.2,dash:[3,5],a:e});
        R.label([RT[0],0,RT[2]+.3],'wait: 0/3000020 < 0/3000060',{dy:18,mono:true,fs:12,c:P.c5,b:1,a:e,wide:1})}
      else R.flowArc(p(RT,.5,.1),[RE[0]-.6,SS[1],RE[2]-.3],.45,{c:P.c6,a:k===3?cl(e*1.6-.6,0,1):a,r:.07,speed:1.3})}
    // 4. the answer comes back: without the message (naive) or with it
    if(k>=3){const ok=mode!=='naive',src=mode==='sticky'?PR:RE,a=k===3?(mode==='lsn'?cl(e*2-1,0,1):e):.45,c=ok?P.good:P.bad;
      R.flowArc([src[0]-.9,SS[1]*.5,src[2]+(src===PR?.4:-.4)],p(RT,.3,src===PR?-.2:.2),.4,{c,a,r:.065,speed:1.3,n:7});R.flow([p(RT,-.5,.15),p(APP,.6,.15)],{c,a,r:.065,speed:1.2,n:6});
      R.label([APP[0],.3,APP[2]+.35],ok?'message shown':'message missing',{dy:22,fs:12.5,b:1,c,a})}
    // 5. the cost of each route
    if(k===4){const t=mode==='naive'?'1,993 of 2,000 reads missed it':mode==='sticky'?'recent writers read here':'median wait 0.105 ms';
      const at_=mode==='sticky'?PR:mode==='naive'?RE:RT;R.label([at_[0],at_===RT?.3:SS[1]+.2,at_[2]],t,{dy:at_===RT?24:-30,fs:12.5,b:1,c:mode==='sticky'?P.bad:mode==='naive'?P.bad:P.good,a:e})}
  }
  const st=S3.stage({id:'stg-ryw',list:'sx-ryw-naive',fig:'Fig. 2 · read-your-writes, three routes',cam:[.22,.74],bounds:[[-4.2,0,-1.8],[3.1,.9,1.9]],aspect:.52,dur:1300,hold:5000,draw,
    margin:w=>w<520?[16,8,14,8]:[16,175,14,24]});
  const M=document.getElementById('rwM');
  if(M&&st)M.addEventListener('click',ev=>{const b=ev.target.closest('button[data-m]');if(!b)return;mode=b.dataset.m;
    M.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    ['naive','sticky','lsn'].forEach(m=>{const l=document.getElementById('sx-ryw-'+m);if(l)l.hidden=m!==mode});st.list('sx-ryw-'+mode)});
})();
