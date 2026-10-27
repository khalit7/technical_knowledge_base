// ---- Reading tab: the mask explorer, the mixing coefficient, the cost calculator, the small results charts ----
(function(){
  const P=window.PAPER,RC=P.rc,TB=P.tables;
  // 1. Mask explorer: one prompt in the paper's ARC template (Appendix A.10), with the example question of A.9
  const WORDS=['Question:','George','wants','to','warm','his','hands','quickly.','Which','surface','makes','the','most','heat?','Choices:','dry','palms','wet','palms','oily','palms','Answer:'];
  const NP=WORDS.length;let mk='causal',sel=1;
  const can=(m,i,j)=>m==='causal'?j<=i:m==='bidir'?true:j>=i;
  function maskDraw(w){const chips=$('mkChips');
    chips.innerHTML=WORDS.map((t,i)=>{const vis=can(mk,sel,i),me=i===sel;return '<button data-i="'+i+'" class="'+(me?'on':'')+'" style="'+(me?'':vis?'background:var(--acc2);color:var(--ink)':'opacity:.45')+'" aria-pressed="'+(me?'true':'false')+'">'+t+'</button>'}).join('');
    chips.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{sel=+b.dataset.i;maskDraw(w)}));
    const n=WORDS.filter((_,i)=>can(mk,sel,i)).length;
    $('mkOut').innerHTML='<b>'+WORDS[sel]+'</b> (token '+(sel+1)+' of '+NP+') can attend to <b>'+n+'</b> of the '+NP+' prompt tokens'+(mk==='causal'?(sel<14?': it never sees the choices, so its keys and values in every block are computed without them.':sel===NP-1?': the last prompt token sees everything, and so does every answer token after it.':'.'):mk==='bidir'?': every prompt token sees the whole prompt, so even "George" is encoded knowing what is asked and which choices follow.':': only itself and what comes after (the anti-causal mask of Table 8).');
    const cs=Math.max(5,Math.min(13,Math.floor((w-70)/NP))),S=cs*NP,ox=Math.max(60,(w-S)/2);let s='';
    for(let i=0;i<NP;i++)for(let j=0;j<NP;j++){const on=can(mk,i,j);s+=rc(ox+j*cs,8+i*cs,cs-1,cs-1,on?(i===sel?'var(--c2)':'var(--acc)'):'var(--soft)',{r:1,op:on?(i===sel?1:.55):1})}
    s+=tx(ox-6,8+sel*cs+cs-2,'query →',{fs:11,a:'end',c:'var(--mute)'});
    s+=tx(ox+S/2,8+S+16,'keys (tokens attended to), left to right',{fs:11,a:'middle',c:'var(--mute)'});
    $('mkSvg').innerHTML=svgW(w,S+34,s,'Attention mask')}
  segBind('mkM',m=>{mk=m;$('mkM').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));refit($('mkSvg'))});

  // 2. The mixing coefficient (Eq. 8): alpha = |theta| / (theta_init + |theta|)
  function alDraw(w){const ti=+$('alInit').value,lt=+$('alTh').value,th=10**lt,al=th/(ti+th);
    $('alThV').textContent=th<0.01?th.toExponential(1):th.toPrecision(2);
    const H=190,pl=42,pr=12,pt=12,pb=34,X=v=>pl+(w-pl-pr)*(v+4)/4,Y=v=>pt+(H-pt-pb)*(1-v);
    let s='';[0,0.25,0.5,0.75,1].forEach(v=>{s+=ln2(pl,Y(v),w-pr,Y(v),'var(--line)')+tx(pl-6,Y(v)+4,v.toFixed(2),{fs:11,a:'end',c:'var(--mute)'})});
    [-4,-3,-2,-1,0].forEach(e=>s+=tx(X(e),H-pb+16,'10'+sup(e),{fs:11,a:'middle',c:'var(--mute)'}));
    s+=tx((pl+w-pr)/2,H-4,'|θ| (log scale)',{fs:11,a:'middle',c:'var(--mute)'});
    [[0.1,'var(--c1)'],[0.01,'var(--c2)'],[0.001,'var(--c3)']].forEach(([t,c])=>{let p='';for(let k=0;k<=80;k++){const e=-4+4*k/80,v=10**e;p+=X(e).toFixed(1)+','+Y(v/(t+v)).toFixed(1)+' '}
      s+='<polyline fill="none" stroke="'+c+'" stroke-width="'+(t===ti?2.6:1.2)+'" opacity="'+(t===ti?1:.5)+'" points="'+p+'"/>'});
    s+='<circle cx="'+X(Math.log10(ti)).toFixed(1)+'" cy="'+Y(0.5).toFixed(1)+'" r="4" fill="none" stroke="var(--ink)"/>';
    s+='<circle cx="'+X(lt).toFixed(1)+'" cy="'+Y(al).toFixed(1)+'" r="5" fill="var(--bad)"/>';
    const lg=legend([['θ_init 0.1','var(--c1)'],['0.01','var(--c2)'],['0.001','var(--c3)']],pl+8,pt+12,w-pl-pr);
    $('alSvg').innerHTML=svgW(w,H,s+lg.s,'alpha as a function of theta');
    $('alOut').innerHTML='α = |θ| / (θ<sub>init</sub> + |θ|) = <b>'+al.toFixed(3)+'</b>: the K and V that block passes on are '+Math.round(100*(1-al))+'% causal and '+Math.round(100*al)+'% bidirectional. Training starts at θ = θ<sub>init</sub> (open circle), so α starts at 0.5 whatever θ<sub>init</sub> is; θ<sub>init</sub> sets how fast α can move: dα/dθ = 1/(4θ<sub>init</sub>) = '+(1/(4*ti)).toFixed(1)+' there. That is why, in the paper\'s Figure 2, 0.1 barely moves and 0.001 swings ('+A(P.meta.ax+'#A1.F2','Figure 2')+'; '+'<a href="#" data-tab="t-tables" data-to="tbFigs">decoded</a>).'}
  ['alInit','alTh'].forEach(id=>$(id).addEventListener('input',()=>refit($('alSvg'))));$('alInit').addEventListener('change',()=>refit($('alSvg')));

  // 3. Cost: the paper's one measurement (Table 4, Gemma-2B, A100), extended linearly in both lengths
  const pfL=RC.t4.prefill_ms_per_token_lora,pfB=RC.t4.prefill_ms_per_token_bitune,gen=RC.t4.gen_ms_per_token_lora;
  function costDraw(w){const np=Math.round(10**+$('csP').value),na=Math.round(10**+$('csA').value);$('csPV').textContent=fmt(np);$('csAV').textContent=fmt(na);
    const tl=np*pfL+na*gen,tb=np*pfB+na*gen,ex=100*(tb/tl-1);
    $('csOut').innerHTML=stat('LoRA','~'+(tl/1000).toFixed(tl<1000?2:1)+' s','prefill '+(np*pfL/1000).toFixed(3)+' s + generation')+stat('Bitune','~'+(tb/1000).toFixed(tb<1000?2:1)+' s','prefill '+(np*pfB/1000).toFixed(3)+' s + generation')+stat('Extra time','+'+(ex<1?ex.toFixed(2):ex.toFixed(1))+'%',ex<1?'negligible, as §3.4 says':ex<10?'noticeable':'not negligible');
    const H=34,pl=60;let s='';const mx=tb,Xs=v=>(w-pl-8)*v/mx;
    [['LoRA',np*pfL,tl],['Bitune',np*pfB,tb]].forEach(([n,p,t],i)=>{const y=i*17;s+=tx(pl-6,y+12,n,{fs:11,a:'end'})+rc(pl,y+2,Xs(p),12,'var(--c2)',{r:2})+rc(pl+Xs(p),y+2,Xs(t-p),12,'var(--acc2)',{r:2})});
    $('csSvg').innerHTML=svgW(w,H,s,'prefill and generation time')}
  ['csP','csA'].forEach(id=>$(id).addEventListener('input',()=>refit($('csSvg'))));
  [['csE1',2000,2000],['csE2',200,50],['csE3',50,200],['csE4',32000,200]].forEach(([id,p,a])=>$(id).addEventListener('click',()=>{$('csP').value=Math.log10(p);$('csA').value=Math.log10(a);refit($('csSvg'))}));

  // 4. Small results chart: average gain over LoRA per model and setting, with the noise (Table 21/22)
  function resDraw(w){const MO=['Gemma-2B','Gemma-7B','Llama2-7B','Llama3-8B','Phi-2'],H=MO.length*44+40,pl=82,pr=16;
    const avgSE=(tb,mo,a,b)=>{const r1=TB[tb].rows.find(x=>x.model===mo&&x.method===a),r0=TB[tb].rows.find(x=>x.model===mo&&x.method===b);if(!r1||!r0)return null;
      const sd=r=>{let q=0;for(let k=0;k<5;k++)q+=(+r.vals[2*k+1])**2;return Math.sqrt(q)/5};return Math.sqrt(sd(r1)**2/3+sd(r0)**2/3)};
    const rows=MO.map(mo=>({mo,it:RC.gains['Table 1'][mo].vs_lora,itse:avgSE('Table 21',mo,'Bitune','LoRA'),ds:RC.gains['Table 2'][mo].vs_lora,dsse:avgSE('Table 22',mo,'Bitune','LoRA')}));
    const lo=-1,hi=5,X=v=>pl+(w-pl-pr)*(v-lo)/(hi-lo);let s='';
    for(let t=lo;t<=hi;t++)s+=ln2(X(t),16,X(t),H-26,t===0?'var(--mute)':'var(--line)')+tx(X(t),H-10,(t>0?'+':'')+t,{fs:11,a:'middle',c:'var(--mute)'});
    rows.forEach((r,i)=>{const y=24+i*44;s+=tx(pl-8,y+14,r.mo,{fs:12,a:'end',w:600});
      [[r.it,r.itse,'var(--c1)',y+6,'instruction-tuned (Table 1)'],[r.ds,r.dsse,'var(--c2)',y+22,'trained per task (Table 2)']].forEach(([v,se,c,cy,lab])=>{s+=ln2(X(v-se),cy,X(v+se),cy,c,{sw:2})+'<circle cx="'+X(v).toFixed(1)+'" cy="'+cy+'" r="4.5" fill="'+c+'"><title>'+r.mo+', '+lab+': '+(v>0?'+':'')+v+' ± '+se.toFixed(2)+'</title></circle>'+tx(X(v+se)+5,cy+4,(v>0?'+':'')+v.toFixed(1),{fs:11,c:'var(--mute)'})})});
    const L=legend([['instruction-tuned, 5-task average (Table 1)','var(--c1)'],['trained per task, 5-task average (Table 2)','var(--c2)']],pl,10,w-pl);
    $('resSvg').innerHTML=svgW(w,H+L.h,'<g transform="translate(0,'+L.h+')">'+s+'</g>'+L.s,'Average gain of Bitune over LoRA per model')}

  // 5. Ablations (Table 5 with Table 23's spreads) beside the toy's (filled in by 23_js_run.js when the toy data is present)
  function ablDraw(w){const V=['LoRA','Naive Bidir.','No Mixing','Only Causal','Shared Weights','Bitune'],MO=['Gemma-2B','Llama3-8B'];
    const toy=window.BT_ABL||null,np=toy?3:2,narrow=w<620,cols=narrow?1:np,gap=14,cw=(w-96-gap*(cols-1))/cols,ph=V.length*22+56,H=narrow?ph*np:ph;let s='';
    const panel=(i,title,get,lo,hi,fmtv)=>{const x0=96+(narrow?0:i*(cw+gap)),y0=narrow?i*ph:0,X=v=>x0+cw*(v-lo)/(hi-lo);
      s+=tx(x0+cw/2,y0+12,title,{fs:12,a:'middle',w:600});
      if(narrow||i===0)V.forEach((v,k)=>s+=tx(90,y0+30+k*22+10,v,{fs:11,a:'end'}));
      [lo,(lo+hi)/2,hi].forEach((t,q)=>s+=ln2(X(t),y0+20,X(t),y0+ph-30,'var(--line)')+tx(X(t),y0+ph-16,fmtv(t),{fs:11,a:q===0?'start':q===2?'end':'middle',c:'var(--mute)'}));
      V.forEach((v,k)=>{const r=get(v);if(!r)return;const y=y0+30+k*22,c=v==='Bitune'?'var(--good)':v==='LoRA'?'var(--mute)':'var(--acc)';
        s+=rc(X(lo),y,Math.max(0,X(Math.max(lo,r.m))-X(lo)),12,c,{r:2,op:.85});if(r.sd)s+=ln2(X(r.m-r.sd),y+6,X(r.m+r.sd),y+6,'var(--ink)',{sw:1.4});
        s+='<title>'+v+': '+r.m.toFixed(1)+(r.sd?' ± '+r.sd.toFixed(2):'')+'</title>'})};
    MO.forEach((mo,k)=>{const get=v=>{const r=RC.std_tables['Table 23|'+mo+'|'+v];return r?{m:r.mean,sd:r.sd_avg_indep}:null};
      const ms=V.map(v=>get(v).m),lo=Math.floor(Math.min(...ms)-1),hi=Math.ceil(Math.max(...ms)+1);panel(k,mo+' (paper)',get,lo,hi,t=>t.toFixed(0))});
    if(toy)panel(2,'toy (this page)',v=>toy[v]||null,80,100,t=>t.toFixed(0)+'%');
    $('ablSvg').innerHTML=svgW(w,H,s,'Ablations')}
  window.BT_ABL_REDRAW=()=>refit($('ablSvg'));

  onTab('t-read',()=>{fit($('mkSvg'),maskDraw);fit($('alSvg'),alDraw);fit($('csSvg'),costDraw);fit($('resSvg'),resDraw);fit($('ablSvg'),ablDraw)});
  // predict reveals
  PRED_REVEAL['pr-cost']=()=>{$('csP').value=Math.log10(2000);$('csA').value=Math.log10(2000);refit($('csSvg'))};
})();
