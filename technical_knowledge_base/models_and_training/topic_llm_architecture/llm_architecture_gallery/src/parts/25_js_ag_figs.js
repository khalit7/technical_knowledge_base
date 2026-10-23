// ---- Reading tab figures (2026-10-23 rebuild): hero matrix, census by year, corrections, KV spread, windows,
// hybrid ratios, expert sparsity, stack shape. Every number is derived from window.AGD (src/out/gallery.json and
// census.json, written by src/gen_data.py) or quoted with its source in the caption; src/checks/check_data.py checks
// the static captions against the same data.
(function(){
  const G=window.AG;if(!G||!document.getElementById('t-read'))return;
  const {rows,by,$,fmt,fmtB,esc}=G,C=G.D.census,KiB=1024;
  const T=(x,y,s,o)=>{o=o||{};return '<text x="'+(+x).toFixed(1)+'" y="'+(+y).toFixed(1)+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' font-size="'+(o.fs||11)+'" fill="'+(o.fill||'var(--ink)')+'"'+(o.w?' font-weight="'+o.w+'"':'')+(o.extra||'')+'>'+s+'</text>'};
  const svg=(w,h,b,l)=>'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+esc(l)+'">'+b+'</svg>';
  const lg=Math.log10;
  const att=r=>(r.mix||'').replace(/[LHF]/g,'').length;            // attention layers (any kind)
  const nLin=r=>((r.mix||'').match(/[LH]/g)||[]).length;
  const prefix=r=>r.E?(r.ffn.match(/^d*/)||[''])[0].length:0;
  const entry=r=>r.kvc?'compressed':r.dc&&r.mt!=='Motif'?'MLA '+r.dc+'+'+r.dr:r.Hkv===r.H?'MHA '+r.H:r.Hkv===1?'MQA':'GQA '+r.Hkv+' KV';
  function posTxt(r){const p=(r.pos||'').replace(/-/g,''),n=(p.match(/N/g)||[]).length;
    if(n)return 'NoPE '+n+'/'+p.length;if(/P/.test(p)&&!(r.dc&&r.mt!=='Motif'))return 'partial';if(r.dc&&r.mt!=='Motif')return 'RoPE key';if(/A/.test(p))return 'learned';return 'RoPE'}
  const draws=[];const add=f=>{draws.push(f)};
  function all(){draws.forEach(f=>{try{f()}catch(e){}})}
  G.onTab('t-read',all);let rt=0,lw=0;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{const r=$('t-read');if(!r||r.hidden)return;const w=r.clientWidth;if(Math.abs(w-lw)>30){lw=w;all()}},90)});

  // ---------- hero: model by design choice ----------
  add(function(){const el=$('ag-hero');if(!el)return;
    const N=['Llama 3.1 8B','DeepSeek V3','Gemma 3 27B','Llama 4 Maverick','Qwen3 235B-A22B','GPT-OSS 120B','Qwen3 Next 80B-A3B','DeepSeek V3.2','GLM-5 744B','Qwen3.5 397B','Nemotron 3 Super 120B-A12B','Gemma 4 31B','DeepSeek V4-Flash','Kimi K3'].filter(n=>by[n]);
    const w0=G.width(el),narrow=w0<620,SH={'Qwen3 235B-A22B':'Qwen3 235B','Qwen3 Next 80B-A3B':'Qwen3-Next 80B','Nemotron 3 Super 120B-A12B':'Nemotron 3 Super','GLM-5 744B':'GLM-5','GPT-OSS 120B':'gpt-oss-120b'};
    const cols=[
      {h:['Cache','entry'],c:'var(--c1)',v:r=>entry(r),on:r=>true,col:r=>r.kvc?'var(--c4)':r.dc&&r.mt!=='Motif'?'var(--c3)':'var(--c1)',foot:'MLA '+C['2026'].mla},
      {h:['Windowed','layers'],c:'var(--c6)',v:r=>{const s=(r.mix.match(/S/g)||[]).length;return s?s+'/'+att(r)+' · '+(r.W>=1024&&r.W%1024===0?r.W/1024+'K':fmt(r.W)):''},foot:String(C['2026'].win)},
      {h:['Linear','layers'],c:'var(--c5)',v:r=>{const l=nLin(r);return l?l+'/'+(l+att(r)):''},foot:String(C['2026'].hyb)},
      {h:['Sparse','indexer'],c:'var(--c4)',v:r=>/D/.test(r.mix)?'top-k':'',foot:String(C['2026'].sparse)},
      {h:['Experts','routed/k'],c:'var(--c2)',v:r=>r.E?r.E+'/'+r.k:'',foot:String(C['2026'].moe)},
      {h:['Shared','expert'],c:'var(--c2)',v:r=>r.E&&r.sh?String(r.sh):'',foot:String(C['2026'].shared),wide:1},
      {h:['Dense','first'],c:'var(--mute)',v:r=>prefix(r)?String(prefix(r)):'',foot:String(C['2026'].prefix),wide:1},
      {h:['Position','partial · NoPE'],c:'var(--ink)',v:r=>posTxt(r),on:r=>/NoPE|partial/.test(posTxt(r)),foot:C['2026'].prope+' · '+C['2026'].nope},
      {h:['KV/token','card'],c:'var(--acc)',v:r=>r.kv?fmtB(r.kv):r.galtxt||'',on:r=>false,foot:fmtB(C['2026'].kv_median),num:1},
      {h:['Held at','131K'],c:'var(--acc)',v:r=>r.kvw?fmtB(r.kvw):'',on:r=>false,foot:fmtB(C['2026'].kvw_median),num:1,wide:1}
    ].filter(c=>!narrow||!c.wide);
    const nw=narrow?118:136,cw=narrow?66:64,W=Math.max(w0,nw+cols.length*cw+34),rh=22,top=34,H=top+N.length*rh+38;
    const cwx=(W-nw-34)/cols.length;
    let s='';
    cols.forEach((c,j)=>{const x=nw+j*cwx+cwx/2;s+=T(x,13,c.h[0],{a:'middle',fs:11,w:600})+T(x,26,c.h[1],{a:'middle',fs:10.5,fill:'var(--mute)'})});
    let yr='';
    N.forEach((n,i)=>{const r=by[n],y=top+i*rh;const Y=r.dt.slice(0,4);
      if(Y!==yr){yr=Y;s+='<line x1="0" x2="'+W+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+T(W-2,y+15,Y,{a:'end',fs:10.5,fill:'var(--mute)'})}
      s+='<g class="ag-hrow" data-n="'+esc(n)+'" style="cursor:pointer">'+'<rect x="0" y="'+y+'" width="'+W+'" height="'+rh+'" fill="transparent"/>'+T(2,y+15,esc(SH[n]||n),{fs:narrow?11:12});
      cols.forEach((c,j)=>{const v=c.v(r),x=nw+j*cwx,on=v&&(c.on?c.on(r):true);
        if(on)s+='<rect x="'+(x+3).toFixed(1)+'" y="'+(y+3)+'" width="'+(cwx-6).toFixed(1)+'" height="'+(rh-6)+'" rx="4" fill="'+(c.col?c.col(r):c.c)+'" fill-opacity=".2" stroke="'+(c.col?c.col(r):c.c)+'" stroke-opacity=".7"/>';
        s+=T(x+cwx/2,y+15,v?esc(v):'·',{a:'middle',fs:narrow?10.5:11,fill:v?'var(--ink)':'var(--mute)'})});
      s+='</g>'});
    const yb=top+N.length*rh;
    s+='<line x1="0" x2="'+W+'" y1="'+yb+'" y2="'+yb+'" stroke="var(--ink)"/>'+T(2,yb+18,'2026, '+C['2026'].n+' models',{fs:11.5,w:600})+T(2,yb+31,'count; KV median',{fs:10.5,fill:'var(--mute)'});
    cols.forEach((c,j)=>{s+=T(nw+j*cwx+cwx/2,yb+18,c.foot,{a:'middle',fs:10.5,w:600,fill:'var(--acc)'})});
    el.innerHTML=svg(W,H,s,'Fourteen models by design choice, with the 2026 counts');
    if(!el.dataset.wired){el.dataset.wired=1;el.addEventListener('click',e=>{const g=e.target.closest('.ag-hrow');if(g&&window.AGDEC)window.AGDEC.open(g.dataset.n)})}
  });

  // ---------- census by release year ----------
  add(function(){const el=$('ag-cen');if(!el)return;
    const K=[['moe','Mixture of experts'],['win','Sliding windows'],['prope','Partial RoPE'],['hyb','Linear or SSM hybrid'],['mla','MLA latent'],['sparse','Trained sparse'],['nope','Layers with no position']];
    const Y=[['2024','2024 and earlier','var(--dim)'],['2025','2025','var(--c6)'],['2026','2026','var(--acc)']];
    const W=Math.max(300,Math.min(860,G.width(el))),narrow=W<520,lw=narrow?0:170,bw=W-lw-46,bh=8,gh=narrow?52:38;
    let s='',y=0;
    K.forEach(([k,l])=>{if(narrow){s+=T(0,y+11,l,{fs:11.5,w:600});y+=15}else s+=T(0,y+17,l,{fs:12});
      Y.forEach((yy,j)=>{const v=C[yy[0]][k]/C[yy[0]].n,x=Math.max(1,bw*v);s+='<rect x="'+lw+'" y="'+(y+j*(bh+2))+'" width="'+x.toFixed(1)+'" height="'+bh+'" rx="2" fill="'+yy[2]+'"/>'+T(lw+x+4,y+j*(bh+2)+7.5,Math.round(100*v)+'%'+(j===2?' ('+C[yy[0]][k]+')':''),{fs:10.5,fill:'var(--mute)'})});
      y+=narrow?gh-15:gh});
    el.innerHTML='<div class="ag-leg">'+Y.map(y=>'<span><i class="ag-sw" style="background:'+y[2]+'"></i>'+y[1]+' ('+C[y[0]].n+')</span>').join('')+'</div>'+svg(W,y,s,'Share of models with each design choice by release year');
  });

  // ---------- corrections: gallery figure against the config ----------
  add(function(){const el=$('ag-corr');if(!el)return;
    const D=rows.filter(r=>r.status==='differs');const W=Math.max(300,Math.min(860,G.width(el))),narrow=W<520,lw=narrow?0:190,pr=56,rh=narrow?40:26;
    const mx=Math.max(...D.map(r=>Math.max(r.kv,r.gal)))*1.05,X=v=>lw+(W-lw-pr)*v/mx;let s='';
    [0,64,128,192].forEach(v=>{const x=X(v*KiB);s+='<line x1="'+x+'" x2="'+x+'" y1="0" y2="'+(D.length*rh)+'" stroke="var(--line)"/>'+T(x,D.length*rh+13,v+' KiB',{a:'middle',fs:10.5,fill:'var(--mute)'})});
    D.forEach((r,i)=>{const y=i*rh+(narrow?26:13),a=X(r.gal),b=X(r.kv),cv=r.kind==='conv';
      s+=narrow?T(0,y-12,esc(r.n),{fs:11.5}):T(0,y+4,esc(r.n),{fs:12});
      s+='<line x1="'+a+'" x2="'+b+'" y1="'+y+'" y2="'+y+'" stroke="var(--mute)" stroke-width="1.5"/><circle cx="'+a+'" cy="'+y+'" r="5" fill="var(--bg)" stroke="var(--mute)" stroke-width="1.5"/><circle cx="'+b+'" cy="'+y+'" r="5" fill="'+(cv?'var(--c6)':'var(--bad)')+'"/>'+T(W-2,y+4,(r.kv>r.gal?'+':'')+Math.round(100*(r.kv/r.gal-1))+'%',{a:'end',fs:11,fill:cv?'var(--c6)':'var(--bad)',w:600})});
    el.innerHTML=svg(W,D.length*rh+18,s,'The six gallery figures that the configs do not reproduce');
  });

  // ---------- KV per token by release year (strip plot) ----------
  add(function(){const el=$('ag-spread');if(!el)return;
    const R=rows.filter(r=>r.kv&&!r.x&&r.status!=='tiny');const Y=[['2024','2024 and earlier'],['2025','2025'],['2026','2026']];
    const W=Math.max(300,Math.min(860,G.width(el))),narrow=W<520,lw=narrow?0:120,pr=12,rh=narrow?62:48,top=narrow?14:4,lo=4*KiB,hi=2*G.MiB;
    const X=v=>lw+(W-lw-pr)*(lg(v)-lg(lo))/(lg(hi)-lg(lo));let s='';
    [[4,'4 KiB'],[16,'16 KiB'],[64,'64 KiB'],[256,'256 KiB'],[1024,'1 MiB']].forEach(([v,l])=>{const x=X(v*KiB);s+='<line x1="'+x+'" x2="'+x+'" y1="0" y2="'+(top+3*rh)+'" stroke="var(--line)"/>'+T(x,top+3*rh+13,l,{a:x<20?'start':'middle',fs:10.5,fill:'var(--mute)'})});
    Y.forEach(([k,l],j)=>{const y0=top+j*rh,ys=R.filter(r=>(k==='2024'?r.dt<'2025':r.dt.slice(0,4)===k));
      s+=narrow?T(0,y0+2,l+' ('+ys.length+')',{fs:11,fill:'var(--mute)'}):T(0,y0+rh/2+4,l+' ('+ys.length+')',{fs:12});
      ys.forEach((r,i)=>{const jit=((i*37)%11-5)*(rh-22)/11;s+='<circle cx="'+X(r.kv).toFixed(1)+'" cy="'+(y0+rh/2+jit).toFixed(1)+'" r="4" fill="'+G.FAM[r.fam][1]+'" fill-opacity=".8" stroke="var(--bg)"><title>'+esc(r.n)+': '+fmtB(r.kv)+' per token</title></circle>'});
      const m=C[k].kv_median,xm=X(m);s+='<line x1="'+xm+'" x2="'+xm+'" y1="'+(y0+6)+'" y2="'+(y0+rh-6)+'" stroke="var(--ink)" stroke-width="2"/>'+T(xm+4,y0+(narrow?rh-4:12),'median '+fmtB(m),{fs:10.5,w:600})});
    el.innerHTML=svg(W,top+3*rh+18,s,'KV cache per token of every model with a config, by release year')+'<div class="ag-leg">'+Object.keys(G.FAM).map(k=>'<span><i class="ag-sw" style="background:'+G.FAM[k][1]+';border-radius:50%"></i>'+G.FAM[k][0]+'</span>').join('')+'</div>';
  });

  // ---------- windows: the card against the cache held at 131,072 tokens ----------
  add(function(){const el=$('ag-w7b');if(!el)return;
    const Wd=rows.filter(r=>r.mix&&/S/.test(r.mix)&&r.kv&&r.kvw&&!r.x).sort((a,b)=>b.kv/b.kvw-a.kv/a.kvw);
    const W=Math.max(300,Math.min(860,G.width(el))),narrow=W<520,lw=narrow?112:200,pr=42,rh=15,lo=2*KiB,hi=1024*KiB;
    const X=v=>lw+(W-lw-pr)*(lg(v)-lg(lo))/(lg(hi)-lg(lo));let s='';const H=Wd.length*rh+20;
    [[4,'4 KiB'],[16,'16'],[64,'64'],[256,'256'],[1024,'1 MiB']].forEach(([v,l])=>{const x=X(v*KiB);s+='<line x1="'+x+'" x2="'+x+'" y1="0" y2="'+(H-18)+'" stroke="var(--line)"/>'+T(x,H-5,l,{a:'middle',fs:10.5,fill:'var(--mute)'})});
    Wd.forEach((r,i)=>{const y=i*rh+8,a=X(r.kv),b=X(r.kvw);const nm=narrow&&r.n.length>17?r.n.slice(0,16)+'…':r.n;
      s+=T(0,y+4,esc(nm),{fs:11})+'<line x1="'+b+'" x2="'+a+'" y1="'+y+'" y2="'+y+'" stroke="var(--acc)" stroke-opacity=".45" stroke-width="3"/><circle cx="'+a+'" cy="'+y+'" r="3.5" fill="var(--bg)" stroke="var(--acc)" stroke-width="1.5"><title>'+esc(r.n)+': '+fmtB(r.kv)+' per token on the card</title></circle><circle cx="'+b+'" cy="'+y+'" r="3.5" fill="var(--acc)"><title>'+esc(r.n)+': '+fmtB(r.kvw)+' per token held at 131,072 tokens</title></circle>'+T(W-2,y+4,(r.kv/r.kvw).toFixed(1)+'×',{a:'end',fs:11,fill:'var(--mute)'})});
    el.innerHTML=svg(W,H,s,'Windowed models: KV per token on the card against the cache held at 131,072 tokens');
  });

  // ---------- hybrids: the published ratio ablation and the ratios released ----------
  add(function(){const el=$('ag-ratio');if(!el)return;
    const Hy=rows.filter(r=>r.mix&&/[LH]/.test(r.mix)&&!r.x&&att(r)>0);
    const W=Math.max(300,Math.min(860,G.width(el))),narrow=W<520,pl=narrow?44:56,pr=14,p1=134,gap=40;
    const X=q=>pl+(W-pl-pr)*Math.log2(1+q)/Math.log2(16);
    const A=[[0,5.77],[1,5.66],[3,5.65],[7,5.70],[15,5.82]],ylo=5.62,yhi=5.85,Y=v=>26+(p1-44)*(1-(v-ylo)/(yhi-ylo));
    let s=T(pl,0+10,narrow?'Kimi Linear ablation, perplexity':'Kimi Linear ablation: validation perplexity (vendor, arXiv 2510.26692 Table 1)',{fs:11,fill:'var(--mute)'});
    [5.65,5.75,5.85].forEach(v=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+T(pl-4,Y(v)+4,v.toFixed(2),{a:'end',fs:10.5,fill:'var(--mute)'})});
    s+='<polyline fill="none" stroke="var(--c5)" stroke-width="2" points="'+A.map(([q,v])=>X(q).toFixed(1)+','+Y(v).toFixed(1)).join(' ')+'"/>';
    A.forEach(([q,v])=>{s+='<circle cx="'+X(q)+'" cy="'+Y(v)+'" r="4" fill="var(--c5)"/>'+T(X(q),Y(v)-7,v.toFixed(2),{a:'middle',fs:10.5,w:q===3?600:400})});
    const bins={};Hy.forEach(r=>{const q=nLin(r)/att(r),k=Math.round(Math.log2(1+q)*8)/8;(bins[k]=bins[k]||[]).push(r)});
    const p2=Math.max(...Object.values(bins).map(b=>b.length))*9+14,y0=p1+gap;s+=T(pl,y0-8,narrow?'Released hybrids ('+Hy.length+'), derived':'Released hybrids in the gallery at each ratio ('+Hy.length+' models, derived from configs)',{fs:11,fill:'var(--mute)'});
    Object.keys(bins).forEach(k=>{bins[k].forEach((r,i)=>{const q=nLin(r)/att(r);s+='<circle cx="'+X(q).toFixed(1)+'" cy="'+(y0+p2-10-i*9).toFixed(1)+'" r="4" fill="var(--c5)" fill-opacity=".85" stroke="var(--bg)"><title>'+esc(r.n)+': '+nLin(r)+' linear to '+att(r)+' attention layers</title></circle>'})});
    const yb=y0+p2;s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+yb+'" y2="'+yb+'" stroke="var(--mute)"/>';
    [0,1,3,7,15].forEach(q=>{s+='<line x1="'+X(q)+'" x2="'+X(q)+'" y1="'+(p1-18)+'" y2="'+yb+'" stroke="var(--line)" stroke-dasharray="2 3"/>'+T(X(q),yb+14,q+':1',{a:'middle',fs:11})});
    s+=T((pl+W-pr)/2,yb+30,'linear (or SSM) layers per attention layer',{a:'middle',fs:11,fill:'var(--mute)'});
    el.innerHTML=svg(W,yb+36,s,'Linear to attention ratio: the published ablation and the released models');
  });

  // ---------- experts: active share against total parameters ----------
  add(function(){const el=$('ag-moe');if(!el)return;
    const M=rows.filter(r=>r.E&&r.tot&&r.act&&!r.x&&r.dt>='2025');
    const W=Math.max(300,Math.min(860,G.width(el))),narrow=W<520,pl=narrow?40:48,pr=14,pt=10,H=narrow?250:280,pb=34,lo=5,hi=4000,ymax=22;
    const X=v=>pl+(W-pl-pr)*(lg(v)-lg(lo))/(lg(hi)-lg(lo)),Y=v=>pt+(H-pt-pb)*(1-v/ymax);let s='';
    [0,5,10,15,20].forEach(v=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+T(pl-4,Y(v)+4,v+'%',{a:'end',fs:10.5,fill:'var(--mute)'})});
    [[10,'10B'],[30,'30B'],[100,'100B'],[300,'300B'],[1000,'1T'],[3000,'3T']].forEach(([v,l])=>{s+=T(X(v),H-pb+15,l,{a:'middle',fs:10.5,fill:'var(--mute)'})});
    s+=T((pl+W-pr)/2,H-4,'total parameters (gallery line, log scale)',{a:'middle',fs:11,fill:'var(--mute)'});
    const lab={'Kimi K3':[-7,-7,'end'],'DeepSeek V4-Pro':[6,15,'end'],'GPT-OSS 120B':[0,-8,'middle'],'JetBrains Mellum2 Thinking 12B-A2.5B':[7,4,'start'],'Nemotron 3 Ultra 550B-A55B':[-7,-7,'end']},SN={'JetBrains Mellum2 Thinking 12B-A2.5B':'Mellum2 Thinking','Nemotron 3 Ultra 550B-A55B':'Nemotron 3 Ultra','GPT-OSS 120B':'gpt-oss-120b'};
    M.forEach(r=>{const v=100*r.act/r.tot,c=r.dt>='2026'?'var(--acc)':'var(--c2)';s+='<circle cx="'+X(r.tot).toFixed(1)+'" cy="'+Y(v).toFixed(1)+'" r="4" fill="'+c+'" fill-opacity=".8" stroke="var(--bg)"><title>'+esc(r.n)+': '+r.act+'B of '+r.tot+'B active ('+v.toFixed(1)+'%)</title></circle>'});
    M.forEach(r=>{const o=lab[r.n];if(!o||(narrow&&r.n==='GPT-OSS 120B'))return;const v=100*r.act/r.tot;s+=T(X(r.tot)+o[0],Y(v)+o[1],esc(SN[r.n]||r.n)+' '+v.toFixed(1)+'%',{a:o[2],fs:10.5,w:600})});
    el.innerHTML=svg(W,H,s,'Active share of parameters against total parameters, MoE models of 2025 and 2026')+'<div class="ag-leg"><span><i class="ag-sw" style="background:var(--c2);border-radius:50%"></i>2025</span><span><i class="ag-sw" style="background:var(--acc);border-radius:50%"></i>2026</span></div>';
  });

  // ---------- stack shape: layers in the config against caches kept ----------
  add(function(){const el=$('ag-stack');if(!el)return;
    const S=[['Ouro-Thinking 2.6B','4 passes'],['Nanbeige 4.2 3B','2 passes'],['LongCat-Flash-Lite 68.5B-A3B','2 MLA sublayers per layer'],['Gemma 4 E4B','last 18 reuse a cache'],['Gemma 4 E2B','last 20 reuse a cache']].filter(x=>by[x[0]]);
    const cfgL=r=>(r.fields&&(r.fields.num_hidden_layers||r.fields.num_layers))||r.L,kept=r=>(r.L-(r.shared||0))*(r.passes||1);
    const W=Math.max(300,Math.min(860,G.width(el))),narrow=W<520,lw=narrow?0:200,pr=40,rh=narrow?44:30,mx=200,X=v=>(W-lw-pr)*v/mx;let s='';
    S.forEach(([n,why],i)=>{const r=by[n],y=i*rh+(narrow?16:4),a=cfgL(r),b=kept(r);
      s+=narrow?T(0,y-4,esc(n)+': '+why,{fs:11}):T(0,y+10,esc(n),{fs:12})+T(0,y+23,why,{fs:10.5,fill:'var(--mute)'});
      s+='<rect x="'+lw+'" y="'+y+'" width="'+X(a).toFixed(1)+'" height="9" rx="2" fill="var(--dim)"/>'+T(lw+X(a)+4,y+8.5,a+' layers in the config',{fs:10.5,fill:'var(--mute)'});
      const lb=b+' caches per token',ins=lw+X(b)+130>W;s+='<rect x="'+lw+'" y="'+(y+11)+'" width="'+X(b).toFixed(1)+'" height="9" rx="2" fill="var(--acc)"/>'+(ins?T(lw+X(b)-4,y+19,lb,{a:'end',fs:10.5,w:600,fill:'var(--bg)'}):T(lw+X(b)+4,y+19.5,lb,{fs:10.5,w:600}))});
    el.innerHTML=svg(W,S.length*rh+(narrow?16:4),s,'Layers in the config against caches kept per token');
  });
  all();
})();
