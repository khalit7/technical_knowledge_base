// ---- The paper's tables, rebuilt: Table 1 recount, Table 2 gaps, Table 5 explorer, Table 6 compute frontier, Tables 7 and 8 ----
(function(){
const T=PAPER.tables,RC=PAPER.rc;
const tbl=(head,rows,cls)=>'<div class="tw"><table'+(cls?' class="'+cls+'"':'')+'><thead><tr>'+head.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map((c,i)=>i?'<td>'+c+'</td>':'<td><b>'+c+'</b></td>').join('')+'</tr>').join('')+'</tbody></table></div>';
// Table 1
const CFG={'ViT-Base':[12,768,3072],'ViT-Large':[24,1024,4096],'ViT-Huge':[32,1280,5120]};
function params(L,D,M,P,R){const N=Math.floor(R/P)**2;return P*P*3*D+D+D+(N+1)*D+L*(4*D+3*D*D+3*D+D*D+D+2*D*M+M+D)+2*D}
const OWN={'ViT-Base':16,'ViT-Large':16,'ViT-Huge':14};
function tb1(){const R=+$('tb1R').value,pv=$('tb1P').value,Pof=n=>pv==='own'?OWN[n]:+pv;
  $('tb1T').innerHTML=tbl(['Model','Layers','<i>D</i>','MLP','Heads','Params (printed)','Recount at '+R+' px'],T.t1.rows.map(r=>[r[0],r[1],r[2],r[3],r[4],r[5],(params(...CFG[r[0]],Pof(r[0]),R)/1e6).toFixed(1)+'M (<i>P</i> = '+Pof(r[0])+')']));
  const p=RC.params;$('tb1O').innerHTML='At the paper\'s own patch sizes and 224 px: Base '+(p.B/1e6).toFixed(1)+'M (printed 86M), Large '+(p.L/1e6).toFixed(1)+'M (printed 307M), Huge '+(p.H/1e6).toFixed(1)+'M (printed 632M). Changing resolution or patch only changes <b>E</b> and the position table ('+fmt(Math.floor(R/16)**2+1)+' positions at '+R+' px with 16 × 16 patches).'}
['tb1R','tb1P'].forEach(id=>$(id).addEventListener('change',tb1));
// Table 2
let tb2M='acc';
function tb2(){const rows=T.t2.rows,g=RC.t2_gaps;
  const out=rows.map(r=>{const ds=r[0];if(tb2M==='acc'||ds==='TPUv3-core-days')return [ds,...r.slice(1)];
    return [ds,...r.slice(1).map((c,j)=>{if(j===3)return '<span class="mute">baseline</span>';if(j>1)return '<span class="mute">n/a</span>';const x=g[ds]&&g[ds][j===0?'H/14':'L/16 JFT'];if(!x)return 'n/a';
      const v=tb2M==='d'?(x.diff>0?'+':'')+x.diff.toFixed(2):(x.z==null?'n/a':(x.z>0?'+':'')+x.z.toFixed(1)+' sd');const bad=x.diff<=0;return bad?'<b class="no">'+v+'</b>':v})]});
  $('tb2T').innerHTML=tbl(['',...T.t2.models],out)+(tb2M!=='acc'?'<p class="small">Gaps for the two JFT ViTs against BiT-L (also JFT); orange where the ViT is not ahead. Compute: '+RC.coredays['BiT/H14']+'× less for ViT-H/14 than BiT-L, '+RC.coredays['NS/H14']+'× less than Noisy Student, '+RC.coredays['BiT/L16']+'× less for ViT-L/16.</p>':'')}
segBind('tb2M',m=>{tb2M=m;$('tb2M').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));tb2()});
// Table 5
$('tb5D').innerHTML=T.t5.pre.ImageNet.map((r,i)=>'<option value="'+i+'"'+(r[0]==='ImageNet'?' selected':'')+'>'+r[0]+'</option>').join('');
function tb5(){const i=+$('tb5D').value,pres=['ImageNet','ImageNet-21k','JFT-300M'],cols=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)'];
  fit($('tb5Svg'),w=>{const ser=T.t5.models.map((m,j)=>({name:m,c:cols[j],pts:pres.map((p,k)=>[k,T.t5.pre[p][i][j+1]]).filter(p=>p[1]!=='-').map(p=>[p[0],+p[1]])}));
    $('tb5Svg').innerHTML=lineChart(ser,Math.min(w,620),{xt:[0,1,2],fmtx:k=>pres[k],ylab:T.t5.pre.ImageNet[i][0]+' top-1, %',h:250,label:'Table 5'}).svg})}
