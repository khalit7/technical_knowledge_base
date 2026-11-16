// ---- The paper tab's figures: Fig. 1 (four yardsticks, RD.anim), Fig. 2 (the Monte-Carlo reward on one completion, RD.anim),
// Fig. 3 (where the budget goes), Fig. 4 (the gradient test's overestimate), Fig. 5 (candidates' predicted success against the gain).
// Every number comes from window.PAPER.tables (transcribed from the paper by mk_tables.py) except the illustrative completion of Fig. 2.
(function(){
const T=PAPER.tables;
const S=(w,h,b,l)=>'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+(l||'')+'" style="max-width:100%;height:auto;display:block">'+b+'</svg>';
const tx=(x,y,t,o)=>{o=o||{};return '<text x="'+(+x).toFixed(1)+'" y="'+(+y).toFixed(1)+'" font-size="'+(o.fs||12)+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' fill="'+(o.c||'var(--ink)')+'"'+(o.w?' font-weight="'+o.w+'"':'')+(o.cls?' class="'+o.cls+'"':'')+'>'+t+'</text>'};
const rc=(x,y,w,h,f,o)=>{o=o||{};return '<rect x="'+(+x).toFixed(1)+'" y="'+(+y).toFixed(1)+'" width="'+Math.max(0,w).toFixed(1)+'" height="'+Math.max(0,h).toFixed(1)+'" rx="'+(o.r==null?3:o.r)+'" fill="'+f+'"'+(o.op!=null?' opacity="'+o.op+'"':'')+(o.s?' stroke="'+o.s+'"':'')+(o.cls?' class="'+o.cls+'"':'')+'/>'};
const ln=(x1,y1,x2,y2,c,o)=>{o=o||{};return '<line x1="'+(+x1).toFixed(1)+'" y1="'+(+y1).toFixed(1)+'" x2="'+(+x2).toFixed(1)+'" y2="'+(+y2).toFixed(1)+'" stroke="'+c+'" stroke-width="'+(o.sw||1.2)+'"'+(o.da?' stroke-dasharray="'+o.da+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+'/>'};
const sg=v=>(v>0?'+':v<0?'−':'')+Math.abs(v).toFixed(1);
const W=el=>{const w=el&&el.clientWidth;return w&&w>60?Math.floor(w):Math.max(280,Math.min(640,(document.documentElement.clientWidth||900)-60))};
const row3=(m,mod)=>T.table3.find(r=>r.method===m&&(!mod||r.model===mod));
const t13=c=>T.table13.find(r=>r.config===c);
const t15=c=>T.table15.find(r=>r.config===c);
const seg=(id,f)=>{const el=document.getElementById(id);el.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{f(+b.dataset.m)}))};
const segOn=(id,i)=>document.getElementById(id).querySelectorAll('button').forEach(b=>{const on=+b.dataset.m===i;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on?'true':'false')});

// ---------- Fig. 1: four yardsticks ----------
const upd=row3('k=1 / 2 / 4 , at matched updates').delta.split(' / ').map(v=>[100*parseFloat(v),null,null]);
const P=r=>r?r.slice():null;
const ROWS=[
 {n:'Monte-Carlo, k = 1',c:'var(--c2)',v:[upd[0],P(row3('Monte-Carlo reward, k=1').pts),P(t13('Monte-Carlo, k=1').time_pts),P(t15('Monte-Carlo, k=1').pts)]},
 {n:'Monte-Carlo, k = 2',c:'var(--c2)',v:[upd[1],P(row3('Monte-Carlo reward, k=2').pts),P(t13('Monte-Carlo, k=2').time_pts),null]},
 {n:'Monte-Carlo, k = 4',c:'var(--c2)',v:[upd[2],P(T.table3.find(r=>r.method==='fresh seeds'&&r.block.startsWith('Dense')).pts),P(t13('Monte-Carlo, k=4').time_pts),P(t15('Monte-Carlo, k=4').pts)]},
 {n:'VinePPO-style',c:'var(--c2)',v:[null,null,null,P(t15('VinePPO-style, 4 steps per batch').pts)]},
 {n:'Continuation reuse',c:'var(--c2)',v:[null,null,null,P(t15('Continuation reuse, k=2').pts)]},
 {n:'Critic, TD form',c:'var(--c4)',v:[null,P(row3('Learned critic, TD form','Qwen2.5-1.5B, L4–5').pts),P(t13('Critic, TD form').time_pts),null]},
 {n:'Critic, baseline form',c:'var(--c4)',v:[null,P(row3('Learned critic, baseline form','Qwen2.5-1.5B, L4–5').pts),P(t13('Critic, baseline form').time_pts),null]},
 {n:'Prompt filter',c:'var(--c1)',v:[null,P(row3('Critic filter','Qwen2.5-1.5B, L3–5').pts),P(t13('Critic filter').time_pts),null]}];
