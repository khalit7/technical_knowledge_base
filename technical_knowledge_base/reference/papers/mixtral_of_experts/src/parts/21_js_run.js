// ---- Route text through a toy Mixtral: Section 5 of the paper repeated on held-out text ----
const RT=window.ROUTES,RDOM=['github','gutenberg','wikipedia','dm_math'],RDN={github:'Code',gutenberg:'Novels',wikipedia:'Wikipedia',dm_math:'Maths'};
const RDC={github:'var(--c1)',gutenberg:'var(--c2)',wikipedia:'var(--c3)',dm_math:'var(--c4)'};
const RVN={main:'aux loss 0.02',noaux:'no auxiliary loss'};
const pct=(v,d)=>(100*v).toFixed(d==null?1:d)+'%';
const ravg=a=>a.reduce((x,y)=>x+y,0)/a.length;
const RS={V:'main',D:'github',S:0,L:2,C:'e1',L2:0,Ch:'either',Rm:'first',sel:-1};
const rv=()=>RT[RS.V]||RT.main;
(function(){const m=RT.main,M=RT._meta;
  $('rvP').textContent=(m.params/1e6).toFixed(1)+' million';$('rvSteps').textContent=fmt(M.cfg.steps);
  $('rvTokN').textContent=fmt(m.tokens.github);$('rvWin').textContent=String(m.windows.github);
  if(!RT.noaux){const b=$('rvV').querySelector('[data-m=noaux]');if(b)b.disabled=true}})();
function rvSeg(id,key,after){const el=$(id);el.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{if(b.disabled)return;
  el.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
  RS[key]=(key==='S'||key==='L'||key==='L2')?+b.dataset.m:b.dataset.m;(after||rvAll)()}))}

// 1. Figure 8 rebuilt
function rvText(){const s=rv().samples[RS.D][RS.S],l=RS.L,code=s[RS.C][l];let h='';
  s.t.forEach((t,i)=>{const e=+code[i];const vis=t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    h+='<span data-i="'+i+'" style="background:'+EXB[e]+';border-bottom-color:'+EXC[e]+'"'+(i===RS.sel?' class="sel"':'')+' title="E'+e+'">'+(vis===''?'&#8203;':vis)+'</span>'});
  $('rvTxt').innerHTML=h;
  const cnt=[0,0,0,0,0,0,0,0];for(const c of code)cnt[+c]++;
  $('rvKey').innerHTML=cnt.map((n,e)=>'<span><i style="background:'+EXC[e]+'"></i>E'+e+' '+n+'</span>').join('');
  const e1=s.e1[l];let rep=0;for(let i=0;i+1<e1.length;i++)rep+=e1[i]===e1[i+1];
  $('rvStat').innerHTML='This snippet, layer '+l+', '+RVN[RS.V]+': '+s.t.length+' tokens; '+rep+' of '+(e1.length-1)+' consecutive pairs ('+pct(rep/(e1.length-1),0)+') keep the same first-choice expert (uniform random: 12.5%). Held-out text, never seen in training. Numbers in the key count tokens per '+(RS.C==='e1'?'first':'second')+'-choice expert.';
  rvTok()}
function rvTok(){const s=rv().samples[RS.D][RS.S],i=RS.sel;if(i<0||i>=s.t.length){$('rvTok').textContent='Tap a token to see its two experts and gate weights at every layer.';return}
  const t=JSON.stringify(s.t[i]).replace(/</g,'&lt;');let h='<b>Token '+t+'</b>: ';
  h+=[0,1,2,3].map(l=>{const d=+s.w1[l][i],w=0.5+(d+.5)/20;return 'layer '+l+' <span style="color:'+EXC[+s.e1[l][i]]+'">E'+s.e1[l][i]+'</span> ≈'+w.toFixed(2)+' + <span style="color:'+EXC[+s.e2[l][i]]+'">E'+s.e2[l][i]+'</span> ≈'+(1-w).toFixed(2)}).join('; ');
  $('rvTok').innerHTML=h+'<div class="small mute">Gate weights are the softmax over the two kept logits, stored to the nearest 0.05.</div>'}
$('rvTxt').addEventListener('click',e=>{const sp=e.target.closest('span[data-i]');if(!sp)return;RS.sel=+sp.dataset.i;
  $('rvTxt').querySelectorAll('span.sel').forEach(x=>x.classList.remove('sel'));sp.classList.add('sel');rvTok()});

