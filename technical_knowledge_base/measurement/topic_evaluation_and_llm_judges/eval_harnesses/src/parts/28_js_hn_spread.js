// Reading section 3 (Why scores differ): the ten-settings chart, the eight-model rank chart and the published cases.
// Moved from the parent topic's tab "Same model, many harnesses" on 2026-10-24 (32_js_harness_main.js), redrawn as SVG at the measured width.
(function(){
const D=window.HN_DATA;if(!D||!document.getElementById('hn-chart'))return;
const $=id=>document.getElementById(id);
const esc=RD.esc,A=(u,t)=>'<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+t+'</a>';
const f1=x=>(+x).toFixed(1),f2=x=>(+x).toFixed(2);
const WHO={vendor:['Model developer','w-vendor','var(--c4)'],maint:['Harness or leaderboard maintainer','w-maint','var(--c1)'],indep:['Independent reimplementation','w-indep','var(--c3)'],page:['Computed by this page','w-page','var(--c2)']};
const COND={c1:'Original prompt, 5-shot, letter log-likelihood',c2:'Original prompt, 0-shot, letter log-likelihood',c10:'HELM-style prompt, 5-shot, letter log-likelihood',
 c3:'Answer text, acc (lm-eval Jan 2023)',c4:'Answer text, acc_norm (lm-eval Jan 2023)',c5:'HELM-style prompt, 5-shot, generate, strict',
 c6:'Raw prompt, 0-shot, generate, strict',c7:'Chat template, 0-shot, generate, strict',c8:'Chat template, lenient extraction',c9:'Chat template + "Answer with only the letter."'};
const SHORT={c1:'Original, 5-shot, letters',c2:'Original, 0-shot, letters',c10:'HELM-style, 5-shot, letters',c3:'Answer text, acc',c4:'Answer text, acc_norm',c5:'HELM-style, generate, strict',c6:'Raw, 0-shot, generate, strict',c7:'Chat template, strict',c8:'Chat template, lenient',c9:'Chat + "only the letter"'};
const GROUPS=[['Read by log-likelihood',['c1','c2','c10','c3','c4']],['Generated, raw prompt',['c5','c6']],['Generated, chat template',['c7','c8','c9']]];
const VS={c2:['c1','vs 5-shot'],c10:['c1','vs original prompt'],c3:['c1','vs letters'],c4:['c3','vs acc'],c5:['c10','vs log-likelihood'],c7:['c6','vs raw prompt'],c8:['c7','vs strict'],c9:['c7','vs no instruction']};
function chart(){
  const R=D.repro,el=$('hn-chart');const W=RD.width(el),narrow=W<560;
  const L=narrow?14:Math.min(250,W*0.34),Rm=narrow?8:150,bw=W-L-Rm,x=v=>L+bw*v/60;
  let y=8,g='';const rowH=narrow?40:24;
  // axis ticks
  const ticks=[0,10,20,30,40,50,60];
  const rowsTotal=GROUPS.reduce((a,gr)=>a+gr[1].length,0),H=8+GROUPS.length*20+rowsTotal*rowH+34;
  ticks.forEach(t=>{g+='<line x1="'+x(t)+'" x2="'+x(t)+'" y1="4" y2="'+(H-28)+'" stroke="var(--line)"/>'+RD.t(x(t),H-14,t+'%',{a:'middle',fill:'var(--mute)'})});
  g+='<line x1="'+x(25)+'" x2="'+x(25)+'" y1="4" y2="'+(H-28)+'" stroke="var(--mute)" stroke-dasharray="4 3"/>'+RD.t(x(25)+3,H-30,'chance',{fill:'var(--mute)'});
  GROUPS.forEach(([gn,ks])=>{g+=RD.t(narrow?8:8,y+13,gn,{w:600,fill:'var(--mute)'});y+=20;
    ks.forEach(k=>{const a=R.acc[k];const lo=Math.max(0,a[0]-a[1]),hi=a[0]+a[1];
      const by=narrow?y+18:y+4;
      if(narrow)g+=RD.t(8,y+12,esc(SHORT[k]));else g+=RD.t(L-8,y+16,esc(SHORT[k]),{a:'end'});
      g+='<rect x="'+L+'" y="'+by+'" width="'+(x(a[0])-L).toFixed(1)+'" height="14" rx="2" fill="var(--c2)" opacity=".85"><title>'+esc(COND[k])+': '+f1(a[0])+'%</title></rect>';
      g+='<line x1="'+x(lo)+'" x2="'+x(hi)+'" y1="'+(by+7)+'" y2="'+(by+7)+'" stroke="var(--ink)" stroke-width="1.5"/>';
      g+=RD.t(x(hi)+5,by+11,f1(a[0])+'%',{fill:'var(--ink)'});
      if(VS[k]){const p=R.pairs.find(q=>q.a===VS[k][0]&&q.b===k);if(p){const sig=Math.abs(p.d)>1.96*p.se;
        const txt=(p.d>=0?'+':'')+f1(p.d)+' '+VS[k][1];
        if(narrow)g+=RD.t(W-8,y+12,txt,{a:'end',fill:sig?'var(--bad)':'var(--mute)',w:sig?700:400});
        else g+=RD.t(W-Rm+8,y+16,txt,{fill:sig?'var(--bad)':'var(--mute)',w:sig?700:400});}}
      y+=rowH;});});
  el.innerHTML=RD.svg(W,H,g,'Accuracy under ten harness settings on 200 MMLU items');
}
function movers(){const o=n=>['1st','2nd','3rd'][n-1]||n+'th';const sh=m=>m.replace(/^.*\//,'');return D.blogtab.filter(m=>Math.max(...m.rk)-Math.min(...m.rk)>=2).map(m=>sh(m.m)+' ranks '+o(m.rk[0])+' under the original code, '+o(m.rk[1])+' under HELM and '+o(m.rk[2])+' under the January 2023 harness').join('; ')+'.'}
function slope(){
  const el=$('hn-slope');const T=D.blogtab;const W=RD.width(el);
  const cols=[['orig',W<520?'Orig.':'Original code'],['helm','HELM'],['harness',W<520?'Jan 2023':'lm-eval, Jan 2023']];
  const lab=Math.min(170,W*0.38),pad=16,rlab=W<520?40:60,cw=(W-lab-pad-rlab)/(cols.length-1),H=8*26+40;
  const short=m=>m.replace('togethercomputer/','').replace('tiiuae/','').replace('EleutherAI/','').replace('-INCITE-7B-Base','-7B');
  let s='';
  cols.forEach((c,j)=>{const x=lab+pad+j*cw;s+=RD.t(x,14,c[1],{a:j===0?'start':j===cols.length-1?'end':'middle',fill:'var(--mute)'})});
  const y=r=>32+(r-1)*26;
  T.forEach((m,i)=>{const col=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)','var(--mute)','var(--ink)'][i];
    let p='';cols.forEach((c,j)=>{const x=lab+pad+j*cw;p+=(j?'L':'M')+x.toFixed(1)+' '+y(m.rk[j])});
    s+='<path d="'+p+'" fill="none" stroke="'+col+'" stroke-width="2" opacity=".85"/>';
    cols.forEach((c,j)=>{const x=lab+pad+j*cw;s+='<circle cx="'+x.toFixed(1)+'" cy="'+y(m.rk[j])+'" r="4" fill="'+col+'"><title>'+esc(short(m.m))+': '+m[c[0]].toFixed(1)+'% (rank '+m.rk[j]+')</title></circle>'});
    s+=RD.t(lab+pad-8,y(m.rk[0])+4,esc(short(m.m))+' '+m.orig.toFixed(1),{a:'end'});
    s+=RD.t(lab+pad+(cols.length-1)*cw+8,y(m.rk[2])+4,m.harness.toFixed(1),{fill:'var(--mute)'});
  });
  el.innerHTML=RD.svg(W,H,s,'Rank of eight models under three MMLU implementations');
  $('hn-movers').textContent=movers();
}
// ---- published cases (closed block)
let cur=0,openR=-1;
function caseRender(){
  const C=window.HN_CASES;if(!C)return;const c=C[cur];
  $('hn-cases').innerHTML=C.map((x,i)=>'<button data-c="'+i+'"'+(i===cur?' class="on"':'')+'>'+esc(x.short)+'</button>').join('');
  $('hn-case-take').innerHTML='<b>'+esc(c.bench)+'.</b> '+c.take;
  let groups=[...new Set(c.reads.map(r=>r.group||''))];
  $('hn-case-plot').innerHTML=c.reads.length?groups.map(gp=>(gp?'<div class="band">'+esc(gp)+'</div>':'')+c.reads.map((r,i)=>[r,i]).filter(z=>(z[0].group||'')===gp).map(([r,i])=>'<div class="bars"><div class="row'+(i===openR?' hl':'')+'" data-r="'+i+'" style="cursor:pointer"><span class="nm" title="'+esc(r.lab)+'">'+esc(r.lab)+'</span><span class="track"><span class="fill" style="width:'+Math.max(0.6,r.v).toFixed(1)+'%;background:'+WHO[r.who][2]+'"></span></span><span class="val">'+(+r.v).toFixed(r.v%1&&Math.round(r.v*10)!==r.v*10?2:1)+'%</span></div></div>').join('')).join('')+'<div class="small mute">Bars run from 0 to 100%. Click a bar or a card for its settings.</div>':'';
  $('hn-case-reads').innerHTML=c.reads.map((r,i)=>'<div class="hn-read'+(i===openR?' on':'')+'" data-r="'+i+'"><div class="top"><span class="v">'+(+r.v).toFixed(2).replace(/\.?0+$/,'')+'%</span><span>'+esc(r.lab)+'</span><span class="who '+WHO[r.who][1]+'">'+WHO[r.who][0]+'</span><span class="pill">'+esc(r.date)+'</span></div><div class="knob">'+r.knob+'</div>'+(i===openR?'<dl><dt>Harness</dt><dd>'+r.harness+'</dd><dt>Prompt</dt><dd>'+esc(r.prompt)+'</dd><dt>Shots</dt><dd>'+esc(r.shots)+'</dd><dt>Scoring</dt><dd>'+r.scoring+'</dd><dt>Extraction</dt><dd>'+esc(r.extract)+'</dd><dt>Chat template</dt><dd>'+esc(r.chat)+'</dd><dt>Averaging</dt><dd>'+r.norm+'</dd><dt>Source</dt><dd>'+A(r.src,'link')+'</dd></dl>':'')+'</div>').join('');
  let ex='';
  if(c.trace)ex+='<div class="tw"><table class="hn-t"><tbody>'+c.trace.map(t=>'<tr><td>'+esc(t[0])+'</td><td class="mono">'+esc(t[1])+'</td></tr>').join('')+'</tbody></table></div><p class="small mute">Worked example and steps from '+A(window.HN_U.drop,'"Open LLM Leaderboard: DROP deep dive"')+' (Hugging Face, 1 Dec 2023).</p>';
  if(c.note)ex+='<div class="co warn"><div class="t">Note</div>'+c.note+'</div>';
  $('hn-case-extra').innerHTML=ex;
}
let done=false;
function init(){
  if(!done){done=true;
    $('hn-cases').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;cur=+b.dataset.c;openR=-1;caseRender()});
    const tog=e=>{const r=e.target.closest('[data-r]');if(!r||e.target.closest('a'))return;openR=+r.dataset.r===openR?-1:+r.dataset.r;caseRender()};
    $('hn-case-reads').addEventListener('click',tog);$('hn-case-plot').addEventListener('click',tog);
    caseRender();}
  chart();slope();
}
RD.onRender(init);RD.onResize(()=>{chart();slope()});
})();
