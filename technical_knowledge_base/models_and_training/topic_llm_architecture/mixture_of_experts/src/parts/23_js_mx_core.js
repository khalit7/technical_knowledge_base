// ---- MoE child page: shared helpers (window.MX) used by the Reading visuals and the three lab tabs ----
window.MX=(function(){
  const D=window.MXD;if(!D)return null;
  const $=id=>document.getElementById(id);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  // expert colours: readable on both themes (Tableau-style, mid lightness)
  const EC=['#4e79a7','#f28e2b','#e15759','#5fa8a2','#59a14f','#d4b82e','#b07aa1','#ff8f9c','#9c755f','#8f8a87','#3f9fb5','#e7a35a','#6dbb5f','#c4739e','#7aa6dc','#b6992d'];
  const RC={dense:'var(--ink)',moe8:'var(--c1)',moe16s:'var(--c3)',bias:'var(--c2)',sbias:'var(--c5)',none:'#d62728',cap1:'var(--c4)',moe8_s1:'var(--c6)',dense_s1:'var(--mute)'};
  const unb64=s=>{const b=atob(s);const a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a};
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-60))};
  const svg=(w,h,body,label)=>'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+esc(label||'')+'">'+body+'</svg>';
  const tx=(x,y,s,o)=>{o=o||{};return '<text x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' font-size="'+(o.fs||11)+'"'+(o.fill?' fill="'+o.fill+'"':'')+(o.w?' font-weight="'+o.w+'"':'')+'>'+s+'</text>'};
  const f=(v,n)=>v===null||v===undefined||Number.isNaN(v)?'n/a':(+v).toLocaleString('en-GB',{minimumFractionDigits:n,maximumFractionDigits:n});
  const pct=(v,n)=>f(100*v,n===undefined?1:n)+'%';
  const piece=i=>{const p=D.pieces[i];return p===''?'<|endoftext|>':p};
  const show=s=>esc(String(s).replace(/\u010a/g,'\u21b5').replace(/\n/g,'\u21b5')).replace(/ /g,'&#183;');
  const ref=k=>{const r=D.code[k];return r?r[0].split('/').pop()+':'+r[1]:k};
  // register a draw for a tab (drawn when the tab opens and on resize while visible)
  function onTab(id,fn){(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[id]=window.TAB_RENDER[id]||[]).push(fn);
    let t=0;addEventListener('resize',()=>{const el=$(id);if(!el||el.hidden||el.offsetParent===null)return;clearTimeout(t);t=setTimeout(fn,80)})}
  // segmented control: buttons with data-m
  function seg(el,opts,cur,cb){el.innerHTML=opts.map(o=>'<button data-m="'+o[0]+'"'+(o[0]===cur?' class="on"':'')+'>'+o[1]+'</button>').join('');
    el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));cb(b.dataset.m)})}
  // simple multi-series line chart: series [{name,color,pts:[[x,y]],dash}]
  function lines(el,series,o){
    series=series.filter(x=>x.pts&&x.pts.length&&x.pts.every(p=>isFinite(p[0])&&isFinite(p[1])));if(!series.length){el.innerHTML='<p class="small mute">No recorded data yet.</p>';return}
    const W=width(el),nar=W<520,H=o.h||(nar?230:260),pl=nar?40:48,pr=10,pt=10,pb=30;
    const xs=series.flatMap(s=>s.pts.map(p=>p[0])),ys=series.flatMap(s=>s.pts.map(p=>p[1]));
    const x0=o.x0!==undefined?o.x0:Math.min(...xs),x1=o.x1!==undefined?o.x1:Math.max(...xs);
    const y0=o.y0!==undefined?o.y0:Math.min(...ys),y1=o.y1!==undefined?o.y1:Math.max(...ys);
    const X=v=>pl+(W-pl-pr)*(v-x0)/((x1-x0)||1),Y=v=>pt+(H-pt-pb)*(1-(v-y0)/((y1-y0)||1));
    let s='';const nt=nar?4:6;
    for(let i=0;i<=nt;i++){const v=y0+(y1-y0)*i/nt,y=Y(v);s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+tx(pl-4,y+4,f(v,o.yd===undefined?2:o.yd),{a:'end',fs:10.5,fill:'var(--mute)'})}
    (o.xt||[]).forEach(v=>{const x=X(v);s+=tx(x,H-pb+15,o.xf?o.xf(v):f(v,0),{a:v>=x1?'end':v<=x0?'start':'middle',fs:10.5,fill:'var(--mute)'})});
    if(o.xl)s+=tx(pl+(W-pl-pr)/2,H-4,o.xl,{a:'middle',fs:11,fill:'var(--mute)'});
    series.forEach(se=>{const d=se.pts.map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(1)+' '+Y(Math.max(y0,Math.min(y1,p[1]))).toFixed(1)).join('');
      s+='<path d="'+d+'" fill="none" stroke="'+se.color+'" stroke-width="'+(se.w||2)+'"'+(se.dash?' stroke-dasharray="5 4"':'')+'><title>'+esc(se.name)+'</title></path>';
      if(se.dots)se.pts.forEach(p=>{s+='<circle cx="'+X(p[0]).toFixed(1)+'" cy="'+Y(p[1]).toFixed(1)+'" r="3" fill="'+se.color+'"><title>'+esc(se.name)+': '+f(p[1],3)+'</title></circle>'})});
    el.innerHTML=svg(W,H,s,o.label)+'<div class="leg">'+series.filter(x=>!x.noleg).map(x=>'<span style="--sw:'+x.color+'">'+esc(x.name)+'</span>').join('')+'</div>';
  }
  // predict-then-reveal: .pr[data-right] with .opts buttons[data-a] and a hidden .ans
  function drills(){document.querySelectorAll('.pr[data-right]').forEach(p=>{const ok=p.dataset.right;
    p.querySelector('.opts').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
      p.querySelectorAll('.opts button').forEach(x=>{x.classList.toggle('right',x.dataset.a===ok);x.classList.toggle('wrong',x===b&&x.dataset.a!==ok)});
      p.querySelector('.ans').hidden=false})})}
  return {D,$,esc,EC,RC,unb64,width,svg,tx,f,pct,piece,show,ref,onTab,seg,lines,drills};
})();
