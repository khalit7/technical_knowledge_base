// ---- Reading section 8: one changing fact (the gateway) through four memory stores, session by session (data: 36_js_mem_data.js) ----
(function(){
const card=document.getElementById('hc-mem-card');if(!card||!window.HMEM)return;
const M=window.HMEM,E=RD.esc,$=id=>document.getElementById(id);
const day=s=>Date.parse(s+'T00:00:00Z'),D0=day('2026-08-30'),D1=day('2026-10-07'),NOW=day('2026-10-06');
const tag=t=>/in front|redeploy|reintroduce|putting LiteLLM back/i.test(t)?'LiteLLM in front of OpenRouter':/OpenRouter/.test(t)?'OpenRouter':/LiteLLM/.test(t)?'LiteLLM':t.slice(0,20);
const N=M.steps.length+1;
function stepSession(i){return i<M.steps.length?M.steps[i].s:M.dates.length-1}
function stepDate(i){return i<M.steps.length?day(M.steps[i].d):NOW}
// lanes of bars for step i: [{lane, rows:[{segs:[{a,b,t,st}]}], note}]
function lanes(i){
  const si=stepSession(i),cut=stepDate(i),L=[];
  // paper loop: one row per memory id, a new segment whenever its text changes
  const ids=[];M.paper.forEach((p,k)=>{if(k<=si)Object.keys(p.st).forEach(id=>{if(!ids.includes(id))ids.push(id)})});
  L.push({lane:'Mem0 paper loop: UPDATE rewrites in place',rows:ids.map(id=>{const segs=[];let prev=null;
    M.paper.forEach((p,k)=>{if(k>si)return;const t=p.st[id];if(!t){prev=null;return}
      if(prev&&prev.t===t)prev.b=k;else{if(prev)prev.st='old';prev={a:k,b:k,t};segs.push(prev)}});
    return {segs:segs.map(s=>({a:day(M.dates[s.a]),b:s.st==='old'?day(M.dates[s.b+1]):cut,t:s.t,st:s.st||'cur'}))}})});
  // Mem0 2.2.1: every memory stays
  L.push({lane:'Mem0 2.2.1 library: ADD-only, all kept',rows:M.mem0.filter(m=>m.s<=si).map(m=>({segs:[{a:day(M.dates[m.s]),b:cut,t:m.t,st:'cur'}]}))});
  // Graphiti: validity windows
  L.push({lane:'Graphiti 0.30.2: edges closed with a date',rows:M.graph.filter(e=>e.s0<=si).map(e=>{const closed=e.sc!==null&&e.sc<=si;
    return {segs:[{a:day(e.va||M.dates[e.s0]),b:closed?day(e.ia):cut,t:e.f,st:closed?(e.v==='wrong'?'wrong':'closed'):'cur'}]}})});
  // Letta: archival notes (core block never held the fact)
  const z=M.letta[si];
  L.push({lane:'Letta 0.16.8: notes filed in the archive',rows:z.notes.map(n=>{const k=M.letta.findIndex(x=>x.notes.includes(n));return {segs:[{a:day(M.dates[k]),b:cut,t:n,st:'cur'}]}}),note:z.core?'':'core block (always in the prompt): no gateway fact'});
  return L;
}
function draw(i){
  const el=$('hc-mem'),W=RD.width(el),narrow=W<560,lw=narrow?0:170,x0=lw+4,x1=W-6,x=t=>x0+(t-D0)/(D1-D0)*(x1-x0),L=lanes(i),cut=stepDate(i);
  let g='',y=18;
  // date axis
  ['2026-09-01','2026-09-15','2026-10-01'].forEach(d=>{g+='<line x1="'+x(day(d))+'" x2="'+x(day(d))+'" y1="10" y2="9999" stroke="var(--line)"/>'+RD.t(x(day(d)),11,d.slice(5).replace('-','/'),{fs:11,a:'middle',fill:'var(--mute)'})});
  const FL=lanes(N-1);
  L.forEach((l,li)=>{
    if(narrow){g+=RD.t(2,y+12,E(l.lane),{fs:11.5,w:600});y+=16}
    else g+=RD.t(2,y+12,E(l.lane.split(':')[0]),{fs:11.5,w:600})+RD.t(2,y+26,E(l.lane.split(':')[1].trim()),{fs:11,fill:'var(--mute)'});
    const y0=y;
    FL[li].rows.forEach((fr,ri)=>{fr.segs.forEach(s=>{const a=x(s.a),b=Math.max(a+4,x(s.b));g+='<rect x="'+a+'" y="'+(y+2+17*ri)+'" width="'+(b-a)+'" height="14" rx="2" fill="none" stroke="var(--dim)" stroke-dasharray="2 2"/>'})});
    l.rows.forEach(r=>{r.segs.forEach(s=>{const a=x(s.a),b=Math.max(a+4,x(s.b)),col=s.st==='cur'?'var(--c1)':s.st==='wrong'?'var(--bad)':'var(--dim)';
      g+='<rect x="'+a+'" y="'+(y+2)+'" width="'+(b-a)+'" height="14" rx="2" fill="'+col+'"><title>'+E(s.t)+'</title></rect>';
      const lab=tag(s.t)+(s.st==='wrong'?' (closed wrongly)':s.st==='closed'?' (closed)':s.st==='old'?' (overwritten)':'');
      const tw=lab.length*6.1,inFill=s.st==='cur'||s.st==='wrong'?'var(--bg)':'var(--ink)';
      if(b-a>tw+8)g+=RD.t(a+4,y+13,E(lab),{fs:11,fill:inFill});
      else if(s.st==='old'){}
      else if(b+tw+4<x1)g+=RD.t(b+4,y+13,E(lab),{fs:11,fill:'var(--mute)'});
      else if(a-tw-4>=0)g+=RD.t(a-4,y+13,E(lab),{fs:11,a:'end',fill:'var(--mute)'});
      else{const sh=tag(s.t),sw=sh.length*6.1;
        if(b-a>sw+8)g+=RD.t(a+4,y+13,E(sh),{fs:11,fill:inFill});
        else if(a-sw-4>=0)g+=RD.t(a-4,y+13,E(sh),{fs:11,a:'end',fill:'var(--mute)'});
        else if(b+sw+4<x1)g+=RD.t(b+4,y+13,E(sh),{fs:11,fill:'var(--mute)'})}});y+=17});
    y=Math.max(y,y0+17*FL[li].rows.length);
    if(l.note){g+=RD.t(x0,y+13,E(l.note),{fs:11,fill:'var(--mute)'});y+=17}
    y=Math.max(y,y0+(narrow?0:30))+8});
  g+='<line x1="'+x(cut)+'" x2="'+x(cut)+'" y1="14" y2="'+y+'" stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="3 2"/>';
  el.innerHTML=RD.svg(W,y,g.replace(/y2="9999"/g,'y2="'+y+'"'),'What four memory stores held about the gateway after each session');
  // caption and verbatim store
  const cap=$('hc-mem-cap'),st=$('hc-mem-store');
  if(i<M.steps.length){const s=M.steps[i];
    cap.innerHTML='<div class="t">Session '+(s.s+1)+' of 12, '+s.d+'</div><p>Sam: "'+E(s.u)+'"</p>';
    let h='';const p=M.paper[s.s];
    h+='<div><b>Paper loop:</b> '+Object.values(p.st).map(E).join(' | ')+(p.ops.filter(o=>o.op==='UPDATE').map(o=>' <span class="x">'+E(o.old)+'</span>').join(''))+'</div>';
    h+='<div><b>Mem0 2.2.1:</b> '+M.mem0.filter(m=>m.s<=s.s).map(m=>E(m.t)).join(' | ')+'</div>';
    h+='<div><b>Graphiti:</b> '+M.graph.filter(e=>e.s0<=s.s).map(e=>{const c=e.sc!==null&&e.sc<=s.s;return c?'<span class="x">'+E(e.f)+'</span> (invalid_at '+e.ia+(e.v==='wrong'?', wrong':'')+')':E(e.f)}).join(' | ')+'</div>';
    h+='<div><b>Letta:</b> '+(M.letta[s.s].notes.map(E).join(' | ')||'(nothing filed)')+'</div>';
    st.innerHTML=h;
  }else{
    cap.innerHTML='<div class="t">Asked on 6 Oct: "'+E(M.q)+'"</div><p>Reference answer: '+E(M.gold)+'.</p>';
    const A=[['Paper loop (Haiku reads)','paper_haiku|haiku'],['Mem0 2.2.1 (Haiku reads)','mem0|haiku'],['Graphiti (Haiku reads)','graphiti_haiku|haiku'],['Letta, its own loop (local 4B)','letta|local'],['Full history (Haiku reads)','full|haiku']];
    st.innerHTML=A.map(([n,k])=>{const a=M.ans[k];return '<div><span class="pill '+(a[1]?'ok':'bad')+'">'+(a[1]?'right':'wrong')+'</span><b>'+n+':</b> '+E(a[0].length>260?a[0].slice(0,260)+'...':a[0])+'</div>'}).join('');
  }
}
const A=RD.anim({card:'hc-mem-card',ctl:'hc-mem-ctl',n:N,ms:2200,label:'Session',draw});
RD.onResize(()=>A.redraw());
})();
