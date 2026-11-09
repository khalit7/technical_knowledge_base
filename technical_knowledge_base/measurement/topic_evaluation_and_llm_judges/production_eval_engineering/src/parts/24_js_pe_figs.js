// Reading figures (2D): hero promotion path, golden-set anatomy, online sampling slider, drift test. All drawn at the measured width; nothing moves by itself.
// The error-analysis stepper and the four exposure designs became the 3D stages Fig. 1 and Fig. 4 on 2026-11-09 (27_js_sc_ea.js, 30_js_sc_exp.js).
(function(){
if(!window.RD)return;
const $=id=>document.getElementById(id),T=RD.t,esc=RD.esc;
// word wrap by an estimated character width (11 px sans is about 6 px a character)
function wrap(s,px,fs){const max=Math.max(6,Math.floor(px/((fs||11)*0.56)));const out=[];let line='';
  s.split(' ').forEach(w=>{if((line+' '+w).trim().length>max&&line){out.push(line);line=w}else line=(line+' '+w).trim()});if(line)out.push(line);return out}
function lines(x,y,arr,o){o=o||{};const lh=o.lh||14;return arr.map((s,i)=>T(x,y+i*lh,esc(s),o)).join('')}
function box(x,y,w,h,o){o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+(o.r||6)+'" fill="'+(o.fill||'var(--soft)')+'" stroke="'+(o.stroke||'var(--line)')+'" stroke-width="'+(o.sw||1)+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+'/>'}
function arrow(x1,y1,x2,y2,o){o=o||{};const a=Math.atan2(y2-y1,x2-x1),L=7;
  return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+(o.c||'var(--mute)')+'" stroke-width="'+(o.w||1.4)+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+'/>'+
  '<path d="M'+x2+' '+y2+'L'+(x2-L*Math.cos(a-0.45))+' '+(y2-L*Math.sin(a-0.45))+'L'+(x2-L*Math.cos(a+0.45))+' '+(y2-L*Math.sin(a+0.45))+'Z" fill="'+(o.c||'var(--mute)')+'"/>'}
const defs=[];
function reg(f){defs.push(f);RD.onRender(f)}
RD.onResize(()=>defs.forEach(f=>f()));

// ---------- Hero: the promotion path ----------
const ST=[
 {n:'1. Offline gate',s:'golden set, in CI',t:'minutes per change',c:'regressions on your own cases',u:0},
 {n:'2. Budget gate',s:'same runs',t:'seconds',c:'a quality win you cannot pay for',u:0},
 {n:'3. Shadow',s:'mirrored live requests',t:'doubles inference',c:'real inputs nobody imagined',u:0},
 {n:'4. Canary, A/B',s:'real users',t:'days to weeks',c:'how users react',u:1},
 {n:'5. Monitoring',s:'sampled live traces',t:'continuous',c:'decay after launch',u:2}];
const EXPO=['no users see it','no users see it','no users see it','a share of users','all users'];
function hero(){const el=$('pe-hero-svg');if(!el)return;const w=RD.width(el);let s='';
  if(w>=640){
    const gap=10,bw=(w-gap*4)/5,y0=26,lh=13.5;
    // each box's lines, wrapped to its width; the boxes share the tallest height
    const LY=ST.map(d=>{const sub=wrap(d.s,bw-16),cost=wrap(d.t,bw-16),cat=wrap(d.c,bw-16);return {sub,cost,cat,h:22+sub.length*lh+8+(1+cost.length)*lh+6+(1+cat.length)*lh+4}});
    const bh=Math.max(...LY.map(l=>l.h));
    s+=T(0,13,'a change (prompt, model, retrieval, tool) enters on the left; it must beat the champion at every stage',{fs:11.5,fill:'var(--mute)'});
    ST.forEach((d,i)=>{const x=i*(bw+gap),hl=i===0;
      s+=box(x,y0,bw,bh,{fill:hl?'var(--acc2)':'var(--soft)',stroke:hl?'var(--acc)':'var(--line)',sw:hl?1.6:1});
      const l=LY[i];let yy=y0+18;s+=T(x+8,yy,esc(d.n),{fs:12.5,w:600});yy+=lh+1;s+=lines(x+8,yy,l.sub,{fs:11,fill:'var(--mute)',lh});yy+=l.sub.length*lh+8;
      s+=T(x+8,yy,'cost:',{fs:11,fill:'var(--mute)'})+lines(x+8,yy+lh,l.cost,{fs:11,lh});yy+=(1+l.cost.length)*lh+6;
      s+=T(x+8,yy,'catches:',{fs:11,fill:'var(--mute)'})+lines(x+8,yy+lh,l.cat,{fs:11,fill:'var(--good)',lh});
      if(i<4)s+=arrow(x+bw+1,y0+bh/2,x+bw+gap-1,y0+bh/2,{c:'var(--ink)'});
      const ey=y0+bh+10,op=[.12,.12,.12,.45,.9][i];
      s+='<rect x="'+x+'" y="'+ey+'" width="'+bw+'" height="18" rx="3" fill="var(--bad)" fill-opacity="'+op+'"/>'+T(x+bw/2,ey+13,EXPO[i],{fs:11,a:'middle'});
    });
    const ly=y0+bh+50;
    s+=T(w,ly-6,'users exposed if a bad change gets this far',{fs:11,a:'end',fill:'var(--mute)'});
    const x5=4*(bw+gap)+bw/2,x3=2*(bw+gap)+bw/2,x1=bw/2;
    s+='<path d="M'+x5+' '+(ly+2)+'V'+(ly+30)+'H'+(x1+6)+'" fill="none" stroke="var(--acc)" stroke-width="1.6" stroke-dasharray="5 4"/>';
    s+='<path d="M'+x3+' '+(ly+2)+'V'+(ly+30)+'" fill="none" stroke="var(--acc)" stroke-width="1.6" stroke-dasharray="5 4"/>';
    s+='<path d="M'+(3*(bw+gap)+bw/2)+' '+(ly+2)+'V'+(ly+30)+'" fill="none" stroke="var(--acc)" stroke-width="1.6" stroke-dasharray="5 4"/>';
    s+=arrow(x1,ly+30,x1,y0+bh+30,{c:'var(--acc)',w:1.6});
    s+=T(x1+14,ly+46,'every failure found later is read, named and promoted into the golden set (sections 1 and 2)',{fs:11.5,fill:'var(--acc)'});
    el.innerHTML=RD.svg(w,ly+54,s,'The promotion path: five stages and the loop back to the golden set');
  }else{
    const bh=62,gap=16,x0=22,bw=w-x0;let y=20;
    s+=T(0,12,'a change enters at the top',{fs:11,fill:'var(--mute)'});
    ST.forEach((d,i)=>{const hl=i===0;
      s+=box(x0,y,bw,bh,{fill:hl?'var(--acc2)':'var(--soft)',stroke:hl?'var(--acc)':'var(--line)',sw:hl?1.6:1});
      s+=T(x0+8,y+16,esc(d.n),{fs:12.5,w:600})+T(bw+x0-8,y+16,EXPO[i],{fs:11,a:'end',fill:i>2?'var(--bad)':'var(--mute)'});
      s+=T(x0+8,y+32,esc(d.s+'; '+d.t),{fs:11,fill:'var(--mute)'});
      s+=T(x0+8,y+50,esc('catches: '+d.c),{fs:11,fill:'var(--good)'});
      if(i<4)s+=arrow(x0+bw/2,y+bh+1,x0+bw/2,y+bh+gap-1,{c:'var(--ink)'});
      y+=bh+gap});
    s+='<path d="M'+(x0+4)+' '+(y-gap-bh/2)+'H8V'+(20+bh/2)+'" fill="none" stroke="var(--acc)" stroke-width="1.6" stroke-dasharray="5 4"/>'+arrow(8,20+bh/2,x0-1,20+bh/2,{c:'var(--acc)',w:1.6});
    s+=lines(0,y+6,wrap('dashed: every failure found later is promoted into the golden set (sections 1 and 2)',w,11.5),{fs:11.5,fill:'var(--acc)'});
    el.innerHTML=RD.svg(w,y+26,s,'The promotion path: five stages and the loop back to the golden set');
  }
}
reg(hero);

// ---------- Golden-set anatomy ----------
function gs(){const el=$('pe-gs-svg');if(!el)return;const w=RD.width(el);let s='';
  const SRC=[['Real traffic','sampled, deduplicated, PII scrubbed'],['Incidents','every production failure'],['Adversarial and edge','inputs built to break it'],['Safety canaries','always refuse, or always answer']];
  const ITEM=[['input','the request, with context'],['expected','reference answer, rubric or checks'],['tags','intent, difficulty, source incident'],['version','set v3, rubric v3']];
  const SU=[['Regression suite','guards what works: pass rate near 100%; gate on drops','var(--good)'],['Capability suite','what it cannot yet do: low pass rate; climb it','var(--c4)'],['Held-out split','never published, never sent to a vendor','var(--mute)']];
  if(w>=640){const cw=(w-60)/3,x1=0,x2=cw+30,x3=2*cw+60,h=4*52;
    s+=T(x1,12,'sources',{fs:11,fill:'var(--mute)'})+T(x2,12,'one golden item',{fs:11,fill:'var(--mute)'})+T(x3,12,'two suites with different jobs',{fs:11,fill:'var(--mute)'});
    SRC.forEach((d,i)=>{const y=20+i*52;s+=box(x1,y,cw,44)+T(x1+8,y+17,esc(d[0]),{fs:12,w:600})+lines(x1+8,y+33,wrap(d[1],cw-16).slice(0,1),{fs:11,fill:'var(--mute)'})+arrow(x1+cw+2,y+22,x2-3,20+h/2-4,{c:'var(--line)'})});
    s+=box(x2,20,cw,h-8,{fill:'var(--bg)',stroke:'var(--acc)',sw:1.6});
    ITEM.forEach((d,i)=>{const y=40+i*48;s+=T(x2+10,y,esc(d[0]),{fs:12,w:600,fill:i===2?'var(--acc)':'var(--ink)'})+lines(x2+10,y+16,wrap(d[1],cw-20).slice(0,2),{fs:11,fill:'var(--mute)'})});
    s+='<rect x="'+(x2+6)+'" y="'+(40+2*48-14)+'" width="'+(cw-12)+'" height="36" rx="4" fill="var(--hl)" fill-opacity=".55"/>';
    s+=lines(x2+10,40+2*48,['tags'],{fs:12,w:600,fill:'var(--acc)'})+lines(x2+10,40+2*48+16,wrap(ITEM[2][1],cw-20).slice(0,2),{fs:11});
    SU.forEach((d,i)=>{const y=20+i*70;s+=box(x3,y,cw,60,{stroke:d[2],sw:1.4})+T(x3+8,y+17,esc(d[0]),{fs:12,w:600,fill:d[2]})+lines(x3+8,y+33,wrap(d[1],cw-16).slice(0,2),{fs:11});
      if(i<2)s+=arrow(x2+cw+2,20+h/2-4,x3-3,y+30,{c:'var(--line)'})});
    el.innerHTML=RD.svg(w,20+h+4,s,'Anatomy of a golden set: sources, one tagged item, regression and capability suites');
  }else{let y=16;const bw=w;
    s+=T(0,12,'sources',{fs:11,fill:'var(--mute)'});
    SRC.forEach((d,i)=>{const col=i%2,bx=col*(bw/2+4),by=y+Math.floor(i/2)*64,ww=bw/2-4;s+=box(bx,by,ww,58)+lines(bx+6,by+16,wrap(d[0],ww-12).slice(0,1),{fs:11.5,w:600})+lines(bx+6,by+31,wrap(d[1],ww-12).slice(0,2),{fs:11,fill:'var(--mute)'})});
    y+=132;s+=arrow(bw/2,y,bw/2,y+14,{c:'var(--mute)'});y+=18;
    s+=box(0,y,bw,4*30+10,{fill:'var(--bg)',stroke:'var(--acc)',sw:1.6});
    ITEM.forEach((d,i)=>{const yy=y+20+i*30;if(i===2)s+='<rect x="4" y="'+(yy-14)+'" width="'+(bw-8)+'" height="22" rx="4" fill="var(--hl)" fill-opacity=".55"/>';
      s+=T(8,yy,esc(d[0]),{fs:12,w:600,fill:i===2?'var(--acc)':'var(--ink)'})+T(72,yy,esc(wrap(d[1],bw-80)[0]),{fs:11})});
    y+=4*30+10;s+=arrow(bw/2,y+2,bw/2,y+16,{c:'var(--mute)'});y+=20;
    SU.forEach((d,i)=>{const lw=wrap(d[1],bw-16);s+=box(0,y,bw,22+lw.length*14,{stroke:d[2],sw:1.4})+T(8,y+16,esc(d[0]),{fs:12,w:600,fill:d[2]})+lines(8,y+31,lw,{fs:11});y+=28+lw.length*14});
    el.innerHTML=RD.svg(w,y,s,'Anatomy of a golden set: sources, one tagged item, regression and capability suites');
  }
}
reg(gs);

// ---------- Online sampling slider ----------
const RATES=[0.001,0.0025,0.005,0.01,0.02,0.05,0.1,0.2,0.5,0.75,1],REQ=1e6,PRICE=0.03,SLICE=0.02;
function smp(){const el=$('pe-smp-svg'),r=$('pe-smp-r');if(!el||!r)return;const w=RD.width(el),rate=RATES[+r.value];
  $('pe-smp-v').textContent=(rate*100)+'%';
  const l=10,rr=10,X=v=>l+(Math.log10(v)+3)/3*(w-l-rr),h=86;let s='';
  s+='<rect x="'+X(0.01)+'" y="22" width="'+(X(0.1)-X(0.01))+'" height="30" fill="var(--c6)" fill-opacity=".18"/>'+T(X(0.01)+4,18,'1-10%: high volume',{fs:11,fill:'var(--c6)'});
  s+='<rect x="'+X(0.5)+'" y="22" width="'+(X(1)-X(0.5))+'" height="30" fill="var(--c4)" fill-opacity=".18"/>'+T(X(1),18,w<480?'50-100%: critical':'50-100%: low volume or critical',{fs:11,a:'end',fill:'var(--c4)'});
  s+='<line x1="'+l+'" x2="'+(w-rr)+'" y1="52" y2="52" stroke="var(--mute)"/>';
  [0.001,0.01,0.1,1].forEach(v=>{s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="48" y2="56" stroke="var(--mute)"/>'+T(Math.min(w-rr-14,Math.max(l+12,X(v))),70,(v*100)+'%',{fs:11,a:'middle',fill:'var(--mute)'})});
  s+='<circle cx="'+X(rate)+'" cy="37" r="7" fill="var(--acc)"/>';
  s+=T(w/2,84,'share of live traces judged (log scale); bands: Braintrust\'s advice',{fs:11,a:'middle',fill:'var(--mute)'});
  el.innerHTML=RD.svg(w,h+4,s,'Sampling rate on a log axis with the vendor bands');
  const n=REQ*rate,c=n*PRICE,fmt=x=>x.toLocaleString('en-US',{maximumFractionDigits:0});
  $('pe-smp-out').innerHTML=RD.stat('Judged traces a day',fmt(n),'of 1,000,000 requests')+RD.stat('Judge cost a day','$'+fmt(c),'at $0.03 a trace')+RD.stat('Judge cost a month','$'+fmt(c*30),'30 days')+RD.stat('Judged in a 2% slice',fmt(n*SLICE),'a day (illustrative slice)');
}
if($('pe-smp')){$('pe-smp-r').addEventListener('input',smp);reg(smp)}

// ---------- Drift test ----------
function drift(){const el=$('pe-drift-svg');if(!el)return;const w=RD.width(el);let s='';const narrow=w<760;
  const cw=narrow?w:(w-40)*0.42,wx=0;
  s+=box(wx,8,cw*0.48,62,{stroke:'var(--c1)'})+T(wx+8,26,'last month',{fs:12,w:600})+T(wx+8,42,'inputs labelled 0',{fs:11,fill:'var(--mute)'})+T(wx+8,58,'(reference window)',{fs:11,fill:'var(--mute)'});
  s+=box(wx+cw*0.52,8,cw*0.48,62,{stroke:'var(--c2)'})+T(wx+cw*0.52+8,26,'this week',{fs:12,w:600})+T(wx+cw*0.52+8,42,'inputs labelled 1',{fs:11,fill:'var(--mute)'})+T(wx+cw*0.52+8,58,'(current window)',{fs:11,fill:'var(--mute)'});
  let gx,gy,gw;
  if(narrow){s+=arrow(w/2,72,w/2,90);s+=box(0,92,w,30,{fill:'var(--acc2)',stroke:'var(--acc)'})+T(w/2,111,'classifier: which window is this input from?',{fs:11.5,a:'middle'});s+=arrow(w/2,124,w/2,140);gx=10;gy=150;gw=w-20}
  else{const cx=cw+20;s+=arrow(cw+2,39,cx+8,39);s+=box(cx+10,20,150,40,{fill:'var(--acc2)',stroke:'var(--acc)'})+T(cx+85,36,'classifier',{fs:12,a:'middle',w:600})+T(cx+85,51,'which window?',{fs:11,a:'middle'});
    s+=arrow(cx+162,39,cx+184,39);gx=cx+190;gy=14;gw=w-gx-8}
  const X=v=>gx+(v-0.5)/0.5*gw;
  s+='<rect x="'+X(0.55)+'" y="'+(gy+10)+'" width="'+(X(1)-X(0.55))+'" height="20" fill="var(--bad)" fill-opacity=".16"/>';
  s+='<line x1="'+X(0.5)+'" x2="'+X(1)+'" y1="'+(gy+30)+'" y2="'+(gy+30)+'" stroke="var(--mute)"/>';
  [0.5,0.55,0.75,1].forEach(v=>{s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+(gy+26)+'" y2="'+(gy+34)+'" stroke="var(--mute)"/>'+(v===0.5?'':T(Math.min(X(1)-10,X(v)),gy+47,v===1?'1.0':v.toFixed(2),{fs:11,a:'middle',fill:'var(--mute)'}))});
  s+='<line x1="'+X(0.55)+'" x2="'+X(0.55)+'" y1="'+(gy+6)+'" y2="'+(gy+34)+'" stroke="var(--bad)" stroke-dasharray="3 3"/>';
  s+=T(gx,gy+4,'ROC AUC',{fs:11,fill:'var(--mute)'})+T(X(1),gy+4,'above 0.55: drift',{fs:11,a:'end',fill:'var(--bad)'});
  s+=T(gx,gy+62,'0.5: cannot tell the windows apart',{fs:11,fill:'var(--mute)'});
  el.innerHTML=RD.svg(w,gy+70,s,'Drift test: a classifier separating last month from this week, alarm above ROC AUC 0.55');
}
reg(drift);
})();
