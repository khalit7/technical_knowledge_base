// ---- Reading tab: routing repetition, memory against compute, GRPO group, licence chooser ----
(function(){
  // Mixtral paper, Table 5: % of consecutive tokens with the same expert, layers 0 / 15 / 31
  const RP={'ArXiv':[14.0,27.9,22.7,46.5,62.3,52.9],'DM Mathematics':[14.1,28.4,19.7,44.9,67.0,44.5],'Github':[14.9,28.1,19.7,49.9,66.9,49.2],'Gutenberg':[13.9,26.1,26.3,49.5,63.1,52.2],'PhilPapers':[13.6,25.3,22.1,46.9,61.9,51.3],'PubMed Abstracts':[14.2,24.6,22.0,48.6,61.6,51.8],'StackExchange':[13.6,27.2,23.6,48.2,64.6,53.6],'Wikipedia (en)':[14.4,23.6,25.3,49.8,62.1,51.8]};
  const RC=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)','var(--closed)','var(--mute)'];
  let rpm=1;
  function drawRP(){if(!$('rpSvg'))return;const W=640,H=230,pl=40,pr=10,pt=14,pb=40,names=Object.keys(RP),max=rpm===1?32:72,base=rpm===1?12.5:46.4;
    const Y=v=>pt+(H-pt-pb)*(1-v/max),gw=(W-pl-pr)/3,bw=Math.min(16,(gw-30)/names.length);let s='';
    for(let v=0;v<=max;v+=rpm===1?8:20)s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/><text x="'+(pl-5)+'" y="'+(Y(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+v+'%</text>';
    [0,15,31].forEach((L,g)=>{const x0=pl+g*gw+(gw-bw*names.length)/2;names.forEach((n,i)=>{const v=RP[n][g+(rpm===1?0:3)];
      s+='<rect x="'+(x0+i*bw).toFixed(1)+'" y="'+Y(v).toFixed(1)+'" width="'+(bw-2).toFixed(1)+'" height="'+(Y(0)-Y(v)).toFixed(1)+'" fill="'+RC[i]+'"><title>'+n+', layer '+L+': '+v+'%</title></rect>'});
      s+='<text x="'+(pl+g*gw+gw/2)+'" y="'+(H-pb+15)+'" font-size="11" text-anchor="middle">layer '+L+'</text>'});
    s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(base)+'" y2="'+Y(base)+'" stroke="var(--ink)" stroke-dasharray="4 3"/><text x="'+(W-pr)+'" y="'+(Y(base)-4)+'" font-size="10.5" text-anchor="end">random '+(rpm===1?'12.5%':'≈ 46%')+'</text>';
    let lg='';names.forEach((n,i)=>{const col=i%4,row=Math.floor(i/4);lg+='<rect x="'+(pl+col*150)+'" y="'+(H-14+row*0)+'" width="0" height="0"/>'});
    $('rpSvg').innerHTML=svgEl(W,H,s,'Expert repetition between consecutive tokens')+'<div class="leg">'+names.map((n,i)=>'<span><i style="background:'+RC[i]+';height:10px;width:10px"></i>'+n+'</span>').join('')+'</div>'}
  if($('rpM'))segBind('rpM',v=>{rpm=+v;drawRP()});
  // memory against compute for the current line
  const MC=[['Mixtral 8x7B',46.7,12.9],['Mistral Small 4',119,6],['Mistral Medium 3.5',128,128],['Devstral 2',123,123],['Mistral Large 3',675,41]];
  let mcs=1;
  function drawMC(){if(!$('mcMem'))return;const maxM=Math.max(...MC.map(m=>m[1]*mcs)),maxC=256,node=1128;const mm=Math.max(maxM,node)*1.06;
    $('mcMem').innerHTML=MC.map(m=>{const v=m[1]*mcs;return '<div class="row"><span class="nm">'+m[0]+'</span><span class="track"><span class="fill" style="width:'+(100*v/mm).toFixed(1)+'%;background:var(--mute)"></span><span style="position:absolute;top:-2px;bottom:-2px;left:'+(100*node/mm).toFixed(1)+'%;border-left:2px dashed var(--ink)"></span></span><span class="val">'+fmt(v,v<100?1:0)+' GB</span></div>'}).join('');
    $('mcCmp').innerHTML=MC.map(m=>'<div class="row"><span class="nm">'+m[0]+'</span><span class="track"><span class="fill" style="width:'+(100*2*m[2]/maxC).toFixed(1)+'%;background:var(--c2)"></span></span><span class="val">'+fmt(2*m[2],0)+'</span></div>').join('')+'<p class="small mute" style="margin:4px 0 0">2 × active parameters; r = '+MC.map(m=>m[0].replace('Mistral ','')+' '+(m[1]/m[2]).toFixed(1)).join(', ')+'.</p>'}
  if($('mcP'))segBind('mcP',v=>{mcs=+v;drawMC()});
  // GRPO group with Magistral's reward
  const LEN=[['within budget',0],['half into the penalty zone',-0.05],['over l_max',-0.1]];
  const G=[{f:1,c:1,l:0,g:1},{f:1,c:0,l:0,g:1},{f:1,c:1,l:1,g:1},{f:1,c:0,l:2,g:1},{f:0,c:1,l:0,g:1},{f:1,c:1,l:0,g:0},{f:1,c:0,l:0,g:1},{f:1,c:1,l:0,g:1}];
  const rew=a=>a.f?0.1+(a.c?0.9:0)+LEN[a.l][1]+(a.g?0.1:0):0;
  function drawGR(){if(!$('grTab'))return;const r=G.map(rew),mu=r.reduce((a,b)=>a+b,0)/r.length,sd=Math.sqrt(r.reduce((a,b)=>a+(b-mu)**2,0)/r.length),zero=r.every(v=>Math.abs(v-r[0])<1e-9);
    let t='<thead><tr><th>Answer</th><th>Format</th><th>Correct</th><th>Length</th><th>Same language</th><th class="num">Reward</th><th class="num">r − μ (Magistral)</th><th class="num">(r − μ)/σ (standard)</th></tr></thead><tbody>';
    G.forEach((a,i)=>{const b=(k,on)=>'<button data-i="'+i+'" data-k="'+k+'" class="'+(on?'on':'')+'" aria-pressed="'+(on?'true':'false')+'">'+(on?'yes':'no')+'</button>';
      t+='<tr><td>'+(i+1)+'</td><td>'+b('f',a.f)+'</td><td>'+b('c',a.c)+'</td><td><button data-i="'+i+'" data-k="l">'+LEN[a.l][0]+'</button></td><td>'+b('g',a.g)+'</td><td class="num">'+r[i].toFixed(2)+'</td><td class="num">'+(zero?'0':(r[i]-mu>=0?'+':'')+(r[i]-mu).toFixed(3))+'</td><td class="num">'+(zero||sd===0?'0':((r[i]-mu)/sd>=0?'+':'')+((r[i]-mu)/sd).toFixed(2))+'</td></tr>'});
    $('grTab').innerHTML=t+'</tbody>';
    $('grOut').innerHTML=stat('Group mean μ',mu.toFixed(3),'baseline instead of a critic')+stat('Rewards range',Math.min(...r).toFixed(2)+' to '+Math.max(...r).toFixed(2),'0 (bad format) to 1.1')+stat('In the batch?',zero?'Dropped':'Kept',zero?'every reward equal: zero advantage, no signal':'answers differ, so the group carries signal');
    $('grTab').querySelectorAll('button').forEach(x=>x.addEventListener('click',()=>{const a=G[+x.dataset.i],k=x.dataset.k;if(k==='l')a.l=(a.l+1)%3;else a[k]=a[k]?0:1;drawGR()}))}
  // licence chooser
  const LM=[['Large 3','a',1],['Small 4','a',1],['Ministral 3','a',1],['Shieldstral','a',1],['Voxtral Small','a',1],['Voxtral Realtime','a',1],['Devstral Small 2','a',0],['Medium 3.5','m',1],['Devstral 2','m',0],['Voxtral TTS','n',1],['Codestral 25.08','p',1],['OCR 4.1','p',1],['Codestral Embed','p',1],['Mistral Embed','p',1],['Moderation 2','p',1],['Voxtral Transcribe 2','p',1]];
  const RUNG={a:'Apache 2.0',m:'Modified MIT',n:'CC BY-NC 4.0',p:'API only'};
  function drawLC(){if(!$('lcGrid'))return;const W=$('lcW').checked,Cm=$('lcC').checked,R=$('lcR').checked;let ok=0;
    $('lcGrid').innerHTML=LM.map(([n,k,api])=>{let v,good;
      if(k==='a'){v=W?'yes: download and use':api?'yes: weights or API':'yes: weights (retired from the API)';good=1}
      else if(k==='m'){if(R){v=W?'no: over the $20M line; ask Mistral for a licence':api?'API only for you':'no: over the $20M line';good=!W&&api}else{v=W?'yes: download and use':api?'yes: weights or API':'yes: weights';good=1}}
      else if(k==='n'){if(Cm){v=W?'no: non-commercial weights':'API, on Mistral\'s commercial terms';good=!W}else{v='yes: research and personal use';good=1}}
      else{v=W?'no weights':'yes, through the API';good=!W}
      if(good)ok++;return '<div class="lab '+(good?'o':'c')+'"><span class="nm">'+n+'</span><span class="fl">'+RUNG[k]+' · '+v+'</span></div>'}).join('');
    $('lcSum').textContent=ok+' of '+LM.length+' models usable this way. Not legal advice: read each licence before relying on it.'}
  ['lcW','lcC','lcR'].forEach(id=>$(id)&&$(id).addEventListener('change',drawLC));
  function all(){drawRP();drawMC();drawGR();drawLC()}
  onTab('t-read',all);
})();
