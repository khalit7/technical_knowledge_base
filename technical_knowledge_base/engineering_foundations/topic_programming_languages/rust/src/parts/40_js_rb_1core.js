// ---- Part 2: shared helpers (number fill, predict-then-reveal, small charts) ----
window.RBX=(function(){
  const RB=window.RB||{};
  RB.L={};(RB.ladder||[]).forEach(r=>{RB.L[r.step]=r});
  // Amdahl: share of the pure-Python run spent in the token loop (in-process phases)
  (function(){const ph=(RB.phases||{}).python;if(!ph)return;const tot=Object.values(ph).reduce((a,b)=>a+b,0),p=ph['count tokens']/tot;
    RB.PS={p,share:p*100,rest:(1-p)*100,bound:1/(1-p),total:tot}})();
  const get=p=>p.split(p.includes('/')?'/':'.').reduce((o,k)=>o==null?undefined:o[k],RB);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function fmt(v,d){if(typeof v!=='number'||!isFinite(v))return '?';if(d==null||d==='')d=Math.abs(v)>=100?0:Math.abs(v)>=10?1:2;
    return (+v).toLocaleString('en-US',{minimumFractionDigits:+d,maximumFractionDigits:+d})}
  // data-rbv="path" (value), data-rbm="1000" (multiply), data-rbr="a|b" (ratio a/b), data-rbdiff="a|b" (a-b)
  function fill(root){
    root.querySelectorAll('[data-rbv]').forEach(el=>{el.textContent=fmt(get(el.dataset.rbv)*(+(el.dataset.rbm||1)),el.dataset.d)});
    root.querySelectorAll('[data-rbr]').forEach(el=>{const [a,b]=el.dataset.rbr.split('|');el.textContent=fmt(get(a)/get(b),el.dataset.d==null?1:el.dataset.d)});
    root.querySelectorAll('[data-rbdiff]').forEach(el=>{const [a,b]=el.dataset.rbdiff.split('|');el.textContent=fmt((get(a)-get(b))*(+(el.dataset.rbm||1)),el.dataset.d)});
  }
  document.addEventListener('click',e=>{const b=e.target.closest('.rb-rv');if(!b)return;const t=document.getElementById(b.dataset.for);if(!t)return;
    t.hidden=!t.hidden;b.setAttribute('aria-expanded',String(!t.hidden));b.textContent=t.hidden?'Reveal the real output':'Hide the output'});
  // horizontal bars: rows [{label, v, lo, hi, color, note}], unit string, log scale optional
  function bars(el,rows,o){o=o||{};const max=Math.max(...rows.map(r=>r.hi||r.v));const lg=!!o.log;
    const mn=lg?Math.min(...rows.map(r=>r.lo||r.v))/1.5:0;
    const pos=v=>lg?(Math.log(v)-Math.log(mn))/(Math.log(max*1.05)-Math.log(mn))*100:v/max/1.05*100;
    el.innerHTML='<div class="bars">'+rows.map(r=>'<div class="row'+(r.hl?' hl':'')+'" title="'+esc(r.note||'')+'"><span class="nm">'+esc(r.label)+'</span><span class="track"><span class="fill" style="width:'+Math.max(.5,pos(r.v)).toFixed(2)+'%;background:'+(r.color||'var(--acc)')+'"></span>'+
      (r.lo!=null?'<span style="position:absolute;top:5px;height:4px;left:'+pos(r.lo).toFixed(2)+'%;width:'+Math.max(.3,pos(r.hi)-pos(r.lo)).toFixed(2)+'%;background:var(--ink);opacity:.45"></span>':'')+
      '</span><span class="val">'+fmt(r.v,o.d)+(o.unit||'')+'</span></div>').join('')+'</div>'}
  return {RB,get,fmt,fill,esc,bars};
})();
(function(){const ids=['t-rb-read','t-rb-ladder','t-rb-cross'];ids.forEach(id=>{const el=document.getElementById(id);if(el)RBX.fill(el)})})();
