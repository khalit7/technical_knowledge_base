// ---- Refit the scaling curves: any Table H.1 row, a line fitted on the smaller models, predicted against actual 175B ----
(function(){
  const T=RC.tasks,ACC=T.filter(t=>t.metric==='acc');
  const AV={name:'Average of 41 accuracy tasks (Figure 1.3)',metric:'acc',cat:'',z:RC.agg.z,o:RC.agg.o,f:RC.agg.f,sota:'',K:'',split:'',test:''};
  const AV42={name:'Average of 42 (adding SQuAD 2.0 exact match)',metric:'acc',cat:'',z:RC.agg42.z,o:RC.agg42.o,f:RC.agg42.f,sota:'',K:'',split:'',test:''};
  const ALL=[AV,AV42].concat(T);
  const sel=$('rfTask');let h='<optgroup label="Aggregates"><option value="0">'+AV.name+'</option><option value="1">'+AV42.name+'</option></optgroup>';
  const cats=[...new Set(T.map(t=>t.cat))];cats.forEach(c=>{h+='<optgroup label="'+escH(c)+'">';T.forEach((t,i)=>{if(t.cat===c)h+='<option value="'+(i+2)+'">'+escH(taskLabel(t))+'</option>'});h+='</optgroup>'});
  sel.innerHTML=h;const st={i:ALL.findIndex(t=>t.name==='3D+'),n:7,v:'s',set:'f'};sel.value=String(st.i);
  const fitOf=(t,k,n)=>linfit(LX.slice(0,n),t[k].slice(0,n));
  function draw(){const t=ALL[st.i],k=st.set,n=st.n;$('rfNv').textContent=n;$('rfS').style.display=st.v==='g'?'none':'';
    let series,fitL=null,pred=null,hl=[],dom=null,ylab;
    if(st.v==='g'){const g=t.f.map((v,i)=>v-t.z[i]);series=[{y:g,c:'var(--c1)',n:'gap',fitN:n}];const F=linfit(LX.slice(0,n),g.slice(0,n));fitL={a:F.a,b:F.b,c:'var(--c1)'};pred={y:F.a+F.b*LX[7],c:'var(--c1)'};ylab='few-shot minus zero-shot (points)'}
    else{series=['f','o','z'].map(s=>({y:t[s],c:SETC[s],n:SETN[s],fitN:s===k?n:null,sw:s===k?2.4:1.4}));const F=fitOf(t,k,n);fitL={a:F.a,b:F.b,c:SETC[k]};pred={y:F.a+F.b*LX[7],c:SETC[k]};
      ylab=(t.metric==='acc'?'accuracy (%)':t.metric==='ppl'?'perplexity':t.metric);
      if(t.sota&&!isNaN(+t.sota))hl.push({y:+t.sota,t:'fine-tuned SOTA '+t.sota,c:'var(--mute)'});if(t.chance!=null)hl.push({y:t.chance,t:'chance '+t.chance,c:'var(--bad)',da:'1 3'});
      if(t.metric==='acc'||/f1|em/.test(t.metric))dom=[0,100]}
    const act=st.v==='g'?t.f[7]-t.z[7]:t[k][7];
    fit($('rfSvg'),W=>{$('rfSvg').innerHTML=sizeChart(W,{title:escH(taskLabel(t))+(t.cat?' · '+escH(t.cat):''),ylab,series,fit:fitL,pred,hl,dom,zero:st.v==='g'})});
    const res=act-pred.y;
    $('rfOut').innerHTML=stat('Line through the smallest '+n+' models predicts, at 175B',f1(pred.y),st.v==='g'?'few minus zero':SETN[k])+stat('175B actually scored',f1(act),'Table H.1'+(t.test&&st.v!=='g'?' (test server '+t.test+')':''))+stat('Actual minus predicted',(res>0?'+':'')+f1(res),Math.abs(res)<=5?'on the trend (within 5)':res>0?'above the smaller models\' trend':'below the smaller models\' trend')+stat('Slope of the line',(fitL.b>0?'+':'')+f1(fitL.b)+' per 10×','points per tenfold parameters');
    $('rfNote').innerHTML=(t.split?'Split: '+t.split+(t.K?' · few-shot K = '+t.K:'')+' · ':'')+'Filled dots are the models the line is fitted on; the dashed circle is its prediction at 175B. '+(t.metric==='ppl'?'Lower is better for perplexity. ':'')+(t.name==='WiC'?'WiC zero-shot is printed as 0.00 for every size in Table H.1, unexplained. ':'')+(t.chance!=null&&st.v==='s'?'Chance is nominal, from the number of answer options (derived). ':'');
    drawAll()}
  function drawAll(){const k=st.v==='g'?'g':st.set,n=st.n;
    const pts=ACC.map(t=>{const y=k==='g'?t.f.map((v,i)=>v-t.z[i]):t[k];const F=linfit(LX.slice(0,n),y.slice(0,n));const p=F.a+F.b*LX[7];return {t,res:y[7]-p}});
    const above=pts.filter(p=>p.res>5).length,below=pts.filter(p=>p.res<-5).length,within=pts.length-above-below;
    fit($('rfAll'),W=>{const pl=8,pr=8,H=170,lo=-45,hi=90,X=v=>pl+(W-pl-pr)*(Math.max(lo,Math.min(hi,v))-lo)/(hi-lo);let s='';
      s+=rc(X(-5),14,X(5)-X(-5),H-50,'var(--acc2)',{r:0,op:.6});
      [-40,-20,0,20,40,60,80].forEach(v=>{s+=ln2(X(v),14,X(v),H-36,v===0?'var(--mute)':'var(--line)')+tx(X(v),H-22,(v>0?'+':'')+v,{fs:11,a:'middle',c:'var(--mute)'})});
      s+=tx((W)/2,H-6,'175B actual minus the line\'s prediction (points)',{fs:11,a:'middle',c:'var(--mute)'});
      // beeswarm-ish: stack dots in bins
      const bins={},rows=[];pts.sort((a,b)=>a.res-b.res).forEach(p=>{const b=Math.round(X(p.res)/9);bins[b]=(bins[b]||0)+1;rows.push({p,x:X(p.res),lev:bins[b]-1})});
      rows.forEach(r=>{const y=H-44-r.lev*9,cur=ALL[st.i]===r.p.t;s+='<circle class="dotstrip" data-i="'+(T.indexOf(r.p.t)+2)+'" cx="'+r.x.toFixed(1)+'" cy="'+y+'" r="'+(cur?5:4)+'" fill="'+(r.p.res>5?'var(--c1)':r.p.res<-5?'var(--c2)':'var(--mute)')+'" stroke="'+(cur?'var(--ink)':'none')+'" stroke-width="2"><title>'+escH(r.p.t.name)+': '+(r.p.res>0?'+':'')+f1(r.p.res)+'</title></circle>'});
      const top=rows.slice().sort((a,b)=>b.p.res-a.p.res).slice(0,2).concat(rows.slice(0,1));const lp=top.map(r=>({x:r.x,y:H-44-r.lev*9,t:r.p.t.name,fs:11}));
      placeLabels(lp,W,H-40).forEach(p=>{s+=tx(p.lx,p.ly,escH(p.t),{fs:11,a:p.la})});
      $('rfAll').innerHTML=svgW(W,H,s,'residuals of every accuracy task');
      $('rfAll').querySelectorAll('circle[data-i]').forEach(c=>c.addEventListener('click',()=>{st.i=+c.dataset.i;sel.value=String(st.i);draw()}))});
    $('rfAllNote').innerHTML='Fitting '+(k==='g'?'few minus zero':SETN[k])+' on the smallest '+n+' models: 175B lands <b>more than 5 points above</b> the line on '+above+' tasks, <b>within 5</b> on '+within+' and <b>more than 5 below</b> on '+below+' (of '+pts.length+'). '+(k==='f'&&n===7?'Defaults reproduce recompute.py ('+RC.extrap.few_acc_above5+', '+RC.extrap.few_acc_within5+', '+RC.extrap.few_acc_below5+'). ':'')+(k==='f'?'Neither "smooth and predictable" nor "emergent" describes every task: arithmetic and symbol insertion jump far above trend, while LAMBADA, TriviaQA and HellaSwag rise more slowly at the top than their small-model slope implies.':'')}
  sel.addEventListener('change',()=>{st.i=+sel.value;draw()});
  $('rfN').addEventListener('input',e=>{st.n=+e.target.value;draw()});
  segBind('rfV',m=>{st.v=m;draw()});segBind('rfS',m=>{st.set=m;draw()});
  onTab('t-run',draw);

  // Figure 3.1's printed line
  const LL=RC.fig31,dots=RC.compute.filter(c=>c.name.startsWith('GPT-3'));
  function drawLL(){const lc=+$('llC').value,C=10**lc,L=LL.a*C**LL.b;$('llCv').textContent=C>=1?fmt(C,C<10?1:0):sci(C,1);
    fit($('llSvg'),W=>{const pl=40,pr=12,pt=10,pb=34,H=230,x0=-6,x1=5,X=v=>pl+(W-pl-pr)*(v-x0)/(x1-x0),lo=1.5,hi=6,lg=Math.log10,Y=v=>pt+(H-pt-pb)*(1-(lg(v)-lg(lo))/(lg(hi)-lg(lo)));let s='';
      [2,3,4,5,6].forEach(t=>{s+=ln2(pl,Y(t),W-pr,Y(t),'var(--line)')+tx(pl-5,Y(t)+4,t,{fs:11,a:'end',c:'var(--mute)'})});
      [-6,-4,-2,0,2,4].forEach(t=>{s+=tx(X(t),H-pb+15,'10',{fs:11,a:'middle',c:'var(--mute)'}).replace('</text>','<tspan dy="-5" font-size="11">'+t+'</tspan></text>')});
      s+=tx((pl+W-pr)/2,H-3,'compute (petaflop/s-days, log)',{fs:11,a:'middle',c:'var(--mute)'});
      let d='';for(let v=x0;v<=x1+1e-9;v+=.25){const l=LL.a*(10**v)**LL.b;d+=(d?'L':'M')+X(v).toFixed(1)+','+Y(Math.min(hi,l)).toFixed(1)}s+='<path d="'+d+'" fill="none" stroke="var(--mute)" stroke-dasharray="4 3" stroke-width="1.5"/>';
      dots.forEach((c,i)=>{const v=lg(c.pfd),l=LL.a*c.pfd**LL.b;s+='<circle cx="'+X(v).toFixed(1)+'" cy="'+Y(l).toFixed(1)+'" r="3.5" fill="var(--c1)"><title>'+c.name+': '+c.pfd.toFixed(1)+' PF-days, line gives '+l.toFixed(3)+'</title></circle>'});
      s+=tx(X(lg(dots[7].pfd))-6,Y(LL.a*dots[7].pfd**LL.b)-8,'175B',{fs:11,a:'end'})+tx(X(lg(dots[0].pfd))+6,Y(LL.a*dots[0].pfd**LL.b)-8,'Small',{fs:11});
      s+='<circle cx="'+X(lc).toFixed(1)+'" cy="'+Y(Math.min(hi,Math.max(lo,L))).toFixed(1)+'" r="6" fill="none" stroke="var(--c2)" stroke-width="2"/>';
      $('llSvg').innerHTML=svgW(W,H,s,'Figure 3.1 power law')});
    $('llOut').innerHTML=stat('Loss the line predicts',L.toFixed(3),'cross-entropy, validation')+stat('Compute against GPT-3 175B',(C/RC.gpt3_175_pfd>=1?fmt(C/RC.gpt3_175_pfd,1)+'×':'1/'+fmt(RC.gpt3_175_pfd/C,0)),'its Table D.1 compute is '+fmt(RC.gpt3_175_pfd)+' PF-days')}
  $('llC').addEventListener('input',drawLL);onTab('t-run',drawLL);
})();
