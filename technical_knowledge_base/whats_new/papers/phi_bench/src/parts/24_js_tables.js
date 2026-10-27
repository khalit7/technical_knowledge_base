// ---- Tables tab ----
(function(){
  const C=T.cats,n=RC.cat_n;let mode='v',sortCol=9,desc=true;
  function t2(){const rows=MS.slice().sort((a,b)=>(desc?-1:1)*(T.T2[a][sortCol]-T.T2[b][sortCol]));
    const best=C.concat(['Full']).map((c,i)=>Math.max(...MS.map(m=>T.T2[m][i])));
    let h='<thead><tr><th>Model</th>'+C.concat(['Full']).map((c,i)=>'<th class="num"><button class="sh" data-c="'+i+'" title="'+c+'">'+(['Training','Inference','Compr.','Kernel','I/O','HW, Edge','Data','Sys. opt.','Assur.','Full'][i])+(sortCol===i?(desc?' ▼':' ▲'):'')+'</button><small style="display:block;font-weight:400">'+(i<9?n[i]+' tasks':'85 tasks')+'</small></th>').join('')+'<th class="num">Full, recomputed</th></tr></thead><tbody>';
    rows.forEach(m=>{h+='<tr><td>'+MN[m]+'</td>';T.T2[m].forEach((v,i)=>{const nn=i<9?n[i]:85;let cell=v.toFixed(2);
      if(mode==='se')cell=v.toFixed(1)+' <span class="mute">± '+(100*seBound(v/100,nn)).toFixed(1)+'</span>';
      if(mode==='r')cell=String(1+MS.filter(x=>T.T2[x][i]>v).length);
      h+='<td class="num'+(v===best[i]?' best':'')+'">'+cell+'</td>'});
      h+='<td class="num mute">'+RC.full_cat[m].toFixed(2)+'</td></tr>'});
    $('t2').innerHTML=h+'</tbody>';
    $('t2').querySelectorAll('button.sh').forEach(b=>b.addEventListener('click',()=>{const c=+b.dataset.c;if(c===sortCol)desc=!desc;else{sortCol=c;desc=true}t2()}))}
  segBind('t2M',m=>{mode=m;document.querySelectorAll('#t2M button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));t2()});
  t2();
  let h='<thead><tr><th>Model</th><th class="num">KFC (55)</th><th class="num">LHI (20)</th><th class="num">E2EO (10)</th><th class="num">Full</th><th class="num">Recomputed</th><th class="num">LHI below KFC?</th></tr></thead><tbody>';
  MS.forEach(m=>{const v=T.T3[m];h+='<tr><td>'+MN[m]+'</td>'+v.map(x=>'<td class="num">'+x.toFixed(2)+'</td>').join('')+'<td class="num mute">'+RC.full_fmt[m].toFixed(2)+'</td><td class="num">'+(v[1]<v[0]?'yes':'no')+'</td></tr>'});
  $('t3').innerHTML=h+'</tbody>';
  h='<thead><tr><th>Model</th><th class="num">Printed (max)</th><th class="num">Table 3 LHI</th><th class="num">(20 LHI + 10 E2EO) / 30</th><th class="num">Drop, max to low</th></tr></thead><tbody>';
  ['Claude Opus 5','Kimi K3','GPT 5.6 Sol'].forEach(m=>{h+='<tr><td>'+MN[m]+'</td><td class="num">'+T.F5[m][4].toFixed(2)+'</td><td class="num">'+T.T3[m][1].toFixed(2)+'</td><td class="num">'+RC.effort_mix[m].toFixed(2)+'</td><td class="num">'+(100*RC.effort_loss[m]).toFixed(1)+'%</td></tr>'});
  $('f5t').innerHTML=h+'</tbody>';
  // max against high: slopegraph
  const HN={'GLM-5.2':'GLM 5.2','GPT-5.6 Sol':'GPT 5.6 Sol','DeepSeek V4 Pro':'DeepSeek V4Pro'};
  const hi={};T.lb_high.forEach(r=>{hi[HN[r.m]||r.m]=r.total*100});
  function slope(w){const H=260,pl=Math.min(120,w*.3),pr=Math.min(120,w*.3),pt=24,pb=14,ly=v=>pt+(H-pt-pb)*(1-(v-10)/(40-10));let s='';
    s+=tx(pl,14,'max effort (paper)',{fs:11.5,a:'middle',w:600})+tx(w-pr,14,'high effort (leaderboard)',{fs:11.5,a:'middle',w:600});
    const L=[],R=[];MS.forEach(m=>{const a=T.T3[m][3],b=hi[m];
      if(b!=null)s+=ln2(pl,ly(a),w-pr,ly(b),MC[m],{sw:1.8});
      s+='<circle cx="'+pl+'" cy="'+ly(a)+'" r="3.5" fill="'+MC[m]+'"/>';L.push({y:ly(a),n:SN[m]+' '+a.toFixed(1),c:MC[m],how:'Table 3 Full'});
      if(b!=null){s+='<circle cx="'+(w-pr)+'" cy="'+ly(b)+'" r="3.5" fill="'+MC[m]+'"/>';R.push({y:ly(b),n:b.toFixed(1)+' '+SN[m],c:MC[m],how:'leaderboard high effort'})}});
    let sL=endLabels(L,0,13).replace(/<text x="0"/g,'<text text-anchor="end" x="'+(pl-8)+'"');s+=sL+endLabels(R,w-pr+8,13);
    $('hiPlot').innerHTML=svgW(w,H,s,'Max effort against high effort')}
  // Figure 7 stacked bars with counts
  const EC=['Python runtime error','CUDA execution error','Triton / MLIR / CUDA compile error','Tensor shape mismatch'],ECC=['var(--c5)','var(--c1)','var(--c7)','var(--c4)'];
  function f7(w){const lw=Math.min(118,w*.3),pr=40,rh=26,H=MS.length*rh+56,mxn=Math.max(...MS.map(m=>T.F7[m].n));let s='';
    const lg=legend(EC.map((e,i)=>[e,ECC[i]]),lw>100?8:4,14,w-8);s+=lg.s;const y0=lg.h+6;
    MS.forEach((m,i)=>{const y=y0+i*rh,F=T.F7[m];let x=lw;s+=tx(lw-6,y+14,MN[m],{fs:11.5,a:'end'});
      EC.forEach((e,j)=>{const c=F.count[e],ww=(w-lw-pr)*c/mxn;s+=rc(x,y+3,ww,16,ECC[j],{r:0})+'';if(ww>22)s+=tx(x+ww/2,y+15,c,{fs:11,a:'middle',c:'var(--bg)'});x+=ww});
      s+=tx(x+4,y+15,'n='+F.n,{fs:11,c:'var(--mute)'})});
    $('f7Plot').innerHTML=svgW(w,y0+MS.length*rh+6,s,'Errors by class')}
  onTab('t-tables',()=>{fit($('hiPlot'),slope);fit($('f7Plot'),f7)});
  // checks
  $('chk').innerHTML=RC.checks.map(c=>'<p class="chkl"><span class="'+(c.ok?'ok':'no')+'">'+(c.ok?'As stated':'Differs')+'</span> '+c.name.replace(/</g,'&lt;')+'</p>').join('')+'<p class="small mute">'+RC.checks.filter(c=>c.ok).length+' of '+RC.checks.length+' checks come out as this page states. A check worded as a contradiction ("do not equal") passes when the contradiction is confirmed.</p>';
})();
