// ---- Smaller Reading-tab visuals: delta rule, layout ablation, Table 11, thinking budget, distillation, AA index ----
// Delta rule against plain linear attention, three writes and one read, exact arithmetic (illustrative vectors)
(function(){
  if(!$('dr'))return;let m='delta';
  const k1=[1,0,0],k2=[0,1,0],v1=[2,0,1],v2=[0,3,0],v3=[1,1,0];
  const mv=(S,x)=>S.map(r=>r.reduce((a,v,j)=>a+v*x[j],0));
  const f=v=>'('+v.map(x=>(Math.abs(x)<5e-4?0:x).toFixed(2).replace(/\.00$/,'')).join(', ')+')';
  function draw(){
    const a=+$('drA').value/100,b=+$('drB').value/100;$('drAv').textContent=a.toFixed(2);$('drBv').textContent=b.toFixed(2);
    let S=[[0,0,0],[0,0,0],[0,0,0]];const rows=[];
    [[k1,v1,'k₁, v₁'],[k2,v2,'k₂, v₂'],[k1,v3,'k₁, v₃']].forEach(([k,v,lab])=>{
      const old=mv(S,k);
      // S = a S (I - b k kT) + b v kT   (delta)   or   S = a S + v kT   (plain)
      const n=S.map((r,i)=>r.map((x,j)=>m==='delta'?a*(x-b*old[i]*k[j])+b*v[i]*k[j]:a*x+v[i]*k[j]));S=n;
      rows.push('<tr><td>write '+lab+'</td><td class="vec">'+(m==='delta'?'state returned '+f(old)+' for this key; erased, then '+f(v)+' written':'adds '+f(v)+' on top')+'</td></tr>')});
    const out=mv(S,k1),want=v3,err=Math.hypot(...out.map((x,i)=>x-want[i]));
    $('drOut').innerHTML='<div class="tw"><table>'+rows.join('')+'<tr><td><b>read with q = k₁</b></td><td class="vec"><b>'+f(out)+'</b> against the latest value v₃ = '+f(want)+'</td></tr></table></div>'+
      '<div class="out">'+stat('Recall error for k₁',err.toFixed(2),err<0.01?'exact: the write replaced the old value':m==='plain'?'old value v₁ still mixed in':'decay or partial write strength')+stat('Numbers in the state','9','fixed: 3 × 3, however many writes')+'</div>';
  }
  $('drM').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{$('drM').querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});m=b.dataset.m;draw()}));
  $('drA').addEventListener('input',draw);$('drB').addEventListener('input',draw);draw();
})();
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
// Distillation against RL on Qwen3-8B, Table 21
(function(){
  if(!$('dsBars'))return;
  const R=[['Off-policy start',55.0,42.8,0],['+ RL',67.6,55.5,17920],['+ distillation',74.4,65.5,1800]];
  const bar=(v,mx,c,t)=>'<span class="track"><span class="fill" style="width:'+(v/mx*100).toFixed(1)+'%;background:'+c+'"></span></span><span class="val">'+t+'</span>';
  let h='<div class="bars"><div class="small mute">AIME\'24 (blue) and AIME\'25 (orange), score out of 100</div>';
  R.forEach(r=>{h+='<div class="row"><span class="nm">'+r[0]+'</span>'+bar(r[1],100,'var(--c1)',r[1].toFixed(1))+'</div><div class="row"><span class="nm"></span>'+bar(r[2],100,'var(--c2)',r[2].toFixed(1))+'</div>'});
  h+='<div class="small mute" style="margin-top:8px">GPU hours spent on the step</div>';
  R.slice(1).forEach(r=>{h+='<div class="row'+(r[3]<2000?' hl':'')+'"><span class="nm">'+r[0]+'</span>'+bar(r[3],17920,r[3]<2000?'var(--good)':'var(--mute)',fmt(r[3]))+'</div>'});
  $('dsBars').innerHTML=h+'</div>';
})();
// Qwen on the Artificial Analysis Intelligence Index v4.3 (read 2026-10-01, from aa_snapshot.json)
(function(){
  if(!$('aaBars'))return;
  const R=[['Qwen3.8-Max (0902), hosted',45.4,5.4085,false],['Qwen3.8-2.4T-A95B, open',39.9,2.1559,true],['Qwen3.8-Flash-Next, open',39.8,0.3722,true],['Qwen3.8-27B (xhigh), open',33.7,1.0073,true]];
  let h='<div class="bars"><div class="small mute">Intelligence Index v4.3</div>';
  R.forEach(r=>{h+='<div class="row"><span class="nm" title="'+r[0]+'">'+r[0]+'</span><span class="track"><span class="fill" style="width:'+(r[1]/50*100).toFixed(1)+'%;background:'+(r[3]?'var(--open)':'var(--closed)')+'"></span></span><span class="val">'+r[1].toFixed(1)+'</span></div>'});
  h+='<div class="small mute" style="margin-top:8px">Cost per index task, US dollars</div>';
  R.forEach(r=>{h+='<div class="row"><span class="nm" title="'+r[0]+'">'+r[0]+'</span><span class="track"><span class="fill" style="width:'+(r[2]/5.5*100).toFixed(1)+'%;background:'+(r[3]?'var(--open)':'var(--closed)')+'"></span></span><span class="val">$'+r[2].toFixed(2)+'</span></div>'});
  $('aaBars').innerHTML=h+'</div><div class="leg"><span><i style="background:var(--open)"></i>open weights</span><span><i style="background:var(--closed)"></i>hosted only</span></div>';
})();
