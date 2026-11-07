// ---- Reading: the to-scale timeline (i4_trace), the SSE chunk replay (j1_sse), the concurrency-limit bars (i9_limit).
// Copied from the language page's src/ja/tpl/34_js_ja_read.js (2026-10-26). 2026-11-07: each animation is explained by an ol.sx step list on the left
// (the timeline's steps are stretches of the trace, given by each item's data-e, the last event it reaches); the script-written caption is gone;
// a mode chip swaps the list and replays.
(function(){
  const $=id=>document.getElementById(id),esc=RD.esc;
  // ---------- 1. timeline of A, B, C (real events from i4_trace.mjs) ----------
  (function(){
    if(!$('el-tl-card'))return;
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
    const lid=m=>'sx-tl-'+m,ends=m=>[...$(lid(m)).children].map(li=>+li.dataset.e);
    // k: the step (a stretch of the trace); i: the last event it reaches; marks for events new in this stretch ease in (rd-new)
    function draw(k){const D=EL.tl[mode],ev=D.events,i=ends(mode)[k],T=ev[i][2],prev=k>0?ends(mode)[k-1]:-1,nw=e=>ev.indexOf(e)>prev?' class="rd-new"':'';
      const W=Math.min(860,RD.width($('el-tl-svg'))),L=58,x=v=>L+(W-L-10)*Math.min(v,AXIS)/AXIS,lh=34,top=22,H=top+4*lh+26;let b='';
      for(let m=0;m<=600;m+=100){b+='<line x1="'+x(m)+'" y1="'+top+'" x2="'+x(m)+'" y2="'+(top+4*lh)+'" stroke="var(--line)"/>'+RD.t(x(m),top+4*lh+14,m+(m===600?' ms':''),{a:'middle',fs:10.5,fill:'var(--mute)'})}
      ['thread'].concat(WHO).forEach((n,k)=>{b+=RD.t(4,top+k*lh+lh/2+4,n==='thread'?'thread':'job '+n,{fs:11.5,w:n==='thread'?600:400})});
      const seen=ev.slice(0,i+1);
      WHO.forEach((w,k)=>{const y=top+(k+1)*lh+lh/2,mine=seen.filter(e=>e[0]===w);
        for(let j=0;j<mine.length;j++){const e=mine[j],nx=mine[j+1],end=nx?nx[2]:T;
          if(e[1]==='start'||e[1]==='resume')b+='<rect'+nw(e)+' x="'+x(e[2])+'" y="'+(y-7)+'" width="'+Math.max(3,x(end)-x(e[2]))+'" height="14" rx="2" fill="var(--ink)"/>';
          else if(e[1]==='await'){b+='<rect'+nw(e)+' x="'+x(e[2])+'" y="'+(y-2)+'" width="'+Math.max(1,x(end)-x(e[2]))+'" height="4" rx="2" fill="var(--c1)"/>';
            b+='<circle'+nw(e)+' cx="'+x(e[2]+msOf(e[3]))+'" cy="'+y+'" r="4" fill="var(--bg)" stroke="var(--c1)" stroke-width="2"/>'}
          else if(e[1]==='block')b+='<rect'+nw(e)+' x="'+x(e[2])+'" y="'+(y-7)+'" width="'+Math.max(3,x(end)-x(e[2]))+'" height="14" rx="2" fill="var(--bad)"/>'}});
      const ty=top+lh/2;b+='<rect x="'+x(0)+'" y="'+(ty-1)+'" width="'+(x(T)-x(0))+'" height="2" fill="var(--dim)"/>';
      seen.forEach(e=>{if(e[1]==='block'){const d=seen.find(f=>f[0]===e[0]&&f[1]==='done'&&f[2]>=e[2]);b+='<rect x="'+x(e[2])+'" y="'+(ty-7)+'" width="'+Math.max(3,x(d?d[2]:T)-x(e[2]))+'" height="14" rx="2" fill="var(--bad)"/>'}
        else b+='<rect x="'+(x(e[2])-1.5)+'" y="'+(ty-7)+'" width="3" height="14" fill="var(--ink)"/>'});
      b+='<line x1="'+x(T)+'" y1="'+(top-8)+'" x2="'+x(T)+'" y2="'+(top+4*lh)+'" stroke="var(--acc)" stroke-width="1.5"/>'+RD.t(Math.max(30,Math.min(x(T),W-40)),top-10,T.toFixed(0)+' ms',{a:'middle',fs:11,fill:'var(--acc)',w:600});
      $('el-tl-svg').innerHTML=RD.svg(W,H,b,'Timeline of jobs A, B and C, mode '+mode);
      const st=state(ev,i),cnt=k=>WHO.filter(w=>st[w].k===k).length;
      $('el-tl-cnt').innerHTML='<span>clock: <b>'+T.toFixed(1)+' ms</b></span>'+WHO.map(w=>'<span>'+w+': <b>'+esc(st[w].s)+'</b></span>').join('')+'<span>suspended: <b>'+cnt('wait')+'</b>, done: <b>'+cnt('done')+'</b></span><span>this mode\'s total: <b>'+D.total_ms.toFixed(0)+' ms</b></span>'}
    const an=RD.anim({card:'el-tl-card',ctl:'el-tl-ctl',n:ends(mode).length,draw,ms:4200,label:'Step',list:lid(mode)});
    RD.seg($('el-tl-mode'),m=>{mode=m;Object.keys(EL.tl).forEach(x=>$(lid(x)).hidden=x!==m);an.reset(ends(m).length,lid(m))});
    RD.onResize(()=>an.redraw());
  })();

  // ---------- 2. SSE: the recorded chunks through two parsers, run live ----------
  (function(){
    if(!$('el-sse-card'))return;
    const S=EL.sse,bytes=new TextEncoder().encode(S.body),chunks=[];let off=0;
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
      let mid='',seen=[],errs=0;
      if(mode==='naive'){const st=naive[i];
        mid=st.res.length?st.res.map(r=>'<div class="small">'+(r.ok?'<span style="color:var(--good)">parsed</span> '+esc(JSON.stringify(r.v)):'<span style="color:var(--bad)">error</span> '+esc(r.v))+' <span style="color:var(--mute)">from</span> <code style="word-break:break-all">'+show(r.p)+'</code></div>').join(''):'<div class="small" style="color:var(--mute)">no part of this chunk starts with "data: ", so nothing is parsed (its bytes are simply lost)</div>';
        for(let k=0;k<=i;k++)naive[k].res.forEach(r=>{if(r.ok)seen.push(r.v);else errs++});
      }else{const st=good[i];
        mid='<div class="small">events completed by this chunk: '+(st.evs.length?st.evs.map(e=>'<code>'+show(e)+'</code>').join(' '):'<span style="color:var(--mute)">none yet</span>')+'</div><div class="small">buffer kept for the next chunk: <code style="word-break:break-all">'+(st.buf?show(st.buf):'(empty)')+'</code></div>';
        for(let k=0;k<=i;k++)good[k].evs.forEach(e=>{const d=e.slice(6);if(d!=='[DONE]')seen.push(JSON.parse(d).delta)});
      }
      $('el-sse-view').innerHTML='<div style="display:grid;gap:3px;margin:6px 0">'+rows+'</div><div style="border-top:1px solid var(--line);padding-top:6px;margin-top:6px">'+mid+'</div>'+
        '<div style="margin-top:8px;font-size:14px">What the user sees: <b style="font-size:15px">'+(seen.length?esc(seen.join('')):'<span style="color:var(--mute)">(nothing)</span>')+'</b></div>';
      $('el-sse-cnt').innerHTML='<span>bytes received: <b>'+chunks.slice(0,i+1).reduce((s,c)=>s+c.length,0)+' of '+bytes.length+'</b></span><span>tokens shown: <b>'+seen.length+' of 6</b></span>'+(mode==='naive'?'<span>parse errors: <b>'+errs+'</b></span>':'')+'<span>matches the recorded run: <b>'+(match?'yes':'NO')+'</b></span>';
    }
    const an=RD.anim({card:'el-sse-card',ctl:'el-sse-ctl',n:chunks.length,draw,ms:4200,label:'Chunk',list:'sx-sse-naive'});
    RD.seg($('el-sse-mode'),m=>{mode=m;['naive','good'].forEach(x=>$('sx-sse-'+x).hidden=x!==m);an.reset(chunks.length,'sx-sse-'+m)});
  })();

  // ---------- 3. concurrency-limit bars (i9_limit.mjs output, read from the embedded recording) ----------
  (function(){
    const el=$('el-lim-bars'),pre=document.querySelector('pre[data-el-src="i9_limit.txt"]');if(!el||!pre)return;
    const rows=[...pre.textContent.matchAll(/limit\s+(\d+): (\d+) ms, peak in flight (\d+)/g)].map(m=>[+m[1],+m[2],+m[3]]);
    const mx=Math.max(...rows.map(r=>r[1]));
    el.innerHTML='<div class="bars">'+rows.map(r=>'<div class="row"><div class="nm">limit '+r[0]+' (ideal '+(20/r[0]*50)+')</div><div class="track"><div class="fill" style="width:'+(100*r[1]/mx).toFixed(1)+'%;background:'+(r[0]===4?'var(--acc)':'var(--dim)')+'"></div></div><div class="val">'+r[1]+' ms</div></div>').join('')+'</div>';
  })();
})();
