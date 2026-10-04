// ---- Reading: small computed tables (nines, dependency chain, error budget, burn-rate thresholds, fan-out). Checked by src/recompute.py ----
window.RCALC={
  nines:function(){return [0.99,0.995,0.999,0.9995,0.9999,0.99999].map(a=>({a:a,yr_min:Math.round((1-a)*365*24*60*100)/100,mo_min:Math.round((1-a)*30*24*60*100)/100,wk_min:Math.round((1-a)*7*24*60*100)/100}))},
  chain:function(){let p=1;[0.9999,0.999,0.9995,0.999,0.995].forEach(a=>p*=a);return Math.round(p*1e6)/1e6},
  burn:function(){const W=30*24;return [[0.02,1],[0.05,6],[0.10,72]].map(x=>({share:x[0],hours:x[1],burn:Math.round(x[0]*W/x[1]*100)/100}))},
  fanout:function(){return Math.round((1-Math.pow(0.99,100))*1e4)/1e4}
};
(function(){
  const fmtDur=m=>m>=1440?(m/1440).toFixed(2)+' days':m>=60?(m/60).toFixed(2)+' h':m>=1?m.toFixed(m<10?2:1)+' min':(m*60).toFixed(1)+' s';
  const t=document.getElementById('rd-nines');
  if(t){t.innerHTML='<thead><tr><th>Target</th><th>Nines</th><th class="num">Down per year</th><th class="num">per 30 days</th><th class="num">per week</th></tr></thead><tbody>'+
    RCALC.nines().map((r,i)=>'<tr><td>'+['99','99.5','99.9','99.95','99.99','99.999'][i]+'%</td><td>'+['two','two and a half','three','three and a half','four','five'][i]+'</td><td class="num">'+fmtDur(r.yr_min)+'</td><td class="num">'+fmtDur(r.mo_min)+'</td><td class="num">'+fmtDur(r.wk_min)+'</td></tr>').join('')+'</tbody>'}
  const c=document.getElementById('rd-chain');if(c)c.textContent=(RCALC.chain()*100).toFixed(2)+'%';
  const f=document.getElementById('rd-fan');if(f)f.textContent=(RCALC.fanout()*100).toFixed(1)+'%';
  const b=document.getElementById('rd-burn');
  if(b){b.innerHTML='<thead><tr><th>Budget spent</th><th>Long window</th><th>Short window</th><th class="num">Burn rate = share &times; 720 h / window</th><th>Action</th><th class="num">Whole budget gone in</th></tr></thead><tbody>'+
    RCALC.burn().map((r,i)=>'<tr><td>'+(r.share*100)+'%</td><td>'+(r.hours<24?r.hours+' h':(r.hours/24)+' days')+'</td><td>'+['5 min','30 min','6 h'][i]+'</td><td class="num">'+r.burn+'</td><td>'+(i<2?'page':'ticket')+'</td><td class="num">'+(720/r.burn).toFixed(0)+' h</td></tr>').join('')+'</tbody>'}
})();
