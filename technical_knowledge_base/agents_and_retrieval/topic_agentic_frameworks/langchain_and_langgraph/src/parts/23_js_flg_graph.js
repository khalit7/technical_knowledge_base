// ---- Graph drawing and the super-step player, shared by the Reading tab and the Super-step lab ----
// Layouts are rows from top to bottom; nodes in a row sit side by side (works at phone width).
window.FLG_UID=window.FLG_UID||0;
window.FLGG=(function(){
  const esc=RD.esc;
  const LAYOUT={
    linear:[['__start__'],['read_and_test'],['diagnose'],['fix'],['test'],['__end__']],
    fan_reducer:[['__start__'],['read_and_test'],['check_tokenize','check_top_words'],['merge'],['__end__']],
    fan_no_reducer:[['__start__'],['read_and_test'],['check_tokenize','check_top_words'],['merge'],['__end__']],
    uneven_edges:[['__start__'],['read'],['a_search','b_lint'],['a_read_hits',''],['join'],['__end__']],
    uneven_join_all:[['__start__'],['read'],['a_search','b_lint'],['a_read_hits',''],['join'],['__end__']],
    loop:[['__start__'],['fix'],['test'],['__end__']],
    send:[['__start__'],['list_files'],['review'],['summarise'],['__end__']],
    agent_plain:[['__start__'],['model'],['tools','__end__']],
    agent_mw:[['__start__'],['ModelCallLimitMiddleware.before_model'],['model'],['ModelCallLimitMiddleware.after_model'],['HumanInTheLoopMiddleware.after_model'],['tools','__end__']],
    real:[['__start__'],['read_and_test'],['diagnose_word_count','diagnose_top_words'],['propose_fix'],['human_review'],['apply_and_test'],['__end__']]
  };
  // st: {cls:{node:'run'|'done'|'err'|'next'|'lost'}, badge:{node:text}, copies:{node:n}}
  function svg(name,edges,W,st){
    st=st||{};const rows=LAYOUT[name];const rh=46,bh=26,top=8;const H=top*2+rows.length*rh-(rh-bh);
    const pos={};
    const LB=st.labels||{};
    rows.forEach((r,ri)=>{const n=r.length;r.forEach((nd,ci)=>{if(!nd)return;const cw=W/n;pos[nd]={x:cw*ci+cw/2,y:top+ri*rh,w:Math.min(cw-14,Math.max(70,(LB[nd]||nd).length*6.6+18))}})});
    const aid='flgArr'+(++window.FLG_UID);let b='<defs><marker id="'+aid+'" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L8,4L0,8z" fill="var(--mute)"/></marker></defs>';
    const seen={};
    (edges||[]).forEach(e=>{const a=pos[e.s],c=pos[e.t];if(!a||!c)return;const k=e.s+'>'+e.t;if(seen[k])return;seen[k]=1;
      const dash=e.cond?' stroke-dasharray="4 3"':'';
      if(c.y>a.y){b+='<path d="M'+a.x+','+(a.y+bh)+' C'+a.x+','+(a.y+bh+16)+' '+c.x+','+(c.y-16)+' '+c.x+','+(c.y-2)+'" fill="none" stroke="var(--mute)" stroke-width="1.3"'+dash+' marker-end="url(#'+aid+')"/>'}
      else{const xr=Math.max(a.x+a.w/2,c.x+c.w/2)+22;b+='<path d="M'+(a.x+a.w/2)+','+(a.y+bh/2)+' C'+xr+','+(a.y+bh/2)+' '+xr+','+(c.y+bh/2)+' '+(c.x+c.w/2+2)+','+(c.y+bh/2)+'" fill="none" stroke="var(--mute)" stroke-width="1.3"'+dash+' marker-end="url(#'+aid+')"/>'}});
    Object.keys(pos).forEach(nd=>{const p=pos[nd];const cls=(st.cls||{})[nd]||'';
      const se=nd==='__start__'||nd==='__end__';
      const fill=cls==='run'?'var(--acc)':cls==='done'?'var(--acc2)':cls==='err'?'var(--bad)':cls==='lost'?'var(--soft)':'var(--bg)';
      const stroke=cls==='run'?'var(--acc)':cls==='err'?'var(--bad)':cls==='next'?'var(--c5)':cls==='lost'?'var(--bad)':'var(--line)';
      const tc=(cls==='run'||cls==='err')?'var(--bg)':'var(--ink)';
      const lab=se?(nd==='__start__'?'START':'END'):(LB[nd]||nd);const w=se?54:p.w;
      const cp=(st.copies||{})[nd]||1;
      for(let k=cp-1;k>=1;k--)b+='<rect x="'+(p.x-w/2+k*4)+'" y="'+(p.y-k*4)+'" width="'+w+'" height="'+bh+'" rx="'+(se?13:6)+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="1.2"/>';
      b+='<rect x="'+(p.x-w/2)+'" y="'+p.y+'" width="'+w+'" height="'+bh+'" rx="'+(se?13:6)+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+(cls==='next'||cls==='lost'?2:1.2)+'"'+(cls==='lost'?' stroke-dasharray="3 2"':'')+'/>';
      b+='<text x="'+p.x+'" y="'+(p.y+17)+'" text-anchor="middle" font-size="'+(se?10:11)+'" fill="'+tc+'"'+(se?' font-weight="600"':'')+'>'+esc(lab)+(cp>1?' ×'+cp:'')+'</text>';
      const bd=(st.badge||{})[nd];if(bd)b+='<text x="'+(p.x+w/2+4)+'" y="'+(p.y+9)+'" font-size="10" fill="var(--c2)" font-weight="600">'+esc(bd)+'</text>'});
    return RD.svg(W,H,b,'Graph '+name);
  }
  return {svg,LAYOUT};
})();

