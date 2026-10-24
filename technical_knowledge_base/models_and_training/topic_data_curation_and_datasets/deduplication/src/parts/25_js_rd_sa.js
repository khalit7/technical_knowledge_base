// ---- Section 6: a word-level suffix array of two tiny illustrative pages (static: computed once, nothing moves) ----
(function(){
  const el=document.getElementById('rd-sa-list'),docs=document.getElementById('rd-sa-docs');if(!el)return;
  const esc=RD.esc,L=4;
  const A='fresh bread every day we use cookies to improve your experience',B='cheap flights to rome we use cookies to improve your experience';
  // one token stream with a unique separator after each page, so no match can cross a boundary
  const tok=[],doc=[];A.split(' ').forEach(w=>{tok.push(w);doc.push('A')});tok.push('$A');doc.push('');B.split(' ').forEach(w=>{tok.push(w);doc.push('B')});tok.push('$B');doc.push('');
  const cmp=(i,j)=>{while(i<tok.length&&j<tok.length){if(tok[i]!==tok[j])return tok[i]<tok[j]?-1:1;i++;j++}return (tok.length-i)-(tok.length-j)};
  const sa=[...tok.keys()].filter(i=>!tok[i].startsWith('$')).sort(cmp);
  const lcp=(i,j)=>{let n=0;while(i+n<tok.length&&j+n<tok.length&&tok[i+n]===tok[j+n]&&!tok[i+n].startsWith('$'))n++;return n};
  const show=i=>{const w=[];for(let k=i;k<tok.length&&w.length<8;k++){if(tok[k].startsWith('$')){w.push('<span class="mute">|</span>');break}w.push(esc(tok[k]))}return w.join(' ')};
  docs.innerHTML='<b>A</b>: '+esc(A)+'<br><b>B</b>: '+esc(B);
  let h='<div class="h"><span>#</span><span>doc</span><span>suffix (first words)</span><span>LCP</span></div>';
  sa.forEach((i,r)=>{const l=r?lcp(sa[r-1],i):0,m=l>=L||(r+1<sa.length&&lcp(i,sa[r+1])>=L);
    h+='<div'+(m?' class="m"':'')+'><span>'+(r+1)+'</span><span>'+doc[i]+'</span><span>'+show(i)+'</span><span>'+(l>=L?'<b>'+l+'</b>':l)+'</span></div>'});
  el.innerHTML=h;
})();
