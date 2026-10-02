// ---- Reading tab: small inline visuals ----
// GLM-4.5's 96 query heads sharing 8 key-value heads
(function(){const g=$('headGrid'),k=$('kvGrid');if(!g||!k)return;const C=['--c1','--c2','--c3','--c4','--c5','--c6','--acc','--bad'];let s='',t='';
  for(let i=0;i<96;i++){const grp=Math.floor(i/12);s+='<span title="query head '+(i+1)+', key-value group '+(grp+1)+'" style="background:var('+C[grp]+');opacity:.8"></span>'}
  for(let j=0;j<8;j++)t+='<span title="key-value head '+(j+1)+' (cached)" style="background:var('+C[j]+')"></span>';
  g.innerHTML=s;k.innerHTML=t;
  k.insertAdjacentHTML('afterend','<div class="small mute">8 cached key-value heads, one per group of 12 query heads</div>')})();

// Inference-stack throughput by development day (Z.ai Figure 1)
(function(){const el=$('infChart');if(!el)return;
  const D=[[0,1.00,'W8A8 baseline'],[1,1.21,'Async scheduling'],[2,1.42,'Sort kernel optimisation'],[3,1.41,'Hierarchical cache'],[4,1.97,'Layer Split'],[5,2.49,'Context parallel'],[7,2.67,'KV transfer overlap'],[8,2.67,'Mixed-precision cache quantisation'],[9,2.67,'Chunked MQA'],[10,2.85,'Prefill dequant kernel'],[11,3.01,'Fused activation and quantisation'],[13,3.22,'Linear attention (launch)']];
  function draw(){const W=el.clientWidth<520?360:680,nar=W<500,pl=nar?34:44,pr=12,pt=14,pb=34,H=nar?230:250;
    const x=v=>pl+(W-pl-pr)*v/13,y=v=>pt+(H-pt-pb)*(1-(v-.8)/(3.5-.8));let s='';
    [1,1.5,2,2.5,3,3.5].forEach(v=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/><text x="'+(pl-5)+'" y="'+(y(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+v+'×</text>'});
    for(let d=0;d<=13;d+=nar?2:1)s+='<text x="'+x(d)+'" y="'+(H-pb+15)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+d+'</text>';
    s+='<text x="'+((pl+W-pr)/2)+'" y="'+(H-4)+'" font-size="11" text-anchor="middle" fill="var(--mute)">development day</text>';
    s+='<path d="'+D.map((p,i)=>(i?'L':'M')+x(p[0]).toFixed(1)+' '+y(p[1]).toFixed(1)).join('')+'" fill="none" stroke="var(--c1)" stroke-width="2"/>';
    D.forEach((p,i)=>{s+='<circle cx="'+x(p[0])+'" cy="'+y(p[1])+'" r="4" fill="var(--c1)"><title>Day '+p[0]+': '+p[1].toFixed(2)+'× after '+p[2]+'</title></circle>';
      const up=i%2===0;s+='<text x="'+x(p[0])+'" y="'+(y(p[1])+(up?-9:16))+'" font-size="10.5" text-anchor="middle" fill="var(--c1)" font-weight="600">'+p[1].toFixed(2)+'</text>'});
    el.innerHTML=svgEl(W,H,s,'Throughput gain by development day, 1.00 to 3.22 times')+'<div class="small" style="columns:'+(nar?1:2)+';column-gap:18px;margin-top:4px">'+D.map(p=>'<div>Day '+p[0]+': <b>'+p[1].toFixed(2)+'×</b> '+p[2]+'</div>').join('')+'</div>'}
  draw();let w=el.clientWidth;addEventListener('resize',()=>{const n=el.clientWidth;if(n&&(Math.abs(n-w)>30||(n<520)!==(w<520))){w=n;draw()}})})();

// Price calculator: one agentic job on every GLM model (Z.ai list prices per million tokens)
(function(){if(!$('pcTab'))return;
  const P=[['GLM-5.3',1.4,.26,4.4],['GLM-5.2',1.4,.26,4.4],['GLM-5',1,.2,3.2],['GLM-4.7',.6,.11,2.2],['GLM-5.3-FlashX',.37,.075,1.25],['GLM-4.5-Air',.2,.03,1.1],['GLM-5.3-Flash',.15,.03,.5]];
  function upd(){const I=+$('pcIn').value,h=+$('pcHit').value/100,O=+$('pcOut').value,hit=I*h,miss=I-hit;
    $('pcInV').textContent=fmt(I)+'M';$('pcHitV').textContent=Math.round(h*100)+'% ('+fmt(hit,hit%1?1:0)+'M)';$('pcOutV').textContent=fmt(O,1)+'M';
    const rows=P.map(p=>({n:p[0],i:p[1],c:p[2],o:p[3],v:miss*p[1]+hit*p[2]+O*p[3]})),mx=Math.max(...rows.map(r=>r.v)),fl=rows.find(r=>r.n==='GLM-5.3-Flash').v;
    $('pcTab').innerHTML='<tr><th>Model</th><th class="num">Input</th><th class="num">Cached</th><th class="num">Output</th><th>Cost of this job</th><th class="num">× Flash</th></tr>'+rows.map(r=>'<tr><td>'+r.n+'</td><td class="num">$'+r.i.toFixed(2)+'</td><td class="num">$'+r.c.toFixed(3).replace(/0$/,'')+'</td><td class="num">$'+r.o.toFixed(2)+'</td><td><div style="display:flex;align-items:center;gap:6px"><div style="flex:1 1 auto;min-width:40px;height:10px;background:var(--soft);border-radius:2px;position:relative"><div style="position:absolute;left:0;top:0;bottom:0;width:'+(100*r.v/mx).toFixed(1)+'%;background:'+(r.n==='GLM-5.3-Flash'?'var(--good)':'var(--c1)')+';border-radius:2px"></div></div><b>'+usd(r.v,2)+'</b></div></td><td class="num">'+(fl>0?(r.v/fl).toFixed(1):'')+'</td></tr>').join('')}
  ['pcIn','pcHit','pcOut'].forEach(id=>$(id).addEventListener('input',upd));upd()})();

// Open-weight models on the AA Intelligence Index v4.3 against cost per task
(function(){const el=$('aaPlot');if(!el)return;
  // [name, lab, index v4.3, cost per index task USD, price basis note]
  const D=[['GLM-5.3 (max)','Zhipu',44.8,2.0056],['GLM-5.3-Flash','Zhipu',41.8,.2533],['GLM-5.2 (max)','Zhipu',33.7,1.4726],['MiMo-V2.6-Pro','Xiaomi',46.3,.1332],['MiMo-V2.6-Flash','Xiaomi',37.9,.0622],['Kimi K3 (max)','Moonshot',43.6,2.0001],['DeepSeek V4.1 Flash (max)','DeepSeek',39.5,.2652],['DeepSeek V4 Pro 0813 (max)','DeepSeek',36.0,.674],['Qwen3.8 2.4T A95B','Qwen',39.9,2.1559],['Qwen3.8-Flash-Next','Qwen',39.8,.3722],['Qwen3.8 27B (xhigh)','Qwen',33.7,1.0073],['MiniMax-M3','MiniMax',29.2,.5076],['Hy3','Tencent',25.3,.0718,1],['Muse Glimmer (high)','Meta',17.5,.0567,1],['Mistral Medium 3.5','Mistral',14.2,.502],['gpt-oss-120b (high)','OpenAI',11.6,.1074,1],['Mistral Small 4','Mistral',11.3,.015],['Mistral Large 3','Mistral',9.3,.0311]];
  const fr=[];let best=-1;[...D].sort((a,b)=>a[3]-b[3]).forEach(d=>{if(d[2]>best){fr.push(d);best=d[2]}});
  let sel='GLM-5.3-Flash';
  function draw(){const cw=el.clientWidth,W=cw<520?Math.max(300,cw):680,nar=W<500,H=nar?300:330;
    const f=logFrame({W,H,pl:38,pr:12,pt:12,pb:38,x:[.01,5],y:[1,60],xt:[[.01,'$0.01'],[.1,'$0.10'],[1,'$1'],[5,'$5']],yt:[],xl:'cost per index task (log scale)'});
    const ly=v=>12+(H-12-38)*(1-v/50);let s='';
    [0,10,20,30,40,50].forEach(v=>{s+='<line x1="38" x2="'+(W-12)+'" y1="'+ly(v)+'" y2="'+ly(v)+'" stroke="var(--line)"/><text x="32" y="'+(ly(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+v+'</text>'});
    s+=f.s;s+='<text x="12" y="'+((H-38)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 12 '+((H-38)/2)+')">index v4.3</text>';
    let p='';fr.forEach((d,i)=>{const X=f.lx(d[3]),Y=ly(d[2]);p+=(i?'H'+X.toFixed(1)+'V'+Y.toFixed(1):'M'+X.toFixed(1)+' '+Y.toFixed(1))});p+='H'+(W-12);
    s+='<path d="'+p+'" fill="none" stroke="var(--good)" stroke-width="1.5" stroke-dasharray="4 3"/>';
    let lab='';// labels drawn after every dot, so no dot covers one
    D.forEach(d=>{const z=d[1]==='Zhipu',X=f.lx(d[3]),Y=ly(d[2]),on=d[0]===sel;
      s+='<circle class="aad" data-n="'+d[0]+'" cx="'+X.toFixed(1)+'" cy="'+Y.toFixed(1)+'" r="'+(z?6:4.5)+'" fill="'+(z?'var(--c1)':'var(--dim)')+'" stroke="'+(on?'var(--ink)':'var(--bg)')+'" stroke-width="'+(on?2:1)+'" style="cursor:pointer"><title>'+d[0]+': '+d[2]+' at $'+d[3].toFixed(2)+' per task</title></circle>';
      const dy={'Kimi K3 (max)':15,'MiMo-V2.6-Pro':16,'GLM-5.3 (max)':4}[d[0]];// a label sits right of its dot unless it would run past the plot's right edge, then left of it
      const left=d[3]>1.5||X+8+textW(d[0],10.5,z?600:400)>W-4;
      if(z||(!nar&&(d[0]==='MiMo-V2.6-Pro'||d[0]==='Kimi K3 (max)')))lab+='<text x="'+(X+(left?-9:8)).toFixed(1)+'" y="'+(Y+(dy==null?4:dy)).toFixed(1)+'" font-size="10.5" text-anchor="'+(left?'end':'start')+'"'+(z?' fill="var(--c1)" font-weight="600"':' fill="var(--mute)"')+'>'+d[0]+'</text>'});
    el.innerHTML=svgEl(W,H,s+lab,'Open-weight models, index against cost per task');
    el.querySelectorAll('.aad').forEach(c=>c.addEventListener('click',()=>{sel=c.dataset.n;draw()}));
    const d=D.find(x=>x[0]===sel);$('aaOut').innerHTML=stat(d[0],d[2].toFixed(1)+' on v4.3',usd(d[3],2)+' per index task'+(d[4]?' (third-party median price)':''))+stat('Cost per index point',usd(d[3]/d[2],3),'= cost per task / index')+stat('On the frontier?',fr.includes(d)?'Yes':'No',fr.includes(d)?'no model is both cheaper and better':'a cheaper model scores at least as high')}
  draw();let w=el.clientWidth;addEventListener('resize',()=>{const n=el.clientWidth;if(n&&(Math.abs(n-w)>30||(n<520)!==(w<520))){w=n;draw()}})})();
