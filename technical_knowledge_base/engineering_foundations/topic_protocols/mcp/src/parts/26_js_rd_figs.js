// ---- Reading: static figures drawn on 2026-10-24 (hero roles and loop, envelope before/after, anatomy of a tool,
// the two transports, token passthrough before/after, the trust map). Drawn at the measured width; nothing moves. ----
(function(){
  if(!document.getElementById('hr-svg'))return;
  const D=window.MCPD,esc=RD.esc,T=RD.t;
  const box=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+(o.rx||7)+'" fill="'+(o.fill||'var(--soft)')+'" stroke="'+(o.stroke||'var(--line)')+'" stroke-width="'+(o.sw||1)+'"'+(o.dash?' stroke-dasharray="4 3"':'')+'/>'};
  const arrow=(x1,y1,x2,y2,col,dash,sw)=>{const a=Math.atan2(y2-y1,x2-x1),L=7;
    return '<line x1="'+x1+'" y1="'+y1+'" x2="'+(x2-Math.cos(a)*5)+'" y2="'+(y2-Math.sin(a)*5)+'" stroke="'+(col||'var(--mute)')+'" stroke-width="'+(sw||1.5)+'"'+(dash?' stroke-dasharray="4 3"':'')+'/>'+
      '<path d="M'+x2+' '+y2+' L'+(x2-L*Math.cos(a-0.45))+' '+(y2-L*Math.sin(a-0.45))+' L'+(x2-L*Math.cos(a+0.45))+' '+(y2-L*Math.sin(a+0.45))+' z" fill="'+(col||'var(--mute)')+'"/>'};
  const badge=(x,y,n,col)=>'<circle cx="'+x+'" cy="'+y+'" r="8" fill="'+(col||'var(--acc)')+'"/>'+T(x,y+4,String(n),{a:'middle',fs:11,w:700,fill:'var(--bg)'});
  // wrap text to lines of at most n characters
  const wrap=(s,n)=>{const out=[];let l='';s.split(' ').forEach(w=>{if((l+' '+w).trim().length>n&&l){out.push(l);l=w}else l=(l+' '+w).trim()});if(l)out.push(l);return out};
  const lines=(x,y,arr,o)=>arr.map((s,i)=>T(x,y+i*(o.lh||14),esc(s),o)).join('');
  const set=(id,f)=>{const el=document.getElementById(id);if(!el)return;const draw=()=>{el.innerHTML=f(RD.width(el))};draw();RD.onRender(draw);RD.onResize(draw)};
  const CH=6.1; // approximate width of one 11 px character

  // ---------- hero: roles and the loop ----------
  set('hr-svg',W=>{
    const P=6,nw=W<560,cw=(W-2*P-14)/2,xl=P,xr=P+cw+14,mid=W/2;let b='';
    let y=4;
    b+=box(P,y,W-2*P,40);
    b+=T(P+10,y+17,'Model API',{fs:12,w:600});
    b+=T(P+10,y+32,esc(nw?'its own tool format; never MCP':'its own tool format (tool list in, tool_use out); it never speaks MCP'),{fs:11,fill:'var(--mute)'});
    y+=40;
    const ga=40,ax1=W*0.3,ax2=W*0.7;
    b+=arrow(ax1,y+2,ax1,y+ga-2,'var(--mute)');b+=badge(ax1-32,y+ga/2,1,'var(--mute)');
    b+=T(ax1+8,y+ga/2-2,'tool list',{fs:11,fill:'var(--mute)'});b+=T(ax1+8,y+ga/2+11,'and results',{fs:11,fill:'var(--mute)'});b+=badge(ax1-13,y+ga/2,4,'var(--mute)');
    b+=arrow(ax2,y+ga-2,ax2,y+2,'var(--mute)');b+=badge(ax2-14,y+ga/2,2,'var(--mute)');b+=T(ax2+8,y+ga/2+4,'tool_use',{fs:11,fill:'var(--mute)'});
    y+=ga;
    const hh=104;
    b+=box(P,y,W-2*P,hh,{fill:'var(--bg)',stroke:'var(--ink)',sw:1.2});
    b+=T(P+10,y+17,esc(nw?'Host (Claude Code, an IDE, your agent)':'Host: Claude Code, an IDE, your own agent'),{fs:12,w:600});
    b+=badge(P+18,y+36,3);
    b+=T(P+32,y+40,esc(nw?'policy, consent, tool list':'policy and consent: which tools the model sees, what needs a yes'),{fs:11});
    const cy=y+54,cbw=Math.min(150,cw-20);
    [[xl,'Client 1'],[xr,'Client 2']].forEach(([x,n])=>{const bx=x+cw/2-cbw/2;b+=box(bx,cy,cbw,38,{fill:'var(--acc2)',stroke:'var(--acc)'});b+=T(x+cw/2,cy+16,n,{a:'middle',fs:11.5,w:600});b+=T(x+cw/2,cy+31,'one per server',{a:'middle',fs:11,fill:'var(--mute)'})});
    y+=hh;
    const gs=46;
    [[xl,nw?'stdio':'JSON-RPC over stdio'],[xr,nw?'HTTP':'JSON-RPC over Streamable HTTP']].forEach(([x,l])=>{const cx=x+cw/2;
      b+=arrow(cx-8,y+2,cx-8,y+gs-2,'var(--acc)',false,2);b+=arrow(cx+8,y+gs-2,cx+8,y+2,'var(--acc)',false,2);
      b+=T(cx+18,y+gs/2+4,esc(l),{fs:11,fill:'var(--acc)',w:600})});
    y+=gs;
    const sh=118;
    const srv=(x,title,sub,last)=>{let s=box(x,y,cw,sh,{stroke:'var(--acc)'});
      s+=T(x+8,y+16,esc(title),{fs:11.5,w:600});s+=T(x+8,y+31,esc(sub),{fs:11,fill:'var(--mute)'});
      [['tools','the model decides'],['resources','the app decides'],['prompts','the user decides']].forEach(([k,v],i)=>{s+=T(x+8,y+52+i*16,k,{fs:11,w:600,fill:'var(--acc)'});s+=T(x+8+(nw?62:70),y+52+i*16,esc(nw?v.replace('the ',''):v),{fs:11})});
      s+=T(x+8,y+sh-10,esc(last),{fs:11,fill:'var(--mute)'});return s};
    b+=srv(xl,nw?'Local server':'Local server (child process)',nw?'a child process':'e.g. a code editor\'s tools',nw?'user\'s rights, env creds':'runs with the user\'s rights');
    b+=srv(xr,nw?'Remote: ckpt-tools':'Remote server: ckpt-tools',nw?'a web service':'an ordinary web service, many replicas',nw?'OAuth resource server':'an OAuth resource server');
    y+=sh;
    const ah=40,abh=40;
    b+=arrow(xr+cw/2,y+ah-2,xr+cw/2,y+2,'var(--mute)');b+=T(xr+cw/2+8,y+ah/2+4,esc(nw?'token for it':'token, aud = this server'),{fs:11,fill:'var(--mute)'});
    b+=T(xl+8,y+ah/2+4,esc(nw?'no auth protocol':'credentials from the environment'),{fs:11,fill:'var(--mute)'});
    y+=ah;
    b+=box(xr,y,cw,abh);b+=T(xr+8,y+16,esc(nw?'Authorization server':'Authorization server (OAuth)'),{fs:11.5,w:600});b+=T(xr+8,y+31,esc(nw?'your identity provider':'your identity provider issues tokens'),{fs:11,fill:'var(--mute)'});
    y+=abh+4;
    return RD.svg(W,y,b,'MCP roles: the model API, a host with one client per server, a local stdio server, a remote HTTP server and its authorization server');
  });

  // ---------- section 2: the envelope before and after ----------
  set('env-svg',W=>{
    const leg=D.tr.find(r=>r.name.indexOf('stdio, legacy')===0),mod=D.tr.find(r=>r.name.indexOf('stdio, 2026-07-28')===0);
    const nw=W<520,lw=nw?96:150,P=4,bw=W-lw-P-60,mx=Math.max(mod.down,leg.down),sc=bw/mx;let b='',y=6;
    const rows=[[nw?'old request':'2025-11-25 request',leg.up,0],[nw?'new request':'2026-07-28 request',mod.up,mod.up-leg.up],[nw?'old result':'2025-11-25 result',leg.down,0],[nw?'new result':'2026-07-28 result',mod.down,mod.down-leg.down]];
    rows.forEach(([l,v,extra],i)=>{const yy=y+i*28+(i>=2?10:0);
      b+=T(P,yy+15,esc(l),{fs:11});
      const base=v-extra;b+='<rect x="'+lw+'" y="'+(yy+3)+'" width="'+(base*sc)+'" height="16" rx="3" fill="var(--dim)"/>';
      if(extra)b+='<rect x="'+(lw+base*sc)+'" y="'+(yy+3)+'" width="'+(extra*sc)+'" height="16" rx="3" fill="var(--acc)"/>';
      b+=T(lw+v*sc+6,yy+15,v+' B',{fs:11,w:600});
      if(extra&&!nw)b+=T(lw+base*sc+4,yy+15,'+'+extra+(i===1?' _meta':' resultType, serverInfo'),{fs:11,fill:'var(--bg)',w:600});
      if(extra&&nw)b+=T(lw+base*sc+4,yy+15,'+'+extra,{fs:11,fill:'var(--bg)',w:600});
    });
    const h=y+4*28+16;
    return RD.svg(W,h,b,'Bytes of one tools/call request and result under 2025-11-25 and 2026-07-28');
  });

  // ---------- section 3: anatomy of a tool ----------
  set('tl-svg',W=>{
    const P=4,two=W>=700,cw=two?(W-2*P-16)/2:W-2*P;let b='';
    const F=[['name','delete_checkpoint: unique only within this server; hosts prefix it by server'],
      ['description','the model\'s only manual; instructions hidden here are tool poisoning (section 8)'],
      ['inputSchema','JSON Schema, generated from the Python type hints'],
      ['annotations','destructiveHint, idempotentHint: claims, not guarantees']];
    const kw=92,n=Math.max(20,Math.floor((cw-kw-16)/CH));
    let y=4,h1=26;const rowsH=F.map(f=>Math.max(1,wrap(f[1],n).length)*14+10);h1+=rowsH.reduce((a,c)=>a+c,0)+4;
    b+=box(P,y,cw,h1,{stroke:'var(--acc)'});b+=T(P+8,y+17,esc('tools/list entry: what the model reads'),{fs:11.5,w:600});
    let yy=y+28;F.forEach((f,i)=>{b+=T(P+8,yy+12,f[0],{fs:11,w:600,fill:'var(--acc)'});b+=lines(P+8+kw,yy+12,wrap(f[1],n),{fs:11});yy+=rowsH[i]});
    const x2=two?P+cw+16:P,y2=two?4:y+h1+14;
    const R=[['content','the same data as text: what most hosts show the model'],['structuredContent','JSON matching outputSchema, for programs'],['isError','true for a failure the model should read and fix']];
    const n2=Math.max(20,Math.floor((cw-128-16)/CH));const rH=R.map(r=>wrap(r[1],n2).length*14+10);
    const h2=26+rH.reduce((a,c)=>a+c,0)+34;
    b+=box(x2,y2,cw,h2,{stroke:'var(--acc)'});b+=T(x2+8,y2+17,esc('tools/call result: what enters the context'),{fs:11.5,w:600});
    yy=y2+28;R.forEach((r,i)=>{b+=T(x2+8,yy+12,r[0],{fs:11,w:600,fill:'var(--acc)'});b+=lines(x2+8+128,yy+12,wrap(r[1],n2),{fs:11});yy+=rH[i]});
    b+=lines(x2+8,yy+14,wrap('measured: 818 bytes of result body for about 200 bytes of facts',Math.floor((cw-16)/CH)),{fs:11,fill:'var(--good)',w:600});
    const H=Math.max(y+h1,y2+h2)+4;
    return RD.svg(W,H,b,'Anatomy of an MCP tool definition and of a tool result');
  });

  // ---------- section 4: the two transports ----------
  set('tp-svg',W=>{
    const P=4,two=W>=720,pw=two?(W-2*P-16)/2:W-2*P,ph=pw<420?190:168;let b='';
    const pan=(x,y,title)=>box(x,y,pw,ph,{fill:'var(--bg)'})+T(x+8,y+17,esc(title),{fs:12,w:600});
    // stdio
    let x=P,y=4;b+=pan(x,y,'stdio: a child process');
    const bw=Math.min(110,pw*0.3);
    b+=box(x+8,y+32,bw,64,{fill:'var(--acc2)',stroke:'var(--acc)'});b+=T(x+8+bw/2,y+60,'Host',{a:'middle',fs:11.5,w:600});b+=T(x+8+bw/2,y+76,'(client)',{a:'middle',fs:11,fill:'var(--mute)'});
    const sx=x+pw-8-bw;b+=box(sx,y+32,bw,64,{stroke:'var(--acc)'});b+=T(sx+bw/2,y+60,'Server',{a:'middle',fs:11.5,w:600});b+=T(sx+bw/2,y+76,'process',{a:'middle',fs:11,fill:'var(--mute)'});
    b+=arrow(x+8+bw+2,y+50,sx-2,y+50,'var(--acc)',false,2);b+=T((x+8+bw+sx)/2,y+45,'stdin',{a:'middle',fs:11,fill:'var(--acc)',w:600});
    b+=arrow(sx-2,y+80,x+8+bw+2,y+80,'var(--acc)',false,2);b+=T((x+8+bw+sx)/2,y+75,'stdout',{a:'middle',fs:11,fill:'var(--acc)',w:600});
    b+=arrow(sx+bw/2,y+97,sx+bw/2,y+114,'var(--mute)',true);b+=T(sx+bw/2,y+126,'stderr: logs',{a:'middle',fs:11,fill:'var(--mute)'});
    b+=lines(x+8,y+122,wrap('one JSON-RPC message per line; stdout carries only MCP',Math.floor((sx-x-16)/CH)),{fs:11});
    b+=T(x+8,y+ph-10,esc(pw<380?'no port, no auth: the user\'s rights':'no port, no auth: the user\'s rights and environment'),{fs:11,fill:'var(--mute)'});
    // HTTP
    x=two?P+pw+16:P;y=two?4:4+ph+12;b+=pan(x,y,'Streamable HTTP: one POST per message');
    const w3=Math.min(96,(pw-40)/3),g=(pw-16-3*w3)/2;
    const bx=[x+8,x+8+w3+g,x+8+2*(w3+g)];
    [['Client',''],['Gateway','reads headers'],['Server','/mcp']].forEach(([n,s],k)=>{b+=box(bx[k],y+32,w3,48,k===1?{}:{fill:k===0?'var(--acc2)':'var(--soft)',stroke:'var(--acc)'});b+=T(bx[k]+w3/2,y+52,n,{a:'middle',fs:11.5,w:600});if(s)b+=T(bx[k]+w3/2,y+68,s,{a:'middle',fs:11,fill:'var(--mute)'})});
    b+=arrow(bx[0]+w3+2,y+46,bx[1]-2,y+46,'var(--acc)',false,2);b+=arrow(bx[1]+w3+2,y+46,bx[2]-2,y+46,'var(--acc)',false,2);
    b+=arrow(bx[2]-2,y+68,bx[1]+w3+2,y+68,'var(--acc)',true);b+=arrow(bx[1]-2,y+68,bx[0]+w3+2,y+68,'var(--acc)',true);
    const n=Math.floor((pw-16)/CH);
    const l1=wrap('POST carries MCP-Protocol-Version, Mcp-Method, Mcp-Name: route and block by tool without parsing JSON',n),l2=wrap('reply: one JSON object, or an SSE stream for this request (progress, then the result)',n);
    b+=lines(x+8,y+98,l1,{fs:11});b+=lines(x+8,y+98+l1.length*14+6,l2,{fs:11,fill:'var(--mute)'});
    const H=(two?4+ph:4+2*ph+12)+4;
    return RD.svg(W,H,b,'The stdio and Streamable HTTP transports');
  });

  // ---------- section 7: token passthrough against the server's own upstream token ----------
  set('pt-svg',W=>{
    const P=4,nw=W<560,rowH=nw?118:96;let b='';
    const w3=Math.min(120,(W-2*P-40)/3),g=(W-2*P-3*w3)/2,bx=[P,P+w3+g,P+2*(w3+g)];
    const chip=(cx,y,t,col)=>{const w=t.length*CH+12;return '<rect x="'+(cx-w/2)+'" y="'+(y-12)+'" width="'+w+'" height="17" rx="8" fill="var(--bg)" stroke="'+col+'"/>'+T(cx,y+1,esc(t),{a:'middle',fs:11,fill:col,w:600})};
    [['Token passthrough (forbidden)','var(--bad)','aud: MCP','aud: MCP',nw?'wrong audience; logs show the wrong caller':'wrong audience; the upstream logs and rate-limits the wrong caller'],
     ['The server\'s own token (required)','var(--good)','aud: MCP','aud: upstream',nw?'token exchange (RFC 8693) or its own credentials':'via token exchange (RFC 8693) or the server\'s own credentials']].forEach((r,i)=>{
      const y=4+i*rowH;b+=T(P,y+14,esc(r[0]),{fs:12,w:600,fill:r[1]});
      const by=y+38;
      [['Client'],['MCP server'],['Upstream API']].forEach((n,k)=>{b+=box(bx[k],by,w3,30,{stroke:k===1?'var(--acc)':'var(--line)'});b+=T(bx[k]+w3/2,by+19,n[0],{a:'middle',fs:11.5,w:600})});
      b+=arrow(bx[0]+w3+2,by+15,bx[1]-2,by+15,'var(--ink)');b+=arrow(bx[1]+w3+2,by+15,bx[2]-2,by+15,r[1],false,2);
      b+=chip((bx[0]+w3+bx[1])/2,by-4,r[2],'var(--ink)');b+=chip((bx[1]+w3+bx[2])/2,by-4,r[3],r[1]);
      b+=lines(P,by+48,wrap(r[4],Math.floor((W-2*P)/CH)),{fs:11,fill:r[1]});
    });
    return RD.svg(W,4+2*rowH,b,'Token passthrough compared with the MCP server getting its own token for the upstream API');
  });

  // ---------- section 8: where trust breaks ----------
  set('sc-svg',W=>{
    const P=4,nw=W<560,cw=(W-2*P-14)/2,xl=P,xr=P+cw+14;let b='',y=4;
    const RED='var(--bad)';
    b+=box(P,y,W-2*P,34,{fill:'var(--bg)',stroke:'var(--ink)'});b+=T(P+10,y+21,esc(nw?'Host and its clients (the model behind it)':'Host and its clients, with the model behind it: the decisions live here'),{fs:11.5,w:600});
    y+=34;
    const g=44;[xl,xr].forEach(x=>{b+=arrow(x+cw/2-8,y+2,x+cw/2-8,y+g-2,'var(--acc)',false,2);b+=arrow(x+cw/2+8,y+g-2,x+cw/2+8,y+2,'var(--acc)',false,2)});
    b+=badge(xr+cw/2+26,y+g/2,4,RED);b+=badge(xr+cw/2-26,y+g/2,5,RED);
    y+=g;
    const sh=50;
    b+=box(xl,y,cw,sh,{stroke:'var(--acc)'});b+=T(xl+8,y+19,esc(nw?'Local server':'Local server (stdio or localhost)'),{fs:11.5,w:600});b+=T(xl+8,y+36,esc(nw?'code you run':'code running with your rights'),{fs:11,fill:'var(--mute)'});
    b+=box(xr,y,cw,sh,{stroke:'var(--acc)'});b+=T(xr+8,y+19,esc('Remote server'),{fs:11.5,w:600});b+=T(xr+8,y+36,esc(nw?'tools it describes':'its tools, descriptions, metadata'),{fs:11,fill:'var(--mute)'});
    b+=badge(xl+cw-12,y+12,2,RED);b+=badge(xr+cw-12,y+12,2,RED);
    y+=sh;
    const g2=40;
    b+=arrow(xl+cw/2,y+g2-2,xl+cw/2,y+2,RED,true);b+=badge(xl+cw/2+16,y+g2/2,3,RED);
    b+=arrow(xr+cw/2,y+g2-2,xr+cw/2,y+2,RED,true);b+=badge(xr+cw/2+16,y+g2/2,1,RED);
    y+=g2;
    b+=box(xl,y,cw,34,{dash:true});b+=T(xl+8,y+21,esc(nw?'A web page in the browser':'A web page in the user\'s browser'),{fs:11});
    b+=box(xr,y,cw,34,{dash:true});b+=T(xr+8,y+21,esc(nw?'Content a tool reads':'Content a tool reads (page, issue, email)'),{fs:11});
    y+=46;
    const L=[[1,'content a tool reads: injection; scope tools, confirm actions'],[2,'the server: poisoned or changed tools; annotations untrusted, re-check'],[3,'a browser page: localhost and rebinding; Origin, Host, 127.0.0.1'],[4,'a hostile server: OAuth URLs; https only, no shell, issuer check'],[5,'a hostile client or proxy: confused deputy, passthrough, forged state']];
    const n=Math.floor((W-2*P-24)/CH);
    L.forEach(([k,t])=>{const ls=wrap(t,n);b+=badge(P+9,y+4,k,RED);b+=lines(P+24,y+8,ls,{fs:11});y+=ls.length*14+8});
    return RD.svg(W,y,b,'Map of the five attacker positions on the MCP architecture, each with its control');
  });
})();
