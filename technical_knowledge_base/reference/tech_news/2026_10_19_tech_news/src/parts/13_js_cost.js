// ---- Artificial Analysis index score against cost per index task (log axis), the window's models ----
(function(){
  const card=$('v-cost');if(!card)return;
  // [name, AA Intelligence Index v4.3.2, $ per index task, open weights?, note]
  const M=[['Claude Opus 5.5',58,5.98,0,'reference: released 22 Sep'],['GPT-6 Astra',53,3.26,0,'reference'],['Muse Wonder',52,4.52,0,'12 Oct; $4 / $20 per million'],
    ['GPT-6.1 Sol',52,0.72,0,'29 Sep; $2 / $10 per million'],['DeepSeek V4.1-Flash-1017',45,0.26,1,'17 Oct; MIT'],['Claude Haiku 5.5',43,0.21,0,'7 Oct; $0.10 / $0.50 per million up to 100K'],
    ['MiniMax M3.1 Flash',42,0.22,0,'19 Oct; weights promised'],['Muse Spark Open',39,0.84,1,'15 Oct; Muse Model License'],['Mistral Large 4 (preview)',38,1.13,0,'6 Oct; weights promised']];
  let filt='all',sel=null;
  const vis=m=>filt==='all'||(filt==='open')===!!m[3];
  function draw(){
    const box=$('cxSvg'),W=Math.max(300,Math.round(box.clientWidth||340)),narrow=W<560,H=narrow?300:340;
    const pl=narrow?34:44,pr=narrow?10:20,pt=14,pb=34,lg=Math.log10,x0=0.1,x1=10,y0=34,y1=62;
    const X=v=>pl+(W-pl-pr)*(lg(v)-lg(x0))/(lg(x1)-lg(x0)),Y=v=>pt+(H-pt-pb)*(1-(v-y0)/(y1-y0));
    let s='';
    [35,40,45,50,55,60].forEach(v=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/><text x="'+(pl-5)+'" y="'+(Y(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+v+'</text>'});
    [[0.1,'$0.10'],[0.3,'$0.30'],[1,'$1'],[3,'$3'],[10,'$10']].forEach(([v,l])=>{s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--line)"/><text x="'+X(v)+'" y="'+(H-pb+15)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+l+'</text>'});
    s+='<text x="'+((pl+W-pr)/2)+'" y="'+(H-4)+'" font-size="11" text-anchor="middle" fill="var(--mute)">cost to run one index task (log scale)</text>';
    s+='<text x="'+(pl+4)+'" y="'+(pt+10)+'" font-size="11" fill="var(--mute)">index score</text>';
    M.forEach((m,i)=>{if(!vis(m))return;const cx=X(m[2]),cy=Y(m[1]),c=m[3]?'var(--open)':'var(--closed)';
      s+='<circle cx="'+cx+'" cy="'+cy+'" r="'+(sel===i?8:6)+'" fill="'+c+'" stroke="var(--bg)" stroke-width="1.5" data-i="'+i+'" style="cursor:pointer"/>';
      const lab=narrow?m[0].replace('Claude ','').replace('DeepSeek ','').replace(' (preview)','').replace('V4.1-Flash-','').replace('MiniMax ',''):m[0];
      const right=cx<W*0.62;s+='<text x="'+(cx+(right?10:-10))+'" y="'+(cy+4)+'" font-size="'+(narrow?10:11)+'" text-anchor="'+(right?'start':'end')+'" pointer-events="none">'+lab+'</text>'});
    box.innerHTML=svgEl(W,H,s,'Index score against cost per task');
    box.querySelectorAll('circle[data-i]').forEach(c=>c.addEventListener('click',()=>{sel=+c.dataset.i;draw();detail()}));
  }
  function detail(){if(sel==null)return;const m=M[sel];
    $('cxDet').innerHTML='<b>'+m[0]+'</b>: index '+m[1]+', '+usd(m[2],2)+' per index task, '+(m[3]?'open weights':'closed')+'. '+m[4]+'.'}
  function out(){const ds=M[4],so=M[7],op=M[0],sol=M[3];
    $('cxOut').innerHTML=stat('Open leader on this plane','DeepSeek 1017',ds[1]+' at '+usd(ds[2],2)+' a task')+stat('Muse Spark Open',(so[2]/ds[2]).toFixed(1)+'x the cost',(ds[1]-so[1])+' points lower than 1017')+stat('GPT-6.1 Sol against Opus 5.5',(op[2]/sol[2]).toFixed(1)+'x cheaper',(op[1]-sol[1])+' points lower')}
  $('cxF').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{filt=b.dataset.f;$('cxF').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));if(sel!=null&&!vis(M[sel]))sel=null;draw()}));
  let rw=0;addEventListener('resize',()=>{const w=card.clientWidth;if(w!==rw){rw=w;draw()}});
  onTab(card.closest('.tab').id,()=>{draw();out()});
})();
