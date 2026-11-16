// ---- Artificial Analysis Intelligence Index v5.0.1, read 2026-11-16: the fortnight's releases among the models they compete with (dot chart, open against closed) ----
(function(){
  const card=$('v-ix');if(!card)return;
  // [name, score, open weights?, new in this window?, note]
  const M=[['Claude Fable 5.2',65,0,1,'Released 9 Nov; max effort; $26.54 per index task'],['Gemini 4 Carbon',60,0,1,'Opened to developers 10 Nov; 59 at v5 launch'],['Claude Opus 5.5',59,0,0,'58 at v5 launch'],
    ['GPT-6 Astra',57,0,0,''],['GPT-6.1 Sol',55,0,0,''],['Claude Sonnet 5.5',55,0,0,''],['Gemini 4 Hydrogen',54,0,1,'Released 12 Nov; 54 at xhigh, 51 at high'],
    ['GPT-6.1 Terra',51,0,0,''],['Gemini 4 Argon',50,0,0,''],['Kimi K3.1 Pro',46,1,1,'Weights published by 4 Nov; the best open-weight model on the board'],['Qwen4-Max',43,0,1,'API launch 16 Nov; closed weights'],
    ['Meta Muse Ember',36,0,1,'Released 9 Nov; $0.14 per index task'],['Claude Haiku 5.5',36,0,0,'$0.41 per index task'],['DeepSeek V4.1 Flash 1017',33,1,0,'Open weights (MIT)'],['Inkling 2 Small',31,1,1,'Apache 2.0 weights from 12 Nov']];
  let sel=0;
  const best=f=>M.filter(f).reduce((a,b)=>b[1]>a[1]?b:a);
  function draw(){
    const box=$('ixSvg'),W=Math.max(300,Math.round(box.clientWidth||340)),narrow=W<520,rowH=narrow?22:24,pt=26,n=M.length,H=pt+n*rowH+26;
    const pl=narrow?118:160,pr=narrow?40:52,x0=25,x1=70,X=v=>pl+(W-pl-pr)*(v-x0)/(x1-x0),Y=i=>pt+(i+.5)*rowH,fs=narrow?11:12;
    let s='';[30,40,50,60,70].forEach(v=>{s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+(pt-4)+'" y2="'+(H-22)+'" stroke="var(--line)"/><text x="'+X(v)+'" y="'+(H-8)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+v+'</text>'});
    s+='<text x="'+pl+'" y="14" font-size="11" fill="var(--mute)">Index v5.0.1 score</text>';
    M.forEach((m,i)=>{const on=i===sel,c=m[2]?'var(--open)':'var(--closed)',nm=narrow?m[0].replace('Claude ','').replace('DeepSeek V4.1 Flash 1017','DeepSeek V4.1 Fl.').replace('Meta ',''):m[0];
      if(on)s+='<rect x="2" y="'+(Y(i)-rowH/2+1)+'" width="'+(W-4)+'" height="'+(rowH-2)+'" rx="5" fill="var(--acc2)"/>';
      s+='<text x="'+(pl-10)+'" y="'+(Y(i)+4)+'" font-size="'+fs+'" text-anchor="end" data-i="'+i+'" style="cursor:pointer"'+(on?' font-weight="700"':'')+'>'+nm+'</text>';
      s+='<line x1="'+X(x0)+'" x2="'+X(m[1])+'" y1="'+Y(i)+'" y2="'+Y(i)+'" stroke="'+c+'" stroke-opacity=".35" stroke-width="2"/>';
      if(m[3])s+='<circle cx="'+X(m[1])+'" cy="'+Y(i)+'" r="8.5" fill="none" stroke="var(--ink)" stroke-width="1.3"/>';
      s+='<circle cx="'+X(m[1])+'" cy="'+Y(i)+'" r="5.5" fill="'+c+'" data-i="'+i+'" style="cursor:pointer"/>';
      s+='<text x="'+(X(m[1])+13)+'" y="'+(Y(i)+4)+'" font-size="11.5" fill="var(--mute)">'+m[1]+'</text>'});
    const bc=best(m=>!m[2]),bo=best(m=>m[2]),ic=M.indexOf(bc),io=M.indexOf(bo),gx=X(x1)+(narrow?14:22);
    s+='<path d="M'+(gx-6)+','+Y(ic)+'H'+gx+'V'+Y(io)+'H'+(gx-6)+'" fill="none" stroke="var(--mute)"/><text x="'+(gx+4)+'" y="'+((Y(ic)+Y(io))/2+4)+'" font-size="11.5" fill="var(--ink)">'+(bc[1]-bo[1])+'</text>';
    box.innerHTML=svgEl(W,H,s,'Artificial Analysis Intelligence Index v5.0.1 scores, open against closed');
    box.querySelectorAll('[data-i]').forEach(t=>t.addEventListener('click',()=>{sel=+t.dataset.i;draw();detail()}));
  }
  function detail(){const m=M[sel];$('ixDet').innerHTML='<b>'+m[0]+'</b>: '+m[1]+(m[2]?', open weights':', closed weights')+(m[4]?'. '+m[4]:'')+'.'}
  function out(){const bc=best(m=>!m[2]),bo=best(m=>m[2]);
    $('ixOut').innerHTML=stat('Best closed, 16 Nov',String(bc[1]),bc[0])+stat('Best open weights',String(bo[1]),bo[0])+stat('Gap',(bc[1]-bo[1])+' points','12 at v5 launch on 27 Oct, 13 once Carbon was added')}
  let rw=0;addEventListener('resize',()=>{const w=card.clientWidth;if(w&&w!==rw){rw=w;draw()}});
  onTab(card.closest('.tab').id,()=>{draw();detail();out()});
})();
