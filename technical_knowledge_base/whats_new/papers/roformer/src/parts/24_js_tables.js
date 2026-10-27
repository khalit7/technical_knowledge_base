// ---- The paper's tables, rebuilt ----
(function(){
  if(!$('t-tables'))return;
  const T=PAPER.tables,R=PAPER.rc;
  // Table 2
  let m2='paper';
  function t2(){const c=T.t2.cols,b=m2==='paper'?T.t2.rows[0]:T.hf_dev.row,r=T.t2.rows[1];
    let h='<div class="tw"><table><thead><tr><th>Model</th>'+c.map((x,i)=>'<th>'+x+'<br><span class="mute small">'+T.t2.metric[i]+'</span></th>').join('')+'</tr></thead><tbody>';
    h+='<tr><td>'+b.m+(m2==='paper'?' <span class="mute small">(test server)</span>':'')+'</td>'+b.v.map(v=>'<td>'+v+'</td>').join('')+'</tr>';
    h+='<tr><td>RoFormer <span class="mute small">(validation)</span></td>'+r.v.map(v=>'<td>'+v+'</td>').join('')+'</tr>';
    const dl=r.v.map((v,i)=>+v-+b.v[i]);
    h+='<tr><td><b>RoFormer minus '+(m2==='paper'?'BERT':'reference')+'</b></td>'+dl.map(d=>'<td style="color:'+(d>=0?'var(--good)':'var(--bad)')+';font-weight:600">'+(d>0?'+':'')+d.toFixed(m2==='paper'?1:2)+'</td>').join('')+'</tr></tbody></table></div>';
    const w=dl.filter(d=>d>0).length;
    h+='<p class="small">'+(m2==='paper'?'As printed: ahead on '+w+' of 7 columns (MRPC, STS-B, QQP), behind on SST-2, QNLI and both MNLI columns. The QQP gap, 15.2 points, is the test-versus-validation artefact.':'On the same split: ahead on '+w+' of 7 columns ('+R.t2.wins_vs_hf_dev.join(', ')+'), behind on the rest by 1.1 to 4.3 points. With a pretraining budget 13 to 40 times smaller ('+fmt(R.budget.roformer_tokens/1e9,1)+'B tokens against '+fmt(R.budget.bert_tokens_actual/1e9,0)+'B), that is unsurprising and says little about RoPE.')+'</p>';
    $('t2Out').innerHTML=h}
  segBind('t2M',m=>{m2=m;$('t2M').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));t2()});t2();
  // Table 4
  $('t4Body').innerHTML=T.t4.rows.map(r=>'<tr><td>'+r.stage+'</td><td>'+fmt(r.len)+'</td><td>'+r.bs+'</td><td>'+r.steps+'</td><td>'+r.loss+'</td><td>'+r.acc+'</td></tr>').join('');
  $('t4r').textContent=R.t4.corr_log2len_acc.toFixed(2);
  function t4(w){const H=200,pl=44,pr=14,pt=14,pb=34,lx=v=>pl+(w-pl-pr)*(Math.log2(v)-7)/(Math.log2(1536)-7+.2),ly=v=>pt+(H-pt-pb)*(1-(v-63)/(68-63));
    let s='';[63,64,65,66,67,68].forEach(v=>{s+=ln2(pl,ly(v),w-pr,ly(v),'var(--line)')+tx(pl-5,ly(v)+4,v+'%',{fs:11,a:'end',c:'var(--mute)'})});
    [128,256,512,1024,1536].forEach(v=>{s+=tx(lx(v),H-pb+14,fmt(v),{fs:11,a:'middle',c:'var(--mute)'})});
    s+=tx((pl+w-pr)/2,H-4,'stage maximum length (log scale)',{fs:11,a:'middle',c:'var(--mute)'});
    s+=ln2(lx(1024),pt,lx(1024),H-pb,'var(--c2)',{da:'4 3'})+tx(lx(1024)-4,pt+10,'CAIL at 1,024',{fs:11,a:'end',c:'var(--c2)'});
    const pts=T.t4.rows.map(r=>({x:lx(r.len),y:ly(parseFloat(r.acc)),t:'stage '+r.stage,fs:11}));placeLabels(pts,w,H-pb);
    pts.forEach(p=>{s+='<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="5" fill="var(--c1)"/>'+tx(p.lx,p.ly,p.t,{fs:11,a:p.la})});
    $('t4Svg').innerHTML=svgW(w,H,s,'Pretraining accuracy against maximum length per stage')}
  // Table 5
  function t5(w){const n=+$('t5N').value,sv=$('t5V').checked,rows=T.t5.rows,H=40+rows.length*(sv?52:34),pl=Math.min(120,w*.3),pr=56;
    const lo=60,hi=73,X=v=>pl+(w-pl-pr)*(v-lo)/(hi-lo);let s='';
    [60,62,64,66,68,70,72].forEach(v=>{s+=ln2(X(v),14,X(v),H-24,'var(--line)')+tx(X(v),H-8,v+'%',{fs:11,a:'middle',c:'var(--mute)'})});
    rows.forEach((r,i)=>{const y=24+i*(sv?52:34);s+=tx(pl-8,y+5,r.m,{fs:12,a:'end'});
      [['test','var(--c1)',0]].concat(sv?[['val','var(--c5)',18]]:[]).forEach(([k,c,dy])=>{const p=parseFloat(r[k])/100,se=Math.sqrt(p*(1-p)/(k==='val'?1500:n))*100,yy=y+dy;
        s+=ln2(X(p*100-1.96*se),yy,X(p*100+1.96*se),yy,c,{sw:1.4})+ln2(X(p*100-1.96*se),yy-4,X(p*100-1.96*se),yy+4,c)+ln2(X(p*100+1.96*se),yy-4,X(p*100+1.96*se),yy+4,c)+'<circle cx="'+X(p*100).toFixed(1)+'" cy="'+yy+'" r="4.5" fill="'+c+'"/>'+tx(w-pr+6,yy+4,r[k],{fs:11,c})})});
    $('t5Svg').innerHTML=svgW(w,H,s,'CAIL2019-SCM accuracy with 95% intervals');
    const p1=.6979,p2=.6810,se=Math.sqrt(p1*(1-p1)/n+p2*(1-p2)/n)*100,g=R.t5.gain_vs_wobert_test;
    $('t5Out').innerHTML='RoFormer-1024 minus WoBERT-512 on test: <b>'+g.toFixed(2)+'</b> points (the paper says 1.5; 1.50 is the gap to RoFormer-512). Standard error of the gap with '+fmt(n)+' test triplets: <b>'+se.toFixed(2)+'</b> points, so the gain is <b>'+(g/se).toFixed(2)+'</b> standard errors. Validation: '+R.t5.gain_vs_wobert_val.toFixed(2)+' points on 1,500 triplets.'+(sv?' Validation intervals use v1\'s 1,500.':'')}
  $('t5N').addEventListener('change',()=>refit($('t5Svg')));$('t5V').addEventListener('change',()=>refit($('t5Svg')));
  // EleutherAI
  $('elBody').innerHTML=T.eleuther.owt2.rows.map((r,i)=>{const p=T.eleuther.pile.rows[i],b=r[0]==='Rotary';return '<tr'+(b?' style="font-weight:600"':'')+'><td>'+r[0]+'</td><td>'+r[1]+'</td><td>'+r[2]+'</td><td>'+p[1]+'</td><td>'+p[2]+'</td></tr>'}).join('');
  onTab('t-tables',()=>{fit($('t4Svg'),t4);fit($('t5Svg'),t5)});
})();
