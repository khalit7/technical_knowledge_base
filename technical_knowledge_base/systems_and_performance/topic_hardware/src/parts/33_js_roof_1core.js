// ---- Roofline lab (t-roof): model functions (checked against src/roof/code/recompute.py), helpers ----
window.ROOFX=(function(){
  const D=window.ROOFD;
  const BYTES={fp32:4,tf32:4,bf16:2,fp16:2,fp8:1,fp4:0.5};
  const PNAME={fp32:'FP32',tf32:'TF32',bf16:'BF16',fp16:'FP16',fp8:'FP8',fp4:'FP4'};
  // flops and bytes moved to and from main memory, each operand read once and each output written once
  function opCost(op,p,s){
    if(op==='vadd')return [p.n,3*p.n*s];
    if(op==='softmax')return [5*p.r*p.c,2*p.r*p.c*s];
    if(op==='linear')return [2*p.M*p.K*p.N,s*(p.M*p.K+p.K*p.N+p.M*p.N)];
    if(op==='attn_dec')return [4*p.B*p.H*p.L*p.d,s*(2*p.B*Math.floor(p.H/p.g)*p.L*p.d+2*p.B*p.H*p.d)];
    if(op==='attn_pre')return [4*p.H*p.L*p.L*p.d,4*s*p.H*p.L*p.d];
    throw new Error('op '+op);
  }
  function roof(chip,prec,ai){
    const P=chip.peaks[prec]*1e3,bw=chip.bw,att=Math.min(P,ai*bw);
    return {P:P,bw:bw,ridge:P/bw,att:att,bound:ai*bw<P?'memory':'compute'};
  }
  function evalCase(chipId,prec,op,p){
    const c=D.chips.find(x=>x.id===chipId),fb=opCost(op,p,BYTES[prec]),ai=fb[0]/fb[1],r=roof(c,prec,ai);
    return {flops:fb[0],bytes:fb[1],ai:ai,att:r.att,ridge:r.ridge,bound:r.bound,t_s:Math.max(fb[0]/(r.P*1e9),fb[1]/(r.bw*1e9))};
  }
  const sig=(x,n)=>{if(!isFinite(x))return '?';if(x===0)return '0';const d=Math.max(0,(n||3)-1-Math.floor(Math.log10(Math.abs(x))));return (+x.toFixed(Math.min(d,6))).toLocaleString('en-US',{maximumFractionDigits:Math.min(d,6)})};
  const fF=g=>g>=1e6?sig(g/1e6)+' PFLOP/s':g>=1e3?sig(g/1e3)+' TFLOP/s':sig(g)+' GFLOP/s';
  const fB=g=>g>=1e3?sig(g/1e3)+' TB/s':sig(g)+' GB/s';
  const fT=s=>s>=1?sig(s)+' s':s>=1e-3?sig(s*1e3)+' ms':sig(s*1e6)+' µs';
  const fBy=b=>b>=1e9?sig(b/1e9)+' GB':b>=1e6?sig(b/1e6)+' MB':b>=1e3?sig(b/1e3)+' KB':sig(b)+' B';
  const pct=x=>(x*100>=10?Math.round(x*100):sig(x*100,2))+'%';
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const stat=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const onRender=f=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-roof']=window.TAB_RENDER['t-roof']||[]).push(f)};
  const caseBy=pre=>D.cases.find(c=>c.name.indexOf(pre)===0);
  const COL={m1g:'var(--c3)',m1c:'var(--c5)',h100:'var(--c1)',b200:'var(--c4)',rtx5090:'var(--c2)',mi300x:'var(--bad)',v6e:'var(--c6)',v7:'#d0679a'};
  // log-log roofline chart. o: {el, chips:[{chip,prec,main}], pts:[{ai,g,label,kind,lo,hi}], cur:{ai,g}, xr:[a,b], yr:[a,b]}
  function chart(o){
    const el=o.el,W=Math.max(280,el.clientWidth-12),H=Math.round(Math.min(420,Math.max(250,W*0.6)));
    const m={l:46,r:10,t:12,b:34},iw=W-m.l-m.r,ih=H-m.t-m.b;
    const lx=Math.log10,x0=lx(o.xr[0]),x1=lx(o.xr[1]),y0=lx(o.yr[0]),y1=lx(o.yr[1]);
    const X=a=>m.l+(lx(a)-x0)/(x1-x0)*iw,Y=g=>m.t+ih-(lx(g)-y0)/(y1-y0)*ih;
    let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="'+esc(o.aria||'Roofline chart')+'">';
    s+='<defs><clipPath id="'+el.id+'-cp"><rect x="'+m.l+'" y="'+m.t+'" width="'+iw+'" height="'+ih+'"/></clipPath></defs>';
    const yl=g=>g>=1e6?(g/1e6)+'P':g>=1e3?(g/1e3)+'T':g>=1?g+'G':(g*1e3)+'M';
    const xl=a=>a>=1000?(a/1000)+'k':String(a);
    for(let k=Math.ceil(y0);k<=Math.floor(y1);k++){const v=Math.pow(10,k),y=Y(v);s+='<line x1="'+m.l+'" x2="'+(W-m.r)+'" y1="'+y+'" y2="'+y+'" style="stroke:var(--line)"/><text x="'+(m.l-4)+'" y="'+(y+4)+'" text-anchor="end" font-size="10.5" style="fill:var(--mute)">'+yl(v)+'</text>'}
    const xstep=iw<420?2:1;
    for(let k=Math.ceil(x0);k<=Math.floor(x1);k++){const v=Math.pow(10,k),x=X(v);s+='<line x1="'+x+'" x2="'+x+'" y1="'+m.t+'" y2="'+(m.t+ih)+'" style="stroke:var(--line)"/>';if((k-Math.ceil(x0))%xstep===0)s+='<text x="'+x+'" y="'+(H-m.b+14)+'" text-anchor="middle" font-size="10.5" style="fill:var(--mute)">'+xl(v)+'</text>'}
    s+='<text x="'+(m.l+iw/2)+'" y="'+(H-4)+'" text-anchor="middle" font-size="11" style="fill:var(--mute)">arithmetic intensity (FLOPs per byte, log scale)</text>';
    s+='<text x="12" y="'+(m.t+ih/2)+'" text-anchor="middle" font-size="11" transform="rotate(-90 12 '+(m.t+ih/2)+')" style="fill:var(--mute)">FLOP/s (log)</text>';
    s+='<g clip-path="url(#'+el.id+'-cp)">';
    o.chips.forEach(r=>{const P=r.chip.peaks[r.prec]*1e3,bw=r.chip.bw,rid=P/bw,col=COL[r.chip.id]||'var(--ink)';
      const xa=o.xr[0],xb=o.xr[1];
      s+='<polyline fill="none" style="stroke:'+col+';stroke-width:'+(r.main?3:1.4)+';opacity:'+(r.main?1:.75)+'" points="'+X(xa)+','+Y(xa*bw)+' '+X(Math.min(rid,xb))+','+Y(Math.min(rid,xb)*bw)+' '+X(xb)+','+Y(P)+'"/>';
      if(r.main){s+='<line x1="'+X(rid)+'" x2="'+X(rid)+'" y1="'+Y(P)+'" y2="'+(m.t+ih)+'" style="stroke:'+col+';stroke-dasharray:3 3"/>';
        const lab='ridge '+sig(rid)+' FLOP/byte',tx=X(rid)+(X(rid)>m.l+iw*0.62?-4:4);
        s+='<text x="'+tx+'" y="'+(m.t+ih-6)+'" font-size="11" text-anchor="'+(X(rid)>m.l+iw*0.62?'end':'start')+'" style="fill:'+col+'">'+lab+'</text>'}
    });
    (o.pts||[]).forEach(p=>{const x=X(p.ai),y=Y(p.g);
      if(p.lo&&p.hi)s+='<line x1="'+x+'" x2="'+x+'" y1="'+Y(p.lo)+'" y2="'+Y(p.hi)+'" style="stroke:var(--good);stroke-width:2"/>';
      s+='<circle cx="'+x+'" cy="'+y+'" r="'+(p.r||4.5)+'" style="fill:'+(p.fill||'var(--good)')+';stroke:var(--bg);stroke-width:1"><title>'+esc(p.label)+'</title></circle>'});
    if(o.cur){const x=X(o.cur.ai),y=Y(o.cur.g);
      s+='<line x1="'+x+'" x2="'+x+'" y1="'+y+'" y2="'+(m.t+ih)+'" style="stroke:var(--ink);stroke-dasharray:2 3;opacity:.6"/>';
      s+='<circle cx="'+x+'" cy="'+y+'" r="7.5" style="fill:none;stroke:var(--ink);stroke-width:2.2"/><circle cx="'+x+'" cy="'+y+'" r="2.6" style="fill:var(--ink)"/>';
      if(o.cur.label){const right=x<m.l+iw*0.6;s+='<text x="'+(x+(right?11:-11))+'" y="'+Math.max(m.t+12,y-10)+'" font-size="11.5" font-weight="600" text-anchor="'+(right?'start':'end')+'">'+esc(o.cur.label)+'</text>'}}
    s+='</g><rect x="'+m.l+'" y="'+m.t+'" width="'+iw+'" height="'+ih+'" fill="none" style="stroke:var(--line)"/></svg>';
    el.innerHTML=s;
  }
  return {D:D,BYTES:BYTES,PNAME:PNAME,opCost:opCost,roof:roof,evalCase:evalCase,sig:sig,fF:fF,fB:fB,fT:fT,fBy:fBy,pct:pct,esc:esc,stat:stat,RM:RM,onRender:onRender,caseBy:caseBy,COL:COL,chart:chart};
})();
