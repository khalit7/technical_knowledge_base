// ---- Reading: the quant ladder drawn inline (speed against size in section 1, quality against size and every file in section 5). Data: LO.q (scripts/collect_q.py, gen_data.py) ----
(function(){
  if(!document.getElementById('lo-ql-svg')||!window.LO||!LO.q)return;
  const Q=LO.q,$=id=>document.getElementById(id);
  let xmode='bpw',metric='kld',filt='all',smode='tg',tfilt='m17',sortK='bpw',sortD=1,sel=null;
  const fam=[{k:'m17',name:'Qwen3-1.7B GGUF',c:'var(--c1)',sh:'c'},{k:'m4',name:'Qwen3-4B GGUF',c:'var(--c2)',sh:'s'},{k:'mlx',name:'Qwen3-1.7B MLX',c:'var(--c3)',sh:'t'}];
  const W=el=>{const w=el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-50))};
  const T=(x,y,s,o)=>{o=o||{};return '<text x="'+x+'" y="'+y+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' font-size="'+(o.fs||11)+'"'+(o.fill?' fill="'+o.fill+'"':'')+'>'+s+'</text>'};
  const f2=(v,d)=>v==null?'&ndash;':Number(v).toFixed(d);
  const kfmt=v=>v==null?'&ndash;':v>=0.1?v.toFixed(3):v>=0.01?v.toFixed(4):v.toFixed(5);
  function pts(){let out=[];fam.forEach(F=>{const D=Q[F.k];if(!D)return;
    if(filt==='m17'&&F.k!=='m17')return;if(filt==='m4'&&F.k!=='m4')return;if(filt==='mlx'&&F.k==='m4')return;if(filt==='all'&&F.k==='mlx')return;
    D.items.forEach(it=>out.push(Object.assign({fam:F},it)))});return out}
  function yv(p){return metric==='kld'?p.kld:metric==='ppl'?p.ppl:metric==='top'?p.top:p.kld_p99}
  function mark(p,x,y,r,hl){x=+x;y=+y;const c=p.fam.c,fill=p.imat||p.fam.k==='mlx'?c:'var(--bg)',st=' stroke="'+c+'" stroke-width="'+(hl?3:1.8)+'" fill="'+fill+'" data-id="'+p.fam.k+'|'+p.id+'" style="cursor:pointer"';
    if(p.fam.sh==='s')return '<rect x="'+(x-r)+'" y="'+(y-r)+'" width="'+(2*r)+'" height="'+(2*r)+'"'+st+'/>';
    if(p.fam.sh==='t')return '<polygon points="'+x+','+(y-r-1)+' '+(x+r+1)+','+(y+r)+' '+(x-r-1)+','+(y+r)+'"'+st+'/>';
    return '<circle cx="'+x+'" cy="'+y+'" r="'+r+'"'+st+'/>'}
  function drawQ(){
    const el=$('lo-ql-svg'),w=Math.max(300,Math.min(860,W(el))),h=w<480?300:340,L=54,R=12,Tp=14,B=40;
    const P=pts().filter(p=>yv(p)!=null&&yv(p)>0);if(!P.length){el.innerHTML='';return}
    const log=metric==='kld'||metric==='p99';
    const xv=p=>xmode==='gb'?p.bytes/1e9:p.bpw;const xs=P.map(xv),ys=P.map(yv);
    const xl=xmode==='gb'?0:Math.max(0,Math.floor(Math.min(...xs))-0.5),xh=xmode==='gb'?Math.ceil(Math.max(...xs)*2)/2+0.25:Math.ceil(Math.max(...xs))+0.5;
    let yl=Math.min(...ys),yh=Math.max(...ys);
    if(log){yl=Math.pow(10,Math.floor(Math.log10(yl)));yh=Math.pow(10,Math.ceil(Math.log10(yh)))}
    else if(metric==='ppl'){const bl=[Q.m17&&Q.m17.base.ppl,Q.m4&&Q.m4.base.ppl].filter(Boolean);yl=Math.min(yl,...bl)*0.95;yh=Math.min(yh*1.05,Math.max(...bl)*4)}
    else{yl=Math.max(0,yl-3);yh=100}
    const X=v=>L+(w-L-R)*(v-xl)/(xh-xl),Y=v=>{const t=log?(Math.log10(v)-Math.log10(yl))/(Math.log10(yh)-Math.log10(yl)):(v-yl)/(yh-yl);return Tp+(h-Tp-B)*(1-Math.max(-0.02,Math.min(1.02,t)))};
    let b='';
    for(let v=Math.ceil(xl);v<=xh;v+=(xmode==='gb'&&xh<4?0.5:1)){b+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+Tp+'" y2="'+(h-B)+'" stroke="var(--line)"/>'+T(X(v),h-B+14,v,{a:'middle',fs:10,fill:'var(--mute)'})}
    if(log){for(let e=Math.log10(yl);e<=Math.log10(yh)+1e-9;e++){const v=Math.pow(10,e);b+='<line x1="'+L+'" x2="'+(w-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+T(L-4,Y(v)+4,v>=1?v:v.toExponential(0).replace('e','e'),{a:'end',fs:10,fill:'var(--mute)'})}}
    else{const raw=(yh-yl)/5,mag=Math.pow(10,Math.floor(Math.log10(raw))),st=[1,2,2.5,5,10].map(m=>m*mag).find(m=>m>=raw);for(let v=Math.ceil(yl/st)*st;v<=yh+1e-9;v+=st)b+='<line x1="'+L+'" x2="'+(w-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)" stroke-dasharray="2 3"/>'+T(L-4,Y(v)+4,+v.toFixed(2),{a:'end',fs:10,fill:'var(--mute)'})}
    if(metric==='ppl')[['m17','1.7B F16'],['m4','4B F16']].forEach(([k,lab])=>{if(!Q[k]||(filt!=='all'&&filt!==k&&!(filt==='mlx'&&k==='m17')))return;const v=Q[k].base.ppl,c=k==='m17'?'var(--c1)':'var(--c2)';b+='<line x1="'+L+'" x2="'+(w-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="'+c+'" stroke-dasharray="6 3"/>'+T(w-R-2,Y(v)-4,lab+' '+v.toFixed(2),{a:'end',fs:10,fill:c})});
    b+=T((L+w-R)/2,h-6,xmode==='gb'?'GB of weights':'bits per stored weight (tensor bytes &times; 8 / values stored)',{a:'middle',fs:10.5,fill:'var(--mute)'});
    b+=T(L,Tp-3,{kld:'mean KL divergence vs F16 (lower is better)',ppl:'perplexity on WikiText-2 (lower is better)',top:'% same top token as F16',p99:'99th-percentile KLD (the bad tokens)'}[metric],{fs:10.5,fill:'var(--mute)'});
    // lines per family (no-imatrix and imatrix separately)
    fam.forEach(F=>{[false,true].forEach(im=>{const s=P.filter(p=>p.fam===F&&!!p.imat===im&&!p.noline).sort((a,c)=>xv(a)-xv(c));if(s.length>1)b+='<polyline fill="none" stroke="'+F.c+'" stroke-opacity=".45" stroke-width="1.2"'+(im?'':' stroke-dasharray="3 3"')+' points="'+s.map(p=>X(xv(p)).toFixed(1)+','+Y(yv(p)).toFixed(1)).join(' ')+'"/>'})});
    const r=w<480?4:5;
    P.forEach(p=>{b+=mark(p,X(xv(p)).toFixed(1),Y(yv(p)).toFixed(1),r,sel===p.fam.k+'|'+p.id)});
    if(w>=480)P.filter(p=>p.lab&&yv(p)<=yh&&yv(p)>=yl).forEach(p=>{b+=T(X(xv(p))+7,Y(yv(p))-6,p.short||p.id,{fs:9.5,fill:'var(--mute)'})});
    el.innerHTML=RD.svg(w,h,b,'quality against size');
    $('lo-ql-leg').innerHTML=fam.filter(F=>Q[F.k]).map(F=>'<span><i class="'+(F.sh==='s'?'sq':F.sh==='t'?'tri':'')+'" style="background:'+F.c+'"></i>'+F.name+'</span>').join('')+'<span>filled = importance matrix (GGUF); hollow = none; dashed line = no imatrix</span>';
  }
  function detail(id){const [k,i]=id.split('|');const D=Q[k];if(!D)return;const p=D.items.find(x=>x.id===i);if(!p)return;sel=id;
    $('lo-ql-det').innerHTML='<b>'+D.name+' '+(p.label||p.id)+'</b>: '+f2(p.bpw,2)+' bits per weight, '+(p.bytes/1e9).toFixed(2)+' GB. Mean KLD '+kfmt(p.kld)+', 99th percentile '+kfmt(p.kld_p99)+', same top token '+f2(p.top,1)+'%, perplexity '+f2(p.ppl,2)+' (F16 '+f2(D.base.ppl,2)+'). Generation '+f2(p.tg,1)+' tok/s, prompt '+f2(p.pp,0)+' tok/s.'+(p.passes&&p.passes.length>1?' <span class="mute">Speed passes: '+p.passes.map(x=>f2(x.tg,1)+' tok/s at load '+f2(x.load,1)).join('; ')+'.</span>':'')+(p.note?' <span class="mute">'+p.note+'</span>':'');
    drawQ();drawT()}
  $('lo-ql-svg').addEventListener('click',e=>{const t=e.target.closest('[data-id]');if(t)detail(t.dataset.id)});
  $('lo-ql-svg').addEventListener('mouseover',e=>{const t=e.target.closest('[data-id]');if(t&&t.dataset.id!==sel)detail(t.dataset.id)});
  RD.seg($('lo-ql-m'),m=>{metric=m;drawQ()});RD.seg($('lo-ql-x'),m=>{xmode=m;drawQ()});RD.seg($('lo-ql-f'),m=>{filt=m;drawQ()});
  function drawS(){
    const el=$('lo-qs-svg'),w=Math.max(300,Math.min(860,W(el))),h=w<480?280:320,L=50,R=12,Tp=14,B=40;
    const P=[];fam.forEach(F=>{const D=Q[F.k];if(!D)return;[{id:'F16',label:'F16',bytes:D.base.bytes,tg:D.base.tg,pp:D.base.pp,imat:false,base:1}].concat(D.items).forEach(it=>{if(it[smode]!=null)P.push(Object.assign({fam:F},it))})});
    const xh=Math.max(...P.map(p=>p.bytes/1e9))*1.08,yh=Math.max(...P.map(p=>p[smode]))*1.12;
    const X=v=>L+(w-L-R)*v/xh,Y=v=>Tp+(h-Tp-B)*(1-v/yh);
    let b='';
    for(let v=0;v<=xh;v+=xh>6?2:1)b+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+Tp+'" y2="'+(h-B)+'" stroke="var(--line)"/>'+T(X(v),h-B+14,v,{a:'middle',fs:10,fill:'var(--mute)'});
    {const raw=yh/5,mag=Math.pow(10,Math.floor(Math.log10(raw))),st=[1,2,2.5,5,10].map(m=>m*mag).find(m=>m>=raw);for(let v=0;v<=yh;v+=st)b+='<line x1="'+L+'" x2="'+(w-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)" stroke-dasharray="2 3"/>'+T(L-4,Y(v)+4,Math.round(v),{a:'end',fs:10,fill:'var(--mute)'})}
    if(smode==='tg'&&LO.fit){[[LO.fit.spec_gbs,'var(--mute)','2 3',1],[LO.fit.best_gbs,'var(--c5)','6 3',1.6]].forEach(([bw,c,da,sw])=>{let pl=[];for(let i=1;i<=80;i++){const gb=xh*i/80,ts=bw/gb;if(ts<=yh)pl.push(X(gb).toFixed(1)+','+Y(ts).toFixed(1))}
      b+='<polyline fill="none" stroke="'+c+'" stroke-width="'+sw+'" stroke-dasharray="'+da+'" points="'+pl.join(' ')+'"/>'})}
    const r=w<480?3.5:4.5;
    P.forEach(p=>{b+=mark(p,X(p.bytes/1e9).toFixed(1),Y(p[smode]).toFixed(1),r,false)});
    b+=T((L+w-R)/2,h-6,'GB of weights in the file (read once per generated token)',{a:'middle',fs:10.5,fill:'var(--mute)'});
    b+=T(L,Tp-3,smode==='tg'?'tokens per second, generating (batch 1)':'tokens per second, reading a 512-token prompt',{fs:10.5,fill:'var(--mute)'});
    el.innerHTML=RD.svg(w,h,b,'speed against size');
    $('lo-qs-note').innerHTML=smode==='tg'?(LO.fit?'Circles: Qwen3-1.7B GGUF; squares: Qwen3-4B GGUF; triangles: Qwen3-1.7B MLX (filled GGUF = importance matrix). Dotted grey: the ceiling, Apple\'s 200 GB/s divided by the GB read per token. Dashed gold: the best rate any file reached here ('+Math.round(LO.fit.best_gbs)+' GB/s, '+LO.fit.best_id+'). Points below the gold line are files whose generation is limited by something other than reading memory: on this GPU, the arithmetic of unpacking K-quant and i-quant blocks.':''):'Prompt reading is compute-bound: 512 tokens share each read of the weights, so size matters much less, and types that are slow to dequantize lose more here than in generation.';
  }
  RD.seg($('lo-qs-m'),m=>{smode=m;drawS()});
  const cols=[['label','Type',0],['imat','imatrix',0],['bpw','bits/w',1],['gb','GB',1],['kld','mean KLD',1],['kld_p99','KLD p99',1],['top','same top %',1],['ppl','PPL',1],['tg','gen tok/s',1],['pp','prompt tok/s',1],['la','load avg',1]];
  function drawT(){
    const D=Q[tfilt];const t=$('lo-qt');if(!D){t.innerHTML='<tr><td>not measured</td></tr>';return}
    const rows=D.items.map(p=>Object.assign({},p,{gb:p.bytes/1e9,la:p.load}));
    rows.sort((a,c)=>{const x=a[sortK],y=c[sortK];return ((x==null)-(y==null))||(typeof x==='string'?String(x).localeCompare(y):(x-y))*sortD});
    let h='<thead><tr>'+cols.map(c=>'<th class="s'+(c[2]?' num':'')+'" data-k="'+c[0]+'">'+c[1]+'</th>').join('')+'</tr></thead><tbody>';
    h+='<tr><td>F16 (reference)</td><td></td><td class="num">16</td><td class="num">'+(D.base.bytes/1e9).toFixed(2)+'</td><td class="num">0</td><td class="num">0</td><td class="num">100</td><td class="num">'+f2(D.base.ppl,2)+'</td><td class="num">'+(D.base.tg!=null?f2(D.base.tg,1):'&ndash;')+'</td><td class="num">'+(D.base.pp!=null?f2(D.base.pp,0):'&ndash;')+'</td><td class="num">'+(D.base.load!=null?f2(D.base.load,1):'')+'</td></tr>';
    rows.forEach(p=>{h+='<tr'+(sel===tfilt+'|'+p.id?' class="sel"':'')+'><td>'+(p.label||p.id)+'</td><td>'+(p.imat?'i':'')+'</td><td class="num">'+f2(p.bpw,2)+'</td><td class="num">'+p.gb.toFixed(2)+'</td><td class="num">'+kfmt(p.kld)+'</td><td class="num">'+kfmt(p.kld_p99)+'</td><td class="num">'+f2(p.top,1)+'</td><td class="num">'+f2(p.ppl,2)+'</td><td class="num">'+(p.tg!=null?f2(p.tg,1)+(p.tg_sd!=null?' &plusmn;'+f2(p.tg_sd,1):''):'&ndash;')+'</td><td class="num">'+(p.pp!=null?f2(p.pp,0):'&ndash;')+'</td><td class="num">'+(p.la!=null?f2(p.la,1):'')+'</td></tr>'});
    t.innerHTML=h+'</tbody>';
    t.querySelectorAll('th.s').forEach(th=>th.addEventListener('click',()=>{const k=th.dataset.k;sortD=sortK===k?-sortD:1;sortK=k;drawT()}));
  }
  RD.seg($('lo-qt-f'),m=>{tfilt=m;drawT()});
  function all(){drawQ();drawS();drawT()}
  all();RD.onRender(all);RD.onResize(()=>{drawQ();drawS()});
})();
