// ---- Deeper: inside an MoE (tab t-moe). Shared helpers, namespaced under window.MOE ----
(function(){
  const $=id=>document.getElementById(id);
  window.TAB_RENDER=window.TAB_RENDER||{};
  // every chart in this tab draws when the tab opens
  const onTab=f=>{(window.TAB_RENDER['t-moe']=window.TAB_RENDER['t-moe']||[]).push(f)};
  const fmt=(v,d)=>v.toLocaleString('en-GB',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  const GiB=2**30,MiB=2**20,KiB=1024;
  function fmtBytes(b){if(b>=GiB)return (b/GiB).toFixed(b/GiB>=100?0:(b/GiB>=10?1:2))+' GiB';if(b>=MiB)return (b/MiB).toFixed(b/MiB>=100?0:1)+' MiB';if(b>=KiB)return (b/KiB).toFixed(1)+' KiB';return fmt(b,b%1?1:0)+' B'}
  function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  // marker ids carry a moe prefix so they never collide with the rest of the page
  const svgEl=(w,h,inner,label)=>'<svg viewBox="0 0 '+w+' '+h+'" width="100%" role="img" aria-label="'+(label||'')+'"><defs><marker id="moeah'+w+'x'+h+'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker></defs>'+inner.replace(/MARK/g,'url(#moeah'+w+'x'+h+')')+'</svg>';
  const bx=(x,y,w,h,cls,lines,fs)=>{let s='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="6" class="'+cls+'"/>';const n=lines.length,lh=(fs||12)+3;lines.forEach((t,i)=>{s+='<text x="'+(x+w/2)+'" y="'+(y+h/2+(i-(n-1)/2)*lh+4)+'" text-anchor="middle" font-size="'+(fs||12)+'"'+(i>0?' fill="var(--mute)"':'')+'>'+t+'</text>'});return s};
  const sup=n=>String(n).replace(/[-0-9]/g,c=>'⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(c)]);
  const stat=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
  const A=(u,t)=>'<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+t+'</a>';
  // log-log (or log-y) frame: returns the SVG so far and the two scale functions
  function logFrame(o){const {W,H,pl,pr,pt,pb}=o,lg=Math.log10;
    const lx=o.xlin?(v=>pl+(W-pl-pr)*(v-o.x[0])/(o.x[1]-o.x[0])):(v=>pl+(W-pl-pr)*(lg(v)-lg(o.x[0]))/(lg(o.x[1])-lg(o.x[0])));
    const ly=v=>pt+(H-pt-pb)*(1-(lg(v)-lg(o.y[0]))/(lg(o.y[1])-lg(o.y[0])));
    let s='';o.yt.forEach(([v,l])=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+ly(v)+'" y2="'+ly(v)+'" stroke="var(--line)"/><text x="'+(pl-6)+'" y="'+(ly(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+l+'</text>'});
    o.xt.forEach(([v,l])=>{s+='<line x1="'+lx(v)+'" x2="'+lx(v)+'" y1="'+(H-pb)+'" y2="'+(H-pb+4)+'" stroke="var(--mute)"/><text x="'+lx(v)+'" y="'+(H-pb+16)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+l+'</text>'});
    if(o.xl)s+='<text x="'+((pl+W-pr)/2)+'" y="'+(H-4)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+o.xl+'</text>';
    if(o.yl)s+='<text x="12" y="'+((pt+H-pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 12 '+((pt+H-pb)/2)+')">'+o.yl+'</text>';
    return {s,lx,ly}}
  window.MOE={$,onTab,fmt,fmtBytes,mulberry32,svgEl,bx,sup,stat,A,logFrame};
  // the in-tab section nav: highlight the section being read
  const links=[...document.querySelectorAll('#moeNav a')];
  if(links.length){const on=()=>{const tab=$('t-moe');if(!tab||tab.hidden)return;let cur=links[0];for(const a of links){const s=document.querySelector(a.getAttribute('href'));if(s&&s.getBoundingClientRect().top<120)cur=a}links.forEach(a=>a.classList.toggle('cur',a===cur))};
    addEventListener('scroll',on,{passive:true});onTab(on)}
})();
