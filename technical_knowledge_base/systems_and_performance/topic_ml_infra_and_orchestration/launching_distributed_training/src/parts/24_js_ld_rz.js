// ---- Rendezvous replay (Reading section 4; was the Rendezvous lab tab) ----
// 2026-11-12: a long replay (99 logged events in the c10d run) grouped into explained stretches, one ol.sx item each (#sx-rz-elastic,
// #sx-rz-static, #sx-rz-share); each stretch plays its events during its step (the cursor sweeps the stretch), then the stage holds.
(function(){
if(!document.getElementById('rz-card'))return;
const D=window.LD,$=id=>document.getElementById(id),esc=RD.esc,f1=x=>(Math.round(x*10)/10).toFixed(1);
const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
const KEEP={store_host:'hosts the rendezvous store',add_part:'joins the round',add_wait:'joins the wait list',rm_part:'leaves the round',roundup:'round reset',
  wait_last:'waits for the last call',quorum:'quorum reached',complete:'round complete',joined:'gets its rank',dead:'declares a node dead',
  a_new:'agent: new node waiting',a_failed:'agent: worker group failed',a_done:'agent: rendezvous done',a_finish:'agent: workers finished',
  err_store:'error: store read timed out',closed_mark:'closes the rendezvous',a_rdzv:'agent: starts rendezvous'};
const MARKS={elastic:['A_up','B_up','C_up','kill_C','A_exit_0'],elastic_share:['A_up','B_up','C_up'],static:['A_up','B_up','C_up','kill_C','A_exit_1']};
const MLAB={A_up:'A started',B_up:'B started',C_up:'C started',kill_C:'C killed (SIGKILL)',A_exit_0:'A and B exit 0: job done',A_exit_1:'A and B exit 1: job failed'};
const LIST={elastic:'sx-rz-elastic',static:'sx-rz-static',elastic_share:'sx-rz-share'};
// the stretches: boundaries read from the run's own events, so the list's times are the log's
function bounds(m){const R=D.rz[m],E=R.events,M=R.marks,L=R.logs,ev=(k,p)=>E.find(e=>e.k===k&&(!p||p(e))),lg=(k,p)=>L.find(l=>l.ev===k&&(!p||p(l)));
  if(m==='elastic'){const k2=ev('a_failed',e=>e.t>M.kill_C),dd=ev('dead'),r3=lg('resume',l=>l.world===3),r2=lg('resume',l=>l.world===2&&l.t>M.kill_C);
    return [ev('add_part',e=>e.who==='B').t,ev('a_done').t,ev('a_rdzv',e=>e.who==='C').t,r3.t,k2.t,dd.t,r2.t,M.end]}
  if(m==='static')return [ev('a_done').t,lg('start').t,M.kill_C,M.end];
  const err=E.filter(e=>e.k==='err_store');
  return [ev('a_done').t,ev('a_rdzv',e=>e.who==='C').t,ev('a_rdzv',e=>e.t>ev('a_new').t).t,err[0].t,err[err.length-1].t+1]}
let mode='elastic',steps=[],segs=[],tEnd=1,B=[],cur=0,sweep=1,raf=0;
function build(m){const R=D.rz[m];const out=[];
  R.events.forEach(e=>{if(!(e.k in KEEP))return;if(m!=='static'&&e.k==='a_rdzv')return;
    if(e.k==='a_done'){const w=R.events.find(x=>x.k==='a_world'&&x.who===e.who&&Math.abs(x.t-e.t)<0.01);e=Object.assign({},e,{world:w?w.g[0]:null})}
    out.push({t:e.t,who:e.who,k:e.k,msg:e.msg,state:e.state})});
  MARKS[m].forEach(k=>{if(k in R.marks)out.push({t:R.marks[k],who:k[0]==='k'?'C':k[0],k:'mark',msg:MLAB[k]})});
  let w0=null;R.logs.forEach(l=>{if(l.ev==='step'&&l.rank===0&&l.world!==w0){w0=l.world;out.push({t:l.t,who:'-',k:'train',msg:'rank 0 logs step '+l.step+' at world size '+l.world+(()=>{const r=R.logs.filter(x=>x.ev==='resume'&&x.rank===0&&x.t<=l.t).pop();return r&&l.t-r.t<15?' (resumed from the step '+r.step+' checkpoint)':''})()})}});
  out.sort((a,b)=>a.t-b.t);
  let st={round:0,part:[],wait:[],complete:false,deadline:null};out.forEach(s=>{if(s.state)st=s.state;else s.state=st});
  segs=[];let c=null;R.logs.filter(l=>l.ev==='step'&&l.rank===0).forEach(l=>{if(!c||c.w!==l.world||l.t-c.t1>8){c={w:l.world,t0:l.t,t1:l.t};segs.push(c)}else c.t1=l.t});
  B=bounds(m);tEnd=Math.max(Math.max(...out.map(s=>s.t))+3,B[B.length-1]);return out}
const t0=i=>i?B[i-1]:0;
function lanes(tc){const w=Math.min(RD.width($('rz-svg')),860),lx=26,x1=w-8,X=t=>lx+Math.min(t,tEnd)/tEnd*(x1-lx),h=134,Y={A:30,B:62,C:94};
  let b='<rect x="'+X(t0(cur))+'" y="12" width="'+Math.max(2,X(B[cur])-X(t0(cur)))+'" height="102" fill="var(--acc2)" opacity=".5"/>';
  for(let t=0;t<=tEnd;t+=tEnd>200?60:20)b+='<line x1="'+X(t)+'" x2="'+X(t)+'" y1="14" y2="112" stroke="var(--line)"/>'+RD.t(X(t),126,t+' s',{a:'middle',fs:11,fill:'var(--mute)'});
  segs.forEach(s=>{if(s.t0>tc)return;const who=s.w===3?['A','B','C']:['A','B'];who.forEach(a=>{b+='<rect x="'+X(s.t0)+'" y="'+(Y[a]-5)+'" width="'+Math.max(2,X(Math.min(s.t1,tc))-X(s.t0))+'" height="10" rx="2" fill="var(--good)" opacity=".35"/>'})});
  ['A','B','C'].forEach(a=>{b+=RD.t(4,Y[a]+4,a,{w:600,fs:12})});
  steps.forEach(s=>{if(!Y[s.who]||s.t>tc)return;const inS=s.t>=t0(cur);const c=s.k==='mark'?(/kill|failed/.test(s.msg)?'var(--bad)':'var(--ink)'):/err|failed|dead/.test(s.k)?'var(--bad)':s.k==='complete'||s.k==='a_done'?'var(--acc)':'var(--mute)';
    b+='<circle cx="'+X(s.t)+'" cy="'+Y[s.who]+'" r="'+(inS?4.5:3)+'" fill="'+c+'"'+(inS?'':' opacity=".55"')+'/>'});
  b+='<line x1="'+X(tc)+'" x2="'+X(tc)+'" y1="10" y2="112" stroke="var(--acc)" stroke-dasharray="3 3"/>';
  $('rz-svg').innerHTML=RD.svg(w,h,b,'timeline of agents A B C, stretch '+(cur+1))}
function state(tc){let s=steps[0];steps.forEach(x=>{if(x.t<=tc)s=x});const st=s.state;
  const dl=st.deadline!=null&&!st.complete?('+'+f1(st.deadline)+' s'+(tc<st.deadline?' (in '+f1(st.deadline-tc)+' s)':' (passed)')):'none';
  $('rz-state').innerHTML=mode==='static'?RD.stat('Backend','static','no rounds, no wait list')+RD.stat('Time','+'+f1(tc)+' s','since A started')+RD.stat('Expected nodes','3','fixed --nnodes'):
   RD.stat('Time','+'+f1(tc)+' s','since A started')+RD.stat('Round',st.round,st.complete?'complete':'open')+RD.stat('Participants',st.part.join(', ')||'none','')+RD.stat('Wait list',st.wait.join(', ')||'empty','')+RD.stat('Last-call deadline',dl,'');
  [...$('rz-log').children].forEach((d,j)=>d.classList.toggle('cur',steps[j].t>=t0(cur)&&steps[j].t<=B[cur]))}
function frame(){const tc=t0(cur)+(B[cur]-t0(cur))*sweep;lanes(tc);state(tc)}
function draw(i){const fwd=i===cur+1&&$('rz-card').classList.contains('rd-fwd');cur=i;cancelAnimationFrame(raf);
  if(!fwd||RM){sweep=1;frame();return}
  const s0=performance.now();sweep=0;const go=now=>{sweep=Math.min(1,(now-s0)/1600);frame();if(sweep<1)raf=requestAnimationFrame(go)};raf=requestAnimationFrame(go)}
function render(){steps=build(mode);$('rz-log').innerHTML=steps.map(s=>'<div><span class="w">'+esc(s.who)+'</span>+'+f1(s.t).padStart(6,' ')+' s  '+esc(s.msg.trim())+'</div>').join('')}
render();
const an=RD.anim({card:'rz-card',ctl:'rz-ctl',n:B.length,draw,ms:4400,label:'Rendezvous stretch',list:LIST.elastic});
document.querySelectorAll('.sx-rz').forEach(l=>l.hidden=l.id!==LIST.elastic);
RD.seg($('rz-mode'),m=>{mode=m;render();document.querySelectorAll('.sx-rz').forEach(l=>l.hidden=l.id!==LIST[m]);an.reset(B.length,LIST[m])});
$('rz-log').addEventListener('click',e=>{const d=e.target.closest('div');if(!d||d===$('rz-log'))return;const t=steps[[...$('rz-log').children].indexOf(d)].t;an.go(Math.max(0,B.findIndex(b=>t<=b)))});
window.LD_RZ={bounds};
RD.onRender(()=>an.redraw());RD.onResize(()=>an.redraw());
})();
