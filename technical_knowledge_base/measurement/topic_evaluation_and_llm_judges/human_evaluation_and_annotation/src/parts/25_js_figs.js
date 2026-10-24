// Static Reading figures drawn at the measured width: hero (life of a label), rater pools, ChaosNLI, the prevalence curve, the gold-error routine.
// Every number here is printed in the caption beside the figure, with its source.
(function(){
const S=window.HES;const $=id=>document.getElementById(id);
const W=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-60))};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const svg=(w,h,body,label,mk)=>'<svg width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="'+esc(label)+'">'+
  (mk?'<defs><marker id="'+mk+'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker></defs>':'')+body+'</svg>';
const T=(x,y,s,o)=>{o=o||{};return '<text x="'+x+'" y="'+y+'" font-size="'+(o.fs||11.5)+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' fill="'+(o.fill||'var(--ink)')+'"'+(o.w?' font-weight="'+o.w+'"':'')+'>'+esc(s)+'</text>'};
// wrap text to a pixel width at a font size (approximate glyph width 0.55 em)
function wrap(s,px,fs){const max=Math.max(8,Math.floor(px/(fs*0.55)));const out=[];let line='';
  s.split(' ').forEach(w=>{if((line+' '+w).trim().length>max&&line){out.push(line);line=w}else line=(line+' '+w).trim()});if(line)out.push(line);return out}
const FM={noisy:'var(--c1)',biased:'var(--c2)',wrong:'var(--c4)'};
const FN={noisy:'noisy',biased:'biased',wrong:'wrong thing'};

// ---- hero
const ST=[
  ['1 Rubric','#rd-task',['wrong','noisy'],['helpfulness kappa','0.465 to 0.706']],
  ['2 Raters','#rd-who',['noisy','biased'],['crowd vs expert 72.8 to 83.1%','expert vs expert 79.4 to 89.8%']],
  ['3 Agreement','#rd-agr',['noisy'],['raw 63.0%','alpha 0.436']],
  ['4 Disagreement','#rd-dis',['noisy'],['5-vote majority wrong','on 10 to 31%']],
  ['5 Gold slice','#rd-gold',['noisy','biased'],['2 PhDs agree 140 of 196','a third adjudicates']],
  ['6 Audit','#rd-audit',['biased'],['Virology: top 20 suspects','are 20 real errors']]];
function hero(){const el=$('rd-hero');if(!el)return;const w=W(el);
  const cols=w>=560?3:1,gx=cols>1?26:0,bw=(w-gx*(cols-1)-2)/cols,bh=88,gy=26,top=26;
  const pos=ST.map((s,i)=>{if(cols===1)return[1,top+i*(bh+gy)];const r=Math.floor(i/3),c=r===0?i%3:2-(i%3);return[1+c*(bw+gx),top+r*(bh+gy)]});
  const H=top+(cols===1?6:2)*(bh+gy)-gy+4;let b='';
  // legend of the three failure modes, on the figure
  let lx=2;['noisy','biased','wrong'].forEach(k=>{b+='<rect x="'+lx+'" y="5" width="11" height="11" rx="2" fill="'+FM[k]+'"/>'+T(lx+15,15,FN[k],{fs:11.5,fill:'var(--mute)'});lx+=15+FN[k].length*6.6+16});
  b+=T(w-2,15,'failure each stage controls',{fs:11,a:'end',fill:'var(--mute)'});
  if(w<420)b=b.replace(/<text[^>]*text-anchor="end"[^>]*>[^<]*<\/text>/,'');
  const mk='he-hero-ar';
  ST.forEach((s,i)=>{const [x,y]=pos[i];
    b+='<a href="'+s[1]+'"><rect x="'+x+'" y="'+y+'" width="'+bw+'" height="'+bh+'" rx="8" fill="var(--bg)" stroke="var(--line)" stroke-width="1.5"/>';
    b+=T(x+10,y+19,s[0],{fs:13.5,w:600});
    let px=x+10;s[2].forEach(k=>{const tw=FN[k].length*6.4+14;b+='<rect x="'+px+'" y="'+(y+27)+'" width="'+tw+'" height="16" rx="8" fill="'+FM[k]+'" opacity=".18"/><rect x="'+px+'" y="'+(y+27)+'" width="'+tw+'" height="16" rx="8" fill="none" stroke="'+FM[k]+'"/>'+T(px+7,y+39,FN[k],{fs:11,fill:FM[k]});px+=tw+6});
    s[3].forEach((t,j)=>{b+=T(x+10,y+60+j*15,t,{fs:11.5,fill:j?'var(--ink)':'var(--ink)'})});
    b+='</a>';
    if(i<5){const [x2,y2]=pos[i+1];let p;
      if(cols===1)p=[x+bw/2,y+bh+2,x+bw/2,y2-3];else if(y2===y)p=x2>x?[x+bw+2,y+bh/2,x2-3,y+bh/2]:[x-2,y+bh/2,x2+bw+3,y+bh/2];else p=[x+bw/2,y+bh+2,x2+bw/2,y2-3];
      b+='<line x1="'+p[0]+'" y1="'+p[1]+'" x2="'+p[2]+'" y2="'+p[3]+'" stroke="var(--mute)" stroke-width="1.5" marker-end="url(#'+mk+')"/>'}});
  el.innerHTML=svg(w,H,b,'The life of a label: six stages',mk)}

