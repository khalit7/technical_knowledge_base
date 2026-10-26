// ---- Shared helpers (copied from the C++ page's Part 1). Everything here is prefixed CA / ca- ----
window.CA=(function(){
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const KW=new Set(('alignas auto bool break case catch char class concept const consteval constexpr constinit continue co_await co_return co_yield decltype default delete do double else enum explicit export extern false float for friend if inline int long mutable namespace new noexcept nullptr operator override private protected public requires return short signed sizeof static static_assert static_cast struct switch template this throw true try typedef typename union unsigned using virtual void volatile while').split(' '));
  // syntax colouring for one line of C++ (same classes as the generated code panels)
  function hl(line){
    const re=/(\/\/.*$)|(^\s*#.*$)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|([A-Za-z_]\w*)|([\s\S])/g;let m,o='';
    while((m=re.exec(line))){if(m[1])o+='<span class="ca-cm">'+esc(m[1])+'</span>';else if(m[2])o+='<span class="ca-pp">'+esc(m[2])+'</span>';
      else if(m[3])o+='<span class="ca-st">'+esc(m[3])+'</span>';else if(m[4])o+=KW.has(m[4])?'<span class="ca-kw">'+m[4]+'</span>':m[4];else o+=esc(m[5])}
    return o}
  function onTab(id,f){(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[id]=window.TAB_RENDER[id]||[]).push(f)}
  // step-animation controller: reuse the page's RD.anim, but redraw when one of our tabs opens
  function anim(o,tab){const a=RD.anim(o);onTab(tab,()=>a.redraw());return a}
  return {esc,hl,onTab,anim};
})();
