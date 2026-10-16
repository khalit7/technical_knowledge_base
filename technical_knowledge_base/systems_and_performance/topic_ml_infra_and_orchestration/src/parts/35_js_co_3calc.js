// ---- Cost lab: price table, run-cost calculator (same formulas as src/cost/recompute.py), utilisation waterfall ----
(function(){
  const C=window.CO,D=C.D,$=C.$;
  // ---- prices ----
  $('co-pt').querySelector('tbody').innerHTML=D.prices.map(p=>'<tr><td>'+p.provider+'</td><td>'+p.gpu+'</td><td>'+C.esc(p.kind)+'</td><td class="num">$'+p.usd.toFixed(2)+'</td><td>'+C.esc(p.note)+
    ' <a href="'+C.esc(p.src.split(' ')[0])+'" target="_blank" rel="noopener noreferrer">source</a>, read '+p.read+'</td></tr>').join('');
  // ---- calculator ----
  const PEAK={h100:989.5e12,b200:2250e12};
  const MODELS={l405:['Llama 3.1 405B',405853388800,15.6,'15.6T tokens: Llama 3 paper, section 3.1'],l70:['Llama 3.1 70B',70553706496,15,'"~15T" tokens: Llama 3.1 model card'],l8:['Llama 3.1 8B',8030261248,15,'"~15T" tokens: Llama 3.1 model card']};
  const LLAMA_RATE=419/(54*16384)*1000;
  function run(o){
    const flops=6*o.params*o.tokens_t*1e12,ideal_h=flops/(PEAK[o.gpu]*o.mfu)/3600,lam=o.rate_k/1000/24,mtbf_h=lam>0?1/(lam*o.n):Infinity;
    const tau=o.interval_min/60,st=o.stall_s/3600,rs=o.restart_min/60;
    let g=1-st/tau-(isFinite(mtbf_h)?(tau/2+rs)/mtbf_h:0);g=Math.max(g,0);
    const wall_h=g>0?ideal_h/o.n/g:Infinity,paid_h=o.n*wall_h/(1-o.idle);
    return {flops,ideal_h,mtbf_h,goodput:g,wall_days:wall_h/24,paid_h,cost:paid_h*o.price,useful:o.mfu*g*(1-o.idle),yd_min:isFinite(mtbf_h)?Math.sqrt(2*st*mtbf_h)*60:Infinity};
  }
  function gpusFor(dl,o){for(let n=8;n<=200000;n+=8){if(run(Object.assign({},o,{n})).wall_days<=dl)return n}return null}
  C.calc={run,gpusFor,LLAMA_RATE};
  const ms=$('co-c-model');ms.innerHTML=Object.entries(MODELS).map(([k,m])=>'<option value="'+k+'">'+m[0]+' ('+C.num(m[1]/1e9,2)+'B parameters)</option>').join('');
  function fillPrices(){const g=$('co-c-gpu').value.toUpperCase(),keep=$('co-c-price').value;
    const rows=D.prices.map((p,i)=>[p,i]).filter(([p])=>p.gpu===g);
    $('co-c-price').innerHTML=rows.map(([p,i])=>'<option value="'+i+'">$'+p.usd.toFixed(2)+' '+p.provider+', '+C.esc(p.kind)+'</option>').join('');
    const def=rows.find(([p])=>p.provider==='AWS'&&p.kind.indexOf('Capacity')>=0);
    if([...$('co-c-price').options].some(o=>o.value===keep))$('co-c-price').value=keep;else if(def)$('co-c-price').value=String(def[1]);}
  function setModel(){const m=MODELS[ms.value];$('co-c-tok').value=m[2];$('co-c-tok-s').textContent=m[3];
    $('co-c-model-s').innerHTML='Parameters counted from the Hugging Face config, as on Performance math';}
  const ids=['co-c-tok','co-c-n','co-c-mfu','co-c-fr','co-c-ck','co-c-rs','co-c-iv','co-c-idle','co-c-dl'];
  $('co-c-n').value=16384;$('co-c-mfu').value=40;$('co-c-fr').value=LLAMA_RATE.toFixed(4);$('co-c-ck').value=60;$('co-c-rs').value=10;$('co-c-idle').value=0;$('co-c-dl').value=60;
  $('co-c-fr-s').innerHTML='Llama 3 405B: 419 unexpected interruptions in 54 days on 16,384 H100s = '+LLAMA_RATE.toFixed(4)+' (<a href="https://arxiv.org/html/2407.21783v3" target="_blank" rel="noopener noreferrer">section 3.3.4</a>) <span class="co-tag co-p">published</span>';
  function inputs(){const p=D.prices[+$('co-c-price').value];
    return {params:MODELS[ms.value][1],tokens_t:Math.max(0.001,+$('co-c-tok').value||0),gpu:$('co-c-gpu').value,n:Math.max(1,Math.round(+$('co-c-n').value||1)),
      mfu:Math.min(0.99,Math.max(0.01,(+$('co-c-mfu').value||1)/100)),price:p?p.usd:0,priceRow:p,rate_k:Math.max(0,+$('co-c-fr').value||0),stall_s:Math.max(0,+$('co-c-ck').value||0),
      restart_min:Math.max(0,+$('co-c-rs').value||0),interval_min:Math.max(1,+$('co-c-iv').value||1),idle:Math.min(0.9,Math.max(0,(+$('co-c-idle').value||0)/100))}}
  function yd(){const o=inputs();const r=run(o);if(isFinite(r.yd_min))$('co-c-iv').value=Math.max(1,Math.round(r.yd_min));calc()}
  function calc(){
    const o=inputs(),r=run(o),dl=Math.max(1,+$('co-c-dl').value||1),need=gpusFor(dl,o);
    const fe=x=>{const e=Math.floor(Math.log10(x));return (x/Math.pow(10,e)).toFixed(2)+'e'+e};
    const out=[C.stat('Training FLOPs',fe(r.flops),'6 x parameters x tokens'),
      C.stat('Ideal GPU-hours',C.num(r.ideal_h/1e6,2)+'M','at '+C.pct(o.mfu)+' MFU, no losses'),
      C.stat('Job MTBF',isFinite(r.mtbf_h)?C.num(r.mtbf_h,2)+' h':'no failures',C.num(o.n)+' GPUs'),
      C.stat('Goodput',r.goodput>0?C.pct(r.goodput,1):'0: never finishes','Young/Daly interval: '+(isFinite(r.yd_min)?C.num(r.yd_min,1)+' min':'n/a')),
      C.stat('Wall-clock',isFinite(r.wall_days)?C.num(r.wall_days,1)+' days':'never',''),
      C.stat('Paid GPU-hours',isFinite(r.paid_h)?C.num(r.paid_h/1e6,2)+'M':'n/a',isFinite(r.paid_h)?'+'+C.pct(r.paid_h/r.ideal_h-1)+' over ideal':''),
      C.stat('Cost',isFinite(r.cost)?C.usd(r.cost):'n/a','at $'+o.price.toFixed(2)+' per GPU-hour'),
      C.stat('Useful share of paid',C.pct(r.useful,1),'MFU x goodput x (1 - idle)'),
      C.stat('GPUs for '+dl+' days',need?C.num(need):'not reachable',need?'same interval, goodput recomputed':'goodput falls to 0 first')];
    $('co-c-out').innerHTML=out.join('');
    const isDef=ms.value==='l405'&&o.gpu==='h100'&&Math.abs(o.tokens_t-15.6)<1e-9;
    $('co-c-res').innerHTML=isDef?'<b>Residual:</b> these inputs give <b>'+C.num(r.paid_h/1e6,2)+'M</b> H100 GPU-hours against the <a href="https://huggingface.co/meta-llama/Llama-3.1-405B" target="_blank" rel="noopener noreferrer">Llama 3.1 405B model card</a>\'s 30.84M ('+(r.paid_h/30.84e6-1>=0?'+':'')+C.pct(r.paid_h/30.84e6-1,1)+'). Partly by construction: MFU is picked from Table 4\'s 38 to 43%, the stall and restart times are assumptions, and the card\'s hours cover more than steady-state training. Meta does not rent its GPUs, so the dollar figure is an illustration at the chosen price, not what Llama cost.':
      'Residual check: choose Llama 3.1 405B on 15.6T tokens and H100 to compare with the model card\'s 30.84M GPU-hours.';
    C.calcOver=r.paid_h/r.ideal_h-1;
  }
  ms.addEventListener('input',()=>{setModel();calc()});$('co-c-gpu').addEventListener('input',()=>{fillPrices();calc()});$('co-c-price').addEventListener('input',calc);
  ids.forEach(id=>$(id).addEventListener('input',calc));$('co-c-yd').addEventListener('click',yd);
  setModel();fillPrices();yd();
  const over=document.querySelector('#t-cost [data-co="calcover"]');if(over)over.textContent=C.pct(C.calcOver);
  // ---- waterfall ----
  const k2=C.run('co-k200'),k20=C.run('co-k2000'),q=D.queue;
  const ST=['Paid GPU-hours','Allocated to a job','Running training steps','Kept (goodput)','Useful FLOPs (MFU)'];
  const W_={local:{before:[1,q.fifo.util,q.fifo.util*k2.train/k2.alloc_s,q.fifo.util*k2.train/k2.alloc_s,null],
                  after:[1,q.backfill.util,q.backfill.util*k20.train/k20.alloc_s,q.backfill.util*k20.train/k20.alloc_s,null]},
            scale:{before:[1,1,0.85,0.85,0.85*0.40],after:[1,1,0.97,0.97,0.97*0.40]}};
  const CAP={local:{before:'Measured on this Mac: the Slurm FIFO queue gave out '+C.pct(q.fifo.util)+' of its GPU-seconds, and a 200-step job on Kubernetes spent '+C.pct(k2.train/k2.alloc_s)+' of its allocation in training steps. No failures in these runs, so nothing is lost at the goodput step. MFU cannot be measured: the GPUs are fake. The biggest loss is startup and teardown inside the allocation.',
                    after:'After the fix, measured: backfill on the same queue ('+C.pct(q.backfill.util)+') and the same job at 2,000 steps ('+C.pct(k20.train/k20.alloc_s)+' of its allocation in steps). Fixed costs are amortised, not removed: longer jobs and fewer restarts are how real clusters pay them.'},
           scale:{before:'At scale, published: a dedicated cluster (allocation taken as 100%, an assumption), goodput 85% (Gemini 1.0\'s largest job before its fix), MFU 40% (an assumption inside Llama 3\'s published 38 to 43%). The largest loss by far is MFU, which is a model and kernel question ({{Performance math|n:3c65c17b0d0d81faad1ef390b0e54d08}}); the largest infrastructure loss is goodput.',
                  after:'After the fix, published: Gemini 1.0 raised the goodput of its largest job from 85% to 97% by keeping redundant in-memory copies of the model state and recovering from an intact replica after a failure, instead of reloading a checkpoint (<a href="https://arxiv.org/abs/2312.11805" target="_blank" rel="noopener noreferrer">Gemini 1.0 report, section 3</a>). Useful share: '+C.pct(0.85*0.4,1)+' to '+C.pct(0.97*0.4,1)+' of paid hours, about '+C.pct(0.97/0.85-1)+' more model trained per dollar.'}};
  let pre='local',ba='before',cur=W_.local.before.slice(),raf=0;
  const linkify=s=>s.replace(/\{\{([^|{}]+)\|n:([0-9a-f]+)\}\}/g,'<a href="https://app.notion.com/p/$2" target="_blank" rel="noopener noreferrer">$1</a>');
  function drawWf(v){
    const el=$('co-wf-svg'),W=C.width(el),lw=Math.min(170,W*0.42),x0=lw+6,BW=W-x0-46;let s='',y=4;
    ST.forEach((n,i)=>{const val=v[i];s+=C.t(x0-6,y+15,n,{a:'end',fs:11});
      if(val==null){s+=C.rect(x0,y,BW,20,'none',{stroke:C.col('line'),dash:'4 3'})+C.t(x0+6,y+14,'not measurable here (fake GPUs)',{fs:10,fill:C.col('mute')})}
      else{const prev=i?v[i-1]:1;s+=C.rect(x0,y,BW*val,20,C.col(i===0?'c1':i===4?'c4':'c3'),{rx:2});
        if(i&&prev!=null&&prev>val)s+=C.rect(x0+BW*val,y,BW*(prev-val),20,C.col('bad'),{op:0.35,rx:0});
        s+=C.t(x0+BW*val+4,y+14,C.pct(val,1),{fs:11,w:600})}
      y+=28});
    s+=C.t(x0,y+8,'red: lost at this step',{fs:10,fill:C.col('mute')});
    el.innerHTML=C.svg(W,y+12,s,'Utilisation waterfall');
  }
  function go(){const tgt=W_[pre][ba],from=cur.slice(),t0=performance.now(),dur=C.RM?0:900;cancelAnimationFrame(raf);
    $('co-wf-cap').innerHTML=linkify(CAP[pre][ba]);
    const stepf=now=>{const k=dur?Math.min(1,(now-t0)/dur):1,e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
      cur=tgt.map((x,i)=>x==null||from[i]==null?x:from[i]+(x-from[i])*e);drawWf(cur);if(k<1&&C.tabVisible())raf=requestAnimationFrame(stepf);else{cur=tgt.slice();drawWf(cur)}};
    raf=requestAnimationFrame(stepf)}
  C.seg($('co-wf-pre'),m=>{pre=m;cur=W_[pre][ba].slice();go()});
  C.seg($('co-wf-ba'),m=>{ba=m;go()});
  C.onRender(()=>{drawWf(cur);$('co-wf-cap').innerHTML=linkify(CAP[pre][ba])});
})();
