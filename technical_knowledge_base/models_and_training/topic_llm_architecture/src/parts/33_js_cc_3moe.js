// Config calculator: the dense-vs-MoE stepper at equal active parameters (split from the retired 33_js_cc_3ctx.js on 2026-10-23;
// the context-length sweep of weights against cache moved to the Long context child, which owns whole-model KV sizing).
(function(){
  if(!window.CCS||!document.getElementById('cc-moecard'))return;
  const {S,$,esc,cnt,bytes,fl,ctxs,width,visible,anim,byKey}=CCS;
  // ---- dense vs MoE at equal active parameters ----
  function twins(sp){
    const moeL=sp.layers.some(l=>l.ffn&&l.ffn.t==='moe'),gluL=sp.layers.some(l=>l.ffn&&l.ffn.t==='glu');
    if(moeL){const dense=Object.assign({},sp,{layers:sp.layers.map(l=>l.ffn&&l.ffn.t==='moe'?Object.assign({},l,{ffn:{t:'glu',ff:l.ffn.k*l.ffn.ff+l.ffn.sff,bias:false}}):l)});
      const f=sp.layers.find(l=>l.ffn&&l.ffn.t==='moe').ffn;return {dense,moe:sp,E:f.E,k:f.k,made:'from'}}
    if(gluL){const moe=Object.assign({},sp,{layers:sp.layers.map(l=>l.ffn&&l.ffn.t==='glu'?Object.assign({},l,{ffn:{t:'moe',E:8,k:2,ff:l.ffn.ff/2,sff:0,sgate:false,rbias:false,cbias:false,ebias:false}}):l)});
      return {dense:sp,moe,E:8,k:2,made:'to'}}
    return null;
  }
  function rng(seed){let s=seed>>>0;return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}}
  function union(E,k,B){const r=rng(12345+E*7+k),hit=new Set();for(let b=0;b<B;b++){const ch=new Set();while(ch.size<k)ch.add(Math.floor(r()*E));ch.forEach(e=>hit.add(e))}return hit}
  const NS=6;
  function drawMoe(i){
    if(!S.spec)return;const T=twins(S.spec);const bars=$('cc-moebars'),grid=$('cc-moegrid'),cap=$('cc-moecap');
    if(!T){bars.innerHTML='';grid.innerHTML='';$('cc-gridlab').textContent='';cap.innerHTML='This model has no gated feed-forward blocks to turn into experts (a pure state-space model or GPT-2\'s plain MLP). Pick another model.';return}
    const pd=CC.params(T.dense),pm=CC.params(T.moe),wb=CCS.wb();
    const Bs=i>=5?64:i>=4?8:1;const frac=1-Math.pow(1-T.k/T.E,Bs);
    const routed=pm.breakdown.moe_routed,shown=i>=1?pm:pd;
    const readM=i>=1?(pm.total-routed+routed*(Bs===1?T.k/T.E:frac))*wb:pd.total*wb;
    const rows=[['Total parameters',pd.total,shown.total,cnt],['Active parameters per token',pd.active,shown.active,cnt],['FLOPs per token (weights)',2*pd.matmul_active,2*shown.matmul_active,fl],
      ['Weight memory',pd.total*wb,shown.total*wb,bytes],['Weights read per decode step, batch '+Bs,Math.min(pd.total,pd.total)*wb,readM,bytes]];
    let h='';rows.forEach(([nm,a,b,f],j)=>{const mx=Math.max(a,b);const hl=(i===1&&j<2)||(i===2&&j===2)||(i===3&&j===3)||(i>=4&&j===4);
      h+='<div class="bars"><div class="cc-mt'+(hl?' hl':'')+'">'+nm+'</div>'+
        '<div class="row"><span class="nm mute">dense twin</span><span class="track"><span class="fill" style="width:'+(100*a/mx).toFixed(1)+'%;background:var(--c1)"></span></span><span class="val">'+f(a)+'</span></div>'+
        '<div class="row"><span class="nm mute">'+(i>=1?'MoE':'MoE (k experts)')+'</span><span class="track"><span class="fill" style="width:'+(100*b/mx).toFixed(1)+'%;background:var(--c2)"></span></span><span class="val">'+f(b)+'</span></div></div>'});
    bars.innerHTML=h;
    const E=T.E;let cols=E<=16?E:0;if(!cols)for(const c of [32,24,20,16,12,10,8])if(E%c===0&&E/c>=c/4){cols=c;break}if(!cols)cols=Math.ceil(Math.sqrt(E*2));grid.style.gridTemplateColumns='repeat('+cols+',minmax(0,1fr))';grid.style.maxWidth=Math.min(560,cols*22)+'px';
    const hit=Bs>1?union(E,T.k,Bs):null;let g='';
    for(let e=0;e<E;e++){const exists=i>=1||e<T.k;const on=e<T.k;g+='<span'+(!exists?' style="visibility:hidden"':'')+' class="'+(hit?(hit.has(e)?'hit':''):(on?'on':''))+'"></span>'}
    grid.innerHTML=g;
    $('cc-gridlab').textContent=hit?('Experts of one layer touched by a batch of '+Bs+' tokens (uniform routing, illustrative): '+hit.size+' of '+E):('Experts of one layer: '+E+(i>=1?', the '+T.k+' this token uses are lit':' (only the '+T.k+' slices of the twin exist yet)'));
    const nm=S.m?S.m.label:'this model';
    const caps=[
      'The <b>dense twin</b>'+(T.made==='from'?' of '+esc(nm)+': each MoE layer replaced by one feed-forward block as wide as the '+T.k+' routed experts plus the shared ones a token uses.':' is '+esc(nm)+' itself; think of each feed-forward block as '+T.k+' slices side by side.')+' Same active parameters, same FLOPs per token.',
      'Add the other <b>'+(E-T.k)+' experts</b>. Total parameters grow from '+cnt(pd.total)+' to '+cnt(pm.total)+' ('+(pm.total/pd.total).toFixed(1)+'&times;); a token still runs through only '+T.k+', so active parameters stay at '+cnt(pm.active)+'.',
      'FLOPs per token barely move: the only new compute is the <b>router</b>, one '+S.spec.d+' &times; '+E+' matrix per layer that scores every expert ('+cnt(pm.breakdown.router)+' parameters in all). Capacity went up '+(pm.total/pd.total).toFixed(1)+'&times; at almost the same compute: the reason MoE exists.',
      'The bill is <b>memory</b>: every expert must be loaded, '+bytes(pm.total*wb)+' against '+bytes(pd.total*wb)+' for the twin at the chosen weight dtype, whichever experts a token picks.',
      'Decode reads weights from memory every step. With <b>8 sequences</b> in the batch, each picking '+T.k+' experts, about '+Math.round(E*(1-Math.pow(1-T.k/E,8)))+' of '+E+' experts per layer are needed on average (uniform routing), so the step reads '+bytes(readM)+'.',
      'With <b>64 sequences</b>, about '+Math.round(E*frac)+' of '+E+' experts per layer are touched: the step reads '+bytes(readM)+', '+(readM/(pd.total*wb)).toFixed(1)+'&times; the dense twin. MoE saves FLOPs at every batch size but saves memory bandwidth only at small batches; at large batches serving systems spread experts over GPUs (expert parallelism) instead.'];
    cap.innerHTML=caps[i];
  }
  const M=anim({card:'cc-moecard',ctl:'cc-moectl',n:NS,ms:2600,label:'MoE step',draw:drawMoe});
  CCS.S.subs.push(()=>{if(visible())M.redraw()});
  CCS.onRender(()=>M.redraw());
})();
