// ---- The paper tab: protocol animation, seed bank, stages, predict reveals, Table 2 / Table 3 / Figure 4 / Figure 6 charts ----
const PT=window.PAPER.tables, RC=window.PAPER.rc;
const MC={M:'var(--c1)',P:'var(--c4)',A:'var(--c3)',F:'var(--c2)'};
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

// ---------- one turn of the protocol: ReAct against Turnstile (illustrative) ----------
const TOOLS=['query_train_info','query_flight_info','query_hotel_info','recommend_attractions','query_attraction_details','recommend_restaurants','query_restaurant_details','search_location','query_road_route_info','final_answer'];
const BUCKETS=[['transport',[0,1]],['hotel',[2]],['attractions',[3,4]],['restaurants',[5,6,7]],['routes',[8,7]]];
const PTS={
 react:[
  {t:'The task arrives',c:'A travel request: dates, four travellers, two rooms, a train window, a newly renovated hotel, named sights, a meal near a landmark, daily routes. We join at turn 7; six tool calls have already run.',mod:null},
  {t:'M: full history becomes the view',c:'FullHistory keeps everything: the task, six calls and six observations, 13 entries, all go into the prompt. Nothing is summarised or dropped, so the view grows by two entries every turn.',mod:'M'},
  {t:'P: no planner',c:'ReAct has no planning module; P returns the null directive ∅, which the protocol allows so that a harness without a planner is still type-consistent.',mod:'P'},
  {t:'F: the full registry',c:'All ten tools are exposed at every step, including final_answer. Nothing in the harness knows that restaurants and routes have not been checked yet.',mod:'F'},
  {t:'A: the model picks the next call',c:'The ReAct loop asks the model for a thought and one call. Here it checks the hotel again; it could equally call final_answer now and write an itinerary with no restaurant and no route.',mod:'A'},
  {t:'The kernel runs the call',c:'The shared kernel executes query_hotel_info and appends the observation: 15 entries now. Whether the plan is complete is left entirely to the model\'s judgement.',mod:'K'}],
 turn:[
  {t:'The task arrives',c:'The same request. Turnstile was written for it: its planner has already compiled the request into a typed travel_spec and a collection checklist, one item per kind of evidence. We join at turn 7.',mod:null},
  {t:'M: one bucket per evidence class',c:'DataStoreMemory keeps the history but renders a different view: a bucket for transport, hotel, attractions, restaurants and routes, each holding the facts collected so far. Three of five are full; the view is the spec plus five buckets, not the transcript.',mod:'M'},
  {t:'P: the next missing item',c:'TravelPlanning reads the checklist against the buckets and emits a directive for the first gap: find a restaurant near the landmark that offers the requested service.',mod:'P'},
  {t:'F: only the tools for that gap',c:'DynamicToolPolicy exposes the restaurant and location tools for the missing bucket and withholds final_answer, because is_complete() is false. Six tools are hidden at this step.',mod:'F'},
  {t:'A: the model picks the next call',c:'The model chooses among three tools, not ten; it cannot end the task early because the stop action is not on offer.',mod:'A'},
  {t:'The kernel runs it; the bucket fills',c:'recommend_restaurants returns candidates and the restaurants bucket fills. Routes are still missing, so final_answer stays hidden; it appears only when all five buckets are full. Memory here is "an executable coverage contract", in Appendix C\'s words, not a way to save context.',mod:'K'}]};
