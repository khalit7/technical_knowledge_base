// ---- Replay tab: the released counts through the paper's estimators, beside the printed Table 7 ----
(function(){
if(!$('rpCard')||!window.CX||!window.PAPER)return;
const CB='var(--c6)',CP='var(--c2)',BK=['bfcl','webshop','acebench'],BC={bfcl:'var(--c1)',webshop:'var(--c4)',acebench:'var(--c5)'};
const t7=PAPER.tables.t7.rows,pct=(v,d)=>(100*v).toFixed(d==null?1:d)+'%';
const sb=$('rpB'),sp=$('rpP');sp.innerHTML=CX.PAIRS.map(p=>'<option'+(p==='gemma-4-31B'?' selected':'')+'>'+p+'</option>').join('');
const printed=(bk,p)=>t7[BK.indexOf(bk)*14+CX.PAIRS.indexOf(p)];
const allStats={};const statOf=(bk,p)=>allStats[bk+p]||(allStats[bk+p]=CX.stats(CX.get(bk,p)));
const mk=(ours,paper,d)=>{const ok=Math.abs(ours-paper)<=0.5*Math.pow(10,-d)+1e-9;return '<b>'+ours.toFixed(d)+'</b><br><span class="mute small">(printed '+paper.toFixed(d)+(ok?' ✓':', differs')+')</span>'};
function draw(){const bk=sb.value,p=sp.value,cell=CX.get(bk,p),st=statOf(bk,p),t=printed(bk,p),con=$('rpCon').checked;
  fit($('rpSvg'),w=>{$('rpSvg').innerHTML=kchart(w,[{n:'base + harness',c:CB,cov:st.b.cov,con:st.b.con},{n:'post-trained',c:CP,cov:st.p.cov,con:st.p.con}],{cross:st.cross,noCon:!con,label:p+' '+bk})});
  const cb=CX.cats(cell.cb),cp=CX.cats(cell.cp);let lost=0,gained=0;for(let i=0;i<cell.T;i++){if(cell.cb[i]>0&&cell.cp[i]===0)lost++;if(cell.cb[i]===0&&cell.cp[i]>0)gained++}
  $('rpOut').innerHTML='<div class="tw"><table class="t3"><thead><tr><th></th><th class="num">base</th><th class="num">post-trained</th></tr></thead><tbody>'
   +'<tr><td>pass@1</td><td class="num">'+pct(st.b.cov[0])+'</td><td class="num">'+pct(st.p.cov[0])+'</td></tr>'
   +'<tr><td>coverage C = pass@128</td><td class="num">'+mk(st.b.cov[127],t.CB,3)+'</td><td class="num">'+mk(st.p.cov[127],t.CP,3)+'</td></tr>'
   +'<tr><td>pass<sup>128</sup> (consistency)</td><td class="num">'+pct(st.b.con[127])+'</td><td class="num">'+pct(st.p.con[127])+'</td></tr>'
   +'<tr><td>A(128), raw scalability</td><td class="num">'+st.AB.toFixed(2)+'</td><td class="num">'+st.AP.toFixed(2)+'</td></tr>'
   +'<tr><td>S(128), calibrated</td><td class="num">'+st.SB.toFixed(3)+'</td><td class="num">'+st.SP.toFixed(3)+'</td></tr>'
   +'<tr><td>tasks solved in all / some / none of 128</td><td class="num">'+cb.map(v=>pct(v)).join(' / ')+'</td><td class="num">'+cp.map(v=>pct(v)).join(' / ')+'</td></tr></tbody></table></div>'
   +'<p>Tax<sub>A</sub>(128) = '+mk(st.taxA,t.taxA,2).replace('<br>',' ')+'; Tax<sub>S</sub>(128) = '+mk(st.taxS,t.taxS,3).replace('<br>',' ')+'. Coverage gap '+(st.b.cov[127]-st.p.cov[127]>=0?'+':'')+(st.b.cov[127]-st.p.cov[127]).toFixed(3)+' (printed 95% interval '+t.lo.toFixed(3)+' to '+t.hi.toFixed(3)+'). '
   +(st.cross?'The base curve reaches the post-trained one at <b>k = '+st.cross+'</b>.':st.b.cov[0]>=st.p.cov[0]?'The base model leads from k = 1.':'The base curve never reaches the post-trained one within 128 attempts.')
   +' Lost tasks (base solved at least once, post-trained never): '+lost+' of '+cell.T+'; gained: '+gained+'.</p>';
  // tax across budgets
  fit($('rpTax'),w=>{const H=w<480?190:210,ks=[];for(let k=2;k<=128;k++)ks.push(k);const tA=[],tS=[];let mn=0,mx=0,mnS=0,mxS=0;
    ks.forEach(k=>{const a=CX.scal(st.b.cov,k),b=CX.scal(st.p.cov,k);tA.push(a.A-b.A);tS.push(a.S-b.S)});
    tS.forEach(v=>{mnS=Math.min(mnS,v);mxS=Math.max(mxS,v)});const pad=Math.max(0.01,(mxS-mnS)*0.1);
    const F=linFrame({W:w,H,pl:46,pr:14,pt:10,pb:34,x:[1,7],y:[mnS-pad,mxS+pad],xt:[1,2,3,4,5,6,7],fx:v=>String(2**v),fy:v=>v.toFixed(2),xl:'budget k',yl:'Tax_S(k)'});
    let s=F.s+ln2(F.X(1),F.Y(0),F.X(7),F.Y(0),'var(--mute)',{da:'3 3'})+lineS(ks.map((k,i)=>[Math.log2(k),tS[i]]),F.X,F.Y,'var(--c1)',{sw:2.2});
    $('rpTax').innerHTML=svgW(w,H,s,'Tax_S across budgets');
    $('rpTaxNote').innerHTML='Tax<sub>S</sub>(8) = '+tS[6].toFixed(3)+', Tax<sub>S</sub>(32) = '+tS[30].toFixed(3)+', Tax<sub>S</sub>(128) = '+tS[126].toFixed(3)+'. Raw Tax<sub>A</sub>: '+tA[6].toFixed(2)+', '+tA[30].toFixed(2)+', '+tA[126].toFixed(2)+'. Positive means the base model\'s extra attempts were worth more.'});
  drawMap()}
// the 42-cell map
function drawMap(){const el=$('rpMap'),ci=$('rpCI').checked;fit(el,w=>{const H=w<480?260:300,pts=[];let nq=[0,0,0,0];
  BK.forEach((bk,bi)=>CX.PAIRS.forEach((p,pi)=>{const st=statOf(bk,p),t=t7[bi*14+pi],x=st.b.cov[127]-st.p.cov[127],y=st.taxS;pts.push({bk,p,x,y,lo:t.lo,hi:t.hi});nq[(x>0?1:0)+(y>0?2:0)]++}));
  const F=linFrame({W:w,H,pl:46,pr:14,pt:12,pb:34,x:[-0.5,0.4],y:[-0.06,0.12],fx:v=>(v>0?'+':'')+v.toFixed(1),fy:v=>v.toFixed(2),xl:'coverage gap at k = 128 (base − post-trained)',yl:'Tax_S(128)',nx:w<480?4:8});
  let s=F.s+ln2(F.X(0),12,F.X(0),H-34,'var(--mute)',{da:'3 3'})+ln2(46,F.Y(0),w-14,F.Y(0),'var(--mute)',{da:'3 3'});
  const sel=sb.value+'|'+sp.value;
  pts.forEach(q=>{if(ci)s+=ln2(F.X(q.lo),F.Y(q.y),F.X(q.hi),F.Y(q.y),BC[q.bk],{sw:1.2,op:.6});const on=q.bk+'|'+q.p===sel;
    s+='<g class="rpPt" data-c="'+q.bk+'|'+q.p+'" style="cursor:pointer">'+dotS(F.X(q.x),F.Y(q.y),on?7:5,BC[q.bk],{sw:on?2.5:1,hollow:on,t:CX.BN[q.bk]+', '+q.p+': gap '+q.x.toFixed(3)+', Tax_S '+q.y.toFixed(3)})+'<circle cx="'+F.X(q.x).toFixed(1)+'" cy="'+F.Y(q.y).toFixed(1)+'" r="11" fill="transparent"/></g>'});
  if(w>=480)s+=tx(w-18,24,'base reaches more, taxed',{fs:11,a:'end',c:'var(--mute)'})+tx(52,24,'post reaches more, taxed',{fs:11,c:'var(--mute)'});
  const L=legendW(BK.map(b=>[CX.BN[b],BC[b],'d']),46,H+14,w-50);
  el.innerHTML=svgW(w,H+L.h+6,s+L.s,'42 cells');
  el.querySelectorAll('.rpPt').forEach(g=>g.addEventListener('click',()=>{const [bk,p]=g.dataset.c.split('|');sb.value=bk;sp.value=p;draw();$('rpCard').scrollIntoView({block:'start'})}));
  $('rpMapNote').innerHTML='Above the line (Tax<sub>S</sub> &gt; 0): <b>'+(nq[2]+nq[3])+'</b> of 42. Right of the line (base reaches more tasks): <b>'+(nq[1]+nq[3])+'</b> of 42, and the printed interval is clear of zero for '+t7.filter(t=>t.lo>0).length+' of them. Top left: post-trained models that reach more tasks and still pay a tax, because their curves saturate sooner.'})}
sb.addEventListener('change',draw);sp.addEventListener('change',draw);$('rpCon').addEventListener('change',draw);$('rpCI').addEventListener('change',drawMap);
onTab('t-run',draw);
})();