$('tb5D').addEventListener('change',tb5);
// Table 6
function tb6(){const sel=$('tb6D').value,rows=T.t6.rows;const acc=r=>sel==='avg'?[2,4,5,6,7].reduce((a,i)=>a+ +r[i],0)/5:+r[+sel];
  const fam=r=>r[0].startsWith('ViT')?0:r[0].startsWith('ResNet')?1:2,FC=['var(--c1)','var(--c2)','var(--c3)'],FN=['ViT','ResNet (BiT)','Hybrid'];
  fit($('tb6Svg'),w=>{const W=Math.min(w,640),H=280,L=48,R=12,Tp=10,B=40,xs=rows.map(r=>+r[8]),ys=rows.map(acc),x0=Math.log10(40),x1=Math.log10(5000),y0=Math.floor(Math.min(...ys)-1),y1=Math.ceil(Math.max(...ys)+.5);
    const X=v=>L+(Math.log10(v)-x0)/(x1-x0)*(W-L-R),Y=v=>Tp+(1-(v-y0)/(y1-y0))*(H-Tp-B);let s='';
    for(let v=y0;v<=y1;v+=(y1-y0>8?2:1))s+=ln2(L,Y(v),W-R,Y(v),'var(--line)')+tx(L-5,Y(v)+4,v,{a:'end',fs:11,c:'var(--mute)'});
    [50,100,200,500,1000,2000,5000].forEach(v=>{s+=ln2(X(v),Tp,X(v),H-B,'var(--line)')+tx(X(v),H-B+15,fmt(v),{a:'middle',fs:11,c:'var(--mute)'})});
    s+=tx((L+W-R)/2,H-6,'pre-training exaFLOPs (log scale)',{a:'middle',fs:11,c:'var(--mute)'});
    [0,1,2].forEach(f=>{const pts=rows.filter(r=>fam(r)===f).sort((a,b)=>+a[8]-+b[8]);s+='<path d="'+pts.map((r,i)=>(i?'L':'M')+X(+r[8]).toFixed(1)+','+Y(acc(r)).toFixed(1)).join('')+'" fill="none" stroke="'+FC[f]+'" stroke-width="1.4" opacity=".55"/>';
      pts.forEach(r=>{s+='<circle cx="'+X(+r[8]).toFixed(1)+'" cy="'+Y(acc(r)).toFixed(1)+'" r="4" fill="'+FC[f]+'"><title>'+r[0]+' ('+r[1]+' epochs): '+acc(r).toFixed(2)+'%, '+r[8]+' exaFLOPs</title></circle>'})});
    const lg=legend(FN.map((n,f)=>[n,FC[f]]),L,12,W-L-R);$('tb6Svg').innerHTML=svgW(W,H+lg.h,lg.s+'<g transform="translate(0,'+lg.h+')">'+s+'</g>','Table 6 accuracy against compute')});
  // compute ratio for this metric
  const res=rows.filter(r=>r[0].startsWith('ResNet')).sort((a,b)=>+a[8]-+b[8]),fr=[];res.forEach(r=>{const a=acc(r);if(!fr.length||a>fr[fr.length-1][1])fr.push([+r[8],a])});
  const out=rows.filter(r=>r[0].startsWith('ViT')).map(r=>{const a=acc(r),c=+r[8];for(let i=0;i+1<fr.length;i++){const [c0,a0]=fr[i],[c1,a1]=fr[i+1];if(a>=a0&&a<=a1){const cr=10**(Math.log10(c0)+(Math.log10(c1)-Math.log10(c0))*(a-a0)/(a1-a0));return r[0]+' ('+r[1]+' ep) <b>'+(cr/c).toFixed(2)+'×</b>'}}
    return r[0]+' ('+r[1]+' ep) '+(a>fr[fr.length-1][1]?'above every ResNet':'below every ResNet')});
  $('tb6O').innerHTML='ResNet compute needed for the same accuracy, divided by the ViT\'s: '+out.join(' · ')+'.'}
$('tb6D').addEventListener('change',tb6);
function tb6F(){const e=RC.exaflops;$('tb6F').innerHTML=Object.keys(e).map(k=>k+' '+e[k].formula+' against '+e[k].printed).join(', ')}
// Tables 8 and 7
function tb8(){fit($('tb8Svg'),w=>{const W=Math.min(w,360),rows=T.t8.rows,items=[];rows.forEach(r=>[1,2,3].forEach(j=>{if(r[j]!=='N/A')items.push([r[0].replace(' Pos. Emb.','')+', '+T.t8.cols[j].toLowerCase(),+r[j]])}));
    const bh=17,L=150,H=items.length*(bh+4)+20,x0=.60,x1=.65,X=v=>L+(v-x0)/(x1-x0)*(W-L-40);let s='';
    items.forEach(([n,v],i)=>{const y=i*(bh+4);s+=tx(L-6,y+bh-4,n,{a:'end',fs:11})+rc(L,y,X(v)-L,bh,n.startsWith('No')?'var(--c2)':'var(--c1)')+tx(X(v)+4,y+bh-4,v.toFixed(3),{fs:11})});
    s+=tx(L,H-4,'axis from 0.60 to 0.65',{fs:11,c:'var(--mute)'});$('tb8Svg').innerHTML=svgW(W,H,s,'Table 8')});
  $('tb7T').innerHTML=tbl(T.t7.cols,T.t7.rows);$('tb7O').textContent=RC.t7_avg.join(', ')+' against printed '+RC.t7_avg_printed.join(', ')}
function nr(){const p=RC.params;$('nrL').textContent=(p.L/1e6).toFixed(1)+'M';$('nrBH').textContent='Base '+(p.B/1e6).toFixed(1)+'M against 86M, Huge '+(p.H/1e6).toFixed(1)+'M against 632M';
  const d=RC.t5_vs_t6['ViT-H/14'];$('nr56').textContent=Object.keys(d).map(k=>k+' '+d[k][0]+' (Table 5) against '+d[k][1]+' (Table 6)').join('; ')}
onTab('t-tables',()=>{try{tb1();tb2();tb5();tb6();tb6F();tb8();nr()}catch(e){__jsErr('tables: '+e.message)}});
})();
