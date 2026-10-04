// Agreement lab: every statistic on MT-Bench expert votes or HelpSteer2 ratings, with the coincidence matrix.
(function(){
const D=window.HE,S=window.HES;if(!D||!S)return;
const $=id=>document.getElementById(id);if(!$('la-ds'))return;
const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
let opt=0;
const PUB={helpfulness:[.465,.706,.791],correctness:[.472,.715,.793],coherence:[.169,.387,.428],complexity:[.293,.416,.427],verbosity:[.342,.536,.548]};
const band=a=>a>=.8?['reliable (≥ 0.800)',css('--good')]:a>=.667?['tentative (0.667 to 0.800)',css('--c5')]:['below Krippendorff\'s 0.667',css('--bad')];
function render(){
  const ds=$('la-ds').value,mt=ds==='t1'||ds==='t2';
  $('la-optl').textContent=mt?'Ties':'Responses';
  const bs=$('la-opt').querySelectorAll('button');bs[0].textContent=mt?'Counted':'All released ratings';bs[1].textContent=mt?'Dropped':'Paper\'s retention rule';
  bs.forEach(b=>b.classList.toggle('on',+b.dataset.v===opt));
  const r=mt?S.mtStats(ds,opt===1):S.hsStats(ds,opt===1?'kept':'all');
  const ord=!(mt&&opt===1);
  const L=mt?(opt===1?['A wins','B wins']:['A wins','Tie','B wins']):['0','1','2','3','4'];
  const A=ord?(mt?r.alpha_ordinal:r.alpha_interval):r.alpha_nominal,bd=band(A);
  const cells=[['Items',r.units.toLocaleString('en-US'),mt?'question and answer pair':'responses'],['Labels',Math.round(r.votes).toLocaleString('en-US'),(r.votes/r.units).toFixed(2)+' per item'],['Rater pairs',r.pairs.toLocaleString('en-US'),'same item'],
    ['Raw agreement',S.pct(r.po),'matching pairs'],...(r.within1!==undefined&&!mt?[['Within one point',S.pct(r.within1),'']]:[]),['Chance (pooled)',S.pct(r.pe),'two random labels match'],
    ['Fleiss kappa',S.n3(r.kappa_fleiss),''],['Alpha, nominal',S.n3(r.alpha_nominal),''],...(ord?[['Alpha, ordinal',S.n3(r.alpha_ordinal),mt?'tie halfway':''],['Alpha, interval',S.n3(r.alpha_interval),mt?'tie halfway':'squared distance']]:[]),['Gwet AC1',S.n3(r.ac1),'chance '+S.pct(r.pe_ac1)]];
  $('la-out').innerHTML=cells.map(k=>'<div class="stat"><div class="k">'+k[0]+'</div><div class="v">'+k[1]+'</div><div class="d">'+k[2]+'</div></div>').join('');
  const pal=mt?(opt===1?[css('--c1'),css('--c2')]:[css('--c1'),css('--dim'),css('--c2')]):['#8a5cb8','#b48ce0','#b8b8b0','#7fa7cf','#2f6fb5'];
  $('la-shares').innerHTML=r.shares.map((p,i)=>'<div class="row"><div class="nm">'+L[i]+'</div><div class="track"><div class="fill" style="width:'+(100*p).toFixed(1)+'%;background:'+pal[i]+'"></div></div><div class="val">'+S.pct(p)+'</div></div>').join('');
  const mx=Math.max(...r.co.flat());
  $('la-mx').innerHTML='<tr><th></th>'+L.map(l=>'<th>'+l+'</th>').join('')+'</tr>'+r.co.map((row,i)=>'<tr><th>'+L[i]+'</th>'+row.map((v,j)=>'<td style="background:color-mix(in srgb,'+(i===j?css('--good'):css('--bad'))+' '+Math.round(60*v/mx)+'%,transparent)">'+(v>=100?Math.round(v).toLocaleString('en-US'):v.toFixed(1))+'</td>').join('')+'</tr>').join('');
  let read='The headline alpha ('+(ord?(mt?'ordinal':'interval'):'nominal')+') is <b>'+S.n3(A)+'</b>: <span style="color:'+bd[1]+'">'+bd[0]+'</span>. ';
  if(mt){const o=S.mtStats(ds,opt!==1);read+=opt===0?'Dropping ties would raise raw agreement to '+S.pct(o.po)+' and nominal alpha to '+S.n3(o.alpha_nominal)+'.':'With ties counted, raw agreement is '+S.pct(o.po)+' and nominal alpha '+S.n3(o.alpha_nominal)+'.'}
  else{const o=S.hsStats(ds,opt===1?'all':'kept');read+=opt===0?'Keeping only responses whose helpfulness ratings are within 2 points (the paper\'s retention rule, '+o.units.toLocaleString('en-US')+' responses) gives interval alpha '+S.n3(o.alpha_interval)+'.':'On all released ratings ('+o.units.toLocaleString('en-US')+' responses) interval alpha is '+S.n3(o.alpha_interval)+': the filter, not the raters, made the difference.';
    if(r.shares[4]>.5)read+=' Over half the labels are a 4, so chance agreement is high and every chance-corrected statistic except AC1 is pulled down (prevalence).'}
  $('la-read').innerHTML=read;
  $('la-pub').innerHTML=mt?'Published: Zheng et al., Table 5, expert against expert: '+(ds==='t1'?'63% (721 pairs) with ties, 81% (479) without':'67% (707) with ties, 82% (474) without')+'. Reproduced exactly above. Kappa and alpha are not in the paper; computed here.':
    'Published: HelpSteer2, Table 1, quadratic weighted Cohen\'s kappa for '+ds+': '+PUB[ds].map(x=>x.toFixed(3)).join(', then ')+' (initial, after guideline fixes, after filtering). Not reproduced: the paper computed kappa over pairs of named raters who shared items, on its final 21,362 responses; the release has no rater identities, so this lab uses alpha, which needs none.';
}
$('la-ds').onchange=()=>{render()};
$('la-opt').querySelectorAll('button').forEach(b=>b.onclick=()=>{opt=+b.dataset.v;render()});
(window.TAB_RENDER=window.TAB_RENDER||{})['t-agree']=[render];
})();
