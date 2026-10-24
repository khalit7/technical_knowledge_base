// ---- Reading figures added 2026-10-24: the hero and section 5 stepper (one drawing), the Jacobian of z = Wx, the two layouts,
// attention's backward shapes, the gradient-product slider (section 10) and the finite-difference error chart (section 11).
// Everything is drawn at the measured width and redrawn on resize; nothing moves until the reader acts.
(function(){
  const M2=window.MC2,D=window.MCD;if(!M2)return;
  const f3=v=>(Math.abs(v)<5e-13?0:v)<0?'−'+Math.abs(v).toFixed(3):(Math.abs(v)<5e-13?0:v).toFixed(3);
  const fz=v=>Math.abs(v)<5e-13?'0':f3(v);
  const vec=a=>'('+a.map(fz).join(', ')+')';
  const T=RD.t,esc=RD.esc;
  const box=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="6" fill="'+(o.fill||'var(--bg)')+'" stroke="'+(o.stroke||'var(--line)')+'" stroke-width="'+(o.sw||1)+'"'+(o.dash?' stroke-dasharray="4 3"':'')+'/>'};
  const arrow=(x1,y1,x2,y2,col)=>{const a=Math.atan2(y2-y1,x2-x1),s=6;
    return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+col+'" stroke-width="1.6"/><path d="M'+x2+' '+y2+'L'+(x2-s*Math.cos(a-0.45))+' '+(y2-s*Math.sin(a-0.45))+'L'+(x2-s*Math.cos(a+0.45))+' '+(y2-s*Math.sin(a+0.45))+'Z" fill="'+col+'"/>'};

  // ---------- the network: hero (formulas) and section 5 stepper (numbers) ----------
  const N=M2.two();
  const ROWS=[
    {f:'x',sh:'2',fd:'the input (the context)',kept:'kept',b:'x̄',bd:'W1ᵀ ā',fop:'a = W1 x',bop:'W1ᵀ'},
    {f:'a',sh:'3',fd:'W1 x',kept:'sign kept',b:'ā',bd:'h̄ ⊙ [a > 0]',fop:'h = ReLU(a)',bop:'⊙ [a > 0]'},
    {f:'h',sh:'3',fd:'ReLU(a)',kept:'kept',b:'h̄',bd:'W2ᵀ z̄',fop:'z = W2 h',bop:'W2ᵀ'},
    {f:'z',sh:'3',fd:'W2 h, the scores',kept:'p kept',b:'z̄',bd:'p − y',fop:'softmax, −ln p_sat',bop:'p − y'},
    {f:'L',sh:'scalar',fd:'−ln softmax(z)_sat',kept:'',b:'L̄',bd:'1',fop:'',bop:''}];
  const FV=[N.x,N.a,N.h,N.z,[N.loss]],BV=[N.gx,N.ga,N.gh,N.gz,[1]];
  // st: {fw: rows known forward, bw: rows known backward, w1, w2: weight gradients known, hl: 'f3' | 'b2' | 'w1' ..., nums}
  function drawNet(el,st){
    const w=RD.width(el),narrow=w<600,nums=!!st.nums;
    const fx=0,fw=narrow?Math.floor(w*0.48):Math.floor(w*0.33),bx=narrow?Math.ceil(w*0.52):Math.floor(w*0.39),bw=narrow?w-bx-1:Math.floor(w*0.30);
    const wx=Math.floor(w*0.73),ww=w-wx-1,bh=40,pitch=70,top=20;
    let s=T(fx+4,12,'forward: values',{fs:11,fill:'var(--mute)',w:600})+T(bx+4,12,'backward: gradients (VJPs)',{fs:11,fill:'var(--acc)',w:600});
    if(!narrow)s+=T(wx+4,12,'weight gradients',{fs:11,fill:'var(--acc)',w:600});
    ROWS.forEach((r,k)=>{const y=top+k*pitch,fk=st.fw.has(k),bk=st.bw.has(k);
      const hf=st.hl==='f'+k,hb=st.hl==='b'+k;
      s+=box(fx+1,y,fw-2,bh,{stroke:hf?'var(--ink)':'var(--line)',sw:hf?2:1,fill:fk||!nums?'var(--soft)':'var(--bg)',dash:nums&&!fk});
      s+=T(fx+8,y+16,r.f+'  ('+r.sh+')',{fs:12,w:600,fill:'var(--ink)'});
      if(r.kept&&(!nums||fk))s+=T(fx+fw-8,y+16,r.kept,{a:'end',fs:11,fill:'var(--c2)',w:600});
      const fl=nums?(fk?(k===4?f3(N.loss):vec(FV[k])):''):r.fd;
      if(fl)s+=T(fx+8,y+32,fl,{fs:11,fill:nums?'var(--ink)':'var(--mute)'});
      s+=box(bx,y,bw,bh,{stroke:hb?'var(--acc)':'var(--line)',sw:hb?2:1,dash:nums&&!bk,fill:bk||!nums?'var(--soft)':'var(--bg)'});
      s+=T(bx+8,y+16,r.b+'  ('+r.sh+')',{fs:12,w:600,fill:'var(--acc)'});
      const bl=nums?(bk?(k===4?'1':vec(BV[k])):''):r.bd;
      if(bl)s+=T(bx+8,y+32,bl,{fs:11,fill:nums?'var(--ink)':'var(--mute)'});
      if(k<4){const yy=y+bh+2,yb=y+pitch-2;
        s+=arrow(fx+16,yy,fx+16,yb,'var(--mute)')+T(fx+24,yy+17,r.fop,{fs:11,fill:'var(--mute)'});
        s+=arrow(bx+16,yb,bx+16,yy,'var(--acc)')+T(bx+24,yy+17,ROWS[k].bop,{fs:11,fill:'var(--acc)'});}
    });
    // weight gradients: beside rows 1 and 3 when wide, as two extra blocks when narrow; one matrix row per line
    const WG=[{n:'W̄1 = ā xᵀ',sh:'3 × 2',row:1,v:N.gW1,key:'w1'},{n:'W̄2 = z̄ hᵀ',sh:'3 × 3',row:3,v:N.gW2,key:'w2'}];
    let H=top+4*pitch+bh+8;const gh=26+3*13;
    WG.forEach((g,i)=>{const known=st[g.key],hl=st.hl===g.key;
      const x=narrow?0:wx,y=narrow?H+i*(gh+10):top+g.row*pitch-8,bwid=narrow?w-1:ww;
      s+=box(x,y,bwid,gh,{stroke:hl?'var(--acc)':'var(--line)',sw:hl?2:1,dash:nums&&!known,fill:known||!nums?'var(--soft)':'var(--bg)'});
      s+=T(x+8,y+16,g.n+'  ('+g.sh+')',{fs:12,w:600,fill:'var(--acc)'});
      if(nums&&known)g.v.forEach((r,k)=>{s+=T(x+8,y+31+k*13,vec(r),{fs:11,fill:'var(--ink)'})});
      else if(!nums)s+=T(x+8,y+31,'the shape of the weight:',{fs:11,fill:'var(--mute)'})+T(x+8,y+44,'(gradient in) times (input in)',{fs:11,fill:'var(--mute)'});
      if(!narrow)s+='<line x1="'+(bx+bw)+'" y1="'+(y+gh/2)+'" x2="'+x+'" y2="'+(y+gh/2)+'" stroke="var(--acc)" stroke-dasharray="3 3"/>';
    });
    if(narrow)H+=2*(gh+10);
    el.innerHTML=RD.svg(w,H,s,'The two-layer network forward and backward');
  }
  const hero=document.getElementById('mc-hero');
  const drawHero=()=>{if(hero)drawNet(hero,{fw:new Set([0,1,2,3,4]),bw:new Set([0,1,2,3,4]),w1:1,w2:1,hl:null,nums:false})};

  // section 5 stepper
  const sv=document.getElementById('mc-two-svg');
  const F=[
    [[],[],0,0,null,'The network, before anything runs','x = (2, 1) is the tiny model’s context. W1 (3 × 2) has rows (0.5, 0), (0, 1), (1, −3) and W2 (3 × 3) rows (2, 0, 1), (0, 1, 0), (−1, 1, 0): the root page’s Gradient lab network, chosen so the scores come out (2, 1, 0) again. The right next word is sat. Predict before stepping: hidden unit 3 will come out negative. What will its row of W̄1 be?',0,0],
    [[0,1],[],0,0,'f1','Layer 1: a = W1 x','a = (0.5 × 2 + 0 × 1, 0 × 2 + 1 × 1, 1 × 2 − 3 × 1) = '+vec(N.a)+'. Six multiply-adds.',6,0],
    [[0,1,2],[],0,0,'f2','ReLU: h = max(0, a)','h = '+vec(N.h)+': unit 3 is off. The forward pass keeps x, the sign of a, and h, because the backward rules need them.',0,0],
    [[0,1,2,3],[],0,0,'f3','Layer 2: z = W2 h','z = '+vec(N.z)+': the running example’s scores, cat 2, dog 1, sat 0. Nine multiply-adds.',9,0],
    [[0,1,2,3,4],[],0,0,'f4','Loss','p = softmax(z) = '+vec(N.p)+', so L = −ln '+f3(N.p[2])+' = '+f3(N.loss)+'. The forward pass is done; p is kept.',0,0],
    [[0,1,2,3,4],[3,4],0,0,'b3','Start at the loss: z̄ = p − y','L̄ = 1. Softmax and cross-entropy together give z̄ = p − y = '+vec(N.gz)+' (section 6d).',0,0],
    [[0,1,2,3,4],[3,4],0,1,'w2','W2’s gradient: an outer product','W̄2 = z̄ hᵀ, shape 3 × 3 like W2. Its third column is 0 because h3 = 0: a weight that reads a silent unit gets no gradient.',0,9],
    [[0,1,2,3,4],[2,3,4],0,1,'b2','Back through W2: h̄ = W2ᵀ z̄','Each hidden unit collects the score gradients through its column of W2: h̄ = (2 × '+f3(N.gz[0])+' − 1 × ('+f3(N.gz[2])+'), '+f3(N.gz[1])+' + ('+f3(N.gz[2])+'), '+f3(N.gz[0])+') = '+vec(N.gh)+'.',0,9],
    [[0,1,2,3,4],[1,2,3,4],0,1,'b1','Back through the ReLU: ā = h̄ ⊙ [a > 0]','ā = '+vec(N.ga)+'. The ReLU’s slope is 0 where it was off, so unit 3’s '+f3(N.gh[2])+' is blocked.',0,0],
    [[0,1,2,3,4],[1,2,3,4],1,1,'w1','W1’s gradient: W̄1 = ā xᵀ','Rows '+N.gW1.map(vec).join(', ')+'. Unit 3’s row is all zero: the answer to the prediction. A unit that is off for every example never learns (a dead ReLU).',0,6],
    [[0,1,2,3,4],[0,1,2,3,4],1,1,'b0','And the input’s gradient: x̄ = W1ᵀ ā','x̄ = '+vec(N.gx)+': what the embedding below would receive. The backward pass is done.',0,6],
    [[0,1,2,3,4],[0,1,2,3,4],1,1,null,'One gradient step','W ← W − 0.1 W̄ on both layers (the input held fixed): p_sat rises from '+f3(N.p[2])+' to '+f3(N.p_new[2])+' and the loss falls from '+f3(N.loss)+' to '+f3(N.loss_new)+'.',0,0]];
  function drawTwo(i){const f=F[i];
    drawNet(sv,{fw:new Set(f[0]),bw:new Set(f[1]),w1:f[2],w2:f[3],hl:f[4],nums:true});
    document.getElementById('mc-two-cap').innerHTML='<div class="t">Step '+(i+1)+' of '+F.length+': '+esc(f[5])+'</div><p>'+esc(f[6])+'</p>';
    let fm=0,bm=0;for(let j=0;j<=i;j++){fm+=F[j][7];bm+=F[j][8]}
    const nw=(f[2]?6:0)+(f[3]?9:0);
    document.getElementById('mc-two-cnt').innerHTML=RD.stat('Matrix-product multiply-adds, forward',String(fm),'15 in all')+RD.stat('Backward',String(bm),'30 in all: twice forward')+RD.stat('Weight slopes found',nw+' of 15','from one backward pass');
  }
  let A2=null;if(sv)A2=RD.anim({card:'mc-two-card',ctl:'mc-two-ctl',n:F.length,draw:drawTwo,ms:2200,label:'Step'});

  // ---------- section 1: the Jacobian of z = Wx with respect to x and to W ----------
  function drawJac(){const el=document.getElementById('mc-jfig');if(!el)return;
    const w=RD.width(el),narrow=w<560,c=narrow?Math.min(30,Math.floor((w-40)/8.4)):30,words=['cat','dog','sat'],W=[[1,0],[0,1],[1,-2]],x=[2,1];
    let s='',x0=34,y0=34;
    s+=T(0,14,'∂z/∂x = W: the Jacobian, 3 × 2',{fs:12,w:600,fill:'var(--ink)'});
    for(let i=0;i<3;i++){s+=T(x0-4,y0+i*c+c/2+4,words[i],{a:'end',fs:11,fill:'var(--mute)'});
      for(let j=0;j<2;j++){s+=box(x0+j*c,y0+i*c,c-2,c-2,{fill:'var(--soft)'})+T(x0+j*c+c/2-1,y0+i*c+c/2+4,f3(W[i][j]).replace('.000',''),{a:'middle',fs:11,fill:'var(--ink)'})}}
    let sx=narrow?0:x0+2*c+150,sy=narrow?y0+3*c+34:y0;
    s+=T(sx,sy-20,'∂z/∂W: a 3 × 2 slice per score, 12 of 18 are 0',{fs:12,w:600,fill:'var(--ink)'});
    const sw=2*c+14;
    for(let k=0;k<3;k++){const gx=sx+k*sw+(narrow?0:0);
      s+=T(gx,sy-5,'∂z_'+words[k]+'/∂W',{fs:11,fill:'var(--mute)'});
      for(let i=0;i<3;i++)for(let j=0;j<2;j++){const on=i===k;
        s+=box(gx+j*c,sy+i*c,c-2,c-2,{fill:on?'var(--acc2)':'var(--bg)',stroke:on?'var(--acc)':'var(--line)'})+T(gx+j*c+c/2-1,sy+i*c+c/2+4,on?String(x[j]):'0',{a:'middle',fs:11,fill:on?'var(--ink)':'var(--mute)',w:on?600:400})}}
    const H=sy+3*c+6;
    el.innerHTML=RD.svg(w,H,s,'Jacobian of z = Wx')}

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

  const all=()=>{drawHero();drawJac();drawLay();drawAtt();drawVan();drawFd();if(A2)A2.redraw()};
  RD.onRender(all);RD.onResize(all);all();
})();
// charts inside closed details have no width until opened: redraw everything when one opens
document.addEventListener('toggle',e=>{if(e.target.open)dispatchEvent(new Event('resize'))},true);
