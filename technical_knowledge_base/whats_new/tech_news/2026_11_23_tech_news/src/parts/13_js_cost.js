// ---- Artificial Analysis Intelligence Index v5.0.1 against cost per index task, read 2026-11-23 (static scatter, log x, the score-cost frontier) ----
(function(){
  const card=$('v-cost');if(!card)return;
  // [name, score, $ per index task, new this week?, note]
  const M=[['Claude Fable 5.2',65,26.54,0,'Released 9 Nov; max effort'],['GPT-6.2 Astra',62,4.00,1,'Released 17 Nov; max effort'],['Gemini 4 Neon',61,6.44,1,'Released 18 Nov; xhigh; 283M output tokens on the index'],
    ['Gemini 4 Carbon',60,7.76,0,'High effort'],['Claude Opus 5.5',59,10.04,0,''],['GPT-6.2 Sol',57,1.01,1,'Released 17 Nov; max effort']];
  const front=M.filter(a=>!M.some(b=>b!==a&&b[1]>=a[1]&&b[2]<=a[2]&&(b[1]>a[1]||b[2]<a[2]))).sort((a,b)=>a[2]-b[2]);
  let sel=1;
  function draw(){
    const box=$('costSvg'),W=Math.max(300,Math.round(box.clientWidth||340)),narrow=W<520,H=narrow?260:300;
    const pl=40,pr=narrow?16:24,pt=18,pb=40,lx0=Math.log10(0.7),lx1=Math.log10(40),y0=55,y1=67;
    const X=v=>pl+(W-pl-pr)*(Math.log10(v)-lx0)/(lx1-lx0),Y=v=>pt+(H-pt-pb)*(y1-v)/(y1-y0);
    let s='';
    [1,2,5,10,20].forEach(v=>{s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--line)"/><text x="'+X(v)+'" y="'+(H-pb+15)+'" font-size="11" text-anchor="middle" fill="var(--mute)">$'+v+'</text>'});
    [56,58,60,62,64,66].forEach(v=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/><text x="'+(pl-6)+'" y="'+(Y(v)+4)+'" font-size="11" text-anchor="end" fill="var(--mute)">'+v+'</text>'});
    s+='<text x="'+(W-pr)+'" y="'+(H-6)+'" font-size="11" text-anchor="end" fill="var(--mute)">cost per index task (log scale)</text>';
    s+='<text x="'+pl+'" y="12" font-size="11" fill="var(--mute)">Index v5.0.1 score</text>';
    s+='<polyline points="'+front.map(m=>X(m[2])+','+Y(m[1])).join(' ')+'" fill="none" stroke="var(--acc)" stroke-width="1.6" stroke-dasharray="5 3"/>';
    M.forEach((m,i)=>{const on=i===sel,x=X(m[2]),y=Y(m[1]),nm=narrow?m[0].replace('Claude ','').replace('Gemini 4 ','Gemini '):m[0],right=x<W*0.62;
      if(m[3])s+='<circle cx="'+x+'" cy="'+y+'" r="9" fill="none" stroke="var(--ink)" stroke-width="1.3"/>';
      s+='<circle cx="'+x+'" cy="'+y+'" r="'+(on?6.5:5.5)+'" fill="'+(on?'var(--acc)':'var(--closed)')+'" data-i="'+i+'" style="cursor:pointer"/>';
      s+='<text x="'+(right?x+13:x-13)+'" y="'+(y+4)+'" font-size="'+(narrow?11:12)+'" text-anchor="'+(right?'start':'end')+'" data-i="'+i+'" style="cursor:pointer"'+(on?' font-weight="700"':'')+'>'+nm+'</text>'});
    box.innerHTML=svgEl(W,H,s,'Artificial Analysis Intelligence Index v5.0.1 score against cost per index task');
    box.querySelectorAll('[data-i]').forEach(t=>t.addEventListener('click',()=>{sel=+t.dataset.i;draw();detail()}));
  }
  function detail(){const m=M[sel],onF=front.includes(m);$('costDet').innerHTML='<b>'+m[0]+'</b>: '+m[1]+' at '+usd(m[2],2)+' per index task'+(m[4]?'. '+m[4]:'')+'. '+(onF?'On the frontier: no model shown is both higher and cheaper.':'Below the frontier: a model shown is both at least as high and cheaper.')}
  function out(){$('costOut').innerHTML=stat('Score spread, top three','4 points','65, 62, 61')+stat('Cost spread, top three',(26.54/4.00).toFixed(1)+'x','$4.00 to $26.54 per task')+stat('On the frontier',String(front.length),front.map(m=>m[0].replace('Claude ','')).join(', '))}
  let rw=0;addEventListener('resize',()=>{const w=card.clientWidth;if(w&&w!==rw){rw=w;draw()}});
  onTab(card.closest('.tab').id,()=>{draw();detail();out()});
})();
