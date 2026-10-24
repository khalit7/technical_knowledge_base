// ---- Smaller Reading-tab visuals: layout ablation (Table 1), Flash-Next against Qwen3.7-Plus (Table 11), thinking budget ----
// Removed 2026-10-24: the delta-rule demo (Beyond attention owns it), the Table 21 bars (Distillation owns them; numbers stay in the text), the AA bars (now columns of the dated table).
// Layout ablation, Flash-Next paper Table 1 (averages of 9 benchmarks)
(function(){
  if(!$('ablBars'))return;const R=[['Full attention',49.87,'var(--c2)'],['SWA hybrid (3:1)',51.15,'var(--c5)'],['GDN hybrid (3:1)',53.81,'var(--good)']];
  const lo=45,hi=55;$('ablBars').innerHTML='<div class="small mute" style="margin-bottom:4px">Average score, axis from 45 to 55</div>'+R.map(([n,v,c],i)=>'<div class="row'+(i===2?' hl':'')+'"><span class="nm">'+n+'</span><span class="track"><span class="fill" style="width:'+((v-lo)/(hi-lo)*100).toFixed(1)+'%;background:'+c+'"></span></span><span class="val">'+v.toFixed(2)+'</span></div>').join('');
})();
// Flash-Next-Base minus Qwen3.7-Plus-Base, Table 11
(function(){
  if(!$('t11Bars'))return;
  const T=[['MMLU',90.36,90.43],['MMLU-Redux',90.68,91.47],['MMLU-Pro',73.23,70.90],['SuperGPQA',51.36,48.42],['BBH',90.87,89.41],['GPQA',51.42,51.52],['GSM8K',93.29,92.95],['MATH',72.78,74.38],['EvalPlus',78.76,78.06],['MultiPL-E',79.09,81.68],['SWEBench-Pretrain',50.99,49.24],['MGSM',89.33,85.42],['MMMLU',84.86,84.53],['INCLUDE',78.40,78.90]];
  const mx=4;let lead=0,worst=0;
  const rows=T.map(([n,a,b])=>{const d=a-b;if(d>0)lead++;worst=Math.min(worst,d);const w=Math.abs(d)/mx*50;
    return '<div class="row"><span class="nm" title="'+n+': '+a.toFixed(2)+' against '+b.toFixed(2)+'">'+n+'</span><span class="track"><span class="mid"></span><span class="fill" style="'+(d>=0?'left:50%':'right:50%')+';width:'+w.toFixed(1)+'%;background:'+(d>=0?'var(--good)':'var(--bad)')+'"></span></span><span class="val">'+(d>=0?'+':'−')+Math.abs(d).toFixed(2)+'</span></div>'}).join('');
  $('t11Bars').innerHTML='<div class="small mute" style="margin-bottom:4px">← Qwen3.7-Plus-Base ahead · Flash-Next-Base ahead → (axis ±4 points)</div>'+rows+
    '<div class="out">'+stat('Benchmarks led','<span id="t11L">'+lead+'</span> of 14','paper: 8 of 14')+stat('Largest trail','−'+Math.abs(worst).toFixed(2),'paper: at most 2.6')+stat('Activated parameters','6B against 17B','about a third')+'</div>';
})();
// Thinking budget strip (illustrative chain lengths; the inserted text is the Qwen3 report's)
(function(){
  if(!$('tb'))return;const B=[256,512,1024,2048,4096,8192,16384,32768];
  function draw(){const b=B[+$('tbB').value],w=+$('tbW').value;$('tbBv').textContent=fmt(b);$('tbWv').textContent=fmt(w);
    const used=Math.min(b,w),cut=w>b,mx=Math.max(w,Math.min(b,9000));
    const pct=v=>(Math.min(v,mx)/mx*100).toFixed(1)+'%';
    $('tbBar').innerHTML='<div style="position:relative;height:22px;background:var(--soft);border-radius:4px;margin:8px 0;overflow:hidden">'+
      '<div style="position:absolute;left:0;top:0;bottom:0;width:'+pct(used)+';background:var(--acc)"></div>'+
      (cut?'<div style="position:absolute;left:'+pct(used)+';top:0;bottom:0;width:'+((w-used)/mx*100).toFixed(1)+'%;background:repeating-linear-gradient(45deg,var(--soft),var(--soft) 4px,var(--line) 4px,var(--line) 8px)"></div>':'')+
      (b<mx?'<div style="position:absolute;left:'+pct(b)+';top:0;bottom:0;width:2px;background:var(--bad)"></div>':'')+'</div>'+
      '<div class="leg"><span><i style="background:var(--acc)"></i>thinking generated</span>'+(cut?'<span><i style="background:var(--line)"></i>thinking it never got to</span>':'')+'<span><i style="background:var(--bad)"></i>budget</span></div>';
    $('tbTxt').innerHTML=cut?'Thinking stops at token '+fmt(b)+' of the '+fmt(w)+' it wanted ('+Math.round(b/w*100)+'%). The serving code appends: <i>"Considering the limited time by the user, I have to give the solution based on the thinking directly now."</i> and the closing think tag, and the answer follows from the partial reasoning.':'The chain ends on its own at '+fmt(w)+' tokens; the '+fmt(b)+'-token budget never binds and nothing is inserted.'}
  $('tbB').addEventListener('input',draw);$('tbW').addEventListener('input',draw);draw();
})();
