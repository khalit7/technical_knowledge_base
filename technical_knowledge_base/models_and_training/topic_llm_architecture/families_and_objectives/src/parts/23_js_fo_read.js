// ---- Reading tab visuals: mask matrices, the leak before/after, the MTP designs, the joint-training chart, tables ----
(function(){
  if(!window.FOD||!document.getElementById('fo-mk-card'))return;
  const D=FOD,esc=FO.esc,t=RD.t;
  const P=D.rs.pieces.slice(0,12).map((s,i)=>i===0&&s===''?'<eot>':s.replace(/\n/g,'↵'));
  // 0. hero: six families as small multiples (mask matrix, input row, scored row) -------------------------
  (function(){
    const el=document.getElementById('fo-hero');if(!el)return;
    const n=8,cs=11,lx=30,F=[
      {n:'Decoder-only',m:'causal',hid:[],sc:[0,1,2,3,4,5,6],p:'Predict the <b>next token</b> at every position; writes one token per forward from a KV cache.'},
      {n:'Encoder (MLM)',m:'bidir',hid:[2,5],sc:[2,5],p:'Recover <b>hidden tokens</b> from both sides; one pass, no generation: embeddings, classifiers.'},
      {n:'Encoder-decoder',m:'encdec',hid:[2],sc:[4,5,6,7],p:'Encoder reads the input both ways; the decoder writes the <b>target</b>, reading the encoder.'},
      {n:'Prefix LM',m:'prefix',hid:[],sc:[3,4,5,6],p:'Prompt read both ways, <b>continuation</b> causally; only the continuation is scored.'},
      {n:'Decoder + MTP',m:'causal',hid:[],sc:[0,1,2,3,4,5,6],sc2:[0,1,2,3,4,5],p:'Next token <b>and the one after</b>; the extra module is dropped or used as a draft.'},
      {n:'Masked diffusion LM',m:'bidir',hid:[0,2,3,5,6],sc:[0,2,3,5,6],p:'Hidden at a <b>random rate t</b>, weighted 1/t; writes by unmasking many tokens per forward.'}];
    const cell=(m,q,k)=>m==='causal'?(k<=q?1:0):m==='bidir'?1:m==='prefix'?((k<=q||k<3)?1:0):(q<4?(k<4?1:0):(k<4?2:(k<=q?1:0)));
    el.innerHTML=F.map(f=>{let b='';
      for(let q=0;q<n;q++)for(let k=0;k<n;k++){const c=cell(f.m,q,k);
        b+='<rect x="'+(lx+k*cs)+'" y="'+(q*cs)+'" width="'+(cs-1)+'" height="'+(cs-1)+'" rx="1.5" fill="'+(c===2?'var(--c4)':c?'var(--acc)':'var(--soft)')+'" opacity="'+(c?0.85:1)+'"/>'}
      let y=n*cs+6;
      b+=t(lx-4,y+10,'in',{a:'end'});
      for(let k=0;k<n;k++)b+='<rect x="'+(lx+k*cs)+'" y="'+y+'" width="'+(cs-1)+'" height="'+(cs-1)+'" rx="1.5" fill="'+(f.hid.includes(k)?'var(--dim)':'var(--bg)')+'" stroke="var(--line)"/>';
      y+=cs+3;b+=t(lx-4,y+10,'loss',{a:'end'});
      for(let k=0;k<n;k++)b+='<rect x="'+(lx+k*cs)+'" y="'+y+'" width="'+(cs-1)+'" height="'+(cs-1)+'" rx="1.5" fill="'+(f.sc.includes(k)?'var(--good)':'var(--bg)')+'" stroke="var(--line)"/>';
      if(f.sc2){y+=cs+3;b+=t(lx-4,y+10,'t+2',{a:'end'});
        for(let k=0;k<n;k++)b+='<rect x="'+(lx+k*cs)+'" y="'+y+'" width="'+(cs-1)+'" height="'+(cs-1)+'" rx="1.5" fill="'+(f.sc2.includes(k)?'var(--c5)':'var(--bg)')+'" stroke="var(--line)"/>'}
      const H=n*cs+6+2*(cs+3)+(f.sc2?cs+3:0)+2;
      return '<div><h5>'+f.n+'</h5>'+RD.svg(lx+n*cs+2,H,b,f.n+' mask and objective')+'<p>'+f.p+'</p></div>'}).join('');
  })();

  // 1. mask matrices ---------------------------------------------------------------------------------
  // kind of cell: 0 forbidden, 1 self-attention allowed, 2 cross-attention (decoder reads encoder)
  function cell(mode,q,k,n,pre){
    if(mode==='causal')return k<=q?1:0;
    if(mode==='bidir')return 1;
    if(mode==='prefix')return (k<=q||k<pre)?1:0;
    const h=n/2;                                  // encdec: 0..h-1 encoder input, h..n-1 decoder output
    if(q<h)return k<h?1:0;
    return k<h?2:(k<=q?1:0);
  }
  const CAP={causal:['Causal (decoder-only)','Row i is a query, column j a key. Query i reads keys 0 to i: 78 of 144 cells. The model can be trained on every position at once and its past keys never change, so they can be cached.'],
    bidir:['Bidirectional (encoder)','Every query reads every key: 144 of 144 cells. Best representation of each token, but adding a token changes every row, so there is nothing to cache and nothing to generate with.'],
    prefix:['Prefix LM, prefix of 5','The first 5 tokens (the prompt) read each other both ways; later tokens are causal but read the whole prompt. Only the continuation is scored.'],
    encdec:['Encoder-decoder (as one fused matrix)','Rows 0 to 5: the encoder over the input, bidirectional. Rows 6 to 11: the decoder over the output: causal over its own tokens (blue) and full cross-attention to every encoder token (purple). T5Gemma 2 fuses the two decoder attentions this way.']};
  let mode='causal';
  function drawMask(){
    const el=document.getElementById('fo-mk-svg'),W=Math.min(FO.W(el),560),n=12;
    const lab=W<440?62:86,cs=Math.max(14,Math.floor((W-lab-8)/n)),H=lab+cs*n+4;let b='';
    for(let k=0;k<n;k++)b+='<g transform="translate('+(lab+k*cs+cs/2+3)+','+(lab-4)+') rotate(-60)">'+t(0,0,esc(P[k].trim()||'␣'),{fs:11})+'</g>';
    for(let q=0;q<n;q++){b+=t(lab-4,lab+q*cs+cs*0.7,esc(P[q].trim()||'␣'),{a:'end',fs:11});
      for(let k=0;k<n;k++){const c=cell(mode,q,k,n,5);
        b+='<rect x="'+(lab+k*cs)+'" y="'+(lab+q*cs)+'" width="'+(cs-1)+'" height="'+(cs-1)+'" rx="2" fill="'+(c===2?'var(--c4)':c?'var(--acc)':'var(--soft)')+'" opacity="'+(c?0.85:1)+'"/>'}}
    if(mode==='encdec'||mode==='prefix'){const s=mode==='prefix'?5:6;
      b+='<line x1="'+(lab+s*cs-1)+'" y1="'+lab+'" x2="'+(lab+s*cs-1)+'" y2="'+(lab+n*cs)+'" stroke="var(--bad)" stroke-width="1.5" stroke-dasharray="3 2"/>';
      b+='<line x1="'+lab+'" y1="'+(lab+s*cs-1)+'" x2="'+(lab+n*cs)+'" y2="'+(lab+s*cs-1)+'" stroke="var(--bad)" stroke-width="1.5" stroke-dasharray="3 2"/>'}
    el.innerHTML=RD.svg(lab+n*cs+4,H,b,'attention mask '+mode);
    const c=CAP[mode];document.getElementById('fo-mk-cap').innerHTML='<div class="t">'+c[0]+'</div><p>'+c[1]+'</p>';
  }
  RD.seg(document.getElementById('fo-mk-seg'),m=>{mode=m;drawMask()});
  RD.onRender(drawMask);RD.onResize(drawMask);drawMask();

  // 2. the leak: training curve step by step, then the generation -----------------------------------
  const L=D.masks.leak,cur=L.curve,ref=D.masks.swap.causal.held_out;
  function drawLeak(i){
    const el=document.getElementById('fo-lk-svg'),W=Math.min(FO.W(el),720),H=190,l=40,r=10,tp=10,bt=28;
    const X=s=>l+(W-l-r)*s/150,Y=v=>tp+(H-tp-bt)*(1-v/4.5);let b='';
    for(const v of [0,1,2,3,4]){b+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+t(l-5,Y(v)+4,v,{a:'end'})}
    for(const s of [0,50,100,150])b+=t(X(s),H-12,s,{a:'middle'});
    b+=t(W-r,H-1,'fine-tuning step (bidirectional mask, next-token loss)',{a:'end',fs:11,fill:'var(--mute)'});
    b+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(ref)+'" y2="'+Y(ref)+'" stroke="var(--good)" stroke-dasharray="4 3"/>'+t(W-r,Y(ref)-4,'honest causal model '+ref.toFixed(3),{a:'end',fill:'var(--good)'});
    const pts=cur.slice(0,i+1).map(p=>X(p[0])+','+Y(p[1])).join(' ');
    b+='<polyline points="'+pts+'" fill="none" stroke="var(--bad)" stroke-width="2"/>';
    const p=cur[i];b+='<circle cx="'+X(p[0])+'" cy="'+Y(p[1])+'" r="4" fill="var(--bad)"/>';
    el.innerHTML=RD.svg(W,H,b,'leak training curve');
    const last=i===cur.length-1;
    document.getElementById('fo-lk-cap').innerHTML='<div class="t">'+(i===0?'Step 0: the honest checkpoint, with the mask switched':'Step '+p[0]+(last?': done':''))+'</div><p>'+
      (i===0?'Before any training under the leaky mask the loss is '+p[1].toFixed(2)+': the causal model does not know how to use the future yet.':
       p[1]>2.3?'The loss falls slowly at first: the model is still mostly predicting from the past.':
       p[1]>0.6?'The loss drops below the honest model: one head has started reading position i+1, the answer.':
       'Training loss '+p[1].toFixed(2)+'. Held-out under the leaky mask: '+L.held_out_bidir.toFixed(3)+'; under the causal mask that generation must use: '+L.held_out_causal.toFixed(2)+'.')+'</p>';
    document.getElementById('fo-lk-cnt').innerHTML=RD.stat('train loss',p[1].toFixed(3),'step '+p[0])+
      RD.stat('layer-1 attention on i+1',(last?L.attn_next[0]:D.masks.swap.attn_next_causal_model[0]).toFixed(3),last?'after':'before (same mask)')+
      RD.stat('held-out, causal mask',last?L.held_out_causal.toFixed(2):ref.toFixed(3),last?'leak model':'reference');
  }
  FO.anim({card:'fo-lk-card',ctl:'fo-lk-ctl',n:cur.length,draw:drawLeak,ms:260,label:'Leak training step'});
  const g=L.generations;document.getElementById('fo-lk-gen').textContent='Prompt: '+L.prompt+'\n\nreference, causal mask:\n  '+g['reference, causal mask'].trim()+
    '\nleak model, bidirectional mask:\n  '+g['leak model, bidirectional mask'].trim()+'\nleak model, causal mask:\n  '+g['leak model, causal mask'].trim();

  // 3. MTP designs -----------------------------------------------------------------------------------
  let md='par';
  function drawMD(){
    const el=document.getElementById('fo-md-svg');
    const bx=(txt,sub,c)=>'<div style="--sc:'+c+'"><b>'+txt+'</b>'+(sub?'<i>'+sub+'</i>':'')+'</div>',ar='<span>&#8594;</span>';
    const main=bx('tokens 0 to i','the context','var(--line)')+ar+bx('main model','6 blocks; its own head predicts t i+1','var(--acc)')+ar+bx('h i','last hidden state','var(--acc)')+ar;
    el.innerHTML='<div class="fo-pipe">'+main+(md==='par'?bx('one extra block','sees h i only; must guess t i+1 implicitly','var(--c2)')+ar+bx('shared head','predicts t i+2','var(--c2)'):
      bx('+ Emb(t i+1)','the known next token','var(--c4)')+ar+bx('RMSNorm both, concat, M','2d to d (eh_proj)','var(--c2)')+ar+bx('TRM block','one block of the main shape','var(--c2)')+ar+bx('shared head','predicts t i+2','var(--c2)'))+'</div>';
    const h=D.mtpf.held_out;
    document.getElementById('fo-md-cap').innerHTML=md==='par'?'<div class="t">Parallel head (Gloeckle et al.)</div><p>An extra block on the trunk\'s state at i predicts t i+2 directly. Cheap and parallel, but it has to guess t i+1 implicitly. On the frozen tiny GPT: top-1 at t+2 '+FO.fmt(h.parallel.top1,'pct')+' (<span class="meas">measured</span>).</p>':
      '<div class="t">Sequential module (DeepSeek-V3, depth 1)</div><p>The module is told the real t i+1 (its embedding), so it predicts one step past a known token, keeping the causal chain. On the frozen tiny GPT: top-1 at t+2 '+FO.fmt(h.sequential.top1,'pct')+', against the main model\'s next-token '+FO.fmt(h.main_next.top1,'pct')+' (<span class="meas">measured</span>).</p>';
  }
  RD.seg(document.getElementById('fo-md-seg'),m=>{md=m;drawMD()});RD.onRender(drawMD);RD.onResize(drawMD);drawMD();

  // 4. joint training: main-model held-out loss against tokens or training FLOPs -----------------------------------
  const J=D.mtpj,F=D.d.mtp_flops;
  const series=[['ref','baseline, seed 0 (reference)','var(--acc)',F.main],['joint','with MTP, seed 0','var(--c2)',F.main+F.mtp],
    ['base_s1','baseline, seed 1','var(--c6)',F.main],['joint_s1','with MTP, seed 1','var(--c5)',F.main+F.mtp],['base_1980','baseline, 1,980 steps (equal FLOPs)','var(--c3)',F.main]].filter(s=>J[s[0]]);
  let jx='tok';
  const jcard=document.getElementById('fo-jt-card');
  const jseg=document.createElement('div');jseg.className='fo-seg';jseg.innerHTML='<button data-m="tok" class="on">x: training tokens</button><button data-m="flop">x: training FLOPs</button>';
  jcard.insertBefore(jseg,document.getElementById('fo-jt-svg'));
  function drawJ(){
    const el=document.getElementById('fo-jt-svg'),W=Math.min(FO.W(el),720),H=230,l=44,r=10,tp=10,bt=30;
    const xv=(s,e)=>jx==='tok'?e[0]*8192/1e6:e[0]*8192*s[3]*3/256/1e15;
    let xmax=0;series.forEach(s=>J[s[0]].eval.forEach(e=>{xmax=Math.max(xmax,xv(s,e))}));
    const y0=2.2,y1=3.0,X=v=>l+(W-l-r)*v/xmax,Y=v=>tp+(H-tp-bt)*(1-(Math.min(Math.max(v,y0),y1)-y0)/(y1-y0));let b='';
    for(let v=2.2;v<=3.001;v+=0.2){b+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+t(l-5,Y(v)+4,v.toFixed(1),{a:'end'})}
    const nt=W<500?3:5;for(let i=0;i<=nt;i++){const v=xmax*i/nt;b+=t(X(v),H-14,jx==='tok'?v.toFixed(0)+'M':v.toFixed(2),{a:'middle'})}
    b+=t(W-r,H-1,jx==='tok'?'training tokens (millions)':'training FLOPs (PFLOP, derived)',{a:'end',fs:11,fill:'var(--mute)'});
    series.forEach(s=>{const pts=J[s[0]].eval.filter(e=>e[1]<=3.2).map(e=>X(xv(s,e))+','+Y(e[1])).join(' ');b+='<polyline points="'+pts+'" fill="none" stroke="'+s[2]+'" stroke-width="2"/>'});
    el.innerHTML=RD.svg(W,H,b,'held-out loss of the main model')+'<div class="fo-leg">'+series.map(s=>'<span style="--sw:'+s[2]+'">'+s[1]+': '+J[s[0]].final.toFixed(4)+'</span>').join('')+'</div>';
    document.getElementById('fo-jt-cap').innerHTML=jx==='tok'?'<p>At equal tokens the MTP runs end lower. Switch the axis to training FLOPs: each MTP step costs '+FO.fmt(1+D.d.mtp_extra_flops,'2')+'x a baseline step, so the MTP curves stretch to the right.</p>':
      '<p>At equal training FLOPs the fair control is the baseline trained for 1,980 steps (green), which spends the same compute as the 1,500-step MTP run on more tokens. FLOPs are derived from the tiny GPT\'s counts (Block lab), training taken as 3x forward.</p>';
  }
  RD.seg(jseg,m=>{jx=m;drawJ()});RD.onRender(drawJ);RD.onResize(drawJ);drawJ();

  // 5. tables ---------------------------------------------------------------------------------------
  const tb=(id,rows)=>{const e=document.querySelector('#'+id+' tbody');if(e)e.innerHTML=rows.map(r=>'<tr>'+r.map((c,i)=>'<td'+(i?' class="num"':'')+'>'+c+'</td>').join('')+'</tr>').join('')};
  const pc=v=>FO.fmt(v,'pct');
  tb('fo-fill-tab',Object.keys(D.diff.fill_in).map(k=>{const f=D.diff.fill_in[k];return [k.slice(1)+'%',f.n_masked.toLocaleString('en-US'),f.diffusion_loss.toFixed(3),pc(f.diffusion_top1),f.causal_loss.toFixed(3),pc(f.causal_top1)]}));
  const bill=D.calc.dsv3.bill,tot=D.calc.dsv3.mtp;
  tb('fo-mtpbill',bill.map(r=>[r[0],r[1].toLocaleString('en-US'),pc(r[1]/tot)]).concat([['<b>total MTP layer</b>','<b>'+tot.toLocaleString('en-US')+'</b>','100%']]));
  tb('fo-dsab',D.dsab.rows.map(r=>[r[0]+' <span class="mute">('+r[1]+')</span>'].concat(r[2])));
  const h=D.mtpf.held_out,pp=D.mtpf.params;
  const mrows=[['main model, next token',D.mtpf.main_params.toLocaleString('en-US'),h.main_next.loss.toFixed(3),pc(h.main_next.top1),'(it is the reference)'],
    ['sequential module, t+2',pp.sequential.toLocaleString('en-US'),h.sequential.loss.toFixed(3),pc(h.sequential.top1),pc(h.sequential_accept.top1)],
    ['parallel head, t+2',pp.parallel.toLocaleString('en-US'),h.parallel.loss.toFixed(3),pc(h.parallel.top1),pc(h.parallel_accept.top1)]];
  if(D.mtpf.held_out_joint){const j=D.mtpf.held_out_joint;mrows.push(['module trained jointly (seed 0), t+2',pp.sequential.toLocaleString('en-US'),j.joint.loss.toFixed(3),pc(j.joint.top1),pc(j.joint_accept.top1)])}
  tb('fo-mf-tab',mrows);
  const S=D.diff.summary,NM={ar_greedy:'causal model, greedy (KV cache)','ar_t0.8':'causal model, sampled T 0.8',diff_48_low:'diffusion, 48 steps',diff_24_low:'diffusion, 24 steps',diff_12_low:'diffusion, 12 steps',diff_6_low:'diffusion, 6 steps',diff_3_low:'diffusion, 3 steps',diff_48_random:'diffusion, 48 steps, random order',diff_12_random:'diffusion, 12 steps, random order'};
  tb('fo-dq-tab',Object.keys(NM).filter(k=>S[k]).map(k=>[NM[k],S[k].forwards,S[k].tokens_per_forward,S[k].judge_loss.toFixed(3),FO.fmt(S[k].distinct2,'pct0')]));
})();