function ptDraw(m,k,e,w){
  const S=PTS[m][k],act=S.mod,pad=6,narrow=w<520,bw=narrow?(w-2*pad-24)/2:Math.min(150,(w-2*pad-3*24)/4),bh=46;
  let s='';const names={M:['M','Memory'],P:['P','Planning'],F:['F','Capability'],A:['A','Action']};
  const lab=m==='react'?{M:'FullHistory',P:'∅ (none)',F:'Full registry',A:'ReAct loop'}:{M:'DataStoreMemory',P:'TravelPlanning',F:'DynamicToolPolicy',A:'ReAct loop'};
  const pos=narrow?{M:[pad,8],P:[pad+bw+24,8],F:[pad,8+bh+18],A:[pad+bw+24,8+bh+18]}:{M:[pad,8],P:[pad+bw+24,8],F:[pad+2*(bw+24),8],A:[pad+3*(bw+24),8]};
  const arrow=(x1,y1,x2,y2)=>{const a=Math.atan2(y2-y1,x2-x1),h=5;return ln2(x1,y1,x2,y2,'var(--mute)',{sw:1.4})+'<path d="M'+x2.toFixed(1)+','+y2.toFixed(1)+' L'+(x2-h*Math.cos(a-.5)).toFixed(1)+','+(y2-h*Math.sin(a-.5)).toFixed(1)+' L'+(x2-h*Math.cos(a+.5)).toFixed(1)+','+(y2-h*Math.sin(a+.5)).toFixed(1)+'z" fill="var(--mute)"/>'};
  ['M','P','F','A'].forEach(q=>{const on=act===q,op=act&&!on?.45:1,[x,y0]=pos[q];const L=lab[q],mx=Math.floor((bw-8)/6.4);
    s+=G(op,(on?rc(x,y0,bw,bh,MC[q],{op:.18+.17*e}):rc(x,y0,bw,bh,'var(--soft)'))+rc(x,y0,bw,bh,'none',{s:MC[q],sw:on?2.4:1.2})+tx(x+bw/2,y0+19,names[q][0]+' · '+names[q][1],{fs:12,a:'middle',w:600})+tx(x+bw/2,y0+36,L.length>mx?L.slice(0,mx-1)+'…':L,{fs:11,a:'middle',c:'var(--mute)'}))});
  const R=q=>pos[q][0]+bw,Y=q=>pos[q][1]+bh/2;
  s+=arrow(R('M')+3,Y('M'),pos.P[0]-3,Y('P'));
  s+=narrow?arrow(pos.P[0]+bw*.3,pos.P[1]+bh+2,pos.F[0]+bw*.7,pos.F[1]-2):arrow(R('P')+3,Y('P'),pos.F[0]-3,Y('F'));
  s+=arrow(R('F')+3,Y('F'),pos.A[0]-3,Y('A'));
  const bottom=Math.max(...Object.values(pos).map(p=>p[1]))+bh;
  let y=bottom+22;
  // tool shelf
  const filled=m==='turn'?(k>=5?4:3):0;
  const exposed=i=>{if(m==='react')return true;if(k<3)return null;return [5,6,7].includes(i)};
  s+=tx(pad,y,'Tools offered to the model at this step'+(m==='turn'&&k<3?' (decided at the F step)':''),{fs:11,c:'var(--mute)'});y+=8;
  let cx=pad,cy=y;
  TOOLS.forEach((t,i)=>{const tw=t.length*6.3+14;if(cx+tw>w-pad){cx=pad;cy+=24}
    const ex=exposed(i),fa=t==='final_answer';
    const on=ex===true,hid=ex===false;const op=hid?(k===3?1-.6*e:.4):1;
    s+=G(op,rc(cx,cy,tw,19,on?(fa?'var(--acc2)':'var(--soft)'):'none',{s:on?(fa?'var(--acc)':'var(--mute)'):'var(--dim)',da:hid?'3 3':null,r:9})+tx(cx+tw/2,cy+13.5,t,{fs:11,a:'middle',c:on?'var(--ink)':'var(--mute)'}));cx+=tw+6});
  y=cy+19+24;
  // memory view
  if(m==='react'){const n=k>=5?15:13,shown=k>=5?13+2*e:13;s+=tx(pad,y,'View the model reads (M): '+(k>=5?15:13)+' entries, the whole transcript',{fs:11,c:'var(--mute)'});y+=8;
    const cw=Math.max(14,Math.min(26,(w-2*pad)/16));
    for(let i=0;i<n;i++){const op=i<13?1:cl01(shown-i);const kind=i===0?'task':(i%2?'call':'obs');
      s+=G(op,rc(pad+i*(cw+3),y,cw,26,kind==='task'?'var(--acc2)':kind==='call'?'var(--soft)':'var(--hl)',{s:k===1?MC.M:'var(--line)',sw:k===1?1.6:1}))}
    y+=26+16;s+=tx(pad,y,'blue: task · grey: tool call · yellow: observation',{fs:11,c:'var(--mute)'});y+=10}
  else{s+=tx(pad,y,'View the model reads (M): the spec and five buckets',{fs:11,c:'var(--mute)'});y+=8;
    const bw2=Math.max(64,Math.min(120,(w-2*pad-4*6)/5));let bx=pad,by=y;
    BUCKETS.forEach(([b],i)=>{if(bx+bw2>w-pad+1){bx=pad;by+=42}
      const full=i<3||(i===3&&k>=5),fl=i===3&&k===5?e:(full?1:0),need=m==='turn'&&k>=2&&i===3;
      s+=rc(bx,by,bw2,34,'var(--soft)',{s:need?MC.P:'var(--line)',sw:need?2:1})+rc(bx+2,by+2,(bw2-4)*fl,30,'var(--open2)',{r:3})+tx(bx+bw2/2,by+15,b,{fs:11,a:'middle'})+tx(bx+bw2/2,by+29,full?(i===3&&k===5&&e<1?'filling':'collected'):'missing',{fs:11,a:'middle',c:full?'var(--open)':'var(--bad)'});bx+=bw2+6});
    y=by+34+14}
  return svgW(w,y,s,'One turn of the four-module protocol')}
