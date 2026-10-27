// ---- Tables tab ----
(function(){const T=PAPER.tables,RC=PAPER.rc||{},AX=PAPER.meta.ax;if(!$('t4Out'))return;
  const at=a=>A(AX+'#'+a,'arXiv');const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const simple=(id,head,rows,a)=>{let h='<div class="tw"><table><thead><tr>'+head.map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>';rows.forEach(r=>{h+='<tr>'+r.map(x=>'<td>'+esc(x)+'</td>').join('')+'</tr>'});$(id).innerHTML=h+'</tbody></table></div><p class="note">'+(T[a].note?esc(T[a].note)+' ':'')+'Source: '+A(AX+'#'+T[a].at,T[a].title)+'.</p>'};
  simple('t2Out',['Tag','Weight','Role','Key rule'],T.t2.rows,'t2');simple('t1Out',['Goal','Failure without a shared institution','Agora mechanism'],T.t1.rows,'t1');
  simple('t3Out',['Layers','Read band','Kernel','Write band: scalar'],T.t3.rows,'t3');simple('t5Out',['Stage','Quantity','Value'],T.t5.rows,'t5');
  const R=3.3923,B=1.899044;let sort='time';
  function t4(){const rows=T.t4.rows.map((r,i)=>Object.assign({i},r));if(sort==='bpb')rows.sort((a,b)=>a.bpb-b.bpb);
    let h='<div class="tw"><table class="t4"><thead><tr><th>When (UTC), account</th><th class="num">bpb (Δ)</th><th class="num">share</th><th>Change introduced</th></tr></thead><tbody>';
    rows.forEach(r=>{const prev=r.i>0?T.t4.rows[r.i-1].bpb:null;const d=prev==null?'':(r.bpb-prev>=0?'+':'')+(r.bpb-prev).toFixed(4);
      h+='<tr'+(r.i===0?' class="basec"':'')+'><td>'+(r.when||'baseline')+(r.acct?'<br><span class="small mute">'+r.acct+'</span>':'')+'</td><td class="num">'+r.bpb.toFixed(4)+(d?'<br><span class="small mute">'+d+'</span>':'')+'</td><td class="num">'+(r.i?(100*(R-r.bpb)/(R-B)).toFixed(1)+'%':'')+'</td><td>'+esc(r.change)+(r.anc?' <span class="tag">ancestry</span>':'')+(r.v1?'<br><span class="small mute">'+esc(r.v1)+'</span>':'')+'</td></tr>'});
    $('t4Out').innerHTML=h+'</tbody></table></div>'}
  $('t4Note').innerHTML=esc(T.t4.note)+' Δ is the change from the row above in time order. Share is the share of the descent from random to the final score, (3.3923 − bpb) / (3.3923 − 1.899044); negative means worse than random. Source: '+A(AX+'#S4.T4','Table 4')+'.';
  segBind('t4S',m=>{sort=m;t4()});t4();
  if(RC.fig2){let h='<div class="tw"><table><thead><tr><th>Day</th><th class="num">results</th><th class="num">insights, hypotheses, reports</th><th class="num">verifications</th><th class="num">total</th><th class="num">tagged explore_novel or negative</th></tr></thead><tbody>';
    let s=[0,0,0,0,0];RC.fig2.forEach(d=>{h+='<tr><td>'+d.day+'</td><td class="num">'+d.results+'</td><td class="num">'+d.insights_hypotheses_reports+'</td><td class="num">'+d.verifications+'</td><td class="num">'+d.total+'</td><td class="num">'+(d.tagged_explore_novel_or_negative||'')+'</td></tr>';s[0]+=d.results;s[1]+=d.insights_hypotheses_reports;s[2]+=d.verifications;s[3]+=d.total;s[4]+=d.tagged_explore_novel_or_negative});
    $('f2Tab').innerHTML=h+'<tr class="basec"><td>Total</td>'+s.map(x=>'<td class="num">'+fmt(x)+'</td>').join('')+'</tr></tbody></table></div>'}
  let v='<div class="grid">';
  T.versions.rows.forEach(r=>{v+='<div class="sp"><div class="n">'+esc(r.what)+'</div><p><b>v1:</b> '+esc(r.v1)+'</p><p><b>v4:</b> '+esc(r.v4)+' ('+A(AX+'#'+r.at,'v4')+')</p><p class="rt">Website and README: '+esc(r.site)+'</p></div>'});
  $('vOut').innerHTML=v+'</div>';
  if(RC.checks){let c='<div class="tw"><table><thead><tr><th>Check</th><th class="num">ours</th><th class="num">paper</th><th></th></tr></thead><tbody>';
    RC.checks.forEach(k=>{c+='<tr><td>'+esc(k.what)+'</td><td class="num">'+(typeof k.got==='number'&&k.got%1?k.got.toFixed(4):fmt(k.got))+'</td><td class="num">'+k.paper+'</td><td>'+(k.ok?'<span class="ok">agrees</span>':'<span class="no">differs</span>')+'</td></tr>'});
    $('ckOut').innerHTML=c+'</tbody></table></div><p class="note">Tolerances: exact for counts; 0.005 for printed percentages; 0.05 bits per byte for our rebuild against the paper (different texts, one donor). Also derived: "first three improvements, 93%" implies a third new best near '+RC.third_best_for_93pct.toFixed(3)+', which Table 4 does not list; Table 4\'s first two improvements already reach '+(100*RC.share_first_two_improvements).toFixed(1)+'%, so version 1\'s "first eight improvements, roughly 70%" cannot be right.</p>'}
})();
