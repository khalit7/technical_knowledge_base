// ---- The live ingredient: one illustrative 32 x 16 activation tile, quantised for the forward pass in NVFP4 (one scale per
// row of 16), then turned into the backward pass's operand (blocks down the columns) five ways. A line-by-line port of
// src/recompute.py (same seeded generator, same formats and rounding); check_page.mjs compares the two.
(function(){
  if(!window.RD||!document.getElementById('e4-toy'))return;
  const $=id=>document.getElementById(id), t=RD.t, ROWS=32, COLS=16, SEED=7;
  const E2M1=[0,0.5,1,1.5,2,3,4,6];
  const E4M3=[0];for(let k=1;k<8;k++)E4M3.push(k*Math.pow(2,-9));
  for(let e=1;e<16;e++)for(let m=0;m<8;m++){if(e===15&&m===7)continue;E4M3.push((1+m/8)*Math.pow(2,e-7))}
  function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let x=Math.imul(a^a>>>15,1|a);x=x+Math.imul(x^x>>>7,61|x)^x;return((x^x>>>14)>>>0)/4294967296}}
  const gauss=r=>{const u=r(),v=r();return Math.sqrt(-2*Math.log(u+1e-12))*Math.cos(2*Math.PI*v)};
  function tile(p){const r=mulberry32(SEED),x=[];for(let i=0;i<ROWS;i++){const row=[];for(let j=0;j<COLS;j++)row.push(gauss(r));x.push(row)}
    if(p==='row')x[5]=x[5].map(v=>v*30);
    else if(p==='outlier')x[9][6]=40;
    else if(p==='channel')x.forEach(row=>{row[3]*=25});
    return x}
  function lohi(g,a){for(let k=0;k<g.length-1;k++)if(a<=g[k+1])return[g[k],g[k+1],k];return[g[g.length-1],g[g.length-1],g.length-1]}
  function rtn(g,a){if(a>=g[g.length-1])return g[g.length-1];const[lo,hi,k]=lohi(g,a);if(a-lo<hi-a)return lo;if(a-lo>hi-a)return hi;return k%2===0?lo:hi}
  function srm(g,a){if(a>=g[g.length-1])return[g[g.length-1],0,0];const[lo,hi]=lohi(g,a);if(hi===lo)return[lo,0,lo===0?1:0];const p=(a-lo)/(hi-lo);return[lo+p*(hi-lo),(a-lo)*(hi-a),lo===0?1-p:0,lo,hi,p]}
  function blocks(kind){const B=[];
    if(kind==='row16')for(let i=0;i<ROWS;i++){const b=[];for(let j=0;j<COLS;j++)b.push([i,j]);B.push(b)}
    if(kind==='col16')for(let j=0;j<COLS;j++)for(const s of[0,16]){const b=[];for(let i=s;i<s+16;i++)b.push([i,j]);B.push(b)}
    if(kind==='col32')for(let j=0;j<COLS;j++){const b=[];for(let i=0;i<ROWS;i++)b.push([i,j]);B.push(b)}
    if(kind==='tile16')for(const s of[0,16]){const b=[];for(let i=s;i<s+16;i++)for(let j=0;j<COLS;j++)b.push([i,j]);B.push(b)}
    return B}
  const zeros=()=>Array.from({length:ROWS},()=>new Array(COLS).fill(0));
  // returns expectation, variance, probability of 0, and one stochastic draw (rng given) per cell
  function quant(x,kind,fmt,mode,rng){
    const E=zeros(),V=zeros(),Z=zeros(),D=zeros();
    let amt=0;x.forEach(r=>r.forEach(v=>{amt=Math.max(amt,Math.abs(v))}));
    const sg=fmt==='nvfp4'?amt/(6*448):1;
    for(const bl of blocks(kind)){
      let am=0;bl.forEach(([i,j])=>{am=Math.max(am,Math.abs(x[i][j]))});if(am===0)continue;
      let s,g;
      if(fmt==='nvfp4'){s=rtn(E4M3,Math.min(448,am/6/sg))*sg;g=E2M1}else{s=Math.pow(2,Math.ceil(Math.log2(am/448)));g=E4M3}
      if(s===0)continue;
      for(const[i,j]of bl){const a=Math.abs(x[i][j])/s,sgn=x[i][j]<0?-1:1;
        if(mode==='rtn'){const q=rtn(g,a);E[i][j]=sgn*q*s;Z[i][j]=q===0?1:0;D[i][j]=E[i][j]}
        else{const m=srm(g,a);E[i][j]=sgn*m[0]*s;V[i][j]=m[1]*s*s;Z[i][j]=m[2];
          D[i][j]=m.length>3?sgn*(rng()<m[5]?m[4]:m[3])*s:E[i][j]}}}
    return{E,V,Z,D}}
  const OPT=[['naive','x again, nearest'],['tile','16 × 16 tiles'],['nvsr','NVFP4, stochastic'],['mxsr','MXFP8, stochastic (the article)'],['mxrtn','MXFP8, nearest']];
  const PRE={gauss:'Gaussian',row:'One large row',outlier:'One outlier',channel:'Outlier channel'};
  function run(p,draw){
    const x=tile(p),f=quant(x,'row16','nvfp4','rtn').E,out={},bk={};
    for(const[o]of OPT){
      const rng=mulberry32(11);let ref=f,b;
      if(o==='naive')b=quant(x,'col16','nvfp4','rtn');
      else if(o==='tile'){ref=quant(x,'tile16','nvfp4','rtn').E;b={E:ref,V:zeros(),Z:ref.map(r=>r.map(v=>v===0?1:0)),D:ref}}
      else if(o==='nvsr')b=quant(ref,'col16','nvfp4','sr',rng);
      else if(o==='mxsr')b=quant(ref,'col32','mxfp8','sr',rng);
      else b=quant(ref,'col32','mxfp8','rtn');
      let nx=0,nf=0,eb=0,vb=0,fe=0,fz=0,bz=0;
      for(let i=0;i<ROWS;i++)for(let j=0;j<COLS;j++){nx+=x[i][j]**2;nf+=ref[i][j]**2;eb+=(b.E[i][j]-ref[i][j])**2;vb+=b.V[i][j];fe+=(ref[i][j]-x[i][j])**2;
        if(x[i][j]!==0&&ref[i][j]===0)fz++;if(ref[i][j]!==0)bz+=b.Z[i][j]}
      const bias=Math.sqrt(eb)/Math.sqrt(nf),noise=Math.sqrt(vb)/Math.sqrt(nf);
      out[o]={fwd_err:Math.sqrt(fe)/Math.sqrt(nx),fwd_zero:fz,bias,noise,avg1000:Math.sqrt(bias*bias+noise*noise/1000),bwd_zero:bz};
      bk[o]={ref,draw:b.D,kind:o==='tile'?'tile16':o.startsWith('mx')?'col32':'col16',fkind:o==='tile'?'tile16':'row16'};
    }
    return draw?{x,out,bk}:out}
  window.E4TOY={stats:p=>run(p,false)};
  let pre='outlier',opt='mxsr';
  const pc=v=>(100*v).toFixed(v<0.001&&v>0?3:v<0.1?2:1)+'%', zc=v=>Number.isInteger(v)?String(v):v.toFixed(1);
  function grid(vals,kind,ox,cell,amax,lost){
    let s='';const lg=v=>{const a=Math.abs(v);if(a===0)return 0;return Math.max(.12,Math.min(1,1+Math.log10(a/amax)/3*.88))};
    for(let i=0;i<ROWS;i++)for(let j=0;j<COLS;j++){const v=vals[i][j],x=ox+j*cell,y=22+i*cell;
      if(v===0)s+='<rect x="'+(x+1)+'" y="'+(y+1)+'" width="'+(cell-2)+'" height="'+(cell-2)+'" fill="none" stroke="var(--mute)" stroke-dasharray="2 2" stroke-width=".7"/>';
      else s+='<rect x="'+(x+.5)+'" y="'+(y+.5)+'" width="'+(cell-1)+'" height="'+(cell-1)+'" fill="var(--c1)" fill-opacity="'+lg(v).toFixed(3)+'"/>';
      if(lost&&lost[i][j])s+='<rect x="'+(x+1)+'" y="'+(y+1)+'" width="'+(cell-2)+'" height="'+(cell-2)+'" fill="none" stroke="var(--bad)" stroke-width="2"/>'}
    for(const bl of blocks(kind)){let i0=99,i1=-1,j0=99,j1=-1;bl.forEach(([i,j])=>{i0=Math.min(i0,i);i1=Math.max(i1,i);j0=Math.min(j0,j);j1=Math.max(j1,j)});
      s+='<rect x="'+(ox+j0*cell)+'" y="'+(22+i0*cell)+'" width="'+((j1-j0+1)*cell)+'" height="'+((i1-i0+1)*cell)+'" fill="none" stroke="var(--ink)" stroke-opacity=".55" stroke-width="1.2"/>'}
    return s}
  function draw(){
    const R=run(pre,true),b=R.bk[opt],el=$('e4-toysvg'),W=RD.width(el);
    const cell=Math.max(5,Math.min(13,Math.floor((W-24)/(2*COLS)))),gw=cell*COLS,gap=Math.max(12,Math.min(48,W-2*gw-8)),ox1=Math.max(0,(W-2*gw-gap)/2),ox2=ox1+gw+gap;
    let amax=0;R.x.forEach(r=>r.forEach(v=>{amax=Math.max(amax,Math.abs(v))}));
    const lost=b.ref.map((r,i)=>r.map((v,j)=>v!==0&&b.draw[i][j]===0));
    let s=t(ox1,14,'Forward: '+(b.fkind==='tile16'?'16 × 16 tiles':'rows of 16'),{fs:12,fill:'var(--mute)'})+t(ox2,14,'Backward: '+(b.kind==='tile16'?'the same tiles':b.kind==='col32'?'columns of 32':'columns of 16'),{fs:12,fill:'var(--mute)'});
    s+=grid(b.ref,b.fkind,ox1,cell,amax,null)+grid(b.draw,b.kind,ox2,cell,amax,lost);
    s+=t(ox1,22+ROWS*cell+16,'32 tokens × 16 channels',{fs:11,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,22+ROWS*cell+22,s,'The forward tile and the backward operand of the chosen method');
    const H='<tr><th>Method</th><th>forward zeros</th><th>error that stays</th><th>noise per draw</th><th>after 1,000</th><th>backward zeros</th></tr>';
    $('e4-tab').innerHTML=H+OPT.map(([o,l])=>{const v=R.out[o];return '<tr'+(o===opt?' class="on"':'')+'><td>'+l+'</td><td>'+v.fwd_zero+'</td><td>'+pc(v.bias)+'</td><td>'+pc(v.noise)+'</td><td>'+pc(v.avg1000)+'</td><td>'+zc(Math.round(v.bwd_zero*10)/10)+'</td></tr>'}).join('');
  }
  function all(){const el=$('e4-all');if(!el)return;
    let h='<tr><th>Tile</th><th>Method</th><th>forward zeros</th><th>error that stays</th><th>noise per draw</th><th>after 1,000</th><th>backward zeros</th></tr>';
    for(const p of Object.keys(PRE)){const o=run(p,false);OPT.forEach(([k,l])=>{const v=o[k];h+='<tr><td>'+PRE[p]+'</td><td>'+l+'</td><td>'+v.fwd_zero+'</td><td>'+pc(v.bias)+'</td><td>'+pc(v.noise)+'</td><td>'+pc(v.avg1000)+'</td><td>'+zc(Math.round(v.bwd_zero*10)/10)+'</td></tr>'})}
    el.innerHTML=h}
  RD.seg($('e4-pre'),m=>{pre=m;draw()}); RD.seg($('e4-opt'),m=>{opt=m;draw()});
  all(); RD.onRender(draw); RD.onResize(draw);
})();
