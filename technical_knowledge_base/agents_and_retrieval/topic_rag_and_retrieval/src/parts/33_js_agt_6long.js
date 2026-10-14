// ---- Agentic lab: long context against retrieval, and the position of the evidence in a long prompt ----
(function(){
  const P=window.AGT,D=P.D,$=P.$,esc=P.esc;
  const pos=D&&D.position,st=D&&D.strategies;
  if(pos){
    let y='f1';
    function draw(){
      const ms=Object.keys(pos);const xs=pos[ms[0]].slots.map(s=>s+'-'+(s+1));
      P.lines({el:$('agt-pos-chart'),xs,series:ms.map((m,i)=>({name:'Qwen3-'+m.toUpperCase()+', '+P.n0(pos[m].n_in)+'-token prompt',color:i?'var(--c2)':'var(--c4)',ys:pos[m][y]})),
        ymin:0,ymax:Math.min(1,Math.ceil(Math.max(...ms.flatMap(m=>pos[m][y]))*10+1)/10),fmt:v=>v.toFixed(2),xlab:'position of the gold pair among 20 paragraphs',h:220,label:'Accuracy by position of the gold paragraphs'});
      $('agt-pos-note').innerHTML=ms.map(m=>{const a=pos[m][y];const mid=a[2],best=Math.max(...a);return 'Qwen3-'+m.toUpperCase()+' ('+pos[m].n+' questions): '+(y==='f1'?'F1':'EM')+' '+a.map(v=>v.toFixed(3)).join(', ')+'; middle vs best slot '+(mid-best>=0?'+':'')+(mid-best).toFixed(3)+'; 95% CI at the middle slot '+pos[m].f1_ci[2][0].toFixed(3)+' to '+pos[m].f1_ci[2][1].toFixed(3)+' (F1).'}).join('<br>');
    }
    P.seg($('agt-pos-y'),v=>{y=v;draw()});
    P.onRender(draw);
  }
  if(st){
    const keys=[['single_k5','Retrieve top 5 (bge-small)'],['single_k10','Retrieve top 10'],['longctx','Own 10 paragraphs (2 gold + 8 distractors), about 1.4k tokens'],['longctx_tokens8000','Gold + nearest paragraphs to about 8k tokens']];
    let model='4b';
    function tab(){const d=st[model];if(!d)return;
      $('agt-lc-table').innerHTML='<div class="tw"><table><thead><tr><th>What the model reads (Qwen3-'+model.toUpperCase()+')</th><th class="num">F1</th><th class="num">EM</th><th class="num">gold in prompt</th><th class="num">prompt tokens</th><th class="num">s per question</th></tr></thead><tbody>'+
        keys.filter(k=>d[k[0]]).map(k=>{const r=d[k[0]];return '<tr><td>'+k[1]+'</td><td class="num">'+r.f1.toFixed(3)+'</td><td class="num">'+r.em.toFixed(3)+'</td><td class="num">'+P.pc(r.gold_recall,0)+'</td><td class="num">'+P.n0(r.tok_in)+'</td><td class="num">'+r.wall_mean.toFixed(2)+'</td></tr>'}).join('')+'</tbody></table></div>'}
    const m=$('agt-lc-model');if(Object.keys(st).length>1)P.seg(m,v=>{model=v;tab()});else m.hidden=true;
    P.onRender(tab);
  }
})();
