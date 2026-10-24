// Reading figures drawn as SVG at the measured width (2026-10-24 rebuild): hero, do-nothing bars, message-vs-state 2x2,
// path-matcher ladder, judges with and without tools, pass^k curves, failure taxonomy, environment diagram, cost bars.
// Numbers come from window.ATJ_OUT (22_js_calc.js, checked against recompute.json) or D.meta; published figures are cited in the captions.
(function(){
const D=window.ATJ,O=window.ATJ_OUT;if(!D||!O||!window.RD)return;
const $=id=>document.getElementById(id),E=RD.esc;
const CW=6.3; // approximate width of one character at 11px
const tx=(x,y,s,o)=>RD.t(x,y,E(s),o);
const rect=(x,y,w,h,f,o)=>{o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+Math.max(0,w)+'" height="'+h+'" rx="'+(o.r==null?3:o.r)+'" fill="'+f+'"'+(o.s?' stroke="'+o.s+'"':'')+(o.dash?' stroke-dasharray="4 3"':'')+(o.sw?' stroke-width="'+o.sw+'"':'')+(o.op?' fill-opacity="'+o.op+'"':'')+'/>'};
const line=(x1,y1,x2,y2,c,o)=>{o=o||{};return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+c+'" stroke-width="'+(o.sw||1.5)+'"'+(o.dash?' stroke-dasharray="4 3"':'')+(o.m?' marker-end="url(#aj-arr)"':'')+'/>'};
const ARR='<defs><marker id="aj-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--mute)"/></marker></defs>';
const MOD={gpt52:'GPT-5.2',opus45:'Opus 4.5'};
const draws=[];const reg=f=>{draws.push(f)};
function all(){draws.forEach(f=>{try{f()}catch(e){if(window.console)console.error(e)}})}

// chips laid out left to right, wrapping; returns {svg, h}
function chips(x0,y0,w,items){let x=x0,y=y0,s='';const H=22,G=6;
  items.forEach(it=>{const cw=Math.min(w,it.t.length*CW+16);if(x+cw>x0+w){x=x0;y+=H+G}
    s+=rect(x,y,cw,H,it.f||'var(--soft)',{s:it.s||'var(--line)',sw:it.sw||1,dash:it.dash})+tx(x+8,y+15,it.t,{fs:11,fill:it.c,w:it.b?600:null});x+=cw+G});
  return {svg:s,h:y+H-y0}}

// 1. hero: the default trial, three layers, three graders
reg(function(){const el=$('aj-hero-svg');if(!el)return;const w=RD.width(el),nar=w<560;
  const lanes=[
   {t:'Said: the messages',g:'Message grader (transcript judge)',v:'pass',items:nar?[{t:'U: cancel, rebook'},{t:'U: insurance? yes'},{t:'U: gift card + card'},{t:'A: "All set."',b:1}]:[{t:'User: cancel and rebook'},{t:'User: "Insurance: Yes, please"'},{t:'User: gift card, then the card'},{t:'Agent: "All set."',b:1}]},
   {t:'Did: the tool calls',g:'Step grader (gold actions)',v:'fail',items:nar?[{t:'get_reservation ✓'},{t:'get_user +'},{t:'search ×3 +'},{t:'book ≈',f:'var(--hl)',s:'var(--acc)',sw:2},{t:'cancel ✓',f:'var(--hl)',s:'var(--acc)',sw:2}]:[{t:'get_reservation_details ✓'},{t:'get_user_details +'},{t:'search_direct_flight ×3 +'},{t:'book_reservation ≈ (write)',f:'var(--hl)',s:'var(--acc)',sw:2},{t:'cancel_reservation ✓ (write)',f:'var(--hl)',s:'var(--acc)',sw:2}]},
   {t:'Changed: the database against the gold',g:'Outcome grader (state diff)',v:'fail',items:nar?[{t:'insurance: no → yes'},{t:'$282 card → $279 gift + $33'},{t:'6 fields differ',b:1,c:'var(--bad)'}]:[{t:'insurance: gold no, agent yes'},{t:'payment: gold $282 on the card, agent $279 gift card + $33 card'},{t:'6 fields differ',b:1,c:'var(--bad)'}]}];
  let y=4,s='';
  lanes.forEach((L,k)=>{const top=y;y+=16;s+=tx(10,y,(k+1)+'. '+L.t,{fs:12,w:600});
    const vt=L.g+': '+L.v,vc=L.v==='pass'?'var(--good)':'var(--bad)';
    if(nar){y+=16;s+=tx(10,y,vt,{fs:11,fill:vc,w:600})}else s+=tx(w-10,y,vt,{fs:11.5,fill:vc,w:600,a:'end'});
    y+=8;const c=chips(10,y,w-20,L.items);s+=c.svg;y+=c.h+10;
    s=rect(1,top,w-2,y-top,'none',{s:'var(--line)'})+s;y+=8});
  el.innerHTML=RD.svg(w,y,s,'One trial in three layers: messages, tool calls and the database, each read by a different grader')});

// horizontal bars: rows [{l, segs:[[value,colour]], v}], scale max
function hbars(el,rows,max,opts){opts=opts||{};const w=RD.width(el),lw=Math.min(opts.lw||190,Math.round(w*.42)),vw=opts.vw||52,bw=w-lw-vw-12,H=opts.H||24;let y=4,s='';
  rows.forEach(r=>{if(r.band){y+=6;s+=tx(0,y+12,r.band,{fs:11.5,fill:'var(--mute)',w:600});y+=20;return}
    s+=tx(lw-6,y+H/2+4,r.l,{fs:11,a:'end',w:r.b?600:null});let x=lw;s+=rect(lw,y+3,bw,H-6,'var(--soft)',{r:2});
    r.segs.forEach(([v,c,t])=>{const ww=bw*v/max;s+=rect(x,y+3,ww,H-6,c,{r:0});if(t&&ww>t.length*CW+6)s+=tx(x+4,y+H/2+4,t,{fs:11,fill:'var(--bg)',w:600});x+=ww});
    if(r.mark!=null)s+=line(lw+bw*r.mark/max,y,lw+bw*r.mark/max,y+H,'var(--ink)',{sw:1.5,dash:1});
    s+=tx(lw+bw+6,y+H/2+4,r.v,{fs:11.5,w:600});y+=H});
  el.innerHTML=RD.svg(w,y+6,s,opts.label||'bar chart')}

// 2. do-nothing bars
reg(function(){const el=$('aj-null-svg');if(!el)return;const N=D.meta.null;
  const rows=[{band:'Do-nothing agent: share of tasks passed'}];
  [['airline','Airline'],['retail','Retail (DB only)'],['telecom','Telecom']].forEach(([k,l])=>rows.push({l:l+' ('+N[k].n+')',segs:[[100*N[k].pass/N[k].n,'var(--c5)']],v:N[k].pass+'/'+N[k].n}));
  rows.push({band:'Each agent\'s airline passes, by task kind'});
  ['gpt52','opus45'].forEach(m=>{const o=O[m],a=o.passes_on_null_tasks,b=o.passes-a;rows.push({l:MOD[m],segs:[[100*a/200,'var(--c5)',a+''],[100*b/200,'var(--c3)',b+'']],v:o.passes+'/200'})});
  hbars(el,rows,100,{label:'Do-nothing agent pass shares and each agent\'s passes split by task kind'});
  el.insertAdjacentHTML('beforeend','<div class="leg"><span><i style="background:var(--c5)"></i>passed by doing nothing (no-change tasks)</span><span><i style="background:var(--c3)"></i>passed on tasks that need a change</span></div>')});

// 3. message judge against database, 2x2
reg(function(){const el=$('aj-m22-svg');if(!el)return;const t=O.agree_msg_state,w=RD.width(el),nar=w<480;
  const lw=nar?78:120,th=36,cw=Math.min(190,(w-lw-8)/2),ch=nar?62:70;let s='';
  s+=tx(lw+cw,14,'Database check',{fs:11.5,a:'middle',w:600});
  s+=tx(lw+cw/2,30,'pass',{fs:11,a:'middle',fill:'var(--mute)'})+tx(lw+cw*1.5,30,'fail',{fs:11,a:'middle',fill:'var(--mute)'});
  const cell=(r,c,v,lab,col,txc)=>{const x=lw+c*cw,y=th+r*ch;return rect(x+2,y+2,cw-4,ch-4,col,{op:.9})+tx(x+cw/2,y+ch/2+2,v,{fs:20,a:'middle',w:600,fill:txc})+tx(x+cw/2,y+ch/2+18,lab,{fs:11,a:'middle',fill:txc})};
  s+=tx(lw-8,th+ch/2-4,'Judge',{fs:11.5,a:'end',w:600})+tx(lw-8,th+ch/2+12,'pass',{fs:11,a:'end',fill:'var(--mute)'});
  s+=tx(lw-8,th+ch*1.5-4,'Judge',{fs:11.5,a:'end',w:600})+tx(lw-8,th+ch*1.5+12,'fail',{fs:11,a:'end',fill:'var(--mute)'});
  s+=cell(0,0,t['11'],'agree','var(--soft)','var(--ink)')+cell(0,1,t['10'],nar?'says done':'"done", world wrong','var(--bad)','var(--bg)')+cell(1,0,t['01'],nar?'world right':'judge fails, world right','var(--hl)','var(--ink)')+cell(1,1,t['00'],'agree','var(--soft)','var(--ink)');
  el.innerHTML=RD.svg(w,th+2*ch+4,s,'2 by 2 table: transcript judge against database check on 400 trials')});

// 4. path-matcher ladder (GPT-5.2, exact arguments, agreement with the final state)
reg(function(){const el=$('aj-ladder-svg');if(!el)return;const M=D.meta.match;
  const L=[['strict, all calls','gpt52|strict|exact|0'],['superset, all calls','gpt52|superset|exact|0'],['subset, writes','gpt52|subset|exact|1'],['superset, writes','gpt52|superset|exact|1'],['strict, writes','gpt52|strict|exact|1'],['unordered, writes','gpt52|unordered|exact|1']];
  const rows=L.map(([l,k],i)=>({l,segs:[[M[k][1],i===L.length-1?'var(--good)':i===0?'var(--bad)':'var(--c1)']],v:M[k][1]+'/'+M[k][2],b:i===L.length-1}));
  hbars(el,rows,200,{lw:150,label:'Agreement of each path matcher with the final-state check, GPT-5.2'})});

// 5. judges: three designs, then without and with tools
reg(function(){const el=$('aj-judge-svg');if(!el)return;const w=RD.width(el),nar=w<560;let s='',y=2;
  const des=[['Trajectory judge','reads the transcript'],['Agent-as-a-judge','acts: opens files, runs code'],['Process reward model','scores every step']];
  if(nar){des.forEach(([a,b],i)=>{s+=rect(0,y,w,34,i===1?'var(--hl)':'var(--soft)',{s:i===1?'var(--acc)':'var(--line)'})+tx(8,y+14,a,{fs:11.5,w:600})+tx(8,y+28,b,{fs:11,fill:'var(--mute)'});y+=40})}
  else{const bw=(w-16)/3;des.forEach(([a,b],i)=>{const x=i*(bw+8);s+=rect(x,y,bw,40,i===1?'var(--hl)':'var(--soft)',{s:i===1?'var(--acc)':'var(--line)'})+tx(x+8,y+16,a,{fs:12,w:600})+tx(x+8,y+32,b,{fs:11,fill:'var(--mute)'})});y+=48}
  y+=8;s+=tx(0,y+10,'The same judge without tools (open) and with tools (filled)',{fs:11.5,w:600,fill:'var(--mute)'});y+=18;
  const R=nar?[['DevAI (%)',60.38,90.44],['AJ, DeepSeek',64.49,77.34],['AJ, GPT-5-mini',59.00,72.41]]:[['DevAI, agreement %',60.38,90.44],['AJ-Bench, DeepSeek V3.2',64.49,77.34],['AJ-Bench, GPT-5-mini',59.00,72.41]];
  const lw=nar?100:180,x0=lw,x1=w-44,sc=v=>x0+(x1-x0)*(v-50)/50;
  [50,60,70,80,90,100].forEach(v=>{s+=line(sc(v),y,sc(v),y+R.length*30,'var(--line)',{sw:1})+tx(sc(v),y+R.length*30+13,v,{fs:11,a:'middle',fill:'var(--mute)'})});
  R.forEach(([l,a,b],i)=>{const yy=y+i*30+15;s+=tx(lw-8,yy+4,l,{fs:11,a:'end'})+line(sc(a),yy,sc(b),yy,'var(--acc)',{sw:2})+'<circle cx="'+sc(a)+'" cy="'+yy+'" r="5" fill="var(--bg)" stroke="var(--acc)" stroke-width="2"/><circle cx="'+sc(b)+'" cy="'+yy+'" r="5" fill="var(--acc)"/>'+tx(sc(b)+8,yy+4,'+'+(b-a).toFixed(2),{fs:11,w:600})});
  y+=R.length*30+18;el.innerHTML=RD.svg(w,y,s,'Three judge designs; judge scores without and with tools')});

// 6. pass^k curves
reg(function(){const el=$('aj-passk-svg');if(!el)return;const w=RD.width(el),h=200,l=40,r=w<480?78:110,t=10,b=28;let s='';
  const xs=k=>l+(w-l-r)*(k-1)/3,ys=v=>t+(h-t-b)*(90-v)/25;
  [65,70,75,80,85,90].forEach(v=>{s+=line(l,ys(v),w-r,ys(v),'var(--line)',{sw:1})+tx(l-6,ys(v)+4,v+'%',{fs:11,a:'end',fill:'var(--mute)'})});
  [1,2,3,4].forEach(k=>s+=tx(xs(k),h-b+16,'k = '+k,{fs:11,a:'middle',fill:'var(--mute)'}));
  [['gpt52','var(--c1)'],['opus45','var(--c4)']].forEach(([m,c],j)=>{const P=O[m].pass_hat;
    s+='<polyline fill="none" stroke="'+c+'" stroke-width="2.5" points="'+P.map((v,i)=>xs(i+1)+','+ys(v)).join(' ')+'"/>';
    P.forEach((v,i)=>s+='<circle cx="'+xs(i+1)+'" cy="'+ys(v)+'" r="3.5" fill="'+c+'"/>');
    s+=tx(xs(4)+8,ys(P[3])+(j?12:-2),MOD[m]+' '+P[3].toFixed(1),{fs:11,w:600,fill:c})});
  el.innerHTML=RD.svg(w,h,s,'pass^k for k from 1 to 4, both agents')});

// 7. failure taxonomy
reg(function(){const el=$('aj-tax-svg');if(!el)return;const F=O.fail_tax;
  const CAT=[['acted on a no-change task','var(--c2)'],['no write when one was needed','var(--c5)'],['wrong write','var(--c4)'],['gold writes missing','var(--c3)'],['right writes + extra','var(--c6)'],['writes right, info not given','var(--c1)']];
  const mx=Math.max(F.gpt52.reduce((a,b)=>a+b,0),F.opus45.reduce((a,b)=>a+b,0));
  const rows=['gpt52','opus45'].map(m=>({l:MOD[m]+' failures',segs:F[m].map((v,i)=>[v,CAT[i][1],v+'']),v:F[m].reduce((a,b)=>a+b,0)+''}));
  hbars(el,rows,mx,{lw:130,H:44,label:'Failed trials by symptom, each agent'});
  el.insertAdjacentHTML('beforeend','<div class="leg">'+CAT.map(([l,c])=>'<span><i style="background:'+c+'"></i>'+l+'</span>').join('')+'</div>');
  const n=$('f-n');if(n)n.textContent=F.gpt52.reduce((a,b)=>a+b,0)+F.opus45.reduce((a,b)=>a+b,0)});

// 8. environment diagram
reg(function(){const el=$('aj-env-svg');if(!el)return;const w=RD.width(el),nar=w<620;let s=ARR;
  const box=(x,y,bw,bh,a,b,hl)=>rect(x,y,bw,bh,hl?'var(--hl)':'var(--soft)',{s:hl?'var(--acc)':'var(--line)'})+tx(x+8,y+16,a,{fs:12,w:600})+(b?tx(x+8,y+31,b,{fs:11,fill:'var(--mute)'}):'');
  let h;
  if(!nar){const G=124,cw=(w-2*G)/3,X=[0,cw+G,2*cw+2*G];
    s+=box(X[0],40,cw,44,'Simulated user','pinned model + instructions');
    s+=rect(X[1]-8,4,cw+16,210,'none',{s:'var(--ink)',dash:1})+tx(X[1],18,'Sandbox: what the agent can change',{fs:11,w:600,fill:'var(--mute)'});
    s+=box(X[1],40,cw,44,'Agent','production prompt, tools, limits');
    s+=box(X[1],112,cw,44,'Tools','reads and writes; network policy',1);
    s+=box(X[1],164,cw,44,'State (database)','rebuilt every trial');
    s+=rect(X[2]-8,4,cw+16,210,'none',{s:'var(--bad)',dash:1})+tx(X[2],18,'Verifier: out of reach',{fs:11,w:600,fill:'var(--bad)'});
    s+=box(X[2],40,cw,44,'Gold actions','replayed on a fresh copy');
    s+=box(X[2],112,cw,44,'Gold state','what the end state must be');
    s+=box(X[2],164,cw,44,'Checker','diff, tests, forbidden actions');
    s+=line(X[0]+cw,62,X[1]-10,62,'var(--mute)',{m:1})+tx((X[0]+cw+X[1])/2-4,56,'talks',{fs:11,a:'middle',fill:'var(--mute)'})+line(X[1]+cw/2,84,X[1]+cw/2,110,'var(--mute)',{m:1})+line(X[1]+cw/2,156,X[1]+cw/2,162,'var(--mute)',{m:1});
    s+=line(X[2]+cw/2,84,X[2]+cw/2,110,'var(--mute)',{m:1})+line(X[2]+cw/2,156,X[2]+cw/2,162,'var(--mute)',{m:1});
    s+=line(X[1]+cw+8,186,X[2]-10,186,'var(--mute)',{m:1,dash:1})+tx((X[1]+cw+X[2])/2,180,'copy after the run',{fs:11,a:'middle',fill:'var(--mute)'});
    h=222}
  else{const bw=w-24;let y=4;
    s+=box(12,y,bw,40,'Simulated user','pinned model + instructions');y+=40;s+=line(w/2,y,w/2,y+16,'var(--mute)',{m:1});y+=18;
    const sy=y;y+=20;s+=tx(12,y-6,'Sandbox: what the agent can change',{fs:11,w:600,fill:'var(--mute)'});
    s+=box(12,y,bw,40,'Agent','production prompt, tools, limits');y+=46;s+=box(12,y,bw,40,'Tools','reads and writes; network policy',1);y+=46;s+=box(12,y,bw,40,'State (database)','rebuilt every trial');y+=48;
    s+=rect(4,sy,w-8,y-sy,'none',{s:'var(--ink)',dash:1});
    s+=line(w/2,y,w/2,y+18,'var(--mute)',{m:1,dash:1})+tx(w/2+6,y+13,'copy after the run',{fs:11,fill:'var(--mute)'});y+=22;
    const vy=y;y+=20;s+=tx(12,y-6,'Verifier: out of reach',{fs:11,w:600,fill:'var(--bad)'});
    s+=box(12,y,bw,40,'Gold actions → gold state','replayed on a fresh copy');y+=46;s+=box(12,y,bw,40,'Checker','diff, tests, forbidden actions');y+=48;
    s+=rect(4,vy,w-8,y-vy,'none',{s:'var(--bad)',dash:1});h=y+4}
  el.innerHTML=RD.svg(w,h,s,'Evaluation environment: simulated user, sandbox with agent, tools and state, and the verifier outside it')});

// 9. cost bars
reg(function(){const el=$('aj-cost-svg');if(!el)return;const mx=Math.max(O.gpt52.cost_fail,O.opus45.cost_fail),mc=Math.max(O.gpt52.calls_fail,O.opus45.calls_fail);
  const rows=[{band:'Mean agent cost per trial, US dollars (as recorded)'}];
  ['gpt52','opus45'].forEach(m=>{const o=O[m];rows.push({l:MOD[m]+', pass',segs:[[o.cost_pass/mx,'var(--c1)']],v:'$'+o.cost_pass.toFixed(3)},{l:MOD[m]+', fail',segs:[[o.cost_fail/mx,'var(--c2)']],v:'$'+o.cost_fail.toFixed(3)})});
  rows.push({band:'Mean tool calls per trial'});
  ['gpt52','opus45'].forEach(m=>{const o=O[m];rows.push({l:MOD[m]+', pass',segs:[[o.calls_pass/mc,'var(--c1)']],v:o.calls_pass.toFixed(1)},{l:MOD[m]+', fail',segs:[[o.calls_fail/mc,'var(--c2)']],v:o.calls_fail.toFixed(1)})});
  hbars(el,rows,1,{lw:130,vw:56,label:'Cost and tool calls per trial, passing against failing'});
  el.insertAdjacentHTML('beforeend','<div class="leg"><span><i style="background:var(--c1)"></i>passing trials</span><span><i style="background:var(--c2)"></i>failing trials</span></div>')});

all();RD.onRender(all);RD.onResize(all);
})();
