// ---- Timeout chain tab: replay the bytes of one generation against every hop's timers ----
window.TCHAIN=(function(){
  // The model (src/recompute.py implements the same rules and checks them against raw/timeouts.json).
  function byteTimes(r){ // r: {stream, think, ntok, gap, ping}
    const end=r.think+r.gap*Math.max(0,r.ntok-1);
    if(!r.stream)return {times:[end],end,tokens:Array(r.ntok).fill(end),head:end};
    const t=[0];if(r.ping>0)for(let p=r.ping;p<r.think-1e-9;p+=r.ping)t.push(p);
    const tok=[];for(let j=0;j<r.ntok;j++)tok.push(r.think+j*r.gap);
    return {times:t.concat(tok),end,tokens:tok,head:0};
  }
  function fireTime(kind,L,b){
    if(kind==='total')return b.end>L?L:null;
    if(kind==='first')return b.head>L?L:null;
    let prev=0;for(const t of b.times){if(t-prev>L)return prev+L;prev=t}return null;
  }
  function run(hops,r){ // hops: [{name, timers:[[kind,L]], role}]
    const b=byteTimes(r);let best=null;
    hops.forEach((h,hi)=>h.timers.forEach(([k,L])=>{const f=fireTime(k,L,b);if(f!==null&&(best===null||f<best.t-1e-9))best={t:f,hop:hi,kind:k,L}}));
    const out={b,best,end:b.end};
    if(!best){out.result='complete';out.at=b.end;out.tokens=r.ntok}
    else{out.at=best.t;out.tokens=b.tokens.filter(t=>t<best.t-1e-9).length;
      const h=hops[best.hop];out.result=h.role==='client'?(best.kind==='total'?'client total limit':'client read timeout'):(b.head<best.t?'cut under 200':'error status from the hop')}
    return out;
  }
  return {byteTimes,fireTime,run};
})();
(function(){
  const D=window.HD,esc=RD.esc,T=RD.t,M=window.TCHAIN;
  const OPT={
    client:[{n:'Anthropic or OpenAI Python SDK (600 s, 2 retries)',timers:[['idle',600]],retries:2},{n:'httpx with defaults (5 s)',timers:[['idle',5]]},{n:'Node fetch / undici (300 s head, 300 s idle)',timers:[['first',300],['idle',300]]},{n:'requests without timeout',timers:[]},{n:'curl --max-time 60',timers:[['total',60]]}],
    corp:[{n:'none',timers:[]},{n:'corporate proxy, 60 s idle (illustrative)',timers:[['idle',60]]}],
    cdn:[{n:'none',timers:[]},{n:'Cloudflare: 125 s for the origin to answer',timers:[['first',125]]}],
    lb:[{n:'none',timers:[]},{n:'AWS ALB: 60 s idle',timers:[['idle',60]]},{n:'Google Cloud ALB: 30 s backend timeout (total)',timers:[['total',30]]},{n:'AWS API Gateway REST: 29 s (total)',timers:[['total',29]]}],
    ing:[{n:'none',timers:[]},{n:'nginx: proxy_read_timeout 60 s',timers:[['idle',60]]},{n:'Envoy: route 15 s total, stream idle 300 s',timers:[['total',15],['idle',300]]},{n:'nginx raised to 600 s idle',timers:[['idle',600]]}]};
  const HOPN={client:'Client library',corp:'Forward proxy',cdn:'CDN',lb:'Load balancer or gateway',ing:'Ingress or reverse proxy'};
  const sel={client:0,corp:0,cdn:0,lb:1,ing:1};
  const R={stream:true,think:90,ntok:61,gap:2,ping:0};
  const hopsEl=document.getElementById('ch-hops');
  hopsEl.innerHTML=Object.keys(OPT).map(k=>'<div class="hop" id="ch-h-'+k+'"><b>'+HOPN[k]+'</b><select data-k="'+k+'" aria-label="'+HOPN[k]+'">'+OPT[k].map((o,i)=>'<option value="'+i+'"'+(i===sel[k]?' selected':'')+'>'+esc(o.n)+'</option>').join('')+'</select><span class="k" id="ch-hk-'+k+'"></span></div>').join('');
  hopsEl.addEventListener('change',e=>{const s=e.target.closest('select');if(!s)return;sel[s.dataset.k]=+s.value;update()});
  const req=document.getElementById('ch-req');
  const SL=[['think','Wait before the first token',0,300,1,'s'],['gap','Gap between tokens (tool calls, slow decode)',0.5,60,0.5,'s'],['ntok','Tokens (events) streamed',1,400,1,''],['ping','Keep-alive ping every (0 = off)',0,60,5,'s']];
  req.innerHTML=SL.map(s=>'<label>'+s[1]+': <b id="ch-v-'+s[0]+'"></b><input type="range" id="ch-'+s[0]+'" min="'+s[2]+'" max="'+s[3]+'" step="'+s[4]+'" value="'+R[s[0]]+'"></label>').join('')+'<label><input type="checkbox" id="ch-stream" checked> Streamed (SSE); off = one JSON answer at the end</label>';
  SL.forEach(s=>document.getElementById('ch-'+s[0]).addEventListener('input',e=>{R[s[0]]=+e.target.value;update()}));
  document.getElementById('ch-stream').addEventListener('change',e=>{R.stream=e.target.checked;update()});
  RD.seg(document.getElementById('ch-pre'),m=>{if(m==='noping'){R.ping=0;R.stream=true}if(m==='ping'){R.ping=15;R.stream=true}if(m==='nostream'){R.stream=false;R.ping=0}
    document.getElementById('ch-ping').value=R.ping;document.getElementById('ch-stream').checked=R.stream;update()});
  function hops(){return Object.keys(OPT).map(k=>Object.assign({key:k,role:k==='client'?'client':'proxy'},OPT[k][sel[k]]))}
  const fmt=s=>s>=100?Math.round(s)+' s':(Math.round(s*10)/10)+' s';
  let res=null,H=null;const NSTEP=40;
  function update(){
    SL.forEach(s=>document.getElementById('ch-v-'+s[0]).textContent=R[s[0]]+(s[5]?' '+s[5]:''));
    H=hops();res=M.run(H,R);
    Object.keys(OPT).forEach((k,i)=>{document.getElementById('ch-h-'+k).classList.toggle('kill',!!res.best&&res.best.hop===i);
      document.getElementById('ch-hk-'+k).textContent=OPT[k][sel[k]].timers.map(t=>t[0]+' '+t[1]+' s').join(', ')||'no timeout'});
    const v=document.getElementById('ch-verdict');
    if(!res.best){v.className='verdict';v.innerHTML='<b>Completes</b> at '+fmt(res.end)+'. Longest silence on the wire: '+fmt(maxGap(res.b))+'.'}
    else{const h=H[res.best.hop];v.className='verdict bad';
      let msg='<b>Ended by '+esc(HOPN[h.key].toLowerCase())+'</b> ('+esc(h.n)+', '+res.best.kind+' timer) at '+fmt(res.at)+', after '+res.tokens+' of '+R.ntok+' tokens. ';
      if(res.result==='cut under 200')msg+='The 200 head had already passed, so the client sees a stream that just stops (curl exit 18, "incomplete chunked read").';
      else if(res.result==='error status from the hop')msg+='No head had been sent, so the hop answers with an error status (nginx: 504; Cloudflare: 524).';
      else msg+='The client library raises a timeout error.'+(h.retries?' The SDK then retries twice: the server receives the same request three times, each ending the same way.':'');
      if(res.best.kind==='total')msg+=' A total timer: pings and streaming cannot help; raise it or make the work asynchronous.';
      else if(res.best.kind==='idle'&&R.stream&&!R.ping)msg+=' An idle timer: keep-alive pings shorter than '+res.best.L+' s would keep it open.';
      v.innerHTML=msg}
    A.reset(NSTEP);
  }
  function maxGap(b){let p=0,m=0;b.times.forEach(t=>{m=Math.max(m,t-p);p=t});return m}
  const svg=document.getElementById('ch-svg');
  function draw(i){
    if(!res)return;const stop=res.best?res.at:res.end,tmax=Math.max(stop*1.08,1),now=stop*i/(NSTEP-1);
    const w=RD.width(svg),L=Math.min(150,w*0.33),R2=10,x=t=>L+(w-L-R2)*t/tmax;let b='',y=18;
    b+=T(4,y+4,'Bytes to client',{fs:11,w:600});
    res.b.times.forEach((t,k)=>{if(t<=now+1e-9&&t<=stop+1e-9){const isTok=k>=res.b.times.length-res.b.tokens.length&&R.stream;const col=k===0&&R.stream?'var(--c4)':(isTok?'var(--c1)':'var(--c5)');b+='<rect x="'+(x(t)-1.5)+'" y="'+(y-6)+'" width="3" height="12" fill="'+col+'"/>'}});
    y+=22;
    const timers=[];H.forEach((h,hi)=>h.timers.forEach(([k,Lm])=>timers.push({h,hi,k,L:Lm})));
    timers.forEach(tm=>{
      let el;if(tm.k==='total')el=now;else if(tm.k==='first')el=res.b.head<=now?0:now;else{let last=0;res.b.times.forEach(t=>{if(t<=now+1e-9)last=t});el=now-last}
      const frac=Math.min(1,el/tm.L),fired=res.best&&res.best.hop===tm.hi&&res.best.kind===tm.k&&now>=res.at-1e-9;
      b+=T(4,y+9,(HOPN[tm.h.key].split(' ')[0]+' '+tm.k+' '+tm.L+' s'),{fs:10.5});
      b+='<rect x="'+L+'" y="'+y+'" width="'+(w-L-R2)+'" height="12" rx="3" fill="var(--soft)" stroke="var(--line)"/>';
      b+='<rect x="'+L+'" y="'+y+'" width="'+((w-L-R2)*frac)+'" height="12" rx="3" fill="'+(fired?'var(--bad)':frac>0.8?'var(--c5)':'var(--c3)')+'"/>';
      y+=18});
    if(!timers.length){b+=T(L,y+9,'No timer anywhere on this path: a stuck request would wait forever.',{fs:11,fill:'var(--bad)'});y+=18}
    b+='<line x1="'+x(now)+'" x2="'+x(now)+'" y1="8" y2="'+y+'" stroke="var(--mute)" stroke-dasharray="3 3"/>';
    [0,0.5,1].forEach(p=>{const t=tmax*p;b+=T(x(t),y+14,fmt(t),{a:p===0?'start':p===1?'end':'middle',fs:10,fill:'var(--mute)'})});
    svg.innerHTML=RD.svg(w,y+20,b,'Each timer on the path over the life of the request');
    document.getElementById('ch-cap').innerHTML='<div class="t">t = '+fmt(now)+'</div><p>Bars show how far each timer has run toward its limit: idle timers drop back to zero on every byte (purple: the 200 head, yellow: a ping, blue: a token); total timers only grow.'+(res.best&&now>=res.at-1e-9?' <b>A timer reached its limit.</b>':'')+'</p>';
    const got=res.b.tokens.filter(t=>t<=now+1e-9&&(!res.best||t<res.at-1e-9)).length;
    document.getElementById('ch-cnt').innerHTML=RD.stat('Tokens received',got+' / '+R.ntok,'')+RD.stat('Longest silence',fmt(maxGap(res.b)),'between bytes')+RD.stat('Generation would end at',fmt(res.end),'think + gaps');
  }
  const A=RD.anim({card:'ch-svg',ctl:'ch-ctl',n:NSTEP,draw,ms:250,label:'Time',tab:'t-chain'});
  // validation against the measured runs (raw/timeouts.json)
  const NG=[{key:'ing',role:'proxy',n:'nginx idle 2 s',timers:[['idle',2]]}];
  const V=[
    [0,NG,{stream:true,think:1,ntok:5,gap:0.05,ping:0}],[1,NG,{stream:true,think:3,ntok:5,gap:0.05,ping:0}],
    [2,NG,{stream:true,think:3,ntok:5,gap:0.05,ping:1}],[3,NG,{stream:true,think:1,ntok:8,gap:1.5,ping:0}],
    [4,NG.concat([{key:'client',role:'client',n:'curl --max-time 5',timers:[['total',5]]}]),{stream:true,think:1,ntok:8,gap:1.5,ping:0}],
    [5,NG,{stream:false,think:3,ntok:5,gap:0.05,ping:0}],
    [6,[{key:'client',role:'client',n:'httpx read 2 s',timers:[['idle',2]]}],{stream:true,think:1,ntok:8,gap:1.5,ping:0}],
    [7,[{key:'client',role:'client',n:'httpx read 2 s',timers:[['idle',2]]}],{stream:true,think:3,ntok:5,gap:0.05,ping:0}]];
  const meas=c=>{if(c.httpx)return {ok:!c.httpx.error,s:c.httpx.seconds,tok:c.httpx.tokens,txt:c.httpx.error||'complete'};const r=c.curl;const ok=r.exit===0&&r.http==='200';
    return {ok,s:r.seconds,tok:r.tokens,txt:ok?'complete':(r.http!=='200'?'HTTP '+r.http:'curl exit '+r.exit)}};
  let match=0;
  const rows=V.map(([ci,hs,r])=>{const c=D.timeouts.cases[ci],m=meas(c),p=M.run(hs,r);const pok=!p.best;
    const same=pok===m.ok&&Math.abs(p.at-m.s)<0.35&&(m.tok===undefined||p.tokens===m.tok);if(same)match++;
    return '<tr><td>'+esc(c.label)+'</td><td>'+(pok?'complete':esc(p.result))+', '+fmt(p.at)+', '+p.tokens+' tokens</td><td>'+esc(m.txt)+', '+m.s.toFixed(2)+' s'+(m.tok===undefined?'':', '+m.tok+' tokens')+'</td><td>'+(same?'<span class="pill ok">match</span>':'<span class="pill bad">differs</span>')+'</td></tr>'});
  document.getElementById('ch-val').innerHTML='<thead><tr><th>Measured case</th><th>Model predicts</th><th>Measured</th><th></th></tr></thead><tbody>'+rows.join('')+'</tbody><tfoot><tr><td colspan="4" class="small"><b id="ch-match">'+match+' of '+V.length+'</b> cases match (outcome, time within 0.35 s, tokens received). Times measured include process start-up and loopback overhead of up to about 0.25 s.</td></tr></tfoot>';
  update();
})();