window.DR_FIG1=ROWS; // read by check_page.mjs
const CAP=['<b>Equal updates:</b> the Monte-Carlo reward leads (exploratory).',
 '<b>Equal generated tokens (<i>B</i> = 12.25M):</b> the reward falls 7 to 15 points behind.',
 '<b>Equal GPU-hours:</b> continuations are cheap per token, so the loss narrows, but it remains.',
 '<b>Given outcome-only GRPO\'s whole training time</b> (768 tokens, A100): no dense variant gains.'];
const ST=['equal updates','equal tokens','equal GPU-hours','full training time'];
let f1prev=null,f1raf=0;
function drawYard(i,from){const host=document.getElementById('drYardSvg');const w=W(host);
  const lab=w<460?118:150,vc=58,x0=lab+6,x1=w-vc-4,lo=-17,hi=4,X=v=>x0+(x1-x0)*(v-lo)/(hi-lo);
  const rh=w<460?27:30,top=26,h=top+ROWS.length*rh+26;
  const draw=t=>{let s='';
    s+=rc(X(-2),top-6,X(2)-X(-2),ROWS.length*rh+6,'var(--soft)',{r:0});
    for(const g of [-15,-10,-5,0]){s+=ln(X(g),top-6,X(g),top+ROWS.length*rh,g===0?'var(--mute)':'var(--line)',{sw:g===0?1.4:1});s+=tx(X(g),h-8,g===0?'0':sg(g),{fs:11,a:'middle',c:'var(--mute)'})}
    s+=tx(X(2.6),top-10,'±2',{fs:11,a:'middle',c:'var(--mute)'});
    s+=tx(x1+vc,top-10,'points',{fs:11,a:'end',c:'var(--mute)'});
    ROWS.forEach((r,k)=>{const y=top+k*rh,cy=y+rh/2,v=r.v[i],pv=from!=null?r.v[from]:null;
      s+=tx(lab,cy+4,r.n,{fs:w<460?11:12,a:'end',c:v?'var(--ink)':'var(--mute)'});
      if(v){const val=pv?pv[0]+(v[0]-pv[0])*t:v[0]*Math.min(1,t*1.4);const a=X(Math.min(0,val)),b=X(Math.max(0,val));
        s+=rc(a,cy-7,Math.max(1.5,b-a),14,r.c,{op:.88});
        if(v[1]!=null&&t>=1){s+=ln(X(v[1]),cy,X(v[2]),cy,'var(--ink)',{sw:1.3});s+=ln(X(v[1]),cy-4,X(v[1]),cy+4,'var(--ink)',{sw:1.3})+ln(X(v[2]),cy-4,X(v[2]),cy+4,'var(--ink)',{sw:1.3})}
        s+=tx(x1+vc,cy+4,sg(t>=1?v[0]:val),{fs:12,a:'end',w:600,c:r.c})}
      else s+=tx(x1+vc,cy+4,'not run',{fs:11,a:'end',c:'var(--mute)'});
    });
    host.innerHTML=S(w,h,s,'Accuracy minus outcome-only GRPO, in points, at '+ST[i]);
    document.getElementById('drYard').dataset.frames=(+document.getElementById('drYard').dataset.frames||0)+1;
  };
  if(f1raf)cancelAnimationFrame(f1raf);
  if(RD.RM||from==null){draw(1);return}
  const t0=performance.now();const tick=now=>{const t=Math.min(1,(now-t0)/650);draw(t<1?1-(1-t)*(1-t):1);if(t<1)f1raf=requestAnimationFrame(tick);else f1raf=0};f1raf=requestAnimationFrame(tick)}
const yard=RD.anim({card:'drYard',ctl:'drYardCtl',n:4,list:'sx-yard',label:'Yardstick',ms:4200,draw:i=>{const from=f1prev;f1prev=i;segOn('drYardM',i);document.getElementById('drYardCap').innerHTML=CAP[i];drawYard(i,from!==i?from:null)}});
seg('drYardM',i=>yard.go(i));
RD.onResize(()=>{f1prev=yard.i;drawYard(yard.i,null)});

