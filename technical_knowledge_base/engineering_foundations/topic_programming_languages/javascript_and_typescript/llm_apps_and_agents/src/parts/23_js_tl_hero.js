// ---- the hero diagram (section 0): an LLM app's parts and where zod checks the model's JSON. Static; two layouts by width ----
(function(){
  const el=document.getElementById('tl-hero');if(!el||!window.RD)return;
  const esc=RD.esc;
  // node: [id, x, y, w, h, title, lines[], kind]  kind: '' normal, 'acc' the app's own code
  const WIDE={w:760,h:300,nodes:[
    ['b',10,24,130,64,'Browser',['fetch POST /ask','reads the SSE stream'],''],
    ['s',200,14,340,84,'Your server (Node or Bun)',['SDK: typed replies, 2 retries, timeout,','SSE parsing (1 to 3)','fetch hook logs every call (10)'],'acc'],
    ['m',612,24,138,64,'Model API',['POST /v1/messages','JSON or SSE events'],''],
    ['l',200,160,340,110,'Agent loop (4)',['call the model; stop_reason tool_use?','run the tools: Promise.all, timeout each','tool_result back, whole messages[]','resent every call (6); stop at maxSteps'],'acc'],
    ['t',612,146,138,52,'Tool function',['in your process'],''],
    ['p',612,214,138,64,'MCP server (8)',['separate process,','JSON-RPC: stdio or HTTP'],'']],
    // edge: [x1,y1,x2,y2,label,lx,ly,anchor,both ends]
    edges:[[140,48,200,48,'POST',170,42,'middle'],[200,68,140,68,'SSE',170,82,'middle'],[540,48,612,48,'POST (1)',576,26,'middle'],[612,68,540,68,'reply (3)',576,88,'middle'],
      [370,98,370,160,'tool_use, tool_result',378,132,'start',1],[540,172,612,172,'',0,0],[540,246,612,246,'',0,0]],
    notes:[[12,108,'tab closed: abort the'],[12,122,'model call (9)']],
    zod:[[576,44,'zod (5)'],[576,174,'zod (4)'],[576,240,'zod (8)']]};
  const NARROW={w:340,h:525,nodes:[
    ['b',90,8,160,48,'Browser',['fetch POST /ask'],''],
    ['s',10,96,320,76,'Your server (Node or Bun)',['SDK: typed replies, 2 retries,','timeout, SSE parsing (1 to 3)','logs every call (10)'],'acc'],
    ['m',90,214,160,48,'Model API',['POST /v1/messages'],''],
    ['l',10,300,320,94,'Agent loop (4)',['call; stop_reason tool_use?','run tools: Promise.all, timeouts','tool_result back; messages[] resent (6)'],'acc'],
    ['t',10,450,150,52,'Tool function',['in your process'],''],
    ['p',180,450,150,64,'MCP server (8)',['separate process,','JSON-RPC'],'']],
    edges:[[170,56,170,96,'POST; SSE back; abort (9)',178,80,'start',1],[170,172,170,214,'HTTPS POST; reply (1 to 3)',178,196,'start',1],
      [40,172,40,300,'loop',46,240,'start',1],[85,394,85,450,'',0,0,'',1],[255,394,255,450,'',0,0,'',1]],
    notes:[],
    zod:[[292,238,'zod (5)'],[85,422,'zod (4)'],[255,422,'zod (8)']]};
  function draw(){
    const W=RD.width(el),L=W<600?NARROW:WIDE,N={};
    let s='<defs><marker id="tl-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker></defs>';
    for(const n of L.nodes){const [id,x,y,w,h,t,lines,k]=n;N[id]=n;
      s+='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="8" fill="'+(k?'var(--acc2)':'var(--soft)')+'" stroke="'+(k?'var(--acc)':'var(--line)')+'"/>';
      s+=RD.t(x+w/2,y+17,esc(t),{a:'middle',fs:13,w:600,fill:'var(--ink)'});
      lines.forEach((ln,i)=>{s+=RD.t(x+w/2,y+33+i*14,esc(ln),{a:'middle',fs:11.5,fill:'var(--mute)'})});}
    for(const [x1,y1,x2,y2,lab,lx,ly,an,both] of L.edges){
      s+='<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="var(--mute)" stroke-width="1.4" marker-end="url(#tl-ar)"'+(both?' marker-start="url(#tl-ar)"':'')+'/>';
      if(lab)s+=RD.t(lx,ly,esc(lab),{a:an,fs:11,fill:'var(--ink)'})}
    for(const [x,y,t] of L.notes)s+=RD.t(x,y,esc(t),{fs:11,fill:'var(--acc)'});
    for(const [x,y,t] of L.zod){s+='<rect x="'+(x-30)+'" y="'+(y-11)+'" width="60" height="18" rx="9" fill="var(--bg)" stroke="var(--acc)" stroke-width="1.5"/>'+RD.t(x,y+2,t,{a:'middle',fs:11,w:600,fill:'var(--acc)'})}
    el.innerHTML=RD.svg(L.w,L.h,s,'Browser, your server with the SDK, the model API, the agent loop and its tools; zod checks tool arguments, structured output and MCP arguments');
    const svg=el.querySelector('svg');svg.setAttribute('width',Math.min(W,L.w));svg.removeAttribute('height');
  }
  draw();RD.onRender(draw);RD.onResize(draw);
})();
