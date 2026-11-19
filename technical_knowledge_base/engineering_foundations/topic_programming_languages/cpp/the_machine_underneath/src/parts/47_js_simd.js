// ---- Fig. (section 6): one 16-element block of the dot product as instructions in lanes (across) against time in cycles (down), three ways, flat
// (2026-11-19: was a 3D stage with cycles in depth; a flat Gantt chart reads lengths and the 64, 52 and 16 cycle totals on one scale, without perspective).
// Inputs are dot.cpp's (a[i] = (i % 17) / 4, b[i] = (i % 13) / 2); latencies published (Dougall Johnson: fmadd, fmul, fmla 4 cycles; fadd, faddp 3);
// the measured ns per element in L1 from window.CB.dot (run 1). The schedules are the model the page's table checks against the measurements. ----
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
  const card=document.getElementById('cb-simd-card');if(!card||!window.CB||!CB.dot)return;
  const N=16,a=[...Array(N)].map((_,i)=>(i%17)*.25),b=[...Array(N)].map((_,i)=>(i%13)*.5),p=a.map((x,i)=>x*b[i]),pm=Math.max(...p);
  // instruction boxes: [band, first lane, last lane, start cycle, end cycle, colour, step it belongs to, name]
  const I=[];for(let k=0;k<N;k++)I.push([0,k,k,4*k,4*k+4,'var(--c1)',1,'fmadd']);
  for(let r=0;r<4;r++)I.push([1,4*r,4*r+3,0,4,'var(--c3)',2,'fmul.4s']);for(let k=0;k<N;k++)I.push([1,k,k,4+3*k,7+3*k,'var(--c2)',2,'fadd']);
  for(let r=0;r<4;r++)I.push([2,4*r,4*r+3,0,4,'var(--c4)',3,'fmla.4s']);
  I.push([2,0,7,4,7,'var(--c5)',4,'fadd.4s'],[2,8,15,4,7,'var(--c5)',4,'fadd.4s'],[2,0,15,7,10,'var(--c5)',4,'fadd.4s'],[2,2,13,10,13,'var(--c5)',4,'faddp'],[2,5,10,13,16,'var(--c5)',4,'faddp']);
  const END=[64,52,16],D=CB.dot.v,ME=[D.l1_scalar.runs[0],D.l1_auto.runs[0],D.l1_neon.runs[0]],PR=[4/3.2,3/3.2,.25/3.2],CPE=['4','3','0.25'];
  const NAME=[['scalar','fmadd chain'],['-O2','fmul.4s, then fadd chain'],['NEON','4 x fmla.4s']],BC=['var(--c1)','var(--c2)','var(--c4)'];
  function draw(k){const el=document.getElementById('cb-simd'),W=RD.width(el),ph=W<520;let s='';
    const AX=ph?30:52,gap=ph?8:16,pw=(W-AX-2*gap)/3,lw=pw/N,top=ph?40:30,ph0=top+30,cyc=ph?3.2:4.2,yc=c=>ph0+c*cyc;
    const on=bd=>k===0||k===5||(k===1&&bd===0)||(k===2&&bd===1)||(k>=3&&bd===2);
    // the cycle axis on the left: time runs down the page
    [0,16,32,48,64].forEach(c=>{s+=line(AX-4,yc(c),W,yc(c),{c:'var(--line)',da:'2 4'})+text(AX-7,yc(c)+4,String(c),{a:'end',fs:11,mono:1,c:'var(--mute)'})});
    s+=text(2,yc(64)+18,'cycles',{fs:11,c:'var(--mute)'});
    [0,1,2].forEach(bd=>{const x0=AX+bd*(pw+gap),op=on(bd)?1:.3;let g='';
      g+=text(x0+pw/2,12,NAME[bd][0],{a:'middle',fs:12.5,w:700,c:BC[bd]})+text(x0+pw/2,26,ph&&bd===1?'fmul, fadd chain':NAME[bd][1],{a:'middle',fs:11,mono:1,c:'var(--mute)'});
      // the 16 products of one block, as bars above the clock
      p.forEach((v,l)=>{const h=Math.max(1,v/pm*22);g+=rect(x0+l*lw+.6,ph0-4-h,lw-1.2,h,{fill:'var(--c2)',fo:.55,r:1})});
      // the instruction boxes: as wide as the lanes they work on, as tall as the cycles they take
      I.forEach(x=>{const [b2,l0,l1,c0,c1,col,st,nm]=x;if(b2!==bd||st>k)return;const nw=st===k;
        g+=rect(x0+l0*lw+.8,yc(c0)+.6,(l1-l0+1)*lw-1.6,(c1-c0)*cyc-1.2,{fill:col,fo:.7,s:col,sw:.6,r:2,cl:nw?'rd-new':''})});
      // the dependency: s0 carried from box to box
      if((k===1&&bd===0)||(k===2&&bd===1)){let d='';for(let i=0;i<N;i++){const c=bd===0?4*i+2:4+3*i+1.5;d+=(i?'L':'M')+fx(x0+(i+.5)*lw)+','+fx(yc(c))}
        g+='<path class="rd-new" d="'+d+'" fill="none" stroke="var(--ink)" stroke-width="1.2" stroke-dasharray="3 2" opacity=".7"/>'}
      // the total at the end of each chain
      const shown=k===5||(bd===0&&k>=1)||(bd===1&&k>=2)||(bd===2&&k>=4);
      if(shown){g+=line(x0,yc(END[bd]),x0+pw,yc(END[bd]),{c:BC[bd],sw:2});
        g+=text(x0+pw/2,yc(END[bd])+15,END[bd]+' cycles',{a:'middle',fs:12,mono:1,w:700,c:BC[bd],cl:(k===1&&bd===0)||(k===2&&bd===1)||(k===4&&bd===2)?'rd-new':''});
        if(k===5){g+=text(x0+pw/2,yc(END[bd])+30,CPE[bd]+' per elem.',{a:'middle',fs:11.5,mono:1,c:'var(--ink)',cl:'rd-new'});
          g+=text(x0+pw/2,yc(END[bd])+45,(ph?'':'pred. ')+PR[bd].toFixed(bd===2?3:2)+' ns',{a:'middle',fs:11.5,mono:1,c:'var(--mute)',cl:'rd-new'});
          g+=text(x0+pw/2,yc(END[bd])+60,(ph?'':'meas. ')+ME[bd].toFixed(3)+' ns',{a:'middle',fs:11.5,mono:1,w:700,c:BC[bd],cl:'rd-new'})}}
      if(k===3&&bd===2)g+=text(x0+pw/2,yc(4)+15,ph?'4 cycles':'4 cycles · 0.25 per element',{a:'middle',fs:12,mono:1,w:700,c:BC[2],cl:'rd-new'});
      s+=grp(g,{op})});
    el.innerHTML=RD.svg(W,yc(64)+(k===5?66:24),s,'16 products, three schedules: lanes across, cycles down')}
  const an=RD.anim({card:'cb-simd-card',ctl:'cb-simd-ctl',n:6,ms:5000,draw,label:'Schedule step',list:'sx-simd'});
  RD.onResize(()=>an.redraw());
})();
