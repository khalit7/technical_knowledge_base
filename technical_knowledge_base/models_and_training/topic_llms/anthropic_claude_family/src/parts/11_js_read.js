// ---- Shared price list (pricing page, read 1 Oct 2026): input, output, cache read; $/MTok. old: previous tokenizer ----
const PRICES=[
  {n:'Fable 5.1',i:10,o:50,c:0.25,win:1e6,old:false,cur:true},
  {n:'Fable 5',i:10,o:50,c:1.00,win:1e6,old:false},
  {n:'Opus 5.5',i:4,o:20,c:0.20,win:1e6,old:false,cur:true},
  {n:'Opus 5 (and 4.5 to 4.8)',s:'Opus 5',i:5,o:25,c:0.50,win:1e6,old:false},
  {n:'Sonnet 5.5 (and Sonnet 5)',s:'Sonnet 5.5',i:2,o:10,c:0.20,win:1e6,old:false,cur:true},
  {n:'Sonnet 4.6 and 4.5',s:'Sonnet 4.6',i:3,o:15,c:0.30,win:1e6,old:true},
  {n:'Haiku 4.5',i:1,o:5,c:0.10,win:2e5,old:true,cur:true},
  {n:'Opus 4.1 (retired on the Claude API)',s:'Opus 4.1',i:15,o:75,c:1.50,win:2e5,old:true}
];
const PBY=n=>PRICES.find(p=>(p.s||p.n)===n||p.n===n);

// ---- Price ladder bars beside the lineup table ----
(function(){
  const rows=['Haiku 4.5','Sonnet 5.5','Opus 5.5','Fable 5.1'].map(PBY),cols=[['i','Input','var(--c1)'],['o','Output','var(--c4)'],['c','Cache read','var(--good)']];
  let s='';cols.forEach(([k,lab,col])=>{const mx=Math.max(...rows.map(r=>r[k]));s+='<div class="band">'+lab+' per 1M tokens</div>';
    rows.forEach(r=>{s+='<div class="row"><span class="nm">'+(r.s||r.n)+'</span><span class="track"><span class="fill" style="width:'+(100*r[k]/mx).toFixed(1)+'%;background:'+col+'"></span></span><span class="val">'+usd(r[k],2)+'</span></div>'})});
  $('ladder').innerHTML=s;
})();

// ---- AA mini stats ----
(function(){
  $('aaMini').innerHTML=stat('Opus 5.5 (max)','57.6','$5.98 per task, top of v4.3')+stat('Fable 5.1 (max)','53.4','$7.63 per task')+stat('Opus 5.5 (medium, default)','51.2','$1.34 per task')+stat('GPT-6 Astra (max)','52.7','$3.26 per task')+stat('Opus 5 (max)','50.8','$5.86 per task');
})();

