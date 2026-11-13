// ---- GRAFT: a reward penalty on flagged rollouts against routing flagged updates into a deletable adapter (RD.anim; steps explained in sx-gr-pen and sx-gr-graft) ----
(function(){
  const card=$('v-graft');if(!card)return;
  // the per-step explanations are the step lists sx-gr-pen and sx-gr-graft (static HTML in v_graft.html, left column)
  const MODES={pen:{name:'Reward penalty'},graft:{name:'GRAFT'}},NS=4;
  const st={m:'pen',k:0,t:1,raf:0};
  const cl=v=>Math.max(0,Math.min(1,v));
  function draw(){
    const box=$('grSvg'),W=Math.max(300,Math.round(box.clientWidth||340)),narrow=W<560,g=st.m==='graft';
    const fs=narrow?11:12,H=narrow?318:268;
    const op=k=>k<st.k?1:(k===st.k?cl(st.t*1.6):0);
    let s='';
    // column positions
    const c1=narrow?6:10,bw=narrow?(W-24)/3:(W-60)/3.4,c2=c1+bw+(narrow?6:20),c3=c2+bw+(narrow?6:20);
    const y1=narrow?20:24,bh=narrow?58:52;
    s+=bx(c1,y1,bw,bh,'bxa',['Rollout',narrow?'hack 1, 2, 3':'hack 1, 2 or 3'],fs);
    s+=bx(c2,y1,bw,bh,'bxa',['Monitor',narrow?'sees hack 1':'sees hack 1 only'],fs);
    s+=ar(c1+bw,y1+bh/2,c2,y1+bh/2);
    // step 0: flag
    s+='<g opacity="'+op(0)+'"><text x="'+(c2+bw/2)+'" y="'+(y1+bh+16)+'" font-size="'+fs+'" text-anchor="middle" fill="var(--bad)">flag: hack 1</text></g>';
    // weights boxes
    const y2=y1+bh+(narrow?44:40),wh=narrow?58:52;
    if(!g){
      s+=bx(c3,y1,bw,bh,'bxa',['Reward',narrow?'lowered':'lowered if flagged'],fs).replace('<rect','<rect opacity="'+op(1)+'"');
      s+='<g opacity="'+op(1)+'">'+ar(c2+bw,y1+bh/2,c3,y1+bh/2)+'</g>';
      s+=bx(c2,y2,bw,wh,'bxa',['Policy weights','one set'],fs);
      s+='<g opacity="'+op(1)+'">'+ar(c3+bw/2,y1+bh,c2+bw*0.75,y2,true)+'</g>';
    }else{
      s+=bx(c2-(narrow?0:bw*0.35),y2,bw,wh,'bxa',[narrow?'RETAIN':'RETAIN + base',narrow?'unflagged':'unflagged updates'],fs);
      const fx=c3,del=st.k===3?cl(st.t*1.6):0;
      s+='<g opacity="'+(op(1)*(1-0.75*del))+'">'+bx(fx,y2,bw,wh,'bxb',[narrow?'FORGET':'FORGET adapter',narrow?'flagged only':'flagged updates only'],fs)+ar(c2+bw,y1+bh*0.75,fx+bw*0.3,y2)+'</g>';
      if(del>0)s+='<g opacity="'+del+'"><line x1="'+fx+'" y1="'+y2+'" x2="'+(fx+bw)+'" y2="'+(y2+wh)+'" stroke="var(--bad)" stroke-width="2"/><line x1="'+(fx+bw)+'" y1="'+y2+'" x2="'+fx+'" y2="'+(y2+wh)+'" stroke="var(--bad)" stroke-width="2"/><text x="'+(fx+bw/2)+'" y="'+(y2+wh+15)+'" font-size="'+fs+'" text-anchor="middle" fill="var(--bad)">deleted</text></g>';
    }
    // outcome strip
    const y3=H-(narrow?80:74),lw=narrow?110:150,X0=c1+lw,X1=W-(narrow?44:60);
    const X=v=>X0+(X1-X0)*v/40;
    s+='<text x="'+c1+'" y="'+(y3-8)+'" font-size="'+fs+'" fill="var(--mute)">share of trajectories that hack (paper\'s figures)</text>';
    [0,10,20,30,40].forEach(v=>{s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+y3+'" y2="'+(y3+26)+'" stroke="var(--line)"/><text x="'+X(v)+'" y="'+(y3+40)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+v+'%</text>'});
    const e=cl(st.t*1.3);let val=null,lab='',col='var(--closed)';
    if(!g){if(st.k===2){val=25.9*e;lab='undetected hack: 25.9%'}if(st.k===3){val=25.9;lab='deployed: 25.9%, undetected'}}
    else{if(st.k===2){val=38.5*e;lab='FORGET on: 38.5%';col='var(--dim)'}if(st.k===3){val=38.5-36.9*e;lab=e<1?'deleting FORGET':'FORGET deleted: 1.6%';col=e<1?'var(--dim)':'var(--open)'}}
    s+='<text x="'+(X0-6)+'" y="'+(y3+17)+'" font-size="'+fs+'" text-anchor="end">'+(g?'GRAFT':'Penalty')+'</text>';
    if(val!=null){const xe=X(val);
      s+='<rect x="'+X0+'" y="'+(y3+5)+'" width="'+Math.max(2,xe-X0)+'" height="16" rx="3" fill="'+col+'"/>';
      s+='<text x="'+X0+'" y="'+(y3+58)+'" font-size="'+(narrow?11:12)+'" font-weight="600">'+lab+'</text>'}
    else s+='<text x="'+X0+'" y="'+(y3+58)+'" font-size="11" fill="var(--mute)">not measured at this step</text>';
    box.innerHTML=svgEl(W,H,s,'Where a flagged update goes: '+(g?'GRAFT':'reward penalty'));
    $('grCnt').innerHTML=g?stat('Reward changed by the flag','No','the flag picks the parameters')+stat('After deleting FORGET','1.6%','of trajectories hack')+stat('Task score','+19.0 points','79.2 against the base 60.2'):
      stat('Reward changed by the flag','Yes','flagged rollouts score lower')+stat('Undetected hacking','25.9%','of trajectories')+stat('What the monitor reports','almost nothing','it cannot see hacks 2 and 3');
  }
  // the controller: RD.anim (template 21_js_rd_common.js), four steps per mode, the step list on the left (one list per mode);
  // a step reached by moving forward fades and grows its marks over about 1.4 s, any other move draws it whole
  function tween(){const t0=performance.now();cancelAnimationFrame(st.raf);
    const f=now=>{st.t=Math.min(1,(now-t0)/1400);card.dataset.frames=(+card.dataset.frames||0)+1;draw();st.raf=st.t<1?requestAnimationFrame(f):0};st.raf=requestAnimationFrame(f)}
  const anim=RD.anim({card:'v-graft',ctl:'grCtl',n:NS,list:'sx-gr-pen',ms:5200,label:'Step',
    draw:i=>{st.k=i;if(card.classList.contains('rd-fwd')&&!RD.RM){st.t=0;draw();tween()}else{cancelAnimationFrame(st.raf);st.raf=0;st.t=1;draw()}}});
  // switching mode swaps the step list and replays from the first step (the one exception to "stops for good")
  const seg=$('grM');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
    seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    st.m=b.dataset.m;document.querySelectorAll('ol[id^="sx-gr-"]').forEach(o=>o.hidden=o.id!=='sx-gr-'+st.m);anim.reset(NS,'sx-gr-'+st.m)}));
  let rw=0;addEventListener('resize',()=>{const w=card.clientWidth;if(w&&w!==rw){rw=w;draw()}});
  onTab(card.closest('.tab').id,()=>anim.redraw());
})();
