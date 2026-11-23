// ---- Top-p against top-nsigma as temperature doubles (RD.anim; steps explained in sx-pl-topp and sx-pl-nsig). The distribution is illustrative; the pool sizes are the paper's ----
(function(){
  const card=$('v-pool');if(!card)return;
  // illustrative logits of the 30 most likely tokens, then the rest of a 128,000-token vocabulary at one low logit
  const Z=[10,9.4,9.1,8.6];for(let i=4;i<30;i++)Z.push(6.6-3.4*(i-4)/25);
  const NT=128000-30,ZT=-4.5;
  function probs(T){const e=Z.map(z=>Math.exp(z/T)),et=NT*Math.exp(ZT/T),s=e.reduce((a,b)=>a+b,0)+et;return{p:e.map(v=>v/s),tail:et/s}}
  // [temperature, pool drawn (bars kept, tail kept), pool size the paper reports, or null before the cut]
  const MODES={topp:{name:'top-p',st:[[1,0,0,null],[1,4,0,4],[2,0,0,null],[2,30,1,51845]]},nsig:{name:'top-nsigma',st:[[1,0,0,null],[1,3,0,3],[2,0,0,null],[2,3,0,3]]}};
  const st={m:'topp',k:0};
  function draw(){
    const md=MODES[st.m],[T,keep,tailOn,size]=md.st[st.k],{p,tail}=probs(T);
    const box=$('plSvg'),W=Math.max(300,Math.round(box.clientWidth||340)),narrow=W<520,H=narrow?220:240;
    const pl=34,pr=12,pt=28,pb=34,n=Z.length,gap=narrow?10:16,tw=narrow?34:46,bw=(W-pl-pr-gap-tw)/n,L0=-4,Y=v=>pt+(H-pt-pb)*(Math.log10(Math.max(v,1e-4))/L0);
    let s='<text x="'+pl+'" y="16" font-size="12" fill="var(--mute)">Probability at temperature '+T+' (log scale)</text>';
    [[1,'1'],[0.1,'.1'],[0.01,'.01'],[0.001,'.001'],[0.0001,'']].forEach(([v,l])=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/><text x="'+(pl-5)+'" y="'+(Y(v)+4)+'" font-size="11" text-anchor="end" fill="var(--mute)">'+l+'</text>'});
    p.forEach((v,i)=>{const on=i<keep;s+='<rect x="'+(pl+i*bw+1)+'" y="'+Y(v)+'" width="'+Math.max(1,bw-2)+'" height="'+(Y(1e-4)-Y(v))+'" rx="1.5" fill="'+(on?'var(--acc)':'var(--dim)')+'"/>'});
    const tx=pl+n*bw+gap;
    s+='<rect x="'+tx+'" y="'+Y(tail)+'" width="'+tw+'" height="'+(Y(1e-4)-Y(tail))+'" rx="2" fill="'+(tailOn?'var(--bad)':'var(--dim)')+'" fill-opacity="'+(tailOn?0.85:1)+'"/>';
    s+='<text x="'+(tx+tw/2)+'" y="'+(H-pb+14)+'" font-size="11" text-anchor="middle" fill="var(--mute)">tail</text>';
    s+='<text x="'+pl+'" y="'+(H-pb+14)+'" font-size="11" fill="var(--mute)">'+(narrow?'30 likeliest tokens':'the 30 likeliest tokens, in order')+'</text>';
    s+='<text x="'+(tx+tw/2)+'" y="'+(Y(tail)-5)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+(100*tail).toFixed(0)+'%</text>';
    box.innerHTML=svgEl(W,H,s,'Next-token probabilities at temperature '+T+' and the '+md.name+' pool');
    $('plCnt').innerHTML=stat('Temperature',String(T),st.k<2?'logits divided by 1':'logits divided by 2')+stat('Candidate pool',size==null?'not cut yet':fmt(size)+' token'+(size===1?'':'s'),size==null?'':'the paper\'s Llama-3.1-8B example')+stat('Top token\'s probability',(100*p[0]).toFixed(0)+'%','in this illustrative distribution');
    if(card.classList.contains('rd-fwd')&&!RD.RM)card.dataset.frames=(+card.dataset.frames||0)+1;
  }
  const anim=RD.anim({card:'v-pool',ctl:'plCtl',n:4,list:'sx-pl-topp',ms:4200,label:'Step',draw:i=>{st.k=i;draw()}});
  const seg=$('plM');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
    seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    st.m=b.dataset.m;document.querySelectorAll('ol[id^="sx-pl-"]').forEach(o=>o.hidden=o.id!=='sx-pl-'+st.m);anim.reset(4,'sx-pl-'+st.m)}));
  let rw=0;addEventListener('resize',()=>{const w=card.clientWidth;if(w&&w!==rw){rw=w;anim.redraw()}});
  onTab(card.closest('.tab').id,()=>anim.redraw());
})();