// ---- Benchmark ledger: three Anthropic tables in one grid ----
(function(){
  const M=['Opus 5.5','Sonnet 5.5','Fable 5.1','Mythos 5.1','Fable 5','Opus 5','Sonnet 5','GPT-6 Astra','GPT-6 Sol','GPT-5.6 Sol'];
  // [family, row label, source, {model:[value, note]}]
  const R=[
   ['tb','Terminal-Bench 4.0','O',{'Opus 5.5':[66.4,'xhigh effort (its highest score)'],'Fable 5.1':[55.8],'Opus 5':[52.3,'public leaderboard: 51.8%'],'GPT-6 Astra':[57.9,'high effort, as reported by OpenAI'],'GPT-5.6 Sol':[37.3]}],
   ['tb','Terminal-Bench 4.0','F',{'Fable 5.1':[55.8],'Mythos 5.1':[60.9,'same model; the gap is where earlier cyber safeguards intervened'],'Fable 5':[42.0],'Opus 5':[52.3],'GPT-5.6 Sol':[37.3]}],
   ['tb','Terminal-Bench 4.0','S',{'Sonnet 5.5':[70.6],'Sonnet 5':[10.3],'Opus 5.5':[66.4,'xhigh effort']}],
   ['tbs','Terminal-Bench-Science 0.1','O',{'Opus 5.5':[58.7,'standard error 3.5 to 5 points'],'Fable 5.1':[52.6],'Opus 5':[29.0,'public leaderboard: 30.0%'],'GPT-6 Astra':[64.6,'as reported by OpenAI'],'GPT-5.6 Sol':[22.4]}],
   ['tbs','Terminal-Bench-Science 0.1','F',{'Fable 5.1':[52.6],'Fable 5':[24.7,'public leaderboard: 21.4%'],'Opus 5':[29.0],'GPT-5.6 Sol':[22.4]}],
   ['fc','FrontierCode v1.1 (Main)','O',{'Opus 5.5':[54.4,'max effort; 54.6% at default medium'],'Fable 5.1':[50.3],'Opus 5':[48.0],'GPT-6 Astra':[53.3],'GPT-5.6 Sol':[47.5]}],
   ['fc','FrontierCode 1.1 (Main)','S',{'Sonnet 5.5':[46.2,'max effort; 52.1% at xhigh (max timed out on some tasks)'],'Sonnet 5':[42.4],'Opus 5.5':[54.4],'GPT-6 Sol':[49.3]}],
   ['cb','CursorBench 4.0','O',{'Opus 5.5':[57.8,'max; 52.5% at default medium'],'Fable 5.1':[51.8],'Opus 5':[46.6],'GPT-5.6 Sol':[41.7]}],
   ['cb','CursorBench 4.0','S',{'Sonnet 5.5':[55.5],'Sonnet 5':[34.1],'Opus 5.5':[57.8]}],
   ['cb','CursorBench 3.2.0','F',{'Fable 5.1':[73.4],'Fable 5':[70.5],'Opus 5':[70.0],'GPT-5.6 Sol':[67.2]}],
   ['gd','GDPval-AA v2.1 (Elo)','O',{'Opus 5.5':[1846],'Fable 5.1':[1735],'Opus 5':[1708],'GPT-6 Astra':[1542],'GPT-5.6 Sol':[1588]}],
   ['gd','GDPval-AA v2.1 (Elo)','S',{'Sonnet 5.5':[1844,'pre-release run with a structured-output bug; effect expected to be minimal'],'Sonnet 5':[1449],'Opus 5.5':[1846],'GPT-6 Sol':[1487,'a GPT-6 Sol bug fix may not be reflected']}],
   ['gd','GDPval-AA v2 (Elo)','F',{'Fable 5.1':[1853],'Fable 5':[1723],'Opus 5':[1824],'GPT-5.6 Sol':[1711]}],
   ['br','AA-Briefcase v1.1 (Elo)','S',{'Sonnet 5.5':[1811],'Sonnet 5':[1359],'Opus 5.5':[1822],'GPT-6 Sol':[1483]}],
   ['ab','AutomationBench','O',{'Opus 5.5':[40.0,'run by Zapier without fallback models: safeguard interventions count as failures'],'Fable 5.1':[31.4],'Opus 5':[26.9],'GPT-6 Astra':[41.4],'GPT-5.6 Sol':[28.8]}],
   ['ab','AutomationBench','F',{'Fable 5.1':[31.4],'Fable 5':[17.1,'safeguard interventions scored zero'],'Opus 5':[26.9],'GPT-5.6 Sol':[19.6]}],
   ['hl','Humanity\'s Last Exam, with tools','O',{'Opus 5.5':[67.7],'Fable 5.1':[65.6,'the Fable 5.1 post gives 65.0% for the same row'],'Opus 5':[63.6],'GPT-6 Astra':[57.2]}],
   ['hl','Humanity\'s Last Exam, with tools','F',{'Fable 5.1':[65.0,'the Opus 5.5 post gives 65.6%'],'Fable 5':[63.8],'Opus 5':[63.6]}],
   ['hl','Humanity\'s Last Exam, with tools','S',{'Sonnet 5.5':[64.5],'Sonnet 5':[54.9],'Opus 5.5':[67.7]}],
   ['hn','Humanity\'s Last Exam, no tools','F',{'Fable 5.1':[60.9],'Fable 5':[57.8],'Opus 5':[56.6]}],
   ['os','OSWorld 2.1 (partial credit)','O',{'Opus 5.5':[81.8],'Fable 5.1':[80.7],'Opus 5':[74.0]}],
   ['os','OSWorld 2.1 (partial credit)','S',{'Sonnet 5.5':[80.1],'Sonnet 5':[57.0],'Opus 5.5':[81.8]}],
   ['os','OSWorld 2.0 (partial), Aug 2026 tasks','F',{'Fable 5.1':[77.9,'August 2026 task release; not comparable with earlier OSWorld 2.0 results'],'Fable 5':[72.9],'Opus 5':[75.4]}],
   ['os','OSWorld 2.0 (strict), Aug 2026 tasks','F',{'Fable 5.1':[41.7],'Fable 5':[36.1],'Opus 5':[39.6]}],
   ['ch','Chartography, with tools','O',{'Opus 5.5':[89.0],'Fable 5.1':[88.4],'Opus 5':[83.4]}],
   ['ch','Chartography, no tools','S',{'Sonnet 5.5':[61.6],'Sonnet 5':[15.6],'Opus 5.5':[64.4],'GPT-6 Sol':[53.6]}]
  ];
  const SRC={O:'Opus 5.5 post (all Opus 5.5 results at max effort unless noted)',F:'Fable 5.1 post (production safeguards on)',S:'Sonnet 5.5 post'};
  const changed=new Set();const byFam={};R.forEach(r=>{(byFam[r[0]]=byFam[r[0]]||new Set()).add(r[1])});Object.keys(byFam).forEach(f=>{if(byFam[f].size>1)changed.add(f)});
  let mode='all',sel=null;
  function draw(){
    let h='<thead><tr><th class="mh">Benchmark <small>source</small></th>'+M.map(m=>'<th>'+m+'</th>').join('')+'</tr></thead><tbody>';
    R.forEach((r,ri)=>{if(mode==='pairs'&&!changed.has(r[0]))return;const vals=Object.values(r[3]).map(v=>v[0]),mx=Math.max(...vals),mn=Math.min(...vals);
      h+='<tr><th class="mh">'+r[1]+'<small>'+r[2]+'</small></th>'+M.map(m=>{const v=r[3][m];if(!v)return '<td class="na">·</td>';
        const u=mx===mn?1:(v[0]-mn)/(mx-mn),bg='color-mix(in srgb, var(--acc) '+Math.round(10+u*45)+'%, transparent)';
        return '<td class="v'+(sel===ri+'|'+m?' on':'')+'" data-k="'+ri+'|'+m+'" style="background:'+bg+'">'+(v[0]>100?fmt(v[0]):v[0].toFixed(1)+'%')+(v[1]?'<sup>*</sup>':'')+'</td>'}).join('')+'</tr>'});
    $('blTab').innerHTML=h+'</tbody>';
    $('blTab').querySelectorAll('td.v').forEach(td=>td.addEventListener('click',()=>{sel=td.dataset.k;const [ri,m]=sel.split('|'),r=R[+ri],v=r[3][m];
      $('blNote').innerHTML='<b>'+m+', '+r[1]+':</b> '+(v[0]>100?fmt(v[0])+' Elo':v[0].toFixed(1)+'%')+'. Source: '+SRC[r[2]]+'.'+(v[1]?' Note: '+v[1]+'.':'');draw()}));
  }
  segBind('blMode',m=>{mode=m;draw()});draw();
})();

