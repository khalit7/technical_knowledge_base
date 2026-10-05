// ---- Production stack (t-ops): architecture picture, gateway replay, keys table ----
(function(){
  const D=window.OPS,U=window.OPU,esc=U.esc;if(!D||!U)return;
  const G=D.gw,TIMEOUT=8;
  // ---------- values used in the prose ----------
  const V=window.OPS_V=window.OPS_V||{};
  V.date="5 to 6 October 2026";V.litellm=D.litellm;V.emdash=String((D.redaction||{}).emdash_replaced||0);
  // ---------- architecture picture ----------
  function arch(){
    const el=document.getElementById('ops-arch');if(!el)return;const W=U.width(el),narrow=W<600;
    const bx=(x,y,w,h,t,s,col)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="7" fill="var(--soft)" stroke="'+(col||'var(--line)')+'" stroke-width="1.5"/>'+
      '<text x="'+(x+w/2)+'" y="'+(y+h/2-(s?3:-4))+'" text-anchor="middle" font-size="12.5" font-weight="600">'+t+'</text>'+(s?'<text x="'+(x+w/2)+'" y="'+(y+h/2+12)+'" text-anchor="middle" font-size="11" fill="var(--mute)">'+s+'</text>':'');
    const ar=(x1,y1,x2,y2,dash,col)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+(col||'var(--mute)')+'" stroke-width="1.4"'+(dash?' stroke-dasharray="4 3"':'')+' marker-end="url(#ops-ah)"/>';
    let s='<defs><marker id="ops-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker></defs>';
    let H;
    if(!narrow){
      const cw=(W-40)/4,bw=cw-18,h=46;H=230;
      const X=i=>10+i*(cw+6);
      s+=bx(X(0),20,bw,h,'Memory store','read before, write after','var(--c4)');
      s+=bx(X(0),92,bw,h,'Your agent loop','model call, tools, repeat','var(--acc)');
      s+=bx(X(1),92,bw,h,'Gateway','retries, fallback, keys','var(--c2)');
      s+=bx(X(2),60,bw,h,'Primary provider','');s+=bx(X(2),124,bw,h,'Backup model','');
      s+=bx(X(3),92,bw,h,'Trace collector','spans from every step','var(--c3)');
      s+=bx(X(3),172,bw,h,'Eval suite','checks stored runs','var(--c5)');
      s+=ar(X(0)+bw/2,92,X(0)+bw/2,66+2)+ar(X(0)+bw/2+14,66,X(0)+bw/2+14,92-2);
      s+=ar(X(0)+bw,115,X(1)-2,115);
      s+=ar(X(1)+bw,108,X(2)-2,84);s+=ar(X(1)+bw,122,X(2)-2,146,true);
      s+='<path d="M'+(X(0)+bw/2)+',138 V158 H'+(X(3)-14)+' V122" fill="none" stroke="var(--c3)" stroke-width="1.4" stroke-dasharray="4 3"/>'+ar(X(3)-14,122,X(3)-2,118,true,'var(--c3)');
      s+='<text x="'+(X(1)+8)+'" y="'+172+'" font-size="10.5" fill="var(--mute)">spans</text>';
      s+=ar(X(3)+bw/2,138,X(3)+bw/2,172-2,false,'var(--c5)');
      s+='<text x="'+(X(1)+bw+8)+'" y="'+160+'" font-size="10.5" fill="var(--mute)">fallback</text>';
    }else{
      const bw=W-24,h=40;H=40+6*(h+16);const Y=i=>8+i*(h+16);
      s+=bx(12,Y(0),bw,h,'Memory store','read before a session, written after','var(--c4)');
      s+=bx(12,Y(1),bw,h,'Your agent loop','model call, tools, repeat','var(--acc)');
      s+=bx(12,Y(2),bw,h,'Gateway','retries, fallback, keys, budgets','var(--c2)');
      s+=bx(12,Y(3),bw/2-6,h,'Primary','')+bx(12+bw/2+6,Y(3),bw/2-6,h,'Backup','');
      s+=bx(12,Y(4),bw,h,'Trace collector','spans from loop and gateway','var(--c3)');
      s+=bx(12,Y(5),bw,h,'Eval suite','checks stored runs on every change','var(--c5)');
      for(let i=0;i<5;i++)s+=ar(W/2,Y(i)+h,W/2,Y(i+1)-2,i>=3);
    }
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'">'+s+'</svg>';
  }
  arch();U.onRender(arch);
  // ---------- gateway replay ----------
  const SC=[{id:'healthy',l:'Healthy provider',d:'direct_ok',g:'gw_ok'},
    {id:'retry',l:'429, then 500, then fine',d:'direct_429',g:'gw_retry'},
    {id:'down',l:'Down: 503 every time',d:'direct_503',g:'gw_fallback'},
    {id:'hang',l:'Hangs for 20 s',d:'direct_hang',g:'gw_timeout'},
    {id:'cool',l:'Down for four requests in a row',d:null,g:'gw_cooldown'}];
  let cur=SC[1],mode='gw';
  const failT=u=>(typeof u.status==='number'&&u.status>=400)?u.t1:(u.t1-u.t0>TIMEOUT-0.1&&mode==='gw'?u.t0+TIMEOUT:u.t1);
  const isHang=u=>/^hang/.test(u.beh);
  function evs(R){
    const E=[{t:0,x:mode==='gw'?'The client sends one request to the gateway, asking for the model name <code>primary</code>.':'Your code sends the request straight to the provider.'}];
    R.up.forEach((u,k)=>{
      const prevFail=k?failT(R.up[k-1]):null;
      E.push({t:u.t0,x:(mode==='gw'?'Attempt '+(k+1)+' to the primary provider'+(k?' after waiting '+(u.t0-prevFail).toFixed(2)+' s':'')+'.':'The provider receives the request.')});
      if(isHang(u)){
        if(mode==='gw'&&u.t1-u.t0>TIMEOUT)E.push({t:u.t0+TIMEOUT,x:'No answer after '+TIMEOUT+' s: the gateway abandons attempt '+(k+1)+' (its timeout). The provider keeps working on it; nobody will read that answer.'});
        E.push({t:u.t1,x:mode==='gw'?'The abandoned attempt '+(k+1)+' finally finishes at the provider, '+(u.t1-u.t0).toFixed(1)+' s after it started: wasted work.':'The provider finally answers after '+(u.t1-u.t0).toFixed(1)+' s.'});
      }else if(u.status>=400){
        const ra=u.beh.split(':')[1];
        E.push({t:u.t1,x:'The provider answers <b>'+u.status+'</b>'+(u.status===429?' (rate limited'+(ra?', Retry-After: '+ra+' s':'')+')':' (server error)')+'.'+(mode==='direct'?' Without a gateway this error is your code\'s problem now: retry it, back off, switch provider, or fail the task.':'')});
      }else E.push({t:u.t1,x:'The provider answers 200.'});
    });
    R.bk.forEach((b,k)=>{E.push({t:b.t0,x:'Retries used up for this request: the gateway <b>falls back</b> to the <code>backup</code> group (the local model)'+(R.up.length?', '+(b.t0-failT(R.up.filter(u=>u.t0<b.t0).slice(-1)[0]||{t1:0,status:0,beh:''})).toFixed(2)+' s after the last failure':'')+'.'});
      E.push({t:b.t1,x:'The backup model answers after '+(b.t1-b.t0).toFixed(2)+' s.'})});
    R.req.forEach((q,k)=>E.push({t:q.t1,x:'Request '+(R.req.length>1?(k+1)+' ':'')+'returns to the client: HTTP <b>'+q.status+'</b> after '+(q.t1-q.t0).toFixed(2)+' s'+(q.who?', answered by <code>'+esc(q.who)+'</code>':'')+'.'}));
    E.sort((a,b)=>a.t-b.t);
    // merge events within 0.02 s
    const M=[];E.forEach(e=>{const l=M[M.length-1];if(l&&Math.abs(l.t-e.t)<0.02)l.x+=' '+e.x;else M.push({t:e.t,x:e.x})});
    return M;
  }
  let E=[],R=null,TT=1;
  function setup(){
    const key=mode==='gw'?cur.g:(cur.d||cur.g);R=G[key];
    if(mode==='direct'&&!cur.d){R=null}
    E=R?evs(R):[{t:0,x:'Not recorded without a gateway: four direct requests would each fail at once with a 503.'}];
    TT=R?Math.max(...R.req.map(q=>q.t1),...R.up.map(u=>u.t1),...R.bk.map(b=>b.t1),0.5):1;
    an.reset(E.length);an.go(E.length-1);an.go(0);
  }
  function draw(i){
    const el=document.getElementById('ops-gwsvg');const W=U.width(el),lw=W<480?64:96,pw=W-lw-12;
    const lanes=mode==='gw'?['Client','Gateway','Primary','Backup']:['Client','Primary'];
    const lh=30,top=6,H=top+lanes.length*lh+26;const x=t=>lw+Math.max(0,Math.min(1,t/TT))*pw;
    const now=E.length?E[Math.min(i,E.length-1)].t:0;
    let s='';
    lanes.forEach((l,k)=>{s+='<text x="4" y="'+(top+k*lh+19)+'" font-size="11.5">'+l+'</text><line x1="'+lw+'" x2="'+(lw+pw)+'" y1="'+(top+k*lh+lh-2)+'" y2="'+(top+k*lh+lh-2)+'" stroke="var(--line)"/>'});
    const bar=(lane,t0,t1,col,op,title)=>{const a=Math.min(t1,now);if(a<=t0&&!(t0<=now&&t1===t0))return '';const w=Math.max(2,x(Math.max(a,t0))-x(t0));
      return '<rect x="'+x(t0)+'" y="'+(top+lane*lh+6)+'" width="'+w+'" height="'+(lh-14)+'" rx="2" fill="'+col+'" opacity="'+(op||1)+'"><title>'+esc(title||'')+'</title></rect>'};
    if(R){
      const L=n=>lanes.indexOf(n);
      R.req.forEach(q=>{s+=bar(0,q.t0,q.t1,'var(--c1)',0.85,'client waiting '+(q.t1-q.t0).toFixed(2)+' s');
        if(q.t1<=now)s+='<rect x="'+(x(q.t1)-3)+'" y="'+(top+6)+'" width="6" height="'+(lh-14)+'" fill="'+(q.status===200?'var(--good)':'var(--bad)')+'"/>'});
      R.up.forEach((u,k)=>{const lane=L('Primary');const fail=isHang(u)?Math.min(u.t1,mode==='gw'?u.t0+TIMEOUT:u.t1):u.t1;
        if(isHang(u)){s+=bar(lane,u.t0,u.t1,'var(--c5)',mode==='gw'?0.45:0.8,'hanging attempt');if(mode==='gw')s+=bar(lane,u.t0,fail,'var(--c5)',1,'')}
        else s+=bar(lane,u.t0,Math.max(u.t1,u.t0+TT*0.004),u.status>=400?'var(--bad)':'var(--good)',1,String(u.status));
        if(mode==='gw'&&k<R.up.length-1){const nx=R.up[k+1].t0;s+=bar(L('Gateway'),failT(u),nx,'var(--dim)',1,'waiting before retry')}
      });
      if(mode==='gw'){R.bk.forEach(b=>{s+=bar(L('Backup'),b.t0,b.t1,'var(--good)',0.9,'backup answering');
        const lastFail=R.up.filter(u=>u.t0<b.t0).slice(-1)[0];if(lastFail)s+=bar(L('Gateway'),failT(lastFail),b.t0,'var(--dim)',1,'waiting before fallback')})}
    }
    // cursor and axis
    s+='<line x1="'+x(now)+'" x2="'+x(now)+'" y1="'+top+'" y2="'+(top+lanes.length*lh)+'" stroke="var(--ink)" stroke-dasharray="3 3"/>';
    const step=TT>30?10:TT>10?5:TT>4?1:0.5;for(let t=0;t<=TT+1e-9;t+=step)s+='<text x="'+x(t)+'" y="'+(H-6)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+(+t.toFixed(1))+' s</text>';
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'">'+s+'</svg>';
    const e=E[Math.min(i,E.length-1)];
    document.getElementById('ops-gwcap').innerHTML='<b>'+(+now.toFixed(2))+' s.</b> '+(e?e.x:'');
    // counters (to the current time)
    if(R){const at=R.up.filter(u=>u.t0<=now).length,bk=R.bk.filter(b=>b.t0<=now).length,done=R.req.filter(q=>q.t1<=now);
      const last=R.req[R.req.length-1],h=last.hdr||{};
      document.getElementById('ops-gwcnt').innerHTML=U.stat('Client has waited',U.sec(Math.min(now,last.t1)),R.req.length>1?R.req.length+' requests in a row':'')+
        U.stat('Attempts at the primary',at,mode==='gw'?'2 retries allowed per request':'one call, no retries')+
        U.stat('Calls to the backup',mode==='gw'?bk:'none','')+
        U.stat('Outcome',done.length?done.map(q=>q.status).join(', '):'waiting',done.length&&last.who?'answered by '+esc(last.who):'')+
        (mode==='gw'&&h['x-litellm-overhead-duration-ms']?U.stat('Gateway overhead (header)',(+h['x-litellm-overhead-duration-ms']/1000).toFixed(2)+' s','<code>x-litellm-overhead-duration-ms</code>, includes its waits'):'');
    }else document.getElementById('ops-gwcnt').innerHTML='';
  }
  const an=U.anim({card:'ops-gwf',ctl:'ops-gwc',n:2,label:'Replay step',draw,delay:i=>{const a=E[i],b=E[i+1];return a&&b?Math.max(600,Math.min(2400,500+(b.t-a.t)*180)):1200}});
  const pk=document.getElementById('ops-gwpick');
  pk.innerHTML=SC.map((c,k)=>'<button data-k="'+k+'"'+(c===cur?' class="on"':'')+'>'+c.l+'</button>').join('');
  pk.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;cur=SC[+b.dataset.k];pk.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));setup()});
  U.seg(document.getElementById('ops-gwmode'),m=>{mode=m;setup()});
  setup();
  // ---------- numbers and findings ----------
  const rt=G.gw_retry,fb=G.gw_fallback,hg=G.gw_timeout,dh=G.direct_hang,cd=G.gw_cooldown,ok=G.gw_ok;
  const waits=r=>r.up.slice(1).map((u,k)=>u.t0-failT(Object.assign({},r.up[k]))) ;
  const prevMode=mode;mode='gw';
  const wR=waits(rt),wF=waits(fb),wH=waits(hg),fbGap=fb.bk[0].t0-fb.up[fb.up.length-1].t1,hgGap=hg.bk[0].t0-(hg.up[hg.up.length-1].t0+TIMEOUT);
  mode=prevMode;
  const f2=n=>n.toFixed(2);
  Object.assign(V,{'gw.retry.total':f2(rt.req[0].t1)+' s','gw.hang.total':f2(hg.req[0].t1)+' s','gw.hang.direct':f2(dh.req[0].t1)+' s'});
  window.OPS_GWNUM={wR,wF,wH,fbGap,hgGap,hang:hg.req[0].t1,direct:dh.req[0].t1,cdUp:cd.up.length,cdReq:cd.req.length};
  const fx=document.getElementById('ops-gwfind');
  fx.innerHTML='<h3>What the recordings show</h3><ul>'+
    '<li><b>The backoff formula holds.</b> After the 429 carrying <code>Retry-After: 2</code> the gateway waited '+f2(wR[0])+' s (2 s plus jitter); after the 500 it waited '+f2(wR[1])+' s, which is 0.5 &middot; 2<sup>1</sup> = 1 s plus jitter. In the 503 run the waits were '+wF.map(f2).join(' s and ')+' s (0.5 s and 1 s plus jitter). The client never saw an error: the call succeeded in '+f2(rt.req[0].t1)+' s.</li>'+
    '<li><b>A fallback is not instant.</b> After the third 503 the gateway waited another '+f2(fbGap)+' s before calling the backup, the size of one more backoff step (0.5 &middot; 2<sup>2</sup> = 2 s plus jitter; our reading of the timing). The user waited '+f2(fb.req[0].t1)+' s for an answer that a direct call to the backup gives in about '+f2(fb.bk[0].t1-fb.bk[0].t0)+' s.</li>'+
    '<li><b>A gateway can make a hang worse.</b> The provider answers after 20 s. Called directly, the client waited '+f2(dh.req[0].t1)+' s and got its answer. Through the gateway, three attempts each timed out at 8 s, with waits of '+wH.map(f2).join(' s and ')+' s and '+f2(hgGap)+' s before the fallback: the client waited '+f2(hg.req[0].t1)+' s, and the provider kept working on all three abandoned attempts. A timeout shorter than the provider\'s real latency, multiplied by retries, costs more than it saves: set the per-attempt timeout from measured latency and give the whole call one deadline.</li>'+
    '<li><b>No cooldown with a single deployment.</b> LiteLLM can take a failing deployment out of rotation for a while (a <i>cooldown</i>; this config allowed 3 failures and 30 s). Four requests in a row still sent '+cd.up.length+' attempts to the dead provider, three each, and each request waited the full retry chain before falling back. The router\'s source says why: "a direct call to a single-deployment member keeps the single-deployment-model-group cooldown exemption" (<code>routing_group_has_alternatives</code> in <code>router.py</code>). With one deployment per model name, cooldowns never trigger; put two deployments behind a name, or cap retries, if you want fast failover.</li>'+
    '<li><b>Overhead when nothing fails:</b> the healthy request took '+f2(ok.req[0].t1)+' s through the gateway against '+f2(G.direct_ok.req[0].t1)+' s direct; the gateway\'s own header reports '+(+ok.req[0].hdr['x-litellm-overhead-duration-ms']).toFixed(0)+' ms of overhead (one request, the first after start-up, so read it as an upper bound).</li></ul>';
  U.pred('ops-pr1',3,()=>'The recorded run took '+f2(hg.req[0].t1)+' s: three 8-second timeouts, backoff waits of '+wH.map(f2).join(' s, ')+' s and '+f2(hgGap)+' s, then '+f2(hg.bk[0].t1-hg.bk[0].t0)+' s for the backup to answer. Called directly, the same hanging provider answered in '+f2(dh.req[0].t1)+' s.');
  // ---------- keys table ----------
  const K=G.keys,ks=K.keys;
  const lim={budget:'models primary, backup; max budget $'+ks.budget.max_budget,backup_only:'model backup only',rpm:'model backup only; 2 requests per minute'};
  const asked=k=>k==='backup_only'?'primary':'backup';
  let rows='<tr><th>#</th><th>Key and its limits</th><th>Asked for</th><th class="num">Status</th><th>Gateway\'s answer</th><th class="num">Key spend after</th></tr>';
  K.req.forEach((q,i)=>{const msg=q.err?esc((q.err.type||'')+': '+String(q.err.message).slice(0,150)):'answer from <code>'+esc(q.who)+'</code>, cost '+(q.hdr['x-litellm-response-cost']?U.usd(+q.hdr['x-litellm-response-cost']):'?');
    rows+='<tr><td>'+(i+1)+'</td><td>'+lim[q.key]+'</td><td><code>'+asked(q.key)+'</code></td><td class="num '+(q.status===200?'ops-ok':'ops-no')+'">'+q.status+'</td><td>'+msg+'</td><td class="num">'+(q.spend==null?'':U.usd(q.spend))+'</td></tr>'});
  document.getElementById('ops-keys').innerHTML=rows;
  const ok3=K.req.filter(q=>q.key==='budget'&&q.status===200),cost1=+ok3[0].hdr['x-litellm-response-cost'];
  Object.assign(V,{'key.cost1':U.usd(cost1),'key.n':String(ok3.length)});
  document.getElementById('ops-keynote').innerHTML='<p class="small">Each answer cost '+U.usd(cost1)+' at the configured prices, so the $'+ks.budget.max_budget+' budget allowed '+ok3.length+' calls and ended at '+U.usd(ok3.length*cost1)+': the check runs <i>before</i> a call against the spend recorded so far, so a key can overshoot its cap by the calls in flight. The spend read back one second after each of the first calls was still $0: LiteLLM writes spend to the database in batches, which widens the overshoot under parallel traffic. Treat a gateway budget as a circuit breaker, not an exact meter.</p>';
})();
