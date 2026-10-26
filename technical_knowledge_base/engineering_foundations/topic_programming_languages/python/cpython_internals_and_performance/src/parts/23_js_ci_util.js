// ---- Shared helpers for this page (window.CIU): transcripts, prediction prompts, bars. Adapted from the language page's 41_js_pb_util.js ----
window.CIU=(function(){
  const esc=RD.esc;
  // colour one line of tool output
  function line(l){
    const e=esc(l);
    if(/^\[exit \d+\]$/.test(l))return '<span class="'+(l==='[exit 0]'?'k':'e')+'">'+e+'</span>';
    if(/(^|[^a-z])(error|Error|Traceback|FAILED|Fatal|failed)\b|^E\s|NotShareable|ModuleNotFound|SyntaxError|NameError|ImportError|AttributeError|ValueError/.test(l))return '<span class="e">'+e+'</span>';
    if(/[Ww]arning|^hint:|^Note:|^info:/.test(l))return '<span class="w">'+e+'</span>';
    if(/passed|All checks passed|Successfully built|in sync/.test(l))return '<span class="ok">'+e+'</span>';
    return e;
  }
  function block(b){
    let h='<span class="c">'+esc(b.cmd)+'</span>\n';
    if(b.out)h+=b.out.split('\n').map(line).join('\n')+'\n';
    if(b.rc!=null)h+=line('[exit '+b.rc+']');
    return h;
  }
  // blocks in transcript `name` whose command starts with each prefix (first match after the previous one)
  function pick(name,prefixes){
    const T=(window.PB&&PB[name])||[];const out=[];let from=0;
    prefixes.forEach(p=>{let i=T.findIndex((b,k)=>k>=from&&b.cmd&&b.cmd.startsWith(p));if(i<0)i=T.findIndex(b=>b.cmd&&b.cmd.startsWith(p));if(i>=0){out.push(T[i]);from=i+1}});
    return out;
  }
  function fillTerms(root){
    (root||document).querySelectorAll('[data-ci-tr]').forEach(el=>{
      const bs=pick(el.dataset.ciTr,el.dataset.ciCmd.split('|'));
      el.innerHTML=bs.length?bs.map(block).join('\n\n'):'<span class="e">(output missing)</span>';
    });
  }
  // prediction prompt: opts [{t, right}], answer HTML (or a function returning it)
  function drill(el,q,opts,answer){
    if(!el)return;
    el.innerHTML='<div class="q">'+q+'</div><div class="opts">'+opts.map((o,i)=>'<button data-i="'+i+'">'+o.t+'</button>').join('')+
      '<button data-i="-1" class="mute">Just show me</button></div><div class="ans" hidden></div>';
    const a=el.querySelector('.ans');
    el.querySelector('.opts').addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;const i=+b.dataset.i;
      el.querySelectorAll('.opts button').forEach(x=>{const j=+x.dataset.i;x.classList.remove('right','wrong');if(j>=0&&opts[j].right)x.classList.add('right')});
      if(i>=0&&!opts[i].right)b.classList.add('wrong');
      a.hidden=false;a.innerHTML=(i<0?'':(opts[i].right?'<b>Right.</b> ':'<b>Not quite.</b> '))+(typeof answer==='function'?answer():answer)});
  }
  const fmt=(x,d)=>(x==null||isNaN(x))?'n/a':Number(x).toFixed(d==null?2:d);
  const la=a=>a?a.map(x=>x.toFixed(1)).join(' / '):'n/a';
  // horizontal bars: rows [{name, v, label, col, hl}]
  function bars(el,rows,max,note){
    if(!el)return;
    const M=max||Math.max(...rows.map(r=>r.v));
    el.innerHTML='<div class="bars">'+rows.map(r=>'<div class="row'+(r.hl?' hl':'')+'"><span class="nm" title="'+esc(r.name)+'">'+esc(r.name)+'</span><span class="track"><span class="fill" style="width:'+(100*r.v/M).toFixed(1)+'%;background:'+(r.col||'var(--c1)')+'"></span></span><span class="val">'+r.label+'</span></div>').join('')+'</div>'+(note?'<div class="ci-src">'+note+'</div>':'');
  }
  // redraw f when a closed <details> containing el is opened (a closed block has no width)
  function onOpen(el,f){const d=el&&el.closest('details');if(d)d.addEventListener('toggle',()=>{if(d.open)f()})}
  return {esc,line,block,pick,fillTerms,drill,fmt,la,bars,onOpen};
})();
