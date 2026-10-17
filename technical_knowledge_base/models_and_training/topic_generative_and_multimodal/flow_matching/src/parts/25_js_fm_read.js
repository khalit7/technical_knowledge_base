// ---- Flow matching page, Reading tab: inline visuals. Data: window.FMD (22_js_fm_0data.js). ----
(function(){
  const X=window.FMX,Fd=window.FMF,D=X.D,$=X.$;if(!$('t-read'))return;
  X.facts();X.quiz();X.nav('fmr-nav');
  if(D.code&&$('fmr-code-exact'))$('fmr-code-exact').textContent=D.code.exact;
  if(D.sched_demo&&$('fmr-sched-out'))$('fmr-sched-out').textContent=D.sched_demo;
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
  // ---------- 4. paths table
  (function(){const tb=$('fmr-paths');if(!tb)return;const E=D.exact;const g=(a,n)=>{const r=a.find(q=>q[0]===n);return r?pc(r[1]):'n/a'};
    tb.innerHTML=[['straight (rectified flow)','linear'],['cosine VP (SiT\'s GVP)','cos'],['DDPM-style VP (beta 0.1 to 20)','vp']].map(([nm,k])=>'<tr><td>'+nm+'</td><td class="num">'+E[k].straightness.toFixed(3)+'</td><td class="num">'+g(E[k].euler,2)+'</td><td class="num">'+g(E[k].euler,4)+'</td><td class="num">'+g(E[k].euler,8)+'</td><td class="num">'+(k==='linear'?'= Euler':g(E[k].ddim,4))+'</td></tr>').join('')})();
  // ---------- 5. OT cost
  function ot(){if(!$('fmr-ot'))return;const O=D.ot;const n2=O.cost2d[0][1],ni=O.costimg[0][1];
    const ser=[{name:'2-D toy',color:C[0],pts:O.cost2d.map(r=>[r[0],r[1]/n2])},{name:'Fashion-MNIST pixels',color:C[1],pts:O.costimg.map(r=>[r[0],r[1]/ni])}];
    X.chart($('fmr-ot'),ser,{logx:true,xticks:[1,4,16,64,256,1024,4096],xlab:'batch size B (log)',ylab:'travel vs random pairs',ymin:0,ymax:1.05,h:210,label:'Minibatch OT travel distance by batch size'});
    X.leg($('fmr-ot-leg'),ser.map(s=>[s.name,s.color]))}
  // ---------- 6. rounds on images
  (function(){const tb=$('fmr-rounds-img');if(!tb)return;const I=D.img;
    const fe=(rows,n)=>{const r=rows.find(q=>q[0]==='euler'&&q[1]===n);return r?r[3].toFixed(1):'n/a'};
    const fdiv=(rows,n)=>{const r=rows.find(q=>q[0]==='euler'&&q[1]===n);return r?r[5].toFixed(1):'n/a'};
    let h='<tr><td>1-RF (root)</td><td class="num">'+fe(I.fm,1)+'</td><td class="num">'+fe(I.fm,2)+'</td><td class="num">'+fe(I.fm,4)+'</td><td class="num">'+fe(I.fm,50)+'</td><td class="num">'+fdiv(I.fm,50)+'</td><td class="num">'+I.fm_straight.toFixed(4)+'</td></tr>';
    h+='<tr><td>2-RF (root)</td><td class="num">'+fe(I.rf2,1)+'</td><td class="num">'+fe(I.rf2,2)+'</td><td class="num">'+fe(I.rf2,4)+'</td><td class="num">'+fe(I.rf2,50)+'</td><td class="num">'+fdiv(I.rf2,50)+'</td><td class="num">'+I.rf2_straight.toFixed(4)+'</td></tr>';
    const m3=(I.new||{}).rf3_2000;
    if(m3){const g=n=>{const r=m3.euler.find(q=>q.steps===n);return r?r.fd.toFixed(1):'n/a'},gd=n=>{const r=m3.euler.find(q=>q.steps===n);return r?r.div.toFixed(1):'n/a'};
      h+='<tr><td>3-RF (here)</td><td class="num">'+g(1)+'</td><td class="num">'+g(2)+'</td><td class="num">'+g(4)+'</td><td class="num">'+g(50)+'</td><td class="num">'+gd(50)+'</td><td class="num">'+(m3.straightness!=null?m3.straightness.toFixed(4):'')+'</td></tr>'}
    else h+='<tr><td>3-RF (here)</td><td colspan="6" class="small mute">run pending</td></tr>';
    tb.innerHTML=h})();
  // ---------- 8. timestep table
  (function(){const tb=$('fmr-ts');if(!tb)return;const T=D.tsched;
    function show(b){tb.innerHTML=Object.keys(T.hist).map(s=>{const r=T.runs[b+'|'+s];return '<tr><td>'+s+'</td><td class="num">'+r.err[0].toFixed(3)+'</td><td class="num">'+r.err[5].toFixed(3)+'</td><td class="num">'+pc(r.e4_on)+'</td><td class="num">'+r.e64_w2.toFixed(3)+' &plusmn; '+r.e64_w2_sd.toFixed(3)+'</td></tr>'}).join('')}
    X.seg($('fmr-ts-b'),m=>show(m));show('12000')})();
  // ---------- 9. SDE on images
  (function(){const tb=$('fmr-sde-rows');if(!tb)return;const s=D.img.sde||[],sd=D.img.sde_decay||[];
    if(!s.length){tb.innerHTML='<tr><td colspan="4" class="small mute">not recorded</td></tr>';return}
    const cell=(a,e,n)=>{const r=a.find(q=>q.eps===e&&q.steps===n);return '<td class="num">'+(r?r.fd.toFixed(1):'not run')+'</td>'};
    let h='<tr><td>&epsilon; = 0 (ODE)</td>'+[10,50,250].map(n=>cell(s,0,n)).join('')+'</tr>';
    [0.5,1].forEach(e=>{h+='<tr><td>constant &epsilon; = '+e+'</td>'+[10,50,250].map(n=>cell(s,e,n)).join('')+'</tr>'});
    [0.5,1,2].forEach(e=>{h+='<tr><td>decaying &epsilon; = '+e+' (1 &minus; t)</td>'+[10,50,250].map(n=>cell(sd,e,n)).join('')+'</tr>'});
    tb.innerHTML=h;X.tiles($('fmr-sde-s0'),'sde_0_50',10,X.CLS);X.tiles($('fmr-sde-s5'),'sde_0p5_50',10,X.CLS)})();
  // ---------- 11. production table
  (function(){const tb=$('fmr-prod');if(!tb)return;const S=D.sched||{};const c=k=>S[k]||{};
    const dyn=k=>{const q=c(k);return q.use_dynamic_shifting?'dynamic shift, &mu; '+q.base_shift+' at '+q.base_image_seq_len+' to '+q.max_shift+' at '+q.max_image_seq_len+' tokens (shift e<sup>&mu;</sup> = '+Math.exp(q.base_shift).toFixed(2)+' to '+Math.exp(q.max_shift).toFixed(2)+')'+(q.shift_terminal?', shift_terminal '+q.shift_terminal:''):'fixed shift '+q.shift};
    const rows=[
      ['Stable Diffusion 3 (paper, Mar 2024)','straight path (rectified flow), logit-normal(0, 1) chosen from 61 formulations','not read (gated); paper: shift 3.0 at 1024 px','MMDiT; LADD distils it to SD3-Turbo, 4 steps'],
      ['FLUX.1 [dev], [schnell] (2024-07-31)','"rectified flow transformer", 12B (card)','not read (gated); FLUX pipeline defaults: dynamic shift, &mu; 0.5 to 1.15 (shift 1.65 to 3.16)','schnell: LADD, 1 to 4 steps; dev: guidance as an input'],
      ['FLUX.2 [klein] 4B (repo 2026-01-14)','flow matching (Model map)','FlowMatchEuler, '+dyn('black-forest-labs/FLUX.2-klein-4B')+'; rev '+c('black-forest-labs/FLUX.2-klein-4B').sha,'Apache 2.0'],
      ['Qwen-Image (2025-08-02)','flow matching (Model map)','FlowMatchEuler, '+dyn('Qwen/Qwen-Image')+'; rev '+c('Qwen/Qwen-Image').sha,'MMDiT 20.43B'],
      ['Z-Image-Turbo (repo 2025-11-25)','flow matching (Model map)','FlowMatchEuler, '+dyn('Tongyi-MAI/Z-Image-Turbo')+'; rev '+c('Tongyi-MAI/Z-Image-Turbo').sha,'6.155B'],
      ['Wan 2.1 (paper Mar 2025; 1.3B shown)','"x_t = t x_1 + (1 - t) x_0", logit-normal t','UniPC multistep, flow_prediction, flow_shift '+c('Wan-AI/Wan2.1-T2V-1.3B-Diffusers').flow_shift+'; rev '+c('Wan-AI/Wan2.1-T2V-1.3B-Diffusers').sha,'video; 1.3B and 14B'],
      ['HunyuanVideo (paper Dec 2024)','Flow Matching, logit-normal t','FlowMatchEuler, '+dyn('hunyuanvideo-community/HunyuanVideo')+' (community diffusers repo, rev '+c('hunyuanvideo-community/HunyuanVideo').sha+')','video, 13B; larger shift for fewer steps'],
      ['LTX-Video (repo read 2026-10-17)','flow matching (config)','FlowMatchEuler, '+dyn('Lightricks/LTX-Video')+'; rev '+c('Lightricks/LTX-Video').sha,'video'],
      ['Movie Gen (paper Oct 2024; not released)','Flow Matching, logit-normal(0, 1), 30B','linear-quadratic grid, 50 steps "emulating 250 linear steps"','video and audio']];
    tb.innerHTML=rows.map(r=>'<tr>'+r.map(x=>'<td>'+x+'</td>').join('')+'</tr>').join('')})();
  function all(){floorCharts();dec();ot()}
  X.onRender('t-read',all);all();
})();
