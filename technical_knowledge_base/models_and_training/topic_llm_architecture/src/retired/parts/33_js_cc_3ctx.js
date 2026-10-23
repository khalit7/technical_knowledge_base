// Config calculator: context-length sweep (FLOPs and memory against context, attention variants, a second model)
// and the dense-vs-MoE stepper at equal active parameters.
(function(){
  if(!window.CCS||!document.getElementById('cc-ch1'))return;
  const {S,$,esc,cnt,bytes,fl,ctxs,width,visible,anim,byKey}=CCS;
  // ---- the same model with another attention design (MLA counted as the MHA or MQA it replaces) ----
  function variant(sp,v){
    if(v==='cfg')return sp;
    const mapm=m=>{if(!m)return m;
      if(m.t==='attn')return Object.assign({},m,{nkv:v==='mha'?m.nh:1});
      // K is nope+rope wide and V is v wide; an equal split keeps both the cache (2 x n_kv x d_h) and the score FLOPs exact
      if(m.t==='mla'){const h=(m.nope+m.rope+m.v)/2;return {t:'attn',nh:m.nh,nkv:v==='mha'?m.nh:1,hd:h,hdv:h,bqkv:false,bo:false,qk:0,sinks:false,gate:false,win:0,fromMla:1}}
      return m};
    return Object.assign({},sp,{layers:sp.layers.map(l=>Object.assign({},l,{mix:mapm(l.mix),mix2:mapm(l.mix2)}))});
  }
  const cmpSel=$('cc-cmp');
  cmpSel.innerHTML='<option value="">none</option>'+CCD.models.map(m=>'<option value="'+m.key+'">'+esc(m.label)+'</option>').join('');
  cmpSel.value='nemotron-h-8b';
  const XMIN=8,XMAX=20;
  function curves(sp,p,B){
    const out=[];for(let x=XMIN;x<=XMAX+1e-9;x+=0.25){const L=Math.round(2**x);const f=CC.flops(sp,L,p);const c=CC.cache(sp,L,CCS.kb());
      out.push({x,L,w:f.weights,a:f.decode_attn+f.state,t:f.decode,wm:p.total*CCS.wb(),cm:c.total*B})}
    return out;
  }
  // decade tick labels in SI units (1G = 1e9); memory ticks are decimal bytes (1 GB = 1e9 bytes)
  const si=y=>{const u=[[1e15,'P'],[1e12,'T'],[1e9,'G'],[1e6,'M'],[1e3,'k']];for(const [v,n] of u)if(y>=v)return Math.round(y/v)+n;return String(Math.round(y))};
  function cross(pts,a,b){for(const q of pts)if(q[a]>=q[b])return q;return null}
  function chart(el,series,mark,crossPt,yfmt){
    const W=width(el),H=W<520?190:220,ml=W<520?54:62,mr=8,mt=10,mb=26;const pw=W-ml-mr,ph=H-mt-mb;
    let lo=Infinity,hi=0;series.forEach(s=>s.pts.forEach(([,y])=>{if(y>0){lo=Math.min(lo,y);hi=Math.max(hi,y)}}));
    lo=Math.pow(10,Math.floor(Math.log10(lo)));hi=Math.pow(10,Math.ceil(Math.log10(hi)));if(hi/lo<100)hi=lo*100;
    const X=x=>ml+(x-XMIN)/(XMAX-XMIN)*pw,Y=y=>mt+ph-(Math.log10(Math.max(y,lo))-Math.log10(lo))/(Math.log10(hi)-Math.log10(lo))*ph;
    let g='';
    for(let e=Math.log10(lo);e<=Math.log10(hi)+1e-9;e++){const y=Y(10**e);g+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/><text x="'+(ml-4)+'" y="'+(y+4)+'" font-size="11" text-anchor="end" fill="var(--mute)">'+yfmt(10**e)+'</text>'}
    const xt=W<520?[8,12,16,20]:[8,10,12,14,16,18,20];
    xt.forEach(x=>{g+='<line x1="'+X(x)+'" x2="'+X(x)+'" y1="'+mt+'" y2="'+(mt+ph)+'" stroke="var(--line)"/><text x="'+X(x)+'" y="'+(H-8)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+ctxs(2**x)+'</text>'});
    if(crossPt){const x=X(crossPt.x);g+='<line x1="'+x+'" x2="'+x+'" y1="'+mt+'" y2="'+(mt+ph)+'" stroke="var(--bad)" stroke-dasharray="3 3"/>'}
    series.forEach(s=>{g+='<polyline fill="none" stroke="var('+s.c+')" stroke-width="'+(s.w||2)+'"'+(s.dash?' stroke-dasharray="5 4"':'')+' points="'+s.pts.map(([x,y])=>X(x).toFixed(1)+','+Y(y).toFixed(1)).join(' ')+'"/>'});
    const mx=X(Math.log2(mark));g+='<line x1="'+mx+'" x2="'+mx+'" y1="'+mt+'" y2="'+(mt+ph)+'" stroke="var(--ink)" stroke-width="1.5"/>';
    series.filter(s=>s.dot).forEach(s=>{const q=s.dot;g+='<circle cx="'+X(q[0])+'" cy="'+Y(q[1])+'" r="3.5" fill="var('+s.c+')"/>'});
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Curves against context length, log scales">'+g+'</svg>';
  }
  const leg=(items)=>'<div class="cc-leg">'+items.map(([c,t,d])=>'<div><i style="background:var('+c+')'+(d?';opacity:.6':'')+'"></i><span class="n">'+t+'</span></div>').join('')+'</div>';
  function at(pts,L){let best=pts[0];pts.forEach(q=>{if(Math.abs(Math.log2(q.L/L))<Math.abs(Math.log2(best.L/L)))best=q});return best}
  function draw(){
    if(!S.spec)return;
    const v=$('cc-var').value,B=CCS.batch(),L=CCS.ctxN();
    const sp=variant(S.spec,v),p=v==='cfg'?S.p:CC.params(sp);const pts=curves(sp,p,B);
    const ck=cmpSel.value,cm=ck&&byKey[ck];let pc=null;
    if(cm){const s2=CC.normalise(cm.cfg);pc=curves(s2,CC.params(s2),B)}
    const cF=cross(pts,'a','w'),cM=cross(pts,'cm','wm');
    const cur=CC.flops(sp,L,p),cc=CC.cache(sp,L,CCS.kb());
    const s1=[{pts:pts.map(q=>[q.x,q.w]),c:'--c1'},{pts:pts.map(q=>[q.x,q.a]),c:'--c2'},{pts:pts.map(q=>[q.x,q.t]),c:'--ink',w:1.2}];
    if(pc)s1.push({pts:pc.map(q=>[q.x,q.t]),c:'--c4',dash:1});
    s1[2].dot=[Math.log2(L),cur.decode];
    chart($('cc-ch1'),s1,L,cF,si);
    const s2=[{pts:pts.map(q=>[q.x,q.wm]),c:'--c1'},{pts:pts.map(q=>[q.x,q.cm]),c:'--c2'},{pts:pts.map(q=>[q.x,q.wm+q.cm]),c:'--ink',w:1.2}];
    if(pc)s2.push({pts:pc.map(q=>[q.x,q.wm+q.cm]),c:'--c4',dash:1});
    s2[2].dot=[Math.log2(L),p.total*CCS.wb()+cc.total*B];
    chart($('cc-ch2'),s2,L,cM,y=>si(y)+'B');
    const nm=(S.m?S.m.label:'pasted config')+(v==='cfg'?'':' as '+v.toUpperCase());
    const L1=$('cc-ch1').parentNode,L2=$('cc-ch2').parentNode;
    L1.querySelector('.cc-leg')&&L1.querySelector('.cc-leg').remove();L2.querySelector('.cc-leg')&&L2.querySelector('.cc-leg').remove();
    L1.insertAdjacentHTML('beforeend',leg([['--c1','weights (2 per active parameter)'],['--c2','attention and recurrent state'],['--ink','total, '+esc(nm)]].concat(cm?[['--c4','total, '+esc(cm.label),1]]:[])));
    L2.insertAdjacentHTML('beforeend',leg([['--c1','weights'],['--c2','cache x batch '+B],['--ink','total, '+esc(nm)]].concat(cm?[['--c4','total, '+esc(cm.label),1]]:[])));
    const mc=CCS.maxCtx(S.cfg);const share=100*(cur.decode_attn+cur.state)/cur.decode;
    let cap='At <b>'+ctxs(L)+'</b> tokens, attention and state are <b>'+share.toFixed(share<10?1:0)+'%</b> of a decoded token\'s '+fl(cur.decode)+'; the cache for '+B+' sequence'+(B>1?'s':'')+' is <b>'+bytes(cc.total*B)+'</b> against <b>'+bytes(p.total*CCS.wb())+'</b> of weights. ';
    cap+=cF?'Attention FLOPs pass the weight FLOPs at about <b>'+ctxs(cF.L)+'</b> (red dashed line, left). ':'Attention FLOPs stay below the weight FLOPs over the whole range. ';
    cap+=cM?'The cache passes the weights at about <b>'+ctxs(cM.L)+'</b> at this batch (right).':'The cache stays below the weights over the whole range at this batch.';
    if(mc&&L>mc)cap+=' <span class="ill">Past this model\'s configured maximum context ('+ctxs(mc)+').</span>';
    if(v!=='cfg'){const fromMla=S.spec.layers.some(l=>l.mix&&l.mix.t==='mla');cap+=' <span class="mute">Variant: the same layers with '+(v==='mha'?'one KV head per query head':'one KV head in total')+(fromMla?' in place of the latent (K '+'and V at their MLA head sizes); the parameter count of such a model is not shown.':'; parameters change too ('+cnt(p.total)+').')+'</span>'}
    $('cc-ctxcap').innerHTML=cap;
    let st='';const stt=(k,vv,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+vv+'</div><div class="d">'+(d||'')+'</div></div>';
    st+=stt('KV per token, '+esc(nm),bytes(CC.cache(sp,1,CCS.kb()).kv));
    if(cm){const s2=CC.normalise(cm.cfg),p2=CC.params(s2),f2=CC.flops(s2,L,p2),c2=CC.cache(s2,L,CCS.kb());
      st+=stt('KV per token, '+esc(cm.label),bytes(CC.cache(s2,1,CCS.kb()).kv),c2.state?'plus '+bytes(c2.state)+' state per sequence':'');
      st+=stt(esc(cm.label)+' at '+ctxs(L),fl(f2.decode),'cache x batch: '+bytes(c2.total*B))}
    $('cc-ctxstats').innerHTML=st;
  }
  let lastMax=0;
  const steps=()=>{const mc=CCS.maxCtx(S.cfg);const top=Math.min(XMAX,mc?Math.log2(mc):XMAX);return Math.max(2,Math.floor((top-10)/0.5)+1)};
  let A=null;
  A=anim({card:'cc-ctxcard',ctl:'cc-anctl',n:steps(),ms:900,label:'Context step',autoplay:false,
    draw(i){if(!S.spec)return;const x=10+0.5*i;if(Math.abs(+$('cc-ctx').value-x)>1e-9&&(A&&A.playing||i>0)){$('cc-ctx').value=x;CCS.update()}else draw()}});
  ['cc-var','cc-cmp'].forEach(id=>$(id).addEventListener('change',draw));
  CCS.S.subs.push(()=>{const n=steps();if(n!==lastMax){lastMax=n;}if(A.n!==n)A.reset(n);if(visible())draw()});
  CCS.onRender(draw);addEventListener('resize',()=>{if(visible())draw()});

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
