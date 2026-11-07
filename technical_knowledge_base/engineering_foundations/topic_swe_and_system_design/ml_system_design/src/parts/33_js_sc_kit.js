// ---- Shared pieces for this page's 3D scenes (renderer v2, 26_js_s3.js): parts of the system as blocks on the floor, processing steps as upright
// glass plates the data passes through, logs as stacks of slabs, counts as bars on white plinths, and path helpers for flows. ----
window.MSK=(function(){
  if(!window.S3)return null;
  const {mix,lerp3,cl}=S3;
  const up=(p,y)=>[p[0],y,p[2]];
  // a label only when its anchor is on the canvas (the renderer clamps labels inside it, so names of things a close view leaves out would pile up at its edge)
  function lab(R,p,text,o){if(text==null||text==='')return;const q=R.p(p);if(q[2]<=0||q[0]<-4||q[0]>R.W+4||q[1]<-4||q[1]>R.H+4)return;R.label(p,text,o)}
  // a block on the floor with its name above it; o.a fades it, o.sub a second line
  function block(R,p,s,c,txt,o){o=o||{};const P=R.P,a=o.a==null?1:o.a;if(a<=.01)return;
    R.box(p,s,{fill:mix(P.paper,c,o.t==null?.3:o.t),a,fa:o.fa,shadow:o.shadow});
    const y=s[1]+(o.ly||0);
    if(txt)lab(R,up(p,y),txt,{b:1,fs:o.fs||13,dy:o.dy==null?-11:o.dy,c:o.lc||P.ink,a:Math.max(o.amin==null?.35:o.amin,a),grp:o.grp,wide:o.wide,al:o.al,dx:o.dx});
    if(o.sub)lab(R,up(p,y),o.sub,{fs:12,dy:(o.dy==null?-11:o.dy)-16,c:o.sc||P.mute,a:Math.max(o.amin==null?.35:o.amin,a),wide:o.subWide==null?1:o.subWide,grp:o.grp,al:o.al,dx:o.dx})}
  // an upright glass plate facing the camera's side (x-y plane), centred on p's x and z, its foot at p's y; label above
  function plate(R,p,c,a,txt,o){o=o||{};if(a<=.01)return;const w=o.w||.9,h=o.h||1.0;
    R.glass([p[0]-w/2,p[1],p[2]],[w,0,0],[0,h,0],{c,nu:o.nu||3,nv:o.nv||4,a,th:.03});
    if(o.glow)R.glow([p[0],p[1]+h/2,p[2]],.55,{c,a:a*o.glow});
    if(txt)lab(R,[p[0],p[1]+h,p[2]],txt,{fs:o.fs||12.5,b:1,c:o.lc||c,dy:o.dy==null?-10:o.dy,a:Math.max(o.amin==null?.35:o.amin,a),grp:o.grp,wide:o.wide,al:o.al,dx:o.dx});
    if(o.sub)lab(R,[p[0],p[1]+h,p[2]],o.sub,{fs:12,c:o.sc||R.P.mute,dy:(o.dy==null?-10:o.dy)-16,a:Math.max(o.amin==null?.35:o.amin,a),wide:1,grp:o.grp,al:o.al,dx:o.dx})}
  // a log: a stack of n thin slabs on the floor (the newest on top, faded in by fresh)
  function stack(R,p,w,d,n,c,a,o){o=o||{};if(a<=.01)return 0;const h=o.h||.08,g=o.g||.03;let y=0;
    for(let i=0;i<n;i++){const fr=i===n-1&&o.fresh!=null?o.fresh:1;if(fr>.01)R.box([p[0],y,p[2]],[w,h,d],{fill:mix(R.P.paper,c,.55),a:a*fr,shadow:i===0,lw:.7});y+=h+g}
    return y}
  // a count as a bar on a white plinth, its text above it
  function bar(R,p,hgt,c,a,txt,o){o=o||{};if(a<=.01)return;const P=R.P,w=o.w||.5,d=o.d||.5,h=Math.max(.02,hgt);
    R.box([p[0],p[1],p[2]],[w+.16,.05,d+.16],{a,shadow:p[1]<.01});
    R.box([p[0],p[1]+.05,p[2]],[w,h,d],{fill:mix(P.paper,c,.72),a,shadow:false});
    if(txt!=null)lab(R,[p[0],p[1]+.05+h,p[2]],txt,{fs:o.fs||13,b:1,mono:o.mono==null?1:o.mono,c:o.lc||P.ink,dy:-10,a,grp:o.grp,wide:o.wide,al:o.al,dx:o.dx})}
  // a cross (an error) and a tick (a success)
  function cross(R,p,a,c,d){const P=R.P;d=d||.2;if(a<=.01)return;c=c||P.bad;
    R.line([[p[0]-d,p[1]-d,p[2]],[p[0]+d,p[1]+d,p[2]]],{c,w:3,a,top:1});R.line([[p[0]-d,p[1]+d,p[2]],[p[0]+d,p[1]-d,p[2]]],{c,w:3,a,top:1})}
  function tick(R,p,a,c){const P=R.P;if(a<=.01)return;c=c||P.good;R.line([[p[0]-.16,p[1],p[2]],[p[0]-.04,p[1]-.12,p[2]],[p[0]+.2,p[1]+.16,p[2]]],{c,w:3,a,top:1})}
  const win=(e,a,b)=>cl((e-a)/(b-a),0,1);
  const seg=(a,b,n)=>{const o=[];n=n||12;for(let i=0;i<=n;i++)o.push(lerp3(a,b,i/n));return o};
  // a polyline through several points, each leg cut into pieces (flows need many points)
  const poly=(ps,n)=>{let o=[ps[0]];for(let i=1;i<ps.length;i++)o=o.concat(seg(ps[i-1],ps[i],n||8).slice(1));return o};
  const arcPts=(R,a,b,h,n)=>{const o=[];n=n||20;for(let i=0;i<=n;i++)o.push(R.arcPt(a,b,h,i/n));return o};
  // the first fraction t of a path (a flow that has only got so far)
  const part=(pts,t)=>{t=cl(t,0,1);const n=pts.length-1,s=t*n,i=Math.min(n-1,Math.floor(s));if(t<=0)return [pts[0],pts[0]];return pts.slice(0,i+1).concat([lerp3(pts[i],pts[i+1],s-i)])};
  // mode chips that swap a stage's step list: el holds <button data-m>, lists are ids prefix+mode
  function chips(el,prefix,st,onMode){if(!el)return;el.addEventListener('click',ev=>{const b=ev.target.closest('button[data-m]');if(!b)return;
    el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    document.querySelectorAll('ol.sx[id^="'+prefix+'"]').forEach(o=>o.hidden=o.id!==prefix+b.dataset.m);
    onMode(b.dataset.m);st.list(prefix+b.dataset.m)})}
  return {up,lab,block,plate,stack,bar,cross,tick,win,seg,poly,arcPts,part,chips};
})();
