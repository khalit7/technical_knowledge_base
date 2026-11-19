// ---- Fig. 2 (Forward or reverse KL): a one-bump student fitted to a two-mode teacher by exact gradient descent, both directions, flat (2026-11-19: was a
// 3D stage with the three distributions as rows in depth; stacked flat rows on one token axis compare heights without perspective). Illustrative teacher
// and student family; the 40 steps of each fit are computed here (the same engine as the 2026-10-23 widget); each fit plays its 40 steps within one explained step. ----
(function(){
  // flat SVG helpers (2026-11-19): rect, text, line, arrow, eased marks (class rd-new eases in on a forward step)
  const fx=v=>(+v).toFixed(1),MONO='ui-monospace,SFMono-Regular,Menlo,monospace';
  const rect=(x,y,w,h,o)=>{o=o||{};return '<rect'+(o.cl?' class="'+o.cl+'"':'')+' x="'+fx(x)+'" y="'+fx(y)+'" width="'+fx(Math.max(0,w))+'" height="'+fx(Math.max(0,h))+'" rx="'+(o.r==null?5:o.r)+'" fill="'+(o.fill||'none')+'"'+(o.fo!=null?' fill-opacity="'+o.fo+'"':'')+(o.s?' stroke="'+o.s+'" stroke-width="'+(o.sw||1.2)+'"':'')+(o.da?' stroke-dasharray="'+o.da+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+'/>'};
  const text=(x,y,s,o)=>{o=o||{};return '<text'+(o.cl?' class="'+o.cl+'"':'')+' x="'+fx(x)+'" y="'+fx(y)+'" font-size="'+(o.fs||12)+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' fill="'+(o.c||'var(--ink)')+'"'+(o.w?' font-weight="'+o.w+'"':'')+(o.mono?' font-family="'+MONO+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+'>'+s+'</text>'};
  const line=(x1,y1,x2,y2,o)=>{o=o||{};return '<line'+(o.cl?' class="'+o.cl+'"':'')+' x1="'+fx(x1)+'" y1="'+fx(y1)+'" x2="'+fx(x2)+'" y2="'+fx(y2)+'" stroke="'+(o.c||'var(--line)')+'" stroke-width="'+(o.sw||1.2)+'"'+(o.da?' stroke-dasharray="'+o.da+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+'/>'};
  const arrow=(x1,y1,x2,y2,o)=>{o=o||{};const a=Math.atan2(y2-y1,x2-x1),h=o.h||7,c=o.c||'var(--ink)';
    const p=[[x2,y2],[x2-h*Math.cos(a-.42),y2-h*Math.sin(a-.42)],[x2-h*Math.cos(a+.42),y2-h*Math.sin(a+.42)]].map(q=>fx(q[0])+','+fx(q[1])).join(' ');
    return '<g'+(o.cl?' class="'+o.cl+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+'>'+line(x1,y1,x2-(h*.6)*Math.cos(a),y2-(h*.6)*Math.sin(a),{c,sw:o.sw||1.6,da:o.da})+'<polygon points="'+p+'" fill="'+c+'"/></g>'};
  const grp=(s,o)=>{o=o||{};return '<g'+(o.cl?' class="'+o.cl+'"':'')+(o.op!=null&&o.op<1?' opacity="'+o.op+'"':'')+'>'+s+'</g>'};
  const $=id=>document.getElementById(id);if(!$('dsl-kl-card'))return;
  const N=40,STEPS=40,C1=11,C2=29,SD=2.5,VAL=[16,24];
  function teacher(w){const a=[];let s=0;for(let i=0;i<N;i++){const v=w*Math.exp(-((i-C1)**2)/(2*SD*SD))+(1-w)*Math.exp(-((i-C2)**2)/(2*SD*SD));a.push(v);s+=v}return a.map(v=>v/s)}
  function logq(mu,ls){const sg=Math.exp(ls),l=[];let m=-Infinity;for(let i=0;i<N;i++){const v=-((i-mu)**2)/(2*sg*sg);l.push(v);if(v>m)m=v}
    let z=0;l.forEach(v=>z+=Math.exp(v-m));z=m+Math.log(z);return l.map(v=>v-z)}
  const fkl=(p,mu,ls)=>{const lq=logq(mu,ls);let s=0;for(let i=0;i<N;i++)if(p[i]>0)s+=p[i]*(Math.log(p[i])-lq[i]);return s};
  const rkl=(p,mu,ls)=>{const lq=logq(mu,ls);let s=0;for(let i=0;i<N;i++){const q=Math.exp(lq[i]);s+=q*(lq[i]-Math.log(Math.max(p[i],1e-300)))}return s};
  function run(p,f,mu0){let mu=mu0,ls=Math.log(2);const out=[[mu,ls]];const h=1e-4;
    for(let k=0;k<STEPS;k++){const gm=(f(p,mu+h,ls)-f(p,mu-h,ls))/(2*h),gs=(f(p,mu,ls+h)-f(p,mu,ls-h))/(2*h);
      mu-=Math.max(-1.5,Math.min(1.5,8*gm));ls-=Math.max(-0.15,Math.min(0.15,0.15*gs));out.push([mu,ls])}return out}
  const mass=(a,x,y)=>{let s=0;for(let i=x;i<=y;i++)s+=a[i];return s};
  function compute(w,s0){const p=teacher(w),f=run(p,fkl,s0),r=run(p,rkl,s0),Q=t=>t.map(([mu,ls])=>logq(mu,ls).map(Math.exp));
    const qf=Q(f),qr=Q(r);let mx=Math.max(...p);[qf,qr].forEach(a=>a.forEach(q=>mx=Math.max(mx,...q)));
    const near=Math.abs(s0-C1)<Math.abs(s0-C2)?'left':'right';return {p,w,s0,f,r,qf,qr,mx,near}}
  let T=compute(.6,22);
  const pc=x=>(100*x).toFixed(1)+'%';
  function stats(m){const t=T[m][STEPS];return {mu:t[0],sg:Math.exp(t[1]),F:fkl(T.p,t[0],t[1]),R:rkl(T.p,t[0],t[1]),val:mass(T[m==='f'?'qf':'qr'][STEPS],VAL[0],VAL[1])}}
  function writeList(){const set=(k,h)=>document.querySelectorAll('[data-kl="'+k+'"]').forEach(e=>e.innerHTML=h),F=stats('f'),Rv=stats('r'),pv=mass(T.p,VAL[0],VAL[1]);
    set('w',Math.round(100*T.w)+'%');set('pv',pc(pv));set('pv2',pc(pv));set('s0',T.s0);set('fend','centre '+F.mu.toFixed(1)+', width '+F.sg.toFixed(1));set('fv',pc(F.val));set('fv2',pc(F.val));
    set('near',T.near);set('rend','centre '+Rv.mu.toFixed(1)+', width '+Rv.sg.toFixed(1));set('rv',pc(Rv.val));
    const bigger=T.w>=.5?'left':'right';set('note','It picked the '+T.near+' mode because it started nearer'+(T.near===bigger?', which here is also the larger one: move the start past the middle and it picks the smaller.':', even though that mode holds less of the teacher\'s mass.'));
    $('klN').innerHTML=RD.stat('Forward-KL student','centre '+F.mu.toFixed(1)+', width '+F.sg.toFixed(1),'forward KL '+F.F.toFixed(3)+' · reverse KL '+F.R.toFixed(3)+' nats')+
      RD.stat('Reverse-KL student','centre '+Rv.mu.toFixed(1)+', width '+Rv.sg.toFixed(1),'forward KL '+Rv.F.toFixed(3)+' · reverse KL '+Rv.R.toFixed(3)+' nats')+
      RD.stat('Mass between the modes','forward '+pc(F.val)+' · reverse '+pc(Rv.val),'teacher '+pc(pv)+' (tokens '+VAL[0]+' to '+VAL[1]+')')}
  // three rows on one token axis: the teacher, the forward-KL student, the reverse-KL student; a fit's 40 gradient steps play within its step
  let cur=0,raf=0;
  function frame(k,fFrame,rFrame){const el=$('dsl-kl'),W=RD.width(el),ph=W<520;let s='';
    const LW=ph?0:128,X0=LW+4,X1=W-(ph?6:96),bw=(X1-X0)/N,x=i=>X0+i*bw,RH=ph?58:66,G=ph?26:18,top=8,hs=v=>Math.min(RH-4,v/T.mx*(RH-4));
    const rows=[['teacher p','var(--ink)',T.p,1],['forward KL(p ‖ q)','var(--c1)',T.qf[fFrame],k>=1?(k===3?.45:1):.15],['reverse KL(q ‖ p)','var(--c2)',T.qr[rFrame],k>=1?(k===2?.45:1):.15]];
    // the valley between the modes, shaded across all three rows
    const va=k===4?.22:.09,yB=top+3*RH+2*G+(ph?3*14:0);
    s+=rect(x(VAL[0]),top,(VAL[1]-VAL[0]+1)*bw,yB-top,{fill:'var(--c5)',fo:va,s:'var(--c5)',sw:1,da:'4 4',r:2,op:k===4||k===0?1:.6});
    let y=top;rows.forEach(([nm,c,q,op],j)=>{if(ph){s+=text(X0,y+11,nm,{fs:11.5,w:700,c,op:Math.max(.5,op)});y+=14}
      const yb=y+RH;s+=line(X0,yb,X1,yb,{c:'var(--line)'});
      let g='';for(let i=0;i<N&&(j===0||k>=1);i++){const h=Math.max(.5,hs(q[i]));g+=rect(x(i)+.5,yb-h,Math.max(.8,bw-1),h,{fill:c,fo:j?.75:.55,r:1})}
      s+=grp(g,{op});if(!ph)s+=text(LW-6,yb-RH/2+4,nm,{a:'end',fs:12,mono:1,w:700,c,op:Math.max(.5,op)});
      // labels per step
      if(j===0&&k===0){s+=text(x(C1)+bw/2,y+12,Math.round(100*T.w)+'% of the mass',{a:'middle',fs:12,mono:1,w:700,cl:'rd-new'})+text(x(C2)+bw/2,y+12,Math.round(100*(1-T.w))+'%',{a:'middle',fs:12,mono:1,w:700,cl:'rd-new'})}
      if(j>0&&(k===2||k===3)&&j===k-1)s+=text(X1+(ph?0:6),ph?y-3:yb-RH/2+4,'step '+(j===1?fFrame:rFrame)+' of '+STEPS,{a:ph?'end':'start',fs:12,mono:1,w:700,c});
      if(j===2&&k===1)s+=text(x(T.s0)+bw/2+6,y+14,'start: token '+T.s0+', width 2',{fs:12,mono:1,w:700,a:T.s0>N/2?'end':'start',cl:'rd-new'});
      if(k===4){const v=j===0?mass(T.p,VAL[0],VAL[1]):stats(j===1?'f':'r').val;s+=text(ph?X1:X1+6,ph?y-3:yb-RH/2+4,pc(v)+(ph?' in the valley':' in valley'),{a:ph?'end':'start',fs:12,mono:1,w:700,c,cl:'rd-new'})}
      y=yb+G});
    // the token axis
    s+=text(x(VAL[0])+(VAL[1]-VAL[0]+1)*bw/2,yB+14,'valley, tokens 16 to 24',{a:'middle',fs:11.5,c:'var(--c5)',w:600});
    [0,10,20,30,39].forEach(i=>{s+=text(x(i)+bw/2,yB+28,(i?'':'token ')+i,{a:i?'middle':'start',fs:11,mono:1,c:'var(--mute)'})});
    el.innerHTML=RD.svg(W,yB+34,s,'A one-bump student fitted to a two-mode teacher, forward and reverse KL')}
  function draw(k){cur=k;if(raf){cancelAnimationFrame(raf);raf=0}
    const fwd=$('dsl-kl-card').classList.contains('rd-fwd')&&!RD.RM,fit=k===2||k===3;
    const fEnd=k<=1?0:STEPS,rEnd=k<=2?0:STEPS;
    if(!fit||!fwd){frame(k,fEnd,rEnd);return}
    const t0=performance.now(),D=2400;(function go(now){if(cur!==k)return;const u=Math.min(1,(now-t0)/D),n=Math.round(u*STEPS);
      frame(k,k===2?n:STEPS,k===3?n:0);if(u<1)raf=requestAnimationFrame(go);else raf=0})(t0)}
  const an=RD.anim({card:'dsl-kl-card',ctl:'dsl-kl-ctl',n:5,ms:5200,draw,label:'KL step',list:'sx-kl'});
  RD.onResize(()=>an.redraw());
  function upd(){const w=+$('klW').value,s0=+$('klS').value;$('klWv').textContent=w.toFixed(2);$('klSv').textContent=s0;T=compute(w,s0);writeList();an.reset(5,'sx-kl')}
  ['klW','klS'].forEach(id=>$(id).addEventListener('input',upd));
  writeList();
  window.DSL_KL={compute,stats:()=>({f:stats('f'),r:stats('r'),pv:mass(T.p,VAL[0],VAL[1])})};
})();
