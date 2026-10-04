// ---- Effective length tab (ids ef-) ----
(function(){
const D=window.LD,esc=RD.esc;if(!document.getElementById('t-eff'))return;
const C=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim()||'#888';
const COL=['--c1','--c2','--c3','--c4'];
const st={b:'ruler',r:'abs',t:85.6,sel:{ruler:['GPT-4','Llama3.1 (70B)','LWM (7B)'],nolima:['GPT-4o','GPT-4.1','Claude 3.5 Sonnet']}};
const parseK=s=>{s=String(s).replace(/[<>≥]/g,'');return /M$/.test(s)?parseFloat(s)*1024:parseFloat(s)};
const lab=k=>k>=1024?(k/1024)+'M':k+'K';
// rows: {m, claimed (K), lens, sc, base, pub}
function rows(){if(st.b==='ruler')return D.ruler.rows.map(r=>({m:r[0],cl:parseK(r[1]),pub:r[2],lens:D.ruler.lens,sc:r[3],base:r[3][0]}));
  return D.nolima.rows.map(r=>({m:r[0],cl:parseK(r[1]),pub:r[2],lens:D.nolima.lens,sc:r[4],base:r[3],tab:r[5]}))}
const thrOf=r=>st.r==='abs'?st.t:st.t/100*r.base;
// effective = largest tested length with score above threshold (both papers' rule)
function eff(r){const th=thrOf(r);let e=null,lastTested=null;r.sc.forEach((v,i)=>{if(v==null)return;lastTested=r.lens[i];if(v>th)e=r.lens[i]});
  return {e,ge:e!=null&&e===lastTested,th}}
window.LC_eff={eff:(b,r,t)=>{const s0={...st};st.b=b;st.r=r;st.t=t;const out=rows().map(x=>{const q=eff(x);return [x.m,q.e,q.ge]});Object.assign(st,s0);return out}};
const effLab=q=>q.e==null?(st.b==='ruler'?'<4K':'<1K'):((q.ge?'≥':'')+lab(q.e));
const isDefault=()=>st.b==='ruler'?(st.r==='abs'&&Math.abs(st.t-85.6)<1e-9):(st.r==='rel'&&Math.abs(st.t-85)<1e-9);
function pubNorm(p){return p==='>128K'?'≥128K':p}
function setSlider(){const s=document.getElementById('ef-t');if(st.r==='abs'){s.min=50;s.max=99;s.step=0.1}else{s.min=50;s.max=100;s.step=1}s.value=st.t;
  document.getElementById('ef-tv').textContent=st.r==='abs'?st.t.toFixed(1)+'% absolute':st.t+'% of own '+(st.b==='ruler'?'4K score':'base score');
  document.querySelectorAll('#ef-r button').forEach(b=>b.classList.toggle('on',b.dataset.m===st.r));document.querySelectorAll('#ef-b button').forEach(b=>b.classList.toggle('on',b.dataset.m===st.b))}
const X0=0.5,X1=16384;// K, log2 axis
function draw(){setSlider();const R=rows().map(r=>Object.assign(r,{q:eff(r)}));
  // reproduction line
  const def=isDefault();let match=0,diff=[];R.forEach(r=>{const a=effLab(r.q),p=pubNorm(r.pub);const pn=p==='1K'&&a==='<1K'?'<1K*':p;if(a===p)match++;else diff.push(r.m+' (printed '+r.pub+', rule gives '+a+')')});
  document.getElementById('ef-repro').innerHTML=def?('<div class="t">Defaults reproduce the paper\'s effective-length column, independently from the per-length scores</div>'+match+' of '+R.length+' rows match'+(diff.length?'. The '+diff.length+' that do not all print "1K" where the 1K score is already below the threshold; the NoLiMa README prints "&lt;1K" for them, which is what the rule gives: '+esc(diff.join('; '))+'.':' exactly.')):
    '<div class="t">Your rule, not the paper\'s</div>Press "Paper\'s rule" to return to '+(st.b==='ruler'?'RULER\'s 85.6% absolute threshold':'NoLiMa\'s 85% of base')+'.';
  // stats
  const tested=R.map(r=>r.q.e==null?(st.b==='ruler'?2:0.5):r.q.e);const ratios=R.map((r,i)=>r.cl/tested[i]).sort((a,b)=>a-b);const med=ratios[Math.floor(ratios.length/2)];
  const ge32=R.filter(r=>r.q.e!=null&&r.q.e>=32).length;
  document.getElementById('ef-stats').innerHTML=RD.stat('Models',R.length,st.b==='ruler'?'Table 3':'Tables 3 and 10')+RD.stat('Effective at 32K or more',ge32+' of '+R.length,'under this rule')+
    RD.stat('Median claimed ÷ effective',Math.round(med)+'×','effective under 1K counted as '+(st.b==='ruler'?'2K':'0.5K'))+RD.stat('Threshold',st.r==='abs'?st.t.toFixed(1)+'%':st.t+'% of base','');
  // dumbbell
  const box=document.getElementById('ef-dumb');const W=Math.min(860,RD.width(box));const nar=W<560;const ml=nar?118:178,mr=14,rh=nar?19:18,mt=24;
  const xs=k=>ml+(Math.log2(k)-Math.log2(X0))/(Math.log2(X1)-Math.log2(X0))*(W-ml-mr);
  R.sort((a,b)=>((b.q.e||0)-(a.q.e||0))||(b.sc[0]-a.sc[0]));
  const H=mt+R.length*rh+8;let s='';const ticks=[1,4,16,64,256,1024,4096,16384];
  ticks.forEach(k=>{s+='<line x1="'+xs(k)+'" x2="'+xs(k)+'" y1="'+(mt-4)+'" y2="'+(H-4)+'" stroke="'+C('--line')+'"/>'+RD.t(xs(k),mt-9,lab(k),{a:'middle',fs:10.5,fill:C('--mute')})});
  const tl=R[0].lens.filter((_,i)=>true);const tmin=Math.min(...R[0].lens),tmax=Math.max(...R[0].lens);
  R.forEach((r,i)=>{const y=mt+i*rh+rh/2;const sel=st.sel[st.b].indexOf(r.m);const tmaxr=Math.max(...r.lens.filter((_,j)=>r.sc[j]!=null));
    s+='<g class="effrow'+(sel>=0?' sel':'')+'" data-m="'+esc(r.m)+'"><rect x="0" y="'+(y-rh/2)+'" width="'+W+'" height="'+rh+'" fill="'+(sel>=0?C('--acc2'):'transparent')+'" opacity="'+(sel>=0?0.5:0)+'"/>';
    s+='<rect x="'+xs(tmin)+'" y="'+(y-5)+'" width="'+(xs(tmaxr)-xs(tmin))+'" height="10" rx="2" fill="'+C('--soft')+'" stroke="'+C('--line')+'"/>';
    const ex=r.q.e==null?xs(X0)+3:xs(r.q.e);s+='<line x1="'+ex+'" x2="'+xs(r.cl)+'" y1="'+y+'" y2="'+y+'" stroke="'+C('--mute')+'" stroke-width="1.4"/>';
    s+='<circle cx="'+xs(r.cl)+'" cy="'+y+'" r="5" fill="'+C('--bg')+'" stroke="'+C('--mute')+'" stroke-width="2"/>';
    s+='<circle cx="'+ex+'" cy="'+y+'" r="5" fill="'+C('--acc')+'"/>';
    const a=effLab(r.q);if(isDefault()&&a!==pubNorm(r.pub)){const px=xs(parseK(r.pub));s+='<circle cx="'+px+'" cy="'+y+'" r="3" fill="'+C('--bad')+'"/>'}
    const nm=nar&&r.m.length>17?r.m.slice(0,16)+'.':r.m;
    s+='<text class="nm" x="4" y="'+(y+4)+'" font-size="11"'+(sel>=0?' fill="'+C(COL[sel%4])+'"':'')+'>'+esc(nm)+'</text>'+RD.t(ml-6,y+4,a,{a:'end',fs:10.5,fill:C('--mute')})+'</g>'});
  box.innerHTML=RD.svg(W,H,s,'Claimed against effective context length');
  box.querySelectorAll('g.effrow').forEach(g=>g.addEventListener('click',()=>{const m=g.dataset.m,L=st.sel[st.b];const k=L.indexOf(m);if(k>=0)L.splice(k,1);else{L.push(m);if(L.length>4)L.shift()}draw()}));
  drawLine(R)}
function drawLine(R){const box=document.getElementById('ef-line');const W=Math.min(760,RD.width(box)),H=250;const ml=36,mr=14,mt=12,mb=30;
  const lens=R[0].lens;const xs=k=>ml+(Math.log2(k)-Math.log2(lens[0]))/(Math.log2(lens[lens.length-1])-Math.log2(lens[0]))*(W-ml-mr);const ys=v=>mt+(1-v/100)*(H-mt-mb);
  let s='';for(let v=0;v<=100;v+=20)s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+ys(v)+'" y2="'+ys(v)+'" stroke="'+C('--line')+'"/>'+RD.t(ml-5,ys(v)+4,v,{a:'end',fs:10.5,fill:C('--mute')});
  lens.forEach(k=>{s+=RD.t(xs(k),H-mb+15,lab(k),{a:'middle',fs:10.5,fill:C('--mute')})});
  if(st.r==='abs')s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+ys(st.t)+'" y2="'+ys(st.t)+'" stroke="'+C('--bad')+'" stroke-dasharray="5 4"/>'+RD.t(W-mr,ys(st.t)-5,'threshold '+st.t.toFixed(1),{a:'end',fs:10.5,fill:C('--bad')});
  const S=st.sel[st.b].map(m=>R.find(r=>r.m===m)).filter(Boolean);
  S.forEach((r,j)=>{const c=C(COL[st.sel[st.b].indexOf(r.m)%4]);const pts=r.lens.map((k,i)=>r.sc[i]==null?null:xs(k)+','+ys(r.sc[i])).filter(Boolean);
    s+='<polyline fill="none" stroke="'+c+'" stroke-width="2" points="'+pts.join(' ')+'"/>';r.lens.forEach((k,i)=>{if(r.sc[i]!=null)s+='<circle cx="'+xs(k)+'" cy="'+ys(r.sc[i])+'" r="3" fill="'+c+'"/>'});
    if(st.r==='rel'){const th=r.q.th;s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+ys(th)+'" y2="'+ys(th)+'" stroke="'+c+'" stroke-dasharray="3 4" opacity=".8"/>'}});
  box.innerHTML=RD.svg(W,H,s,'Score against length for selected models');
  document.getElementById('ef-selnote').innerHTML=S.length?('Shown: '+S.map(r=>'<b style="color:'+C(COL[st.sel[st.b].indexOf(r.m)%4])+'">'+esc(r.m)+'</b> (effective '+effLab(r.q)+', claimed '+lab(r.cl)+')').join(', ')+(st.r==='rel'?'; dashed lines are each model\'s own threshold.':'.')):'Click rows above to plot up to four models.'}
RD.seg(document.getElementById('ef-b'),m=>{st.b=m;if(m==='ruler'){st.r='abs';st.t=85.6}else{st.r='rel';st.t=85}draw()});
RD.seg(document.getElementById('ef-r'),m=>{st.r=m;st.t=m==='abs'?85.6:85;draw()});
document.getElementById('ef-t').addEventListener('input',e=>{st.t=+e.target.value;draw()});
document.getElementById('ef-reset').addEventListener('click',()=>{if(st.b==='ruler'){st.r='abs';st.t=85.6}else{st.r='rel';st.t=85}draw()});
(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-eff']=window.TAB_RENDER['t-eff']||[]).push(draw);
addEventListener('resize',()=>{const t=document.getElementById('t-eff');if(t&&!t.hidden)draw()});
})();
