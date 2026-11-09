// ---- Reading tab visuals: the hero, the leak's real output, the joint-training chart, tables (the masks, the leak and the MTP designs are 3D stages) ----
(function(){
  if(!window.FOD||!document.getElementById('fo-hero'))return;
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

  // 1. the mask matrices are the 3D stage Fig. 2 (41_js_sc_mask.js) since 2026-11-09

  // 2. the leak: training curve step by step, then the generation -----------------------------------
  // the leak itself is the 3D stage Fig. 4 (42_js_sc_leak.js); the real output stays here
  const L=D.masks.leak;
  const g=L.generations;document.getElementById('fo-lk-gen').textContent='Prompt: '+L.prompt+'\n\nreference, causal mask:\n  '+g['reference, causal mask'].trim()+
    '\nleak model, bidirectional mask:\n  '+g['leak model, bidirectional mask'].trim()+'\nleak model, causal mask:\n  '+g['leak model, causal mask'].trim();

  // 3. the two MTP designs are the 3D stage Fig. 6 (44_js_sc_mtp.js) since 2026-11-09

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
    const nt=W<500?3:5;for(let i=0;i<=nt;i++){const v=xmax*i/nt;b+=t(X(v),H-14,jx==='tok'?v.toFixed(0)+'M':v.toFixed(2),{a:i===nt?'end':'middle'})}
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
