// ---- Rank on Artificial Analysis Intelligence Index v4.3.2 against rank on v5 (bump chart; scores shown, compared only within a column) ----
(function(){
  const card=$('v-index');if(!card)return;
  // [name, v4.3.2 score or null, v5 score, open weights?, note]
  const M=[['Gemini 4 Carbon',null,59,0,'Released 28 Oct; no v4.3.2 score'],['Claude Opus 5.5',58,58,0,''],['GPT-6 Astra',53,57,0,''],['GPT-6.1 Sol',52,55,0,''],
    ['Claude Sonnet 5.5',56,54,0,'The v5 score is from Latent Space, not checked at source'],['GPT-6.1 Terra',48,51,0,'Released 26 Oct; 48 was its v4.3.2 launch score'],['Gemini 4 Argon',53,50,0,''],
    ['Kimi K3.1 Pro',55,46,0,'Open weights not yet published as of 2 Nov'],['DeepSeek V4.1 Flash 1017',45,32,1,'Open weights (MIT)']];
  // unique ranks: ties keep list order (GPT-6 Astra and Gemini 4 Argon are both 53 on v4.3.2)
  const rank=k=>{const o=M.map((m,i)=>[m[k],i]).filter(x=>x[0]!=null).sort((a,b)=>b[0]-a[0]||a[1]-b[1]).map(x=>x[1]);return m=>m[k]==null?null:1+o.indexOf(M.indexOf(m))};
  const r4=rank(1),r5=rank(2);let sel=7;
  function draw(){
    const box=$('ixSvg'),W=Math.max(300,Math.round(box.clientWidth||340)),narrow=W<560,n=M.length,rowH=narrow?30:32,pt=30,H=pt+n*rowH+10;
    const xl=narrow?W*0.40:W*0.36,xr=W-(narrow?W*0.40:W*0.36),fs=narrow?10.5:12;
    const Y=r=>pt+(r-0.5)*rowH;
    let s='<text x="'+xl+'" y="16" font-size="11.5" text-anchor="end" fill="var(--mute)">v4.3.2 (old scale)</text><text x="'+xr+'" y="16" font-size="11.5" fill="var(--mute)">v5 (new scale)</text>';
    M.forEach((m,i)=>{const a=r4(m),b=r5(m),on=i===sel,c=on?'var(--acc)':'var(--dim)';
      const short=narrow?m[0].replace('Claude ','').replace('DeepSeek V4.1 Flash 1017','DeepSeek 1017').replace('Gemini 4 ','Gemini '):m[0];
      if(a!=null)s+='<line x1="'+(xl+6)+'" y1="'+Y(a)+'" x2="'+(xr-6)+'" y2="'+Y(b)+'" stroke="'+c+'" stroke-width="'+(on?3:1.6)+'"/>';
      if(a!=null)s+='<text x="'+xl+'" y="'+(Y(a)+4)+'" font-size="'+fs+'" text-anchor="end" data-i="'+i+'" style="cursor:pointer"'+(on?' font-weight="700" fill="var(--acc)"':'')+'>'+short+' '+m[1]+'</text>';
      s+='<text x="'+xr+'" y="'+(Y(b)+4)+'" font-size="'+fs+'" data-i="'+i+'" style="cursor:pointer"'+(on?' font-weight="700" fill="var(--acc)"':'')+'>'+m[2]+' '+short+'</text>';
      s+='<circle cx="'+(xr-6)+'" cy="'+Y(b)+'" r="3.5" fill="'+(m[3]?'var(--open)':c)+'"/>';if(a!=null)s+='<circle cx="'+(xl+6)+'" cy="'+Y(a)+'" r="3.5" fill="'+(m[3]?'var(--open)':c)+'"/>'});
    box.innerHTML=svgEl(W,H,s,'Rank on index v4.3.2 against rank on v5');
    box.querySelectorAll('text[data-i]').forEach(t=>t.addEventListener('click',()=>{sel=+t.dataset.i;draw();detail()}));
  }
  function detail(){const m=M[sel],a=r4(m),b=r5(m);
    $('ixDet').innerHTML='<b>'+m[0]+'</b>: '+(a==null?'not on v4.3.2':'rank '+a+' of '+M.filter(x=>x[1]!=null).length+' on v4.3.2 ('+m[1]+')')+', rank '+b+' of '+M.length+' on v5 ('+m[2]+')'+(m[4]?'. '+m[4]:'')+'.'}
  function out(){const k=M[7],op=M[1],cb=M[0];
    $('ixOut').innerHTML=stat('Best open-weight model to best closed, v4.3.2',(op[1]-k[1])+' points','Opus 5.5 '+op[1]+', Kimi K3.1 Pro '+k[1])+stat('At v5 launch, 27 Oct',(op[2]-k[2])+' points','Opus 5.5 '+op[2]+', Kimi K3.1 Pro '+k[2])+stat('With Carbon, 28 Oct',(cb[2]-k[2])+' points','Carbon '+cb[2]+', Kimi K3.1 Pro '+k[2])}
  let rw=0;addEventListener('resize',()=>{const w=card.clientWidth;if(w!==rw){rw=w;draw()}});
  onTab(card.closest('.tab').id,()=>{draw();detail();out()});
})();
