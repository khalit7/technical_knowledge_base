// ---- Reading: the measured charts (permutation, position probe, runs), the one-pair dial, the base census and YaRN's bands ----
(function(){
  if(!window.PE_DATA||!window.PE)return;
  const {D,fmt,f2,css,esc,pend}=window.PE,RD=window.RD,$=id=>document.getElementById(id);
  const SC=[['learned','Learned','--c4'],['sinusoidal','Sinusoidal','--c2'],['sinusoidal x16','Sinusoidal, embeddings × 16','--c5'],['alibi','ALiBi','--c3'],['nope','NoPE','--mute'],['rope','RoPE','--c1']];
  const line=(pts,col,w,da)=>{let d='';pts.forEach(([x,y],i)=>{d+=(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)});return '<path d="'+d+'" fill="none" stroke="'+col+'" stroke-width="'+(w||2)+'"'+(da?' stroke-dasharray="'+da+'"':'')+'/>'};
  const T=(x,y,s,o)=>RD.t(x,y,s,Object.assign({fill:'var(--mute)'},o||{}));
  // generic small line chart over blocks 0..6
  function blockChart(el,series,ymin,ymax,ylab,yt,log){const W=RD.width(el),H=W<520?210:240,ml=46,mr=12,mt=10,mb=34,pw=W-ml-mr,ph=H-mt-mb;
    const X=i=>ml+i/6*pw,Y=v=>{const t=log?(Math.log10(Math.max(v,ymin))-Math.log10(ymin))/(Math.log10(ymax)-Math.log10(ymin)):(v-ymin)/(ymax-ymin);return mt+(1-Math.max(0,Math.min(1,t)))*ph};
    let g='';yt.forEach(([v,l])=>{g+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+T(ml-5,Y(v)+4,l,{a:'end'})});
    for(let i=0;i<=6;i++)g+=T(X(i),H-mb+15,i===0?'emb':'block '+i,{a:i===0?'start':i===6?'end':'middle'});
    g+=T(12,mt+ph/2,ylab,{a:'middle'}).replace('<text','<text transform="rotate(-90 12 '+(mt+ph/2)+')"');
    series.forEach(s=>{g+=line(s.v.map((v,i)=>[X(i),Y(v)]),css(s.c),2.2);s.v.forEach((v,i)=>{g+='<circle cx="'+X(i).toFixed(1)+'" cy="'+Y(v).toFixed(1)+'" r="3" fill="'+css(s.c)+'"><title>'+esc(s.n)+', '+(i?'block '+i:'embedding')+': '+v+'</title></circle>'})});
    el.innerHTML=RD.svg(W,H,g,ylab);
    return SC.filter(([k])=>series.some(s=>s.k===k)).map(([k,n,c])=>'<span class="pe-chk"><i style="background:'+css(c)+'"></i>'+n+'</span>').join('')}
  function drawPerm(){const el=$('pe-why-perm-svg');if(!el)return;const P=D.probe.permutation_rel_change_token255_by_block||{};
    const ser=SC.filter(([k])=>P[k]).map(([k,n,c])=>({k,n,c,v:P[k].map(x=>Math.max(x,1e-7))}));
    const leg=blockChart(el,ser,1e-7,1,'relative change of token 255',[[1e-7,'1e-7'],[1e-5,'1e-5'],[1e-3,'0.001'],[0.1,'0.1'],[1,'1']],true);
    const n=P.nope,r=P.rope;
    $('pe-why-perm-cap').innerHTML='<span class="pe-legs" style="display:flex">'+leg+'</span>Relative change ‖h − h<sub>shuffled</sub>‖ / ‖h‖ of token 255\'s residual stream after each block, one random shuffle (seed 0) of tokens 0 to 254, log scale (values under 10<sup>−7</sup> drawn at 10<sup>−7</sup>). '+(n?'NoPE: '+n.map(x=>x<1e-5?x.toExponential(0):f2(x,3)).join(', ')+'. Block 1 sees a set, so token 255 is unchanged up to float32 rounding; from block 2 the earlier tokens carry what their own prefixes were, and the change appears. ':pend+' for NoPE. ')+(r?'RoPE changes from block 1 ('+f2(r[1],3)+'), because each key\'s rotation encodes where it now sits.':'')+' Measured on Apple M1 Pro (CPU), src/probe/probe.py.'}
  function drawProbe(){const el=$('pe-why-probe-svg');if(!el)return;const P=D.probe.position_probe_r2_by_block||{};
    const ser=SC.filter(([k])=>P[k]).map(([k,n,c])=>({k,n,c,v:P[k]}));
    const leg=blockChart(el,ser,-0.1,1,'probe R² (held out)',[[0,'0'],[0.25,'0.25'],[0.5,'0.5'],[0.75,'0.75'],[1,'1']]);
    $('pe-why-probe-cap').innerHTML='<span class="pe-legs" style="display:flex">'+leg+'</span>Ridge regression from the 256-dimension residual stream to the position index 0 to 255, fitted on 24 validation windows and scored on 8 others (R<sup>2</sup> on the held-out windows; below 0 means worse than predicting the mean). Absolute schemes write position into the input and it fades with depth; NoPE builds it from the causal mask; RoPE keeps position inside the attention scores and leaves little in the stream. The sinusoidal line is the model trained with its token embeddings × 16 (below). Measured on Apple M1 Pro (CPU), src/probe/probe.py.'}
  // the one-pair dial (carried from the Architecture Gallery's 2026-10-02 build)
  function drawDial(){if(!$('pe-dial'))return;const th=0.5,sh=+$('pe-dialS').value,o=+$('pe-dialO').value,m=3+sh,n=m+o,a=m*th,b=n*th;
    $('pe-dialSv').textContent=sh+' (m = '+m+', n = '+n+')';$('pe-dialOv').textContent=o;
    const q=[Math.cos(a),Math.sin(a)],k=[Math.cos(b),Math.sin(b)],dot=q[0]*k[0]+q[1]*k[1];
    const W=Math.min(360,RD.width($('pe-dialSvg'))),C=Math.min(95,W/2-60),cx=W/2,cy=C+20,H=2*C+40,Pp=v=>[cx+C*v[0],cy-C*v[1]],pq=Pp(q),pk=Pp(k);
    let s='<circle cx="'+cx+'" cy="'+cy+'" r="'+C+'" fill="none" stroke="var(--line)"/><line x1="'+(cx-C-6)+'" y1="'+cy+'" x2="'+(cx+C+6)+'" y2="'+cy+'" stroke="var(--line)"/><line x1="'+cx+'" y1="'+(cy-C-6)+'" x2="'+cx+'" y2="'+(cy+C+6)+'" stroke="var(--line)"/>';
    const r=34,st=24;let d='';for(let i=0;i<=st;i++){const t=a+(b-a)*i/st;d+=(i?'L':'M')+(cx+r*Math.cos(t)).toFixed(1)+' '+(cy-r*Math.sin(t)).toFixed(1)}
    s+='<path d="'+d+'" fill="none" stroke="'+css('--c5')+'" stroke-width="2"/>';
    const lab=(p,v,txt,c,dy)=>'<line x1="'+cx+'" y1="'+cy+'" x2="'+p[0].toFixed(1)+'" y2="'+p[1].toFixed(1)+'" stroke="'+c+'" stroke-width="2.5"/><circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="3.5" fill="'+c+'"/>'+RD.t((p[0]+(v[0]>=0?6:-6)).toFixed(1),(p[1]+dy).toFixed(1),txt,{fs:12.5,fill:c,a:v[0]<0?'end':'start'});
    s+=lab(pq,q,'q at m = '+m,css('--c1'),-4)+lab(pk,k,'k at n = '+n,css('--c2'),14);
    $('pe-dialSvg').innerHTML=RD.svg(W,H,s,'Query and key rotated by RoPE');
    $('pe-dialOut').innerHTML=RD.stat('q rotated by '+f2(a,1)+' rad','('+f2(q[0],4)+', '+f2(q[1],4)+')','')+RD.stat('k rotated by '+f2(b,1)+' rad','('+f2(k[0],4)+', '+f2(k[1],4)+')','')+RD.stat('q · k',f2(dot,4),'cos((n − m) θ) = '+f2(Math.cos(o*th),4))}
  if($('pe-dial'))['pe-dialS','pe-dialO'].forEach(i=>$(i).addEventListener('input',drawDial));
  // base census: rope_theta against the max context, every RoPE config the topic holds
  const cenS={y:'ctx'};
  const SUPX=e=>String(e).split('').map(c=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[+c]).join('');
  function drawCen(){const el=$('pe-cenSvg');if(!el)return;const rows=(D.census||[]).filter(r=>r.scheme==='RoPE'&&r.theta);
    const W=RD.width(el),H=W<520?300:340,ml=50,mr=12,mt=12,mb=38,pw=W-ml-mr,ph=H-mt-mb;
    const lt=Math.log10,y0=3.8,y1=11.2,Y=v=>mt+(1-(lt(v)-y0)/(y1-y0))*ph;let g='';
    const SUP={4:'⁴',5:'⁵',6:'⁶',7:'⁷',8:'⁸',9:'⁹',10:'¹⁰',11:'¹¹'};
    [4,5,6,7,8,9,10,11].forEach(e=>{const v=Math.pow(10,e);g+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+T(ml-5,Y(v)+4,'10'+SUP[e],{a:'end'})});
    const sorted=rows.slice().sort((a,b)=>a.theta-b.theta||(a.max_pos||0)-(b.max_pos||0));
    let X,pts;
    if(cenS.y==='ctx'){const x0=3,x1=7.2;X=v=>ml+(lt(v)-x0)/(x1-x0)*pw;
      [1e3,1e4,1e5,1e6,1e7].forEach(v=>{g+=T(X(v),H-mb+15,v>=1e6?(v/1e6)+'M':(v/1e3)+'K',{a:'middle'})});
      g+=T(ml+pw/2,H-4,'max_position_embeddings (log)',{a:'middle'});pts=rows.map(r=>[X(r.max_pos||1e3),Y(r.theta),r])}
    else{X=i=>ml+(i+.5)/sorted.length*pw;g+=T(ml+pw/2,H-4,'configs, sorted by base',{a:'middle'});pts=sorted.map((r,i)=>[X(i),Y(r.theta),r])}
    g+=T(12,mt+ph/2,'rope_theta (log)',{a:'middle'}).replace('<text','<text transform="rotate(-90 12 '+(mt+ph/2)+')"');
    pts.forEach(([x,y,r])=>{const c=r.scaling?css('--c1'):css('--c2');g+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="4.5" fill="'+c+'" fill-opacity=".75" stroke="var(--bg)"><title>'+esc(r.repo)+': base '+fmt(r.theta)+', '+(r.rot_dims||'?')+' rotated dims, max '+fmt(r.max_pos||0)+(r.scaling?', '+r.scaling.type+' x'+(r.scaling.factor||''):'')+'</title></circle>'});
    // label the extremes and a few landmarks
    const lab=['tiiuae/Falcon-H1-34B-Base','mistralai/Mistral-Small-3.1-24B-Base-2503','Qwen/Qwen3-Next-80B-A3B-Instruct','meta-llama/Llama-3.1-8B','huggyllama/llama-7b','HuggingFaceTB/SmolLM3-3B-Base'];
    pts.forEach(([x,y,r])=>{if(lab.includes(r.repo)&&W>=480){const nm=r.repo.split('/')[1].replace(/-Base.*|-Instruct.*|-24B.*|-80B.*|-8B$|-3B$/,'');g+=RD.t((x+(x>W*0.7?-7:7)).toFixed(1),(y-6).toFixed(1),esc(nm),{fs:11,fill:'var(--ink)',a:x>W*0.7?'end':'start'})}});
    el.innerHTML=RD.svg(W,H,g,'RoPE base of every config');
    const c=k=>rows.filter(k).length,b=rows.map(r=>r.theta).sort((a,b)=>a-b);
    $('pe-cenOut').innerHTML=RD.stat('RoPE configs',rows.length,'of '+(D.census||[]).length+' read')+RD.stat('Base 10,000',c(r=>r.theta===10000),'the 2021 default, still common')+RD.stat('Base ≥ 1,000,000',c(r=>r.theta>=1e6),'mostly 2024 and later')+RD.stat('Ship a scaling',c(r=>r.scaling),'rope_scaling or rope_parameters type')+RD.stat('Range',fmt(b[0])+' to 10'+SUPX(Math.round(Math.log10(b[b.length-1]))),'');
    $('pe-cenCap').innerHTML='<span class="pe-chk"><i style="background:'+css('--c1')+'"></i>ships a RoPE scaling</span><span class="pe-chk"><i style="background:'+css('--c2')+'"></i>no scaling in the config</span><br>Every config with RoPE in the root\'s data, the root\'s map inputs and this page\'s inputs (Hugging Face config.json, fetched 2026-10-03 to 2026-10-18; gated repos from public mirrors), read by src/census/census.py. Hover a dot for the model. The base of a decoupled MLA key (DeepSeek, Kimi K2, GLM-5) is the base of its 64 rotated dimensions. The full table is on the <a href="#" data-tab="t-spec">Every config</a> tab.'}
  if($('pe-cenY'))$('pe-cenY').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;cenS.y=b.dataset.y;[...$('pe-cenY').children].forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b)});drawCen()});
  if($('pe-cenCap'))RD.tabLinks($('pe-cenCap'));
  // training runs: held-out (or training) loss against step, one line per scheme; table under it
  const runS={v:'val'};
  function drawRuns(){const el=$('pe-runsSvg');if(!el)return;const rs=(D.runs||[]).filter(r=>!r.pending);
    const W=RD.width(el),H=W<520?240:280,ml=46,mr=12,mt=10,mb=34,pw=W-ml-mr,ph=H-mt-mb,ymin=2,ymax=runS.v==='val'?4.6:4.6;
    const X=s=>ml+s/1500*pw,Y=v=>mt+(1-(Math.min(ymax,Math.max(ymin,v))-ymin)/(ymax-ymin))*ph;let g='';
    for(let v=ymin;v<=ymax+1e-9;v+=0.5)g+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+T(ml-5,Y(v)+4,f2(v,1),{a:'end'});
    [0,500,1000,1500].forEach(s=>{g+=T(X(s),H-mb+15,fmt(s),{a:s===0?'start':s===1500?'end':'middle'})});
    g+=T(ml+pw/2,H-4,'training step (8,192 tokens each)',{a:'middle'});
    g+=T(12,mt+ph/2,runS.v==='val'?'held-out loss (20 windows)':'training loss',{a:'middle'}).replace('<text','<text transform="rotate(-90 12 '+(mt+ph/2)+')"');
    rs.forEach(r=>{const c=SC.find(x=>x[0]===r.scheme);const cur=(runS.v==='val'?r.val_curve:r.train_curve).filter(p=>p[0]>=(runS.v==='val'?250:50));
      g+=line(cur.map(([s,v])=>[X(s),Y(v)]),css(c[2]),r.seed?1.4:2.2,r.seed?'4 3':'')});
    el.innerHTML=RD.svg(W,H,g,'Loss curves of the position schemes');
    $('pe-runsLeg').innerHTML=SC.map(([k,n,c])=>'<span class="pe-chk"><i style="background:'+css(c)+'"></i>'+n+'</span>').join('')+'<span class="pe-chk">dashed: seed 1</span>';
    const tb=$('pe-runsT').querySelector('tbody');
    tb.innerHTML=(D.runs||[]).map(r=>{const c=SC.find(x=>x[0]===r.scheme);if(r.pending)return '<tr><td>'+c[1]+(r.seed?' (seed '+r.seed+')':'')+'</td><td colspan="5">'+pend+'</td></tr>';
      return '<tr><td>'+c[1]+(r.seed?' (seed '+r.seed+')':'')+'</td><td class="num">'+fmt(r.position_params)+'</td><td class="num">'+(r.val_100!=null?f2(r.val_100,3):'')+'</td><td class="num">'+(r.running_seq_loss!=null?f2(r.running_seq_loss,3):'')+'</td><td class="num">'+fmt(r.tok_s)+'</td><td>'+esc((r.greedy_prompt0||'').replace(/\s+/g,' ').slice(0,90))+'</td></tr>'}).join('');
    const r0=(D.runs||[]).find(r=>r.greedy_prompt0);
    $('pe-runsCap').innerHTML='All runs: 1,500 steps, batch 32 × 256, lr 3 × 10<sup>−3</sup>, 100 warmup steps, cosine to 10%, clip 1.0, fp32 on MPS, torch '+((r0&&(D.runs||[]).find(r=>r.torch)||{}).torch||'')+'. Held-out loss on 100 fixed validation windows (eval.py); the curve uses the 20-window check during training. The greedy text continues prompt 1 of the topic\'s 8 fixed prompts'+(r0?' ("'+esc(r0.prompt0)+'")':'')+'. Measured on Apple M1 Pro; the order of the schemes inside 256 tokens at this size does not transfer to large models, the mechanism past 256 does.'}
  if($('pe-runsV'))$('pe-runsV').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;runS.v=b.dataset.v;[...$('pe-runsV').children].forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b)});drawRuns()});
  // measured extension table
  function drawExt(){const tb=$('pe-extT');if(!tb)return;const L=['plain','linear x4','linear x8','ntk x4','ntk x8','yarn x4','yarn x8','yarn x8, no temperature','temperature only (x8)'];
    const NM={'plain':'No scaling','linear x4':'Position Interpolation ×4','linear x8':'Position Interpolation ×8','ntk x4':'NTK-aware ×4','ntk x8':'NTK-aware ×8','yarn x4':'YaRN ×4','yarn x8':'YaRN ×8','yarn x8, no temperature':'YaRN ×8 frequencies, no temperature','temperature only (x8)':'Temperature only (1.459 on the logits), plain frequencies'};
    const rows=L.map(s=>window.PE.past('at_mha',s)).filter(Boolean);const best={};['0-255','256-511','512-1023','1024-2047'].forEach(k=>{best[k]=Math.min(...rows.map(r=>r[k]))});
    tb.querySelector('tbody').innerHTML=rows.map(r=>'<tr><td>'+NM[r.scaling]+'</td>'+['0-255','256-511','512-1023','1024-2047'].map(k=>'<td class="num">'+(r[k]===best[k]?'<b>'+f2(r[k],3)+'</b>':f2(r[k],3))+'</td>').join('')+'</tr>').join('')}
  // YaRN bands: turns per pair in the original context, kept / ramp / interpolated (carried from the Gallery's 2026-10-02 build)
  const YB=['tiny','oss','dsv3','dsv4','kimik2','qwen3','olmo3','mistral3'];let ybCur='oss';
  function drawYb(){const el=$('pe-ybSvg');if(!el)return;const P=D.presets[ybCur],d=P.dim,np=d/2,be=P.beta_fast||32,al=P.beta_slow||1,sc=P.s,Lo=P.L;
    const W=RD.width(el),H=220,pl=48,pr=10,pt=12,pb=34;const rs=[];for(let i=0;i<np;i++)rs.push(Lo/(2*Math.PI*Math.pow(P.base,2*i/d)));
    const lo=1e-4,hi=1e4,lg=Math.log10,y=v=>pt+(H-pt-pb)*(1-(lg(Math.max(lo,Math.min(hi,v)))-lg(lo))/(lg(hi)-lg(lo))),bw=(W-pl-pr)/np;
    const ramp=window.ROPE.yarnRamp(P,sc);let s='';
    [[1e-4,'0.0001'],[1e-2,'0.01'],[1,'1'],[100,'100'],[1e4,'10,000']].forEach(([v,l])=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+T(pl-5,y(v)+4,l,{a:'end'})});
    [[al,'α = '+al],[be,'β = '+be]].forEach(([v,l],j)=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--mute)" stroke-dasharray="4 3"/>'+T(W-pr-2,y(v)-3-(j&&be===al?12:0),l,{a:'end'})});
    let keep=0,rmp=0,intp=0;
    rs.forEach((r,i)=>{const g=ramp[i],c=g===0?css('--c1'):g===1?css('--c2'):css('--c5');if(g===0)keep++;else if(g===1)intp++;else rmp++;
      const x=pl+i*bw+bw*.12,yy=y(r);s+='<rect x="'+x.toFixed(1)+'" y="'+yy.toFixed(1)+'" width="'+(bw*.76).toFixed(1)+'" height="'+Math.max(0,H-pb-yy).toFixed(1)+'" fill="'+c+'"><title>pair '+i+': '+(r>=1?f2(r,1):r.toPrecision(2))+' turns in '+fmt(Lo)+' tokens</title></rect>'});
    s+=T(pl+(W-pl-pr)/2,H-6,'RoPE pair i (0 = fastest), '+np+' pairs',{a:'middle'});
    s+=T(12,(pt+H-pb)/2,'turns in original context',{a:'middle'}).replace('<text','<text transform="rotate(-90 12 '+((pt+H-pb)/2)+')"');
    el.innerHTML=RD.svg(W,H,s,'Turns per RoPE pair in the original context');
    const t=window.ROPE.mscale(sc);
    $('pe-ybOut').innerHTML='<div class="pe-legs"><span class="pe-chk"><i style="background:'+css('--c1')+'"></i>kept: '+keep+'</span><span class="pe-chk"><i style="background:'+css('--c5')+'"></i>ramp: '+rmp+'</span><span class="pe-chk"><i style="background:'+css('--c2')+'"></i>divided by '+sc+': '+intp+'</span></div>'+esc(P.name)+': base '+fmt(P.base)+', '+d+' rotated dims, original '+fmt(Lo)+', factor '+sc+'. Temperature 0.1 ln '+sc+' + 1 = <b>'+f2(t,3)+'</b> (logits × '+f2(t*t,3)+')'+(ybCur==='mistral3'?', switched off in this config (apply_scale false)':'')+(ybCur==='kimik2'?'; β = α = 1, so the ramp collapses to a step at one turn':'')+(ybCur==='dsv4'?'; every pair turns at least once in 65,536 tokens, so none is fully interpolated':'')+'.'}
  if($('pe-ybP')){$('pe-ybP').innerHTML=YB.map(k=>'<button data-k="'+k+'"'+(k===ybCur?' class="on"':'')+'>'+esc(D.presets[k].name.replace(' (decoupled key)',''))+'</button>').join('');
    $('pe-ybP').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;ybCur=b.dataset.k;[...$('pe-ybP').children].forEach(x=>x.classList.toggle('on',x===b));drawYb()})}
  const all=()=>{drawPerm();drawProbe();drawDial();drawCen();drawRuns();drawYb()};
  {const d=$('pe-yb')&&$('pe-yb').closest('details');if(d)d.addEventListener('toggle',()=>{if(d.open)drawYb()})}
  RD.onRender(all);RD.onResize(all);all();
})();