// ---- rater pools: agreement between two raters, by pairing, as each study measured it
const PO=[
  ['Arena: crowd vs expert',[72.8,83.1],'c2'],['Arena: expert vs expert',[79.4,89.8],'c1'],
  ['InstructGPT: training labelers',[72.6],'c3'],['InstructGPT: held-out labelers',[77.3],'c3'],['Earlier work: researcher vs researcher',[73],'c1'],
  ['Anthropic HH: crowd vs researchers',[63],'c2']];
function pools(){const el=$('rd-pools');if(!el)return;const w=W(el),narrow=w<560;
  const lw=narrow?0:236,x0=lw+8,x1=w-30,rh=narrow?38:28,top=8,lo=60,hi=92,X=v=>x0+(v-lo)/(hi-lo)*(x1-x0);
  const H=top+PO.length*rh+30;let b='';
  [60,65,70,75,80,85,90].forEach(v=>{if(narrow&&v%10)return;b+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+top+'" y2="'+(H-24)+'" stroke="var(--line)"/>'+T(X(v),H-8,v+'%',{fs:11,a:'middle',fill:'var(--mute)'})});
  PO.forEach((r,i)=>{const y=top+i*rh+(narrow?26:16),c='var(--'+r[2]+')';
    b+=narrow?T(2,y-13,r[0],{fs:11.5,fill:'var(--ink)'}):T(lw,y+4,r[0],{fs:11.5,a:'end'});
    if(r[1].length===2)b+='<line x1="'+X(r[1][0])+'" x2="'+X(r[1][1])+'" y1="'+y+'" y2="'+y+'" stroke="'+c+'" stroke-width="5" stroke-linecap="round" opacity=".55"/>';
    r[1].forEach((v,j)=>{b+='<circle cx="'+X(v)+'" cy="'+y+'" r="5" fill="'+c+'"/>';
      const right=r[1].length===1||j===1;b+=T(X(v)+(right?8:-8),y+4,String(v),{fs:11,a:right?'start':'end',fill:'var(--mute)'})})});
  el.innerHTML=svg(w,H,b,'Rater agreement by pairing')}