function ptCnt(m,k,e){const ex=m==='react'?10:(k>=3?3:10),fa=m==='react'?'yes, at every step':'no, until all five buckets are full';
  return stat('Tools offered',m==='turn'&&k<3?'10 (before F)':ex+' of 10','')+stat('View size',m==='react'?(k>=5?'15':'13')+' entries':'spec + 5 buckets','')+stat('Buckets full',m==='react'?'not tracked':(k>=5?'4':'3')+' of 5','')+stat('final_answer allowed?',fa,'')}
makeAnim({id:'pt',modes:PTS,mode:'react',draw:ptDraw,counters:ptCnt,dur:3200});

// ---------- Table 1 seed bank ----------
(function(){const host=$('seedPlot');if(!host)return;const dflt={M:'FullHistory',P:'No explicit planner',A:'ReAct',F:'Full registry'};
  let h='<div class="tw"><table class="lt seedt"><thead><tr><th>Harness</th><th style="color:'+MC.M+'">M memory</th><th style="color:'+MC.P+'">P planning</th><th style="color:'+MC.A+'">A action</th><th style="color:'+MC.F+'">F capability</th></tr></thead><tbody>';
  PT.seeds.forEach((r,i)=>{h+='<tr tabindex="0" data-i="'+i+'"><td><b>'+esc(r.name)+'</b></td>'+['M','P','A','F'].map(q=>'<td class="'+(r[q]===dflt[q]?'dflt':'cust')+'" style="'+(r[q]===dflt[q]?'':'box-shadow:inset 3px 0 0 '+MC[q])+'">'+esc(r[q])+'</td>').join('')+'</tr>'});
  host.innerHTML=h+'</tbody></table></div>';
  const cap=$('seedCap'),base=cap.innerHTML;
  host.querySelectorAll('tbody tr').forEach(tr=>{const go=()=>{const r=PT.seeds[+tr.dataset.i],c=['M','P','A','F'].filter(q=>r[q]!==dflt[q]);
    host.querySelectorAll('tr').forEach(x=>x.classList.toggle('sel',x===tr));
    cap.innerHTML='<b>'+esc(r.name)+'</b>: '+(c.length?'its idea lives in '+c.map(q=>'<span class="mk m-'+q+'">'+q+'</span>').join(' and ')+'; the other modules are the defaults.':'the reference point: full history, no planner, the ReAct loop, every tool.')+' '+base};
    tr.addEventListener('mouseenter',go);tr.addEventListener('focus',go);tr.addEventListener('click',go)})})();

