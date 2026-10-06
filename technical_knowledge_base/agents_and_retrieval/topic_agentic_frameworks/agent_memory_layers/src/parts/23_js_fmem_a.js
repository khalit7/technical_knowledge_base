// ---- Reading: shared helpers, values in prose, the one-screen table ----
window.FM=(function(){
  const F=window.FMEM,esc=RD.esc;
  // systems as rows everywhere: key prefix in F.A, label, writer, kind
  const SYS=[
    {k:'none',l:'No memory',w:'',kind:'baseline'},
    {k:'full',l:'Full history in the prompt',w:'',kind:'baseline'},
    {k:'mem0',l:'Mem0 2.2.1 (library)',w:'Haiku',kind:'facts',ev:'mem0'},
    {k:'paper_haiku',l:'Mem0 paper loop (minimal)',w:'Haiku',kind:'facts',ev:'paper_haiku'},
    {k:'paper_local',l:'Mem0 paper loop (minimal)',w:'local 4B',kind:'facts',ev:'paper_local'},
    {k:'graphiti_haiku',l:'Graphiti 0.30.2',w:'Haiku',kind:'graph',ev:'graphiti_haiku'},
    {k:'graphiti_local',l:'Graphiti 0.30.2',w:'local 4B',kind:'graph',ev:'graphiti_local'},
    {k:'letta',l:'Letta 0.16.8 server',w:'local 4B',kind:'paging',ev:'letta'},
    {k:'lettastore',l:'Letta\'s notes, pasted whole',w:'local 4B',kind:'paging',ev:'lettastore'}
  ];
  const READERS=[['haiku','Claude Haiku 4.5'],['local','local Qwen3-4B']];
  const score=(k,r)=>{const a=F.A[k+'|'+r];if(!a)return null;const v=Object.values(a);return [v.filter(x=>x[1]).length,v.length]};
  const byType=(k,r,t)=>{const a=F.A[k+'|'+r];if(!a)return null;const qs=F.Q.filter(q=>q.t===t);return [qs.filter(q=>a[q.id]&&a[q.id][1]).length,qs.length]};
  function fill(root){(root||document).querySelectorAll('.fmem-v').forEach(e=>{const v=F.V[e.dataset.v];e.textContent=(v===undefined||v===null)?'(not run)':v})}
  function one(){const t=document.getElementById('fmem-one');if(!t)return;
    const sz=s=>{if(s.k==='mem0'&&F.M0)return F.M0.mem.length+' memories';const w=s.k.split('_')[1];
      if(s.kind==='graph'&&F.GR[w])return F.GR[w].e.length+' edges ('+F.GR[w].e.filter(x=>x.sc!==null).length+' closed)';
      if(s.kind==='facts'&&s.k!=='mem0'&&F.PA[w])return Object.keys(F.PA[w].s[F.PA[w].s.length-1].st).length+' facts';
      if((s.k==='letta'||s.k==='lettastore')&&F.LT){const z=F.LT.ses[F.LT.ses.length-1];return z?(z.a.length+' archival notes, '+(z.h||'').length+'-char core block'):'';}
      if(s.k==='full')return F.S.length+' sessions, '+F.V.full_chars.toLocaleString()+' characters';return '';};
    const ch={none:'',full:'All versions present; the reader must work out which is current',mem0:'Both kept as separate memories (ADD-only); ranking decides',paper_haiku:'Old memory rewritten or deleted (UPDATE, DELETE)',paper_local:'Old memory rewritten or deleted (UPDATE, DELETE)',graphiti_haiku:'Old edge closed with a date, kept',graphiti_local:'Old edge closed with a date, kept',letta:'Whatever the model writes: it may edit the core block or add a note',lettastore:'Same store as the row above; no search step, the reader sees every note'};
    const sc=(k,r)=>{const s=score(k,r);return s?'<b>'+s[0]+'</b>/'+s[1]:'<span class="mute">not run</span>'};
    const ev=s=>s.ev&&F.EV[s.ev]?Object.values(F.EV[s.ev]).filter(Boolean).length+'/'+F.V['ev.n']:(s.k==='full'&&F.EV.full?Object.values(F.EV.full).filter(Boolean).length+'/'+F.V['ev.n']:'');
    t.innerHTML='<tr><th>Memory</th><th>Writer model</th><th>After 12 sessions</th><th>When a fact changes</th><th class="num">Evidence reached the prompt</th><th class="num">Right, Haiku reads</th><th class="num">Right, local 4B reads</th></tr>'+
      SYS.map(s=>'<tr><td>'+s.l+'</td><td>'+(s.w||'<span class="mute">none</span>')+'</td><td>'+sz(s)+'</td><td>'+(ch[s.k]||'<span class="mute">nothing kept</span>')+'</td><td class="num">'+ev(s)+'</td><td class="num">'+(s.k==='letta'?'<span class="mute">n/a</span>':sc(s.k,'haiku'))+'</td><td class="num">'+sc(s.k,'local')+'</td></tr>').join('');}
  // a small bar row list: items [{l, v, max, c, note}]
  function bars(el,items,fmt){el.innerHTML='<div class="bars">'+items.map(i=>'<div class="row'+(i.hl?' hl':'')+'"><span class="nm" title="'+esc(i.l)+'">'+esc(i.l)+'</span><span class="track"><span class="fill" style="width:'+(100*Math.max(0,i.v)/i.max).toFixed(1)+'%;background:'+(i.c||'var(--acc)')+'"></span></span><span class="val">'+(fmt?fmt(i):i.v)+'</span></div>').join('')+'</div>'}
  return {F,SYS,READERS,score,byType,fill,one,bars,esc};
})();
FM.fill();FM.one();
