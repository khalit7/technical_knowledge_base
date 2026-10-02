// ---- The paper's tables, rebuilt ----
(function(){
  const T=RC.tasks,cats=[...new Set(T.map(t=>t.cat))];
  $('hCat').innerHTML='<option value="">All groups</option>'+cats.map(c=>'<option>'+escH(c)+'</option>').join('');
  const shade=(v,lo,hi)=>{if(hi<=lo)return '';const a=(v-lo)/(hi-lo);return ' style="background:color-mix(in srgb, var(--acc) '+Math.round(8+a*42)+'%, transparent)"'};
  function hTable(){const c=$('hCat').value,m=$('hShow').value;let h='<thead><tr><th>Task</th><th>metric</th><th>split</th><th>K</th>';
    if(m==='d')h+='<th class="num">175B few</th><th class="num">SOTA</th><th class="num">minus</th></tr></thead><tbody>';else h+=SZ.map(s=>'<th class="num">'+s+'</th>').join('')+'<th class="num">test</th><th class="num">SOTA</th></tr></thead><tbody>';
    let last='';T.forEach(t=>{if(c&&t.cat!==c)return;if(t.cat!==last){h+='<tr class="cat"><td colspan="'+(m==='d'?7:14)+'">'+escH(t.cat)+'</td></tr>';last=t.cat}
      h+='<tr><td>'+escH(t.name)+'</td><td>'+t.metric+'</td><td>'+t.split+'</td><td>'+t.K+'</td>';
      if(m==='d'){const s=+t.sota;h+='<td class="num">'+t.f[7]+'</td><td class="num">'+(t.sota||'–')+'</td><td class="num">'+(t.sota&&!isNaN(s)?((t.metric==='ppl'?s-t.f[7]:t.f[7]-s)>0?'+':'')+f1(t.metric==='ppl'?s-t.f[7]:t.f[7]-s):'–')+'</td></tr>';return}
      const v=m==='g'?t.f.map((x,i)=>x-t.z[i]):t[m],lo=Math.min(...v),hi=Math.max(...v);
      h+=v.map(x=>'<td class="num"'+shade(t.metric==='ppl'?hi+lo-x:x,lo,hi)+'>'+(m==='g'?f1(x):x)+'</td>').join('')+'<td class="num">'+(m==='f'&&t.test?t.test:'')+'</td><td class="num">'+(t.sota||'')+'</td></tr>'});
    $('hTab').innerHTML=h+'</tbody>'}
  $('hCat').addEventListener('change',hTable);$('hShow').addEventListener('change',hTable);

  function pTable(){let h='<thead><tr><th>Model</th><th class="num">layers</th><th class="num">d<sub>model</sub></th><th class="num">heads × d<sub>head</sub></th><th class="num">printed (Table 2.1)</th><th class="num">Table D.1</th><th class="num">recount</th><th class="num">difference</th><th>batch, LR</th></tr></thead><tbody>';
    RC.params.forEach(p=>{const bad=p.heads_x_dhead!==p.d;h+='<tr><td>'+p.name+'</td><td class="num">'+p.L+'</td><td class="num">'+fmt(p.d)+'</td><td class="num"'+(bad?' style="color:var(--bad);font-weight:600"':'')+'>'+p.heads+' × '+p.dhead+' = '+fmt(p.heads_x_dhead)+'</td><td class="num">'+p.printed+'</td><td class="num">'+fmt(p.tableD1/1e6,0)+'M</td><td class="num">'+fmt(p.recount/1e6,1)+'M'+(p.recount_5120?'<br><span class="small">with 5,120: '+fmt(p.recount_5120/1e6,1)+'M</span>':'')+'</td><td class="num">'+(p.recount_vs_D1_pct>0?'+':'')+p.recount_vs_D1_pct.toFixed(2)+'%'+(p.recount_5120?'<br><span class="small">'+(p.recount_5120_vs_D1_pct>0?'+':'')+p.recount_5120_vs_D1_pct.toFixed(2)+'%</span>':'')+'</td><td>'+p.batch+', '+escH(p.lr.replace('\\times','×').replace(/\^\{(-?\d+)\}/,(a,e)=>sup(e)))+'</td></tr>'});
    $('pTab').innerHTML=h+'</tbody>'}
  function mixTable(){let h='<thead><tr><th>Dataset</th><th class="num">tokens</th><th class="num">weight</th><th class="num">tokens seen</th><th class="num">epochs printed</th><th class="num">epochs recomputed</th></tr></thead><tbody>';
    RC.mix.forEach(m=>{const off=Math.abs(m.epochs_printed-m.epochs_recomputed)>0.06;h+='<tr><td>'+m.name+'</td><td class="num">'+fmt(m.tokens/1e9)+'B</td><td class="num">'+Math.round(m.weight*100)+'%</td><td class="num">'+fmt(m.tokens_seen/1e9)+'B</td><td class="num">'+m.epochs_printed+'</td><td class="num"'+(off?' style="color:var(--bad);font-weight:600"':'')+'>'+m.epochs_recomputed.toFixed(2)+'</td></tr>'});
    h+='<tr><td><b>Total</b></td><td class="num">'+fmt(RC.mix.reduce((a,m)=>a+m.tokens,0)/1e9)+'B</td><td class="num">'+Math.round(RC.mix_weight_sum*100)+'%</td><td class="num">'+fmt(RC.mix.reduce((a,m)=>a+m.tokens_seen,0)/1e9)+'B</td><td></td><td></td></tr>';
    $('mixTab').innerHTML=h+'</tbody>'}
  function cmpTable(){let h='<thead><tr><th>Model</th><th class="num">params</th><th class="num">tokens</th><th class="num">FLOPs per param per token</th><th class="num">printed PF-days</th><th class="num">recomputed</th><th class="num">tokens per param</th></tr></thead><tbody>';
    RC.compute.forEach(c=>{h+='<tr><td>'+c.name+'</td><td class="num">'+fmt(c.params/1e6)+'M</td><td class="num">'+fmt(c.tokens/1e9)+'B</td><td class="num">'+c.mult+'</td><td class="num">'+c.printed_pfd+'</td><td class="num">'+(c.pfd<100?c.pfd.toFixed(2):fmt(c.pfd,1))+'</td><td class="num">'+(c.tok_per_param<10?c.tok_per_param.toFixed(1):fmt(c.tok_per_param))+'</td></tr>'});
    $('cmpTab').innerHTML=h+'</tbody>'}
  function c1Table(){const S={};RC.seed.forEach(s=>S[s.name]=s);let h='<thead><tr><th>Benchmark</th><th>split</th><th class="num">N</th><th class="num">clean</th><th class="num">all</th><th class="num">clean score</th><th class="num">rel. diff printed</th><th class="num">recomputed</th><th class="num">Table H.1 (other draw)</th></tr></thead><tbody>';
    RC.c1.forEach(c=>{const s=S[c.name],off=Math.abs(c.rel_printed-c.rel_recomputed)>0.6;h+='<tr><td>'+escH(c.name)+'</td><td>'+c.split+'</td><td class="num">'+c.N+'</td><td class="num">'+c.clean_pct_printed+'%</td><td class="num">'+c.all+'</td><td class="num">'+c.clean+'</td><td class="num">'+(c.rel_printed>0?'+':'')+c.rel_printed+'%</td><td class="num"'+(off?' style="color:var(--bad);font-weight:600"':'')+'>'+(c.rel_recomputed>0?'+':'')+c.rel_recomputed.toFixed(1)+'%</td><td class="num">'+(s?s.h1+' ('+(s.diff>0?'+':'')+f1(s.diff)+')':'–')+'</td></tr>'});
    $('c1Tab').innerHTML=h+'</tbody>';
  }
  function hum(){fit($('humSvg'),W=>{const R=TB['S3.T11'].rows.slice(1).concat([['~500 words: control',...TB['S3.T12'].rows[1].slice(1)],['~500 words: GPT-3 175B',...TB['S3.T12'].rows[2].slice(1)]]);
      const narrow=W<520,lw=narrow?0:200,pr=10,rh=narrow?32:20,H=R.length*rh+34,X=v=>lw+(W-lw-pr)*(v-40)/(100-40);let s='';
      [40,50,60,70,80,90,100].forEach(t=>{s+=ln2(X(t),4,X(t),R.length*rh+6,t===50?'var(--bad)':'var(--line)',{da:t===50?'3 3':null})+tx(X(t),R.length*rh+20,t+'%',{fs:11,a:t===100?'end':t===40?'start':'middle',c:'var(--mute)'})});
      R.forEach((r,i)=>{const y=6+i*rh,v=parseFloat(r[1]),ci=r[2].match(/(\d+)%–(\d+)%/),by=narrow?y+16:y+3;const nm=r[0].replace(' (deliberately bad model)',' (bad on purpose)');
        s+=narrow?tx(0,y+11,escH(nm),{fs:11}):tx(lw-6,y+13,escH(nm),{fs:11,a:'end'});
        s+=ln2(X(+ci[1]),by+6,X(+ci[2]),by+6,'var(--mute)',{sw:2})+'<circle cx="'+X(v)+'" cy="'+(by+6)+'" r="4.5" fill="'+(/control/i.test(r[0])?'var(--mute)':'var(--c1)')+'"/>'+tx(X(+ci[2])+5,by+10,v+'%',{fs:11})});
      if(narrow)s+=tx(W/2,H-2,'accuracy at spotting the model (dot), 95% interval',{fs:11,a:'middle',c:'var(--mute)'});else s+=tx((lw+W)/2,H-2,'mean accuracy at spotting the model-written article (dot), 95% interval (bar); 50% is chance',{fs:11,a:'middle',c:'var(--mute)'});
      $('humSvg').innerHTML=svgW(W,H,s,'human detection of generated news')})}
  function chk(){const Q=RC.q;let h='<thead><tr><th>Claim or number</th><th>Where the paper says</th><th>What its own table or data says</th></tr></thead><tbody>';
    RC.text_vs_table.forEach(r=>{h+='<tr><td>'+escH(r[0])+'</td><td>'+escH(r[1])+'</td><td>'+escH(r[2])+'</td></tr>'});
    $('chkTab').innerHTML=h+'</tbody>';
    const ok=[['PTB gain over prior zero-shot SOTA',f1(Q.ptb_gain)+' points ("15 points")'],['LAMBADA few-shot over SOTA',f1(Q.lambada_few_gain)+' ("over 18%")'],['LAMBADA zero-shot over SOTA',f1(Q.lambada_zero_gain)+' ("8%")'],['TriviaQA zero-shot over T5-11B, over T5+SSM',f1(Q.triviaqa_zero_vs_t5)+', '+f1(Q.triviaqa_zero_vs_ssm)+' ("14.2%", "3.8%")'],['Translation: one-shot over zero-shot, few over one (6-direction mean)',f1(Q.mt_one_minus_zero)+', '+f1(Q.mt_few_minus_one)+' ("over 7", "another 4")'],['Few-shot into English over best unsupervised NMT',f1(Q.mt_into_en_margin_mean)+' BLEU mean ("5 BLEU")'],['SuperGLUE averages from Table 3.8\'s columns',Q.superglue_avg_gpt3.toFixed(2)+', '+Q.superglue_avg_bert.toFixed(2)+', '+Q.superglue_avg_sota.toFixed(2)+' (printed 71.8, 69.0, 89.0)'],['ARC gaps to UnifiedQA',f1(Q.arc_gap_challenge)+', '+f1(Q.arc_gap_easy)+' ("27%", "22%")'],['StoryCloze gap',f1(Q.storycloze_gap)+' ("4.1%")'],['Arithmetic overlap',Q.arith_overlap_add_pct+'% and '+Q.arith_overlap_sub_pct+'% ("0.8%", "0.1%")'],['175B over the largest earlier dense model (Turing-NLG 17B)',f1(Q.largest_prior_ratio)+'× ("10x")'],['Compute against T5-11B',f1(RC.gpt3_vs_t5_11b)+'× ("an order of magnitude")'],['Released arithmetic answers (three sets)','all 6,000 correct']];
    $('chkOk').innerHTML='<b>Numbers that do reproduce</b> (independently, from the tables): '+ok.map(o=>escH(o[0])+': '+o[1]).join('; ')+'.'}
  function c1(){fit($('c1Svg'),W=>{$('c1Svg').innerHTML=contamChart(W)})}
  onTab('t-tables',()=>{hTable();pTable();mixTable();cmpTable();c1Table();c1();hum();chk()});
})();
