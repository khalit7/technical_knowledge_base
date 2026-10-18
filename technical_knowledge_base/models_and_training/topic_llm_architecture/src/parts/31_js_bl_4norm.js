// Block lab section 5: pre-norm against post-norm on the same token (before/after animation of the residual-stream
// norm through the 12 sub-layers), the measured loss curves at several learning rates, and gradient norms by block.
(function(){
  const B=window.BL;if(!B||!B.$('bl-nm'))return;
  const D=B.D,$=B.$,N=D.norms;
  let when='trained',which='token',anim=null,ready=false;
  const LBL=N.pre?N.pre.labels:[];
  const nice=l=>l==='embed'?'embedding':'block '+l.slice(1,2)+' '+(l.endsWith('attn')?'attention':'FFN');
  function series(k){const n=N[k+(when==='init'?'_init':'')];if(!n)return null;return {s:which==='token'?n.stream_token:n.stream_median,b:which==='token'?n.branch_token:n.branch_median,run:n.run}}
  function draw(i){if(!ready)return;
    const pre=series('pre'),post=series('post');if(!pre||!post)return;
    const el=$('bl-nm-svg'),w=B.W(el),H=210,ml=36,mr=6,mt=10,mb=34,pw=w-ml-mr,ph=H-mt-mb,n=LBL.length;
    const mx=Math.max(...pre.s,...post.s)*1.08,Y=v=>mt+ph*(1-v/mx),bw=pw/n;
    let g='';const step=mx>40?20:mx>8?4:mx>2?0.5:0.25;
    for(let v=0;v<=mx;v+=step)g+='<line x1="'+ml+'" x2="'+(ml+pw)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/><text x="'+(ml-4)+'" y="'+(Y(v)+4)+'" font-size="11" text-anchor="end" fill="var(--mute)">'+(+v.toFixed(2))+'</text>';
    for(let k=0;k<n;k++){const x=ml+k*bw,on=k<=i;
      [[pre,'--c1',0],[post,'--c2',1]].forEach(([q,c,o])=>{const v=q.s[k];
        g+='<rect x="'+(x+bw*0.12+o*bw*0.38).toFixed(1)+'" y="'+Y(v).toFixed(1)+'" width="'+(bw*0.36).toFixed(1)+'" height="'+(Y(0)-Y(v)).toFixed(1)+'" fill="var('+c+')" fill-opacity="'+(on?0.85:0.12)+'"/>'});
      const lb=k===0?'emb':(w<520?(k%2?LBL[k].slice(1,2):''):LBL[k].slice(1).replace('attn','a').replace('ffn','f'));
      if(lb)g+='<text x="'+(x+bw/2)+'" y="'+(H-mb+13)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+lb+'</text>'}
    g+='<text x="'+(ml+pw/2)+'" y="'+(H-3)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+(w<520?'block (a then f)':'after each sub-layer: block number, a = attention, f = FFN')+'</text>';
    g+='<rect x="'+(ml+bw*i)+'" y="'+mt+'" width="'+bw+'" height="'+ph+'" fill="none" stroke="var(--ink)" stroke-dasharray="3 3"/>';
    el.innerHTML='<svg viewBox="0 0 '+w+' '+H+'" width="'+w+'" height="'+H+'" role="img" aria-label="Residual stream norm by sub-layer, pre-norm against post-norm">'+g+'</svg>';
    const where=nice(LBL[i]);
    const ps=pre.s[i],qs=post.s[i];
    let cap='<b>'+where[0].toUpperCase()+where.slice(1)+'.</b> ';
    if(i===0)cap+='Both models start from the embedding: norm '+ps.toFixed(2)+' (pre) and '+qs.toFixed(2)+' (post).';
    else cap+='Pre-norm adds a branch of norm '+pre.b[i-1].toFixed(2)+' to the stream and nothing rescales it: '+pre.s[i-1].toFixed(2)+' becomes '+ps.toFixed(2)+'. Post-norm adds a branch of norm '+post.b[i-1].toFixed(2)+' and then normalises the sum, so the stream returns to '+qs.toFixed(2)+(when==='init'?' (√256 = 16 times the gain, which starts at 1)':'')+'.';
    if(i===n-1)cap+=' After the last block pre-norm needs the final norm (ln_f) to bring the stream back to a fixed scale before the LM head; post-norm ends normalised and has none.';
    $('bl-nm-cap').innerHTML=cap;
    $('bl-nm-who').textContent=(which==='token'?'token "'+D.trace.piece+'" at position '+D.trace.pos:'median over the 256 tokens')+'; '+(when==='init'?'initialisation (seed 0)':'trained models: pre '+pre.run+', post '+post.run);
  }
  // loss curves
  function curves(){const el=$('bl-lc-svg');if(!el)return;const w=B.W(el),H=230,ml=34,mr=8,mt=8,mb=30,pw=w-ml-mr,ph=H-mt-mb;
    const sel=$('bl-lc-pick').querySelector('button.on');const keys=(sel?sel.dataset.m:'').split(',').filter(k=>D.runs[k]);
    const ymax=8.5,ymin=1.5,X=s=>ml+s/1500*pw,Y=v=>mt+ph*(1-(Math.min(ymax,v)-ymin)/(ymax-ymin));
    let g='';for(let v=2;v<=8;v+=1)g+='<line x1="'+ml+'" x2="'+(ml+pw)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/><text x="'+(ml-4)+'" y="'+(Y(v)+4)+'" font-size="11" text-anchor="end" fill="var(--mute)">'+v+'</text>';
    [0,500,1000,1500].forEach(s=>g+='<text x="'+X(s)+'" y="'+(H-14)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+s+'</text>');
    g+='<text x="'+(ml+pw/2)+'" y="'+(H-1)+'" font-size="11" text-anchor="middle" fill="var(--mute)">training step (8,192 tokens each)</text>';
    const u=D.uni.val_cross_entropy_under_train_unigram_nats;g+='<line x1="'+ml+'" x2="'+(ml+pw)+'" y1="'+Y(u)+'" y2="'+Y(u)+'" stroke="var(--bad)" stroke-dasharray="5 4"/><text x="'+(ml+pw-2)+'" y="'+(Y(u)-4)+'" font-size="11" text-anchor="end" fill="var(--bad)">unigram: '+u.toFixed(2)+'</text>';
    let leg='';
    keys.forEach(k=>{const r=D.runs[k];const c=r.norm_pos==='post'?(r.warmup>100?'--c4':'--c2'):'--c1';
      g+='<polyline points="'+r.train.map(p=>X(p[0]).toFixed(1)+','+Y(p[1]).toFixed(1)).join(' ')+'" fill="none" stroke="var('+c+')" stroke-opacity=".35"/>';
      g+='<polyline points="'+r.eval.map(p=>X(p[0]).toFixed(1)+','+Y(p[1]).toFixed(1)).join(' ')+'" fill="none" stroke="var('+c+')" stroke-width="2"/>';
      leg+='<div><i style="background:var('+c+')"></i><span class="n">'+(r.norm_pos==='post'?'post-norm':'pre-norm')+', lr '+r.lr+(r.warmup!==100?', warmup '+r.warmup:'')+'</span><span class="v">held-out '+r.final_val_loss.toFixed(3)+'</span></div>'});
    el.innerHTML='<svg viewBox="0 0 '+w+' '+H+'" width="'+w+'" height="'+H+'" role="img" aria-label="Loss curves">'+g+'</svg>';
    $('bl-lc-leg').innerHTML=leg;
  }
  // gradient norm by block (log scale)
  function grads(){const el=$('bl-gn-svg');if(!el)return;const runs=D.grad.runs;const keys=Object.keys(runs);if(!keys.length)return;
    const w=B.W(el),H=210,ml=44,mr=8,mt=8,mb=30,pw=w-ml-mr,ph=H-mt-mb;
    const sel=$('bl-gn-pick').querySelector('button.on');const st=sel?sel.dataset.m:'init';
    let lo=1e9,hi=0;keys.filter(k=>st==='trained'||k===D.pair.pre||k===D.pair.post).forEach(k=>runs[k][st].per_block.forEach(v=>{if(v>0){lo=Math.min(lo,v);hi=Math.max(hi,v)}}));
    const a=Math.floor(Math.log10(lo)),b=Math.ceil(Math.log10(hi));const Y=v=>mt+ph*(1-(Math.log10(Math.max(v,Math.pow(10,a)))-a)/(b-a||1));
    const nb=runs[keys[0]][st].per_block.length,X=k=>ml+(k+0.5)/nb*pw;
    let g='';for(let e=a;e<=b;e++)g+='<line x1="'+ml+'" x2="'+(ml+pw)+'" y1="'+Y(Math.pow(10,e))+'" y2="'+Y(Math.pow(10,e))+'" stroke="var(--line)"/><text x="'+(ml-4)+'" y="'+(Y(Math.pow(10,e))+4)+'" font-size="11" text-anchor="end" fill="var(--mute)">1e'+e+'</text>';
    for(let k=0;k<nb;k++)g+='<text x="'+X(k)+'" y="'+(H-14)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+(k+1)+'</text>';
    g+='<text x="'+(ml+pw/2)+'" y="'+(H-1)+'" font-size="11" text-anchor="middle" fill="var(--mute)">block (1 = next to the embedding)</text>';
    let leg='';
    const COL={};COL[D.pair.pre]='--c1';COL[D.pair.post]='--c2';
    const extra=['--c4','--c5','--c6'];let ei=0;keys.forEach(k=>{if(!COL[k])COL[k]=extra[ei++%3]});
    keys.filter(k=>st==='trained'||k===D.pair.pre||k===D.pair.post).forEach(k=>{const r=runs[k],v=r[st].per_block;const rr=D.runs[k]||{};const post=r.norm_pos==='post';const c=COL[k];
      g+='<polyline points="'+v.map((x,i)=>X(i).toFixed(1)+','+Y(x).toFixed(1)).join(' ')+'" fill="none" stroke="var('+c+')" stroke-width="2"/>'+v.map((x,i)=>'<circle cx="'+X(i).toFixed(1)+'" cy="'+Y(x).toFixed(1)+'" r="3" fill="var('+c+')"/>').join('');
      leg+='<div><i style="background:var('+c+')"></i><span class="n">'+(post?'post-norm':'pre-norm')+(st==='init'?', initial weights (seed 0)':', lr '+rr.lr+(rr.warmup!==100?', warmup '+rr.warmup:'')+' (held-out '+rr.final_val_loss.toFixed(2)+')')+'</span><span class="v">block 1 / block '+nb+': '+(v[0]/v[nb-1]).toPrecision(2)+'</span></div>'});
    el.innerHTML='<svg viewBox="0 0 '+w+' '+H+'" width="'+w+'" height="'+H+'" role="img" aria-label="Gradient norm by block">'+g+'</svg>';
    $('bl-gn-leg').innerHTML=leg;
  }
  function build(){if(ready)return;ready=true;
    B.seg($('bl-nm-when'),m=>{when=m;anim.redraw()});B.seg($('bl-nm-which'),m=>{which=m;anim.redraw()});
    B.seg($('bl-lc-pick'),curves);B.seg($('bl-gn-pick'),grads);
    anim=window.RD.anim({card:'bl-nm',ctl:'bl-nm-ctl',n:LBL.length,draw,ms:1500,label:'Sub-layer'});
  }
  B.onRender(()=>{build();anim.redraw();curves();grads()});
  B.onResize(()=>{if(anim)anim.redraw();curves();grads()});
})();