// 2. Figure 7 rebuilt
function rvDist(){fit($('rvDist'),W=>{const r=rv(),l=RS.L2,ch=RS.Ch,H=W<520?230:250,pl=40,pr=8,pt=30,pb=40;
  const mx=Math.max(.25,...RDOM.map(d=>Math.max(...r.dist[d][l][ch])));const top=Math.ceil(mx*10)/10;
  const f=frame({W,H,x:[0,8],y:[0,top],pl,pr,pt,pb,yt:[...Array(Math.round(top*10)+1).keys()].map(i=>[i/10,(i*10)+'%']),xl:'expert',yl:'share of selections'});
  let s=f.s+tx(0,14,W<560?'Expert use, layer '+l+', '+(ch==='either'?'either choice':ch):'Expert use per domain, layer '+l+', '+(ch==='either'?'first or second choice':ch+' choice')+' ('+RVN[RS.V]+')',{fs:12,w:600});
  const gw=(f.sx(1)-f.sx(0)),bw=Math.max(2,(gw-6)/4);
  for(let e=0;e<8;e++){RDOM.forEach((d,j)=>{const v=r.dist[d][l][ch][e],x=f.sx(e)+3+j*bw;s+=rc(x,f.sy(v),bw-1,f.sy(0)-f.sy(v),RDC[d],{r:1})});
    s+=tx(f.sx(e)+gw/2,H-pb+15,'E'+e,{fs:11,a:'middle',c:EXC[e]})}
  s+=ln2(pl,f.sy(1/8),W-pr,f.sy(1/8),'var(--mute)',{da:'4 3'})+tx(W-pr-2,f.sy(1/8)-4,'1/8',{fs:11,a:'end',c:'var(--mute)'});
  const lg=legend(RDOM.map(d=>[RDN[d],RDC[d]]),pl,H+18,W-pl);
  $('rvDist').innerHTML=svgW(W,H+lg.h+12,s+lg.s,'Expert use per domain')});
  const r=rv(),l=RS.L2;let h='<div class="tw"><table class="cmp"><thead><tr><th>Layer '+l+'</th>'+RDOM.map(d=>'<th class="num">'+RDN[d]+'</th>').join('')+'</tr></thead><tbody>';
  h+='<tr><td>From the average</td>'+RDOM.map(d=>'<td class="num">'+r.tv[l][d].toFixed(2)+'</td>').join('')+'</tr>';
  h+='<tr><td>Noise floor (half against half)</td>'+RDOM.map(d=>'<td class="num">'+r.tvself[l][d].toFixed(2)+'</td>').join('')+'</tr>';
  RDOM.forEach((a,i)=>{h+='<tr><td>From '+RDN[a]+'</td>'+RDOM.map((b,j)=>'<td class="num">'+(i===j?'':r.tvpair[l][i][j].toFixed(2))+'</td>').join('')+'</tr>'});
  h+='</tbody></table></div><p class="small mute">Total variation distance between two expert distributions (either choice): half the sum of absolute differences, 0 when identical, 1 when they share no expert. Noise floor: the domain\'s even windows against its odd windows. Mixtral, for comparison: the largest distance of any non-maths Pile subset from the average is '+RC.fig7_tv.map(t=>Math.max(...Object.entries(t.tv).filter(([k])=>k!=='DM Mathematics').map(([,v])=>v)).toFixed(2)).join(', ')+' at layers 0, 15, 31, and DM Mathematics '+RC.fig7_tv.map(t=>t.tv['DM Mathematics'].toFixed(2)).join(', ')+'. The paper prints no such number; the Mixtral row comes from decoding its vector @F7@ (tables tab).</p>';
  $('rvTV').innerHTML=h.replace('@F7@','<a href="'+window.PAPER.meta.ax+'#S5.F7" target="_blank" rel="noopener noreferrer">Figure 7</a>')}