// The super-step player: frames built from one recorded graph run (E1)
window.FLGS=(function(){
  const esc=RD.esc;
  const fmtv=v=>{const s=typeof v==='string'?v:JSON.stringify(v);return s===undefined?'':s};
  const hiddenCh=k=>/^(branch:|join:|__)/.test(k);
  function frames(g){
    const F=[];const S=g.steps;
    const s0=S[0];
    F.push({j:0,ph:'input',title:'Input: invoke({}) on a fresh thread',
      text:'The input is written into the special __start__ channel and checkpoint '+s0.step+' (source "input") is saved. Nothing has run yet.'});
    for(let j=1;j<S.length;j++){
      const st=S[j];const prev=S[j-1];
      if(!st.tasks.length){F.push({j,ph:'done',title:'Checkpoint '+st.step+': nothing is triggered, the run ends',
        text:'No node listens to a channel with a version newer than the one it last saw, so the loop stops. Final state: '+fmtv(g.final)+'.'});break}
      const names=st.tasks.map(t=>t.name);
      const trig=st.tasks.map(t=>t.name+' (listens to '+t.triggers.join(', ')+')');
      const uniq=[...new Set(trig)];
      F.push({j,ph:'plan',title:'Super-step '+(st.step+1)+', plan: which nodes run?',
        text:'LangGraph compares each node’s trigger channels with the versions that node saw last time. Triggered: '+uniq.join('; ')+'. '+(names.length>1?names.length+' tasks will run in parallel.':'One task.')});
      F.push({j,ph:'exec',title:'Super-step '+(st.step+1)+', execute: '+names.join(', '),
        text:(names.length>1?'The tasks run in parallel and each reads the state as of the start of the step; none sees another’s output. ':'The task reads the state as of the start of the step. ')+'Their returned updates are held as pending writes, saved against checkpoint '+st.step+': '+
          st.writes.filter(w=>!hiddenCh(w.channel)).map(w=>w.task+' → '+w.channel+' = '+fmtv(w.value)).join('; ')+'.'});
      const nx=S[j+1];
      if(!nx){F.push({j,ph:'err',title:'Super-step '+(st.step+1)+', update: the writes cannot be applied',
        text:(g.error||'error').replace(/\s+$/,'').replace(/([^.])$/,'$1.')+(g.get_state_error?' Afterwards even get_state() on this thread raises the same error: the two pending writes are saved, and every read re-applies them.':'')});break}
      const upd=(nx.updated||[]).filter(k=>!hiddenCh(k));
      F.push({j:j+1,ph:'update',title:'Super-step '+(st.step+1)+', update: apply the writes, save checkpoint '+nx.step,
        text:'All pending writes are applied together, in a fixed order, through each channel’s reducer'+(upd.length?' (changed: '+upd.join(', ')+')':'')+'. Every channel written gets the next version number, and checkpoint '+nx.step+' is saved.'});
    }
    return F;
  }
  function stateFor(g,f){
    const S=g.steps;const st=S[f.j];const cls={},badge={};
    if(f.ph==='plan'||f.ph==='exec'||f.ph==='err'){st.tasks.forEach(t=>{cls[t.name]=f.ph==='plan'?'next':f.ph==='err'?'err':'run'})}
    for(let k=1;k<=f.j;k++){const s=S[k-1];if(k<f.j||f.ph==='update'||f.ph==='done')(s.tasks||[]).forEach(t=>{if(!cls[t.name])cls[t.name]='done'})}
    if(f.ph==='update'){(S[f.j-1].tasks||[]).forEach(t=>cls[t.name]='done')}
    const copies={};if(g.name==='send')copies.review=3;
    // run counts
    const runs={};for(let k=0;k<S.length;k++){if(k<f.j||(k===f.j&&(f.ph==='exec'||f.ph==='err')))(S[k].tasks||[]).forEach(t=>runs[t.name]=(runs[t.name]||0)+1)}
    Object.keys(runs).forEach(n=>{if(runs[n]>1)badge[n]='ran '+runs[n]+'×'});
    return {cls,badge,copies,runs};
  }
  function chanTable(g,f,showHidden){
    const S=g.steps;const cur=S[Math.min(f.j,S.length-1)];
    const prevSt=f.ph==='update'?S[f.j-1]:null;
    const keys=Object.keys(cur.versions).filter(k=>showHidden||!hiddenCh(k));
    Object.keys(cur.values).forEach(k=>{if(!keys.includes(k)&&(showHidden||!hiddenCh(k)))keys.push(k)});
    if(!keys.length)return '<p class="small mute">No state key holds a value yet: only the hidden <code>__start__</code> channel has been written.</p>';
    let h='<div class="tw"><table class="flg-ct"><thead><tr><th>Channel</th><th class="num">Version</th><th>Value</th></tr></thead><tbody>';
    keys.forEach(k=>{const ch=prevSt&&(cur.versions[k]!==(prevSt.versions||{})[k]);
      h+='<tr'+(ch?' class="flg-chg"':'')+(hiddenCh(k)?' style="color:var(--mute)"':'')+'><td class="mono">'+esc(k)+'</td><td class="num">'+esc(cur.versions[k]||'')+'</td><td class="mono">'+esc(fmtv((cur.values[k]===undefined||cur.values[k]===null)?(hiddenCh(k)?'(trigger)':''):cur.values[k]))+'</td></tr>'});
    h+='</tbody></table></div>';
    if(f.ph==='exec'||f.ph==='err'){h+='<div class="small"><b>Pending writes</b> (saved against checkpoint '+cur.step+', not yet applied):</div><ul class="tight">'+
      cur.writes.filter(w=>showHidden||!hiddenCh(w.channel)).map(w=>'<li class="small mono">'+esc(w.task)+' → '+esc(w.channel)+(w.value!==null&&w.value!==undefined?' = '+esc(fmtv(w.value)):'')+'</li>').join('')+'</ul>'}
    return h;
  }
  function seenTable(g,f){
    const S=g.steps;const cur=S[Math.min(f.j,S.length-1)];
    const rows=Object.keys(cur.seen).filter(n=>!n.startsWith('__'));
    if(!rows.length)return '<p class="small mute">No node has run yet, so versions_seen is empty apart from the input.</p>';
    return '<div class="tw"><table class="flg-ct"><thead><tr><th>Node</th><th>Channel versions it has seen</th></tr></thead><tbody>'+
      rows.map(n=>'<tr><td class="mono">'+esc(n)+'</td><td class="mono">'+esc(Object.entries(cur.seen[n]).map(([k,v])=>k+': '+v).join(', '))+'</td></tr>').join('')+'</tbody></table></div>';
  }
  // o: {card, ctl, svgEl, capEl, tableEl, seenEl, counterEl, tab, getGraph(), hidden()}
  function mount(o){
    let g=o.getGraph(),F=frames(g);
    const draw=i=>{const f=F[Math.min(i,F.length-1)];const st=stateFor(g,f);
      const W=RD.width(o.svgEl);o.svgEl.innerHTML=FLGG.svg(g.name,g.edges,Math.min(W,520),st);
      o.capEl.innerHTML='<div class="t">'+esc(f.title)+'</div><p>'+esc(f.text)+'</p>';
      if(o.tableEl)o.tableEl.innerHTML=chanTable(g,f,o.hidden&&o.hidden());
      if(o.seenEl)o.seenEl.innerHTML=seenTable(g,f);
      if(o.counterEl){const S=g.steps;const ck=f.ph==='err'?f.j:(f.ph==='update'||f.ph==='done'?f.j:f.j);const saved=S.slice(0,ck+1).length;
        const tasks=Object.values(st.runs).reduce((a,b)=>a+b,0);
        o.counterEl.innerHTML=RD.stat('Super-step',f.ph==='input'?'0':String(S[Math.min(f.j,S.length-1)].step+(f.ph==='update'||f.ph==='done'?0:1)),'')+RD.stat('Tasks run',tasks,'node executions so far')+RD.stat('Checkpoints saved',saved,f.ph==='err'?'no new checkpoint: the step failed':'one per super-step, plus the input')}};
    const a=RD.anim({card:o.card,ctl:o.ctl,n:F.length,draw,ms:1700,label:'Step through the run',tab:o.tab});
    return {reload(){g=o.getGraph();F=frames(g);a.reset(F.length)},redraw(){a.redraw()}};
  }
  return {mount,frames};
})();
