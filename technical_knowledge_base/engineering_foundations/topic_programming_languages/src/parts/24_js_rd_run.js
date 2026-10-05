// ---- Reading section 2: one line of the program through four routes to machine code (real dis, asm, V8 and tsc output) ----
(function(){
  const D=window.RDD&&window.RDD.howrun;if(!D||!document.getElementById('rd-run-card'))return;
  const esc=RD.esc,hl=RDH.hl,pre=RDH.pre;
  const L=t=>t.replace(/\n$/,'').split('\n');
  // CPython dis: keep instructions belonging to the given source lines
  function disLines(t,want){let cur=0;return L(t).filter(l=>{const m=l.match(/^\s{0,3}(\d+)\s/);if(m)cur=+m[1];return want.includes(cur)&&l.trim()}).join('\n')}
  function disLoop(t){const a=L(t);const i=a.findIndex(l=>/FOR_ITER/.test(l)),j=a.findIndex(l=>/JUMP_BACKWARD/.test(l));return a.slice(i,j+1)}
  const pyLoopN=disLoop(D.py_before).filter(l=>/[A-Z_]{3,}/.test(l)).length;
  // mark the instructions that changed name after specialisation
  function diffDis(before,after){const b=L(before),a=L(after);return a.map((l,i)=>{const nb=(b[i]||'').match(/[A-Z_]{3,}/),na=l.match(/[A-Z_]{3,}/);
    return na&&nb&&na[0]!==nb[0]?'<span class="hl">'+esc(l)+'</span>':esc(l)}).join('\n')}
  function loop(asm,label){const a=L(asm);const i=a.findIndex(l=>l.startsWith(label+':'));const j=a.findIndex((l,k)=>k>i&&new RegExp('b\\.ne\\s+'+label+'$').test(l.trim()));return a.slice(i,j+1)}
  function step(asm){const a=loop(asm,'LBB0_5');const s=a.find(l=>/subs\s+x\d+, x\d+, #\d+/.test(l));return s?+s.match(/#(\d+)/)[1]:0}
  const cS=loop(D.cpp_asm,'LBB0_9'),rS=loop(D.rs_asm,'LBB0_9'),cV=loop(D.cpp_asm,'LBB0_5'),rV=loop(D.rs_asm,'LBB0_5');
  const cStep=step(D.cpp_asm),rStep=step(D.rs_asm);
  const short=a=>a.length>22?a.slice(0,14).concat(['        ... '+(a.length-20)+' more vector instructions ...'],a.slice(-6)):a;
  const v8bc=L(D.v8_bytecode).filter(l=>{const m=l.match(/@\s+(\d+) :/);return m&&+m[1]>=26&&+m[1]<=77}).map(l=>l.replace(/^\s*(\d+ [SE]>)?\s*0x[0-9a-f]+ /,'').replace(/^\s+/,'')).join('\n');
  const tr=L(D.v8_trace).map(l=>l.replace(/0x[0-9a-f]+ /g,'').replace(/ \(sfi = [^)]*\)/g,''));
  const mark=tr.find(l=>/marking .*countTokens/.test(l))||'',done=tr.find(l=>/completed optimizing .*countTokens/.test(l))||'',bail=tr.find(l=>/bailout/.test(l))||'';
  const asmPre=a=>pre(a.map(l=>esc(l.replace(/\t/g,'  ')).replace(/(;.*)$/,'<span class="c">$1</span>')).join('\n'));
  const tsLines=[1,13,14];
  const M={
    py:{stages:['Source','Bytecode','Interpreter','Specialised','No JIT by default'],steps:[
      {t:'The line, in Python',p:'Two lines of the token counter: if this character is a letter or digit and the previous one was not, a new token starts.',panes:[['tokens.py',pre(hl(D.py_src,'py',[5,6]))]]},
      {t:'Compiled to bytecode when the file is loaded',p:'CPython turns the function into bytecode for a stack machine: LOAD_FAST_BORROW pushes a variable, TO_BOOL turns it into True or False, POP_JUMP_IF_FALSE jumps if it is false, BINARY_OP adds. These two source lines became '+disLines(D.py_before,[5,6]).split('\n').filter(l=>/[A-Z_]{3,}/.test(l)).length+' instructions. Output of dis.dis(count_tokens), Python '+esc(D.py_version)+'.',panes:[['bytecode for lines 5 and 6',pre(esc(disLines(D.py_before,[5,6])))]]},
      {t:'Interpreted, one instruction at a time',p:'A loop in C reads each instruction, jumps to the code that handles it, and repeats. The whole loop body, one pass per character, is '+pyLoopN+' bytecode instructions; each one costs many machine instructions (fetch, dispatch, type checks, reference counts). Nothing here knows that ch is always a one-character string.',panes:[['the whole loop body (lines 3 to 7)',pre(esc(disLoop(D.py_before).join('\n')))]]},
      {t:'Specialised while it runs (PEP 659)',p:'After 1,000 calls the interpreter has rewritten instructions it saw always receive the same types: BINARY_OP became BINARY_OP_ADD_INT, TO_BOOL became TO_BOOL_BOOL, the method calls became CALL_METHOD_DESCRIPTOR_NOARGS. Highlighted lines changed. Same bytecode count; each specialised instruction skips work. Shown by dis.dis(count_tokens, adaptive=True).',panes:[['after 1,000 calls',pre(diffDis(disLoop(D.py_before).join('\n'),disLoop(D.py_after).join('\n')))]]},
      {t:'Still an interpreter',p:'JUMP_BACKWARD_NO_JIT: in Python 3.14 the experimental JIT is compiled into the official macOS and Windows builds but switched off unless PYTHON_JIT=1 is set. So every character still costs '+pyLoopN+' trips through the interpreter loop, which is why the plain Python version of our program is the slowest in section 13.',panes:[['the last instruction of the loop',pre(esc(disLoop(D.py_after).slice(-1)[0]))]]}],
      cnt:[['Translated','at start-up, to bytecode'],['By','CPython\'s compiler'],['Runs on','the CPython interpreter'],['Per character',pyLoopN+' bytecode instructions']]},
    cpp:{stages:['Source','Machine code','Vectorised','Done before running'],steps:[
      {t:'The line, in C++',p:'The same loop over the bytes of a std::string_view (a pointer and a length, no copy). Types are declared: n is a 64-bit unsigned integer, c a byte.',panes:[['tokens.cpp',pre(hl(D.cpp_src,'cpp',[9]))]]},
      {t:'Compiled ahead of time to machine code',p:'clang -O2 hands the code to LLVM, which emits AArch64 machine code. This is the simple version of the loop, used for the last few bytes: '+(cS.length-1)+' instructions per byte and no branch for the if: csel ("conditional select") picks 0 or 1 without jumping.',panes:[['clang -O2 -S, the scalar loop',asmPre(cS)]]},
      {t:'Then rewritten to do '+cStep+' bytes at a time',p:'The optimiser saw that each step only needs the current and the previous byte, so it rewrote the main loop with SIMD instructions (the ".2s", ".8b", ".16b" suffixes act on several values at once): '+(cV.length-1)+' instructions for '+cStep+' bytes, about '+((cV.length-1)/cStep).toFixed(1)+' per byte. Nobody asked for this; the zero-overhead principle lets the compiler do it because nothing in the language gets in the way.',panes:[['clang -O2 -S, the vector loop (excerpt)',asmPre(short(cV))]]},
      {t:'The result is a file of machine code',p:'Nothing is translated or checked while the program runs: no interpreter, no warm-up, no type checks. If the code were wrong (an out-of-range index, a freed pointer), nothing would notice either: that is section 10.',panes:[]}],
      cnt:[['Translated','before running'],['By','Apple clang 17 + LLVM'],['Runs on','the processor directly'],['Per byte',(cS.length-1)+' instructions (scalar); '+((cV.length-1)/cStep).toFixed(1)+' vectorised']]},
    rs:{stages:['Source','Machine code','Vectorised','Done before running'],steps:[
      {t:'The line, in Rust',p:'The same loop over text.bytes(). Iterating with an iterator, not an index, means there is no bounds check to pay for.',panes:[['tokens.rs',pre(hl(D.rs_src,'rs',[8,9,10]))]]},
      {t:'Compiled ahead of time by rustc and LLVM',p:'rustc checks types and ownership, lowers the code to LLVM, and LLVM emits machine code. The simple loop is '+(rS.length-1)+' instructions per byte, branch-free like clang\'s.',panes:[['rustc -C opt-level=3 --emit asm, the scalar loop',asmPre(rS)]]},
      {t:'Rewritten to do '+rStep+' bytes at a time',p:'Same idea as clang, wider: '+(rV.length-1)+' instructions for '+rStep+' bytes, about '+((rV.length-1)/rStep).toFixed(1)+' per byte. rustc 1.99 ships its own, newer LLVM than this laptop\'s Apple clang 17, and expressed the test as is_ascii_alphanumeric(); small differences like these, not "Rust is faster than C++", explain gaps between the two in the Benchmark tab.',panes:[['rustc --emit asm, the vector loop (excerpt)',asmPre(short(rV))]]},
      {t:'The result is a file of machine code',p:'Like C++, nothing is translated at run time. Unlike C++, the safety checks happened at compile time, and the few that cannot (indexing past the end) stay in the code as a check that panics.',panes:[]}],
      cnt:[['Translated','before running'],['By','rustc + LLVM'],['Runs on','the processor directly'],['Per byte',(rS.length-1)+' instructions (scalar); '+((rV.length-1)/rStep).toFixed(1)+' vectorised']]},
    js:{stages:['Source','Ignition bytecode','Watch types','TurboFan code','Deopt if wrong'],steps:[
      {t:'The line, in JavaScript',p:'The same loop; text.charCodeAt(i) gives the character\'s UTF-16 code (section 7). No types are written: V8 will have to find them out.',panes:[['tokens.js (tsc output)',pre(hl(D.ts_js,'ts',[8,9]))]]},
      {t:'Compiled to bytecode for the Ignition interpreter',p:'Like CPython, V8 starts with bytecode, but for a register machine (r0 is n, r1 is inside). The bracketed numbers such as [7] are feedback slots: where V8 records which types each operation actually saw.',panes:[['node --print-bytecode, the loop body',pre(esc(v8bc))]]},
      {t:'Hot and stable: send it to the optimiser',p:'After enough calls with the same types, V8 marks the function for TurboFan, its optimising compiler, which runs on a background thread. Real trace lines from node --trace-opt:',panes:[['node --trace-opt',pre(esc(mark+'\n'+done))]]},
      {t:'Machine code, specialised to what it saw',p:'TurboFan\'s code compares each character with 97, 122, 65, 90, 48 and 57 (a, z, A, Z, 0, 9) directly, like clang\'s. Before the loop it checks the string\'s representation: ldrb reads one-byte strings, ldrh two-byte (UTF-16) strings. The whole function is '+D.v8_opt_size+' bytes of machine code, guards included.',panes:[['node --print-opt-code (excerpt)',pre(esc(D.v8_opt))]]},
      {t:'If a guess breaks, back to the interpreter',p:'Optimised code is a bet. In this run V8 also optimised the top-level loop, then threw that code away when it reached a property access it had no type feedback for. That is a deoptimisation; it costs time, not correctness.',panes:[['node --trace-deopt',pre(esc(bail.replace(/, pc .*$/,' ...')))]]}],
      cnt:[['Translated','while running, twice'],['By','V8: Ignition, then TurboFan'],['Runs on','interpreter, then machine code'],['Per character','tens of machine instructions, no interpreter']]},
    ts:{stages:['Source with types','tsc: check and erase','Run as JavaScript'],steps:[
      {t:'The line, in TypeScript',p:'The same JavaScript with type annotations (highlighted lines): text: string, : number. They let tsc catch countTokens(42) before running (section 3).',panes:[['tokens.ts',pre(hl(D.ts_src,'ts',tsLines))]]},
      {t:'tsc checks, then deletes the types',p:'Compare the two: the annotations are gone and nothing was added. No runtime check that text is a string survives. TypeScript\'s design goals ask for exactly this: "Impose no runtime overhead on emitted programs."',panes:[['tokens.ts',pre(hl(D.ts_src,'ts',tsLines))],['tsc output: tokens.js',pre(hl(D.ts_js,'ts'))]]},
      {t:'What runs is JavaScript',p:'node tokens.ts also works: Node 22.18 and later strip the annotations themselves (replacing them with spaces) without type-checking. Either way V8 gets the JavaScript of the previous step and runs it exactly as in the JavaScript view.',panes:[['node tokens.ts',pre(esc(D.ts_node))]]}],
      cnt:[['Translated','tsc before; V8 while running'],['By','tsc, then V8'],['Runs on','V8, as JavaScript'],['Types at run time','none']]}
  };
  let mode='py';
  const stg=document.getElementById('rd-run-stage'),cap=document.getElementById('rd-run-cap'),panes=document.getElementById('rd-run-panes'),cnt=document.getElementById('rd-run-cnt');
  function draw(i){const m=M[mode],s=m.steps[i];
    stg.innerHTML=m.stages.map((n,k)=>'<span class="'+(k===i?'on':k<i?'done':'')+'">'+n+'</span>').join('');
    cap.innerHTML='<div class="t">'+(i+1)+'/'+m.steps.length+'. '+s.t+'</div><p>'+s.p+'</p>';
    panes.innerHTML=s.panes.map(([h,b])=>'<div><h5>'+esc(h)+'</h5>'+b+'</div>').join('');
    cnt.innerHTML=m.cnt.map(([k,v])=>RD.stat(k,esc(v))).join('')}
  const A=RD.anim({card:'rd-run-card',ctl:'rd-run-ctl',n:M.py.steps.length,draw,ms:4200,label:'Step of the compilation route'});
  RD.seg(document.getElementById('rd-run-seg'),m=>{mode=m;A.reset(M[m].steps.length)});
})();
