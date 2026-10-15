// ---- TPU and Pallas lab: roofline calculator (section 3) and ICI collective calculator (section 4) ----
(function(){
  const T=window.TP,D=T.D,$=T.$,R=D.roof;
  const GK=D.gens.map(g=>g.gen);let gen='v6e',dt='bf16',tokI=1;
  const TOK=R.seven.map(r=>r.tokens);
  const GC={'v4':'var(--c6)','v5e':'var(--c3)','v5p':'var(--c4)','v6e':'var(--c1)','7x':'var(--c2)'};
  const best=(fl,by,g)=>Math.max(fl/g.bf16,by/g.bw);
  // the same arithmetic as src/tpu/tp_roofline.py, exposed for the check script
  function seven(tok){const d=R.l7.d,f=R.l7.f,L=R.l7.layers,V=R.l7.vocab;let fl=0,by=0;
    [[d,d],[d,d],[d,d],[d,d],[d,f],[d,f],[f,d]].forEach(([k,n])=>{fl+=2*tok*k*n;by+=2*(tok*k+k*n+tok*n)});fl*=L;by*=L;fl+=2*tok*d*V;by+=2*(tok*d+d*V+tok*V);return {fl,by}}
  function stepBound(g){return R.ops.reduce((a,o)=>a+best(o.flops,o.bytes_bf16,g)*(o.fwd+o.bwd),0)}
  window.TP.roofCalc={seven,stepBound,best};
  function draw(){
    const el=$('tp-rf-svg');const W=T.width(el),H=Math.round(Math.min(340,Math.max(240,W*0.55)));const g=T.GEN[gen];
    const ml=46,mr=10,mt=10,mb=34,pw=W-ml-mr,ph=H-mt-mb;
    const x0=0,x1=4,y0=11,y1=16;const X=v=>ml+(Math.log10(v)-x0)/(x1-x0)*pw,Y=v=>mt+ph-(Math.log10(v)-y0)/(y1-y0)*ph;
    let b='';
    for(let e=x0;e<=x1;e++){b+='<line x1="'+X(Math.pow(10,e))+'" y1="'+mt+'" x2="'+X(Math.pow(10,e))+'" y2="'+(mt+ph)+'" stroke="var(--line)"/>'+T.tx(X(Math.pow(10,e)),H-mb+14,e===0?'1':'1e'+e,{a:'middle',fs:10,fill:'var(--mute)'})}
    for(let e=y0;e<=y1;e++){b+='<line x1="'+ml+'" y1="'+Y(Math.pow(10,e))+'" x2="'+(ml+pw)+'" y2="'+Y(Math.pow(10,e))+'" stroke="var(--line)"/>'+T.tx(ml-4,Y(Math.pow(10,e))+3,e===12?'1 TF/s':(e===15?'1 PF/s':'1e'+e),{a:'end',fs:10,fill:'var(--mute)'})}
    b+=T.tx(ml+pw/2,H-4,'arithmetic intensity, FLOPs per HBM byte (log)',{a:'middle',fs:10.5,fill:'var(--mute)'});
    D.gens.forEach(G=>{const on=G.gen===gen;const r=G.ridge;const pts=[[1,G.bw],[r,G.bf16],[1e4,G.bf16]];
      b+='<polyline fill="none" stroke="'+GC[G.gen]+'" stroke-width="'+(on?2.6:1.1)+'" stroke-opacity="'+(on?1:.45)+'" points="'+pts.map(p=>X(p[0]).toFixed(1)+','+Y(p[1]).toFixed(1)).join(' ')+'"/>';
      if(on)b+='<line x1="'+X(r)+'" y1="'+Y(G.bf16)+'" x2="'+X(r)+'" y2="'+(mt+ph)+'" stroke="'+GC[G.gen]+'" stroke-dasharray="3 3"/>'+T.tx(X(r)+3,mt+ph-4,'ridge '+Math.round(r),{fs:10,fill:GC[G.gen]})});
    R.ops.forEach((o,i)=>{const ai=dt==='bf16'?o.ai_bf16:o.ai_f32;const y=Math.min(g.bf16,ai*g.bw);b+='<circle cx="'+X(ai).toFixed(1)+'" cy="'+Y(y).toFixed(1)+'" r="4" fill="var(--c5)" fill-opacity=".8" stroke="var(--bg)"><title>'+T.esc(o.name)+': '+ai+' FLOP/byte</title></circle>'});
    const s=seven(TOK[tokI]);const ai7=s.fl/s.by,y7=Math.min(g.bf16,ai7*g.bw);const cx=X(ai7),cy=Y(y7);
    b+='<path d="M'+cx+' '+(cy-7)+'L'+(cx+7)+' '+cy+'L'+cx+' '+(cy+7)+'L'+(cx-7)+' '+cy+'z" fill="var(--c2)" stroke="var(--bg)"/>';
    el.innerHTML=T.svg(W,H,b,'Roofline of TPU generations with the running example and a 7B-class model');
    $('tp-rf-leg').innerHTML=D.gens.map(G=>'<span><i style="background:'+GC[G.gen]+'"></i>'+T.GLAB[G.gen]+'</span>').join('')+'<span><i style="background:var(--c5);border-radius:6px"></i>running example matmuls ('+dt+')</span><span><i style="background:var(--c2)"></i>7B-class, '+T.fmtN(TOK[tokI])+' tokens</span>';
    const t7=best(s.fl,s.by,g),sb=stepBound(g);
    $('tp-rf-cnt').innerHTML=T.stat('running example, matmul bound',T.fmtT(sb),'per step on '+T.GLAB[gen]+'; at peak '+T.fmtT(R.dot_flops/g.bf16))+
      T.stat('7B-class, '+T.fmtN(TOK[tokI])+' tokens',T.fmtT(t7),'one forward of the weight matmuls')+
      T.stat('7B-class, share of peak',(100*s.fl/g.bf16/t7).toFixed(t7>0&&s.fl/g.bf16/t7<0.1?1:0)+'%',(ai7<g.ridge?'memory-bound: ':'compute-bound: ')+ai7.toFixed(0)+' FLOP/byte')+
      T.stat('7B-class, tokens per second',T.fmtN(Math.round(TOK[tokI]/t7)),'upper bound');
    $('tp-rf-t').querySelector('tbody').innerHTML=R.ops.map(o=>{const ai=dt==='bf16'?o.ai_bf16:o.ai_f32,by=dt==='bf16'?o.bytes_bf16:o.bytes_f32;const t=best(o.flops,by,g);
      return '<tr><td>'+T.esc(o.name)+'</td><td class="num">'+(o.fwd+o.bwd)+'</td><td class="num">'+ai+'</td><td class="num">'+(ai<g.ridge?'<span class="tp-bad">memory</span>':'<span class="tp-ok">compute</span>')+'</td><td class="num">'+T.fmtT(t)+'</td></tr>'}).join('');
    $('tp-rf-tokv').textContent=T.fmtN(TOK[tokI]);
  }
  T.seg($('tp-rf-gen'),GK.map(k=>[k,T.GLAB[k]]),gen,m=>{gen=m;draw()});
  T.seg($('tp-rf-dt'),[['bf16','bf16 (2 bytes)'],['f32','float32 (4 bytes)']],dt,m=>{dt=m;draw()});
  const sl=$('tp-rf-tok');sl.max=TOK.length-1;sl.value=tokI;sl.addEventListener('input',()=>{tokI=+sl.value;draw()});
  T.onRender(draw);T.onResize(draw);

  // ---- ICI collectives (scaling book model)
  const PRE=[['rg','running example gradients, float32 (3.3 MB)',826368*4],['ra','running example activation [32, 128, 128] float32 (2.1 MB)',32*128*128*4],
    ['sb','scaling book example, 34 MB',34e6],['ta','7B-class activation, 4,096 tokens x 4,096, bf16 (33.6 MB)',4096*4096*2],['g7','7B-class gradients, bf16 (13.5 GB)',R.l7.params*2]];
  const vs=$('tp-ici-v');vs.innerHTML=PRE.map(p=>'<option value="'+p[0]+'">'+p[1]+'</option>').join('');
  const gs=$('tp-ici-g');gs.innerHTML=GK.map(k=>'<option value="'+k+'"'+(k==='v5e'?' selected':'')+'>'+T.GLAB[k]+'</option>').join('');
  let wrap='1';
  function ici(V,k,G,X,n,w){const sb=G.sb;const f=k==='ar'?2:1;const bw=w?V/(sb.link_bidi*n):V*(X-1)/X/(sb.link_oneway*n);const lat=1e-6*X/2;return {t:f*Math.max(bw,lat),bw:f*bw,lat:f*lat}}
  window.TP.ici=ici;
  function upd(){const V=PRE.find(p=>p[0]===vs.value)[2],k=$('tp-ici-k').value,G=T.GEN[gs.value],X=+$('tp-ici-x').value,n=+$('tp-ici-n').value;
    const a=ici(V,k,G,X,n,wrap==='1'),o=ici(V,k,G,X,n,wrap!=='1');
    $('tp-ici-out').innerHTML=T.stat('time',T.fmtT(a.t),a.lat>a.bw?'latency-bound (about 1 µs per hop)':'bandwidth-bound')+T.stat(wrap==='1'?'without wraparound':'with wraparound',T.fmtT(o.t),'the same collective')+
      T.stat('bytes per chip',T.fmtB(V),'array size V')+T.stat('link, one way',T.fmtB(G.sb.link_oneway)+'/s',T.GLAB[G.gen]+', scaling book')}
  T.seg($('tp-ici-w'),[['1','yes'],['0','no']],wrap,m=>{wrap=m;upd()});
  ['tp-ici-v','tp-ici-k','tp-ici-g','tp-ici-x','tp-ici-n'].forEach(id=>$(id).addEventListener('change',upd));upd();
})();
