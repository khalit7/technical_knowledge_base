// ---- Part 1, JS playground: drills with recorded Node output, and a live runner (worker, then same-thread fallback) ----
(function(){
  const $=id=>document.getElementById(id),esc=RD.esc,TAB='t-ja-play';
  if(!$('ja-pg-ed'))return;
  const R=(window.TAB_RENDER=window.TAB_RENDER||{});R[TAB]=R[TAB]||[];
  // The harness runs inside the worker (or on the page as a fallback). It must not use anything outside itself.
  function harness(code,post){
    const ind=n=>' '.repeat(n);
    function quote(s){const q=s.indexOf("'")<0?"'":s.indexOf('"')<0?'"':'`';
      return q+s.replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/\t/g,'\\t').split(q).join('\\'+q)+q}
    function fnName(v){const src=Function.prototype.toString.call(v);if(/^class[\s{]/.test(src))return '[class '+(v.name||'(anonymous)')+']';
      const kind=/^async\s+function\s*\*/.test(src)?'AsyncGeneratorFunction':/^async/.test(src)?'AsyncFunction':/^function\s*\*/.test(src)?'GeneratorFunction':'Function';
      return '['+kind+(v.name?': '+v.name:' (anonymous)')+']'}
    function join(base,b0,b1,items,lvl){
      if(!items.length)return (base?base+' ':'')+b0+b1;
      const start=items.length+lvl+b0.length+base.length+10;let tot=items.length+start;items.forEach(x=>tot+=x.length);
      if(tot+items.length<=80&&!items.some(x=>x.indexOf('\n')>=0))return (base?base+' ':'')+b0+' '+items.join(', ')+' '+b1;
      return (base?base+' ':'')+b0+'\n'+ind(lvl+2)+items.join(',\n'+ind(lvl+2))+'\n'+ind(lvl)+b1}
    function inspect(v,d,seen){
      if(v===null)return 'null';const t=typeof v;
      if(t==='undefined')return 'undefined';if(t==='number')return Object.is(v,-0)?'-0':String(v);
      if(t==='bigint')return v+'n';if(t==='boolean')return String(v);if(t==='symbol')return v.toString();
      if(t==='string')return quote(v);if(t==='function')return fnName(v);
      if(seen.indexOf(v)>=0)return '[Circular *1]';
      const lvl=2*d,keyOf=k=>typeof k==='symbol'?'['+k.toString()+']':/^[A-Za-z_$][\w$]*$/.test(k)?k:quote(k);
      if(v instanceof Date)return isNaN(v)?'Invalid Date':v.toISOString();
      if(v instanceof RegExp)return String(v);
      if(v instanceof Error)return v.stack&&v.stack.indexOf(v.message)>=0&&v.stack.indexOf(v.name)===0?v.stack.split('\n')[0]:(v.name+': '+v.message);
      if(typeof Promise!=='undefined'&&v instanceof Promise)return 'Promise { <state not visible in the browser> }';
      if(d>2)return Array.isArray(v)?'[Array]':'[Object]';
      const s2=seen.concat([v]),sub=x=>inspect(x,d+1,s2);
      if(Array.isArray(v)){const it=[];let holes=0;
        for(let i=0;i<v.length;i++){if(i in v){if(holes){it.push('<'+holes+' empty item'+(holes>1?'s':'')+'>');holes=0}it.push(sub(v[i]))}else holes++}
        if(holes)it.push('<'+holes+' empty item'+(holes>1?'s':'')+'>');
        Object.keys(v).filter(k=>!/^\d+$/.test(k)).forEach(k=>it.push(keyOf(k)+': '+sub(v[k])));
        return join('','[',']',it,lvl)}
      if(v instanceof Map)return join('Map('+v.size+')','{','}',[...v].map(([k,x])=>sub(k)+' => '+sub(x)),lvl);
      if(v instanceof Set)return join('Set('+v.size+')','{','}',[...v].map(sub),lvl);
      if(ArrayBuffer.isView(v)&&!(v instanceof DataView))return join(v.constructor.name+'('+v.length+')','[',']',Array.from(v,sub),lvl);
      const proto=Object.getPrototypeOf(v);
      const base=proto===null?'[Object: null prototype]':proto===Object.prototype?'':(proto.constructor&&proto.constructor.name)||'';
      const keys=Object.keys(v).concat(Object.getOwnPropertySymbols(v).filter(s=>Object.getOwnPropertyDescriptor(v,s).enumerable));
      return join(base,'{','}',keys.map(k=>{const dsc=Object.getOwnPropertyDescriptor(v,k);
        return keyOf(k)+': '+(dsc.get?(dsc.set?'[Getter/Setter]':'[Getter]'):dsc.set?'[Setter]':sub(v[k]))}),lvl)}
    const fmt=a=>a.map(x=>typeof x==='string'?x:inspect(x,0,[])).join(' ');
    const con={log:(...a)=>post({t:'log',s:fmt(a)}),info:(...a)=>post({t:'log',s:fmt(a)}),debug:(...a)=>post({t:'log',s:fmt(a)}),
      warn:(...a)=>post({t:'log',s:fmt(a)}),error:(...a)=>post({t:'log',s:fmt(a)}),dir:x=>post({t:'log',s:inspect(x,0,[])})};
    const rST=setTimeout,rCT=clearTimeout,rSI=setInterval,rCI=clearInterval,live=new Set();let done=false,ended=false;
    const err=e=>post({t:'log',s:'Uncaught '+(e&&e.name?e.name+': '+e.message:inspect(e,0,[]))});
    function check(){if(done&&!live.size&&!ended)rST(()=>{if(!live.size&&!ended){ended=true;post({t:'end'})}},0)}
    const st=(f,ms,...a)=>{const id=rST(()=>{live.delete(id);try{if(typeof f==='function')f(...a)}catch(e){err(e)}check()},ms);live.add(id);return id};
    const ct=id=>{if(live.delete(id))rCT(id);check()};
    const si=(f,ms,...a)=>{const id=rSI(()=>{try{f(...a)}catch(e){err(e)}},ms);live.add(id);return id};
    const ci=id=>{if(live.delete(id))rCI(id);check()};
    let fn;
    try{fn=new Function('console','setTimeout','clearTimeout','setInterval','clearInterval','"use strict";return (async()=>{\n'+code+'\n})()')}
    catch(e){err(e);done=true;check();return}
    try{fn(con,st,ct,si,ci).then(()=>{done=true;check()},e=>{err(e);done=true;check()})}catch(e){err(e);done=true;check()}
  }
  const WSRC='const harness='+harness.toString()+';self.onmessage=e=>harness(e.data,m=>self.postMessage(m));'+
    'self.addEventListener("unhandledrejection",e=>{e.preventDefault();self.postMessage({t:"log",s:"Uncaught (in promise) "+(e.reason&&e.reason.name?e.reason.name+": "+e.reason.message:String(e.reason))})});';
  let mode=null;   // 'worker', 'page' or 'none'
  function runLive(code){return new Promise(resolve=>{
    const lines=[];let fin=false;const finish=note=>{if(fin)return;fin=true;if(note)lines.push(note);resolve({out:lines.join('\n'),mode})};
    const onMsg=m=>{if(m.t==='log')lines.push(m.s);else if(m.t==='end')finish()};
    if(mode!=='page'&&mode!=='none'){let w;
      try{w=new Worker(URL.createObjectURL(new Blob([WSRC],{type:'text/javascript'})));mode='worker'}catch(e){w=null}
      if(w){const kill=setTimeout(()=>{w.terminate();finish('(stopped after 3 s: still running, or a timer never cleared)')},3000);
        w.onmessage=e=>{onMsg(e.data);if(fin){clearTimeout(kill);w.terminate()}};
        w.onerror=e=>{e.preventDefault();clearTimeout(kill);w.terminate();mode='page';runLive(code).then(r=>{fin=true;resolve(r)})};
        w.postMessage(code);return}}
    try{new Function('return 1')();mode='page'}catch(e){mode='none';finish('This browser does not allow running code inside this page. The recorded Node output on the left still applies.');return}
    const kill=setTimeout(()=>finish('(stopped waiting after 3 s)'),3000);
    harness(code,m=>{onMsg(m);if(fin)clearTimeout(kill)});
  })}
  window.JA_PLAY_RUN=runLive;
  // ---- drills UI ----
  const D=JA.drills;let cur=0,revealed=false,ran=null;const done=new Set();
  try{(JSON.parse(localStorage.getItem('ja-pg-done')||'[]')).forEach(x=>done.add(x))}catch(e){}
  const save=()=>{try{localStorage.setItem('ja-pg-done',JSON.stringify([...done]))}catch(e){}};
  const ua=navigator.userAgent;$('ja-pg-engine').textContent=/Firefox\//.test(ua)?'SpiderMonkey':/Chrom(e|ium)\/|Edg\//.test(ua)?'V8':/Safari\//.test(ua)?'JavaScriptCore':'its engine';
  function list(){$('ja-pg-list').innerHTML=D.map((d,i)=>'<button role="listitem" data-i="'+i+'" class="'+(i===cur?'on ':'')+(done.has(d.id)?'done':'')+'" title="'+esc(d.title)+'">'+(i+1)+'. '+esc(d.title)+'</button>').join('');
    $('ja-pg-score').textContent='revealed '+done.size+' of '+D.length}
  function verdict(){const d=D[cur],v=[];
    if(revealed){const g=$('ja-pg-guess').value.replace(/\s+$/,'');if(g){const gl=g.split('\n').map(s=>s.trim()),rl=d.out.split('\n').map(s=>s.trim());
      const right=rl.filter((x,i)=>gl[i]===x).length;v.push('Your prediction: <b>'+right+' of '+rl.length+'</b> lines exactly right'+(right===rl.length&&gl.length===rl.length?'. All of it.':'.'))}}
    if(revealed&&ran){if($('ja-pg-ed').value!==d.code)v.push('You edited the code, so the recorded output is for the original.');
      else v.push(ran.out===d.out?'Your browser printed exactly what Node printed.':'Your browser\'s output differs from Node\'s'+(ran.mode==='none'?'.':': see the note in the How it works box below (printing of exotic values and Node-only APIs).'))}
    $('ja-pg-verdict').innerHTML=v.join(' ')}
  function load(i){cur=i;const d=D[i];revealed=false;ran=null;$('ja-pg-title').textContent=d.id+'.mjs: '+d.title;$('ja-pg-ed').value=d.code;
    $('ja-pg-node').textContent='(hidden: predict first)';$('ja-pg-node').setAttribute('data-ja-src','q_'+d.id+'.txt');$('ja-pg-live').textContent='(not run yet)';$('ja-pg-guess').value='';list();verdict()}
  $('ja-pg-list').addEventListener('click',e=>{const b=e.target.closest('button[data-i]');if(b)load(+b.dataset.i)});
  $('ja-pg-reveal').addEventListener('click',()=>{revealed=true;$('ja-pg-node').textContent=D[cur].out;done.add(D[cur].id);save();list();verdict()});
  $('ja-pg-run').addEventListener('click',()=>{$('ja-pg-live').textContent='running...';const code=$('ja-pg-ed').value;
    runLive(code).then(r=>{ran=r;$('ja-pg-live').textContent=r.out===''?'(printed nothing)':r.out;verdict()})});
  $('ja-pg-reset').addEventListener('click',()=>{$('ja-pg-ed').value=D[cur].code;verdict()});
  $('ja-pg-next').addEventListener('click',()=>load((cur+1)%D.length));
  $('ja-pg-guess').addEventListener('input',verdict);
  $('ja-pg-ed').addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();const t=e.target,s=t.selectionStart;t.setRangeText('  ',s,t.selectionEnd,'end')}});
  load(0);
})();
