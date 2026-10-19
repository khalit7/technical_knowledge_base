// ---- Replay a trajectory: one episode under three context policies, every call priced with Eq. 9 ----
// The same algorithm as simulate() in src/recompute.py; check_page.mjs compares the two at the defaults.
(function(){
if(!window.PAPER||!PAPER.rc||!PAPER.rc.replay)return;
const RC=PAPER.rc,DEF=RC.replay.def,SPEC=RC.replay.spec,Q=RC.Q36;
function costs(m){const mlp=6*m.L*m.d*m.dff,att=m.La*(2*m.d*(2*m.hq*m.dh+2*m.hkv*m.dh)+2*m.hq*m.dh*m.d),
  gdn=m.Ll*(2*m.d*(2*m.hk*m.dk+2*m.hv*m.dv+2*m.hv)+2*m.hv*m.dv*m.d);return {mlp,attn_proj:att,gdn_proj:gdn,c_token:mlp+att+gdn,c_attn:4*m.La*m.hq*m.dh}}
const C=costs(Q);
const turnF=(P,G,R)=>C.c_token*(P-R+G)+C.c_attn*(0.5*(P*P-R*R)+G*P+0.5*G*G);
function traj(p){return SPEC.split(' ').map((tok,i)=>{if(tok==='A')return {i:i+1,kind:'answer',useful:true,gen:p.gen_answer,obs:p.obs_answer};
  const k=tok[0],rest=tok.slice(1);return {i:i+1,kind:k==='S'?'search':'open',useful:rest[0]==='1',gen:k==='S'?p.gen_search:p.gen_open,obs:rest.indexOf(':')>=0?+rest.split(':')[1]:p.search}})}
function simulate(policy,p){
  const seen=new Map();let prev=null,uid=0;const steps=[];
  const msg=(tok,kind,label)=>({k:++uid,tok,kind,label});
  let msgs=[msg(p.prefix,'sys','task')];
  function call(kind,G,label,extra){
    const pr=msgs.concat(extra||[]),toks=pr.map(m=>m.tok),P=toks.reduce((a,b)=>a+b,0);
    let node=seen,R=0,nm=0;for(const m of pr){if(!node.has(m.k))break;node=node.get(m.k);R+=m.tok;nm++}
    const pk=new Set(prev||[]),runs=[];let cur=[];
    for(let j=nm;j<pr.length;j++){if(pk.has(pr[j].k))cur.push(j);else if(cur.length){runs.push(cur);cur=[]}}
    if(cur.length)runs.push(cur);
    const rs=r=>r.reduce((a,j)=>a+toks[j],0);runs.sort((a,b)=>rs(b)-rs(a));
    const ri=new Set();runs.slice(0,p.scr_k).forEach(r=>r.forEach(j=>ri.add(j)));
    let reloc=0;ri.forEach(j=>{reloc+=toks[j]});
    const kept=R+reloc;
    steps.push({kind,label,P,R,U:P-R,G,reloc,f_std:turnF(P,G,R),f_scr:C.c_token*(P-kept+G)+C.c_attn*(0.5*(P*P-kept*kept)+G*P+0.5*G*G),
      blocks:pr.map((m,j)=>[m.tok,m.kind,j<nm?'hit':(pk.has(m.k)?'re':'new'),ri.has(j)?1:0,m.label])});
    node=seen;for(const m of pr){if(!node.has(m.k))node.set(m.k,new Map());node=node.get(m.k)}
    prev=pr.map(m=>m.k)}
  const ctx=()=>msgs.reduce((a,m)=>a+m.tok,0),last=()=>steps[steps.length-1];
  for(const a of traj(p)){
    if(policy==='summary'&&ctx()>p.sum_at*p.budget){const was=ctx();call('compact',p.sum_len,'summary call',[msg(p.sum_instr,'instr','instruction')]);
      msgs=[msgs[0],msg(p.sum_len,'summary','summary')];last().after=ctx();last().before=was}
    if(policy==='clm'&&ctx()>p.clm_at*p.budget){const was=ctx();call('edit',p.clm_gen,'edit the context file');
      const oi=[];msgs.forEach((m,j)=>{if(m.kind==='obs')oi.push(j)});
      const cut=p.clm_keep&&oi.length>=p.clm_keep?oi[oi.length-p.clm_keep]-1:msgs.length;
      const nw=[];let folded=0;
      msgs.forEach((m,j)=>{if(m.kind==='edit')return;
        if((m.kind==='act'||m.kind==='obs')&&j<cut){if(m.kind==='obs'){const a0=m.a,size=!a0.useful?p.note_no:(a0.kind==='search'?p.note_yes_search:p.note_yes_open);
          const n=msg(size,'note','note '+a0.i);n.a=a0;nw.push(n);folded++}return}
        nw.push(m)});
      nw.push(msg(p.clm_gen,'edit','edit cmd'));msgs=nw;last().after=ctx();last().before=was;last().folded=folded}
    if(ctx()+a.gen>p.budget){steps.push({kind:'stop',label:'out of context',P:ctx(),R:0,U:0,G:0,reloc:0,f_std:0,f_scr:0,done:steps.filter(s=>s.kind==='act').length,
      blocks:msgs.map(m=>[m.tok,m.kind,'hit',0,m.label])});break}
    call('act',a.gen,a.kind+' '+a.i);last().a=a;
    msgs.push(msg(a.gen,'act','cmd '+a.i));const o=msg(a.obs,'obs',(a.kind==='search'?'search ':a.kind==='open'?'doc ':'answer ')+a.i);o.a=a;msgs.push(o);last().after=ctx()}
  const run=steps.filter(s=>s.kind!=='stop'),sum=f=>steps.reduce((a,s)=>a+f(s),0);
  return {steps,pflops_std:sum(s=>s.f_std)/1e15,pflops_scr:sum(s=>s.f_scr)/1e15,calls:run.length,actions:steps.filter(s=>s.kind==='act').length,
    edits:steps.filter(s=>s.kind==='edit'||s.kind==='compact').length,peak:Math.max(...run.map(s=>s.P+s.G)),mean_prompt:run.reduce((a,s)=>a+s.P,0)/Math.max(1,run.length),
    prefilled:sum(s=>s.U),prefilled_scr:sum(s=>s.U-s.reloc),generated:sum(s=>s.G),stopped:steps[steps.length-1].kind==='stop'}}
window.CLMR={costs,C,turnF,simulate,DEF};

if(!$('rp'))return;
const POL={base:'Base',summary:'Summary',clm:'CLM'},PC={base:'var(--mute)',summary:'var(--c2)',clm:'var(--c1)'};
const ST={hit:['var(--c1)','cached prefix'],re:['var(--bad)','re-prefilled after an edit'],new:['var(--c3)','new, prefilled'],scr:['var(--c6)','reused by SCR'],gen:['var(--c4)','generated']};
let P=Object.assign({},DEF),serve='std',ymode='ctx',SIM={},anim=null;
const pf=v=>v.toFixed(2)+' PFLOPs',e14=v=>(v/1e14).toFixed(2)+' × 10¹⁴';
function caption(pol,s,i,run){const pct=x=>Math.round(100*x)+'%';
  const fl=serve==='scr'?s.f_scr:s.f_std,U=serve==='scr'?s.U-s.reloc:s.U;
  const cost='Prefill '+fmt(U)+' tokens'+(serve==='scr'&&s.reloc?' (SCR reuses '+fmt(s.reloc)+' more)':'')+', decode '+fmt(s.G)+': '+e14(fl)+' FLOPs.';
  if(s.kind==='stop')return ['Out of context','The next request would pass the '+fmt(P.budget)+'-token budget, so the base harness ends the run here, after '+s.done+' of 24 actions. A real Base agent would answer from what it has or not at all.'];
  if(s.kind==='compact')return ['Summary call','The context ('+fmt(s.before)+' tokens) passed '+pct(P.sum_at)+' of the budget, so the harness asks for a summary. The model rereads the whole cached context (only the instruction is new) and writes a '+fmt(s.G)+'-token summary; everything after the task is then replaced by it, and the context drops to '+fmt(s.after)+'. The summary is re-prefilled on the next call. '+cost];
  if(s.kind==='edit')return ['Edit the context file','The context ('+fmt(s.before)+' tokens) passed '+pct(P.clm_at)+' of the budget. The model writes a '+fmt(s.G)+'-token Python edit that folds '+s.folded+' finished turn'+(s.folded===1?'':'s')+' into one-line notes (Figure 3 (c), (d)); earlier notes are left alone, so they stay in the cached prefix. The context drops to '+fmt(s.after)+'. On the next call everything after the first changed message is re-prefilled. '+cost];
  const a=s.a,what=a.kind==='search'?'a search; 10 snippets come back ('+fmt(a.obs)+' tokens)':a.kind==='open'?'opening a document ('+fmt(a.obs)+' tokens)':'writing the answer';
  return [(a.kind==='answer'?'Answer':'Action '+a.i+' of 24'),'The prompt is '+fmt(s.P)+' tokens; '+fmt(s.R)+' are a cached prefix (whole messages seen before). The model thinks and issues '+what+'. '+cost+' Context after: '+fmt(s.after)+'.']}
function rebuild(){P.sum_at=+$('rpSa').value/100;P.sum_len=+$('rpSl').value;P.clm_at=+$('rpCa').value/100;P.clm_keep=+$('rpKeep').value;
  $('rpSaV').textContent=Math.round(P.sum_at*100)+'%';$('rpSlV').textContent=fmt(P.sum_len);$('rpCaV').textContent=Math.round(P.clm_at*100)+'%';
  ['base','summary','clm'].forEach(m=>{SIM[m]=simulate(m,P)});
  const modes={};for(const m in SIM)modes[m]=SIM[m].steps.map((s,i)=>{const c=caption(m,s,i);return {t:c[0],c:c[1]}});
  if(anim){for(const m in modes)anim_modes[m]=modes[m];anim.st.k=Math.min(anim.st.k,modes[anim.st.m].length-1);anim.st.lk=-1;anim.draw()}
  table();return modes}
const anim_modes=rebuild();
function table(){const rows=[['Policy','Model calls','Actions done (of 24)','Edits or summaries','Peak context','Tokens prefilled','Tokens generated','PFLOPs (cache)','PFLOPs (SCR)']];
  for(const m of ['base','summary','clm']){const r=SIM[m];rows.push([POL[m],r.calls,r.actions+(r.stopped?' (ran out)':''),r.edits,fmt(r.peak),fmt(r.prefilled),fmt(r.generated),r.pflops_std.toFixed(2),r.pflops_scr.toFixed(2)])}
  $('rpTab').innerHTML='<thead><tr>'+rows[0].map((h,i)=>'<th'+(i?' class="num"':'')+'>'+h+'</th>').join('')+'</tr></thead><tbody>'+rows.slice(1).map(r=>'<tr>'+r.map((v,i)=>'<td'+(i?' class="num"':'')+'>'+v+'</td>').join('')+'</tr>').join('')+'</tbody>';
  const s=SIM.summary,c=SIM.clm,d=100*(1-c.pflops_std/s.pflops_std),dd=100*(1-c.pflops_scr/s.pflops_std);
  $('rpCmp').innerHTML='At these settings CLM uses <b>'+Math.abs(d).toFixed(1)+'% '+(d>=0?'fewer':'more')+'</b> FLOPs than Summary on a prefix cache'+(Math.abs(dd-d)>0.05?', and '+Math.abs(dd).toFixed(1)+'% '+(dd>=0?'fewer':'more')+' with SCR':'')+', for the same 24 actions. Base runs out after '+SIM.base.actions+' actions. Illustrative: the paper measured 21.5% fewer FLOPs than Summary on real BrowseComp-Plus runs, where the policies also took different actions.'}
function draw(m,k,e,w){const S=SIM[m].steps,s=S[Math.min(k,S.length-1)],W=w,pad=4,narrow=W<520;
  const sx=(W-2*pad)/P.window;let o='',x=pad;const y0=20,h=30;
  o+=tx(pad,13,'Prompt of this call, to scale (window '+fmt(P.window)+' tokens)',{fs:11,c:'var(--mute)'});
  o+=rc(pad,y0,W-2*pad,h,'var(--soft)',{s:'var(--line)',r:3});
  s.blocks.forEach(b=>{const bw=b[0]*sx;let st=b[2];if(serve==='scr'&&b[3])st='scr';
    o+=rc(x,y0,Math.max(0.6,bw-0.6),h,ST[st][0],{r:2,op:st==='hit'?0.42:0.85});
    const lab=b[1]==='sys'?'task':b[4];if(bw>lab.length*6.6+8)o+=tx(x+bw/2,y0+h/2+4,lab,{fs:11,a:'middle',c:'var(--ink)'});x+=bw});
  if(s.G){const gw=s.G*sx*e;o+=rc(x,y0,Math.max(0.5,gw),h,ST.gen[0],{r:2,op:0.9})}
  const bx=pad+P.budget*sx,tr=m==='summary'?P.sum_at:m==='clm'?P.clm_at:0;
  o+=ln2(bx,y0-4,bx,y0+h+4,'var(--bad)',{sw:1.6,da:'4 3'});
  if(tr){const t=pad+tr*P.budget*sx;o+=ln2(t,y0-4,t,y0+h+4,'var(--mute)',{sw:1.2,da:'2 3'})}
  // chart per call, all three policies: prompt size, or the running FLOPs total
  const cy=y0+h+26,ch=narrow?150:170,pl=narrow?40:48,pr=10,n=Math.max(...Object.values(SIM).map(r=>r.steps.length));
  const cum=q=>{let t=0;return SIM[q].steps.filter(z=>z.kind!=='stop').map(z=>(t+=(serve==='scr'?z.f_scr:z.f_std))/1e15)};
  const ymax=ymode==='cum'?Math.ceil(Math.max(...['base','summary','clm'].map(q=>Math.max(0,...cum(q))))+0.5):P.window;
  const X=i=>pl+(W-pl-pr)*i/Math.max(1,n-1),Y=v=>cy+ch-ch*v/ymax;
  if(ymode==='cum'){for(let v=0;v<=ymax;v+=ymax>12?4:2){o+=ln2(pl,Y(v),W-pr,Y(v),'var(--line)');o+=tx(pl-5,Y(v)+4,String(v),{fs:11,a:'end',c:'var(--mute)'})}}
  else{[0,8192,16384,24576,32768].forEach(v=>{o+=ln2(pl,Y(v),W-pr,Y(v),'var(--line)');o+=tx(pl-5,Y(v)+4,(v/1024)+'K',{fs:11,a:'end',c:'var(--mute)'})});
    o+=ln2(pl,Y(P.budget),W-pr,Y(P.budget),'var(--bad)',{da:'4 3',sw:1.2});o+=tx(W-pr,Y(P.budget)-4,'budget '+fmt(P.budget),{fs:11,a:'end',c:'var(--bad)'})}
  for(let i=0;i<n;i+=narrow?10:5)o+=tx(X(i),cy+ch+15,String(i+1),{fs:11,a:'middle',c:'var(--mute)'});
  o+=tx((pl+W-pr)/2,cy+ch+30,ymode==='cum'?'model call (PFLOPs so far, '+(serve==='scr'?'SCR':'prefix cache')+')':'model call (prompt tokens before each call)',{fs:11,a:'middle',c:'var(--mute)'});
  ['base','summary','clm'].forEach(q=>{const R=SIM[q].steps.filter(z=>z.kind!=='stop');if(!R.length)return;const act=q===m,cv=cum(q),val=(z,i)=>ymode==='cum'?cv[i]:z.P;
    o+='<polyline fill="none" stroke="'+PC[q]+'" stroke-width="'+(act?2.4:1.3)+'" opacity="'+(act?1:0.55)+'" points="'+R.map((z,i)=>X(i).toFixed(1)+','+Y(val(z,i)).toFixed(1)).join(' ')+'"/>';
    R.forEach((z,i)=>{if(z.kind!=='act')o+='<circle cx="'+X(i).toFixed(1)+'" cy="'+Y(val(z,i)).toFixed(1)+'" r="'+(act?3.2:2.2)+'" fill="'+PC[q]+'" opacity="'+(act?1:0.5)+'"/>'});
    if(ymode==='cum')o+=tx(Math.min(W-pr-2,X(R.length-1)+4),Y(cv[cv.length-1])-6,cv[cv.length-1].toFixed(2),{fs:11,a:X(R.length-1)>W-60?'end':'start',c:PC[q]})});
  const cvm=cum(m);
  const ci=Math.min(k,S.length-1);if(s.kind!=='stop')o+='<circle cx="'+X(ci).toFixed(1)+'" cy="'+Y(ymode==='cum'?cvm[ci]:s.P).toFixed(1)+'" r="6" fill="none" stroke="var(--ink)" stroke-width="1.6"/>';
  const lg=legend([['Base',PC.base],['Summary',PC.summary],['CLM',PC.clm]],pl,cy+ch+48,W-pl-pr);o+=lg.s;
  return svgW(W,cy+ch+48+lg.h,o,'Prompt composition and size per model call')}
function counters(m,k,e){const S=SIM[m].steps,s=S[Math.min(k,S.length-1)];let tot=0,ed=0;
  for(let i=0;i<=Math.min(k,S.length-1);i++){tot+=serve==='scr'?S[i].f_scr:S[i].f_std;if(S[i].kind==='edit'||S[i].kind==='compact')ed++}
  const U=serve==='scr'?s.U-s.reloc:s.U;
  return stat('Prompt this call',fmt(s.P)+' tok')+stat('Cached prefix',fmt(s.R)+' tok',s.P?Math.round(100*s.R/s.P)+'% of the prompt':'')+
    stat(serve==='scr'?'Prefilled (after SCR)':'Prefilled',fmt(U)+' tok',serve==='scr'&&s.reloc?fmt(s.reloc)+' relocated':'')+stat('This call',e14(serve==='scr'?s.f_scr:s.f_std))+
    stat('Running total',pf(tot/1e15),'whole episode: '+pf(serve==='scr'?SIM[m].pflops_scr:SIM[m].pflops_std))+stat(m==='summary'?'Summaries so far':m==='clm'?'Edits so far':'Edits so far',String(ed))}
$('rpLeg').innerHTML=['hit','re','new','scr','gen'].map(k=>'<span><i style="background:'+ST[k][0]+';opacity:'+(k==='hit'?0.42:0.85)+'"></i>'+ST[k][1]+'</span>').join('')+'<span><i style="background:none;border-top:2px dashed var(--bad);height:0;width:14px"></i>budget</span><span><i style="background:none;border-top:2px dotted var(--mute);height:0;width:14px"></i>trigger</span>';
anim=makeAnim({id:'rp',modes:anim_modes,mode:'clm',draw,counters,dur:2200});
['rpSa','rpSl','rpCa','rpKeep'].forEach(id=>$(id).addEventListener(id==='rpKeep'?'change':'input',()=>{rebuild()}));
$('rpReset').addEventListener('click',()=>{$('rpSa').value=75;$('rpSl').value=1600;$('rpCa').value=75;$('rpKeep').value=0;rebuild()});
segBind('rpY',v=>{ymode=v;$('rpY').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===v?'true':'false'));if(anim)anim.draw()});
segBind('rpV',v=>{serve=v;$('rpV').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===v?'true':'false'));if(anim)anim.draw()});
onTab('t-run',()=>{refit($('rpSvg'));refit($('ccSvg'))});
})();
