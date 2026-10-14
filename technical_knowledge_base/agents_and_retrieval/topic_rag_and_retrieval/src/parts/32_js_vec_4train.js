// ---- Vector search lab: contrastive training on a real batch (InfoNCE computed live from real cosines) ----
(function(){
  const V=window.VEC,$=V.$,esc=V.esc,f3=V.f3,C=V.D.con;
  const TAUS=[0.01,0.02,0.05,0.1,0.2,0.5,1];
  let model='bge-small',hard=false,tau=0.05;
  const B=C.batch.length;
  function rowProbs(i){
    const m=C.models[model],s=m.cos[i].slice();if(hard)s.push(m.hard[i].cos);
    const z=s.map(x=>x/tau),mx=Math.max(...z),e=z.map(x=>Math.exp(x-mx)),t=e.reduce((a,b)=>a+b,0);
    return {s,p:e.map(x=>x/t)};
  }
  const lossOf=i=>-Math.log(rowProbs(i).p[i]);
  let A;
  function draw(step){
    const m=C.models[model];
    const cur=step<B?step:-1;
    let h='<table class="vec-hm"><tr><th></th>'+C.batch.map((b,j)=>'<th title="'+esc(b.pos_title)+'">D'+(j+1)+'</th>').join('')+(hard?'<th title="hard negatives">H</th>':'')+'<th>p(+)</th></tr>';
    for(let i=0;i<B;i++){const {s,p}=rowProbs(i);
      h+='<tr'+(i===cur?' style="outline:2px solid var(--acc)"':'')+'><th title="'+esc(C.batch[i].claim)+'">C'+(i+1)+'</th>'+s.map((x,j)=>{const a=Math.round(8+80*p[j]);
        return '<td class="'+(j===i?'pos':j===B?'hard':'')+'" style="background:color-mix(in srgb,var(--acc) '+a+'%,var(--bg))'+(p[j]>.55?';color:var(--bg)':'')+'" title="cos '+x.toFixed(3)+', softmax '+(p[j]*100).toFixed(1)+'%">'+x.toFixed(2)+'</td>'}).join('')+'<td>'+(p[i]*100).toFixed(0)+'%</td></tr>'}
    h+='</table><div class="vec-small">Cell = cosine of claim Ci with abstract Dj (Di is Ci\'s labelled positive, green outline); shading = softmax probability at &tau; '+tau+'; H = that claim\'s own hard negative (dashed). Hover a header for the text.</div>';
    $('vec-con-hm').innerHTML=h;
    if(cur>=0){const {s,p}=rowProbs(cur);let k=-1,kv=-1;p.forEach((x,j)=>{if(j!==cur&&x>kv){kv=x;k=j}});
      const nm=j=>j===B?'its hard negative "'+esc(m.hard[cur].title)+'"':'D'+(j+1)+' "'+esc(C.batch[j].pos_title)+'"';
      $('vec-con-cap').innerHTML='<b>C'+(cur+1)+':</b> "'+esc(C.batch[cur].claim)+'". Positive D'+(cur+1)+' "'+esc(C.batch[cur].pos_title)+'" has cosine '+s[cur].toFixed(3)+' and gets '+(p[cur]*100).toFixed(1)+'% of the softmax; loss = &minus;log '+p[cur].toFixed(3)+' = <b>'+(-Math.log(p[cur])).toFixed(3)+'</b>. Strongest competitor: '+nm(k)+' (cosine '+s[k].toFixed(3)+', '+(kv*100).toFixed(1)+'%).';
    }else{
      const L=[...Array(B).keys()].map(lossOf),mean=L.reduce((a,b)=>a+b,0)/B;
      $('vec-con-cap').innerHTML='<b>The batch loss</b> is the mean over the 8 rows: <b>'+mean.toFixed(3)+'</b> ('+model+', '+(hard?'with':'without')+' hard negatives, &tau; '+tau+'). A gradient step lowers it by pulling each claim toward its positive and away from the others. '+(hard?'The hard negatives add most of the loss: they are the documents the model already confuses.':'Toggle the hard negatives to see the loss jump on the same batch.');
    }
    const L=[...Array(B).keys()].map(lossOf),mean=L.reduce((a,b)=>a+b,0)/B,top=[...Array(B).keys()].filter(i=>{const {p}=rowProbs(i);return p[i]>=Math.max(...p)}).length;
    $('vec-con-stats').innerHTML='<div class="stat"><div class="k">Mean loss</div><div class="v">'+mean.toFixed(3)+'</div><div class="d">chance level: ln '+(B+(hard?1:0))+' = '+Math.log(B+(hard?1:0)).toFixed(3)+'</div></div>'+
      '<div class="stat"><div class="k">Positive ranks first</div><div class="v">'+top+' of '+B+'</div><div class="d">rows</div></div>'+
      '<div class="stat"><div class="k">Mean p(positive)</div><div class="v">'+V.pc([...Array(B).keys()].reduce((a,i)=>a+rowProbs(i).p[i],0)/B)+'</div><div class="d">at &tau; '+tau+'</div></div>';
    V.bars($('vec-con-bars'),L.map((x,i)=>({name:'C'+(i+1)+' loss',v:x,color:i===cur?'var(--bad)':'var(--acc)'})),Math.max(Math.log(B+1),...L)*1.02,x=>x.toFixed(3));
  }
  A=V.anim({card:'vec-con-card',ctl:'vec-con-ctl',n:B+1,draw,ms:2200,label:'Row of the batch'});
  V.seg($('vec-con-m'),v=>{model=v;A.redraw()});
  V.seg($('vec-con-h'),v=>{hard=v==='1';A.redraw()});
  $('vec-con-t').addEventListener('input',e=>{tau=TAUS[+e.target.value];$('vec-con-tv').textContent=tau;A.redraw()});
  // batch-size sweep
  $('vec-con-npairs').textContent=C.n_train_pairs;
  function sweep(){
    const el=$('vec-con-sweep'),a=C.models['bge-small'].sweep,b=C.models['qwen3-emb-0.6b'].sweep;
    V.lines({el,xs:a.map(x=>'B = '+x.B),series:[{name:'bge-small: positive beats all in-batch negatives',color:'var(--c1)',ys:a.map(x=>x.top1)},{name:'Qwen3-Embedding',color:'var(--c2)',ys:b.map(x=>x.top1)}],ymin:0.8,ymax:1,fmt:x=>(+x).toFixed(2),h:200,label:'Share of claims whose positive wins, by batch size'});
    $('vec-con-sweep-note').innerHTML='Mean loss at &tau; 0.05 grows with B: bge-small '+a.map(x=>x.loss_tau005.toFixed(2)).join(', ')+'; Qwen3 '+b.map(x=>x.loss_tau005.toFixed(2)).join(', ')+' for B = '+a.map(x=>x.B).join(', ')+'. A bigger line-up contains closer negatives, so the task stays informative for longer. Adding each claim\'s hard negative leaves only '+V.pc(a[1].top1_with_hard)+' (bge-small) of positives on top at any B: the mined negative, not the batch, sets the difficulty.';
  }
  const mb=C.models['bge-small'],mq=C.models['qwen3-emb-0.6b'];
  $('vec-con-fn').innerHTML='For '+V.pc(mb.hard_beats_pos)+' of SciFact train claims (bge-small; '+V.pc(mq.hard_beats_pos)+' with Qwen3-Embedding), some unlabelled abstract scores above the labelled positive. Some of those are model errors; some are relevant abstracts nobody labelled (SciFact\'s annotators judged the abstracts cited next to each claim\'s source sentence, not the whole corpus: <a href="https://arxiv.org/abs/2004.14974" target="_blank" rel="noopener noreferrer">Wadden et al. 2020</a>). Training on them as negatives teaches the model to push correct answers away. Qwen3-Embedding\'s loss masks any negative that scores more than 0.1 above the positive (report, section 3.1, equation 1): applied to these mined hard negatives, that rule would drop '+V.pc(mq.hard_masked_01)+' of them under Qwen3\'s scores and '+V.pc(mb.hard_masked_01)+' under bge-small\'s, whose cosines are compressed into a narrow band. <span class="vec-lbl m">measured</span>';
  V.onRender(sweep);
})();
