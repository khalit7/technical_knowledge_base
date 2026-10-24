// ---- page helpers: colours, number formats, SVG ----
window.PF=(function(){
  const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const comma=n=>Math.round(n).toLocaleString('en-US');
  const f1=n=>(Math.round(n*10)/10).toFixed(1);
  const pct=(n,d)=>(n*100).toFixed(d==null?1:d)+'%';
  const sci=n=>{if(!isFinite(n)||n<=0)return '0';const e=Math.floor(Math.log10(n)),m=n/Math.pow(10,e);return m.toFixed(1)+'e'+e};
  const tokB=b=>b>=1000?(b/1000).toFixed(b%1000?1:0)+'T':Math.round(b)+'B';
  const svg=(w,h,lbl,inner)=>'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+RD.esc(lbl)+'">'+inner+'</svg>';
  const T=(x,y,s,a)=>'<text x="'+x+'" y="'+y+'"'+(a||'')+'>'+s+'</text>';
  return {css,comma,f1,pct,sci,tokB,svg,T};
})();
