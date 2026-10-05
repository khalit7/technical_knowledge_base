// ---- Part 2 (Python in 2026): shared helpers for t-pb-read, t-pb-ver, t-pb-lab ----
window.PBU=(function(){
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  // register a render function for one of this part's tabs (99_js_tabs.js calls them when the tab opens)
  function onTab(id,f){(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[id]=window.TAB_RENDER[id]||[]).push(f)}
  // colour one line of tool output
  function line(l){
    const e=esc(l);
    if(/^\[exit \d+\]$/.test(l))return '<span class="'+(l==='[exit 0]'?'k':'e')+'">'+e+'</span>';
    if(/(^|[^a-z])(error|Error|Traceback|FAILED|Fatal|failed)\b|^E\s|NotShareable|ModuleNotFound|SyntaxError|NameError|ImportError|AttributeError|ValueError/.test(l))return '<span class="e">'+e+'</span>';
    if(/[Ww]arning|^hint:|^Note:|^info:/.test(l))return '<span class="w">'+e+'</span>';
    if(/passed|All checks passed|Successfully built|in sync/.test(l))return '<span class="ok">'+e+'</span>';
    return e;
  }
  // a transcript block {cmd,out,rc} as terminal HTML
  function block(b){
    let h='<span class="c">'+esc(b.cmd)+'</span>\n';
    if(b.out)h+=b.out.split('\n').map(line).join('\n')+'\n';
    if(b.rc!=null)h+=line('[exit '+b.rc+']');
    return h;
  }
  // find blocks in transcript `name` whose command starts with each prefix (first match after the previous one)
  function pick(name,prefixes){
    const T=(window.PB&&PB[name])||[];const out=[];let from=0;
    prefixes.forEach(p=>{let i=T.findIndex((b,k)=>k>=from&&b.cmd&&b.cmd.startsWith(p));if(i<0)i=T.findIndex(b=>b.cmd&&b.cmd.startsWith(p));if(i>=0){out.push(T[i]);from=i+1}});
    return out;
  }
  // fill every element with data-pb-tr (transcript name) and data-pb-cmd ("prefix|prefix")
  function fillTerms(root){
    (root||document).querySelectorAll('[data-pb-tr]').forEach(el=>{
      const bs=pick(el.dataset.pbTr,el.dataset.pbCmd.split('|'));
      el.innerHTML=bs.length?bs.map(block).join('\n\n'):'<span class="e">(output missing)</span>';
    });
  }
  // predict-then-reveal: opts [{t, right}], answer HTML
  function drill(el,q,opts,answer){
    el.innerHTML='<div class="q">'+q+'</div><div class="opts">'+opts.map((o,i)=>'<button data-i="'+i+'">'+o.t+'</button>').join('')+
      '<button data-i="-1" class="mute">Just show me</button></div><div class="ans" hidden></div>';
    const a=el.querySelector('.ans');
    el.querySelector('.opts').addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;const i=+b.dataset.i;
      el.querySelectorAll('.opts button').forEach((x,k)=>{const j=+x.dataset.i;x.classList.remove('right','wrong');if(j>=0&&opts[j].right)x.classList.add('right')});
      if(i>=0&&!opts[i].right)b.classList.add('wrong');
      a.hidden=false;a.innerHTML=(i<0?'':(opts[i].right?'<b>Right.</b> ':'<b>Not quite.</b> '))+(typeof answer==='function'?answer():answer)});
  }
  const fmt=(x,d)=>(x==null||isNaN(x))?'n/a':Number(x).toFixed(d==null?2:d);
  const ms=s=>fmt(s*1000,0)+' ms';
  const la=a=>a?a.map(x=>x.toFixed(1)).join(' / '):'n/a';
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-60))};
  // horizontal bars: rows [{name, v, label, col, hl}]
  function bars(el,rows,max){
    const M=max||Math.max(...rows.map(r=>r.v));
    el.innerHTML=rows.map(r=>'<div class="row'+(r.hl?' hl':'')+'"><span class="nm" title="'+esc(r.name)+'">'+esc(r.name)+'</span><span class="track"><span class="fill" style="width:'+(100*r.v/M).toFixed(1)+'%;background:'+(r.col||'var(--c1)')+'"></span></span><span class="val">'+r.label+'</span></div>').join('');
  }
  return {esc,onTab,line,block,pick,fillTerms,drill,fmt,ms,la,width,bars};
})();
