// ---- training_stack: shared helpers (prefix ts) ----
window.TSU=(function(){
  const D=window.TS;
  const get=(p)=>p.split('.').reduce((o,k)=>(o==null?undefined:o[k]),D);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const ex=(v,n)=>{if(v===0)return '0';const s=Number(v).toExponential(n);return s.replace('e+','e').replace(/e(-?)0*(\d)/,'e$1$2')};
  const int=v=>Math.round(v).toLocaleString('en-US');
  const shape=a=>'['+a.join(', ')+']';
  const F={
    int, shape, e1:v=>ex(v,1), e2:v=>ex(v,2), e3:v=>ex(v,3),
    f0:v=>Number(v).toFixed(0), f1:v=>Number(v).toFixed(1), f2:v=>Number(v).toFixed(2), f3:v=>Number(v).toFixed(3), f4:v=>Number(v).toFixed(4),
    yes:v=>v?'yes':'no', eqword:v=>v?'equal':'different', onoff:v=>v?'on':'off',
    list:a=>a.join(', '), list4:a=>a.slice(0,4).join(', '), len:a=>String(a.length),
    kv:o=>Object.keys(o).map(k=>o[k]+' '+k).join(', '),
    rules:a=>a.map(r=>r[0]+' &#8594; '+(r[1]==null?'replicated':r[1])).join(', '),
    bridge:a=>a.map(r=>'<code>'+esc(r[0])+'</code> ('+r[1]+(r[2].length?' '+shape(r[2]):'')+')').join(', '),
    maxhand:a=>ex(Math.max(...a.map(s=>s.hand_vs_optax_maxdiff)),1),
    lasttraces:a=>String(a[a.length-1].traces),
    unorms:a=>a.map(m=>m.update_norm===0?'0':Number(m.update_norm).toFixed(3)).join(', '),
    finite:a=>{const b=a.find(s=>s.nan_injected);return 'the update at step '+b.step+' was all zeros (norm '+b.update_norm+'), <code>notfinite_count</code> went to '+b.notfinite_count+' and back to 0 at the next good step, and the parameters stayed finite throughout ('+(a.every(s=>s.params_finite)?'yes':'no')+')'},
    pow2:v=>'2<sup>'+Math.round(Math.log2(v))+'</sup>',
    kvjson:o=>esc(JSON.stringify(o)),
    pct1:v=>(v*100).toFixed(1)+'%',
    pct0:v=>(v*100).toFixed(0)+'%', pct2:v=>(v*100).toFixed(2)+'%',
    svabove:o=>String(o.sv_after_frob_and_each_iter[o.sv_after_frob_and_each_iter.length-1].filter(x=>x>=0.5).length),
    minsv:a=>ex(Math.min(...a),1),
    lastscale:a=>'2<sup>'+Math.round(Math.log2(a[a.length-1]))+'</sup>',
  };
  function fmt(v,f){if(v===undefined||v===null)return '?';if(f&&F[f])return F[f](v);if(typeof v==='number')return String(v);if(Array.isArray(v))return v.join(', ');return esc(v)}
  function fill(root){
    (root||document).querySelectorAll('[data-ts]').forEach(el=>{el.innerHTML=fmt(get(el.dataset.ts),el.dataset.f)});
    (root||document).querySelectorAll('[data-ts-src]').forEach(a=>{const s=D.src[a.dataset.tsSrc];if(!s){a.textContent='?';return}
      a.href=s.u;a.target='_blank';a.rel='noopener noreferrer';a.textContent=s.p.split('/').pop()+':'+s.l});
    (root||document).querySelectorAll('[data-ts-err]').forEach(el=>{const e=get(el.dataset.tsErr);if(!e){el.textContent='?';return}
      let m=e.msg;
      if(el.dataset.trim==='tree'){const i=m.indexOf('found at paths');m='Duplicate Param( # 8,320 (33.3 KB) value=Array([[ 0.02008029, ... ]], dtype=float32) )\n'+m.slice(i)}
      if(el.dataset.trim==='first'){m=m.split('\n')[0]}
      el.textContent=e.type+': '+m});
    (root||document).querySelectorAll('[data-ts-pre]').forEach(el=>{el.textContent=String(get(el.dataset.tsPre))});
  }
  function table(id,head,rows){const t=document.getElementById(id);if(!t)return;
    t.innerHTML='<thead><tr>'+head.map(h=>'<th'+(h[1]?' class="num"':'')+'>'+h[0]+'</th>').join('')+'</tr></thead><tbody>'+
      rows.map(r=>'<tr>'+r.map((c,i)=>'<td'+(head[i]&&head[i][1]?' class="num"':'')+'>'+c+'</td>').join('')+'</tr>').join('')+'</tbody>'}
  // simple multi-series line chart. series: [{name, color, pts:[[x,y],...], dash}], opts {logy, ylab, xlab, h, zero}
  function lines(el,series,o){o=o||{};const W=Math.max(280,el.clientWidth||600),H=o.h||220,L=48,R=10,T=10,B=34;
    const xs=series.flatMap(s=>s.pts.map(p=>p[0])),ys=series.flatMap(s=>s.pts.map(p=>p[1])).filter(v=>isFinite(v)&&(!o.logy||v>0));
    let x0=Math.min(...xs),x1=Math.max(...xs),y0=o.y0!=null?o.y0:Math.min(...ys),y1=o.y1!=null?o.y1:Math.max(...ys);
    if(o.logy){y0=Math.log10(y0);y1=Math.log10(y1)}if(y1===y0)y1=y0+1;
    const X=x=>L+(x-x0)/(x1-x0||1)*(W-L-R),Y=y=>{y=o.logy?Math.log10(Math.max(y,1e-30)):y;return T+(1-(y-y0)/(y1-y0))*(H-T-B)};
    let s='';for(let i=0;i<=4;i++){const yv=y0+(y1-y0)*i/4,yy=T+(1-i/4)*(H-T-B);s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+yy+'" y2="'+yy+'" stroke="var(--line)"/>'+
      '<text x="'+(L-4)+'" y="'+(yy+3)+'" text-anchor="end" font-size="10" fill="var(--mute)">'+(o.logy?('1e'+yv.toFixed(1)).replace('.0',''):(Math.abs(yv)<0.01&&yv!==0?ex(yv,0):yv.toFixed(o.dec==null?2:o.dec)))+'</text>'}
    for(let i=0;i<=4;i++){const xv=x0+(x1-x0)*i/4;s+='<text x="'+X(xv)+'" y="'+(H-B+14)+'" text-anchor="'+(i===4?'end':i===0?'start':'middle')+'" font-size="10" fill="var(--mute)">'+Math.round(xv)+'</text>'}
    s+='<text x="'+((L+W-R)/2)+'" y="'+(H-4)+'" text-anchor="middle" font-size="10.5" fill="var(--mute)">'+(o.xlab||'step')+'</text>';
    if(o.zero&&y0<0&&y1>0)s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(0)+'" y2="'+Y(0)+'" stroke="var(--mute)" stroke-dasharray="2 3"/>';
    series.forEach(se=>{const d=se.pts.filter(p=>isFinite(p[1])).map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1)).join('');
      s+='<path d="'+d+'" fill="none" stroke="'+se.color+'" stroke-width="'+(se.w||1.8)+'"'+(se.dash?' stroke-dasharray="'+se.dash+'"':'')+'/>'});
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="'+esc(o.label||'line chart')+'">'+s+'</svg>'+
      '<div class="ts-legend">'+series.map(se=>'<span><i style="background:'+se.color+'"></i>'+esc(se.name)+'</span>').join('')+'</div>'}
  function drills(root){(root||document).querySelectorAll('.ts-q').forEach(q=>{q.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
    q.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(x.hasAttribute('data-right'))x.classList.add('right')});
    if(!b.hasAttribute('data-right'))b.classList.add('wrong');q.querySelector('.ans').hidden=false}))})}
  const COL=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)'];
  return {D,get,esc,ex,int,shape,fmt,fill,table,lines,drills,COL};
})();
TSU.fill();TSU.drills();
