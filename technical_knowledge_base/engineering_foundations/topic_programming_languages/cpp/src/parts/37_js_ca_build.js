// ---- Part 1: Build pipeline tab. All numbers and texts come from CA_DATA.build (recorded outputs) ----
(function(){
  const B=window.CA_DATA.build,O=B.out,F=B.files,esc=CA.esc;
  const body=n=>O[n].split('\n').slice(1).join('\n').replace(/\n+$/,'');      // output without its "$ command" line
  const cmd=n=>O[n].split('\n')[0];
  const pre=(n,extra)=>'<pre class="ca-out'+(/\[exit code/.test(O[n])?' ca-bad':'')+'"><span class="ca-cmd">'+esc(cmd(n))+'</span>\n'+esc(body(n))+(extra||'')+'</pre>';
  const nums=s=>(s.match(/\d+/g)||[]).map(Number);
  // line counts: b_pp_count prints wc of the sources, then the main TU; b_pp_tokens the tokens TU
  const lines=f=>F[f].split('\n').length;
  const tuMain=+(O.b_pp_count.match(/total\n\s*(\d+)/)||[0,0])[1],tuTok=nums(body('b_pp_tokens'))[0];
  const size={};body('b_sizes').split('\n').forEach(l=>{const m=l.trim().match(/^(\d+) (\S+)$/);if(m)size[m[2]]=+m[1]});
  // nm output: one block per object file, separated by ---
  function syms(n){return body(n).split('---').map(b=>b.split('\n').map(l=>l.match(/^\s*[0-9a-f]*\s+([TU]) (.+)$/)).filter(Boolean).map(m=>({k:m[1],s:m[2]})))}
  const nmOk=syms('b_nm'),nmOdr=syms('b_odr_nm');
  const short=s=>s.replace(/std::__1::basic_string_view<char, std::__1::char_traits<char> >/,'std::string_view');
  const MAX=Math.max(tuMain,tuTok);
  const bar=n=>'<div class="ca-bar" style="width:'+Math.max(1.5,100*n/MAX).toFixed(2)+'%"></div>';
  const symHTML=(list,linked)=>'<div class="ca-sym">'+list.map(x=>'<div class="'+(linked&&x.k==='U'?'ok':x.k)+'">'+x.k+' '+esc(short(x.s))+'</div>').join('')+'</div>';
  const box=(id,nm,d,extra)=>'<div class="ca-f" data-id="'+id+'"><span class="nm">'+esc(nm)+'</span><span class="d">'+d+'</span>'+(extra||'')+'</div>';
  const fmt=n=>n.toLocaleString('en-US');
  function layout(sc){
    const odr=sc==='odr';
    const src=odr?[box('s-h','util.h',lines('odr/util.h')+' lines: defines twice()',bar(lines('odr/util.h'))),box('s-a','a.cpp',lines('odr/a.cpp')+' lines',bar(3)),box('s-b','b.cpp',lines('odr/b.cpp')+' lines',bar(3))]
      :[box('s-main','main.cpp',lines('build1/main.cpp')+' lines',bar(lines('build1/main.cpp'))),box('s-h','tokens.h',lines('build1/tokens.h')+' lines',bar(lines('build1/tokens.h'))),box('s-tok','tokens.cpp',lines('build1/tokens.cpp')+' lines',bar(lines('build1/tokens.cpp')))];
    const tu=odr?[box('tu-a','a.cpp + util.h','a few lines: util.h holds no includes'),box('tu-b','b.cpp + util.h','a few lines')]
      :[box('tu-main','main.cpp + tokens.h + <string_view> + <cstdio>',fmt(tuMain)+' lines after #include',bar(tuMain)),box('tu-tok','tokens.cpp + tokens.h + <cctype> ...',fmt(tuTok)+' lines',bar(tuTok))];
    const ob=odr?[box('o-a','a.o','',symHTML(nmOdr[0])),box('o-b','b.o','',symHTML(nmOdr[1]))]
      :[box('o-main','main.o',fmt(size['main.o'])+' bytes',symHTML(nmOk[0])),box('o-tok','tokens.o',fmt(size['tokens.o'])+' bytes',symHTML(nmOk[1]))];
    const ex=sc==='missing'?box('x-app','app','not produced: link failed'):odr?box('x-app','app','see the steps'):box('x-app','app',fmt(size['app'])+' bytes; also needs libc++ and libSystem at run time');
    return '<div class="ca-stage" data-s="1"><div class="h">1 Sources</div>'+src.join('')+'</div><div class="ca-stage" data-s="2"><div class="h">2 Preprocessed</div>'+tu.join('')+'</div><div class="ca-stage" data-s="3"><div class="h">3 Compiled</div>'+ob.join('')+'</div><div class="ca-stage" data-s="4"><div class="h">4 Linked</div>'+ex+'</div>';
  }
  const fileCode=f=>'<div class="ca-src"><div class="ca-fn">'+esc(f.split('/').pop())+'</div><pre class="ca-code">'+F[f].split('\n').map(CA.hl).join('\n')+'</pre></div>';
  const common=[
    {vis:['s-main','s-h','s-tok'],act:['s-main','s-h','s-tok'],cap:'Three source files: a header that declares count_tokens, a .cpp that defines it, and main.cpp that calls it. Together '+(lines('build1/main.cpp')+lines('build1/tokens.h')+lines('build1/tokens.cpp'))+' lines.',det:fileCode('build1/main.cpp')+fileCode('build1/tokens.h')},
    {vis:['s-main','s-h','s-tok','tu-main'],act:['tu-main'],cap:'The preprocessor pastes tokens.h, and through it the standard headers, into main.cpp: '+fmt(tuMain)+' lines for the compiler to read. The last lines are your code:',det:pre('b_pp_head')+pre('b_pp_count')},
    {vis:['s-main','s-h','s-tok','tu-main','tu-tok'],act:['tu-tok'],cap:'tokens.cpp becomes its own translation unit of '+fmt(tuTok)+' lines. The two are processed separately; neither sees the other.',det:pre('b_pp_tokens')},
    {vis:['s-main','s-h','s-tok','tu-main','tu-tok','o-main','o-tok'],act:['o-main','o-tok'],cap:'Each translation unit compiles to an object file of machine code. main.o needs count_tokens and printf (U); tokens.o defines count_tokens (T). The compiler trusted the declaration in tokens.h.',det:pre('b_compile')+pre('b_nm')}
  ];
  const incr=O.b_incr.replace(/\n+$/,'').split(/\n(?=\$ )/);   // three '$ command' blocks
  const pinc=i=>'<pre class="ca-out">'+esc(incr[i])+'</pre>';
  const all=['s-main','s-h','s-tok','tu-main','tu-tok','o-main','o-tok','x-app'];
  const SC={
    ok:common.concat([
      {vis:all,act:['o-main','o-tok','x-app'],linked:true,cap:'The linker matches main.o\'s U count_tokens to tokens.o\'s T count_tokens (now green), leaves printf to the dynamic system library, and writes the executable.',det:pre('b_link_ok')+pre('b_otool')},
      {vis:all,act:['x-app'],linked:true,cap:'The program runs: "C++ is fun, x86_64 too" has 6 tokens under the root page\'s rule (C, is, fun, x86, 64, too).',det:pre('b_sizes')}]),
    missing:common.concat([
      {vis:all,act:['o-main'],err:['x-app'],cap:'Link only main.o. Nothing defines count_tokens, so the linker (ld), not the compiler, fails: "Undefined symbols". The compile step had succeeded.',det:pre('b_link_missing')}]),
    odr:[
      {vis:['s-h','s-a','s-b'],act:['s-h'],cap:'util.h defines a function body, not just a declaration, and both a.cpp and b.cpp include it.',det:fileCode('odr/util.h')+fileCode('odr/a.cpp')+fileCode('odr/b.cpp')},
      {vis:['s-h','s-a','s-b','tu-a','tu-b'],act:['tu-a','tu-b'],cap:'After preprocessing, each translation unit contains its own copy of twice().',det:''},
      {vis:['s-h','s-a','s-b','tu-a','tu-b','o-a','o-b'],act:['o-a','o-b'],cap:'So each object file defines twice(int): two T entries for one name.',det:pre('b_odr_nm')},
      {vis:['s-h','s-a','s-b','tu-a','tu-b','o-a','o-b','x-app'],act:['o-a','o-b'],err:['x-app'],cap:'The one definition rule is broken and the linker refuses: "duplicate symbol".',det:pre('b_odr')},
      {vis:['s-h','s-a','s-b','tu-a','tu-b','o-a','o-b','x-app'],act:['x-app'],cap:'The fix: mark the function inline (util_inline.h). The linker keeps one copy; the program links and exits with 0.',det:fileCode('odr/util_inline.h')+pre('b_odr_fix')}],
    incr:[
      {vis:all,act:all,linked:true,cap:'The CMake project of Reading section 1 builds tokens.cpp into a static library, libtokens.a, and links it into tokcount. Ninja records what each output was built from.',det:pre('b_cmake2')},
      {vis:all,act:['s-tok','tu-tok','o-tok','x-app'],linked:true,cap:'Edit tokens.cpp (here: touch it). Only tokens.cpp recompiles; the library and the program relink. main.cpp is untouched.',det:pinc(0)},
      {vis:all,act:['s-h','tu-main','tu-tok','o-main','o-tok','x-app'],linked:true,cap:'Edit tokens.h. Both .cpp files include it, so both recompile: headers are why big C++ projects rebuild slowly.',det:pinc(1)},
      {vis:all,act:[],linked:true,cap:'Change nothing and build again: nothing to do.',det:pinc(2)}]
  };

  let sc='ok';
  const pipe=document.getElementById('ca-bd-pipe'),cap=document.getElementById('ca-bd-cap'),det=document.getElementById('ca-bd-detail');
  function draw(i){const s=SC[sc][i];pipe.innerHTML=layout(sc);
    if(!s.linked)pipe.querySelectorAll('.ca-sym .ok').forEach(e=>e.className='U');
    if(s.linked)pipe.querySelectorAll('.ca-sym .U').forEach(e=>e.className=/printf|strlen|maskrune|DefaultRune/.test(e.textContent)?'U':'ok');
    pipe.querySelectorAll('.ca-f').forEach(e=>{const id=e.dataset.id;e.classList.toggle('vis',s.vis.includes(id));e.classList.toggle('act',(s.act||[]).includes(id));e.classList.toggle('err',(s.err||[]).includes(id))});
    pipe.querySelectorAll('.ca-stage').forEach(st=>st.classList.toggle('on',!!st.querySelector('.act,.err')));
    cap.innerHTML='<b>Step '+(i+1)+' of '+SC[sc].length+'.</b> '+esc(s.cap);det.innerHTML=s.det}
  const a=CA.anim({card:'ca-bd-card',ctl:'ca-bd-ctl',n:SC.ok.length,draw,ms:2600,label:'Build step'},'t-ca-build');
  RD.seg(document.getElementById('ca-bd-seg'),k=>{sc=k;a.reset(SC[k].length);a.play()});
})();
