// ---- Cryptographic context injection: the attack, the plain-text method it replaced, and an egress gate ----
(function(){
  const card=$('ij');if(!card)return;
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const NODES=[['User','grok.com chat'],['Grok agent','Grok 4.5 Fast'],['Web page','attacker-controlled'],['Input filter','classifies text'],['Python sandbox','the agent\'s own runtime'],['Attacker host','outside URL']];
  const F=['name','coarse location','subscription tier','chat history'];
  const S1={f:0,t:1,k:'Step 1: an ordinary request',c:'The user asks Grok to summarise a web page. Nothing else is needed from them: the attack is zero-click from here.',res:0,sent:0,v:'not yet'};
  const enc=[S1,
    {f:2,t:1,k:'Step 2: the page arrives',c:'Grok fetches the page. It carries an AES-256-GCM encrypted JSON object, the key material to decrypt it, and an instruction to do so with the agent\'s Python runtime.',res:0,sent:0,v:'not yet'},
    {f:1,t:3,k:'Step 3: the filter sees ciphertext',c:'Input guardrails classify text; they do not run it. Ciphertext under a PBKDF2-derived key has nothing to match, even with the key beside it. Pass.',res:0,sent:0,v:'pass (ciphertext)'},
    {f:1,t:4,k:'Step 4: Grok decrypts it itself',c:'Following the page, Grok runs PBKDF2 and AES-256-GCM in its own sandbox. The plaintext comes back as the output of code it just ran, inside the trust boundary, after every filter.',res:0,sent:0,v:'pass (ciphertext)'},
    {f:4,t:1,k:'Step 5: the instructions resolve private context',c:'The decrypted text asks for a further "decryption key" that is really a template: the user\'s name, coarse location, subscription tier and every prompt in the conversation, interpolated into a string.',res:4,sent:0,v:'pass (ciphertext)'},
    {f:1,t:5,k:'Step 6: exfiltration',c:'Grok opens a URL built from that string, told it will "fetch additional context". The attacker\'s server receives all four fields. No confirmation, no warning: nothing in the loop looked unusual.',res:4,sent:4,v:'pass (ciphertext)'},
    {f:1,t:0,k:'Step 7: a normal-looking summary',c:'The user gets their summary. Adversa reported success in 8 of 20 attempts; the failures were Grok fumbling the decryption, not a filter catching it.',res:4,sent:4,v:'pass (ciphertext)'}];
  const plain=[S1,
    {f:2,t:1,k:'Step 2: the page arrives',c:'The older method: the same malicious instructions, written on the page as plain text (or in a weak encoding such as base64 that a model can read in its weights).',res:0,sent:0,v:'not yet'},
    {f:1,t:3,k:'Step 3: the filter can read it',c:'Plain instructions to read out private data and open a URL are text a classifier can match. This is the layer the encrypted version was built to blind.',res:0,sent:0,v:'flagged (readable)'},
    {f:1,t:0,k:'Step 4: the request goes no further',c:'With the injection caught at the input, the summary comes back with nothing resolved and nothing sent. Input filtering works only while the payload is readable.',res:0,sent:0,v:'flagged (readable)'}];
  const gate=enc.slice(0,5).concat([
    {f:1,t:5,k:'Step 6: the outbound request is stopped',c:'Everything so far happened, but the sandbox may only reach allowlisted hosts. The URL to the attacker\'s server is refused, so the four resolved fields never leave. Egress is the control that holds regardless of how the instructions got in.',res:4,sent:0,v:'pass (ciphertext)',blk:1},
    {f:1,t:0,k:'Step 7: summary, no leak',c:'The user still gets a summary. A gate keyed to what the action does (send private state to an unknown host) catches what a filter keyed to where the text came from cannot.',res:4,sent:0,v:'pass (ciphertext)'}]);
  const SC={enc,plain,gate};
  const DUR=2400;
  const st={m:'enc',k:0,t:RM?1:0,play:!RM,spd:1,vis:false,raf:0,last:0,lk:-1,lm:''};
  const cl=v=>v<0?0:v>1?1:v,ease=v=>v<.5?2*v*v:1-2*(1-v)*(1-v);
  function pos(i,narrow,W){const cols=narrow?2:3,bw=narrow?150:180,bh=46,gx=(W-cols*bw)/(cols+1),r=Math.floor(i/cols),c=i%cols;
    const order=narrow?[0,1,2,3,4,5]:[0,1,2,3,4,5];const j=order[i];return {x:gx+(j%cols)*(bw+gx),y:20+Math.floor(j/cols)*(bh+(narrow?34:56)),w:bw,h:bh}}
  function draw(){const L=SC[st.m],k=Math.min(st.k,L.length-1),s0=L[k],narrow=card.clientWidth<560,W=narrow?360:660,rowsN=narrow?3:2,H=20+rowsN*46+(rowsN-1)*(narrow?34:56)+20;let s='';
    const P=NODES.map((n,i)=>pos(i,narrow,W)),e=RM?1:ease(cl(st.t));
    const used=new Set();L.slice(0,k+1).forEach(x=>{used.add(x.f);used.add(x.t)});
    NODES.forEach((n,i)=>{const p=P[i],on=i===s0.f||i===s0.t,cls=i===5&&s0.sent&&k===L.indexOf(s0)?'boxa':on?'boxa':used.has(i)?'box':'boxo';
      s+=bx(p.x,p.y,p.w,p.h,cls,[n[0],n[1]],narrow?11.5:12.5)});
    const a=P[s0.f],b=P[s0.t],cx=p=>p.x+p.w/2,cy=p=>p.y+p.h/2;
    const ax=cx(a),ay=cy(a),bx2=cx(b),by=cy(b),dx=bx2-ax,dy=by-ay,len=Math.hypot(dx,dy)||1;
    const sx=ax+dx/len*Math.min(a.w/2,len/3)*(Math.abs(dx)>Math.abs(dy)?1:0.35),sy=ay+dy/len*(Math.abs(dy)>Math.abs(dx)?a.h/2:a.h/3);
    const ex=bx2-dx/len*Math.min(b.w/2,len/3)*(Math.abs(dx)>Math.abs(dy)?1:0.35),ey=by-dy/len*(Math.abs(dy)>Math.abs(dx)?b.h/2:b.h/3);
    const stop=s0.blk?0.55:1;
    s+=ar(sx,sy,sx+(ex-sx)*stop,sy+(ey-sy)*stop,!!s0.blk);
    if(s0.blk){const gx=sx+(ex-sx)*0.6,gy=sy+(ey-sy)*0.6;s+='<rect x="'+(gx-9)+'" y="'+(gy-9)+'" width="18" height="18" rx="3" fill="var(--good)"/><text x="'+gx+'" y="'+(gy+4)+'" font-size="11" text-anchor="middle" fill="var(--bg)">✕</text><text x="'+gx+'" y="'+(gy-13)+'" font-size="10.5" text-anchor="middle" fill="var(--good)">egress gate</text>'}
    const pe=Math.min(e,stop),qx=sx+(ex-sx)*pe,qy=sy+(ey-sy)*pe,col=s0.sent&&!s0.blk&&k===5?'var(--bad)':s0.f===2||s0.f===4?'var(--c2)':'var(--c1)';
    s+='<circle cx="'+qx.toFixed(1)+'" cy="'+qy.toFixed(1)+'" r="6" fill="'+col+'" stroke="var(--bg)" stroke-width="1.5"/>';
    $('ijSvg').innerHTML=svgEl(W,H,s,'Injection chain, step '+(k+1));
    if(st.lk!==k||st.lm!==st.m){$('ijStep').textContent=s0.k+' (of '+L.length+')';$('ijCap').textContent=s0.c;st.lk=k;st.lm=st.m}
    const done=e>=1;
    $('ijCnt').innerHTML=stat('Input filter',s0.v,st.m==='plain'?'readable text can be matched':'it never sees the plaintext')+
      stat('Private fields resolved',(done?s0.res:(k?L[k-1].res:0))+' of 4',F.join(', '))+
      stat('Sent to the attacker',(done?s0.sent:(k?L[k-1].sent:0))+' of 4',st.m==='gate'?'blocked at the sandbox boundary':'in the URL\'s parameters')+
      stat('Confirmations asked','0','no prompt, no warning');
    const sc=$('ijScrub');sc.max=L.length*100;sc.value=Math.round((k+cl(st.t))*100);
    const pb=$('ijPlay'),end=k===L.length-1&&st.t>=1;pb.innerHTML=st.play?'❚❚ Pause':end?'↻ Replay':'▶ Play';pb.setAttribute('aria-label',st.play?'Pause':end?'Replay':'Play')}
  const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
  function tick(now){st.raf=0;if(!st.play||!live())return;const dt=st.last?Math.min(100,now-st.last):16;st.last=now;const L=SC[st.m];
    st.t+=dt*st.spd/DUR;if(st.t>=1){if(st.k<L.length-1){st.k++;st.t=0}else{st.t=1;st.play=false}}
    card.dataset.frames=(+card.dataset.frames||0)+1;draw();if(st.play)st.raf=requestAnimationFrame(tick)}
  function kick(){if(st.play&&live()&&!st.raf){st.last=0;st.raf=requestAnimationFrame(tick)}else if(!live()&&st.raf){cancelAnimationFrame(st.raf);st.raf=0}}
  const pause=()=>{st.play=false;if(st.raf){cancelAnimationFrame(st.raf);st.raf=0}};
  $('ijPlay').addEventListener('click',()=>{const L=SC[st.m];if(st.play)pause();else{if(st.k===L.length-1&&st.t>=1){st.k=0;st.t=0}else if(st.t>=1&&st.k<L.length-1){st.k++;st.t=0}st.play=true;kick()}draw()});
  $('ijFwd').addEventListener('click',()=>{pause();st.k=Math.min(SC[st.m].length-1,st.k+1);st.t=1;draw()});
  $('ijBack').addEventListener('click',()=>{pause();st.k=Math.max(0,st.k-1);st.t=1;draw()});
  $('ijScrub').addEventListener('input',e=>{pause();const L=SC[st.m],v=+e.target.value;st.k=Math.min(L.length-1,Math.floor(v/100));st.t=cl(v/100-st.k);draw()});
  $('ijSpd').addEventListener('change',e=>{st.spd=+e.target.value});
  const seg=$('ijM');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    st.m=b.dataset.m;st.k=0;st.t=RM?1:0;if(!RM)st.play=true;draw();kick()}));
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;kick()},{threshold:.15}).observe(card)}else st.vis=true;
  document.addEventListener('visibilitychange',kick);
  let rw=card.clientWidth<560;addEventListener('resize',()=>{const w=card.clientWidth<560;if(w!==rw){rw=w;draw()}});
  onTab('t-read',()=>{draw();kick()});
  draw();
})();
