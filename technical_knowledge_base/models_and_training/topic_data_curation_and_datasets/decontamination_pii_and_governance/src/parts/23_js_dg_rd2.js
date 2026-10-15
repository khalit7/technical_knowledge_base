// ---- Reading tab: measured panels (sections 3, 4, 7, 8) ----
window.DGC={copy:'var(--bad)',similar:'var(--mute)',variant:'var(--c5)',source:'var(--c4)',passage:'var(--c1)',phrase:'var(--c3)',diagram:'var(--c6)'};
window.DGCAT=['copy','variant','source','passage','phrase','diagram'];
(function(){
  const E=RD.esc, $=id=>document.getElementById(id), f=n=>n==null?'-':Number(n).toLocaleString('en-GB');
  const C=DG.corpora;
  // section 3: documents flagged by rule
  const mt=$('dg-meas-tab');
  if(mt){let h='<table><thead><tr><th>Corpus</th><th class="num">documents</th><th class="num">any 5-gram</th><th class="num">any 8-gram</th><th class="num">any 13-gram (GPT-3)</th><th class="num">Tulu 3 rule</th><th class="num">datatrove default</th></tr></thead><tbody>';
    C.forEach(c=>{const dt=c.dt&&c.dt.default;
      h+='<tr><td>'+E(c.label)+'</td><td class="num">'+f(c.docs)+'</td><td class="num">'+f(c.any5)+' <span class="mute">('+(100*c.any5/c.docs).toFixed(0)+'%)</span></td><td class="num">'+f(c.any8)+'</td><td class="num">'+f(c.any13)+'</td><td class="num">'+f(c.tulu_docs)+'</td><td class="num">'+(dt?f(dt.docs):'<span class="mute">not run</span>')+'</td></tr>'});
    mt.innerHTML=h+'</tbody></table>'}
  // section 3: categories of flagged pairs
  const cb=$('dg-cat-bars');
  if(cb){let h='<div class="leg">'+DGCAT.map(k=>'<span style="--sw:'+DGC[k]+'">'+k+'</span>').join('')+'</div>';
    C.filter(c=>c.pairs).forEach(c=>{const t=c.pairs;
      h+='<div class="dg-crow"><span class="nm" title="'+E(c.label)+'">'+E(c.key.replace(/_/g,' '))+'</span><div class="dg-stack" role="img" aria-label="'+E(c.label)+'">'+
        DGCAT.map(k=>c.cats[k]?'<span style="width:'+(100*c.cats[k]/t).toFixed(2)+'%;background:'+DGC[k]+'" title="'+k+': '+c.cats[k]+'"></span>':'').join('')+'</div><span class="v">'+f(t)+'</span></div>'});
    cb.innerHTML=h+'<p class="small mute">Bar length: share of the corpus\'s flagged pairs; number: pairs. Hover a segment for its count.</p>'}
  // section 4: embedding nearest neighbours
  const ev=$('dg-emb-view'), EM=DG.emb;
  if(ev&&EM){const lab=EM.labels||{};
    let h='<div class="tw"><table><thead><tr><th>Test item</th><th>Nearest training prompt</th><th class="num">cosine</th><th>Label</th></tr></thead><tbody>';
    EM.top.slice(0,14).forEach(r=>{h+='<tr><td><b>'+E(DG.bench_names[r.b])+' #'+r.x+'</b><br><span class="small">'+E(r.q)+'</span></td><td><span class="small mute">'+E(r.c)+'</span><br><span class="small">'+E(r.t)+'</span>'+(r.note?'<br><span class="small mute">'+E(r.note)+'</span>':'')+'</td><td class="num">'+r.s.toFixed(3)+'</td><td style="white-space:nowrap"><span style="color:'+(DGC[r.lab]||'var(--mute)')+';font-weight:600">'+E(r.lab||'')+'</span>'+(r.ng?'<br><span class="small mute">n-gram flagged too</span>':'')+'</td></tr>'});
    const st=EM.stats||{};
    h+='</tbody></table></div><p class="small">Nearest-prompt similarity per benchmark (items with a training prompt at 0.95 / 0.90 / 0.85 or more): '+Object.keys(st).map(b=>E(DG.bench_names[b])+' '+st[b].s95+' / '+st[b].s90+' / '+st[b].s85+' of '+f(st[b].n)).join('; ')+'.</p>';
    ev.innerHTML=h}
  // section 7: PII detectors
  const ps=$('dg-pii-sum'), PI=DG.pii;
  if(ps&&PI){const S=PI.summary, G=PI.gold_types, types=Object.keys(G);
    const names={datatrove:'datatrove PIIFormatter',dolma:'Dolma pii_regex_v1',extra:'extra regexes (root lab)',presidio:'Presidio, all types',presidio_ids:'Presidio, identifiers only',presidio_05:'Presidio, identifiers, score at least 0.5'};
    let h='<div class="tw"><table><thead><tr><th>Detector</th>'+types.map(t=>'<th class="num">'+t+'<br><span class="mute">'+G[t]+'</span></th>').join('')+'<th class="num">recall</th><th class="num">false alarms</th></tr></thead><tbody>';
    Object.keys(names).forEach(k=>{const s=S[k];if(!s)return;h+='<tr><td>'+names[k]+'</td>'+types.map(t=>'<td class="num">'+(s.hit[t]||0)+'</td>').join('')+'<td class="num"><b>'+Math.round(100*s.recall)+'%</b></td><td class="num">'+s.false_alarms+'</td></tr>'});
    ps.innerHTML=h+'</tbody></table></div><p class="small mute">Columns: gold spans of each type (count under the name) that the detector overlapped. "Identifiers only" drops Presidio\'s DATE_TIME, URL and NRP results.</p>'}
  // section 8: opt-out signals
  const ov=$('dg-opt-view'), O=DG.optout, RN=DG.robots_now;
  if(ov&&O&&RN){const c=RN.counts,b=RN.blocked_by_agent;
    let h='<div class="out">'+RD.stat('raw responses, July 2024',f(O.records),'one WARC file')+RD.stat('with a noai tag or header',f((O.records_meta_noai||0)+(O.records_header_noai||0)),'meta robots or X-Robots-Tag')+
      RD.stat('with tdm-reservation: 1',f((O.records_meta_tdm_reservation||0)+(O.records_header_tdm_reservation||0)),'TDMRep meta or header')+RD.stat('with Content-Usage header',f(O.records_header_content_usage||0),'IETF aipref draft')+'</div>';
    h+='<div class="out">'+RD.stat('FineWeb kept from this WARC',f(c.docs),'documents')+RD.stat('whose host now has a robots.txt',f(c.with_robots),RN.date)+RD.stat('now blocked for an AI trainer',f(c.blocked_any_ai_trainer),(100*c.blocked_any_ai_trainer/c.docs).toFixed(1)+'% of kept documents')+RD.stat('now blocked for every crawler (*)',f(c.blocked_star),'')+'</div>';
    const ag=Object.keys(b).sort((x,y)=>b[y]-b[x]),mx=Math.max(...ag.map(a=>b[a]));
    h+='<div class="rd-bars">'+ag.map(a=>'<div><span class="nm">'+E(a)+'</span><span class="tr"><span style="width:'+(100*b[a]/mx).toFixed(1)+'%"></span></span><span class="v">'+f(b[a])+'</span></div>').join('')+'</div>';
    h+='<p class="small">Unreachable hosts: '+f(c.unreachable)+'; no robots.txt (4xx): '+f(c.no_robots_4xx_or_other)+'; server errors: '+f(c.server_error)+'. Documents kept in FineWeb that carried a noai signal in 2024: '+f((O.fineweb_kept_meta_noai||0)+(O.fineweb_kept_header_noai||0))+'.</p>';
    ov.innerHTML=h}
})();
