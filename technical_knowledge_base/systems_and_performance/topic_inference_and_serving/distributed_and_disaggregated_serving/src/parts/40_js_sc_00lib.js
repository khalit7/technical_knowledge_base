// ---- Shared pieces of this page's 3D scenes (renderer v2, 25_js_s3.js): a GPU, labels, and the fade rule ("a step that changes the
// whole picture fades the old one out fully before the new one appears"). Numbers come from window.DDC (recompute.py, the planner). ----
window.DDS=(function(){
  if(!window.S3)return null;const {mix}=S3;
  // alpha of something shown on the steps where on(k) is true: it fades out over the first 40% of a step change, then the new one fades in
  function vis(k,e,st,on){const a=on(k),b=on(st.pk==null?k:st.pk);if(a&&b)return 1;if(a)return st.e>=1?1:Math.max(0,(e-.4)/.6);if(b)return st.e>=1?0:Math.max(0,1-e/.4);return 0}
  // an H200 as a white board on the floor: centre of its bottom face c, size s; o.hl outlines it in a colour, o.a alpha
  function gpu(R,c,s,o){o=o||{};const P=R.P;R.box(c,s,{fill:o.fill||P.paper,a:o.a==null?1:o.a,ec:o.hl||null,lw:o.hl?2:.9});
    if(o.die!==false)R.box([c[0],c[1]+s[1],c[2]],[s[0]*.42,.04,s[2]*.42],{fill:mix(P.paper,P.mute,.35),a:(o.a==null?1:o.a)*.9,shadow:false,lw:.6})}
  function lab(R,p,t,o){R.label(p,t,Object.assign({fs:12.5},o||{}))}
  const f0=x=>Number(x).toLocaleString('en-US',{maximumFractionDigits:0}),f1=x=>Number(x).toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1});
  return {vis,gpu,lab,f0,f1};
})();
