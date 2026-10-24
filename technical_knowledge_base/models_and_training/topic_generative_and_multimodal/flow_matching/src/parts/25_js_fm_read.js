// ---- Flow matching page, Reading tab: inline visuals. Data: window.FMD (22_js_fm_0data.js). ----
(function(){
  const X=window.FMX,Fd=window.FMF,D=X.D,$=X.$;if(!$('t-read'))return;
  // recorded numbers, tables and code are static text written by src/fill_static.py at build time
  X.quiz();X.nav('fmr-nav');const Y=window.FMY||{};
  const pc=v=>(100*v).toFixed(v>=0.1||v===0?0:1)+'%';
  const C=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)'];

  // ---------- 1. Average the lines
  (function(){const cv=$('fmr-avg');if(!cv)return;const ctx=cv.getContext('2d');let P=[-0.6,1.2];
    const samp=Fd.sampleData(80,31);const net=()=>Fd.getNet('rf1');
    function css(v){return getComputedStyle(document.documentElement).getPropertyValue(v).trim()||'#888'}
    function draw(){const W=cv.clientWidth||600;const H=Math.round(W*0.7);if(cv.width!==W*2){cv.width=W*2;cv.height=H*2}
      const s=2,t=+$('fmr-avg-t').value;$('fmr-avg-tv').textContent=t.toFixed(2);
      ctx.setTransform(s,0,0,s,0,0);ctx.clearRect(0,0,W,H);const sc=Math.min(W,H)/9.4,cx=W/2,cy=H/2;
      const tx=x=>cx+x*sc,ty=y=>cy-y*sc;
      const ink=css('--ink'),mute=css('--mute'),acc=css('--acc'),bad=css('--bad'),line=css('--line'),good=css('--good');
      // field arrows
      if($('fmr-avg-f').checked){ctx.strokeStyle=line;ctx.lineWidth=1;for(let gx=-4;gx<=4.01;gx+=0.8)for(let gy=-3.2;gy<=3.21;gy+=0.8){const u=Fd.exact(gx,gy,t).u;const L=Math.hypot(u[0],u[1])||1,k=Math.min(0.35,0.08*L)/L;arrow(tx(gx),ty(gy),tx(gx+u[0]*k),ty(gy+u[1]*k),line,1,3)}}
      // data samples
      samp.forEach(p=>{ctx.fillStyle=mute;ctx.beginPath();ctx.arc(tx(p[0]),ty(p[1]),2,0,7);ctx.fill()});
      // weights of each sample's line through P: N(P; t x1, (1-t)^2)
      const v=1-t;let lw=samp.map(p=>-((P[0]-t*p[0])**2+(P[1]-t*p[1])**2)/(2*v*v));const m=Math.max(...lw);let w=lw.map(l=>Math.exp(l-m));const z=w.reduce((a,b)=>a+b,0);w=w.map(q=>q/z);
      let ax=0,ay=0;samp.forEach((p,i)=>{const vx=(p[0]-P[0])/v,vy=(p[1]-P[1])/v;ax+=w[i]*vx;ay+=w[i]*vy;
        if(w[i]>0.002){ctx.globalAlpha=Math.min(1,0.15+w[i]*6);const x0=(P[0]-t*p[0])/v,y0=(P[1]-t*p[1])/v;
          ctx.strokeStyle=acc;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(tx(x0),ty(y0));ctx.lineTo(tx(p[0]),ty(p[1]));ctx.stroke();ctx.globalAlpha=1}});
      const sl=1-t;      // arrow length (1 - t) u: it ends where the straight line through the point would end, E[x1 | x]
      arrow(tx(P[0]),ty(P[1]),tx(P[0]+ax*sl),ty(P[1]+ay*sl),ink,3.2,8);
      const ex=Fd.exact(P[0],P[1],t).u;ctx.setLineDash([5,4]);arrow(tx(P[0]),ty(P[1]),tx(P[0]+ex[0]*sl),ty(P[1]+ex[1]*sl),bad,2,7);ctx.setLineDash([]);
      let nv=null;if($('fmr-avg-n').checked){const f=net();if(f){nv=f(P[0],P[1],t);arrow(tx(P[0]),ty(P[1]),tx(P[0]+nv[0]*sl),ty(P[1]+nv[1]*sl),good,2,7)}}
      ctx.fillStyle=ink;ctx.beginPath();ctx.arc(tx(P[0]),ty(P[1]),4.5,0,7);ctx.fill();
      ctx.font='11px ui-sans-serif,-apple-system,sans-serif';ctx.fillStyle=mute;ctx.fillText('blue: lines through the point (opacity = weight); arrows end at the predicted image x + (1 - t) u',8,H-8);
      const eff=1/w.reduce((a,b)=>a+b*b,0);
      $('fmr-avg-out').innerHTML=X.stat('lines that matter','about '+eff.toFixed(eff<10?1:0),'effective number of samples, 1/&Sigma;w&sup2;')+
        X.stat('average of the 80 lines (thick)','('+ax.toFixed(2)+', '+ay.toFixed(2)+')','sample estimate')+
        X.stat('exact field (dashed red)','('+ex[0].toFixed(2)+', '+ex[1].toFixed(2)+')','closed form, infinite data')+
        (nv?X.stat('trained network (green)','('+nv[0].toFixed(2)+', '+nv[1].toFixed(2)+')','the root toy model, int8'):'')}
    function arrow(x0,y0,x1,y1,col,lw,hd){ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineWidth=lw;ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1,y1);ctx.stroke();const a=Math.atan2(y1-y0,x1-x0);if(Math.hypot(x1-x0,y1-y0)<2)return;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x1-hd*Math.cos(a-.45),y1-hd*Math.sin(a-.45));ctx.lineTo(x1-hd*Math.cos(a+.45),y1-hd*Math.sin(a+.45));ctx.closePath();ctx.fill()}
    function setP(e){const r=cv.getBoundingClientRect();const W=r.width,H=r.height,sc=Math.min(W,H)/9.4;P=[(e.clientX-r.left-W/2)/sc,-(e.clientY-r.top-H/2)/sc];P=[Math.max(-4.5,Math.min(4.5,P[0])),Math.max(-3.4,Math.min(3.4,P[1]))];draw()}
    let down=false;cv.addEventListener('pointerdown',e=>{down=true;setP(e)});cv.addEventListener('pointermove',e=>{if(down)setP(e)});addEventListener('pointerup',()=>{down=false});
    ['fmr-avg-t','fmr-avg-f','fmr-avg-n'].forEach(id=>$(id).addEventListener('input',draw));
    X.onRender('t-read',draw);draw()})();

  // ---------- 1. floor and learning error by t
  function floorCharts(){const F=D.floor;if(!F||!$('fmr-floor'))return;
    X.chart($('fmr-floor'),[{name:'total target',color:C[0],pts:F.t.map((t,i)=>[t,F.total[i]])},{name:'irreducible floor',color:C[1],pts:F.t.map((t,i)=>[t,F.floor[i]])}],{xlab:'t (0 = noise, 1 = data)',ylab:'squared error',xticks:[0,.2,.4,.6,.8,1],ymin:0,h:210,label:'Loss floor by t'});
    X.leg($('fmr-floor-leg'),[['total |x1 - x0|^2',C[0]],['floor |x1 - x0 - u|^2',C[1]],['network |v - u|^2 (lower chart)',C[2]]]);
    X.chart($('fmr-learned'),[{name:'network vs exact',color:C[2],pts:F.t.map((t,i)=>[t,F.learned[i]])}],{xlab:'t',ylab:'|v - u|^2 (log)',logy:true,xticks:[0,.2,.4,.6,.8,1],h:190,label:'Network error by t'})}
  // ---------- 2. decomposition
  function dec(){if(!$('fmr-dec'))return;const E=D.exact,Rr=D.rounds;
    const ser=[{name:'exact field, straight path',color:C[1],pts:E.linear.euler.map(r=>[r[0],100*r[1]])},{name:'trained 1-RF network',color:C[0],pts:Rr['1'].euler.map(r=>[r[0],100*r[1]])},{name:'trained 2-RF (one reflow)',color:C[2],pts:Rr['2'].euler.map(r=>[r[0],100*r[1]]),dash:true}];
    X.chart($('fmr-dec'),ser,{logx:true,xticks:[1,2,4,8,16,32,64],xlab:'Euler steps (log)',ylab:'% on a blob',ymin:0,ymax:100,h:220,label:'Exact field against trained networks by steps'});
    X.leg($('fmr-dec-leg'),ser.map(s=>[s.name,s.color]))}
  // ---------- 3. memorisation strips
  (function(){if(!$('fmr-memo-card'))return;const lab=X.CLS;
    function show(n){X.tiles($('fmr-memo-z'),'memo_noise',10,lab.map(c=>'noise for '+c));X.tiles($('fmr-memo-e'),'memo_exact_'+n,10,lab.map(c=>'exact field sample, '+c));X.tiles($('fmr-memo-en'),'memo_exact_50_nn',10,lab);
      X.tiles($('fmr-memo-m'),'memo_net_'+n,10,lab.map(c=>'network sample, '+c));X.tiles($('fmr-memo-mn'),'memo_net_50_nn',10,lab);
      const s=(D.memo.steps||{})[n]||{};$('fmr-memo-out').innerHTML=X.stat('exact field: copies of a training image',pc(s.exact_copies_frac||0),n+' steps, 100 samples; RMS below 0.01')+
        X.stat('exact field: median distance to nearest training image',(s.exact_nn_rms_median||0).toFixed(4),'RMS per pixel, range [-1, 1]')+
        X.stat('network: median distance',(s.net_nn_rms_median||0).toFixed(3),'held-out real test images: '+D.memo.nn.test_rms_median.toFixed(3))}
    X.seg($('fmr-memo-n'),m=>show(m));show('50')})();
  // ---------- 5. OT cost
  function ot(){if(!$('fmr-ot'))return;const O=D.ot;const n2=O.cost2d[0][1],ni=O.costimg[0][1];
    const ser=[{name:'2-D toy',color:C[0],pts:O.cost2d.map(r=>[r[0],r[1]/n2])},{name:'Fashion-MNIST pixels',color:C[1],pts:O.costimg.map(r=>[r[0],r[1]/ni])}];
    X.chart($('fmr-ot'),ser,{logx:true,xticks:[1,4,16,64,256,1024,4096],xlab:'batch size B (log)',ylab:'travel vs random pairs',ymin:0,ymax:1.05,h:210,label:'Minibatch OT travel distance by batch size'});
    X.leg($('fmr-ot-leg'),ser.map(s=>[s.name,s.color]))}
  // ---------- 11. timestep table (closed block): both budgets are static; the toggle shows one
  (function(){const b=$('fmr-ts-b');if(!b)return;X.seg(b,m=>{['2000','12000'].forEach(k=>{const t=$('fmr-ts-'+k);if(t)t.hidden=k!==m})})})();
  // ---------- 12. SDE strips (the table is static)
  (function(){if(!$('fmr-sde-s0'))return;X.tiles($('fmr-sde-s0'),'sde_0_50',10,X.CLS);X.tiles($('fmr-sde-s5'),'sde_0p5_50',10,X.CLS)})();
  // ---------- 1. one Euler step against fifty, same noise (the root's strips)
  (function(){if(!$('fmr-one-1'))return;X.tiles($('fmr-one-1'),'fm_e1',10,X.CLS.map(c=>c+', 1 Euler step'));X.tiles($('fmr-one-50'),'fm_e50',10,X.CLS.map(c=>c+', 50 Euler steps'))})();
  // ---------- 14. convention bugs, from the root's sprite sheet in window.FMY (first five classes)
  (function(){if(!$('fmr-bug-ok')||!Y.sheet)return;const im=new Image();im.src=Y.sheet;
    function put(el,key){const t0=Y.tiles[key];el.innerHTML='';for(let i=0;i<5;i++){const c=X.canv(X.CLS[i]+', '+key);el.appendChild(c);
      const go=()=>{const j=t0+i;c.getContext('2d').drawImage(im,(j%Y.cols)*28,Math.floor(j/Y.cols)*28,28,28,0,0,28,28)};if(im.complete&&im.naturalWidth)go();else im.addEventListener('load',go,{once:true})}}
    put($('fmr-bug-ok'),'fm_50');put($('fmr-bug-a'),'bug_rev');put($('fmr-bug-b'),'bug_t1000')})();
  // ---------- 5. solver error against a fine answer, by evaluations (the root's recording)
  function solv(){const el=$('fmr-solv');if(!el||!Y.err)return;const nm={euler:'Euler',heun:'Heun (plain)',midpoint:'midpoint',heun_last_euler:'Heun, last step Euler'};
    const ser=Object.keys(nm).map((k,i)=>({name:nm[k],color:[C[0],C[1],C[2],C[3]][i],dash:k==='heun',pts:Y.err.filter(r=>r.solver===k).map(r=>[r.nfe,r.rms])}));
    X.chart(el,ser,{logx:true,logy:true,xticks:[1,2,4,10,20,50,100],xlab:'network evaluations (log)',ylab:'RMS from fine answer (log)',h:230,label:'Solver error by network evaluations'});
    X.leg($('fmr-solv-leg'),ser.map(q=>[q.name,q.color]))}
  // ---------- 6. where four evenly spaced steps land on the straight path's clock, lambda = a / (a + b)
  function clock(){const el=$('fmr-clock');if(!el)return;const W=X.width(el),H=150,ml=Math.min(110,W*0.3),mr=14,xx=v=>ml+v*(W-ml-mr);
    const P=[['straight','linear'],['cosine VP','cos'],['DDPM-style VP','vp']];let g='';
    [0,.25,.5,.75,1].forEach(v=>{g+='<line x1="'+xx(v)+'" x2="'+xx(v)+'" y1="18" y2="122" stroke="var(--line)"/><text x="'+xx(v)+'" y="138" text-anchor="middle" font-size="11" fill="var(--mute)">'+v+'</text>'});
    g+='<text x="'+ml+'" y="12" font-size="11" fill="var(--mute)">&#955; = a/(a + b): 0 noise, 1 data</text>';
    P.forEach((p,r)=>{const y=40+r*34;g+='<line x1="'+xx(0)+'" x2="'+xx(1)+'" y1="'+y+'" y2="'+y+'" stroke="var(--mute)"/><text x="'+(ml-12)+'" y="'+(y+4)+'" text-anchor="end" font-size="11" fill="var(--ink)">'+p[0]+'</text>';
      [0,.25,.5,.75,1].forEach(t=>{const c=Fd.coef(p[1],t);const l=t===1?1:c[0]/(c[0]+c[1]);g+='<circle cx="'+xx(l).toFixed(1)+'" cy="'+y+'" r="5" fill="'+(p[1]==='vp'?'var(--bad)':'var(--acc)')+'"><title>'+p[0]+', t = '+t+': &#955; = '+l.toFixed(3)+'</title></circle>'})});
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Where four uniform steps land on each path">'+g+'</svg>'}
  function all(){floorCharts();dec();ot();solv();clock()}
  X.onRender('t-read',all);all();
})();
