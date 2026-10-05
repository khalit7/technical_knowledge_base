// ---- Part 2: "Will it type-check?" drills (t-tb-drill). The verdict is read from the recorded tsc output, never typed by hand ----
(function(){
  if(!window.TB||!document.getElementById('t-tb-drill'))return;
  const esc=TBX.esc;
  const D=[
    ['d01_excess','A typo in a variable passed as options','An object type means "at least these properties". The excess-property check applies only to a fresh object literal, so through a variable the misspelt <code>temprature</code> is accepted and silently ignored.'],
    ['d02_widen','A const object with a string tag','<code>ev</code> is a <code>const</code>, but its property can still be reassigned, so <code>kind</code> widens to <code>string</code>, which is not <code>"text" | "image"</code>.'],
    ['d03_asconst','The same, with as const','<code>as const</code> keeps <code>kind</code> as the literal <code>"text"</code> (and makes it readonly), so it fits. Writing the literal inline in the call also works.'],
    ['d04_find','.find() on an array','<code>find</code> returns <code>string | undefined</code>: nothing may match. Check before use, or use <code>?.</code>.'],
    ['d05_optional_param','Arithmetic on an optional parameter','<code>x?: number</code> is <code>number | undefined</code> inside the function; <code>undefined + 1</code> would be <code>NaN</code>.'],
    ['d06_json','Reading a misspelt key from JSON.parse','<code>JSON.parse</code> returns <code>any</code>, so the typo <code>nmae</code> passes and the annotation <code>: string</code> is believed. The crash comes later, far from the cause.'],
    ['d07_covariance','Pushing a string into a number array through an alias','Arrays are covariant: a <code>number[]</code> is accepted as a <code>(number | string)[]</code>, and the push lands in the original array. One of TypeScript’s deliberate holes.'],
    ['d08_catch','Reading e.message in a catch','Under <code>strict</code>, the caught value is <code>unknown</code>: JavaScript can throw anything. Narrow with <code>e instanceof Error</code> first.'],
    ['d09_keys','Indexing with Object.keys','<code>Object.keys</code> returns <code>string[]</code>, not <code>("small" | "large")[]</code>, because an object may have more keys than its type lists (structural typing). Use <code>Object.entries</code>, or a typed key list.'],
    ['d10_null','null in a number variable','With <code>strictNullChecks</code>, <code>null</code> is its own type. Write <code>number | null</code> if you mean it.'],
    ['d11_void','A function returning a value where void is expected','A function type returning <code>void</code> accepts functions that return something; the value is just not supposed to be used. That is what allows <code>xs.forEach(x =&gt; out.push(x))</code>, whose callback returns a number. It prints 5 because JavaScript keeps the value anyway.'],
    ['d12_parseint','["1","2","3"].map(parseInt)','Type-checks: <code>parseInt(string, radix?)</code> fits the callback type. But <code>map</code> passes the index as the second argument, so the calls are <code>parseInt("2", 1)</code> and <code>parseInt("3", 2)</code>: NaN. Types cannot catch a wrong meaning.'],
    ['d13_empty_object','0 and "" in a variable of type {}','<code>{}</code> means "any value except null and undefined", not "an empty object". Use <code>Record&lt;string, never&gt;</code> or <code>object</code> if you mean an object.'],
    ['d14_string_math','Multiplying a string','JavaScript would happily compute <code>"5" * 2 = 10</code>; TypeScript rejects arithmetic on strings, which catches unparsed input.'],
    ['d15_length_check','Checking .length before indexing','With <code>noUncheckedIndexedAccess</code>, a length check does not narrow an index read: <code>scores[0]</code> is still <code>number | undefined</code>. Use <code>const [first] = scores; if (first !== undefined)</code>, or <code>scores.at(0)</code> with a check.'],
    ['d16_readonly_param','A mutable array passed to a readonly parameter','Accepted: a <code>readonly number[]</code> parameter only promises the function will not mutate it. The caller can still sort its own array, and does: the function then sees 1, not 3.'],
    ['d17_missing_return','A function that can fall off the end','The return type says <code>string</code>, but for <code>n === 0</code> the function returns nothing. tsc requires every path to return.'],
    ['d18_switch_fallthrough','Using the wrong member after a check','After <code>if (s.kind === "circle") return</code>, <code>s</code> is the square member, which has <code>side</code>, not <code>r</code>. The narrowing found a real bug.'],
    ['d19_sort_numbers','Sorting numbers','Type-checks, and prints <code>[ 1, 10, 9 ]</code>: <code>sort()</code> with no comparator compares as strings. Pass <code>(a, b) =&gt; a - b</code>.'],
    ['d20_spread_override','An explicit undefined in a Partial','With <code>exactOptionalPropertyTypes</code>, an optional property may be absent but not <code>undefined</code>. Without that option this compiles, and the spread overwrites the default with <code>undefined</code>.'],
  ];
  const fails=n=>/error TS\d+/.test(TB.snip[n].out);
  let ans={};try{ans=JSON.parse(localStorage.getItem('tb-drill')||'{}')||{}}catch(e){ans={}}
  const save=()=>{try{localStorage.setItem('tb-drill',JSON.stringify(ans))}catch(e){}};
  const list=document.getElementById('tbd-list'),score=document.getElementById('tbd-score');
  let filter='all';
  function card(d,i){
    const [n,title,why]=d;const s=TB.snip[n];const a=ans[n];const right=fails(n)?1:0;
    const done=a!=null;const ok=done&&a===right;
    let h='<div class="tbd'+(done?(ok?' done-right':' done-wrong'):'')+'" data-n="'+n+'"><h3>'+(i+1)+'. '+esc(title)+'</h3>'+TBX.snipHTML(n,{noOut:true})+
      '<div class="tb-opts"><button data-a="0"'+(done?(right===0?' class="right"':a===0?' class="wrong"':''):'')+'>Type-checks</button><button data-a="1"'+(done?(right===1?' class="right"':a===1?' class="wrong"':''):'')+'>tsc reports an error</button></div>';
    if(done)h+='<div class="tb-verdict">'+(ok?'<b>Right.</b> ':'<b>Not this time.</b> ')+(right?'tsc rejects it:':'tsc accepts it; Node then printed:')+'</div><pre class="tb-term" style="border-radius:8px">'+TBX.term(s.out)+'</pre><div class="tb-why">'+why+'</div>';
    return h+'</div>';
  }
  function render(){
    const items=D.map((d,i)=>[d,i]).filter(([d])=>{const a=ans[d[0]];const r=fails(d[0])?1:0;return filter==='all'||(filter==='todo'&&a==null)||(filter==='wrong'&&a!=null&&a!==r)});
    list.innerHTML=items.length?items.map(([d,i])=>card(d,i)).join(''):'<p class="mute">Nothing here.</p>';
    const done=D.filter(d=>ans[d[0]]!=null).length,ok=D.filter(d=>ans[d[0]]===(fails(d[0])?1:0)).length;
    score.innerHTML='Answered <b>'+done+'</b> of '+D.length+', right <b>'+ok+'</b>. Of the twenty, '+D.filter(d=>!fails(d[0])).length+' type-check.';
  }
  list.addEventListener('click',e=>{const b=e.target.closest('button[data-a]');if(!b)return;const c=b.closest('.tbd');const n=c.dataset.n;
    if(ans[n]!=null)return;ans[n]=+b.dataset.a;save();
    const i=D.findIndex(d=>d[0]===n);c.outerHTML=card(D[i],i);
    const done=D.filter(d=>ans[d[0]]!=null).length,ok=D.filter(d=>ans[d[0]]===(fails(d[0])?1:0)).length;
    score.innerHTML='Answered <b>'+done+'</b> of '+D.length+', right <b>'+ok+'</b>. Of the twenty, '+D.filter(d=>!fails(d[0])).length+' type-check.'});
  RD.seg(document.getElementById('tbd-filter'),m=>{filter=m;render()});
  document.getElementById('tbd-reset').addEventListener('click',()=>{ans={};save();render()});
  render();
})();
