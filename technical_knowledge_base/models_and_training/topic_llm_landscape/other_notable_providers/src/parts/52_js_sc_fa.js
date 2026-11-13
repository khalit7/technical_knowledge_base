// ---- Scene (stg-fa): the Olmo 3 32B Think model flow, fully open against the same run released as open weights (renderer v2) ----
// The stages and their durations: Olmo 3 report section 2.4 (Olmo 3.1's RL extension: Olmo 3 blog); public checkpoints: Hugging Face branches, 1 October 2026;
// log segments: W&B runs (the same numbers as the old 2D animation, 41_js_ol_flow.js, which this replaces). One block per stage in order, a strip in front drawing
// the same stages to scale in days; behind, what each stage put in public: its checkpoints (a stack, one slab per checkpoint), its training-log segments and its
// dataset (a glass plate). The open-weights mode runs the same stages inside the lab (a glass box) and lets one artefact out. window.ONP_FA for the checks.
(function(){
  if(!document.getElementById('stg-fa'))return;const {at,off,lerp,mix,rgb}=S3;
  const S=[
    {n:'Data',d0:-6,d1:0,tok:0,ck:0,ds:'Dolma 3 pool and mix',lg:0,c:'c6'},
    {n:'Pretraining',d0:0,d1:44.5,tok:5.5,ck:655,lg:41,c:'c1'},
    {n:'Midtraining',d0:44.5,d1:46,tok:0.2,ck:49,ds:'Dolmino Mix',lg:2,c:'c3'},
    {n:'Long context',d0:46,d1:47,tok:0.1,ck:14,ds:'Longmino Mix',lg:1,c:'c5'},
    {n:'SFT',d0:47,d1:49,tok:0,ck:1,ds:'Dolci-Think-SFT',lg:0,c:'c4'},
    {n:'DPO',d0:49,d1:51,tok:0,ck:1,ds:'Dolci-Think-DPO',lg:0,c:'c2'},
    {n:'RLVR',d0:51,d1:56,tok:0,ck:1,ds:'Dolci-Think-RL',lg:0,c:'bad'},
    {n:'Olmo 3.1 RL',d0:56,d1:77,tok:0,ck:1,lg:0,c:'bad'}];
  const N=S.length,TOT=S.reduce((a,s)=>a+s.ck,0);
  let mode='open';
  function tally(k,m){let ck=0,ds=0,lg=0,tok=0;for(let i=0;i<=k;i++){tok+=S[i].tok;if(m==='open'){ck+=S[i].ck;lg+=S[i].lg;if(S[i].ds)ds++}}
    if(m==='ow')ck=k>=7?2:k>=6?1:0;const day=S[k].d1,gh=(Math.min(day,56)*1024+Math.max(0,day-56)*224)*24;return {ck,ds,lg,tok,day,gh}}
  const f=v=>v.toLocaleString('en-GB');
  window.ONP_FA={tally,TOT,need:{open:[[1,'655'],[1,'41 segments'],[2,'49 checkpoints'],[3,'14 checkpoints'],[6,f(TOT-1)+' checkpoints']],ow:[[6,'One artefact']]}};
  const X=i=>(i-3.5)*1.32,ZB=0,ZS=-1.45,ZT=1.55,U=9.6/83,TX=d=>-4.8+(d+6)*U;
  function draw(R,k,e,st){const P=R.P,cs=getComputedStyle(document.body),cv=n=>rgb(cs.getPropertyValue('--'+n).trim()||'#888'),OPEN=cv('open'),CLO=cv('closed');
    R.grid(-5.6,7,-2.6,2.4,.5);const ow=mode==='ow',col=i=>S[i].c==='bad'?P.bad:P[S[i].c];
    // the stages, in order; the current one lit and raised
    S.forEach((s,i)=>{const a=i<k?.75:i===k?1:.28,hgt=i===k?.42:.3;
      R.box([X(i),0,ZB],[1.02,hgt,.8],{fill:mix(P.paper,col(i),i<=k?.7:.3),a,lw:.6});
      if(i===k)R.label([X(i),0,ZB+.4],s.n,{fs:13,b:1,c:mix(col(i),P.ink,.35),dy:14});
      // the same stage on the strip in front, to scale in days, with a leader from its block
      const sx=TX((s.d0+s.d1)/2),sw=Math.max(.03,(s.d1-s.d0)*U);
      R.box([sx,0,ZT],[sw,.05,.24],{fill:mix(P.paper,col(i),i<=k?.8:.25),a:1,shadow:false,lw:.4});
      R.line([[X(i),.01,ZB+.42],[sx,.01,ZT-.13]],{c:mix(P.paper,col(i),.6),w:1,a:i<=k?.8:.3})});
    const pd=S[k].d1;R.ball([TX(pd),.08,ZT],.07,{c:P.ink});
    const zm=!ow&&k>=4&&k<=6;if(!zm)R.label([TX(-6),0,ZT],'days, to scale',{al:'right',dx:-8,fs:12,mono:true,c:P.mute,wide:1});
    R.label([TX(pd),.08,ZT],k===0?'day 0':'day '+(pd%1?pd.toFixed(1):pd),{fs:12,b:1,dy:22});
    // what each stage put in public (open) or kept inside (open weights)
    for(let i=0;i<=k;i++){const s=S[i],now=i===k,ai=now?e:1,dim=ow?.75:1,x0=X(i);
      const ckh=s.ck?Math.max(.04,s.ck*.0022):0,lgh=s.lg*.028;
      if(ckh&&!(ow&&false)){R.box([x0-.34,0,ZS],[.42,ckh*ai,.5],{fill:ow?mix(P.paper,P.ink,.15):mix(P.paper,OPEN,.7),a:dim,lw:.5});
}
      if(lgh){R.box([x0+.02,0,ZS],[.2,lgh*ai,.3],{fill:ow?mix(P.paper,P.ink,.15):mix(P.paper,P.c2,.75),a:dim,lw:.5});
}
      if(s.ds){R.glass([x0+.16,0,ZS+.1],[.46,0,0],[0,.75*ai,0],{c:ow?P.mute:P.c6,a:dim,nu:3,nv:4});
}
      if(now){const hT=Math.max(ckh,lgh,s.ds?.75:0)*ai,cn=[s.ck?f(s.ck)+(s.ck===1?' checkpoint':' checkpoints'):'',s.lg?f(s.lg)+(s.lg===1?' log segment':' log segments'):''].filter(Boolean).join(' · ');
        if(cn&&!(ow&&k===7))R.label([x0,hT,ZS],cn+(ow?', kept':''),{fs:12.5,b:1,c:ow?P.mute:OPEN,dy:s.ds?-28:-12,a:e});if(s.ds)R.label([x0,hT,ZS],s.ds+(ow?', kept':''),{fs:12.5,b:1,c:ow?P.mute:mix(P.c6,P.ink,.3),dy:-12,a:e})}
      if(now&&(ckh||s.ds||lgh)&&!ow)R.flowArc([x0,.45,ZB],[x0,.5,ZS],.6,{c:OPEN,a:e*.85,r:.05,n:6,speed:1.2});
      if(now&&ow&&(ckh||s.ds||lgh))R.flowArc([x0,.45,ZB],[x0,.4,ZS],.45,{c:P.mute,a:e*.6,r:.045,n:4,speed:1.1})}
    if(!ow){if(!zm)R.label([X(0)-.6,0,ZS],'public',{al:'right',dx:-8,fs:13,b:1,c:OPEN,wide:1})}
    else{// the lab: everything stays inside the glass box; the release lets one artefact out
      R.box([.0,0,-.45],[10.9,2.0,2.95],{fill:mix(P.paper,CLO,.15),fa:.08,a:1,shadow:false,lw:.9});
      R.label([-5.45,2.0,-1.9],'inside the lab',{al:'left',dx:6,dy:-8,fs:13,b:1,c:CLO});
      if(k>=6){const a6=k===6?e:1;R.glass([5.6,0,.5],[.9,0,0],[0,1.1,0],{c:CLO,a:a6,nu:6,nv:6});R.label([6.05,1.1,.5],'final weights',{fs:12.5,b:1,c:CLO,dy:-24,a:a6});
        R.label([6.05,1.1,.5],'model card, scores',{fs:12,c:P.mute,dy:-9,a:a6});if(k===6)R.flowArc([X(6),.45,ZB],[6.1,.5,.5],.5,{c:CLO,a:e,r:.06,n:6,speed:1.2})}
      if(k>=7){const a7=k===7?e:1;R.glass([5.9,0,-1.0],[.9,0,0],[0,1.1,0],{c:CLO,a:a7*.8,nu:6,nv:6});R.label([6.35,1.1,-1.0],'3.1 weights',{fs:12.5,b:1,c:CLO,dy:-10,a:a7});
        if(k===7)R.flowArc([X(7),.45,ZB],[6.35,.5,-1.0],.5,{c:CLO,a:e,r:.06,n:6,speed:1.2})}}
  }
  const cnt=k=>{const T=tally(k,mode),el=document.getElementById('faCnt');if(!el)return;
    el.innerHTML=stat('Day',k===0?'before 0':fmt(T.day,1),'of 56 to Olmo 3 Think, 77 to 3.1')+stat('Cluster GPU-hours',fmt(T.gh),'about '+usd(T.gh*2/1e6,2)+'M at $2 per hour')+
      stat('Pretraining tokens',fmt(T.tok,2)+'T','stages 1 to 3')+stat('Public checkpoints',fmt(T.ck),mode==='open'?'of '+TOT+' by the end':'the final weights only')+
      stat('Public datasets',T.ds,mode==='open'?'one per stage, 6 in all':'none')+stat('Public log segments',T.lg,mode==='open'?'pretraining 41, midtraining 2, long context 1':'none')};
  const BO=[[-5.1,0,-1.8],[5.1,.4,1.8]],BW=[[-5.6,0,-1.9],[7.3,1.6,1.8]];
  const sg=S3.stage({id:'stg-fa',list:'sx-fa-open',fig:'Olmo 3 32B Think, stage by stage',cam:[.12,.92],bounds:()=>mode==='ow'?BW:BO,aspect:.385,dur:1400,hold:5200,draw,
    view:k=>k>=4&&k<=6&&mode==='open'?{cam:[.32,.62],bounds:[[X(3)-.9,0,-2.0],[X(7)+.9,1.2,1.9]]}:null,
    margin:w=>w<520?[14,10,14,10]:[22,20,14,100],onStep:k=>{try{cnt(k)}catch(e){}}});
  const seg=document.getElementById('faM');if(seg&&sg)seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    mode=b.dataset.m;['open','ow'].forEach(m=>{const l=document.getElementById('sx-fa-'+m);if(l)l.hidden=m!==mode});sg.list('sx-fa-'+mode)}));
})();
