// ---- fobs: static figures in the Reading tab: hero (the trace and its path), token accounting to scale (section 2),
// the Langfuse stack (section 4), the eval loop (section 9). Drawn at the measured width; nothing moves. ----
(function(){
  if(!document.getElementById('fobs-hero-svg'))return;
  const {D,fmt}=FOBSU,T=RD.t;
  const mk=id=>'<defs><marker id="'+id+'" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--mute)"/></marker></defs>';
  const arrow=(x1,y1,x2,y2,id)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="var(--mute)" stroke-width="1.4" marker-end="url(#'+id+')"/>';
  function box(x,y,w,h,title,sub,col,o){o=o||{};
    return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="6" fill="var(--bg)" stroke="'+(col||'var(--line)')+'" stroke-width="'+(o.sw||1.3)+'"/>'+
      T(x+w/2,y+(sub?h/2-3:h/2+4),title,{a:'middle',fs:12,w:600,fill:'var(--ink)'})+(sub?T(x+w/2,y+h/2+12,sub,{a:'middle',fs:11,fill:'var(--mute)'}):'')}

  // Hero: one trace (top) and where its spans go (bottom)
  function hero(){const el=document.getElementById('fobs-hero-svg'),w=Math.floor(RD.width(el)),wide=w>=640;
    const run=D.run,rows=[
      {d:0,n:'invoke_agent textstats-fixer',c:'var(--acc)',note:'user, session, outcome: sections 6 and 7'},
      {d:1,n:'chat Qwen3-4B (call 1, '+fmt(run[0].in)+' tokens in)',c:'var(--c1)',note:'model, tokens by kind: sections 2 and 6'},
      {d:1,n:'execute_tool list_files',c:'var(--c3)',note:'tool name; content opt-in: section 8'},
      {d:1,n:'... 12 more spans ...',c:null,note:''},
      {d:1,n:'chat Qwen3-4B (call 8, final answer)',c:'var(--c1)',note:''},
      {d:1,n:'score tests_pass = 1',c:'var(--c5)',note:'written back by an evaluator: section 9'}];
    let b=mk('fobs-hm'),y=8;const rh=wide?26:40;
    b+=T(4,y+8,'ONE TRACE (all spans share a trace id)',{fs:11,fill:'var(--mute)',w:600});y+=18;
    rows.forEach((r,i)=>{const x=10+r.d*18;
      if(r.d>0)b+='<path d="M'+(x-10)+','+(y-8)+' V'+(y+8)+' H'+(x-2)+'" fill="none" stroke="var(--line)" stroke-width="1.2"/>';
      if(r.c)b+='<rect x="'+x+'" y="'+(y+1)+'" width="8" height="12" rx="2" fill="'+r.c+'"/>';
      b+=T(x+(r.c?13:0),y+11,r.n,{fs:12,fill:r.c?'var(--ink)':'var(--mute)',w:r.d===0?600:null});
      if(r.note){if(wide){const nx=Math.round(w*0.53);b+='<line x1="'+(nx-8)+'" y1="'+(y+7)+'" x2="'+(nx-2)+'" y2="'+(y+7)+'" stroke="var(--line)"/>'+T(nx,y+11,r.note,{fs:11.5,fill:'var(--mute)'})}
        else b+=T(x+13,y+27,r.note,{fs:11,fill:'var(--mute)'})}
      y+=r.note||!wide?rh:24});
    y+=10;b+=T(4,y+8,'WHERE THE SPANS GO',{fs:11,fill:'var(--mute)',w:600});y+=18;
    const st=[['App + SDK','creates spans: 3'],['Collector','samples, redacts: 7, 8'],['Backend','stores, prices: 4 to 6'],['Evaluators','score, gate: 9']];
    if(wide){const g=26,bw=(w-8-3*g)/4,bh=46;
      st.forEach((s,i)=>{const x=4+i*(bw+g);b+=box(x,y,bw,bh,s[0],s[1],i===0?'var(--acc)':null);if(i<3)b+=arrow(x+bw+2,y+bh/2,x+bw+g-2,y+bh/2,'fobs-hm')});
      y+=bh+6}
    else{const g=14,bw=(w-8-g)/2,bh=44;
      st.forEach((s,i)=>{const x=4+(i%2)*(bw+g),yy=y+Math.floor(i/2)*(bh+22);b+=box(x,yy,bw,bh,s[0],s[1],i===0?'var(--acc)':null)});
      b+=arrow(4+bw+1,y+bh/2,4+bw+g-1,y+bh/2,'fobs-hm')+arrow(4+bw+g+bw/2,y+bh+2,4+bw/2+6,y+bh+20,'fobs-hm')+arrow(4+bw+1,y+bh+22+bh/2,4+bw+g-1,y+bh+22+bh/2,'fobs-hm');
      y+=2*bh+28}
    el.innerHTML=RD.svg(w,y,b,'An agent run as one trace tree, with what each span carries, and the path from SDK through collector and backend to evaluators')}

  // Section 2: the first Claude Code call's input tokens to scale
  function tok(){const el=document.getElementById('fobs-tok-svg');if(!el)return;const w=Math.floor(RD.width(el));
    const a=D.cc.spans.filter(s=>s[3]==='claude_code.llm_request')[0][7];
    const f=a.input_tokens,r=a.cache_read_tokens,c=a.cache_creation_tokens,tot=f+r+c,x0=6,W=w-12,sx=v=>v/tot*W;
    const wf=Math.max(3,sx(f)),wr=sx(r)-(wf-sx(f)),wc=sx(c);let b='';const y=40,h=24;
    b+='<rect x="'+x0+'" y="'+y+'" width="'+wf+'" height="'+h+'" fill="var(--c1)"/>';
    b+='<rect x="'+(x0+wf)+'" y="'+y+'" width="'+wr+'" height="'+h+'" fill="var(--c6)" opacity=".85"/>';
    b+='<rect x="'+(x0+wf+wr)+'" y="'+y+'" width="'+wc+'" height="'+h+'" fill="var(--c5)" opacity=".85"/>';
    b+=T(x0+wf+wr/2,y+16,'cache read '+fmt(r),{a:'middle',fs:11.5,fill:'var(--bg)',w:600});
    b+=T(x0+wf+wr+wc/2,y+16,'cache write '+fmt(c),{a:'middle',fs:11.5,fill:'var(--bg)',w:600});
    b+='<path d="M'+(x0+1)+','+(y-3)+' V'+(y-14)+' H'+(x0+14)+'" fill="none" stroke="var(--acc)" stroke-width="1.5"/>'+T(x0+18,y-10,'Anthropic input_tokens = '+fmt(f)+' (fresh only)',{fs:12,fill:'var(--acc)',w:600});
    b+='<path d="M'+x0+','+(y+h+4)+' V'+(y+h+10)+' H'+(x0+W)+' V'+(y+h+4)+'" fill="none" stroke="var(--ink)" stroke-width="1.2"/>'+T(x0+W/2,y+h+26,'gen_ai.usage.input_tokens = '+fmt(tot),{a:'middle',fs:12,fill:'var(--ink)',w:600});
    el.innerHTML=RD.svg(w,y+h+34,b,'Input tokens of the first model call: fresh, cache read and cache write, drawn to scale')}

  // Section 4: the self-hosted Langfuse stack
  function stack(){const el=document.getElementById('fobs-stack-svg');if(!el)return;const w=Math.floor(RD.width(el)),id='fobs-sk';let b=mk(id),H;
    const S={app:['Your app or collector','OTLP + Basic auth'],web:['langfuse-web','UI, API, /api/public/otel'],redis:['Redis 7','queue'],worker:['langfuse-worker','ingests, evaluates'],
      ch:['ClickHouse','observations, scores'],pg:['Postgres','users, prompts, datasets'],s3:['MinIO','raw events (S3)']};
    if(w>=640){const g=24,bw=(w-8-3*g)/4,bh=46,y1=6,y2=y1+bh+44,X=i=>4+i*(bw+g);
      ['app','web','redis','worker'].forEach((k,i)=>{b+=box(X(i),y1,bw,bh,S[k][0],S[k][1],k==='app'?'var(--acc)':null);if(i<3)b+=arrow(X(i)+bw+2,y1+bh/2,X(i+1)-2,y1+bh/2,id)});
      const cw=bw;
      b+=box(X(3),y2,cw,bh,S.ch[0],S.ch[1],'var(--c1)',{sw:2})+box(X(0),y2,cw,bh,S.pg[0],S.pg[1])+box(X(1),y2,cw,bh,S.s3[0],S.s3[1]);
      b+=arrow(X(3)+bw/2,y1+bh+2,X(3)+cw/2,y2-2,id)+arrow(X(1)+bw/2-20,y1+bh+2,X(0)+cw/2+20,y2-2,id)+arrow(X(1)+bw/2,y1+bh+2,X(1)+cw/2,y2-2,id);
      H=y2+bh+6}
    else{const bw=w-8,bh=40,g=18;let y=4;
      ['app','web','redis','worker'].forEach((k,i)=>{b+=box(4,y,bw,bh,S[k][0],S[k][1],k==='app'?'var(--acc)':null);y+=bh;b+=arrow(4+bw/2,y+2,4+bw/2,y+g-2,id);y+=g});
      const cw=(w-8-12)/3,h2=46;
      [['ch','var(--c1)'],['pg',null],['s3',null]].forEach(([k,c],i)=>{const x=4+i*(cw+6);
        b+='<rect x="'+x+'" y="'+y+'" width="'+cw+'" height="'+h2+'" rx="6" fill="var(--bg)" stroke="'+(c||'var(--line)')+'" stroke-width="'+(c?2:1.3)+'"/>'+T(x+cw/2,y+18,S[k][0],{a:'middle',fs:11.5,w:600,fill:'var(--ink)'})+T(x+cw/2,y+34,S[k][1].split(',')[0],{a:'middle',fs:11,fill:'var(--mute)'})});
      H=y+h2+4}
    el.innerHTML=RD.svg(w,H,b,'Langfuse self-hosted: app sends OTLP to langfuse-web, Redis queues to the worker, which writes observations to ClickHouse; Postgres and MinIO hold the rest')}

  // Section 9: the eval loop
  function loop(){const el=document.getElementById('fobs-loop-svg');if(!el)return;const w=Math.floor(RD.width(el)),id='fobs-lp';let b=mk(id);
    const g=w>=640?40:12,bw=(w-8-2*g)/3,bh=46,y1=4,y2=y1+bh+40,X=i=>4+i*(bw+g);
    const top=[['Traces','production'],['Evaluator','rule or judge'],['Score','on the trace']],bot=[['Deploy','new version'],['Gate','every change'],['Dataset','promoted failures']];
    top.forEach((s,i)=>{b+=box(X(i),y1,bw,bh,s[0],s[1],i===2?'var(--acc)':null);if(i<2)b+=arrow(X(i)+bw+1,y1+bh/2,X(i+1)-1,y1+bh/2,id)});
    bot.forEach((s,i)=>{b+=box(X(i),y2,bw,bh,s[0],s[1]);if(i<2)b+=arrow(X(i+1)-1,y2+bh/2,X(i)+bw+1,y2+bh/2,id)});
    b+=arrow(X(2)+bw/2,y1+bh+2,X(2)+bw/2,y2-2,id)+arrow(X(0)+bw/2,y2-2,X(0)+bw/2,y1+bh+2,id);
    b+=T(X(2)+bw/2-6,y1+bh+24,'low scores',{a:'end',fs:11,fill:'var(--mute)'})+T(X(0)+bw/2+6,y1+bh+24,'new runs',{fs:11,fill:'var(--mute)'});
    b+=T(X(1)+bw/2,y1+bh+24,w>=640?'online above, offline below':'',{a:'middle',fs:11,fill:'var(--mute)'});
    el.innerHTML=RD.svg(w,y2+bh+4,b,'The eval loop: traces are scored online; low scores are promoted to a dataset; every change passes a gate on it before deploy')}

  function all(){hero();tok();stack();loop()}
  all();RD.onRender(all);RD.onResize(all);
})();
