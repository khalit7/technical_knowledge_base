// ---- Agentic lab: tokens per step of the agent loop (billed vs prefilled), and the quadratic total ----
(function(){
  const P=window.AGT,D=P.D&&P.D.steps,$=P.$,esc=P.esc;
  if(!D){return}
  let model=D['4b']?'4b':Object.keys(D)[0];
  function draw(){
    const d=D[model];if(!d)return;
    const n=d.prompt_at_step.length;const xs=[...Array(n)].map((_,i)=>'call '+(i+1));
    let cb=0,cn=0;const cumB=[],cumN=[];
    d.prompt_at_step.forEach((v,i)=>{cb+=v||0;cn+=d.new_at_step[i]||0;cumB.push(cb);cumN.push(cn)});
    const mx=Math.max(...cumB);const top=Math.ceil(mx/1000)*1000;
    P.lines({el:$('agt-tk-chart'),xs,series:[
      {name:'prompt length at this call (billed)',color:'var(--c4)',ys:d.prompt_at_step},
      {name:'tokens actually prefilled (prompt cache on)',color:'var(--c6)',ys:d.new_at_step},
      {name:'running total billed (sum of prompts)',color:'var(--c2)',ys:cumB,dash:1}],
      ymin:0,ymax:top,fmt:v=>v>=1000?(v/1000).toFixed(1)+'k':String(Math.round(v)),xlab:'call in the loop (mean over questions reaching it)',h:230,label:'Agent loop tokens per call'});
    const rows=Object.entries(d.by_n_calls).map(([k,v])=>'<tr><td class="num">'+k+'</td><td class="num">'+v.n+'</td><td class="num">'+P.n0(v.tok_in)+'</td><td class="num">'+P.n0(v.tok_in_new)+'</td><td class="num">'+v.wall.toFixed(1)+'</td><td class="num">'+v.f1.toFixed(3)+'</td></tr>').join('');
    $('agt-tk-table').innerHTML='<div class="tw"><table><thead><tr><th class="num">calls used</th><th class="num">questions</th><th class="num">input tokens billed</th><th class="num">prefilled</th><th class="num">seconds</th><th class="num">F1</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
    const h=d.search_hist;$('agt-tk-hist').innerHTML='Searches per question (Qwen3-'+model.toUpperCase()+'): '+Object.entries(h).filter(e=>e[1]>0).map(e=>'<b>'+e[0]+'</b>: '+e[1]).join(', ')+'. Answered without searching: '+d.kinds.answered_no_search+'; repeated a query: '+d.kinds.repeat_query+'; no parseable action: '+d.kinds.no_action+'.';
  }
  const m=$('agt-tk-model');if(Object.keys(D).length>1)P.seg(m,v=>{model=v;draw()});else m.hidden=true;
  P.onRender(draw);
})();
