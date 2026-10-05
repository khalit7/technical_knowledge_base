// ---- Part 1: Object lifetimes tab ----
(function(){
  const what={scope:'Three locals in two nested blocks.',copymove:'Copy construction, move construction and copy assignment of one object.',
    calls:'Pass by reference, by value (copy), by value (move), and return by value.',growth:'Three push_back calls on an empty vector; Tracer\'s move constructor is noexcept.',
    growth_nx:'The same three push_back calls; the only change is that the move constructor is not marked noexcept.',reserve:'reserve(3), then three emplace_back calls.',
    unique:'A heap object owned by a unique_ptr, ownership moved, then released early.',shared:'A heap object with two shared_ptr owners for a while.',unwind:'An exception thrown out of a block that holds a local.'};
  const w=document.getElementById('ca-lf-what');
  const m=CA.life.mount({el:'ca-lf',card:'ca-lf-card',ctl:'ca-lf-ctl',key:'scope',tab:'t-ca-life'});
  const seg=document.getElementById('ca-lf-seg');
  const show=k=>{w.textContent=what[k]+' Command: '+window.CA_DATA.lifetime[k].cmd;};
  RD.seg(seg,k=>{m.set(k);show(k)});show('scope');
})();
