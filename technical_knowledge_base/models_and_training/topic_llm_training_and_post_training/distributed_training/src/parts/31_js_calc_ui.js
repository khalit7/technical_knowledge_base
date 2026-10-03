// ---- Layout calculator tab: controls, memory bar, communication bars, reproduction notes ----
(function(){
  const $=id=>document.getElementById(id);
  if(!$('lc'))return;
  const L=window.LAY;
  const opt=(v,t,sel)=>'<option value="'+v+'"'+(sel?' selected':'')+'>'+t+'</option>';
  $('lcMo').innerHTML=Object.entries(L.M).map(([k,m])=>opt(k,m.name)).join('');
  $('lcR').innerHTML=Object.entries(L.RECIPES).map(([k,r])=>opt(k,r.name)).join('');
  $('lcG').innerHTML=Object.entries(L.GPUS).map(([k,g])=>opt(k,g.name)).join('');
  const pw=(a,b)=>{const r=[];for(let x=a;x<=b;x*=2)r.push(x);return r};
  $('lcTP').innerHTML=pw(1,16).map(v=>opt(v,v)).join('');$('lcCP').innerHTML=pw(1,32).map(v=>opt(v,v)).join('');
  $('lcPP').innerHTML=pw(1,32).map(v=>opt(v,v)).join('');$('lcDP').innerHTML=pw(1,1024).map(v=>opt(v,v)).join('');
  $('lcEP').innerHTML=pw(1,256).map(v=>opt(v,v)).join('');
  const ids=['lcMo','lcR','lcG','lcTP','lcCP','lcPP','lcDP','lcEP','lcZ','lcS','lcM','lcA','lcI','lcF'];
  function load(k){const p=Object.assign({TP:1,CP:1,PP:1,DP:1,EP:1,zero:0,recipe:'zero16',gpu:'h100',s:8192,m:1,mfu:0.4},L.PRESETS[k]);
    $('lcMo').value=p.model;$('lcR').value=p.recipe;$('lcG').value=p.gpu;$('lcTP').value=p.TP;$('lcCP').value=p.CP;$('lcPP').value=p.PP;$('lcDP').value=p.DP;$('lcEP').value=p.EP;
    $('lcZ').value=p.zero;$('lcS').value=p.s;$('lcM').value=p.m;$('lcA').value=p.acts===false?'off':'store';$('lcI').value=p.copies===2?'dual':'1f1b';$('lcF').value=Math.round(p.mfu*100)}
  function read(){const dual=$('lcI').value==='dual',PP=+$('lcPP').value,md=$('lcMo').value;
    const o={model:md,recipe:$('lcR').value,gpu:$('lcG').value,TP:+$('lcTP').value,CP:+$('lcCP').value,PP,DP:+$('lcDP').value,EP:L.M[md].k?+$('lcEP').value:1,
      zero:+$('lcZ').value,s:+$('lcS').value,m:Math.max(1,Math.round(+$('lcM').value||1)),acts:$('lcA').value!=='off',ckpt:$('lcA').value==='full'?'full':'store',mfu:+$('lcF').value/100};
    if(dual){o.copies=2;o.inflight=PP+1}
    if(md==='deepseek_v3')o.disp_bytes=1;
    return o}
  const f1=v=>v>=100?v.toFixed(0):v>=10?v.toFixed(1):v.toFixed(2);
  const tm=s=>s<1?(1000*s).toFixed(0)+' ms':s.toFixed(2)+' s';
  function warn(o,md){const w=[];
    if(md.L&&md.L%o.PP)w.push(md.L+' layers do not divide evenly into '+o.PP+' stages (real runs move a layer or two, as Llama 3 does at the ends).');
    if(md.nh&&md.nh%o.TP)w.push(md.nh+' attention heads do not divide by TP = '+o.TP+'.');
    if(o.TP>8)w.push('TP above 8 crosses servers: every layer\'s all-reduces go over the network.');
    if(md.k&&o.EP>1&&(o.DP*o.CP)%o.EP)w.push('EP must divide DP × CP: the expert groups are carved out of the data-parallel ranks.');
    if(md.k&&md.E%(o.EP))w.push(md.E+' experts do not divide by EP = '+o.EP+'.');
    if(!md.k&&+$('lcEP').value>1)w.push('EP applies only to an MoE model; ignored.');
    if(o.m<o.PP&&o.PP>1)w.push('Fewer micro-batches than stages: the pipeline bubble is at least '+Math.round(100*(o.PP-1)/(o.m+o.PP-1))+'% of the timeline.');
    return w}
  function repro(k,r){const p=L.PRESETS[k];
    if(k==='zero75'){const z=+$('lcZ').value,pr=['120','31.4','16.6','1.88'][z];
      return '<b>Defaults reproduce ZeRO Table 1 independently</b> (2 + 2 + 12 bytes, sharded over 64): stage '+z+' gives '+f1(r.states)+' GB; the paper prints '+pr+' GB. Switch the stage to check the other three.'}
    if(k.startsWith('l405')){const row={l405_8k_8k:[8192,64,32,8192,430,43],l405_8k_16k:[16384,128,16,8192,400,41],l405_128k:[16384,8,16,131072,380,38]}[k];
      return '<b>Reproduces Llama 3 Table 4 by construction</b>: TP × CP × PP × DP = '+r.N.toLocaleString('en-GB')+' GPUs (printed '+row[0].toLocaleString('en-GB')+'); DP × batch per DP × sequence = '+row[1]+' × '+row[2]+' × '+row[3].toLocaleString('en-GB')+' = '+r.tokens.toLocaleString('en-GB')+' tokens ("16M"); '+row[4]+' TFLOP/s ÷ 989.5 = '+(100*row[4]/989.5).toFixed(1)+'% MFU (printed '+row[5]+'%). Memory is an estimate, not a reproduction: '+f1(r.total)+' GB at the defaults'+(k==='l405_128k'?', the same as at 8K because CP = 16 absorbs the 16-fold longer sequence; compute time leaves out attention FLOPs, which at 128K add about two thirds on top of 6N (3 × 2 × s × h × L per token for causal attention, derived), so the real step is longer':', consistent with Meta training 8K sequences "without activation checkpointing" but with little room')+'.'}
    if(k==='dsv3'){const c=r.t_comp,cm=Object.values(r.t).reduce((a,b)=>a+b,0);
      return '<b>By construction</b> from §3.2: 16 × 128 = 2,048 H800s; 256 experts ÷ EP 64 = 4 per GPU; 64 ÷ 8 = 8 servers; 15,360 sequences × 4,096 = 62.9M tokens per step (m = 120 per DP rank). <b>Independently</b>: compute '+tm(c)+' against communication '+tm(cm)+' per step, '+(c/cm).toFixed(2)+' : 1, the same order as the report\'s "approximately 1:1" for cross-node expert parallelism, almost all of it expert all-to-all. <b>Does not reproduce</b> the memory: the GPT-style activation estimate gives '+f1(r.total)+' GB, over 80, because it ignores DeepSeek\'s recomputation of RMSNorm and MLA up-projections and its FP8 activation caching.'}
    if(k==='l8b_fsdp')return '<i class="nl i">illustrative</i> The Ultra-Scale Playbook\'s first case, a model under 10B on one server with ZeRO-3: '+f1(r.states)+' GB of states plus '+f1(r.A)+' GB of activations for one 8K sequence per GPU.';
    return 'Custom layout: no published figure to compare against.'}
  let cur=$('lcP').value;
  function draw(){const o=read(),md=L.M[o.model],r=L.layout(o);$('lcFv').textContent=$('lcF').value;
    $('lcEP').disabled=!md.k;
    $('lcO').innerHTML=RD.stat('GPUs',r.N.toLocaleString('en-GB'),'TP × CP × PP × DP')+
      RD.stat('Parameters per GPU',f1((r.pd+r.pe)/1e9)+'B',(r.pe?'dense '+f1(r.pd/1e9)+'B + experts '+f1(r.pe/1e9)+'B':'of '+f1(md.P/1e9)+'B'))+
      RD.stat('Memory per GPU',f1(r.total)+' GB',(r.total>r.mem?'over the '+r.mem+' GB card':(r.mem-r.total).toFixed(1)+' GB to spare of '+r.mem))+
      RD.stat('Tokens per step',(r.tokens/1e6).toFixed(1)+'M','DP × m × sequence');
    const mx=Math.max(r.total,r.mem)*1.08,seg=(v,c)=>'<span style="width:'+(100*v/mx).toFixed(2)+'%;background:'+c+'" title="'+f1(v)+' GB"></span>';
    $('lcBar').innerHTML=seg(r.W,'var(--c1)')+seg(r.G,'var(--c5)')+seg(r.O,'var(--c4)')+seg(r.A,'var(--c3)')+'<span class="lc-line" style="left:'+(100*r.mem/mx).toFixed(2)+'%"></span>';
    $('lcMemN').innerHTML='Weights '+f1(r.W)+' GB, gradients '+f1(r.G)+' GB, optimizer state '+f1(r.O)+' GB, activations '+f1(r.A)+' GB <i class="nl d">derived</i>.';
    const ax=['DP','TP','CP','PP','EP'].filter(a=>r.comm[a]>0);
    const tmax=Math.max(r.t_comp,...ax.map(a=>r.t[a]),1e-9);
    const row=(nm,t,c,sub)=>'<div class="crow"><span class="nm">'+nm+'</span><span class="track"><span class="fill" style="width:'+Math.max(0.5,100*t/tmax).toFixed(1)+'%;background:'+c+'"></span></span><span class="val">'+tm(t)+'<br><span class="mute" style="font-size:11px">'+sub+'</span></span></div>';
    let h=r.t_comp?row('Compute',r.t_comp,'var(--c1)','6ND at '+$('lcF').value+'% MFU'):'';
    ax.forEach(a=>{h+=row(a+(r.link[a]==='nv'?' · NVLink':' · network'),r.t[a],r.link[a]==='nv'?'var(--c6)':'var(--bad)',f1(r.comm[a])+' GB sent')});
    if(!ax.length)h+='<p class="small mute">No communication: one GPU.</p>';
    $('lcC').innerHTML=h;
    const sumC=ax.reduce((s,a)=>s+r.t[a],0);
    $('lcCN').innerHTML=r.t_comp?'Communication at peak link bandwidth adds up to '+tm(sumC)+' per step against '+tm(r.t_comp)+' of compute ('+(sumC/r.t_comp*100).toFixed(0)+'%). Frameworks overlap most of it (DP during backward, PP and EP inside DualPipe); TP and CP sit on the critical path unless overlapped explicitly.':'States only: no compute model for this preset.';
    const w=warn(o,md);$('lcWarn').innerHTML=w.map(x=>'<div>'+x+'</div>').join('');
    $('lcRep').innerHTML=repro(cur,r);
    const t=$('lcRep');t.querySelectorAll('a').forEach(a=>{a.target='_blank';a.rel='noopener noreferrer'});
  }
  $('lcP').addEventListener('change',e=>{cur=e.target.value;if(cur!=='custom')load(cur);draw()});
  ids.forEach(id=>$(id).addEventListener('input',()=>{if(id!=='lcZ'||cur!=='zero75'){if(!(cur==='zero75'&&id==='lcZ')){cur='custom';$('lcP').value='custom'}}draw()}));
  load(cur);
  (window.TAB_RENDER['t-calc']=window.TAB_RENDER['t-calc']||[]).push(draw);draw();
})();
