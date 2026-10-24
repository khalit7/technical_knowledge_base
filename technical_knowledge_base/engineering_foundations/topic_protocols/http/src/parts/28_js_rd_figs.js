// ---- Reading: static figures added on 2026-10-24 (hero path, cache timeline, CORS preflight before/after, the cookie line,
// QUIC stream map, retry safety). Drawn at the measured width; nothing moves. ----
(function(){
  const D=window.HD,esc=RD.esc,T=RD.t;
  const box=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="7" fill="'+(o.fill||'var(--soft)')+'" stroke="'+(o.stroke||'var(--line)')+'" stroke-width="'+(o.sw||1)+'"/>'};
  const arrow=(x1,y1,x2,y2,col,dash)=>{const a=Math.atan2(y2-y1,x2-x1),L=7;
    return '<line x1="'+x1+'" y1="'+y1+'" x2="'+(x2-Math.cos(a)*4)+'" y2="'+(y2-Math.sin(a)*4)+'" stroke="'+(col||'var(--mute)')+'" stroke-width="1.4"'+(dash?' stroke-dasharray="4 3"':'')+'/>'+
      '<path d="M'+x2+' '+y2+' L'+(x2-L*Math.cos(a-0.45))+' '+(y2-L*Math.sin(a-0.45))+' L'+(x2-L*Math.cos(a+0.45))+' '+(y2-L*Math.sin(a+0.45))+' z" fill="'+(col||'var(--mute)')+'"/>'};
  const set=(id,f)=>{const el=document.getElementById(id);if(!el)return null;const draw=()=>{el.innerHTML=f(RD.width(el))};draw();RD.onRender(draw);RD.onResize(draw);return draw};

  // ---------- hero: the path ----------
  const HOPS=[
    {n:'Your code + SDK',w:'speaks HTTP/1.1 by default',t:'read (idle) 600 s',e:'retries twice'},
    {n:'CDN edge',w:'Cloudflare, in front of two of three APIs',t:'origin wait 125 s',e:'413, 524'},
    {n:'Load balancer',w:'AWS ALB (L7)',t:'idle 60 s',e:'502 keep-alive race'},
    {n:'Reverse proxy',w:'nginx: buffers by default',t:'idle 60 s',e:'504 before the head'},
    {n:'Model server',w:'the origin',t:'',e:'200 text/event-stream, then tokens'}];
  const LINKS=['HTTP/1.1 or 2 (ALPN)','new connection','new connection','HTTP/1.1 (nginx default)'];
  set('hr-svg',w=>{
    const P=6,narrow=w<640;let b='';
    const mh=narrow?56:36;
    b+=box(P,4,w-2*P,mh,{fill:'var(--acc2)',stroke:'var(--acc)',sw:1.4});
    b+=T(P+10,20,'Meaning (RFC 9110), the same on every hop:',{fs:11.5,w:600});
    b+=T(P+10,narrow?36:33,narrow?'POST /v1/messages, fields, 117-byte body':'POST /v1/messages, content-type, x-api-key, 117-byte JSON body, then 200 text/event-stream',{fs:11});
    if(narrow)b+=T(P+10,50,'then 200 text/event-stream',{fs:11});
    const y0=4+mh+14;
    if(!narrow){
      const n=HOPS.length,g=22,bw=(w-2*P-g*(n-1))/n,bh=96;
      HOPS.forEach((h,i)=>{const x=P+i*(bw+g);const last=i===n-1;
        b+=box(x,y0,bw,bh,{stroke:last?'var(--good)':'var(--line)'});
        b+=T(x+6,y0+16,esc(h.n),{fs:11.5,w:600});
        const words=h.w.split(' ');let l1='',l2='';words.forEach(wd=>{if((l1+' '+wd).trim().length*6<bw-10&&!l2)l1=(l1+' '+wd).trim();else l2=(l2+' '+wd).trim()});
        b+=T(x+6,y0+32,esc(l1),{fs:10.5,fill:'var(--mute)'});if(l2)b+=T(x+6,y0+45,esc(l2),{fs:10.5,fill:'var(--mute)'});
        if(h.t)b+=T(x+6,y0+66,esc(h.t),{fs:11,fill:'var(--acc)',w:600});
        const ew=h.e.split(' ');let e1='',e2='';ew.forEach(wd=>{if((e1+' '+wd).trim().length*6<bw-10&&!e2)e1=(e1+' '+wd).trim();else e2=(e2+' '+wd).trim()});
        b+=T(x+6,y0+(h.t?82:66),esc(e1),{fs:10.5,fill:last?'var(--good)':'var(--bad)'});if(e2)b+=T(x+6,y0+(h.t?94:78),esc(e2),{fs:10.5,fill:last?'var(--good)':'var(--bad)'});
        if(i<n-1){b+=arrow(x+bw+2,y0+bh/2,x+bw+g-2,y0+bh/2,'var(--ink)')}
        b+='<line x1="'+(x+bw/2)+'" y1="'+(4+mh)+'" x2="'+(x+bw/2)+'" y2="'+y0+'" stroke="var(--acc)" stroke-dasharray="2 3"/>';
      });
      const yl=y0+bh+16;
      LINKS.forEach((l,i)=>{const x=P+(i+1)*(bw+g)-g/2;b+=T(x,yl+(i%2)*13,esc(l),{a:'middle',fs:10.5,fill:'var(--mute)'})});
      b+=T(P,yl+34,'Wire format and timers: chosen per hop. Each box re-parses, may rewrite, buffer, re-frame, and time out. Smallest timer wins.',{fs:11,fill:'var(--ink)'});
      return RD.svg(w,yl+42,b,'Path of an LLM request through five HTTP participants');
    }
    // narrow: stacked
    let y=y0;const bw=w-2*P,bh=62,gap=30;
    HOPS.forEach((h,i)=>{const last=i===HOPS.length-1;
      b+=box(P,y,bw,bh,{stroke:last?'var(--good)':'var(--line)'});
      b+=T(P+8,y+16,esc(h.n),{fs:11.5,w:600});if(h.t)b+=T(w-P-8,y+16,esc(h.t),{a:'end',fs:11,fill:'var(--acc)',w:600});
      b+=T(P+8,y+33,esc(h.w),{fs:10.5,fill:'var(--mute)'});
      b+=T(P+8,y+50,esc(h.e),{fs:10.5,fill:last?'var(--good)':'var(--bad)'});
      if(i<HOPS.length-1){b+=arrow(P+22,y+bh+2,P+22,y+bh+gap-2,'var(--ink)');b+=T(P+34,y+bh+gap/2+4,esc(LINKS[i]),{fs:10.5,fill:'var(--mute)'})}
      y+=bh+gap});
    y-=gap;
    b+=T(P,y+18,'Each box re-parses, rewrites, buffers, times out;',{fs:11});
    b+=T(P,y+33,'the smallest timer on the path wins.',{fs:11});
    return RD.svg(w,y+40,b,'Path of an LLM request through five HTTP participants');
  });

  // ---------- caching: fresh, stale, validate, 304 ----------
  set('cc-svg',w=>{
    const P=8,narrow=w<520,x=t=>P+(w-2*P)*t/150;let b='';
    const yA=30;
    b+='<rect x="'+x(0)+'" y="'+yA+'" width="'+(x(60)-x(0))+'" height="22" rx="3" fill="var(--good)" opacity=".3"/>';
    b+='<rect x="'+x(60)+'" y="'+yA+'" width="'+(x(90)-x(60))+'" height="22" rx="3" fill="var(--bad)" opacity=".18"/>';
    b+='<rect x="'+x(90)+'" y="'+yA+'" width="'+(x(150)-x(90))+'" height="22" rx="3" fill="var(--good)" opacity=".3"/>';
    b+=T(x(30),yA+15,narrow?'fresh':'fresh: reused, no request',{a:'middle',fs:11});
    b+=T(x(75),yA+15,'stale',{a:'middle',fs:11});
    b+=T(x(120),yA+15,narrow?'fresh':'fresh again for 60 s',{a:'middle',fs:11});
    [[0,'GET','200 + body, etag "models-v1", max-age=60'],[90,'GET + If-None-Match','304, no body']].forEach(([t,q,a],k)=>{
      const xx=x(t);b+='<line x1="'+xx+'" y1="16" x2="'+xx+'" y2="'+(yA+34)+'" stroke="var(--ink)"/>';
      b+=T(xx+(k?-4:4),12,esc(q),{a:k?'end':'start',fs:11,w:600});
      const lines=narrow&&k===0?['200 + body','etag, max-age=60']:[a];
      lines.forEach((l,j)=>{b+=T(xx+(k?-4:4),yA+48+j*13,esc(l),{a:k?'end':'start',fs:10.5,fill:k?'var(--good)':'var(--ink)'})});
    });
    [0,60,90,150].forEach(t=>{b+=T(x(t),yA+80,t+' s',{a:t===0?'start':t===150?'end':'middle',fs:10,fill:'var(--mute)'})});
    return RD.svg(w,yA+86,b,'Freshness and validation of a cached response over time');
  });

  // ---------- CORS: the measured preflight, before and after ----------
  // header lines copied from src/inputs/cors_cookies.txt (check_embed.py confirms each is there)
  const CO=[
    {req:'content-type,x-api-key,anthropic-version',st:'400',lines:['access-control-allow-methods: DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT','access-control-allow-headers: content-type,x-api-key,anthropic-version','(no access-control-allow-origin)'],ok:false},
    {req:'content-type,x-api-key,anthropic-version,anthropic-dangerous-direct-browser-access',st:'200',lines:['access-control-allow-origin: *','access-control-max-age: 600','access-control-allow-headers: ...,anthropic-dangerous-direct-browser-access'],ok:true}];
  let coM=0;
  const coDraw=set('co-svg',w=>{
    const c=CO[coM],P=6,narrow=w<600;let b='';
    const colW=narrow?w-2*P:(w-2*P-24)/2;
    const lineH=14,wrap=(s,max)=>{const out=[];let cur='';s.split(/(?<=[ ,])/).forEach(p=>{if((cur+p).length>max){out.push(cur);cur=p}else cur+=p});if(cur)out.push(cur);return out};
    const mx=Math.floor((colW-14)/6.2);
    // left: browser
    const bl=['Browser, page on https://example.com','1  OPTIONS /v1/messages','Origin: https://example.com','Access-Control-Request-Method: POST'].concat(wrap('Access-Control-Request-Headers: '+c.req,mx));
    const hl=bl.length*lineH+12;
    b+=box(P,4,colW,hl);bl.forEach((l,i)=>{b+=T(P+8,20+i*lineH,esc(l),{fs:i===0?11.5:10.5,w:i<2?600:400})});
    // right: api
    const rx=narrow?P:P+colW+24,ry=narrow?4+hl+24:4;
    let rl=['api.anthropic.com (via Cloudflare)','2  HTTP/2 '+c.st];c.lines.forEach(l=>rl=rl.concat(wrap(l,mx)));
    const hr=rl.length*lineH+12;
    b+=box(rx,ry,colW,hr,{stroke:c.ok?'var(--good)':'var(--bad)',sw:1.4});
    rl.forEach((l,i)=>{const miss=/^\(no /.test(l);b+=T(rx+8,ry+16+i*lineH,esc(l),{fs:i===0?11.5:10.5,w:i<2||miss?600:400,fill:miss?'var(--bad)':(i===1?(c.ok?'var(--good)':'var(--bad)'):undefined)})});
    if(narrow)b+=arrow(P+30,4+hl+2,P+30,ry-2,'var(--ink)');else b+=arrow(P+colW+2,30,rx-2,30,'var(--ink)');
    const yv=Math.max(4+hl,ry+hr)+22;
    const v=c.ok?['3  Browser sends the POST,','and lets the page read the stream.']:['3  Browser blocks: the POST is never sent;','the page sees a CORS error, not the 400.'];
    b+=T(P,yv,v[0],{fs:11.5,w:600,fill:c.ok?'var(--good)':'var(--bad)'})+T(P,yv+15,v[1],{fs:11.5,w:600,fill:c.ok?'var(--good)':'var(--bad)'});
    return RD.svg(w,yv+22,b,'CORS preflight to the Claude API, measured');
  });
  const cs=document.getElementById('co-seg');if(cs&&coDraw)RD.seg(cs,m=>{coM=+m;coDraw()});

  // ---------- the cookie line ----------
  const ck=document.getElementById('ck-line');
  if(ck){const L='set-cookie: __cf_bm=<redacted>; HttpOnly; SameSite=None; Secure; Path=/; Domain=api.openai.com; Expires=<date>';
    ck.innerHTML=esc(L).replace(/(HttpOnly|SameSite=None|Secure|Path=\/|Domain=api\.openai\.com|Expires=&lt;date&gt;)/g,'<span class="att">$1</span>')}

  // ---------- QUIC stream map, from the recorded HTTP/3 connection ----------
  set('qs-svg',w=>{
    const F=D.h3.frames,narrow=w<560;
    const ROWS=[[0,'stream 0: request 1'],[4,'stream 4: request 2'],[8,'stream 8: request 3'],[12,'stream 12: request 4'],[2,'2: client control'],[6,'6: client QPACK encoder'],[10,'10: client QPACK decoder'],[3,'3: server control'],[7,'7: server QPACK encoder'],[11,'11: server QPACK decoder']];
    const L=narrow?Math.min(150,w*0.42):170,R=8,tmax=Math.ceil(Math.max(...F.map(f=>f.t))/100)*100,x=t=>L+(w-L-R)*t/tmax,rh=narrow?20:19;
    const col=ty=>ty==='HEADERS'?'var(--c4)':ty==='DATA'?'var(--c1)':ty==='QPACK instructions'?'var(--c3)':'var(--c5)';
    let b='',y=8;
    const leg=[['HEADERS','var(--c4)'],['DATA','var(--c1)'],['QPACK','var(--c3)'],['type, SETTINGS','var(--c5)']];let lx=4;
    leg.forEach(([n,c])=>{b+='<rect x="'+lx+'" y="'+y+'" width="9" height="9" fill="'+c+'"/>'+T(lx+12,y+8,n,{fs:10.5});lx+=n.length*6+26});
    y+=20;
    ROWS.forEach(([s,lab],k)=>{if(k===4){b+='<line x1="4" x2="'+(w-R)+'" y1="'+(y+1)+'" y2="'+(y+1)+'" stroke="var(--line)"/>';y+=6}
      b+=T(4,y+rh/2+4,esc(narrow?lab.replace('client ','c. ').replace('server ','s. ').replace('QPACK ',''):lab),{fs:10.5,fill:k<4?'var(--ink)':'var(--mute)'});
      b+='<line x1="'+L+'" x2="'+(w-R)+'" y1="'+(y+rh/2)+'" y2="'+(y+rh/2)+'" stroke="var(--line)"/>';
      F.filter(f=>f.stream===s).forEach(f=>{const hh=f.dir==='out'?-1:1;b+='<rect x="'+(x(f.t)-2)+'" y="'+(y+rh/2+(hh<0?-7:0))+'" width="4" height="7" fill="'+col(f.type)+'"/>'});
      y+=rh});
    [0,0.5,1].forEach(p=>{const t=tmax*p;b+=T(x(t),y+12,Math.round(t)+' ms',{a:p===0?'start':p===1?'end':'middle',fs:10,fill:'var(--mute)'})});
    b+=T(4,y+26,narrow?'above each line: client; below: server':'above each line: client sent; below: server sent',{fs:10.5,fill:'var(--mute)'});
    return RD.svg(w,y+32,b,'HTTP/3 frames by QUIC stream over time');
  });

  // ---------- retry safety along one POST's life ----------
  set('rs-svg',w=>{
    const P=6,narrow=w<620;
    const ST=[['Connect, TLS','connection refused, DNS or TLS failure','safe'],['Request sent','REFUSED_STREAM, stream above GOAWAY, 425, 429 or 503 + Retry-After','safe'],
      ['Server working','reset, read timeout, 502 or 504 after the request left','unknown'],['Head sent (200)','error event in the stream, cut stream','partial'],['Tokens done','success','done']];
    const C={safe:'var(--good)',unknown:'var(--bad)',partial:'var(--c5)',done:'var(--mute)'};
    const V={safe:'retry: safe',unknown:'retry only with an idempotency key',partial:'partly done: new request',done:''};
    let b='';
    if(!narrow){const n=ST.length,g=6,bw=(w-2*P-g*(n-1))/n;
      ST.forEach((s,i)=>{const x=P+i*(bw+g);b+=box(x,6,bw,26,{fill:'var(--soft)'});b+=T(x+bw/2,23,esc(s[0]),{a:'middle',fs:11,w:600});
        if(i<n-1)b+=arrow(x+bw-4,19,x+bw+g+4,19,'var(--ink)');
        if(s[2]==='done')return;
        const words=s[1].split(' ');const lines=[];let cur='';words.forEach(wd=>{if((cur+' '+wd).trim().length*5.9>bw-6){lines.push(cur);cur=wd}else cur=(cur+' '+wd).trim()});lines.push(cur);
        b+='<rect x="'+x+'" y="40" width="'+bw+'" height="4" fill="'+C[s[2]]+'"/>';
        lines.forEach((l,j)=>{b+=T(x+2,58+j*13,esc(l),{fs:10.5})});
        const vl=V[s[2]].length*6>bw-4?[V[s[2]].split(' with ')[0],'with '+V[s[2]].split(' with ')[1]]:[V[s[2]]];
        vl.forEach((l,j)=>{b+=T(x+2,58+lines.length*13+4+j*13,esc(l),{fs:10.5,w:600,fill:C[s[2]]})});});
      return RD.svg(w,124,b,'Where a failure happens in a POST and whether it may be retried')}
    let y=4;const bw=w-2*P;
    ST.forEach((s,i)=>{const words=s[1].split(' ');const lines=[];let cur='';words.forEach(wd=>{if((cur+' '+wd).trim().length*6.3>bw-16){lines.push(cur);cur=wd}else cur=(cur+' '+wd).trim()});lines.push(cur);
      const h=s[2]==='done'?24:26+lines.length*12;b+=box(P,y,bw,h,{stroke:C[s[2]]});b+=T(P+8,y+16,esc(s[0]),{fs:11.5,w:600});
      if(s[2]!=='done'){
        lines.forEach((l,j)=>{b+=T(P+8,y+31+j*12,esc(l),{fs:10.5})});b+=T(w-P-8,y+16,esc(V[s[2]]).replace('retry only with an idempotency key','needs idempotency key'),{a:'end',fs:10.5,w:600,fill:C[s[2]]})}
      if(i<ST.length-1)b+=arrow(P+20,y+h+1,P+20,y+h+11,'var(--ink)');y+=h+12});
    return RD.svg(w,y,b,'Where a failure happens in a POST and whether it may be retried');
  });
})();
