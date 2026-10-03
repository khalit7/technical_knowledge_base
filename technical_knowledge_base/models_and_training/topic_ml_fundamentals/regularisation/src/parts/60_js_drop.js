// ---- Dropout tab: thinned networks one by one on a real digit; Monte Carlo averaging against weight scaling; training curves ----
(function(){
  const card=document.getElementById('dr-card');if(!card)return;
  const $=id=>document.getElementById(id);
  const L=RG.mlp(DIG.model),KEEP=DIG.model.keep,M=DIG.measures,NT=DIG.labels.length,lab=k=>+DIG.labels[k];
  const pix=k=>[...DIG.digits.slice(k*64,k*64+64)].map(c=>parseInt(c,17)/16);
  const pct=v=>(100*v).toFixed(2).replace(/0$/,'')+'%';
  const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
  const sd=M.seeds;
  $('dr-intro').innerHTML='Test error over five training seeds: <b>'+sd.dropout.test_err.map(pct).join(', ')+'</b> with dropout (mean '+pct(mean(sd.dropout.test_err))+'), '+sd.none.test_err.map(pct).join(', ')+' without (mean '+pct(mean(sd.none.test_err))+'). Each test digit is 0.28% of the 360. The network shown is seed 0 with dropout.';
  const K=30,st={d:M.ambiguous[0],k:0};let runs=[];
  function sample(d){const r=RG.rng(1000+d),x=pix(d),out=[];const ws=RG.fwd(L,x,[1,1,1]);
    for(let k=0;k<K;k++){const masks=[];const o=RG.fwd(L,x,KEEP,r,masks);out.push({p:o.p,masks})}return {ws:ws.p,out}}
  const picks=[...M.ambiguous.slice(0,6).map(d=>[d,'ambiguous']),...M.clear.slice(0,3).map(d=>[d,'clear'])];
  $('dr-pick').innerHTML='<span class="small mute" style="align-self:center">ambiguous digits:</span>'+picks.map(([d,t],i)=>(t==='clear'&&picks[i-1][1]!=='clear'?'<span class="small mute" style="align-self:center;margin-left:6px">clear:</span>':'')+'<button data-d="'+d+'"'+(i?'':' class="on"')+' title="test digit '+d+', labelled '+lab(d)+'">'+lab(d)+'</button>').join('')+'<button data-d="rand">random</button>';
  function bars(el,p,ghost,hl){el.innerHTML=p.map((v,c)=>'<div class="row"><span>'+c+'</span><div class="track"><div class="fill" style="width:'+(100*v).toFixed(1)+'%;background:'+(c===hl?'var(--c3)':'var(--c1)')+'"></div>'+(ghost?'<div class="ghost" style="left:calc('+(100*ghost[c]).toFixed(1)+'% - 1px)"></div>':'')+'</div><span>'+(100*v).toFixed(0)+'%</span></div>').join('')}
  function units(el,m){el.innerHTML='<div class="unitgrid" style="grid-template-columns:repeat(24,1fr)">'+m.map(k=>'<i style="background:'+(k?'var(--c1)':'var(--soft)')+';border:1px solid '+(k?'var(--c1)':'var(--line)')+'"></i>').join('')+'</div>'}
  function draw(i){if(!runs.length)runs=sample(st.d);const R=runs,o=R.out[i],x=pix(st.d);
    const m0=o.masks[0];$('dr-img').innerHTML='<div style="position:relative;width:96px">'+DGT(x.map((v,j)=>m0[j]?v:0),96)+
      '<div style="position:absolute;inset:0;display:grid;grid-template-columns:repeat(8,1fr);pointer-events:none">'+m0.map(k=>'<span style="font-size:10px;line-height:12px;text-align:center;color:var(--bad)">'+(k?'':'×')+'</span>').join('')+'</div></div>';
    units($('dr-h1'),o.masks[1]);units($('dr-h2'),o.masks[2]);
    const a=new Array(10).fill(0),votes=new Array(10).fill(0);for(let k=0;k<=i;k++){R.out[k].p.forEach((v,c)=>{a[c]+=v/(i+1)});votes[R.out[k].p.indexOf(Math.max(...R.out[k].p))]++}
    const y=lab(st.d),me=o.p.indexOf(Math.max(...o.p)),av=a.indexOf(Math.max(...a)),ws=R.ws.indexOf(Math.max(...R.ws));
    bars($('dr-p1'),o.p,null,y);bars($('dr-pa'),a,R.ws,y);bars($('dr-v'),votes.map(v=>v/(i+1)),null,y);
    $('dr-k').textContent='(number '+(i+1)+' of '+K+')';
    const kept=[0,1,2].map(l=>o.masks[l].filter(Boolean).length);
    $('dr-n').innerHTML=RD.stat('true label',y,'test digit '+st.d)+RD.stat('this network says',me,kept[0]+' of 64 pixels, '+kept[1]+' and '+kept[2]+' of 96 units kept')+
      RD.stat('average of '+(i+1),av,'P = '+(100*a[av]).toFixed(0)+'%')+RD.stat('weight-scaled network',ws,'one pass, P = '+(100*R.ws[ws]).toFixed(0)+'%')+RD.stat('votes agreeing',Math.round(100*Math.max(...votes)/(i+1))+'%','with the most common answer');
    const amb=Math.max(...votes)/(i+1)<0.8;
    $('dr-cap').innerHTML='<div class="t">Thinned network '+(i+1)+'</div>'+(i===0?'One fresh mask: a fifth of the pixels and half of each hidden layer switched off. This one subnetwork says <b>'+me+'</b>.':
      i<5?'Each network has its own mask, so its own opinion. The average (right) moves as they arrive; the black ticks are the weight-scaled network, computed once.':
      amb?'The thinned networks disagree on this digit: the votes are split, and MC dropout would report it as uncertain (Gal and Ghahramani 2016). The average sits close to the weight-scaled ticks.':'They agree: almost every subnetwork gives the same answer, and the average and the weight-scaled network coincide.')}
  const A=RD.anim({card:'dr-card',ctl:'dr-ctl',n:K,draw,ms:800,label:'Thinned network'});
  $('dr-pick').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;[...e.currentTarget.querySelectorAll('button')].forEach(x=>x.classList.toggle('on',x===b));
    st.d=b.dataset.d==='rand'?Math.floor(Math.random()*NT):+b.dataset.d;runs=sample(st.d);A.reset(K);A.play()});
  // ---- Monte Carlo curve ----
  let live=null;
  function drawMC(){const el=$('mc-plot'),mc=M.mc,x=mc.k.map(Math.log10);
    const lines=[{xs:x,ys:mc.arith_mean.map(v=>100*v),c:'var(--c1)',w:2.2},{xs:x,ys:mc.geo_mean.map(v=>100*v),c:'var(--c4)',w:1.8},{xs:[x[0],x[x.length-1]],ys:[100*mc.weight_scaling,100*mc.weight_scaling],c:'var(--ink)',w:1.6,dash:'5 4'}];
    const polys=[{xs:x.concat(x.slice().reverse()),ys:mc.arith_max.map(v=>100*v).concat(mc.arith_min.map(v=>100*v).reverse()),fill:'var(--c1)',fo:.15}];
    const pts=live?live.map(q=>({x:Math.log10(q[0]),y:100*q[1],r:3.5,c:'var(--c2)'})):[];
    PL.chart({el,id:'mc',x:[0,Math.log10(200)],y:[0,Math.max(12,100*Math.max(...mc.arith_max))*1.02],lines,polys,pts,xt:[0,1,Math.log10(50),2].map(v=>v),xf:v=>String(Math.round(Math.pow(10,v))),
      xl:'thinned networks averaged, k (log scale)',yl:'test error %',label:'Monte Carlo averaging against weight scaling'});
    const i50=mc.k.indexOf(50),i200=mc.k.indexOf(200);
    $('mc-repro').innerHTML='<b>Does not reproduce Srivastava et al.\'s crossing, said plainly:</b> here weight scaling ('+pct(mc.weight_scaling)+') stays below the Monte Carlo average at every k: '+pct(mc.arith_mean[i50])+' at k = 50 and '+pct(mc.arith_mean[i200])+' at k = 200 (mean of '+mc.repeats+' repeats; a difference of about '+Math.round((mc.arith_mean[i200]-mc.weight_scaling)*NT)+' of the 360 digits); '+(function(){const j=mc.arith_min.findIndex(v=>v<=mc.weight_scaling+1e-12);return j<0?'no single repeat reaches it':'the best single repeat first equals it at k = '+mc.k[j]})()+'. The shape does reproduce: one thinned network is far worse ('+pct(mc.arith_mean[0])+'), and the average improves quickly up to a few tens of networks. A different network, dataset and test set from the paper\'s MNIST run; the geometric mean behaves like the arithmetic one.'}
  $('mc-run').addEventListener('click',()=>{const seed=(Date.now()%99991)+1,r=RG.rng(seed),ks=[1,2,5,10,20,50],acc=[...Array(NT)].map(()=>new Array(10).fill(0));live=[];let k=0;
    const X=[...Array(NT).keys()].map(pix);$('mc-run').disabled=true;
    (function step(){const t0=Date.now();while(k<50&&Date.now()-t0<60){k++;for(let d=0;d<NT;d++){const p=RG.fwd(L,X[d],KEEP,r).p;for(let c=0;c<10;c++)acc[d][c]+=p[c]}
        if(ks.includes(k)){let e=0;for(let d=0;d<NT;d++){const a=acc[d];if(a.indexOf(Math.max(...a))!==lab(d))e++}live.push([k,e/NT]);drawMC()}}
      $('mc-st').textContent=k<50?'k = '+k+' of 50 …':'done: seed '+seed+', k = 50 gives '+pct(live[live.length-1][1]);
      if(k<50)setTimeout(step,0);else $('mc-run').disabled=false})()});
  // ---- training curves ----
  function drawTC(){const el=$('tc-plot'),a=M.seeds.dropout.curve_seed0,b=M.seeds.none.curve_seed0;
    PL.chart({el,id:'tc',x:[0,300],y:[0,0.6],lines:[{xs:a.map(q=>q[0]),ys:a.map(q=>q[1]),c:'var(--c1)'},{xs:a.map(q=>q[0]),ys:a.map(q=>q[2]),c:'var(--c1)',o:.5,dash:'5 3'},{xs:b.map(q=>q[0]),ys:b.map(q=>q[1]),c:'var(--c2)'},{xs:b.map(q=>q[0]),ys:b.map(q=>q[2]),c:'var(--c2)',o:.5,dash:'5 3'}],
      xl:'epoch',yl:'cross-entropy loss',label:'Training curves with and without dropout'});
    const la=a[a.length-1],lb=b[b.length-1];
    $('tc-note').innerHTML='Seed 0 after 300 epochs: without dropout the training loss reaches '+lb[1]+' while the test loss is '+lb[2]+' and still rising; with dropout, training '+la[1]+' and test '+la[2]+'. The gap closes because the network can no longer memorise each image with one fragile combination of units. Measured every 10 epochs.'}
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-drop']=[()=>A.redraw(),drawMC,drawTC];
  addEventListener('resize',()=>{if(card.offsetParent){A.redraw();drawMC();drawTC()}});
  window.DROP_TEST={go:i=>A.go(i),pick:d=>{st.d=d;runs=sample(d);A.reset(K)}};
})();
