// ---- Shared release helpers (used by every tab) ----
const RH=(function(){
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  // month-only rows: sort to the 1st of their month, drawn at the 15th
  const ts=d=>{const p=d.split('-').map(Number);return Date.UTC(p[0],p[1]-1,p[2]||15)};
  const sortKey=d=>d.length===7?d+'-00':d;
  const LIC={perm:'Apache 2.0 or MIT',cond:'With conditions',own:"Lab's own licence",nc:'Non-commercial',closed:'Closed'};
  const LICC={perm:'var(--open)',cond:'var(--c6)',own:'var(--c5)',nc:'var(--bad)',closed:'var(--closed)'};
  function lic(r){if(!r.o)return 'closed';const l=r.lic||'';
    if(/^(Apache 2\.0|MIT)/.test(l)&&!/Modified/.test(l))return 'perm';
    if(/Modified MIT|MIT-style/.test(l))return 'cond';
    if(/Non-commercial|CC-BY-NC|Research License/.test(l))return 'nc';return 'own'}
  const PAGE={'OpenAI':'3c65c17b0d0d814abf90d5b9e567d72f','Anthropic':'3c65c17b0d0d814cb979d0eabca59a45','Google DeepMind':'3c65c17b0d0d8173a0aafcb27cf7a5f3','xAI/SpaceXAI':'3c65c17b0d0d81f2ac36c873a854007f','Meta':'3c65c17b0d0d81949ad8e17bcb3567f1','DeepSeek':'3c65c17b0d0d81a2ae7ec6796947a235','Alibaba (Qwen)':'3c65c17b0d0d81fd8c36ce06672bb235','Moonshot (Kimi)':'3c65c17b0d0d81f5abf5dbdbac821a12','Zhipu (GLM)':'3c65c17b0d0d81a88a84c2ca84b4daf4','MiniMax':'3c65c17b0d0d813ba1c0cb4ba00659b8','Mistral':'3c65c17b0d0d814a9882e6ebc326fa56','Ai2 (OLMo)':'3c65c17b0d0d81e08697df661f83c3ac'};
  const labLink=l=>PAGE[l]?A('https://app.notion.com/p/'+PAGE[l],esc(l)):esc(l);
  ROWS.forEach((r,i)=>{r.i=i;r.ts=ts(r.d);r.sk=sortKey(r.d);r.y=r.d.slice(0,4);r.lc=lic(r);
    r.q=(+r.y-2023)*4+Math.floor((+r.d.slice(5,7)-1)/3);
    r.sp=(r.t!=null&&r.a!=null)?r.t/r.a:null;r.moe=r.sp!=null&&r.sp>1.0001});
  const LABS=[...new Set(ROWS.map(r=>r.l))];
  const fB=v=>v==null?'':v>=1000?(+(v/1000).toFixed(2))+'T':String(+v.toFixed(1))+'B';
  const qName=q=>(2023+Math.floor(q/4))+' Q'+(q%4+1);
  const wTxt=r=>r.o?'open'+(r.lic?' ('+esc(r.lic)+')':''):'closed';
  const szTxt=r=>r.t==null?(r.o?'n/a':'not disclosed'):esc(r.sz)+(r.da?' (active derived)':'');
  function detail(r){return '<b>'+esc(r.m)+'</b>, '+labLink(r.l)+', '+(r.d.length===7?r.d+' (month only)':r.d)+
    '<p style="margin:3px 0">'+(r.o?'<span class="w-o">Open weights</span>'+(r.lic?' ('+esc(r.lic)+')':''):'<span class="w-c">Closed weights</span>')+'. Size: '+szTxt(r)+(r.moe?' (sparsity '+r.sp.toFixed(1)+')':'')+'. Tags: '+(r.k.join(', ')||'none')+'.</p><p style="margin:3px 0">'+esc(r.n)+'. '+A(r.u,'Source')+(r.fix?'<br><span class="small" style="color:var(--bad)">'+esc(r.fix)+' '+A(r.fu,'Source')+'</span>':'')+'</p>'}
  // lets other tabs set the table's filters and jump to it
  function goTable(f){window.__tbSet&&window.__tbSet(f);const b=document.querySelector('button[data-t=t-read]');b&&b.click();const t=document.getElementById('s-tab');t&&t.scrollIntoView({block:'start'})}
  return {esc,ts,LIC,LICC,LABS,PAGE,labLink,fB,qName,wTxt,szTxt,detail,goTable};
})();