// ---------- the three stages ----------
(function(){const S={
 1:[['Task + protocol + tools + 3 seeds of its type','in'],['Teacher q<sub>φ</sub> writes a harness','t'],['Validate: protocol and execution','v'],['SFT on accepted harnesses','o'],['Pairs: higher reward, no slower, no costlier (Eq. 4)','v'],['DPO weighted by Δ<sub>val</sub>','o']],
 2:[['A Stage I harness that failed','in'],['Diagnostic: compile error, interface mismatch, tool failure, exception','v'],['Teacher proposes a patch; Apply','t'],['Validate again (at most two rounds)','v'],['Keep only trajectories executable within two rounds','v'],['Imitate the patches, given the full history','o']],
 3:[['Task; retrieve prior harnesses from bank B<sub>n</sub>','in'],['Sample G candidates from the current policy','t'],['Run candidates and the incumbent: same executor, budget, seeds','v'],['Three channel rewards, gated (Eq. 6)','v'],['Normalise each channel, then mix (Eq. 7)','v'],['Clipped PPO + KL to the Stage II model; update bank','o']]};
 const T={1:'Adaptivity: learn to write a harness that fits the task and passes validation, then prefer harnesses that win on reward without paying for it in latency or cost.',2:'Reliability: learn short repairs from real diagnostics. The two-round cap restricts the data to failures a small patch can fix.',3:'Evolvability: learn to write harnesses that overtake the best one already in the bank, and more cheaply when they match it.'};
 const col={in:'var(--soft)',t:'var(--acc2)',v:'var(--soft)',o:'var(--open2)'};
 function draw(m){$('stgSvg').innerHTML='<div class="flow">'+S[m].map((x,i)=>(i?'<span class="fa" aria-hidden="true">→</span>':'')+'<span class="fb2" style="background:'+col[x[1]]+'">'+x[0]+'</span>').join('')+'</div>';$('stgTxt').innerHTML='<p class="small">'+T[m]+'</p>'}
 segBind('stgM',m=>{$('stgM').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));draw(m)});draw('1')})();

// ---------- predict 1: the gate ----------
PRED_REVEAL.pr1=function(){const go=()=>{const r=+$('pr1R').value,b=80,lam=.5,ck=.04,bk=.10;$('pr1Rv').textContent=r.toFixed(1);
  const g=r>=b?1:0,Rr=r+lam*Math.max(0,r-b),Rl=0,Rc=g*Math.max(0,bk-ck);
  $('pr1Plot').innerHTML='<div class="bars">'+[['R<sup>rew</sup> = r + λ·[r − 80]<sub>+</sub>',Rr.toFixed(1),Rr/100,'var(--c1)'],['R<sup>lat</sup> (same latency as the incumbent)',Rl.toFixed(2),0,'var(--c4)'],['R<sup>cost</sup> = 𝟙[r ≥ 80]·[$0.10 − $0.04]',(g?'$':'$')+Rc.toFixed(2),Rc/.1,'var(--c2)']].map(([n,v,f,c])=>'<div class="row"><span class="nm">'+n+'</span><span class="track"><span class="fill" style="width:'+(100*Math.min(1,f)).toFixed(1)+'%;background:'+c+'"></span></span><span class="val">'+v+'</span></div>').join('')+'</div><p class="small">'+(g?'Score '+r.toFixed(1)+' matches or beats the incumbent: the cost channel now pays the $0.06 saving.':'Score '+r.toFixed(1)+' is below the incumbent\'s 80: the cost channel pays nothing, however cheap the harness. λ<sub>evo</sub> = 0.5 here (illustrative).')+'</p>'};
  $('pr1R').addEventListener('input',go);go()};

