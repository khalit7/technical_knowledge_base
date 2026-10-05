// ---- Part 2, Roofline tab: measured roofs and kernels, plus an LLM-decode point swept over batch size ----
(function(){
  const X=window.CBX,CB=X.CB,f=X.fmt,$=id=>document.getElementById(id);
  if(!$('cb-rf-chart'))return;
  const V=CB.roof.v,PS=[0.5,1,3,8,14,32,70],BS=[1,2,4,8,16,32,64,128,256,512];
  const st={th:8,w:2,p:3,b:0};
  const peak=()=>st.th===1?V.p1.runs[0]:V.p8.runs[0],bw=()=>st.th===1?V.bw1.runs[0]:V.bw8.runs[0];
  function pts(){const t=st.th;return [
    {n:'dot product, DRAM',I:0.25,g:2/CB.dot.v.dram_neon.runs[0],c:'var(--c6)',show:t===1},
    {n:'matvec (decode, fp32)',I:0.5,g:t===1?V.mv1.runs[0]:V.mv8.runs[0],c:'var(--c2)',show:true},
    {n:'matmul 512, tiled',I:85,g:t===1?V.mm1.runs[0]:V.mm8.runs[0],c:'var(--c4)',show:true}].filter(p=>p.show)}
  function llm(){const B=BS[st.b],w=st.w,P=PS[st.p]*1e9,I=2*B/w,att=Math.min(peak(),I*bw());
    const tm=Math.max(P*w/(bw()*1e9),2*P*B/(peak()*1e9));return {B,I,att,tps:B/tm,bound:I*bw()<peak()?'memory':'compute',gb:P*w/1e9}}
  let geo=null;
  function draw(){const el=$('cb-rf-chart'),W=Math.max(300,el.clientWidth||600),H=Math.round(Math.min(380,Math.max(250,W*0.55)));
    const m={l:46,r:10,t:10,b:36},iw=W-m.l-m.r,ih=H-m.t-m.b,lx0=Math.log10(0.05),lx1=Math.log10(500),ly0=Math.log10(0.5),ly1=Math.log10(1500);
    const xs=I=>m.l+(Math.log10(I)-lx0)/(lx1-lx0)*iw,ys=g=>m.t+ih-(Math.log10(g)-ly0)/(ly1-ly0)*ih;
    let s='';
    [0.1,1,10,100].forEach(v=>{s+='<line x1="'+xs(v)+'" x2="'+xs(v)+'" y1="'+m.t+'" y2="'+(m.t+ih)+'" style="stroke:var(--line)"/>'+RD.t(xs(v),m.t+ih+14,v,{a:'middle',fs:10})});
    [1,10,100,1000].forEach(v=>{s+='<line x1="'+m.l+'" x2="'+(m.l+iw)+'" y1="'+ys(v)+'" y2="'+ys(v)+'" style="stroke:var(--line)"/>'+RD.t(m.l-4,ys(v)+3.5,v,{a:'end',fs:10})});
    s+=RD.t(m.l+iw/2,H-4,'arithmetic intensity, FLOPs per byte (log)',{a:'middle',fs:10.5,fill:'var(--mute)'});
    s+='<text transform="translate(11,'+(m.t+ih/2)+') rotate(-90)" text-anchor="middle" font-size="10.5" style="fill:var(--mute)">GFLOP/s (log)</text>';
    const P=peak(),B=bw(),ridge=P/B,x0=0.05;
    s+='<path d="M'+xs(x0)+','+ys(x0*B)+'L'+xs(ridge)+','+ys(P)+'L'+xs(500)+','+ys(P)+'" style="fill:none;stroke:var(--ink);stroke-width:2.2"/>';
    s+=RD.t(xs(ridge)+6,ys(P)-6,'peak '+f(P,0)+' GFLOP/s',{fs:10.5});
    const ang=-Math.atan2(ys(x0)-ys(x0*10),xs(x0*10)-xs(x0))*180/Math.PI;
    s+='<text transform="translate('+(xs(0.12))+','+(ys(0.12*B)-6)+') rotate('+ang+')" font-size="10.5">'+f(B,0)+' GB/s</text>';
    s+='<line x1="'+xs(ridge)+'" x2="'+xs(ridge)+'" y1="'+ys(P)+'" y2="'+(m.t+ih)+'" style="stroke:var(--mute);stroke-dasharray:3 3"/>'+RD.t(xs(ridge)+3,m.t+ih-4,'ridge '+f(ridge,1),{fs:10,fill:'var(--mute)'});
    pts().forEach(p=>{s+='<circle cx="'+xs(p.I)+'" cy="'+ys(p.g)+'" r="5" style="fill:'+p.c+';stroke:var(--bg);stroke-width:1.5"/>'+RD.t(xs(p.I)+(p.I>20?-8:8),ys(p.g)+(p.I>20?16:4),p.n,{a:p.I>20?'end':'start',fs:10.5})});
    const L=llm();s+='<circle cx="'+xs(L.I)+'" cy="'+ys(L.att)+'" r="7" style="fill:none;stroke:var(--bad);stroke-width:2.5"/>'+RD.t(xs(L.I),ys(L.att)-11,'decode, batch '+L.B,{a:L.I>60?'end':'middle',fs:10.5,fill:'var(--bad)',w:600});
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Roofline">'+s+'</svg>'}
  function info(){const L=llm();$('cb-rf-pv').textContent=PS[st.p];$('cb-rf-bv').textContent=BS[st.b];
    $('cb-rf-cap').innerHTML='<b>Batch '+L.B+'</b>: each weight read from memory serves '+L.B+' multiply-add'+(L.B>1?'s':'')+', so I = 2 x '+L.B+' / '+st.w+' = '+f(L.I,2)+' FLOPs per byte: <b>'+L.bound+'-bound</b> on '+st.th+' thread'+(st.th>1?'s':'')+' (ridge at '+f(peak()/bw(),1)+'). '+(L.bound==='memory'?'Adding sequences is almost free: the weights are read anyway.':'Past the ridge, more sequences cost arithmetic time: throughput stops rising.');
    $('cb-rf-stats').innerHTML=RD.stat('Weights read per step',f(L.gb,1)+' GB',PS[st.p]+' B parameters')+RD.stat('Attainable',f(L.att,0)+' GFLOP/s','of '+f(peak(),0)+' peak')+RD.stat('Ceiling, all sequences',f(L.tps,1)+' tokens/s','upper bound')+RD.stat('Ceiling per sequence',f(L.tps/L.B,2)+' tokens/s','upper bound')}
  function all(){draw();info()}
  const opt={card:'cb-rf-card',ctl:'cb-rf-ctl',n:BS.length,ms:1300,label:'Batch size step',draw(i){st.b=i;$('cb-rf-b').value=i;all()}};
  const A=RD.anim(opt);
  RD.seg($('cb-rf-th'),v=>{st.th=+v;all()});
  $('cb-rf-fmt').addEventListener('change',e=>{st.w=+e.target.value;all()});
  $('cb-rf-p').addEventListener('input',e=>{st.p=+e.target.value;all()});
  $('cb-rf-b').addEventListener('input',e=>{A.go(+e.target.value)});
  X.onRender('t-cb-roof',all);X.onResize('t-cb-roof',draw);
})();