// ---------- Fig. 2: the Monte-Carlo reward on one completion (illustrative outcomes) ----------
const OK=[3,4,3,1,1],PH=[0.5].concat(OK.map(k=>k/4)).concat([0]),CR=PH.slice(1).map((p,j)=>p-PH[j]),A0=-1;
window.DR_FIG2={ph:PH,credit:CR};
const CAP2=['One completion, wrong at the end: <b>R = 0</b>, advantage <b>−1</b> on every token.',
 '<b>5 cuts, 6 segments.</b>',
 '<b>4 continuations from each cut</b>, each checked by the verifier.',
 'Each prefix\'s value: <b>the fraction of its continuations that end correct</b>.',
 'Segment credit = <b>change in value</b>, added to the advantage.',
 'The continuations are thrown away: <b>91% of the tokens</b> at k = 4.'];
function drawMC(i){const host=document.getElementById('drMCSvg');const w=W(host);const nar=w<460;
  const L=14,R=w-14,yb=nar?162:170,segW=(R-L)/6,cx=j=>L+segW*(j+1),h=yb+228;let s='';
  // the group of 8
  s+=tx(L,16,'group of 8 for one prompt',{fs:11,c:'var(--mute)'});
  const gr=[1,0,1,1,0,0,1,0];gr.forEach((g,j)=>{const x=L+8+j*20,y=32;s+='<circle cx="'+x+'" cy="'+y+'" r="7" fill="'+(g?'var(--c3)':'var(--c2)')+'" opacity="'+(j===4?1:.45)+'"'+(j===4?' stroke="var(--ink)" stroke-width="1.5"':'')+'/>'});
  s+=tx(L+8+8*20+2,36,'4 right, 4 wrong',{fs:11,c:'var(--mute)'});
  s+=tx(L,58,'the outlined one: R = 0, A = (0 − 0.5) / 0.5 = −1',{fs:11,c:'var(--ink)',w:600});
  // the completion bar
  s+=tx(L,yb-34,'the completion (tokens left to right)',{fs:11,c:'var(--mute)'});
  for(let j=0;j<6;j++){const x=L+segW*j;const col=i>=4?(CR[j]>0?'var(--c3)':CR[j]<0?'var(--c2)':'var(--dim)'):'var(--dim)';s+=rc(x+1,yb-10,segW-2,20,col,{op:i>=4?.75:1});
    if(i>=1)s+=tx(x+segW/2,yb+4,'s'+(j+1),{fs:11,a:'middle',c:i>=4?'var(--bg)':'var(--ink)'})}
  s+=tx(R,yb-34,i>=4?'R = 0':'',{fs:11,a:'end',c:'var(--c2)',w:600});
  if(i>=1)for(let j=0;j<5;j++){s+=ln(cx(j),yb-16,cx(j),yb+16,'var(--ink)',{sw:2})}
  // continuations: four short branches above each cut
  if(i>=2)for(let j=0;j<5;j++){for(let q=0;q<4;q++){const ex=cx(j)+Math.min(segW*0.85,40)*(0.35+0.2*q),ey=yb-20-(14+q*10)*(nar?0.85:1);const good=q<OK[j];
      s+='<path d="M'+cx(j).toFixed(1)+' '+(yb-16)+' Q '+(cx(j)+6).toFixed(1)+' '+ey.toFixed(1)+' '+ex.toFixed(1)+' '+ey.toFixed(1)+'" fill="none" stroke="var(--mute)" stroke-width="1"/>';
      s+='<circle cx="'+ex.toFixed(1)+'" cy="'+ey.toFixed(1)+'" r="3.6" fill="'+(good?'var(--c3)':'var(--c2)')+'"/>'}}
  // values
  if(i>=3){s+=tx(L,yb+34,'value',{fs:11,c:'var(--mute)'});
    for(let j=0;j<5;j++)s+=tx(cx(j),yb+34,PH[j+1].toFixed(2),{fs:12,a:'middle',w:600,c:'var(--ink)'});
    s+=tx(L,yb+50,'start 0.5 (fixed)',{fs:11,c:'var(--mute)'});s+=tx(R,yb+50,'end: R = 0',{fs:11,a:'end',c:'var(--mute)'})}
  // credits
  const y0=yb+104,sc=48;
  if(i>=4){s+=ln(L,y0,R,y0,'var(--mute)');s+=tx(L,yb+70,'segment credit w = change in value',{fs:11,c:'var(--mute)'});
    for(let j=0;j<6;j++){const x=L+segW*j+segW*0.2,v=CR[j];s+=rc(x,v>0?y0-v*sc:y0,segW*0.6,Math.max(1.5,Math.abs(v)*sc),v>0?'var(--c3)':v<0?'var(--c2)':'var(--mute)',{r:2,cls:i===4?'rd-new':''});
      s+=tx(L+segW*j+segW/2,v<0?y0+Math.abs(v)*sc+13:y0-v*sc-5,(v>0?'+':v<0?'−':'')+Math.abs(v).toFixed(2),{fs:11,a:'middle',c:'var(--ink)'});
      s+=tx(L+segW*j+segW/2,y0+70,(A0+v>0?'+':'−')+Math.abs(A0+v).toFixed(2),{fs:11,a:'middle',w:600,c:'var(--ink)'})}
    s+=tx(L,y0+52,nar?'token credit A + w (outcome-only: −1)':'token credit A + w (outcome-only: −1.00 everywhere)',{fs:11,c:'var(--mute)'})}
  // the token tally
  if(i>=5){const y=y0+98,bw=R-L;s+=rc(L,y,bw*0.09,16,'var(--ink)',{op:.7});s+=rc(L+bw*0.09,y,bw*0.91,16,'var(--c2)',{op:.8,cls:'rd-new'});
    s+=tx(L,y-6,'tokens generated in training, k = 4',{fs:11,c:'var(--mute)'});s+=tx(L+bw*0.09+6,y+12.5,nar?'continuations 91%, discarded':'continuations 91%: scored, then discarded',{fs:11,c:'var(--bg)',w:600})}
  host.innerHTML=S(w,h,s,'The Monte-Carlo reward on one completion, step '+(i+1));
  document.getElementById('drMCCap').innerHTML=CAP2[i]}
