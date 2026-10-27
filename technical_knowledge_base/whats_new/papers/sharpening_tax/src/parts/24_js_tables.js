// ---- Tables tab: checks, Table 7 explorer, PTGS intervals, Table 4 ----
(function(){
const P=window.PAPER;if(!P||!$('t-tables'))return;const T=P.tables,RC=P.rc;
// checks
$('tbCk').innerHTML='<ul class="lst">'+RC.checks.map(c=>'<li>'+(c.ok?'✓ ':'✗ ')+'<b>'+c.claim+'</b> <a class="mute" href="'+P.meta.ax+'#'+c.at+'" target="_blank" rel="noopener noreferrer">(in the paper)</a><br><span class="mute">Paper:</span> '+c.paper+'. <span class="mute">This page:</span> '+c.ours+'. <span class="mute">('+c.how+')</span></li>').join('')+'</ul>';
// Table 7 explorer, with the replay beside it
let filt='all',sortK=null,sortDir=1;
const rep=(i)=>{const bk=['bfcl','webshop','acebench'][Math.floor(i/14)],p=CX.PAIRS[i%14];return {bk,p}};
const cache={};const repStat=i=>cache[i]||(cache[i]=(()=>{const r=rep(i);return CX.stats(CX.get(r.bk,r.p))})());
const cols=[['bench','Benchmark'],['pair','Pair'],['CB','C<sub>B</sub>'],['CP','C<sub>P</sub>'],['dC','ΔC [95% CI]'],['mB','C̄<sub>B</sub>'],['mP','C̄<sub>P</sub>'],['taxA','Tax<sub>A</sub>'],['taxS','Tax<sub>S</sub>'],['rep','Tax<sub>S</sub> replayed']];
function t7(){const rows=T.t7.rows.map((r,i)=>Object.assign({i,rep:repStat(i).taxS},r)).filter(r=>filt==='all'||r.bench===filt);
  if(sortK)rows.sort((a,b)=>(a[sortK]>b[sortK]?1:a[sortK]<b[sortK]?-1:0)*sortDir);
  $('t7tab').querySelector('thead').innerHTML='<tr>'+cols.map(([k,l])=>'<th class="'+(k==='bench'||k==='pair'?'':'num')+'" data-k="'+k+'" style="cursor:pointer" title="sort">'+l+(sortK===k?(sortDir>0?' ▲':' ▼'):'')+'</th>').join('')+'</tr>';
  const neg=v=>v<0?' style="color:var(--good)"':'';
  $('t7tab').querySelector('tbody').innerHTML=rows.map(r=>'<tr><td>'+r.bench+'</td><td>'+r.pair+'</td><td class="num">'+r.CB.toFixed(3)+'</td><td class="num">'+r.CP.toFixed(3)+'</td><td class="num"'+(r.lo>0?' style="color:var(--c6)"':r.hi<0?' style="color:var(--c2)"':'')+'>'+(r.dC>=0?'+':'')+r.dC.toFixed(3)+' ['+r.lo.toFixed(3)+', '+r.hi.toFixed(3)+']</td><td class="num">'+r.mB.toFixed(3)+'</td><td class="num">'+r.mP.toFixed(3)+'</td><td class="num"'+neg(r.taxA)+'>'+(r.taxA>=0?'+':'')+r.taxA.toFixed(2)+'</td><td class="num"'+neg(r.taxS)+'>'+(r.taxS>=0?'+':'')+r.taxS.toFixed(3)+'</td><td class="num">'+(r.rep>=0?'+':'')+r.rep.toFixed(3)+(Math.abs(r.rep-r.taxS)<=0.0005+1e-9?' ✓':' ✗')+'</td></tr>').join('');
  $('t7tab').querySelectorAll('th[data-k]').forEach(th=>th.addEventListener('click',()=>{const k=th.dataset.k;if(sortK===k)sortDir=-sortDir;else{sortK=k;sortDir=k==='bench'||k==='pair'?1:-1}t7()}));
  const n=rows.length;$('t7note').innerHTML=n+' rows. Tax<sub>S</sub> &gt; 0 in '+rows.filter(r=>r.taxS>0).length+'; base ahead at k = 128 (ΔC &gt; 0) in '+rows.filter(r=>r.dC>0).length+', with the interval clear of zero in '+rows.filter(r=>r.lo>0).length+' (teal); post-trained clearly ahead in '+rows.filter(r=>r.hi<0).length+' (orange). Replay matches the printed Tax<sub>S</sub> in '+rows.filter(r=>Math.abs(r.rep-r.taxS)<=0.0005+1e-9).length+' of '+n+'.'}
segBind('t7M',m=>{filt=m;t7()});onTab('t-tables',t7);
// PTGS against the other samplers, printed intervals
let env='sok';const ms=$('ptMet');
function ci(){const el=$('ptCI'),mi=+ms.value;fit(el,w=>{const rows=T.t9.rows.concat(T.t10.rows.filter(r=>!/base|ancestral|PTGS/.test(r.method))).filter(r=>r[env][mi]&&r[env][mi][1]!=null);
  const vals=rows.map(r=>r[env][mi]);let lo=Math.min(...vals.map(v=>v[0]-v[1])),hi=Math.max(...vals.map(v=>v[0]+v[1]));const pad=(hi-lo)*0.05;lo-=pad;hi+=pad;
  const lw=w<480?118:170,rh=24,H=rows.length*rh+40,X=v=>lw+(w-lw-16)*(v-lo)/(hi-lo);const isT=mi===3,f=v=>isT?v.toFixed(3):v.toFixed(1);
  const pr=rows.find(r=>/PTGS/.test(r.method))[env][mi];let s=rc(X(pr[0]-pr[1]),6,X(pr[0]+pr[1])-X(pr[0]-pr[1]),rows.length*rh+4,'var(--acc2)',{r:2,op:.7});
  niceTicks(lo,hi,w<480?4:6).forEach(v=>{s+=ln2(X(v),6,X(v),rows.length*rh+10,'var(--line)')+tx(X(v),rows.length*rh+24,f(v),{fs:11,a:'middle',c:'var(--mute)'})});
  rows.forEach((r,i)=>{const y=10+i*rh+rh/2,v=r[env][mi],pt=/PTGS/.test(r.method),df=/default|ancestral/.test(r.method);const nm=r.method.replace('PPO, ','').replace(' (default)',' (PPO default)').replace('PPO with PTGS','PTGS');
    s+=tx(lw-6,y+4,nm,{fs:11,a:'end',w:pt||df?'600':null});s+=ln2(X(v[0]-v[1]),y,X(v[0]+v[1]),y,pt?'var(--c1)':df?'var(--c2)':'var(--mute)',{sw:2.2})+dotS(X(v[0]),y,4,pt?'var(--c1)':df?'var(--c2)':'var(--ink)',{t:nm+': '+f(v[0])+' ± '+f(v[1])})});
  el.innerHTML=svgW(w,H,s,'PTGS intervals');
  const z=P.rc.ptgs.find(x=>x.env===(env==='sok'?'Sokoban':'FrozenLake')&&x.metric===['pass@1','pass@128','pass^128','TaxS(128)'][mi]);
  $('ptCInote').innerHTML='PTGS against the PPO default: '+(z.diff>=0?'+':'')+z.diff+(isT?'':' points')+', about '+Math.abs(z.z).toFixed(1)+' standard errors (standard errors recovered from the printed intervals as half-width / 2.776, the t quantile for five runs; derived, the paper reports no test). '+(mi===3?'Lowest tax of any sampler: '+(()=>{const b=rows.reduce((a,r)=>r[env][3][0]<a[env][3][0]?r:a);return b.method.replace('PPO, ','')+' ('+b[env][3][0].toFixed(3)+')'})()+'.':'')})}
segBind('ptE',m=>{env=m;ci()});ms.addEventListener('change',ci);onTab('t-tables',ci);
// Table 4
$('t4tab').querySelector('tbody').innerHTML=T.t4.rows.map(r=>'<tr><td>'+r.backbone+'</td><td>'+r.bench+'</td>'+['b_p1_wo','b_p32_wo','b_p1_w','b_p32_w','p_p1_wo','p_p32_wo','p_p1_w','p_p32_w'].map(k=>'<td class="num">'+r[k].toFixed(1)+'</td>').join('')+'</tr>').join('');
})();
