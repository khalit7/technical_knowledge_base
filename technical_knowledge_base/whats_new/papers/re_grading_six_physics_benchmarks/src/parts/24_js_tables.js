// ---- The tables tab: Table 1 (three views), the by-construction check, removal against re-grading, Tables 2 to 4, checks ----
(function(){let K='mean',V='pr';const ms=['fable','gpt','gem'];
  function t1(){let h='<table class="t1"><tr><th>Benchmark</th><th class="num">Questions</th>'+ms.map(m=>'<th class="num">'+MN[m]+'</th>').join('')+'</tr>';let gp='';
    T.t1.forEach(r=>{if(r.g!==gp){gp=r.g;h+='<tr><td colspan="5" class="grp">'+(gp==='public'?'Benchmarks drawn from public sources':'Expert-authored benchmarks')+'</td></tr>'}
      h+='<tr><td>'+r.b+'</td><td class="num">'+r.n0+' → '+r.n1+'</td>'+ms.map(m=>{const [a,b]=r[K][m],c=RC.t1_counts[r.b][m];
        if(V==='pr')return '<td class="num">'+(a==null?'n/a':a.toFixed(2))+' → <b>'+b.toFixed(2)+'</b>'+(K==='pass'?'<div class="ci">95%: '+c.ci_pass_post[0]+' to '+c.ci_pass_post[1]+'</div>':'')+'</td>';
        if(V==='dl')return '<td class="num">'+(a==null?'n/a':'+'+(b-a).toFixed(2)+' points')+'</td>';
        if(K==='mean')return '<td class="num">'+c.mean_pre_k+'/'+c.mean_pre_of+' → '+c.mean_post_k+'/'+c.mean_post_of+'</td>';
        return '<td class="num">'+(c.pass_pre_k==null?'n/a':c.pass_pre_k+'/'+r.n0)+' → '+c.pass_post_k+'/'+r.n1+'</td>'}).join('')+'</tr>'});
    $('t1Tab').innerHTML=h+'</table>';
    $('t1Note').innerHTML=(V==='ct'?'Counts recovered from the printed percentages: mean@4 is correct attempts out of 4 × questions (CritPt pre-audit: out of 5 × 70 = 350, Artificial Analysis\'s mean@5), pass@4 is questions solved at least once. All 70 land on whole numbers. ':'')+(V==='dl'?'Changes mix two effects, re-grading and a smaller question set; see below. ':'')+'Pre-audit CritPt is Artificial Analysis\'s mean@5 on 70 challenges (Fable 5 at Max); pre-audit pass@4 is unavailable there. GPT-5.6-Sol uses Max on CritPt in both columns.'}
  segBind('t1K',m=>{K=m;setPressed('t1K',m);t1()});segBind('t1V',m=>{V=m;setPressed('t1V',m);t1()});
  function imp(){let h='<table><tr><th>Benchmark</th><th class="num">Audit: accepted + grader errors</th><th class="num">Kept</th><th class="num">Implied</th><th class="num">Reported pass@4</th><th class="num">Reported mean@4</th></tr>';
    Object.entries(RC.implied).forEach(([b,v])=>{const f=T.funnel[b];h+='<tr><td>'+b+'</td><td class="num">'+f.acc+' + '+f.G+' = '+v.k+'</td><td class="num">'+v.of+'</td><td class="num"><b>'+v.implied.toFixed(1)+'%</b></td><td class="num">'+v.pass4.toFixed(2)+'%</td><td class="num">'+v.mean4.toFixed(2)+'%</td></tr>'});
    $('impTab').innerHTML=h+'</table>'}
  let DM='gpt';const dh=$('denPlot');
  function den(w){const rows=Object.entries(RC.drop_only),nar=w<560,lw=nar?96:124,rh=44,top=8,H=top+rows.length*rh+52,x0=lw,x1=w-10,X=v=>x0+(x1-x0)*Math.min(v,110)/110;let s='';
    [0,25,50,75,100].forEach(v=>{s+=ln2(X(v),top,X(v),H-48,'var(--line)')+tx(X(v),H-34,v+'%',{fs:11,a:'middle',c:'var(--mute)'})});
    rows.forEach(([b,d],i)=>{const v=d[DM],y=top+i*rh;s+=tx(4,y+20,nar?b.replace('-Benchmark','').replace('-Physics',''):b,{fs:12,w:600});
      const bars=[[v.pre,'var(--mute)','pre-audit'],[v.raw,'var(--lq)','removal only'],[v.post,'var(--lok)','corrected']];
      bars.forEach(([val,c,n],k)=>{const lab=val.toFixed(1)+(val>100?'%: assumption fails':'%'),wd=lab.length*6.2,xe=X(val),fits=xe+4+wd<=x1;s+=rc(x0,y+4+k*12,xe-x0,10,c,{r:2,op:fits?1:.35})+tx(fits?xe+4:xe-4,y+13+k*12,lab,{fs:11,a:fits?'start':'end'})})});
    let lx=x0;[['pre-audit','var(--mute)'],['removal only (excluded scored zero)','var(--lq)'],['corrected (reported)','var(--lok)']].forEach(([n,c])=>{const lw2=n.length*6.2+22;if(lx+lw2>w)lx=x0;s+=rc(lx,H-18,10,10,c,{r:2})+tx(lx+14,H-9,n,{fs:11});lx+=lw2});
    dh.innerHTML=svgW(w,H+(nar?16:0),s,'Removal against re-grading')}
  segBind('denM',m=>{DM=m;setPressed('denM',m);refit(dh)});
  function t2(){const F=T.funnel,DR=RC.defect_rate;let h='<table><tr><th>Benchmark</th><th>Reviewed</th><th class="num">Benchmark</th><th class="num">Grader</th><th class="num">Model</th><th class="num">Kept</th><th class="num">Benchmark-error rate</th></tr>';
    const ci=(k,n)=>{const p=k/n,z=1.96,d=1+z*z/n,c=p+z*z/(2*n),hh=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n));return (100*(c-hh)/d).toFixed(1)+' to '+(100*(c+hh)/d).toFixed(1)};
    Object.entries(F).forEach(([b,f])=>{const t=T.t2.find(r=>r.b===b),dr=DR[b];
      h+='<tr><td>'+b+'</td><td class="small">'+(f.acc!=null?f.rej+' rejections of '+(f.sample||f.pool)+' ('+f.audit_run+')':(f.audited||f.pool)+' questions, '+f.who)+'</td>'+
        '<td class="num">'+f.Q+(t?' <span class="ci">'+t.pct[0].toFixed(2)+'%</span>':' <span class="ci">'+f.repaired+' repaired</span>')+'</td><td class="num">'+(f.G==null?'n/a':f.G+' <span class="ci">'+t.pct[1].toFixed(2)+'%</span>')+'</td><td class="num">'+f.M+(t?' <span class="ci">'+t.pct[2].toFixed(2)+'%</span>':'')+'</td><td class="num">'+f.kept+'</td><td class="num">'+dr.pct.toFixed(1)+'%'+(dr.lower_bound?' or more':'')+'<div class="ci">'+ci(dr.Q,dr.of)+'</div></td></tr>'});
    const P=T.t2_pooled;h+='<tr><td><b>Pooled four</b></td><td class="small">250 rejections of 502</td><td class="num">'+P.Q+' <span class="ci">'+P.pct[0].toFixed(2)+'%</span></td><td class="num">'+P.G+' <span class="ci">'+P.pct[1].toFixed(2)+'%</span></td><td class="num">'+P.M+' <span class="ci">'+P.pct[2].toFixed(2)+'%</span></td><td class="num">359</td><td></td></tr>';
    $('t2Tab').innerHTML=h+'</table>'}
  function t3(){let h='<table><tr><th>Benchmark</th><th class="num">Single</th><th class="num">Double</th><th class="num">Agree</th><th class="num">Disagree</th><th class="num">Benchmark / grader</th><th class="num">Benchmark / model</th><th class="num">Grader / model</th><th class="num">Scott\'s pi</th></tr>';
    T.t3.forEach((r,i)=>{const k=RC.kappa[r.b];h+='<tr><td>'+r.b+'</td><td class="num">'+r.single+'</td><td class="num">'+r.double+'</td><td class="num">'+r.agree+' <span class="ci">'+k.po.toFixed(1)+'%</span></td><td class="num">'+r.dis+'</td>'+T.t4.rows.map(x=>'<td class="num">'+x.v[i]+'</td>').join('')+'<td class="num">'+k.lo.toFixed(2)+' to '+k.hi.toFixed(2)+'</td></tr>'});
    const t=T.t3_total;h+='<tr><td><b>Total</b></td><td class="num">'+t.single+'</td><td class="num">'+t.double+'</td><td class="num">'+t.agree+' <span class="ci">71.4%</span></td><td class="num">'+t.dis+'</td>'+T.t4.rows.map(x=>'<td class="num">'+x.tot+'</td>').join('')+'<td></td></tr>';
    $('t3Tab').innerHTML=h+'</table>'}
  function chk(){$('chkList').innerHTML=RC.checks.map(c=>'<div class="chkl"><span class="'+(c.ok?'ok':'no')+'">'+(c.ok?'reproduces':'does not reproduce')+'</span> '+c.n+'. <span class="mute">'+c.d+'</span></div>').join('')+'<p class="small mute">'+RC.checks.filter(c=>c.ok).length+' of '+RC.checks.length+' checks pass.</p>'}
  onTab('t-tables',()=>{t1();imp();t2();t3();chk();fit(dh,den)})})();
