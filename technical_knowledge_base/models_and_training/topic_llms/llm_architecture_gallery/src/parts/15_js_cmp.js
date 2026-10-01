// ---- Compare architectures: table, scatter and diff, all from GAL (gen_data.py) ----
const FAM={mha:['MHA','var(--c2)'],mqa:['MQA','var(--ink)'],gqa:['GQA','var(--c1)'],win:['GQA + windows','var(--c6)'],mla:['MLA','var(--c3)'],sparse:['Trained sparse','var(--c4)'],hyb:['Linear / recurrent hybrid','var(--c5)']};
function famOf(r){if(!r.mix)return /V4/.test(r.n)?'sparse':'mla';if(/L/.test(r.mix))return 'hyb';if(/D/.test(r.mix))return 'sparse';if(r.dc||/M/.test(r.mix))return 'mla';if(/S/.test(r.mix))return 'win';if(r.Hkv===r.H)return 'mha';if(r.Hkv===1)return 'mqa';return 'gqa'}
function effKV(r,T){if(!r.mix)return r.gal;let s=0;[...r.mix].forEach(m=>{const p=(r.per&&r.per[m])||0;s+=p*(m==='S'&&r.W?Math.min(T,r.W):T)});return s*(r.passes||1)/T}
const MIXN={G:'full attention',S:'sliding window or chunked',M:'MLA',D:'trained sparse (indexer over MLA or GQA)',L:'linear or recurrent',F:'no mixer (FFN-only block)'};
const FFNN={e:'MoE',d:'dense FFN','.':'none'};const POSN={R:'RoPE',P:'partial RoPE (or MLA decoupled key)',N:'NoPE',A:'learned absolute',B:'learned relative bias','-':'not applicable'};
const strip=(s,pre,map,ttl)=>'<div class="lstrip" title="'+ttl+'">'+[...(s||'')].map((c,i)=>'<i class="'+pre+'-'+(c==='.'||c==='-'?'x':c)+'" title="layer '+(i+1)+': '+map[c]+'"></i>').join('')+'</div>';
const DIFFNOTE={'Xiaomi MiMo-V2-Flash 309B':1,'Xiaomi MiMo-V2.5 310B':1};
const diffTxt='Config: 9 global layers × 4 KV heads × (192 key + 128 value) × 2 = 23,040 bytes, plus 39 sliding layers × 8 KV heads × (192 + 128) × 2 = 199,680 bytes: 217.5 KiB. The gallery\'s 144 KiB reconstructs as 48 layers × 4 KV heads × (192 + 192) × 2, which would ignore the sliding layers\' own 8 KV heads and the 128-dimension values (our reconstruction); it also lists the layer mix as 40 + 8, where the config\'s hybrid_layer_pattern gives 39 + 9. MiMo-V2.5-Pro, with the same kind of config, matches at 350 KiB.';
(function(){
  if(!$('t-cmp'))return;
  const R=GAL.slice();R.forEach(r=>{r.fam=famOf(r);r.y=+r.dt.slice(0,4)+(+r.dt.slice(5,7)-1)/12+(+r.dt.slice(8,10)-1)/365});
  const nM=R.filter(r=>r.status==='match').length,nD=R.filter(r=>r.status==='differs').length,nX=R.filter(r=>r.status==='extra').length,nG=R.filter(r=>r.status==='gallery').length;
  $('cmpRep').innerHTML='<b>Defaults reproduce the gallery independently:</b> recomputing the KV cache per token from each config.json, with the gallery\'s own conventions ('+A('https://sebastianraschka.com/llm-architecture-gallery/kv-cache-calculations/','KV-cache notes')+'), matches its published figure for <b>'+nM+' of '+(nM+nD)+'</b> models within rounding. The '+nD+' that differ are MiMo-V2-Flash and MiMo-V2.5 (both arithmetics in their rows). '+nX+' models the page uses but the gallery does not list (Llama 3.1 8B and 70B, Granite 4.0-H Small) are computed only; '+nG+' DeepSeek V4 entries use compressed caches this formula cannot rebuild and show the gallery\'s figure.';
  $('cmpLeg').innerHTML='<span><b>Mixer:</b></span>'+Object.keys(MIXN).map(c=>'<span><i class="sw ms-'+c+'"></i>'+MIXN[c]+'</span>').join('')+'<span><b>FFN:</b></span><span><i class="sw fs-e"></i>MoE</span><span><i class="sw fs-d"></i>dense</span><span><b>Position:</b></span>'+['R','P','N','A','B'].map(c=>'<span><i class="sw ps-'+c+'"></i>'+POSN[c]+'</span>').join('');
  let fam='all',q='',sort='dt',sel=null,ymode='h';
  const FCH=[['all','All']].concat(Object.keys(FAM).map(k=>[k,FAM[k][0]]));
  $('cmpF').innerHTML=FCH.map(f=>'<button data-f="'+f[0]+'"'+(f[0]==='all'?' class="on"':'')+'>'+f[1]+' ('+(f[0]==='all'?R.length:R.filter(r=>r.fam===f[0]).length)+')</button>').join('');
  $('cmpF').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{fam=b.dataset.f;$('cmpF').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));table()}));
  $('cmpQ').addEventListener('input',e=>{q=e.target.value.toLowerCase();table()});
  $('cmpS').addEventListener('change',e=>{sort=e.target.value;table()});
  segBind('cmpY',m=>{ymode=m;scatter()});
  const attTxt=r=>!r.mix?'(gallery) '+(r.att||''):r.dc?'MLA: '+r.H+' heads, latent '+r.dc+(r.dr?' + RoPE key '+r.dr:', no RoPE key'):(r.H+' Q / '+r.Hkv+' KV × '+r.dh+(r.W?', window '+fmt(r.W):''));
  const expTxt=r=>r.E?r.E+' routed, '+r.k+' active'+(r.sh?', '+r.sh+' shared':''):'dense';
  const kvTxt=r=>r.kv==null?'':fmtBytes(r.kv);
  const chk=r=>r.status==='match'?'<span class="ok">✓</span>':r.status==='differs'?'<span class="dfr">differs</span>':r.status==='extra'?'<span class="mute">not listed</span>':'<span class="mute">gallery only</span>';
  function rows(){let a=R.filter(r=>(fam==='all'||r.fam===fam)&&(!q||(r.n+' '+(r.co||'')).toLowerCase().includes(q)));
    const key={dt:r=>r.dt,kv:r=>(r.kv!=null?r.kv:r.gal)||0,n:r=>r.n.toLowerCase(),L:r=>r.L||0}[sort];
    a.sort((x,y)=>{const u=key(x),v=key(y);return u<v?-1:u>v?1:0});if(sort==='kv'||sort==='L')a.reverse();return a}
  function table(){const a=rows();
    let h='<thead><tr><th>Model</th><th class="num">Layers</th><th>Attention</th><th>Layers: mixer · FFN · position</th><th>Experts</th><th>RoPE base, scaling</th><th class="num">KV / token</th><th class="num">Gallery</th><th></th></tr></thead><tbody>';
    a.forEach(r=>{h+='<tr data-n="'+r.n+'"'+(sel===r.n?' class="sel"':'')+'><td><b>'+r.n+'</b><br><span class="mute small">'+(r.co||'')+' · <span style="white-space:nowrap">'+r.dt+'</span></span></td><td class="num">'+(r.L||'')+(r.passes>1?' ×'+r.passes:'')+'</td><td>'+attTxt(r)+'</td><td class="st">'+(r.mix?strip(r.mix,'ms',MIXN,'mixer')+'<div style="height:2px"></div>'+strip(r.ffn,'fs',FFNN,'FFN')+'<div style="height:2px"></div>'+strip(r.pos,'ps',POSN,'position'):'<span class="mute small">'+(r.mixg||'')+'</span>')+'</td><td>'+(r.mix?expTxt(r):'')+'</td><td class="small">'+(typeof r.theta==='number'?fmt(r.theta):(r.theta||''))+(r.scale?'<br>'+r.scale:'')+'</td><td class="num">'+kvTxt(r)+'</td><td class="num">'+(r.gal!=null?fmtBytes(r.gal):'')+'</td><td>'+chk(r)+'</td></tr>';
      if(DIFFNOTE[r.n])h+='<tr data-n="'+r.n+'"><td colspan="9" class="small" style="background:var(--soft)">'+diffTxt+'</td></tr>';
});
    $('cmpT').innerHTML=h+'</tbody>';
    $('cmpT').querySelectorAll('tbody tr').forEach(tr=>tr.addEventListener('click',()=>pick(tr.dataset.n)))}
  function pick(n){sel=n;const a=$('cmpA'),b=$('cmpB');if(a.value!==n){b.value=a.value;a.value=n}diff();table();scatter()}
  function scatter(){const W=Math.max(320,Math.min(860,($('cmpSc').clientWidth||800))),H=300,pl=52,pr=12,pt=12,pb=30,x0=2024.4,x1=2026.85;
    const lg=Math.log10,y0=lg(512),yT=lg(4*MiB),X=v=>pl+(W-pl-pr)*(Math.max(x0,v)-x0)/(x1-x0),Y=v=>v<=0?H-pb+0:pt+(H-pt-pb)*(1-(lg(Math.max(600,v))-y0)/(yT-y0));
    let s='';[[1*KiB,'1 KiB'],[10*KiB,'10 KiB'],[100*KiB,'100 KiB'],[1*MiB,'1 MiB']].forEach(([v,l])=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/><text x="'+(pl-5)+'" y="'+(Y(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+l+'</text>'});
    [2024.5,2025,2025.5,2026,2026.5].forEach(v=>{s+='<text x="'+X(v)+'" y="'+(H-12)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+(v%1?'mid ':'')+Math.floor(v)+'</text>'});
    s+='<text x="'+(pl+2)+'" y="'+(H-pb-4)+'" font-size="10" fill="var(--mute)">earlier models pinned at the left edge; 0 B (xLSTM) on the floor</text>';
    R.forEach(r=>{const v=ymode==='h'?(r.kv!=null?r.kv:r.gal):effKV(r,131072);if(v==null)return;const c=FAM[r.fam][1],on=sel===r.n;
      s+='<circle cx="'+X(r.y).toFixed(1)+'" cy="'+Y(v).toFixed(1)+'" r="'+(on?6:4)+'" fill="'+c+'" fill-opacity="'+(on?1:.75)+'" stroke="'+(on?'var(--ink)':'var(--bg)')+'" stroke-width="'+(on?2:1)+'" data-n="'+r.n+'" style="cursor:pointer"><title>'+r.n+' ('+r.dt+'): '+fmtBytes(v)+' per token</title></circle>'});
    s+='<text x="12" y="'+((pt+H-pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 12 '+((pt+H-pb)/2)+')">KV per token, BF16 (log)</text>';
    $('cmpSc').innerHTML=svgEl(W,H,s,'KV cache per token against release date')+'<div class="leg">'+Object.keys(FAM).map(k=>'<span><i style="background:'+FAM[k][1]+';height:8px;width:8px;border-radius:50%"></i>'+FAM[k][0]+'</span>').join('')+'</div>';
    $('cmpSc').querySelectorAll('circle').forEach(c=>c.addEventListener('click',()=>pick(c.dataset.n)))}
  // diff
  const opts=R.map(r=>'<option>'+r.n+'</option>').join('');$('cmpA').innerHTML=opts;$('cmpB').innerHTML=opts;
  $('cmpA').value='Qwen3 235B-A22B';$('cmpB').value='Qwen3 Next 80B-A3B';
  ['cmpA','cmpB'].forEach(i=>$(i).addEventListener('change',diff));
  const F=[['Company','co'],['Released','dt'],['Scale (gallery)','sc'],['Decoder (gallery)','dec'],['Attention (gallery)','att'],['Layer mix (gallery)','mixg'],['Layers','L'],['Hidden size','D'],['Query heads','H'],['KV heads','Hkv'],['Head dim','dh'],['MLA latent + RoPE key',r=>r.dc?r.dc+' + '+(r.dr||0):''],['Window',r=>r.W?fmt(r.W):''],['Routed experts','E'],['Active per token','k'],['Shared','sh'],['RoPE base','theta'],['RoPE scaling','scale'],['Vocabulary',r=>r.V?fmt(r.V):''],['Max positions',r=>r.ctx?fmt(r.ctx):''],['Recurrent state per linear layer',r=>r.st?fmt(r.st)+' numbers':''],['KV per token (computed)',r=>r.kv!=null?fmtBytes(r.kv):''],['KV per token (gallery)',r=>r.gal!=null?fmtBytes(r.gal):''],['Effective at 128K',r=>r.mix?fmtBytes(effKV(r,131072)):''],['Licence','lic'],['Notes',r=>(r.note||'')+(r.xn?(r.note?'; ':'')+r.xn:'')]];
  function diff(){const a=R.find(r=>r.n===$('cmpA').value),b=R.find(r=>r.n===$('cmpB').value);if(!a||!b)return;
    const val=(r,f)=>{const v=typeof f[1]==='function'?f[1](r):r[f[1]];return v==null?'':String(v)};
    let h='<div class="tw"><table class="dif"><thead><tr><th></th><th>'+a.n+'</th><th>'+b.n+'</th></tr></thead><tbody>';
    F.forEach(f=>{const u=val(a,f),v=val(b,f);if(!u&&!v)return;const d=u!==v;h+='<tr><td class="mute">'+f[0]+'</td><td'+(d?' class="d"':'')+'>'+u+'</td><td'+(d?' class="d"':'')+'>'+v+'</td></tr>'});
    h+='<tr><td class="mute">Config</td><td>'+A(a.cfg,'config')+(a.tr?' · '+A(a.tr,'report'):'')+'</td><td>'+A(b.cfg,'config')+(b.tr?' · '+A(b.tr,'report'):'')+'</td></tr></tbody></table></div>';
    const S=(r,k,p,m)=>r[k]?strip(r[k],p,m,k):'<span class="mute small">not computed</span>';
    h+='<div class="dstrip"><span>'+a.n+' mixer</span>'+S(a,'mix','ms',MIXN)+'<span>'+b.n+' mixer</span>'+S(b,'mix','ms',MIXN)+'<span>FFN A</span>'+S(a,'ffn','fs',FFNN)+'<span>FFN B</span>'+S(b,'ffn','fs',FFNN)+'<span>Position A</span>'+S(a,'pos','ps',POSN)+'<span>Position B</span>'+S(b,'pos','ps',POSN)+'</div><p class="small mute">Highlighted cells differ. Strips are each model\'s own layer count stretched to the same width.</p>';
    $('cmpDiff').innerHTML=h}
  onTab('t-cmp',()=>{table();scatter();diff()});
  let rw=0;addEventListener('resize',()=>{const w=$('cmpSc').clientWidth;if(w&&Math.abs(w-rw)>40){rw=w;scatter()}});
})();
