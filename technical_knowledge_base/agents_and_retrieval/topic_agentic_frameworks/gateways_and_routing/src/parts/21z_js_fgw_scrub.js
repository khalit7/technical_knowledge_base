// ---- A reader-driven replay widget (2026-11-06 rule for long replays): back, forward and a scrubber, no play button, no autoplay,
// no step list; it opens on an informative frame (usually the last) and is explained by the paragraph beside it. ----
RD.scrub=function(o){
  const ctl=document.getElementById(o.ctl),pid=o.ctl+'-';const st={i:o.start==null?o.n-1:o.start,n:o.n};
  ctl.innerHTML='<button id="'+pid+'b" aria-label="Previous event" title="Previous">&#9664;</button>'+
    '<input type="range" id="'+pid+'s" min="0" max="'+(st.n-1)+'" value="'+st.i+'" step="1" aria-label="'+(o.label||'Event')+'">'+
    '<button id="'+pid+'f" aria-label="Next event" title="Next">&#9654;</button>';
  const $=s=>document.getElementById(pid+s);
  function show(){const s=$('s');s.max=st.n-1;s.value=st.i;o.draw(st.i)}
  $('b').addEventListener('click',()=>{st.i=Math.max(0,st.i-1);show()});
  $('f').addEventListener('click',()=>{st.i=Math.min(st.n-1,st.i+1);show()});
  $('s').addEventListener('input',e=>{st.i=+e.target.value;show()});
  show();
  return {reset(n,i){st.n=n;st.i=i==null?n-1:i;show()},go(i){st.i=Math.max(0,Math.min(st.n-1,i));show()},redraw(){o.draw(st.i)},get i(){return st.i},get n(){return st.n}};
};
