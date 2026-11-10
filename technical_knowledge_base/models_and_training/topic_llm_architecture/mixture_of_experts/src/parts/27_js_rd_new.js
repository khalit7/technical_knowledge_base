// ---- Reading visuals added on 2026-10-23: the dense-twin stepper (moved from the root's Config calculator; an RD.anim with its step list,
// plays when in view since 2026-11-09) and the decode-reads slider. The hero, the fine-grained figure and the expert-parallel stepper became
// the 3D stages Fig. 1, 6 and 9 on 2026-11-09 (41_, 46_, 47_js_sc_*.js). ----
(function(){
  const M=window.MX;if(!M||!window.RD)return;const {D,$,f,pct,tx,svg,esc,EC}=M;
  const box=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(1,w).toFixed(1)+'" height="'+h.toFixed(1)+'" rx="'+(o.rx===undefined?4:o.rx)+'" fill="'+(o.fill||'var(--soft)')+'" stroke="'+(o.stroke||'var(--line)')+'"'+(o.sw?' stroke-width="'+o.sw+'"':'')+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+(o.op!==undefined?' fill-opacity="'+o.op+'"':'')+'/>'};
  const line=(x1,y1,x2,y2,o)=>{o=o||{};return '<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="'+(o.c||'var(--mute)')+'" stroke-width="'+(o.w||1.2)+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+(o.op!==undefined?' stroke-opacity="'+o.op+'"':'')+'/>'};
  const G=n=>n>=1e12?f(n/1e12,2)+'T':n>=1e9?f(n/1e9,2)+'B':n>=1e6?f(n/1e6,1)+'M':f(n,0);
  const GB=b=>b>=1e12?f(b/1e12,2)+' TB':b>=1e9?f(b/1e9,1)+' GB':f(b/1e6,1)+' MB';
  const FL=n=>n>=1e12?f(n/1e12,2)+' TFLOP':n>=1e9?f(n/1e9,1)+' GFLOP':f(n/1e6,1)+' MFLOP';

  // 2. dense twin stepper (the root's Config calculator idea, on this page's configs) -----------------------------------
  if($('mx-twin')&&window.CC&&D.cc){
    const CC=window.CC,WB=2;
    const models=D.cc.filter(m=>{try{const s=CC.normalise(m.cfg);return s.layers.some(l=>l.ffn&&(l.ffn.t==='moe'||l.ffn.t==='glu'))}catch(e){return false}});
    let key=models.some(m=>m.key==='mixtral-8x7b')?'mixtral-8x7b':models[0].key;
    $('mx-twin-m').innerHTML=models.map(m=>'<option value="'+m.key+'"'+(m.key===key?' selected':'')+'>'+esc(m.label)+'</option>').join('');
    function twins(sp){
      const moeL=sp.layers.some(l=>l.ffn&&l.ffn.t==='moe');
      if(moeL){const dense=Object.assign({},sp,{layers:sp.layers.map(l=>l.ffn&&l.ffn.t==='moe'?Object.assign({},l,{ffn:{t:'glu',ff:l.ffn.k*l.ffn.ff+l.ffn.sff,bias:false}}):l)});
        const fz=sp.layers.find(l=>l.ffn&&l.ffn.t==='moe').ffn;return {dense,moe:sp,E:fz.E,k:fz.k,made:'from'}}
      const moe=Object.assign({},sp,{layers:sp.layers.map(l=>l.ffn&&l.ffn.t==='glu'?Object.assign({},l,{ffn:{t:'moe',E:8,k:2,ff:l.ffn.ff/2,sff:0,sgate:false,rbias:false,cbias:false,ebias:false}}):l)});
      return {dense:sp,moe,E:8,k:2,made:'to'}}
    function rng(seed){let s=seed>>>0;return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}}
    function union(E,k,B){const r=rng(12345+E*7+k),hit=new Set();for(let b=0;b<B;b++){const ch=new Set();while(ch.size<k)ch.add(Math.floor(r()*E));ch.forEach(e=>hit.add(e))}return hit}
    const NS=6;
    function calc(i){const m=models.find(x=>x.key===key),T=twins(CC.normalise(m.cfg)),pd=CC.params(T.dense),pm=CC.params(T.moe);
      const Bs=i>=5?64:i>=4?8:1,frac=1-Math.pow(1-T.k/T.E,Bs),routed=pm.breakdown.moe_routed;
      const readM=i>=1?(pm.total-routed+routed*(Bs===1?T.k/T.E:frac))*WB:pd.total*WB;return {m,T,pd,pm,Bs,frac,readM}}
    function caps(i){const {m,T,pd,pm,frac,readM}=calc(i),E=T.E,nm=esc(m.label);return [
        'The dense twin '+(T.made==='from'?'of '+nm+': each MoE layer replaced by one FFN as wide as the '+T.k+' routed experts plus the shared ones a token uses.':'is '+nm+' itself; read each FFN as '+T.k+' slices side by side.')+' Same active parameters, same FLOPs per token.',
        'Total parameters grow from '+G(pd.total)+' to '+G(pm.total)+' ('+f(pm.total/pd.total,1)+'&times;) as the other '+(E-T.k)+' experts are added; a token still runs through only '+T.k+', so active parameters stay at '+G(pm.active)+'.',
        'The only new compute is the router, one '+f(T.moe.d,0)+' &times; '+E+' matrix per layer ('+G(pm.breakdown.router)+' parameters in all). Capacity went up '+f(pm.total/pd.total,1)+'&times; at almost the same compute: the reason MoE exists.',
        'Every expert must be loaded, '+GB(pm.total*WB)+' against '+GB(pd.total*WB)+' for the twin, whichever experts a token picks.',
        'Decode reads weights from memory every step. With 8 sequences each picking '+T.k+', about '+Math.round(E*(1-Math.pow(1-T.k/E,8)))+' of '+E+' experts per layer are needed (uniform routing), so the step reads '+GB(readM)+'.',
        'About '+Math.round(E*frac)+' of '+E+' experts per layer are touched: the step reads '+GB(readM)+', '+f(readM/(pd.total*WB),1)+'&times; the dense twin. MoE saves FLOPs at every batch size but memory bandwidth only at small batches (section 8).'][i]}
    function fillList(){document.querySelectorAll('#sx-twin .tw-x').forEach((el,i)=>{el.innerHTML=caps(i)})}
    function draw(i){
      const {T,pd,pm,Bs,readM}=calc(i),shown=i>=1?pm:pd;
      const rows=[['Total parameters',pd.total,shown.total,G],['Active parameters per token',pd.active,shown.active,G],['FLOPs per token (weights)',2*pd.matmul_active,2*shown.matmul_active,FL],
        ['Weight memory (BF16)',pd.total*WB,shown.total*WB,GB],['Weights read per decode step, batch '+Bs,pd.total*WB,readM,GB]];
      let h='';rows.forEach(([nm,a,b,fm],j)=>{const mx=Math.max(a,b),hl=(i===1&&j<2)||(i===2&&j===2)||(i===3&&j===3)||(i>=4&&j===4);
        h+='<div class="bars"><div class="tw-mt'+(hl?' on':'')+'">'+nm+'</div>'+
          '<div class="row"><span class="nm mute">dense twin</span><span class="track"><span class="fill" style="width:'+(100*a/mx).toFixed(1)+'%;background:var(--c1)"></span></span><span class="val">'+fm(a)+'</span></div>'+
          '<div class="row"><span class="nm mute">MoE</span><span class="track"><span class="fill" style="width:'+(100*b/mx).toFixed(1)+'%;background:var(--c2)"></span></span><span class="val">'+fm(b)+'</span></div></div>'});
      $('mx-twin-bars').innerHTML=h;
      const E=T.E,grid=$('mx-twin-grid');let cols=E<=16?E:0;if(!cols)for(const c of [32,24,20,16,12,10,8])if(E%c===0&&E/c>=c/4){cols=c;break}if(!cols)cols=Math.ceil(Math.sqrt(E*2));
      grid.style.gridTemplateColumns='repeat('+cols+',minmax(0,1fr))';grid.style.maxWidth=Math.min(560,cols*22)+'px';
      const hit=Bs>1?union(E,T.k,Bs):null;let g='';
      for(let e=0;e<E;e++){const exists=i>=1||e<T.k,on=e<T.k;g+='<span'+(!exists?' style="visibility:hidden"':'')+' class="'+(hit?(hit.has(e)?'hit':''):(on?'on':''))+'"></span>'}
      grid.innerHTML=g;
      $('mx-twin-lab').textContent=hit?('Experts of one layer touched by a batch of '+Bs+' sequences (uniform routing, illustrative): '+hit.size+' of '+E):('Experts of one layer: '+E+(i>=1?', the '+T.k+' this token uses lit':' (only the '+T.k+' slices of the twin exist yet)'));
    }
    fillList();const A=RD.anim({card:'mx-twin',ctl:'mx-twin-ctl',n:NS,ms:4200,label:'MoE step',draw,list:'sx-twin'});
    $('mx-twin-m').addEventListener('change',e=>{key=e.target.value;fillList();A.reset(NS)});
  }

  // 5. decode: experts touched against batch (DeepSeek-V3: E = 256, k = 8) ------------------------------------------------------
  if($('mx-dec')){
    const E=256,k=8,BS=[1,2,4,8,16,32,64,128,256,512,1024];
    function rng(seed){let s=seed>>>0;return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}}
    const grid=$('mx-dec-grid');grid.style.gridTemplateColumns='repeat(32,minmax(0,1fr))';grid.style.maxWidth='560px';
    function draw(){const B=BS[+$('mx-dec-b').value],ex=E*(1-Math.pow(1-k/E,B)),r=rng(777),hit=new Set();
      for(let b=0;b<B;b++){const ch=new Set();while(ch.size<k)ch.add(Math.floor(r()*E));ch.forEach(e=>hit.add(e))}
      let g='';for(let e=0;e<E;e++)g+='<span class="'+(hit.has(e)?'hit':'')+'"></span>';grid.innerHTML=g;
      $('mx-dec-bv').textContent=B;
      $('mx-dec-out').innerHTML=RD.stat('Experts touched per layer (expected)',f(ex,ex<10?1:0)+' of 256',pct(ex/E,0)+' of the routed weights read')+
        RD.stat('Tokens per touched expert',f(B*k/ex,1),'B &middot; k / experts touched')+RD.stat('This draw',hit.size+' lit','one seeded random draw, illustrative')}
    $('mx-dec-b').addEventListener('input',draw);draw();
  }
})();
