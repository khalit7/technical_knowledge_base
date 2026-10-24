// ---- Reading: static figures (hero, six connections, LLM stream anatomy, resumable log, cancellation, frame header, deflate, proxy path, gRPC stream) ----
// Every figure is drawn at its container's measured width and redrawn on resize. Numbers come from window.SDATA (measured) or are labelled.
(function(){
  const D=window.SDATA,T=RD.t,esc=RD.esc;
  const ACC='var(--acc)',MUT='var(--mute)',INK='var(--ink)',LIN='var(--line)',BAD='var(--bad)';
  const mk=(id,c)=>'<marker id="'+id+'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="'+c+'"/></marker>';
  const defs=p=>'<defs>'+mk(p+'a',ACC)+mk(p+'m',MUT)+mk(p+'b',BAD)+'</defs>';
  const line=(x1,y1,x2,y2,c,o)=>{o=o||{};return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+c+'" stroke-width="'+(o.w||1.6)+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+(o.m?' marker-end="url(#'+o.m+')"':'')+'/>'};
  const rect=(x,y,w,h,f,s,o)=>{o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+Math.max(0,w)+'" height="'+Math.max(0,h)+'" rx="'+(o.rx==null?4:o.rx)+'" fill="'+f+'" stroke="'+(s||'none')+'"'+(o.op?' opacity="'+o.op+'"':'')+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+'/>'};
  const fig=[];const reg=f=>{fig.push(f)};

  // 1. Hero: five mini sequence diagrams
  const HERO=[
    ['Polling','server','<b>You open</b>, every tick. One answer each, mostly "nothing". Latency is the tick.'],
    ['Long polling','server','<b>You open</b>; the server holds it until news. One request per batch of events.'],
    ['SSE','server','<b>You open once</b>; then <b>server to you only</b>. Lives for the answer; plain HTTP.'],
    ['WebSocket','server','<b>You open once</b> (HTTP upgrade); then <b>both ways</b>. Lives until something cuts it.'],
    ['Webhook','provider','<b>The provider opens</b> a POST to your public URL per event, retried until you answer 2xx.']];
  reg(function(){const g=document.getElementById('hero-grid');if(!g)return;
    if(!g.children.length)g.innerHTML=HERO.map((h,i)=>'<div><div class="hp" id="hp'+i+'"></div><p class="hc">'+h[2]+'</p></div>').join('');
    HERO.forEach((h,i)=>{const el=document.getElementById('hp'+i),w=Math.max(140,RD.width(el)),H=184,p='hr'+i,xa=16,xb=w-16;
      // an arrow from y1 to y2 (slightly sloped); its label sits above the arrow's higher end
      const L=(y1,y2,dir,c,lab,o)=>{o=o||{};const f=dir>0?xa:xb,t=dir>0?xb:xa;const m=c===ACC?p+'a':c===BAD?p+'b':p+'m';
        return line(f,y1,t-(dir>0?3:-3),y2,c,{m,dash:o.dash})+(lab?T((xa+xb)/2,Math.min(y1,y2)-3,lab,{a:'middle',fs:11,fill:c===ACC?INK:MUT}):'')};
      let b=defs(p)+T(4,13,h[0],{fs:12.5,w:'600'})+T(2,28,'you',{fs:11,fill:MUT})+T(w-2,28,h[1],{a:'end',fs:11,fill:MUT});
      b+=line(xa,32,xa,H-4,LIN,{w:1})+line(xb,32,xb,H-4,LIN,{w:1});
      if(i===0){for(let k=0;k<4;k++){const y=48+k*35;b+=L(y,y+6,1,MUT,k?'':'GET')+L(y+19,y+25,-1,k<3?MUT:ACC,k<3?'nothing':'news')}}
      if(i===1){b+=L(48,54,1,MUT,'GET')+rect(xb-4,54,8,36,'var(--acc2)',ACC)+L(98,104,-1,ACC,'news')+L(110,116,1,MUT,'')+rect(xb-4,116,8,26,'var(--acc2)',ACC)+L(154,160,-1,ACC,'news')+L(166,172,1,MUT,'')}
      if(i===2){b+=L(48,54,1,MUT,'POST')+rect(xb-4,54,8,H-60,'var(--acc2)',ACC);for(let k=0;k<5;k++){const y=78+k*22;b+=L(y,y+6,-1,ACC,k===0?'events':'')}}
      if(i===3){b+=L(48,54,1,MUT,'GET Upgrade')+L(72,78,-1,MUT,'101');for(let k=0;k<5;k++){const y=100+k*16;b+=L(y,y+5,k%2?1:-1,ACC,k===0?'messages':'')}}
      if(i===4){b+=T((xa+xb)/2,58,'hours later',{a:'middle',fs:11,fill:MUT})+line((xa+xb)/2,64,(xa+xb)/2,76,LIN,{dash:'3 3'})+L(96,102,-1,ACC,'POST event')+L(118,124,1,BAD,'500')+L(144,150,-1,ACC,'retry')+L(166,172,1,MUT,'200')}
      el.innerHTML=RD.svg(w,H,b,h[0]+': '+h[2].replace(/<[^>]+>/g,''))});
  });

  // 2. Six connections per host on HTTP/1.1 against one HTTP/2 connection
  reg(function(){const el=document.getElementById('six-svg');if(!el)return;const W=RD.width(el),two=W>=560,pw=two?(W-16)/2:W,ph=210,H=two?ph:ph*2+12;
    const opened=D.six.opened.length;let b=defs('sx');
    function panel(x0,y0,h2){b+=T(x0+4,y0+14,h2?'HTTP/2: one connection, many streams':'HTTP/1.1: one stream per connection',{fs:12.5,w:'600'});
      const bx=x0+4,hx=x0+pw-56,top=y0+28;b+=rect(bx,top,52,170,'var(--soft)',LIN)+T(bx+26,top+16,'page',{a:'middle',fs:11})+rect(hx,top,50,170,'var(--soft)',LIN)+T(hx+25,top+16,'host',{a:'middle',fs:11});
      const items=['1','2','3','4','5','6','7','8','fetch'];
      if(!h2){items.forEach((s,k)=>{const y=top+30+k*15.5,ok=k<opened;
          if(ok)b+=line(bx+52,y,hx,y,ACC,{w:2})+T(bx+60,y-3,'stream '+s,{fs:11});
          else b+=line(bx+52,y,bx+52+(hx-bx-52)*0.35,y,BAD,{dash:'4 3'})+T(bx+60+(hx-bx-52)*0.35,y+4,(s==='fetch'?'fetch':'stream '+s)+': waiting',{fs:11,fill:BAD})});
        b+=T(bx+60,top+30+9*15.5+6,'6 of 6 connections in use',{fs:11,fill:MUT})}
      else{b+=rect(bx+52,top+26,hx-bx-52,148,'none',ACC,{rx:6});b+=T(bx+60,top+40,'one TCP (or QUIC) connection',{fs:11,fill:MUT});
        items.forEach((s,k)=>{const y=top+54+k*13.5;b+=line(bx+60,y,hx-8,y,ACC,{w:1.6})+T(bx+64,y-2,s==='fetch'?'fetch':'stream '+s,{fs:11})})}}
    panel(0,0,false);panel(two?pw+16:0,two?0:ph+12,true);
    el.innerHTML=RD.svg(W,H,b,'Eight SSE streams and a fetch: on HTTP/1.1 six connect and the rest wait; on HTTP/2 all share one connection')});

  // 3. LLM stream anatomy on the measured SSE run
  reg(function(){const el=document.getElementById('llm-svg');if(!el)return;const W=RD.width(el),r=D.fw['50'].SSE,arr=r.arr,TM=0.42,narrow=W<520;
    const l=8,pw=W-16,x=t=>l+t/TM*pw,H=196;let b=defs('lm');
    for(let g=0;g<=0.4001;g+=0.1)b+=line(x(g),26,x(g),H-20,LIN,{w:1})+T(x(g),H-4,Math.round(g*1000)+(g===0?' ms':''),{a:g===0?'start':'middle',fs:11,fill:MUT});
    // request up, head and message_start back
    const head=arr[0][1],first=arr[1][1],last=arr[arr.length-1][1];
    b+=T(x(0)+2,20,'POST sent',{fs:11,fill:MUT});
    b+=rect(x(head),40,x(last)-x(head),18,'var(--acc2)',ACC)+T(x(head)+4,53,'one response: 200 + text/event-stream',{fs:11});
    b+=line(x(head),62,x(head),76,MUT,{w:1})+T(x(head)+3,74,'status 200 fixed here',{fs:11,fill:MUT});
    const TOK=['The','sky','is','blue','.'];let k=0;
    arr.forEach(([e,t])=>{const tok=e==='content_block_delta';b+='<circle cx="'+x(t)+'" cy="104" r="5" fill="'+(tok?ACC:MUT)+'"/>';
      if(tok){if(!narrow||k===0||k===4)b+=T(x(t),124,TOK[k],{a:'middle',fs:11});k++}});
    if(!narrow)b+=T(x(head),94,'message_start',{a:'middle',fs:11,fill:MUT});
    if(!narrow)b+=T(x(last),96,'message_stop',{a:'end',fs:11,fill:MUT});
    // TTFT bracket
    const y=152,ft=r.med_first_token;b+=line(x(0),y,x(first)-2,y,ACC,{w:2,m:'lma'})+T(x(0)+2,y+16,'TTFT '+Math.round(ft*1000)+' ms',{fs:11.5,w:'600'});
    b+=line(x(first),y,x(last)-2,y,MUT,{w:1.4,m:'lmm'})+T(x(last),y+16,(narrow?'':'tokens every 50 ms, last at ')+Math.round(last*1000)+' ms',{a:'end',fs:11,fill:MUT});
    el.innerHTML=RD.svg(W,H,b,'The running answer over SSE: the status is sent first, TTFT '+Math.round(ft*1000)+' ms')});

  // 4. Resumable stream: job, log, any handler
  reg(function(){const el=document.getElementById('res-svg');if(!el)return;const W=RD.width(el),n=W<520,H=n?250:190;let b=defs('rs');
    if(!n){const c1=8,c2=W*0.30,c3=W*0.66,cw=W*0.24;
      b+=rect(c1,70,cw*0.9,40,'var(--soft)',LIN)+T(c1+8,87,'generation job',{fs:11.5,w:'600'})+T(c1+8,102,'appends events',{fs:11,fill:MUT});
      b+=line(c1+cw*0.9,90,c2-4,90,MUT,{m:'rsm'});
      const lw=(c3-c2-24)/7;for(let i=0;i<7;i++){b+=rect(c2+i*lw,72,lw-3,36,i<=2?'var(--soft)':'var(--acc2)',i<=2?LIN:ACC,{rx:3})+T(c2+i*lw+(lw-3)/2,95,String(i),{a:'middle',fs:11.5})}
      b+=T(c2,62,'log for response r42 (ids 0 to 6)',{fs:11,fill:MUT});
      b+=rect(c3,24,W-c3-8,34,'var(--soft)',LIN)+T(c3+8,45,'server A: tails the log',{fs:11});
      b+=rect(c3,122,W-c3-8,34,'var(--soft)',ACC)+T(c3+8,143,'server B: tails from id 3',{fs:11});
      b+=line(c3-20,92,c3,41,MUT,{w:1})+line(c3-20,92,c3,139,ACC,{w:1.6});
      b+=T(c3+8,76,'connection cut after id 2',{fs:11,fill:BAD})+T(c3+8,176,'reconnect: Last-Event-ID: 2',{fs:11,fill:ACC});}
    else{const L=8,w=W-16;
      b+=rect(L,6,w,32,'var(--soft)',LIN)+T(L+8,26,'generation job: appends events',{fs:11.5});b+=line(W/2,38,W/2,52,MUT,{m:'rsm'});
      const lw=w/7;for(let i=0;i<7;i++)b+=rect(L+i*lw,56,lw-3,30,i<=2?'var(--soft)':'var(--acc2)',i<=2?LIN:ACC,{rx:3})+T(L+i*lw+(lw-3)/2,76,String(i),{a:'middle',fs:11.5});
      b+=T(L,102,'log for response r42',{fs:11,fill:MUT});
      b+=rect(L,112,w,30,'var(--soft)',LIN)+T(L+8,131,'server A: tails the log; cut after id 2',{fs:11});
      b+=rect(L,154,w,30,'var(--soft)',ACC)+T(L+8,173,'server B: tails from id 3',{fs:11});
      b+=T(L,206,'reconnect sends Last-Event-ID: 2',{fs:11,fill:ACC})+T(L,224,'(any server can answer it)',{fs:11,fill:MUT});}
    el.innerHTML=RD.svg(W,H,b,'Generation appends events to a log; after a cut, another server resumes from the last id')});

  // 5. Cancellation: work after the client left
  reg(function(){const el=document.getElementById('cx-svg');if(!el)return;const W=RD.width(el),C=D.cancel,n=W<520,lw=n?0:150,TM=3.2,pw=W-lw-16,x=t=>lw+8+t/TM*pw;
    const rows=[['think_careful0','Naive, during a 3 s think'],['think_careful1','Careful, during a 3 s think'],['tokens_careful0','Naive, while tokens flow'],['tokens_careful1','Careful, while tokens flow']];
    const rh=n?44:32,H=30+rows.length*rh+24;let b='';
    for(let g=0;g<=3.001;g+=0.5)b+=line(x(g),20,x(g),H-22,LIN,{w:1})+T(x(g),H-8,g.toFixed(1)+(g===0?' s':''),{a:g===0&&n?'start':'middle',fs:11,fill:MUT});
    const cl=C[0].client_closed_at_s;b+=line(x(cl),14,x(cl),H-22,BAD,{w:1.6,dash:'4 3'})+T(x(cl)+4,14,'user presses Stop',{fs:11,fill:BAD});
    rows.forEach(([tag,lab],i)=>{const c=C.find(z=>z.tag===tag),s=c.server,y=30+i*rh,naive=/0$/.test(tag);
      if(n)b+=T(8,y+10,lab,{fs:11,fill:MUT});else b+=T(4,y+15,lab,{fs:11});
      const by=n?y+14:y+3;b+=rect(x(0),by,x(s.work_seconds)-x(0),16,naive&&s.work_seconds>1?'var(--bad)':'var(--acc2)',naive&&s.work_seconds>1?BAD:ACC,{op:naive&&s.work_seconds>1?0.55:1});
      b+=T(Math.min(x(s.work_seconds)+4,W-4),by+12,s.work_seconds.toFixed(2)+' s',{fs:11,a:x(s.work_seconds)+50>W?'end':'start'})});
    el.innerHTML=RD.svg(W,H,b,'Server work after the user pressed Stop: naive 3.0 s during a think, careful 0.51 s')});

  // 6. WebSocket frame header, bit by bit, on the token "The"
  reg(function(){const el=document.getElementById('fr-svg');if(!el)return;const W=RD.width(el),bw=(W-16)/16,H=W<520?184:166;let b='';
    const bits='1000000101010011';
    const F=[[0,1,'FIN'],[1,3,'RSV'],[4,4,'opcode'],[8,1,'M'],[9,7,'payload length']];
    F.forEach(([s,n,lab],i)=>{const x0=8+s*bw;b+=rect(x0,22,n*bw-2,30,i===4||i===2?'var(--acc2)':'var(--soft)',i===4||i===2?ACC:LIN,{rx:3})+T(x0+(n*bw-2)/2,16,lab,{a:'middle',fs:11,fill:MUT})});
    for(let k=0;k<16;k++)b+=T(8+k*bw+bw/2-1,42,bits[k],{a:'middle',fs:11.5,w:'600'});
    const nr=W<520,y2=nr?86:70,yo=nr?16:0;
    b+=T(8,70,'byte 1 = 0x81: FIN 1, opcode 1 (text)',{fs:11})+T(nr?8:W/2+4,y2,'byte 2 = 0x53: MASK 0, length 83',{fs:11});
    const parts=[['extended length','0, 2 or 8 bytes'],['masking key','0 or 4 bytes'],['payload','83 bytes of JSON']],pw=(W-16)/3;
    parts.forEach(([a,c],i)=>{if(nr&&i<2)c=c.replace(' bytes',' B');const x0=8+i*pw;b+=rect(x0,84+yo,pw-4,40,i===2?'var(--acc2)':'var(--soft)',i===2?ACC:LIN,{dash:i<2?'4 3':null})+T(x0+6,100+yo,a,{fs:11,w:'600'})+T(x0+6,116+yo,c,{fs:11,fill:MUT})});
    b+=T(8,142+yo,'here: no extended length (83 is under 126),',{fs:11,fill:MUT})+T(8,157+yo,'no key (server frames are never masked)',{fs:11,fill:MUT});
    el.innerHTML=RD.svg(W,H,b,'WebSocket frame header of the token The: bytes 0x81 0x53 then 83 bytes of payload')});

  // 7. permessage-deflate sizes, drawn to scale
  reg(function(){const el=document.getElementById('df-svg');if(!el)return;const W=RD.width(el),S=D.defl.settings,n=W<520;
    const rows=[['no compression','no compression','about 14 KiB'],['deflate, no context takeover (each message compressed alone)','no context takeover',''],
      ['deflate, websockets defaults (window 2^12, memLevel 5), context kept','library defaults (window 2^12)','64 KiB'],['deflate, zlib defaults (window 2^15, memLevel 8), context kept','zlib defaults (window 2^15)','316 KiB']];
    const lw=n?0:190,mx=S['no compression'].long,pw=W-lw-16,rh=n?42:30,H=rows.length*rh+8;let b='';
    rows.forEach(([k,lab,mem],i)=>{const v=S[k].long,y=4+i*rh,by=n?y+16:y+4;
      if(n)b+=T(8,y+11,lab+(mem?', '+mem+' per connection':''),{fs:11,fill:MUT});else{b+=T(4,y+15,lab,{fs:11});if(mem)b+=T(4,y+27,mem+' per connection',{fs:11,fill:MUT})}
      const w=v/mx*(pw-70);b+=rect(lw+8,by,w,16,i>=2?'var(--acc2)':'var(--soft)',i>=2?ACC:LIN,{rx:2})+T(lw+12+w,by+12,v.toLocaleString('en-US')+' B',{fs:11})});
    el.innerHTML=RD.svg(W,H,b,'Bytes on the wire for 357 one-word messages under four compression settings')});

  // 8. Proxy path: where each failure happens
  reg(function(){const el=document.getElementById('px-svg');if(!el)return;const W=RD.width(el),H=W>=560?118:92,bw=Math.min(130,(W-40)/3);let b=defs('px');
    const xs=[8,(W-bw)/2,W-bw-8],labs=['browser or client','nginx (proxy)','websockets server'];
    xs.forEach((x0,i)=>{b+=rect(x0,40,bw,40,'var(--soft)',i===1?ACC:LIN)+T(x0+bw/2,64,labs[i],{a:'middle',fs:11})});
    b+=line(xs[0]+bw,60,xs[1]-2,60,MUT,{m:'pxm'})+line(xs[1]+bw,60,xs[2]-2,60,MUT,{m:'pxm'});
    const dot=(cx,cy,s)=>'<circle cx="'+cx+'" cy="'+cy+'" r="10" fill="var(--bad)"/>'+T(cx,cy+4,s,{a:'middle',fs:11.5,fill:'#fff',w:'700'});
    b+=dot(xs[1]+bw*0.3,22,'1')+dot(xs[1]+bw*0.7,22,'2')+dot(xs[2]+bw/2,22,'3');
    if(W>=560)b+=T(xs[0]+bw/2,100,'only ever sees 1006',{a:'middle',fs:11,fill:BAD})+T(xs[1]+bw/2,100,'drops Upgrade; idle timer',{a:'middle',fs:11,fill:MUT})+T(xs[2]+bw/2,100,'Origin check',{a:'middle',fs:11,fill:MUT});
    el.innerHTML=RD.svg(W,H,b,'Client, proxy and server, with the three failure points numbered')});

  // 9. gRPC call on one HTTP/2 stream
  reg(function(){const el=document.getElementById('gr-svg');if(!el)return;const W=RD.width(el),w=W-16;let b='',y=6;
    const box=(lab,sub,hl,h)=>{h=h||38;b+=rect(8,y,w,h,hl?'var(--acc2)':'var(--soft)',hl?ACC:LIN)+T(16,y+16,lab,{fs:11.5,w:'600'})+T(16,y+31,sub,{fs:11,fill:MUT});y+=h+6};
    box('HEADERS (client)','POST /pkg.Service/Method, application/grpc');
    box('DATA: client messages','[flag 1 B][length 4 B][protobuf], repeated',true);
    box('HEADERS (server)',':status 200, application/grpc');
    box('DATA: server messages','[flag][length][bytes], repeated',true);
    box('HEADERS: trailers, END_STREAM','grpc-status: 0 (OK), grpc-message');
    el.innerHTML=RD.svg(W,y,b,'A gRPC call as frames on one HTTP/2 stream')});

  const all=()=>fig.forEach(f=>{try{f()}catch(e){setTimeout(()=>{throw e})}});
  RD.onRender(all);RD.onResize(all);all();
})();
