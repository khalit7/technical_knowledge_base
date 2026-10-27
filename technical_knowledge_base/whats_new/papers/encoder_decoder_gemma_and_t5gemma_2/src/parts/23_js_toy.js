// ---- The toy adaptation tab: curves and tables from model/report.json (training-time held-out evaluations) ----
(function(){
  const TOY=PAPER.toy||{};
  const RUNS=[
    ['ad_bi','Adapted, bidirectional encoder','var(--c3)','small-small, all weights copied, cross-attention copied from self-attention (the balanced recipe)'],
    ['ad_causal','Adapted, encoder kept causal','var(--c2)','the same, but the encoder keeps its causal mask (the paper\'s 4.1 and 4.7 point ablation)'],
    ['scratch','Encoder-decoder from scratch','var(--c4)','same architecture, random weights, same 1,000 steps (Table 4\'s comparison)'],
    ['scratch2x','From scratch, 2,500 steps','var(--c6)','random weights given the pretraining and adaptation steps together'],
    ['dec_cont','Decoder-only, trained on','var(--dim)','the small checkpoint trained 1,000 more steps as it was (the extra-compute control)'],
    ['big_small_w0','Big-small, no warmup','var(--c1)','encoder from the big checkpoint, decoder from the small one, random cross-attention, everything trained from step 1'],
    ['big_small_w100','Big-small, 100 warmup steps','var(--c5)','the same with cross-attention trained alone (all else frozen) for 100 steps first'],
    ['big_small_w500','Big-small, 500 warmup steps','var(--mute)','the same with 500 warmup steps, half the budget']];
  const have=RUNS.filter(r=>TOY[r[0]]);
  if(!have.length){$('toyChart').innerHTML='<p class="small mute">Toy results not built yet.</p>';return}
  const on=new Set(['ad_bi','ad_causal','scratch','dec_cont'].filter(k=>TOY[k]));
  const reach=(c,th)=>{const p=c.find(x=>x[2]>=th);return p?p[0]:null};
  const P=k=>TOY[k].params;
  const kv=[['Small decoder-only',TOY.pre_small?fmt(TOY.pre_small.params)+' parameters':''],['Big decoder-only',TOY.pre_big?fmt(TOY.pre_big.params)+' parameters':''],
    ['Small-small encoder-decoder',TOY.ad_bi?fmt(TOY.ad_bi.params)+' parameters':''],['Big-small encoder-decoder',TOY.big_small_w0?fmt(TOY.big_small_w0.params)+' parameters':''],
    ['Held-out set','2,000 inputs, drawn uniformly with their own seed'+(TOY.overlap?'; '+TOY.overlap.held_out_hits+' of them occur among the '+fmt(TOY.overlap.training_samples_checked)+' training samples':'')]];
  $('toyKv').innerHTML=kv.map(([a,b])=>'<dt>'+a+'</dt><dd>'+b+'</dd>').join('');
  $('toyChips').innerHTML=have.map(r=>'<button data-k="'+r[0]+'" class="'+(on.has(r[0])?'on':'')+'" aria-pressed="'+on.has(r[0])+'" title="'+r[3]+'"><span class="dbar" style="width:10px;background:'+r[2]+'"></span> '+r[1]+'</button>').join('');
  $('toyChips').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.k;on.has(k)?on.delete(k):on.add(k);b.classList.toggle('on',on.has(k));b.setAttribute('aria-pressed',on.has(k));chart()}));
  function lines(host,keys,src,xmax,title){fit(host,w=>{const h=Math.min(280,w*.6),pl=40,pr=10,pt=10,pb=34;const X=v=>pl+(w-pl-pr)*v/xmax,Y=v=>pt+(h-pt-pb)*(1-v/100);let s='';
      [0,25,50,75,100].forEach(v=>{s+=ln2(pl,Y(v),w-pr,Y(v),'var(--line)')+tx(pl-4,Y(v)+4,v+'%',{fs:11,a:'end',c:'var(--mute)'})});
      const step=xmax>1500?500:250;for(let v=0;v<=xmax;v+=step)s+=tx(X(v),h-pb+14,fmt(v),{fs:11,a:v===xmax?'end':'middle',c:'var(--mute)'});
      s+=tx((pl+w-pr)/2,h-4,title,{fs:11,a:'middle',c:'var(--mute)'});
      const PRE={pre_small:['pre_small','Small decoder-only','var(--c3)'],pre_big:['pre_big','Big decoder-only','var(--c1)']};
      keys.forEach(k=>{const r=RUNS.find(x=>x[0]===k)||PRE[k];const c=src[k].curve.filter(p=>p[0]<=xmax);
        s+='<polyline fill="none" stroke="'+r[2]+'" stroke-width="2" points="'+c.map(p=>X(p[0]).toFixed(1)+','+Y(p[2]).toFixed(1)).join(' ')+'"/>'});
      let hh=h;if(keys.some(k=>PRE[k])){const lg=legend(keys.map(k=>[PRE[k][1],PRE[k][2]]),pl,h+6,w-pl);s+=lg.s;hh=h+lg.h+6}
      host.innerHTML=svgW(w,hh,s,title)})}
  function chart(){const ks=[...on];const xmax=ks.includes('scratch2x')?2500:1000;lines($('toyChart'),ks,TOY,xmax,'adaptation step (held-out exact match, every 25 steps)')}
  // table
  const row=k=>{const t=TOY[k],r=RUNS.find(x=>x[0]===k);const s0=t.curve[0][2],r90=reach(t.curve,90),r99=reach(t.curve,99);
    return '<tr><td><span class="dbar" style="width:10px;background:'+r[2]+'"></span> '+r[1]+'<div class="small mute">'+r[3]+'</div></td><td>'+s0.toFixed(1)+'%</td><td>'+(r90==null?'never':fmt(r90))+'</td><td>'+(r99==null?'never':fmt(r99))+'</td><td><b>'+t.final_exact.toFixed(1)+'%</b></td><td>'+t.final_token.toFixed(1)+'%</td></tr>'};
  $('toyTbl').innerHTML='<table><thead><tr><th>Run</th><th>Exact at step 0</th><th>Steps to 90%</th><th>Steps to 99%</th><th>Final exact</th><th>Final digits right</th></tr></thead><tbody>'+have.map(r=>row(r[0])).join('')+'</tbody></table>';
  // beside the paper
  const fe=k=>TOY[k]?TOY[k].final_exact.toFixed(1)+'%':'n/a',st=(k,th)=>{if(!TOY[k])return 'n/a';const v=reach(TOY[k].curve,th);return v==null?'never':fmt(v)+' steps'};
  const cmp=[
    ['Bidirectional against causal encoder','Causal costs 4.1 PT and 4.7 IT points at 2B-2B (@S6@)','to 90%: bidirectional '+st('ad_bi',90)+', causal '+st('ad_causal',90)+'; both '+fe('ad_bi')+' at the end'],
    ['Adaptation against scratch, same budget','Scratch wins at S-S (29M) and on two of three scores at B-B (113M); adaptation wins from L-L (409M) up (@T4@)','to 90%: adapted '+st('ad_bi',90)+', scratch '+st('scratch',90)],
    ['Extra compute for the decoder-only model','6T more tokens: 47.9 to 48.57, below the adapted 49.7','already at '+fe('dec_cont')+' (the toy task saturates it)'],
    ['Cross-attention warmup (unbalanced)','None 61.8, 1K steps 62.5, 5K steps 60.2 (preliminary)','none '+fe('big_small_w0')+', 100 steps '+fe('big_small_w100')+', 500 steps '+fe('big_small_w500')]];
  $('toyCmp').innerHTML='<table class="t3"><thead><tr><th>Question</th><th>The paper</th><th>The toy</th></tr></thead><tbody>'+cmp.map(r=>'<tr><td>'+r[0]+'</td><td class="chg">'+r[1].replace('@S6@','<a href="'+PAPER.meta.ax.A+'#S6" target="_blank" rel="noopener noreferrer">§6</a>').replace('(@T4@)','(<a href="'+PAPER.meta.ax.A+'#S6.T4" target="_blank" rel="noopener noreferrer">Table 4</a>)')+'</td><td class="chg">'+r[2]+'</td></tr>').join('')+'</tbody></table>';
  onTab('t-run',()=>{chart();if(TOY.pre_small)lines($('toyPre'),['pre_small','pre_big'].filter(k=>TOY[k]),TOY,1500,'pretraining step (held-out exact match)')});
  // first run, decoder positions restarting at 0
  const P0=TOY._pos0||{};const k0=Object.keys(P0);
  if(k0.length){$('toyPos0').innerHTML='<p>The first full run had a flaw of the toy\'s own: its encoder-decoders restarted the decoder\'s learned positions at 0, while the copied decoder had only seen output tokens at positions 13 to 25. The paper\'s models use RoPE and do not face this. The runs were repeated with the decoder\'s positions continuing from 13 (above); the first run\'s results are kept here, for the runs it finished:</p><table class="t3"><thead><tr><th>Run (first run)</th><th>Steps to 90%</th><th>Final exact</th></tr></thead><tbody>'+
    k0.map(k=>{const r=RUNS.find(x=>x[0]===k);return '<tr><td>'+(r?r[1]:k)+'</td><td>'+(reach(P0[k].curve,90)==null?'never':fmt(reach(P0[k].curve,90)))+'</td><td>'+P0[k].final_exact.toFixed(1)+'%</td></tr>'}).join('')+'</tbody></table>'}
})();
