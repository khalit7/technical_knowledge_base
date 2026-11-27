// ---- Figures of the Reading tab (prefix cf): the lab timeline (Table 1), the GPU estimates in three versions (Table 2),
// the toy grid (the report's Figures 1 to 3, rebuilt with the real generator) and the live replay on released rows.
// window.CF.normalAt is PyTorch's CUDA normal_ placement (Philox4x32-10, Box-Muller), checked against src/replay/replay_rows.py by check_page.mjs.
(function(){
  if(!window.RD||!window.ARTICLE)return;
  const $=id=>document.getElementById(id), t=RD.t, E=RD.esc, A=window.ARTICLE;
  const f32=Math.fround, fmt=n=>Number(n).toLocaleString('en-US');

  // ---------- Philox4x32-10 and PyTorch's placement ----------
  function mulhilo(a,b){const lo=Math.imul(a,b)>>>0,a0=a&0xffff,a1=a>>>16,b0=b&0xffff,b1=b>>>16;
    const p00=a0*b0,p01=a0*b1,p10=a1*b0,p11=a1*b1,mid=(p00>>>16)+(p01&0xffff)+(p10&0xffff);
    return [(p11+(p01>>>16)+(p10>>>16)+Math.floor(mid/65536))>>>0,lo]}
  function philox(c0,c1,c2,c3,k0,k1){
    for(let r=0;r<10;r++){const A0=mulhilo(0xD2511F53,c0),A1=mulhilo(0xCD9E8D57,c2);
      const n0=(A1[0]^c1^k0)>>>0,n1=A1[1],n2=(A0[0]^c3^k1)>>>0,n3=A0[1];c0=n0;c1=n1;c2=n2;c3=n3;
      k0=(k0+0x9E3779B9)>>>0;k1=(k1+0xBB67AE85)>>>0}
    return [c0,c1,c2,c3]}
  const INV=f32(Math.pow(2,-32)),TP=f32(INV*f32(6.2831855));
  // value at flat position pos when G threads filled the tensor from this seed (offset: values already drawn from the generator)
  function normalAt(pos,G,seed,offset){
    const th=pos%G,k=Math.floor(pos/G),lane=k%4,call=Math.floor((offset||0)/4)+Math.floor(k/4);
    const w=philox(call>>>0,Math.floor(call/4294967296)>>>0,th>>>0,Math.floor(th/4294967296)>>>0,seed>>>0,Math.floor(seed/4294967296)>>>0);
    const x=f32(lane<2?w[0]:w[2]),y=f32(lane<2?w[1]:w[3]);
    const u=f32(f32(x*INV)+f32(INV/2)),v=f32(f32(y*TP)+f32(TP/2)),s=f32(Math.sqrt(f32(-2*f32(Math.log(u)))));
    return lane%2===0?f32(f32(Math.sin(v))*s):f32(f32(Math.cos(v))*s)}
  function corr(a,b){const n=a.length;let ma=0,mb=0;for(let i=0;i<n;i++){ma+=a[i];mb+=b[i]}ma/=n;mb/=n;
    let sab=0,saa=0,sbb=0;for(let i=0;i<n;i++){const x=a[i]-ma,y=b[i]-mb;sab+=x*y;saa+=x*x;sbb+=y*y}return sab/Math.sqrt(saa*sbb)}
  window.CF={normalAt,philox,corr};

  const line=(x1,y1,x2,y2,c,w,d)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+c+'" stroke-width="'+(w||1)+'"'+(d?' stroke-dasharray="'+d+'"':'')+'/>';
  const SMC={132:'var(--c1)',148:'var(--c2)',152:'var(--c4)',0:'var(--dim)'};
  const SMN={132:'132 SMs, Hopper (H800, H100 or H200)',148:'148 SMs, B200 or B300',152:'152 SMs, GB200 or GB300',0:'mixed'};

  // ---------- Fig.: Table 1 as a timeline ----------
  const T1=(A.fig||{}).table1||[], LABS=['DeepSeek','Moonshot AI','MiniMax','Ant Group'];
  const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let timeSel=-1;
  function time(){
    const el=$('cf-time-svg');if(!el)return;const W=RD.width(el),nar=W<520,lw=nar?62:92,x0=lw+8,x1=W-14,lh=nar?60:64,top=10,H=top+LABS.length*lh+30;
    const m0=2024*12+10,m1=2026*12+11,X=m=>x0+(m-m0)/(m1-m0)*(x1-x0);
    let s='';
    [[2025,0],[2025,6],[2026,0],[2026,6]].forEach(([y,m])=>{const x=X(y*12+m);s+=line(x,top,x,top+LABS.length*lh,'var(--line)',1,'3 3')+t(x,H-8,(m?'Jul ':'Jan ')+y,{fs:11.5,a:'middle',fill:'var(--mute)'})});
    LABS.forEach((lab,li)=>{const cy=top+li*lh+lh/2;s+=line(x0,cy,x1,cy,'var(--line)',1.5)+t(4,cy+4,nar?lab.replace(' AI','').replace(' Group',''):lab,{fs:12,fill:'var(--ink)',w:600});
      const items=T1.map((d,i)=>[d,i]).filter(([d])=>d.lab===lab);
      items.forEach(([d,i],j)=>{const [y,m]=d.d.split('-').map(Number);let x=X(y*12+m-1);
        const same=items.filter(([e])=>e.d===d.d);if(same.length>1)x+=(same.findIndex(([e])=>e===d)?7:-7);
        const up=j%2===0,lab2=nar?d.s.replace('-Code','').replace('K3.1-Pro','K3.1').replace('-Pro','-P').replace('-Flash','-F').replace('Ling-','L'):d.s,sel=i===timeSel;
        s+='<g data-i="'+i+'" style="cursor:pointer"><circle cx="'+x.toFixed(1)+'" cy="'+cy+'" r="'+(sel?9:7)+'" fill="'+SMC[d.sm]+'"'+(d.sm===0?' stroke="var(--c2)" stroke-width="2"':'')+(sel?' stroke="var(--ink)" stroke-width="2.5"':'')+'/>'+
          '<circle cx="'+x.toFixed(1)+'" cy="'+cy+'" r="14" fill="transparent"/>'+
          t(x.toFixed(1),up?cy-13:cy+22,E(lab2),{fs:nar?11:12,a:'middle',fill:'var(--ink)'})+'</g>'})});
    el.innerHTML=RD.svg(W,H,s,'Twelve models from four labs on a time axis, coloured by the SM count their starting weights match');
    el.querySelectorAll('g[data-i]').forEach(g=>g.addEventListener('click',()=>{timeSel=+g.dataset.i;const d=T1[timeSel];
      $('cf-time-out').innerHTML='<b>'+E(d.m)+'</b> ('+MON[+d.d.split('-')[1]-1]+' '+d.d.split('-')[0]+'): '+E(SMN[d.sm])+'; '+E(d.ev)+'.';time()}));
  }

  // ---------- Fig.: Table 2 in its three versions ----------
  const T2=(A.fig||{}).table2;let gv=2;
  function gpu(){
    const el=$('cf-gpu-svg');if(!el||!T2)return;const W=RD.width(el),nar=W<520,lw=nar?96:132,x0=lw+6,x1=W-16,rh=34,top=8,H=top+T2.models.length*rh+30;
    const L=Math.log10,lo=L(100),hi=L(25000),X=v=>x0+(L(v)-lo)/(hi-lo)*(x1-x0),V=T2.versions[gv];
    let s='';
    [100,300,1000,3000,10000].forEach(v=>{const x=X(v);s+=line(x,top,x,top+T2.models.length*rh,'var(--line)',1,'3 3')+t(x,H-10,v>=1000?(v/1000)+'k':v,{fs:11.5,a:'middle',fill:'var(--mute)'})});
    T2.models.forEach((m,i)=>{const cy=top+i*rh+rh/2,nm=nar?m.replace('DeepSeek-','DS-').replace('-flash','').replace('-Flash','-F'):m;
      s+=t(4,cy+4,E(nm),{fs:12,fill:'var(--ink)',w:i===5?600:400});
      const r=V.range[i],b=V.best[i];
      if(!r){s+=t(x0+4,cy+4,'not in this version',{fs:11.5,fill:'var(--mute)'});return}
      s+='<rect class="rd-new" x="'+X(r[0]).toFixed(1)+'" y="'+(cy-3)+'" width="'+(X(r[1])-X(r[0])).toFixed(1)+'" height="6" rx="3" fill="var(--c2)" fill-opacity=".3"/>';
      if(b[0]===b[1])s+='<rect x="'+(X(b[0])-3).toFixed(1)+'" y="'+(cy-10)+'" width="6" height="20" rx="2" fill="var(--c2)"/>';
      else s+='<rect x="'+X(b[0]).toFixed(1)+'" y="'+(cy-8)+'" width="'+Math.max(6,X(b[1])-X(b[0])).toFixed(1)+'" height="16" rx="3" fill="var(--c2)"/>';
    });
    el.innerHTML=RD.svg(W,H,s,'Blackwell GPU estimates per training run, best estimate and range, on a log scale');
    const rows=T2.models.map((m,i)=>V.range[i]?m+' '+(V.best[i][0]===V.best[i][1]?fmt(V.best[i][0]):fmt(V.best[i][0])+' to '+fmt(V.best[i][1]))+' (range '+fmt(V.range[i][0])+' to '+fmt(V.range[i][1])+(V.days&&V.days[i]?', '+V.days[i]+' days':'')+')':null).filter(Boolean);
    $('cf-gpu-out').innerHTML='<b>'+E(V.label)+'</b>: '+E(V.note)+'. '+E(rows.join('; '))+'.';
  }
  RD.seg($('cf-gpu-v'),v=>{gv=+v;gpu()});

  // ---------- Fig.: the toy grid, real generator, toy thread count ----------
  const TOY={sm:6,seed:7,TPS:8,cols:24,rows:16,pub:null};
  function toyVals(G,seed){const n=TOY.cols*TOY.rows,a=new Array(n);for(let i=0;i<n;i++)a[i]=normalAt(i,G,seed,0);return a}
  function toy(){
    const el=$('cf-toy-svg');if(!el)return;const n=TOY.cols*TOY.rows;
    if(!TOY.pub)TOY.pub=toyVals(6*TOY.TPS,7);
    const G=TOY.sm*TOY.TPS,cand=toyVals(G,TOY.seed),W=RD.width(el),c=Math.floor(Math.min(30,(W-2)/TOY.cols)),H=c*TOY.rows+2;
    let s='',match=0;
    for(let i=0;i<n;i++){const v=cand[i],ok=v===TOY.pub[i],x=1+(i%TOY.cols)*c,y=1+Math.floor(i/TOY.cols)*c;if(ok)match++;
      const col=v<0?'var(--c1)':'var(--c2)',op=Math.min(1,.18+Math.abs(v)/2.2);
      s+='<rect x="'+x+'" y="'+y+'" width="'+(c-1)+'" height="'+(c-1)+'" rx="2" fill="'+(ok?col:'var(--dim)')+'" fill-opacity="'+(ok?op.toFixed(2):.35)+'"'+(i%G===0?' stroke="var(--ink)" stroke-width="2"':'')+'/>'}
    el.innerHTML=RD.svg(TOY.cols*c+2,H,s,'A 24 by 16 grid of toy weights regenerated with the chosen SM count and seed; matching cells coloured, others faded');
    $('cf-toy-out').innerHTML='Published: 6 SMs &times; 8 threads = 48, seed 7. Regenerated: '+TOY.sm+' SMs &times; 8 = '+G+' threads, seed '+TOY.seed+'. <b>'+match+' of '+n+' cells match ('+(100*match/n).toFixed(1)+'%)</b>; thread 0 writes every '+G+'th cell.';
  }
  RD.seg($('cf-toy-sm'),v=>{TOY.sm=+v;toy()});RD.seg($('cf-toy-seed'),v=>{TOY.seed=+v;toy()});

  // ---------- Fig.: the live replay on released rows ----------
  const RP=(A.replay||{}).rows||[],REP={m:0,sm:140,cache:{}};
  function rowOf(m){if(m._y)return m._y;const bin=atob(m.b64),dv=new DataView(new ArrayBuffer(4)),y=new Float64Array(m.n);
    for(let j=0;j<m.n;j++){const b=bin.charCodeAt(2*j)|(bin.charCodeAt(2*j+1)<<8);dv.setUint32(0,(b<<16)>>>0);y[j]=dv.getFloat32(0)}return m._y=y}
  function regen(m,sm){const out=new Float64Array(m.n),p0=m.row*m.d;for(let j=0;j<m.n;j++)out[j]=normalAt(p0+j,sm*2048,m.seed,m.offset);return out}
  function scan(mi){if(REP.cache[mi])return REP.cache[mi];const m=RP[mi],y=rowOf(m),r=[];for(let sm=100;sm<=160;sm++)r.push(corr(y,regen(m,sm)));return REP.cache[mi]=r}
  function rep(){
    const el=$('cf-rep-scan');if(!el||!RP.length)return;const m=RP[REP.m],r=scan(REP.m),W=RD.width(el),nar=W<520,x0=40,x1=W-10,y0=10,ph=nar?120:140,H=y0+ph+28;
    const X=sm=>x0+(sm-100)/60*(x1-x0),Y=v=>y0+(1-(v+0.1)/1.1)*ph;
    let s='';[0,0.5,1].forEach(v=>{s+=line(x0,Y(v),x1,Y(v),'var(--line)',1,v?'3 3':'')+t(x0-6,Y(v)+4,v,{fs:11.5,a:'end',fill:'var(--mute)'})});
    [100,108,120,132,148,152,160].forEach(sm=>{if(nar&&(sm===148||sm===108))return;s+=t(X(sm),H-8,sm,{fs:11.5,a:'middle',fill:[132,148,152].includes(sm)?'var(--ink)':'var(--mute)'})});
    let d='';r.forEach((v,i)=>{d+=(i?'L':'M')+X(100+i).toFixed(1)+' '+Y(v).toFixed(1)});
    s+='<path d="'+d+'" fill="none" stroke="var(--acc)" stroke-width="2"/>';
    s+=line(X(REP.sm),y0,X(REP.sm),y0+ph,'var(--c5)',2)+t(x0+4,y0+12,'r',{fs:12,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,'Correlation of the released row with the regenerated row for every SM count from 100 to 160');
    el.onclick=e=>{const b=el.getBoundingClientRect(),sm=Math.round(100+(e.clientX-b.left-x0)/(x1-x0)*60);if(sm>=100&&sm<=160){REP.sm=sm;$('cf-rep-sm').value=sm;rep()}};
    // scatter at the inspected SM count
    const sc=$('cf-rep-sc'),y=rowOf(m),g=regen(m,REP.sm),z=a=>{let mu=0,sd=0;for(const v of a)mu+=v;mu/=a.length;for(const v of a)sd+=(v-mu)*(v-mu);sd=Math.sqrt(sd/a.length);return Array.from(a,v=>(v-mu)/sd)};
    const zy=z(y),zg=z(g),S=Math.min(W,nar?260:300),c0=S/2,k=S/8;let q=line(0,c0,S,c0,'var(--line)')+line(c0,0,c0,S,'var(--line)')+line(0,S,S,0,'var(--line)',1,'4 4');
    for(let j=0;j<zy.length;j++){const px=c0+Math.max(-4,Math.min(4,zg[j]))*k,py=c0-Math.max(-4,Math.min(4,zy[j]))*k;q+='<circle cx="'+px.toFixed(1)+'" cy="'+py.toFixed(1)+'" r="1.7" fill="var(--c2)" fill-opacity=".55"/>'}
    q+=t(S-4,c0-6,'regenerated',{fs:11.5,a:'end',fill:'var(--mute)'})+t(c0+6,12,'published',{fs:11.5,fill:'var(--mute)'});
    sc.innerHTML='<div style="display:flex;justify-content:center">'+RD.svg(S,S,q,'Published values against regenerated values at the inspected SM count')+'</div>';
    const rr=r[REP.sm-100],n=m.n,best=r.indexOf(Math.max(...r)),wrong=Math.max(...r.map((v,i)=>i===best?-1:Math.abs(v)));
    $('cf-rep-smv').textContent=REP.sm;
    $('cf-rep-out').innerHTML='<b>'+E(m.name)+'</b>, row '+fmt(m.row)+', seed '+m.seed+(m.offset?' (offset '+fmt(m.offset)+')':'')+'. At '+REP.sm+' SMs: r = '+rr.toFixed(4)+' ('+(rr*Math.sqrt(n)).toFixed(1)+' sigma over '+fmt(n)+' values). Peak at <b>'+(100+best)+' SMs</b>, r = '+r[best].toFixed(5)+' ('+(r[best]*Math.sqrt(n)).toFixed(0)+' sigma); the best of the other 60 counts reaches |r| = '+wrong.toFixed(3)+' ('+(wrong*Math.sqrt(n)).toFixed(1)+' sigma).';
  }
  RD.seg($('cf-rep-m'),v=>{REP.m=+v;rep()});
  const sl=$('cf-rep-sm');if(sl)sl.addEventListener('input',e=>{REP.sm=+e.target.value;rep()});

  const all=()=>{time();gpu();toy();rep()};
  RD.onRender(all);RD.onResize(all);all();
})();
