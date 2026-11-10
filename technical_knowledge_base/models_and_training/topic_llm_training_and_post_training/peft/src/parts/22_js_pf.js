// ---- Page helpers PF (colours, number formats), shared by the canvases, SVGs and scenes (from the 2026-10-23 matrix animation) ----
window.PF=(function(){
  // colour helpers shared by the page's canvases and SVGs
  const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const rgb=h=>{h=h.replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16);return[(n>>16)&255,(n>>8)&255,n&255]};
  const mix=(a,b,t)=>[0,1,2].map(i=>Math.round(a[i]+(b[i]-a[i])*t));
  const fmt=n=>{const a=Math.abs(n);return a>=1e9?(n/1e9).toFixed(a>=1e10?1:2)+'B':a>=1e6?(n/1e6).toFixed(a>=1e7?1:2)+'M':a>=1e4?(n/1e3).toFixed(1)+'K':Math.round(n).toLocaleString('en-US')};
  const bytes=n=>n>=1e9?(n/1e9).toFixed(2)+' GB':n>=1e6?(n/1e6).toFixed(n>=1e7?1:2)+' MB':n>=1e3?(n/1e3).toFixed(n>=1e4?0:1)+' KB':Math.round(n)+' B';
  const comma=n=>Math.round(n).toLocaleString('en-US');
  return {css,rgb,mix,fmt,bytes,comma};
})();