// ---- ChaosNLI
const CH=[['SNLI (contested items)',20],['MNLI-matched (contested items)',31],['αNLI',10]];
function chaos(){const el=$('rd-chaos');if(!el)return;const w=W(el),x0=2,x1=w-46,rh=40,top=4,X=v=>x0+v/35*(x1-x0);let b='';
  CH.forEach((r,i)=>{const y=top+i*rh;b+=T(x0,y+12,r[0],{fs:11.5});
    b+='<rect x="'+x0+'" y="'+(y+18)+'" width="'+(x1-x0)+'" height="14" rx="3" fill="var(--soft)"/><rect x="'+x0+'" y="'+(y+18)+'" width="'+(X(r[1])-x0)+'" height="14" rx="3" fill="var(--c2)"/>'+T(X(r[1])+6,y+30,r[1]+'%',{fs:12,w:600})});
  b+=T(x0,top+CH.length*rh+12,'share of items whose original majority label lost the 100-vote majority',{fs:11,fill:'var(--mute)'});
  if(w<470){b=b.replace('share of items whose original majority label lost the 100-vote majority','share where the 5-vote majority lost')}
  el.innerHTML=svg(w,top+CH.length*rh+18,b,'ChaosNLI majority flips')}

// ---- prevalence: kappa and AC1 against the share of pass labels, raw agreement fixed at 90%
function par(){const el=$('rd-par-fig');if(!el||!S||!S.kappa2)return;const w=W(el),h=206,l=40,r=w-12,t=26,bt=h-30;
  const s0=+(($('rd-par-s')||{}).value||50);const X=s=>l+(s-50)/(94-50)*(r-l),Y=v=>t+(1-v)/1.1*(bt-t);
  let b='';[0,0.5,0.9,1].forEach(v=>{b+='<line x1="'+l+'" x2="'+r+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+T(l-5,Y(v)+4,v.toFixed(1),{fs:11,a:'end',fill:'var(--mute)'})});
  [50,60,70,80,90].forEach(s=>{b+=T(X(s),bt+16,s+'%',{fs:11,a:'middle',fill:'var(--mute)'})});
  b+=T((l+r)/2,h-1,'share of items each rater calls "pass"',{fs:11,a:'middle',fill:'var(--mute)'});
  const k=[],g=[];for(let s=50;s<=94;s++){const v=S.kappa2(s-5,5,5,100-s-5);k.push([X(s),Y(v[1])]);g.push([X(s),Y(v[2])])}
  const pl=(p,c,d)=>'<polyline fill="none" stroke="'+c+'" stroke-width="2.2"'+(d?' stroke-dasharray="5 4"':'')+' points="'+p.map(q=>q[0].toFixed(1)+','+q[1].toFixed(1)).join(' ')+'"/>';
  b+=pl([[X(50),Y(.9)],[X(94),Y(.9)]],'var(--mute)',1)+pl(g,'var(--c3)')+pl(k,'var(--c2)');
  b+='<line x1="'+l+'" x2="'+(l+22)+'" y1="10" y2="10" stroke="var(--mute)" stroke-width="2" stroke-dasharray="5 4"/>'+T(l+28,14,'raw agreement, 90% at every setting',{fs:11,fill:'var(--mute)'});
  const v=S.kappa2(s0-5,5,5,100-s0-5);
  b+='<line x1="'+X(s0)+'" x2="'+X(s0)+'" y1="'+t+'" y2="'+bt+'" stroke="var(--acc)" stroke-dasharray="2 3"/>';
  b+='<circle cx="'+X(s0)+'" cy="'+Y(v[1])+'" r="5" fill="var(--c2)"/><circle cx="'+X(s0)+'" cy="'+Y(v[2])+'" r="5" fill="var(--c3)"/>';
  const lab=(y,txt,c)=>{const right=X(s0)<(l+r)/2;return T(X(s0)+(right?8:-8),y,txt,{fs:11.5,a:right?'start':'end',fill:c,w:600})};
  const ya=Y(v[2]),yk=Y(v[1]);b+=lab(ya-7,"AC1 "+v[2].toFixed(2),'var(--c3)')+lab(Math.max(yk+16,ya+16),"kappa "+v[1].toFixed(2),'var(--c2)');
  el.innerHTML=svg(w,h,b,'Kappa and AC1 against prevalence')}

