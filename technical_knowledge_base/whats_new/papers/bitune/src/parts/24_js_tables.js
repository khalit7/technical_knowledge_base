// ---- The paper's tables and figures, rebuilt (data: window.PAPER from mk_paper.py) ----
(function(){
  const P=window.PAPER,TB=P.tables,RC=P.rc,AX=P.meta.ax;
  const STD={'Table 1':'Table 21','Table 2':'Table 22','Table 5':'Table 23','Table 6':'Table 24','Table 15':'Table 25'};
  const LIST=['Table 1','Table 2','Table 3','Table 5','Table 6','Table 7','Table 8','Table 15','Table 16','Table 17','Table 14','Table 4'];
  const BASE={'Table 7':'Full FT','Table 8':'Causal','Table 15':'0.01'};
  const NAMES={'Table 1':'zero-shot after instruction tuning (UltraFeedback)','Table 2':'trained on each task','Table 3':'chain-of-thought training (GPT-4.1 traces)','Table 5':'ablations: components','Table 6':'other PEFT methods','Table 7':'full finetuning, Gemma-2B','Table 8':'ablations: the second pass\'s mask','Table 15':'initial mixing coefficient','Table 16':'instruction tuning on Alpaca','Table 17':'Codestral-22B on GSM8K','Table 14':'training time and memory','Table 4':'inference time, Gemma-2B'};
  const num=s=>parseFloat(String(s).replace(/s$/,''));
  const isNum=s=>/^-?\d/.test(String(s));
  const baseOf=(name,method)=>{if(BASE[name])return BASE[name];if(name==='Table 6'){const m=/\((DoRA|IA3)\)/.exec(method);return m?m[1]:'LoRA'}return 'LoRA'};
  function stdRow(name,model,method){const s=STD[name];if(!s)return null;return TB[s].rows.find(r=>r.model===model&&r.method===method)||null}
  const sel=$('tbSel'),msel=$('tbModel');
  LIST.forEach(n=>{const o=document.createElement('option');o.value=n;o.textContent=n+': '+NAMES[n];sel.appendChild(o)});
  function models(){const n=sel.value,ms=[...new Set(TB[n].rows.map(r=>r.model||'(one model)'))];msel.innerHTML='';['all',...ms].forEach(m=>{const o=document.createElement('option');o.value=m;o.textContent=m==='all'?'all models':m;msel.appendChild(o)})}
  function draw(){const n=sel.value,T=TB[n],showD=$('tbDelta').checked,showS=$('tbSd').checked,mf=msel.value;
    $('tbCap').innerHTML=A(AX+'#'+T.anchor,n)+': '+T.caption.replace(/^Table \d+:\s*/,'');
    const nv=T.cols.length;let h='<thead><tr><th class="mh">Model · method</th>'+T.cols.map(c=>'<th>'+c+'</th>').join('')+'</tr></thead><tbody>';
    let shown=0,tmax=null;
    T.rows.forEach(r=>{const mdl=r.model||'(one model)';if(mf!=='all'&&mf!==mdl)return;shown++;
      const b=T.rows.find(x=>x.model===r.model&&x.method===baseOf(n,r.method)),isB=b===r,sr=showS?stdRow(n,r.model,r.method):null,sb=sr&&b?stdRow(n,b.model,b.method):null;
      const bit=/^Bitune|^Bidirectional$/.test(r.method);
      h+='<tr'+(bit?' style="background:var(--acc2)"':'')+'><th class="mh">'+(r.model?r.model+' · ':'')+r.method+'</th>';
      r.vals.forEach((v,i)=>{let c=v;
        if(sr&&n!=='Table 5'&&i<sr.vals.length/2&&sr.vals[2*i+1]!=='-')c=v+'<small style="display:block;color:var(--mute)">±'+sr.vals[2*i+1]+'</small>';
        if(showD&&b&&!isB&&isNum(v)&&isNum(b.vals[i])){const dd=num(v)-num(b.vals[i]);let t='';
          if(sr&&sb&&n!=='Table 5'&&i<sr.vals.length/2&&sr.vals[2*i+1]!=='-'&&sb.vals[2*i+1]!=='-'){const m1=num(sr.vals[2*i]),s1=num(sr.vals[2*i+1]),m0=num(sb.vals[2*i]),s0=num(sb.vals[2*i+1]),se=Math.sqrt(s1*s1/3+s0*s0/3);if(se>0){const tt=(m1-m0)/se;t=', '+tt.toFixed(1)+' SE';tmax=tmax==null?tt:Math.max(tmax,tt)}}
          const col=dd>0?'var(--good)':dd<0?'var(--bad)':'var(--mute)';
          c+='<small style="display:block;color:'+col+'">'+(dd>0?'+':'')+dd.toFixed(n==='Table 4'?2:1)+t+'</small>'}
        h+='<td class="v">'+c+'</td>'});
      for(let i=r.vals.length;i<nv;i++)h+='<td class="na">-</td>';h+='</tr>'});
    $('tbTab').innerHTML=h+'</tbody>';
    let note='Baseline for the differences: '+(n==='Table 6'?'the same PEFT method without Bitune':BASE[n]?BASE[n]:'LoRA')+'. ';
    if(STD[n])note+='Seed spread from '+A(AX+'#'+TB[STD[n]].anchor,STD[n])+' (3 seeds; "SE" = difference over its standard error, √(s₁²/3 + s₀²/3)). ';
    if(n==='Table 5')note+='Table 5 prints averages only; the per-task means and spreads are in Table 23 (the Ablation section of the Reading tab uses them). ';
    if(n==='Table 4')note+='Bitune\'s prefill is '+RC.t4.prefill_ratio+' times LoRA\'s; prefill plus generation is '+RC.t4.total_extra_pct+'% longer. ';
    if(n==='Table 14')note+='Training time ratio '+RC.train_cost['Gemma-2B'].time_ratio+'× (Gemma-2B) and '+RC.train_cost['Llama3-8B'].time_ratio+'× (Llama3-8B); peak memory +'+RC.train_cost['Gemma-2B'].mem_extra_pct+'% and +'+RC.train_cost['Llama3-8B'].mem_extra_pct+'%. ';
    $('tbNote').innerHTML=note}
  sel.addEventListener('change',()=>{models();draw()});msel.addEventListener('change',draw);$('tbDelta').addEventListener('change',draw);$('tbSd').addEventListener('change',draw);
  models();draw();

  // Table 1 gains with error bars
  let gnBase='LoRA';
  function gains(w){const MO=['Gemma-2B','Gemma-7B','Llama2-7B','Llama3-8B','Phi-2'],cols=TB['Table 1'].cols,T21=TB['Table 21'];
    const rowsY=[];MO.forEach(mo=>{cols.forEach((c,i)=>rowsY.push({mo,c,i}))});
    const pl=Math.min(150,Math.max(96,w*0.3)),pr=14,rh=17,top=26,H=top+rowsY.length*rh+MO.length*8+30;
    const vals=rowsY.map(r=>{const b=TB['Table 1'].rows.find(x=>x.model===r.mo&&x.method==='Bitune'),o=TB['Table 1'].rows.find(x=>x.model===r.mo&&x.method===gnBase);
      const d=num(b.vals[r.i])-num(o.vals[r.i]);let se=null;
      const sb=T21.rows.find(x=>x.model===r.mo&&x.method==='Bitune'),so=T21.rows.find(x=>x.model===r.mo&&x.method===gnBase);
      const sd=(row,i)=>row&&row.vals[2*i+1]!=='-'?num(row.vals[2*i+1]):0;
      if(r.i<5){se=Math.sqrt(sd(sb,r.i)**2/3+sd(so,r.i)**2/3)}else{const avg=row=>{let q=0;for(let k=0;k<5;k++)q+=sd(row,k)**2;return Math.sqrt(q)/5};se=Math.sqrt(avg(sb)**2/3+avg(so)**2/3)}
      return {...r,d,se}});
    const lo=Math.min(-2,...vals.map(v=>v.d-v.se))-0.3,hi=Math.max(5,...vals.map(v=>v.d+v.se))+0.3,X=v=>pl+(w-pl-pr)*(v-lo)/(hi-lo);
    let s='',y=top;
    for(let t=Math.ceil(lo);t<=Math.floor(hi);t++){if((hi-lo)>12&&t%2)continue;s+=ln2(X(t),top-6,X(t),H-26,t===0?'var(--mute)':'var(--line)')+tx(X(t),H-12,(t>0?'+':'')+t,{fs:11,a:'middle',c:'var(--mute)'})}
    s+=tx((pl+w-pr)/2,top-12,'Bitune minus '+gnBase+', points (±1 SE)',{fs:11,a:'middle',c:'var(--mute)'});
    let last='';vals.forEach(v=>{if(v.mo!==last){if(last)y+=8;last=v.mo;s+=tx(4,y+12,v.mo,{fs:12,w:600})}
      const cy=y+rh/2,avg=v.i===5,c=v.d-1.96*v.se>0?'var(--good)':v.d+1.96*v.se<0?'var(--bad)':'var(--mute)';
      s+=tx(pl-6,cy+4,v.c,{fs:11,a:'end',c:avg?'var(--ink)':'var(--mute)',w:avg?600:null});
      if(v.se)s+=ln2(X(v.d-v.se),cy,X(v.d+v.se),cy,c,{sw:2});
      s+='<circle cx="'+X(v.d).toFixed(1)+'" cy="'+cy+'" r="'+(avg?5:3.5)+'" fill="'+c+'"><title>'+v.mo+' '+v.c+': '+(v.d>0?'+':'')+v.d.toFixed(1)+' ± '+v.se.toFixed(2)+'</title></circle>';
      s+=tx(Math.min(w-pr,X(v.d+v.se)+6),cy+4,(v.d>0?'+':'')+v.d.toFixed(1),{fs:11,c:'var(--mute)',a:X(v.d+v.se)+40>w?'end':null});
      y+=rh});
    $('gnSvg').innerHTML=svgW(w,H,s,'Table 1 gains with standard errors')}
  segBind('gnM',m=>{gnBase=m;$('gnM').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));refit($('gnSvg'))});

  // checks on the text
  const g1=RC.gains['Table 1'],pe=RC.peft;
  const CK=[
    ['§3.1: Gemma-2B gains 4 pp over LoRA and 9.3 pp over the pretrained model',g1['Gemma-2B'].vs_lora+' and '+g1['Gemma-2B'].vs_pretrained,'yes'],
    ['§3.1: "for the other models, the average gains over baseline finetuning are 1.8, 1.4 and 0.9 pp, for Llama3-8B, Llama2-7B and Phi-2"','against LoRA: '+g1['Llama3-8B'].vs_lora+', '+g1['Llama2-7B'].vs_lora+', '+g1['Phi-2'].vs_lora+'; against LoRA16: '+g1['Llama3-8B'].vs_lora16+', '+g1['Llama2-7B'].vs_lora16+', '+g1['Phi-2'].vs_lora16,'mixed: Llama3-8B\'s 1.8 is against LoRA16, the others against LoRA (understates Llama3-8B\'s gain over LoRA, 2.3)'],
    ['§3.1: Gemma-7B is "a single case where the baseline pretrained model achieved the highest score on a task, MMLU"','Phi-2 on ARC too: pretrained 67.3 against LoRA 66.7, LoRA16 66.6, Bitune 67.2','no: two cases'],
    ['§3.5: with other PEFT methods, "gains ranging from +1.6% to +4.0%"','LoRA '+pe['Gemma-2B LoRA'].printed+' / '+pe['Llama3-8B LoRA'].printed+', DoRA '+pe['Gemma-2B DoRA'].printed+' / '+pe['Llama3-8B DoRA'].printed+', IA3 '+pe['Gemma-2B IA3'].printed+' / '+pe['Llama3-8B IA3'].printed+' (Gemma-2B / Llama3-8B)','no: the smallest gain is +'+RC.peft_range[0].toFixed(1)+' (Llama3-8B with IA3)'],
    ['Table 1 caption: Bitune "significantly outperforms the baselines on almost all tasks for all models"','loses to LoRA or LoRA16 on '+RC.n_lost_t1+' of '+RC.n_cells_t1+' task cells (both Gemma-7B: PIQA, MMLU); more than 2 SE above LoRA on '+RC.n_task_cells_t_gt2+' of 25','mostly; Gemma-7B is a wash (+0.1)'],
    ['§3.5 (Table 5): "the highest gains are observed in the full variant of Bitune, demonstrating that each component contributes"','gap to the best ablation: Gemma-2B No Mixing '+RC.ablation_noise['Gemma-2B|No Mixing'].gap+' ('+RC.ablation_noise['Gemma-2B|No Mixing'].t+' SE), Llama3-8B Shared Weights '+RC.ablation_noise['Llama3-8B|Shared Weights'].gap+' ('+RC.ablation_noise['Llama3-8B|Shared Weights'].t+' SE)','not shown: two of ten gaps are under 2 SE'],
    ['§3.4 and Limitations: the extra prefill latency "is negligible"','+'+RC.t4.total_extra_pct+'% for 2,000 generated tokens; v1: +'+RC.v1_inference['Gemma-2B']['200:50'].extra_pct+'% and +'+RC.v1_inference['Llama3-8B']['200:50'].extra_pct+'% for a 200-token prompt and 50-token answer','true for long answers only'],
    ['A.7: Codestral-22B gains 4.3 points on GSM8K',String(RC.codestral_gain),'yes'],
    ['§3.3: chain-of-thought gains of 2.4 (Gemma-2B) and 1.3 (Llama3-8B)',RC.cot['Gemma-2B']+' and '+RC.cot['Llama3-8B'],'yes'],
    ['A.6: "the method\'s benefits extend to larger datasets" (Alpaca)','Bitune +'+RC.alpaca['Gemma-2B'].bitune_vs_lora.toFixed(1)+' / +'+RC.alpaca['Llama3-8B'].bitune_vs_lora.toFixed(1)+'; Naive Bidir. +'+RC.alpaca['Gemma-2B'].naive_vs_lora.toFixed(1)+' / '+RC.alpaca['Llama3-8B'].naive_vs_lora.toFixed(1)+' (Gemma-2B / Llama3-8B)','yes, smaller; Naive Bidir. hurts Llama3-8B here'],
    ['A.5 Figure 2: y axis "Ratio [%]"','its ticks read 0.4 and 0.6 and every curve starts at '+RC.fig2['0.01'].start+': the values are fractions (α), not percent','label slip'],
    ['Table 7: full finetuning gains',String(RC.fullft_gain)+' (47.5 to 49.3)','yes']];
  $('ckTab').innerHTML='<thead><tr><th class="mh">What the paper says</th><th>Recomputed from its tables</th><th>Holds?</th></tr></thead><tbody>'+CK.map(r=>'<tr><th class="mh" style="font-weight:400;white-space:normal;min-width:14em">'+r[0]+'</th><td style="text-align:left">'+r[1]+'</td><td style="text-align:left">'+r[2]+'</td></tr>').join('')+'</tbody>';

  // Figures 2 and 3
  let fg='f2';
  function figs(w){let s='',H;const pl=46,pr=12,pt=14,pb=36;
    if(fg==='f2'){H=250;const pb=58,X=v=>pl+(w-pl-pr)*v/3000,Y=v=>pt+(H-pt-pb)*(1-(v-0.2)/0.5);
      [0.2,0.3,0.4,0.5,0.6,0.7].forEach(v=>{s+=ln2(pl,Y(v),w-pr,Y(v),'var(--line)')+tx(pl-6,Y(v)+4,v.toFixed(1),{fs:11,a:'end',c:'var(--mute)'})});
      [0,1000,2000,3000].forEach((v,q)=>s+=tx(X(v),H-pb+16,fmt(v),{fs:11,a:q===3?'end':'middle',c:'var(--mute)'}));
      s+=tx((pl+w-pr)/2,H-pb+30,'training step (update)',{fs:11,a:'middle',c:'var(--mute)'});
      const C={'0.1':'var(--c1)','0.01':'var(--c2)','0.001':'var(--c3)'},ends=[];
      Object.entries(RC.fig2).forEach(([k,c])=>{s+='<polyline fill="none" stroke="'+C[k]+'" stroke-width="2" points="'+c.points.map(p=>X(p[0]).toFixed(1)+','+Y(p[1]).toFixed(1)).join(' ')+'"/>';ends.push(['θ_init '+k+' (ends '+c.end.toFixed(2)+')',C[k]])});
      s+=legend(ends,pl,H-10,w-pl-pr).s;
      $('fgCap').innerHTML='Decoded from the vector data of '+A(AX+'#A1.F2','Figure 2')+' (Llama3-8B, α averaged over layers; the axis says "%" but the values are fractions). Every run starts at α = 0.5, as Eq. 8 implies when θ starts at θ<sub>init</sub>. With the default 0.01 the model ends at '+RC.fig2['0.01'].end.toFixed(2)+': it leans causal, keeping about two thirds of the causal features. With 0.1 it barely moves (slope 1/(4θ<sub>init</sub>) = 2.5 at the start); with 0.001 it swings to '+RC.fig2['0.001'].min.toFixed(2)+' and back up to '+RC.fig2['0.001'].end.toFixed(2)+'.'}
    else{H=250;const n=RC.fig3.k.length,half=(w-pl-pr-16)/2,Y=v=>pt+(H-pt-pb)*(1-v/0.6);
      [0,0.2,0.4,0.6].forEach(v=>{s+=ln2(pl,Y(v),w-pr,Y(v),'var(--line)')+tx(pl-6,Y(v)+4,v.toFixed(1),{fs:11,a:'end',c:'var(--mute)'})});
      [['k','α for keys','var(--c1)',pl],['v','α for values','var(--c2)',pl+half+16]].forEach(([key,lab,c,x0])=>{const bw=half/n;
        RC.fig3[key].forEach((v,i)=>{s+=rc(x0+i*bw+0.5,Y(v),Math.max(1,bw-1),Y(0)-Y(v),c,{r:1})});
        const m=RC.fig3['mean_'+key];s+=ln2(x0,Y(m),x0+half,Y(m),'var(--ink)',{da:'4 3'});
        s+=tx(x0+half/2,pt+2,lab+' (mean '+m.toFixed(2)+')',{fs:11,a:'middle'});
        s+=tx(x0,H-pb+14,'layer 0',{fs:11,c:'var(--mute)'})+tx(x0+half,H-pb+14,String(n-1),{fs:11,a:'end',c:'var(--mute)'})});
      $('fgCap').innerHTML='Decoded from '+A(AX+'#A1.F3','Figure 3')+' (Llama3-8B, θ<sub>init</sub> 0.01, after training): the final α of each of the 32 blocks, for K and for V. No layer is near 0 (keys range '+RC.fig3.min_k.toFixed(2)+' to '+RC.fig3.max_k.toFixed(2)+', values '+RC.fig3.min_v.toFixed(2)+' to '+RC.fig3.max_v.toFixed(2)+'), so "all layers utilize the bidirectional attention", but none is near 1 either: every block keeps most of its causal features. The keys\' mean, '+RC.fig3.mean_k.toFixed(3)+', matches Figure 2\'s end point for 0.01 ('+RC.fig2['0.01'].end.toFixed(3)+').'}
    $('fgSvg').innerHTML=svgW(w,H,s,'Figure rebuilt')}
  segBind('fgM',m=>{fg=m;$('fgM').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));refit($('fgSvg'))});

  // cost
  const t4=TB['Table 4'].rows,t14=TB['Table 14'].rows,v1=RC.v1_inference;
  let c='<thead><tr><th class="mh">Measurement</th><th>LoRA</th><th>Bitune</th><th>Bitune / LoRA</th></tr></thead><tbody>';
  c+='<tr><th class="mh">Prefill, 2,000-token prompt (s)</th><td>'+t4[0].vals[0]+'</td><td>'+t4[1].vals[0]+'</td><td>'+RC.t4.prefill_ratio+'×</td></tr>';
  c+='<tr><th class="mh">Generate 2,000 tokens (s)</th><td>'+t4[0].vals[1]+'</td><td>'+t4[1].vals[1]+'</td><td>'+(num(t4[1].vals[1])/num(t4[0].vals[1])).toFixed(3)+'×</td></tr>';
  ['Gemma-2B','Llama3-8B'].forEach(mo=>{const l=t14.find(r=>r.model===mo&&r.method==='LoRA'),b=t14.find(r=>r.model===mo&&r.method==='Bitune');
    c+='<tr><th class="mh">'+mo+': training time (h)</th><td>'+l.vals[0]+'</td><td>'+b.vals[0]+'</td><td>'+RC.train_cost[mo].time_ratio+'×</td></tr>';
    c+='<tr><th class="mh">'+mo+': peak memory (GB)</th><td>'+l.vals[1]+'</td><td>'+b.vals[1]+'</td><td>+'+RC.train_cost[mo].mem_extra_pct+'%</td></tr>';
    ['50:200','200:50'].forEach(k=>{const x=v1[mo][k];c+='<tr><th class="mh">'+mo+': v1 inference, '+k+' tokens (s)</th><td>'+x.lora+'</td><td>'+x.bitune+'</td><td>+'+x.extra_pct+'%</td></tr>'})});
  $('costTab').innerHTML=c+'</tbody>';

  // GSM8K samples
  const gs=RC.gsm8k_samples,mark=(v,r)=>v===null?'<span style="color:var(--bad)">none</span>':v===r?'<span style="color:var(--good)">'+fmt(v,v%1?2:0)+' ✓</span>':'<span style="color:var(--bad)">'+fmt(v,v%1?2:0)+' ✗</span>';
  $('gsTab').innerHTML='<thead><tr><th class="mh">Question</th><th>Reference</th><th>LoRA</th><th>Bitune</th></tr></thead><tbody>'+gs.items.map(x=>'<tr'+(gs.differ.includes(x.q)?' style="background:var(--hl)"':'')+'><th class="mh" style="font-weight:400">'+x.q+'</th><td>'+fmt(x.ref)+'</td><td>'+mark(x.lora,x.ref)+'</td><td>'+mark(x.bitune,x.ref)+'</td></tr>').join('')+'<tr><th class="mh">Correct</th><td></td><td><b>'+gs.lora_right+' of 20</b></td><td><b>'+gs.bitune_right+' of 20</b></td></tr></tbody>';

  onTab('t-tables',()=>{fit($('gnSvg'),gains);fit($('fgSvg'),figs)});
})();
