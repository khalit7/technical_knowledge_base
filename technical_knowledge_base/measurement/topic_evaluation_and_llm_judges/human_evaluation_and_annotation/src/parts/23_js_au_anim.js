// Reading animation: one test set scored before and after a gold-label audit; the ranking re-sorts.
// MMLU modes: 18 open models' released 5-shot choices on MMLU-Redux's 100 audited questions. ImageNet mode: Northcutt et al. Table S1.
(function(){
const D=window.HE,S=window.HES;if(!D||!S)return;
const $=id=>document.getElementById(id);if(!$('au'))return;
const N=5;let step=0,mode=0,playing=false,timer=null,onScreen=true;
const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const SUB=['virology','college_chemistry'];
const NC=D.nc.s1.map(r=>({name:r.model+(r.platform.startsWith('Keras')?' (Keras)':''),a:r.acc1/100,c:r.cacc1/100}));
const NCT2={non:2524,corr:1428,multi:597,neither:293,nonagree:598};// ImageNet row of Table 2
function series(){// returns {names, vals for current step, base vals, n}
  if(mode===2){const v=step>=2?NC.map(r=>r.c):NC.map(r=>r.a);return{names:NC.map(r=>r.name),v,base:NC.map(r=>r.a),n:null}}
  const a=S.AUD[SUB[mode]],v=step<2?a.orig:step===2?a.clean:a.corr,n=step<2?a.n:step===2?a.ok:a.fix;return{names:S.M,v,base:a.orig,n}}
function drawStrip(){
  const host=$('au-strip'),W=Math.max(280,host.clientWidth||600);
  if(mode===2){const tot=5440,parts=[['Kept: not an error',NCT2.non,css('--dim')],['Correctable: 3 of 5 raters agreed on a new label',NCT2.corr,css('--good')],['Several labels fit',NCT2.multi,css('--c5')],['Neither label fits',NCT2.neither,css('--c4')],['Raters did not agree',NCT2.nonagree,css('--mute')]];
    let x=0,s='<svg width="'+W+'" height="26" viewBox="0 0 '+W+' 26" role="img" aria-label="ImageNet validation candidates by verdict">';
    parts.forEach(p=>{const w=W*p[1]/tot;s+='<rect x="'+x.toFixed(1)+'" y="2" width="'+Math.max(0,w-1).toFixed(1)+'" height="22" fill="'+p[2]+'" opacity="'+(step>=1?1:.35)+'"/>';x+=w});
    host.innerHTML=s+'</svg>';
    $('au-leg').innerHTML=parts.map(p=>'<span><i style="background:'+p[2]+'"></i>'+p[0]+' ('+p[1].toLocaleString('en-US')+')</span>').join('');return}
  const a=S.AUD[SUB[mode]],it=a.items,sq=W<520?Math.floor((W-2)/25)-2:Math.min(16,Math.floor((W-2)/50)-2),gap=2,per=Math.floor(W/(sq+gap)),rows=Math.ceil(it.length/per),H=rows*(sq+gap);
  let s='<svg width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+it.length+' audited questions">';
  it.forEach((x,i)=>{const X=(i%per)*(sq+gap),Y=Math.floor(i/per)*(sq+gap);
    let fill=css('--acc'),op=1,stroke='';
    if(step>=1){fill=x.t==='o'?css('--dim'):x.t==='w'?css('--bad'):css('--c5')}
    if(step===2&&x.t!=='o'){op=.18}
    if(step>=3&&x.t!=='o'&&!(x.t==='w'&&x.c>=0)){op=.18}
    if(step>=3&&x.t==='w'&&x.c>=0){fill=css('--good')}
    s+='<rect x="'+X+'" y="'+Y+'" width="'+sq+'" height="'+sq+'" rx="1.5" fill="'+fill+'" opacity="'+op+'"'+stroke+'/>'});
  host.innerHTML=s+'</svg>';
  $('au-leg').innerHTML=step===0?'<span><i style="background:'+css('--acc')+'"></i>question scored against the original key</span>':
    '<span><i style="background:'+css('--dim')+'"></i>sound ('+a.ok+')</span><span><i style="background:'+(step>=3?css('--good'):css('--bad'))+'"></i>wrong key ('+a.wrong+')'+(step>=3?', rescored with the audit\'s answer':'')+'</span><span><i style="background:'+css('--c5')+'"></i>other flaw ('+(a.errors-a.wrong)+')</span>'+(step>=2?'<span><i style="background:'+css('--dim')+';opacity:.25"></i>left out</span>':'');
}
function drawRank(){
  const host=$('au-rank'),W=Math.max(280,host.clientWidth||600),s=series(),n=s.names.length,rh=mode===2?17:21,H=n*rh+4;
  const rk=S.rankDesc(s.v),base=S.rankDesc(s.base);
  const ord=s.v.map((x,i)=>i).sort((i,j)=>s.v[j]-s.v[i]||base[i]-base[j]||i-j),pos=new Array(n);ord.forEach((i,p)=>{pos[i]=p});
  const nw=W<520?118:170,vw=W<520?96:120,bw=Math.max(40,W-nw-vw-40),mx=Math.max(...s.v,...s.base);
  let fresh=false;
  if(!host.dataset.mode||+host.dataset.mode!==mode||host.children.length!==n){host.innerHTML='';host.dataset.mode=mode;fresh=true;
    s.names.forEach((nm,i)=>{const d=document.createElement('div');d.style.cssText='position:absolute;left:0;right:0;height:'+(rh-3)+'px;display:flex;align-items:center;gap:6px;font-size:'+(mode===2?11.5:12.5)+'px;transition:transform .9s ease';
      d.innerHTML='<span class="rk" style="width:28px;text-align:right;color:var(--mute)"></span><span class="nm" style="width:'+nw+'px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></span><span style="width:'+bw+'px;height:'+(rh-8)+'px;background:var(--soft);border-radius:3px;position:relative;overflow:hidden"><span class="b" style="position:absolute;left:0;top:0;bottom:0;border-radius:3px;transition:'+(reduce?'none':'width .9s ease')+'"></span></span><span class="vl" style="width:'+vw+'px;white-space:nowrap;font-variant-numeric:tabular-nums"></span>';
      host.appendChild(d)})}
  host.style.height=H+'px';
  const se=i=>s.n?1.96*Math.sqrt(s.v[i]*(1-s.v[i])/s.n):0;
  [...host.children].forEach((d,i)=>{if(fresh||reduce)d.style.transition='none';d.style.transform='translateY('+(pos[i]*rh)+'px)';
    const mv=base[i]-rk[i],shift=step>=2&&Math.abs(mv)>=3;
    d.querySelector('.rk').textContent=rk[i];
    const nmEl=d.querySelector('.nm');nmEl.textContent=s.names[i];nmEl.style.fontWeight=shift?'600':'400';
    const b=d.querySelector('.b');b.style.width=(100*s.v[i]/mx).toFixed(1)+'%';b.style.background=!shift?css('--acc'):mv>0?css('--good'):css('--bad');
    d.querySelector('.vl').textContent=S.pct(s.v[i])+(step>=4&&s.n?' ±'+(100*se(i)).toFixed(0):'')+(step>=2&&mv?' ('+(mv>0?'↑':'↓')+Math.abs(mv)+')':'')});
  if(fresh&&!reduce){void host.offsetHeight;[...host.children].forEach(d=>{d.style.transition='transform .9s ease'})}
}
function caption(){
  const s=series(),rk=S.rankDesc(s.v),base=S.rankDesc(s.base),n=s.names.length;
  let best=0,bi=0,worst=0,wi=0;for(let i=0;i<n;i++){const m=base[i]-rk[i];if(m>best){best=m;bi=i}if(m<worst){worst=m;wi=i}}
  const top=s.v.map((x,i)=>i).sort((i,j)=>s.v[j]-s.v[i])[0];const rho=S.spearman(s.base,s.v);
  let cap;
  if(mode<2){const a=S.AUD[SUB[mode]],nm=S.SUBN[SUB[mode]];
    cap=['Each model is scored on the '+a.n+' '+nm+' questions MMLU-Redux sampled, against MMLU\'s original key. The best open model of 2023 gets '+S.pct(Math.max(...a.orig),0)+'.',
      'The audit: annotators found '+a.errors+' of the '+a.n+' questions flawed, '+a.wrong+' of them with a wrong key. On the wrong-key questions the models mostly pick the audit\'s answer, so the old key marks them wrong.',
      'Score only the '+a.ok+' sound questions. Accuracies jump, and the order changes: '+S.M[bi]+' climbs '+best+' places, '+S.M[wi]+' falls '+(-worst)+'.',
      'Put back the '+(a.fix-a.ok)+' wrong-key questions with the audit\'s answer as the key ('+a.fix+' scored). This is the corrected test, as close to "what the model knows" as the audit allows.',
      'How sure? On '+a.fix+' questions a 95% interval is about ±'+(196*Math.sqrt(.8*.2/a.fix)).toFixed(0)+' points near 80%: the big moves are real, most neighbouring ranks are not. Gate on the corrected set, and size it with Eval statistics.'][step]}
  else cap=['34 pretrained ImageNet models scored on the 1,428 validation images whose label the audit changed, against the original labels: low by construction (6.5 to 19.6%), and the high-capacity models (NASNet-large, Xception) fit the wrong labels best.',
    'The audit: confident learning flagged 5,440 validation images; five Mechanical Turk workers looked at each. For 1,428, at least 3 of 5 agreed on a different label (the correctable set).',
    'Same images, corrected labels: the order inverts. ResNet-18, last on the original labels, is first; NASNet-large falls from 1st to 29th.',
    'On the whole corrected validation set rankings barely change (Northcutt et al., Figure 3a): 1,428 images are under 3% of 50,000. The inversion matters where label noise is common, as in most data collected in practice.',
    'The ranks above are recomputed from the printed accuracies; they match the paper\'s columns except where two models tie (30 of 34 and 33 of 34 exact).'][step];
  $('au-cap').innerHTML=cap;
  const items=mode===2?(step>=2?'1,428 corrected':'1,428 original'):String(s.n);
  $('au-count').innerHTML=[['Items scored',items,''],['Top model',s.names[top],S.pct(s.v[top])],['Rank agreement with the original order',step>=2?rho.toFixed(2):'1.00','Spearman'],['Biggest climb',step>=2&&best>0?s.names[bi]:'...',step>=2&&best>0?base[bi]+' → '+rk[bi]:'']]
    .map(k=>'<div class="stat"><div class="k">'+k[0]+'</div><div class="v" style="font-size:15px">'+S.esc(k[1])+'</div><div class="d">'+k[2]+'</div></div>').join('');
  $('au-src').innerHTML=mode<2?'Data: <a href="https://huggingface.co/datasets/edinburgh-dawg/mmlu-redux-2.0" target="_blank" rel="noopener noreferrer">MMLU-Redux 2.0</a> verdicts and suggested answers; each model\'s answer is the argmax of its released 5-shot log-likelihoods (<a href="https://huggingface.co/open-llm-leaderboard-old" target="_blank" rel="noopener noreferrer">Open LLM Leaderboard v1 details</a>). Ranks share a number on ties. <span class="der">derived</span>':
    'Data: <a href="https://arxiv.org/abs/2103.14749" target="_blank" rel="noopener noreferrer">Northcutt et al. 2021</a>, Table S1 (top-1 accuracy, agreement threshold 3 of 5) and Table 2 (ImageNet categorisation).';
}
function draw(){$('au-scrub').value=step;drawStrip();drawRank();caption();
  ['au-m0','au-m1','au-m2'].forEach((id,i)=>$(id).classList.toggle('on',i===mode));$('au-play').textContent=playing?'Pause':'Play'}
function tick(){if(!playing)return;if(!onScreen||document.hidden){timer=setTimeout(tick,500);return}
  if(step<N-1){step++;draw();timer=setTimeout(tick,3800/(+$('au-speed').value))}else{playing=false;draw()}}
function play(){if(playing){playing=false;clearTimeout(timer);draw();return}
  if(step>=N-1)step=0;playing=true;draw();timer=setTimeout(tick,(reduce?5200:3800)/(+$('au-speed').value))}
$('au-play').onclick=play;
$('au-prev').onclick=()=>{playing=false;clearTimeout(timer);step=Math.max(0,step-1);draw()};
$('au-next').onclick=()=>{playing=false;clearTimeout(timer);step=Math.min(N-1,step+1);draw()};
$('au-scrub').oninput=e=>{playing=false;clearTimeout(timer);step=+e.target.value;draw()};
[0,1,2].forEach(i=>{$('au-m'+i).onclick=()=>{mode=i;draw()}});
if('IntersectionObserver' in window)new IntersectionObserver(es=>{onScreen=es[0].isIntersecting},{threshold:.1}).observe($('au'));
let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{if(!$('t-read').hidden){$('au-rank').dataset.mode='';draw()}},120)});
(window.TAB_RENDER=window.TAB_RENDER||{})['t-read']=(window.TAB_RENDER['t-read']||[]).concat([draw]);
draw();
})();
