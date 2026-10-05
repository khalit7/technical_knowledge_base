// ---- Reading section 5: the same dangling reference in C++ (runs, reads freed memory), Rust (refused at compile time) and Python (refcount keeps it alive) ----
(function(){
  const R=window.RDD&&window.RDD.own;if(!R||!document.getElementById('rd-own-card'))return;
  const esc=RD.esc,pre=RDH.pre,hl=RDH.hl,out=RDH.outHtml;
  const svgEl=document.getElementById('rd-own-svg'),cap=document.getElementById('rd-own-cap'),panes=document.getElementById('rd-own-panes');
  // scene: boxes {x,y,w,h,t (label), s (sub), st: '' | 'freed' | 'new' | 'err'} in a 600 x 210 space (wide) or 340 x 300 (narrow); arrows [x1,y1,x2,y2,st]
  function scene(mode,k,nar){
    // two columns: stack on the left, heap on the right; in the narrow layout the heap's second column goes below
    const B=[],A=[];const sx=8,sw=nar?132:170,hx=nar?156:240,hw=nar?176:180,hy=20;
    const stack=(y,t,s,st)=>{B.push({x:sx,y,w:sw,h:34,t,s,st});return {x:sx+sw,y:y+17}};
    B.push({x:sx,y:2,w:0,h:0,t:'stack (main\'s frame)',lab:1});B.push({x:hx,y:2,w:0,h:0,t:'heap',lab:1});
    const x2=nar?hx:hx+hw+40,y2=nar?hy+92:hy;   // where the pointed-to object goes
    if(mode==='py'){
      const u=stack(hy,'users','list, refcount '+(k>=3?'0: freed':'1'),k>=3?'freed':'');
      const f=k>=1&&k<4?stack(hy+46,'first','name bound to the User'):null;
      if(k<3){B.push({x:hx,y:hy,w:hw,h:34,t:k>=2?'new pointer array':'pointer array',s:k>=2?'grown for 101 slots':'1 slot',st:k>=2?'new':''});A.push([u.x,u.y,hx,hy+17])}
      if(k===2)B.push({x:hx,y:hy+44,w:hw,h:34,t:'old pointer array',s:'freed by the list',st:'freed'});
      const rc=k===0?1:k<3?2:k===3?1:0;
      const oy=nar?(k===2?hy+92:hy+92):hy;
      B.push({x:x2,y:oy,w:hw,h:34,t:'User object',s:'"u0029-..." refcount '+rc+(rc===0?': freed':''),st:rc===0?'freed':''});
      if(k<3)A.push(nar?[hx+hw/2,hy+34,x2+hw/2,oy]:[hx+hw,hy+17,x2,oy+17]);
      if(f)A.push([f.x,f.y,x2,oy+26]);
      return {B,A,W:nar?340:640,H:nar?150:110};
    }
    const u=stack(hy,'users',mode==='cpp'?'std::vector header':'Vec header');
    const f=k>=1?stack(hy+46,'first',mode==='cpp'?'const std::string&':'&String (a borrow)',mode==='rs'&&k>=2?'err':''):null;
    const oldSt=k>=2&&mode==='cpp'?'freed':'';
    B.push({x:hx,y:hy,w:hw,h:34,t:'buffer A, 1 slot',s:oldSt?'freed by push_back':'string 0 (24 bytes)',st:oldSt});
    const moved=mode==='cpp'&&k>=2;
    if(moved){B.push({x:hx,y:hy+44,w:hw,h:34,t:'buffer B, 2 slots',s:'string 0 moved here',st:'new'});A.push([u.x,u.y,hx,hy+61])}
    else A.push([u.x,u.y,hx,hy+17]);
    B.push({x:x2,y:y2,w:hw,h:34,t:'characters',s:'"u0029-the-heaviest-user"'});
    A.push(nar?[hx+hw-20,moved?hy+78:hy+34,x2+hw-20,y2]:[hx+hw,moved?hy+61:hy+17,x2,y2+17]);
    if(f)A.push([f.x,f.y,hx,hy+28,moved?'freed':mode==='rs'&&k>=2?'err':'']);
    if(mode==='rs'&&k>=2)B.push({x:sx,y:nar?hy+136:hy+92,w:nar?324:sw+hw*2+56,h:34,t:'users.push(...) needs &mut users: refused',s:'first still borrows users (error E0502)',st:'err'});
    return {B,A,W:nar?340:640,H:nar?(mode==='rs'&&k>=2?194:150):(mode==='rs'&&k>=2?150:110)};
  }
  function render(sc){const col={'':'var(--soft)',freed:'var(--bg)',new:'var(--acc2)',err:'var(--bg)'},str={'':'var(--line)',freed:'var(--bad)',new:'var(--acc)',err:'var(--bad)'};
    let b='<defs><marker id="rdo-ar" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L6 3L0 6z" fill="var(--ink)"/></marker><marker id="rdo-arb" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L6 3L0 6z" fill="var(--bad)"/></marker></defs>';
    sc.B.forEach(o=>{if(o.lab){b+=RD.t(o.x,o.y+10,o.t,{fs:10.5,fill:'var(--mute)',w:600});return}
      b+='<rect x="'+o.x+'" y="'+o.y+'" width="'+o.w+'" height="'+o.h+'" rx="5" fill="'+col[o.st]+'" stroke="'+str[o.st]+'"'+(o.st==='freed'?' stroke-dasharray="4 3"':'')+'/>'+
        RD.t(o.x+7,o.y+14,esc(o.t),{fs:11,w:600,fill:o.st==='freed'||o.st==='err'?'var(--bad)':'var(--ink)'})+(o.s?RD.t(o.x+7,o.y+28,esc(o.s),{fs:10,fill:'var(--mute)'}):'')});
    sc.A.forEach(([x1,y1,x2,y2,st])=>{const c=st?'var(--bad)':'var(--ink)';const v=Math.abs(x2-x1)<30;b+='<path d="M'+x1+' '+y1+' C '+(v?x1:x1+40)+' '+(v?(y1+y2)/2:y1)+', '+(v?x2:x2-40)+' '+(v?(y1+y2)/2:y2)+', '+x2+' '+y2+'" fill="none" stroke="'+c+'" stroke-width="1.4"'+(st?' stroke-dasharray="5 3"':'')+' marker-end="url(#'+(st?'rdo-arb':'rdo-ar')+')"/>'});
    svgEl.innerHTML=RD.svg(sc.W,sc.H,b,'Stack and heap boxes with references')}
  const S={
    cpp:[{t:'users.push_back("u0029-the-heaviest-user")',p:'The vector\'s header lives on the stack; its elements live in a heap buffer with room for one std::string, and this name is long enough that its characters get their own heap block.',pane:['dangle.cpp',pre(hl(R.cpp_src,'cpp',[7]))]},
      {t:'const std::string& first = users[0];',p:'A C++ reference is the address of slot 0 inside buffer A. It does not own anything and keeps nothing alive.',pane:['dangle.cpp',pre(hl(R.cpp_src,'cpp',[8]))]},
      {t:'users.push_back(...) needs more room',p:'Buffer A is full, so the vector allocates buffer B, moves the strings into it and frees buffer A. first still holds buffer A\'s address: it now dangles. The compiler said nothing; this is legal C++ to write and undefined behaviour to use.',pane:['dangle.cpp',pre(hl(R.cpp_src,'cpp',[9,10]))]},
      {t:'std::cout << first: reading freed memory',p:'Run normally, the program printed an empty name and exited with status 0, as if nothing were wrong. Another run, compiler or machine may print garbage or crash.',pane:['clang++ dangle.cpp && ./a.out',pre(out(R.cpp_plain),'out')]},
      {t:'The same binary built with AddressSanitizer',p:'-fsanitize=address makes every allocation and free tracked, so the bad read stops the program with a report: what was read (line 11), where it was freed (the push_back on line 10) and where it was allocated (line 7). The 24-byte region is buffer A: one std::string is 24 bytes.',pane:['clang++ -fsanitize=address dangle.cpp && ./a.out (LLVM 23; library frames collapsed)',pre(out(R.cpp_asan),'out')]}],
    rs:[{t:'users.push("u0029-the-heaviest-user".to_string())',p:'Same layout as C++: a Vec header on the stack, a heap buffer, and the String\'s characters in their own heap block.',pane:['dangle.rs',pre(hl(R.rs_src,'rs',[4]))]},
      {t:'let first = &users[0];',p:'first borrows from users. The compiler records the borrow and how long it lasts: until the last use of first, on line 9.',pane:['dangle.rs',pre(hl(R.rs_src,'rs',[5]))]},
      {t:'users.push(...) is refused',p:'push needs exclusive (&mut) access to users while first still holds a shared borrow: "aliasing or mutation, not both" (section 4). The compiler stops here with error E0502 and points at all three places. There is no binary to run, so the dangling read can never happen.',pane:['rustc dangle.rs',pre(out(R.rs_err),'out')]},
      {t:'The fixes the compiler pushes you towards',p:'Copy what you need before mutating (let first = users[0].clone();), keep an index instead of a reference (let first = 0; then users[first]), or finish using first before pushing. Each makes the ownership explicit instead of hoping the buffer does not move.',pane:['dangle.rs',pre(hl(R.rs_src,'rs',[5,7,9]))]}],
    py:[{t:'users = [User("u0029-the-heaviest-user")]',p:'The list holds a pointer to a User object on the heap; the object\'s reference count is 1.',pane:['dangle.py',pre(hl(R.py_src,'py',[9]))]},
      {t:'first = users[0]',p:'first is a second reference to the same object, not to the list\'s slot. The count goes to 2.',pane:['dangle.py',pre(hl(R.py_src,'py',[10]))]},
      {t:'users.append(...) 100 times',p:'The list\'s pointer array is reallocated as it grows, exactly like the C++ buffer. But first never pointed into that array, so nothing dangles.',pane:['dangle.py',pre(hl(R.py_src,'py',[11,12]))]},
      {t:'del users',p:'The list and the other 100 users are freed at once; the u0029 object survives because first still references it (count 1). print(first.name) works.',pane:['dangle.py',pre(hl(R.py_src,'py',[14,15]))]},
      {t:'del first',p:'The count reaches 0 and CPython frees the object immediately: __del__ runs between the two prints. Reference counting makes freeing deterministic; the cycle collector only handles objects that reference each other.',pane:['python3.14 dangle.py',pre(out(R.py_out),'out')]}]
  };
  let mode='cpp';
  function draw(i){const s=S[mode][i];const nar=RD.width(svgEl)<520;
    render(scene(mode,i,nar));
    cap.innerHTML='<div class="t">'+(i+1)+'/'+S[mode].length+'. '+esc(s.t)+'</div><p>'+esc(s.p)+'</p>';
    panes.innerHTML='<div><h5>'+esc(s.pane[0])+'</h5>'+s.pane[1]+'</div>'}
  const A=RD.anim({card:'rd-own-card',ctl:'rd-own-ctl',n:S.cpp.length,draw,ms:4800,label:'Step of the dangling-reference story'});
  RD.seg(document.getElementById('rd-own-seg'),m=>{mode=m;A.reset(S[m].length)});
  RD.onResize(()=>A.redraw());
})();
