// ---- Roofline lab (tab t-roof) ----
(function(){
  const U=window.TQU,D=U.D,G=U.G,$=id=>document.getElementById(id),E=RD.esc,gl=U.label;
  let gen='v5e',mode='layer';
  U.seg($('tq-r-gen'),U.GEN_ORDER.map(k=>[k,gl(k)]),gen,v=>{gen=v;draw()});
  U.seg($('tq-r-mode'),[['layer','7B layer'],['dec','Decode'],['run','Running example'],['own','Your matmul']],mode,v=>{mode=v;draw()});
  // generic roofline: points [{ai, rate, label, c}]
  function roof(host,pts,gsel){const W=Math.min(760,U.width(host)),H=Math.round(Math.min(320,W*0.6)),L=46,R=10,T=10,B=34;
    const x0=Math.log10(0.5),x1=Math.log10(3e4),y0=Math.log10(1e11),y1=Math.log10(1e16);
    const X=v=>L+(Math.log10(Math.max(v,0.5))-x0)/(x1-x0)*(W-L-R),Y=v=>T+(1-(Math.log10(Math.max(v,1e11))-y0)/(y1-y0))*(H-T-B);let s='';
    for(let e=0;e<=4;e++){const v=10**e;s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+T+'" y2="'+(H-B)+'" stroke="var(--line)"/>'+U.tx(X(v),H-B+14,v>=1000?(v/1000)+'k':String(v),{a:'middle',fs:10,fill:'var(--mute)'})}
    for(let e=11;e<=16;e++){const v=10**e;s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+U.tx(L-4,Y(v)+3,['100G','1T','10T','100T','1P','10P'][e-11],{a:'end',fs:10,fill:'var(--mute)'})}
    s+=U.tx((L+W-R)/2,H-4,'FLOPs per byte (log); height = FLOP/s at best (log)',{a:'middle',fs:10.5,fill:'var(--mute)'});
    U.GEN_ORDER.forEach(k=>{const g=G[k],c=U.GEN_COLOR[k],on=k===gsel,r=g.bf16/g.bw;s+='<polyline fill="none" stroke="'+c+'" stroke-width="'+(on?2.6:1.1)+'" opacity="'+(on?1:.45)+'" points="'+X(0.5)+','+Y(0.5*g.bw)+' '+X(r)+','+Y(g.bf16)+' '+X(3e4)+','+Y(g.bf16)+'"/>';
      if(on)s+=U.tx(X(3e4)-2,Y(g.bf16)-4,gl(k)+' bf16 peak',{a:'end',fs:10,fill:c,w:600})});
    pts.forEach((p,i)=>{s+='<circle cx="'+X(p.ai)+'" cy="'+Y(p.rate)+'" r="5" fill="'+(p.c||'var(--ink)')+'" stroke="var(--bg)" stroke-width="1.5"><title>'+E(p.label)+'</title></circle>';
      if(p.tag)s+=U.tx(X(p.ai)+7,Y(p.rate)+4+(i%2?9:0),p.tag,{fs:10})});
    host.innerHTML='<div class="tq-leg">'+U.GEN_ORDER.map(k=>'<span><i style="background:'+U.GEN_COLOR[k]+'"></i>'+gl(k)+'</span>').join('')+'</div>'+U.S(W,H,s,'Roofline')}
  const OPC=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)','var(--ink)'];
  // ---- 7B layer ----
  function layerOps(n,S,wb,fused){const M=U.L7;const Se=Math.min(S,n),nb=Math.max(1,Math.floor(n/Se)),H=M.Hq,dh=M.dh;
    const o=[['q, o projections',2,U.mm(1,n,M.D,M.Hq*dh,2,wb)],['k, v projections',2,U.mm(1,n,M.D,M.Hkv*dh,2,wb)],['MLP gate, up',2,U.mm(1,n,M.D,M.F,2,wb)],['MLP down',1,U.mm(1,n,M.F,M.D,2,wb)]];
    if(fused)o.push(['attention, fused (QK^T, softmax, xV)',1,{fl:4*nb*H*Se*Se*dh,by:nb*H*4*Se*dh*2}]);
    else{o.push(['attention scores QK^T',1,U.mm(nb*H,Se,dh,Se)]);o.push(['attention x V',1,U.mm(nb*H,Se,Se,dh)])}
    return o}
  function drawLayer(){const n=2**(+$('tq-r-n').value),S=+$('tq-r-s').value,wb=+$('tq-r-wd').value,fused=$('tq-r-flash').checked,g=G[gen];
    $('tq-r-nv').textContent=U.fmt(n);const ops=layerOps(n,S,wb,fused);let tot=0,fl=0,pts=[];
    const rows=ops.map((o,i)=>{const b=U.bound(o[2].fl,o[2].by,g.bf16,g.bw);tot+=b.t*o[1];fl+=o[2].fl*o[1];pts.push({ai:b.ai,rate:Math.min(g.bf16,b.ai*g.bw),label:o[0],tag:String(i+1),c:OPC[i]});return {o,b,i}});
    roof($('tq-r-lsvg'),pts,gen);
    U.table($('tq-r-ltab'),[['#',r=>'<span style="color:'+OPC[r.i]+'">&#9679;</span> '+(r.i+1)],['Operation',r=>E(r.o[0])],['Count',r=>r.o[1],'num'],['GFLOP each',r=>U.fmt(r.o[2].fl/1e9,2),'num'],['MB each',r=>U.fmt(r.o[2].by/1e6,1),'num'],
      ['FLOP/byte',r=>U.fmt(r.b.ai,1),'num'],['Bound',r=>r.b.compute?'compute':'<span class="tq-bad">memory</span>'],['Time, all copies',r=>U.time(r.b.t*r.o[1]),'num']],rows);
    const per=G[gen];$('tq-r-lcnt').innerHTML=RD.stat('Layer FLOPs',U.si(fl),'matmuls only')+RD.stat('Best layer time',U.time(tot),gl(gen)+', forward')+RD.stat('Of peak',U.pct(fl/per.bf16/tot),'whole layer')+
      RD.stat('32 layers, forward',U.time(tot*32),'x3 for fwd+bwd')+RD.stat('Ridge',U.fmt(per.bf16/per.bw),'FLOPs per byte')}
  // ---- decode ----
  const BS=[1,2,4,8,16,32,64,128,256,512,1024,2048];
  const PRE={l7:{m:{P:6738415616,VD:32000*4096},kv:L=>2*32*32*128*L,gen:'v5e',chips:1,T:'2048',w:2,src:'Llama 2 7B (MaxText config): 6.74B parameters, KV cache 2 x 32 layers x 32 KV heads x 128 x bytes per token.'},
    sb:{m:{P:30e9,VD:0},kv:L=>100e3*L/2,gen:'v5e',chips:16,T:'8192',w:1,src:'The scaling book\'s pop quiz (inference chapter): a 30B dense model in int8 with bf16 FLOPs on a v5e 4x4 slice, 100 kB of KV cache per token. Its answers: 2.5 ms at batch 4 and 21 ms at batch 256; set batch 4 or 256 to compare.'},
    l70:{m:{P:70553706496,VD:128256*8192},kv:L=>2*80*8*128*L,gen:'v6e',chips:8,T:'8192',w:2,src:'Llama 3.1 70B (MaxText config): 70.55B parameters, grouped-query attention with 8 KV heads, so 320 KiB of bf16 cache per token instead of 2.5 MiB with 64.'}};
  let pre='l7';
  function setPre(k){pre=k;const p=PRE[k];gen=p.gen;$('tq-r-gen').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.v===gen));
    $('tq-r-c').value=String(p.chips);$('tq-r-t').value=p.T;$('tq-r-dw').value=String(p.w);$('tq-r-kv').value=k==='sb'?'2':'2';$('tq-r-b').value=k==='sb'?'2':'0';$('tq-r-dsrc').textContent=p.src}
  $('tq-r-dpre').addEventListener('change',e=>{setPre(e.target.value);draw()});
  function drawDec(){const p=PRE[pre],B=BS[+$('tq-r-b').value],T=+$('tq-r-t').value,C=+$('tq-r-c').value,wb=+$('tq-r-dw').value,kvb=+$('tq-r-kv').value;
    $('tq-r-bv').textContent=U.fmt(B);const kvt=p.kv(kvb);const g=G[gen],r=U.decode(g,B,T,C,wb,kvt,p.m);
    const host=$('tq-r-dsvg'),W=Math.min(760,U.width(host)),H=Math.round(Math.min(300,W*0.56)),L=54,R=12,Tp=10,Bt=34;
    const curves=U.GEN_ORDER.map(k=>BS.map(b=>U.decode(G[k],b,T,C,wb,kvt,p.m)));const all=curves.flat().map(x=>x.tok);
    const y0=Math.log10(Math.min(...all)*0.8),y1=Math.log10(Math.max(...all)*1.25),X=b=>L+Math.log2(b)/11*(W-L-R),Y=v=>Tp+(1-(Math.log10(v)-y0)/(y1-y0))*(H-Tp-Bt);let s='';
    for(let e=Math.ceil(y0);e<=Math.floor(y1);e++){s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(10**e)+'" y2="'+Y(10**e)+'" stroke="var(--line)"/>'+U.tx(L-4,Y(10**e)+3,U.si(10**e),{a:'end',fs:10,fill:'var(--mute)'})}
    [1,4,16,64,256,1024].forEach(b=>{s+=U.tx(X(b),H-Bt+14,String(b),{a:'middle',fs:10,fill:'var(--mute)'})});
    s+=U.tx((L+W-R)/2,H-4,'batch (log); height = tokens per second, all chips (log); dashed = does not fit in HBM',{a:'middle',fs:10.5,fill:'var(--mute)'});
    U.GEN_ORDER.forEach((k,i)=>{const on=k===gen,c=U.GEN_COLOR[k];let seg='';curves[i].forEach((x,j)=>{const pt=X(BS[j]).toFixed(1)+','+Y(x.tok).toFixed(1);
        if(j)s+='<line x1="'+X(BS[j-1])+'" y1="'+Y(curves[i][j-1].tok)+'" x2="'+X(BS[j])+'" y2="'+Y(x.tok)+'" stroke="'+c+'" stroke-width="'+(on?2.6:1.1)+'" opacity="'+(on?1:.5)+'"'+(x.fits?'':' stroke-dasharray="4 3"')+'/>'});
      const last=curves[i][BS.length-1];s+=U.tx(W-R-2,Y(last.tok)-4,gl(k),{a:'end',fs:10,fill:c,w:on?600:400})});
    s+='<circle cx="'+X(B)+'" cy="'+Y(r.tok)+'" r="6" fill="'+U.GEN_COLOR[gen]+'" stroke="var(--bg)" stroke-width="1.5"/>';
    host.innerHTML=U.S(W,H,s,'Decode throughput against batch');
    $('tq-r-dcnt').innerHTML=RD.stat('Step time',U.time(r.step),'lower bound')+RD.stat('Attention (KV) part',U.time(r.att),'always memory-bound')+RD.stat('Weights part',U.time(r.lin),r.linCompute?'compute-bound':'memory-bound')+
      RD.stat('Tokens/s, all users',U.fmt(r.tok),'')+RD.stat('Tokens/s per user',U.fmt(1/r.step,1),'')+RD.stat('Memory needed',U.gb(r.mem),r.fits?'<span class="tq-ok">fits '+U.gb(g.hbm*C)+'</span>':'<span class="tq-bad">over '+U.gb(g.hbm*C)+'</span>')+
      RD.stat('KV per token',U.bytes(kvt),'')}
  // ---- running example ----
  function drawRun(){const by=+$('tq-r-rd').value,g=G[gen];let tot=0,totp=0,pts=[];
    const rows=D.ops.map((o,i)=>{const c=o.fwd+o.bwd,m=U.mm(o.b,o.m,o.k,o.n,by,by,by),b=U.bound(m.fl,m.by,g.bf16,g.bw);tot+=b.t*c;totp+=m.fl*c/g.bf16;
      pts.push({ai:b.ai,rate:Math.min(g.bf16,b.ai*g.bw),label:o.name,c:OPC[i%7]});return {o,c,m,b}});
    roof($('tq-r-rsvg'),pts,gen);
    U.table($('tq-r-rtab'),[['Matmul',r=>E(r.o.name)],['Count',r=>r.c,'num'],['FLOP/byte',r=>U.fmt(r.b.ai,1),'num'],['Bound',r=>r.b.compute?'compute':'<span class="tq-bad">memory</span>'],['Time, all copies',r=>U.time(r.b.t*r.c),'num']],rows);
    $('tq-r-rtab').insertAdjacentHTML('beforeend','<p class="small">All 99 matmuls: '+U.time(tot)+' at best on '+gl(gen)+' against '+U.time(totp)+' if they ran at bf16 peak <span class="der">calculated</span>. XLA\'s CPU cost analysis of the step counts '+U.fmt(D.cost.flops/1e9,2)+' GFLOP, of which the matmuls are '+U.fmt(D.dot_flops/1e9,2)+'.</p>')}
  // ---- own matmul ----
  function drawOwn(){const m=Math.max(1,+$('tq-r-m').value||1),k=Math.max(1,+$('tq-r-k').value||1),n=Math.max(1,+$('tq-r-nn').value||1),bb=Math.max(1,+$('tq-r-bb').value||1),dt=$('tq-r-od').value;
    const rows=U.GEN_ORDER.map(gk=>{const g=G[gk];let x,pk;
      if(dt==='bf16'){x=U.mm(bb,m,k,n);pk=g.bf16}else if(dt==='int8'){x=U.mm(bb,m,k,n,1,1,2);pk=g.int8}else if(dt==='w8'){x=U.mm(bb,m,k,n,2,1,2);pk=g.bf16}else{x=U.mm(bb,m,k,n,4,4,4);pk=g.bf16/6}
      const b=U.bound(x.fl,x.by,pk,g.bw);return {g,x,b,pk}});
    U.table($('tq-r-otab'),[['Generation',r=>E(r.g.name)],['FLOPs',r=>U.si(r.x.fl),'num'],['Bytes',r=>U.bytes(r.x.by),'num'],['FLOP/byte',r=>U.fmt(r.b.ai,1),'num'],['Ridge for this dtype',r=>U.fmt(r.pk/r.g.bw,1),'num'],
      ['Bound',r=>r.b.compute?'compute':'<span class="tq-bad">memory</span>'],['Best time',r=>U.time(r.b.t),'num',r=>r.b.t],['Of peak',r=>U.pct(r.b.frac),'num']],rows)}
  function draw(){$('tq-r-layer').hidden=mode!=='layer';$('tq-r-dec').hidden=mode!=='dec';$('tq-r-run').hidden=mode!=='run';$('tq-r-own').hidden=mode!=='own';
    if(mode==='layer')drawLayer();else if(mode==='dec')drawDec();else if(mode==='run')drawRun();else drawOwn()}
  ['tq-r-n','tq-r-s','tq-r-wd','tq-r-flash','tq-r-b','tq-r-t','tq-r-c','tq-r-dw','tq-r-kv','tq-r-rd','tq-r-m','tq-r-k','tq-r-nn','tq-r-bb','tq-r-od'].forEach(id=>{$(id).addEventListener('input',draw);$(id).addEventListener('change',draw)});
  setPre('l7');gen='v5e';
  U.onTab('t-roof',draw);U.onResize('t-roof',draw);
  window.TQ_ROOF={draw,setMode:v=>{mode=v;draw()}};
})();
