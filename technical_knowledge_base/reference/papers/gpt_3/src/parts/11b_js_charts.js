// ---- Charts shared by the tabs: scores against model size (log axis), the contamination scatter ----
const RC=window.PAPER.rc,TB=window.PAPER.tables;
const SZ=['125M','350M','760M','1.3B','2.7B','6.7B','13B','175B'],NP=RC.nparams,LX=NP.map(Math.log10);
const SETC={z:'var(--c2)',o:'var(--c3)',f:'var(--c1)'},SETN={z:'zero-shot',o:'one-shot',f:'few-shot'};
const escH=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const f1=v=>(+v).toFixed(1);
const taskLabel=t=>t.name+(t.metric==='acc'?'':' ('+t.metric+')');
// least squares y = a + b x
function linfit(xs,ys){const n=xs.length,mx=xs.reduce((a,b)=>a+b,0)/n,my=ys.reduce((a,b)=>a+b,0)/n;let sxx=0,sxy=0;xs.forEach((x,i)=>{sxx+=(x-mx)**2;sxy+=(x-mx)*(ys[i]-my)});const b=sxy/sxx;return {a:my-b*mx,b}}
// scores against log10(params). o={series:[{y,c,n,da,dots}], ylab, dom:[lo,hi], hl:[{y,t,c,da}], fit:{a,b,n,c}, pred:{y,c}, title}
function sizeChart(W,o){const narrow=W<520,pl=40,pr=narrow?58:88,pt=o.title?22:10,pb=34,H=narrow?250:280;
  const x0=LX[0]-.08,x1=LX[7]+.08,X=v=>pl+(W-pl-pr)*(v-x0)/(x1-x0);
  let ys=[];o.series.forEach(s=>ys=ys.concat(s.y));(o.hl||[]).forEach(h=>ys.push(h.y));if(o.pred)ys.push(o.pred.y);
  let lo=o.dom?o.dom[0]:Math.min(0,...ys),hi=o.dom?o.dom[1]:Math.max(...ys);if(!o.dom){const pad=(hi-lo)*.08||1;hi+=pad;if(lo<0)lo-=pad}
  const Y=v=>pt+(H-pt-pb)*(1-(v-lo)/(hi-lo));let s='';if(o.title)s+=tx(0,13,o.title,{fs:12,w:600});
  const span=hi-lo,st=[.5,1,2,5,10,20,25,50,100].find(t=>span/t<=5)||200;
  for(let t=Math.ceil(lo/st)*st;t<=hi+1e-9;t+=st){const yy=Y(t);s+=ln2(pl,yy,W-pr,yy,'var(--line)')+tx(pl-5,yy+4,+t.toFixed(1),{fs:11,a:'end',c:'var(--mute)'})}
  if(o.zero&&lo<0)s+=ln2(pl,Y(0),W-pr,Y(0),'var(--mute)',{sw:1});
  SZ.forEach((l,i)=>{if(narrow&&(i===1||i===3||i===5))return;s+=tx(X(LX[i]),H-pb+15,l,{fs:11,a:'middle',c:'var(--mute)'})});
  s+=tx((pl+W-pr)/2,H-4,'parameters (log scale)',{fs:11,a:'middle',c:'var(--mute)'});
  if(o.ylab)s+='<text x="11" y="'+((pt+H-pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 11 '+((pt+H-pb)/2)+')">'+o.ylab+'</text>';
  const ends=[];
  (o.hl||[]).forEach(h=>{s+=ln2(pl,Y(h.y),W-pr,Y(h.y),h.c||'var(--mute)',{da:h.da||'4 3',sw:1.2});ends.push({y:Y(h.y),n:h.t,c:h.c||'var(--mute)',how:h.t})});
  if(o.fit){const xa=LX[0],xb=LX[7];s+=ln2(X(xa),Y(o.fit.a+o.fit.b*xa),X(xb),Y(o.fit.a+o.fit.b*xb),o.fit.c,{da:'2 3',sw:1.6,op:.9});}
  o.series.forEach(se=>{let d='';se.y.forEach((v,i)=>{d+=(i?'L':'M')+X(LX[i]).toFixed(1)+','+Y(v).toFixed(1)});
    s+='<path d="'+d+'" fill="none" stroke="'+se.c+'" stroke-width="'+(se.sw||2)+'"'+(se.da?' stroke-dasharray="'+se.da+'"':'')+'/>';
    se.y.forEach((v,i)=>{const used=se.fitN!=null&&i<se.fitN;s+='<circle cx="'+X(LX[i]).toFixed(1)+'" cy="'+Y(v).toFixed(1)+'" r="'+(used?3.6:2.6)+'" fill="'+(used?se.c:'var(--bg)')+'" stroke="'+se.c+'" stroke-width="1.5"><title>'+escH(se.n)+' '+SZ[i]+': '+v+'</title></circle>'});
    ends.push({y:Y(se.y[7]),n:se.n,c:se.c,how:se.n})});
  if(o.pred){s+='<circle cx="'+X(LX[7])+'" cy="'+Y(o.pred.y)+'" r="5" fill="none" stroke="'+o.pred.c+'" stroke-width="2" stroke-dasharray="2 2"/>';ends.push({y:Y(o.pred.y),n:'line: '+f1(o.pred.y),c:o.pred.c,how:'prediction of the fitted line at 175B'})}
  s+=endLabels(ends,W-pr+8,13);
  return svgW(W,H,s,o.title||'scores against model size')}
// Figure 4.2 from Table C.1: x clean %, y relative difference
function contamChart(W,hl){const narrow=W<520,pl=56,pr=10,pt=10,pb=36,H=narrow?280:300,X=v=>pl+(W-pl-pr)*v/100,lo=-30,hi=30,Y=v=>pt+(H-pt-pb)*(1-(v-lo)/(hi-lo));
  let s='';[-30,-20,-10,0,10,20,30].forEach(t=>{s+=ln2(pl,Y(t),W-pr,Y(t),t===0?'var(--mute)':'var(--line)')+tx(pl-5,Y(t)+4,(t>0?'+':'')+t+'%',{fs:11,a:'end',c:'var(--mute)'})});
  [0,25,50,75,100].forEach(t=>{s+=tx(X(t)+(t===0?-4:0),H-pb+15,t+'%',{fs:11,a:t===100?'end':'middle',c:'var(--mute)'})});
  s+=tx((pl+W-pr)/2,H-4,'share of the benchmark that is clean',{fs:11,a:'middle',c:'var(--mute)'});
  s+='<text x="11" y="'+((pt+H-pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 11 '+((pt+H-pb)/2)+')">clean minus all, relative</text>';
  s+=rc(X(0),Y(2),X(100)-X(0),Y(-2)-Y(2),'var(--acc2)',{r:0,op:.6});
  const pts=[];RC.c1.forEach(c=>{const x=X(c.clean_pct_recomputed),y=Y(Math.max(lo,Math.min(hi,c.rel_recomputed)));const big=Math.abs(c.rel_recomputed)>3.5||c.clean_pct_recomputed<20||/PIQA|Winograd$/.test(c.name);
    s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="4" fill="'+(big?'var(--c2)':'var(--c1)')+'" opacity=".85"><title>'+escH(c.name)+': '+c.clean_pct_recomputed.toFixed(0)+'% clean, '+(c.rel_recomputed>0?'+':'')+c.rel_recomputed.toFixed(1)+'% (printed '+c.rel_printed+'%)</title></circle>';
    if(big)pts.push({x,y,t:c.name.replace(' 16','').replace(' 14',''),fs:11})});
  placeLabels(pts,W,H-pb).forEach(p=>{const w=p.t.length*6.4;let x=p.lx,a=p.la;if(a==='start'&&x+w>W){x=W-1;a='end'}if(a==='middle'&&x+w/2>W){x=W-1;a='end'}if(a==='end'&&x-w<0){x=1;a='start'}s+=tx(x,p.ly,escH(p.t),{fs:11,a,c:'var(--ink)'})});
  return svgW(W,H,s,'Figure 4.2 rebuilt from Table C.1')}