// ---- Request checker: thinking value x effort x model (thinking docs per-model table; effort docs) ----
(function(){
  // per model: outcome for each thinking value; effort support; default effort; xhigh; max
  const T=(none,ad,en,bt,dis)=>({none,adaptive:ad,enabled:en,between:bt,disabled:dis});
  const A='Adaptive thinking',X='400 error',OFF='Thinking off',EXT='Extended thinking',HB='Thinking off at high effort or below';
  const D=[
    ['Opus 5.5',T(A,A,X,X,X),'medium',1,1],
    ['Sonnet 5.5',T(A,A,X,'Up-front thinking off at high effort or below',X),'high',1,1],
    ['Fable 5.1 / Mythos 5.1',T(A,A,X,X,X),'high',1,1],
    ['Fable 5 / Mythos 5',T(A,A,X,X,X),'high',1,1],
    ['Opus 5',T(A,A,X,X,HB),'high',1,1],
    ['Sonnet 5',T(A,A,X,X,OFF),'high',1,1],
    ['Opus 4.8',T(OFF,A,X,X,OFF),'high',1,1],
    ['Opus 4.7',T(OFF,A,X,X,OFF),'high',1,1],
    ['Opus 4.6',T(OFF,A,'Extended thinking (deprecated)',X,OFF),'high',0,1],
    ['Sonnet 4.6',T(OFF,A,'Extended thinking (deprecated)',X,OFF),'high',0,1],
    ['Opus 4.5',T(OFF,X,EXT,X,OFF),'high',0,0],
    ['Sonnet 4.5',T(OFF,X,EXT,X,OFF),null,0,0],
    ['Haiku 4.5',T(OFF,X,EXT,X,OFF),null,0,0]
  ];
  function draw(){
    const t=$('rqT').value,e=$('rqE').value;let ok=0,bad=0;
    let h='<tr><th>Model</th><th>Result</th><th>Effort that runs</th></tr>';
    D.forEach(([m,tt,def,xh,mx])=>{let r=tt[t],eff;
      if(e!=='default'){if(!def){r=X+' (no effort parameter)'}else if(e==='xhigh'&&!xh){r=X+' (no xhigh on this model)'}else if(e==='max'&&!mx){r=X+' (no max on this model)'}}
      if(/high effort or below/.test(r)&&(e==='xhigh'||e==='max'))r=X+' (only accepted at high effort or below)';
      eff=def?(e==='default'?def+' (default)':e):'none';const isBad=/^400/.test(r);isBad?bad++:ok++;
      h+='<tr class="'+(isBad?'rej':'')+'"><td>'+m+'</td><td>'+(isBad?'<span style="color:var(--bad);font-weight:600">'+r+'</span>':r)+'</td><td>'+(isBad?'·':eff)+'</td></tr>'});
    $('rqTab').innerHTML=h;$('rqSum').textContent=ok+' of '+D.length+' models accept this request; '+bad+' reject it.';
  }
  $('rqT').addEventListener('change',draw);$('rqE').addEventListener('change',draw);draw();
})();

