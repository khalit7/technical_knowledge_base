// ---- Scene: Fig. 2, one streamed request (section 3; renderer v2). Data: window.TL.stream, every SSE frame the mock really sent in the recorded runs
// of b1_stream.ts and b2_stream_openai.ts. The request goes out once; the frames come back on the one open HTTP response, pass the SDK's parser
// (a glass plate) and land as typed events in order (tile height = the frame's size on the wire); the Message at the back is assembled from them
// the way the SDK does (text appended, tool arguments re-parsed, stop_reason filled in at the end). Three modes, each with its own step list. ----
(function(){
  if(!document.getElementById('stg-stream')||!window.TL)return;const {at,cl,mix}=S3;
  const D=TL.stream;let mode='anthropic';
  const isText=f=>(f.ev==='content_block_delta'&&f.data.delta.type==='text_delta')||f.ev==='response.output_text.delta';
  const isJson=f=>f.ev==='content_block_delta'&&f.data.delta.type==='input_json_delta';
  // the frames of each step (step 1, the request, has none); grouped by event kind, never by hand-picked indices
  function groups(m){const F=D[m],idx=p=>F.map((f,i)=>p(f)?i:-1).filter(i=>i>=0),G=[[]];
    if(m==='openai'){G.push(idx(f=>f.ev==='response.created'),idx(f=>/output_item\.added|content_part\.added/.test(f.ev)),idx(isText),idx(f=>/\.done$/.test(f.ev)),idx(f=>f.ev==='response.completed'));return G}
    if(m==='anthropic'){G.push(idx(f=>f.ev==='message_start'),idx(f=>(f.ev==='content_block_start')||f.ev==='ping'),idx(isText),idx(f=>f.ev==='content_block_stop'),idx(f=>f.ev==='message_delta'),idx(f=>f.ev==='message_stop'));return G}
    const t0=F.findIndex(f=>f.ev==='content_block_start'&&f.data.content_block.type==='tool_use');
    G.push(idx(f=>f.ev==='message_start'||f.ev==='ping'||(f.ev==='content_block_start'&&f.data.index===0)),idx(isText),[t0-1,t0],idx(isJson),[F.findIndex((f,i)=>i>t0&&f.ev==='content_block_stop')],idx(f=>f.ev==='message_delta'||f.ev==='message_stop'));return G}
  let G=groups(mode),step=[];
  function stepOf(){step=[];G.forEach((g,k)=>g.forEach(i=>step[i]=k))}stepOf();
  const MAXB=Math.max(...Object.values(D).flat().map(f=>f.raw.length));
  const AX=3.55,PX=.55,YW=.42,W=.165,SX0=.15;                 // API x, parser plate x, wire height, slot width, first slot's right edge
  const kind=f=>f.ev==='ping'?'ping':isText(f)?'text':isJson(f)?'json':/message_delta|response\.completed/.test(f.ev)?'end':'frame';
  function colour(P,k){return k==='text'?P.acc:k==='json'?P.c2:k==='end'?P.c5:k==='ping'?P.mute:P.c6}
  function draw(R,k,e){const P=R.P,F=D[mode];if(!G[k])return;R.grid(-5,5,-3.2,1.8,.5);
    // where each frame is at this moment: 0 at the API, .5 at the parser, 1 in its slot; frames of later steps have not left
    const m=G[k].length,prog=F.map((f,i)=>{const s=step[i];if(s<k)return 1;if(s>k)return 0;const j=G[k].indexOf(i);return cl((e-j/Math.max(1,m)*.7)/.3,0,1)});
    // the model API and the SDK's parser
    R.box([AX,0,0],[1.25,.95,1.25],{fill:mix(P.paper,P.ink,.07)});const ap=R.p([AX,.95,0]);if(ap[0]<R.W-30)R.label([AX,.95,0],'Model API (local mock)',{fs:12.5,b:1,dy:-12});
    R.glass([PX,0,-.85],[0,0,1.7],[0,1.15,0],{c:P.c4,nu:5,nv:4,a:.9});R.label([PX,1.15,-.85],'SDK: SSE parser',{fs:12.5,b:1,c:P.c4,dy:-10});
    R.line([[AX-.63,YW,0],[PX+.05,YW,0]],{c:P.mute,w:1.2,dash:[5,4],a:.6});
    if(R.W>=520&&R.p([AX-.63,YW,0])[0]<R.W-30)R.label([(AX+PX)/2,YW,-.3],'one HTTP response, held open',{fs:12,c:P.mute,dy:-14});
    // step 1: the request goes out once
    const ra=k===0?1:.18;R.flowArc([-1.2,.3,1.3],[AX-.3,.95,.4],1,{c:P.c3,a:ra,r:.07,n:k===0?12:5,speed:1.4});
    if(k===0)R.label([1.2,1.55,.9],mode==='openai'?'POST /v1/responses · stream: true':'POST /v1/messages · stream: true'+(mode==='tool'?' · tools':''),{mono:true,fs:12.5,b:1,c:P.c3,a:at(k,e,0)||1});
    // the frames: tiles that travel the wire, pass the parser and take their place in the row of typed events (the ping is dropped at the parser)
    let slot=0;const slotX=[];F.forEach((f,i)=>{if(kind(f)==='ping'){slotX.push(null);return}slotX.push(SX0-(slot+.5)*W);slot++});
    if(G[k].length)R.flow([[AX-.63,YW,0],[PX,YW,0]],{c:colour(P,kind(F[G[k][G[k].length>2?2:0]])),r:.06,n:Math.min(14,3+G[k].length),speed:1.6,a:.9});
    F.forEach((f,i)=>{const u=prog[i];if(u<=0)return;const kd=kind(f),c=colour(P,kd),h=.12+.85*f.raw.length/MAXB,cur=step[i]===k;
      if(kd==='ping'){if(u<.5){const x=AX-.63+(PX-AX+.63)*u*2;R.box([x,YW-.06,0],[.14,.12,.14],{fill:mix(P.paper,c,.4),shadow:false})}
        else if(cur&&u<1)R.glow([PX,YW,0],.25,{c:P.bad,a:1-u});return}
      if(u<.5){const x=AX-.63+(PX-AX+.63)*u*2;R.box([x,YW-.06,0],[W*.8,.12,.3],{fill:mix(P.paper,c,.55),shadow:false})}
      else{const t=(u-.5)*2,x=PX+(slotX[i]-PX)*t,y=(YW-.06)*(1-t);R.box([x,y,0],[W*.8,h*(.3+.7*t),.42],{fill:mix(P.paper,c,cur?.7:.45),a:cur?1:.45,shadow:y<.05})}});
    
    // the assembled Message at the back: text grows as text pieces pass the parser; tool arguments as JSON text; stop_reason at the end
    let txt='',js='',stop=null,last='';F.forEach((f,i)=>{if(prog[i]<.5)return;const d=f.data;
      if(isText(f)){const p=d.delta.text!=null?d.delta.text:d.delta;txt+=p;last=p}if(isJson(f))js+=d.delta.partial_json;
      if(f.ev==='message_delta')stop=d.delta.stop_reason;if(f.ev==='response.completed')stop='status: '+d.response.status});
    const started=prog[0]>=.5,MZ=1.5,MX0=-4.1,MW=3.4;
    if(started){R.box([MX0+MW/2,0,MZ],[MW,.1,.95],{fill:mix(P.paper,P.c1,.08)});
      R.label([MX0,.1,MZ-.48],mode==='openai'?'Response, as the SDK assembles it':'Message, as finalMessage() returns it',{al:'left',fs:12.5,b:1,dy:-12,wide:1});
      const full=(F.filter(isText).map(f=>f.data.delta.text!=null?f.data.delta.text:f.data.delta).join('')).length||1,len=Math.max(.05,MW*.8*txt.length/Math.max(full,111));
      const tOpen=F.some((f,i)=>prog[i]>=.5&&(f.ev==='content_block_start'&&f.data.index===0||f.ev==='response.content_part.added'));
      if(tOpen){R.box([MX0+.15+len/2,.1,MZ+.25],[len,.1,.26],{fill:mix(P.paper,P.acc,.55),shadow:false,dz:-60});
        R.label([MX0+.15+len,.15,MZ+.25],txt?'text · '+txt.length+' chars · “…'+last.trim()+'”':'text block, empty',{al:'left',mono:true,fs:12,dx:8,c:P.acc,grp:'msg'})}
      if(mode==='tool'){const tu=F.findIndex(f=>f.ev==='content_block_start'&&f.data.index===1);if(prog[tu]>=.5){
        let ok=false;try{JSON.parse(js);ok=!!js}catch(_){}const jl=Math.max(.05,MW*.8*js.length/40);
        R.box([MX0+.15+jl/2,.1,MZ-.2],[jl,.1,.26],{fill:mix(P.paper,P.c2,ok?.75:.45),shadow:false,dz:-60});
        R.label([MX0+.15+jl,.15,MZ-.2],'tool_use input: '+(js||'{}')+(js?ok?' · valid JSON':' · not JSON yet':''),{al:'left',mono:true,fs:12,dx:8,c:P.c2,b:ok,grp:'msg'})}}
      R.label([MX0+MW,0,MZ+.48],(mode==='openai'?'':'stop_reason: ')+(stop==null?(mode==='openai'?'status: in_progress':'null'):stop),{al:'right',mono:true,fs:12.5,b:stop!=null,c:stop!=null?P.c5:P.mute,dy:14})}
  }
  const full={cam:[.45,.78],bounds:[[-4.3,0,-.9],[4.3,1.1,2.1]]};
  const st=S3.stage({id:'stg-stream',list:'sx-st-anthropic',fig:'Fig. 2 · one streamed request, every recorded frame',cam:full.cam,bounds:full.bounds,aspect:.58,dur:2200,hold:4600,draw,
    // the camera moves in on the Message when a step is about what it holds (the text growing, the tool arguments, the final stop_reason)
    view:k=>{const g=G[k]||[],F=D[mode],f=g.length?F[g[g.length-1]]:null;if(!f)return full;
      if(isJson(f))return {cam:[.4,.8],bounds:[[-4.3,0,-.5],[1,1,2.1]]};
      if(isText(f))return {cam:[.4,.8],bounds:[[-4.3,0,-.7],[2.2,1.1,2.1]]};return full}});
  const C=document.getElementById('tl-st-mode');
  if(C)C.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;C.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    mode=b.dataset.m;G=groups(mode);stepOf();document.querySelectorAll('ol[id^="sx-st-"]').forEach(l=>l.hidden=l.id!=='sx-st-'+mode);st.list('sx-st-'+mode)});
  window.TL_STREAM_GROUPS=m=>groups(m);   // for src/check_stages.mjs
})();
