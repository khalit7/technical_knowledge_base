// ---- Scene (preserved thinking, Fig. 5): one agent conversation before request 4 as a stack of plates, oldest at the bottom, driven by the
// simulator's own model (window.AP in 12_js_sim.js: the same blocks, token counts and rules, so the stage and the widget never disagree).
// Plate width is proportional to the block's tokens (illustrative sizes, the simulator's); the green glass is the cached prefix that still matches;
// green dots are tokens read from the cache, gold dots tokens written to it. Steps: the history, append, edit the system prompt, append the same
// instruction instead, trim an old tool result, switch from Fable 5.1 to Opus 5.5. ----
(function(){
  if(!document.getElementById('stg-ap')||!window.AP)return;const {lerp,mix}=S3;
  const KEYS=[null,'append','sys','midsys','trim','down'],X0=-1.35,DY=.3,TH=.13,DP=.8,MX=[3.9,1.55,0],XS=X0+2.95; // XS: the column of status labels, clear of the widest plate
  const wOf=t=>.22+2.6*t/6000;
  const la=(st,e,f)=>{const a=f(st.pk),b=f(st.k);if(e>=1||a===b)return b;return a>b?lerp(a,b,Math.min(1,2*e)):lerp(a,b,Math.max(0,2*e-1))};
  const cache={};
  // the state of every plate at step k: position, width, colour role, alpha and what to say beside it
  function state(k){if(cache[k])return cache[k];const m={};
    if(k===0){AP.B.forEach((b,ix)=>{m['b'+ix]={b,y:ix*DY,cls:'n',st:''}});return cache[k]={m,read:0,write:0,cached:0,r:null}}
    const r=AP.evalA(KEYS[k],'error');let cached=0;
    r.rows.forEach((o,ix)=>{const key=o.isOld?'b'+ix:(o.b.l.includes('(new)')&&o.b.k==='tr'?'new':'add');
      const st=o.cls==='bad'?'invalid: 400':o.cls==='dr'?'dropped, not billed':o.edited?'edited in place':!o.isOld?'appended':'';
      m[key]={b:o.b,y:ix*DY,cls:o.cls,st,ed:o.edited};if(o.cls==='rd')cached=ix+1});
    return cache[k]={m,read:r.read,write:r.write,cached,r}}
  function role(P,b){return b.k==='think'?P.c4:b.k==='tu'?P.paper:b.k==='tr'?(b.l.includes('(new)')?P.c6:mix(P.paper,P.ink,.22)):b.k==='sysm'?P.c6:P.c1}
  const money=v=>'$'+v.toFixed(4);
  function draw(R,k,e,st){const P=R.P;R.grid(-3.4,4.6,-1.4,1.4,.5);
    const A=state(st.pk),Bs=state(k),t=e>=1?1:e,keys=[...new Set([...Object.keys(A.m),...Object.keys(Bs.m)])];
    // the cached prefix: green glass around the plates that still match, its height tweened between steps
    const cTop=n=>n?(n-1)*DY+TH+.07:0,ch=lerp(cTop(A.cached),cTop(Bs.cached),t);
    const cw=n=>{let w=0;for(let i=0;i<n;i++){const s=Bs.m['b'+i]||A.m['b'+i];if(s)w=Math.max(w,wOf(s.b.t))}return w};
    const cwid=Math.max(cw(A.cached),cw(Bs.cached))+.24;
    if(ch>.02)R.box([X0-.12+cwid/2,-.02,0],[cwid,ch+.02,DP+.22],{fill:P.good,fa:.13,ec:P.good,ea:.75,lw:1.2,shadow:false,a:1});
    let topY=0;
    keys.forEach(key=>{const a0=A.m[key],b0=Bs.m[key],s0=a0||b0,s1=b0||a0,b=s1.b;
      const y=lerp(s0.y,s1.y,t),al=(x,ab)=>!ab?0:x.cls==='dr'?.2:1,aa=lerp(al(s0,a0),al(s1,b0),t);if(aa<=.01)return;topY=Math.max(topY,y);
      const c=x=>x.cls==='bad'?P.bad:role(P,b),fill=mix(c(s0),c(s1),t),w=wOf(b.t),ed=(s1.ed&&b0)?t:(s0.ed&&a0&&!b0)?1-t:(s1.ed?1:0);
      R.box([X0+w/2,y,0],[w,TH,DP],{fill,a:aa,lw:.8+1.6*ed,ea:ed>.5?1:undefined,ec:ed>.5?P.ink:undefined,shadow:y<.05});
      R.label([X0-.12,y+TH/2,DP/2],b.l,{al:'right',dx:-4,fs:12,mono:true,c:b.k==='think'?P.c4:P.mute,a:Math.max(.45,aa),grp:'rows'});
      const sk=e<.5&&st.pk!==k?st.pk:k,sa=la(st,e,q=>{const s=state(q).m[key];return s&&s.st?1:0}),sx=state(sk).m[key];
      if(sa>.01&&sx&&sx.st)R.label([XS,y+TH/2,DP/2],sx.st,{al:'left',dx:2,fs:12,b:sx.cls==='bad',c:sx.cls==='bad'?P.bad:sx.cls==='dr'?P.mute:sx.ed?P.ink:P.c6,a:sa})});
    // request 4 arrives at the model: green dots for what is read from the cache, gold for what is written
    const live=k>0?(e>=1?1:k===1?e:1):0,fa=st.pk===0&&k>0?e:k===0&&st.pk>0?1-e:k>0?1:0;
    R.box([MX[0],0,MX[2]],[1.05,.75,1.05],{fill:P.ink,fa:.1,ea:.9,lw:1.1,a:.35+.65*Math.max(fa,k>0?1:0)});
    const rej=Bs.r&&Bs.r.rejected;if(fa>.01&&!rej){
      if(Bs.read>0){const y=Math.max(.15,ch*.55);R.flow([[X0-.12+cwid,y,-DP/2-.1],[MX[0]-.6,y,-DP/2-.1],[MX[0]-.52,.45,0]],{c:P.good,a:fa*.95,r:.075,n:Math.max(3,Math.round(Bs.read/1800)),speed:1.2})}
      if(Bs.write>0){let lo=99,wm=0;Object.values(Bs.m).forEach(s=>{if(s.cls==='wr'){lo=Math.min(lo,s.y);wm=Math.max(wm,wOf(s.b.t))}});
        if(lo<99){const xr=MX[0]-.95,zb=-DP/2-.15;R.flow([[X0+wm*.6,lo+TH/2,zb],[xr,lo+TH/2,zb],[xr,topY+.3,zb],[MX[0]-.2,.8,0]],{c:P.c5,a:fa*.95,r:.075,n:Math.max(3,Math.round(Bs.write/1500)),speed:1.2})}}}
    const stp=e<.5&&st.pk!==k?st.pk:k,rr=state(stp).r;
    const name=rr?rr.model+(KEYS[stp]==='down'?' (was Fable 5.1)':''):'Opus 5.5';
    const fade=st.pk===k||e>=1?1:Math.abs(1-2*e);
    R.label([MX[0],.75,MX[2]],name,{fs:13,b:1,dy:-12,c:P.ink,a:fade});
    if(rr){R.label([MX[0],0,MX[2]+.55],rr.rejected?'request 4: 400 error':'request 4: accepted',{fs:12.5,b:1,dy:12,c:rr.rejected?P.bad:P.good,a:fade});
      R.label([MX[0],0,MX[2]+.55],rr.rejected?'nothing read or billed':'read '+fmt(rr.read)+' · written '+fmt(rr.write),{mono:true,fs:12,dy:30,c:P.mute,a:fade});
      R.label([MX[0],0,MX[2]+.55],rr.rejected?'drop_block: '+money(AP.evalA(KEYS[stp],'drop').cost):money(rr.cost)+' of input',{mono:true,fs:12,dy:47,c:P.ink,a:fade})}
    else R.label([MX[0],0,MX[2]+.55],'request 3 as sent',{fs:12.5,dy:12,c:P.mute,a:fade});
  }
  S3.stage({id:'stg-ap',list:'sx-ap',fig:'Fig. 5 · append-only: which reasoning and which cache survive request 4',cam:[.07,.3],bounds:[[-3.1,0,-.7],[4.6,3.9,.7]],aspect:.62,dur:1500,hold:5200,draw,
    margin:w=>w<520?[12,8,24,8]:[14,12,26,14],
    view:k=>k===0?{cam:[.3,.36],bounds:[[-2.9,0,-.7],[4.4,3.5,.7]]}:null});
})();
