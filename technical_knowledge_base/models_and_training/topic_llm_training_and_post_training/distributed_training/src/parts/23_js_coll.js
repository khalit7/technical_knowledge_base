// ---- Reading: pipeline bubbles (Narayanan; Qi et al.; DeepSeek-V3 Table 2); the collective-cost calculator was removed on 2026-10-19 (Interconnects owns it) ----
(function(){
  const $=id=>document.getElementById(id);
  if(!$('pb'))return;
  function draw(){const p=+$('pbP').value,m=+$('pbM').value,v=+$('pbV').value;['P','M','V'].forEach(k=>$('pb'+k+'v').textContent=$('pb'+k).value);
    const F=1,B=2,W=1,ideal=m*(F+B);
    const rows=[
      ['GPipe','(p − 1)/m',(p-1)/m,'m = '+m,'1×'],
      ['1F1B','(p − 1)/m, the same',(p-1)/m,'p = '+p,'1×'],
      ['Interleaved 1F1B','(p − 1)/(v·m)',(p-1)/(v*m),'about p','1×, v times the sends'],
      ['ZB-H1 (ZB1P)','(p − 1)(F + B − 2W)',(p-1)*(F+B-2*W)/ideal,'p = '+p,'1×'],
      ['DualPipe','(p/2 − 1)(F&B + B − 3W)',Math.max(0,(p/2-1)*((F+B)+B-3*W))/ideal,'p + 1 = '+(p+1),'2×']];
    const mx=Math.max(1,...rows.map(r=>r[2]));
    $('pbB').innerHTML=rows.map(r=>'<div class="row"><span class="nm" title="'+r[1]+'">'+r[0]+'</span><span class="track"><span class="fill" style="width:'+Math.min(100,100*r[2]/mx).toFixed(1)+'%;background:'+(r[0]==='DualPipe'?'var(--c3)':'var(--c2)')+'"></span></span><span class="val">'+(100*r[2]).toFixed(0)+'%</span></div><div class="small mute" style="margin:-2px 0 6px">bubble '+r[1]+' · activations in flight: '+r[3]+' micro-batches · parameters '+r[4]+'</div>').join('');
    $('pbN').innerHTML='Bubble as a share of the ideal step time, m(F + B). Formulas: GPipe, 1F1B and interleaved from Narayanan et al. 2021; ZB1P and DualPipe from DeepSeek-V3 Table 2, with <i class="nl i">illustrative</i> chunk times F = 1, B = 2 (full backward), W = 1 and F&amp;B = F + B (no credit for overlap, which understates DualPipe). With these times ZB1P is exactly a third of 1F1B, the Zero Bubble paper\'s claim. At p = '+p+', m = '+m+' the 1F1B pipeline idles '+(100*(p-1)/(m+p-1)).toFixed(0)+'% of its timeline, (p − 1)/(m + p − 1).'}
  ['pbP','pbM','pbV'].forEach(id=>$(id).addEventListener('input',draw));RD.onRender(draw);draw();
})();
