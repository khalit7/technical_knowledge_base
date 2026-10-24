// ---- This page's helpers on top of the skill template's RD (21_js_rd_common.js) ----
// onRender and onResize take a tab id here (the Real rollouts tab registers its own); RD.anim still never autoplays.
RD.onRender=(f,tab)=>{tab=tab||'t-read';(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[tab]=window.TAB_RENDER[tab]||[]).push(f)};
// ---- helpers shared by this page's Reading visuals ----
// redraw on window resize only while the Reading tab is visible (the tab bar fires resize on every tab switch)
RD.onResize=(f,tab)=>{let tm=0;addEventListener('resize',()=>{const t=document.getElementById(tab||'t-read');if(!t||t.hidden||t.offsetParent===null)return;clearTimeout(tm);tm=setTimeout(f,60)})};
// numbers with a true minus sign; percentages; powers of ten with a superscript exponent
RD.pct=(v,n)=>(100*v).toFixed(n==null?1:n)+'%';
RD.e=(v,n)=>{if(v===0)return '0';const a=Math.abs(v),ex=Math.floor(Math.log10(a)),m=v/Math.pow(10,ex);return m.toFixed(n?n-1:1)+' &times; 10<sup>'+(ex<0?'&minus;'+(-ex):ex)+'</sup>'};
RD.n=(v,d)=>{const s=(+v).toFixed(d==null?2:d);return /^-0?\.?0*$/.test(s)?s.slice(1):s.replace('-','−')};
RD.sg=(v,d)=>(v>0?'+':'')+RD.n(v,d);
RD.t=(x,y,s,o)=>{o=o||{};return '<text x="'+x+'" y="'+y+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' font-size="'+Math.max(10.5,o.fs||11)+'"'+(o.fill?' fill="'+o.fill+'"':'')+(o.w?' font-weight="'+o.w+'"':'')+'>'+s+'</text>'};
RD.colorScale=(v,lo,hi)=>{// diverging: negative orange, positive blue, via color-mix on CSS variables
  const t=Math.max(-1,Math.min(1,v>=0?(hi>0?v/hi:0):(lo<0?-v/lo:0)));const p=Math.round(Math.abs(t)*70);
  return 'color-mix(in srgb, '+(t>=0?'var(--c1)':'var(--c2)')+' '+p+'%, var(--bg))'};