// ---------- Table 2 dumbbell (predict 2) ----------
const T2=Object.fromEntries(PT.t2.map(r=>[r.model,r.v]));
const BN=['BrowseComp-Plus','DeepSearchQA','xBench-DS','AgentIF','PinchBench','Shopping','Travel','OfficeBench','OdysseyBench'];
function t2Draw(m){const host=$('t2Plot');fit(host,w=>{const base=m==='F'?'DeepSeek-V4-Flash':'GLM-5.2',v=T2[base],j=T2['JIT-Agent + '+base],g=T2['GPT-5.6'];
  const pl=Math.min(118,w*.32),pr=34,rh=26,H=BN.length*rh+46,x0=40,x1=100,X=t=>pl+(w-pl-pr)*(t-x0)/(x1-x0);let s='';
  [40,50,60,70,80,90,100].forEach(t=>{s+=ln2(X(t),10,X(t),H-30,'var(--line)')+tx(X(t),H-14,t,{fs:11,a:'middle',c:'var(--mute)'})});
  BN.forEach((b,i)=>{const y=22+i*rh;s+=tx(pl-8,y+4,b,{fs:11,a:'end'})+ln2(X(v[i]),y,X(j[i]),y,j[i]>v[i]?'var(--good)':'var(--bad)',{sw:3})+ln2(X(g[i]),y-8,X(g[i]),y+8,'var(--c2)',{sw:2})+'<circle cx="'+X(v[i]).toFixed(1)+'" cy="'+y+'" r="5" fill="var(--bg)" stroke="var(--ink)" stroke-width="1.5"/><circle cx="'+X(j[i]).toFixed(1)+'" cy="'+y+'" r="5" fill="var(--ink)"/>'+tx(Math.min(w-4,X(Math.max(j[i],v[i]))+9),y+4,'+'+(j[i]-v[i]).toFixed(1),{fs:11,c:'var(--good)'})});
  const av=a=>a.reduce((p,q)=>p+q,0)/a.length;
  host.innerHTML=svgW(w,H,s,'Table 2 dumbbell')+'<p class="small">Averages: '+base+' '+av(v).toFixed(1)+' → with JIT <b>'+av(j).toFixed(1)+'</b>; GPT-5.6 (orange tick) <b>'+av(g).toFixed(1)+'</b>. Open dot: vanilla; filled: with JIT.</p>'})}
PRED_REVEAL.pr2=()=>{segBind('t2M',m=>{$('t2M').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));t2Draw(m)});t2Draw('F')};

