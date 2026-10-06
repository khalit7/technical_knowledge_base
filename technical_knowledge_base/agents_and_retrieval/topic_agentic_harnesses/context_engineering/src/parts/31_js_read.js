// ---- Reading tab visuals (all numbers from window.HCTX, built by src/extract.py from the redacted recordings) ----
(function(){
const H=window.HCTX,S=H.sessions,E=RD.esc;
const fmt=n=>Math.round(n).toLocaleString('en-US');
const k=n=>n>=1000?(n/1000).toFixed(n>=10000?0:1).replace(/\.0$/,'')+'k':String(n);
const CAT={'System tools':'var(--c1)','System prompt':'var(--c4)','Memory files':'var(--c3)','Skills':'var(--c6)','Messages':'var(--c2)','Autocompact buffer':'var(--dim)','Free space':'var(--soft)'};
const ORDER=['System tools','System prompt','Memory files','Skills','Messages','Autocompact buffer','Free space'];
const LBL={'System tools':'Tool definitions','System prompt':'System prompt','Memory files':'Memory files (CLAUDE.md)','Skills':'Skill descriptions','Messages':'History (messages)'};
const call=c=>c.in+c.cw+c.cr;

// 0. the request, as /context saw it at the end of a control session
(function(){
  const el=document.getElementById('hc-req');if(!el)return;
  const c=S.c1_control.ctx[0].cats;
  const rows=[['System tools','the tools the model may call, with JSON schemas'],['System prompt','who the agent is, rules, environment'],['Memory files','CLAUDE.md, loaded at start'],['Messages','task, replies, tool calls and results; grows every call']];
  el.innerHTML=rows.map(([key,d])=>'<div class="blk" style="background:'+CAT[key]+'"><span><b>'+LBL[key]+'</b> &middot; '+d+'</span><span>'+fmt(c[key]||0)+'</span></div>').join('')+
   '<div class="blk" style="background:var(--soft);color:var(--mute);border:1px dashed var(--line)"><span>Room left in the 200K window for the reply and later calls</span><span>'+fmt(c['Free space'])+'</span></div>';
})();

// 1. budget bars
(function(){
  const el=document.getElementById('hc-budget'),seg=document.getElementById('hc-budget-seg'),cap=document.getElementById('hc-budget-cap');if(!el)return;
  const V=[
    ['fresh','Fresh session',S.ctx0.ctx[0],'A new session, six tools, nothing typed yet.'],
    ['skill','+ Skill tool',S.ctx_sk_skill.ctx[0],'The same with the Skill tool enabled: tool definitions shrink a little and 14 built-in skill descriptions plus one project skill appear.'],
    ['md','+ 1k CLAUDE.md',S.ctx_sk_claudemd.ctx[0],'The release-notes procedure as a project CLAUDE.md instead of a skill: about 1,000 tokens on every call.'],
    ['task','After the task',S.c1_control.ctx[0],'After fixing the two bugs: the history is about 5,800 tokens.'],
    ['big','After 5 big reads',S.c3_big_nocompact.ctx[0],'After reading five 75 KB logs in full: 118,100 tokens of history, 65% of the window.'],
    ['w100','100K window',S.c4_auto.ctx[0],'With --autocompact 100000, after an automatic compaction: a third of the window is held back as a buffer, and the history is small again.']];
  seg.innerHTML=V.map((v,i)=>'<button data-m="'+i+'"'+(i?'':' class="on"')+'>'+v[1]+'</button>').join('');
  function draw(i){const v=V[i],c=v[2],W=c.window;
    let h='<div class="sb" style="height:30px;border:1px solid var(--line)">';
    ORDER.forEach(key=>{const n=c.cats[key];if(!n)return;const p=100*n/W;
      h+='<span title="'+key+': '+fmt(n)+'" style="width:'+p+'%;background:'+CAT[key]+(key==='Free space'?';color:var(--mute)':'')+'">'+(p>9?k(n):'')+'</span>'});
    h+='</div><div class="hc-legend">'+ORDER.filter(key=>c.cats[key]).map(key=>'<span><i style="background:'+CAT[key]+';border:1px solid var(--line)"></i>'+(LBL[key]||key)+' '+fmt(c.cats[key])+'</span>').join('')+'</div>';
    el.innerHTML=h;cap.innerHTML=E(v[3])+' Total '+fmt(c.total)+' of '+fmt(W)+' tokens, from <code>/context</code>.'}
  RD.seg(seg,m=>draw(+m));draw(0);
})();

// 2. cache experiment
(function(){
  const el=document.getElementById('hc-cx');if(!el)return;
  const P=H.price,NM={static:'Static',tssys:'Time in system prompt',tsuser:'Time in user message',tools5:'One tool fewer'};
  const max=Math.max(...H.cache.map(call));
  el.innerHTML=['static','tssys','tsuser','tools5'].map(v=>H.cache.filter(c=>c.variant===v).sort((a,b)=>a.i-b.i).map(c=>{
    const usd=(c.in*P.in+c.cw*P.w1h+c.cr*P.read)/1e6,w=x=>(100*x/max)+'%';
    return '<div class="row"><div class="nm">'+NM[v]+', run '+c.i+'</div><div class="track" title="read '+fmt(c.cr)+', write '+fmt(c.cw)+', fresh '+c.in+'"><span style="width:'+w(c.cr)+';background:var(--c1)"></span><span style="width:'+w(c.cw)+';background:var(--c5)"></span><span style="width:'+w(c.in)+';background:var(--c2)"></span></div><div class="val">$'+usd.toFixed(4)+'</div></div>'}).join('')).join('');
})();

// 3. tool-output policies (log scale)
(function(){
  const el=document.getElementById('hc-pol');if(!el||!H.policies)return;
  const P=H.policies.policies;
  const ord=[['raw','Raw output'],['page_2000','Paged, page 1'],['cc_failure','Claude Code, failed command'],['head_tail_lines','Head and tail, 15 lines'],['cc_valid','Claude Code, valid command'],['summary','Model summary'],['filter','Filtered'],['mask','Cleared after use']];
  const lmax=Math.log10(250000),lmin=Math.log10(10);
  el.innerHTML=ord.map(([key,n])=>{const p=P[key],w=100*(Math.log10(p.tokens)-lmin)/(lmax-lmin);
    const dot='<svg width="11" height="11" style="display:inline-block;vertical-align:-1px;margin-right:4px" aria-hidden="true"><circle cx="5.5" cy="5.5" r="4.5" '+(p.key_lines_kept===5?'fill="var(--good)"':'fill="none" stroke="var(--bad)" stroke-width="1.5"')+'/></svg>';
    return '<div class="row"><div class="nm">'+dot+n+'</div><div class="track" title="'+E(p.desc)+'"><span style="width:'+w+'%;background:'+(key==='raw'?'var(--bad)':'var(--c1)')+'"></span></div><div class="val">'+fmt(p.tokens)+'</div></div>'}).join('');
})();

// 5. skills against CLAUDE.md
(function(){
  const el=document.getElementById('hc-sk');if(!el)return;
  const R=[['Fresh session (six tools)',S.ctx0.ctx[0]],['Skill tool + our skill',S.ctx_sk_skill.ctx[0]],['Skill tool + same text as CLAUDE.md',S.ctx_sk_claudemd.ctx[0]]];
  const max=Math.max(...R.map(r=>r[1].total));
  el.innerHTML=R.map(([n,c])=>'<div class="row"><div class="nm">'+n+'</div><div class="track">'+['System tools','System prompt','Memory files','Skills'].map(key=>c.cats[key]?'<span title="'+key+' '+fmt(c.cats[key])+'" style="width:'+(100*c.cats[key]/max)+'%;background:'+CAT[key]+'"></span>':'').join('')+'</div><div class="val">'+fmt(c.total)+'</div></div>').join('')+
   '<div class="hc-legend">'+['System tools','System prompt','Memory files','Skills'].map(key=>'<span><i style="background:'+CAT[key]+'"></i>'+LBL[key]+'</span>').join('')+'</div>';
})();

// 6. subagent isolation
(function(){
  const el=document.getElementById('hc-sa');if(!el)return;
  const runs=[['sb_none','No subagent, run 1'],['sb_none_r2','No subagent, run 2'],['sb_agent','Subagent, run 1'],['sb_agent_r2','Subagent, run 2']];
  const rows=runs.map(([l,n])=>{const s=S[l],m=s.calls.filter(c=>c.w==='m'),sb=s.calls.filter(c=>c.w==='s'),f=s.finals[s.finals.length-1];
    return {n,main:call(m[m.length-1]),sub:sb.length?call(sb[sb.length-1]):0,tot:f.mu.in+f.mu.cw+f.mu.cr,cost:f.cost}});
  const max=Math.max(...rows.map(r=>r.tot));
  el.innerHTML=rows.map(r=>'<div style="margin:8px 0 2px;font-size:12.5px;font-weight:600">'+r.n+' <span class="mute" style="font-weight:400">$'+r.cost.toFixed(3)+'</span></div>'+
    [['main window at the end',r.main,'var(--c2)'],['subagent window at its end',r.sub,'var(--c6)'],['all input processed',r.tot,'var(--dim)']].map(([nm,v,col])=>'<div class="row"><div class="nm">'+nm+'</div><div class="track"><span style="width:'+(100*v/max)+'%;background:'+col+'"></span></div><div class="val">'+(v?fmt(v):'none')+'</div></div>').join('')).join('');
})();
// 8. needle results summary
(function(){
  const el=document.getElementById('hc-nd');if(!el)return;
  const TN={lit:'literal',nolit:'non-literal',track:'tracking'};
  let h='';
  [['needle_haiku','Claude Haiku 4.5'],['needle_local','Local 4B model']].forEach(([key,nm])=>{const D=H[key];if(!D)return;const R=D.rows.filter(r=>r.task!=='know');
    const lens=[...new Set(R.map(r=>r.target))].sort((a,b)=>a-b);
    const tok=t=>{const x=R.filter(r=>r.target===t&&r.input_tokens).map(r=>r.input_tokens);return x.length?Math.round(x.reduce((a,b)=>a+b,0)/x.length):0};
    h+='<div style="margin:10px 0 2px;font-size:12.5px;font-weight:600">'+nm+'</div>';
    ['lit','nolit','track'].forEach(t=>{lens.forEach(L=>{const x=R.filter(r=>r.task===t&&r.target===L);if(!x.length)return;const k2=x.filter(r=>r.ok).length;
      h+='<div class="row"><div class="nm">'+TN[t]+', '+fmt(tok(L))+' tok</div><div class="track"><span style="width:'+(100*k2/x.length)+'%;background:'+(k2===x.length?'var(--good)':'var(--c5)')+'"></span></div><div class="val">'+k2+' / '+x.length+'</div></div>'})})});
  el.innerHTML=h;
})();
})();
