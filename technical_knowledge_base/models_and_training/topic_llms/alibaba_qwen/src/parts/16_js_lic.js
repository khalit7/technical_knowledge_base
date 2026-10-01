// ---- Licence checker: use case against each checkpoint's own LICENSE file ----
(function(){
  if(!$('lcTab'))return;
  const HF='https://huggingface.co/Qwen/';
  const K={
    ap:{n:'Apache 2.0',c:'ap',line:'Permissive: commercial use, modification and redistribution, keeping the licence and notices. No user or revenue thresholds.'},
    tq:{n:'Tongyi Qianwen License',c:'tq',line:'Commercial use allowed, but a product or service above 100 million monthly active users must request a licence; the model and its outputs may not be used to improve any other large language model.'},
    ql:{n:'Qwen License (2024)',c:'tq',line:'The same 100-million-user clause; a model trained or improved with it and made available must say "Built with Qwen" or "Improved using Qwen".'},
    rs:{n:'Qwen Research License',c:'rs',line:'Non-commercial only (research or evaluation); any commercial use needs a separate licence.'},
    mx:{n:'Qwen3.8-Max License',c:'mx',line:'MIT-style, plus two conditions: show the model name above 100M MAU or US$20M monthly revenue; a model-as-a-service or AI work assistant business with group revenue above US$50M in any 12 months needs a separate licence. Internal use not exposed to third parties is exempt.'},
    cm:{n:'Qwen Community License 1.0',c:'cm',line:'As the Qwen3.8-Max License, but any model-as-a-service or AI work assistant business needs a separate licence, at any revenue. Internal use not exposed to third parties is exempt.'}};
  // [checkpoint, licence key, repo]
  const P=[['Qwen-7B','tq','Qwen-7B'],['Qwen-72B','tq','Qwen-72B'],['Qwen1.5-7B-Chat','tq','Qwen1.5-7B-Chat'],['Qwen1.5-72B-Chat','tq','Qwen1.5-72B-Chat'],['Qwen2-7B-Instruct','ap','Qwen2-7B-Instruct'],['Qwen2-72B-Instruct','tq','Qwen2-72B-Instruct'],
    ['Qwen2.5-3B-Instruct','rs','Qwen2.5-3B-Instruct'],['Qwen2.5-7B-Instruct','ap','Qwen2.5-7B-Instruct'],['Qwen2.5-32B-Instruct','ap','Qwen2.5-32B-Instruct'],['Qwen2.5-72B-Instruct','ql','Qwen2.5-72B-Instruct'],['Qwen2.5-Coder-32B-Instruct','ap','Qwen2.5-Coder-32B-Instruct'],['QwQ-32B','ap','QwQ-32B'],
    ['Qwen3-0.6B','ap','Qwen3-0.6B'],['Qwen3-235B-A22B','ap','Qwen3-235B-A22B'],['Qwen3-235B-A22B-Instruct-2507','ap','Qwen3-235B-A22B-Instruct-2507'],['Qwen3-30B-A3B-Thinking-2507','ap','Qwen3-30B-A3B-Thinking-2507'],['Qwen3-Coder-480B-A35B-Instruct','ap','Qwen3-Coder-480B-A35B-Instruct'],['Qwen3-Next-80B-A3B-Instruct','ap','Qwen3-Next-80B-A3B-Instruct'],
    ['Qwen3.5-397B-A17B','ap','Qwen3.5-397B-A17B'],['Qwen3.6-27B','ap','Qwen3.6-27B'],['Qwen3.8-27B','ap','Qwen3.8-27B'],['Qwen3.8-2.4T-A95B','mx','Qwen3.8-2.4T-A95B'],['Qwen3.8-Flash-Next','cm','Qwen3.8-Flash-Next'],['Qwen-Image','ap','Qwen-Image'],['Qwen-Image-2.1','rs','Qwen-Image-2.1']];
  const U=[['res','Research or evaluation only, nothing commercial'],['int','Internal commercial use; nothing (outputs included) reaches a third party'],['small','A commercial product under 100M monthly users and under US$20M monthly revenue'],
    ['rev','A commercial product above US$20M monthly revenue, under 100M monthly users'],['mau','A commercial product above 100M monthly active users'],['maas','A model-as-a-service API or an AI coding/office assistant; group revenue under US$50M a year'],
    ['maasbig','A model-as-a-service API or an AI coding/office assistant; group revenue over US$50M in 12 months'],['train','Using the model or its outputs to train another (non-Qwen) model you distribute']];
  // verdict: [class, short text]
  function V(lic,u){
    if(lic==='ap')return['ok','Allowed'];
    if(lic==='rs')return u==='res'?['ok','Allowed']:u==='train'?['at','Research only']:['no','Separate commercial licence'];
    if(lic==='tq'||lic==='ql'){if(u==='mau')return['no','Request a licence (>100M MAU)'];if(u==='train')return lic==='tq'?['no','Not allowed']:['at','Allowed, say "Built with Qwen"'];if(u==='maas'||u==='maasbig')return['at','Allowed below 100M MAU'];return['ok','Allowed']}
    if(lic==='mx'||lic==='cm'){if(u==='rev'||u==='mau')return['at','Allowed, display the model name'];if(u==='maasbig')return['no','Separate licence'];if(u==='maas')return lic==='cm'?['no','Separate licence (any size)']:['ok','Allowed (under US$50M)'];return['ok','Allowed']}
  }
  let u='maas';
  $('lcU').innerHTML='<div class="small mute" style="margin-bottom:4px">What do you want to do?</div>'+U.map(([k,t])=>'<label><input type="radio" name="lcU" value="'+k+'"'+(k===u?' checked':'')+'> '+t+'</label>').join('');
  $('lcKey').innerHTML=Object.entries(K).map(([k,o])=>{const ex=P.find(p=>p[1]===k);return '<div class="sp"><div class="n"><span class="lic '+o.c+'">'+o.n+'</span></div><p>'+o.line+' Example: '+A(HF+ex[2]+'/blob/main/LICENSE',ex[0])+'.</p></div>'}).join('')+'<div class="sp"><div class="n"><span class="lic cl">Closed</span></div><p>Qwen3-Max, Qwen3.6-Plus and Max preview, Qwen3.7-Max and Plus, the hosted Qwen3.8-Max and its snapshots: no weights, only the API terms of Alibaba Cloud Model Studio.</p></div>';
  function draw(){
    let n={ok:0,at:0,no:0};
    const rows=P.map(([name,lic,repo])=>{const v=V(lic,u);n[v[0]]++;return '<tr><td>'+A(HF+repo+'/blob/main/LICENSE',name)+'</td><td><span class="lic '+K[lic].c+'">'+K[lic].n+'</span></td><td><span class="vd '+v[0]+'">'+v[1]+'</span></td></tr>'}).join('');
    $('lcTab').innerHTML='<tr><th>Checkpoint (links to its LICENSE)</th><th>Licence</th><th>For this use</th></tr>'+rows;
    $('lcSum').innerHTML=stat('Allowed',n.ok+' of '+P.length,'no extra step')+stat('Allowed with a condition',String(n.at),'attribution, a user cap or research only')+stat('Needs a separate licence or not allowed',String(n.no),'ask Alibaba first');
  }
  $('lcU').addEventListener('change',e=>{if(e.target.name==='lcU'){u=e.target.value;draw()}});draw();
})();