// ---- the gold-error-aware routine
function routine(){const el=$('rd-routine');if(!el)return;const w=W(el),narrow=w<560,fs=11.5,lh=14.5;
  const mw=narrow?w*0.62:w*0.58,bx=narrow?w*0.66:w*0.64,bwid=w-bx-2,lx=narrow?30:34;
  const main=[['Gold label stored with confidence and provenance','1'],['A gate fails: the model disagrees with the gold label',''],['Consensus battery: models from several families re-answer the item','2'],
    ['Consensus against the key: people adjudicate','3'],['Corrected label, or "ambiguous: exclude from gating"',''],['Gate on the verified subset; track the full set','4']];
  let y=6,b='',boxes=[];const mk='he-rt-ar';
  main.forEach((m,i)=>{const lines=wrap((m[1]?m[1]+'  ':'')+m[0],mw-lx-20,fs),h=lines.length*lh+12;boxes.push([lx,y,mw-lx,h]);
    b+='<rect x="'+lx+'" y="'+y+'" width="'+(mw-lx)+'" height="'+h+'" rx="7" fill="'+(i===3?'var(--acc2)':'var(--bg)')+'" stroke="'+(i===3?'var(--acc)':'var(--line)')+'" stroke-width="1.5"/>';
    lines.forEach((ln,j)=>{if(j===0&&m[1]){const k=ln.indexOf(' ');b+='<text x="'+(lx+10)+'" y="'+(y+18)+'" font-size="'+fs+'" fill="var(--ink)"><tspan font-weight="700" fill="var(--acc)">'+esc(ln.slice(0,k))+'</tspan>'+esc(ln.slice(k))+'</text>'}else b+=T(lx+10,y+18+j*lh,ln,{fs})});
    if(i<main.length-1)b+='<line x1="'+(lx+(mw-lx)/2)+'" y1="'+(y+h+1)+'" x2="'+(lx+(mw-lx)/2)+'" y2="'+(y+h+19)+'" stroke="var(--mute)" stroke-width="1.5" marker-end="url(#'+mk+')"/>';
    y+=h+22});
  const H=y-14;
  // branch: consensus with the key
  const b2=boxes[2],bl=wrap('Consensus with the key: a real model error; believe the failure',bwid-16,fs),bh=bl.length*lh+12,by=b2[1]+b2[3]/2-bh/2;
  b+='<line x1="'+(mw+1)+'" y1="'+(b2[1]+b2[3]/2)+'" x2="'+(bx-3)+'" y2="'+(b2[1]+b2[3]/2)+'" stroke="var(--mute)" stroke-width="1.5" marker-end="url(#'+mk+')"/>';
  b+='<rect x="'+bx+'" y="'+by+'" width="'+bwid+'" height="'+bh+'" rx="7" fill="var(--soft)" stroke="var(--line)"/>';
  bl.forEach((ln,j)=>{b+=T(bx+8,by+18+j*lh,ln,{fs})});
  // loop 5: every gate failure re-enters
  const f=boxes[5],g=boxes[1],xl=lx-14;
  b+='<path d="M'+lx+','+(f[1]+f[3]/2)+' H'+xl+' V'+(g[1]+g[3]/2)+' H'+(lx-3)+'" fill="none" stroke="var(--acc)" stroke-width="1.5" marker-end="url(#'+mk+')"/>';
  b+='<text x="'+(xl-5)+'" y="'+((f[1]+g[1]+g[3])/2)+'" font-size="11.5" font-weight="600" fill="var(--acc)" text-anchor="middle" transform="rotate(-90 '+(xl-5)+' '+((f[1]+g[1]+g[3])/2)+')">5  every failure, continuously</text>';
  el.innerHTML=svg(w,H,b,'The gold-error-aware routine',mk)}

function all(){hero();pools();chaos();par();routine()}
all();
const sl=$('rd-par-s');if(sl)sl.addEventListener('input',par);
(window.TAB_RENDER=window.TAB_RENDER||{})['t-read']=(window.TAB_RENDER['t-read']||[]).concat([all]);
let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{const r=$('t-read');if(r&&!r.hidden)all()},120)});
})();
