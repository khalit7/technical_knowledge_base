// ---- Lineage tab: one lane per job, dots coloured by licence, the 2026 consolidation drawn as arrows ----
(function(){
  if(!$('lnSvg'))return;
  const L={g:'General',c:'Code, agents',r:'Reasoning',v:'Vision, OCR',s:'Speech',e:'Edge',x:'Other'};
  const LIC={a:'Apache 2.0',m:'Modified MIT',r:'Research or non-commercial',p:'API only',u:'Not stated'};
  const LCOL={a:'var(--open)',m:'var(--c2)',r:'var(--closed)',p:'var(--mute)',u:'var(--dim)'};
  const E=[
   ['2023-09-27','g','Mistral 7B','a','Sliding-window attention (4,096) plus GQA (32 query, 8 key-value heads); beat Llama 2 13B on every benchmark the paper ran.','{{Mistral|@m7}}'],
   ['2023-12-11','g','Mixtral 8x7B','a','Eight experts per layer, two active: 46.7B total, 12.9B active; full attention over 32k. Weights released by torrent a few days earlier.','{{Mistral|@mixn}}'],
   ['2024-02-26','g','Mistral Large','p','The first flagship, API only: "the world\'s second-ranked model generally available through an API (next to GPT-4)", by Mistral\'s report.','{{Mistral|@large1}}'],
   ['2024-04-17','g','Mixtral 8x22B','a','141B total, 39B active, 64k context.','{{Mistral|@x22}}'],
   ['2024-05-29','c','Codestral 22B','r','Code model trained for fill-in-the-middle, under the new Mistral AI Non-Production License; commercial licences on request.','{{Mistral|@cod}}'],
   ['2024-07-16','c','Codestral Mamba','a','A Mamba (state-space) code model under Apache 2.0, released with Mathstral.','{{Mistral|@mamba}}'],
   ['2024-07-18','g','Mistral NeMo 12B','a','12B model built with Nvidia, Apache 2.0.','{{Mistral|@nemo}}'],
   ['2024-07-24','g','Mistral Large 2','r','123B, 128k context; weights under the Mistral Research License for research and non-commercial use, a Mistral Commercial License for self-deployment.','{{Mistral|@large2}}'],
   ['2024-09-17','v','Pixtral 12B','a','Mistral\'s first vision model: a 400M-parameter vision encoder trained from scratch feeding the language decoder, images and text interleaved. Apache 2.0.','{{Mistral|@pix}}'],
   ['2024-10-16','e','Ministral 3B and 8B','r','Edge models; Mistral Research License, commercial licence for self-deployment.','{{Mistral|@ministraux}}'],
   ['2024-11-18','v','Pixtral Large','r','124B multimodal flagship under the Mistral Research License.','{{Mistral|@pixl}}'],
   ['2025-01-30','g','Mistral Small 3','a','24B, latency-optimised, back on Apache 2.0: "we progressively move away from MRL-licensed models".','{{Mistral|@small3}}'],
   ['2025-03-17','g','Mistral Small 3.1','a','Small 3 with image input and a 128k context, Apache 2.0.','{{Mistral|@small31}}'],
   ['2025-05-07','g','Mistral Medium 3','p','A closed mid-size model on the API.','{{Mistral|@med3}}'],
   ['2025-05-21','c','Devstral','a','24B agentic coding model, Apache 2.0, tuned for working inside a scaffold: read the repository, edit files, run the tests.','{{Mistral|@devn}}'],
   ['2025-06-10','r','Magistral','a','Mistral\'s first reasoning models: Magistral Small (24B, Apache 2.0) and Magistral Medium (API only), trained with GRPO on verifiable rewards.','{{Mistral|@mag}}'],
   ['2025-07-15','s','Voxtral','a','Speech understanding: Voxtral Small (24B) and Mini (3B), Apache 2.0.','{{Mistral|@vox}}'],
   ['2025-07-30','c','Codestral 25.08','p','Code completion with fill-in-the-middle, API only, 128k context.','{{docs|@cod2508}}'],
   ['2025-12-02','g','Mistral Large 3','a','675B total, 41B active, DeepSeek-V3-shaped with 128 experts; trained on 3,000 H200s; image input; 256k context.','{{Mistral|@m3}}'],
   ['2025-12-02','e','Ministral 3','a','3B, 8B and 14B, each in base, instruct and reasoning variants, all with image input; 85% on AIME 2025 for the 14B reasoning model, by Mistral\'s report.','{{Mistral|@m3}}'],
   ['2025-12-09','c','Devstral 2','m','123B dense (modified MIT) and Devstral Small 2, 24B (Apache 2.0); 72.2% and 68.0% on SWE-bench Verified; with the Vibe command-line agent. Both now retired from the API.','{{Mistral|@dev2}}'],
   ['2026-02-04','s','Voxtral Transcribe 2','p','Batch transcription on the API, with Voxtral Realtime (4B) as open weights under Apache 2.0.','{{Mistral|@voxt2}}'],
   ['2026-03-16','g','Mistral Small 4','a','119B total, 6B active (128 experts, 4 active, one shared), latent attention; absorbs Magistral and Devstral behind reasoning_effort.','{{Mistral|@s4}}'],
   ['2026-03-16','x','Leanstral','a','Lean 4 proof generation on the Small 4 family, 119B total and 6B active, Apache 2.0.','{{Mistral|@lean}}'],
   ['2026-03-23','s','Voxtral TTS','r','4B text to speech, open weights under CC BY-NC 4.0.','{{Mistral|@vtts}}'],
   ['2026-04-29','g','Mistral Medium 3.5','m','Dense 128B with GQA, vision encoder trained from scratch, reasoning setting; weights and API on 28 to 29 April, announced on 22 May when it replaced Magistral and Devstral 2 in Mistral\'s products.','{{model card|@m35card}}'],
   ['2026-06-23','v','Mistral OCR 4','p','Document understanding on the API; replaced by OCR 4.1 on 16 July.','{{Mistral|@ocr4}}'],
   ['2026-07-02','x','Leanstral 1.5','a','587 of 672 PutnamBench problems, by Mistral\'s report; Apache 2.0.','{{Mistral|@lean15}}'],
   ['2026-07-08','x','Robostral Navigate','u','8B camera-and-language navigation model, trained in simulation; 76.6% success on unseen R2R-CE environments, by Mistral\'s report. No licence named.','{{Mistral|@robo}}'],
   ['2026-07-15','g','Next flagship (early access)','u','Partner early access to an open-weight model expected to be considerably larger than Large 3; no public name, size or licence by the end of September. Date shown is mid-July: the month is sourced, the day is not.','{{Tech Times|@tt}}'],
   ['2026-08-04','x','Shieldstral 1.0','a','Policy-adaptive guard model, text and image, 32k context, public preview.','{{Mistral|@shieldn}}']
  ].map(([d,k,n,l,t,src],i)=>({d:new Date(d+'T00:00:00Z'),k,n,l,t,src,id:'ln'+i}));
  const ABS=[['Magistral','Mistral Small 4'],['Devstral','Mistral Small 4'],['Magistral','Mistral Medium 3.5'],['Devstral 2','Mistral Medium 3.5'],['Pixtral 12B','Mistral Large 3']];
  let range='all',filt='all';const mon=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dlab=e=>e.d.getUTCDate()+' '+mon[e.d.getUTCMonth()]+' '+e.d.getUTCFullYear();
  const SH=n=>n.replace('Mistral ','').replace(' (early access)',' (early access)');
  function draw(){
    const narrow=$('lnSvg').clientWidth<560,W=narrow?600:880,pl=narrow?74:92,pr=16;
    const t0=range==='all'?Date.UTC(2023,7,1):Date.UTC(2025,0,1),t1=Date.UTC(2026,9,15);
    const T26=Date.UTC(2026,0,1),sp=range==='all'?0.6:0.45;const x=t=>{const w=W-pl-pr;return t<T26?pl+w*sp*(t-t0)/(T26-t0):pl+w*(sp+(1-sp)*(t-T26)/(t1-T26))};
    const keep=e=>+e.d>=t0&&(filt==='all'||(filt==='open'?(e.l==='a'||e.l==='m'||e.l==='r'):e.l==='p'));
    const lanes=['g','c','r','v','s','e','x'],LH=58,top=16,H=top+lanes.length*LH+24;let s='';
    const tick=(xx,l)=>'<line x1="'+xx+'" x2="'+xx+'" y1="'+top+'" y2="'+(H-18)+'" stroke="var(--line)" stroke-dasharray="3 3"/><text x="'+(xx+3)+'" y="'+(H-5)+'" font-size="10.5" fill="var(--mute)">'+l+'</text>';
    if(range==='all'){[2024,2025,2026].forEach(y=>s+=tick(x(Date.UTC(y,0,1)),String(y)));[4,7].forEach(m=>s+=tick(x(Date.UTC(2026,m-1,1)),mon[m-1]))}else [[2025,0,'2025'],[2025,6,'Jul 2025'],[2026,0,'2026'],[2026,3,'Apr'],[2026,6,'Jul']].forEach(([y,m,l])=>s+=tick(x(Date.UTC(y,m,1)),l));
    lanes.forEach((k,li)=>{const y=top+li*LH+LH/2;s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/><text x="'+(pl-6)+'" y="'+(y+4)+'" font-size="11" text-anchor="end" font-weight="600">'+L[k]+'</text>'});
    const ev=E.filter(keep).sort((a,b)=>a.d-b.d),pos={};
    // consolidation arrows, behind the dots
    ABS.forEach(([a,b])=>{const A=E.find(e=>e.n===a),Bv=E.find(e=>e.n===b);if(!A||!Bv||!keep(A)||!keep(Bv))return;
      const x1=x(+A.d),y1=top+lanes.indexOf(A.k)*LH+LH/2,x2=x(+Bv.d),y2=top+lanes.indexOf(Bv.k)*LH+LH/2,cx=(x1+x2)/2;
      s+='<path d="M'+x1.toFixed(1)+' '+y1+' C'+cx.toFixed(1)+' '+y1+' '+cx.toFixed(1)+' '+y2+' '+(x2-6).toFixed(1)+' '+y2+'" fill="none" stroke="var(--c5)" stroke-width="1.4" stroke-dasharray="4 3" marker-end="MARK"/>'});
    const placed={};
    ev.forEach(e=>{const li=lanes.indexOf(e.k),y=top+li*LH+LH/2,xx=x(+e.d),lab=SH(e.n),lw=lab.length*5.6+6;
      const P=placed[e.k]=placed[e.k]||{up:[],dn:[],up2:[],dn2:[]};const end=xx+lw>W-4,iv=end?[xx-lw,xx]:[xx,xx+lw];
      const fits=arr=>!arr.some(([a,b])=>iv[0]<b+3&&iv[1]>a-3);let side=['up','dn','up2','dn2'].find(k=>fits(P[k]))||'up';
      P[side].push(iv);const ty={up:y-9,dn:y+17,up2:y-20,dn2:y+28}[side];
      const ring=e.l==='p'||e.l==='u';
      s+='<g class="lnd" data-id="'+e.id+'" style="cursor:pointer"><circle cx="'+xx.toFixed(1)+'" cy="'+y+'" r="5.5" fill="'+(ring?'var(--bg)':LCOL[e.l])+'" stroke="'+LCOL[e.l]+'" stroke-width="'+(ring?2.2:1)+'"/><text x="'+(xx+(end?-3:3)).toFixed(1)+'" y="'+ty+'" font-size="10.5"'+(end?' text-anchor="end"':'')+'>'+lab+'</text><title>'+dlab(e)+': '+e.n+' ('+LIC[e.l]+')</title></g>'});
    $('lnSvg').innerHTML='<div class="tw">'+svgEl(W,H,s,'Mistral releases by job and licence on a time axis').replace('<svg ','<svg style="min-width:'+(narrow?560:600)+'px" ')+'</div>';
    $('lnSvg').querySelectorAll('.lnd').forEach(g=>g.addEventListener('click',()=>{const c=$(g.dataset.id);if(!c)return;document.querySelectorAll('.tl-item').forEach(q=>q.classList.toggle('sel',q===c));c.scrollIntoView({block:'center',behavior:'smooth'})}));
    $('lnCards').innerHTML=ev.map(e=>'<div class="tl-item" style="border-left:4px solid '+LCOL[e.l]+'" id="'+e.id+'"><h3>'+e.n+'</h3><div class="dt">'+dlab(e)+' · '+L[e.k]+' · '+LIC[e.l]+' · '+e.src+'</div><p style="margin:4px 0 0;font-size:14px">'+e.t+'</p></div>').join('');
    $('lnLeg').innerHTML=Object.keys(LIC).map(k=>'<span><svg width="14" height="14" style="display:inline-block;vertical-align:middle;margin-right:4px"><circle cx="7" cy="7" r="5" fill="'+(k==='p'||k==='u'?'var(--bg)':LCOL[k])+'" stroke="'+LCOL[k]+'" stroke-width="2"/></svg>'+LIC[k]+'</span>').join('')+'<span><svg width="22" height="10" style="display:inline-block;vertical-align:middle;margin-right:4px"><line x1="0" y1="5" x2="22" y2="5" stroke="var(--c5)" stroke-width="1.6" stroke-dasharray="4 3"/></svg>folded into a generalist</span>';
  }
  segBind('lnR',m=>{range=m;draw()});
  const F=$('lnF');F.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{F.querySelectorAll('button').forEach(q=>q.classList.toggle('on',q===b));filt=b.dataset.m;draw()}));
  onTab('t-line',draw);
  let rw=0;addEventListener('resize',()=>{if(!$('t-line').hidden){const w=$('lnSvg').clientWidth<560;if(w!==rw){rw=w;draw()}}});
})();
