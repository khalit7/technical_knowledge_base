// ---- Tab: Stretch the spectrum. Per-pair slowdown (theta / theta') for every extension method on real configs ----
(function(){
  const $=id=>document.getElementById(id);if(!$('sp'))return;
  const D=window.PE_DATA,RO=window.ROPE,RD=window.RD;
  const M=[['pi','Position Interpolation','--c2'],['ntk','NTK-aware','--c3'],['yarn','YaRN','--c1'],['llama3','Llama 3 scaling','--c4'],['longrope','LongRoPE (long factors)','--c5'],['longshort','LongRoPE (short factors)','--c6']];
  const S={pk:'llama31',s:null,x:'wl',pair:null,on:{pi:1,ntk:1,yarn:1,llama3:1,longrope:1,longshort:1}};
  const fmt=n=>Math.round(n).toLocaleString('en-US');
  const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim()||'#888';
  function curves(P,s){const plain=RO.baseInv(P.base,P.dim),c={};
    c.pi=RO.pi(P,s);c.ntk=RO.ntk(P,s);c.yarn=RO.yarn(P,s);c.llama3=RO.llama3(P,s);
    if(P.long){c.longrope=RO.longrope(P,'long');c.longshort=RO.longrope(P,'short')}
    const r={};for(const k in c)r[k]=c[k].map((f,i)=>plain[i]/f);return {plain,r}}
  function draw(){const P=D.presets[S.pk],s=S.s||P.s,{plain,r}=curves(P,s),n=plain.length;
    if(S.pair===null||S.pair>=n)S.pair=Math.round(n*0.6);$('spPair').max=n-1;$('spPair').value=S.pair;
    const el=$('spSvg'),W=RD.width(el),Hh=W<520?270:330,ml=44,mr=12,mt=12,mb=38,pw=W-ml-mr,ph=Hh-mt-mb;
    const wl=plain.map(f=>2*Math.PI/f),lx0=Math.log10(wl[0]),lx1=Math.log10(wl[n-1]);
    const X=i=>S.x==='wl'?ml+(Math.log10(wl[i])-lx0)/(lx1-lx0)*pw:ml+i/(n-1)*pw;
    const XW=w=>ml+(Math.log10(w)-lx0)/(lx1-lx0)*pw;
    let ymax=s;for(const k in r)if(S.on[k])ymax=Math.max(ymax,...r[k]);const ly1=Math.log10(ymax*1.15);
    const Y=v=>mt+(1-Math.log10(Math.max(v,1))/ly1)*ph;
    let g='<svg viewBox="0 0 '+W+' '+Hh+'" width="'+W+'" height="'+Hh+'" role="img" aria-label="How much each rotation pair is slowed, per method">';
    [1,2,4,8,16,32,64].filter(v=>v<=ymax*1.15).forEach(v=>{g+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/><text x="'+(ml-5)+'" y="'+(Y(v)+4)+'" font-size="11" text-anchor="end" fill="var(--mute)">÷'+v+'</text>'});
    if(S.x==='wl'){[10,100,1e3,1e4,1e5,1e6,1e7,1e8].filter(w=>w>=wl[0]&&w<=wl[n-1]).forEach(w=>{g+='<text x="'+XW(w)+'" y="'+(Hh-mb+15)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+(w>=1e6?(w/1e6)+'M':w>=1e3?(w/1e3)+'K':w)+'</text>'});
      // trained length, target, and the YaRN and Llama 3 boundaries, on the wavelength axis
      const mk=(w,lab,c,y)=>{if(w<wl[0]||w>wl[n-1])return;g+='<line x1="'+XW(w)+'" x2="'+XW(w)+'" y1="'+mt+'" y2="'+(mt+ph)+'" stroke="'+c+'" stroke-dasharray="4 3"/><text x="'+(XW(w)+3)+'" y="'+(mt+y)+'" font-size="10.5" fill="'+c+'">'+lab+'</text>'};
      mk(P.L,'trained '+fmt(P.L),'var(--bad)',11);mk(P.L*s,'target '+fmt(P.L*s),'var(--mute)',24);
      if(S.on.yarn)mk(P.L/32,'L/32','var(--c1)',37);
      g+='<text x="'+(ml+pw/2)+'" y="'+(Hh-4)+'" font-size="11.5" text-anchor="middle" fill="var(--mute)">wavelength of the pair, in tokens (log)</text>'}
    else{[0,Math.round((n-1)/4),Math.round((n-1)/2),Math.round(3*(n-1)/4),n-1].forEach(i=>{g+='<text x="'+X(i)+'" y="'+(Hh-mb+15)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+i+'</text>'});
      g+='<text x="'+(ml+pw/2)+'" y="'+(Hh-4)+'" font-size="11.5" text-anchor="middle" fill="var(--mute)">rotation pair i (0 = fastest)</text>'}
    M.forEach(([k,,c])=>{if(!r[k]||!S.on[k])return;let d='';r[k].forEach((v,i)=>{d+=(i?'L':'M')+X(i).toFixed(1)+' '+Y(v).toFixed(1)});
      g+='<path d="'+d+'" fill="none" stroke="'+css(c)+'" stroke-width="'+(k==='longrope'||k==='longshort'?1.4:2)+'"'+(k==='longshort'?' stroke-dasharray="3 3"':'')+'/>'});
    g+='<line x1="'+X(S.pair)+'" x2="'+X(S.pair)+'" y1="'+mt+'" y2="'+(mt+ph)+'" stroke="var(--ink)" opacity=".35"/>';
    el.innerHTML=g+'</svg>';
    $('spLeg').innerHTML=M.filter(([k])=>r[k]).map(([k,nm,c])=>'<label class="chk"><input type="checkbox" data-k="'+k+'"'+(S.on[k]?' checked':'')+'> <i style="background:'+css(c)+'"></i>'+nm+'</label>').join('');
    const i=S.pair;
    $('spPairV').textContent=i+' (wavelength '+(wl[i]<100?wl[i].toFixed(1):fmt(wl[i]))+' tokens, '+(P.L/wl[i]).toFixed(P.L/wl[i]<10?2:0)+' turns in '+fmt(P.L)+')';
    $('spOut').innerHTML=M.filter(([k])=>r[k]).map(([k,nm])=>RD.stat(nm,'÷'+r[k][i].toFixed(r[k][i]<10?3:2),'at pair '+i)).join('');
    const [lo,hi]=RO.yarnRange(P,s),ramp=RO.yarnRamp(P,s);
    $('spNote').innerHTML='Base '+fmt(P.base)+', '+P.dim+' rotated dimensions ('+n+' pairs), trained at '+fmt(P.L)+', factor '+s+' (target '+fmt(P.L*s)+'; the config allows '+fmt(P.maxpos)+'). '+
      'NTK-aware base: '+fmt(RO.ntkBase(P,s))+'. YaRN: '+ramp.filter(v=>v===0).length+' pairs kept (from pair 0), '+ramp.filter(v=>v>0&&v<1).length+' on the ramp, '+ramp.filter(v=>v===1).length+' divided by '+s+' (ramp from pair '+(+lo.toFixed(2))+' to '+(+hi.toFixed(2))+'), logits × '+Math.pow(RO.mscale(s),2).toFixed(3)+'.';
  }
  // the config table: static rows in 31_tab_spec.html (tr data-k), derived cells filled from the same functions as the chart
  function drawTable(){document.querySelectorAll('#spTb tr[data-k]').forEach(tr=>{const P=D.presets[tr.dataset.k],s=P.s,n=P.dim/2,{r}=curves(P,s);
      const rr=r[P.method],kept=rr.filter(v=>Math.abs(v-1)<1e-6).length,full=rr.filter(v=>Math.abs(v-s)<1e-6*s).length,mid=n-kept-full;
      const temp=P.method==='yarn'?Math.pow(RO.mscale(s),2).toFixed(3):P.method==='longrope'?(1+Math.log(s)/Math.log(P.L)).toFixed(3):'1';
      const set=(c,v)=>{const td=tr.querySelector('[data-c="'+c+'"]');if(td)td.textContent=v};
      set('base',fmt(P.base));set('dim',P.dim);set('L',fmt(P.L));set('bands',kept+' / '+mid+' / '+full);set('temp',temp);set('cov',fmt(P.L*s)+' / '+fmt(P.maxpos))})}
  $('spP').addEventListener('change',e=>{S.pk=e.target.value;S.s=null;S.pair=null;$('spS').value='cfg';draw()});
  $('spS').addEventListener('change',e=>{S.s=e.target.value==='cfg'?null:+e.target.value;draw()});
  $('spX').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;S.x=b.dataset.x;[...$('spX').children].forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b)});draw()});
  $('spPair').addEventListener('input',e=>{S.pair=+e.target.value;draw()});
  $('spLeg').addEventListener('change',e=>{const k=e.target.dataset.k;if(k){S.on[k]=e.target.checked?1:0;draw()}});
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-spec']=window.TAB_RENDER['t-spec']||[]).push(()=>{draw();drawTable()});
  addEventListener('resize',()=>{if($('sp').offsetParent)draw()});
  draw();drawTable();
})();
