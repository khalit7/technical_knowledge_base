// ---- Part 2 (TypeScript): shared helpers for t-tb-read, t-tb-narrow, t-tb-drill, t-tb-zod ----
// Every code block and output comes from window.TB (40_js_tb_0data.js, generated from real tsc 7.0.2 / node 22.22.2 runs).
window.TBX=(function(){
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function onTab(id,f){(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[id]=window.TAB_RENDER[id]||[]).push(f)}
  // a small TypeScript highlighter: comments, strings, keywords, type-ish words, numbers
  const KW=new Set('abstract as async await break case catch class const continue declare default do else enum export extends false finally for from function if implements import in infer instanceof interface is keyof let new null of private protected public readonly return satisfies static switch this throw true try type typeof undefined unique using var void while yield asserts never unknown any'.split(' '));
  const TY=new Set('string number boolean bigint symbol object Promise Record Partial Required Readonly Pick Omit Exclude Extract NonNullable ReturnType Parameters Awaited Array Map Set Error TypeError SyntaxError Capitalize URL AsyncGenerator AsyncIterable Function'.split(' '));
  function hl(code){
    const re=/(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(`(?:[^`\\]|\\.)*`|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|\b(\d[\d_]*(?:\.\d+)?)\b|([A-Za-z_$#][\w$]*)/g;
    let out='',last=0,m;
    while((m=re.exec(code))){
      out+=esc(code.slice(last,m.index));last=re.lastIndex;
      if(m[1])out+='<span class="cm">'+esc(m[1])+'</span>';
      else if(m[2])out+='<span class="st">'+esc(m[2])+'</span>';
      else if(m[3])out+='<span class="nu">'+esc(m[3])+'</span>';
      else{const w=m[4];out+=KW.has(w)?'<span class="kw">'+w+'</span>':TY.has(w)?'<span class="ty">'+w+'</span>':esc(w)}
    }
    return out+esc(code.slice(last));
  }
  // colour one line of terminal output
  function line(l){
    const e=esc(l);
    if(/^\$ /.test(l))return '<span class="c">'+esc(l.slice(2))+'</span>';
    if(/^\(exit status \d+\)$/.test(l))return '<span class="k">'+e+'</span>';
    if(/error TS\d+|^\S*Error\b|Error:|^npm error|^ *[×✖] |FAIL|failed|\bERR_/.test(l))return '<span class="e">'+e+'</span>';
    if(/^[a-z_.]+\.ts:\d+:\d+ lint\/| ! |warning|Warning/.test(l))return '<span class="w">'+e+'</span>';
    if(/passed|✓/.test(l))return '<span class="ok">'+e+'</span>';
    return e;
  }
  const term=out=>out.split('\n').map(line).join('\n');
  function codeBlock(file,code,extra){
    return '<div class="tb-file">'+(file?'<span>'+esc(file)+'</span>':'')+(extra||'')+'</div><pre class="tb-code">'+hl(code)+'</pre>';
  }
  // HTML for one recorded snippet: code (+ helper files) and its real output
  function snipHTML(name,opt){
    opt=opt||{};const s=window.TB&&TB.snip[name];
    if(!s)return '<div class="tb-miss">(missing recorded snippet '+esc(name)+')</div>';
    let h='';
    if(s.code&&!opt.noCode)h+=codeBlock(s.file,s.code,s.cfg?'<span class="tb-cfg">tsconfig for this file adds '+esc(s.cfg)+'</span>':'');
    if(!opt.noHelpers)s.helpers.forEach(x=>{h+=codeBlock(x.file,x.code)});
    if(!opt.noOut)h+='<pre class="tb-term'+(opt.hideOut?' tb-hid':'')+'">'+term(s.out)+'</pre>';
    return h;
  }
  // fill [data-tb-s] blocks; [data-tb-q] blocks become predict-then-reveal (output hidden until answered)
  function fill(root){
    (root||document).querySelectorAll('[data-tb-s]').forEach(el=>{
      if(el.dataset.tbDone)return;el.dataset.tbDone='1';
      const name=el.dataset.tbS,q=el.dataset.tbQ;
      const opt={noOut:el.dataset.tbNoOut!=null,noCode:el.dataset.tbNoCode!=null,noHelpers:el.dataset.tbNoHelp!=null};
      if(!q){el.innerHTML=snipHTML(name,opt)+el.innerHTML;return}
      const why=el.innerHTML;const opts=(el.dataset.tbOpts||'').split('|');const ans=+el.dataset.tbAns;
      el.classList.add('tb-pred');
      el.innerHTML=snipHTML(name,{noOut:true,noHelpers:opt.noHelpers})+'<div class="tb-q">'+esc(q)+'</div><div class="tb-opts">'+
        opts.map((o,i)=>'<button data-i="'+i+'">'+esc(o)+'</button>').join('')+'<button data-i="-1" class="tb-just">Just show me</button></div>'+
        '<div class="tb-ans" hidden>'+'<div class="tb-verdict"></div><pre class="tb-term">'+term(TB.snip[name]?TB.snip[name].out:'')+'</pre>'+(why?'<div class="tb-why">'+why+'</div>':'')+'</div>';
      const a=el.querySelector('.tb-ans');
      el.querySelector('.tb-opts').addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;const i=+b.dataset.i;
        el.querySelectorAll('.tb-opts button').forEach(x=>{x.classList.remove('right','wrong');if(+x.dataset.i===ans)x.classList.add('right')});
        if(i>=0&&i!==ans)b.classList.add('wrong');
        el.querySelector('.tb-verdict').innerHTML=i<0?'':(i===ans?'<b>Right.</b> The real output:':'<b>Not this time.</b> The real output:');
        a.hidden=false});
    });
  }
  // split a printed type at top-level " | " (not inside braces, brackets, parentheses or quotes)
  function members(t){
    const out=[];let d=0,q=null,cur='';
    for(let i=0;i<t.length;i++){const c=t[i];
      if(q){cur+=c;if(c===q&&t[i-1]!=='\\')q=null;continue}
      if(c==='"'||c==="'"||c==='`'){q=c;cur+=c;continue}
      if('{[(<'.includes(c))d++;if('}])>'.includes(c))d--;
      if(d===0&&t.startsWith(' | ',i)){out.push(cur);cur='';i+=2;continue}
      cur+=c}
    out.push(cur);return out.map(s=>s.trim()).filter(Boolean);
  }
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-60))};
  return {esc,onTab,hl,line,term,codeBlock,snipHTML,fill,members,width};
})();
TBX.fill(document);
// links into a section of another tab on this page: <a href="#ja-s6" data-tb-go="t-ja-read">
document.addEventListener('click',e=>{const a=e.target.closest('a[data-tb-go]');if(!a)return;e.preventDefault();
  window.SHOW_TAB(a.dataset.tbGo,true);const t=document.getElementById(a.getAttribute('href').slice(1));if(t)setTimeout(()=>t.scrollIntoView({block:'start'}),30)});