// ---------- Figure 3 rebuilt (predict 3) ----------
const HC={'Claude Code':'var(--c2)','Codex':'var(--c6)','OpenCode':'var(--c5)','Hermes':'var(--c4)','NanoBot':'var(--c1)','JIT-Agent':'var(--c3)'};
function f3Draw(b){const host=$('f3Plot');fit(host,w=>{const pts=PT.t3.map(r=>({h:r.harness,bb:r.backbone,s:r[b][0],c:r[b][2],t:r[b][1]}));
  const cmax=Math.max(...pts.map(p=>p.c))*1.08,smin=Math.floor(Math.min(...pts.map(p=>p.s))/5)*5-2,smax=Math.ceil(Math.max(...pts.map(p=>p.s))/5)*5+2;
  const pl=40,pr=12,pt=12,pb=40,H=Math.round(Math.min(380,Math.max(280,w*.6)));const X=v=>pl+(w-pl-pr)*v/cmax,Y=v=>pt+(H-pt-pb)*(1-(v-smin)/(smax-smin));
  let s='';for(let v=Math.ceil(smin/10)*10;v<=smax;v+=10)s+=ln2(pl,Y(v),w-pr,Y(v),'var(--line)')+tx(pl-5,Y(v)+4,v,{fs:11,a:'end',c:'var(--mute)'});
  const step=cmax>.3?.1:.05;for(let v=0;v<=cmax;v+=step)s+=ln2(X(v),H-pb,X(v),H-pb+4,'var(--mute)')+tx(X(v),H-pb+16,'$'+v.toFixed(2),{fs:11,a:'middle',c:'var(--mute)'});
  s+=tx((pl+w-pr)/2,H-6,'cost per case (USD); up and left is better',{fs:11,a:'middle',c:'var(--mute)'});
  const fr=pts.filter(p=>!pts.some(o=>o.c<=p.c&&o.s>=p.s&&(o.c<p.c||o.s>p.s))).sort((a,b)=>a.c-b.c);
  let d='';fr.forEach((p,i)=>{d+=(i?'L'+X(p.c).toFixed(1)+','+Y(fr[i-1].s).toFixed(1):'M'+X(p.c).toFixed(1)+','+Y(smax).toFixed(1))+' L'+X(p.c).toFixed(1)+','+Y(p.s).toFixed(1)});d+=' L'+(w-pr)+','+Y(fr[fr.length-1].s).toFixed(1);
  s+='<path d="'+d+'" fill="none" stroke="var(--good)" stroke-width="1.6" stroke-dasharray="5 3"/>';
  const lab=pts.map(p=>({x:X(p.c),y:Y(p.s),t:(p.h==='JIT-Agent'?'JIT':p.h)+(p.bb.startsWith('Qwen')?' (Q)':' (D)'),fs:11}));placeLabels(lab,w,H-pb);
  pts.forEach((p,i)=>{const q=p.bb.startsWith('Qwen');s+='<circle cx="'+X(p.c).toFixed(1)+'" cy="'+Y(p.s).toFixed(1)+'" r="'+(p.h==='JIT-Agent'?6:4.5)+'" fill="'+(q?'var(--bg)':HC[p.h])+'" stroke="'+HC[p.h]+'" stroke-width="2"><title>'+p.bb+' + '+p.h+': '+p.s+' at $'+p.c.toFixed(3)+', '+p.t+'K tokens</title></circle>'+tx(lab[i].lx,lab[i].ly,lab[i].t,{fs:11,a:lab[i].la,c:p.h==='JIT-Agent'?'var(--ink)':'var(--mute)',w:p.h==='JIT-Agent'?600:null})});
  host.innerHTML=svgW(w,H,s,'Cost against score');
  const by=bb=>{const r=PT.t3.filter(x=>x.backbone===bb),j=r.find(x=>x.harness==='JIT-Agent'),f=r.filter(x=>x.harness!=='JIT-Agent'),bs=f.reduce((a,x)=>x[b][0]>a[b][0]?x:a),ch=f.reduce((a,x)=>x[b][2]<a[b][2]?x:a);
    return bb+': JIT '+j[b][0]+' at $'+j[b][2].toFixed(3)+'; best fixed '+bs.harness+' '+bs[b][0]+'; cheapest fixed '+ch.harness+' $'+ch[b][2].toFixed(3)+' ('+(100*(1-j[b][2]/ch[b][2])).toFixed(1)+'% cheaper)'};
  $('f3Cap').innerHTML='Filled dots: DeepSeek-V4-Flash (D); open: Qwen3.6-Flash (Q). Dashed step: the Pareto frontier over all twelve pairs, recomputed. '+by('DeepSeek-V4-Flash')+'. '+by('Qwen3.6-Flash')+'. Rebuilt from Table 3; the paper\'s Figure 3 shows DeepSearchQA and AgentIF only.'})}
PRED_REVEAL.pr3=()=>{segBind('f3M',m=>{$('f3M').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));f3Draw(m)});f3Draw('DSQA')};

// ---------- Figure 4 decoded ----------
function f4Draw(b){const host=$('f4Plot');fit(host,w=>{const rows=PT.fig4[b];const lo=Math.floor(Math.min(...rows.map(r=>r.react))/10)*10-5,hi=100;
  const pl=Math.min(124,w*.33),pr=40,rh=40,H=rows.length*rh+34,X=v=>pl+(w-pl-pr)*(v-lo)/(hi-lo);let s='';
  for(let v=Math.ceil(lo/10)*10;v<=hi;v+=10)s+=ln2(X(v),4,X(v),H-26,'var(--line)')+tx(X(v),H-10,v,{fs:11,a:'middle',c:'var(--mute)'});
  rows.forEach((r,i)=>{const y=6+i*rh;s+=tx(pl-8,y+19,r.backbone.replace('DeepSeek-',''),{fs:11,a:'end'})+rc(pl,y+2,X(r.react)-pl,13,'var(--dim)',{r:2})+tx(X(r.react)+4,y+13,r.react.toFixed(1),{fs:11,c:'var(--mute)'})+rc(pl,y+18,X(r.jit)-pl,13,'var(--c3)',{r:2})+tx(X(r.jit)+4,y+29,r.jit.toFixed(1)+' (+'+r.gain.toFixed(1)+')',{fs:11})});
  host.innerHTML=svgW(w,H,s,'Figure 4');const g=rows.map(r=>r.gain),av=g.reduce((a,c)=>a+c,0)/g.length;
  $('f4Cap').innerHTML='Grey: ReAct; green: JIT-written harness; same executor. Mean gain on this benchmark '+(Math.round(av*10+1e-6)/10).toFixed(1)+' points (range '+Math.min(...g).toFixed(1)+' to '+Math.max(...g).toFixed(1)+'). The axis starts at '+lo+', not zero. Decoded from the vector Figure 4.'})}
