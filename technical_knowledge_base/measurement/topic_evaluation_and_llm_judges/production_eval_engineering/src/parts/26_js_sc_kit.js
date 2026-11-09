// ---- Shared pieces for this page's 3D scenes (renderer v2, 25_js_s3.js), after Testing and quality's 44_js_sc_kit.js: labels drawn only while their
// anchor is on the canvas (on a phone, under 520 px of canvas, only labels marked ph:1; the step text names the rest), path helpers for flows,
// a time window inside a step, and signed bars on a plinth. Every number comes from window.PES (22_js_vals.js). ----
window.PEK=(function(){
  if(!window.S3)return null;const {lerp3,cl,mix}=S3;
  function lab(R,p,text,o){o=o||{};if(text==null||R.W<520&&!o.ph)return;const q=R.p(p);if(q[2]<=0||q[0]<-4||q[0]>R.W+4||q[1]<-4||q[1]>R.H+4)return;
    const oo=Object.assign({},o);if(R.W<520)delete oo.grp;R.label(p,text,oo)}
  const win=(e,a,b)=>cl((e-a)/(b-a),0,1);
  const seg=(a,b,n)=>{const o=[];n=n||12;for(let i=0;i<=n;i++)o.push(lerp3(a,b,i/n));return o};
  const poly=(ps,n)=>{const o=[ps[0]];for(let i=1;i<ps.length;i++)seg(ps[i-1],ps[i],n||8).slice(1).forEach(p=>o.push(p));return o};
  // a block standing on the floor with a tinted fill
  const block=(R,c,s,col,a,t,o)=>{o=o||{};if(a<=.01)return;R.box(c,s,Object.assign({fill:mix(R.P.paper,col,t==null?.3:t),a},o))};
  // a signed bar on a plinth at height y0: positive values stand on it, negative ones hang below
  const sbar=(R,x,z,y0,v,sc,w,col,a,o)=>{if(a<=.01)return;const h=Math.max(.012,Math.abs(v)*sc);R.box([x,v>=0?y0:y0-h,z],[w,h,w],Object.assign({fill:col,a,shadow:false,lw:.7},o||{}))};
  return {lab,win,seg,poly,block,sbar};
})();
