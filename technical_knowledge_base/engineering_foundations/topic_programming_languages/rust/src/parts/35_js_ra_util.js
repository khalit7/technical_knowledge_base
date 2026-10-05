// ---- Part 1 (ra) helpers: highlighting, recorded-output blocks, redraw registration on this part's own tab ids ----
window.RA=(function(){
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const KW=new Set('as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while def import from print lambda None True False try except yield class'.split(' '));
  const TOK=/(\/\/[^\n]*|#(?![\[!])[^\n]*)|(#!?\[[^\]\n]*\])|("(?:\\.|[^"\\\n])*"|b'(?:\\.|[^'\\\n])'|'(?:\\.|[^'\\\n])'(?!\w))|('[a-z_]\w*)|([A-Za-z_]\w*!?)|([\s\S])/g;
  function hl(src,py){let o='';src.replace(TOK,(m,c,a,s,l,w)=>{
    if(c!==undefined){if((c[0]==='#'&&!py)||(c[0]==='/'&&py))o+=esc(c);else o+='<span class="ra-cm">'+esc(c)+'</span>'}
    else if(a!==undefined)o+='<span class="ra-at">'+esc(a)+'</span>';
    else if(s!==undefined)o+='<span class="ra-st">'+esc(s)+'</span>';
    else if(l!==undefined)o+='<span class="ra-lt">'+esc(l)+'</span>';
    else if(w!==undefined)o+=KW.has(w)?'<span class="ra-kw">'+w+'</span>':(w.endsWith('!')?'<span class="ra-mac">'+esc(w)+'</span>':esc(w));
    else o+=esc(m);return m});return o}
  function code(src,name,py){return '<div class="ra-src">'+(name?'<div class="ra-fn">'+esc(name)+'</div>':'')+'<pre class="ra-code">'+hl(src,py)+'</pre></div>'}
  function out(t,key){const L=t.replace(/\n$/,'').split('\n');let cmd='';if(L[0].startsWith('$ '))cmd=L.shift();
    const bad=L.some(l=>l.startsWith('[exit code'));
    return '<pre class="ra-out'+(bad?' ra-bad':'')+'"'+(key?' data-ra-out="'+esc(key)+'"':'')+'>\n'+(cmd?'<span class="ra-cmd">'+esc(cmd)+'</span>\n':'')+esc(L.join('\n'))+'</pre>'}
  // what a recorded run did: 'compile' (refused), 'panic', 'warn' (compiled with warnings) or 'ok'
  function verdict(t){if(/^error(\[E\d+\])?:/m.test(t))return 'compile';if(/panicked at/.test(t))return 'panic';if(/^warning/m.test(t))return 'warn';return 'ok'}
  function stdout(t){return t.replace(/\n$/,'').split('\n').filter(l=>!l.startsWith('$ ')).join('\n')}
  function onTab(id,f){(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[id]=window.TAB_RENDER[id]||[]).push(f)}
  function onResize(id,f){let t=0;addEventListener('resize',()=>{const r=document.getElementById(id);if(!r||r.hidden||r.offsetParent===null)return;clearTimeout(t);t=setTimeout(f,80)})}
  return {esc,hl,code,out,verdict,stdout,onTab,onResize};
})();
