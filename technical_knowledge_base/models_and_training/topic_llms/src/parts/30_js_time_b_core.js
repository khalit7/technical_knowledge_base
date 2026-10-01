// ---- Release history: shared helpers, the one set of filters, headline counts ----
// window.RH holds the rows (30_js_time_a_data.js), helpers, the filter state RH.f and the views that redraw when it changes.
(function(){
  const RH=window.RH,ROWS=RH.ROWS,$=id=>document.getElementById(id);
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const A=(u,t)=>'<a href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">'+t+'</a>';
  const stat=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
  const fmt=(v,d)=>v.toLocaleString('en-GB',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  const med=a=>{if(!a.length)return null;const s=a.slice().sort((x,y)=>x-y),n=s.length;return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2};
  // month-only rows: sort to the start of their month, drawn at the 15th
  const ts=d=>{const p=d.split('-').map(Number);return Date.UTC(p[0],p[1]-1,p[2]||15)};
  const LIC={perm:'Apache 2.0 or MIT',cond:'With conditions',own:"Lab's own licence",nc:'Non-commercial',closed:'Closed'};
  const LICC={perm:'var(--open)',cond:'var(--c6)',own:'var(--c5)',nc:'var(--bad)',closed:'var(--closed)'};
  function lic(r){if(!r.o)return 'closed';const l=r.lic||'';
    if(/^(Apache 2\.0|MIT)/.test(l)&&!/Modified/.test(l))return 'perm';
    if(/Modified MIT|MIT-style/.test(l))return 'cond';
    if(/Non-commercial|CC-BY-NC|Research License/.test(l))return 'nc';return 'own'}
  const PAGE={'OpenAI':'3c65c17b0d0d814abf90d5b9e567d72f','Anthropic':'3c65c17b0d0d814cb979d0eabca59a45','Google DeepMind':'3c65c17b0d0d8173a0aafcb27cf7a5f3','xAI/SpaceXAI':'3c65c17b0d0d81f2ac36c873a854007f','Meta':'3c65c17b0d0d81949ad8e17bcb3567f1','DeepSeek':'3c65c17b0d0d81a2ae7ec6796947a235','Alibaba (Qwen)':'3c65c17b0d0d81fd8c36ce06672bb235','Moonshot (Kimi)':'3c65c17b0d0d81f5abf5dbdbac821a12','Zhipu (GLM)':'3c65c17b0d0d81a88a84c2ca84b4daf4','MiniMax':'3c65c17b0d0d813ba1c0cb4ba00659b8','Mistral':'3c65c17b0d0d814a9882e6ebc326fa56','Ai2 (OLMo)':'3c65c17b0d0d81e08697df661f83c3ac','Microsoft (Phi)':'3c65c17b0d0d8154ba44e521a4ed8749','Cohere':'3c65c17b0d0d8154ba44e521a4ed8749','Xiaomi (MiMo)':'3c65c17b0d0d8154ba44e521a4ed8749','StepFun':'3c65c17b0d0d8154ba44e521a4ed8749','Tencent (Hunyuan)':'3c65c17b0d0d8154ba44e521a4ed8749'};
  const labLink=l=>PAGE[l]?A('https://app.notion.com/p/'+PAGE[l],esc(l)):esc(l);
  ROWS.forEach((r,i)=>{r.i=i;r.ts=ts(r.d);r.sk=r.d.length===7?r.d+'-00':r.d;r.y=r.d.slice(0,4);r.lc=lic(r);
    r.q=(+r.y-2023)*4+Math.floor((+r.d.slice(5,7)-1)/3);
    r.sp=(r.t!=null&&r.a!=null)?r.t/r.a:null;r.moe=r.sp!=null&&r.sp>1.0001});
  const LABS=[...new Set(ROWS.map(r=>r.l))];
  const byDate=ROWS.slice().sort((a,b)=>a.sk<b.sk?-1:a.sk>b.sk?1:a.i-b.i);
  const fB=v=>v==null?'':v>=1000?(+(v/1000).toFixed(2))+'T':String(+v.toFixed(1))+'B';
  const qName=q=>(2023+Math.floor(q/4))+' Q'+(q%4+1);
  const szTxt=r=>r.t==null?(r.o?'n/a':'not disclosed'):esc(r.sz)+(r.da?' (active derived)':'');
  const KT=['flagship','reasoning','moe','dense','multimodal','small','hybrid-attention','encoder-decoder'];
  const KN={'moe':'MoE','hybrid-attention':'hybrid attention'},kn=k=>KN[k]||k;
  function detail(r){return '<b>'+esc(r.m)+'</b>, '+labLink(r.l)+', '+(r.d.length===7?r.d+' (month only)':r.d)+
    '<p style="margin:3px 0">'+(r.o?'<span class="w-o">Open weights</span>'+(r.lic?' ('+esc(r.lic)+')':''):'<span class="w-c">Closed weights</span>')+'. Size: '+szTxt(r)+(r.moe?' (sparsity '+r.sp.toFixed(1)+')':'')+'. Tags: '+(r.k.map(kn).join(', ')||'none')+'.</p><p style="margin:3px 0">'+esc(r.n)+'. '+A(r.u,'Source')+
    (r.dn?'<br><span class="small mute">Date note: '+esc(r.dn)+'</span>':'')+(r.fix?'<br><span class="small" style="color:var(--bad)">'+esc(r.fix)+' '+A(r.fu,'Source')+'</span>':'')+'</p>'}

  // ---- the filters: one state for every view ----
  const f={q:'',lab:'',year:'',w:'',k:new Set()};
  function match(r){const q=f.q.toLowerCase();
    if(q&&![r.m,r.l,r.n,r.lic||'',r.o?'open':'closed',r.sz,r.d,r.k.map(kn).join(' ')].join(' | ').toLowerCase().includes(q))return false;
    if(f.lab&&r.l!==f.lab)return false;if(f.year&&r.y!==f.year)return false;
    if(f.w==='o'&&!r.o)return false;if(f.w==='c'&&r.o)return false;
    if(['perm','cond','own','nc'].includes(f.w)&&r.lc!==f.w)return false;
    for(const k of f.k)if(!r.k.includes(k))return false;return true}
  const active=()=>!!(f.q||f.lab||f.year||f.w||f.k.size);
  function fText(){const p=[];if(f.q)p.push('"'+esc(f.q)+'"');if(f.lab)p.push(esc(f.lab));if(f.year)p.push(f.year);
    if(f.w)p.push({o:'open weights',c:'closed',perm:'Apache 2.0 or MIT',cond:'open with conditions',own:"lab's own licence",nc:'non-commercial'}[f.w]);
    f.k.forEach(k=>p.push(kn(k)));return p.join(', ')}
  const views=[];
  function sync(){$('rhQ').value=f.q;$('rhLab').value=f.lab;$('rhYear').value=f.year;$('rhW').value=f.w;
    $('rhK').querySelectorAll('button').forEach(b=>{const on=f.k.has(b.dataset.k);b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)});
    const n=ROWS.filter(match).length,no=ROWS.filter(r=>match(r)&&r.o).length;
    $('rhCount').textContent=n+' of '+ROWS.length+' rows match ('+no+' open, '+(n-no)+' closed)'+(active()?': '+fText().replace(/&quot;/g,'"'):'');
    $('rhFsum').textContent=active()?n+' of '+ROWS.length+' rows':'none';$('rhFres').hidden=!active()}
  function changed(){sync();views.forEach(v=>{try{v()}catch(e){window.__jsErr&&window.__jsErr('release history: '+e.message)}})}
  function setF(p){if('q' in p)f.q=p.q||'';if('lab' in p)f.lab=p.lab||'';if('year' in p)f.year=p.year||'';if('w' in p)f.w=p.w||'';if('k' in p)f.k=new Set(p.k||[]);changed()}
  $('rhLab').innerHTML+=LABS.slice().sort().map(l=>'<option>'+esc(l)+'</option>').join('');
  $('rhK').innerHTML=KT.map(k=>'<button data-k="'+k+'" aria-pressed="false">'+kn(k)+' ('+ROWS.filter(r=>r.k.includes(k)).length+')</button>').join('');
  let tq;$('rhQ').addEventListener('input',e=>{clearTimeout(tq);tq=setTimeout(()=>{f.q=e.target.value.trim();changed()},150)});
  $('rhLab').addEventListener('change',e=>{f.lab=e.target.value;changed()});
  $('rhYear').addEventListener('change',e=>{f.year=e.target.value;changed()});
  $('rhW').addEventListener('change',e=>{f.w=e.target.value;changed()});
  $('rhK').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.k;f.k.has(k)?f.k.delete(k):f.k.add(k);changed()}));
  const reset=()=>setF({q:'',lab:'',year:'',w:'',k:[]});
  $('rhReset').addEventListener('click',reset);$('rhFres').addEventListener('click',reset);
  const go=id=>{const t=$(id);t&&t.scrollIntoView({block:'start'})};

  // headline counts (all rows)
  const n=g=>ROWS.filter(g).length,moe=ROWS.filter(r=>r.moe);
  $('rhStats').innerHTML=stat('Rows',ROWS.length,'one per release')+stat('Labs',LABS.length,'from Ai2 to Zhipu')+
    stat('Open weights',n(r=>r.o),n(r=>!r.o)+' closed')+stat('Closed with no published size',n(r=>!r.o&&r.t==null),'of '+n(r=>!r.o)+' closed rows')+
    stat('MoE rows with both sizes',moe.length,'sparsity from '+Math.min(...moe.map(r=>r.sp)).toFixed(1)+' to '+Math.max(...moe.map(r=>r.sp)).toFixed(1));

  // the tab opens: every view draws once its container has a width
  const opened=[];
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-time']=[()=>opened.forEach(g=>{try{g()}catch(e){window.__jsErr&&window.__jsErr('release history: '+e.message)}})];
  Object.assign(RH,{byDate,esc,A,stat,fmt,med,ts,LIC,LICC,PAGE,labLink,LABS,fB,qName,szTxt,KT,kn,detail,f,match,active,fText,setF,go,
    onFilter:g=>views.push(g),onOpen:g=>opened.push(g),shown:()=>{const t=$('t-time');return !!(t&&!t.hidden)}});
  sync();
})();
