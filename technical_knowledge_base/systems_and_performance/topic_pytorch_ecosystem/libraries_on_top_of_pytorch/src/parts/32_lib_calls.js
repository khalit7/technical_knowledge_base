// ---- What calls what tab (t-calls): recorded library-to-PyTorch calls, animated against the plain loop ----
(function(){
  const T=window.LIB.tr, $=id=>document.getElementById(id), esc=RD.esc;
  const RUNS=[['plain','Plain loop (1 process)'],['hf','HF Trainer, matched (1)'],['hf_defaults','HF Trainer, all defaults (1)'],['accelerate','Accelerate (1)'],['lightning','Lightning (1)'],['titan_1p','torchtitan 0.3.0 (1, debug model)'],
    ['acc_ddp','Accelerate, DDP (2 processes)'],['hf_ddp','HF Trainer, DDP (2)'],['pl_ddp','Lightning, DDP (2)'],['pl_fsdp2','Lightning, FSDP2 (2)'],['ds_z0','DeepSpeed ZeRO-0 (2)'],['ds_z1','DeepSpeed ZeRO-1 (2)'],['ds_z2','DeepSpeed ZeRO-2 (2)'],['ds_z3','DeepSpeed ZeRO-3 (2)'],['titan_fsdp','torchtitan FSDP2 (2)']];
  const NM=Object.fromEntries(RUNS);
  const CATS=[['dist','distributed','var(--c2)'],['optim','optimizer, clip, schedule','var(--c1)'],['data','data','var(--c5)'],['ckpt','activation checkpointing','var(--c6)'],['amp','autocast','var(--c4)'],['compile','compile, dispatch','var(--acc)'],['autograd','autograd','var(--good)'],['module','nn.Module plumbing','var(--dim)'],['maths','maths','var(--c3)']];
  const CC=Object.fromEntries(CATS.map(c=>[c[0],c[2]]));
  const kind=c=>/dist\.|DistributedDataParallel|fsdp\.|_functional_collectives|init_device_mesh/.test(c)?'dist':/optim\.|clip_grad|zero_grad/.test(c)?'optim':/data\./.test(c)?'data':/checkpoint/.test(c)?'ckpt':/autocast/.test(c)?'amp':/backward/.test(c)?'autograd':'maths';
  let run='hf';
  $('cw-run').innerHTML=RUNS.filter(r=>r[0]!=='plain').map(r=>'<option value="'+r[0]+'"'+(r[0]===run?' selected':'')+'>'+r[1]+'</option>').join('');
  const item=(e,cls)=>'<div class="cw-it '+cls+'" style="--sc:'+CC[kind(e[3])]+'"><b>'+esc(e[3])+'</b> &times;'+e[4]+'<span>'+esc(e[1])+' L'+e[2]+'</span></div>';
  function list(el,keys,i,match){let ph='',h='';keys.forEach((e,j)=>{if(e[0]!==ph){ph=e[0];h+='<div class="cw-ph">'+(ph==='setup'?'setup (before the first forward)':'training loop')+'</div>'}h+=item(e,match?(j===i?'on':''):(j===i?'on':j>i?'fut':''))});el.innerHTML=h;
    const on=el.querySelector('.on');if(on){const top=on.offsetTop-el.offsetTop-60;el.scrollTop=Math.max(0,top)}}
  function draw(i){const A=T.plain.key,B=T[run].key;
    const cur=B[Math.min(i,B.length-1)][3];list($('cw-left'),A,A.findIndex(x=>x[3]===cur),true);list($('cw-right'),B,i);$('cw-rt').textContent=NM[run];
    const e=B[Math.min(i,B.length-1)];
    const lib=e[1].split('/')[0];
    $('cw-cap').innerHTML='<b>'+(i+1)+' of '+B.length+'.</b> <code>'+esc(e[1])+'</code> line '+e[2]+' calls <code>'+esc(e[3])+'</code>'+(e[4]>1?', '+e[4]+' times in the run':'')+' ('+(e[0]==='setup'?'setup':'training loop')+'). '+(lib==='you'?'Your own script made this call.':'Made by '+esc(lib)+'; '+(A.some(x=>x[3]===e[3])?'the plain loop makes the same call itself (highlighted on the left).':'the plain loop has no such call: this is something the library adds.'));
    const r=T[run],per=r.tot.loop?Object.values(r.tot.loop).reduce((a,b)=>a+b,0)/r.steps:0,set=r.tot.setup?Object.values(r.tot.setup).reduce((a,b)=>a+b,0):0;
    const pp=Object.values(T.plain.tot.loop).reduce((a,b)=>a+b,0)/T.plain.steps;
    $('cw-cnt').innerHTML=RD.stat('Key calls',B.length,'plain loop: '+A.length)+RD.stat('Calls into PyTorch per step',Math.round(per),'plain loop: '+Math.round(pp))+RD.stat('Setup calls',set)+RD.stat('Distinct caller, callee pairs',r.edges);
  }
  const an=RD.anim({card:'cw-card',ctl:'cw-ctl',n:T[run].key.length,ms:900,draw,label:'Call'});
  $('cw-run').addEventListener('change',e=>{run=e.target.value;an.reset(T[run].key.length)});
  // table
  $('cw-leg').innerHTML=CATS.map(c=>'<span style="--sw:'+c[2]+'">'+c[1]+'</span>').join('');
  function bar(tot,steps){const v=CATS.map(c=>(tot[c[0]]||0)/steps),s=v.reduce((a,b)=>a+b,0);if(!s)return '';
    return '<div style="display:flex;height:10px;min-width:120px;border-radius:3px;overflow:hidden">'+CATS.map((c,j)=>v[j]?'<i title="'+c[1]+' '+Math.round(v[j])+'" style="display:block;flex:'+v[j]+' 0 0;background:'+c[2]+'"></i>':'').join('')+'</div><span class="small mute">'+CATS.filter((c,j)=>v[j]>=0.5).map((c,j)=>c[1]+' '+Math.round((tot[c[0]]||0)/steps)).join(', ')+'</span>'}
  $('cw-tbl').innerHTML=RUNS.map(([k,n])=>{const r=T[k],loop=r.tot.loop||{},set=r.tot.setup||{},sum=o=>Object.values(o).reduce((a,b)=>a+b,0);
    return '<tr><td>'+n+'</td><td>'+r.losses.map(x=>(+x).toFixed(5)).join(', ')+'</td><td>'+sum(set)+'</td><td>'+Math.round(sum(loop)/r.steps)+'</td><td>'+bar(loop,r.steps)+'</td></tr>'}).join('');
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-calls']=[()=>an.redraw()];
})();
