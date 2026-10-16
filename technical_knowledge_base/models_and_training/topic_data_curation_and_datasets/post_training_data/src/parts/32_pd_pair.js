// ---- Pair inspector (tab t-pdpair) ----
(function(){
const P=window.PD,E=RD.esc,$=id=>document.getElementById(id),{f0,pc}=window.PDU;const PR=P.pref;
let key=PR.order[0],i=0,onlyRL=false;
function bars(el,rows,mx){mx=mx||Math.max(...rows.map(r=>r[1]),1e-9);el.innerHTML=rows.map(r=>'<div><span class="nm" title="'+E(r[0])+'">'+E(r[0])+'</span><span class="tr"><span style="width:'+(100*r[1]/mx).toFixed(2)+'%;background:'+(r[2]||'var(--acc)')+'"></span></span><span class="v">'+(r[3]!=null?r[3]:f0(r[1]))+'</span></div>').join('')}
$('pp-set').innerHTML=PR.order.map(k=>'<option value="'+k+'">'+E(PR.label[k])+'</option>').join('');
function hist(){const s=PR.sets[key],el=$('pp-hist');const h=s.ratio_hist,w=RD.width(el),H=150,L=6,B=22;const mx=Math.max(...h);const bw=(w-2*L)/h.length;let g='';
  h.forEach((v,j)=>{const x=L+j*bw,hh=(H-B-8)*v/mx;g+='<rect x="'+x.toFixed(1)+'" y="'+(H-B-hh).toFixed(1)+'" width="'+Math.max(1,bw-1).toFixed(1)+'" height="'+hh.toFixed(1)+'" fill="'+(j>=h.length/2?'var(--c2)':'var(--c1)')+'"><title>'+f0(v)+' pairs</title></rect>'});
  const mid=L+(w-2*L)/2;g+='<line x1="'+mid+'" x2="'+mid+'" y1="4" y2="'+(H-B)+'" stroke="var(--ink)" stroke-dasharray="3 3"/>';
  [-4,-2,0,2,4].forEach(t=>{const x=L+(w-2*L)*(t+4)/8;g+=RD.t(x,H-6,(t>0?'+':'')+t,{a:'middle',fs:10,fill:'var(--mute)'})});
  el.innerHTML=RD.svg(w,H,g,'Histogram of length ratios')}
function stats(){const s=PR.sets[key];const S=[RD.stat('Pairs',f0(s.n)),RD.stat('Chosen is longer',pc(s.chosen_longer_share,1,1),f0(s.chosen_longer)+' of '+f0(s.diff)),RD.stat('Identical texts',f0(s.identical)),RD.stat('Median tokens, chosen / rejected',f0(s.chosen_tok['0.5'])+' / '+f0(s.rejected_tok['0.5']))];
  if(s.ratings)S.push(RD.stat('Ties (equal ratings)',f0(s.ratings.ties),'of '+f0(s.ratings.n)+'; median margin '+(+s.ratings.margin['0.5']).toFixed(2)));
  if(s.same_model!=null)S.push(RD.stat('Same model wrote both',f0(s.same_model)));
  $('pp-stats').innerHTML=S.join('');
  bars($('pp-gap'),s.by_gap.map(b=>[(b[1]>50?b[0]+' and more':b[0]+' to '+b[1])+' ('+f0(b[2])+')',b[2]?b[3]/b[2]:0,b[2]&&b[3]/b[2]>0.5?'var(--c2)':'var(--c1)',b[2]?pc(b[3],b[2],0):'n/a']),1);
  let h='';if(s.by_source){h+='<h3>By subset</h3><div class="rd-bars" id="pp-bs"></div>'}
  if(s.cm){h+='<div class="rd-two" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:12px"><div><h3>Chosen answers written by</h3><div class="rd-bars" id="pp-cm"></div></div><div><h3>Rejected answers written by</h3><div class="rd-bars" id="pp-rm"></div></div></div>'}
  $('pp-src').innerHTML=h;
  if(s.by_source)bars($('pp-bs'),Object.entries(s.by_source).map(([k,v])=>[k.split('/').pop()+' ('+f0(v.n)+')',v.diff?v.chosen_longer/v.diff:0,v.diff&&v.chosen_longer/v.diff>0.5?'var(--c2)':'var(--c1)','longer '+(v.diff?pc(v.chosen_longer,v.diff,0):'n/a')]),1);
  if(s.cm){bars($('pp-cm'),s.cm.slice(0,8),null);bars($('pp-rm'),s.rm.slice(0,8),null)}}
function pairs(){const all=PR.examples[key]||[];return onlyRL?all.filter(e=>e.lr>e.lc):all}
function show(){const L=pairs();if(!L.length){$('pp-prompt').textContent='No pair in the sample matches.';$('pp-c').innerHTML='';$('pp-r').innerHTML='';$('pp-pos').textContent='';return}
  i=(i+L.length)%L.length;const e=L[i];$('pp-pos').textContent='Pair '+(i+1)+' of '+L.length;
  $('pp-prompt').textContent=e.prompt;
  const sc=v=>v==null?'':' rating '+(+v).toFixed(2);
  $('pp-c').innerHTML='<div class="h"><b style="color:var(--good)">chosen</b><span>'+f0(e.lc)+' tokens</span><span>'+sc(e.sc)+'</span><span>'+E(e.cm||'')+'</span><span>'+E(e.source||'')+'</span></div><div class="t">'+E(e.chosen)+'</div>';
  $('pp-r').innerHTML='<div class="h"><b style="color:var(--bad)">rejected</b><span>'+f0(e.lr)+' tokens</span><span>'+sc(e.sr)+'</span><span>'+E(e.rm||'')+'</span></div><div class="t">'+E(e.rejected)+'</div>'}
function rules(){const r=PR.ub.rule_stats;const nm={h4:'overall_score + random other (H4 card)',argilla:'mean of aspects + random lower (Argilla, Tulu 3)',maxmin:'best mean against worst mean',all_pairs:'every pair with different means'};
  $('pp-rules').innerHTML='<table><thead><tr><th>Rule</th><th class="num">Pairs</th><th class="num">Ties</th><th class="num">Chosen is longer</th><th class="num">Median margin</th></tr></thead><tbody>'+Object.keys(nm).map(k=>{const v=r[k];return '<tr><td>'+nm[k]+'</td><td class="num">'+f0(v.n)+'</td><td class="num">'+f0(v.ties)+'</td><td class="num">'+pc(v.chosen_longer,v.diff,0)+'</td><td class="num">'+(+v.margin['0.5']).toFixed(2)+'</td></tr>'}).join('')+'</tbody></table><p class="small">Same chosen answer under the first two rules: '+f0(r.same_chosen_h4_argilla[0])+' of '+f0(r.same_chosen_h4_argilla[1])+' prompts ('+pc(r.same_chosen_h4_argilla[0],r.same_chosen_h4_argilla[1],0)+').</p>'}
function render(){stats();hist();show()}
$('pp-set').addEventListener('change',e=>{key=e.target.value;i=0;render()});
$('pp-prev').addEventListener('click',()=>{i--;show()});$('pp-next').addEventListener('click',()=>{i++;show()});
$('pp-rl').addEventListener('change',e=>{onlyRL=e.target.checked;i=0;show()});
(window.TAB_RENDER=window.TAB_RENDER||{})['t-pdpair']=[render];
rules();render();
})();
