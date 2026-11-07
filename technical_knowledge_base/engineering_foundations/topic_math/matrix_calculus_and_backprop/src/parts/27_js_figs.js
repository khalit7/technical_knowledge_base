// ---- Reading figures added 2026-10-24: the two layouts, attention's backward shapes, the gradient-product slider (section 10) and the
// finite-difference error chart (section 11). Drawn at the measured width and redrawn on resize. (The 2D hero, the section 5 stepper and the
// Jacobian figure became the 3D stages of 2026-11-07: 31_js_sc_net.js and 32_js_sc_jac.js.)
(function(){
  const M2=window.MC2,D=window.MCD;if(!M2)return;
  const f3=v=>(Math.abs(v)<5e-13?0:v)<0?'−'+Math.abs(v).toFixed(3):(Math.abs(v)<5e-13?0:v).toFixed(3);
  const fz=v=>Math.abs(v)<5e-13?'0':f3(v);
  const vec=a=>'('+a.map(fz).join(', ')+')';
  const T=RD.t,esc=RD.esc;
  const box=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="6" fill="'+(o.fill||'var(--bg)')+'" stroke="'+(o.stroke||'var(--line)')+'" stroke-width="'+(o.sw||1)+'"'+(o.dash?' stroke-dasharray="4 3"':'')+'/>'};
  const arrow=(x1,y1,x2,y2,col)=>{const a=Math.atan2(y2-y1,x2-x1),s=6;
    return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+col+'" stroke-width="1.6"/><path d="M'+x2+' '+y2+'L'+(x2-s*Math.cos(a-0.45))+' '+(y2-s*Math.sin(a-0.45))+'L'+(x2-s*Math.cos(a+0.45))+' '+(y2-s*Math.sin(a+0.45))+'Z" fill="'+col+'"/>'};

  // ---------- section 2: the same six slopes in the two layouts ----------
  function drawLay(){const el=document.getElementById('mc-lay');if(!el)return;
    const w=RD.width(el),g=D.tiny.gW,cw=Math.max(44,Math.min(56,Math.floor((w-110)/5))),ch=24,words=['cat','dog','sat'];
    let s='',x0=30,y0=34;
    s+=T(x0,14,'W.grad (3 × 2)',{fs:12,w:600,fill:'var(--ink)'});
    for(let i=0;i<3;i++){s+=T(x0-4,y0+i*ch+16,words[i],{a:'end',fs:11,fill:'var(--mute)'});
      for(let j=0;j<2;j++){const hl=i===2&&j===0;s+=box(x0+j*cw,y0+i*ch,cw-2,ch-2,{fill:hl?'var(--acc2)':'var(--soft)',stroke:hl?'var(--acc)':'var(--line)'})+T(x0+j*cw+cw/2,y0+i*ch+15,f3(g[i][j]),{a:'middle',fs:11,fill:'var(--ink)'})}}
    const x1=x0+2*cw+38;
    s+=arrow(x0+2*cw+6,y0+ch*1.5,x1-6,y0+ch*1.5,'var(--mute)')+T(x0+2*cw+19,y0+ch*1.5-6,'ᵀ',{a:'middle',fs:12,fill:'var(--mute)'});
    s+=T(x1,14,'numerator layout (2 × 3)',{fs:12,w:600,fill:'var(--ink)'});
    for(let j=0;j<2;j++)for(let i=0;i<3;i++){const hl=i===2&&j===0;s+=box(x1+i*cw,y0+j*ch,cw-2,ch-2,{fill:hl?'var(--acc2)':'var(--soft)',stroke:hl?'var(--acc)':'var(--line)'})+T(x1+i*cw+cw/2,y0+j*ch+15,f3(g[i][j]),{a:'middle',fs:11,fill:'var(--ink)'})}
    for(let i=0;i<3;i++)s+=T(x1+i*cw+cw/2,y0+2*ch+14,words[i],{a:'middle',fs:11,fill:'var(--mute)'});
    const need=x1+3*cw+2;
    el.innerHTML=RD.svg(Math.max(w,need),y0+3*ch+10,s,'The same gradient in two layouts')}

  // ---------- section 6f: attention's backward pass, shapes to scale (T = 8 queries and keys, d = 4) ----------
  function drawAtt(){const el=document.getElementById('mc-att');if(!el)return;
    const w=RD.width(el),u=w<420?4.5:6,Tn=8,dn=4,gap=w<420?16:28;
    const rowF=[['Q','T×d',Tn,dn,0],['Kᵀ','d×T',dn,Tn,0],['S','T×T',Tn,Tn,1],['A','T×T',Tn,Tn,1],['V','T×d',Tn,dn,0],['O','T×d',Tn,dn,0]];
    const rowB=[['Ō','T×d',Tn,dn,0],['V̄','T×d',Tn,dn,0],['Ā','T×T',Tn,Tn,1],['D','T',Tn,1,2],['S̄','T×T',Tn,Tn,1],['Q̄ K̄','T×d',Tn,dn,0]];
    let s='',H=0;
    const draw=(row,y,title,col)=>{s+=T(0,y-10,title,{fs:12,w:600,fill:col});let x=0;
      row.forEach(r=>{const bw=r[3]*u,bh=r[2]*u,fill=r[4]===1?'var(--acc2)':r[4]===2?'var(--c5)':'var(--soft)',st=r[4]===1?'var(--acc)':'var(--mute)',yb=y+(Tn-r[2])*u;
        s+=box(x,yb,bw,bh,{fill,stroke:st});
        s+=T(x+bw/2,y+Tn*u+14,r[0],{a:'middle',fs:11,w:600,fill:'var(--ink)'})+T(x+bw/2,y+Tn*u+27,r[1],{a:'middle',fs:10.5,fill:'var(--mute)'});
        x+=Math.max(bw,34)+gap});return x};
    const xa=draw(rowF,24,'forward: S = QKᵀ/√d, A = softmax(S), O = AV','var(--ink)');
    const yb=24+Tn*u+30+32;
    const xb=draw(rowB,yb,'backward: from Ō to Q̄, K̄ and V̄','var(--acc)');
    H=yb+Tn*u+32;
    el.innerHTML=RD.svg(Math.max(w,xa,xb),H,s,'Shapes in attention forward and backward')}

  // ---------- section 10: the gradient is a product (slider: per-layer gain g) ----------
  const vs=document.getElementById('mc-van-svg'),vr=document.getElementById('mc-van-g');
  function drawVan(){if(!vs)return;const g=+vr.value,r=M2.vanish(g),n=M2.VN;
    document.getElementById('mc-van-gv').textContent=g.toFixed(2);
    const w=RD.width(vs),h=240,ml=46,mr=12,mt=10,mb=34,lo=-10,hi=10;
    const X=k=>ml+k/n*(w-ml-mr),Y=v=>mt+(1-(Math.log10(Math.max(v,1e-300))-lo)/(hi-lo))*(h-mt-mb);
    let s='';
    for(let e=lo;e<=hi;e+=5){s+='<line x1="'+ml+'" x2="'+(w-mr)+'" y1="'+Y(10**e)+'" y2="'+Y(10**e)+'" stroke="var(--line)"/>'+T(ml-4,Y(10**e)+4,e===0?'1':'1e'+e,{a:'end',fs:10.5,fill:'var(--mute)'})}
    [0,10,20,30].forEach(k=>{s+=T(X(k),h-mb+14,String(k),{a:'middle',fs:10.5,fill:'var(--mute)'})});
    s+=T(ml+(w-ml-mr)/2,h-4,'layer k (the loss’s gradient enters at layer 30)',{a:'middle',fs:11,fill:'var(--mute)'});
    const path=(arr,col,dash)=>'<path d="'+arr.map((v,k)=>(k?'L':'M')+X(k).toFixed(1)+' '+Math.max(mt,Math.min(h-mb,Y(v))).toFixed(1)).join('')+'" fill="none" stroke="'+col+'" stroke-width="2"'+(dash?' stroke-dasharray="5 4"':'')+'/>';
    const ref=Array.from({length:n+1},(_,k)=>g**(n-k));
    s+=path(ref,'var(--mute)',1)+path(r.linear,'var(--c4)')+path(r.tanh,'var(--acc)');
    vs.innerHTML=RD.svg(w,h,s,'Gradient norm by layer')+'<div class="mem-legend"><span><i style="background:var(--c4)"></i>linear layers: the product of the Wᵀ</span><span><i style="background:var(--acc)"></i>tanh layers: each factor also times 1 − h²</span><span><i style="border:1px dashed var(--mute)"></i>g to the power of the layers crossed</span></div>';
    const e=v=>v>=1e4||v<1e-3?v.toExponential(2).replace('e','e').replace('-','−'):v.toPrecision(3);
    document.getElementById('mc-van-cnt').innerHTML=RD.stat('Gradient at layer 0, linear',e(r.linear[0]),'started at 1 at layer 30')+RD.stat('Gradient at layer 0, tanh',e(r.tanh[0]),'')+RD.stat('g to the 30th',e(g**n),'the product’s typical size');
  }
  if(vr)vr.addEventListener('input',drawVan);

  // ---------- section 11: finite-difference error against h ----------
  function drawFd(){const el=document.getElementById('mc-fd');if(!el||!D.fd)return;
    const hs=Object.keys(D.fd).map(Number).sort((a,b)=>a-b);
    const w=RD.width(el),h=210,ml=46,mr=12,mt=10,mb=34;
    const X=v=>ml+(Math.log10(v)+4.2)/3.4*(w-ml-mr),Y=v=>mt+(1-(Math.log10(v)+11)/9)*(h-mt-mb);
    let s='';
    [-10,-8,-6,-4,-2].forEach(e=>{s+='<line x1="'+ml+'" x2="'+(w-mr)+'" y1="'+Y(10**e)+'" y2="'+Y(10**e)+'" stroke="var(--line)"/>'+T(ml-4,Y(10**e)+4,'1e'+e,{a:'end',fs:10.5,fill:'var(--mute)'})});
    hs.forEach(v=>{s+=T(X(v),h-mb+14,String(v),{a:'middle',fs:10.5,fill:'var(--mute)'})});
    s+=T(ml+(w-ml-mr)/2,h-4,'step h',{a:'middle',fs:11,fill:'var(--mute)'});
    const ln=(key,col,lab)=>{const pts=hs.map(v=>[X(v),Y(D.fd[String(v)][key])]);
      let o='<path d="'+pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join('')+'" fill="none" stroke="'+col+'" stroke-width="2"/>';
      pts.forEach(p=>{o+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="3.2" fill="'+col+'"/>'});
      const q=pts[0];o+=T(q[0]+8,q[1]+(key==='err_forward'?-10:18),lab,{fs:11,fill:col,w:600});return o};
    s+=ln('err_forward','var(--c4)','one-sided: ×10 per decade')+ln('err_central','var(--acc)','central: ×100 per decade');
    el.innerHTML=RD.svg(w,h,s,'Finite-difference error against step')}

  const all=()=>{drawLay();drawAtt();drawVan();drawFd()};
  RD.onRender(all);RD.onResize(all);all();
})();
// charts inside closed details have no width until opened: redraw everything when one opens
document.addEventListener('toggle',e=>{if(e.target.open)dispatchEvent(new Event('resize'))},true);
