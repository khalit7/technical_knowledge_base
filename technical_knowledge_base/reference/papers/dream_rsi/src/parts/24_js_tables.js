// ---- The paper's tables and figures, rebuilt ----
(function(){
  if(!$('t-tables'))return;
  const L=TB.lasso,rows=L.rows,rname=r=>r.method+(/^[-–]$/.test(r.model)?'':' ('+r.model.replace('Gemini-','')+')');
  const gm=xs=>Math.exp(xs.reduce((a,x)=>a+Math.log(x),0)/xs.length);
  let ref=rows.findIndex(r=>r.method==='Recursive Fixed Exploration'&&r.model==='Gemini-3.1-Pro'),mean='arith';
  $('tlRef').innerHTML=rows.map((r,i)=>'<option value="'+i+'">'+rname(r)+'</option>').join('');$('tlRef').value=String(ref);
  const isD=r=>r.method==='Dream-RSI';
  function lasso(){const R=rows[ref];
    let h='<thead><tr><th>Method</th><th class="num">Calls</th>'+L.datasets.map((d,i)=>'<th class="num">'+d+(L.bio[i]?' <small class="mute">bio</small>':'')+'</th>').join('')+'<th class="num">'+(mean==='arith'?'Avg.':'Geo. mean')+'</th></tr></thead><tbody>';
    rows.forEach((r,i)=>{const best=k=>Math.min(...rows.map(x=>x.ms[k]))===r.ms[k];
      const av=mean==='arith'?r.avg:gm(r.ms);
      h+='<tr'+(i===ref?' style="background:var(--soft)"':'')+'><td>'+rname(r)+'</td><td class="num">'+(r.compute==null?'–':nf(r.compute,0))+'</td>'+r.ms.map((v,k)=>'<td class="num"'+(best(k)?' style="font-weight:700"':'')+'>'+nf(v,1)+'</td>').join('')+'<td class="num"'+(r.avg===2350.6&&mean==='arith'?' style="font-weight:700"':'')+'>'+nf(av,1)+'</td></tr>'});
    $('tlTab').innerHTML=h+'</tbody>';
    fit($('tlSvg'),w=>{const sel=rows.map((r,i)=>i).filter(i=>i!==ref&&rows[i].method!=='sklearn');
      const cols=['var(--c3)','var(--c4)','var(--c5)','var(--c6)',CD,CF,'var(--mute)'];
      const lim=Math.log(4),pl=Math.min(96,w*0.24),pr=14,bh=6,gap=4,grp=sel.length*(bh+1)+gap*2+6,H=(L.datasets.length+1)*grp+30,X=v=>pl+(w-pl-pr)*(0.5+Math.max(-lim,Math.min(lim,Math.log(v)))/(2*lim));
      let s='';[0.25,0.5,1,2,4].forEach(v=>{s+=ln2(X(v),4,X(v),H-22,v===1?'var(--mute)':'var(--line)')+tx(X(v),H-8,v+'×',{fs:11,a:'middle',c:'var(--mute)'})});
      [...L.datasets,mean==='arith'?'Average':'Geo. mean'].forEach((d,k)=>{const y=6+k*grp;s+=tx(pl-6,y+grp/2,d,{fs:11,a:'end',w:k===6?600:400});
        sel.forEach((i,j)=>{const r=rows[i],v=k<6?r.ms[k]/R.ms[k]:(mean==='arith'?r.avg/R.avg:gm(r.ms)/gm(R.ms));const x0=X(1),x1=X(v);
          s+=rc(Math.min(x0,x1),y+j*(bh+1),Math.max(1,Math.abs(x1-x0)),bh,cols[j%cols.length],{r:1})})});
      const Lg=legend(sel.map((i,j)=>[rname(rows[i]),cols[j%cols.length]]),pl,H+10,w-pl);
      $('tlSvg').innerHTML=svgW(w,H+Lg.h+6,s+Lg.s,'Runtime relative to the reference row')+'<p class="small mute">Each bar: that row\'s runtime ÷ '+rname(R)+', per dataset (log scale, clipped at 4×; left is faster). sklearn is in the table but off this scale on most datasets.</p>'});
  }
  $('tlRef').addEventListener('change',e=>{ref=+e.target.value;lasso()});
  segBind('tlMean',m=>{mean=m;lasso()});
  const st=L.simpletes_supp16,rg=RC.ratios;
  $('tlSrc').innerHTML='The unmarked SimpleTES row is identical, value for value, to SimpleTES\'s own Supplementary Table 16 ('+A('https://arxiv.org/abs/2604.19341','Ye et al.')+'), timed on SimpleTES\'s machine. This paper\'s glmnet times are '+rg.glmnet.map(v=>nf(v,2)).join(', ')+' times SimpleTES\'s glmnet times on the same six datasets, and its sklearn times '+rg.sklearn.map(v=>nf(v,2)).join(', ')+' times: a slower machine. SimpleTES† (the paper never defines the dagger; the project page calls it "our reproduction") is '+rg.dagger.map(v=>nf(v,2)).join(', ')+' times the copied row, about the same factor, so it reads as SimpleTES re-timed here. Against SimpleTES† the Dream-RSI solvers win on '+RC.lasso_wins.pro_vs_dagger.length+' (Pro) and '+RC.lasso_wins.flash_vs_dagger.length+' (Flash) of six datasets.';
  // Table 1
  const M=TB.math,bold=(k,v)=>M.bold[k].includes(v);
  let h='<thead><tr><th>Method</th><th>LLM</th><th class="num">Sum Diff ↑</th><th class="num">Auto Corr. ↓</th><th class="num">Circle Packing ↑</th></tr></thead><tbody>';
  const c=(k,v)=>'<td class="num"'+(v!=null&&bold(k,v)?' style="font-weight:700"':'')+'>'+(v==null?'–':nf(v,6))+'</td>';
  M.rows.forEach(r=>{h+='<tr'+(r.method==='Dream-RSI'?' style="background:var(--soft)"':'')+'><td>'+r.method+'</td><td>'+r.llm+'</td>'+c('sumdiff',r.sumdiff)+c('autocorr',r.autocorr)+c('circle',r.circle)+'</tr>'});
  h+='<tr class="mute"><td>Together AI (from SimpleTES Table 1)</td><td>–</td><td class="num">–</td><td class="num">'+nf(M.simpletes_t1.third_autocorr_prev_best.v,6)+'</td><td class="num">–</td></tr>';
  $('tmTab').innerHTML=h+'</tbody>';
  // Figure 4 at any budget
  const tk=()=>TB.fig4[$('tkTask').value];
  const at=(ser,b)=>{let v=null;ser.forEach(p=>{if(p[0]<=b)v=p[1]});return v};
  const reach=(ser,y)=>{for(const p of ser)if(p[1]>=y-1e-9)return p[0];return null};
  function kern(){const F=tk(),b=+$('tkB').value;$('tkBv').textContent=String(b);
    fit($('tkSvg'),w=>{const ys=[...F.fixed,...F.dream].map(p=>p[1]),lo=Math.min(...ys),hi=Math.max(...ys),pd=(hi-lo)*0.1;
      $('tkSvg').innerHTML=stepChart(w,[{pts:F.fixed,c:CF},{pts:F.dream,c:CD}],{xmax:1000,ymin:lo-pd,ymax:hi+pd,xl:'generations',yl:$('tkTask').value+' speed, 1/ms',vl:[{x:b,t:'budget '+b,c:'var(--ink)',a:b>700?'end':'start'}],leg:[['Fixed exploration',CF],['Dream-RSI',CD]],label:'Kernel curves'})});
    const vd=at(F.dream,b),vf=at(F.fixed,b),yd=F.dream[F.dream.length-1],yf=F.fixed[F.fixed.length-1];
    const r=reach(F.fixed,yd[1]);
    $('tkOut').innerHTML=stat('At '+b+' generations',vd==null?'–':nf(vd/vf,2)+'×',vd==null?'Dream-RSI has no round yet':'Dream-RSI '+nf(vd,4)+' ÷ fixed '+nf(vf,4))+
      stat('Printed claim',F.claim.replace(/\(.*$/,''),F.claim.match(/\((.*)\)/)?F.claim.match(/\((.*)\)/)[1]:'')+
      stat('Finals',nf(yd[1]/yf[1],2)+'×','Dream-RSI '+nf(yd[1],4)+' at '+yd[0]+'; fixed '+nf(yf[1],4)+' at '+yf[0])+
      stat('Matched performance',r?nf(r/yd[0],2)+'× fewer':'never reached',r?'fixed first reaches Dream-RSI\'s final at '+r+' generations':'fixed exploration never reaches Dream-RSI\'s final within 990')}
  $('tkTask').addEventListener('change',()=>{const F=tk();$('tkB').value=String(F.dream[F.dream.length-1][0]);kern()});$('tkB').addEventListener('input',kern);
  // Figures 5 and 6
  function f56(){const F=TB.fig5;fit($('tgSvg'),w=>{$('tgSvg').innerHTML=stepChart(w,[{pts:F.fixed,c:CF},{pts:F.dream,c:CD},{pts:F.fixed_guided,c:CF,da:'5 4'},{pts:F.dream_guided,c:CD,da:'5 4'}],{xmax:1000,ymin:0.3,ymax:2.0,xl:'generations',yl:'ConvDiv speed, 1/ms',leg:[['Fixed',CF],['Dream-RSI',CD],['Fixed + guidance',CF,'5 4'],['Dream-RSI + guidance',CD,'5 4']],label:'Figure 5 rebuilt'})+'<p class="small mute">Figure 5 rebuilt. The unguided runs are Figure 4\'s ConvDiv runs (identical to 0.0002). Both guided runs lead early; the guided Dream-RSI run has 11 rounds, the others 9 (fixed + guidance 8).</p>'});
    const G=TB.fig6;fit($('t6Svg'),w=>{const H=190,pl=40,pr=40,pt=16,pb=30,n=9,bw=(w-pl-pr)/n,Ya=v=>pt+(H-pt-pb)*(1-v/120),Yb=v=>pt+(H-pt-pb)*(1-v/2.0);let s='';
      [0,50,100].forEach(v=>{s+=ln2(pl,Ya(v),w-pr,Ya(v),'var(--line)')+tx(pl-5,Ya(v)+4,String(v),{fs:11,a:'end',c:'var(--mute)'})});
      [0.5,1,1.5,2].forEach(v=>{s+=tx(w-pr+5,Yb(v)+4,String(v),{fs:11,c:CD})});
      G.attempts.forEach((a,i)=>{const x=pl+i*bw;s+=rc(x+bw*0.18,Ya(a),bw*0.64,Ya(0)-Ya(a),'var(--dim)',{r:2})+tx(x+bw/2,Ya(0)-5,String(a),{fs:11,a:'middle',c:'var(--ink)'})+tx(x+bw/2,H-pb+15,G.rounds[i],{fs:11,a:'middle',c:'var(--mute)'})});
      let d='';G.best.forEach((v,i)=>{d+=(i?' L':'M')+(pl+i*bw+bw/2).toFixed(1)+' '+Yb(v).toFixed(1)});s+='<path d="'+d+'" fill="none" stroke="'+CD+'" stroke-width="2.2"/>';G.best.forEach((v,i)=>{s+='<circle cx="'+(pl+i*bw+bw/2)+'" cy="'+Yb(v)+'" r="3.2" fill="'+CD+'"/>'});
      s+=tx(pl,10,'bars: attempts per round (left)',{fs:11,c:'var(--mute)'})+tx(w-pr+30,10,'line: speed (right)',{fs:11,a:'end',c:CD});
      $('t6Svg').innerHTML=svgW(w,H,s,'Figure 6 rebuilt')+'<p class="small mute">Figure 6 rebuilt from its printed labels: attempts per round (bars, left) and round-best speed (line, right axis, 1/ms). The attempts add up to 786, Figure 4\'s ConvDiv budget.</p>'})}
  $('tkTask').value='ConvDiv';
  // checks
  let flt='all';
  function chk(){const C=RC.checks.filter(c=>flt==='all'||(flt==='added'?c.verdict==='added':c.verdict!=='added'));
    const cls={reproduces:'ok','partly':'pt','does not':'no','added':'ad'};
    $('chkTab').innerHTML='<thead><tr><th>Claim or check</th><th>Where</th><th>Printed</th><th>Recomputed</th><th>Verdict</th></tr></thead><tbody>'+C.map(c=>'<tr><td>'+c.claim+(c.note?'<div class="small mute">'+c.note+'</div>':'')+'</td><td class="small">'+(c.wl?A(PAPER.meta.ax+'#'+c.where,c.wl):c.where)+'</td><td class="small">'+c.printed+'</td><td class="small">'+c.recomputed+'</td><td class="v"><span class="verdict '+cls[c.verdict]+'">'+c.verdict+'</span></td></tr>').join('')+'</tbody>';
    const S=RC.summary;$('chkSum').textContent=RC.checks.length+' checks: '+S.reproduces+' of the paper\'s numbers reproduce, '+S.partly+' partly, '+S['does not']+' do not; '+S.added+' are checks this page adds (things the paper does not compute).'}
  segBind('chkF',m=>{flt=m;chk()});
  onTab('t-tables',()=>{lasso();kern();f56();chk()});
})();
