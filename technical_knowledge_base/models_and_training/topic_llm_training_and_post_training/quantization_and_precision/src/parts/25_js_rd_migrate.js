// ---- Reading, outliers: SmoothQuant and AWQ on a real slice (animated, each against the plain method it improves) ----
(function(){
  const $=id=>document.getElementById(id);
  if(!$('rd-mg'))return;
  const D=window.QD,QF=window.QF,S=D.slice,L=D.lab;
  const T=16,C=64,O=8;
  const xf=QF.f32(S.x_f32),wf=QF.bf16(S.w_bf16);
  const X=[],W=[];for(let t=0;t<T;t++)X.push(xf.slice(t*C,(t+1)*C));for(let o=0;o<O;o++)W.push(wf.slice(o*C,(o+1)*C));
  const isTop=S.chans.map(c=>S.top.indexOf(c)>=0);
  const M=[{k:'w8',n:'W8A8, plain',pair:'sq',sm:false},{k:'sq',n:'SmoothQuant',pair:'sq',sm:true},{k:'w4',n:'INT4 weights, plain',pair:'awq',sm:false},{k:'awq',n:'AWQ',pair:'awq',sm:true}];
  let mi=0,alpha=0.5;
  $('rd-mgM').innerHTML=M.map((m,i)=>'<button data-i="'+i+'">'+m.n+'</button>').join('');
  const mm=(A)=>{let m=0;for(const r of A)for(const x of r)m=Math.max(m,Math.abs(x));return m};
  const matmul=(Xa,Wa)=>Xa.map(x=>Wa.map(w=>{let s=0;for(let c=0;c<C;c++)s+=x[c]*w[c];return s}));
  const Y=matmul(X,W);
  const rel=(A,B)=>{let n=0,d=0;for(let i=0;i<A.length;i++)for(let j=0;j<A[i].length;j++){n+=(A[i][j]-B[i][j])**2;d+=B[i][j]**2}return Math.sqrt(n/d)};
  function scales(m){
    if(!m.sm)return new Array(C).fill(1);
    if(m.pair==='sq')return S.xc_max.map((x,c)=>Math.pow(x,alpha)/Math.pow(S.w_colmax[c],1-alpha));
    let s=S.xc_mean.map(x=>Math.pow(x,alpha));const mx=Math.max(...s),mn=Math.min(...s),k=Math.sqrt(mx*mn);return s.map(x=>x/k)}
  function run(m){
    const s=scales(m);
    const Xs=X.map(r=>r.map((x,c)=>x/s[c])),Ws=W.map(r=>r.map((w,c)=>w*s[c]));
    let Xq=Xs,Wq,dx=0;
    if(m.pair==='sq'){ // static per-tensor INT8 activations (scale from calibration max), per-channel INT8 weights
      const amax=Math.max(...S.xc_max.map((x,c)=>x/s[c]));dx=amax/127;
      Xq=Xs.map(r=>r.map(x=>Math.max(-127,Math.min(127,QF.rne(x/dx)))*dx));
      Wq=Ws.map(r=>QF.qint(r,8,true));
    }else{ // weight-only INT4, asymmetric, one group per row of this slice; the 1/s is folded back
      Wq=Ws.map(r=>QF.qint(r,4,false));
    }
    const Wd=Wq.map(r=>r.map((w,c)=>w/s[c])),Xd=Xq.map(r=>r.map((x,c)=>x*s[c]));
    const err=rel(matmul(Xd,Wd),Y);
    let coarse=0,n=0;if(m.pair==='sq'){for(const r of Xs)for(const x of r){n++;if(Math.abs(x)<4*dx)coarse++}}
    // weight error on the top-activation channels vs the rest
    let eTop=0,dTop=0,eRest=0,dRest=0;for(let o=0;o<O;o++)for(let c=0;c<C;c++){const e=(Wd[o][c]-W[o][c])**2*(S.xc_mean[c]**2),d=(W[o][c]**2)*(S.xc_mean[c]**2);if(isTop[c]){eTop+=e;dTop+=d}else{eRest+=e;dRest+=d}}
    return {s,Xs,Ws,Xq,Wq,err,dx,coarse:n?coarse/n:0,eTop:Math.sqrt(eTop/dTop),eRest:Math.sqrt(eRest/dRest),xmax:mm(Xs),wmax:mm(Ws)};
  }
  function whole(m){
    if(m.pair==='sq'){if(!m.sm)return L.w8a8.int8_tensor_static;const c=L.w8a8.smoothquant_curve;let b=c[0];for(const r of c)if(Math.abs(r[0]-alpha)<Math.abs(b[0]-alpha))b=r;return b[1]}
    if(!m.sm)return L.schemes.int4_g128.out_relerr;const c=L.stats.awq_curve;let b=c[0];for(const r of c)if(Math.abs(r[0]-alpha)<Math.abs(b[0]-alpha))b=r;return b[2]}
  function heat(R,x0,y0,cw,ch,mx,col,hl){let s='';for(let i=0;i<R.length;i++)for(let j=0;j<R[i].length;j++){const v=Math.abs(R[i][j])/mx;
      s+='<rect x="'+(x0+j*cw).toFixed(1)+'" y="'+(y0+i*ch).toFixed(1)+'" width="'+(cw+0.3).toFixed(1)+'" height="'+(ch+0.3).toFixed(1)+'" fill="'+(hl&&hl(i,j)?'var(--bad)':col)+'" fill-opacity="'+Math.max(0.04,Math.sqrt(v)).toFixed(3)+'"/>'}return s}
  function svg(st,m,r){
    const Wd=RD.width($('rd-mgP')),pl=52,pr=6,cw=(Wd-pl-pr)/C,ch=Math.max(5,Math.min(9,cw*1.1));
    let y=4,s='';
    const xm=st>=1?r.xmax:mm(X),wm=st>=1?r.wmax:mm(W);
    const XA=st>=1?r.Xs:X,WA=st>=1?r.Ws:W;
    s+='<text x="0" y="'+(y+9)+'" font-size="10.5" fill="var(--mute)">X: 16 tokens</text>';y+=14;
    const coarseHl=(m.pair==='sq'&&st>=2)?((i,j)=>Math.abs(XA[i][j])<4*r.dx):null;
    s+=heat(XA,pl,y,cw,ch,xm,'var(--c1)',coarseHl);
    s+='<text x="'+(pl-4)+'" y="'+(y+ch*8)+'" font-size="10" text-anchor="end" fill="var(--mute)">max '+xm.toFixed(1)+'</text>';y+=T*ch+8;
    // channel strip: the top-activation channels and the smoothing factor
    for(let c=0;c<C;c++){if(isTop[c])s+='<rect x="'+(pl+c*cw)+'" y="'+y+'" width="'+cw+'" height="4" fill="var(--c2)"/>'}
    s+='<text x="'+(pl-4)+'" y="'+(y+5)+'" font-size="10" text-anchor="end" fill="var(--c2)">top 8</text>';y+=8;
    if(m.sm&&st>=1){const sm=Math.max(...r.s);const hh=22;for(let c=0;c<C;c++){const h=hh*Math.log1p(r.s[c])/Math.log1p(sm);s+='<rect x="'+(pl+c*cw+cw*0.15)+'" y="'+(y+hh-h)+'" width="'+(cw*0.7)+'" height="'+Math.max(0.5,h)+'" fill="var(--c4)"/>'}
      s+='<text x="'+(pl-4)+'" y="'+(y+hh-4)+'" font-size="10" text-anchor="end" fill="var(--c4)">s</text>';y+=hh+6}
    s+='<text x="0" y="'+(y+9)+'" font-size="10.5" fill="var(--mute)">W: 8 outputs</text>';y+=14;
    s+=heat(WA,pl,y,cw,ch,wm,'var(--c3)',null);
    s+='<text x="'+(pl-4)+'" y="'+(y+ch*4)+'" font-size="10" text-anchor="end" fill="var(--mute)">max '+wm.toFixed(2)+'</text>';y+=O*ch+6;
    return '<svg viewBox="0 0 '+Wd+' '+y+'" width="'+Wd+'" height="'+y+'" role="img" aria-label="Activation and weight heat maps">'+s+'</svg>'}
  const CAP={
    sq:[
      ['The problem','A few input channels (orange marks) carry activations 10 to 15 times the typical size, on every token: they are properties of the channel, not of the token. Weights (green) are tame. Colour strength is the square root of magnitude.'],
      ['Smooth: divide each activation channel by s, multiply the matching weight column by s','s = max|X|^α / max|W|^(1−α), from calibration. The product X·W is unchanged exactly; the outlier channels shrink and their weight columns grow. Move α to see the trade.'],
      ['Quantise activations to INT8, one scale for the tensor','The scale is the largest activation divided by 127. Orange cells are values within 4 steps of zero, where rounding costs at least 1/8 of their size.'],
      ['Quantise weights to INT8, one scale per output channel','Weights stretched by s are still easy at 8 bits.'],
      ['Compare the outputs','The slice error is measured here; the whole-layer figure is the same procedure on all 896 channels and 511 evaluation tokens (quant_lab.py).']],
    plain:[
      ['The problem','A few input channels (orange marks) carry activations 10 to 15 times the typical size, on every token. With one scale for the whole activation tensor, the largest sets the step for all.'],
      ['Nothing moves','Plain W8A8 quantises X and W as they are.'],
      ['Quantise activations to INT8, one scale for the tensor','The step is set by the outlier channels; orange cells are values within 4 steps of zero, which keep only a few levels of resolution.'],
      ['Quantise weights to INT8, one scale per output channel',''],
      ['Compare the outputs','Switch to SmoothQuant to run the same input through the migration.']],
    awq:[
      ['Which weights matter','A weight\'s effect on the output is its size times the activation it meets. AWQ ranks input channels by mean |x| on calibration text: the orange channels are the salient ones.'],
      ['Scale up salient columns before quantising','s = (mean|x|)^α, normalised; W·diag(s) is quantised and diag(1/s) is folded into the previous operation, so X·W is unchanged before rounding. A salient weight now spans more levels.'],
      ['Quantise to INT4 (asymmetric, one group per row of this slice)','Every weight snaps to 16 levels; the big columns took a larger share of the range.'],
      ['Undo the scale','Rounding error on salient columns is divided by s; on the rest it is multiplied by a value below 1 or near it.'],
      ['Compare the outputs','AWQ trades a little weight error on unimportant channels for less on the channels that drive the output.']],
    w4:[
      ['Which weights matter','The orange channels meet the largest activations, so their weights\' rounding errors are multiplied by the most.'],
      ['Nothing moves','Plain round-to-nearest treats every column alike.'],
      ['Quantise to INT4 (asymmetric, one group per row of this slice)',''],
      ['Dequantise',''],
      ['Compare the outputs','Switch to AWQ for the same input with salient columns protected.']]};
  let A;
  function draw(i){const m=M[mi],r=run(m);
    $('rd-mgM').querySelectorAll('button').forEach(b=>b.classList.toggle('on',+b.dataset.i===mi));
    $('rd-mgA').disabled=!m.sm;
    $('rd-mgP').innerHTML=svg(i,m,r);
    const cp=CAP[m.k==='w8'?'plain':m.k][i];$('rd-mgT').textContent=(i+1)+' of 5 · '+m.n+': '+cp[0];$('rd-mgC2').textContent=cp[1];
    const other=M.find(o=>o.pair===m.pair&&o.sm!==m.sm),ro=run(other);
    let h=RD.stat('Largest activation',(i>=1?r.xmax:mm(X)).toFixed(1),i>=1&&m.sm?'after smoothing':'as measured');
    if(m.pair==='sq')h+=RD.stat('Activations within 4 steps of zero',i>=2?(100*r.coarse).toFixed(0)+'%':'?','INT8 step '+(i>=2?r.dx.toFixed(3):'?'));
    else h+=RD.stat('Weight error, salient vs rest',i>=3?(100*r.eTop).toFixed(1)+'% / '+(100*r.eRest).toFixed(1)+'%':'?','weighted by mean |x|');
    h+=RD.stat('Output error, this slice',i>=4?(100*r.err).toFixed(2)+'%':'?',i>=4?other.n+': '+(100*ro.err).toFixed(2)+'%':'');
    h+=RD.stat('Output error, whole layer',i>=4?(100*whole(m)).toFixed(2)+'%':'?',i>=4?other.n+': '+(100*whole(other)).toFixed(2)+'%':'');
    $('rd-mgN').innerHTML=h;
  }
  A=RD.anim({card:'rd-mg',ctl:'rd-mgC',n:5,draw,ms:2600,label:'Step'});
  $('rd-mgM').addEventListener('click',e=>{const b=e.target.closest('button[data-i]');if(!b)return;mi=+b.dataset.i;A.reset(5);A.play()});
  $('rd-mgA').addEventListener('input',e=>{alpha=+e.target.value;$('rd-mgAv').textContent=alpha.toFixed(2);A.redraw()});
  addEventListener('resize',()=>A.redraw());
})();
