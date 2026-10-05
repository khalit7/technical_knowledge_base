// ---- Low-rank lab (t-lowrank): real GPT-2 small spectra, truncation errors and losses; two real LoRA updates ----
(function(){
  const $=id=>document.getElementById(id);if(!$('t-lowrank'))return;
  const D=window.LA_DATA,NAMES=RDF.NAMES;let mat='W_Q',k=64,ad=0,layer=5;
  const fmtN=v=>Math.round(v).toLocaleString('en-US');
  $('lr-src').innerHTML='Weights: '+D.model+' (revision '+D.revision.slice(0,7)+'), layer '+D.layer+'. Inputs and loss: the first '+D.tokens.toLocaleString('en-US')+' tokens of the WikiText-2 (raw) test split, two windows of 1,024; unchanged loss '+D.base_loss.toFixed(3)+' nats per token. Computed offline in float64 (SVD) and float32 (model) by <code>src/inputs/la_gpt2.py</code>.';
  $('lr-mat').innerHTML=Object.keys(D.mats).map(n=>'<button data-m="'+n+'"'+(n===mat?' class="on"':'')+'>'+NAMES[n]+'</button>').join('');
  $('lr-ad').innerHTML=D.lora.map((L,i)=>'<button data-m="'+i+'"'+(i===ad?' class="on"':'')+'>'+L.name.split('/')[1]+' (r = '+L.r+')</button>').join('');
  const cum=s=>{const c=[];let a=0;s.forEach(v=>{a+=v*v;c.push(a)});return c};
  function stats(){const m=D.mats[mat],s=m.s,[a,b]=m.shape,c=cum(s),tot=c[c.length-1],kk=Math.min(k,s.length);
    const werr=Math.sqrt(Math.max(0,tot-c[kk-1])/tot),serr=kk<s.length?s[kk]/s[0]:0,oerr=m.out_err[kk-1];
    const params=kk*(a+b),full=a*b;let lk=m.loss_k[0];m.loss_k.forEach(p=>{if(Math.abs(p[0]-kk)<Math.abs(lk[0]-kk))lk=p});
    $('lr-kv').textContent=kk;
    $('lr-stats').innerHTML=RD.stat('Parameters, low-rank form',fmtN(params),'k(m + n) against '+fmtN(full)+' = '+(100*params/full).toFixed(1)+'%'+(params>=full?': no saving':''))+
      RD.stat('Matrix error (Frobenius)',(100*werr).toFixed(1)+'%','√(Σ dropped σ²) / ‖W‖; energy kept '+(100*c[kk-1]/tot).toFixed(1)+'%')+
      RD.stat('Matrix error (spectral)',(100*serr).toFixed(1)+'%','σ'+(kk+1)+' / σ1'+(kk>=s.length?' (nothing dropped)':''))+
      RD.stat('Output error on real inputs',(100*oerr).toFixed(1)+'%','‖X(W − W_k)‖ / ‖XW‖')+
      RD.stat('Model loss (nats)',lk[1].toFixed(3),'measured at k = '+lk[0]+(lk[0]!==kk?' (nearest measured)':'')+'; unchanged '+D.base_loss.toFixed(3))}
  function axes(l,r,t,b,yt,xt){let s='';yt.forEach(v=>{s+='<line x1="'+l+'" y1="'+v[0]+'" x2="'+r+'" y2="'+v[0]+'" stroke="var(--line)"/>'+RD.t(l-4,v[0]+4,v[1],{fs:10,a:'end',fill:'var(--mute)'})});
    xt.forEach(v=>{s+=RD.t(v[0],b+14,v[1],{fs:10,a:'middle',fill:'var(--mute)'})});return s}
  function spec(){const el=$('lr-spec'),W=RD.width(el),H=230,l=40,r=W-8,t=10,b=H-30,m=D.mats[mat],s=m.s,rs=m.rand_s,n=s.length;
    const lo=Math.log10(Math.max(1e-4,Math.min(...s.filter(v=>v>0),...rs)))-0.1,hi=Math.log10(Math.max(s[0],rs[0]))+0.1;
    const X=i=>l+(i/(n-1))*(r-l),Y=v=>b-(Math.log10(Math.max(v,1e-6))-lo)/(hi-lo)*(b-t);
    const yt=[];for(let e=Math.ceil(lo);e<=Math.floor(hi);e++)yt.push([Y(Math.pow(10,e)),e>=0?String(Math.pow(10,e)):'1e'+e]);
    let g=axes(l,r,t,b,yt,[[X(0),'1'],[X(255),'256'],[X(511),'512'],[X(n-1),String(n)]]);
    g+='<rect x="'+X(Math.min(k,n-1))+'" y="'+t+'" width="'+Math.max(0,r-X(Math.min(k,n-1)))+'" height="'+(b-t)+'" fill="var(--c2)" fill-opacity=".08"/>';
    const path=a=>a.map((v,i)=>(i?'L':'M')+X(i).toFixed(1)+' '+Y(v).toFixed(1)).join('');
    g+='<path d="'+path(rs)+'" fill="none" stroke="var(--dim)" stroke-width="2"/><path d="'+path(s)+'" fill="none" stroke="var(--c1)" stroke-width="2"/>';
    g+='<line x1="'+X(k-1)+'" y1="'+t+'" x2="'+X(k-1)+'" y2="'+b+'" stroke="var(--c2)" stroke-width="1.5"/>'+RD.t(X(k-1)+(X(k-1)>W-80?-4:4),t+12,'k = '+k,{fs:11,fill:'var(--c2)',a:X(k-1)>W-80?'end':'start'});
    g+=RD.t(r,Y(s[0])+14,'real',{fs:11,a:'end',fill:'var(--c1)'});
    el.innerHTML=RD.svg(W,H,g,'Singular value spectrum')}
  function err(){const el=$('lr-err'),W=RD.width(el),H=230,l=40,r=W-8,t=10,b=H-30,m=D.mats[mat],s=m.s,n=s.length,c=cum(s),tot=c[n-1];
    const X=i=>l+(i/(n-1))*(r-l),Y=v=>b-v*(b-t);let g=axes(l,r,t,b,[[Y(0),'0%'],[Y(0.5),'50%'],[Y(1),'100%']],[[X(0),'1'],[X(255),'256'],[X(511),'512'],[X(n-1),String(n)]]);
    const we=c.map(v=>Math.sqrt(Math.max(0,tot-v)/tot));const path=a=>a.map((v,i)=>(i?'L':'M')+X(i).toFixed(1)+' '+Y(v).toFixed(1)).join('');
    g+='<path d="'+path(we)+'" fill="none" stroke="var(--c4)" stroke-width="2"/><path d="'+path(m.out_err)+'" fill="none" stroke="var(--c3)" stroke-width="2"/>';
    g+='<line x1="'+X(k-1)+'" y1="'+t+'" x2="'+X(k-1)+'" y2="'+b+'" stroke="var(--c2)" stroke-width="1.5"/>';
    g+='<circle cx="'+X(k-1)+'" cy="'+Y(we[k-1])+'" r="4" fill="var(--c4)"/><circle cx="'+X(k-1)+'" cy="'+Y(m.out_err[k-1])+'" r="4" fill="var(--c3)"/>';
    el.innerHTML=RD.svg(W,H,g,'Truncation error against k')+'<div class="leg"><span style="--sw:var(--c4)">matrix error (Frobenius)</span><span style="--sw:var(--c3)">output error on real inputs</span></div>'}
  function loss(){const el=$('lr-loss'),W=RD.width(el),H=220,l=46,r=W-10,t=12,b=H-30,m=D.mats[mat],L=m.loss_k,n=768;
    const all=Object.values(D.mats).flatMap(x=>x.loss_k.map(p=>p[1]));const lo=Math.min(D.base_loss,...all)-0.02,hi=Math.max(...all)+0.02;
    const X=kk=>l+Math.log2(kk)/Math.log2(n)*(r-l),Y=v=>b-(v-lo)/(hi-lo)*(b-t);
    const yt=[];for(let v=Math.ceil(lo*5)/5;v<=hi;v+=0.2)yt.push([Y(v),v.toFixed(1)]);
    let g=axes(l,r,t,b,yt,[1,4,16,64,256,768].map(v=>[X(v),String(v)]));
    g+='<line x1="'+l+'" y1="'+Y(D.base_loss)+'" x2="'+r+'" y2="'+Y(D.base_loss)+'" stroke="var(--mute)" stroke-dasharray="4 3"/>'+RD.t(r,Y(D.base_loss)-4,'unchanged '+D.base_loss.toFixed(3),{fs:10.5,a:'end',fill:'var(--mute)'});
    Object.keys(D.mats).forEach(nm=>{if(nm===mat)return;g+='<polyline points="'+D.mats[nm].loss_k.map(p=>X(p[0]).toFixed(1)+','+Y(p[1]).toFixed(1)).join(' ')+'" fill="none" stroke="var(--dim)"/>'});
    g+='<polyline points="'+L.map(p=>X(p[0]).toFixed(1)+','+Y(p[1]).toFixed(1)).join(' ')+'" fill="none" stroke="var(--c1)" stroke-width="2.2"/>';
    L.forEach(p=>{g+='<circle cx="'+X(p[0])+'" cy="'+Y(p[1])+'" r="3" fill="var(--c1)"/>'});
    g+='<line x1="'+X(k)+'" y1="'+t+'" x2="'+X(k)+'" y2="'+b+'" stroke="var(--c2)" stroke-width="1.5"/>';
    g+=RD.t((l+r)/2,b+26,'k kept (log scale)',{fs:10,a:'middle',fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H+6,g,'Model loss against k');
    $('lr-losscap').innerHTML='Blue: '+NAMES[mat]+' truncated alone, measured at 15 values of k (dots); grey: the other five matrices. Only one matrix of one layer is changed, so the rest of the network partly compensates; compare the all-matrices table below.'}
  function whole(){let h='<table class="mini"><thead><tr><th class="num">Rank kept</th><th class="num">Loss (nats)</th><th class="num">Parameters in low-rank form</th></tr></thead><tbody>';
    D.whole.forEach(w=>{h+='<tr><td class="num">'+Math.round(w.frac*100)+'%</td><td class="num">'+w.loss.toFixed(3)+'</td><td class="num">'+fmtN(w.params_lowrank_form)+' of '+fmtN(w.params_full)+' ('+(100*w.params_lowrank_form/w.params_full).toFixed(0)+'%)</td></tr>'});
    $('lr-whole').innerHTML=h+'</tbody></table>'}
  function lora(){const L=D.lora[ad],x=L.layers[layer],el=$('lr-lbars'),W=RD.width(el),n=x.s.length,H=200,l=40,r=W-8,t=10,b=H-28;
    $('lr-lv').textContent=layer;const tot=x.s.reduce((a,v)=>a+v*v,0);
    $('lr-lstats').innerHTML=RD.stat('Nonzero singular values',String(x.s.filter(v=>v>1e-9*x.s[0]).length),'rank budget r = '+L.r)+
      RD.stat('Largest σ carries',(100*x.s[0]*x.s[0]/tot).toFixed(1)+'%','of ‖ΔW‖²')+
      RD.stat('‖ΔW‖ / ‖W₀‖',(100*x.dW_fro/x.W_fro).toFixed(2)+'%','Frobenius, whole c_attn')+
      RD.stat('Amplification (query block)',x.amp.toFixed(2),'paper: 21.5 at r = 4, about 2 at r = 64 (GPT-3)')+
      RD.stat('Wq on ΔW\'s directions',x.proj_dW.toFixed(2),'random directions '+x.proj_rand.toFixed(2)+'; Wq\'s own top-'+L.r+' '+x.proj_W.toFixed(1));
    const bw=(r-l)/n,Y=v=>b-v/x.s[0]*(b-t);let g=axes(l,r,t,b,[[Y(0),'0'],[Y(x.s[0]/2),F2(x.s[0]/2)],[Y(x.s[0]),F2(x.s[0])]],[]);
    x.s.forEach((v,i)=>{g+='<rect x="'+(l+i*bw+1)+'" y="'+Y(v)+'" width="'+Math.max(1,bw-2)+'" height="'+(b-Y(v))+'" fill="var(--c'+(ad?4:1)+')"/>';if(n<=12||i%4===0||i===n-1)g+=RD.t(l+i*bw+bw/2,b+14,String(i+1),{fs:10,a:'middle',fill:'var(--mute)'})});
    el.innerHTML=RD.svg(W,H,g,'Singular values of the LoRA update');
    $('lr-lcap').innerHTML='Bars: the '+(n-1)+' singular values of ΔW in layer '+layer+', plus the next one (index '+n+'), which is 0 up to rounding because ΔW = (α/r)BA has rank at most r = '+L.r+'. Amplification = ‖ΔWq‖F / ‖UᵀWqVᵀ‖F with U, V the top-r singular directions of ΔWq (LoRA §7.3 and appendix H.4). Values over 1 mean ΔW is large in directions where W is small. Adapter <code>'+L.name+'</code>, revision '+L.rev.slice(0,7)+', α = '+L.alpha+'.'}
  const F2=v=>v>=10?v.toFixed(0):v.toFixed(2);
  function render(){stats();spec();err();loss();whole();lora()}
  RD.seg($('lr-mat'),m=>{mat=m;render()});RD.seg($('lr-ad'),m=>{ad=+m;lora()});
  $('lr-k').addEventListener('input',e=>{k=+e.target.value;stats();spec();err();loss()});
  $('lr-l').addEventListener('input',e=>{layer=+e.target.value;lora()});
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-lowrank']=window.TAB_RENDER['t-lowrank']||[]).push(render);
  addEventListener('resize',()=>{if(!$('t-lowrank').hidden)render()});
  render();
})();
