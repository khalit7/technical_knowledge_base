// ---- Reading: collective cost (ring factors from nccl-tests) and pipeline bubbles (Narayanan; Qi et al.; DeepSeek-V3 Table 2) ----
(function(){
  const $=id=>document.getElementById(id);
  if(!$('cc'))return;
  const F={ar:[n=>2*(n-1)/n,'2(n − 1)/n'],rs:[n=>(n-1)/n,'(n − 1)/n'],ag:[n=>(n-1)/n,'(n − 1)/n'],a2a:[n=>(n-1)/n,'(n − 1)/n'],p2p:[n=>1,'1']};
  const NM={ar:'all-reduce',rs:'reduce-scatter',ag:'all-gather',a2a:'all-to-all',p2p:'send / receive'};
  function draw(){const k=$('ccK').value,n=+$('ccN').value,S=+$('ccS').value,bw=+$('ccL').value;$('ccNv').textContent=n;
    const f=F[k][0](n),sent=S*f,t=sent/bw;
    const tNV=sent/450,tIB=sent/50;
    const ms=x=>x<1?(1000*x).toFixed(x<0.01?2:1)+' ms':x.toFixed(2)+' s';
    $('ccO').innerHTML=RD.stat('Sent per GPU',(sent<1?(1000*sent).toFixed(0)+' MB':sent.toFixed(2)+' GB'),F[k][1]+' × buffer = '+f.toFixed(3)+' ×')+
      RD.stat('Time at this link',ms(t),'bytes ÷ '+bw+' GB/s, a lower bound')+
      RD.stat('Same bytes, NVLink against InfiniBand',ms(tNV)+' / '+ms(tIB),'450 against 50 GB/s: 9 times');
    $('ccNote').innerHTML='<i class="nl d">derived</i> Per GPU, for a ring '+NM[k]+' of a '+S+' GB buffer over '+n+' GPUs. Peak link bandwidths (NVIDIA H100 datasheet; DeepSeek-V3 §3.2.2 for the H800\'s 160 against 50 GB/s, a ratio of '+(160/50).toFixed(1)+'); measured bus bandwidth is lower, and small messages are dominated by latency, which this ignores. As <i>n</i> grows the factor tends to 2 (all-reduce) or 1: adding GPUs to a ring hardly changes bytes per GPU, only the slowest hop matters.'}
  ['ccK','ccN','ccS','ccL'].forEach(id=>$(id).addEventListener('input',draw));RD.onRender(draw);draw();
})();
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
