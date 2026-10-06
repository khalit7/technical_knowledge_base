// ---- Compaction lab ----
(function(){
const root=document.getElementById('t-compact');if(!root)return;
const H=window.HCTX,S=H.sessions,E=RD.esc,C=window.HCCP,$=id=>document.getElementById(id);
const fmt=n=>Math.round(n).toLocaleString('en-US');
const NM={c1_manual:'Manual compaction, run 1',c1_manual_r2:'Manual compaction, run 2',c1_manual_r3:'Manual compaction, run 3',c1_control:'No compaction, run 1',c1_control_r2:'No compaction, run 2',c1_control_r3:'No compaction, run 3',c4_auto:'Automatic compaction, 100K window (big task)',c3_big_nocompact:'No compaction (big task)'};
const L=Object.keys(NM);
// session viewer
const sel=$('hcp-sel');sel.innerHTML=L.map(l=>'<option value="'+l+'">'+NM[l]+'</option>').join('');
let cur=L[0],M=C.mainCalls(S[cur]);
function log(){const s=S[cur];const rows=[];
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
const A=RD.anim({tab:'t-compact',card:'hcp-card',ctl:'hcp-ctl',n:M.length,start:RD.RM?M.length-1:0,ms:1300,label:'Model call',draw:i=>{const s=S[cur];C.chart($('hcp-chart'),s,i,RD.width($('hcp-chart')));$('hcp-cap').innerHTML=C.captionFor(s,i,M)}});
sel.addEventListener('change',()=>{cur=sel.value;M=C.mainCalls(S[cur]);A.reset(M.length);A.go(RD.RM?M.length-1:0);if(!RD.RM)A.play();log()});
RD.onResize(()=>A.redraw(),'t-compact');log();
// summaries
const SUM=['c1_manual','c1_manual_r2','c1_manual_r3','c4_auto'];
const FACTS=[['Ilse Marten','reviewer (chat)'],['TS-4471','ticket (chat)'],['KESTREL','codename (CLAUDE.md)'],['FAIL test_apostrophes_kept','test output'],['[a-z\']+','the fix'],['git','git'],['commit','commit'],['Python 3.8','Python 3.8 note']];
$('hcp-sum-seg').innerHTML=SUM.map((l,i)=>'<button data-m="'+l+'"'+(i?'':' class="on"')+'>'+NM[l].replace(' (big task)','')+'</button>').join('');
function showSum(l){const t=(S[l].events.find(e=>e.k==='summary')||{}).text||'';
  $('hcp-facts').innerHTML=FACTS.map(([f,n])=>'<span class="pill '+(t.includes(f)?'ok':'bad')+'">'+(t.includes(f)?'has ':'no ')+E(n)+'</span>').join('');
  let h=E(t);['Pending Tasks:','Optional Next Step:','All user messages:'].forEach(k2=>{h=h.split(E(k2)).join('<span class="hcp-hit">'+E(k2)+'</span>')});
  $('hcp-sum').innerHTML=h;}
RD.seg($('hcp-sum-seg'),showSum);showSum(SUM[0]);
// answers
C.probeTable($('hcp-score'),L);
$('hcp-ans-seg').innerHTML=L.map((l,i)=>'<button data-m="'+l+'"'+(i?'':' class="on"')+'>'+NM[l].replace('compaction','').replace(', run ',' ').replace('(big task)','big')+'</button>').join('');
function showAns(l){const f=S[l].finals.filter(x=>x.text&&S[l].turns[x.turn]&&S[l].turns[x.turn].sent.startsWith('Without'));$('hcp-ans').textContent=f.length?f[f.length-1].text:'(no answer recorded)'}
RD.seg($('hcp-ans-seg'),showAns);showAns(L[0]);
// cost table
(function(){
  const rows=[];
  ['c1_manual','c1_manual_r2','c1_manual_r3','c4_auto'].forEach(l=>{const s=S[l],ev=s.events.find(e=>e.k==='compact');
    let turnCost='',hidden='';
    if(ev.trigger==='manual'){const k=s.finals.findIndex(f=>s.turns[f.turn]&&s.turns[f.turn].sent==='/compact');turnCost='$'+(s.finals[k].cost-s.finals[k-1].cost).toFixed(4)}
    else{const f=s.finals[0],sum=s.calls.slice(0,f.after_call).reduce((a,c)=>a+c.in+c.cw+c.cr,0);hidden=f.mu.in+f.mu.cw+f.mu.cr-sum;turnCost='about '+fmt(hidden)+' input tokens, '+fmt(f.mu.in-s.calls.slice(0,f.after_call).reduce((a,c)=>a+c.in,0))+' of them fresh'}
    const nx=s.calls.find((c,gi)=>gi>=ev.at&&c.w==='m');
    rows.push('<tr><td>'+NM[l]+'</td><td class="num">'+fmt(ev.pre)+'</td><td class="num">'+fmt(ev.post)+'</td><td class="num">'+(ev.ms/1000).toFixed(1)+' s</td><td>'+turnCost+'</td><td class="num">'+fmt(nx.cr)+' / '+fmt(nx.cw)+'</td></tr>')});
  $('hcp-cost').innerHTML='<thead><tr><th>Session</th><th class="num">Before</th><th class="num">After</th><th class="num">Took</th><th>Compaction turn</th><th class="num">First call after: read / write</th></tr></thead><tbody>'+rows.join('')+'</tbody>';
})();
})();
