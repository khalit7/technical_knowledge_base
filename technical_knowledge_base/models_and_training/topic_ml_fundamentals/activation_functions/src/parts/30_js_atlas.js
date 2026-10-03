// ---- Activation atlas tab: f and f' for every function, saturated and dead regions, readout, normal-input table ----
(function(){
  const $=id=>document.getElementById(id);if(!$('at'))return;
  const COLS=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)','var(--bad)','var(--ink)'];
  const FAM={sat:'Saturating',relu:'Rectified',smooth:'Smooth'};
  let on=new Set(['sigmoid','relu','gelu','silu']),shade='sigmoid',hx=null;
  let saved=null;try{saved=JSON.parse(localStorage.getItem('af-atlas')||'null')}catch(e){}
  if(saved&&Array.isArray(saved.on)){on=new Set(saved.on.filter(k=>AF.BY[k]));if(AF.BY[saved.shade])shade=saved.shade}
  const save=()=>{try{localStorage.setItem('af-atlas',JSON.stringify({on:[...on],shade}))}catch(e){}};
  // checkboxes grouped by family
  let b='';['sat','relu','smooth'].forEach(f=>{b+='<div style="margin:3px 0"><span class="small mute" style="margin-right:6px">'+FAM[f]+':</span>';
    AF.L.filter(a=>a.fam===f).forEach(a=>{b+='<label><input type="checkbox" data-k="'+a.id+'"'+(on.has(a.id)?' checked':'')+'> '+a.n+'</label>'});b+='</div>'});
  $('atB').innerHTML=b;
  $('atS').innerHTML=AF.L.map(a=>'<option value="'+a.id+'"'+(a.id===shade?' selected':'')+'>'+a.n+'</option>').join('');
  const color=k=>COLS[[...on].indexOf(k)%COLS.length];
  function eps(){const v=+$('atE').value;return v===0?0:Math.pow(10,-3+v*2/40)}   // 1e-3 to 1e-1, log
  function panel(el,which,R){
    const W=RD.width(el),H=W<480?200:240,ml=36,mr=8,mt=8,mb=22,iw=W-ml-mr,ih=H-mt-mb;
    const N=Math.max(200,Math.floor(iw*1.5)),xs=[];for(let i=0;i<=N;i++)xs.push(-R+2*R*i/N);
    const act=[...on].map(k=>AF.BY[k]);
    let lo=Infinity,hi=-Infinity;act.forEach(a=>xs.forEach(x=>{const v=which?a.d(x):a.f(x);if(isFinite(v)){lo=Math.min(lo,v);hi=Math.max(hi,v)}}));
    if(!act.length){lo=-1;hi=1}
    if(which){lo=Math.min(lo,0);hi=Math.max(hi,1.1)}else{lo=Math.min(lo,-1);hi=Math.max(hi,1)}
    hi=Math.min(hi,which?4:R*R);const pad=(hi-lo)*0.06;lo-=pad;hi+=pad;
    const X=x=>ml+iw*(x+R)/(2*R),Y=v=>mt+ih-ih*(Math.max(lo,Math.min(hi,v))-lo)/(hi-lo);
    let s='';
    // shading for the chosen function
    const a=AF.BY[shade],e=eps();let run=null;const spans=[];
    xs.forEach((x,i)=>{const d=a.d(x),dead=a.dead&&d===0,sat=!dead&&Math.abs(d)<e;const t=dead?'dead':(sat?'sat':null);
      if(t!==(run&&run.t)){if(run){run.b=x;spans.push(run)}run=t?{t,a:x}:null}});
    if(run){run.b=R;spans.push(run)}
    spans.forEach(sp=>{s+='<rect x="'+X(sp.a).toFixed(1)+'" y="'+mt+'" width="'+(X(sp.b)-X(sp.a)).toFixed(1)+'" height="'+ih+'" fill="'+(sp.t==='dead'?'var(--bad)':'var(--c5)')+'" opacity="'+(sp.t==='dead'?.16:.18)+'"/>'});
    // grid
    const step=R<=2?0.5:(R<=6?2:5);for(let t=-R;t<=R+1e-9;t+=step){s+='<line x1="'+X(t)+'" x2="'+X(t)+'" y1="'+mt+'" y2="'+(mt+ih)+'" stroke="var(--line)"/>'+PF.T(X(t),H-6,String(+t.toFixed(2)).replace('-','−'),' text-anchor="middle" font-size="10.5" fill="var(--mute)"')}
    const yt=niceTicks(lo,hi);yt.forEach(v=>{s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="'+(v===0?'var(--mute)':'var(--line)')+'"'+(v===0?' stroke-width="1"':'')+'/>'+PF.T(ml-4,Y(v)+4,String(+v.toFixed(2)).replace('-','−'),' text-anchor="end" font-size="10.5" fill="var(--mute)"')});
    act.forEach(a=>{let d='';xs.forEach((x,i)=>{const v=which?a.d(x):a.f(x);d+=(i?'L':'M')+X(x).toFixed(1)+' '+Y(v).toFixed(1)});
      s+='<path d="'+d+'" fill="none" stroke="'+color(a.id)+'" stroke-width="'+(a.id===shade?2.6:1.8)+'"/>'});
    if(hx!=null&&hx>=-R&&hx<=R){s+='<line x1="'+X(hx)+'" x2="'+X(hx)+'" y1="'+mt+'" y2="'+(mt+ih)+'" stroke="var(--ink)" stroke-dasharray="3 3"/>';
      act.forEach(a=>{const v=which?a.d(hx):a.f(hx);s+='<circle cx="'+X(hx)+'" cy="'+Y(v)+'" r="3.5" fill="'+color(a.id)+'"/>'})}
    el.innerHTML=PF.svg(W,H,(which?'Derivatives':'Activations')+' of the ticked functions',s);
    const sv=el.querySelector('svg');
    const pick=ev=>{const r=sv.getBoundingClientRect(),cx=(ev.touches?ev.touches[0].clientX:ev.clientX)-r.left;const x=((cx*W/r.width)-ml)/iw*2*R-R;if(x>=-R&&x<=R){hx=x;all()}};
    sv.addEventListener('mousemove',pick);sv.addEventListener('touchstart',pick,{passive:true});
  }
  function niceTicks(lo,hi){const span=hi-lo,raw=span/4,p=Math.pow(10,Math.floor(Math.log10(raw))),m=raw/p,st=(m<1.5?1:m<3?2:m<7?5:10)*p;const o=[];for(let v=Math.ceil(lo/st)*st;v<=hi;v+=st)o.push(Math.abs(v)<1e-12?0:v);return o}
  function readout(){const x=hx==null?-1:hx;const act=[...on].map(k=>AF.BY[k]);
    $('atRead').innerHTML='At <i>x</i> = '+x.toFixed(2).replace('-','−')+': '+act.map(a=>'<span style="white-space:nowrap"><span class="sw" style="background:'+color(a.id)+'"></span>'+a.n+' f = '+fmt(a.f(x))+', f′ = '+fmt(a.d(x))+'</span>').join(' · ')}
  const fmt=v=>(Math.abs(v)<1e-4&&v!==0?v.toExponential(2):v.toFixed(4)).replace('-','−');
  function legend(){const a=AF.BY[shade];
    $('atL').innerHTML=[...on].map(k=>'<span><i class="ln" style="background:'+color(k)+'"></i>'+AF.BY[k].n+'</span>').join('')+
      '<span><i style="background:var(--c5);opacity:.35"></i>'+a.n+' saturated: |f′| &lt; '+eps().toPrecision(2)+'</span>'+(a.dead?'<span><i style="background:var(--bad);opacity:.3"></i>dead region: f′ = 0</span>':'')}
  function all(){const R=+$('atR').value;$('atEv').textContent=eps().toPrecision(2);panel($('atF'),0,R);panel($('atD'),1,R);legend();readout()}
  $('atB').addEventListener('change',e=>{const k=e.target.dataset.k;if(!k)return;if(e.target.checked)on.add(k);else on.delete(k);save();all()});
  $('atS').addEventListener('change',e=>{shade=e.target.value;if(!on.has(shade)){on.add(shade);const c=$('atB').querySelector('input[data-k="'+shade+'"]');if(c)c.checked=true}save();all()});
  $('atE').addEventListener('input',all);$('atR').addEventListener('change',all);
  // the normal-input table
  function table(){const G={sigmoid:'1',tanh:'5/3 = 1.667',relu:'√2 = 1.414',leaky:'1.414',selu:'3/4'};
    let h='<table><tr><th>Activation</th><th class="num">E[f(z)]</th><th class="num">E[f(z)²]</th><th class="num">Gain 1/√E[f²]</th><th class="num">PyTorch calculate_gain</th><th class="num">E[f′(z)²]</th><th class="num">Lowest value</th><th>PyTorch</th></tr>';
    AF.L.forEach(a=>{const s=AF.stats(a);const mn=['gelu','gelut','qgelu','silu','mish'].includes(a.id)?AF.minOf(a):null;
      h+='<tr><td>'+a.n+'</td><td class="num">'+s.mean.toFixed(4).replace('-0.0000','0.0000')+'</td><td class="num">'+s.m2.toFixed(4)+'</td><td class="num">'+s.gain.toFixed(3)+'</td><td class="num">'+(G[a.id]||'')+'</td><td class="num">'+s.d2.toFixed(4)+'</td><td class="num">'+(mn?mn.v.toFixed(3).replace('-','−')+' at '+mn.x.toFixed(3).replace('-','−'):'')+'</td><td><code>'+a.pt+'</code></td></tr>'});
    $('atT').innerHTML=h+'</table>'}
  let built=false;
  function render(){if(!built){table();built=true}all()}
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-atlas']=window.TAB_RENDER['t-atlas']||[]).push(render);
  addEventListener('resize',()=>{if(!$('t-atlas').hidden)all()});
})();