// ---- Constitutional AI stepper (Bai et al., 2022) ----
(function(){
  const S=[
   ['1. Red-team prompt','A harmful request goes to a helpful-only RLHF model. The paper used 182,831 red-team prompts: 42,496 written by people and 140,335 generated by few-shot prompting a model.'],
   ['2. Response','The helpful-only model answers, often harmfully. This answer is the raw material, not the target.'],
   ['3. Critique','The same model is asked to critique its answer against one principle drawn at random from the constitution (16 harmlessness principles in the paper).'],
   ['4. Revision','It rewrites the answer in light of the critique. Critique and revision repeat with a fresh principle each time: 4 revisions per prompt. Harmlessness rises with each revision; helpfulness drops slightly.'],
   ['5. Supervised fine-tune (SL-CAI)','A pretrained model is fine-tuned on the revisions, together with helpful answers to 135,296 human-written helpfulness prompts. This gets the model "on-distribution" so RL needs less exploration.'],
   ['6. AI comparisons','The SL-CAI model writes two answers to each harmful prompt; a feedback model is asked, as a multiple-choice question under one principle, which is better. These AI labels replace human harmlessness labels.'],
   ['7. Preference model and RL (RLAIF)','A preference model is trained on the AI harmlessness labels mixed with human helpfulness labels, and the SL-CAI model is trained by RL against it. Only the harmlessness half of the preference data is AI feedback.']];
  let k=0;
  $('caiStep').innerHTML=S.map((x,i)=>'<button data-m="'+i+'"'+(i===0?' class="on"':'')+'>'+(i+1)+'</button>').join('');
  function draw(){
    const W=660,H=170,bw=82,gap=12;let s='';const names=['Red-team prompt','Response','Critique','Revision','SL-CAI fine-tune','AI comparison','PM + RL'];
    s+='<text x="10" y="16" font-size="11" fill="var(--mute)">Supervised phase</text><text x="'+(10+5*(bw+gap))+'" y="16" font-size="11" fill="var(--mute)">RL phase</text>';
    names.forEach((n,i)=>{const x=10+i*(bw+gap),y=40,cls=i===k?'boxa':i<k?'boxc':'box';const ln=n.split(' ');
      s+=bx(x,y,bw,52,cls,ln.length>2?[ln.slice(0,2).join(' '),ln.slice(2).join(' ')]:ln.length===2&&n.length>12?[ln[0],ln[1]]:[n],11);
      if(i<names.length-1)s+=ar(x+bw,y+26,x+bw+gap,y+26)});
    // loop arrow critique <-> revision
    const xc=10+2*(bw+gap)+bw/2,xr=10+3*(bw+gap)+bw/2;s+='<path d="M'+xr+' 92 C '+xr+' 128, '+xc+' 128, '+xc+' 92" fill="none" stroke="var(--mute)" stroke-dasharray="4 3" marker-end="MARK"/><text x="'+((xc+xr)/2)+'" y="136" font-size="10.5" text-anchor="middle" fill="var(--mute)">4 rounds, new principle each</text>';
    s+='<text x="10" y="160" font-size="10.5" fill="var(--mute)">Human labels enter only at: helpfulness prompts and helpfulness preferences.</text>';
    $('caiSvg').innerHTML='<div class="tw">'+svgEl(W,H,s,'Constitutional AI pipeline').replace('<svg ','<svg style="min-width:600px" ')+'</div>';
    $('caiTxt').innerHTML='<b>'+S[k][0]+'.</b> '+S[k][1];
  }
  segBind('caiStep',m=>{k=+m;draw()});draw();
})();