const mc=RD.anim({card:'drMC',ctl:'drMCCtl',n:6,list:'sx-mc',label:'Step',ms:3800,draw:drawMC});
RD.onResize(()=>drawMC(mc.i));

// ---------- Fig. 3: where the budget goes (S25 tokens, Table 14 seconds) ----------
const TOK=[['Outcome-only GRPO',599,0],['Monte-Carlo, k = 1',163,.70],['Monte-Carlo, k = 2',92,.83],['Monte-Carlo, k = 4',50,.91]];
const T14=['Outcome-only (L4–5)','Monte-Carlo, k=1','Monte-Carlo, k=2','Monte-Carlo, k=4'].map(c=>T.table14.find(r=>r.config===c));
function drawBud(){const host=document.getElementById('drBudSvg');const w=W(host);const nar=w<460;
  const lab=nar?112:140,x0=lab+8,rv=nar?66:80,x1=w-rv,bw=x1-x0,rh=24;let s='',y=16;
  s+=tx(0,y,'Generated tokens: the same budget B = 12.25M',{fs:12,w:600});y+=12;
  TOK.forEach(([n,u,c])=>{s+=tx(lab,y+16,n,{fs:11,a:'end'});s+=rc(x0,y+4,bw*(1-c),16,'var(--ink)',{op:.65});if(c)s+=rc(x0+bw*(1-c),y+4,bw*c,16,'var(--c2)',{op:.85});
    if(c)s+=tx(x0+bw-4,y+16,Math.round(c*100)+'% continuations',{fs:11,a:'end',c:'var(--bg)',w:600});else s+=tx(x0+bw-4,y+16,'all rollouts, all trained on',{fs:11,a:'end',c:'var(--bg)',w:600});
    s+=tx(w,y+16,u+' updates',{fs:11,a:'end',w:600});y+=rh});
  y+=18;s+=tx(0,y,'Training time per run, H200 (seconds)',{fs:12,w:600});y+=12;
  const mx=T14[0].total,sc=bw/mx,cols={generate:'var(--c1)',credit:'var(--c2)',update:'var(--c3)'};
  T14.forEach((r,k)=>{s+=tx(lab,y+16,TOK[k][0],{fs:11,a:'end'});let x=x0;for(const st of ['generate','credit','update']){const ww=r[st]*sc;if(ww>0)s+=rc(x,y+4,ww,16,cols[st],{op:.8,r:0});x+=ww}
    s+=rc(x,y+4,(r.total-r.generate-r.credit-r.update)*sc,16,'var(--dim)',{r:0});s+=tx(w,y+16,r.total.toLocaleString('en-GB')+' s',{fs:11,a:'end',w:600});y+=rh});
  y+=10;let lx=x0;for(const [n,c] of [['generate rollouts','var(--c1)'],['credit (continuations)','var(--c2)'],['update','var(--c3)']]){const tw=n.length*6.2+18;if(lx+tw>w){lx=x0;y+=16}s+=rc(lx,y,10,10,c,{op:.8,r:2})+tx(lx+14,y+9,n,{fs:11,c:'var(--mute)'});lx+=tw}
  y+=14;host.innerHTML=S(w,y,s,'Tokens and training time per run for outcome-only GRPO and the Monte-Carlo reward');
  const g=T14[0],m=T14[3];
  document.getElementById('drBudSum').innerHTML='Same tokens, a third of the time: the k = 4 run takes '+m.total+' s against '+g.total.toLocaleString('en-GB')+' s, because '+m.credit+' s of its time generate continuations in large batches, while outcome-only GRPO spends '+g.update+' s ('+Math.round(100*g.update/g.total)+'%) on updates. Qwen2.5-1.5B, seeds 5 to 16: updates and token shares from Appendix C.3.2, seconds from Table 14 (grey: the weight copy, in no stage).'}
