// ---- Trainable parameters tab: every method's count from a model's real shapes; the same formulas as recompute.py ----
(function(){
  const $=id=>document.getElementById(id);if(!$('pc'))return;
  const MD=PF_DATA.models,ALL=['q','k','v','o','gate','up','down'],RANKS=[1,2,4,8,16,32,64,128,256,512,1024];
  const ORDER=['Llama 3 8B','Qwen3-8B','Mistral 7B v0.3','Qwen3-30B-A3B','LLaMA 7B','LLaMA 13B','GPT-3 175B','SmolLM2-135M'];
  let S={m:'Llama 3 8B',r:16,tg:ALL.slice(),b:64,n:20,vr:1024,vs:false};
  function mats(m){const d=m.d,q=m.H*m.hd,kv=m.KV*m.hd,o=[['q',d,q,1],['k',d,kv,1],['v',d,kv,1],['o',q,d,1]];
    if(m.E)o.push(['gate',d,m.eff,m.E],['up',d,m.eff,m.E],['down',m.eff,d,m.E]);
    else{if(m.gated)o.push(['gate',d,m.ff,1]);o.push(['up',d,m.ff,1],['down',m.ff,d,1])}
    return o}
  const sumT=(m,f,tg)=>m.L*mats(m).filter(x=>tg.includes(x[0])).reduce((a,x)=>a+f(x)*x[3],0);
  const F={
    full:m=>m.total,
    adapter:(m,s)=>2*m.L*(2*m.d*s.b+s.b+m.d),
    prompt:(m,s)=>s.n*m.d,
    prefix:(m,s)=>s.n*m.L*2*m.KV*m.hd,
    ia3:(m,s,name)=>m.L*((name.startsWith('Qwen')?m.H:m.KV)*m.hd+m.KV*m.hd+(m.E?m.E*m.eff:m.ff)),
    lora:(m,s)=>sumT(m,x=>s.r*(x[1]+x[2]),s.tg),
    lorafa:(m,s)=>sumT(m,x=>s.r*x[2],s.tg),
    vera:(m,s)=>sumT(m,x=>x[2]+s.vr,s.tg)+(s.vs?2*Math.max(0,...mats(m).filter(x=>s.tg.includes(x[0])).map(x=>Math.max(x[1],x[2])))*s.vr:0),
    dora:(m,s)=>sumT(m,x=>s.r*(x[1]+x[2])+x[2],s.tg)};
  const ROWS=[['full','Full fine-tuning'],['adapter','Adapters (Houlsby), m = {b}'],['prompt','Prompt tuning, n = {n}'],['prefix','Prefix tuning, n = {n}'],['ia3','(IA)³'],
    ['lora','LoRA, r = {r}'],['lorafa','LoRA-FA, r = {r}'],['vera','VeRA, r = {v}'],['dora','DoRA, r = {r}']];
  const T6=['q','k','v','up','down'];
  // which PEFT run (peft_counts.py) a setting corresponds to
  function libKey(k,s){const eq=(a,b)=>a.length===b.length&&a.every(x=>b.includes(x));
    if(k==='full')return 'total';if(k==='ia3')return 'ia3_default';if(k==='prompt'&&s.n===20)return 'prompt_20';if(k==='prefix'&&s.n===20)return 'prefix_20';
    if(k==='lora'){if(s.r===8&&eq(s.tg,['q','v']))return 'lora_r8_qv';if(s.r===1&&eq(s.tg,ALL))return 'lora_r1_all';if(s.r===16&&eq(s.tg,ALL))return 'lora_r16_all';if(s.r===32&&eq(s.tg,T6))return 'lora_r32_qkvud'}
    if(k==='dora'){if(s.r===32&&eq(s.tg,T6))return 'dora_r32_qkvud';if(s.r===16&&eq(s.tg,T6))return 'dora_r16_qkvud';if(s.r===16&&eq(s.tg,ALL))return 'dora_r16_all'}
    if(k==='vera'&&s.vr===256&&!s.vs&&eq(s.tg,['q','v']))return 'vera_r256_qv';return null}
  const PRE=[
    {t:'LoRA paper, Table 4: GPT-3, r = 1 on q and v',s:{m:'GPT-3 175B',r:1,tg:['q','v']},row:'lora',pub:'4.7M',src:'{{LoRA Table 4|n:3c65c17b0d0d81018f15edd19fa5c28a}}'},
    {t:'LoRA paper, §4.2: GPT-3, r = 4 on q and v (the 35 MB checkpoint)',s:{m:'GPT-3 175B',r:4,tg:['q','v']},row:'lora',pub:'18.8M (printed truncated); "roughly 35MB"',src:'{{LoRA §4.2|n:3c65c17b0d0d81018f15edd19fa5c28a}}'},
    {t:'DoRA Table 1: LLaMA-7B, r = 32 on q, k, v, up, down',s:{m:'LLaMA 7B',r:32,tg:T6},row:'dora',pub:'LoRA 0.83%, DoRA 0.84%',src:'{{DoRA Table 1|https://arxiv.org/html/2402.09353v6}}',pct:1},
    {t:'DoRA† (half rank): LLaMA-7B, r = 16',s:{m:'LLaMA 7B',r:16,tg:T6},row:'dora',pub:'0.43%',src:'{{DoRA Table 1|https://arxiv.org/html/2402.09353v6}}',pct:1},
    {t:'LoRA Without Regret: Llama 3.1 8B (Llama 3 8B shapes), r = 1, all matrices',s:{m:'Llama 3 8B',r:1,tg:ALL},row:'lora',pub:'"3M"',src:'{{Thinking Machines|https://thinkingmachines.ai/blog/lora/}}'},
    {t:'VeRA Table 4: LLaMA-7B, all linear, LoRA r = 64 against VeRA r = 1,024',s:{m:'LLaMA 7B',r:64,tg:ALL,vr:1024},row:'vera',pub:'LoRA 159.9M, VeRA 1.6M',src:'{{VeRA Table 4|https://arxiv.org/html/2310.11454v2}}'},
    {t:'VeRA Table 1: GPT-3, r = 256 on q and k, shared pair counted',s:{m:'GPT-3 175B',tg:['q','k'],vr:256,vs:true},row:'vera',pub:'8.7M',src:'{{VeRA Table 1|https://arxiv.org/html/2310.11454v2}}'}];
  const link=s=>s.replace(/\{\{([^|{}]+)\|([^{}]+)\}\}/g,(a,t,u)=>'<a href="'+(u.startsWith('n:')?'https://app.notion.com/p/'+u.slice(2):u)+'" target="_blank" rel="noopener noreferrer">'+t+'</a>');
  let active=-1;
  $('pcRep').innerHTML='<b>Defaults reproduce published counts</b> (independently, from the configs; each button sets the controls): '+PRE.map((p,i)=>'<button data-p="'+i+'">'+p.t+'</button>').join('')+'<div id="pcRepOut" class="small"></div>';
  $('pcM').innerHTML=ORDER.map(k=>'<option'+(k===S.m?' selected':'')+'>'+k+'</option>').join('');
  $('pcT').innerHTML=ALL.map(t=>'<label><input type="checkbox" data-t="'+t+'" checked> '+t+'</label>').join('')+'<button id="pcAll" style="font-size:12px;padding:1px 8px">all</button><button id="pcQV" style="font-size:12px;padding:1px 8px">q, v</button>';
  const lib=Object.values(MD).reduce((a,m)=>a+Object.keys(m.peft||{}).length,0);
  $('pcLib').textContent=lib+' library counts across '+Object.values(MD).filter(m=>Object.keys(m.peft||{}).length).length+' models, all identical, PEFT '+PF_DATA.peftver;
  document.querySelectorAll('.pcVer').forEach(e=>e.textContent=PF_DATA.peftver);
  $('pcSrc').innerHTML=ORDER.filter(k=>MD[k].repo).map(k=>'<a href="'+MD[k].url.replace('/resolve/','/blob/')+'" target="_blank" rel="noopener noreferrer">'+MD[k].repo+'</a>').join(', ')+' (Llama 3 repositories are gated: NousResearch and unsloth mirrors with the same shapes)';
  function sync(){$('pcM').value=S.m;$('pcR').value=RANKS.indexOf(S.r);$('pcRv').textContent=S.r;$('pcB').value=S.b;$('pcN').value=S.n;$('pcV').value=S.vr;$('pcVs').checked=S.vs;
    $('pcT').querySelectorAll('input').forEach(c=>c.checked=S.tg.includes(c.dataset.t))}
  function draw(){
    const m=MD[S.m],tot=m.total,vals=ROWS.map(r=>[r[0],r[1].replace('{b}',S.b).replace('{n}',S.n).replace('{r}',S.r).replace('{v}',S.vr.toLocaleString('en-US')),F[r[0]](m,S,S.m)]);
    const lmax=Math.log10(tot),lmin=3;
    let h='<thead><tr><th>Method</th><th class="num">Trainable</th><th class="num">% of model</th><th class="num">File (bf16)</th><th style="width:30%">log scale</th><th>PEFT library</th></tr></thead><tbody>';
    vals.forEach(v=>{const lk=libKey(v[0],S),lv=lk&&m.peft?m.peft[lk]:undefined;
      const chk=lv===undefined?'<span class="mute">not run</span>':(lv===v[2]?'<span class="ok">identical</span>':'<span class="warn">'+PF.comma(lv)+'</span>');
      const w=Math.max(1,100*(Math.log10(Math.max(v[2],10))-lmin)/(lmax-lmin));
      h+='<tr'+(active>=0&&PRE[active].row===v[0]?' style="background:var(--hl)"':'')+'><td>'+v[1]+'</td><td class="num">'+PF.comma(v[2])+'</td><td class="num">'+(100*v[2]/tot).toFixed(v[2]/tot<0.0001?5:3)+'%</td><td class="num">'+PF.bytes(2*v[2])+'</td><td><div class="pc-bar" style="width:'+w.toFixed(1)+'%;background:'+(v[0]==='full'?'var(--c2)':'var(--acc)')+'"></div></td><td>'+(v[0]==='full'&&S.m==='SmolLM2-135M'?'<span class="mute">see note</span>':chk)+'</td></tr>'});
    $('pcTab').innerHTML=h+'</tbody>';
    const lo=F.lora(m,S),qv=F.lora(m,Object.assign({},S,{tg:['q','v']}));
    $('pcO').innerHTML=RD.stat('Model',PF.fmt(tot),m.L+' layers, d = '+m.d.toLocaleString('en-US')+(m.E?', '+m.E+' experts':''))+RD.stat('LoRA at r = '+S.r,PF.fmt(lo),(100*lo/tot).toFixed(3)+'% of the model')+
      RD.stat('All 7 matrices against q, v only',(F.lora(m,Object.assign({},S,{tg:ALL}))/qv).toFixed(1)+'×','at the same rank')+RD.stat('Full fine-tune / LoRA',PF.fmt(tot/Math.max(lo,1))+'×','fewer numbers trained');
    // matrix table
    const ms=mats(m);let t='<thead><tr><th>Matrix</th><th class="num">d<sub>in</sub> → d<sub>out</sub></th><th class="num">Copies per layer</th><th class="num">LoRA numbers, all layers</th><th class="num">Share</th></tr></thead><tbody>';
    ms.forEach(x=>{const on=S.tg.includes(x[0]),c=on?m.L*S.r*(x[1]+x[2])*x[3]:0;
      t+='<tr'+(on?'':' class="mute"')+'><td>'+x[0]+(on?'':' (not targeted)')+'</td><td class="num">'+x[1].toLocaleString('en-US')+' → '+x[2].toLocaleString('en-US')+'</td><td class="num">'+x[3]+'</td><td class="num">'+PF.comma(c)+'</td><td class="num">'+(lo?(100*c/lo).toFixed(1)+'%':'')+'</td></tr>'});
    $('pcMat').innerHTML=t+'</tbody>';
    let note='Not every model has every matrix: GPT-3 has no gate (its MLP is up then down). ';
    if(S.m==='SmolLM2-135M')note+='SmolLM2 ties its input and output embeddings: the checkpoint has 134.5M parameters, which this tab uses; the empty model PEFT builds from the config counts both embeddings (162.8M). ';
    if(m.E)note+='Experts: each of the '+m.E+' experts per layer gets its own A and B for gate, up and down, so expert LoRA dominates; the router is not adapted. ';
    $('pcNote').textContent=note;
    if(active>=0){const p=PRE[active],v=F[p.row](m,S,S.m);let got;
      if(p.pct){got='LoRA '+(100*F.lora(m,S)/tot).toFixed(3)+'%, DoRA '+(100*v/tot).toFixed(3)+'%'}
      else if(p.row==='vera'&&!S.vs){got='LoRA '+PF.fmt(F.lora(m,S))+', VeRA '+PF.fmt(v)}
      else if(p.row==='vera'){got=PF.fmt(v)+' ('+PF.fmt(F.vera(m,Object.assign({},S,{vs:false})))+' trained + '+PF.fmt(v-F.vera(m,Object.assign({},S,{vs:false})))+' shared, frozen)'}
      else got=PF.fmt(v)+(S.m==='GPT-3 175B'&&S.r===4?' = '+PF.bytes(2*v)+' (36 MiB) in fp16, which the paper calls "roughly 35MB"':'');
      $('pcRepOut').innerHTML='Published: '+p.pub+' ('+link(p.src)+'). This tab: <b>'+got+'</b>.'+(p.pct?' The paper prints percentages truncated to two decimals.':'')+(p.row==='vera'&&S.vs?' VeRA\'s Table 1 reproduces only when the shared random matrices are counted, although they are frozen and can be regenerated from a seed.':'')}
    else $('pcRepOut').innerHTML='';
  }
  $('pcRep').addEventListener('click',e=>{const b=e.target.closest('button[data-p]');if(!b)return;active=+b.dataset.p;
    const p=PRE[active];S=Object.assign({m:'Llama 3 8B',r:16,tg:ALL.slice(),b:64,n:20,vr:1024,vs:false},p.s);sync();draw()});
  const user=()=>{active=-1};
  $('pcM').addEventListener('change',e=>{S.m=e.target.value;user();draw()});
  $('pcR').addEventListener('input',e=>{S.r=RANKS[+e.target.value];$('pcRv').textContent=S.r;user();draw()});
  [['pcB','b'],['pcN','n'],['pcV','vr']].forEach(([id,k])=>$(id).addEventListener('input',e=>{const v=Math.max(1,Math.min(8192,Math.round(+e.target.value||1)));S[k]=v;user();draw()}));
  $('pcVs').addEventListener('change',e=>{S.vs=e.target.checked;user();draw()});
  $('pcT').addEventListener('change',()=>{S.tg=[...$('pcT').querySelectorAll('input:checked')].map(c=>c.dataset.t);user();draw()});
  $('pcAll').addEventListener('click',()=>{S.tg=ALL.slice();sync();user();draw()});
  $('pcQV').addEventListener('click',()=>{S.tg=['q','v'];sync();user();draw()});
  sync();draw();
})();
