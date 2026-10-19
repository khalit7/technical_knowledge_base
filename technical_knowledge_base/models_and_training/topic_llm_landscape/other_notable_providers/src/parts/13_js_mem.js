// ---- Two levers: bits per weight set the memory, active parameters set the compute ----
(function(){
  if(!$('mm'))return;
  // [name, total B, active B, published claim to check, claim precision in bits]
  const MD=[
    ['Bonsai 2 27B (Prism ML)',27,27,'Prism: 5.9 GB, "nine times smaller" than 16-bit',1.76],
    ['Qwen3.8 27B (Bonsai\'s source)',27,27,null],
    ['MiniCPM5-2B (OpenBMB)',2.5,2.5,null],
    ['Tiny Aya (Cohere)',3.35,3.35,null],
    ['Phi-4 (Microsoft)',14,14,null],
    ['North Mini Code (Cohere)',30,3,'not a Cohere claim, this page asks whether a 3B-active coder fits one H100 at full precision',16],
    ['Nemotron 3 Nano (NVIDIA)',31.6,3.5,null],
    ['Command A (Cohere)',111,111,'Cohere: deployable on just two GPUs (Command A model card)',8],
    ['North Small Translate (Cohere)',218,25,'Cohere: suggested hardware two H100s or one B200 at W4A4',4],
    ['Hy3 (Tencent)',295,21,null],
    ['MiMo-V2.6-Flash (Xiaomi)',309,15,null],
    ['K2 Horizon 375B (IFM)',375,23,null],
    ['Step 5 Preview (StepFun, weights not yet out)',600,27,null],
    ['Hy4 preview (Tencent)',770,49,'Tencent: about 1.56 TB of weights on Hugging Face',16],
    ['MiMo-V2.6-Pro (Xiaomi)',1020,42,null]];
  const HW=[['RTX 5090',32],['H100',80],['2 × H100',160],['B200',180],['8 × H100',640],['8 × B200',1440]];
  const sel=$('mmM');MD.forEach((m,i)=>{const o=document.createElement('option');o.value=i;o.textContent=m[0];sel.appendChild(o)});
  let bits=1.76;
  function draw(){
    const m=MD[+sel.value],gb=m[1]*bits/8,fl=2*m[2];
    let fit='';HW.forEach(([n,c])=>{const ok=gb<=c;fit+='<span class="tag" style="'+(ok?'color:var(--good);border-color:var(--good)':'color:var(--bad);border-color:var(--bad)')+'">'+(ok?'✓ ':'✗ ')+n+' ('+c+' GB)</span>'});
    let claim='';if(m[3]){const g2=m[1]*m[4]/8;claim='<div class="q" style="grid-column:1/-1"><b>Check:</b> '+m[3]+'. At '+(m[4]===1.76?'1.76':m[4])+' bits the weights alone are '+m[1]+'B × '+m[4]+' ÷ 8 = '+(g2>=100?fmt(g2):g2.toFixed(g2<10?2:1))+' GB'+
      (m[0].startsWith('Command')?', which fits two 80 GB cards (160 GB); at 16 bits it would be '+fmt(m[1]*2)+' GB and would not, so the claim holds at 8-bit precision':m[0].startsWith('North Small')?': under 160 GB for two H100s and under the 180 GB of one B200 (1,440 GB ÷ 8 in a DGX B200)':m[0].startsWith('North Mini')?', under one H100\'s 80 GB':m[0].startsWith('Hy4')?', against 1.56 TB published: about 2.03 bytes per parameter, so the release is essentially all 16-bit':': 16-bit is '+fmt(m[1]*2)+' GB, '+(16/1.76).toFixed(2)+' times more, which is the "nine times"')+'.</div>'}
    $('mmOut').innerHTML=stat('Weights in memory',(gb>=100?fmt(gb):gb.toFixed(gb<10?2:1))+' GB',m[1]+'B parameters × '+bits+' bits ÷ 8')+
      stat('Compute per token',fmt(fl,fl<10?1:0)+' GFLOP','≈ 2 × '+m[2]+'B active parameters')+
      stat('Total ÷ active',(m[1]/m[2]).toFixed(1)+'×',m[1]===m[2]?'dense: every weight used for every token':'only '+(100*m[2]/m[1]).toFixed(1)+'% of weights used per token')+
      '<div style="grid-column:1/-1">'+fit+'</div>'+claim;
    // all models at this precision: memory (x, log) against compute per token (y, log)
    const narrow=$('mm').clientWidth<560,W=narrow?360:720,Hh=narrow?260:300;
    const f=logFrame({W,H:Hh,pl:narrow?44:54,pr:10,pt:12,pb:34,x:[0.4,4000],y:[3,400],
      xt:[[1,'1 GB'],[10,'10'],[100,'100'],[1000,'1,000 GB']],yt:[[5,'5'],[20,'20'],[100,'100'],[400,'400']],xl:'weights in memory at '+bits+' bits (log)',yl:narrow?'GFLOP / token':'compute per token (log)'});
    let s=f.s;HW.forEach(([n,c],i)=>{if(i===2||i===4)return;const x=f.lx(c);s+='<line x1="'+x+'" x2="'+x+'" y1="12" y2="'+(Hh-34)+'" stroke="var(--bad)" stroke-dasharray="3 3" opacity=".6"/><text x="'+(x-3)+'" y="'+(22+i*11)+'" font-size="9.5" text-anchor="end" fill="var(--bad)">'+n+'</text>'});
    MD.forEach((d,i)=>{const x=f.lx(Math.max(.41,d[1]*bits/8)),y=f.ly(Math.max(3.1,2*d[2])),on=i===+sel.value;
      s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+(on?6:4)+'" fill="'+(on?'var(--acc)':'var(--dim)')+'" stroke="var(--bg)"><title>'+d[0]+'</title></circle>';
      if(on)s+='<text x="'+(x+8)+'" y="'+(y-6)+'" font-size="11" font-weight="600">'+d[0].replace(/ \(.*\)/,'')+'</text>'});
    $('mmSvg').innerHTML=svgEl(W,Hh,s,'Memory against compute per token');
  }
  sel.addEventListener('change',()=>{const m=MD[+sel.value];if(m[4]){bits=m[4];$('mmB').querySelectorAll('button').forEach(b=>b.classList.toggle('on',+b.dataset.m===bits))}draw()});
  segBind('mmB',v=>{bits=+v;draw()});
  addEventListener('resize',draw);onTab('t-read',draw);draw();
})();
