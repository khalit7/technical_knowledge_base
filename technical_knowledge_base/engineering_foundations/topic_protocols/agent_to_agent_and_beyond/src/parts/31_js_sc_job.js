// ---- Scenes: Fig. 2 (section 5, stg-job: the running example streamed, the dropped stream, push, cancel) and Fig. 3 (section 8, stg-auth: in-task auth).
// Renderer v2. Data: window.A2AD.scen, the recorded frames (a2a-sdk 1.2.2 through a TCP tap, 5 October 2026). Each step is one stretch of frames
// (A2A_JOB_GROUPS below; the long-replay rule, case a): the frames of the stretch travel as flowing dots on their own route (requests up to Team B,
// stream events back along the open stream, webhook POSTs to Team A's webhook, the grant from a person straight to Team B), and the task, which lives
// on Team B's side, changes state and collects its artifact pieces. Everything drawn is derived from the frames: states, pieces, open streams, bytes, times. ----
(function(){
  if(!window.S3||!window.A2AD)return;const D=window.A2AD,{mix,cl}=S3;
  const G={main:[[0,1],[2,4],[5,6],[7,9],[10,12],[13,14],[15,16]],resub:[[0,3],[4,5],[6,7],[8,10],[11,14]],push:[[0,1],[2,3],[4,5],[6,9],[10,10]],
    cancel:[[0,1],[2,5],[6,7],[8,10]],auth:[[0,1],[2,5],[6,6],[7,8],[9,9],[10,14],[15,16]]};
  window.A2A_JOB_GROUPS=G; // read by src/check_stages.mjs
  const fmt=n=>n.toLocaleString('en-GB'),ms=t=>fmt(Math.round(t*100)/100)+' ms';
  // what is true after each frame: the task's state, its progress pieces and scores, whether a stream is open
  function trace(m){const S=D.scen[m].steps;let st=null,pieces=0,scores=false,open=false;
    return S.map((f,i)=>{const T=f.title,r=f.raw||'',n=(r.match(/shard \d+\/\d+/g)||[]).length;
      if(T.indexOf('text/event-stream')>0)open=true;
      if(f.state)st=f.state.replace('TASK_STATE_','').toLowerCase().replace('_','-');
      if(T.indexOf('artifactUpdate')>=0){if(/mean_accuracy/.test(r))scores=true;else pieces++}else if(n){pieces=n;if(/mean_accuracy/.test(r))scores=true}
      if(T.indexOf('SSE')===0&&(st==='input-required'||st==='completed'||st==='canceled'))open=false;
      if(m==='resub'&&i===5)open=false; // the client hangs up after four events
      return {st,pieces,scores,open}})}
  // where a frame travels
  function route(f){const T=f.title;
    if(f.dir==='hook')return 'hook';
    if(T.indexOf('/oob/grant')>=0)return 'grant';if(f.dir==='down'&&T.indexOf('HTTP/1.1 200 OK')===0&&T.length<17&&f.bytes<200)return 'grantok';
    if(T.indexOf('SSE')===0)return 'event';
    if(T.indexOf('text/event-stream')>0)return 'open';
    if(T.indexOf('GetTask')===0||T.indexOf('CancelTask')===0)return 'side';
    if(f.dir==='up')return T.indexOf('GET /.well-known')===0?'card':'req';
    return 'resp'}
  const AX=-3.7,BX=3.5,TX=1.0,TZ=1.7,WZ=-1.95,PX=-.9,PZ=-2.3;
  function stage(id,list,fig,mode0,chips){
    let mode=mode0;const TR={},tr=m=>TR[m]||(TR[m]=trace(m));
    function draw(R,k,e){const P=R.P,g=G[mode][k];if(!g)return;const S=D.scen[mode].steps,fr=S.slice(g[0],g[1]+1),T=tr(mode);
      const before=g[0]>0?T[g[0]-1]:{st:null,pieces:0,scores:false,open:false},after=T[g[1]],now=e<.55?before:after;
      const SC={submitted:P.c1,working:P.c1,'input-required':P.c2,'auth-required':P.c2,completed:P.c3,canceled:P.mute,rejected:P.mute,failed:P.bad};
      R.grid(-5.6,5.6,-3.1,3.1,.5);
      // the parties
      R.box([AX,0,0],[1.7,1.0,1.5],{fill:mix(P.paper,P.acc,.22)});R.label([AX,1.0,0],'Team A · client',{b:1,fs:13,dy:-10});
      R.box([BX,0,0],[1.8,1.2,1.6],{fill:mix(P.paper,P.ink,.3)});R.label([BX,1.2,0],"Team B's agent",{b:1,fs:13,dy:-10});
      R.label([BX,0,.75],'opaque: its tools and model stay hidden',{fs:12,c:P.mute,dy:16,wide:1});
      const card=fr.some(f=>route(f)==='card');
      R.glass([BX+.25,.12,-1.25],[.7,0,0],[0,.8,0],{c:P.c1,nu:3,nv:5,a:card?1:.3});R.label([BX+.6,.95,-1.25],'Agent Card',{fs:12,c:P.c1,a:card?1:.45,dy:-8,wide:1});
      if(mode==='push'){R.box([AX,0,WZ],[1.0,.45,.7],{fill:mix(P.paper,P.c4,.25)});R.label([AX,.45,WZ],'webhook',{fs:12.5,b:1,c:P.c4,dy:-8})}
      if(mode==='auth'){const on=fr.some(f=>route(f)==='grant');R.box([PX,0,PZ],[.55,.75,.55],{fill:mix(P.paper,P.c2,on?.45:.15),a:on?1:.5});
        R.label([PX,.75,PZ],"a person on Team A's side",{fs:12,c:on?P.c2:P.mute,b:on,dy:-8})}
      // the stream: a pipe from Team B to Team A while one is open
      const s0=[BX-.8,.42,.3],s1=[AX+.75,.42,.3],op=before.open||after.open||fr.some(f=>route(f)==='open');
      if(op){const a=after.open?1:(e<.6?1:.25);R.line([s0,s1],{c:P.c1,w:4,a:a*.35});R.line([s0,s1],{c:P.c1,w:1.2,a})}
      if(mode==='resub'&&k===2){R.line([s0,[(s0[0]+s1[0])/2+.4,.42,.3]],{c:P.c1,w:1.2,a:.35,dash:[5,5]});R.label([0,.42,.3],'nobody listening',{fs:12.5,b:1,c:P.c2,dy:22})}
      // this stretch's frames on their routes; dot count follows the number of frames
      const cnt={};fr.forEach(f=>{const r=route(f);cnt[r]=(cnt[r]||0)+1});const ev=fr.filter(f=>route(f)==='event');
      const up=[AX+.75,.62,-.25],bu=[BX-.8,.7,-.25];
      if(cnt.card)R.flowArc([BX+.6,.6,-1.2],[AX+.6,.6,-.5],.55,{c:P.c1,r:.07,n:10,speed:1.6});
      if(cnt.req){R.flowArc(up,bu,.55,{c:P.acc,r:.075,n:9,speed:1.7})}
      if(cnt.resp)R.flowArc(bu,up,.35,{c:P.ink,r:.06,n:6,speed:1.6,a:.7});
      if(ev.length){const art=ev.some(f=>f.title.indexOf('artifact')>=0),c=art?P.c4:SC[after.st]||P.c1;R.flow([s0,s1],{c,r:.075,n:Math.min(20,4+3*ev.length),speed:1.5})}
      if(cnt.side){const sa=[AX+.6,.3,-.75],sb=[BX-.8,.3,-.75],cn=fr.some(f=>f.title.indexOf('CancelTask')===0);
        R.flowArc(sa,sb,.25,{c:cn?P.bad:P.acc,r:.065,n:7,speed:1.7});R.flowArc(sb,sa,.15,{c:P.ink,r:.06,n:6,speed:1.5,a:.7})}
      if(cnt.hook)R.flowArc([BX-.8,.5,-.5],[AX+.5,.35,WZ],.9,{c:P.c4,r:.075,n:Math.min(20,5+3*cnt.hook),speed:1.5});
      if(cnt.grant){R.flowArc([PX,.6,PZ],[BX-.6,.7,-.6],.7,{c:P.c2,r:.08,n:10,speed:1.4});R.label([(PX+BX)/2,1.15,(PZ-.6)/2],'grant, straight to Team B',{fs:12.5,b:1,c:P.c2})}
      if(cnt.grantok)R.flowArc([BX-.6,.5,-.8],[PX+.2,.5,PZ],.35,{c:P.ink,r:.06,n:5,speed:1.5,a:.7});
      // what this stretch carried: the requests by name and bytes, then the frames that came back
      const ups=fr.filter(f=>f.dir==='up'),dn=fr.filter(f=>f.dir!=='up');
      const name=f=>f.title.indexOf('GET /.well-known')===0?'GET agent-card.json':f.title.indexOf('/oob/grant')>=0?'POST /oob/grant':f.title.split(/\s+/)[0];
      if(ups.length)R.label([0,1.25,-.25],ups.map(f=>name(f)+' · '+fmt(f.bytes)+' B').join('  '),{mono:true,fs:12.5,b:1,c:cnt.grant?P.c2:P.acc});
      if(dn.length)R.label([0,.42,.3],dn.length+(dn.length>1?' frames':' frame')+' back · '+fmt(dn.reduce((s,f)=>s+f.bytes,0))+' B',{mono:true,fs:12,c:P.mute,dy:16,wide:1});
      R.label([AX,0,.8],ms(fr[0].t)+(fr.length>1?' to '+ms(fr[fr.length-1].t):''),{mono:true,fs:12.5,b:1,c:P.mute,dy:18});
      // the task, on Team B's side: its state and its artifact pieces
      if(now.st){R.line([[BX-.5,.03,.75],[TX+.85,.03,TZ-.2]],{c:P.mute,w:1,a:.6,dash:[4,4]});
        R.box([TX,0,TZ],[2.3,.12,1.2],{fill:P.paper});const c=SC[now.st]||P.c1,int=now.st==='input-required'||now.st==='auth-required';
        R.box([TX-.6,.12,TZ],[.65,.5,.65],{fill:mix(P.paper,c,.75)});if(int)R.glow([TX-.6,.4,TZ],.55,{c:P.c2,a:.6});
        R.label([TX-.6,.62,TZ],'task · '+now.st,{mono:true,fs:12.5,b:1,c,dy:-10});
        for(let i=0;i<now.pieces;i++)R.box([TX+.05+i*.15,.12,TZ],[.11,.3,.75],{fill:mix(P.paper,P.c4,.4),shadow:false,lw:.6});
        if(now.scores)R.box([TX+.2+now.pieces*.15,.12,TZ],[.24,.5,.75],{fill:mix(P.paper,P.c4,.85),shadow:false});
        if(now.pieces||now.scores)R.label([TX+.35,.1,TZ+.3],'artifacts: '+now.pieces+' progress'+(now.scores?' + scores':''),{mono:true,fs:12,c:P.c4,dy:18,wide:1})}
    }
    const full=()=>({cam:[.2,.72],bounds:mode==='push'||mode==='auth'?[[-4.6,0,-2.6],[4.5,1.3,2.4]]:[[-4.6,0,-1.5],[4.5,1.3,2.4]]});
    const st=S3.stage({id,list,fig,cam:[.2,.72],bounds:()=>full().bounds,aspect:.58,dur:1500,hold:4800,draw,margin:w=>w<520?[16,8,12,8]:[20,16,14,16],
      // a step that leaves the task waiting for someone: in close on the task and Team B
      view:k=>{const g=G[mode][k],a=g&&tr(mode)[g[1]];return a&&(a.st==='input-required'||a.st==='auth-required')&&k<3?{cam:[.42,.6]}:null}});
    if(chips){const C=document.getElementById(chips);if(C)C.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;C.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
      mode=b.dataset.m;document.querySelectorAll('ol[id^="'+list.replace(/[^-]+$/,'')+'"]').forEach(l=>l.hidden=l.id!==list.replace(/[^-]+$/,'')+mode);st.list(list.replace(/[^-]+$/,'')+mode)})}
    return st}
  if(document.getElementById('stg-job'))stage('stg-job','sx-jb-main','Fig. 2 · one job, recorded','main','jb-mode');
  if(document.getElementById('stg-auth'))stage('stg-auth','sx-au','Fig. 3 · in-task authorization, recorded','auth',null);
})();
