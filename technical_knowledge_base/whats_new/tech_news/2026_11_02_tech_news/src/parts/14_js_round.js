// ---- Fair Cast: round-to-nearest against stochastic-rounding export of one fp32 master weight to bf16 (RD.anim; steps explained in sx-rd-rtn and sx-rd-sr) ----
(function(){
  const card=$('v-round');if(!card)return;
  const ULP=Math.pow(2,-13),G0=246*ULP,U=1e-6,N=150;
  const master=t=>G0+U*t;
  const rtn=t=>Math.round(master(t)/ULP)*ULP;
  const rnd=mulberry32(20261029),draws=[];for(let t=0;t<=N;t++)draws.push(rnd());
  const sr=t=>{const m=master(t),lo=Math.floor(m/ULP+1e-12)*ULP,p=(m-lo)/ULP;return draws[t]<p?lo+ULP:lo};
  const STALE=Math.ceil((ULP/2)/U);  // first step at which round-to-nearest moves: 62
  // the four stops of each mode (RL step reached); what each step shows is written in the step lists sx-rd-rtn and sx-rd-sr on the left
  const STOPS=[0,40,STALE-1,N];
  const MODES={rtn:{name:'Round to nearest'},sr:{name:'Stochastic rounding'}};
  function draw(st){
    const g=st.m==='sr',box=$('rdSvg'),W=Math.max(300,Math.round(box.clientWidth||340)),narrow=W<560,H=narrow?250:270;
    const prev=st.k?STOPS[st.k-1]:0,upto=Math.round(prev+(STOPS[st.k]-prev)*Math.max(0,Math.min(1,st.t)));
    const pl=narrow?58:70,pr=12,pt=14,pb=34,y0=G0-ULP*0.27,y1=G0+ULP*1.36;
    const X=t=>pl+(W-pl-pr)*t/N,Y=v=>pt+(H-pt-pb)*(1-(v-y0)/(y1-y0));
    let s='';
    [0,1].forEach(k=>{const v=G0+k*ULP;s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--mute)" stroke-dasharray="2 3"/><text x="'+(pl-6)+'" y="'+(Y(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+v.toFixed(6)+'</text>'});
    s+='<text x="'+(pl-6)+'" y="'+(Y(G0+ULP/2)+4)+'" font-size="10" text-anchor="end" fill="var(--mute)">midpoint</text><line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(G0+ULP/2)+'" y2="'+Y(G0+ULP/2)+'" stroke="var(--line)"/>';
    [0,50,100,150].forEach(t=>{s+='<text x="'+X(t)+'" y="'+(H-pb+15)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+t+'</text>'});
    s+='<text x="'+((pl+W-pr)/2)+'" y="'+(H-4)+'" font-size="11" text-anchor="middle" fill="var(--mute)">RL step</text>';
    let pm='',ps='';
    for(let t=0;t<=upto;t++){pm+=(t?'L':'M')+X(t).toFixed(1)+','+Y(master(t)).toFixed(1);
      if(!g){const v=rtn(t);ps+=(t?'L'+X(t).toFixed(1)+','+Y(rtn(t-1)).toFixed(1)+'L':'M')+X(t).toFixed(1)+','+Y(v).toFixed(1)}
      else{const v=sr(t);ps+='<circle cx="'+X(t).toFixed(1)+'" cy="'+Y(v).toFixed(1)+'" r="2" fill="var(--closed)"/>'}}
    s+='<path d="'+pm+'" fill="none" stroke="var(--acc)" stroke-width="2"/>';
    s+=g?ps:'<path d="'+ps+'" fill="none" stroke="var(--closed)" stroke-width="2.4"/>';
    const lx=X(Math.min(upto,N))-4;s+='<text x="'+Math.max(pl+90,lx)+'" y="'+(Y(master(upto))-8)+'" font-size="11" text-anchor="end" fill="var(--acc)">fp32 master</text>';
    s+='<text x="'+(pl+6)+'" y="'+(Y(G0)+16)+'" font-size="11" fill="var(--closed)">'+(g?(narrow?'bf16 copy, rounded at random':'bf16 copy, rounded at random each step (dots)'):'bf16 copy the sampler serves')+'</text>';
    box.innerHTML=svgEl(W,H,s,'Master weight against served bf16 copy: '+MODES[st.m].name);
    const changed=t=>t>0&&(g?sr(t)!==sr(t-1):rtn(t)!==rtn(t-1));let nc=0;for(let t=1;t<=upto;t++)if(changed(t))nc++;
    const lag=g?0:(rtn(upto)===G0?upto:upto-STALE);
    $('rdCnt').innerHTML=stat('Steps shown',String(upto),'of '+N)+stat('Exports that changed the served weight',String(nc),upto?Math.round(100*nc/upto)+'% of steps':'')+stat(g?'Served weight, on average':'Steps since the served weight last changed',g?'equals the master':String(Math.max(0,lag)),g?'unbiased by construction':'each one an update the sampler missed');
  }
  // the controller: RD.anim (template 21_js_rd_common.js), one stop per step, the step list on the left (one list per mode);
  // a step reached by moving forward draws the curves on from the previous stop over about 1.4 s, any other move draws it whole
  const st={m:'rtn',k:0,t:1,raf:0};
  const ease=v=>v<.5?2*v*v:1-Math.pow(-2*v+2,2)/2;
  function tween(){const t0=performance.now();cancelAnimationFrame(st.raf);
    const f=now=>{const u=Math.min(1,(now-t0)/1400);st.t=ease(u);card.dataset.frames=(+card.dataset.frames||0)+1;draw(st);st.raf=u<1?requestAnimationFrame(f):0};st.raf=requestAnimationFrame(f)}
  const anim=RD.anim({card:'v-round',ctl:'rdCtl',n:STOPS.length,list:'sx-rd-rtn',ms:4600,label:'Step',
    draw:i=>{st.k=i;if(card.classList.contains('rd-fwd')&&!RD.RM){st.t=0;draw(st);tween()}else{cancelAnimationFrame(st.raf);st.raf=0;st.t=1;draw(st)}}});
  // switching export swaps the step list and replays from the first step (the one exception to "stops for good")
  const seg=$('rdM');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
    seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    st.m=b.dataset.m;document.querySelectorAll('ol[id^="sx-rd-"]').forEach(o=>o.hidden=o.id!=='sx-rd-'+st.m);anim.reset(STOPS.length,'sx-rd-'+st.m)}));
  let rw=0;addEventListener('resize',()=>{const w=card.clientWidth;if(w&&w!==rw){rw=w;anim.redraw()}});
  onTab(card.closest('.tab').id,()=>anim.redraw());
})();
