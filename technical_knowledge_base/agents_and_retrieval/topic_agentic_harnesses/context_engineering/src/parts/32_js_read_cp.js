// ---- Reading section 4: compaction, call by call (real per-call usage from the recordings) ----
window.HCCP=(function(){
const H=window.HCTX,S=H.sessions,E=RD.esc;
const fmt=n=>Math.round(n).toLocaleString('en-US');
// shared by the Reading card and the Compaction lab
function mainCalls(s){const out=[];s.calls.forEach((c,i)=>{if(c.w==='m')out.push({c,i})});return out}
function captionFor(s,mi,M){
  const gi=M[mi].i,c=M[mi].c,tot=c.in+c.cw+c.cr;
  const parts=[];
  s.turns.forEach(t=>{if(t.call0===gi&&!/^\/(context)$/.test(t.sent))parts.push('<b>User:</b> '+E(t.sent.length>140?t.sent.slice(0,140)+'...':t.sent))});
  s.events.filter(e=>e.k==='compact'&&e.at===gi).forEach(e=>parts.push('<b>Compaction ('+e.trigger+'):</b> '+fmt(e.pre)+' tokens summarised to '+fmt(e.post)+' in '+(e.ms/1000).toFixed(1)+' s. This call starts from the summary.'));
  s.events.filter(e=>e.k==='compact_status'&&e.at===gi&&e.result==='failed').forEach(e=>parts.push('<b>Compaction attempt failed</b> ('+E(e.error)+'): too little history to summarise yet.'));
  const tools=s.events.filter(e=>e.k==='tool'&&e.at===gi).map(e=>E(e.name)+(e.arg?' <code>'+E(String(e.arg).slice(0,60))+'</code>':''));
  const txt=s.events.filter(e=>e.k==='text'&&e.at===gi).map(e=>e.text)[0];
  if(tools.length)parts.push('<b>Model:</b> '+tools.join(', '));
  else if(txt)parts.push('<b>Model:</b> '+E(txt.slice(0,150))+(txt.length>150?'...':''));
  return '<div class="t">Call '+(mi+1)+' of '+M.length+': '+fmt(tot)+' tokens in the request</div><p>cache read '+fmt(c.cr)+', cache write '+fmt(c.cw)+', fresh '+c.in+'</p><p>'+parts.join('<br>')+'</p>';
}
function chart(el,s,upto,W){
  const M=mainCalls(s),n=M.length,h=190,pl=46,pr=8,pt=14,pb=24,iw=W-pl-pr,ih=h-pt-pb;
  const max=Math.max(...M.map(m=>m.c.in+m.c.cw+m.c.cr))*1.08,bw=Math.max(3,Math.min(34,iw/n*0.72)),x=i=>pl+iw*(i+0.5)/n,y=v=>pt+ih*(1-v/max);
  let g='';
  [0,0.5,1].forEach(f=>{const v=max/1.08*f;g+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+RD.t(pl-4,y(v)+4,v>=1000?Math.round(v/1000)+'k':Math.round(v),{a:'end',fs:10,fill:'var(--mute)'})});
  M.forEach((m,i)=>{if(i>upto)return;const c=m.c;let y0=y(0);
    [['cr','var(--c1)'],['cw','var(--c5)'],['in','var(--c2)']].forEach(([key,col])=>{const v=c[key];if(!v)return;const hh=ih*v/max;g+='<rect x="'+(x(i)-bw/2)+'" y="'+(y0-hh)+'" width="'+bw+'" height="'+hh+'" fill="'+col+'"/>';y0-=hh});
    if(i===upto)g+='<rect x="'+(x(i)-bw/2-2)+'" y="'+(y(c.in+c.cw+c.cr)-2)+'" width="'+(bw+4)+'" height="'+(y(0)-y(c.in+c.cw+c.cr)+2)+'" fill="none" stroke="var(--ink)" stroke-width="1.5"/>';
  });
  s.events.filter(e=>e.k==='compact').forEach(e=>{const mi=M.findIndex(m=>m.i>=e.at);if(mi<0||mi>upto)return;const xx=x(mi)-iw/n/2;
    g+='<line x1="'+xx+'" x2="'+xx+'" y1="'+pt+'" y2="'+(h-pb)+'" stroke="var(--bad)" stroke-dasharray="4 3" stroke-width="1.5"/>'+RD.t(Math.min(xx+4,W-150),pt+8,'compaction ('+e.trigger+')',{fs:11,fill:'var(--bad)',w:600})});
  s.turns.forEach(t=>{const mi=M.findIndex(m=>m.i>=t.call0);if(mi<=0||mi>upto||t.sent.startsWith('/'))return;const xx=x(mi)-iw/n/2;
    g+='<line x1="'+xx+'" x2="'+xx+'" y1="'+(pt+14)+'" y2="'+(h-pb)+'" stroke="var(--mute)" stroke-dasharray="2 3"/>'+(xx>W-70?RD.t(xx-3,h-pb-4,'question',{fs:10,fill:'var(--mute)',a:'end'}):RD.t(xx+3,h-pb-4,'question',{fs:10,fill:'var(--mute)'}))});
  g+=RD.t(pl,h-6,'model calls in order (main loop) →',{fs:10,fill:'var(--mute)'});
  el.innerHTML=RD.svg(W,h,g,'Tokens per model call');
}
// probe table
function probeTable(el,labels){
  const P=H.probe_scores;if(!el||!P)return;
  const NM={c1_manual:'Manual compaction, run 1',c1_manual_r2:'Manual compaction, run 2',c1_manual_r3:'Manual compaction, run 3',c1_control:'No compaction, run 1',c1_control_r2:'No compaction, run 2',c1_control_r3:'No compaction, run 3',c4_auto:'Automatic compaction (big task)',c3_big_nocompact:'No compaction (big task, 130K)'};
  const pill=v=>v?'<span class="pill '+(v==='ok'?'ok':v==='lost'?'mid':'bad')+'">'+v+'</span>':'<span class="mute">n/a</span>';
  el.innerHTML='<thead><tr><th>Session</th>'+P.probes.map(p=>'<th>'+E(p)+'</th>').join('')+'</tr></thead><tbody>'+
   labels.map(l=>{const r=P.rows[l];return '<tr><td>'+NM[l]+'</td>'+['a','b','c','d','e'].map(q=>'<td title="'+E(r['why_'+q]||'')+'">'+pill(r[q])+'</td>').join('')+'</tr>'}).join('')+'</tbody>';
}
// Reading card
(function(){
  const el=document.getElementById('hc-cp');if(!el)return;
  const seg=document.getElementById('hc-cp-seg'),cap=document.getElementById('hc-cp-cap');
  const V=[['c1_manual','Manual /compact'],['c1_control','Same task, no compaction'],['c4_auto','Automatic, 100K window'],['c3_big_nocompact','Big task, no compaction']];
  let cur=0,M=mainCalls(S[V[0][0]]);
  seg.innerHTML=V.map((v,i)=>'<button data-m="'+i+'"'+(i?'':' class="on"')+'>'+v[1]+'</button>').join('');
  const A=RD.anim({card:'hc-cp-card',ctl:'hc-cp-ctl',n:M.length,start:RD.RM?M.length-1:0,ms:1500,label:'Model call',draw:i=>{const s=S[V[cur][0]];chart(el,s,i,RD.width(el));cap.innerHTML=captionFor(s,i,M)}});
  RD.seg(seg,m=>{cur=+m;M=mainCalls(S[V[cur][0]]);A.reset(M.length);if(RD.RM)A.go(M.length-1);else A.play()});
  RD.onResize(()=>A.redraw());
  probeTable(document.getElementById('hc-cp-tab'),['c1_manual','c1_manual_r2','c1_manual_r3','c1_control','c1_control_r2','c1_control_r3','c4_auto','c3_big_nocompact']);
})();
return {mainCalls,captionFor,chart,probeTable};
})();