segBind('f4M',m=>{$('f4M').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));f4Draw(m)});

// ---------- Figure 6 decoded ----------
const F6L={cumulative_accuracy:['Cumulative accuracy (%)',v=>v.toFixed(1)],cost_usd:['API cost per task (USD)',v=>'$'+v.toFixed(3)],tool_calls:['Tool calls per task',v=>v.toFixed(1)]};
function f6Chart(host,b,met,small){fit(host,w=>{const P=PT.fig6[b][met],a=P.static.filter(p=>p[1]!=null),c=P.streaming.filter(p=>p[1]!=null);
  const ys=a.concat(c).map(p=>p[1]),ymin=Math.min(...ys),ymax=Math.max(...ys),xm=Math.max(...a.concat(c).map(p=>p[0]));
  const pad=(ymax-ymin)*.08||1,lo=Math.max(0,ymin-pad),hi=ymax+pad,pl=48,pr=small?8:82,pt=small?20:10,pb=34,H=small?190:Math.round(Math.min(320,Math.max(240,w*.5)));
  const X=v=>pl+(w-pl-pr)*(v-1)/(xm-1),Y=v=>pt+(H-pt-pb)*(1-(v-lo)/(hi-lo));let s='';
  const st=[.005,.01,.02,.05,.1,.2,.5,1,2,5,10,20,50].find(q=>(hi-lo)/q<=5),dp=st<.01?3:st<.1?2:st<1?1:0;for(let v=Math.ceil(lo/st)*st;v<=hi+1e-9;v+=st){s+=ln2(pl,Y(v),w-pr,Y(v),'var(--line)')+tx(pl-5,Y(v)+4,(met==='cost_usd'?'$':'')+v.toFixed(dp),{fs:11,a:'end',c:'var(--mute)'})}
  [1,Math.round(xm/4),Math.round(xm/2),Math.round(3*xm/4),xm].forEach(v=>s+=tx(X(v),H-pb+15,v,{fs:11,a:'middle',c:'var(--mute)'}));
  s+=tx((pl+w-pr)/2,H-4,'task index in the stream',{fs:11,a:'middle',c:'var(--mute)'});
  if(small)s+=tx(pl,13,b.replace('DeepPlanning-','')+' · '+F6L[met][0],{fs:11,w:600});
  const path=(arr)=>'M'+arr.map(p=>X(p[0]).toFixed(1)+','+Y(p[1]).toFixed(1)).join(' L');
  s+='<path d="'+path(a)+'" fill="none" stroke="var(--mute)" stroke-width="1.6" stroke-dasharray="5 3"/><path d="'+path(c)+'" fill="none" stroke="var(--c3)" stroke-width="2.2"/>';
  if(!small){const ea=a[a.length-1],ec=c[c.length-1];s+=endLabels([{y:Y(ec[1]),n:'stream '+F6L[met][1](ec[1]),c:'var(--c3)',how:'last point of the streaming curve'},{y:Y(ea[1]),n:'static '+F6L[met][1](ea[1]),c:'var(--mute)',how:'last point of the static curve'}],w-pr+4,14)}
  host.innerHTML=svgW(w,H,s,'Figure 6 '+b+' '+met)})}
