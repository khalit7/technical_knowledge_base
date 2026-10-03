// ---- Reading: dead units in a real trained network, epoch by epoch (three runs), and the learning-rate sweep ----
(function(){
  const card=document.getElementById('dr');if(!card)return;
  const $=id=>document.getElementById(id);
  const T=DATA.toy,FR=T.frames;let run=0;
  const NM=['ReLU at learning rate 0.04','ReLU at learning rate 0.08','leaky ReLU at learning rate 0.08'];
  const pct=v=>(v*100).toFixed(1)+'%';
  function perLayer(m){const r=[0,0,0];if(!m)return r;for(let i=0;i<384;i++)if(m[i]==='x')r[Math.floor(i/128)]++;return r}
  function frame(i){return FR[run].f[Math.min(i,FR[run].f.length-1)]}
  function draw(i){
    const el=$('drSvg'),W=RD.width(el),f=frame(i),m=f[3],nan=f[4];
    const gap=W<420?8:16,bw=(W-2*gap-8)/3,cs=Math.max(2,Math.floor(bw/16)),bh=cs*8,top=20,H=top+bh+8;
    let s='';const pl=perLayer(m);
    for(let b=0;b<3;b++){const x0=4+b*(16*cs+gap);
      s+=PF.T(x0,13,'Layer '+(b+1)+(m?' · '+pl[b]+' dead':''),' font-size="11.5" fill="var(--mute)"');
      for(let u=0;u<128;u++){const c=u%16,r=Math.floor(u/16),x=x0+c*cs,y=top+r*cs,ch=m?m[b*128+u]:null;
        let fill,op=1;
        if(nan){fill='var(--dim)';op=.6}
        else if(ch==='x'){fill='var(--bad)'}
        else{fill='var(--acc)';op=0.12+0.088*(+ch)}
        s+='<rect x="'+x+'" y="'+y+'" width="'+(cs-1)+'" height="'+(cs-1)+'" rx="1" fill="'+fill+'" opacity="'+op.toFixed(2)+'"/>';
      }
      if(nan)s+=PF.T(x0+8*cs,top+bh/2+5,'NaN',' text-anchor="middle" font-size="14" font-weight="600" fill="var(--bad)"');
    }
    el.innerHTML=PF.svg(W,H,'Hidden units of the toy network at epoch '+f[0],s);
    const dead=m?pl[0]+pl[1]+pl[2]:null;
    $('drN').innerHTML=RD.stat('Epoch',String(f[0]),'of 30')+RD.stat('Dead units',nan?'n/a':dead+' of 384',nan?'every weight is NaN':'layers '+pl.join(', '))+
      RD.stat('Training loss',nan?'NaN':(f[1]==null?'n/a':f[1].toFixed(3)),f[0]?'mean over the epoch':'not trained yet')+RD.stat('Held-out accuracy',nan||f[2]==null?'n/a':pct(f[2]),'360 digits; chance is 10%');
    $('drT').textContent='Epoch '+f[0]+(nan?': not a number':'');
    $('drP').innerHTML=cap(i,f,dead,pl);
  }
  function cap(i,f,dead,pl){
    const prev=i>0?frame(i-1):null,pd=prev&&prev[3]?perLayer(prev[3]).reduce((a,b)=>a+b,0):null;
    if(f[4])return 'The loss overflowed: a weight update of the size this rate allows sent the logits to infinity, and from then on every number in the network is NaN. Leaky units could not go silent, so the same instability that killed the ReLU network shows up as an overflow instead.';
    if(f[0]===0)return 'Before training: He initialisation and zero biases, so every unit is on for roughly half of the images (mid-blue). '+NM[run]+'.';
    let t='';
    if(pd!=null&&dead<pd)t+='Dead units came back ('+pd+' to '+dead+'): a unit in layer 2 or 3 is dead only for the inputs it currently receives, and those change when the layers below it learn. ';
    if(f[2]!=null&&f[2]<0.2&&pl[2]===128)t+='All 128 units of layer 3 are dead, so the output layer sees zeros for every image: the same prediction for all, a loss stuck near ln 10 = 2.303, accuracy at chance. Nothing in backpropagation can undo it. ';
    else if(f[2]!=null&&f[2]<0.2)t+='Accuracy has fallen to chance. ';
    if(!t){if(dead===0)t='No unit has died; the loss keeps falling.';else if(pd!=null&&dead>pd)t=(dead-pd)+' more units died this epoch; the large steps push some units\' inputs below zero for every image.';else t='The dead count is unchanged.'}
    if(i===FR[run].f.length-1&&!f[4])t+=' End of training: '+dead+' dead, held-out accuracy '+pct(f[2])+'.';
    return t;
  }
  const A=RD.anim({card:'dr',ctl:'drC',n:FR[0].f.length,draw,ms:900,label:'Epoch'});
  $('drM').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;run=+b.dataset.r;
    $('drM').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));A.reset(FR[run].f.length);A.play()});
  $('drL').innerHTML='<span><i style="background:var(--acc);opacity:.2"></i>on for few images</span><span><i style="background:var(--acc);opacity:.9"></i>on for most images</span><span><i style="background:var(--bad)"></i>dead: off for all 1,797</span>';
  addEventListener('resize',()=>A.redraw());

  // the sweep: dead units at the end of training against the learning rate, five seeds each
  const LR=[0.01,0.02,0.03,0.04,0.05,0.06,0.07,0.08,0.1,0.3];
  function sweep(){
    const el=$('dsSvg'),W=RD.width(el),H=230,ml=40,mr=8,mt=26,mb=36,iw=W-ml-mr,ih=H-mt-mb;
    const ys=v=>mt+ih-ih*Math.sqrt(v/384);let s='';
    [0,5,25,100,200].forEach(v=>{s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+ys(v)+'" y2="'+ys(v)+'" stroke="var(--line)"/>'+PF.T(ml-5,ys(v)+4,v,' text-anchor="end" font-size="10.5" fill="var(--mute)"')});
    s+=PF.T(ml,12,'Dead units after 30 epochs (of 384; square-root scale)',' font-size="11" fill="var(--mute)"');
    s+=PF.T(1,mt-4,'overflow',' font-size="9.5" fill="var(--bad)"');
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
