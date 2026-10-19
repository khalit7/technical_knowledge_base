// ---- Normalisation page: shared chart helpers (window.NSC). Data is window.NSD (22_js_ns_0data.js). ----
window.NSC=(function(){
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim()||'#888';
  const W=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-60))};
  const fmt=(v,d)=>{if(v===null||v===undefined||!isFinite(v))return 'n/a';if(v===0&&d===undefined)return '0';if(d===undefined&&Number.isInteger(v)&&Math.abs(v)<1000)return String(v);const a=Math.abs(v);
    if(d!==undefined)return v.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
    return a>=1000?Math.round(v).toLocaleString('en-US'):a>=100?v.toFixed(0):a>=10?v.toFixed(1):a>=1?v.toFixed(2):a>=0.01?v.toFixed(3):v.toExponential(1)};
  function ticksLin(a,b,n){const s=(b-a)/n,p=Math.pow(10,Math.floor(Math.log10(s))),m=s/p,st=(m<1.5?1:m<3?2:m<7?5:10)*p;const t=[];for(let v=Math.ceil(a/st)*st;v<=b+1e-9;v+=st)t.push(+v.toFixed(10));return t}
  function ticksLog(a,b){const t=[];for(let e=Math.floor(Math.log10(a));e<=Math.ceil(Math.log10(b));e++){const v=Math.pow(10,e);if(v>=a*0.999&&v<=b*1.001)t.push(v)}return t.length>=2?t:[a,b]}
  // series: [{name,color,pts:[[x,y],...],dash}], o: {xmax,ymin,ymax,log,xl,yl,h,hline:[{y,label}],vx (vertical cursor), xmin}
  function line(el,series,o){o=o||{};const w=W(el),h=o.h||(w<520?200:240),pl=w<520?40:48,pr=10,pt=10,pb=30;
    const all=[].concat(...series.map(s=>s.pts.filter(p=>p[1]!==null&&isFinite(p[1])&&(!o.log||p[1]>0))));
    if(!all.length){el.innerHTML='<p class="small mute">No data.</p>';return}
    const xmin=o.xmin!==undefined?o.xmin:0,xmax=o.xmax||Math.max(...all.map(p=>p[0]));
    let ymin=o.ymin!==undefined?o.ymin:Math.min(...all.map(p=>p[1])),ymax=o.ymax!==undefined?o.ymax:Math.max(...all.map(p=>p[1]));
    if(ymax<=ymin)ymax=ymin+1;
    const L=o.log,ly=v=>Math.log10(Math.max(v,1e-12));
    const X=x=>pl+(x-xmin)/(xmax-xmin||1)*(w-pl-pr),Y=y=>L?pt+(ly(ymax)-ly(Math.min(Math.max(y,ymin),ymax)))/(ly(ymax)-ly(ymin))*(h-pt-pb):pt+(ymax-Math.min(Math.max(y,ymin),ymax))/(ymax-ymin)*(h-pt-pb);
    let s='';const yt=L?ticksLog(ymin,ymax):ticksLin(ymin,ymax,w<520?4:5);
    const tf=v=>Math.abs(v)>=1e6?(v/1e6)+'M':Math.abs(v)>=1e4?(v/1e3)+'k':fmt(v);
    yt.forEach(v=>{s+='<line x1="'+pl+'" x2="'+(w-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+'<text x="'+(pl-4)+'" y="'+(Y(v)+4)+'" text-anchor="end" font-size="11" fill="var(--mute)">'+tf(v)+'</text>'});
    ticksLin(xmin,xmax,w<520?3:5).forEach(v=>{const xx=X(v),an=xx>w-pr-18?'end':xx<pl+12?'start':'middle';s+='<text x="'+xx+'" y="'+(h-pb+15)+'" text-anchor="'+an+'" font-size="11" fill="var(--mute)">'+fmt(v)+'</text>'});
    if(o.xl)s+='<text x="'+(w-pr)+'" y="'+(h-3)+'" text-anchor="end" font-size="11" fill="var(--mute)">'+esc(o.xl)+'</text>';
    if(o.yl)s+='<text x="'+(pl+4)+'" y="'+(pt+11)+'" font-size="11" fill="var(--mute)">'+esc(o.yl)+'</text>';
    (o.hline||[]).forEach(hl=>{if(hl.y<ymin||hl.y>ymax)return;s+='<line x1="'+pl+'" x2="'+(w-pr)+'" y1="'+Y(hl.y)+'" y2="'+Y(hl.y)+'" stroke="var(--bad)" stroke-dasharray="4 3"/><text x="'+(w-pr-2)+'" y="'+(Y(hl.y)-4)+'" text-anchor="end" font-size="11" fill="var(--bad)">'+esc(hl.label)+'</text>'});
    series.forEach(sr=>{let d='',pen=false;sr.pts.forEach(p=>{if(p[1]===null||!isFinite(p[1])||(L&&p[1]<=0)||p[0]>xmax){pen=false;return}d+=(pen?'L':'M')+X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1);pen=true});
      s+='<path d="'+d+'" fill="none" stroke="'+sr.color+'" stroke-width="'+(sr.w||1.8)+'"'+(sr.dash?' stroke-dasharray="'+sr.dash+'"':'')+'/>';
      if(sr.end){const q=sr.pts.filter(p=>p[1]!==null&&isFinite(p[1])&&p[0]<=xmax).pop();if(q)s+='<circle cx="'+X(q[0])+'" cy="'+Y(q[1])+'" r="3" fill="'+sr.color+'"/>'}});
    if(o.vx!==undefined)s+='<line x1="'+X(o.vx)+'" x2="'+X(o.vx)+'" y1="'+pt+'" y2="'+(h-pb)+'" stroke="var(--mute)" stroke-dasharray="2 3"/>';
    el.innerHTML='<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+esc(o.label||'chart')+'">'+s+'</svg>'}
  const legend=items=>'<div class="leg">'+items.map(i=>'<span style="--sw:'+i[1]+'">'+esc(i[0])+'</span>').join('')+'</div>';
  // horizontal bars: rows [{name,v,color,txt}], o: {max, log}
  function bars(el,rows,o){o=o||{};const mx=o.max||Math.max(...rows.map(r=>r.v||0))||1;
    el.innerHTML='<div class="bars">'+rows.map(r=>{const f=o.log?Math.max(0,Math.log10(Math.max(r.v,1))/Math.log10(Math.max(mx,10))):Math.max(0,(r.v||0)/mx);
      return '<div class="row'+(r.hl?' hl':'')+'"><span class="nm" title="'+esc(r.name)+'">'+esc(r.name)+'</span><span class="track"><span class="fill" style="width:'+(Math.min(1,f)*100).toFixed(1)+'%;background:'+(r.color||'var(--acc)')+'"></span></span><span class="val">'+(r.txt||fmt(r.v))+'</span></div>'}).join('')+'</div>'}
  const onTab=(id,f)=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[id]=window.TAB_RENDER[id]||[]).push(f)};
  const onResize=(id,f)=>{let t=0;addEventListener('resize',()=>{const r=document.getElementById(id);if(!r||r.hidden||r.offsetParent===null)return;clearTimeout(t);t=setTimeout(f,80)})};
  return {esc,css,W,fmt,line,legend,bars,onTab,onResize};
})();
