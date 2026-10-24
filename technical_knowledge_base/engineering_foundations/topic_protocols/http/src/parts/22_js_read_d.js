// ---- Reading: proxy rewrite diff, smuggling picture and probes, timeout runs, SDK retries, public hosts ----
(function(){
  const D=window.HD,esc=RD.esc,T=RD.t;

  // ---------- what a proxy changes ----------
  const P=D.proxy.cases,seg=document.getElementById('rd-px-seg');
  const SHORT=['Direct (no proxy)','nginx defaults, HTTP/1.1 in','nginx defaults, HTTP/2 in','nginx API settings, HTTP/1.1 in','nginx API settings, HTTP/2 in'];
  seg.innerHTML=P.map((c,i)=>i?'<button data-m="'+i+'"'+(i===2?' class="on"':'')+'>'+SHORT[i]+'</button>':'').join('');
  const NOTE=['',
    'nginx with only <code>proxy_pass</code>: Host becomes the upstream address, Content-Length moves up, the rest is copied. Same HTTP version both sides here.',
    'The client spoke HTTP/2 (pseudo-headers, lower-case names); the backend got HTTP/1.1 with a Host line rebuilt from <code>proxy_host</code>. No Connection header: nginx 1.29.7 and later no longer send <code>Connection: close</code> upstream.',
    'With <code>proxy_set_header Host $host</code> and the forwarded headers: Host is the name the client used minus its port, and X-Forwarded-For / X-Forwarded-Proto carry the client address and scheme.',
    'The usual settings with HTTP/2 in front: the backend learns the original scheme (https) and host only because nginx was told to forward them.'];
  function headLines(raw){return raw.split('\r\n\r\n')[0].split('\r\n')}
  function px(i){
    const c=P[+i],sent=c.client.sent_head.slice(),got=headLines(c.backend_received);
    const norm=l=>l.toLowerCase().replace(/\s+/g,' ');const sentSet=new Set(sent.map(norm)),gotSet=new Set(got.map(norm));
    const nameOf=l=>l.split(':')[0].toLowerCase();const sentNames=new Set(sent.map(nameOf)),gotNames=new Set(got.map(nameOf));
    document.getElementById('rd-px-a').innerHTML=sent.map(l=>'<span class="'+(gotSet.has(norm(l))?'':(gotNames.has(nameOf(l))?'chg':'del'))+'">'+esc(l)+'</span>').join('\n');
    document.getElementById('rd-px-b').innerHTML=got.map(l=>'<span class="'+(sentSet.has(norm(l))?'':(sentNames.has(nameOf(l))?'chg':'add'))+'">'+esc(l)+'</span>').join('\n');
    document.getElementById('rd-px-note').innerHTML=NOTE[+i]+' <span class="small mute">Yellow: changed; green: added; struck out: not passed on. Body (117 bytes) identical in every case. <span class="meas">measured</span> curl 8.7.1 to nginx 1.31.6, '+esc(D.proxy.recorded)+'.</span>';
  }
  RD.seg(seg,px);px(2);

  // ---------- smuggling picture ----------
  const sm=document.getElementById('rd-sm-svg');
  function drawSm(){
    const w=RD.width(sm),parts=[['POST ... Content-Length: 4, Transfer-Encoding: chunked',0,'head'],['0\\r\\n\\r\\n',1,'body'],['GET /smuggled HTTP/1.1 ...',2,'next']];
    const segs=[{t:'head (both headers)',n:5,c:'var(--dim)'},{t:'0 CR LF CR LF',n:2,c:'var(--c5)'},{t:'GET /smuggled ...',n:4,c:'var(--bad)'}];
    const tot=11,L=8,R=8,u=(w-L-R)/tot;let x=L,b='';
    b+=T(L,12,'The bytes on the connection',{fs:11.5,w:600});
    segs.forEach(s=>{b+='<rect x="'+x+'" y="18" width="'+(s.n*u-2)+'" height="22" rx="3" fill="'+s.c+'" opacity=".85"/>'+T(x+4,33,s.t,{fs:10.5,fill:'var(--bg)'});x+=s.n*u});
    const brace=(y,from,to,lab,col)=>{b+='<path d="M'+(L+from*u)+' '+y+' v6 H'+(L+to*u-2)+' v-6" fill="none" stroke="'+col+'" stroke-width="2"/>'+T(L+from*u,y+20,lab,{fs:11,fill:col})};
    brace(46,0,7,w<560?'Content-Length parser: one request':'Content-Length parser: one request (body = the 4 bytes "0\\r\\n\\r\\n")','var(--c1)');
    brace(78,0,7,w<560?'chunked parser: request 1':'chunked parser: request 1 ends after the empty chunk ...','var(--c3)');
    brace(78,7,11,w<560?'request 2':'... request 2','var(--bad)');
    sm.innerHTML=RD.svg(w,104,b,'Two parsers split the same bytes differently');
  }
  drawSm();RD.onResize(drawSm);

  // ---------- ambiguous messages table ----------
  const st=a=>a&&a.length?a.map(s=>s.replace(/^HTTP\/1\.1 /,'').trim()).join(', then '):'(no answer)';
  const rows=D.amb.probes.map(p=>{
    if(p.nginx_h2)return '<tr><td>'+esc(p.what)+'</td><td>'+esc(p.nginx_h2.status||'reset')+(p.nginx_h2.backend_received.length?'; forwarded':'; nothing forwarded')+'</td><td class="mute">(HTTP/2 to nginx only)</td></tr>';
    const fw=p.nginx.backend_received.length;
    return '<tr><td>'+esc(p.what)+'</td><td>'+esc(st(p.nginx.status_lines))+'; '+(fw?fw+' request'+(fw>1?'s':'')+' forwarded':'nothing forwarded')+'</td><td>'+esc(st(p.hypercorn.status_lines))+'</td></tr>'});
  document.getElementById('rd-amb').innerHTML='<thead><tr><th>Message sent</th><th>nginx 1.31.6</th><th>hypercorn 0.18.0 (h11)</th></tr></thead><tbody>'+rows.join('')+'</tbody>';

  // ---------- timeouts measured ----------
  const tr=D.timeouts.cases.map(c=>{
    if(c.httpx)return '<tr><td>'+esc(c.label)+'</td><td>'+(c.httpx.error?'<span class="pill bad">'+esc(c.httpx.error)+'</span>':'<span class="pill ok">complete</span>')+'</td><td class="num">'+c.httpx.seconds.toFixed(2)+' s</td><td class="num">'+c.httpx.tokens+'</td><td>httpx</td></tr>';
    const r=c.curl,ok=r.exit===0&&r.http==='200';
    return '<tr><td>'+esc(c.label)+'</td><td>'+(ok?'<span class="pill ok">complete</span>':'<span class="pill bad">'+(r.http!=='200'?'HTTP '+esc(r.http):'cut, curl exit '+r.exit)+'</span>')+(r.pings?' <span class="small mute">'+r.pings+' pings</span>':'')+'</td><td class="num">'+r.seconds.toFixed(2)+' s</td><td class="num">'+(r.tokens===undefined?'-':r.tokens)+'</td><td>curl</td></tr>'});
  document.getElementById('rd-tmeas').innerHTML='<thead><tr><th>Case</th><th>Result</th><th class="num">Ended after</th><th class="num">Tokens</th><th>Client</th></tr></thead><tbody>'+tr.join('')+'</tbody>';

  // ---------- SDK retries, every attempt the server saw ----------
  const R=D.sdk.cases,re=document.getElementById('rd-retry');
  const LBL={ok:'success',
    '529x2':'529 twice, then success','503x2':'503 twice, then success','429_retry_after_1':'429 with Retry-After: 1, then success','500x5':'500 every time','400x1':'400 (client error)',read_timeout:'read timeout (1 s limit, 2.5 s server)',connection_dropped:'connection closed after the request'};
  const rel=c=>{const t0=c.server_saw.length?c.server_saw[0].t:0;return c.server_saw.map(a=>a.t-t0)};
  function drawRetry(){
    const mx=Math.max(...R.map(c=>Math.max(0,...rel(c)))),tmax=Math.ceil(mx*2)/2,w=RD.width(re),L=8,R2=22,x=t=>L+(w-L-R2)*Math.min(t,tmax)/tmax;let b='',y=14;
    const cases=['ok','529x2','429_retry_after_1','500x5','400x1','read_timeout','connection_dropped'];
    b+='<circle cx="'+(L+4)+'" cy="6" r="4" fill="var(--c1)"/>'+T(L+12,10,'anthropic',{fs:10.5})+'<circle cx="'+(L+84)+'" cy="6" r="4" fill="var(--c2)"/>'+T(L+92,10,'openai',{fs:10.5})+T(w-2,10,'attempts',{a:'end',fs:10,fill:'var(--mute)'});
    y=22;
    cases.forEach(cn=>{const a=R.find(c=>c.sdk==='anthropic'&&c.case===cn),o=R.find(c=>c.sdk==='openai'&&(c.case===cn||(cn==='529x2'&&c.case==='503x2')));
      b+=T(L,y+10,(LBL[cn]||cn)+(cn==='529x2'?' (OpenAI run: 503)':''),{fs:11});y+=14;
      [[a,'var(--c1)',y+5],[o,'var(--c2)',y+14]].forEach(([c,col,yy])=>{if(!c)return;rel(c).forEach(t=>{b+='<circle cx="'+x(t)+'" cy="'+yy+'" r="4" fill="'+col+'"/>'});
        b+=T(w-2,yy+4,String(c.server_saw.length),{a:'end',fs:10.5,fill:col,w:600})});
      b+='<line x1="'+L+'" x2="'+(w-R2)+'" y1="'+(y+21)+'" y2="'+(y+21)+'" stroke="var(--line)"/>';y+=26});
    const ticks=Math.round(tmax*2);for(let k=0;k<=ticks;k++){if(w<520&&k%2)continue;const t=k/2;b+=T(x(t),y+12,t+' s',{a:'middle',fs:10,fill:'var(--mute)'})}
    re.innerHTML=RD.svg(w,y+18,b,'Attempts received by the server per SDK and failure');
  }
  drawRetry();RD.onResize(drawRetry);

  // ---------- public hosts ----------
  const blocks=D.public.split('### ').filter(Boolean).map(bl=>{const L=bl.split('\n');const host=(L[0].match(/https:\/\/([^/]+)/)||[])[1];
    const g=k=>{const l=L.find(x=>x.toLowerCase().startsWith('< '+k+':'));return l?l.slice(k.length+3).trim():''};
    const st=(L.find(x=>/^< HTTP\//.test(x))||'').slice(2).trim();const alpn=(L.find(x=>/server accepted/.test(x))||'').split('accepted ')[1]||'';
    const fb=(L.find(x=>/first-byte/.test(x))||'').split('first-byte ')[1]||'';
    return '<tr><td><code>'+esc(host)+'</code></td><td>'+esc(alpn)+'</td><td>'+esc(st)+'</td><td>'+esc(g('server'))+'</td><td>'+esc(g('alt-svc')||'(none)')+'</td><td>'+esc(g('x-should-retry')||'')+'</td><td class="num">'+esc(fb)+'</td></tr>'});
  document.getElementById('rd-pub').innerHTML='<thead><tr><th>Host</th><th>ALPN</th><th>Status</th><th>server</th><th>alt-svc</th><th>x-should-retry</th><th class="num">First byte</th></tr></thead><tbody>'+blocks.join('')+'</tbody>';
})();
