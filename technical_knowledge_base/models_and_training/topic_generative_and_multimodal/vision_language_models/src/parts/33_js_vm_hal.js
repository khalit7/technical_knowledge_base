// ---- Tab: Hallucination probe (P(yes) per question, model, condition; movable threshold) ----
(function(){
  const V=VM,TAB='t-vmhal';if(!V.$(TAB))return;const R=V.D.runs||{};
  const MOD=[['smol','SmolVLM-500M'],['qwen','Qwen3.5-0.8B']].filter(m=>R[m[0]]&&R[m[0]].pope);
  if(!MOD.length){V.$('vm-hl-note').textContent='Measurements pending.';return}
  const CON=[['img','real image'],['grey','grey image'],['none','no image'],['leading','leading question']];
  const KIND=[['present','present'],['absent_random','absent, random'],['absent_adversarial','absent, adversarial']];
  let m=MOD[0][0],c='img',th=0.5;
  V.seg(V.$('vm-hl-m'),MOD,m,v=>{m=v;draw()});V.seg(V.$('vm-hl-c'),CON,c,v=>{c=v;draw()});
  V.$('vm-hl-t').addEventListener('input',e=>{th=+e.target.value;V.$('vm-hl-tv').textContent=th.toFixed(2);draw()});
  function draw(){const rows=R[m].pope.rows,ys=r=>r[c].yes_share;
    const by=k=>rows.filter(r=>r.kind===k);let st='';
    KIND.forEach(([k,l])=>{const g=by(k),y=g.filter(r=>ys(r)>=th).length;st+=RD.stat('Yes on '+l,y+' of '+g.length,'mean P(yes) '+(g.reduce((a,r)=>a+ys(r),0)/g.length).toFixed(2))});
    const right=rows.filter(r=>(ys(r)>=th)===(r.kind==='present')).length,nei=rows.map(r=>1-r[c].p_yes-r[c].p_no).sort((a,b)=>a-b);
    st+=RD.stat('Right',right+' of '+rows.length,V.pct(right/rows.length))+RD.stat('Probability on neither','median '+nei[Math.floor(nei.length/2)].toFixed(3),'mass not on yes or no tokens');
    V.$('vm-hl-stats').innerHTML=st;
    // strip plot
    const fig=V.$('vm-hl-fig'),W=Math.min(V.width(fig),760),H=170,{g}=V.canvas(fig,W,H),L=W<480?92:150,Rr=W-26,x=p=>L+p*(Rr-L);
    g.strokeStyle=V.css('--line');g.fillStyle=V.css('--mute');[0,.25,.5,.75,1].forEach(p=>{g.beginPath();g.moveTo(x(p),8);g.lineTo(x(p),H-26);g.stroke();g.fillText(p.toFixed(2),x(p)-10,H-16)});
    g.fillText('P(yes)',Rr-30,H-3);g.strokeStyle=V.css('--bad');g.lineWidth=1.5;g.beginPath();g.moveTo(x(th),4);g.lineTo(x(th),H-26);g.stroke();g.lineWidth=1;
    KIND.forEach(([k,l],i)=>{const y=24+i*42;g.fillStyle=V.css('--ink');g.fillText(l,4,y);const col=k==='present'?V.css('--good'):V.css('--bad');
      by(k).forEach((r,j)=>{g.globalAlpha=.75;g.fillStyle=col;g.beginPath();g.arc(x(ys(r)),y+((j*7)%15)-7,3.5,0,7);g.fill();g.globalAlpha=1})});
    // table
    let h='<thead><tr><th></th><th>Object</th><th>Kind</th>'+CON.map(x=>'<th>'+x[1]+'</th>').join('')+'</tr></thead><tbody>';
    rows.forEach(r=>{const wrong=(ys(r)>=th)!==(r.kind==='present');h+='<tr class="'+(wrong?'vm-wrong':'')+'"><td>'+(V.D.testThumbs&&V.D.testThumbs[r.image]?'<img alt="" src="'+V.D.testThumbs[r.image]+'">':'')+'</td><td>'+V.esc(r.obj)+'<br><span class="vm-small">'+V.esc(r.image)+'</span></td><td>'+r.kind.replace('absent_','absent, ')+'</td>'+
      CON.map(x=>{const v=r[x[0]].yes_share;return '<td><span class="pb" style="width:'+Math.round(v*40)+'px"></span>'+v.toFixed(2)+'</td>'}).join('')+'</tr>'});
    V.$('vm-hl-tab').innerHTML=h+'</tbody>';
    V.$('vm-hl-note').innerHTML='Green dots: objects that are there (should be high); red: absent objects (should be low). Highlighted rows are wrong at the current threshold for the selected condition. '+(V.D.halNote&&V.D.halNote[m]||'')}
  V.onRender(draw,TAB);addEventListener('resize',()=>{if(!V.$(TAB).hidden)draw()});
})();