(function(){let b='DeepPlanning-Shopping',met='cumulative_accuracy';const go=()=>{f6Chart($('f6Plot'),b,met,false);const r=RC.fig6[b];
  $('f6Cap').innerHTML='Dashed: static (each harness written independently); green: streaming (bank retrieved and updated). Last points: accuracy '+r.acc_static_end+' against '+r.acc_stream_end+'; mean cost per task $'+r.cost_static_mean.toFixed(3)+' against $'+r.cost_stream_mean.toFixed(3)+'; mean tool calls '+r.tools_static_mean.toFixed(1)+' against '+r.tools_stream_mean.toFixed(1)+'; '+r.n_tasks+' tasks. The first tasks of a cumulative curve swing widely; points below the original axis are left out.'};
  segBind('f6M',m=>{b=m;$('f6M').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x.dataset.m===m?'true':'false'));go()});
  segBind('f6Y',m=>{met=m;$('f6Y').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x.dataset.m===m?'true':'false'));go()});
  onTab('t-read',()=>{f4Draw($('f4M').querySelector('.on').dataset.m);go()})})();

// ---------- generated harness gallery (Figure 5, Appendix C) ----------
(function(){const G=[
 ['Palimpsest','Figure 5','Find contact cards, drop one person, normalise and sort the rest, build a workbook, email it','P','GraphPlanPlanning compiles the request into a DAG; GraphPlanAction runs ready nodes with bounded width and depth; GraphPlanMemory stores artifacts for downstream nodes.'],
 ['Trapdoor','C.1','Multi-hop identity question (a quotation, a university merger, a memoir, a paper)','F','A synthesised delegate capability opens a private research subagent with its own memory, research-only tools and a five-step budget; DynamicDecomposer revises sub-questions; FactGraphMemory keeps key-value facts.'],
 ['Origami','C.2','A seasonal wardrobe under stock, delivery, size, review-count and rating constraints','M','ROMAPlanning splits it into dependent product searches; HierarchicalAction runs at most two branches in parallel; fold_thought replaces only a long branch\'s active context.'],
 ['Turnstile','C.3','A trip with dates, passengers, rooms, a departure window, the highest-rated hotel, sights, meals, daily routes','F','TravelPlanning emits a typed travel_spec and checklist; DataStoreMemory has a bucket per evidence class; DynamicToolPolicy withholds final_answer until is_complete().'],
 ['Gearbox','C.4','Chinese restaurants within a driving radius, published as a one-page guide','A','PhaseAction is the sole writer of a search, collect, build phase register; the tool policy and memory schema both switch on it.'],
 ['Pegboard','C.5','Identify a person from six biographical and film clues','M','Progress is a candidate × clue matrix, every cell tied to a document; empty cells drive the planner, a supported row triggers a separate verification phase.'],
 ['Appraiser','C.6','A classical materia-medica identification','M','Every step is scored for evidence value; memory keeps the whole run but renders only the first, last and top-K observations.'],
 ['Abacus','C.7','Compare regional averages, then rank countries in the winning region','A','StructuredReActAction runs shell or Python and extracts a RESULT_JSON payload; typed state carries computed values, so the model never re-derives them.'],
 ['Player Piano','C.8','Batch-migrate configuration files (database, logging, API endpoints)','A','A Python dispatcher runs typed plan steps; after each edit a deterministic, non-LLM check decides advance or retry; a per-file board tracks progress.'],
 ['Mulligan','C.9','Read a student ID from a DOCX file and rename that file','F','Only Word and file tools are exposed; a failed action is regenerated at the same step, at most twice, and only successes enter history.']];
 $('galTab').innerHTML='<thead><tr><th>Harness</th><th>Task</th><th>Carried by</th><th>How</th></tr></thead><tbody>'+G.map(g=>'<tr><td><b>'+g[0]+'</b><br><span class="small mute">'+g[1]+'</span></td><td>'+g[2]+'</td><td><span class="mk m-'+g[3]+'">'+g[3]+'</span></td><td class="small">'+g[4]+'</td></tr>').join('')+'</tbody>'})();