// ---- Worked example: computed from the page's formula ----
function sessFixed(p,P,T,N,O){const w=1.25*p.i;return {write:P*w/1e6,read:T*P*p.c/1e6,inp:T*N*p.i/1e6,out:T*O*p.o/1e6}}
(function(){
  const P=1e5,T=50,N=5e3,O=2e3,rows=[['Fable 5.1',PBY('Fable 5.1')],['Fable 5',PBY('Fable 5')],['Opus 5.5',PBY('Opus 5.5')],['Opus 5',PBY('Opus 5')],['Sonnet 5.5',PBY('Sonnet 5.5')],['Haiku 4.5',PBY('Haiku 4.5')]];
  let h='<tr><th>Model</th><th class="num">w, c, i, o</th><th class="num">Cache write</th><th class="num">Per turn</th><th class="num">Session C</th></tr>';
  const tot=x=>x.write+x.read+x.inp+x.out;
  rows.forEach(([n,p])=>{const x=sessFixed(p,P,T,N,O),pt=(x.read+x.inp+x.out)/T;h+='<tr><td>'+n+'</td><td class="num">'+[1.25*p.i,p.c,p.i,p.o].map(v=>fmt(v,2)).join(', ')+'</td><td class="num">'+usd(x.write,3)+'</td><td class="num">'+usd(pt,3)+'</td><td class="num"><b>'+usd(tot(x),3)+'</b></td></tr>'});
  const f=PBY('Fable 5.1'),nc=T*((P+N)*f.i+O*f.o)/1e6;
  h+='<tr><td>Fable 5.1, no caching</td><td class="num">i = 10, o = 50</td><td class="num">none</td><td class="num">'+usd(nc/T,3)+'</td><td class="num"><b>'+usd(nc,2)+'</b></td></tr>';
  $('weTab').innerHTML=h;
  // one turn split, Fable 5 against Fable 5.1
  let b='';[['Fable 5',PBY('Fable 5')],['Fable 5.1',PBY('Fable 5.1')]].forEach(([n,p])=>{const r=P*p.c/1e6,i=N*p.i/1e6,o=O*p.o/1e6,t=r+i+o;
    b+='<span>'+n+' turn '+usd(t,3)+'</span><div class="sb">'+[[r,'cache read','var(--good)'],[i,'new input','var(--c1)'],[o,'output','var(--c4)']].map(([v,l,c])=>'<span style="width:'+(100*v/t).toFixed(1)+'%;background:'+c+'" title="'+l+' '+usd(v,3)+'">'+l+' '+Math.round(100*v/t)+'%</span>').join('')+'</div>'});
  $('weBars').innerHTML=b;
})();
