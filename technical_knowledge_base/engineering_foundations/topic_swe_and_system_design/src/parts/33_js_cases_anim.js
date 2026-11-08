// ---- Case files (t-cases): flagship before/after animation, AWS EC2 DWFM congestive collapse (20 Oct 2025). ----
// Illustrative model (sizes are ours; mechanism and times are AWS's). Same model as src/cases/recompute.py.
(function(){
  const host=document.getElementById('cf-an-svg');if(!host||!window.RD)return;
  const N=48,C=4,T=3,L=C*T;
  // one step = {t, drop[] ('lease'|'queue'|'out'), wasted (Set this tick), line [{d,doom}], leased, queue, wasted total, done, outside}
  function snap(t,q,leased,outside,wastedNow,tot){
    const drop=[];for(let d=0;d<N;d++)drop.push(leased.has(d)?'lease':outside.has(d)?'out':'queue');
    const line=q.map((x,p)=>({d:x.d,doom:(t+Math.floor(p/C)+1)-x.e>=T}));
    return {t,drop,wasted:new Set(wastedNow),line,leased:leased.size,queue:q.length,wastedTot:tot.w,done:tot.d,outside:outside.size};
  }
  function before(ticks){
    let q=[];for(let d=0;d<N;d++)q.push({d,e:1});
    const leased=new Set(),out=new Set(),tot={w:0,d:0},S=[snap(0,q,leased,out,[],tot)];
    for(let t=1;t<=ticks;t++){const served=q.slice(0,C);q=q.slice(C);const w=[];
      served.forEach(x=>{tot.d++;if(t-x.e<T)leased.add(x.d);else{tot.w++;w.push(x.d);q.push({d:x.d,e:t})}});
      S.push(snap(t,q,leased,out,w,tot))}
    return S;
  }
  function after(b){
    const last=b[b.length-1];const leased=new Set(),out=new Set();last.drop.forEach((s,d)=>{if(s==='lease')leased.add(d)});
    const tot={w:last.wastedTot,d:last.done};
    // step 0: the collapsed line, as Before left it
    const q0=last.line.map((x,i)=>({d:x.d,e:-99}));
    const S=[Object.assign(snap(0,q0,leased,out,[],tot),{line:last.line})];
    for(let d=0;d<N;d++)if(!leased.has(d))out.add(d);
    let q=[];S.push(snap(1,q,leased,out,[],tot));
    let t=1;
    while(leased.size<N){t++;
      const wait=[...out].sort((a,b)=>a-b);const adm=wait.slice(0,Math.max(0,L-q.length));
      adm.forEach(d=>{out.delete(d);q.push({d,e:t})});
      const served=q.slice(0,C);q=q.slice(C);const w=[];
      served.forEach(x=>{tot.d++;if(t-x.e<T)leased.add(x.d);else{tot.w++;w.push(x.d);q.push({d:x.d,e:t})}});
      S.push(snap(t,q,leased,out,w,tot));if(t>60)break}
    return S;
  }
  const B=before(16),A=after(B);
  window.CF_SIM={N,C,T,L,before:B.map(s=>({t:s.t,leased:s.leased,queue:s.queue,wasted:s.wastedTot,done:s.done,outside:s.outside})),
    after:A.map(s=>({t:s.t,leased:s.leased,queue:s.queue,wasted:s.wastedTot,done:s.done,outside:s.outside}))};

  // the step lists on the left (sx-cf-before, sx-cf-after) explain the replay in stretches (rollout rule 3a): G maps each frame to its item
  const G={before:[0,1,1,1,2,3,3,3,3,3,3,3,3,4,4,4,5],after:[0,1,2,2,2,2,2,2,2,2,3]};
  window.CF_GROUPS=G;
  let mode='before';
  const seq=()=>mode==='before'?B:A;
  function draw(i){
    const S=seq(),s=S[Math.min(i,S.length-1)];
    const W=Math.max(280,Math.min(860,RD.width(host)));
    const cols=W>=560?24:12,gp=3,sz=Math.min(20,Math.floor((W-(cols-1)*gp)/cols)),rows=Math.ceil(N/cols);
    let y=14,svg=RD.t(0,y-2,'Servers (48)',{fs:11,fill:'var(--mute)'});
    y+=4;
    for(let d=0;d<N;d++){const r=Math.floor(d/cols),c=d%cols,x=c*(sz+gp),yy=y+r*(sz+gp),st=s.drop[d];
      const fill=st==='lease'?'var(--good)':st==='out'?'var(--dim)':'var(--acc)';
      svg+='<rect x="'+x+'" y="'+yy+'" width="'+sz+'" height="'+sz+'" rx="3" fill="'+fill+'"'+(s.wasted.has(d)?' stroke="var(--bad)" stroke-width="3"':'')+'></rect>'}
    y+=rows*(sz+gp)+18;
    // the line
    const qs=Math.max(4,Math.min(14,Math.floor((W-2)/N)-1)),qg=1;
    svg+=RD.t(0,y-4,'The waiting line (front on the left)',{fs:11,fill:'var(--mute)'});
    for(let p=0;p<N;p++){const x=p*(qs+qg),it=s.line[p];
      svg+='<rect x="'+x+'" y="'+y+'" width="'+qs+'" height="'+(qs+6)+'" rx="2" fill="'+(it?(it.doom?'var(--bad)':'var(--acc)'):'var(--soft)')+'" stroke="var(--line)" stroke-width=".6"></rect>'}
    const lx=L*(qs+qg)-qg/2;
    svg+='<line x1="'+lx+'" x2="'+lx+'" y1="'+(y-2)+'" y2="'+(y+qs+12)+'" stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="3 2"></line>';
    svg+=RD.t(Math.min(lx+4,W-210),y+qs+22,'12 places: the most that can finish in time',{fs:10.5,fill:'var(--ink)'});
    y+=qs+50;
    // leases over ticks, both modes on one axis
    const ch=96,x0=26,x1=W-6,tmax=(B.length-1)+(A.length-1),sx=t=>x0+(x1-x0)*t/tmax,sy=v=>y+ch-ch*v/N;
    svg+=RD.t(0,y-6,W<520?'Leased servers, tick by tick':'Servers with a lease, tick by tick (Before, then After from the restart)',{fs:11,fill:'var(--mute)'});
    [0,24,48].forEach(v=>{svg+='<line x1="'+x0+'" x2="'+x1+'" y1="'+sy(v)+'" y2="'+sy(v)+'" stroke="var(--line)"></line>'+RD.t(x0-4,sy(v)+4,v,{fs:10,a:'end',fill:'var(--mute)'})});
    const pb=B.map((b,k)=>sx(k).toFixed(1)+','+sy(b.leased).toFixed(1)).join(' ');
    const pa=A.map((a,k)=>sx(B.length-1+k).toFixed(1)+','+sy(a.leased).toFixed(1)).join(' ');
    svg+='<polyline points="'+pb+'" fill="none" stroke="var(--bad)" stroke-width="'+(mode==='before'?2.5:1.2)+'" opacity="'+(mode==='before'?1:.45)+'"></polyline>';
    svg+='<polyline points="'+pa+'" fill="none" stroke="var(--good)" stroke-width="'+(mode==='after'?2.5:1.2)+'" opacity="'+(mode==='after'?1:.35)+'" stroke-dasharray="'+(mode==='after'?'':'4 3')+'"></polyline>';
    const cx=mode==='before'?sx(i):sx(B.length-1+i),cy=sy(s.leased);
    svg+='<line x1="'+cx+'" x2="'+cx+'" y1="'+y+'" y2="'+(y+ch)+'" stroke="var(--ink)" stroke-width="1" opacity=".5"></line><circle cx="'+cx+'" cy="'+cy+'" r="4.5" fill="var(--ink)"></circle>';
    svg+=RD.t(sx(B.length-1),y+ch+14,'restart',{fs:10,a:'middle',fill:'var(--mute)'});
    y+=ch+20;
    host.innerHTML=RD.svg(W,y,svg,'Animation of servers, the waiting line and leases per tick');
    document.getElementById('cf-an-stats').innerHTML=
      RD.stat('Step',(mode==='before'?'tick '+s.t:(i===0?'collapsed':i===1?'restart':'tick '+(i-1))),mode==='before'?'of 16':'after the restart')+
      RD.stat('Leased',s.leased+' / '+N,'servers that can host machines')+
      RD.stat('In line',s.queue,'attempts waiting')+
      RD.stat('Wasted',s.wastedTot,'attempts that timed out')+
      RD.stat('Work done',s.done,'attempts the worker finished');
    const LS=document.getElementById('sx-cf-'+mode),g=G[mode][i];[...LS.children].forEach((li,j)=>{li.classList.toggle('on',j===g);li.classList.toggle('done',j<g);if(j===g)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current')});
  }
  const an=RD.anim({card:'cf-an',ctl:'cf-an-ctl',n:B.length,draw:draw,ms:1500,label:'Animation step'});
  // a click on an item jumps to the first frame of its stretch (and, like any control, stops the autoplay)
  ['before','after'].forEach(m=>[...document.getElementById('sx-cf-'+m).children].forEach((li,j)=>{li.tabIndex=0;li.setAttribute('role','button');
    const go=()=>an.go(G[m].indexOf(j));li.onclick=go;li.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}}}));
  RD.seg(document.getElementById('cf-an-mode'),m=>{mode=m;['before','after'].forEach(x=>{document.getElementById('sx-cf-'+x).hidden=x!==m});an.reset(seq().length)});
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-cases']=window.TAB_RENDER['t-cases']||[]).push(()=>an.redraw());
  let rt=0;addEventListener('resize',()=>{const r=document.getElementById('t-cases');if(!r||r.hidden)return;clearTimeout(rt);rt=setTimeout(()=>an.redraw(),80)});
})();