fit2('drBudSvg',drawBud);

// ---------- Fig. 4: how far the extrapolation overestimates each reward ----------
const OV=[['Monte-Carlo, k = 1',1.7,1.2,2.3,'var(--c2)','exploratory'],['Monte-Carlo, k = 2',1.3,0.6,2.0,'var(--c2)','exploratory'],['Monte-Carlo, k = 4',0.8,0.2,1.3,'var(--c2)','exploratory'],['Critic, TD form',1.8,1.5,2.2,'var(--c4)','preregistered'],['Critic, baseline form',0.9,0.6,1.2,'var(--c4)','preregistered']];
window.DR_FIG4=OV;
function drawOver(){const host=document.getElementById('drOverSvg');const w=W(host);const nar=w<460;
  const lab=nar?118:140,x0=lab+10,x1=w-(nar?40:50),lo=0,hi=2.6,X=v=>x0+(x1-x0)*(v-lo)/(hi-lo),rh=30,top=40;let s='';
  const H=top+OV.length*rh+34;
  s+=rc(X(0.8),top-14,X(1.7)-X(0.8),OV.length*rh+14,'var(--c1)',{op:.13,r:0});
  s+=tx((X(0.8)+X(1.7))/2,top-20,'the filter\'s gains: 0.8 to 1.7',{fs:11,a:'middle',c:'var(--c1)',w:600});
  for(const g of [0,0.5,1,1.5,2,2.5]){s+=ln(X(g),top-14,X(g),top+OV.length*rh,g===0?'var(--mute)':'var(--line)');s+=tx(X(g),H-18,g.toFixed(1),{fs:11,a:'middle',c:'var(--mute)'})}
  s+=tx((x0+x1)/2,H-3,'predicted minus reached, points (mean over evaluations)',{fs:11,a:'middle',c:'var(--mute)'});
  OV.forEach(([n,v,a,b,c],k)=>{const cy=top+k*rh+rh/2-6;s+=tx(lab,cy+4,n,{fs:nar?11:12,a:'end'});s+=ln(X(a),cy,X(b),cy,c,{sw:2});s+='<circle cx="'+X(v).toFixed(1)+'" cy="'+cy+'" r="5.5" fill="'+c+'"/>';s+=tx(w,cy+4,v.toFixed(1),{fs:12,a:'end',w:600,c:c})});
  host.innerHTML=S(w,H,s,'How far the efficiency extrapolation overestimates each reward')}
fit2('drOverSvg',drawOver);

