// ---- This page's helpers on top of the template RD (21_js_rd_common.js) ----
// onRender and onResize take an optional tab id here (the Guard model scorecards tab registers its own render functions).
RD.onRender=(f,tab)=>{tab=tab||'t-read';(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[tab]=window.TAB_RENDER[tab]||[]).push(f)};
RD.onResize=(f,tab)=>{let t=0;addEventListener('resize',()=>{const r=document.getElementById(tab||'t-read');if(!r||r.hidden||r.offsetParent===null)return;clearTimeout(t);t=setTimeout(f,60)})};
// numbers with a true minus sign; percentages; powers of ten with a superscript exponent
RD.pct=(v,n)=>(100*v).toFixed(n==null?1:n)+'%';
RD.e=(v,n)=>{if(v===0)return '0';const a=Math.abs(v),ex=Math.floor(Math.log10(a)),m=v/Math.pow(10,ex);return m.toFixed(n?n-1:1)+' &times; 10<sup>'+(ex<0?'&minus;'+(-ex):ex)+'</sup>'};
RD.n=(v,d)=>{const s=(+v).toFixed(d==null?2:d);return /^-0?\.?0*$/.test(s)?s.slice(1):s.replace('-','−')};
RD.sg=(v,d)=>(v>0?'+':'')+RD.n(v,d);
RD.colorScale=(v,lo,hi)=>{// diverging: negative orange, positive blue, via color-mix on CSS variables
  const t=Math.max(-1,Math.min(1,v>=0?(hi>0?v/hi:0):(lo<0?-v/lo:0)));const p=Math.round(Math.abs(t)*70);
  return 'color-mix(in srgb, '+(t>=0?'var(--c1)':'var(--c2)')+' '+p+'%, var(--bg))'};
