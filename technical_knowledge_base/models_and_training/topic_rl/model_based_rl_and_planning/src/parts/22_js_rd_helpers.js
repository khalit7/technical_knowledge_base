// ---- this page's number helpers for the Reading visuals (the controller and RD.onResize are in 21_js_rd_common.js) ----
RD.pct=(v,n)=>(100*v).toFixed(n==null?1:n)+'%';
RD.e=(v,n)=>{if(v===0)return '0';const a=Math.abs(v),ex=Math.floor(Math.log10(a)),m=v/Math.pow(10,ex);return m.toFixed(n?n-1:1)+' &times; 10<sup>'+(ex<0?'&minus;'+(-ex):ex)+'</sup>'};
RD.n=(v,d)=>{const s=(+v).toFixed(d==null?2:d);return /^-0?\.?0*$/.test(s)?s.slice(1):s.replace('-','−')};
RD.sg=(v,d)=>(v>0?'+':'')+RD.n(v,d);
// draw f when el first comes near the screen (heavy computations wait for the reader)
RD.lazy=(el,f)=>{if(!el)return;let done=false;const go=()=>{if(!done&&el.offsetParent!==null){done=true;f()}};
  if('IntersectionObserver' in window)new IntersectionObserver(es=>{if(es[es.length-1].isIntersecting)go()},{rootMargin:'300px'}).observe(el);else RD.onRender(go)};
// draw f when a closed <details> is opened (a closed block has no width)
RD.onOpen=(det,f)=>{if(det)det.addEventListener('toggle',()=>{if(det.open)f()})};
