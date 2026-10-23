// ---- Reading section 2: the running example's log lines on a timeline, busy cluster against idle cluster ----
(function(){
const S=window.SL, esc=RD.esc, $=id=>document.getElementById(id), T=RD.t;
if(!$('sl-lf-card'))return;
const LANES=[['ctld','controller'],['bf','backfill'],['c1','node c1'],['c2','node c2'],['rank','training']];
const KCOL={blk:'var(--dim)',submit:'var(--c1)',plan:'var(--c5)',mainrun:'var(--c1)',alloc:'var(--good)',prolog:'var(--c6)',batch:'var(--c4)',step:'var(--c4)',train:'var(--c3)',stepdone:'var(--c4)',batchdone:'var(--c4)',done:'var(--c1)',epilog:'var(--c6)'};
let mode='busy';
function evs(m){const r=S[m],sub=r.events.find(e=>e.k==='submit').t;return r.events.map(e=>Object.assign({},e,{rt:e.t-sub}))}
function span(m){const e=evs(m);return {lo:Math.min(...e.map(x=>x.rt)),hi:Math.max(...e.map(x=>x.rt))}}
const LO=Math.min(span('busy').lo,span('idle').lo),HI=Math.max(span('busy').hi,span('idle').hi)+0.5;
function stateAt(m,rt){const e=evs(m);const at=k=>{const x=e.find(z=>z.k===k);return x?x.rt:Infinity};
  if(rt<0)return '';if(rt<at('alloc'))return 'PENDING';if(rt<at('done'))return 'RUNNING';
  const lastEp=Math.max(...e.filter(z=>z.k==='epilog').map(z=>z.rt));if(rt<lastEp)return 'COMPLETING';return 'COMPLETED'}
function draw(i){const E=evs(mode),el=$('sl-lf-svg'),W=Math.min(RD.width(el),860),L=W<480?64:84,R=10,lh=W<480?30:34,top=26,H=top+LANES.length*lh+26;
  const x=t=>L+(W-L-R)*(t-LO)/(HI-LO);let b='';const cur=E[i];
  // state band
  const sub=0,alloc=(E.find(e=>e.k==='alloc')||{}).rt,done=(E.find(e=>e.k==='done')||{}).rt;
  const now=cur.rt;const seg=(a,z,c,t)=>{if(now<a)return;const e2=Math.min(z,now);b+='<rect x="'+x(a)+'" y="6" width="'+Math.max(1,x(e2)-x(a))+'" height="13" fill="'+c+'" opacity=".55"/>';if(x(e2)-x(a)>58)b+=T(x(a)+4,16,t,{fs:11})};
  seg(sub,alloc,'var(--dim)','PENDING');seg(alloc,done,'var(--good)','RUNNING');seg(done,HI,'var(--c5)','');
  LANES.forEach((ln,k)=>{const y=top+k*lh;b+='<line x1="'+L+'" y1="'+(y+lh/2)+'" x2="'+(W-R)+'" y2="'+(y+lh/2)+'" stroke="var(--line)"/>'+T(4,y+lh/2+4,ln[1],{fs:11,fill:'var(--mute)'})});
  // training span
  const tr=E.filter(e=>e.k==='train');if(tr.length===2&&now>=tr[0].rt){const y=top+4*lh+lh/2;b+='<rect x="'+x(tr[0].rt)+'" y="'+(y-6)+'" width="'+(x(Math.min(now,tr[1].rt))-x(tr[0].rt))+'" height="12" rx="3" fill="var(--c3)" opacity=".5"/>'}
  // every backfill plan (one per bf_interval) and the planned start, which is off the right edge
  const R0=S[mode].events.find(e=>e.k==='submit').t;
  (S[mode].plans||[]).forEach(t=>{const rt=t-R0;if(rt>now)return;const y=top+1*lh+lh/2;b+='<line x1="'+x(rt)+'" y1="'+(y-7)+'" x2="'+x(rt)+'" y2="'+(y+7)+'" stroke="var(--c5)" stroke-width="2"/>'});
  if(S[mode].pstart&&now>=(S[mode].plans[0]-R0)){const prt=S[mode].pstart-R0,y=top+1*lh+lh/2;b+=T(W-R-2,y-9,'planned start +'+prt.toFixed(1)+' s \u2192',{fs:11,a:'end',fill:'var(--c5)'})}
  E.forEach((e,k)=>{if(k>i)return;const li=LANES.findIndex(l=>l[0]===e.lane);if(li<0)return;const y=top+li*lh+lh/2;
    b+='<circle cx="'+x(e.rt)+'" cy="'+y+'" r="'+(k===i?6:4)+'" fill="'+(KCOL[e.k]||'var(--ink)')+'"'+(k===i?' stroke="var(--ink)" stroke-width="1.5"':'')+'/>'});
  b+='<line x1="'+x(now)+'" y1="'+top+'" x2="'+x(now)+'" y2="'+(top+LANES.length*lh)+'" stroke="var(--ink)" stroke-dasharray="3 3"/>';
  const step=HI-LO>20?5:2;for(let t=Math.ceil(LO/step)*step;t<=HI;t+=step)b+=T(x(t),H-6,(t>0?'+':'')+t+' s',{fs:11,a:'middle',fill:'var(--mute)'});
  el.innerHTML=RD.svg(W,H,b,'Timeline of the running example on Slurm');
  const clk=t=>{const h=Math.floor(t/3600),m=Math.floor(t%3600/60),s=(t%60).toFixed(3);return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+s.padStart(6,'0')};
  $('sl-lf-cap').innerHTML='<b>'+clk(cur.t)+' UTC, '+(cur.rt>=0?'+':'')+cur.rt.toFixed(3)+' s.</b> '+esc(cur.txt)+(cur.k==='plan'&&S[mode].nplan>1?' (logged '+S[mode].nplan+' times in all).':'');
  $('sl-lf-raw').textContent=cur.raw;
  const plans=E.slice(0,i+1).filter(e=>e.k==='plan').length;
  $('sl-lf-cnt').innerHTML=RD.stat('since sbatch',cur.rt.toFixed(2)+' s',cur.rt<0?'before the job is submitted':'')+RD.stat('job state',stateAt(mode,now)||'not yet submitted',now<0?'the blocker takes every GPU':'')+
    RD.stat('nodes held',now>=alloc?(now>=done?'releasing':'c[1-2]'):'none',now>=alloc?'4 CPUs, 4 GPUs':'')+RD.stat('backfill plans seen',mode==='busy'?(plans?S.busy.nplan:0):0,mode==='busy'?'start 05:37:53 each time':'started at once');}
const n=()=>S[mode].events.length;
const A=RD.anim({card:'sl-lf-card',ctl:'sl-lf-ctl',n:n(),draw:draw,ms:1500,label:'Log line'});
RD.onResize(()=>A.redraw());
RD.seg($('sl-lf-mode'),m=>{mode=m;A.reset(n())});
// summary table, computed from the events
(function(){const row=(name,f)=>'<tr><td>'+name+'</td><td class="num">'+f('busy')+'</td><td class="num">'+f('idle')+'</td></tr>';
  const g=(m,k,last)=>{const e=evs(m).filter(z=>z.k===k);return e.length?(last?e[e.length-1]:e[0]).rt:NaN};
  const d=(m,a,b,la,lb)=>(g(m,b,lb)-g(m,a,la));const f3=v=>isNaN(v)?'n/a':v.toFixed(3)+' s',ms=v=>isNaN(v)?'n/a':Math.round(v*1000)+' ms';
  const allocK=m=>evs(m).some(e=>e.k==='alloc')?'alloc':'alloc';
  $('sl-lf-tab').innerHTML=
    row('pending: sbatch to allocation',m=>f3(g(m,'alloc')))+
    row('which loop started it',m=>m==='busy'?'main (on the job-end event)':'backfill (cycle came first)')+
    row('allocation to prolog',m=>ms(d(m,'alloc','prolog')))+
    row('prolog to batch script',m=>ms(d(m,'prolog','batch')))+
    row('batch script to step launch',m=>ms(d(m,'batch','step')))+
    row('step launch to training start',m=>f3(d(m,'step','train')))+
    row('training (ranks\' own wall time)',m=>S[m].wall.toFixed(2)+' s')+
    row('allocation to last epilog',m=>f3(d(m,'alloc','epilog',false,true)))+
    row('global loss at step 200',m=>String(S[m].gloss))})();
})();
