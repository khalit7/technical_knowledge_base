// ---- Reading tab, visuals added 2026-10-24: hero (bits and range of every format), cancellation digits,
// reduction trees (1, 2, 4 threads), naive against stable toolbox curves, NaN spread stepper ----
(function(){
  const $=id=>document.getElementById(id),S=FP.show,T=RD.t;
  const SUP={'-':'\u207b','0':'\u2070','1':'\u00b9','2':'\u00b2','3':'\u00b3','4':'\u2074','5':'\u2075','6':'\u2076','7':'\u2077','8':'\u2078','9':'\u2079'};
  const sup=(b,e)=>b+String(e).split('').map(c=>SUP[c]||c).join('');
  // ---------- 1. hero ----------
  const HF=['fp32','tf32','bf16','fp16','e5m2','e4m3'];
  const MEDG=3.2e-5; // SmolLM2-135M median |gradient|, float32 reference step (measured, section 9)
  function hero(){
    const el=$('rd-hero');if(!el)return;
    const W=Math.min(860,RD.width(el)),narrow=W<560,LC=narrow?66:78,rowH=28;
    let b='',y=14;
    b+=T(0,y,'Bits, one box per bit',{fs:11.5,w:600});y+=8;
    const cw=Math.min(16,(W-LC-4)/32);
    HF.forEach(k=>{const f=FP.F[k],y0=y+4;
      b+=T(0,y0+11,f.name.replace('FP8 ',''),{fs:11,w:600})+T(0,y0+24,'1 · '+f.e+' · '+f.m,{fs:11,fill:'var(--mute)'});
      for(let i=0;i<f.bits;i++){const col=i===0?'var(--c2)':(i<=f.e?'var(--c1)':'var(--c3)');
        b+='<rect x="'+(LC+i*cw).toFixed(1)+'" y="'+(y0+3)+'" width="'+Math.max(1,cw-1.2).toFixed(1)+'" height="14" rx="1.5" fill="'+col+'" opacity="'+(i===0?0.85:0.75)+'"/>'}
      if(!narrow||f.bits<=16)b+=T((LC+f.bits*cw+6).toFixed(1),y0+14,f.bits+' bits',{fs:11,fill:'var(--mute)'});
      y+=rowH});
    y+=16;b+=T(0,y,'Magnitudes it can hold (log scale), and ε',{fs:11.5,w:600});y+=6;
    const x0=-46,x1=40,X=v=>LC+(W-LC-8)*(v-x0)/(x1-x0),top=y;
    HF.forEach(k=>{const f=FP.F[k],y0=y+4,ls=Math.log10(f.minSub),ln=Math.log10(f.minNormal),lm=Math.log10(f.max);
      b+=T(0,y0+11,f.name.replace('FP8 ',''),{fs:11,w:600})+T(0,y0+24,'ε '+S(f.eps,2),{fs:11,fill:'var(--mute)'});
      if(k!=='tf32')b+='<rect x="'+X(ls).toFixed(1)+'" y="'+(y0+4)+'" width="'+Math.max(1,X(ln)-X(ls)).toFixed(1)+'" height="12" fill="var(--c1)" opacity=".38"/>';
      b+='<rect x="'+X(ln).toFixed(1)+'" y="'+(y0+4)+'" width="'+Math.max(2,X(lm)-X(ln)).toFixed(1)+'" height="12" fill="var(--c1)" opacity=".8"/>';
      const lab=f.max<1e6?f.max.toLocaleString('en'):S(f.max,3),lx=X(lm)+4,room=W-lx;
      if(room>44)b+=T(lx.toFixed(1),y0+14,lab,{fs:11,fill:'var(--ink)'});else b+=T((X(lm)-4).toFixed(1),y0+27,lab,{a:'end',fs:11,fill:'var(--ink)'});
      y+=rowH});
    const bot=y+2;
    const mx=X(Math.log10(MEDG));
    b+='<line x1="'+mx.toFixed(1)+'" y1="'+(top+2)+'" x2="'+mx.toFixed(1)+'" y2="'+bot+'" stroke="var(--c2)" stroke-dasharray="4 3" stroke-width="1.5"/>';
    b+=T(mx.toFixed(1),bot+13,'median SmolLM2 gradient 3.2e-5',{fs:11,fill:'var(--c2)',a:'middle'});
    const one=X(0);b+='<line x1="'+one.toFixed(1)+'" y1="'+(top+2)+'" x2="'+one.toFixed(1)+'" y2="'+bot+'" stroke="var(--mute)" stroke-width=".8"/>';
    y=bot+28;const step=narrow?20:10;
    b+='<line x1="'+LC+'" y1="'+(y-12)+'" x2="'+(W-8)+'" y2="'+(y-12)+'" stroke="var(--mute)"/>';
    for(let v=-40;v<=x1-6;v+=step)b+=T(X(v).toFixed(1),y+2,v===0?'1':sup('10',v),{a:'middle',fs:11});
    el.innerHTML=RD.svg(W,y+8,b,'Bit layouts and representable ranges of six floating-point formats');
  }
  // ---------- 2. cancellation digits ----------
  function canc(){
    const el=$('rd-cancFig');if(!el)return;
    const W=Math.min(860,RD.width(el)),narrow=W<520;
    const rows=[
      ['1.0001 stored','1.000100016593933','g8'],
      ['minus 1','1.000000000000000','x'],
      ['result','0.000100016593933','r'],
      ['true answer','0.000100000000000','t']];
    const n=17,LC=narrow?82:110,cw=Math.min(20,(W-LC-4)/n),rh=24;let b='',y=6;
    rows.forEach((r,ri)=>{b+=T(0,y+15,r[0],{fs:11,w:ri===2?600:400});
      [...r[1]].forEach((ch,i)=>{let col='var(--soft)',ink='var(--ink)';
        if(r[2]==='g8'){if(i>=1&&i<=8&&ch!=='.')col='color-mix(in srgb,var(--good) 30%,var(--bg))';if(i>=9)col='color-mix(in srgb,var(--bad) 30%,var(--bg))';if(i===0)col='color-mix(in srgb,var(--good) 30%,var(--bg))'}
        if(r[2]==='r'){if(i<5)ink='var(--mute)';else if(i<=8)col='color-mix(in srgb,var(--good) 30%,var(--bg))';else col='color-mix(in srgb,var(--bad) 30%,var(--bg))'}
        if(r[2]==='t'&&i<5)ink='var(--mute)';
        const x=LC+i*cw;b+='<rect x="'+x.toFixed(1)+'" y="'+(y+2)+'" width="'+(cw-1.5).toFixed(1)+'" height="19" rx="2" fill="'+col+'"/>';
        b+='<text x="'+(x+(cw-1.5)/2).toFixed(1)+'" y="'+(y+16)+'" text-anchor="middle" font-size="'+(cw<14?11:12.5)+'" font-family="ui-monospace,Menlo,monospace" fill="'+ink+'">'+ch+'</text>'});
      y+=rh});
    b+=T(LC,y+14,narrow?'8 correct digits become 4':'8 correct significant digits become 4; the noise is carried unchanged',{fs:11,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,y+22,b,'Digits of 1.0001 in float32 minus 1');
  }
  // ---------- 3. reduction trees ----------
  const XS=[1e-10,1e-5,0.01,-1e-10,1,-1e-5,-1,-0.01],LAB=['1e-10','1e-5','0.01','−1e-10','1','−1e-5','−1','−0.01'];
  const lost=(a,b)=>{const s=a+b,bb=s-a,e=(a-(s-bb))+(b-bb);return e!==0};
  // a tree: list of nodes {l, r, v, lost, depth}; leaves are indices 0..7
  function build(mode){const N=XS.map((v,i)=>({leaf:true,v,i,depth:0,x:i}));const nodes=[];
    const join=(a,c)=>{const n={l:a,r:c,v:a.v+c.v,lost:lost(a.v,c.v),depth:Math.max(a.depth,c.depth)+1,x:(a.x+c.x)/2};nodes.push(n);return n};
    if(mode==='1'){let s=join(N[0],N[1]);for(let i=2;i<8;i++){s=join(s,N[i]);s.x=i}}
    else if(mode==='2'){const ch=k=>{let s=join(N[k],N[k+1]);for(let i=k+2;i<k+4;i++)s=join(s,N[i]);return s};join(ch(0),ch(4))}
    else{const p=[0,2,4,6].map(k=>join(N[k],N[k+1]));join(join(p[0],p[1]),join(p[2],p[3]))}
    return {N,nodes,root:nodes[nodes.length-1]}}
  let tm='1';
  function tree(){
    const el=$('rd-tree');if(!el)return;
    const W=Math.min(860,RD.width(el)),t=build(tm),md=t.root.depth,L=10,R=W-10,cw=(R-L)/8,stag=cw<48,top=stag?40:30,H=Math.max(190,top+md*30+50),dy=(H-top-46)/md;
    const X=x=>L+cw*(x+0.5),Y=d=>top+d*dy;let b='';
    t.N.forEach((n,i)=>{b+=T(X(i).toFixed(1),stag&&i%2?30:14,LAB[i],{a:'middle',fs:11});b+='<circle cx="'+X(i).toFixed(1)+'" cy="'+top+'" r="3" fill="var(--mute)"/>'});
    t.nodes.forEach((n,k)=>{const x=X(n.x),y=Y(n.depth);
      [n.l,n.r].forEach(c=>{b+='<line x1="'+X(c.x).toFixed(1)+'" y1="'+Y(c.depth).toFixed(1)+'" x2="'+x.toFixed(1)+'" y2="'+y.toFixed(1)+'" stroke="var(--line)" stroke-width="1.5"/>'})});
    t.nodes.forEach((n,k)=>{const x=X(n.x),y=Y(n.depth);
      b+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="9" fill="'+(n.lost?'var(--bad)':'var(--c1)')+'"/>'+T(x.toFixed(1),(y+4).toFixed(1),String(k+1),{a:'middle',fs:11,fill:'var(--bg)',w:600})});
    b+=T((W/2).toFixed(1),(Y(md)+28).toFixed(1),'result '+S(t.root.v,3)+' (exact 0)',{a:'middle',fs:12,w:600,fill:'var(--ink)'});
    el.innerHTML=RD.svg(W,H,b,'Reduction tree for '+tm+' threads');
    const fm=v=>(v!==0&&Math.abs(v)<1e-3?v.toExponential():String(v)).replace('-','\u2212');
    $('rd-treeCap').innerHTML=t.nodes.map((n,k)=>'<b>'+(k+1)+'</b>: '+fm(n.l.v)+' + '+(n.r.v<0?'('+fm(n.r.v)+')':fm(n.r.v))+' = '+(n.lost?'<span class="bad">'+fm(n.v)+'</span>':fm(n.v))).join('; ')+'.';
  }
  window.NC_TREE=m=>build(m).root.v;
  RD.seg($('rd-treeMode'),m=>{tm=m;tree()});
  // ---------- 4. toolbox: naive against stable ----------
  let tfn='bce',tf='fp32';
  const L1P=(v,f)=>FP.rnd(Math.log1p(v),f);
  function evalFn(fn,x,f){
    if(fn==='bce'){ // label 0: -ln(1 - sigma(x))
      const e=FP.exp(-x,f),d=FP.add(1,e,f),s=FP.div(1,d,f),om=FP.sub(1,s,f),naive=-FP.log(om,f);
      const stable=FP.add(Math.max(x,0),L1P(FP.exp(-Math.abs(x),f),f),f);return [naive,stable]}
    if(fn==='ls'){const e=FP.exp(-x,f),d=FP.add(1,e,f),s=FP.div(1,d,f),naive=FP.log(s,f);
      const stable=FP.sub(Math.min(x,0),L1P(FP.exp(-Math.abs(x),f),f),f);return [naive,stable]}
    const e=FP.exp(x,f),d=FP.add(1,e,f),naive=FP.log(d,f);const stable=FP.add(Math.max(x,0),L1P(FP.exp(-Math.abs(x),f),f),f);return [naive,stable]}
  function firstBad(fn,f,lo,hi){ // first x (scanning away from 0) where the naive form is not finite
    const dir=fn==='ls'?-1:1;for(let x=0;Math.abs(x)<=Math.max(Math.abs(lo),hi);x+=dir*0.01){const v=evalFn(fn,+x.toFixed(2),f)[0];if(!isFinite(v))return +x.toFixed(2)}return null}
  function tool(){
    const el=$('rd-toolFig');if(!el)return;
    const f=FP.F[tf],xr=tf==='fp16'?20:100,W=Math.min(860,RD.width(el)),H=230,L=44,R=W-12,Tp=12,B=H-32;
    const n=Math.max(200,Math.round(W)),pts=[];for(let i=0;i<=n;i++){const x=-xr+2*xr*i/n;pts.push([x,...evalFn(tfn,x,f)])}
    const ys=pts.map(p=>p[2]).filter(isFinite);let y0=Math.min(...ys),y1=Math.max(...ys);if(y1-y0<1){y1+=0.5;y0-=0.5}
    const X=x=>L+(R-L)*(x+xr)/(2*xr),Y=v=>B-(B-Tp)*(v-y0)/(y1-y0);
    let b='<line x1="'+L+'" y1="'+B+'" x2="'+R+'" y2="'+B+'" stroke="var(--mute)"/><line x1="'+L+'" y1="'+Tp+'" x2="'+L+'" y2="'+B+'" stroke="var(--mute)"/>';
    const xt=tf==='fp16'?[-20,-10,0,10,20]:[-100,-50,0,50,100];xt.forEach(v=>{b+=T(X(v).toFixed(1),B+14,String(v).replace('-','−'),{a:'middle',fs:11})});
    const yst=(y1-y0)>150?50:((y1-y0)>40?20:((y1-y0)>12?5:1));for(let v=Math.ceil(y0/yst)*yst;v<=y1;v+=yst)b+='<line x1="'+L+'" y1="'+Y(v).toFixed(1)+'" x2="'+R+'" y2="'+Y(v).toFixed(1)+'" stroke="var(--line)"/>'+T(L-4,(Y(v)+4).toFixed(1),String(v).replace('-','−'),{a:'end',fs:11});
    b+=T((L+R)/2,H-3,'logit x',{a:'middle',fs:11,fill:'var(--mute)'});
    const path=(k,col,w,dash)=>{let d='',pen=false;pts.forEach(p=>{const v=p[k];if(!isFinite(v)){pen=false;return}const yy=Math.max(Tp,Math.min(B,Y(v)));d+=(pen?' L':' M')+X(p[0]).toFixed(1)+','+yy.toFixed(1);pen=true});b+='<path d="'+d+'" fill="none" stroke="'+col+'" stroke-width="'+w+'"'+(dash?' stroke-dasharray="5 4"':'')+'/>'};
    path(2,'var(--c3)',4);path(1,'var(--bad)',1.8,true);
    const fb=firstBad(tfn,f,-xr,xr);
    if(fb!==null&&Math.abs(fb)<=xr){const xx=X(fb);b+='<line x1="'+xx.toFixed(1)+'" y1="'+Tp+'" x2="'+xx.toFixed(1)+'" y2="'+B+'" stroke="var(--bad)" stroke-width="1.2"/>'+T((xx+(fb<0?4:-4)).toFixed(1),Tp+12,'naive: '+(tfn==='ls'?'−inf':'inf'),{a:fb<0?'start':'end',fs:11,fill:'var(--bad)',w:600})}
    b+=T(R,B-8,'green: stable; dashed: naive',{a:'end',fs:11,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,b,'Naive against stable form across logits');
    const NM={bce:'BCE with label 0',ls:'ln σ(x)',sp:'softplus'};
    $('rd-toolOut').innerHTML=RD.stat('Naive '+NM[tfn]+' in '+f.name,fb===null?'finite on this range':'not finite from x = '+String(fb).replace('-','−'),fb===null?'':'scanned in steps of 0.01')+RD.stat('Stable form','finite everywhere',(tfn==='ls'?'min(x, 0) − ':'max(x, 0) + ')+'log1p(e<sup>−|x|</sup>)');
  }
  window.NC_TOOL={first:(fn,f)=>firstBad(fn,FP.F[f],-100,100),eval:(fn,x,f)=>evalFn(fn,x,FP.F[f])};
  RD.seg($('rd-toolFn'),m=>{tfn=m;tool()});RD.seg($('rd-toolFmt'),m=>{tf=m;tool()});
  // ---------- 5. NaN spread stepper ----------
  const X0=[[0.5,-1.2,0.3,0.8],[1.1,0.4,NaN,-0.6],[-0.3,0.9,0.2,1.4]];
  const W0=[[0.2,-0.1,0.4],[0.3,0.5,-0.2],[-0.4,0.1,0.6],[0.1,-0.3,0.2]];
  const mm=(A,B)=>A.map(r=>B[0].map((_,j)=>r.reduce((s,v,k)=>s+v*B[k][j],0)));
  const tr=A=>A[0].map((_,j)=>A.map(r=>r[j]));
  const Y0=mm(X0,W0),Lval=Y0.flat().reduce((s,v)=>s+v,0)/9,dY=Y0.map(r=>r.map(()=>1/9)),dW=mm(tr(X0),dY),W1=W0.map((r,i)=>r.map((v,j)=>v-0.1*dW[i][j])),Y1=mm(X0,W1);
  const NS=[
    {t:'Forward: one NaN in the input',m:[['X',X0],['W',W0],['Y = XW',Y0]],p:'Token 2, feature 3 is NaN (say an overflowed activation upstream). Each output in row 2 of Y is a sum that includes NaN × w, so the whole row is NaN; rows 1 and 3 are fine.'},
    {t:'The loss is NaN',m:[['X',X0],['W',W0],['Y = XW',Y0]],loss:Lval,p:'The mean loss adds every entry of Y, including row 2, so the loss is NaN. A check written as loss > 10 is false for NaN and never fires.'},
    {t:'Backward: one row of weight gradients',m:[['X',X0],['∂L/∂W',dW],['∂L/∂Y',dY]],loss:Lval,p:'∂L/∂Y of a mean is 1/9 everywhere, finite. But ∂L/∂W = Xᵀ ∂L/∂Y: row 3 of it sums column 3 of X, which holds the NaN, so that whole row of the gradient is NaN.'},
    {t:'Update, then the next forward pass: everything',m:[['X',X0],['new W',W1],['next Y',Y1]],loss:NaN,p:'The optimiser writes NaN into row 3 of W. Every output of the next forward pass uses that row (feature 3 times row 3), so every entry is NaN, for every token, and the run is over.'}];
  function nanDraw(i){
    const el=$('rd-nanFig');if(!el)return;const s=NS[i];
    const W=Math.min(860,RD.width(el)),cw=Math.max(12,Math.min(26,(W-36)/11.6)),gap=10;let b='',x=0;
    s.m.forEach(([nm,M])=>{const r=M.length,c=M[0].length;b+=T(x,12,nm,{fs:11,w:600});
      M.forEach((row,ri)=>row.forEach((v,ci)=>{const bad=Number.isNaN(v);b+='<rect x="'+(x+ci*cw).toFixed(1)+'" y="'+(20+ri*cw).toFixed(1)+'" width="'+(cw-2).toFixed(1)+'" height="'+(cw-2).toFixed(1)+'" rx="2" fill="'+(bad?'var(--bad)':'var(--soft)')+'" stroke="var(--line)"/>';
        if(bad&&cw>=20)b+=T((x+ci*cw+(cw-2)/2).toFixed(1),(20+ri*cw+cw/2+3).toFixed(1),'NaN',{a:'middle',fs:11,fill:'var(--bg)'})}));
      x+=c*cw+gap});
    const lx=x,ok=s.loss===undefined;b+=T(lx,12,'loss',{fs:11,w:600});
    b+='<rect x="'+lx.toFixed(1)+'" y="20" width="'+(cw*1.6).toFixed(1)+'" height="'+(cw-2).toFixed(1)+'" rx="2" fill="'+(ok?'var(--soft)':'var(--bad)')+'" stroke="var(--line)"/>';
    const wTot=lx+cw*1.6+2;
    el.innerHTML=RD.svg(Math.min(W,Math.ceil(wTot)),20+4*cw+6,b,'NaN spreading through a linear layer, step '+(i+1));
    $('rd-nanCap').innerHTML='<div class="t">Step '+(i+1)+' of 4: '+s.t+'</div><p>'+s.p+'</p>';
  }
  window.NC_NAN={steps:()=>NS.map(s=>s.m.map(([n,M])=>M.flat().filter(Number.isNaN).length))};
  function all(){hero();canc();tree();tool()}
  all();RD.onRender(all);RD.onResize(()=>{all();NA.redraw()});
  const NA=RD.anim({card:'rd-nanCard',ctl:'rd-nanCtl',n:NS.length,draw:nanDraw,ms:2200,label:'NaN step'});
})();
