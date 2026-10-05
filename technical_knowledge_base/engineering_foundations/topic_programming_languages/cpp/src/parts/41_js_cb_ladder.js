// ---- Part 2, Latency ladder tab: the measured pointer-chase curves, with a step-through "climb" ----
(function(){
  const X=window.CBX,CB=X.CB,f=X.fmt,$=id=>document.getElementById(id);
  if(!CB.ladder||!$('cb-ld-chart'))return;
  const R=CB.ladder.random,S=CB.ladder.seq,sizes=R[0].pts.map(p=>p[0]);
  const st={ylog:true,seq:true,all:true,cur:-1};
  const sz=kb=>kb>=1048576?(kb/1048576)+' GB':kb>=1024?(+(kb/1024).toFixed(1))+' MB':kb+' KB';
  const level=kb=>kb<=128?'L1 (128 KB per core)':kb<=12288?'L2 (12 MB per cluster), shared with other programs':kb<=49152?'past L2: system level cache and DRAM':'DRAM';
  const val=(run,kb)=>{const p=run.pts.find(q=>q[0]===kb);return p?p[1]:NaN};
  $('cb-ld-load').textContent=R.concat(S).map(r=>f(r.load,1)).join(', ');
  let geo=null;
  function draw(){
    const el=$('cb-ld-chart'),W=Math.max(300,el.clientWidth||600),H=Math.round(Math.min(380,Math.max(250,W*0.55)));
    const m={l:44,r:10,t:12,b:36},iw=W-m.l-m.r,ih=H-m.t-m.b;
    const x0=Math.log2(4),x1=Math.log2(1048576),xs=kb=>m.l+(Math.log2(kb)-x0)/(x1-x0)*iw;
    const ymax=st.ylog?300:140,ymin=st.ylog?0.5:0;
    const ys=v=>st.ylog?m.t+ih-(Math.log10(v)-Math.log10(ymin))/(Math.log10(ymax)-Math.log10(ymin))*ih:m.t+ih-(v-ymin)/(ymax-ymin)*ih;
    geo={xs,m,iw,W};
    let s='';
    // level bands
    const band=(a,b,lab,c)=>{s+='<rect x="'+xs(a)+'" y="'+m.t+'" width="'+(xs(b)-xs(a))+'" height="'+ih+'" style="fill:'+c+';opacity:.10"/>'+RDt(xs(a)+4,m.t+12,lab,{fs:10.5,fill:'var(--mute)'})};
    band(4,128,'L1','var(--c3)');band(128,12288,'L2','var(--c1)');band(12288,1048576,W<420?'SLC, DRAM':'SLC, then DRAM','var(--c2)');
    // axes
    const yt=st.ylog?[0.5,1,2,5,10,20,50,100,200]:[0,20,40,60,80,100,120,140];
    yt.forEach(v=>{s+='<line x1="'+m.l+'" x2="'+(m.l+iw)+'" y1="'+ys(v)+'" y2="'+ys(v)+'" style="stroke:var(--line)"/>'+RDt(m.l-4,ys(v)+3.5,v,{a:'end',fs:10})});
    const xt=W<500?[4,64,1024,16384,262144]:[4,16,64,256,1024,4096,16384,65536,262144,1048576];
    xt.forEach(kb=>{s+='<line x1="'+xs(kb)+'" x2="'+xs(kb)+'" y1="'+(m.t+ih)+'" y2="'+(m.t+ih+4)+'" style="stroke:var(--mute)"/>'+RDt(xs(kb),m.t+ih+15,sz(kb),{a:'middle',fs:10})});
    s+=RDt(m.l+iw/2,H-4,'buffer size (working set), log scale',{a:'middle',fs:10.5,fill:'var(--mute)'});
    s+='<text transform="translate(11,'+(m.t+ih/2)+') rotate(-90)" text-anchor="middle" font-size="10.5" style="fill:var(--mute)">ns per load</text>';
    const line=(run,col,dash,op)=>{let d='';run.pts.forEach((p,i)=>{d+=(i?'L':'M')+xs(p[0]).toFixed(1)+','+ys(Math.max(ymin||0.5,p[1])).toFixed(1)});
      s+='<path d="'+d+'" style="fill:none;stroke:'+col+';stroke-width:'+(op<1?1.2:2)+';opacity:'+op+'"'+(dash?' stroke-dasharray="5 4"':'')+'/>'};
    if(st.all)R.slice(1).forEach(r=>line(r,'var(--c2)',false,.45));
    line(R[0],'var(--c2)',false,1);
    if(st.seq){if(st.all)S.slice(1).forEach(r=>line(r,'var(--c1)',true,.45));line(S[0],'var(--c1)',true,1)}
    // legend
    s+='<g font-size="10.5"><line x1="'+(m.l+8)+'" x2="'+(m.l+26)+'" y1="'+(m.t+28)+'" y2="'+(m.t+28)+'" style="stroke:var(--c2);stroke-width:2"/>'+RDt(m.l+30,m.t+31,'random order',{fs:10.5})+
      (st.seq?'<line x1="'+(m.l+8)+'" x2="'+(m.l+26)+'" y1="'+(m.t+42)+'" y2="'+(m.t+42)+'" stroke-dasharray="5 4" style="stroke:var(--c1);stroke-width:2"/>'+RDt(m.l+30,m.t+45,'address order',{fs:10.5}):'')+'</g>';
    if(st.cur>=0){const kb=sizes[st.cur],v=val(R[0],kb);s+='<line x1="'+xs(kb)+'" x2="'+xs(kb)+'" y1="'+m.t+'" y2="'+(m.t+ih)+'" style="stroke:var(--ink);stroke-dasharray:2 3"/><circle cx="'+xs(kb)+'" cy="'+ys(v)+'" r="5" style="fill:var(--c2);stroke:var(--bg);stroke-width:2"/>';
      if(st.seq){const w=val(S[0],kb);s+='<circle cx="'+xs(kb)+'" cy="'+ys(w)+'" r="4" style="fill:var(--c1);stroke:var(--bg);stroke-width:2"/>'}}
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Load latency against buffer size">'+s+'</svg>';
  }
  function RDt(x,y,t,o){return RD.t(x,y,t,o)}
  function tipFor(i){const kb=sizes[i],r=R.map(q=>val(q,kb)),q=S.map(z=>val(z,kb));
    return '<b>'+sz(kb)+'</b>: random '+f(r[0])+' ns (runs '+r.map(v=>f(v)).join(', ')+'), address order '+f(q[0])+' ns; about '+f(r[0]*3.2,0)+' cycles at 3.2 GHz.'}
  $('cb-ld-chart').addEventListener('pointermove',e=>{if(!geo)return;const b=e.currentTarget.getBoundingClientRect(),sc=geo.W/b.width,x=(e.clientX-b.left)*sc;
    let bi=0,bd=1e9;sizes.forEach((kb,i)=>{const d=Math.abs(geo.xs(kb)-x);if(d<bd){bd=d;bi=i}});$('cb-ld-tip').innerHTML=tipFor(bi)});
  RD.seg($('cb-ld-y'),m=>{st.ylog=m==='log';draw()});
  $('cb-ld-seq').addEventListener('change',e=>{st.seq=e.target.checked;draw()});
  $('cb-ld-all').addEventListener('change',e=>{st.all=e.target.checked;draw()});
  const l1=val(R[0],16);
  const A=RD.anim({card:'cb-ld-card',ctl:'cb-ld-ctl',n:sizes.length,ms:900,label:'Buffer size step',draw(i){st.cur=i;draw();const kb=sizes[i],v=val(R[0],kb),w=val(S[0],kb);
    $('cb-ld-cap').innerHTML='<b>Step '+(i+1)+' of '+sizes.length+': a '+sz(kb)+' buffer.</b> It fits in: '+level(kb)+'. One unpredictable load takes '+f(v)+' ns, '+f(v/l1,0)+'x an L1 load; in address order '+f(w)+' ns, because the prefetcher fetches ahead.';
    $('cb-ld-stats').innerHTML=RD.stat('Buffer',sz(kb),f(kb*1024/128,0)+' cache lines')+RD.stat('Random order',f(v)+' ns','x'+f(v/l1,0)+' vs L1')+RD.stat('Address order',f(w)+' ns','prefetcher on')+RD.stat('Cycles per random load',f(v*3.2,0),'at 3.2 GHz')}});
  X.onRender('t-cb-ladder',()=>{draw();A.redraw()});X.onResize('t-cb-ladder',draw);
})();
