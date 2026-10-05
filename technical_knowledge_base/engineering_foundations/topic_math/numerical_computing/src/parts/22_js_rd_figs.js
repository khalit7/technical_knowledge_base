// ---- Reading tab: decode card, E4M3 grid, spacing staircase, measured summation table, loss-scale histogram ----
(function(){
  const $=id=>document.getElementById(id),S=FP.show,esc=RD.esc;
  const LOSS=Math.log(Math.exp(2)+Math.exp(1)+1);
  // ---------- 1. decode a number ----------
  const VALS={loss:LOSS,'0.1':0.1,'-2.5':-2.5,'1':1,sub:1e-40,'-0':-0,inf:Infinity,nan:NaN};
  const NAMES={loss:'the loss ≈ 2.4076',sub:'10⁻⁴⁰'};
  let dv='loss',df='fp32';
  function dec(){
    const f=FP.F[df],x=VALS[dv],v=FP.rnd(x,f,{sat:false}),e=FP.enc(v,f),c=FP.cls(v,f);
    const fe=e.bits.slice(1,1+f.e),fm=e.bits.slice(1+f.e);let rows='';
    rows+='<tr><td>sign <i>s</i></td><td><code>'+e.bits[0]+'</code></td><td>'+(e.s?'negative':'positive')+'</td></tr>';
    rows+='<tr><td>exponent field <i>e</i></td><td><code>'+fe+'</code></td><td>= '+e.ef+(c==='normal'?'; true exponent <i>E</i> = <i>e</i> \u2212 '+f.bias+' = '+(e.ef-f.bias):(c==='subnormal'||c==='zero'?'; all zeros: zero or subnormal, <i>E</i> = '+f.emin+', no hidden 1':'; all ones: '+(f.kind==='fn'?'numbers, except the NaN pattern':'infinity or NaN')))+'</td></tr>';
    rows+='<tr><td>fraction <i>f</i></td><td><code>'+fm+'</code></td><td>= '+e.mf+' (out of 2<sup>'+f.m+'</sup>)</td></tr>';
    let read;
    if(c==='normal')read='(\u22121)<sup>'+e.s+'</sup> \u00d7 (1 + '+e.mf+'/2<sup>'+f.m+'</sup>) \u00d7 2<sup>'+(e.ef-f.bias)+'</sup> = '+(e.s?'−':'')+S(1+e.mf/2**f.m,17)+' × 2<sup>'+(e.ef-f.bias)+'</sup> = <b>'+S(v,17)+'</b>';
    else if(c==='subnormal')read='(\u22121)<sup>'+e.s+'</sup> \u00d7 ('+e.mf+'/2<sup>'+f.m+'</sup>) \u00d7 2<sup>'+f.emin+'</sup> = <b>'+S(v,10)+'</b> (subnormal: '+e.mf.toString(2).length+' significant bits left)';
    else if(c==='zero')read='<b>'+S(v)+'</b>: '+(e.s?'negative zero (equal to +0; 1/(−0) = −inf)':'positive zero');
    else if(c==='infinity')read='<b>'+S(v)+'</b>: exponent all ones, fraction 0';
    else read='<b>NaN</b>: '+(f.kind==='fn'?'E4M3 has a single NaN pattern per sign, S.1111.111, and no infinity':'exponent all ones, fraction not 0 (the "quiet NaN" pattern NumPy produces, measured)');
    let err='';
    if(isFinite(x)&&x!==0){const ae=Math.abs(v-x);err='<p class="small">Exact input '+S(x,17)+'; stored '+S(v,17)+'; error '+S(ae,3)+(isFinite(v)?' (relative '+S(ae/Math.abs(x),3)+', bound <i>u</i> = 2<sup>\u2212'+(f.m+1)+'</sup> = '+S(f.u,3)+(c==='subnormal'?'; the bound does not hold for subnormals':'')+')':'')+'.</p>'}
    if(isFinite(x)&&FP.cls(v,f)==='zero'&&x!==0)err='<p class="small bad">'+S(x)+' is below half of '+f.name+'\'s smallest subnormal ('+S(f.minSub,3)+'), so it underflows to 0.</p>';
    $('rd-decOut').innerHTML='<div class="small mute">'+(NAMES[dv]||S(x))+' in '+f.name+' ('+f.bits+' bits):</div>'+FP.bitsHTML(e.bits,f)+'<div class="tw"><table class="mini"><tbody>'+rows+'</tbody></table></div><p class="small">Read back: '+read+'</p>'+err;
  }
  RD.seg($('rd-decVal'),m=>{dv=m;dec()});RD.seg($('rd-decFmt'),m=>{df=m;dec()});dec();
  // ---------- 2. every E4M3 value up to 16 ----------
  let gScale='lin';
  function grid(){
    const el=$('rd-grid'),W=Math.min(860,RD.width(el)),H=150,L=14,R=W-14,f=FP.F.e4m3,vals=[];
    for(let i=0;i<128;i++){const v=FP.dec(i.toString(2).padStart(8,'0'),f);if(isFinite(v)&&v<=16)vals.push(v)}
    vals.sort((a,b)=>a-b);
    const lo=gScale==='lin'?0:-9.5,hi=gScale==='lin'?16:4.2;
    const X=v=>gScale==='lin'?L+(R-L)*v/16:L+(R-L)*(Math.log2(Math.max(v,2**-9.5))-lo)/(hi-lo);
    let b='<line x1="'+L+'" y1="70" x2="'+R+'" y2="70" stroke="var(--mute)"/>';
    vals.forEach(v=>{if(gScale==='log'&&v===0)return;const sub=v<f.minNormal;b+='<line x1="'+X(v).toFixed(1)+'" y1="56" x2="'+X(v).toFixed(1)+'" y2="84" stroke="'+(sub?'var(--c2)':'var(--c1)')+'" stroke-width="1.3"/>'});
    // binade labels
    const bin=gScale==='lin'?[[1,2],[2,4],[4,8],[8,16]]:[[2**-9,2**-6],[2**-6,2**-5],[2**-3,2**-2],[0.5,1],[1,2],[2,4],[4,8],[8,16]];
    bin.forEach(([a,c],k)=>{const g=a<f.minNormal?f.minSub:FP.ulp(a,f),x1=X(a),x2=X(c);if(x2-x1<26)return;
      b+='<line x1="'+x1.toFixed(1)+'" y1="96" x2="'+x2.toFixed(1)+'" y2="96" stroke="var(--line)"/>'+RD.t(((x1+x2)/2).toFixed(1),110,'gap '+S(g),{a:'middle',fs:10.5,fill:'var(--mute)'})});
    const ax=gScale==='lin'?[0,1,2,4,8,16]:[2**-9,2**-6,2**-3,1,4,16];
    ax.forEach(v=>{b+=RD.t(X(v).toFixed(1),44,S(v),{a:'middle',fs:10.5})});
    b+=RD.t(L,136,'orange: subnormals; blue: normal values ('+vals.length+' values from 0 to 16)',{fs:10.5,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,b,'FP8 E4M3 values on a number line');
  }
  RD.seg($('rd-gridScale'),m=>{gScale=m;grid()});
  // ---------- 3. spacing staircase ----------
  const SF=['fp32','tf32','bf16','fp16','e5m2','e4m3'],COL={fp32:'var(--c1)',tf32:'var(--c6)',bf16:'var(--c2)',fp16:'var(--c3)',e5m2:'var(--c4)',e4m3:'var(--c5)'};
  const on={fp32:1,bf16:1,fp16:1,e4m3:1};
  $('rd-stairPick').innerHTML=SF.map(k=>'<button data-k="'+k+'" class="'+(on[k]?'on':'')+'">'+FP.F[k].name+'</button>').join('');
  $('rd-stairPick').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const k=b.dataset.k;on[k]=!on[k];if(!SF.some(x=>on[x]))on[k]=1;b.classList.toggle('on',!!on[k]);stair()});
  let zoom='ml';
  function stair(){
    const el=$('rd-stair'),W=Math.min(860,RD.width(el)),H=250,L=46,R=W-58,T=12,B=H-34,ks=SF.filter(k=>on[k]);
    let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity;
    if(zoom==='ml'){x0=-30;x1=20;y0=-56;y1=14}
    else{ks.forEach(k=>{const f=FP.F[k];x0=Math.min(x0,f.emin-f.m);x1=Math.max(x1,f.emax+1);y0=Math.min(y0,f.emin-f.m);y1=Math.max(y1,f.emax-f.m)});x0-=2;x1+=2;y0-=2;y1+=2}
    const X=v=>L+(R-L)*(v-x0)/(x1-x0),Y=v=>B-(B-T)*(v-y0)/(y1-y0);
    let b='<defs><clipPath id="rd-stairClip"><rect x="'+L+'" y="'+T+'" width="'+(R-L)+'" height="'+(B-T)+'"/></clipPath></defs>';
    b+='<line x1="'+L+'" y1="'+B+'" x2="'+R+'" y2="'+B+'" stroke="var(--mute)"/><line x1="'+L+'" y1="'+T+'" x2="'+L+'" y2="'+B+'" stroke="var(--mute)"/>';
    const stepx=zoom==='ml'?10:Math.max(10,Math.ceil((x1-x0)/7/10)*10),stepy=zoom==='ml'?10:Math.max(10,Math.ceil((y1-y0)/6/10)*10);
    for(let v=Math.ceil(x0/stepx)*stepx;v<=x1;v+=stepx)b+=RD.t(X(v).toFixed(1),B+14,'2<tspan dy="-5" font-size="8">'+v+'</tspan>',{a:'middle',fs:10.5});
    for(let v=Math.ceil(y0/stepy)*stepy;v<=y1;v+=stepy)b+='<line x1="'+L+'" y1="'+Y(v).toFixed(1)+'" x2="'+R+'" y2="'+Y(v).toFixed(1)+'" stroke="var(--line)"/>'+RD.t(L-4,(Y(v)+4).toFixed(1),'2<tspan dy="-5" font-size="8">'+v+'</tspan>',{a:'end',fs:10.5});
    b+=RD.t((L+R)/2,H-4,'size of the number |x| (log scale)',{a:'middle',fs:10.5,fill:'var(--mute)'});
    const labs=[];
    ks.forEach(k=>{const f=FP.F[k];let d='M'+X(f.emin-f.m).toFixed(1)+','+Y(f.emin-f.m).toFixed(1)+' L'+X(f.emin).toFixed(1)+','+Y(f.emin-f.m).toFixed(1);
      for(let E=f.emin;E<=f.emax;E++){if(E<x0-2||E>x1+2)continue;d+=' L'+X(E).toFixed(1)+','+Y(E-f.m).toFixed(1)+' L'+X(E+1).toFixed(1)+','+Y(E-f.m).toFixed(1)}
      b+='<path d="'+d+'" fill="none" stroke="'+COL[k]+'" stroke-width="2" clip-path="url(#rd-stairClip)"/>';
      const ex=Math.min(f.emax+1,x1),ey=Math.max(y0,Math.min(y1,Math.min(f.emax,ex)-f.m));labs.push([X(ex)+4,Y(ey)+4,f.name,COL[k]])});
    labs.sort((a,b)=>a[1]-b[1]);for(let i=1;i<labs.length;i++)if(labs[i][1]-labs[i-1][1]<12&&Math.abs(labs[i][0]-labs[i-1][0])<70)labs[i][1]=labs[i-1][1]+12;
    labs.forEach(l=>{b+=RD.t(Math.min(l[0],W-56).toFixed(1),l[1].toFixed(1),l[2],{fs:10.5,fill:l[3],w:600})});
    b+=RD.t(L+4,T+10,'gap to the next number (log scale)',{fs:10.5,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,b,'Spacing of floating-point numbers against their size');
  }
  RD.seg($('rd-stairZoom'),m=>{zoom=m;stair()});
  // ---------- 4. measured summation table ----------
  function sumTbl(){
    const D=window.NCDATA.summation,pct=v=>v==='nan'?'<span class="bad">NaN</span>':(v==='inf'||v===null||v===undefined)?'<span class="bad">inf</span>':(v===0?'0':(v>=0.01?'<span class="bad">'+(v>=0.1?(v*100).toFixed(1):(v*100).toPrecision(2))+'%</span>':S(v,2)));
    let h='<table class="mini"><thead><tr><th>Format</th><th class="num">N</th><th class="num">naive</th><th class="num">pairwise</th><th class="num">Kahan</th><th class="num">fp32 accumulator</th><th class="num">torch.sum</th></tr></thead><tbody>';
    D.filter(r=>r.N>=100).forEach(r=>{h+='<tr><td>'+FP.F[r.fmt].name+'</td><td class="num">'+r.N.toLocaleString('en')+'</td><td class="num">'+pct(r.naive_relerr)+'</td><td class="num">'+pct(r.pairwise_relerr)+'</td><td class="num">'+pct(r.kahan_relerr)+'</td><td class="num">'+(r.fmt==='fp32'?'n/a':pct(r.acc32_relerr))+'</td><td class="num">'+pct(r.torch_sum_relerr)+'</td></tr>'});
    $('rd-sumTbl').innerHTML=h+'</tbody></table><div class="small mute">Relative error, measured (inputs/out_a.json). Red: above 1%. "inf" and "NaN": the true sum exceeds float16\'s 65,504 (Kahan\'s correction becomes inf \u2212 inf).</div>';
  }
  // ---------- 5. loss-scale histogram ----------
  const H0=window.NCDATA.hist,RUNS=window.NCDATA.runs;
  function ls(){
    const k=+$('rd-lsR').value,el=$('rd-lsFig'),W=Math.min(860,RD.width(el)),Hh=210,L=40,R=W-10,T=10,B=Hh-30;
    $('rd-lsK').textContent=k;$('rd-lsS').textContent=(2**k).toLocaleString('en');
    const x0=-56,x1=24,X=v=>L+(R-L)*(v-x0)/(x1-x0),mx=Math.max(...H0.counts);
    let b='';
    const zone=(a,c,col,lab)=>{b+='<rect x="'+X(a).toFixed(1)+'" y="'+T+'" width="'+(X(c)-X(a)).toFixed(1)+'" height="'+(B-T)+'" fill="'+col+'" opacity=".14"/>';if(X(c)-X(a)>40)b+=RD.t(((X(a)+X(c))/2).toFixed(1),T+12,lab,{a:'middle',fs:10,fill:'var(--mute)'})};
    zone(x0,-25,'var(--bad)','rounds to 0');zone(-25,-14,'var(--c5)','subnormal');zone(-14,16,'var(--good)','normal float16');zone(16,x1,'var(--bad)','overflow');
    let z=0,sb=0,ov=0;
    H0.counts.forEach((c,i)=>{const e=H0.lo+i+k,h=(B-T-16)*c/mx;b+='<rect x="'+(X(e)+0.5).toFixed(1)+'" y="'+(B-h).toFixed(1)+'" width="'+Math.max(1,X(e+1)-X(e)-1).toFixed(1)+'" height="'+h.toFixed(1)+'" fill="var(--c1)"/>';
      if(e<-25)z+=c;else if(e<-14)sb+=c;if(e>=16)ov+=c});
    b+='<line x1="'+L+'" y1="'+B+'" x2="'+R+'" y2="'+B+'" stroke="var(--mute)"/>';
    for(let v=-50;v<=20;v+=10)b+=RD.t(X(v).toFixed(1),B+14,'2<tspan dy="-5" font-size="8">'+v+'</tspan>',{a:'middle',fs:10.5});
    b+=RD.t((L+R)/2,Hh-2,'|gradient| × S (log scale)',{a:'middle',fs:10.5,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,Hh,b,'Histogram of SmolLM2 gradient magnitudes against float16 range');
    const n=H0.n,P=v=>(100*v/n).toPrecision(2)+'%';
    const run=RUNS.find(r=>r.fmt==='fp16'&&r.scale===2**k);
    $('rd-lsOut').innerHTML=RD.stat('Would round to 0',P(z),'bins below 2<sup>−25</sup> after scaling')+RD.stat('Subnormal (precision lost)',P(sb),'2<sup>−25</sup> to 2<sup>−14</sup>')+RD.stat('Would overflow',ov?P(ov)+' and then spread':'0','at or above 2<sup>16</sup>')+
      RD.stat('Measured float16 run',run?(run.nonfinite?'<span class="bad">'+(run.nonfinite/1e6).toFixed(1)+'M non-finite</span>':(100*run.zero_where_fp32_nonzero).toPrecision(2)+'% zero'):'not run at this S',run?'pure fp16 backward on MPS':'measured at k = 0, 4, 8, 12, 16, 20, 24');
    $('rd-lsNote').textContent='Slider counts are read from whole binades, so they are approximate at the edges (a binade straddling a boundary is counted by its lower edge); the measured runs are exact counts over all 134.5M gradients.';
  }
  function lsTbl(){
    let h='<table class="mini"><thead><tr><th>Run</th><th class="num">loss scale S</th><th class="num">gradients that became 0</th><th class="num">non-finite gradients</th><th class="num">median relative error</th></tr></thead><tbody>';
    RUNS.forEach(r=>{h+='<tr><td>pure '+FP.F[r.fmt].name+'</td><td class="num">'+(r.scale===1?'1':'2<sup>'+Math.log2(r.scale)+'</sup>')+'</td><td class="num">'+(100*r.zero_where_fp32_nonzero).toPrecision(2)+'%</td><td class="num'+(r.nonfinite?' bad':'')+'">'+r.nonfinite.toLocaleString('en')+'</td><td class="num">'+(100*r.rel_err_median).toPrecision(2)+'%</td></tr>'});
    $('rd-lsTbl').innerHTML=h+'</tbody></table><div class="small mute">Measured: one step of SmolLM2-135M on 512 tokens; "became 0" counts gradients that are 0 in the run but not in the float32 reference, out of 134,515,008; relative error is ∣g/S − g<sub>fp32</sub>∣ / ∣g<sub>fp32</sub>∣ over finite entries. At large S the non-finite gradients include NaN from inf − inf further back.</div>';
  }
  $('rd-lsR').addEventListener('input',ls);
  function all(){grid();stair();ls()}
  sumTbl();lsTbl();all();RD.onRender(all);RD.onResize(all);
})();
