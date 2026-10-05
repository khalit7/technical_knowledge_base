// ---- Production stack (t-ops): gateway simulator (illustrative model; policy from LiteLLM's source and the recordings) ----
(function(){
  const U=window.OPU,esc=U.esc;if(!U||!document.getElementById('ops-simf'))return;
  const P={rpm:60,n:100,err:5,hang:3,out0:40,outLen:30,lim:60,lat:3,retries:2,timeout:8,fallback:1,bk:4.5,seed:1};
  const CTL=[['rpm','Requests per minute',20,180,10,''],['err','Background 5xx rate',0,30,1,'%'],['hang','Hang rate (20 s)',0,15,1,'%'],
    ['outLen','Outage length (starts at 40 s)',0,60,5,' s'],['lim','Provider rate limit',20,200,10,' per min'],
    ['retries','Gateway retries',0,4,1,''],['timeout','Per-attempt timeout',2,30,1,' s']];
  const box=document.getElementById('ops-simctl');
  box.innerHTML=CTL.map(c=>'<label>'+c[1]+': <b id="ops-sv-'+c[0]+'"></b><input type="range" id="ops-si-'+c[0]+'" min="'+c[2]+'" max="'+c[3]+'" step="'+c[4]+'" value="'+P[c[0]]+'"></label>').join('')+
    '<label><input type="checkbox" id="ops-si-fb" checked> Fallback to a backup model (answers in '+P.bk+' s)</label><label><button id="ops-si-seed">New random draw</button></label>';
  CTL.forEach(c=>document.getElementById('ops-si-'+c[0]).addEventListener('input',e=>{P[c[0]]=+e.target.value;run()}));
  document.getElementById('ops-si-fb').addEventListener('change',e=>{P.fallback=e.target.checked?1:0;run()});
  document.getElementById('ops-si-seed').addEventListener('click',()=>{P.seed++;run()});
  // deterministic uniform from integers (same provider behaviour for both policies)
  function u(a,b,c){let h=(a*374761393+b*668265263+c*2147483647+P.seed*1274126177)>>>0;h=Math.imul(h^(h>>>13),1274126177)>>>0;h=(h^(h>>>16))>>>0;return h/4294967296}
  function simulate(gw){
    const gap=60/P.rpm,reqs=[];for(let i=0;i<P.n;i++)reqs.push({i,t:i*gap,att:0,prim:0,done:false});
    const Q=reqs.map(r=>({t:r.t,r,k:0}));const win=[];let n429=0;
    const outA=P.out0,outB=P.out0+P.outLen;
    while(Q.length){Q.sort((a,b)=>a.t-b.t);const ev=Q.shift(),r=ev.r,t=ev.t;
      if(ev.backup){r.done=true;r.ok=true;r.by='backup';r.end=t+P.bk;continue}
      r.att++;r.prim++;
      while(win.length&&win[0]<=t-60)win.shift();win.push(t);
      let res;
      if(win.length>P.lim){res={code:429,dur:0.05,ra:2};n429++}
      else if(t>=outA&&t<outB)res={code:503,dur:0.1};
      else if(u(r.i,ev.k,1)<P.err/100)res={code:500,dur:0.2};
      else if(u(r.i,ev.k,2)<P.hang/100)res={code:'hang',dur:20};
      else res={code:200,dur:P.lat*(0.7+0.6*u(r.i,ev.k,3))};
      if(!gw){r.done=true;r.ok=res.code===200||res.code==='hang';r.by=r.ok?'primary':'error';r.end=t+res.dur;r.code=res.code;continue}
      let failAt;
      if(res.code===200||(res.code==='hang'&&res.dur<=P.timeout)){r.done=true;r.ok=true;r.by='primary';r.end=t+res.dur;continue}
      failAt=res.code==='hang'?t+P.timeout:t+res.dur;
      const j=0.75*u(r.i,ev.k,4);
      const wait=res.ra?res.ra+j:Math.min(8,0.5*Math.pow(2,ev.k))+j;
      if(ev.k<P.retries){Q.push({t:failAt+wait,r,k:ev.k+1});continue}
      if(P.fallback){Q.push({t:failAt+wait,r,k:ev.k+1,backup:true});continue}
      r.done=true;r.ok=false;r.by='error';r.end=failAt;r.code=res.code;
    }
    reqs.forEach(r=>r.lat=r.end-r.t);
    return {reqs,n429};
  }
  const pct=(a,p)=>{if(!a.length)return 0;const s=a.slice().sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.floor(p*(s.length-1)+0.5))]};
  function summary(S){const R=S.reqs,ok=R.filter(r=>r.ok);return {ok:ok.length/R.length,bk:R.filter(r=>r.by==='backup').length,err:R.length-ok.length,
    p50:pct(R.map(r=>r.lat),0.5),p95:pct(R.map(r=>r.lat),0.95),att:R.reduce((a,r)=>a+r.prim,0)/R.length,n429:S.n429}}
  function run(){
    CTL.forEach(c=>document.getElementById('ops-sv-'+c[0]).textContent=P[c[0]]+c[5]);
    const A=simulate(false),B=simulate(true),sa=summary(A),sb=summary(B);
    const el=document.getElementById('ops-simsvg');const W=U.width(el),lw=W<480?70:92,pw=W-lw-10,rowH=70,H=2*rowH+44;
    const T=Math.max(...A.reqs.map(r=>r.t),1)+2,maxL=Math.max(25,...A.reqs.map(r=>r.lat),...B.reqs.map(r=>r.lat));
    const x=t=>lw+t/T*pw;let s='';
    const oa=x(P.out0),ob=x(Math.min(T,P.out0+P.outLen));if(P.outLen>0)s+='<rect x="'+oa+'" y="4" width="'+Math.max(1,ob-oa)+'" height="'+(2*rowH+8)+'" fill="var(--c5)" opacity="0.15"/>';
    [['No gateway',A],['Gateway',B]].forEach(([nm,S],k)=>{const y0=8+k*(rowH+4);
      s+='<text x="4" y="'+(y0+16)+'" font-size="11.5" font-weight="600">'+nm+'</text><text x="4" y="'+(y0+31)+'" font-size="10.5" fill="var(--mute)">bar = wait</text>';
      s+='<line x1="'+lw+'" x2="'+(lw+pw)+'" y1="'+(y0+rowH-2)+'" y2="'+(y0+rowH-2)+'" stroke="var(--line)"/>';
      const bw=Math.max(1.5,pw/P.n*0.7);
      S.reqs.forEach(r=>{const h=Math.max(2,(r.lat/maxL)*(rowH-8));const col=r.by==='primary'?'var(--good)':r.by==='backup'?'var(--c6)':'var(--bad)';
        s+='<rect x="'+(x(r.t)-bw/2)+'" y="'+(y0+rowH-2-h)+'" width="'+bw+'" height="'+h+'" fill="'+col+'"><title>request at '+r.t.toFixed(1)+' s: '+r.by+', waited '+r.lat.toFixed(1)+' s, '+r.prim+' attempt(s) at the primary</title></rect>'});
    });
    const step=T>100?20:10;for(let t=0;t<=T;t+=step)s+='<text x="'+x(t)+'" y="'+(H-6)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+t+' s</text>';
    s+='<text x="'+(lw+pw)+'" y="'+(H-20)+'" font-size="10" text-anchor="end" fill="var(--mute)">bar height: 0 to '+maxL.toFixed(0)+' s</text>';
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'">'+s+'</svg>';
    const row=(n,S)=>'<tr><td>'+n+'</td><td class="num">'+(S.ok*100).toFixed(0)+'%</td><td class="num">'+S.bk+'</td><td class="num">'+S.err+'</td><td class="num">'+S.p50.toFixed(1)+' s</td><td class="num">'+S.p95.toFixed(1)+' s</td><td class="num">'+S.att.toFixed(2)+'</td><td class="num">'+S.n429+'</td></tr>';
    document.getElementById('ops-simtab').innerHTML='<tr><th>Policy</th><th class="num">Answered</th><th class="num">By backup</th><th class="num">Errors to user</th><th class="num">Median wait</th><th class="num">95th pct wait</th><th class="num">Attempts at primary per request</th><th class="num">429s</th></tr>'+row('No gateway',sa)+row('Gateway',sb);
    // reproduce the recorded hang run with the same formula
    const N=window.OPS_GWNUM;if(N){const pred=3*8+(0.5+1+2)+3*0.375+(window.OPS.gw.gw_timeout.bk[0].t1-window.OPS.gw.gw_timeout.bk[0].t0);
      document.getElementById('ops-simrep').innerHTML='Check against a recording: for the hanging provider with an 8 s timeout, 2 retries and a fallback, the policy gives 3 &times; 8 s + (0.5 + 1 + 2) s of backoff + 3 &times; 0.375 s of mean jitter + the backup\'s recorded '+(window.OPS.gw.gw_timeout.bk[0].t1-window.OPS.gw.gw_timeout.bk[0].t0).toFixed(2)+' s = '+pred.toFixed(2)+' s; the recorded request took '+N.hang.toFixed(2)+' s (difference '+(pred-N.hang).toFixed(2)+' s, the jitter actually drawn). Try: raise retries during the outage and watch the 429 count grow, because every retry also counts against the provider\'s rate limit.'}
  }
  run();U.onRender(run);
})();
