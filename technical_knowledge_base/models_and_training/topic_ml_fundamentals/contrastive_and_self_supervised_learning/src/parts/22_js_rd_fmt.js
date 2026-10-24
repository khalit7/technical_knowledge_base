// ---- page helpers: colours, number formats, SVG (kept from the page's old common part) ----
window.PF=(function(){
  const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const comma=n=>Math.round(n).toLocaleString('en-US');
  const svg=(w,h,lbl,inner)=>'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+RD.esc(lbl)+'">'+inner+'</svg>';
  const T=(x,y,s,a)=>'<text x="'+x+'" y="'+y+'"'+(a||'')+'>'+s+'</text>';
  // segmented buttons with aria-pressed: el holds <button data-KEY>; f(value, button)
  const seg=(el,key,f)=>el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    [...el.querySelectorAll('button')].forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b)});f(b.dataset[key],b)});
  return {css,comma,svg,T,seg};
})();
