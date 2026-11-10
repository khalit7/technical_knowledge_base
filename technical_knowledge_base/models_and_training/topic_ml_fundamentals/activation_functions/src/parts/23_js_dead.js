// ---- Reading: the learning-rate sweep of the dead-unit runs, and the OPT sentence (the epoch-by-epoch runs are the 3D stage in 34_js_sc_dead.js) ----
(function(){
  if(!document.getElementById('ds'))return;
  const $=id=>document.getElementById(id);
  const T=DATA.toy;
  const pct=v=>(v*100).toFixed(1)+'%';

  // the sweep: dead units at the end of training against the learning rate, five seeds each
  const LR=[0.01,0.02,0.03,0.04,0.05,0.06,0.07,0.08,0.1,0.3];
  function sweep(){
    const el=$('dsSvg'),W=RD.width(el),H=230,ml=40,mr=8,mt=26,mb=36,iw=W-ml-mr,ih=H-mt-mb;
    const ys=v=>mt+ih-ih*Math.sqrt(v/384);let s='';
    [0,5,25,100,200].forEach(v=>{s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+ys(v)+'" y2="'+ys(v)+'" stroke="var(--line)"/>'+PF.T(ml-5,ys(v)+4,v,' text-anchor="end" font-size="10.5" fill="var(--mute)"')});
    s+=PF.T(ml,12,'Dead units after 30 epochs (of 384; square-root scale)',' font-size="11" fill="var(--mute)"');
    s+=PF.T(1,mt-4,'overflow',' font-size="11" fill="var(--bad)"');
    const bw=iw/LR.length;
    LR.forEach((lr,k)=>{const cx=ml+bw*(k+.5);s+=PF.T(cx,H-mb+15,String(lr),' text-anchor="middle" font-size="10.5" fill="var(--mute)"');
      [['relu','var(--c1)',-1],['leaky','var(--c2)',1]].forEach(([a,c,side])=>{(T.summ[a+'|'+lr]||[]).forEach((r,j)=>{const x=cx+side*(bw*0.12+j*Math.min(4,bw*0.06));
        if(r[2]){s+='<text x="'+x+'" y="'+(mt-4)+'" text-anchor="middle" font-size="11" fill="'+c+'">×</text>';return}
        const y=ys(r[0]),coll=r[1]<0.2;s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="3.4" fill="'+(coll?'var(--bg)':c)+'" stroke="'+c+'" stroke-width="1.5"><title>'+a+', rate '+lr+', seed '+j+': '+r[0]+' dead, accuracy '+pct(r[1])+'</title></circle>'})})});
    s+=PF.T(ml+iw/2,H-6,'learning rate (SGD, momentum 0.9)',' text-anchor="middle" font-size="11" fill="var(--mute)"');
    el.innerHTML=PF.svg(W,H,'Dead units against learning rate',s);
  }
  $('dsL').innerHTML='<span><i style="background:var(--c1)"></i>ReLU</span><span><i style="background:var(--c2)"></i>leaky ReLU</span><span><i style="background:var(--bg);border:1.5px solid var(--mute)"></i>hollow: accuracy at chance (below 20%)</span><span>× : the loss overflowed</span>';
  (function(){const s=T.summ;const ok=k=>s[k].filter(r=>!r[2]);
    const lo=['relu|0.01','relu|0.02','relu|0.03','relu|0.04'].reduce((a,k)=>a+ok(k).reduce((b,r)=>b+r[0],0),0);
    const mid=ok('relu|0.05').concat(ok('relu|0.06'));
    $('dsX').innerHTML='Five seeds per rate. ReLU, rates 0.01 to 0.04: '+lo+' dead unit'+(lo===1?'':'s')+' in all 20 runs together. Rates 0.05 and 0.06: '+Math.min(...mid.map(r=>r[0]))+' to '+Math.max(...mid.map(r=>r[0]))+' dead, accuracy '+pct(Math.min(...mid.map(r=>r[1])))+' to '+pct(Math.max(...mid.map(r=>r[1])))+'. Rates 0.07 and above: '+
      ['relu|0.07','relu|0.08','relu|0.1','relu|0.3'].reduce((a,k)=>a+s[k].filter(r=>!r[2]&&r[1]<0.2).length,0)+' of 20 runs collapse to chance and '+['relu|0.07','relu|0.08','relu|0.1','relu|0.3'].reduce((a,k)=>a+s[k].filter(r=>r[2]).length,0)+' overflow; leaky ReLU: '+
      ['leaky|0.06','leaky|0.07','leaky|0.08','leaky|0.1','leaky|0.3'].reduce((a,k)=>a+s[k].filter(r=>r[2]).length,0)+' of 25 runs at 0.06 and above overflow, none collapse. <code>src/dead_relu_toy.py</code>.'})();
  RD.onRender(sweep);sweep();addEventListener('resize',sweep);

  // OPT sentence in the Reading tab
  const o=DATA.real.models.find(m=>m.key==='opt');
  if(o){const d=o.L.map(l=>l.dead),tot=d.reduce((a,b)=>a+b,0),mx=Math.max(...d),li=d.indexOf(mx);
    const first=d.slice(0,6).reduce((a,b)=>a+b,0);
    $('dr-opt').innerHTML=tot.toLocaleString('en-US')+' of its '+(o.L.length*o.width).toLocaleString('en-US')+' feed-forward units never fire on this text, '+first.toLocaleString('en-US')+' of them in the first six layers, up to '+mx.toLocaleString('en-US')+' of 3,072 ('+pct(mx/3072)+') in layer '+(li+1)+'; the last four layers have none. This is a released, working model: in a ReLU language model, units that never fire are part of the trained network, concentrated in the first half as Voita et al. found (on 283 thousand tokens a unit may simply be waiting for a rarer pattern, which the paper also notes).'}
})();
