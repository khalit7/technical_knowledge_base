// ---- Graph drawing (2D SVG), for section 2 (the running example) and section 9 (create_agent); the super-step player became the 3D stage 42_js_sc_steps.js (2026-11-06) ----
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
      b+='<text x="'+p.x+'" y="'+(p.y+17)+'" text-anchor="middle" font-size="'+(se?10.5:11)+'" fill="'+tc+'"'+(se?' font-weight="600"':'')+'>'+esc(lab)+(cp>1?' ×'+cp:'')+'</text>';
      const bd=(st.badge||{})[nd];if(bd)b+='<text x="'+(p.x+w/2+4)+'" y="'+(p.y+9)+'" font-size="10.5" fill="var(--c2)" font-weight="600">'+esc(bd)+'</text>'});
    return RD.svg(W,H,b,'Graph '+name);
  }
  return {svg,LAYOUT};
})();