// 3. Table 5 rebuilt, with controls
function rvRep(){fit($('rvRep'),W=>{const r=rv(),m=RS.Rm,narrow=W<560,lw=narrow?0:86,pl=lw+8,pr=46,rh=narrow?26:18,gh=narrow?18:16;
  const base=m==='first'?1/8:RC.t5_either_random,hi=1;const X=v=>pl+(W-pl-pr)*v/hi;let y=24,s=tx(0,14,(m==='first'?'Same first choice':'First or second overlap')+(narrow?', consecutive tokens':' for consecutive tokens ('+RVN[RS.V]+')'),{fs:12,w:600});
  for(let l=0;l<4;l++){s+=tx(0,y+12,'Layer '+l+(l===0?' (first)':l===3?' (last)':''),{fs:12,w:600});y+=gh;
    RDOM.forEach(d=>{const q=r.rep[d][l],v=q[m],sh=q[m+'_shuf'],dt=q[m+'_difftok'];const by=narrow?y+13:y+3;
      if(narrow)s+=tx(0,y+10,RDN[d],{fs:11});else s+=tx(lw,y+13,RDN[d],{fs:11,a:'end'});
      s+=rc(pl,by,X(v)-pl,9,RDC[d],{r:2})+ln2(X(sh),by-3,X(sh),by+12,'var(--ink)',{sw:2})+ln2(X(dt),by-2,X(dt),by+11,'var(--mute)',{sw:1.5,da:'2 2'});
      s+=tx(X(Math.max(v,sh))+4,by+9,pct(v,0),{fs:11});y+=rh});y+=4}
  s+=ln2(X(base),20,X(base),y,'var(--mute)',{da:'4 3'})+tx(X(base)+3,y+12,'uniform random '+pct(base,1),{fs:11,c:'var(--mute)'});
  for(let t=0;t<=1.001;t+=.25)s+=tx(X(t),y+26,(t*100).toFixed(0)+'%',{fs:11,a:'middle',c:'var(--mute)'});
  $('rvRep').innerHTML=svgW(W,y+32,s,'Repeat rates')});
  const r=rv(),m=RS.Rm,ex=[1,2,3].map(l=>ravg(['github','gutenberg','wikipedia'].map(d=>r.rep[d][l][m]-r.rep[d][l][m+'_shuf'])));
  $('rvRepNote').innerHTML='Bar: measured. Solid tick: shuffled order (same tokens, same routing, positions scrambled). Dotted tick: pairs of different tokens only. For the three natural-text domains at layers 1 to 3, position adds '+ex.map(v=>(v>=0?'+':'')+(100*v).toFixed(1)).join(', ')+' points over the shuffled baseline; the rest of the excess over uniform comes from some experts being used more than others. Mixtral\'s Table 5 at layers 0, 15, 31 ('+(m==='first'?'first choice':'first or second')+'): '+(m==='first'?RC.t5_range_l0.join(' to ')+'%, '+RC.t5_range_l15.join(' to ')+'%, '+RC.t5_range_l31.join(' to ')+'%':RC.t5_range_e0.join(' to ')+'%, '+RC.t5_range_e15.join(' to ')+'%, '+RC.t5_range_e31.join(' to ')+'%')+'; the paper reports no shuffled baseline, so how much of its excess is position cannot be told.'}

// 4. token against domain
function rvPred(){fit($('rvPred'),W=>{const r=rv(),H=W<520?210:220,pl=40,pr=8,pt=30,pb=40;const f=frame({W,H,x:[0,4],y:[0,1],pl,pr,pt,pb,yt:[[0,'0%'],[.25,'25%'],[.5,'50%'],[.75,'75%'],[1,'100%']],xl:'layer',yl:'first expert guessed right'});
  let s=f.s+tx(0,14,W<560?'Guessing the first expert':'Predicting each held-out token\'s first expert ('+RVN[RS.V]+')',{fs:12,w:600});const K=[['token','from the token','var(--acc)'],['domain','from the domain','var(--c2)'],['none','from nothing','var(--dim)']];
  const gw=f.sx(1)-f.sx(0),bw=(gw-12)/3;
  r.pred.forEach((p,l)=>{K.forEach(([k],j)=>{const x=f.sx(l)+6+j*bw;s+=rc(x,f.sy(p[k]),bw-2,f.sy(0)-f.sy(p[k]),K[j][2],{r:2});s+=tx(x+bw/2-1,f.sy(p[k])-3,(100*p[k]).toFixed(0),{fs:11,a:'middle'})});
    s+=tx(f.sx(l)+gw/2,H-pb+15,String(l),{fs:11,a:'middle',c:'var(--mute)'})});
  const lg=legend(K.map(k=>[k[1],k[2]]),pl,H+18,W-pl);$('rvPred').innerHTML=svgW(W,H+lg.h+12,s+lg.s,'Prediction accuracy')});
  const r=rv(),l=RS.L2,c=r.cross[l];let h='<p class="small">Tokens frequent (20 or more times) in at least three domains: at layer '+l+' (set in panel 2), '+c.agree+' of '+c.tokens+' get the same most-common first expert in every domain where they are frequent. The most frequent:</p><div class="tw"><table class="cmp"><thead><tr><th>Token</th>'+RDOM.map(d=>'<th class="num">'+RDN[d]+'</th>').join('')+'</tr></thead><tbody>';
  c.top.slice(0,8).forEach(x=>{h+='<tr><td class="mono">'+JSON.stringify(x.t).replace(/</g,'&lt;')+'</td>'+RDOM.map(d=>x.modes[d]==null?'<td class="num mute">rare</td>':'<td class="num" style="color:'+EXC[x.modes[d]]+'">E'+x.modes[d]+'</td>').join('')+'</tr>'});
  $('rvCross').innerHTML=h+'</tbody></table></div>'}

