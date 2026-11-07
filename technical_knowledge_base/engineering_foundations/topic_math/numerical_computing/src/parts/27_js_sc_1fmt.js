// ---- Scene: section 3, the running example's loss stored in six formats, one row of bits each (renderer v2: rows in depth, flows where bits are kept, camera per step) ----
// Every bit is FP.enc(FP.rnd(loss, format)) from 20_js_fp.js; check_stages.mjs compares them with recompute.py's numbers.json (loss_*_bits).
(function(){
  if(!document.getElementById('stg-fmt')||!window.FP)return;const {at,off,lerp,mix}=S3;
  const LOSS=Math.log(Math.exp(2)+Math.exp(1)+1);
  // rows from the back (float32, the source) to the front; each row's source is the row its bits are taken from
  const ORDER=[['fp32',null,0],['bf16','fp32',1],['tf32','fp32',2],['fp16','fp32',3],['e5m2','fp16',4],['e4m3','fp16',4]];
  const ROWS=ORDER.map(([k,src,s],j)=>{const f=FP.F[k],v=FP.rnd(LOSS,f);return {k,src,s,f,v,bits:FP.enc(v,f).bits,rel:Math.abs(v-LOSS)/LOSS,z:-3.25+j*1.3}});
  const BY=Object.fromEntries(ROWS.map(r=>[r.k,r]));
  window.NC_FMT=ROWS.map(r=>({k:r.k,bits:r.bits,v:r.v,rel:r.rel})); // read by check_stages.mjs
  const BW=.3,x=i=>(i-15.5)*BW,X0=x(0)-BW/2;
  const field=(f,i)=>i===0?'s':i<=f.e?'e':'m';
  const fcol=(P,t)=>t==='s'?P.c2:t==='e'?P.c1:P.c3;
  const name=r=>r.f.name.replace('FP8 ','FP8 ');
  // the centre of a field of a row, for flows
  const fc=(r,t)=>{const f=r.f,a=t==='s'?0:t==='e'?1:1+f.e,b=t==='s'?0:t==='e'?f.e:f.e+f.m;return x((a+b)/2)};
  function row(R,r,a,o){o=o||{};const P=R.P,f=r.f;
    for(let i=0;i<f.bits;i++){const t=field(f,i),one=r.bits[i]==='1',c=fcol(P,t),ai=a*(o.dimFrom!=null&&i>=o.dimFrom?.18:1);
      R.box([x(i),0,r.z],[BW*.8,one?.4:.05,.7],{fill:one?c:mix(P.paper,c,.28),a:ai,lw:.6,shadow:one})}
    R.label([X0-.12,0,r.z],name(r),{al:'right',dx:-6,mono:true,fs:12.5,b:1,a:Math.max(a,.35)});
  }
  function draw(R,k,e){const P=R.P;R.grid(-6,6,-4.4,4.4,.5);
    ROWS.forEach(r=>{let a;
      if(r.k==='fp32')a=k===0?1:k===1||k===2||k===3?.95:k===4?.3:1;
      else if(r.s===k)a=e;else if(r.s<k)a=k===5?1:(k===4&&r.k==='fp16')?.95:.3;else a=0;
      if(a<=.01)return;
      // while a row is built from float32, the float32 bits it drops are dimmed
      const tgt=ROWS.find(q=>q.s===k&&q.src==='fp32'),dim=r.k==='fp32'&&tgt&&tgt.k!=='fp16'?tgt.f.bits:null;
      row(R,r,a,{dimFrom:dim});
      // the value it stores, or at the last step its range and gap
      const end=x(r.f.bits-1)+BW*.6;
      if(k<5)R.label([end,0,r.z],'= '+FP.show(r.v,17),{al:'left',dx:6,mono:true,fs:12.5,a:a,c:P.ink,grp:'v'});
      else R.label([end,0,r.z],'max '+(r.f.max<1e6?r.f.max.toLocaleString('en'):FP.show(r.f.max,2))+' · ε 2⁻'+String(r.f.m).split('').map(c=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[+c]).join(''),{al:'left',dx:6,mono:true,fs:12,a:e,c:P.mute,grp:'v'})});
    // field names above float32 at the first step
    if(k===0){const r=BY.fp32;[['sign','s',-30],['exponent · 8 bits','e',-14],['mantissa · 23 bits','m',-14]].forEach(([t,f,dy])=>R.label([fc(r,f),.4,r.z],t,{fs:12.5,b:1,c:fcol(P,f),dy,a:e}))}
    // flows: the kept bits stream from the source row into the row being built
    const tg=ROWS.filter(q=>q.s===k&&k>=1&&k<=4);
    tg.forEach(t=>{const s=BY[t.src],a=Math.min(1,e*1.6);['s','e','m'].forEach(f=>{const c=fcol(P,f);
      R.flowArc([fc(s,f),.4,s.z],[fc(t,f),.4,t.z],.55,{c,a:a*.9,r:.06,speed:1.3,n:f==='m'?9:f==='e'?6:3})});
    });
    if(k===1){const r=BY.fp32,xc=(x(15)+x(16))/2;R.glass([xc,0,r.z-.55],[0,.7,0],[0,0,1.1],{c:P.bad,a:e*.8,nu:1,nv:2});R.label([x(24),.36,r.z],'16 bits dropped',{fs:12,c:P.bad,dy:-14,a:e})}
  }
  const Z=j=>-3.25+j*1.3,B=(j0,j1)=>[[-5.2,0,Z(j0)-.5],[5.3,.5,Z(j1)+.5]];
  const full={cam:[.14,.95],bounds:B(0,5)};
  S3.stage({id:'stg-fmt',list:'sx-fmt',fig:'The loss 2.4076 in six formats, bit by bit',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:5200,draw,
    // each step moves in close on the rows it is about
    view:k=>k===0?{cam:[.1,.7],bounds:B(0,0)}:k===1?{cam:[.12,.85],bounds:B(0,1)}:k===2?{cam:[.13,.9],bounds:B(0,2)}:k===3?{cam:[.14,.92],bounds:B(0,3)}:k===4?{cam:[.14,.9],bounds:B(3,5)}:full,
    margin:w=>w<520?[16,10,16,64]:[18,170,18,100]});
})();
