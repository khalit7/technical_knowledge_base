// ---- Reading, section 3: agent defences on AgentDojo as before/after arrows (attack success and task success), published figures ----
// Each row carries its own undefended baseline (different attacks, models and snapshots); compare within a row, not across.
(function(){
  const el=document.getElementById('rd-ad');if(!el)return;
  const R=[
    {n:'DeBERTa injection detector on tool output',w:'AgentDojo authors, GPT-4o',k:'cls',a:[57.69,7.95],t:[69.0,41.5]},
    {n:'Prompt Guard 2 86M on tool output',w:'Meta, LlamaFirewall',k:'cls',a:[17.63,7.53],t:[47.73,47.01]},
    {n:'AlignmentCheck: an LLM audits the trace',w:'Meta, Llama 4 Maverick',k:'cls',a:[17.63,2.89],t:[47.73,43.09]},
    {n:'Prompt Guard 2 and AlignmentCheck',w:'Meta',k:'cls',a:[17.63,1.75],t:[47.73,42.68]},
    {n:'MELON: re-run with the user task masked',w:'Zhu et al., GPT-4o',k:'run',a:[16.06,0.32],t:[80.41,76.29]},
    {n:'Tool filter: choose tools before reading data',w:'AgentDojo authors, GPT-4o',k:'des',a:[57.69,6.84],t:[69.0,73.13]},
    {n:'CaMeL: untrusted data cannot pick actions',w:'Google DeepMind and ETH',k:'des',a:[null,0],t:[84,77]}
  ];
  const KC={cls:'var(--c1)',run:'var(--c5)',des:'var(--c3)'},KN={cls:'classifier',run:'detect by re-run',des:'remove the channel'};
  function draw(){
    const w=RD.width(el),T=RD.t,L=50,RV=w<520?100:112,tw=w-L-RV-8;let b='',y=4;
    const sx=v=>L+v/100*tw;
    b+=T(L,y+10,'0%',{fs:10.5,fill:'var(--mute)'})+T(L+tw,y+10,'100%',{fs:10.5,fill:'var(--mute)',a:'end'});y+=16;
    const arrow=(v0,v1,yy,col)=>{let g='';
      if(v0==null){g+='<circle cx="'+sx(v1)+'" cy="'+yy+'" r="4.5" fill="'+col+'"/>';return g}
      const x0=sx(v0),x1=sx(v1);
      g+='<circle cx="'+x0+'" cy="'+yy+'" r="3.5" fill="none" stroke="'+col+'" stroke-width="1.5"/>';
      g+='<line x1="'+x0+'" y1="'+yy+'" x2="'+(x1+(x1<x0?5:-5))+'" y2="'+yy+'" stroke="'+col+'" stroke-width="2"/>';
      g+='<path d="M'+x1+','+yy+' l'+(x1<x0?7:-7)+',-4 l0,8 z" fill="'+col+'"/>';return g};
    R.forEach(r=>{
      b+='<rect x="0" y="'+(y+3)+'" width="4" height="12" fill="'+KC[r.k]+'"/>'+T(9,y+13,r.n,{fs:12,w:600});y+=18;
      b+=T(9,y+10,r.w+' ('+KN[r.k]+')',{fs:11,fill:'var(--mute)'});y+=16;
      [['attack',r.a,'var(--bad)'],['task',r.t,'var(--good)']].forEach(([nm,v,col])=>{
        b+='<line x1="'+L+'" x2="'+(L+tw)+'" y1="'+(y+6)+'" y2="'+(y+6)+'" stroke="var(--line)" stroke-width="5" stroke-linecap="round"/>';
        b+=T(0,y+10,nm,{fs:11,fill:col});
        b+=arrow(v[0],v[1],y+6,col);
        const txt=v[0]==null?(r.k==='des'&&nm==='attack'?'0 of 949':v[1]+'%'):(v[0]+' to '+v[1]+'%');
        b+=T(w,y+10,txt,{fs:11,a:'end'});y+=17});
      y+=8});
    el.innerHTML=RD.svg(w,y,b,'Attack success and task success before and after each published agent defence on AgentDojo');
  }
  draw();RD.onRender(draw);RD.onResize(draw);
})();
