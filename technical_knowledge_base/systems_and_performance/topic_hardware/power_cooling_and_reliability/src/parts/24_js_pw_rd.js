// ---- Reading tab visuals: chip power bars, cooling calculator, Table 5, scale table, predictions ----
(function(){
  const P=window.PW,F=window.PWF,$=id=>document.getElementById(id);
  const bar=(nm,frac,val,col,hl,ml)=>'<div class="row'+(hl?' hl':'')+'"><div class="nm">'+nm+(ml?'<span class="ml">'+ml+'</span>':'')+'</div><div class="track"><div class="fill" style="width:'+Math.max(0.5,Math.min(100,frac*100)).toFixed(1)+'%;background:'+col+'"></div></div><div class="val">'+val+'</div></div>';

  // 2. watts per chip and pJ per FLOP
  (function(){const el=$('pw-chipbars');let mode='w';
    function draw(){const C=P.chips;const mx=Math.max(...C.map(c=>mode==='w'?c[2]:c[6]));
      el.innerHTML=C.map(c=>{const v=mode==='w'?c[2]:c[6];return bar(c[0]+' ('+c[1]+')',v/mx,mode==='w'?F.n(v)+' W':v.toFixed(2)+' pJ',c[0].indexOf('TPU')===0?'var(--c3)':c[0].indexOf('MI')===0?'var(--c2)':'var(--c1)',c[0]==='H100 SXM')}).join('')}
    RD.seg($('pw-chipseg'),m=>{mode=m;draw()});draw()})();

  // 4. cooling: same heat, air against water
  (function(){const kw=$('pw-cool-kw'),da=$('pw-cool-da'),dw=$('pw-cool-dw'),out=$('pw-cool-out'),pre=$('pw-cool-pre');let cur=120;
    function draw(){const Q=cur*1000,dA=+da.value,dW=+dw.value;
      const air=Q/(P.air.rho*P.air.cp*dA),cfm=air/P.cfm,water=Q/(P.water.cp*dW),lpm=water/P.water.rho*1000*60;
      $('pw-cool-kwv').textContent=F.n(cur,cur<100?1:0)+' kW';$('pw-cool-dav').textContent=dA+' °C';$('pw-cool-dwv').textContent=dW+' °C';
      out.innerHTML='<div class="out">'+RD.stat('Air needed',F.n(air,2)+' m³/s',F.n(cfm)+' CFM, '+F.n(cfm/1105,1)+' times a DGX H100\'s rated airflow')+
        RD.stat('Water needed',F.n(lpm,0)+' L/min',F.n(water,2)+' kg/s')+
        RD.stat('Volume ratio, air to water',F.n(air*1000*60/lpm,0)+'×','litres of air per litre of water for this heat')+'</div>'}
    kw.addEventListener('input',()=>{cur=+kw.value;pre.querySelectorAll('button').forEach(b=>b.classList.remove('on'));draw()});
    [da,dw].forEach(e=>e.addEventListener('input',draw));
    pre.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;pre.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
      cur=+b.dataset.kw;kw.value=Math.max(10,Math.round(cur/10)*10);draw()});
    draw()})();

  // 6. Table 5 coloured by hardware location
  (function(){const col={GPU:'var(--c1)',Host:'var(--c2)',Network:'var(--c6)',Dependency:'var(--c4)','Unplanned Maintenance':'var(--c5)',Unknown:'var(--dim)'};
    const nm={GPU:'GPU (die, HBM, SRAM, management processor, thermal)',Host:'Host (CPU, memory, NIC, SSD, power supply, chassis)',Network:'Network switch or cable',Dependency:'Software and dependencies','Unplanned Maintenance':'Unplanned host maintenance',Unknown:'Unknown (NCCL watchdog)'};
    $('pw-t5lg').innerHTML=Object.keys(col).map(k=>'<span><i style="background:'+col[k]+'"></i>'+nm[k]+'</span>').join('');
    const mx=P.t5[0][2];
    $('pw-t5').innerHTML=P.t5.map(r=>bar(r[0],r[2]/mx,r[2]+' ('+(100*r[2]/419).toFixed(1)+'%)',col[r[1]],r[0]==='Silent Data Corruption')).join('')})();

  // 7. scale table
  (function(){let h='<tr><th class="num">GPUs</th><th class="num">Job MTBF</th><th class="num">Best T, C = 5 min</th><th class="num">Useful (exact)</th><th class="num">First-order</th><th class="num">Useful, C = 10 s</th></tr>';
    P.scale.forEach(r=>{h+='<tr><td class="num">'+F.n(r.gpus)+'</td><td class="num">'+F.dur(r.mtbf_min/60)+'</td><td class="num">'+F.dur(r.c5m.T_opt_min/60)+'</td><td class="num"><b>'+F.pct(r.c5m.eff_opt)+'</b></td><td class="num">'+F.pct(r.c5m.eff_first_at_young)+'</td><td class="num">'+F.pct(r.c10s.eff_opt)+'</td></tr>'});
    $('pw-scaletab').innerHTML=h})();

  // predict-then-reveal
  document.querySelectorAll('#t-read .pred').forEach(p=>p.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    p.querySelectorAll('button').forEach(x=>{x.classList.remove('right','wrong');if(x.hasAttribute('data-ok'))x.classList.add('right')});
    if(!b.hasAttribute('data-ok'))b.classList.add('wrong');p.classList.add('done')}));
})();
