// ---- The paper's tables, rebuilt from PAPER.tables (tables.json) ----
(function(){if(!$('t1n'))return;const T=PAPER.tables;
  // Table 1: per-layer cost against n (log-log)
  const nOf=v=>Math.round(Math.pow(10,v/40));// slider 0..160 -> 1..10^4
  function t1(){const n=nOf(+$('t1n').value),d=+$('t1d').value,k=+$('t1k').value,r=+$('t1r').value;$('t1nv').textContent=fmt(n);
    const L=[{n:'Self-attention',f:x=>x*x*d,c:'var(--c1)',seq:'1',path:'1'},{n:'Recurrent',f:x=>x*d*d,c:'var(--c2)',seq:fmt(n),path:fmt(n)},{n:'Convolutional',f:x=>k*x*d*d,c:'var(--c3)',seq:'1',path:'log'+'<sub>'+k+'</sub>('+fmt(n)+') = '+(Math.log(n)/Math.log(k)).toFixed(1)},{n:'Restricted self-attention',f:x=>r*x*d,c:'var(--c4)',seq:'1',path:fmt(Math.ceil(n/r))}];
    fit($('t1Svg'),w=>{const lg=legend(L.map(l=>[l.n,l.c]),56,14,w-66),pt=lg.h+12,H=250+lg.h;
      const F=logFrame({W:w,H,pl:56,pr:24,pt,pb:34,x:[1,1e4],y:[1e2,1e13],yt:[[1e3,exp10(3)],[1e6,exp10(6)],[1e9,exp10(9)],[1e12,exp10(12)]],xt:[[1,'1'],[10,'10'],[100,'100'],[1e3,'1,000'],[1e4,'10,000']],xl:'sequence length n',yl:'operations per layer'});let s=F.s+lg.s;
      L.forEach(l=>{let p='';for(let i=0;i<=80;i++){const x=Math.pow(10,i/20);p+=F.lx(x).toFixed(1)+','+F.ly(Math.max(1e2,Math.min(1e13,l.f(x)))).toFixed(1)+' '}s+='<polyline points="'+p+'" fill="none" stroke="'+l.c+'" stroke-width="2"/>'});
      s+=ln2(F.lx(n),pt,F.lx(n),H-34,'var(--ink)',{da:'3 3'})+ln2(F.lx(d),pt,F.lx(d),H-34,'var(--mute)',{da:'1 3'})+tx(F.lx(d)+4,pt+12,'n = d',{fs:11,c:'var(--mute)'});
      L.forEach(l=>s+='<circle cx="'+F.lx(n)+'" cy="'+F.ly(Math.max(1e2,Math.min(1e13,l.f(n))))+'" r="3.5" fill="'+l.c+'"/>');
      $('t1Svg').innerHTML=svgW(w,H,s,'Per-layer cost against sequence length')});
    const sa=n*n*d,rn=n*d*d;
    $('t1Tab').innerHTML='<div class="tw"><table><thead><tr><th>Layer</th><th class="num">Operations per layer</th><th class="num">Sequential operations</th><th class="num">Longest path</th></tr></thead><tbody>'+L.map(l=>'<tr><td>'+l.n+'</td><td class="num">'+sci(l.f(n),2)+'</td><td class="num">'+l.seq+'</td><td class="num">'+l.path+'</td></tr>').join('')+'</tbody></table></div><p class="small">At <i>n</i> = '+fmt(n)+', <i>d</i> = '+fmt(d)+': self-attention costs '+(sa<rn?(rn/sa).toFixed(1)+' times less':(sa/rn).toFixed(1)+' times more')+' than a recurrent layer per layer, because <i>n</i> '+(n<d?'&lt;':n>d?'&gt;':'=')+' <i>d</i>.</p>'}
  ['t1n','t1d','t1k','t1r'].forEach(i=>$(i).addEventListener('input',t1));
  // Table 2: BLEU against cost
  let t2l='de';function t2(){const rows=T.t2.rows.filter(r=>r[t2l]!=null&&r['c'+t2l]!=null);
    fit($('t2Svg'),w=>{const H=290,num=v=>parseFloat(v),yl=t2l==='de'?[23.5,29]:[38,42.5],F=logFrame({W:w,H,pl:44,pr:12,pt:12,pb:34,x:[1e18,3e21],y:[1,1],yt:[],xt:[[1e18,exp10(18)],[1e19,exp10(19)],[1e20,exp10(20)],[1e21,exp10(21)]],xl:'training FLOPs (log scale)'});
      const ly=v=>12+(H-46)*(1-(v-yl[0])/(yl[1]-yl[0]));let s=F.s;for(let v=Math.ceil(yl[0]);v<=yl[1];v++)s+=ln2(44,ly(v),w-12,ly(v),'var(--line)')+tx(38,ly(v)+4,v,{fs:11,a:'end',c:'var(--mute)'});
      s+='<text x="11" y="'+(H/2)+'" font-size="11" fill="var(--mute)" text-anchor="middle" transform="rotate(-90 11 '+(H/2)+')">BLEU</text>';
      const short=w<560,pts=rows.map(r=>({r,x:F.lx(r['c'+t2l]),y:ly(num(r[t2l])),t:(short?r.m.replace(' Ensemble',' Ens.').replace('Transformer','Tf'):r.m)+' '+r[t2l],fs:11}));
      pts.forEach(p=>{const c=p.r.tf?'var(--c1)':'var(--mute)';s+=(p.r.ens?'<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="5" fill="none" stroke="'+c+'" stroke-width="2"/>':'<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="5" fill="'+c+'"/>')});
      placeLabels(pts.sort((a,b)=>(b.r.tf?1:0)-(a.r.tf?1:0)),w,H-36).forEach(p=>{s+=tx(p.lx,p.ly,p.t,{fs:11,a:p.la,c:p.r.tf?'var(--c1)':null,w:p.r.tf?600:null})});
      $('t2Svg').innerHTML=svgW(w,H,s,'Table 2: BLEU against training cost')});
    const miss=T.t2.rows.filter(r=>r[t2l]!=null&&r['c'+t2l]==null);$('t2Miss').innerHTML=miss.length?'No cost in the table: '+miss.map(r=>r.m+' ('+r[t2l]+')').join(', ')+'.':'';
    const best=T.t2.rows.filter(r=>!r.tf&&r[t2l]!=null).reduce((a,b)=>parseFloat(a[t2l])>parseFloat(b[t2l])?a:b);
    $('t2Miss').innerHTML+=' Best earlier result: '+best.m+', '+best[t2l]+' BLEU at '+sci(best['c'+t2l],1).replace(/10(.+)$/,'')+'10<sup>'+Math.round(Math.log10(best['c'+t2l]))+'</sup> FLOPs; the big Transformer: '+(t2l==='de'?'28.4':'41.8')+' at 2.3 × 10<sup>19</sup> ('+(2.3e19/best['c'+t2l]).toFixed(2)+' of that cost).'}
  segBind('t2L',m=>{t2l=m;$('t2L').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));refit($('t2Svg'));t2()});
  // Table 3
  const B=T.t3.base,lab=k=>({N:'<i>N</i>',d:'<i>d</i><sub>model</sub>',dff:'<i>d</i><sub>ff</sub>',h:'<i>h</i>',dk:'<i>d<sub>k</sub></i>',dv:'<i>d<sub>v</sub></i>',pd:'<i>P</i><sub>drop</sub>',ls:'ε<sub>ls</sub>',steps:'steps',pe:'positions'}[k]);
  const cfgOf=r=>Object.assign({},B,r.set);
  function params(c,V){c=Object.assign({N:6,d:512,dff:2048,h:8},c);const dk=c.dk||c.d/c.h,dv=c.dv||c.d/c.h,att=c.d*c.h*dk*2+c.d*c.h*dv*2+2*c.h*dk+c.h*dv+c.d,ffn=2*c.d*c.dff+c.dff+c.d,ln=2*c.d;return V*c.d+c.N*((att+ffn+2*ln)+(2*att+ffn+3*ln))}
  let t3m='bleu',t3s='tab';function t3(){let rows=T.t3.rows.map((r,i)=>({r,i,dl:r[t3m]-B[t3m]}));if(t3s==='d')rows.sort((a,b)=>(t3m==='bleu'?a.dl-b.dl:b.dl-a.dl));
    const mx=Math.max(...rows.map(x=>Math.abs(x.dl)));
    let h='<div class="tw"><table class="t3"><thead><tr><th>Row</th><th>Change from base</th><th class="num">'+(t3m==='bleu'?'BLEU':'PPL')+'</th><th>Δ from base</th><th class="num">Params, paper</th><th class="num">Params, recount</th></tr></thead><tbody><tr class="basec"><td>base</td><td class="chg"><i>N</i> 6, <i>d</i><sub>model</sub> 512, <i>d</i><sub>ff</sub> 2048, <i>h</i> 8, <i>d<sub>k</sub></i> = <i>d<sub>v</sub></i> 64, <i>P</i><sub>drop</sub> 0.1, ε<sub>ls</sub> 0.1, 100K steps</td><td class="num">'+B[t3m]+'</td><td></td><td class="num">65M</td><td class="num">'+(params({},37000)/1e6).toFixed(1)+'M</td></tr>';
    rows.forEach(({r,dl})=>{const chg=r.label||Object.keys(r.set).map(k=>lab(k)+' '+r.set[k]).join(', '),good=t3m==='bleu'?dl>0:dl<0,c=Math.abs(dl)<1e-9?'var(--dim)':good?'var(--good)':'var(--bad)';
      const pc=r.g==='D'||r.g==='E'||r.g==='A'?null:params(cfgOf(r),37000);
      h+='<tr><td>'+(r.g==='big'?'big':'('+r.g+')')+'</td><td class="chg">'+chg+'</td><td class="num">'+r[t3m].toFixed(t3m==='bleu'?1:2)+'</td><td><span class="dbar" style="width:'+(Math.abs(dl)/mx*80).toFixed(1)+'px;background:'+c+'"></span> '+(dl>0?'+':'')+dl.toFixed(t3m==='bleu'?1:2)+'</td><td class="num">'+(r.params?r.params+'M':'')+'</td><td class="num">'+(pc?(pc/1e6).toFixed(1)+'M':r.g==='A'?'same as base':'')+'</td></tr>'});
    $('t3Out').innerHTML=h+'</tbody></table></div>'}
  segBind('t3M',m=>{t3m=m;t3()});segBind('t3S',m=>{t3s=m;t3()});
  // parameter recount
  function tP(){const V=+$('tPv').value;$('tPvv').textContent=fmt(V);const rows=[['base',{},65]].concat(T.t3.rows.filter(r=>r.params&&r.g!=='big').map(r=>[Object.keys(r.set).map(k=>lab(k)+' '+r.set[k]).join(', '),cfgOf(r),r.params]),[['big',cfgOf(T.t3.rows[T.t3.rows.length-1]),213]]);
    $('tPOut').innerHTML='<div class="tw"><table><thead><tr><th>Configuration</th><th class="num">Paper</th><th class="num">Recount</th><th class="num">Difference</th></tr></thead><tbody>'+rows.map(([n,c,p])=>{const q=params(c,V)/1e6;return '<tr><td>'+n+'</td><td class="num">'+p+'M</td><td class="num">'+q.toFixed(2)+'M</td><td class="num">'+(q-p>=0?'+':'')+(q-p).toFixed(2)+'M</td></tr>'}).join('')+'</tbody></table></div>'}
  $('tPv').addEventListener('input',tP);
  // Table 4
  function t4(){$('t4Out').innerHTML='<div class="bars">'+T.t4.rows.map(r=>'<div class="row'+(r.tf?' hl':'')+'"><span class="nm" title="'+r.m+'">'+r.m+' <span class="mute">'+r.tr+'</span></span><span class="track"><span class="fill" style="width:'+((r.f1-86)/(94-86)*100).toFixed(1)+'%;background:'+(r.tf?'var(--c1)':'var(--dim)')+'"></span></span><span class="val">'+r.f1.toFixed(1)+'</span></div>').join('')+'</div><p class="small mute">Bars start at 86 F1.</p>'}
  onTab('t-tables',()=>{['t1Svg','t2Svg'].forEach(i=>refit($(i)));t1();t2();t3();tP();t4()});
})();
