// ---- This page's helpers on top of the skill template (22_js_rd_common.js): number formatting, a diverging colour scale (D4RL tab) and the one-screen table's row jumps ----
// numbers with a true minus sign; percentages; powers of ten with a superscript exponent
RD.pct=(v,n)=>(100*v).toFixed(n==null?1:n)+'%';
RD.e=(v,n)=>{if(v===0)return '0';const a=Math.abs(v),ex=Math.floor(Math.log10(a)),m=v/Math.pow(10,ex);return m.toFixed(n?n-1:1)+' &times; 10<sup>'+(ex<0?'&minus;'+(-ex):ex)+'</sup>'};
RD.n=(v,d)=>{const s=(+v).toFixed(d==null?2:d);return /^-0?\.?0*$/.test(s)?s.slice(1):s.replace('-','−')};
RD.sg=(v,d)=>(v>0?'+':'')+RD.n(v,d);
RD.colorScale=(v,lo,hi)=>{// diverging: negative orange, positive blue, via color-mix on CSS variables
  const t=Math.max(-1,Math.min(1,v>=0?(hi>0?v/hi:0):(lo<0?-v/lo:0)));const p=Math.round(Math.abs(t)*70);
  return 'color-mix(in srgb, '+(t>=0?'var(--c1)':'var(--c2)')+' '+p+'%, var(--bg))'};
// clicking a row of the one-screen table jumps to its section
(function(){
  const tb=document.getElementById('rd-spine');
  if(tb)tb.addEventListener('click',e=>{const r=e.target.closest('tr[data-go]');if(!r||e.target.closest('a'))return;const s=document.getElementById(r.dataset.go);if(s)s.scrollIntoView({behavior:RD.RM?'auto':'smooth',block:'start'})});
})();
