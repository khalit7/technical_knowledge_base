// Reading animation: one set of labels scored as raw agreement, then chance-corrected (Fleiss), then Krippendorff's alpha.
// Modes: MT-Bench turn-1 expert votes with ties counted; the same votes with ties dropped; HelpSteer2 coherence (370-item sample drawn, statistics on all 23,652).
(function(){
const D=window.HE,S=window.HES;if(!D||!S)return;
const $=id=>document.getElementById(id);if(!$('ag'))return;
const N=6;let step=0,mode=0,playing=false,timer=null,onScreen=true;
const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const MT=D.agree.mtb.t1.map(s=>[...s].map(ch=>S.MTC.indexOf(ch)));// 0 A, 1 T, 2 B
const HS=S.hsUnits('coherence');
const ST=[S.mtStats('t1',false),S.mtStats('t1',true),S.hsStats('coherence','all')];
const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
function col(m,c){if(m<2)return[css('--c1'),css('--dim'),css('--c2')][c];
  return['#8a5cb8','#b48ce0','#b8b8b0','#7fa7cf','#2f6fb5'][c]}
const LAB=m=>m<2?['A wins','Tie','B wins']:['0','1','2','3','4'];
function units(){return mode<2?MT:HS}
function drawGrid(){
  const host=$('ag-grid'),W=Math.max(280,host.clientWidth||600),U=units();
  const sq=W<520?4:5,gap=1,uw=sq+3,maxm=6,uh=maxm*(sq+gap)+7,cols=Math.floor(W/uw),rows=Math.ceil(U.length/cols),H=rows*uh;
  let s='<svg width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+U.length+' items, one column of squares per item">';
  U.forEach((u,i)=>{const x=(i%cols)*uw,y0=Math.floor(i/cols)*uh;
    const live=mode===1?u.filter(c=>c!==1):u;const dead=mode===1&&live.length<2;
    // agreement marker under the column (from step 1)
    if(step>=1&&!dead){let a=0,p=0;for(let x1=0;x1<live.length;x1++)for(let x2=x1+1;x2<live.length;x2++){p++;if(live[x1]===live[x2])a++}
      const f=a/p,c=f===1?css('--good'):f===0?css('--bad'):css('--c5');s+='<rect x="'+x+'" y="'+(y0+maxm*(sq+gap)+1)+'" width="'+sq+'" height="3" fill="'+c+'"/>'}
    u.forEach((c,j)=>{const y=y0+(maxm-1-j)*(sq+gap);const faded=dead||(mode===1&&c===1);
      s+='<rect x="'+x+'" y="'+y+'" width="'+sq+'" height="'+sq+'" fill="'+(faded?'none':col(mode,c))+'"'+(faded?' stroke="'+css('--dim')+'" stroke-width="0.8"':'')+'/>'})});
  host.innerHTML=s+'</svg>';
  const L=LAB(mode);$('ag-leg').innerHTML=L.map((t,c)=>'<span><i style="background:'+col(mode,c)+'"></i>'+t+'</span>').join('')+
    (step>=1?'<span><i style="background:'+css('--good')+'"></i>every pair agrees</span><span><i style="background:'+css('--c5')+'"></i>some pairs</span><span><i style="background:'+css('--bad')+'"></i>none</span>':'')+
    (mode===1?'<span><i style="border:1px solid '+css('--dim')+';background:none"></i>dropped</span>':'');
}
function bars(rows){return '<div class="bars">'+rows.map(r=>'<div class="row"><div class="nm">'+r[0]+'</div><div class="track"><div class="fill" style="width:'+(100*Math.max(0,r[1])).toFixed(1)+'%;background:'+r[2]+'"></div></div><div class="val">'+r[3]+'</div></div>').join('')+'</div>'}
function drawSide(){
  const r=ST[mode],L=LAB(mode),k=r.shares.length,cats=mode===1?[0,2]:[...Array(k).keys()];
  let h='';
  if(step===2){h='<div class="small mute">Pooled label shares; chance that two labels drawn at random match = sum of squared shares</div>'+
    bars(r.shares.map((p,i)=>[L[mode===1?(i?2:0):i],p,col(mode,mode===1?(i?2:0):i),S.pct(p)]))+bars([['Chance match',r.pe,css('--mute'),S.pct(r.pe)]])}
  if(step===3){h='<div class="small mute">The same agreement, on two scales</div>'+bars([['Raw agreement',r.po,css('--acc'),S.pct(r.po)],['Above chance',r.kappa_fleiss,css('--good'),r.kappa_fleiss.toFixed(3)]])+
    '<p class="kfm">κ = ('+r.po.toFixed(3)+' − '+r.pe.toFixed(3)+') / (1 − '+r.pe.toFixed(3)+') = '+r.kappa_fleiss.toFixed(3)+'</p>'}
  if(step>=4){const co=r.co,mx=Math.max(...co.flat());
    h='<div class="small mute">Coincidence matrix: how often a row label met a column label on the same item (each item\'s pairs weighted 1/(m − 1))</div><div class="tw"><table class="mx"><tr><th></th>'+cats.map(c=>'<th>'+L[c]+'</th>').join('')+'</tr>'+
      co.map((row,i)=>'<tr><th>'+L[cats[i]]+'</th>'+row.map((v,j)=>'<td style="background:color-mix(in srgb,'+(i===j?css('--good'):css('--bad'))+' '+Math.round(60*v/mx)+'%,transparent)">'+v.toFixed(1)+'</td>').join('')+'</tr>').join('')+'</table></div>'+
      '<p class="kfm">α = 1 − D<sub>o</sub>/D<sub>e</sub> = 1 − '+r.Do_nom.toFixed(3)+' / '+r.De_nom.toFixed(3)+' = '+r.alpha_nominal.toFixed(3)+'</p>';
    if(step===5){h+=mode===1?'<p class="small">With two labels there is no order to use: nominal alpha is the only alpha.</p>':
      bars([['Nominal',r.alpha_nominal,css('--c4'),r.alpha_nominal.toFixed(3)],['Ordinal',r.alpha_ordinal,css('--c4'),r.alpha_ordinal.toFixed(3)],['Interval',r.alpha_interval,css('--c4'),r.alpha_interval.toFixed(3)],['Gwet AC1',r.ac1,css('--c6'),r.ac1.toFixed(3)]])}}
  $('ag-side').innerHTML=h;
}
function caption(){
  const r=ST[mode],t0=ST[0],nm=['MT-Bench, turn 1: '+r.units+' items (a question and a pair of answers) each voted on by 2 to 6 graduate-student experts, '+t0.votes.toFixed(0)+' votes in all.',
    'The same votes with every tie removed: '+r.units+' items keep at least two decisive votes. Ties are drawn hollow.',
    'HelpSteer2 coherence: each response rated 0 to 4 by 2 to 6 raters. 370 responses drawn here at random; every number is computed on all '+r.units+'.'][mode];
  const cap=[
    nm+' Each column is an item, each square one label.',
    'Raw agreement: of the '+r.pairs+' pairs of raters who labelled the same item, '+S.pct(r.po)+' gave the same label. The bar under each item is green if every pair agreed, red if none did.'+(mode===1?' Dropping ties lifts this from '+S.pct(t0.po)+'.':''),
    'Chance: pool all labels. Two drawn at random match '+S.pct(r.pe)+' of the time'+(mode===2?', mostly because '+S.pct(r.shares[4])+' of all labels are a 4.':'.')+(mode===1?' With two labels left, chance is close to a half.':''),
    'Chance-corrected (Fleiss): how far raw agreement got from chance towards perfect. '+S.pct(r.po)+' raw becomes '+r.kappa_fleiss.toFixed(3)+'.'+(mode===2?' The highest raw agreement of HelpSteer2\'s five attributes, and the lowest chance-corrected value.':''),
    'Krippendorff\'s alpha uses the same idea through a coincidence matrix, weighting items with many raters no more than items with two, and correcting chance for sample size: '+r.alpha_nominal.toFixed(3)+'.',
    mode===0?'Order: a tie is half-way between "A wins" and "B wins", so a tie against a win is a smaller disagreement than two opposite wins. Ordinal alpha '+r.alpha_ordinal.toFixed(3)+'. Switch to "ties dropped": raw agreement jumps to '+S.pct(ST[1].po)+' but alpha only to '+ST[1].alpha_nominal.toFixed(3)+'.':
    mode===1?'Ties dropped: raw '+S.pct(t0.po)+' becomes '+S.pct(r.po)+' (Zheng et al.\'s 63% and 81%), alpha '+t0.alpha_nominal.toFixed(3)+' becomes '+r.alpha_nominal.toFixed(3)+'. Most of the raw jump is the label set shrinking from three to two.':
    'Order: a 3 against a 4 is a near miss. Interval alpha '+r.alpha_interval.toFixed(3)+' is still low, because almost everything is a 4 or a 3. Gwet\'s AC1, which only counts chance on items that are hard to classify, reads '+r.ac1.toFixed(3)+'. Report both when one label dominates.'][step];
  $('ag-cap').innerHTML=cap;
  const cnt=[['Items',r.units.toLocaleString('en-US'),mode===2?'all responses':'turn 1'],['Rater pairs',r.pairs.toLocaleString('en-US'),''],['Raw agreement',step>=1?S.pct(r.po):'...',''],['Chance',step>=2?S.pct(r.pe):'...','two random labels match'],['Fleiss kappa',step>=3?r.kappa_fleiss.toFixed(3):'...',''],['Alpha',step>=4?r.alpha_nominal.toFixed(3):'...',step>=5&&mode!==1?(mode===0?'ordinal ':'interval ')+(mode===0?r.alpha_ordinal:r.alpha_interval).toFixed(3):'nominal']];
  $('ag-count').innerHTML=cnt.map(k=>'<div class="stat"><div class="k">'+k[0]+'</div><div class="v">'+k[1]+'</div><div class="d">'+k[2]+'</div></div>').join('');
  $('ag-src').innerHTML=mode<2?'Data: <a href="https://huggingface.co/datasets/lmsys/mt_bench_human_judgments" target="_blank" rel="noopener noreferrer">MT-Bench human judgments</a> (expert votes only, turn 1; votes put in the same model order). Raw agreement reproduces Zheng et al., Table 5 exactly.':
    'Data: <a href="https://huggingface.co/datasets/nvidia/HelpSteer2/tree/main/disagreements" target="_blank" rel="noopener noreferrer">HelpSteer2 individual ratings</a> (released October 2024), all responses with two or more ratings.';
}
function draw(){$('ag-scrub').value=step;drawGrid();drawSide();caption();
  ['ag-m0','ag-m1','ag-m2'].forEach((id,i)=>$(id).classList.toggle('on',i===mode));$('ag-play').textContent=playing?'Pause':'Play'}
function tick(){if(!playing)return;if(!onScreen||document.hidden){timer=setTimeout(tick,500);return}
  if(step<N-1){step++;draw();timer=setTimeout(tick,3600/(+$('ag-speed').value))}else{playing=false;draw()}}
function play(){if(playing){playing=false;clearTimeout(timer);draw();return}
  if(step>=N-1)step=0;playing=true;draw();timer=setTimeout(tick,(reduce?5000:3600)/(+$('ag-speed').value))}
$('ag-play').onclick=play;
$('ag-prev').onclick=()=>{playing=false;clearTimeout(timer);step=Math.max(0,step-1);draw()};
$('ag-next').onclick=()=>{playing=false;clearTimeout(timer);step=Math.min(N-1,step+1);draw()};
$('ag-scrub').oninput=e=>{playing=false;clearTimeout(timer);step=+e.target.value;draw()};
[0,1,2].forEach(i=>{$('ag-m'+i).onclick=()=>{mode=i;draw()}});
if('IntersectionObserver' in window)new IntersectionObserver(es=>{onScreen=es[0].isIntersecting},{threshold:.1}).observe($('ag'));
let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{if(!$('t-read').hidden)draw()},120)});
(window.TAB_RENDER=window.TAB_RENDER||{})['t-read']=(window.TAB_RENDER['t-read']||[]).concat([draw]);
draw();
})();
