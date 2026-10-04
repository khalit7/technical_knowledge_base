// Small Reading-tab pieces: HelpSteer2 Table 1 bars, the annotation budget calculator, the prevalence illustration, section nav.
(function(){
const D=window.HE,S=window.HES;if(!D||!S)return;
const $=id=>document.getElementById(id);
const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
// HelpSteer2, Table 1 (quadratic weighted Cohen's kappa): initial collection, after improvements, post-processing
const T1={Helpfulness:[.465,.706,.791],Correctness:[.472,.715,.793],Coherence:[.169,.387,.428],Complexity:[.293,.416,.427],Verbosity:[.342,.536,.548]};
function hs2(){const h=$('rd-hs2bars');if(!h)return;const c=[css('--dim'),css('--c1'),css('--c3')];
  h.innerHTML='<div class="leg"><span><i style="background:'+c[0]+'"></i>initial</span><span><i style="background:'+c[1]+'"></i>after guideline fixes</span><span><i style="background:'+c[2]+'"></i>after filtering</span></div>'+
  Object.keys(T1).map(k=>T1[k].map((v,i)=>'<div class="row"><div class="nm">'+(i===0?k:'')+'</div><div class="track"><div class="fill" style="width:'+(100*v).toFixed(1)+'%;background:'+c[i]+'"></div></div><div class="val">'+v.toFixed(3)+'</div></div>').join('')).join('')}
// budget calculator
const PRE=[
  ['Crowd, pairwise vote',{n:1000,k:3,m:1,r:12,a:20},'Prolific\'s recommended $12 an hour; one minute per vote is illustrative.'],
  ['Expert fact-check, Arena style',{n:160,k:2,m:4,r:60,a:20},'160 battles and 3 to 5 minutes per expert label as in Chiang et al. (§6.3); the $60 rate is illustrative.'],
  ['Gold slice, double-labelled',{n:300,k:2,m:5,r:80,a:25},'A 300-item gold slice, two experts and an adjudicator; minutes and rate illustrative.'],
  ['GPQA-style hard question check',{n:100,k:3,m:37,r:60,a:10},'37 minutes is GPQA\'s average non-expert attempt (Rein et al.); rate illustrative.']];
function cost(){if(!$('rd-cost'))return;
  const n=+$('rd-c-n').value,k=+$('rd-c-k').value,m=+$('rd-c-m').value,r=+$('rd-c-r').value,a=+$('rd-c-a').value/100;
  $('rd-c-nv').textContent=n.toLocaleString('en-US');$('rd-c-kv').textContent=k;$('rd-c-mv').textContent=m;$('rd-c-rv').textContent='$'+r;$('rd-c-av').textContent=Math.round(a*100)+'%';
  const hrs=n*k*m/60,adj=n*a*m/60,tot=hrs+adj,usd=tot*r;
  $('rd-c-out').innerHTML=[['Labels',(n*k).toLocaleString('en-US'),''],['Person-hours',tot.toFixed(0),'of which adjudication '+adj.toFixed(0)],['Cost','$'+Math.round(usd).toLocaleString('en-US'),'at $'+r+' an hour'],['Per item','$'+(usd/n).toFixed(2),'']]
    .map(x=>'<div class="stat"><div class="k">'+x[0]+'</div><div class="v">'+x[1]+'</div><div class="d">'+x[2]+'</div></div>').join('')}
function costInit(){const h=$('rd-cost-pre');if(!h)return;
  h.innerHTML=PRE.map((p,i)=>'<button data-i="'+i+'">'+p[0]+'</button>').join('');
  h.querySelectorAll('button').forEach(b=>b.onclick=()=>{const p=PRE[+b.dataset.i];
    $('rd-c-n').value=p[1].n;$('rd-c-k').value=p[1].k;$('rd-c-m').value=p[1].m;$('rd-c-r').value=p[1].r;$('rd-c-a').value=p[1].a;
    h.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));$('rd-c-note').textContent=p[2];cost()});
  ['n','k','m','r','a'].forEach(id=>$('rd-c-'+id).addEventListener('input',()=>{h.querySelectorAll('button').forEach(x=>x.classList.remove('on'));$('rd-c-note').textContent='Your own inputs. Formula: items × labels × minutes / 60, plus items × adjudication share × minutes / 60, times the rate.';cost()}));
  h.querySelector('button').click()}
// prevalence: 100 items, 10 disagreements (5 each way); s = items both call pass
function par(){if(!$('rd-par'))return;const s=+$('rd-par-s').value,a=s-5,d=100-s-5;// a both pass, d both fail
  const r=S.kappa2(a,5,5,d);$('rd-par-v').textContent=s+'%';
  $('rd-par-out').innerHTML=[['Raw agreement',S.pct(r[0],0),''],['Cohen\'s kappa',r[1].toFixed(3),''],['Gwet\'s AC1',r[2].toFixed(3),''],['Table (pp, pf, fp, ff)',a+', 5, 5, '+d,'']]
    .map(x=>'<div class="stat"><div class="k">'+x[0]+'</div><div class="v">'+x[1]+'</div><div class="d">'+x[2]+'</div></div>').join('')}
// section nav highlight
function nav(){const nv=$('rd-nav');if(!nv||!('IntersectionObserver' in window))return;const as=[...nv.querySelectorAll('a')];
  const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){as.forEach(a=>a.classList.toggle('cur',a.getAttribute('href')==='#'+e.target.id))}})},{rootMargin:'-20% 0px -70% 0px'});
  as.forEach(a=>{const t=document.querySelector(a.getAttribute('href'));if(t)io.observe(t)})}
hs2();costInit();par();nav();
if($('rd-par-s'))$('rd-par-s').addEventListener('input',par);
(window.TAB_RENDER=window.TAB_RENDER||{})['t-read']=(window.TAB_RENDER['t-read']||[]).concat([hs2]);
})();
