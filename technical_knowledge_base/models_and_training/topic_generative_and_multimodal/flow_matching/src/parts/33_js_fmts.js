// ---- Reading section 11 (was the Timestep explorer tab until 2026-10-24): training densities, recorded toy runs, the resolution shift. SD3's table is static (fill_static.py) ----
(function(){
  const X=window.FMX,$=X.$,D=X.D;if(!$('fmt-dens'))return;
  const C=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)'];
  // ---------- 1. densities, computed in SD3's convention (sigma: 0 data, 1 noise), shown in ours unless flipped
  const M=20000,B=50;
  function hist(f){const h=new Array(B).fill(0);for(let i=0;i<M;i++){const u=(i+.5)/M;const t=Math.min(1-1e-9,Math.max(0,f(u)));h[Math.floor(t*B)]++}return h.map(v=>v/M*B)}
  function lnDens(m,s){const r=[];for(let i=0;i<B;i++){const t=(i+.5)/B;const l=Math.log(t/(1-t));r.push(1/(s*Math.sqrt(2*Math.PI))/(t*(1-t))*Math.exp(-((l-m)**2)/(2*s*s)))}return r}
  const fmode=s=>u=>1-u-s*(Math.cos(Math.PI*u/2)**2-1+u);
  const fcos=u=>1-1/(Math.tan(Math.PI*u/2)+1);
  function dens(){const m=+$('fmt-m').value,s=+$('fmt-s').value,o=+$('fmt-o').value;$('fmt-mv').textContent=m.toFixed(2);$('fmt-sv').textContent=s.toFixed(2);$('fmt-ov').textContent=o.toFixed(2);
    const flip=$('fmt-flip').checked;const xs=[...Array(B)].map((_,i)=>(i+.5)/B);
    const conv=a=>flip?a:a.slice().reverse();     // SD3 sigma -> our t = 1 - sigma
    const ser=[{name:'uniform',color:C[5],pts:xs.map(x=>[x,1])},{name:'logit-normal('+m.toFixed(2)+', '+s.toFixed(2)+')',color:C[0],pts:conv(lnDens(m,s)).map((v,i)=>[xs[i],v])},
      {name:'mode('+o.toFixed(2)+')',color:C[1],pts:conv(hist(fmode(o))).map((v,i)=>[xs[i],v])},{name:'CosMap',color:C[2],pts:conv(hist(fcos)).map((v,i)=>[xs[i],v])}];
    const F=D.floor;if(F){const mx=Math.max(...F.floor);ser.push({name:'toy loss floor (rescaled)',color:'var(--mute)',dash:true,pts:F.t.map((t,i)=>[flip?1-t:t,2*F.floor[i]/mx])})}
    X.chart($('fmt-dens'),ser,{xlab:flip?'sigma (SD3: 0 = data, 1 = noise)':'t (this page: 0 = noise, 1 = data)',ylab:'density',xticks:[0,.25,.5,.75,1],ymin:0,ymax:3.6,h:240,nodots:true,label:'Training densities of t'});
    X.leg($('fmt-dens-leg'),ser.map(q=>[q.name,q.color]))}
  ['fmt-m','fmt-s','fmt-o','fmt-flip'].forEach(id=>$(id).addEventListener('input',dens));
  // ---------- 2. recorded toy runs
  const T=D.tsched;const names=Object.keys(T.hist);let bud='12000',pick=new Set(['lognorm(0,1)']);
  $('fmt-sch').innerHTML=names.filter(n=>n!=='uniform').map(n=>'<button data-s="'+n+'"'+(pick.has(n)?' class="on"':'')+'>'+n+'</button>').join('');
  $('fmt-sch').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const n=b.dataset.s;pick.has(n)?pick.delete(n):pick.add(n);b.classList.toggle('on',pick.has(n));err()});
  X.seg($('fmt-b'),m=>{bud=m;err()});
  function err(){const ser=['uniform',...names.filter(n=>pick.has(n))].map((n,i)=>({name:n,color:n==='uniform'?'var(--mute)':C[(names.indexOf(n))%6],pts:T.t.map((t,j)=>[t,Math.max(1e-4,T.runs[bud+'|'+n].err[j])])}));
    X.chart($('fmt-err'),ser,{logy:true,xlab:'t (0 = noise, 1 = data)',ylab:'|v - u|^2 (log)',xticks:[0,.2,.4,.6,.8,1],h:230,label:'Learning error by t'});
    X.leg($('fmt-err-leg'),ser.map(q=>[q.name,q.color]));
    $('fmt-out').innerHTML=['uniform',...names.filter(n=>pick.has(n))].map(n=>{const r=T.runs[bud+'|'+n];return X.stat(n,(100*r.e4_on).toFixed(0)+'% / '+r.e64_w2.toFixed(3),'on a blob at 4 Euler steps / W2 at 64 (&plusmn; '+r.e64_w2_sd.toFixed(3)+')')}).join('')}
  // ---------- 3. shift
  const SC=D.sched||{};
  const RULES=[{nm:'FLUX.1 pipeline defaults (dynamic, 0.5 to 1.15)',dyn:[0.5,1.15,256,4096]}];
  const add=(nm,k)=>{const c=SC[k];if(!c)return;if(c.use_dynamic_shifting)RULES.push({nm:nm+' (dynamic, '+c.base_shift+' to '+c.max_shift+')',dyn:[c.base_shift,c.max_shift,c.base_image_seq_len,c.max_image_seq_len],term:c.shift_terminal});else RULES.push({nm:nm+' (fixed '+(c.shift||c.flow_shift)+')',fixed:c.shift||c.flow_shift})};
  add('FLUX.2 [klein] 4B','black-forest-labs/FLUX.2-klein-4B');add('Qwen-Image','Qwen/Qwen-Image');add('LTX-Video','Lightricks/LTX-Video');
  RULES.push({nm:'SD3 paper (fixed 3.0 at 1024 px)',fixed:3});add('Z-Image-Turbo','Tongyi-MAI/Z-Image-Turbo');add('HunyuanVideo','hunyuanvideo-community/HunyuanVideo');add('Wan 2.1 (UniPC flow_shift)','Wan-AI/Wan2.1-T2V-1.3B-Diffusers');
  RULES.push({nm:'no shift',fixed:1});
  $('fmt-rule').innerHTML=RULES.map((r,i)=>'<option value="'+i+'">'+r.nm+'</option>').join('');
  let nSteps=4;X.seg($('fmt-n'),m=>{nSteps=+m;shift()});['fmt-px','fmt-rule'].forEach(id=>$(id).addEventListener('input',shift));
  function shift(){const px=+$('fmt-px').value;$('fmt-pxv').textContent=px;const R=RULES[+$('fmt-rule').value];const tok=Math.pow(px/16,2);
    let mu=null,sh;if(R.dyn){const [b0,b1,l0,l1]=R.dyn;const m=(b1-b0)/(l1-l0);mu=tok*m+(b0-m*l0);sh=Math.exp(mu)}else sh=R.fixed;
    const base=[];for(let i=0;i<nSteps;i++)base.push(1-i*(1-1/nSteps)/(nSteps-1||1));if(nSteps===1)base[0]=1;
    let sg=base.map(s=>sh*s/(1+(sh-1)*s));
    if(R.term){const om=sg.map(s=>1-s);const k=om[om.length-1]/(1-R.term);sg=om.map(v=>1-v/k)}
    const W=X.width($('fmt-grid')),H=120,ml=60,mr=14,xx=s=>ml+(1-s)*(W-ml-mr);
    let g='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="40" y2="40" stroke="var(--line)"/><line x1="'+ml+'" x2="'+(W-mr)+'" y1="84" y2="84" stroke="var(--line)"/>';
    g+='<text x="'+(ml-6)+'" y="44" text-anchor="end" font-size="11" fill="var(--mute)">unshifted</text><text x="'+(ml-6)+'" y="88" text-anchor="end" font-size="11" fill="var(--mute)">shifted</text>';
    [1,.75,.5,.25,0].forEach(v=>{g+='<text x="'+xx(v)+'" y="112" text-anchor="middle" font-size="11" fill="var(--mute)">'+v+'</text>'});
    g+='<text x="'+ml+'" y="16" font-size="11" fill="var(--mute)">noise level &sigma; of each of the '+nSteps+' evaluations (1 = noise)</text>';
    base.forEach(s=>{g+='<circle cx="'+xx(s)+'" cy="40" r="4.5" fill="var(--mute)"/>'});sg.forEach(s=>{g+='<circle cx="'+xx(s)+'" cy="84" r="4.5" fill="var(--acc)"/>'});
    $('fmt-grid').innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Where the steps fall">'+g+'</svg>';
    const noisy=sg.filter(s=>s>0.5).length;
    $('fmt-shout').innerHTML=X.stat('tokens','('+px+'/16)&sup2; = '+Math.round(tok).toLocaleString('en-US'),'8&times; VAE and 2&times;2 patches')+(mu!=null?X.stat('&mu; (linear in tokens)',mu.toFixed(3),'calculate_shift'):'')+X.stat('shift',sh.toFixed(2),mu!=null?'e<sup>&mu;</sup>':'fixed')+X.stat('evaluations in the noisier half',noisy+' of '+nSteps,'&sigma; above 0.5');
    $('fmt-shnote').innerHTML='Grid as the FLUX and Qwen-Image pipelines build it: <code>np.linspace(1.0, 1 / n, n)</code>, then &sigma;&prime; = shift &sigma; / (1 + (shift &minus; 1) &sigma;)'+(R.term?', then stretched so the last level is '+R.term+' (shift_terminal)':'')+' <span class="der">derived</span> from diffusers v0.41.0. Dynamic rules extrapolate linearly outside their token range, as diffusers does. HunyuanVideo and Wan are video models: their token counts are not (px/16)&sup2;, so only their fixed shift is meaningful here.'}
  // ---------- 4. SD3 table
  function all(){dens();err();shift()}
  X.onRender('t-read',all);
})();
