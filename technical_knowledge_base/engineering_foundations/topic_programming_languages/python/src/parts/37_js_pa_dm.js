// ---- Part 1 (In depth), Data model tab: real dispatch traces from d2_dispatch.py, with the steps C code takes ----
(function(){
  const $=id=>document.getElementById(id),esc=RD.esc,TAB='t-pa-dm';
  if(!$('pa-dm-card'))return;
  const R=(window.TAB_RENDER=window.TAB_RENDER||{});(R[TAB]=R[TAB]||[]);
  // Each scenario: steps are ['i', text] for implicit steps (inside C, not loggable) or [n, why] for trace line n.
  const S={
    add_same:{g:'Operators',t:'A(1) + A(2)',d:'class A defines __add__ and __radd__; both operands are A.',rule:'Rule: for <code>x + y</code>, Python calls <code>type(x).__add__(x, y)</code> first. Anything other than <code>NotImplemented</code> is the result.',
      s:[[0,'type(left) has __add__, so Python calls it with the right operand as argument.'],[1,'It returned an A, not NotImplemented: that is the value of the expression.']]},
    add_reflected:{g:'Operators',t:'5 + A(2)',d:'An int on the left, an A on the right.',rule:'Rule: if the left operand\'s method returns <code>NotImplemented</code>, Python tries the right operand\'s reflected method, <code>__radd__</code>. This is how <code>sum()</code>, which starts from 0, works on your own types.',
      s:[['i','int.__add__(5, A(2)) runs first, in C. int does not know A, so it returns NotImplemented (C code: nothing to log).'],[0,'Python now tries the reflected method on the right operand, A.__radd__, with the left operand as argument.'],[1,'A.__radd__ handled an int: that is the result.']]},
    add_subclass:{g:'Operators',t:'A(1) + B(2)',d:'class B(A) overrides __radd__ (and adds 100, to make it visible).',rule:'Rule: "If the operands are of different types, and the right operand\'s type is a direct or indirect subclass of the left operand\'s type, the reflected method of the right operand has priority" (Data model).',
      s:[[0,'B is a subclass of A and provides its own __radd__, so Python calls B.__radd__ FIRST. A.__add__ is never called.'],[1,'The subclass decided the result.']]},
    add_fail:{g:'Operators',t:'A(1) + C()',d:'class C defines no arithmetic methods at all.',rule:'Rule: when both sides decline, <code>+</code> raises TypeError naming both types.',
      s:[[0,'A.__add__ is tried first.'],[1,'It does not handle C, so it returns NotImplemented.'],['i','C has no __radd__, so there is nothing else to try.'],[2,'Python raises TypeError.']]},
    eq_same:{g:'Equality and hashing',t:'E(1) == E(1)',d:'class E defines __eq__ comparing .n, and no __hash__.',rule:'Rule: <code>x == y</code> calls <code>type(x).__eq__(x, y)</code>.',
      s:[[0,'E.__eq__ is called with both objects.'],[1,'Equal n, so True.']]},
    eq_fallback:{g:'Equality and hashing',t:'E(1) == "1"',d:'Comparing an E with a str.',rule:'Rule: if both sides return <code>NotImplemented</code>, <code>==</code> falls back to identity (<code>x is y</code>) instead of raising. That is why comparing unrelated types is False, never an error.',
      s:[[0,'E.__eq__ is tried first.'],[1,'It does not handle str: NotImplemented.'],['i','The reflection, str.__eq__("1", E(1)), runs in C and also returns NotImplemented.'],[2,'Both declined: Python compares identities. They are different objects, so False.']]},
    hash_none:{g:'Equality and hashing',t:'hash(E(1))',d:'E defines __eq__ but not __hash__.',rule:'Rule: "A class that overrides __eq__() and does not define __hash__() will have its __hash__() implicitly set to None" (Data model). Define both, or use <code>@dataclass(frozen=True)</code>.',
      s:[[0,'Creating class E set E.__hash__ = None, because equal objects must hash equally and Python cannot guess your hash.'],[1,'hash() finds None and raises: E instances cannot be dict keys or set members.']]},
    len_type:{g:'Built-ins',t:'len(x)',d:'class L defines __len__ returning 3; then x.__len__ = lambda: 99 is set on the instance.',rule:'Rule: implicit special-method calls look the method up on the type, never in the instance dict ("Special method lookup", Data model).',
      s:[[0,'The instance now has its own __len__ attribute.'],[1,'len() ignored it and called type(x).__len__, that is L.__len__.'],[2,'So the result is 3, not 99.']]},
    len_negative:{g:'Built-ins',t:'len(Neg())',d:'class Neg\'s __len__ returns -1.',rule:'Rule: <code>len()</code> checks what <code>__len__</code> returns: it must be an int greater than or equal to 0.',
      s:[[0,'Neg.__len__ runs and returns -1.'],[1,'len() validates the result and raises ValueError.']]},
    bool_len:{g:'Built-ins',t:'bool(OnlyLen())',d:'class OnlyLen has __len__ returning 0 and no __bool__.',rule:'Rule: an object is true unless its class defines <code>__bool__</code> returning False or <code>__len__</code> returning 0 (Data model). Empty containers are false.',
      s:[['i','No __bool__ on the type, so bool() looks for __len__.'],[0,'OnlyLen.__len__ returns 0.'],[1,'Length 0 means False.']]},
    bool_default:{g:'Built-ins',t:'bool(Nothing())',d:'class Nothing: pass.',rule:'Rule: with neither method, every object is true. A common bug: <code>if result:</code> on an object that you meant to test for None.',
      s:[[0,'Nothing defines neither method.'],[1,'So the object is true.']]},
    iter_getitem:{g:'Built-ins',t:'list(Old())',d:'class Old has only __getitem__, raising IndexError from index 3.',rule:'Rule: <code>iter(x)</code> uses <code>__iter__</code>; if there is none but <code>__getitem__</code> exists, it calls <code>__getitem__(0)</code>, <code>(1)</code>, ... until IndexError (the old sequence protocol).',
      s:[['i','Old has no __iter__, so iter() builds a sequence iterator around __getitem__.'],[0,'Index 0.'],[1,'Index 1.'],[2,'Index 2.'],[3,'Index 3 ...'],[4,'... raises IndexError, which ends the iteration (it is not an error here).'],[5,'list() collected three items.']]},
    contains_iter:{g:'Built-ins',t:'2 in It()',d:'class It has __iter__ (a generator yielding 1, 2, 3) and no __contains__.',rule:'Rule: <code>x in y</code> uses <code>__contains__</code>; without it, Python iterates and compares each item with <code>==</code>, stopping at the first match.',
      s:[['i','No __contains__, so Python iterates.'],[0,'It.__iter__ is called.'],[1,'1 == 2? No, keep going.'],[2,'2 == 2: found. Iteration stops; 3 is never produced.'],[3,'True.']]},
    with_propagate:{g:'with',t:'with Ctx(swallow=False) as r: raise ValueError',d:'Ctx.__exit__ returns False.',rule:'Rule: <code>__exit__</code> always runs; if it returns a true value, the exception is swallowed, otherwise it continues outward.',
      s:[[0,'__enter__ runs; its return value is bound to r.'],[1,'The body raises.'],[2,'__exit__ receives the exception type, value and traceback, and returns False.'],[3,'So the ValueError continues to the caller.']]},
    with_swallow:{g:'with',t:'with Ctx(swallow=True) as r: raise ValueError',d:'The same, but Ctx.__exit__ returns True.',rule:'Rule: a true return from <code>__exit__</code> suppresses the exception; execution continues after the <code>with</code>. <code>contextlib.suppress</code> is built on this. Never return True by accident.',
      s:[[0,'__enter__ runs.'],[1,'The body raises.'],[2,'__exit__ returns True ...'],[3,'... so the exception is gone and the function continues after the with block.']]},
    attr_data:{g:'Attribute lookup',t:'o.d',d:'K.d is a data descriptor (has __get__ and __set__); o.__dict__ also has a key "d".',rule:'Rule: data descriptors on the type win over the instance dict. <code>property</code> is a data descriptor.',
      s:[['i','object.__getattribute__ first looks for "d" on type(o) and its MRO: it finds Data(), which has __set__.'],[0,'A data descriptor wins outright: its __get__ is called and the instance dict entry is never consulted.'],[1,'Result from the descriptor.']]},
    attr_instance:{g:'Attribute lookup',t:'o.nd',d:'K.nd is a non-data descriptor (only __get__); o.__dict__ has a key "nd".',rule:'Rule: the instance dict wins over non-data descriptors. Methods are non-data descriptors, which is why <code>obj.method = something</code> shadows a method on one instance.',
      s:[[0,'The script put an "nd" entry in o.__dict__ before the lookup.'],['i','On the type, nd is found but it has no __set__, so lookup goes on to the instance dict.'],['i','o.__dict__["nd"] exists: it is returned. NonData.__get__ never runs.'],[1,'Result from the instance dict.']]},
    attr_class:{g:'Attribute lookup',t:'o.plain',d:'K.plain is a plain string on the class.',rule:'Rule: after the instance dict, a class attribute (or a non-data descriptor) is used. This is how methods and class constants are found, and how a mutable class attribute ends up shared.',
      s:[[0,'Nothing named "plain" is in o.__dict__.'],['i','Not a data descriptor, not in o.__dict__: the value found on the class is returned as is.'],[1,'Result from the class.']]},
    attr_getattr:{g:'Attribute lookup',t:'o.missing',d:'Nothing called "missing" exists anywhere; K defines __getattr__.',rule:'Rule: <code>__getattr__</code> is called only after normal lookup fails (unlike <code>__getattribute__</code>, which runs for every access). Use it for proxies and lazy attributes.',
      s:[['i','Type, instance dict and class all miss: normal lookup raises AttributeError internally.'],[0,'Only then is K.__getattr__ called with the name.'],[1,'Its return value is the result.']]}
  };
  const keys=Object.keys(S).filter(k=>PA.dm[k]);
  let cur=keys[0],an=null;
  const groups=[...new Set(keys.map(k=>S[k].g))];
  $('pa-dm-pick').innerHTML=groups.map(g=>'<div class="pa-dm-grp">'+esc(g)+'</div><div class="chips">'+keys.filter(k=>S[k].g===g).map(k=>'<button data-k="'+k+'"'+(k===cur?' class="on"':'')+'><code>'+esc(S[k].t)+'</code></button>').join('')+'</div>').join('');
  function rows(k){const tr=PA.dm[k];return S[k].s.map(([n,why])=>{if(n==='i')return {cls:'impl',tag:'inside C, not logged',line:'',why};
    const l=tr[n]||'';const cls=/^raises/.test(l)?'err':/^result/.test(l)?'res':'';return {cls,tag:/^#/.test(l)?'setup (printed by the script)':'logged by the real run',line:l,why}})}
  function draw(i){
    const rs=rows(cur);
    $('pa-dm-expr').innerHTML=esc(S[cur].t)+'<span class="d">'+esc(S[cur].d)+'</span>';
    $('pa-dm-steps').innerHTML=rs.map((r,k)=>'<li class="'+r.cls+(k>i?' fut':'')+(k===i?' cur':'')+'"><span class="tg">'+(k+1)+'. '+r.tag+'</span>'+(r.line?'<code class="l">'+esc(r.line)+'</code>':'')+'<div>'+esc(r.why)+'</div></li>').join('');
    $('pa-dm-rule').innerHTML=i===rs.length-1?S[cur].rule:'<span class="mute">Step '+(i+1)+' of '+rs.length+'. The rule appears at the last step.</span>';
  }
  an=RD.anim({card:'pa-dm-card',ctl:'pa-dm-ctl',n:rows(cur).length,draw,ms:1600,label:'Step'});
  $('pa-dm-pick').addEventListener('click',e=>{const b=e.target.closest('button[data-k]');if(!b)return;
    $('pa-dm-pick').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));cur=b.dataset.k;an.reset(rows(cur).length);an.play()});
  R[TAB].push(()=>an.redraw());
})();