// 5. training curves and the verdict on reproduction
function rvTrain(){fit($('rvCurve'),W=>{const H=W<520?200:210,vs=['main','noaux'].filter(v=>RT[v]),cs={main:'var(--acc)',noaux:'var(--c2)'};
  const S=RT._meta.cfg.steps,f=frame({W,H,x:[0,S],y:[2,8],pl:40,pb:40,pt:28,xt:[0,600,1200,1800].filter(x=>x<=S).map(x=>[x,fmt(x)]),yt:[[2,'2'],[4,'4'],[6,'6'],[8,'8']],xl:'training step',yl:'train loss (nats)'});
  let s=f.s+tx(0,14,W<560?'Training loss, from the logs':'Training loss from the logs, every 25 steps (mixed batch of 4 domains)',{fs:12,w:600});
  vs.forEach(v=>{s+=path(RT[v].curve.map(([a,b])=>[f.sx(a),f.sy(Math.min(8,b))]),cs[v],{sw:1.6})});
  const lg=legend(vs.map(v=>[RVN[v],cs[v]]),40,H+18,W-40);$('rvCurve').innerHTML=svgW(W,H+lg.h+12,s+lg.s,'Training curves')});
  const vs=['main','noaux'].filter(v=>RT[v]);let h='<div class="tw"><table class="cmp"><thead><tr><th>Held-out loss (nats per token)</th>'+RDOM.map(d=>'<th class="num">'+RDN[d]+'</th>').join('')+'</tr></thead><tbody>';
  vs.forEach(v=>{const e=RT[v].evals[RT[v].evals.length-1];h+='<tr><td>'+RVN[v]+', step '+e[0]+'</td>'+RDOM.map(d=>'<td class="num">'+e[1][d].toFixed(2)+'</td>').join('')+'</tr>'});
  h+='<tr><td>Guessing uniformly over the 2,048-token vocabulary</td>'+RDOM.map(()=>'<td class="num">'+Math.log(2048).toFixed(2)+'</td>').join('')+'</tr></tbody></table></div>';
  $('rvRepro').innerHTML=h+rvVerdict()}
