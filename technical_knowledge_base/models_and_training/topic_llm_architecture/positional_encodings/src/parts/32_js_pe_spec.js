// ---- Tab: Stretch the spectrum. Per-pair slowdown (theta / theta') for every extension method on real configs ----
(function(){
  const $=id=>document.getElementById(id);if(!$('pe-sp')||!window.PE_DATA)return;
  const D=window.PE_DATA,RO=window.ROPE,RD=window.RD;
  const M=[['pi','Position Interpolation','--c2'],['ntk','NTK-aware','--c3'],['yarn','YaRN','--c1'],['llama3','Llama 3 scaling','--c4'],['longrope','LongRoPE (long factors)','--c5'],['longshort','LongRoPE (short factors)','--c6']];
  const S={pk:'llama31',s:null,x:'wl',pair:null,on:{pi:1,ntk:1,yarn:1,llama3:1,longrope:1,longshort:1}};
  const fmt=n=>Math.round(n).toLocaleString('en-US');
  const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim()||'#888';
  function curves(P,s){const plain=RO.baseInv(P.base,P.dim),c={};
    c.pi=RO.pi(P,s);c.ntk=RO.ntk(P,s);c.yarn=RO.yarn(P,s);c.llama3=RO.llama3(P,s);
    if(P.long){c.longrope=RO.longrope(P,'long');c.longshort=RO.longrope(P,'short')}
    const r={};for(const k in c)r[k]=c[k].map((f,i)=>plain[i]/f);return {plain,r}}
  function custom(){const v=id=>+$(id).value;const d=Math.max(4,2*Math.round(v('pe-spCd')/2));return {name:'Your config',base:Math.max(2,v('pe-spCb')||10000),dim:d,L:Math.max(16,v('pe-spCl')||4096),s:Math.max(1,v('pe-spCs')||8),method:'yarn',maxpos:0}}
  const preset=()=>S.pk==='custom'?custom():D.presets[S.pk];
  function measured(){const el=$('pe-spMeas');if(!el)return;if(S.pk!=='tiny'){el.innerHTML='';return}const g=(m,sc)=>window.PE.past(m,sc),b=g('at_mha','plain');
    if(!b){el.innerHTML='';return}const st=(n,r)=>r?RD.stat(n,r['1024-2047'].toFixed(3),'loss at 1,024 to 2,047; '+r['0-255'].toFixed(3)+' at 0 to 255'):'';
    el.innerHTML=st('No scaling (measured)',b)+st('PI ×8 (measured)',g('at_mha','linear x8'))+st('NTK ×8 (measured)',g('at_mha','ntk x8'))+st('YaRN ×8 (measured)',g('at_mha','yarn x8'))}
  function draw(){const P=preset(),s=S.s||P.s,{plain,r}=curves(P,s),n=plain.length;
    if(S.pair===null||S.pair>=n)S.pair=Math.round(n*0.6);$('pe-spPair').max=n-1;$('pe-spPair').value=S.pair;
    const el=$('pe-spSvg'),W=RD.width(el),Hh=W<520?270:330,ml=44,mr=12,mt=12,mb=38,pw=W-ml-mr,ph=Hh-mt-mb;
    const wl=plain.map(f=>2*Math.PI/f),lx0=Math.log10(wl[0]),lx1=Math.log10(wl[n-1]);
    const X=i=>S.x==='wl'?ml+(Math.log10(wl[i])-lx0)/(lx1-lx0)*pw:ml+i/(n-1)*pw;
    const XW=w=>ml+(Math.log10(w)-lx0)/(lx1-lx0)*pw;
    let ymax=s;for(const k in r)if(S.on[k])ymax=Math.max(ymax,...r[k]);const ly1=Math.log10(ymax*1.15);
    const Y=v=>mt+(1-Math.log10(Math.max(v,1))/ly1)*ph;
    let g='<svg viewBox="0 0 '+W+' '+Hh+'" width="'+W+'" height="'+Hh+'" role="img" aria-label="How much each rotation pair is slowed, per method">';
    [1,2,4,8,16,32,64].filter(v=>v<=ymax*1.15).forEach(v=>{g+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/><text x="'+(ml-5)+'" y="'+(Y(v)+4)+'" font-size="11" text-anchor="end" fill="var(--mute)">÷'+v+'</text>'});
    if(S.x==='wl'){[10,100,1e3,1e4,1e5,1e6,1e7,1e8].filter(w=>w>=wl[0]&&w<=wl[n-1]).forEach(w=>{g+='<text x="'+XW(w)+'" y="'+(Hh-mb+15)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+(w>=1e6?(w/1e6)+'M':w>=1e3?(w/1e3)+'K':w)+'</text>'});
      // trained length, target, and the YaRN and Llama 3 boundaries, on the wavelength axis
      const mk=(w,lab,c,y)=>{if(w<wl[0]||w>wl[n-1])return;g+='<line x1="'+XW(w)+'" x2="'+XW(w)+'" y1="'+mt+'" y2="'+(mt+ph)+'" stroke="'+c+'" stroke-dasharray="4 3"/><text x="'+(XW(w)+3)+'" y="'+(mt+y)+'" font-size="11" fill="'+c+'">'+lab+'</text>'};
      mk(P.L,'trained '+fmt(P.L),'var(--bad)',11);mk(P.L*s,'target '+fmt(P.L*s),'var(--mute)',24);
      if(S.on.yarn)mk(P.L/32,'L/32','var(--c1)',37);
      g+='<text x="'+(ml+pw/2)+'" y="'+(Hh-4)+'" font-size="11.5" text-anchor="middle" fill="var(--mute)">wavelength of the pair, in tokens (log)</text>'}
    else{[0,Math.round((n-1)/4),Math.round((n-1)/2),Math.round(3*(n-1)/4),n-1].forEach(i=>{g+='<text x="'+X(i)+'" y="'+(Hh-mb+15)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+i+'</text>'});
      g+='<text x="'+(ml+pw/2)+'" y="'+(Hh-4)+'" font-size="11.5" text-anchor="middle" fill="var(--mute)">rotation pair i (0 = fastest)</text>'}
    M.forEach(([k,,c])=>{if(!r[k]||!S.on[k])return;let d='';r[k].forEach((v,i)=>{d+=(i?'L':'M')+X(i).toFixed(1)+' '+Y(v).toFixed(1)});
      g+='<path d="'+d+'" fill="none" stroke="'+css(c)+'" stroke-width="'+(k==='longrope'||k==='longshort'?1.4:2)+'"'+(k==='longshort'?' stroke-dasharray="3 3"':'')+'/>'});
    g+='<line x1="'+X(S.pair)+'" x2="'+X(S.pair)+'" y1="'+mt+'" y2="'+(mt+ph)+'" stroke="var(--ink)" opacity=".35"/>';
    el.innerHTML=g+'</svg>';
    $('pe-spLeg').innerHTML=M.filter(([k])=>r[k]).map(([k,nm,c])=>'<label class="pe-chk"><input type="checkbox" data-k="'+k+'"'+(S.on[k]?' checked':'')+'> <i style="background:'+css(c)+'"></i>'+nm+'</label>').join('');
    const i=S.pair;
    $('pe-spPairV').textContent=i+' (wavelength '+(wl[i]<100?wl[i].toFixed(1):fmt(wl[i]))+' tokens, '+(P.L/wl[i]).toFixed(P.L/wl[i]<10?2:0)+' turns in '+fmt(P.L)+')';
    $('pe-spOut').innerHTML=M.filter(([k])=>r[k]).map(([k,nm])=>RD.stat(nm,'÷'+r[k][i].toFixed(r[k][i]<10?3:2),'at pair '+i)).join('');
    const [lo,hi]=RO.yarnRange(P,s),ramp=RO.yarnRamp(P,s);
    measured();
    $('pe-spNote').innerHTML='Base '+fmt(P.base)+', '+P.dim+' rotated dimensions ('+n+' pairs), trained at '+fmt(P.L)+', factor '+s+' (target '+fmt(P.L*s)+'; the config allows '+fmt(P.maxpos)+'). '+
      'NTK-aware base: '+fmt(RO.ntkBase(P,s))+'. YaRN: '+ramp.filter(v=>v===0).length+' pairs kept (from pair 0), '+ramp.filter(v=>v>0&&v<1).length+' on the ramp, '+ramp.filter(v=>v===1).length+' divided by '+s+' (ramp from pair '+(+lo.toFixed(2))+' to '+(+hi.toFixed(2))+'), logits × '+(S.pk==='mistral3'?'1 (apply_scale false; YaRN would give '+Math.pow(RO.mscale(s),2).toFixed(3)+')':Math.pow(RO.mscale(s),2).toFixed(3))+'.';
  }
  // the config table: static rows in 31_tab_spec.html (tr data-k), derived cells filled from the same functions as the chart
  function drawTable(){document.querySelectorAll('#pe-spTb tr[data-k]').forEach(tr=>{const P=D.presets[tr.dataset.k],s=P.s,n=P.dim/2,{r}=curves(P,s);
      const rr=r[P.method],kept=rr.filter(v=>Math.abs(v-1)<1e-6).length,full=rr.filter(v=>Math.abs(v-s)<1e-6*s).length,mid=n-kept-full;
      const temp=tr.dataset.k==='mistral3'?'1':P.method==='yarn'?Math.pow(RO.mscale(s),2).toFixed(3):P.method==='longrope'?(1+Math.log(s)/Math.log(P.L)).toFixed(3):'1';
      const set=(c,v)=>{const td=tr.querySelector('[data-c="'+c+'"]');if(td)td.textContent=v};
      set('base',fmt(P.base));set('dim',P.dim);set('L',fmt(P.L));set('bands',kept+' / '+mid+' / '+full);set('temp',temp);set('cov',fmt(P.L*s)+' / '+fmt(P.maxpos))})}
  $('pe-spP').addEventListener('change',e=>{S.pk=e.target.value;S.s=null;S.pair=null;$('pe-spS').value='cfg';$('pe-spCustom').hidden=S.pk!=='custom';draw()});
  ['pe-spCb','pe-spCd','pe-spCl','pe-spCs'].forEach(id=>$(id).addEventListener('input',()=>{if(S.pk==='custom'){S.pair=null;draw()}}));
  $('pe-spS').addEventListener('change',e=>{S.s=e.target.value==='cfg'?null:+e.target.value;draw()});
  $('pe-spX').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;S.x=b.dataset.x;[...$('pe-spX').children].forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b)});draw()});
  $('pe-spPair').addEventListener('input',e=>{S.pair=+e.target.value;draw()});
  $('pe-spLeg').addEventListener('change',e=>{const k=e.target.dataset.k;if(k){S.on[k]=e.target.checked?1:0;draw()}});
  const CN={f:'all'};
  function drawCensus(){const tb=$('pe-cnT');if(!tb)return;const rows=(D.census||[]).filter(r=>CN.f==='all'||(CN.f==='RoPE'&&r.scheme==='RoPE')||(CN.f==='sc'&&r.scaling)||(CN.f==='none'&&/NoPE/.test(r.scheme))||(CN.f==='other'&&!/RoPE|NoPE/.test(r.scheme)));
    const e=window.PE.esc,sc=r=>r.scaling?e(r.scaling.type+(r.scaling.factor?' ×'+r.scaling.factor:'')+(r.scaling.orig?' from '+fmt(r.scaling.orig):'')):'';
    tb.querySelector('tbody').innerHTML=rows.map(r=>'<tr><td><a href="'+e(r.url)+'" target="_blank" rel="noopener noreferrer">'+e(r.repo)+'</a></td><td>'+e(r.scheme)+(r.partial?' (partial '+r.partial+')':'')+'</td><td class="num">'+(r.theta?fmt(r.theta):'')+(r.local_theta?'<br><span class="small mute">local '+fmt(r.local_theta)+'</span>':'')+'</td><td class="num">'+(r.rot_dims||'')+(r.head_dim&&r.rot_dims&&r.rot_dims!==r.head_dim?'<span class="small mute"> of '+r.head_dim+'</span>':'')+'</td><td class="num">'+(r.longest_wavelength?fmt(r.longest_wavelength):'')+'</td><td class="num">'+(r.max_pos?fmt(r.max_pos):'')+'</td><td>'+sc(r)+'</td><td class="small">'+e([r.nope_layers?'NoPE layers: '+r.nope_layers:'',r.window?'window '+fmt(r.window):''].concat(r.notes||[]).filter(Boolean).join('; '))+'</td></tr>').join('');
    $('pe-cnCap').textContent=rows.length+' of '+(D.census||[]).length+' configs. Fetched from Hugging Face (official repositories, or public mirrors where gated) between 2026-10-03 and 2026-10-18; a base config and its Instruct config can differ (Llama 4 Scout). Where a config has no rope_theta, the transformers default 10,000 applies (Llama 1 and 2, Falcon). The base of a decoupled MLA key is that key\'s.'}
  if($('pe-cnF'))$('pe-cnF').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;CN.f=b.dataset.f;[...$('pe-cnF').children].forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b)});drawCensus()});
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-spec']=window.TAB_RENDER['t-spec']||[]).push(()=>{draw();drawTable();drawCensus()});
  addEventListener('resize',()=>{if($('pe-sp').offsetParent)draw()});
  draw();drawTable();drawCensus();
})();
