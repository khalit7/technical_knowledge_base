// ---- The same ternary weights packed two ways: five-trit bytes against the BITCOS bitmap + sign vector ----
// Driven by RD.anim (template 21_js_rd_common.js): five explained steps per mode, listed on the left (sx-tn-trit, sx-tn-bitcos). A step reached
// by moving forward writes its bytes or chunks frame by frame (the long-replay rule: 26 bytes or 8 chunks grouped into stretches).
(function(){
  const card=$('v-tern');if(!card)return;
  const T=window.TERN||{};               // paper figures, set in 11c_tern_data.js
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const N=128,G=5,CH=16,NG=Math.ceil(N/G); // one block of 128 weights (the paper's block size); 26 five-trit bytes; BITCOS drawn in chunks of 16
  const TB=T.trit_bpw||1.625;            // five-trit cost per weight in 128-weight blocks: 26 x 8 / 128
  const st={m:'trit',z:0.515,p:0,k:0,raf:0};
  let W=[];
  function sample(){ // exactly round(z*N) zeros, placed by a seeded shuffle; signs random
    const rnd=mulberry32(20260914),nz=Math.round(st.z*N),idx=[...Array(N).keys()];
    for(let i=N-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[idx[i],idx[j]]=[idx[j],idx[i]]}
    W=Array(N).fill(0);const sg=mulberry32(77);
    idx.forEach((k,r)=>{W[k]=r<nz?0:(sg()<.5?1:-1)});
  }
  const H=z=>{const a=z>0?-z*Math.log2(z):0,b=z<1?-(1-z)*Math.log2((1-z)/2):0;return a+b}; // entropy, + and - equally likely
  const steps=()=>st.m==='trit'?NG:N/CH+1;
  // bits written after progress p (fractional steps)
  function bits(p){
    if(st.m==='trit'){const g=Math.min(NG,Math.floor(p+1e-9)),f=Math.min(1,p-g);
      const out=[];for(let k=0;k<g;k++)out.push(...byteOf(k));
      if(g<NG&&f>0){const b=byteOf(g);out.push(...b.slice(0,Math.floor(8*f)))}
      return {bm:out,sg:[],w:Math.min(N,g*G+(f>0&&g<NG?Math.floor(G*f):0))}}
    const c=Math.min(N/CH,Math.floor(p+1e-9)),f=Math.min(1,p-c);
    const upto=Math.min(N,c*CH+(c<N/CH?Math.floor(CH*f):0));
    const bm=W.slice(0,upto).map(v=>v?1:0),sg=W.slice(0,upto).filter(v=>v).map(v=>v>0?0:1);
    return {bm,sg,w:upto}}
  function byteOf(k){ // five trits -> one base-3 number -> 8 bits (0 -> 0, +1 -> 1, -1 -> 2)
    let v=val(k);
    const b=[];for(let i=7;i>=0;i--)b.push((v>>i)&1);return b}
  function val(k){let v=0;for(let i=G-1;i>=0;i--){const t=k*G+i<N?W[k*G+i]:0;v=v*3+(t===0?0:t>0?1:2)}return v}
  const box=$('tnSvg');
  // where each step ends, in bytes (five-trit) or 16-weight chunks (BITCOS) written; the last step of each mode is a summary
  const END={trit:[0,5,25,NG,NG],bitcos:[0,1,N/CH,N/CH,N/CH]};
  function render(){
    const narrow=box.clientWidth<560,Wd=narrow?Math.max(300,box.clientWidth):760;
    const perRow=narrow?16:32,cw=(Wd-16)/perRow,ch=Math.min(22,cw*1.05);
    const bitsPerRow=narrow?52:104,bw=(Wd-16)/bitsPerRow,bh=7;
    const p=st.p,B=bits(p),k=st.k,last=k===4;
    let s='',y=16;
    s+='<text x="8" y="'+(y-4)+'" font-size="12" fill="var(--mute)">weights (illustrative sample, '+W.filter(v=>!v).length+' of '+N+' zero)</text>';
    // the group last written (outlined) while a step is writing; none on the intro and summary steps
    const grpSize=st.m==='trit'?G:CH,cur=Math.ceil(p-1e-9)-1,active=p>1e-9&&!(st.m==='trit'?last:k>=3);
    W.forEach((v,i)=>{const r=Math.floor(i/perRow),c=i%perRow,x=8+c*cw,yy=y+4+r*(ch+4);
      const inCur=active&&Math.floor(i/grpSize)===cur,done=i<B.w;
      s+='<rect x="'+(x+1)+'" y="'+yy+'" width="'+(cw-2)+'" height="'+ch+'" rx="3" fill="'+(v?(v>0?'var(--c1)':'var(--c2)'):'var(--soft)')+'" fill-opacity="'+(done||inCur?1:.45)+'" stroke="'+(inCur?'var(--ink)':'var(--line)')+'" stroke-width="'+(inCur?1.6:1)+'"/>';
      s+='<text x="'+(x+cw/2)+'" y="'+(yy+ch/2+4)+'" font-size="11" text-anchor="middle" fill="'+(v?'var(--bg)':'var(--mute)')+'">'+(v>0?'+':v<0?'−':'0')+'</text>'});
    const wRows=Math.ceil(N/perRow);y+=4+wRows*(ch+4)+18;
    // bit strips, to scale: one square per stored bit
    function strip(label,arr,col,yy,maxBits){
      let t='<text x="8" y="'+(yy-4)+'" font-size="12" fill="var(--mute)">'+label+'</text>';
      const rows=Math.max(1,Math.ceil(maxBits/bitsPerRow));
      for(let i=0;i<maxBits;i++){const r=Math.floor(i/bitsPerRow),c=i%bitsPerRow,x=8+c*bw,y2=yy+r*(bh+3);
        const on=i<arr.length;t+='<rect x="'+(x+.5)+'" y="'+y2+'" width="'+Math.max(1,bw-1.2)+'" height="'+bh+'" fill="'+(on?(arr[i]?col:'var(--dim)'):'none')+'" stroke="'+(on?'none':'var(--line)')+'" stroke-dasharray="'+(on?'':'2 2')+'"/>'}
      return {t,h:rows*(bh+3)}}
    if(st.m==='trit'){
      const a=strip(narrow?'stored bytes: '+B.bm.length+' of '+NG*8+' bits':'stored bytes: '+B.bm.length+' of '+NG*8+' bits (dark 1, grey 0, dashed still to write)',B.bm,'var(--ink)',y,NG*8);s+=a.t;y+=a.h+10;
      if(active){const v=val(cur),tr=W.slice(cur*G,cur*G+G).map(t=>t===0?0:t>0?1:2);
        s+='<text x="8" y="'+(y+8)+'" font-size="12">byte '+(cur+1)+': trits '+tr.join(',')+(narrow?'':' (0 = 0, + = 1, − = 2)')+' in base 3 = '+v+(tr.length<G?' ('+tr.length+' left)':'')+'</text>'}
      y+=18;
    }else{
      const nnz=W.filter(v=>v).length;
      const a=strip('presence bitmap: '+B.bm.length+' bits'+(narrow?'':' (dark = non-zero)'),B.bm,'var(--ink)',y,N);s+=a.t;y+=a.h+18;
      const b=strip((narrow?'signs, non-zero only: ':'sign vector, non-zero weights only: ')+B.sg.length+' bits'+(narrow?'':' (dark = −)'),B.sg,'var(--c2)',y,nnz);s+=b.t;y+=b.h+10;
      if(last){const i=W.findIndex((v,k)=>v&&k>=40)>=0?W.findIndex((v,k)=>v&&k>=40):W.findIndex(v=>v);const pc=W.slice(0,i).filter(v=>v).length;
        s+='<text x="8" y="'+(y+8)+'" font-size="12">'+(narrow?'weight '+(i+1)+': bit set, so sign entry '+(pc+1):'decode weight '+(i+1)+': its bitmap bit is set, so its sign is sign entry '+(pc+1))+'</text><text x="8" y="'+(y+24)+'" font-size="12" fill="var(--mute)">('+pc+' set bits come before it)</text>'}
      y+=34;
    }
    // a fixed-height scale bar comparing both totals for this sample
    const tritBits=NG*8,bcBits=N+W.filter(v=>v).length,mx=Math.max(tritBits,bcBits,1);
    y+=8;const sc=(Wd-16-150)/mx;
    [['five-trit',tritBits,'var(--c4)',st.m==='trit'],['BITCOS',bcBits,'var(--c3)',st.m==='bitcos']].forEach(([l,v,c,on],k)=>{
      const yy=y+k*16;s+='<text x="8" y="'+(yy+10)+'" font-size="11.5" fill="var(--mute)">'+l+' total</text><rect x="80" y="'+yy+'" width="'+(v*sc)+'" height="11" rx="2" fill="'+c+'" opacity="'+(on?1:.45)+'"/><text x="'+(84+v*sc)+'" y="'+(yy+10)+'" font-size="11.5">'+v+' bits</text>'});
    y+=36;
    box.innerHTML=svgEl(Wd,y,s,'A block of 128 ternary weights and the bits that store them');
    $('tnCnt').innerHTML=stat('weights stored',fmt(B.w)+' / '+N,'one block')+stat('bits written',fmt(B.bm.length+B.sg.length))+stat('bits per weight so far',B.w?((B.bm.length+B.sg.length)/B.w).toFixed(2):'0')+
      stat('long-run rate',(st.m==='trit'?TB:(2-st.z).toFixed(3))+' bits','five-trit: '+TB+' · BITCOS: 2 − z = '+(2-st.z).toFixed(3))+stat('entropy bound at this z',H(st.z).toFixed(3)+' bits','derived: −z log₂ z − (1 − z) log₂((1 − z)/2)');
    $('tnZv').textContent=st.z.toFixed(3)+' ('+Math.round(st.z*N)+' of 128 in the sample)';
  }
  // the numbers in the step lists that depend on the sample
  function nums(){const nnz=W.filter(v=>v).length,bc=N+nnz,V={nz:N-nnz,nnz,bc,bpw:(bc/N).toFixed(3),rate:(2-st.z).toFixed(3)};
    document.querySelectorAll('[data-tn]').forEach(e=>{e.textContent=V[e.dataset.tn]})}
  // ---- static chart: bits per weight against z ----
  const pbox=$('tnPlot');
  function plot(){
    const narrow=pbox.clientWidth<560,Wd=narrow?Math.max(300,pbox.clientWidth):760,Hh=narrow?250:290,pl=narrow?40:48,pr=narrow?12:20,pt=14,pb=narrow?46:40;
    const z0=0.15,z1=0.65,b0=1.3,b1=1.9;
    const X=z=>pl+(Wd-pl-pr)*(z-z0)/(z1-z0),Y=b=>pt+(Hh-pt-pb)*(1-(b-b0)/(b1-b0));
    let s='';
    [1.3,1.4,1.5,1.6,1.7,1.8,1.9].forEach(b=>{s+='<line x1="'+pl+'" x2="'+(Wd-pr)+'" y1="'+Y(b)+'" y2="'+Y(b)+'" stroke="var(--line)"/><text x="'+(pl-5)+'" y="'+(Y(b)+4)+'" font-size="11" text-anchor="end" fill="var(--mute)">'+b.toFixed(1)+'</text>'});
    [0.2,0.3,0.4,0.5,0.6].forEach(z=>{s+='<text x="'+X(z)+'" y="'+(Hh-pb+15)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+z.toFixed(1)+'</text>'});
    s+='<text x="'+((pl+Wd-pr)/2)+'" y="'+(Hh-6)+'" font-size="11" text-anchor="middle" fill="var(--mute)">share of weights that are zero, z</text>';
    s+='<text x="12" y="'+((pt+Hh-pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 12 '+((pt+Hh-pb)/2)+')">bits per weight</text>';
    // log2(3)
    const l3=Math.log2(3);s+='<line x1="'+pl+'" x2="'+(Wd-pr)+'" y1="'+Y(l3)+'" y2="'+Y(l3)+'" stroke="var(--mute)" stroke-dasharray="2 4"/>';
    // entropy curve
    let d='';for(let z=z0;z<=z1+1e-9;z+=0.005)d+=(d?'L':'M')+X(z).toFixed(1)+' '+Y(H(z)).toFixed(1);
    s+='<path d="'+d+'" fill="none" stroke="var(--mute)" stroke-width="1.5" stroke-dasharray="5 4"/>';
    // five-trit and BITCOS
    s+='<line x1="'+X(z0)+'" x2="'+X(z1)+'" y1="'+Y(TB)+'" y2="'+Y(TB)+'" stroke="var(--c4)" stroke-width="2.4"/>';
    s+='<line x1="'+X(z0)+'" x2="'+X(z1)+'" y1="'+Y(2-z0)+'" y2="'+Y(2-z1)+'" stroke="var(--c3)" stroke-width="2.4"/>';
    const zc=2-TB;s+='<circle cx="'+X(zc)+'" cy="'+Y(TB)+'" r="4" fill="var(--bg)" stroke="var(--ink)" stroke-width="1.5"/>';
    // model dots on the BITCOS line, if the paper's table was transcribed
    (T.models||[]).forEach(m=>{s+='<circle cx="'+X(m.z)+'" cy="'+Y(2-m.z)+'" r="3" fill="'+(2-m.z<TB?'var(--c3)':'var(--bad)')+'" opacity=".85"><title>'+m.n+': z = '+m.z+'</title></circle>'});
    // reader's z
    s+='<line x1="'+X(st.z)+'" x2="'+X(st.z)+'" y1="'+pt+'" y2="'+(Hh-pb)+'" stroke="var(--acc)" stroke-width="1.2"/>';
    s+='<circle cx="'+X(st.z)+'" cy="'+Y(2-st.z)+'" r="4.5" fill="var(--acc)"/>';
    // labels, placed where they do not collide
    const lab=(x,y,t,c,a)=>'<text x="'+x+'" y="'+y+'" font-size="11.5" fill="'+c+'" text-anchor="'+(a||'start')+'">'+t+'</text>';
    s+=lab(X(z1)-2,Y(TB)-6,'five-trit, '+TB,'var(--c4)','end');
    s+=lab(X(z0)+14,Y(2-z0)+2,'BITCOS, 2 − z','var(--c3)');
    s+=lab(Wd-pr-2,Y(l3)+14,'log₂3 = 1.585','var(--mute)','end');
    s+=lab(X(0.2),Y(H(0.2))+15,'entropy','var(--mute)','middle');
    s+='<line x1="'+X(zc)+'" x2="'+X(zc)+'" y1="'+Y(TB)+'" y2="'+(Hh-pb)+'" stroke="var(--ink)" stroke-dasharray="2 3"/>'+lab(X(zc)+4,Hh-pb-5,'crossover '+zc.toFixed(3),'var(--ink)');
    if(T.best)s+=lab(X(T.best.z)-6,Y(T.best.b)+16,T.best.b+' (sparsest)','var(--ink)','end');
    pbox.innerHTML=svgEl(Wd,Hh,s,'Bits per weight against zero share');
  }
  // ---- the controller: RD.anim with the step list on the left; a step reached by moving forward writes its stretch frame by frame ----
  function draw(i,fwd){st.k=i;const to=END[st.m][i];if(st.raf){cancelAnimationFrame(st.raf);st.raf=0}
    const from=st.p;if(!(fwd||card.classList.contains('rd-fwd'))||RM||to<=from||card.offsetParent===null){st.p=to;render();return}
    const dur=Math.max(600,Math.min(3200,(st.m==='trit'?160:400)*(to-from))),t0=performance.now();
    const f=now=>{const u=Math.min(1,(now-t0)/dur);st.p=from+(to-from)*u;card.dataset.frames=(+card.dataset.frames||0)+1;render();st.raf=u<1?requestAnimationFrame(f):0};
    st.raf=requestAnimationFrame(f)}
  if(T.default_z)st.z=T.default_z;$('tnZ').value=st.z;sample();nums();
  const anim=RD.anim({card:'v-tern',ctl:'tnCtl',n:5,list:'sx-tn-trit',ms:5200,label:'Step of the packing',draw:i=>draw(i)});
  const setZ=z=>{st.z=z;$('tnZ').value=z;sample();nums();anim.go(anim.i);plot()}; // moving z is a reader control: autoplay stops
  $('tnZ').addEventListener('input',e=>setZ(+e.target.value));
  const pre=$('tnPre');const PRE=[['uniform, z = 1/3',1/3],['crossover, z = '+(2-TB).toFixed(3).replace(/0+$/,''),2-TB],[(T.best?'sparsest model, z = '+T.best.z:'z = 0.515'),T.best?T.best.z:0.515]];
  pre.innerHTML=PRE.map((q,i)=>'<button data-i="'+i+'">'+q[0]+'</button>').join('');
  pre.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>setZ(PRE[+b.dataset.i][1])));
  // a mode switch: the other list, from step 1, replayed (the one exception to "stops for good")
  const seg=$('tnM');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    st.m=b.dataset.m;st.p=0;document.querySelectorAll('ol[id^="sx-tn-"]').forEach(o=>o.hidden=o.id!=='sx-tn-'+st.m);anim.reset(5,'sx-tn-'+st.m)}));
  let rw=0;addEventListener('resize',()=>{const w=box.clientWidth;if(w&&w!==rw){rw=w;render();plot()}});
  onTab(card.closest('.tab').id,()=>{rw=box.clientWidth;render();plot()});
})();
