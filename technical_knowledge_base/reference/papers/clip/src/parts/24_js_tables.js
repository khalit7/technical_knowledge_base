// ---- The paper's tables, rebuilt: comparisons, Figure 8 and 10 recomputed, robustness, small tables, hyperparameters, checks ----
(function(){
const TB=PAPER.tables,RC=PAPER.rc,DS=TB.t10.datasets,AX=PAPER.meta.ax;
const axa=(a,t)=>'<a href="'+AX+'#'+a+'" target="_blank" rel="noopener noreferrer">'+t+'</a>';
// a sortable table: cols [{h,num}], rows [[...]]
function table(id,cols,rows,o){o=o||{};const st={k:-1,d:1};const host=$(id);
  function render(){let R=rows.slice();if(st.k>=0)R.sort((a,b)=>{const x=a[st.k],y=b[st.k];if(x==null)return 1;if(y==null)return -1;return (typeof x==='number'?x-y:String(x).localeCompare(String(y)))*st.d});
    host.innerHTML='<div class="tw"><table class="srt"><thead><tr>'+cols.map((c,i)=>'<th'+(c.num?' class="num"':'')+' data-k="'+i+'" tabindex="0" role="button" aria-label="Sort by '+c.h+'">'+c.h+(st.k===i?(st.d>0?' ▲':' ▼'):'')+'</th>').join('')+'</tr></thead><tbody>'+
      R.map(r=>'<tr'+(o.hl&&o.hl(r)?' class="hl"':'')+'>'+r.map((v,i)=>'<td'+(cols[i].num?' class="num"':'')+'>'+(v==null?'':(cols[i].f?cols[i].f(v,r):v))+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>'+(o.note?'<p class="small mute">'+o.note+'</p>':'');
    host.querySelectorAll('th').forEach(th=>{const go=()=>{const k=+th.dataset.k;st.d=st.k===k?-st.d:-1;st.k=k;render()};th.addEventListener('click',go);th.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}})})}
  render()}
const f1=v=>typeof v==='number'?v.toFixed(1):v;
// ---------- Table 1 ----------
table('tbT1O',[{h:'Model'},{h:'aYahoo',num:1,f:f1},{h:'ImageNet',num:1,f:f1},{h:'SUN',num:1,f:f1}],TB.t1.rows,{note:'Zero-shot top-1 accuracy (%), '+axa('S3.T1','Table 1')+'. Recomputed: aYahoo errors fall from 27.6% to 1.6%, a '+(100*RC.t1.ayahoo_error_cut).toFixed(1)+'% cut (the text says 95%); SUN rises '+RC.t1.sun_ratio+'×; ImageNet '+RC.t1.imagenet_ratio+'×. Not a like-for-like comparison: 10× the data, about 100× the compute per prediction, probably over 1,000× the training compute (§3.1.3).'});
// ---------- model comparison ----------
const MODELS=[].concat(TB.t11.rows.map(r=>({id:'zs|'+r.group+'|'+r.model,n:'zero-shot '+r.group+' '+r.model,v:r.v})),TB.t10.rows.map(r=>({id:'lp|'+r.group+'|'+r.model,n:'linear probe '+r.group+' '+r.model,v:r.v})));
const opt=m=>'<option value="'+m.id+'">'+m.n+'</option>';$('tbA').innerHTML=MODELS.map(opt).join('');$('tbB').innerHTML=MODELS.map(opt).join('');
$('tbA').value='zs|CLIP-ViT|L/14-336px';$('tbB').value='lp|ResNet|50';
const mById=id=>MODELS.find(m=>m.id===id);
function drawCmp(w){const A=mById($('tbA').value),B=mById($('tbB').value),d=DS.map((n,i)=>({n,v:+(A.v[i]-B.v[i]).toFixed(1),a:A.v[i],b:B.v[i]})).sort((x,y)=>y.v-x.v);
  const lim=Math.max(5,...d.map(x=>Math.abs(x.v)));
  $('tbCmpSvg').innerHTML=hbars(d.map(x=>({n:x.n,v:x.v,c:x.v>0?'var(--c3)':'var(--c2)',t:x.n+': '+x.a+' minus '+x.b})),w,{min:-lim,max:lim,fmt:v=>(v>0?'+':'')+v.toFixed(1),lw:Math.min(110,w*.3),h:12,label:'per-dataset difference'});
  const K=TB.t10.kornblith12.map(n=>DS.indexOf(n)),av=(v,ix)=>ix.reduce((s,i)=>s+v[i],0)/ix.length,all=DS.map((_,i)=>i);
  $('tbCmpO').innerHTML='A wins on <b>'+d.filter(x=>x.v>0).length+'</b> of 27 datasets, B on '+d.filter(x=>x.v<0).length+(d.some(x=>x.v===0)?', '+d.filter(x=>x.v===0).length+' tied':'')+'. Average over 27: A '+av(A.v,all).toFixed(2)+', B '+av(B.v,all).toFixed(2)+'; over the 12 Kornblith datasets: A '+av(A.v,K).toFixed(2)+', B '+av(B.v,K).toFixed(2)+'. (Averages here are plain means of the printed scores, including the non-accuracy metrics.)'}
['tbA','tbB'].forEach(id=>$(id).addEventListener('change',()=>refit($('tbCmpSvg'))));
onTab('t-tables',()=>fit($('tbCmpSvg'),drawCmp));
// ---------- Figure 8 ----------
$('tbF8M').innerHTML=TB.t11.rows.map(r=>'<option value="'+r.group+'|'+r.model+'">'+r.group+' '+r.model+'</option>').join('');$('tbF8M').value='CLIP-ViT|L/14-336px';
function drawF8(w){const [g,m]=$('tbF8M').value.split('|'),zs=TB.t11.rows.find(r=>r.group===g&&r.model===m).v,lp=TB.t10.rows.find(r=>r.group===g&&r.model===m.replace(/^RN/,'')).v;
  const H=Math.min(360,w*.8),L=40,B=34,T=8,R=34,X=v=>L+v/100*(w-L-R),Y=v=>T+(1-v/100)*(H-T-B);let s='';
  [0,25,50,75,100].forEach(v=>{s+=ln2(L,Y(v),w-R,Y(v),'var(--line)')+tx(L-5,Y(v)+4,v,{a:'end',fs:11,c:'var(--mute)'})+tx(X(v),H-B+15,v,{a:'middle',fs:11,c:'var(--mute)'})});
  s+=ln2(X(0),Y(0),X(100),Y(100),'var(--mute)',{da:'4 3'});
  const pts=DS.map((n,i)=>({x:X(lp[i]),y:Y(zs[i]),t:n,fs:11,lp:lp[i],zs:zs[i]}));
  pts.forEach(p=>{s+='<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="4" fill="var(--c1)"><title>'+p.t+': linear probe '+p.lp+', zero-shot '+p.zs+'</title></circle>'});
  if(w>520){placeLabels(pts.filter(p=>Math.abs(p.lp-p.zs)>25||p.lp-p.zs<3),w,H-B);pts.filter(p=>p.la).forEach(p=>{s+=tx(p.lx,p.ly,p.t,{a:p.la,fs:11,c:'var(--mute)'})})}
  s+=tx((L+w-R)/2,H-4,'linear-probe score (%)',{a:'middle',fs:11,c:'var(--mute)'})+'<text x="11" y="'+((T+H-B)/2)+'" font-size="11" fill="var(--mute)" text-anchor="middle" transform="rotate(-90 11 '+((T+H-B)/2)+')">zero-shot score (%)</text>';
  $('tbF8Svg').innerHTML=svgW(w,H,s,'Figure 8 recomputed');
  const mx=zs.reduce((a,b)=>a+b)/27,my=lp.reduce((a,b)=>a+b)/27,r=zs.reduce((a,z,i)=>a+(z-mx)*(lp[i]-my),0)/Math.sqrt(zs.reduce((a,z)=>a+(z-mx)**2,0)*lp.reduce((a,l)=>a+(l-my)**2,0));
  const gap=DS.map((n,i)=>lp[i]-zs[i]),w3=DS.filter((n,i)=>gap[i]<=3);
  $('tbF8O').innerHTML='Pearson correlation <b>'+r.toFixed(3)+'</b> across the 27 datasets (the paper: 0.82 for its best model, %F8%); zero-shot is within 3 points of the probe on '+w3.length+' ('+w3.join(', ')+'; the paper says 5); median gap '+gap.slice().sort((a,b)=>a-b)[13].toFixed(1)+' points; '+gap.filter(g=>g>=10&&g<=25).length+' datasets have gaps of 10 to 25. Dashed: <i>y</i> = <i>x</i>, an "optimal" zero-shot classifier.';
  $('tbF8O').innerHTML=$('tbF8O').innerHTML.replace('%F8%',axa('S3.F8','Figure 8'))}
$('tbF8M').addEventListener('change',()=>refit($('tbF8Svg')));onTab('t-tables',()=>fit($('tbF8Svg'),drawF8));
// ---------- Figure 10 ----------
let F10='k12';segBind('tbF10M',m=>{F10=m;refit($('tbF10Svg'))});
function drawF10(w){const ix=F10==='k12'?TB.t10.kornblith12.map(n=>DS.indexOf(n)):DS.map((_,i)=>i),av=v=>ix.reduce((s,i)=>s+v[i],0)/ix.length;
  const R=TB.t10.rows.map(r=>({n:r.group+' '+r.model,v:av(r.v),clip:/CLIP-(ResNet|ViT)/.test(r.group)})).sort((a,b)=>b.v-a.v).slice(0,16);
  $('tbF10Svg').innerHTML=hbars(R.map(r=>({n:r.n,v:r.v,c:r.clip?'var(--c1)':'var(--dim)',b:r.clip})),w,{min:Math.floor(R[R.length-1].v-3),max:Math.ceil(R[0].v+1),fmt:v=>v.toFixed(2),lw:Math.min(210,w*.5),h:13,label:'average linear-probe score'});
  const q=RC['fig10_'+F10];$('tbF10O').innerHTML='The 16 best of 66 models by the plain mean of '+(F10==='k12'?'the 12 Kornblith datasets':'all 27 datasets')+'; CLIP models in blue. Best CLIP ('+q.best_clip[1]+', '+q.best_clip[0]+') minus best other ('+q.best_other[1]+', '+q.best_other[0]+') = <b>'+q.margin+'</b> points; the paper says '+(F10==='k12'?'2.6':'5')+' ('+axa('S3.SS2','§3.2')+'). '+(F10==='k12'?'Reproduces independently.':'4.7 against "5%": reproduces after rounding.')+' Figure 10 plots these averages against compute, which the tables do not give; compute efficiency is not recomputed here.'}
onTab('t-tables',()=>fit($('tbF10Svg'),drawF10));
// ---------- robustness ----------
(function(){const r=RC.t16,c=TB.t16.cols,R=TB.t16.rows;
  table('tbRobO',[{h:'Model'}].concat(c.map(h=>({h,num:1,f:f1}))),R.map(x=>x.slice()),{note:axa('A5.T16','Table 16')+' (top-1 %, ImageNet-Vid and Youtube-BB at PM-0 and PM-10). Linear probe CLIP minus zero-shot CLIP: '+r.per.map(p=>p[0]+' '+(p[1]>0?'+':'')+p[1]).join(', ')+'. ImageNet gains '+r.imagenet_gain+' points, as printed. The text\'s per-dataset losses reproduce for ImageNet-R (−4.7), Sketch (−2.8) and ImageNet-A (−1.9), not for ObjectNet. '+r.objectnet_note+' Averaged over the 7 shifts (PM-0 and PM-10 averaged, as §3.3 does), Table 16 gives '+r.shift_avg_zs+' zero-shot against '+r.shift_avg_lp+' adapted, a fall of '+(-r.shift_avg_change).toFixed(1)+' points, larger than "slightly decreases" suggests: Table 16\'s zero-shot row uses each dataset\'s own class names (95.3 on ImageNet-Vid), while Figure 14 measures the adaptation against the ImageNet-class classifier, whose per-dataset values are not printed.'})})();
// ---------- small tables ----------
const SMALL={t2:()=>table('tbSmallO',[{h:'Who'},{h:'Accuracy',num:1,f:f1},{h:'Majority vote',num:1,f:f1},{h:'Accuracy on guesses',num:1,f:f1},{h:'Majority vote on guesses',num:1,f:f1}],TB.t2.rows,{note:axa('S4.T2','Table 2')+', average per-class accuracy on Oxford-IIIT Pets (%). Zero to one shot: +'+RC.t2.zero_to_one+' points; one to two shots: +'+RC.t2.one_to_two+'; zero-shot CLIP is '+RC.t2.clip_minus_two_shot_human+' points above two-shot humans.'}),
  t12:()=>table('tbSmallO',[{h:'Dataset'}].concat(TB.t12.cols.map(h=>({h,num:1,f:f1}))),TB.t12.rows,{note:axa('A4.T12','Table 12')+': a ResNet-50 CLIP trained on 15M filtered YFCC100M pairs against an equally sized subset of WIT. Averages are close (65.5 against 66.6 linear, 29.6 against 30.0 zero-shot); specific datasets swing by over 10 points. YFCC100M is 3.7% of WIT (Appendix D).'}),
  t13:()=>table('tbSmallO',[{h:'Setting'},{h:'Model'}].concat(TB.t13.cols.map(h=>({h,num:1,f:f1}))),TB.t13.rows,{note:axa('A4.T13','Table 13')+': recall at 1, 5 and 10 for text retrieval (image to text) and image retrieval (text to image); MSCOCO is the 5k test set.',hl:r=>r[1]==='CLIP'}),
  t14:()=>table('tbSmallO',[{h:'Model'}].concat(TB.t14.cols.map(h=>({h,num:1,f:f1}))),TB.t14.rows,{note:axa('A5.T14','Table 14')+': OCR accuracy (Hateful Memes: ROC AUC on the dev set). Zero-shot MNIST 88.4 against 92.5 for logistic regression on raw pixels.',hl:r=>r[0]==='Zero-shot CLIP'}),
  t17:()=>table('tbSmallO',[{h:'Model'}].concat(TB.t17.cols.map(h=>({h,num:1,f:f1}))),TB.t17.rows,{note:axa('A5.T17','Table 17')+': % of IM2GPS images placed within each radius; CLIP by nearest neighbour over 1 million reference images.',hl:r=>r[0]==='CLIP'}),
  t8:()=>table('tbSmallO',[{h:'Model'}].concat(TB.t8.cols.map(h=>({h,num:1,f:f1}))),TB.t8.rows,{note:axa('S7.T8','Table 8')+': zero-shot top-1 identity accuracy on CelebA (%).'})};
segBind('tbSmallM',m=>SMALL[m]());SMALL.t2();
// ---------- hyperparameters ----------
(function(){const tp=RC.text_params,h18=TB.t18.rows.map(r=>r[0]+': '+r[1]).join(' · '),clean=v=>v;
  let h='<p class="small"><b>Common</b> ('+axa('A6','Table 18')+'): '+h18+'.</p><div id="tbH19"></div><div id="tbH20"></div>';
  h+='<p class="small"><b>Text encoder recounted</b> (12 layers, width 512, 8 heads, context 77, GPT-2-style blocks): '+fmt(tp.V49152)+' parameters with §2.4\'s 49,152 vocabulary and '+fmt(tp.V49408)+' with Table 18\'s 49,408; the paper says 63M. Both reproduce it independently; '+tp.how+'.</p>';
  $('tbHpO').innerHTML=h;
  table('tbH19',[{h:'ResNet'}].concat(TB.t19.cols.map(c=>({h:c}))),TB.t19.rows.map(r=>r.map(clean)),{note:axa('A6','Table 19')+': CLIP-ResNet hyperparameters.'});
  table('tbH20',[{h:'ViT'}].concat(TB.t20.cols.map(c=>({h:c}))),TB.t20.rows.map(r=>r.map(clean)),{note:axa('A6','Table 20')+': CLIP-ViT hyperparameters. The 336-pixel model is ViT-L/14 trained one more epoch at a learning rate of 2 × 10⁻⁵.'})})();
// ---------- checks ----------
(function(){const f5=RC.fig5.rows.filter(r=>!r.match&&Math.abs(r.delta-r.printed)>.15);
  $('tbChkO').innerHTML='<ul class="lst">'+
  '<li><b>Figure 5 against Tables 10 and 11:</b> '+RC.fig5.matches+' of 27 bars match; three more differ by 0.1 (rounding). '+f5.map(r=>r.d+': the tables give '+r.zs+' − '+r.rn50+' = '+r.delta+', the figure prints '+r.printed).join('; ')+'. The text quotes the figure (+7.7 on UCF101). The 16 wins reproduce.</li>'+
  '<li><b>Figure 8:</b> correlation '+RC.fig8.pearson+' against the printed 0.82; '+RC.fig8.within3.length+' datasets within 3 points against the printed 5.</li>'+
  '<li><b>Figure 10, all 27 datasets:</b> best-CLIP margin '+RC.fig10_all27.margin+' points against "5%".</li>'+
  '<li><b>Figure 11:</b> 21 of 27 against Noisy Student L2-475 reproduces; against L2-800 it is '+RC['fig11_L2-800'].wins+' with '+RC['fig11_L2-800'].ties+' tie.</li>'+
  '<li><b>ImageNet-A:</b> 77.1 in Figure 13, 77.2 in Table 16.</li>'+
  '<li><b>ObjectNet after adaptation:</b> −3.8 in §3.3, −6.1 from Table 16; reconciled by the 2.3-point gain from ObjectNet\'s own class names ('+RC.t16.objectnet_reconciled+').</li>'+
  '<li><b>Vocabulary:</b> 49,152 in §2.4, 49,408 in Table 18.</li>'+
  '<li><b>Table 9</b> lists Food-101 with '+RC.t9_food+' classes; Food-101 has 101.</li>'+
  '<li><b>aYahoo:</b> "a 95% reduction in the number of errors" computes to '+(100*RC.t1.ayahoo_error_cut).toFixed(1)+'%.</li>'+
  '<li><b>Appendix B</b> refers to "Table 22" for the zero-shot scores, which are Table 11.</li>'+
  '<li><b>Reproduce exactly:</b> Figure 7\'s mean ('+RC.fig7.mean+') and median ('+RC.fig7.median+'); Figure 2\'s arrows ('+RC.fig2.lm_to_bow+'× and '+RC.fig2.bow_to_con+'×); Figure 9\'s 44× ('+RC.fig9.range+'); 405 years ('+RC.images_seen.years_at_1_per_s+'); Figure 13\'s deltas; the 9.2-point ImageNet gain; 63M text parameters.</li></ul>'})();
})();
