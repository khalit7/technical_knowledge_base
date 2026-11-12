// ---- Shared helpers for this page's tabs (prefix ss). SSU.anim is RD.anim (autoplay on view, step list on the left). ----
window.SSU=(function(){
  const RM=RD.RM, esc=RD.esc;
  const onTab=(tab,f)=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[tab]=window.TAB_RENDER[tab]||[]).push(f)};
  // every Reading animation is RD.anim (template 21_js_rd_common.js): plays once at least half in view, stops for good on a reader control or at its last step, never moves by itself under reduced motion
  const anim=o=>RD.anim(o);
  const MB=b=>b>=1e9?(b/1e9).toFixed(2)+' GB':b>=1e6?(b/1e6).toFixed(b>=1e8?0:2)+' MB':b>=1e3?(b/1e3).toFixed(1)+' KB':Math.round(b)+' B';
  const sci=x=>{if(x===0)return '0';const e=Math.floor(Math.log10(Math.abs(x)));const m=x/Math.pow(10,e);return m.toFixed(1)+'e'+(e<0?'&minus;'+(-e):e)};
  const num=(x,d)=>Number(x).toLocaleString('en-GB',{maximumFractionDigits:d==null?0:d,minimumFractionDigits:d==null?0:d});
  const kindCls={'all-reduce':'ss-k-ar','all-gather':'ss-k-ag','reduce-scatter':'ss-k-rs','all-to-all':'ss-k-a2a','collective-permute':'ss-k-cp'};
  const chip=(k,txt)=>'<span class="ss-coll '+(kindCls[k]||'')+'">'+esc(txt||k)+'</span>';
  const ref=k=>{const r=SS.source.refs[k];return r?'<code>'+esc(r.file)+':'+r.line+'</code>':'<code>?</code>'};
  // wire segmented buttons; returns current value getter
  function seg(el,f){el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!el.contains(b))return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));f(b.dataset.m)})}
  return {RM,esc,onTab,anim,MB,sci,num,chip,ref,seg,width:RD.width};
})();
