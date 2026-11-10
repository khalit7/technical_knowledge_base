// ---- Reading tab (new parts): arithmetic, trailing space, letters, glitch tokens, drills (the pipeline animation became Fig. 1, 41_js_sc_hero.js, 2026-11-10) ----
(function(){
  if(!window.TKR)return;
  const {N,pct,$}=TKR,{esc,fmt,strChips}=TKV;
  // arithmetic: plain against commas
  if($('tk-arith')&&N.arith.olmo){let m='olmo';
    const dig=(want,got)=>{const w=want.replace(/,/g,''),g=got.replace(/,/g,'');if(!/^\d+$/.test(g))return '<span style="color:var(--bad)">'+esc(got||'(no number)')+'</span>';
      const L=Math.max(w.length,g.length),ww=w.padStart(L,' '),gg=g.padStart(L,' ');let o='';for(let i=0;i<L;i++){if(gg[i]===' ')continue;o+='<span style="color:'+(gg[i]===ww[i]?'var(--good)':'var(--bad)')+'">'+gg[i]+'</span>'}return o};
    function draw(){const d=N.arith[m];
      if(!d){$('tk-arStats').innerHTML='';$('tk-arRows').innerHTML='<p class="small">Not recorded yet.</p>';return}
      $('tk-arStats').innerHTML=RD.stat('Exact, plain',pct(d.plain.acc,0))+RD.stat('Exact, commas',pct(d.comma.acc,0))+RD.stat('Digits right, plain',pct(d.plain.dig,0),'right-aligned')+RD.stat('Digits right, commas',pct(d.comma.dig,0),'right-aligned');
      let h='<table class="wide"><thead><tr><th>Problem</th><th class="num">Truth</th><th class="num">Plain: answer</th><th class="num">Commas: answer</th></tr></thead><tbody>';
      d.plain.rows.slice(0,14).forEach((r,i)=>{const c=d.comma.rows[i];h+='<tr><td>'+r[0]+' + '+r[1]+'</td><td class="num">'+r[2]+'</td><td class="num" style="font-family:ui-monospace,Menlo,monospace">'+dig(r[2],r[3])+'</td><td class="num" style="font-family:ui-monospace,Menlo,monospace">'+dig(c[2],c[3])+'</td></tr>'});
      $('tk-arRows').innerHTML=h+'</tbody></table><p class="small mute">First 14 of '+d.n+' problems. How the question is tokenized, plain: '+d.plain.pieces[0].map(esc).map(s=>'<code>'+s.replace(/ /g,'␣')+'</code>').join(' ')+'; commas: '+d.comma.pieces[0].map(esc).map(s=>'<code>'+s.replace(/ /g,'␣')+'</code>').join(' ')+'.</p>'}
    RD.seg($('tk-arModel'),v=>{m=v;draw()});draw();
    const o=N.arith.olmo,q=N.arith.qwen;
    if($('tk-arithAns'))$('tk-arithAns').innerHTML='<span class="meas">measured</span> Exact answers rose from '+pct(o.plain.acc,0)+' to '+pct(o.comma.acc,0)+' and right-aligned digits from '+pct(o.plain.dig,0)+' to '+pct(o.comma.dig,0)+', on the same problems, model and shots. Plain answers are often wildly wrong (21481 for 20691); comma answers are usually right in most columns and off by one carry. '+(q?'The single-digit control, Qwen3-1.7B, went from '+pct(q.plain.acc,0)+' to '+pct(q.comma.acc,0)+' exact ('+pct(q.plain.dig,0)+' to '+pct(q.comma.dig,0)+' of digits): with every digit its own token, commas change much less.':'')}
  // trailing space
  if($('tk-space')&&N.space){let m='smollm2';
    function draw(){const R=N.space[m],base=R.filter((r,i)=>i%2===0);let h='';
      R.forEach((r,i)=>{if(m==='smollm2'&&i>=2)return;
        h+='<div class="card" style="margin:4px 0"><div class="small"><b>'+(i%2?'With a trailing space':'Without')+'</b></div>'+strChips(r.pieces.slice(-4))+'<div class="small mute">next token, top 5:</div>'+r.top5.map(([t,p])=>'<div style="display:flex;gap:6px;align-items:center;font-size:12.5px"><span style="min-width:7em;font-family:ui-monospace,Menlo,monospace">'+esc(t).replace(/ /g,'␣').replace(/\n/g,'↵')+'</span><span style="display:inline-block;height:9px;width:'+(p*100).toFixed(1)+'%;max-width:60%;background:var(--c1);border-radius:2px"></span><span>'+(p*100).toFixed(1)+'%</span></div>').join('')+'<div class="tk-gen">greedy: <b>'+esc(r.greedy).replace(/\n/g,' ↵ ')+'</b></div></div>'});
      $('tk-spView').innerHTML=h}
    RD.seg($('tk-spModel'),v=>{m=v;draw()});draw()}
  // letters
  if($('tk-letters')&&N.letters){const L=N.letters;
    $('tk-ltStats').innerHTML=RD.stat('Right, word as written',pct(L.acc_word,0),L.rows.length+' words')+RD.stat('Right, spelled out',pct(L.acc_spelled,0),'same words, same question');
    let h='<table class="wide"><thead><tr><th>Word</th><th>Letter</th><th class="num">Truth</th><th>Qwen3 pieces</th><th>Answer (word)</th><th>Answer (spelled)</th></tr></thead><tbody>';
    L.rows.forEach(r=>{const c=(a,ok)=>'<span style="color:var(--'+(ok?'good':'bad')+')">'+esc(a)+'</span>';h+='<tr><td>'+esc(r.word)+'</td><td>'+esc(r.letter)+'</td><td class="num">'+r.truth+'</td><td><code>'+r.pieces.map(esc).join('|')+'</code></td><td>'+c(r.ans_word,r.word_ok)+'</td><td>'+c(r.ans_spelled,r.spelled_ok)+'</td></tr>'});
    h+='</tbody></table><details><summary class="small">The prompt, word as written</summary><div class="tk-code">'+esc(L.example_prompt)+'</div></details>';
    $('tk-ltRows').innerHTML=h}
  // glitch tokens: frequency against embedding norm
  if($('tk-glitch')){const F=N.freq;
    function plot(){const el=$('tk-glPlot'),w=RD.width(el),H=Math.round(Math.min(300,Math.max(220,w*0.45))),ml=40,mr=10,mt=10,mb=30;
      const mx=8,my=3.2,x=c=>ml+(w-ml-mr)*Math.log10(c+1)/mx,y=n=>mt+(H-mt-mb)*(1-n/my);let s='<svg viewBox="0 0 '+w+' '+H+'" width="'+w+'" height="'+H+'" role="img" aria-label="Embedding norm against training frequency">';
      for(let e=0;e<=8;e+=2){s+='<line x1="'+x(10**e-1)+'" x2="'+x(10**e-1)+'" y1="'+mt+'" y2="'+(H-mb)+'" stroke="var(--line)"/><text x="'+x(10**e-1)+'" y="'+(H-mb+13)+'" text-anchor="middle" font-size="10.5" fill="var(--mute)">'+(e?'1e'+e:'0')+'</text>'}
      for(let n=0;n<=3;n++){s+='<line x1="'+ml+'" x2="'+(w-mr)+'" y1="'+y(n)+'" y2="'+y(n)+'" stroke="var(--line)"/><text x="'+(ml-4)+'" y="'+(y(n)+4)+'" text-anchor="end" font-size="10.5" fill="var(--mute)">'+n+'</text>'}
      F.count.forEach((c,i)=>{if(i===0)return;s+='<circle cx="'+x(c).toFixed(1)+'" cy="'+y(F.norm[i]).toFixed(1)+'" r="'+(c===0?2.6:1.6)+'" fill="'+(c===0?'var(--bad)':'var(--c1)')+'" fill-opacity="'+(c===0?0.9:0.35)+'"/>'});
      s+='<text x="'+((ml+w-mr)/2)+'" y="'+(H-3)+'" text-anchor="middle" font-size="11" fill="var(--mute)">'+(w<520?'training count (log; 0 at left)':'occurrences in the 122M training tokens (log scale, 0 at the left)')+'</text><text x="'+(ml+4)+'" y="'+(mt+10)+'" font-size="11" fill="var(--mute)">embedding row norm</text></svg>';el.innerHTML=s}
    RD.onRender(plot);RD.onResize(plot);plot();
    $('tk-glStats').innerHTML=RD.stat('Never seen',fmt(F.n_zero),F.n_byte_zero+' bytes, '+(F.n_zero-F.n_byte_zero)+' merges')+RD.stat('Median row norm',F.median_norm.toFixed(2),'all entries')+RD.stat('Unseen rows: norm','about '+F.buckets[0].median_norm.toFixed(2),'median')+RD.stat('Cosine among unseen rows',F.cos_zero.toFixed(3),'vs '+F.cos_common.toFixed(3)+' among common ones');
    $('tk-glProbe').innerHTML='<div class="small"><b>The trained tiny GPT, one token after "Once upon a time, there was a little":</b></div>'+F.probe.map(p=>'<div class="tk-gen"><b>'+esc(p.piece).replace(/ /g,'␣')+'</b> <span class="small mute">(id '+p.id+', '+fmt(p.count)+' training occurrences, next-token entropy '+p.next_entropy_nats.toFixed(2)+' nats)</span><br>'+esc(p.continuation).replace(/\n/g,' ↵ ')+'</div>').join('')}
})();
// predict-then-reveal (every .tk-pr on the page)
(function(){
  document.querySelectorAll('.tk-pr').forEach(pr=>{const bs=[...pr.querySelectorAll('.tk-opts button')],ans=pr.querySelector('.tk-ans');if(!ans)return;
    bs.forEach(b=>b.addEventListener('click',()=>{bs.forEach(x=>{x.classList.remove('tk-right','tk-wrong');if(x.dataset.r==='1')x.classList.add('tk-right')});if(b.dataset.r!=='1')b.classList.add('tk-wrong');ans.hidden=false;if(window.RD)RD.tabLinks(ans)}))});
})();
