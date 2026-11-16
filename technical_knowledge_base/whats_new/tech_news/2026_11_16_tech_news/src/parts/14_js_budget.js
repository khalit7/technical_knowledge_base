// ---- Dense rewards against GRPO: where one budget of generated tokens goes (RD.anim; steps explained in sx-bg-grpo and sx-bg-mc) ----
(function(){
  const card=$('v-budget');if(!card)return;
  const B=12.25e6,MODES={grpo:{u:584,cont:0,name:'Outcome-only GRPO'},mc:{u:50,cont:0.91,name:'Monte-Carlo process reward'}};
  const STOPS=m=>[0,1,MODES[m].u/2,MODES[m].u];
  function draw(st){
    const md=MODES[st.m],box=$('bgSvg'),W=Math.max(300,Math.round(box.clientWidth||340)),narrow=W<520,H=narrow?210:220;
    const S=STOPS(st.m),prev=st.k?S[st.k-1]:0,upto=prev+(S[st.k]-prev)*Math.max(0,Math.min(1,st.t)),done=Math.floor(upto+1e-9);
    const pl=12,pr=12,bw=W-pl-pr,per=B/md.u,X=t=>pl+bw*t/B;
    let s='';
    // one iteration, drawn on its own scale above the budget bar (the GRPO iteration as the reference width)
    const ref=B/584,iw=Math.min(bw,bw*per/(B/50)),y1=34,h1=26;
    s+='<text x="'+pl+'" y="20" font-size="12" fill="var(--mute)">'+(narrow?'One iteration: about ':'One iteration (64 completions, then one update): about ')+fmt(Math.round(per/1000))+'K tokens</text>';
    const wr=iw*(1-md.cont);
    s+='<rect x="'+pl+'" y="'+y1+'" width="'+Math.max(2,wr)+'" height="'+h1+'" rx="3" fill="var(--acc)"/>';
    if(md.cont)s+='<rect x="'+(pl+wr)+'" y="'+y1+'" width="'+(iw-wr)+'" height="'+h1+'" rx="3" fill="var(--closed)" fill-opacity=".55"/>';
    s+='<rect x="'+pl+'" y="'+y1+'" width="'+(bw*ref/(B/50))+'" height="'+h1+'" fill="none" stroke="var(--ink)" stroke-dasharray="3 2"/>';
    s+='<text x="'+pl+'" y="'+(y1+h1+15)+'" font-size="11" fill="var(--mute)">'+(md.cont?(narrow?'purple: continuations, discarded':'blue: completions trained on; purple: continuations scored and discarded; dashed: a GRPO iteration'):(narrow?'blue: completions trained on':'dashed: a GRPO iteration (blue: completions trained on)'))+'</text>';
    // the budget bar, filled iteration by iteration
    const y2=narrow?112:118,h2=34;
    s+='<text x="'+pl+'" y="'+(y2-10)+'" font-size="12" fill="var(--mute)">'+(narrow?'Budget: 12.25M tokens':'The whole budget: 12.25M generated tokens')+'</text>';
    s+='<rect x="'+pl+'" y="'+y2+'" width="'+bw+'" height="'+h2+'" rx="4" fill="var(--soft)" stroke="var(--line)"/>';
    const used=Math.min(B,upto*per);
    s+='<rect x="'+pl+'" y="'+y2+'" width="'+(X(used)-pl)+'" height="'+h2+'" rx="4" fill="var(--acc)"/>';
    if(md.cont)s+='<rect x="'+pl+'" y="'+(y2+h2*(1-md.cont))+'" width="'+(X(used)-pl)+'" height="'+(h2*md.cont)+'" fill="var(--closed)" fill-opacity=".85"/>';
    // a tick at every completed update (thinned when they would touch)
    const every=Math.max(1,Math.ceil(md.u/(bw/3)));
    for(let k=1;k<=done;k++)if(k%every===0||md.u<=100)s+='<line x1="'+X(k*per)+'" x2="'+X(k*per)+'" y1="'+(y2+h2+2)+'" y2="'+(y2+h2+9)+'" stroke="var(--ink)" stroke-opacity=".7"/>';
    s+='<text x="'+pl+'" y="'+(y2+h2+26)+'" font-size="11" fill="var(--mute)">'+(narrow?'one tick per update':'one tick per update'+(every>1?' (every '+every+'th shown)':''))+'</text>';
    s+='<text x="'+(W-pr)+'" y="'+(y2+h2+26)+'" font-size="12" text-anchor="end" font-weight="700">'+done+' update'+(done===1?'':'s')+'</text>';
    box.innerHTML=svgEl(W,H,s,'Token budget spent by '+md.name);
    const trained=used*(1-md.cont);
    $('bgCnt').innerHTML=stat('Updates',String(done),'of '+md.u+' the budget allows')+stat('Tokens spent',(used/1e6).toFixed(2)+'M','of 12.25M')+stat('Spent on completions trained on',Math.round(100*(1-md.cont))+'%',md.cont?'the rest scored the continuations':'all of it');
  }
  const st={m:'grpo',k:0,t:1,raf:0};
  const ease=v=>v<.5?2*v*v:1-Math.pow(-2*v+2,2)/2;
  function tween(){const t0=performance.now();cancelAnimationFrame(st.raf);
    const f=now=>{const u=Math.min(1,(now-t0)/1400);st.t=ease(u);card.dataset.frames=(+card.dataset.frames||0)+1;draw(st);st.raf=u<1?requestAnimationFrame(f):0};st.raf=requestAnimationFrame(f)}
  const anim=RD.anim({card:'v-budget',ctl:'bgCtl',n:4,list:'sx-bg-grpo',ms:4400,label:'Step',
    draw:i=>{st.k=i;if(card.classList.contains('rd-fwd')&&!RD.RM){st.t=0;draw(st);tween()}else{cancelAnimationFrame(st.raf);st.raf=0;st.t=1;draw(st)}}});
  const seg=$('bgM');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
    seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    st.m=b.dataset.m;document.querySelectorAll('ol[id^="sx-bg-"]').forEach(o=>o.hidden=o.id!=='sx-bg-'+st.m);anim.reset(4,'sx-bg-'+st.m)}));
  let rw=0;addEventListener('resize',()=>{const w=card.clientWidth;if(w&&w!==rw){rw=w;anim.redraw()}});
  onTab(card.closest('.tab').id,()=>anim.redraw());
})();