function rvVerdict(){const m=RT.main,a=ravg,L=[0,1,2,3];
  const tok=a(m.pred.map(p=>p.token)),dom=a(m.pred.map(p=>p.domain));
  const tvd=L.map(l=>RDOM.map(d=>m.tv[l][d])),most=L.map(l=>RDOM[tvd[l].indexOf(Math.max(...tvd[l]))]);
  const prose=L.map(l=>m.tvpair[l][1][2]),noise=a(L.map(l=>a(RDOM.map(d=>m.tvself[l][d])))),code=L.map(l=>a([m.tvpair[l][0][1],m.tvpair[l][0][2]]));
  const ex=L.map(l=>a(['github','gutenberg','wikipedia'].map(d=>m.rep[d][l].first-m.rep[d][l].first_shuf)));
  const l0=a(['github','gutenberg','wikipedia'].map(d=>m.rep[d][0].first));
  const box=(c,t,b)=>'<div class="rcbox rc-'+c+'"><b>'+t+'</b> '+b+'</div>';
  let h='<h3>What reproduces, and what does not</h3><p class="small mute">Judged on the variant with the auxiliary loss; switch the variant at the top of the tab to see the same panels without it.</p>';
  h+=box(tok>dom+.1?'yes':'part','Token beats topic: reproduces.','Knowing the token predicts the first-choice expert '+pct(tok,0)+' of the time on average over the four layers; knowing the domain, '+pct(dom,0)+'. This is the paper\'s "structured syntactic behavior", measured.');
  h+=box(most[0]==='dm_math'?'yes':'no','The synthetic maths domain differs most at the first layer: '+(most[0]==='dm_math'?'reproduces.':'does not reproduce.'),'Its distance from the average at layer 0 is '+m.tv[0].dm_math.toFixed(2)+', the largest of the four domains; at the last layer the largest is '+RDN[most[3]]+' ('+Math.max(...tvd[3]).toFixed(2)+', maths '+m.tv[3].dm_math.toFixed(2)+'). In Mixtral (decoded Figure 7) DM Mathematics is the most distinct subset at all three layers, '+RC.fig7_tv.map(t=>t.tv['DM Mathematics'].toFixed(2)).join(', ')+' at layers 0, 15, 31; the paper attributes it to its synthetic, narrow text.');
  const pmax=Math.max(...prose);h+=box(pmax<3*noise?'yes':'no','"Nearly identical across domains": '+(pmax<3*noise?'reproduces.':'does not reproduce in the toy; the two English-prose domains are the closest pair.'),'Novels against Wikipedia, different topics in the same kind of text, are '+L.map(l=>prose[l].toFixed(2)).join(', ')+' apart at layers 0 to 3; code against prose '+L.map(l=>code[l].toFixed(2)).join(', ')+' (noise floor about '+noise.toFixed(2)+'). The toy\'s domains differ in format (code, prose, one-line arithmetic), not only in topic, and '+(a(L.map(l=>m.cross[l].share))<.5?'the same token often gets a different expert in code than in prose':'shared tokens mostly keep their expert across domains')+' (panel 4 table: '+L.map(l=>m.cross[l].agree+' of '+m.cross[l].tokens).join(', ')+' shared tokens agree at layers 0 to 3). Mixtral\'s own subsets, GitHub included, sit within '+Math.max(...RC.fig7_tv.map(t=>Math.max(...Object.entries(t.tv).filter(([k])=>k!=='DM Mathematics').map(([,v])=>v)))).toFixed(2)+' of their average (decoded Figure 7): a big model trained on far more varied data shares its experts across formats in a way this toy does not.');
  h+=box(a(ex.slice(1))>0.01?'part':'no','Positional locality: '+(a(ex.slice(1))>0.01?'a small effect, smaller than it looks.':'not found.'),'Consecutive tokens share their first expert well above 12.5% at every layer, but the shuffled baseline is already high, because the toy uses its experts unevenly; position itself adds '+ex.slice(1).map(v=>(100*v).toFixed(1)).join(', ')+' points at layers 1 to 3. Unlike Mixtral, the toy\'s first layer is not near random ('+pct(l0,0)+' on natural text), since its first-layer use is far from uniform.');
  if(RT.noaux){const n=RT.noaux,le=e=>e[e.length-1][1],lm=le(m.evals),ln=le(n.evals);
    h+=box('part','What the auxiliary loss changes.','Without it the router concentrates: at layer 0 the single most used expert takes '+pct(n.pred[0].none,0)+' of first choices (against '+pct(m.pred[0].none,0)+' with the loss), and consecutive repeats rise with it, which is the uneven-use effect the shuffled baseline measures. Token still predicts the expert better than domain at every layer ('+n.pred.map(p=>pct(p.token,0)+' against '+pct(p.domain,0)).join('; ')+'). Held-out loss is '+RDOM.map(d=>(ln[d]-lm[d]>=0?'+':'−')+Math.abs(ln[d]-lm[d]).toFixed(2)).join(', ')+' nats without the loss (code, novels, Wikipedia, maths), so at this scale balancing costs a little quality and buys even use, which is what expert parallelism needs.');}
  h+=box('part','Caveats.','One seed per variant; a 4-layer model trained for '+Math.round((m.sec||0)/60)+' minutes on 4.8 MB of text, about '+Math.round(RT._meta.cfg.steps*RT._meta.cfg.batch*RT._meta.cfg.ctx/RT._meta.train_tokens)+' passes over its '+(RT._meta.train_tokens/1e6).toFixed(1)+' million training tokens ('+(m.evals.every((e,i)=>i===0||RDOM.every(d=>e[1][d]<m.evals[i-1][1][d]))?'its held-out loss fell at every checkpoint, so it was still learning, not memorising':'its held-out loss did not fall at every checkpoint')+'); four domains instead of The Pile\'s 22. The toy can show what a top-2 router tends to learn; it cannot tell how Mixtral\'s 32-layer router behaves.');
  return h}
function rvAll(){rvText();rvDist();rvRep();rvPred();rvTrain()}
rvSeg('rvV','V');rvSeg('rvD','D',()=>{RS.sel=-1;rvText()});rvSeg('rvS','S',()=>{RS.sel=-1;rvText()});rvSeg('rvL','L',rvText);rvSeg('rvC','C',rvText);
rvSeg('rvL2','L2',()=>{rvDist();rvPred()});rvSeg('rvCh','Ch',rvDist);rvSeg('rvRm','Rm',rvRep);
onTab('t-run',rvAll);
