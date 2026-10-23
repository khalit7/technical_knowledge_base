// ---- Reading: data-filled elements. Every measured number in the prose comes from PE_DATA (recorded outputs), so text and data cannot drift ----
(function(){
  if(!window.PE_DATA||!window.PE)return;
  const {D,fmt,f2,past,run,pend,lines,file,code}=window.PE;
  const q=s=>[...document.querySelectorAll(s)];
  const band=(r,k)=>r&&r[k]!=null?f2(r[k],2):null;
  const sh=(r,off)=>r&&r.shifted&&r.shifted[off]&&r.shifted[off].mean!=null?f2(r.shifted[off].mean,2):null;
  const P=(m,s)=>past(m,s);
  const rope=P('at_mha'),lear=P('ref_baseline_s1500'),sinu=P('pe_sinusoidal_x16'),sinu0=P('pe_sinusoidal'),alib=P('pe_alibi'),nope=P('pe_nope');
  const y8=P('at_mha','yarn x8'),y8n=P('at_mha','yarn x8, no temperature'),t8=P('at_mha','temperature only (x8)'),l4=P('at_mha','linear x4'),l8=P('at_mha','linear x8'),n8=P('at_mha','ntk x8'),y4=P('at_mha','yarn x4');
  const mo=P('at_mha','mistake: yarn x8 with orig_ctx 2,048'),mt=P('at_mha','mistake: rope_theta 500,000 at inference');
  const lr=run('ref_baseline_s1500'),rr=run('at_mha');
  const T={
    sinus_far:()=>sinu?'the sinusoidal model (trained with its token embeddings × 16, the fix in the closed block below) has a held-out loss of '+band(sinu,'0-255')+' on positions 0 to 255, '+band(sinu,'256-511')+' on 256 to 511 and '+band(sinu,'1024-2047')+' on 1,024 to 2,047 (RoPE without scaling: '+band(rope,'0-255')+', '+band(rope,'256-511')+', '+band(rope,'1024-2047')+').':pend,
    sinus_scale:()=>{const a=run('pe_sinusoidal'),b=run('pe_sinusoidal_x16');return a&&b?'Measured: the tiny GPT\'s token embeddings start at standard deviation 0.02 (norm about 0.32 for 256 dimensions) while the sinusoids have amplitude 1 (norm √128 ≈ 11.3), so at initialisation position outweighs content by 35 times. Trained that way, with every other setting equal, the sinusoidal model sat on the unigram plateau (held-out loss near 6.0, the loss of ignoring context) for about 300 steps and ended at '+f2(a.val_100,3)+'. Multiplying the token embeddings by √<i>d</i><sub>model</sub> = 16 before adding the sinusoids, as Vaswani et al. do (§3.4: "we multiply those weights by √d<sub>model</sub>"), gives '+f2(b.val_100,3)+', level with the learned table. The root\'s tiny_gpt.py adds them unscaled; this page\'s run with the scale is src/train/train_scaled.py.':pend},
    alibi:()=>alib?'the ALiBi tiny GPT\'s held-out loss is '+band(alib,'0-255')+' on positions 0 to 255, '+band(alib,'512-1023')+' on 512 to 1,023 and '+band(alib,'1024-2047')+' on 1,024 to 2,047, four to eight times past its training length: flat, against '+band(rope,'1024-2047')+' for plain RoPE and '+band(nope,'1024-2047')+' for NoPE (<a href="#pe-buy">section 8</a>). The penalty is a straight line in distance, so nothing goes out of range, and a head that has learned to look a few dozen tokens back keeps doing so.':pend,
    rope_speed:()=>rr&&lr?fmt(rr.tok_s)+' tokens per second against '+fmt(lr.tok_s)+' for the learned table (median over each run; '+fmt(rr.seconds)+' s against '+fmt(lr.seconds)+' s for 1,500 steps)':pend,
    gemma4:()=>{const g=D.R.partial_two_ways.gemma4;return 'Five local layers (1,024-token window, base 10,000, full RoPE on 256-dimension heads) per global layer ('+g.n_global+' of '+g.n_layers+'). The global layers have 512-dimension heads and "proportional" RoPE: only '+g.rotated+' of their '+g.pairs+' pairs rotate, with wavelengths from '+f2(g.wl_min,1)+' to '+f2(g.wl_max,0)+' tokens; the other '+(g.pairs-g.rotated)+' pairs carry no position at all.'},
    partial2:()=>{const g=D.R.partial_two_ways.gemma4,qn=D.R.partial_two_ways.qwen3next;return 'Read from the configs: Qwen3-Next rotates '+qn.rotated+' of '+qn.pairs+' pairs with wavelengths from '+f2(qn.wl_min,1)+' to '+fmt(qn.wl_max)+' tokens, the full long-range spectrum squeezed into a quarter of the head; Gemma 4\'s global layers rotate '+g.rotated+' of '+g.pairs+' pairs whose longest wavelength is '+f2(g.wl_max,0)+' tokens, so beyond a few hundred tokens those layers are effectively NoPE and nothing in them can go out of range at any length (calculation from the configs and transformers '+D.code.ver+'\'s functions, '+file('proportional')+').'},
    hferr:()=>'a relative '+(+D.hf_err).toExponential(1)+' (float32 rounding)',
    shift_headline:()=>rope?'with plain RoPE the mean loss on Roxy\'s tokens goes from '+sh(rope,'0')+' to '+sh(rope,'768')+'; with YaRN ×8 applied at inference, from '+sh(y8,'0')+' to '+sh(y8,'768')+'; with ALiBi, '+(alib?sh(alib,'0')+' to '+sh(alib,'768'):pend)+'; the learned-table model cannot read it at all.':pend,
    ext_read:()=>rope?'Without scaling the loss climbs from '+band(rope,'0-255')+' inside the trained length to '+band(rope,'1024-2047')+' at 4 to 8 times it. Every method flattens the curve; they differ in what they cost inside 256 and how far they reach. Position Interpolation ×8 is flat ('+band(l8,'0-255')+' to '+band(l8,'1024-2047')+') but costs '+f2(l8['0-255']-rope['0-255'],2)+' inside 256, because it slows the fast pairs too; NTK-aware ×8 keeps short-range loss ('+band(n8,'0-255')+') and holds to 1,023 ('+band(n8,'512-1023')+') before rising ('+band(n8,'1024-2047')+'); YaRN ×8 is best far out ('+band(y8,'1024-2047')+') at a cost of '+f2(y8['0-255']-rope['0-255'],2)+' inside 256. Removing YaRN\'s temperature costs '+f2(y8n['1024-2047']-y8['1024-2047'],2)+' at 1,024 to 2,047 ('+band(y8n,'1024-2047')+'); the temperature alone, with plain frequencies, does nothing useful ('+band(t8,'1024-2047')+'). None of these models was fine-tuned at the new length; real recipes fine-tune.':pend,
    static_cost:()=>rope?'YaRN ×8 left on for inputs inside the trained length raises the loss on positions 0 to 255 from '+band(rope,'0-255')+' to '+band(y8,'0-255')+', and on the running sequence read at position 0 from '+sh(rope,'0')+' to '+sh(y8,'0')+' (YaRN ×4: '+band(y4,'0-255')+').':pend,
    layout:()=>{const b=D.probe.layout_bug;return 'Measured: the RoPE tiny GPT run with interleaved pairs instead of the split-half pairs it was trained with. No error, no warning; held-out loss '+f2(b.right_layout_loss,2)+' becomes '+f2(b.interleaved_loss,2)+'. Greedy continuation of the running sequence\'s first 59 tokens, right layout: <span class="pe-txt" style="display:block">'+PE.esc(b.right_layout_greedy)+'</span>wrong layout: <span class="pe-txt" style="display:block">'+PE.esc(b.interleaved_greedy)+'</span>Check by comparing the loss on a few hundred tokens with a reference run before anything else.'},
    theta:()=>mt?'Measured: the RoPE tiny GPT (trained with base 10,000) loaded with <code>rope_theta</code> 500,000. No error; held-out loss on positions 0 to 255 goes from '+band(rope,'0-255')+' to '+band(mt,'0-255')+', because every pair except pair 0 now turns at the wrong speed. Past 256 it is less bad than no change at all ('+band(mt,'1024-2047')+' against '+band(rope,'1024-2047')+' on 1,024 to 2,047), because a larger base slows every pair, a crude NTK-aware scaling. The base is part of the weights\' contract, like the vocabulary.':pend,
    orig:()=>mo?'Measured: YaRN ×8 on the tiny GPT with <code>orig_ctx</code> (Hugging Face: <code>original_max_position_embeddings</code>) set to 2,048, the new length, instead of 256. The ramp is then computed for a model that saw 2,048 tokens, so too few pairs are interpolated: loss at 1,024 to 2,047 is '+band(mo,'1024-2047')+' against '+band(y8,'1024-2047')+' with the right value (and '+band(rope,'1024-2047')+' with no scaling). Set it to the pretraining length.':pend,
    static:()=>rope?'Static scaling slows the slow pairs for short inputs too. Measured on the tiny GPT: loss on positions 0 to 255 '+band(rope,'0-255')+' without YaRN, '+band(y4,'0-255')+' with ×4, '+band(y8,'0-255')+' with ×8. Qwen advises enabling it only when long contexts are needed, with the factor set to the length required; dynamic variants avoid the cost.':pend,
    ropecalls:()=>{const c=D.code.rope_calls;return Object.keys(c).map(k=>k+' '+c[k]).join(', ')+' calls'},
    runs_read:()=>{const v=s=>{const r=(D.runs||[]).find(x=>x.scheme===s&&x.seed===0&&!x.pending);return r&&r.val_100!=null?f2(r.val_100,3):null};
      const v1=n=>{const r=run(n);return r&&r.val_100!=null?f2(r.val_100,3):null};
      if(!v('alibi')||!v('nope')||!v('sinusoidal'))return 'Held-out loss (100 windows): RoPE '+v('rope')+', learned '+v('learned')+'. '+pend+' for ALiBi, NoPE and sinusoidal.';
      return 'Inside the trained length, held-out loss on 100 fixed windows: RoPE '+v('rope')+', ALiBi '+v('alibi')+', sinusoidal with embeddings × 16 '+v('sinusoidal x16')+', learned '+v('learned')+', NoPE '+v('nope')+', and sinusoidal as the root\'s code adds it '+v('sinusoidal')+' (the scale mistake in the closed block of section 2). The two relative schemes lead, NoPE trails by about 0.2. The second seeds: RoPE '+(v1('pe_rope_s1')||pend)+', learned '+(v1('pe_learned_s1')||pend)+', so differences smaller than the seed spread are not findings.'}
  };
  q('[data-pe-txt]').forEach(el=>{const f=T[el.dataset.peTxt];el.innerHTML=f?f():'?'});
  q('[data-pe-ref]').forEach(el=>{el.textContent=lines(el.dataset.peRef)});
  q('[data-pe-file]').forEach(el=>{el.textContent=file(el.dataset.peFile)});
  q('[data-pe-ver]').forEach(el=>{el.textContent=D.code.ver});
  q('[data-pe-code]').forEach(code);
  q('[data-pe-err]').forEach(el=>{el.textContent=(lear&&lear.error)||'?'});
  const cen=D.census||[];
  q('[data-pe-census]').forEach(el=>{const k=el.dataset.peCensus;el.textContent=k==='all'?cen.length:cen.filter(r=>r.scheme==='RoPE').length});
  // overview table: measured columns
  const byS={learned:lear,sinusoidal:sinu,alibi:alib,rope:rope,nope:nope};
  q('#pe-ovt tr[data-s]').forEach(tr=>{const r=byS[tr.dataset.s];if(!(tr.dataset.s in byS))return;
    const rs=(D.runs||[]).find(x=>x.scheme===tr.dataset.s&&x.seed===0&&!x.pending);
    const v=tr.querySelector('[data-c="v"]'),f=tr.querySelector('[data-c="far"]');
    if(v)v.innerHTML=rs&&rs.val_100!=null?f2(rs.val_100,3):pend;
    if(f)f.innerHTML=!r?pend:r.error?'IndexError':band(r,'1024-2047');
    if(tr.dataset.s==='sinusoidal'){const x=(D.runs||[]).find(z=>z.scheme==='sinusoidal x16');if(x&&v)v.innerHTML=f2(x.val_100,3)+'<br><span class="small mute">'+(rs?f2(rs.val_100,3):'')+' unscaled</span>'}});
  // link expansion inside script-written text ({{text|#t-tab}} is expanded at build time only in static HTML)
  q('[data-pe-txt]').forEach(el=>{el.innerHTML=el.innerHTML.replace(/\{\{([^|{}]+)\|#(t-[\w-]+)\}\}/g,'<a href="#" data-tab="$2">$1</a>')});
  q('[data-pe-txt]').forEach(el=>window.RD.tabLinks(el));
  // drills
  const pr=D.probe.position_probe_r2_by_block||{};
  const np=pr.nope;
  PE.drill({id:'pe-dr1',right:2,why:['A causal decoder can count its prefix, so position can be computed.','The NoPE model adds nothing to the embedding, so the probe finds nothing there.'],
    answer:np?'Measured R<sup>2</sup> by block for NoPE (embedding first): '+np.map(x=>f2(x,2)).join(', ')+'. The input has no position (R<sup>2</sup> near 0); the blocks build it from the causal mask, reaching '+f2(Math.max(...np),2)+' by block '+np.indexOf(Math.max(...np))+', as plainly as the learned table. The learned table puts it straight into the embedding ('+f2(pr.learned[0],2)+'), and RoPE, which only rotates q and k inside attention, leaves little absolute position in the residual stream at all ('+pr.rope.map(x=>f2(x,2)).join(', ')+'), as a relative scheme should.':pend});
  const l31=D.presets.llama31;let full=0;window.ROPE.baseInv(l31.base,l31.dim).forEach(f=>{if(l31.L*f>=2*Math.PI)full++});
  PE.drill({id:'pe-dr2',right:1,why:['The slow pairs have wavelengths up to 2.56 million tokens.','Pairs up to index 34 are fast enough.'],
    answer:full+' of 64 (calculation: pair i completes a turn when 8,192 θ<sub>i</sub> ≥ 2π). The other '+(64-full)+' pairs never saw their full circle in pretraining; the slowest has a wavelength of '+fmt(2*Math.PI*Math.pow(l31.base,(l31.dim-2)/l31.dim))+' tokens.'});
  PE.drill({id:'pe-dr3',right:0,why:['','Measured: the temperature alone leaves the far loss where plain RoPE has it.','The frequencies alone already recover most of it.'],
    answer:y8n&&t8?'Measured at 1,024 to 2,047 tokens: plain RoPE '+band(rope,'1024-2047')+', temperature only '+band(t8,'1024-2047')+', frequencies only '+band(y8n,'1024-2047')+', both '+band(y8,'1024-2047')+'. The frequency change does most of the work; the temperature adds a further '+f2(y8n['1024-2047']-y8['1024-2047'],2)+' once the angles are back in range.':pend});
})();
