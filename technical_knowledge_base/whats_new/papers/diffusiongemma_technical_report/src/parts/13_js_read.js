// ---- The paper tab: forward-process demo, Figure 11 calculator, predict reveals, Figure 12 ratios, quality gaps ----
(function(){
const TB=PAPER.tables,RC=PAPER.rc,f=s=>s==='-'?null:parseFloat(String(s).replace(/,/g,''));
const C1='var(--c1)',C2='var(--c2)',C3='var(--c3)',C4='var(--c4)',MU='var(--mute)',LN='var(--line)';
const setT=(id,h)=>{const e=$(id);if(e)e.innerHTML=h};
setT('dnsMean',RC.dns_mean_think.toFixed(1));
setT('gapMean',(RC.gap_mean).toFixed(1));
setT('bvTps','0.7%');
setT('bvMs',RC.ms_range[0].toFixed(1)+' to '+RC.ms_range[1].toFixed(1)+' ms');
setT('bvDns',RC.dns_mean_think.toFixed(1));
setT('bvMtp',RC.mtp_ms.toFixed(2));
setT('bvPar',Math.round(RC.f12_cpar));
setT('bvTf',RC.tokfw_ratio[0].toFixed(2)+' to '+RC.tokfw_ratio[1].toFixed(2));
setT('bvChk',RC.checks.length+' checks: '+RC.checks.filter(c=>c.ok===true).length+' agree, '+RC.checks.filter(c=>c.ok===false).length+' do not, '+RC.checks.filter(c=>c.ok===null).length+' context');
// noise table
(function(){const t=$('bvSE');if(!t)return;let h='<thead><tr><th>Benchmark</th><th class="num">Size</th><th class="num">DiffusionGemma</th><th class="num">Gemma 4</th><th class="num">Gap</th><th class="num">± 1 SE</th><th class="num">Gap / SE</th></tr></thead><tbody>';
  RC.se.forEach(x=>{h+='<tr><td>'+x.b+'</td><td class="num">'+fmt(x.n)+'</td><td class="num">'+x.td.toFixed(1)+'</td><td class="num">'+x.base.toFixed(1)+'</td><td class="num">'+x.gap.toFixed(1)+'</td><td class="num">'+x.se.toFixed(1)+'</td><td class="num">'+x.z.toFixed(1)+'</td></tr>'});t.innerHTML=h+'</tbody>'})();

// 1. forward process on one canvas
(function(){if(!$('fwd'))return;
  const words='Text diffusion is a generative process that creates high-quality text by iteratively refining random noise until a structured and coherent message emerges.'.split(' ');
  const filler=['the','of','model','blue','moon','red','sunset','dark','cloud','token','fast','slow','block','step','a','we','into','light','new','old','open','word','cat','sky'];
  const vocab=[...new Set(words.concat(filler))].slice(0,40);
  let mode='uni',seed=3;
  function draw(){const t=+$('fwdT').value/100;$('fwdTv').textContent=t.toFixed(2);const r=mulberry32(seed);let noisy=0,shown=0,fake=0,h='';
    words.forEach(w=>{const u=r(),pick=vocab[Math.floor(r()*vocab.length)];
      if(u<t){noisy++;if(mode==='mask'){h+='<span class="w ph">[mask]</span> '}else{if(pick===w){h+='<span class="w">'+w+'</span> '}else{fake++;h+='<span class="w bad" title="noise">'+pick+'</span> '}}}
      else{shown++;h+='<span class="w">'+w+'</span> '}});
    $('fwdOut').innerHTML=h;
    const vis=mode==='mask'?shown:words.length;
    $('fwdO').innerHTML=mode==='mask'?'Resampled: <b>'+noisy+'</b> of '+words.length+'. Visible words: <b>'+vis+'</b>, every one of them clean, and the model can tell which positions are noise.':
      'Resampled: <b>'+noisy+'</b> of '+words.length+'. Every position shows a real word; <b>'+fake+'</b> of them are noise (highlighted here; the model cannot tell), so the model has to judge all '+words.length+'.'}
  $('fwdT').addEventListener('input',draw);$('fwdR').addEventListener('click',()=>{seed=(seed*7+1)%9973;draw()});
  segBind('fwdM',m=>{mode=m;draw()});draw()})();

// 2. Figure 11 calculator
(function(){const host=$('gpuSvg');if(!host)return;const F=RC.f11,cols=[C1,C2,C3,C4,'#8e6bbf','#9c6b3c','var(--dim)'];
  function render(){const w=host.clientWidth;if(!w)return;const tpf=+$('gpuT').value;$('gpuTv').textContent=tpf.toFixed(2);
    const dg=F.dg.slice();if($('gpuMoE').checked)dg[0]=F.ar[0];if($('gpuSmp').checked)dg[1]=F.ar[1];if($('gpuAtt').checked)dg[2]=F.ar[2];
    const tot=dg.reduce((a,b)=>a+b,0),ar=F.ar.reduce((a,b)=>a+b,0);
    const narrow=w<560,H=narrow?250:230,pl=narrow?96:120,pr=narrow?8:150,bw=Math.min(46,(H-60)/2.6);
    const sx=v=>pl+(w-pl-pr)*v/14;let s='';
    [0,2,4,6,8,10,12,14].forEach(v=>{s+=ln2(sx(v),20,sx(v),H-40,LN)+tx(sx(v),H-26,v,{fs:11,a:'middle',c:MU})});
    s+=tx((pl+w-pr)/2,H-8,'GPU time per step (ms)',{fs:11,a:'middle',c:MU});
    const bar=(y,arr,label,sub)=>{let x=0,o='';arr.forEach((v,i)=>{o+=rc(sx(x),y,sx(x+v)-sx(x)-1,bw,cols[i],{r:2});if(sx(x+v)-sx(x)>30)o+=tx((sx(x)+sx(x+v))/2,y+bw/2+4,v.toFixed(2),{fs:11,a:'middle',c:'#fff'});x+=v});
      o+=tx(pl-8,y+bw/2-2,label,{fs:12,a:'end',w:600})+tx(pl-8,y+bw/2+13,sub,{fs:11,a:'end',c:MU})+tx(sx(x)+6,y+bw/2+4,x.toFixed(2)+' ms',{fs:12,w:600});return o};
    s+=bar(28,F.ar,'Gemma 4 AR','1 token');s+=bar(28+bw+26,dg,'DiffusionGemma','256 tokens');
    // legend
    let lx=narrow?8:w-pr+16,ly=narrow?H+4:30;let leg='';F.ops.forEach((o,i)=>{const lab=o+' ×'+F.ratio[i];if(narrow){const cw=lab.length*6.2+22;if(lx+cw>w){lx=8;ly+=16}leg+=rc(lx,ly-9,10,10,cols[i],{r:2})+tx(lx+14,ly,lab,{fs:11});lx+=cw}else{leg+=rc(lx,ly-9,10,10,cols[i],{r:2})+tx(lx+14,ly,lab,{fs:11});ly+=17}});
    const Ht=narrow?ly+10:H;host.innerHTML=svgW(w,Ht,s+leg,'Per-step GPU time breakdown');
    const e2e=tot+0.93,tps=tpf/(e2e/1000),arT=1000/(ar+0.89);
    $('gpuO').innerHTML='Per step <b>'+tot.toFixed(2)+' ms</b> GPU, <b>'+(tot/F.tot_ar).toFixed(2)+'x</b> the AR step; end to end '+e2e.toFixed(2)+' ms. Speed = '+tpf.toFixed(2)+' / '+e2e.toFixed(2)+' ms = <b>'+fmt(tps)+' tokens/s</b>: <b>'+(tps/204).toFixed(1)+'x</b> plain AR (204) and <b>'+(tps/303).toFixed(1)+'x</b> AR with MTP (303). Break-even with AR at TPF = '+(e2e/4.90).toFixed(2)+'.'}
  ['gpuT','gpuMoE','gpuSmp','gpuAtt'].forEach(id=>$(id).addEventListener(id==='gpuT'?'input':'change',render));fit(host,render)})();

// 3. predict: unique experts
PRED_REVEAL['pr-exp']=function(){const host=$('prExpC');const draw=()=>{const w=host.clientWidth;if(!w)return;
  const rows=[['One token',8,C2,'8 by design'],['256 tokens, independent and uniform',RC.exp_unique,C4,'128.00 (derived)'],['256 tokens, measured (PG-19)',84,C1,'84 (§6)']];
  const pl=Math.min(230,w*0.48),sx=v=>pl+(w-pl-60)*v/128;let s='';rows.forEach((r,i)=>{const y=8+i*30;s+=tx(pl-8,y+15,r[0],{fs:12,a:'end'})+rc(pl,y,sx(r[1])-pl,20,r[2],{r:3})+tx(sx(r[1])+6,y+15,r[3].split(' ')[0],{fs:12,w:600})});
  host.innerHTML=svgW(w,100,s,'Distinct experts per layer')};fit(host,draw);
  $('prExpO').innerHTML='Independent uniform routing would touch all 128 experts (128 × (1 − (120/128)<sup>256</sup>) = 128.00); the canvas actually loads <b>84</b>, because neighbouring tokens route alike. Even so, 84 / 8 = <b>10.5x</b> more expert weights to move per layer, and the MoE kernel gets 4.66 / 1.08 = <b>4.3x</b> slower: part of its time does not grow with the number of experts.'};

// 4. predict: answer length
PRED_REVEAL['pr-len']=function(){const host=$('prLenC');const draw=()=>{const w=host.clientWidth;if(!w)return;
  const rows=[['Gemma 4 (MTP), tokens',7207,C4],['DiffusionGemma, tokens',4001,C1],['Gemma 4 (MTP), forward passes',RC.fw[1],C4],['DiffusionGemma, forward passes',RC.fw[0],C1]];
  const pl=Math.min(220,w*0.46),sx=v=>pl+(w-pl-60)*v/7207;let s='';rows.forEach((r,i)=>{const y=6+i*28;s+=tx(pl-8,y+14,r[0],{fs:12,a:'end'})+rc(pl,y,Math.max(2,sx(r[1])-pl),18,r[2],{r:3})+tx(Math.max(pl+2,sx(r[1]))+6,y+14,fmt(r[1]),{fs:12,w:600})});
  host.innerHTML=svgW(w,122,s,'Answer length and forward passes')};fit(host,draw)};

// 5. Figure 12(b) ratios with the extrapolation
(function(){const host=$('bszSvg');if(!host)return;const F=TB.f12;
  function draw(w){const H=230,pl=40,pr=10,pt=14,pb=44,cs=[1,2,4,8,16,32],xs=i=>pl+(w-pl-pr)*(i+0.5)/cs.length,ys=v=>pt+(H-pt-pb)*(1-v/4.5);let s='';
    [0,1,2,3,4].forEach(v=>{s+=ln2(pl,ys(v),w-pr,ys(v),LN)+tx(pl-6,ys(v)+4,v+'x',{fs:11,a:'end',c:MU})});
    s+=ln2(pl,ys(1),w-pr,ys(1),MU,{da:'5 4',sw:1.5})+tx(w-pr-2,ys(1)-5,'parity',{fs:11,a:'end',c:MU});
    const bw=Math.min(22,(w-pl-pr)/cs.length/2.6);
    F.c.forEach((c,i)=>{const pu=+F.per_user[i],to=+F.total[i];s+=rc(xs(i)-bw-1,ys(pu),bw,ys(0)-ys(pu),C1,{r:2})+rc(xs(i)+1,ys(to),bw,ys(0)-ys(to),C3,{r:2});
      s+=tx(xs(i),ys(Math.max(pu,to))-5,F.total[i],{fs:11,a:'middle'})});
    const g=RC.f12_g,v32=(+F.total[4])*g;s+=rc(xs(5)+1,ys(v32),bw,ys(0)-ys(v32),'none',{s:C3,sw:1.5,da:'4 3',r:2})+tx(xs(5),ys(v32)-5,v32.toFixed(2)+'?',{fs:11,a:'middle',c:MU});
    cs.forEach((c,i)=>{s+=tx(xs(i),H-pb+16,'c = '+c,{fs:11,a:'middle',c:i===5?MU:undefined})});
    s+=rc(pl,H-14,10,10,C1,{r:2})+tx(pl+14,H-5,'per-user throughput',{fs:11})+rc(pl+150,H-14,10,10,C3,{r:2})+tx(pl+164,H-5,'total throughput',{fs:11});
    host.innerHTML=svgW(w,H,s,'DiffusionGemma over Gemma 4 AR (MTP) by concurrent users')}
  fit(host,draw)})();

// 6. quality: per-benchmark dot plot
(function(){const host=$('qualSvg');if(!host)return;let mode='t';
  const rows=TB.t3.rows.filter(r=>!/Output Speed|Tokens Per Forward|Average Total|Codeforces/.test(r.b));
  const seMap={};RC.se.forEach(x=>seMap[x.b]=x.se);
  function draw(){const w=host.clientWidth;if(!w)return;const o=mode==='t'?0:1;
    let R=rows.map(r=>({b:r.b,td:f(r.v[0+o]),ar:f(r.v[2+o]),g:f(r.v[4+o])})).filter(r=>r.td!=null&&r.g!=null);
    if($('qualS').value==='gap')R.sort((a,b)=>(a.td-a.g)-(b.td-b.g));
    const narrow=w<560,pl=narrow?104:150,pr=12,rh=22,H=R.length*rh+40,lo=20,hi=100,sx=v=>pl+(w-pl-pr)*(v-lo)/(hi-lo);let s='';
    [20,40,60,80,100].forEach(v=>{s+=ln2(sx(v),4,sx(v),H-30,LN)+tx(sx(v),H-16,v,{fs:11,a:'middle',c:MU})});
    R.forEach((r,i)=>{const y=12+i*rh;s+=tx(pl-8,y+4,r.b.replace('LiveCodeBench-V6','LiveCodeBench v6'),{fs:11,a:'end'});
      s+=ln2(sx(Math.min(r.td,r.g)),y,sx(Math.max(r.td,r.g)),y,MU,{sw:1.4});
      if(mode==='t'&&seMap[r.b]){const se=seMap[r.b];s+=ln2(sx(r.td-se),y-5,sx(r.td-se),y+5,C1)+ln2(sx(r.td+se),y-5,sx(r.td+se),y+5,C1)+ln2(sx(r.td-se),y,sx(r.td+se),y,C1,{sw:1})}
      if(r.ar!=null)s+='<rect x="'+(sx(r.ar)-4).toFixed(1)+'" y="'+(y-4)+'" width="8" height="8" fill="'+C3+'" transform="rotate(45 '+sx(r.ar).toFixed(1)+' '+y+')"><title>AR mode '+r.ar+'</title></rect>';
      s+='<circle cx="'+sx(r.g).toFixed(1)+'" cy="'+y+'" r="5" fill="'+C4+'"><title>Gemma 4 '+r.g+'</title></circle><circle cx="'+sx(r.td).toFixed(1)+'" cy="'+y+'" r="5" fill="'+C1+'"><title>DiffusionGemma TD '+r.td+'</title></circle>'});
    const L=legend([['DiffusionGemma, diffusion',C1],['same weights, AR mode',C3],['Gemma 4 (MTP)',C4]],8,H+12,w-16);
    host.innerHTML=svgW(w,H+L.h+8,s+L.s,'Benchmark scores');
    const gaps=R.map(r=>r.td-r.g),m=gaps.reduce((a,b)=>a+b,0)/gaps.length,worst=R.reduce((a,b)=>(a.td-a.g)<(b.td-b.g)?a:b);
    const ab=R.filter(r=>r.td>r.g);
    $('qualO').innerHTML=(mode==='t'?'Thinking':'No thinking')+': mean gap <b>'+m.toFixed(1)+'</b> points over '+R.length+' benchmarks; largest '+worst.b+' ('+(worst.td-worst.g).toFixed(1)+'). Diffusion mode above Gemma 4 on: <b>'+(ab.length?ab.map(r=>r.b).join(', '):'none')+'</b>.'+(mode==='n'?'':' MMMU-Pro is held down by the closing-tag bug (Section 10).')}
  segBind('qualM',m=>{mode=m;draw()});$('qualS').addEventListener('change',draw);fit(host,draw)})();
})();
