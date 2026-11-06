// ---- Scene, Fig. 5 (section 5): the lost update three ways on a real heap page (renderer v2) ----
// TXD.mvcc (src/measure/mvcc_trace.py, PostgreSQL 16.15 with pageinspect): after every step, every version of Ines's row on page 0
// (balance, xmin, xmax and their commit status) and each session's snapshot. One box per row version, height = balance.
(function(){
  if(!document.getElementById('stg-mv')||!window.TXD)return;const {mix,cl,at}=S3,M=TXD.mvcc;
  let mode='naive';
  const XT=lp=>(lp-2)*2.05,H=b=>.22+b/30*.78,SES={A:[-4.25,0,.85],B:[4.25,0,.85]};
  const dead=t=>t.xmax&&!t.xmax_is_lock_only&&t.xmax_status==='committed',fresh=t=>t.xmin_status==='in progress';
  // what each session knows after step k: its last snapshot, its transaction id, whether it waits or has failed
  function sess(st,k){const o={A:{},B:{}},done={};
    st.slice(0,k+1).forEach(s=>s.f.forEach(z=>{done[z.i]=1;const x=o[z.s];if(!x)return;if(z.snap)x.snap=z.snap;if(z.xid)x.xid=z.xid;if(z.err)x.err=z.err;if(z.st==='BEGIN'){x.err=null;x.snap=null;x.xid=null}}));
    st.slice(0,k+1).forEach((s,i)=>{if(s.b&&!done[i])o[s.s].wait=true});
    // FOR UPDATE: A has a transaction id from the moment it locks the row (the lock is that id written into xmax)
    if(mode==='for_update'&&k>=1&&!o.A.xid)o.A.xid=st[1].page[0].xmax+' (from the lock)';return o}
  function draw(R,k,e){const P=R.P,run=M.runs[mode],st=run.steps,cur=st[k],prev=st[k-1]||st[0];R.grid(-5.6,5.6,-2,2.4,.5);
    // the heap page: a glass plate the versions stand on
    R.glass([-3.2,0.002,-.8],[6.4,0,0],[0,0,1.6],{c:P.c1,nu:8,nv:3,a:.8});
    R.label([0,0,.8],'heap page 0 of credits',{dy:50,fs:12,c:P.mute,wide:1});
    const S=sess(st,k);
    cur.page.forEach(t=>{const x=XT(t.lp),old=prev.page.find(u=>u.lp===t.lp),isNew=!old||k===0?false:true,born=!old&&k>0;
      const grow=born?e:1,dd=dead(t),wasDead=old&&dead(old),a=dd?(wasDead?.35:1-.65*e):1;
      const fill=dd?P.paper:fresh(t)?mix(P.paper,P.c5,.5):mix(P.paper,P.good,.4),h=H(t.balance)*grow;
      R.box([x,0,0],[1.3,Math.max(.02,h),.85],{fill,a,fa:fresh(t)?.8:1});
      R.label([x,h,0],String(t.balance),{fs:16,b:1,dy:-12,a:Math.max(a,.5)*grow});
      R.label([x,0,.42],'xmin '+t.xmin,{fs:12,mono:true,dy:13,a:Math.max(.55,a)*grow,c:fresh(t)?P.c5:P.ink});
      const xm=t.xmax?'xmax '+t.xmax+(t.xmax_is_lock_only?' lock':''):'xmax 0';
      R.label([x,0,.42],xm,{fs:12,mono:true,dy:29,a:Math.max(.55,a)*grow,c:t.xmax_is_lock_only?P.c5:t.xmax&&t.xmax_status==='in progress'?P.c5:P.ink});
      if(t.xmax_is_lock_only&&t.xmax_status==='in progress')R.box([x,h,0],[.55,.12,.35],{fill:P.c5,a:(old&&old.xmax_is_lock_only&&old.xmax===t.xmax?1:e)*.95,shadow:false});
      if(dd&&!wasDead)R.label([x,h,0],'dead',{fs:12,dy:-30,c:P.mute,a:e,wide:1})});
    // the two sessions, with what they can see
    ['A','B'].forEach(n=>{const p=SES[n],x=S[n],side=n==='A'?'right':'left',dx=n==='A'?-2:2;
      const fill=x.err?mix(P.paper,P.bad,.45):x.wait?mix(P.paper,P.bad,.15):mix(P.paper,n==='A'?P.c1:P.c4,.3);
      R.box(p,[1.2,.42,.75],{fill});R.label([p[0],.42,p[2]],'tab '+n,{fs:13,b:1,dy:-11});
      const lines=[x.snap?'snapshot '+x.snap:'no snapshot yet',x.xid?'xid '+x.xid:'no xid yet'];
      if(x.wait)lines.push('waiting for a lock');if(x.err)lines.push('error 40001');
      lines.forEach((t,i)=>R.label([p[0],0,p[2]+.38],t,{fs:12,mono:true,dy:14+i*15,c:i>=2?P.bad:P.mute,wide:i<2?1:0}))});
    // data moving at this step: a read streams from the version it saw to the session; a write from the session into its new version; a wait points at the lock
    const fin=cur.f||[];
    fin.forEach(z=>{const p=SES[z.s];if(!p)return;const me=[p[0],.42,p[2]];
      if(z.err){R.glow([p[0],.3,p[2]],.8,{c:P.bad,a:e*.6});return}
      if(z.bal===undefined)return;const isW=/^UPDATE/.test(st[z.i].q);
      const t=isW?cur.page.find(u=>String(u.xmin)===String(z.xid)&&u.balance===z.bal):cur.page.find(u=>u.balance===z.bal&&!dead(u)&&!(fresh(u)&&String(u.xmin)!==String(z.xid)))||cur.page.find(u=>u.balance===z.bal);
      if(!t)return;const top=[XT(t.lp),H(t.balance)*.85,0];
      if(isW)R.flowArc(me,top,.7,{c:P.c2,a:e,r:.07,speed:1.3});else R.flowArc(top,me,.7,{c:P.c1,a:e,r:.07,speed:1.3})});
    if(cur.b&&!fin.some(z=>z.i===k)){const p=SES[cur.s],t=cur.page.find(u=>!dead(u))||cur.page[0];
      R.line([[p[0],.3,p[2]],[XT(t.lp)+.7,.3,0]],{c:P.bad,w:2,dash:[5,4],head:7,a:e})}
    if(/^COMMIT/.test(cur.q)&&fin.some(z=>z.i===k&&z.st==='COMMIT'))R.glow([SES[cur.s][0],.3,SES[cur.s][2]],.8,{c:P.good,a:e*.6});
  }
  const stg=S3.stage({id:'stg-mv',list:'sx-mv-naive',fig:'Fig. 3 · one row’s versions on a real heap page',cam:[0,.68],bounds:[[-4.9,0,-.9],[4.9,1.1,1.7]],aspect:.44,dur:1400,hold:4800,draw,
    view:()=>innerWidth<520?{cam:[0,.9]}:null, // on a phone the camera looks down more, so the long scene uses the card's height
   
    margin:w=>w<520?[16,6,40,6]:[20,16,44,16]});
  const seg=document.getElementById('rd-mv-mode');
  if(seg&&stg)seg.querySelectorAll('button').forEach(b=>b.onclick=()=>{seg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));mode=b.dataset.m;
    ['naive','for_update','serializable'].forEach(m=>{const l=document.getElementById('sx-mv-'+m);if(l)l.hidden=m!==mode});stg.list('sx-mv-'+mode)});
})();
