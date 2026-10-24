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
  M.forEach((m,i)=>{if(i>upto){const t=m.c.in+m.c.cw+m.c.cr;g+='<rect x="'+(x(i)-bw/2)+'" y="'+y(t)+'" width="'+bw+'" height="'+(y(0)-y(t))+'" fill="none" stroke="var(--dim)" stroke-dasharray="2 2"/>';return}const c=m.c;let y0=y(0);
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
  const V=[['c1_manual','Manual /compact'],['c1_control','No compaction'],['c4_auto','Automatic, 100K window'],['c3_big_nocompact','Big task, no compaction']];
  let cur=0,M=mainCalls(S[V[0][0]]);
  seg.innerHTML=V.map((v,i)=>'<button data-m="'+i+'"'+(i?'':' class="on"')+'>'+v[1]+'</button>').join('');
  const A=RD.anim({card:'hc-cp-card',ctl:'hc-cp-ctl',n:M.length,ms:1500,label:'Model call',draw:i=>{const s=S[V[cur][0]];chart(el,s,i,RD.width(el));cap.innerHTML=captionFor(s,i,M)}});
  RD.seg(seg,m=>{cur=+m;M=mainCalls(S[V[cur][0]]);A.reset(M.length)});
  RD.onResize(()=>A.redraw());
  probeTable(document.getElementById('hc-cp-tab'),['c1_manual','c1_manual_r2','c1_manual_r3','c1_control','c1_control_r2','c1_control_r3','c4_auto','c3_big_nocompact']);
})();
return {mainCalls,captionFor,chart,probeTable};
})();
// ---- Section 4 evidence: summaries verbatim, every session's events, the answers, what each compaction cost ----
(function(){
const sel=document.getElementById('hcp-sel');if(!sel)return;
const H=window.HCTX,S=H.sessions,E=RD.esc,C=window.HCCP,$=id=>document.getElementById(id);
const fmt=n=>Math.round(n).toLocaleString('en-US');
const NM={c1_manual:'Manual compaction, run 1',c1_manual_r2:'Manual compaction, run 2',c1_manual_r3:'Manual compaction, run 3',c1_control:'No compaction, run 1',c1_control_r2:'No compaction, run 2',c1_control_r3:'No compaction, run 3',c4_auto:'Automatic compaction, 100K window (big task)',c3_big_nocompact:'No compaction (big task)'};
const L=Object.keys(NM);
sel.innerHTML=L.map(l=>'<option value="'+l+'">'+NM[l]+'</option>').join('');
function log(cur){const s=S[cur];const rows=[];
  const sendAt={};s.turns.forEach(t=>{(sendAt[t.call0]=sendAt[t.call0]||[]).push(t)});
  let mi=0;s.calls.forEach((c,gi)=>{
    (sendAt[gi]||[]).forEach(t=>rows.push('<div><span class="k">user</span>'+E(t.sent.length>200?t.sent.slice(0,200)+'...':t.sent)+'</div>'));
    s.events.filter(e=>e.at===gi&&(e.k==='compact'||e.k==='compact_status')).forEach(e=>rows.push('<div class="cmp"><span class="k">compaction</span>'+(e.k==='compact'?e.trigger+': '+fmt(e.pre)+' to '+fmt(e.post)+' tokens in '+(e.ms/1000).toFixed(1)+' s':'attempt '+E(e.result)+(e.error?' ('+E(e.error)+')':''))+'</div>'));
    if(c.w!=='m')return;mi++;
    rows.push('<div><span class="k">call '+mi+'</span>'+fmt(c.in+c.cw+c.cr)+' tokens (read '+fmt(c.cr)+', write '+fmt(c.cw)+')</div>');
    s.events.filter(e=>e.at===gi&&e.k==='tool').forEach(e=>rows.push('<div><span class="k">&nbsp;&nbsp;tool</span>'+E(e.name)+' <code>'+E(String(e.arg))+'</code></div>'));
    s.events.filter(e=>e.at===gi&&e.k==='res').forEach(e=>rows.push('<div><span class="k">&nbsp;&nbsp;result</span>'+fmt(e.chars)+' characters'+(e.err?' <b style="color:var(--bad)">error</b> '+E(e.head||''):'')+'</div>'));
    s.events.filter(e=>e.at===gi&&e.k==='denied').forEach(e=>rows.push('<div><span class="k">&nbsp;&nbsp;denied</span>'+E(e.msg)+'</div>'));
  });
  s.ctx.forEach(c=>rows.push('<div><span class="k">/context</span>'+fmt(c.total)+' of '+fmt(c.window)+': '+Object.entries(c.cats).map(([k2,v])=>E(k2)+' '+fmt(v)).join(', ')+'</div>'));
  $('hcp-log').innerHTML=rows.join('');
}
sel.addEventListener('change',()=>log(sel.value));log(L[0]);
// summaries
const SUM=['c1_manual','c1_manual_r2','c1_manual_r3','c4_auto'];
const FACTS=[['Ilse Marten','reviewer (chat)'],['TS-4471','ticket (chat)'],['KESTREL','codename (CLAUDE.md)'],['FAIL test_apostrophes_kept','test output'],['[a-z\']+','the fix'],['commit','commit'],['Python 3.8','Python 3.8 note']];
$('hcp-sum-seg').innerHTML=SUM.map((l,i)=>'<button data-m="'+l+'"'+(i?'':' class="on"')+'>'+NM[l].replace(' compaction','').replace(', 100K window (big task)','')+'</button>').join('');
function showSum(l){const t=(S[l].events.find(e=>e.k==='summary')||{}).text||'';
  $('hcp-facts').innerHTML=FACTS.map(([f,n])=>'<span class="pill '+(t.includes(f)?'ok':'bad')+'">'+(t.includes(f)?'has ':'no ')+E(n)+'</span>').join('');
  let h=E(t);['Pending Tasks:','Optional Next Step:','All user messages:'].forEach(k2=>{h=h.split(E(k2)).join('<span class="hit">'+E(k2)+'</span>')});
  $('hcp-sum').innerHTML=h;
  const sec=k2=>{const i=t.indexOf(k2);if(i<0)return '';const j=t.indexOf('\n\n',i);let z=t.slice(i,j>0?j:t.length);return z.length>520?z.slice(0,500)+' ...':z};
  const x=sec('Pending Tasks:')+'\n...\n'+sec('Optional Next Step:');
  let hx=E(x);['Pending Tasks:','Optional Next Step:'].forEach(k2=>{hx=hx.split(E(k2)).join('<span class="hit">'+E(k2)+'</span>')});
  $('hcp-sum-x').innerHTML=hx||'(no such headings)';}
RD.seg($('hcp-sum-seg'),showSum);showSum(SUM[0]);
// answers
$('hcp-ans-seg').innerHTML=L.map((l,i)=>'<button data-m="'+l+'"'+(i?'':' class="on"')+'>'+NM[l].replace(' compaction','').replace(', run ',' ').replace(', 100K window (big task)','').replace(' (big task)',', big')+'</button>').join('');
function showAns(l){const f=S[l].finals.filter(x=>x.text&&S[l].turns[x.turn]&&S[l].turns[x.turn].sent.startsWith('Without'));$('hcp-ans').textContent=f.length?f[f.length-1].text:'(no answer recorded)'}
RD.seg($('hcp-ans-seg'),showAns);showAns(L[0]);
// cost table
const rows=[];
SUM.forEach(l=>{const s=S[l],ev=s.events.find(e=>e.k==='compact');
  let turnCost='';
  if(ev.trigger==='manual'){const k=s.finals.findIndex(f=>s.turns[f.turn]&&s.turns[f.turn].sent==='/compact');turnCost='$'+(s.finals[k].cost-s.finals[k-1].cost).toFixed(4)}
  else{const f=s.finals[0],sum=s.calls.slice(0,f.after_call).reduce((a,c)=>a+c.in+c.cw+c.cr,0);const hidden=f.mu.in+f.mu.cw+f.mu.cr-sum;turnCost='about '+fmt(hidden)+' input tokens, '+fmt(f.mu.in-s.calls.slice(0,f.after_call).reduce((a,c)=>a+c.in,0))+' of them fresh'}
  const nx=s.calls.find((c,gi)=>gi>=ev.at&&c.w==='m');
  rows.push('<tr><td>'+NM[l]+'</td><td class="num">'+fmt(ev.pre)+'</td><td class="num">'+fmt(ev.post)+'</td><td class="num">'+(ev.ms/1000).toFixed(1)+' s</td><td>'+turnCost+'</td><td class="num">'+fmt(nx.cr)+' / '+fmt(nx.cw)+'</td></tr>')});
$('hcp-cost').innerHTML='<thead><tr><th>Session</th><th class="num">Before</th><th class="num">After</th><th class="num">Took</th><th>Compaction turn</th><th class="num">First call after: read / write</th></tr></thead><tbody>'+rows.join('')+'</tbody>';
})();
