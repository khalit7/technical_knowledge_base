// ---- Run and serving planner tab (t-plan); uses the parent's calculator functions (window.CALCX), checked in check/check_page.mjs ----
window.PMP=(function(){
  const X=window.CALCX;
  function run(o){const m=X.M[o.model],ch=X.C[o.chip];
    const flTok=6*m.Pact+(o.seq?12*m.L*m.nh*m.dqk*o.seq:0),C=flTok*o.tokens,peak=ch.peak.bf16*1e12;
    const gpuh=C/(peak*o.mfu)/3600,wall=gpuh/o.good,gpus=wall/(o.days*24);
    return {flTok:flTok,C:C,gpuh:gpuh,wall:wall,gpus:gpus,cost:ch.price?wall*ch.price:null,price:ch.price,days1k:wall/1000/24};}
  function prec(m,ch,fmt){const f=fmt==='native'?m.fmt:fmt;return (f!=='bf16'&&ch.peak.fp8)?'fp8':'bf16'}
  function serve(o){const m=X.M[o.model],ch=X.C[o.chip],rows=[];
    for(let B=1;B<=1024;B*=2){const d=X.decode({model:o.model,chip:o.chip,chips:o.n,fmt:o.fmt,prec:prec(m,ch,o.fmt),kvb:o.kvb,batch:B,ctx:o.ctx,eff:o.eff});
      rows.push({B:B,t_ms:d.t_ms,user:d.tps_seq,total:d.tps,usd:o.price>0?o.price*o.n/(d.tps*3600)*1e6:null,need:d.mem_need,have:d.mem_have,fits:d.fits,bound:d.bound})}
    return rows;}
  return {run,serve,prec};
})();
(function(){
  const X=window.CALCX,Q=window.PMP,$=id=>document.getElementById(id);
  const models=['l8','l70','l405','q32','q235','dsv3','oss120'],tchips=['h100','b200','gb200','mi300x','v6e','v7'],schips=['h100','h200','b200','gb200','mi300x','rtx5090'];
  const opt=(ks,sel)=>ks.map(k=>'<option value="'+k+'"'+(k===sel?' selected':'')+'>'+X.esc((X.M[k]||X.C[k]).name)+'</option>').join('');
  $('pl-model').innerHTML=opt(models,'l8');$('pl-chip').innerHTML=opt(tchips,'h100');$('sv-model').innerHTML=opt(models,'l8');$('sv-chip').innerHTML=opt(schips,'h100');$('sv-n').value='1';
  function plan(){const o={model:$('pl-model').value,chip:$('pl-chip').value,tokens:Math.max(1,+$('pl-tok').value||1)*1e9,mfu:+$('pl-mfu').value,good:+$('pl-good').value,days:Math.max(1,+$('pl-days').value||1),seq:+$('pl-seq').value};
    $('pl-mfu-v').textContent=Math.round(o.mfu*100)+'%';$('pl-good-v').textContent=Math.round(o.good*100)+'%';
    const r=Q.run(o),m=X.M[o.model],ch=X.C[o.chip];
    $('pl-out').innerHTML=RD.stat('Training FLOPs',X.fE(r.C),X.sig(r.flTok/1e9,3)+' GFLOP per token'+(m.E?' (active '+X.sig(m.Pact/1e9,3)+'B)':''))+
      RD.stat('Chip-hours',X.sig(r.gpuh/1e3,3)+'K',X.sig(r.wall/1e3,3)+'K of wall-clock with goodput')+
      RD.stat('Chips to finish in '+o.days+' days',Math.ceil(r.gpus).toLocaleString('en-US'),'or '+X.sig(r.days1k,3)+' days on 1,000')+
      RD.stat('Cost at list price',r.cost!=null?X.fUSD(r.cost):'no price',r.cost!=null?'$'+r.price+' per chip-hour':'no on-demand price published for this chip');
    $('pl-note').textContent='Peak '+ch.peak.bf16.toLocaleString('en-US')+' TFLOP/s dense BF16 per '+ch.name+'. Memory is not checked here: the parent calculator\'s training section does it, and the Reading tab\'s sections 2 and 3 explain it.';
    const el=$('pl-curve'),W=RD.width(el),H=190,pl=56,pr=12,pt=10,pb=30,ds=[];for(let d=7;d<=365;d*=1.15)ds.push(d);
    const gs=ds.map(d=>r.wall/(d*24)),lo=Math.min(...gs)*0.8,hi=Math.max(...gs)*1.2;
    const lx=d=>pl+(W-pl-pr)*(Math.log(d)-Math.log(7))/(Math.log(365)-Math.log(7)),ly=g=>pt+(H-pt-pb)*(1-(Math.log(g)-Math.log(lo))/(Math.log(hi)-Math.log(lo)));
    let b='';[7,14,30,60,90,180,365].forEach(d=>{b+='<line x1="'+lx(d)+'" x2="'+lx(d)+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--line)"/>'+RD.t(lx(d),H-12,d+' d',{a:'middle',fs:10,fill:'var(--mute)'})});
    for(let e=Math.floor(Math.log10(lo));e<=Math.ceil(Math.log10(hi));e++)[1,3].forEach(k=>{const g=k*Math.pow(10,e);if(g<lo||g>hi)return;b+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+ly(g)+'" y2="'+ly(g)+'" stroke="var(--line)"/>'+RD.t(pl-4,ly(g)+4,g.toLocaleString('en-US'),{a:'end',fs:10,fill:'var(--mute)'})});
    b+='<polyline fill="none" stroke="var(--c1)" stroke-width="2" points="'+ds.map((d,i)=>lx(d)+','+ly(gs[i])).join(' ')+'"/>';
    if(o.days>=7&&o.days<=365)b+='<circle cx="'+lx(o.days)+'" cy="'+ly(r.gpus)+'" r="4.5" fill="var(--c2)"/>';
    el.innerHTML=RD.svg(W,H,b,'Chips needed against the deadline')+'<div class="small mute">Chips needed against the deadline (log scales); the dot is your deadline. The cost does not depend on the deadline: halving the time doubles the chips.</div>';}
  function serve(){const o={model:$('sv-model').value,chip:$('sv-chip').value,n:+$('sv-n').value,fmt:$('sv-fmt').value,kvb:+$('sv-kv').value,ctx:+$('sv-ctx').value,eff:+$('sv-eff').value,price:+$('sv-price').value||0};
    $('sv-eff-v').textContent=Math.round(o.eff*100)+'%';const rows=Q.serve(o);
    $('sv-table').innerHTML='<tr><th class="num">Batch</th><th class="num">Step</th><th class="num">Tokens/s per user</th><th class="num">Tokens/s total</th><th class="num">$ per M tokens</th><th class="num">Memory</th><th>Bound</th></tr>'+rows.map(r=>
      '<tr><td class="num">'+r.B+'</td><td class="num">'+X.sig(r.t_ms,3)+' ms</td><td class="num">'+X.sig(r.user,3)+'</td><td class="num">'+X.sig(r.total,3)+'</td><td class="num">'+(r.usd!=null?'$'+X.sig(r.usd,3):'n/a')+'</td><td class="num'+(r.fits?'':' oom')+'">'+X.sig(r.need,3)+' / '+X.sig(r.have,3)+' GB</td><td>'+(r.fits?r.bound:'<span class="ill">does not fit</span>')+'</td></tr>').join('');
    const el=$('sv-chart'),W=RD.width(el),H=230,pl=58,pr=14,pt=12,pb=34;
    const xs=rows.map(r=>r.user),ys=rows.map(r=>r.total),x0=Math.min(...xs)*0.7,x1=Math.max(...xs)*1.4,y0=Math.min(...ys)*0.7,y1=Math.max(...ys)*1.4;
    const lx=v=>pl+(W-pl-pr)*(Math.log(v)-Math.log(x0))/(Math.log(x1)-Math.log(x0)),ly=v=>pt+(H-pt-pb)*(1-(Math.log(v)-Math.log(y0))/(Math.log(y1)-Math.log(y0)));
    let b='';const ticks=(lo,hi,f)=>{for(let e=Math.floor(Math.log10(lo));e<=Math.ceil(Math.log10(hi));e++)[1,3].forEach(k=>{const v=k*Math.pow(10,e);if(v>=lo&&v<=hi)f(v)})};
    ticks(x0,x1,v=>{b+='<line x1="'+lx(v)+'" x2="'+lx(v)+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--line)"/>'+RD.t(lx(v),H-pb+13,X.sig(v,2),{a:'middle',fs:10,fill:'var(--mute)'})});
    ticks(y0,y1,v=>{b+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+ly(v)+'" y2="'+ly(v)+'" stroke="var(--line)"/>'+RD.t(pl-4,ly(v)+4,X.sig(v,2),{a:'end',fs:10,fill:'var(--mute)'})});
    b+='<polyline fill="none" stroke="var(--mute)" stroke-width="1" points="'+rows.map(r=>lx(r.user)+','+ly(r.total)).join(' ')+'"/>';
    rows.forEach(r=>{const c=r.bound==='memory'?'var(--c1)':'var(--c2)';b+=r.fits?'<circle cx="'+lx(r.user)+'" cy="'+ly(r.total)+'" r="4" fill="'+c+'"/>':'<circle cx="'+lx(r.user)+'" cy="'+ly(r.total)+'" r="4" fill="var(--bg)" stroke="var(--bad)" stroke-width="1.5"/>';
      if(r.B===1||r.B===16||r.B===256||r.B===1024)b+=RD.t(lx(r.user)+6,ly(r.total)-6,'B='+r.B,{fs:10})});
    b+=RD.t((pl+W-pr)/2,H-4,'tokens per second per user',{a:'middle',fs:10.5,fill:'var(--mute)'});
    b+='<text transform="translate(12,'+((pt+H-pb)/2)+') rotate(-90)" text-anchor="middle" font-size="10.5" fill="var(--mute)">tokens per second, total</text>';
    el.innerHTML=RD.svg(W,H,b,'Serving frontier: per-user speed against total throughput');}
  function sync(){const ch=X.C[$('sv-chip').value];if(ch.price)$('sv-price').value=ch.price;else $('sv-price').value='';serve()}
  ['pl-model','pl-tok','pl-chip','pl-mfu','pl-good','pl-days','pl-seq'].forEach(id=>$(id).addEventListener('input',plan));
  ['sv-model','sv-n','sv-fmt','sv-kv','sv-ctx','sv-eff','sv-price'].forEach(id=>$(id).addEventListener('input',serve));$('sv-chip').addEventListener('input',sync);
  function render(){plan();serve()}
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-plan']=window.TAB_RENDER['t-plan']||[]).push(render);
  addEventListener('resize',()=>{if(!$('t-plan').hidden)render()});
})();