// ---- Reading: headline counts, the size bar, licence mix, corrections ----
(function(){
  const R=ROWS,n=f=>R.filter(f).length;
  $('rdStats').innerHTML=stat('Rows',R.length,'one per release')+stat('Labs',RH.LABS.length,'from Ai2 to Zhipu')+
    stat('Open weights',n(r=>r.o),n(r=>!r.o)+' closed')+stat('Closed with no published size',n(r=>!r.o&&r.t==null),'of '+n(r=>!r.o)+' closed rows')+
    stat('MoE rows with both sizes',n(r=>r.moe),'sparsity from '+Math.min(...R.filter(r=>r.moe).map(r=>r.sp)).toFixed(1)+' to '+Math.max(...R.filter(r=>r.moe).map(r=>r.sp)).toFixed(1));
  // size bar picker
  const moe=R.filter(r=>r.moe).sort((a,b)=>a.sk<b.sk?-1:1),sel=$('szPick');
  sel.innerHTML=moe.map(r=>'<option value="'+r.i+'"'+(r.m==='DeepSeek-V3'?' selected':'')+'>'+RH.esc(r.m)+' ('+r.d.slice(0,7)+')</option>').join('');
  function bars(){const r=R[+sel.value];const mx=r.t;
    const row=(k,v,c,t)=>'<div class="sizebar"><span>'+k+'</span><div class="track"><div class="fill" style="width:'+Math.max(0.6,100*v/mx)+'%;background:'+c+'"></div></div><span>'+t+'</span></div>';
    $('szBars').innerHTML=row('Total',r.t,'var(--c1)',RH.fB(r.t)+' in memory')+row('Active',r.a,'var(--c2)',RH.fB(r.a)+' per token');
    $('szNote').innerHTML='Sparsity = '+fmt(r.t,r.t%1?1:0)+' ÷ '+r.a+' = <b>'+r.sp.toFixed(1)+'</b>: each token touches '+(100/r.sp).toFixed(1)+'% of the weights. '+RH.esc(r.n)+'. '+A(r.u,'Source')+(r.da?' Active size derived (25% of 314B).':'')}
  sel.addEventListener('change',bars);bars();
  // licence mix by year
  const K=['perm','cond','own','nc','closed'],Y=['2023','2024','2025','2026'];
  function lic(){let s='';const mx=Math.max(...Y.map(y=>n(r=>r.y===y)));
    Y.forEach(y=>{const tot=n(r=>r.y===y),op=n(r=>r.y===y&&r.o),pm=n(r=>r.y===y&&r.lc==='perm');
      s+='<div class="sizebar" style="grid-template-columns:3.2em minmax(0,1fr) 9em"><span>'+y+'</span><div style="display:flex;height:20px;width:'+(100*tot/mx)+'%;border-radius:3px;overflow:hidden">';
      K.forEach(k=>{const c=n(r=>r.y===y&&r.lc===k);if(c)s+='<span role="button" tabindex="0" data-y="'+y+'" data-k="'+k+'" title="'+RH.LIC[k]+', '+y+': '+c+'" style="cursor:pointer;flex:'+c+' 0 0;background:'+RH.LICC[k]+';color:var(--bg);font-size:11.5px;display:flex;align-items:center;justify-content:center;opacity:'+(k==='closed'?0.55:0.9)+'">'+c+'</span>'});
      s+='</div><span class="small">'+pm+' of '+op+' open permissive</span></div>'});
    $('licBars').innerHTML=s;$('licLeg').innerHTML=K.map(k=>'<span><i style="background:'+RH.LICC[k]+';height:10px;width:10px"></i>'+RH.LIC[k]+'</span>').join('');
    $('licBars').querySelectorAll('[data-k]').forEach(e=>{const go=()=>RH.goTable({year:e.dataset.y,w:e.dataset.k==='closed'?'c':e.dataset.k});e.addEventListener('click',go);e.addEventListener('keydown',ev=>{if(ev.key==='Enter')go()})})}
  lic();
  $('fixList').innerHTML=R.filter(r=>r.fix).map(r=>'<li><b>'+RH.esc(r.m)+'</b>: '+RH.esc(r.fix)+' '+A(r.fu,'Source')+'</li>').join('');
})();
