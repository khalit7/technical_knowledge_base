// ---- Rendezvous replay (Reading section 4; was the Rendezvous lab tab) ----
(function(){
if(!document.getElementById('rz-card'))return;
const D=window.LD,$=id=>document.getElementById(id),esc=RD.esc,f1=x=>(Math.round(x*10)/10).toFixed(1);
const KEEP={store_host:'hosts the rendezvous store',add_part:'joins the round',add_wait:'joins the wait list',rm_part:'leaves the round',roundup:'round reset',
  wait_last:'waits for the last call',quorum:'quorum reached',complete:'round complete',joined:'gets its rank',dead:'declares a node dead',
  a_new:'agent: new node waiting',a_failed:'agent: worker group failed',a_done:'agent: rendezvous done',a_finish:'agent: workers finished',
  err_store:'error: store read timed out',closed_mark:'closes the rendezvous',a_rdzv:'agent: starts rendezvous'};
const MARKS={elastic:['A_up','B_up','C_up','kill_C','A_exit_0'],elastic_share:['A_up','B_up','C_up'],static:['A_up','B_up','C_up','kill_C','A_exit_1']};
const MLAB={A_up:'A started',B_up:'B started',C_up:'C started',kill_C:'C killed (SIGKILL)',A_exit_0:'A and B exit 0: job done',A_exit_1:'A and B exit 1: job failed'};
let mode='elastic',steps=[],segs=[],tEnd=1;
function build(m){const R=D.rz[m];const out=[];let lastWorld={};
  R.events.forEach(e=>{if(!(e.k in KEEP))return;if(m!=='static'&&e.k==='a_rdzv')return;
    if(e.k==='a_done'){const w=R.events.find(x=>x.k==='a_world'&&x.who===e.who&&Math.abs(x.t-e.t)<0.01);e=Object.assign({},e,{world:w?w.g[0]:null})}
    out.push({t:e.t,who:e.who,k:e.k,msg:e.msg,state:e.state})});
  MARKS[m].forEach(k=>{if(k in R.marks)out.push({t:R.marks[k],who:k[0]==='k'?'C':k[0],k:'mark',msg:MLAB[k]})});
  // first logged step at each world size, and crashes
  let w0=null;R.logs.forEach(l=>{if(l.ev==='step'&&l.rank===0&&l.world!==w0){w0=l.world;out.push({t:l.t,who:'-',k:'train',msg:'rank 0 logs step '+l.step+' at world size '+l.world+(()=>{const r=R.logs.filter(x=>x.ev==='resume'&&x.rank===0&&x.t<=l.t).pop();return r&&l.t-r.t<15?' (resumed from the step '+r.step+' checkpoint)':''})()})}});
  out.sort((a,b)=>a.t-b.t);
  // carry the state forward to marks and training lines
  let st={round:0,part:[],wait:[],complete:false,deadline:null};out.forEach(s=>{if(s.state)st=s.state;else s.state=st});
  // training segments by world size
  segs=[];let cur=null;R.logs.filter(l=>l.ev==='step'&&l.rank===0).forEach(l=>{if(!cur||cur.w!==l.world||l.t-cur.t1>8){cur={w:l.world,t0:l.t,t1:l.t};segs.push(cur)}else cur.t1=l.t});
  tEnd=Math.max(...out.map(s=>s.t))+3;return out}
function lanes(i){const w=Math.min(RD.width($('rz-svg')),860),lx=26,x1=w-8,X=t=>lx+t/tEnd*(x1-lx),h=134,Y={A:30,B:62,C:94};
  let b='';for(let t=0;t<=tEnd;t+=tEnd>200?60:20)b+='<line x1="'+X(t)+'" x2="'+X(t)+'" y1="14" y2="112" stroke="var(--line)"/>'+RD.t(X(t),126,t+' s',{a:'middle',fs:10,fill:'var(--mute)'});
  segs.forEach(s=>{const who=s.w===3?['A','B','C']:['A','B'];who.forEach(a=>{b+='<rect x="'+X(s.t0)+'" y="'+(Y[a]-5)+'" width="'+Math.max(2,X(s.t1)-X(s.t0))+'" height="10" rx="2" fill="var(--good)" opacity=".35"/>'})});
  ['A','B','C'].forEach(a=>{b+=RD.t(4,Y[a]+4,a,{w:600,fs:12})});
  steps.forEach((s,j)=>{if(!Y[s.who])return;const c=s.k==='mark'?(/kill|failed/.test(s.msg)?'var(--bad)':'var(--ink)'):/err|failed|dead/.test(s.k)?'var(--bad)':s.k==='complete'||s.k==='a_done'?'var(--acc)':'var(--mute)';
    b+='<circle cx="'+X(s.t)+'" cy="'+Y[s.who]+'" r="'+(j===i?6:3)+'" fill="'+(j<=i?c:'var(--line)')+'"'+(j===i?' stroke="var(--ink)" stroke-width="1.5"':'')+'/>'});
  const s=steps[i];b+='<line x1="'+X(s.t)+'" x2="'+X(s.t)+'" y1="10" y2="112" stroke="var(--acc)" stroke-dasharray="3 3"/>';
  $('rz-svg').innerHTML=RD.svg(w,h,b,'timeline of agents A B C')}
function draw(i){const s=steps[i];if(!s)return;lanes(i);const st=s.state;
  $('rz-cap').innerHTML='<div class="t">+'+f1(s.t)+' s · '+(s.who==='-'?'training':s.k==='mark'?'event':'agent '+s.who)+((s.k==='mark'||s.k==='train')?'':' · '+esc(KEEP[s.k]||''))+'</div><p><code>'+esc(s.msg.trim())+'</code>'+(s.world?' (world size '+s.world+')':'')+'</p>';
  const dl=st.deadline!=null&&!st.complete?('+'+f1(st.deadline)+' s'+(s.t<st.deadline?' (in '+f1(st.deadline-s.t)+' s)':' (passed)')):'none';
  $('rz-state').innerHTML=mode==='static'?RD.stat('Backend','static','no rounds, no wait list')+RD.stat('Expected nodes','3','fixed --nnodes'):
   RD.stat('Round',st.round,st.complete?'complete':'open')+RD.stat('Participants',st.part.join(', ')||'none','')+RD.stat('Wait list',st.wait.join(', ')||'empty','')+RD.stat('Last-call deadline',dl,'');
  [...$('rz-log').children].forEach((d,j)=>d.classList.toggle('cur',j===i));}
function render(){steps=build(mode);$('rz-log').innerHTML=steps.map(s=>'<div><span class="w">'+esc(s.who)+'</span>+'+f1(s.t).padStart(6,' ')+' s  '+esc(s.msg.trim())+'</div>').join('')}
render();
const an=RD.anim({card:'rz-card',ctl:'rz-ctl',n:steps.length,draw:draw,ms:1500,label:'Rendezvous step'});
RD.seg($('rz-mode'),m=>{mode=m;render();an.reset(steps.length)});
$('rz-log').addEventListener('click',e=>{const d=e.target.closest('div');if(!d||d===$('rz-log'))return;an.go([...$('rz-log').children].indexOf(d))});
RD.onRender(()=>an.redraw());RD.onResize(()=>an.redraw());
})();
