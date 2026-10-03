// ---- Tab: Bit explorer. One number through every format: bits, stored value, error, step, what happens at the edges ----
(function(){
  const $=id=>document.getElementById(id);
  if(!$('bx'))return;
  const QF=window.QF;
  const FMT=[['fp32','fp32'],['tf32','tf32'],['bf16','bf16'],['fp16','fp16'],['e5m2','fp8 E5M2'],['e4m3','fp8 E4M3'],['e2m1','fp4 E2M1']];
  function enc(q,f){ // bit fields of an already-rounded value
    const p=QF.FL[f],e=p[0],m=p[1],bias=p[2];const s=q<0||Object.is(q,-0)?1:0,a=Math.abs(q);
    if(a===Infinity)return {s,E:Math.pow(2,e)-1,M:0};if(a===0)return {s,E:0,M:0};
    const emin=1-bias;let ex=Math.floor(Math.log2(a));
    if(ex<emin)return {s,E:0,M:Math.round(a/Math.pow(2,emin-m))};
    let M=Math.round((a/Math.pow(2,ex)-1)*Math.pow(2,m));if(M===Math.pow(2,m)){M=0;ex++}
    return {s,E:ex+bias,M}}
  function bits(v,n){let s='';for(let i=n-1;i>=0;i--)s+=Math.floor(v/Math.pow(2,i))%2;return s}
  function ulp(a,f){const p=QF.FL[f],emin=1-p[2];let e=a>0?Math.floor(Math.log2(a)):emin;if(e<emin)e=emin;return Math.pow(2,e-p[1])}
  function convert(x,f){
    if(f==='fp32'){const r=Math.fround(x);return {q:r,how:r===x?'exact':(r===0&&x!==0?'underflow to 0':Math.abs(r)===Infinity?'overflow to infinity':'rounded')}}
    const p=QF.FL[f],a=Math.abs(x);const q=QF.rfInf(x,f);
    const minSub=Math.pow(2,1-p[2]-p[1]),minN=Math.pow(2,1-p[2]);
    let how;
    if(Math.abs(q)===Infinity)how='overflow to infinity';
    else if(!p[4]&&a>p[3])how='saturates at '+p[3]+' (no infinity in this format)';
    else if(q===0&&a!==0)how='underflow to 0 (below half the smallest subnormal, '+minSub.toPrecision(3)+')';
    else if(a<minN&&a>0)how=(q===x?'exact, ':'rounded, ')+'subnormal (fewer significant bits)';
    else how=q===x?'exact':'rounded';
    return {q,how}}
  const fmtN=v=>{if(!isFinite(v))return v>0?'+inf':'-inf';if(v===0)return '0';const a=Math.abs(v);return (a>=1e5||a<1e-3)?v.toExponential(5):(+v.toPrecision(8)).toString()};
  function row(x,f,label){
    const c=convert(x,f),p=QF.FL[f];
    let b;
    if(f==='fp32'){const fa=new Float32Array([c.q]),u=new Uint32Array(fa.buffer)[0];const st=bits(u,32);b={s:+st[0],Es:st.slice(1,9),Ms:st.slice(9)}}
    else{const e=enc(c.q,f);b={s:e.s,Es:bits(e.E,p[0]),Ms:bits(e.M,p[1])}}
    const err=x===0?0:Math.abs(c.q-x)/Math.abs(x);
    const bitsHtml='<span class="bs">'+b.s+'</span>'+b.Es.split('').map(d=>'<span class="be">'+d+'</span>').join('')+b.Ms.split('').map(d=>'<span class="bm">'+d+'</span>').join('');
    const step=isFinite(c.q)?ulp(Math.abs(c.q)||Math.abs(x),f):NaN;
    return '<div class="bxr"><div class="bxh"><b>'+label+'</b> <span class="small mute">1/'+p[0]+'/'+p[1]+'</span></div><div class="bitrow">'+bitsHtml+'</div><div class="bxk small"><span>Stored <b class="mono">'+fmtN(c.q)+'</b></span><span>Error <b>'+(isFinite(err)?(err<1e-12?'0':(100*err).toPrecision(3)+'%'):'inf')+'</b></span><span>Step here <b class="mono">'+(isFinite(step)?step.toPrecision(3):'')+'</b></span><span class="mute">'+c.how+'</span></div></div>'}
  function update(){
    let x=parseFloat($('bxV').value);if(!isFinite(x)){$('bxOut').innerHTML='<p class="mute">Type a number.</p>';return}
    $('bxOut').innerHTML='<div class="small mute">Bits: <span style="color:#8a5cb8">sign</span>, <span style="color:#2f6fb5">exponent</span>, <span style="color:#3f7f56">mantissa</span></div>'+FMT.map(([f,l])=>row(x,f,l)).join('');
    block(x);
    const lg=Math.log2(Math.abs(x)||1e-30);$('bxS').value=Math.max(-30,Math.min(20,lg)).toFixed(2);
  }
  // ---- the same number inside a block that shares one scale ----
  function block(x){
    let A=parseFloat($('bxA').value);if(!isFinite(A)||A<=0)A=Math.abs(x)||1;
    const out=[];
    // INT8 and INT4 absmax
    [[8,'INT8, absmax scale'],[4,'INT4, absmax scale']].forEach(([b,n])=>{const qm=Math.pow(2,b-1)-1,s=A/qm;const k=Math.max(-qm,Math.min(qm,QF.rne(x/s)));out.push([n,'scale = '+fmtN(A)+' / '+qm+' = '+fmtN(s),k+' × scale',k*s,Math.abs(x)>A?'clipped':''])});
    // MXFP8 and MXFP4: power-of-two E8M0 scale
    [['e4m3',8,'MXFP8 (E4M3 elements)'],['e2m1',2,'MXFP4 (E2M1 elements)']].forEach(([el,emax,n])=>{const X=Math.pow(2,Math.floor(Math.log2(A))-emax);const e=QF.rf(x/X,el);
      out.push([n,'E8M0 scale = 2^'+(Math.floor(Math.log2(A))-emax)+' = '+fmtN(X),fmtN(e)+' × scale',e*X,Math.abs(x/X)>QF.FL[el][3]?'clipped at '+QF.FL[el][3]+' × scale':''])});
    // NVFP4: FP8 E4M3 block scale (per-tensor FP32 scale taken as 1 here, labelled)
    {const st=A/(448*6),sb=QF.rf(A/6/st,'e4m3'),sc=sb*st;const e=QF.rf(x/sc,'e2m1');out.push(['NVFP4 (E2M1, E4M3 scale per 16)','E4M3 '+fmtN(sb)+' × FP32 '+fmtN(st)+' = '+fmtN(sc),fmtN(e)+' × scale',e*sc,Math.abs(x/sc)>6?'clipped':''])}
    {const s=A;const t=x/s;let bi=0,bd=9;for(let k=0;k<16;k++){const d=Math.abs(t-QF.NF4[k]);if(d<bd){bd=d;bi=k}}out.push(['NF4 (QLoRA), absmax per 64','scale = '+fmtN(A),'code '+bi+' = '+QF.NF4[bi].toFixed(4)+' × scale',QF.NF4[bi]*s,Math.abs(x)>A?'clipped':''])}
    $('bxB').innerHTML='<div class="tw"><table><thead><tr><th>Block format</th><th>Shared scale</th><th>Element</th><th class="num">Stored</th><th class="num">Error</th></tr></thead><tbody>'+out.map(r=>'<tr><td>'+r[0]+'</td><td class="small mono">'+r[1]+'</td><td class="small mono">'+r[2]+'</td><td class="num mono">'+fmtN(r[3])+'</td><td class="num">'+(x===0?'0':(100*Math.abs(r[3]-x)/Math.abs(x)).toPrecision(3)+'%')+(r[4]?' <span class="small" style="color:var(--bad)">'+r[4]+'</span>':'')+'</td></tr>').join('')+'</tbody></table></div>';
  }
  const PRE=[['0.1','0.1'],['1/3','0.3333333333'],['pi','3.14159265'],['300','300'],['448','448'],['500','500'],['65504','65504'],['70000','70000'],['1e-5 (small gradient)','0.00001'],['1e-8 (tiny gradient)','0.00000001'],['1 + 2^-8','1.00390625']];
  $('bxP').innerHTML=PRE.map(p=>'<button data-v="'+p[1]+'">'+p[0]+'</button>').join('');
  $('bxP').addEventListener('click',e=>{const b=e.target.closest('button[data-v]');if(!b)return;$('bxV').value=b.dataset.v;update()});
  $('bxV').addEventListener('input',update);$('bxA').addEventListener('input',update);
  $('bxS').addEventListener('input',e=>{const sg=parseFloat($('bxV').value)<0?-1:1;$('bxV').value=(sg*Math.pow(2,+e.target.value)).toPrecision(6);update();});
  // ---- the format table: computed limits ----
  function limits(){const R=window.QF_ROWS||[];$('bxL').innerHTML='<div class="tw"><table><thead><tr><th>Format</th><th class="num">Largest</th><th class="num">Smallest normal</th><th class="num">Smallest subnormal</th><th class="num">Relative step (2^-m)</th><th class="num">Range (binades)</th></tr></thead><tbody>'+
    R.map(r=>'<tr><td>'+r.n+'</td><td class="num mono">'+fmtN(r.max)+'</td><td class="num mono">'+fmtN(r.minN)+'</td><td class="num mono">'+fmtN(r.sub)+'</td><td class="num mono">'+fmtN(r.eps)+'</td><td class="num">'+Math.log2(r.max/r.sub).toFixed(1)+'</td></tr>').join('')+'</tbody></table></div>'}
  update();limits();
})();
