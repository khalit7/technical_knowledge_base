// ---- Reading section 4: what each corpus kept from the same WARC file (one cell per HTML page), animated ----
// 2026-11-09: each step is explained by the step list on the left (sx-kp3, or sx-kp2 for the lenient cut); the captions that repeated it were removed.
// The numbers the lists quote are build facts (the kp_ and nm_ keys of data/facts.json); src/check_stages.mjs checks them against what this script computes (window.PCK).
(function(){
  const K=window.PC&&PC.kept;if(!K||!document.getElementById('pc-kp'))return;
  const code=K.code,N=code.length,sc=K.edu_scores_measured,tk=K.fw_tokens_gpt2;
  // index of each FineWeb page among FineWeb pages (scores and tokens are stored per FineWeb page, in WARC order)
  const fwIdx=new Int32Array(N).fill(-1);let j=0;for(let i=0;i<N;i++)if(code[i]!=='0')fwIdx[i]=j++;
  const EI=K.edu_int||'';
  let mode=3;
  const fmt=n=>n.toLocaleString('en-US');
  function stats(sel){let p=0,t=0;for(let i=0;i<N;i++)if(sel(i)){p++;const k=fwIdx[i];if(k>=0&&tk[k])t+=tk[k]}return [p,t]}
  const inFW=i=>code[i]!=='0',pubEdu=i=>code[i]==='2',mine=i=>fwIdx[i]>=0&&+EI[fwIdx[i]]>=mode;
  const STEPS=[
    {sel:()=>true,col:()=>'var(--mute)'},
    {sel:inFW,col:i=>inFW(i)?'var(--c1)':'var(--dim)'},
    {sel:i=>mode===3?pubEdu(i):mine(i),col:i=>(mode===3?pubEdu(i):mine(i))?'var(--c2)':inFW(i)?'var(--c1)':'var(--dim)'},
    {sel:i=>mine(i),col:i=>mine(i)?'var(--c2)':inFW(i)?'var(--c1)':'var(--dim)'}
  ];
  // Nemotron-CC v1, from the streamed scan of its CC-MAIN-2024-30 files (real buckets only; the scan may be partial)
  const NM=K.nemo,NR=NM?NM.real:'',NB=['','low','medium-low','medium','medium-high','high'],NC=['','var(--c5)','var(--c6)','var(--c3)','var(--c4)','var(--c2)'];
  if(NM){
    STEPS.push({sel:i=>NR[i]!=='0',col:i=>NR[i]!=='0'?NC[+NR[i]]:inFW(i)?'var(--dim)':'var(--soft)'});
  }
  let step=0;
  function draw(i){step=i;const el=document.getElementById('pc-kp');const W=RD.width(el);
    const cs=Math.max(2,Math.floor(Math.sqrt(W*(W<500?300:400)/N))),cols=Math.floor(W/cs),rows=Math.ceil(N/cols),H=rows*cs;
    let cv=el.querySelector('canvas');if(!cv){cv=document.createElement('canvas');el.appendChild(cv)}
    const dpr=window.devicePixelRatio||1;cv.width=cols*cs*dpr;cv.height=H*dpr;cv.style.width=(cols*cs)+'px';cv.style.height=H+'px';
    const ctx=cv.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,cols*cs,H);
    const cssv=v=>getComputedStyle(document.documentElement).getPropertyValue(v.slice(4,-1)).trim()||'#888';
    const cache={};const st=STEPS[i];
    const hot=[];
    for(let k=0;k<N;k++){const c=st.col(k);if(c==='var(--c2)'||(i===4&&NR[k]!=='0'))hot.push(k);ctx.fillStyle=cache[c]||(cache[c]=cssv(c));ctx.fillRect((k%cols)*cs,Math.floor(k/cols)*cs,cs-(cs>2?1:0),cs-(cs>2?1:0))}
    // the few pages the educational filter keeps are drawn a little larger on top, so they stay visible on a phone
    if(cs<4)hot.forEach(k=>{const c=st.col(k);ctx.fillStyle=cache[c]||(cache[c]=cssv(c));ctx.fillRect((k%cols)*cs-1,Math.floor(k/cols)*cs-1,cs+2,cs+2)});
    const [p,t]=stats(st.sel),[,tAll]=stats(inFW);
    const lg=document.getElementById('pc-kp-leg');if(lg)lg.innerHTML=i===4?NB.slice(1).map((b,j)=>'<span><i style="background:'+NC[j+1]+'"></i>Nemotron-CC '+b+'</span>').reverse().join('')+'<span><i style="background:var(--dim)"></i>FineWeb, not found in Nemotron-CC</span>':'<span><i style="background:var(--dim)"></i>dropped by FineWeb\'s pipeline</span><span><i style="background:var(--c1)"></i>in FineWeb</span><span><i style="background:var(--c2)"></i>kept by the educational filter</span>';
    document.getElementById('pc-kp-ctr').innerHTML='<span>pages <b>'+fmt(p)+'</b></span><span>share of the raw HTML pages <b>'+(100*p/N).toFixed(2)+'%</b></span>'+(i===4?'<span>also in FineWeb <b>'+fmt(stats(k=>NR[k]!=='0'&&inFW(k))[0])+'</b></span>':i>0?'<span>GPT-2 tokens <b>'+fmt(t)+'</b> ('+(100*t/tAll).toFixed(1)+'% of FineWeb\'s)</span>':'<span>GPT-2 tokens <b>not counted for raw HTML</b></span>');
  }
  const an=RD.anim({card:'pc-kp-card',ctl:'pc-kp-ctl',n:STEPS.length,ms:4200,label:'Step',list:'sx-kp3',draw});
  // the cut toggle swaps the step list (step 3 and 4 differ) and replays from the raw file
  RD.seg(document.getElementById('pc-kp-seg'),m=>{mode=+m;const on='sx-kp'+m,off='sx-kp'+(m==='3'?'2':'3');document.getElementById(off).hidden=true;document.getElementById(on).hidden=false;an.reset(STEPS.length,on)});
  // what the step lists quote, computed here from the data (checked by src/check_stages.mjs)
  {const ge=t=>stats(i=>fwIdx[i]>=0&&+EI[fwIdx[i]]>=t)[0];window.PCK={html:N,responses:K.responses,fw:K.fineweb,edu:K.fineweb_edu,mine3:ge(3),mine2:ge(2),steps:STEPS.length};
   if(NM){const real=Object.entries(NM.coverage).filter(([b])=>b.endsWith('/actual/actual'));const fd=real.reduce((a,[,v])=>a+v.files_done,0),ft=real.reduce((a,[,v])=>a+v.files,0),est=real.reduce((a,[,v])=>a+(v.files_done?v.found*v.files/v.files_done:0),0);
     Object.assign(PCK,{nmFilesDone:fd,nmFiles:ft,nmCov:Math.round(100*fd/ft)+'%',nmFound:NR.split('').filter(c=>c!=='0').length,nmBoth:NR.split('').filter((c,i)=>c!=='0'&&code[i]!=='0').length,nmEst:Math.round(est/10)*10})}}
  RD.onResize(()=>an.redraw());
})();
