// ---- Depth and placement tab: (1) Theorem 1 sweep on the toy, (2) six released models' residual streams ----
(function(){
  const NI=window.NI,dsvg=document.getElementById('dp-svg'),rsvg=document.getElementById('rm-svg');if(!dsvg)return;
  const onTab=f=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-depth']=window.TAB_RENDER['t-depth']||[]).push(f)};
  const PL=[['post','Post-norm','var(--c2)'],['pre','Pre-norm','var(--c1)'],['peri','Peri-norm','var(--c3)'],['out','Output norm','var(--c4)'],['deep','DeepNorm','var(--c5)']];
  const LS=[3,6,12,24,48],SEEDS=5;
  let sweep=null,q='g',busy=false;
  function compute(done){if(sweep||busy){if(sweep)done();return}busy=true;const res={};const jobs=[];
    PL.forEach(p=>{res[p[0]]={};LS.forEach(L=>{res[p[0]][L]={g:0,r:0,s:0};jobs.push([p[0],L])})});
    let k=0;(function chunk(){const t0=performance.now();
      while(k<jobs.length&&performance.now()-t0<40){const [p,L]=jobs[k++];const a=res[p][L];
        for(let s=1;s<=SEEDS;s++){const o=NI.toy({place:p,L,seed:s});a.g+=o.g2[L-1]/SEEDS;a.r+=o.g2[0]/o.g2[L-1]/SEEDS;a.s+=o.stream[L]/SEEDS}}
      if(k<jobs.length)setTimeout(chunk,0);else{sweep=res;busy=false;done()}})()}
  const sup=e=>String(e).replace('-','⁻').split('').map(c=>'⁰¹²³⁴⁵⁶⁷⁸⁹'['0123456789'.indexOf(c)]||c).join('');
  function logAxes(svg,W,H,pad,xlo,xhi,ylo,yhi,xt,xl,yl){let h='';const lx=v=>pad.l+(Math.log10(v)-Math.log10(xlo))/(Math.log10(xhi)-Math.log10(xlo))*(W-pad.l-pad.r);
    const ly=v=>H-pad.b-(Math.log10(v)-Math.log10(ylo))/(Math.log10(yhi)-Math.log10(ylo))*(H-pad.t-pad.b);
    for(let e=Math.round(Math.log10(ylo));e<=Math.log10(yhi)+1e-9;e++){const Y=ly(Math.pow(10,e));h+='<line x1="'+pad.l+'" x2="'+(W-pad.r)+'" y1="'+Y+'" y2="'+Y+'" stroke="var(--line)"/><text x="'+(pad.l-4)+'" y="'+(Y+3)+'" font-size="10" text-anchor="end" fill="var(--mute)">'+(e===0?'1':e===1?'10':'10'+sup(e))+'</text>'}
    xt.forEach(v=>{const X=lx(v);h+='<line x1="'+X+'" x2="'+X+'" y1="'+pad.t+'" y2="'+(H-pad.b)+'" stroke="var(--line)" stroke-dasharray="2 3"/><text x="'+X+'" y="'+(H-pad.b+13)+'" font-size="10" text-anchor="middle" fill="var(--mute)">'+v+'</text>'});
    h+='<text x="'+((W+pad.l)/2)+'" y="'+(H-3)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+xl+'</text><text x="'+pad.l+'" y="'+(pad.t-5)+'" font-size="11" fill="var(--mute)">'+yl+'</text>';
    return {h,lx,ly}}
  const fmt=v=>v>=1000||v<0.01?v.toExponential(2):v.toFixed(v>=10?1:3);
  function drawSweep(){if(!sweep){dsvg.innerHTML='';return}
    const W=Math.max(320,Math.min(600,RD.width(dsvg.parentNode))),H=300;dsvg.setAttribute('viewBox','0 0 '+W+' '+H);const pad={l:48,r:14,t:20,b:30};const all=[];PL.forEach(p=>LS.forEach(L=>all.push(sweep[p[0]][L][q])));
    let lo=Math.pow(10,Math.floor(Math.log10(Math.min(...all)))),hi=Math.pow(10,Math.ceil(Math.log10(Math.max(...all))));if(hi/lo<10)hi=lo*10;
    const lab={g:'last block\'s gradient (Frobenius norm)',r:'first block\'s gradient / last block\'s',s:'stream RMS after the last block'}[q];
    const A=logAxes(dsvg,W,H,pad,2.5,60,lo,hi,LS,'depth L (blocks)',lab);let h=A.h;
    if(q==='g'){const p0=sweep.pre[3].g;h+='<path d="M'+A.lx(3)+' '+A.ly(p0)+'L'+A.lx(48)+' '+A.ly(p0/4)+'" stroke="var(--c1)" stroke-dasharray="5 4" fill="none" opacity=".7"/><text x="'+A.lx(48)+'" y="'+(A.ly(p0/4)+14)+'" font-size="10" text-anchor="end" fill="var(--c1)">1/&radic;L</text>'}
    PL.forEach(p=>{const pts=LS.map(L=>[A.lx(L),A.ly(sweep[p[0]][L][q]),L,sweep[p[0]][L][q]]);
      h+='<path d="M'+pts.map(t=>t[0].toFixed(1)+' '+t[1].toFixed(1)).join('L')+'" stroke="'+p[2]+'" stroke-width="2" fill="none"/>';
      pts.forEach(t=>{h+='<circle cx="'+t[0]+'" cy="'+t[1]+'" r="3.5" fill="'+p[2]+'"><title>'+p[1]+', L = '+t[2]+': '+fmt(t[3])+'</title></circle>'})});
    dsvg.innerHTML=h;
    const g=s=>sweep[s];
    document.getElementById('dp-note').innerHTML=q==='g'?'From L = 3 to 48 (16 times deeper), post-norm\'s last-block gradient goes from '+fmt(g('post')[3].g)+' to '+fmt(g('post')[48].g)+', pre-norm\'s from '+fmt(g('pre')[3].g)+' to '+fmt(g('pre')[48].g)+' (÷'+(g('pre')[3].g/g('pre')[48].g).toFixed(2)+'; 1/&radic;L predicts ÷4) <span class="nl m">measured</span>.':
      q==='r'?'Above 1, the early blocks get larger gradients than the late ones. Post-norm is below 1 at every depth: its gradient is largest near the output, the imbalance warmup protects against; DeepNorm is near 1.':
      'Post-norm and DeepNorm end every block at size 1; pre-norm grows like the square root of the depth (Lemma 2); peri-norm and the output norm add a size-1 vector per sub-layer, so their streams reach about &radic;(2L + 1).';}
  document.getElementById('dp-leg').innerHTML=PL.map(p=>'<span><i style="background:'+p[2]+'"></i>'+p[1]+'</span>').join('');
  document.getElementById('dp-q').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;q=b.dataset.q;[...e.currentTarget.children].forEach(x=>x.classList.toggle('on',x===b));drawSweep()});
  onTab(()=>compute(drawSweep));

  // ---- (2) real models ----
  const R=NID.real,COL=['var(--c2)','var(--c1)','var(--c6)','var(--c4)','var(--c3)','var(--c5)'];
  const PN={post:'post',pre:'pre',peri:'peri (pre + post)',out:'output norm'};
  const short=id=>id.split('/')[1];
  const on=R.map(()=>true);let rq='rms';
  const DESC={rms:'Median over tokens (first token excluded) of the RMS of the residual stream after each block, before any final norm. BERT\'s dashed line: the sum entering each block\'s last LayerNorm.',
    grow:'The same median, divided by the median RMS of the embedding output (the stream before block 1).',
    amax:'Largest absolute value anywhere in the stream after each block, first token excluded.',
    tok0:'RMS of the first token\'s stream after each block. In decoders it carries "massive activations".',
    logit:'Largest pre-softmax attention logit in each layer (q · k times the model\'s own scaling), over heads and allowed query-key pairs, first token excluded as a query.'};
  function series(m){if(rq==='rms')return m.rms;if(rq==='grow')return m.rms.map(v=>v/m.emb);if(rq==='amax')return m.amax;if(rq==='tok0')return m.tok0;return m.logit}
  function drawReal(){const W=Math.max(320,Math.min(600,RD.width(rsvg.parentNode))),H=320;rsvg.setAttribute('viewBox','0 0 '+W+' '+H);const pad={l:48,r:14,t:20,b:30};
    const vals=[];R.forEach((m,i)=>{if(on[i])series(m).forEach(v=>v>0&&vals.push(v));if(on[i]&&rq==='rms'&&m.sum)m.sum.forEach(v=>vals.push(v))});
    if(!vals.length){rsvg.innerHTML='';return}
    let lo=Math.pow(10,Math.floor(Math.log10(Math.min(...vals)))),hi=Math.pow(10,Math.ceil(Math.log10(Math.max(...vals))));if(hi/lo<10)hi=lo*10;
    const lx=v=>pad.l+v*(W-pad.l-pad.r),ly=v=>H-pad.b-(Math.log10(v)-Math.log10(lo))/(Math.log10(hi)-Math.log10(lo))*(H-pad.t-pad.b);
    let h='';for(let e=Math.round(Math.log10(lo));e<=Math.log10(hi)+1e-9;e++){const Y=ly(Math.pow(10,e));h+='<line x1="'+pad.l+'" x2="'+(W-pad.r)+'" y1="'+Y+'" y2="'+Y+'" stroke="var(--line)"/><text x="'+(pad.l-4)+'" y="'+(Y+3)+'" font-size="10" text-anchor="end" fill="var(--mute)">'+(e===0?'1':e===1?'10':'10'+sup(e))+'</text>'}
    [0,0.25,0.5,0.75,1].forEach(v=>{h+='<text x="'+lx(v)+'" y="'+(H-pad.b+13)+'" font-size="10" text-anchor="middle" fill="var(--mute)">'+v+'</text>'});
    h+='<text x="'+((W+pad.l)/2)+'" y="'+(H-3)+'" font-size="11" text-anchor="middle" fill="var(--mute)">depth, as a fraction of the model\'s blocks</text>';
    R.forEach((m,i)=>{if(!on[i])return;const s=series(m);const pts=s.map((v,k)=>[lx((k+1)/m.L),ly(Math.max(v,lo))]);
      h+='<path d="M'+pts.map(p=>p[0].toFixed(1)+' '+p[1].toFixed(1)).join('L')+'" stroke="'+COL[i]+'" stroke-width="2" fill="none"/>';
      s.forEach((v,k)=>{h+='<circle cx="'+pts[k][0]+'" cy="'+pts[k][1]+'" r="2.4" fill="'+COL[i]+'"><title>'+short(m.id)+', block '+(k+1)+': '+fmt(v)+'</title></circle>'});
      if(rq==='rms'&&m.sum)h+='<path d="M'+m.sum.map((v,k)=>lx((k+1)/m.L).toFixed(1)+' '+ly(v).toFixed(1)).join('L')+'" stroke="'+COL[i]+'" stroke-dasharray="4 3" fill="none"/>'});
    rsvg.innerHTML=h;document.getElementById('rm-desc').textContent=DESC[rq]}
  document.getElementById('rm-models').innerHTML=R.map((m,i)=>'<button data-i="'+i+'" class="on" style="border-left:4px solid '+COL[i]+'">'+short(m.id)+' ('+PN[m.place]+(m.qk?', QK-norm':'')+')</button>').join('');
  document.getElementById('rm-models').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const i=+b.dataset.i;on[i]=!on[i];b.classList.toggle('on',on[i]);drawReal()});
  document.getElementById('rm-q').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;rq=b.dataset.q;[...e.currentTarget.children].forEach(x=>x.classList.toggle('on',x===b));drawReal()});
  document.getElementById('rm-tb').innerHTML=R.map(m=>'<tr><td>'+short(m.id)+'</td><td>'+PN[m.place]+(m.qk?' + QK-norm':'')+'</td><td class="num">'+m.L+'</td><td class="num">'+m.d+'</td><td class="num">'+fmt(m.emb)+'</td><td class="num">'+fmt(m.rms[m.L-1])+'</td><td class="num">×'+(m.rms[m.L-1]/m.emb).toFixed(1)+'</td><td class="num">'+Math.max(...m.logit).toFixed(1)+'</td></tr>').join('');
  document.getElementById('rm-src').innerHTML='One English passage (the opening sentence of <i>A Tale of Two Cities</i>, public domain), about 145 tokens per tokenizer, one forward pass per model in float32 with eager attention (transformers '+NID.realVer.transformers+', torch '+NID.realVer.torch+'); <code>src/real/real_streams.py</code> <span class="nl m">measured</span>. Gemma 3 270M is read from the <code>unsloth/gemma-3-270m</code> mirror of Google\'s release; its embedding output already includes Gemma\'s &radic;d scaling.';
  onTab(drawReal);
})();
