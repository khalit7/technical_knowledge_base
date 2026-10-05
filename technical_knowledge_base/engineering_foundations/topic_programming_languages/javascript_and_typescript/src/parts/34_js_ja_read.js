// ---- Part 1 Reading: section nav, the to-scale timeline (i4_trace), the SSE chunk replay (j1_sse), start-up bars ----
(function(){
  const $=id=>document.getElementById(id),esc=RD.esc,TAB='t-ja-read';
  if(!$(TAB))return;
  const R=(window.TAB_RENDER=window.TAB_RENDER||{});R[TAB]=R[TAB]||[];
  const onResize=f=>{let t=0;addEventListener('resize',()=>{const el=$(TAB);if(!el||el.hidden)return;clearTimeout(t);t=setTimeout(f,60)})};
  // section nav highlight
  (function(){const nav=$('ja-nav');if(!nav||!('IntersectionObserver' in window))return;
    const links=[...nav.querySelectorAll('a')],map={};links.forEach(a=>map[a.getAttribute('href').slice(1)]=a);
    const io=new IntersectionObserver(es=>{es.forEach(en=>{if(en.isIntersecting){links.forEach(a=>a.classList.remove('cur'));const a=map[en.target.id];if(a){a.classList.add('cur');nav.scrollLeft=Math.max(0,a.offsetLeft-40)}}})},{rootMargin:'-45% 0px -50% 0px'});
    Object.keys(map).forEach(id=>{const s=$(id);if(s)io.observe(s)});})();

  // ---------- 1. timeline of A, B, C (real events from i4_trace.mjs) ----------
  (function(){
    if(!$('ja-tl-card'))return;
    const WHO=['A','B','C'],AXIS=620;let mode='sequential';
    const msOf=n=>{const m=/(\d+)/.exec(n||'');return m?+m[1]:0};
    function state(ev,i){const T=ev[i][2],st={};
      WHO.forEach(w=>{const mine=ev.slice(0,i+1).filter(e=>e[0]===w);
        if(!mine.length){st[w]={s:mode==='sequential'?'not called yet':'not started yet',k:'none'};return}
        const last=mine[mine.length-1];
        if(last[1]==='start'||last[1]==='resume')st[w]={s:'running',k:'run'};
        else if(last[1]==='block')st[w]={s:'holding the thread',k:'block'};
        else if(last[1]==='done')st[w]={s:'done at '+last[2].toFixed(0)+' ms',k:'done'};
        else{const due=last[2]+msOf(last[3]);st[w]=T>=due-0.5?{s:'ready (due '+due.toFixed(0)+' ms)',k:'ready'}:{s:'suspended until '+due.toFixed(0)+' ms',k:'wait'}}});
      return st}
    function caption(ev,i,tot){const [w,what,t,note]=ev[i];let c='<b>'+t.toFixed(1)+' ms.</b> ';
      if(what==='start')c+=w+'() is called and runs on the one thread.'+(mode==='sequential'&&w!=='A'?' In this mode <code>main</code> awaits each job before calling the next, so '+w+' starts only now.':'');
      else if(what==='await'){const due=t+msOf(note);c+=w+' reaches <code>await</code> ('+esc(note)+') and suspends; the thread goes back to the event loop'+(note.indexOf('worker')>=0?', while the busy loop runs on another core.':', which has a timer due at '+due.toFixed(0)+' ms.')+(mode!=='sequential'&&w!=='C'?' The loop goes straight on to the next job.':'')}
      else if(what==='block')c+=w+' runs <code>'+esc(note)+'</code>, a synchronous loop. There is no <code>await</code>: until it returns, no timer, callback or other job can run.';
      else if(what==='resume'){let a=null;for(let k=i-1;k>=0;k--)if(ev[k][0]===w&&ev[k][1]==='await'){a=ev[k];break}
        const due=a?a[2]+msOf(a[3]):t,late=t-due;c+=w+'\'s wait is over (due at '+due.toFixed(0)+' ms) and its continuation runs as a microtask.'+(late>20&&a&&a[3].indexOf('worker')<0?' <b>'+late.toFixed(0)+' ms late</b>: the thread was stuck in B\'s busy loop.':'')}
      else if(what==='done')c+=w+' returns, fulfilling its promise.'+(i===ev.length-1?' <b>All done: total '+tot.toFixed(0)+' ms.</b>':'');
      return c}
    function draw(i){const D=JA.tl[mode],ev=D.events,T=ev[i][2];
      const W=Math.min(860,RD.width($('ja-tl-svg'))),L=58,x=v=>L+(W-L-10)*Math.min(v,AXIS)/AXIS,lh=34,top=22,H=top+4*lh+26;let b='';
      for(let m=0;m<=600;m+=100){b+='<line x1="'+x(m)+'" y1="'+top+'" x2="'+x(m)+'" y2="'+(top+4*lh)+'" stroke="var(--line)"/>'+RD.t(x(m),top+4*lh+14,m+(m===600?' ms':''),{a:'middle',fs:10.5,fill:'var(--mute)'})}
      ['thread'].concat(WHO).forEach((n,k)=>{b+=RD.t(4,top+k*lh+lh/2+4,n==='thread'?'thread':'job '+n,{fs:11.5,w:n==='thread'?600:400})});
      const seen=ev.slice(0,i+1);
      WHO.forEach((w,k)=>{const y=top+(k+1)*lh+lh/2,mine=seen.filter(e=>e[0]===w);
        for(let j=0;j<mine.length;j++){const e=mine[j],nx=mine[j+1],end=nx?nx[2]:T;
          if(e[1]==='start'||e[1]==='resume')b+='<rect x="'+x(e[2])+'" y="'+(y-7)+'" width="'+Math.max(3,x(end)-x(e[2]))+'" height="14" rx="2" fill="var(--ink)"/>';
          else if(e[1]==='await'){b+='<rect x="'+x(e[2])+'" y="'+(y-2)+'" width="'+Math.max(1,x(end)-x(e[2]))+'" height="4" rx="2" fill="var(--c1)"/>';
            b+='<circle cx="'+x(e[2]+msOf(e[3]))+'" cy="'+y+'" r="4" fill="var(--bg)" stroke="var(--c1)" stroke-width="2"/>'}
          else if(e[1]==='block')b+='<rect x="'+x(e[2])+'" y="'+(y-7)+'" width="'+Math.max(3,x(end)-x(e[2]))+'" height="14" rx="2" fill="var(--bad)"/>'}});
      const ty=top+lh/2;b+='<rect x="'+x(0)+'" y="'+(ty-1)+'" width="'+(x(T)-x(0))+'" height="2" fill="var(--dim)"/>';
      seen.forEach(e=>{if(e[1]==='block'){const d=seen.find(f=>f[0]===e[0]&&f[1]==='done'&&f[2]>=e[2]);b+='<rect x="'+x(e[2])+'" y="'+(ty-7)+'" width="'+Math.max(3,x(d?d[2]:T)-x(e[2]))+'" height="14" rx="2" fill="var(--bad)"/>'}
        else b+='<rect x="'+(x(e[2])-1.5)+'" y="'+(ty-7)+'" width="3" height="14" fill="var(--ink)"/>'});
      b+='<line x1="'+x(T)+'" y1="'+(top-8)+'" x2="'+x(T)+'" y2="'+(top+4*lh)+'" stroke="var(--acc)" stroke-width="1.5"/>'+RD.t(Math.max(30,Math.min(x(T),W-40)),top-10,T.toFixed(0)+' ms',{a:'middle',fs:11,fill:'var(--acc)',w:600});
      $('ja-tl-svg').innerHTML=RD.svg(W,H,b,'Timeline of jobs A, B and C, mode '+mode);
      $('ja-tl-cap').innerHTML='<b>Step '+(i+1)+' of '+ev.length+'.</b> '+caption(ev,i,D.total_ms);
      const st=state(ev,i),cnt=k=>WHO.filter(w=>st[w].k===k).length;
      $('ja-tl-cnt').innerHTML='<span>clock: <b>'+T.toFixed(1)+' ms</b></span>'+WHO.map(w=>'<span>'+w+': <b>'+esc(st[w].s)+'</b></span>').join('')+'<span>suspended: <b>'+cnt('wait')+'</b>, done: <b>'+cnt('done')+'</b></span><span>this mode\'s total: <b>'+D.total_ms.toFixed(0)+' ms</b></span>'}
    const an=RD.anim({card:'ja-tl-card',ctl:'ja-tl-ctl',n:JA.tl[mode].events.length,draw,ms:1400,label:'Event'});
    RD.seg($('ja-tl-mode'),m=>{mode=m;an.reset(JA.tl[m].events.length);an.play()});
    R[TAB].push(()=>an.redraw());onResize(()=>an.redraw());
  })();

  // ---------- 2. SSE: the recorded chunks through two parsers, run live ----------
  (function(){
    if(!$('ja-sse-card'))return;
    const S=JA.sse,bytes=new TextEncoder().encode(S.body),chunks=[];let off=0;
    S.lens.forEach(n=>{chunks.push(bytes.subarray(off,off+n));off+=n});
    const show=s=>esc(s).replace(/\n/g,'<span style="color:var(--c2)">&#9166;</span>');
    // naive: decode each chunk alone, split it, parse every "data:" part
    const naive=chunks.map(c=>{const text=new TextDecoder().decode(c),res=[];
      text.split('\n\n').forEach(p=>{if(!p.startsWith('data: ')||p==='data: [DONE]')return;
        try{res.push({ok:true,v:JSON.parse(p.slice(6)).delta,p})}catch(e){res.push({ok:false,v:String(e.message).split(' in JSON')[0],p})}});
      return {text,res}});
    // buffered: one streaming decoder, keep the remainder
    const good=[];{const dec=new TextDecoder();let buf='';
      chunks.forEach(c=>{buf+=dec.decode(c,{stream:true});const evs=[];let end;
        while((end=buf.indexOf('\n\n'))>=0){evs.push(buf.slice(0,end));buf=buf.slice(end+2)}
        good.push({text:new TextDecoder().decode(c),evs,buf})})}
    const nTok=naive.flatMap(s=>s.res.filter(r=>r.ok).map(r=>r.v)),nErr=naive.flatMap(s=>s.res.filter(r=>!r.ok));
    const gTok=good.flatMap(s=>s.evs).map(e=>e.slice(6)).filter(d=>d!=='[DONE]').map(d=>JSON.parse(d).delta);
    const match=JSON.stringify(nTok)===JSON.stringify(S.naive)&&nErr.length===S.naiveErrors.length&&JSON.stringify(gTok)===JSON.stringify(S.good);
    let mode='naive';
    function draw(i){
      const rows=chunks.map((c,k)=>'<div style="display:flex;gap:8px;align-items:baseline;opacity:'+(k<=i?1:.35)+';'+(k===i?'font-weight:600':'')+'"><span class="small" style="min-width:5.4em;color:var(--mute)">chunk '+(k+1)+' ('+c.length+' B)</span><code style="white-space:pre-wrap;word-break:break-all;min-width:0">'+(k<=i?show(naive[k].text):'&hellip;')+'</code></div>').join('');
      let mid='',seen=[],errs=0,cap;
      if(mode==='naive'){const st=naive[i];
        mid=st.res.length?st.res.map(r=>'<div class="small">'+(r.ok?'<span style="color:var(--good)">parsed</span> '+esc(JSON.stringify(r.v)):'<span style="color:var(--bad)">error</span> '+esc(r.v))+' <span style="color:var(--mute)">from</span> <code style="word-break:break-all">'+show(r.p)+'</code></div>').join(''):'<div class="small" style="color:var(--mute)">no part of this chunk starts with "data: ", so nothing is parsed (its bytes are simply lost)</div>';
        for(let k=0;k<=i;k++)naive[k].res.forEach(r=>{if(r.ok)seen.push(r.v);else errs++});
        cap='Chunk '+(i+1)+' is decoded on its own and split on blank lines. '+(st.text.indexOf('�')>=0?'It ends in the middle of the rocket emoji\'s four UTF-8 bytes, so a fresh decoder turns the half into &#xFFFD;. ':'')+'Each piece that starts with <code>data: </code> goes to <code>JSON.parse</code>; pieces cut by a chunk boundary fail.';
      }else{const st=good[i];
        mid='<div class="small">events completed by this chunk: '+(st.evs.length?st.evs.map(e=>'<code>'+show(e)+'</code>').join(' '):'<span style="color:var(--mute)">none yet</span>')+'</div><div class="small">buffer kept for the next chunk: <code style="word-break:break-all">'+(st.buf?show(st.buf):'(empty)')+'</code></div>';
        for(let k=0;k<=i;k++)good[k].evs.forEach(e=>{const d=e.slice(6);if(d!=='[DONE]')seen.push(JSON.parse(d).delta)});
        cap='Chunk '+(i+1)+' is appended to the buffer through one streaming decoder'+(naive[i].text.indexOf('�')>=0?' (which holds back the half of the emoji until the next chunk completes it)':'')+'. Only text up to a blank line is a complete event; the rest waits.';
      }
      $('ja-sse-view').innerHTML='<div style="display:grid;gap:3px;margin:6px 0">'+rows+'</div><div style="border-top:1px solid var(--line);padding-top:6px;margin-top:6px">'+mid+'</div>'+
        '<div style="margin-top:8px;font-size:14px">What the user sees: <b style="font-size:15px">'+(seen.length?esc(seen.join('')):'<span style="color:var(--mute)">(nothing)</span>')+'</b></div>';
      $('ja-sse-cap').innerHTML='<b>Step '+(i+1)+' of '+chunks.length+'.</b> '+cap;
      $('ja-sse-cnt').innerHTML='<span>bytes received: <b>'+chunks.slice(0,i+1).reduce((s,c)=>s+c.length,0)+' of '+bytes.length+'</b></span><span>tokens shown: <b>'+seen.length+' of 6</b></span>'+(mode==='naive'?'<span>parse errors: <b>'+errs+'</b></span>':'')+'<span>matches the recorded run: <b>'+(match?'yes':'NO')+'</b></span>';
    }
    const an=RD.anim({card:'ja-sse-card',ctl:'ja-sse-ctl',n:chunks.length,draw,ms:1600,label:'Chunk'});
    RD.seg($('ja-sse-mode'),m=>{mode=m;an.reset(chunks.length);an.play()});
    R[TAB].push(()=>an.redraw());
  })();

  // ---------- 3. start-up bars (m2_startup.sh) ----------
  (function(){
    const el=$('ja-start-bars');if(!el||!JA.startup.length)return;
    const mx=Math.max(...JA.startup.map(r=>r[1]));
    el.innerHTML='<div class="bars">'+JA.startup.map(r=>'<div class="row"><div class="nm">'+esc(r[0])+'</div><div class="track"><div class="fill" style="width:'+(100*r[1]/mx).toFixed(1)+'%;background:'+(/node/.test(r[0])?'var(--c3)':/python/.test(r[0])?'var(--dim)':'var(--c1)')+'"></div></div><div class="val">'+r[1].toFixed(1)+' ms</div></div>').join('')+'</div><div class="ja-src">Median wall time to start, print "hi" and exit. Bars drawn from the output below.</div>';
  })();
})();