// ---------- Fig. 5: candidates' predicted success against the gain (Table 8) ----------
const SH={'Qwen3-0.6B, L4–5':'0.6B L4–5','Qwen3-1.7B, level 5':'1.7B L5','Qwen2.5-1.5B, L3–5':'Qwen2.5','Qwen3-0.6B, L3–5':'0.6B L3–5','Llama-3.2-1B, L3–5':'Llama 1B','Qwen3-1.7B, L4–5':'1.7B L4–5','Qwen3-4B, level 5':'4B L5','Qwen3-1.7B, L3–5':'1.7B L3–5','Llama-3.2-3B, L3–5':'Llama 3B','Qwen3-4B, L4–5':'4B L4–5','Qwen3-4B, L3–5':'4B L3–5','Qwen3-0.6B, L1–2':'0.6B L1–2'};
const PRE=['Qwen3-1.7B, level 5','Qwen3-0.6B, L1–2','Llama-3.2-3B, L3–5','Llama-3.2-1B, L3–5'];
function drawCand(){const host=document.getElementById('drCandSvg');const w=W(host);const nar=w<460;
  const pl=40,pr=12,pt=26,pb=44,H=nar?300:340,xlo=0.3,xhi=0.84,ylo=-1.5,yhi=5.4;
  const X=v=>pl+(w-pl-pr)*(v-xlo)/(xhi-xlo),Y=v=>pt+(H-pt-pb)*(1-(v-ylo)/(yhi-ylo));let s='';
  s+=rc(pl,Y(2),w-pl-pr,Y(-1.5)-Y(2),'var(--soft)',{r:0});
  for(const g of [-1,0,1,2,3,4,5]){s+=ln(pl,Y(g),w-pr,Y(g),g===0?'var(--mute)':'var(--line)');s+=tx(pl-6,Y(g)+4,g===0?'0':sg(g),{fs:11,a:'end',c:'var(--mute)'})}
  for(const g of [0.3,0.4,0.5,0.6,0.7,0.8])s+=tx(X(g),H-pb+16,g.toFixed(1),{fs:11,a:'middle',c:'var(--mute)'});
  s+=tx((pl+w-pr)/2,H-6,'candidates\' mean predicted success',{fs:11,a:'middle',c:'var(--mute)'});
  s+=tx(pl,14,'filter minus outcome-only GRPO, points',{fs:11,c:'var(--mute)'});
  s+=ln(X(0.5),pt,X(0.5),H-pb,'var(--ink)',{da:'5 4'});s+=tx(X(0.5)+5,pt+10,'1/2',{fs:11,c:'var(--ink)',w:600});
  const pts=T.table8.map(r=>({r,x:X(r.cand_v),y:Y(r.pts[0]),t:SH[r.setting]||r.setting,fs:11}));
  pts.forEach(p=>{const r=p.r,sig=r.pts[1]>0,c=sig?'var(--c1)':'var(--mute)';s+=ln(p.x,Y(r.pts[1]),p.x,Y(r.pts[2]),c,{sw:1.4,op:.8});
    s+='<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="4.5" fill="'+c+'"/>';if(PRE.indexOf(r.setting)>=0)s+='<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="8" fill="none" stroke="var(--ink)" stroke-width="1.1"/>'});
  placeLabels(pts,w,H-pb);pts.forEach(p=>{s+=tx(p.lx,p.ly,p.t,{fs:11,a:p.la,c:'var(--ink)'})});
  host.innerHTML=S(w,H,s,'Candidates\' mean predicted success against the filter\'s gain, twelve settings')}
fit2('drCandSvg',drawCand);

// placeLabels: each point's label beside it, avoiding other labels and points (from the paper-page helpers)
function placeLabels(pts,Wd,Hd){const boxes=[],dots=pts.map(p=>({x:p.x-6,y:p.y-6,w:12,h:12}));
  const hit=b=>b.x<0||b.x+b.w>Wd||b.y<0||b.y+b.h>Hd||boxes.concat(dots).some(o=>b.x<o.x+o.w&&o.x<b.x+b.w&&b.y<o.y+o.h&&o.y<b.y+b.h);
  pts.forEach(p=>{const fs=p.fs||11,w=p.t.length*fs*.62,h=fs+2;
    const C=[[p.x+9,p.y-h/2,'start'],[p.x-9-w,p.y-h/2,'end'],[p.x-w/2,p.y-10-h,'middle'],[p.x-w/2,p.y+10,'middle'],[p.x+9,p.y-h-5,'start'],[p.x+9,p.y+5,'start'],[p.x-9-w,p.y-h-5,'end'],[p.x-9-w,p.y+5,'end'],[p.x-w/2,p.y-22-h,'middle'],[p.x-w/2,p.y+22,'middle']];
    const c=C.find(([x,y])=>!hit({x,y,w,h}))||C[0];boxes.push({x:c[0],y:c[1],w,h});
    p.la=c[2];p.lx=c[2]==='start'?c[0]:c[2]==='end'?c[0]+w:c[0]+w/2;p.ly=c[1]+h-3});return pts}
function fit2(id,f){const el=document.getElementById(id);let lw=-1;const go=()=>{const w=el.clientWidth;if(w>0&&w!==lw){lw=w;f()}};
  if('ResizeObserver' in window)new ResizeObserver(()=>requestAnimationFrame(go)).observe(el);RD.onRender(()=>{lw=-1;go()});go()}
})();
