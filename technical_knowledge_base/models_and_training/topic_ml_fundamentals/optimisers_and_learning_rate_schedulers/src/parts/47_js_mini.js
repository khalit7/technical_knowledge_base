// ---- Reading: three small races inline, each beside the claim it proves (the Optimiser race's engine, rates and surfaces) ----
// m1: SGD, momentum, Nesterov on the ravine. m2: the same five optimisers on the axis-aligned and the rotated ravine (before/after).
// m3: Adam and Nesterov on the noisy ravine under constant, cosine and WSD (before/after). Never plays by itself.
(function(){
  if(!window.OPTE||!window.RACE_LR)return;
  const E=OPTE,LR=RACE_LR;
  const COL={gd:'#8a8a8a',mom:'#3f7f56',nes:'#2aa198',adagrad:'#b8983a',rmsprop:'#d4801f',adam:'#2f6fb5',shampoo:'#8a5cb8'};
  const MINS={ravine:[[1,0.6]],rotated:[[1,0.6]],noisy:[[1,0.6]]};
  const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim()||'#888';
  const hex=c=>{c=c.replace('#','');if(c.length===3)c=c.split('').map(x=>x+x).join('');return[parseInt(c.slice(0,2),16),parseInt(c.slice(2,4),16),parseInt(c.slice(4,6),16)]};
  function mount(id,modes,F){
    const card=document.getElementById(id+'-card');if(!card)return;
    const cv=document.getElementById(id+'-cv'),cap=document.getElementById(id+'-cap'),leg=document.getElementById(id+'-leg'),seg=document.getElementById(id+'-mode');
    let mi=0,runs={},bg=null,bgKey='';
    function compute(){const m=modes[mi];runs={};m.opts.forEach(ok=>{runs[ok]=E.run(m.surf,ok,LR[m.surf][ok],{sched:m.sched||'const',seed:1})})}
    function geom(){const b=E.S[modes[mi].surf].box,ar=(b[3]-b[2])/(b[1]-b[0]);let W=RD.width(cv.parentNode),H=W*ar;if(H>300){H=300;W=H/ar}return{W:Math.round(W),H:Math.round(H),b}}
    function background(g){const sk=modes[mi].surf,key=sk+g.W+'x'+g.H+matchMedia('(prefers-color-scheme: dark)').matches;if(key===bgKey)return bg;
      const f=E.S[sk].f,b=g.b,c0=hex(css('--bg')),c1=hex(css('--acc2')),c2=hex(css('--dim'));const img=new ImageData(g.W,g.H),val=new Float32Array(g.W*g.H);let lo=Infinity,hi=-Infinity;
      for(let j=0;j<g.H;j++)for(let i=0;i<g.W;i++){const x=b[0]+(i+0.5)/g.W*(b[1]-b[0]),y=b[3]-(j+0.5)/g.H*(b[3]-b[2]);const v=Math.log10(Math.max(f(x,y),1e-6));val[j*g.W+i]=v;lo=Math.min(lo,v);hi=Math.max(hi,v)}
      for(let k=0;k<val.length;k++){const t=Math.min(1,(val[k]-lo)/(hi-lo)*0.85+(Math.floor(val[k]*2)%2===0?0:0.09));for(let q=0;q<3;q++)img.data[4*k+q]=Math.round(c0[q]+(c1[q]-c0[q])*t);img.data[4*k+3]=255}
      for(let j=1;j<g.H;j++)for(let i=1;i<g.W;i++){const k=j*g.W+i,a=Math.floor(val[k]*2);if(a!==Math.floor(val[k-1]*2)||a!==Math.floor(val[k-g.W]*2))for(let q=0;q<3;q++)img.data[4*k+q]=c2[q]}
      bg=img;bgKey=key;return img}
    function draw(i){const m=modes[mi],sf=E.S[m.surf],g=geom();if(cv.width!==g.W||cv.height!==g.H){cv.width=g.W;cv.height=g.H}cv.style.width=g.W+'px';cv.style.height=g.H+'px';
      const ctx=cv.getContext('2d');ctx.putImageData(background(g),0,0);const b=g.b,X=x=>(x-b[0])/(b[1]-b[0])*g.W,Y=y=>(b[3]-y)/(b[3]-b[2])*g.H;
      const T=sf.steps,t=Math.round(T*i/(F-1));
      ctx.fillStyle=css('--ink');MINS[m.surf].forEach(q=>{ctx.beginPath();ctx.moveTo(X(q[0]),Y(q[1])-6);ctx.lineTo(X(q[0])+5,Y(q[1])+4);ctx.lineTo(X(q[0])-5,Y(q[1])+4);ctx.closePath();ctx.fill()});
      ctx.beginPath();ctx.arc(X(sf.start[0]),Y(sf.start[1]),4,0,7);ctx.strokeStyle=css('--ink');ctx.lineWidth=1.5;ctx.stroke();
      m.opts.forEach(ok=>{const r=runs[ok];ctx.strokeStyle=COL[ok];ctx.lineWidth=2;ctx.beginPath();let last=null;
        for(let s=0;s<=t;s++){const x=r.xs[s],y=r.ys[s];if(!isFinite(x))break;const px=Math.max(-50,Math.min(g.W+50,X(x))),py=Math.max(-50,Math.min(g.H+50,Y(y)));s?ctx.lineTo(px,py):ctx.moveTo(px,py);last=[px,py]}
        ctx.stroke();if(last){ctx.fillStyle=COL[ok];ctx.beginPath();ctx.arc(last[0],last[1],4.5,0,7);ctx.fill()}});
      let h='<table class="nar"><thead><tr><th>Optimiser</th><th class="num">rate</th><th class="num">loss now</th><th class="num">first step below 10⁻³</th></tr></thead><tbody>';
      m.opts.forEach(ok=>{const r=runs[ok];let fst=null;for(let s=0;s<=r.T;s++)if(r.ls[s]<1e-3){fst=s;break}const v=r.ls[t];
        h+='<tr><td><i style="display:inline-block;width:12px;height:3px;background:'+COL[ok]+';vertical-align:middle;margin-right:5px"></i>'+E.O[ok].name+'</td><td class="num">'+LR[m.surf][ok]+'</td><td class="num">'+(isFinite(v)?v.toExponential(2):'diverged')+'</td><td class="num">'+(fst!==null&&fst<=t?fst:(t>=r.T?'not reached':'not yet'))+'</td></tr>'});
      leg.innerHTML=h+'</tbody></table>';
      cap.innerHTML='<div class="t">'+m.label+': step '+t+' of '+T+'</div><p>'+(t>=T?m.end:m.cap)+'</p>'}
    compute();
    const an=RD.anim({card:id+'-card',ctl:id+'-ctl',n:F,ms:110,draw,label:'Step'});
    if(seg){seg.innerHTML=modes.map((m,k)=>'<button data-v="'+k+'"'+(k?'':' class="on"')+'>'+m.label+'</button>').join('');
      seg.querySelectorAll('button').forEach(bt=>bt.addEventListener('click',()=>{mi=+bt.dataset.v;seg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===bt));bgKey='';compute();an.reset(F)}))}
    RD.onRender(()=>{bgKey='';an.redraw()});RD.onResize(()=>{bgKey='';an.redraw()});
  }
  const five=['nes','adagrad','rmsprop','adam','shampoo'];
  mount('m1',[{label:'Ravine, axis-aligned',surf:'ravine',opts:['gd','mom','nes'],
    cap:'Plain SGD (grey) zig-zags across the valley at a rate small enough for the steep direction and creeps along the floor; momentum and Nesterov build speed along it because their along-floor components agree from step to step.',
    end:'After 150 steps plain SGD has still not reached 10⁻³; momentum 0.9 got there at step 89, Nesterov at step 24, at their own best rates.'}],60);
  mount('m2',[{label:'axis-aligned',surf:'ravine',opts:five,
    cap:'The steep direction is the y coordinate, so a per-coordinate scale (AdaGrad, RMSProp, Adam) fixes the conditioning directly.',
    end:'AdaGrad and RMSProp reach 10⁻³ at step 15, Nesterov and Shampoo at step 24, Adam at 46. Now switch to rotated.'},
    {label:'rotated 45°',surf:'rotated',opts:five,
    cap:'The same valley turned about its minimum: the steep direction now mixes x and y, so no per-coordinate scale can fix it.',
    end:'AdaGrad and RMSProp no longer reach 10⁻³ in 150 steps; Adam needs 50; Nesterov (24) and Shampoo (24) are exactly as before.'}],60);
  mount('m3',[{label:'constant',surf:'noisy',opts:['nes','adam'],sched:'const',
    cap:'At a constant rate each step adds fresh noise as fast as the pull of the valley removes it, so the loss stops falling and hovers.',
    end:'Seed 1: Adam ends at 3.4e-2 and Nesterov at 3.5e-2, hovering at the noise floor. Switch to cosine.'},
    {label:'cosine',surf:'noisy',opts:['nes','adam'],sched:'cosine',
    cap:'The same peak rate, decayed to zero along a cosine: early steps are as fast as before, late steps are small enough to average the noise out.',
    end:'Seed 1: Adam ends at 2.8e-4 and Nesterov at 1.1e-4, about a hundred times below the constant-rate floor.'},
    {label:'WSD',surf:'noisy',opts:['nes','adam'],sched:'wsd',
    cap:'Constant for 80% of the run, then a 1−sqrt cooldown over the last 20%: the loss hovers at the floor until the cooldown starts.',
    end:'Seed 1: Adam ends at 9.6e-3 and Nesterov at 1.0e-2: below the floor, though here above cosine, whose decay is longer.'}],60);
})();
