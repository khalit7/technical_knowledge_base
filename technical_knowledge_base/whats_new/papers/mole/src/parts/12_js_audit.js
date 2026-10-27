// ---- The daily audit: the paper's two count-based monitors on the released GPT-5.3 single-day test days ----
// Same arithmetic, in the same order, as monitors.py (Appendix F.1 to F.3); check_page.mjs compares the results with
// Python's (AUDIT.ref). Rows keep the corpus order (by account name), so ties rank exactly as in Python's stable sort.
const AUD=(function(){const D=window.AUDIT,NF=20;
  const days=D.rows.map(s=>s.split(';').map(t=>{const f=t.split(',').map(x=>x?parseInt(x,36):0);return {a:f[0],n:f[1],raw:f.slice(2,2+NF)}}));
  const vec=r=>{const n=Math.max(r.n,1),v=r.raw.map(x=>x/n);v[5]=r.raw[3]?r.raw[5]/r.raw[3]:0;return v};
  days.forEach((rs,di)=>rs.forEach(r=>{r.v=vec(r);const k=D.accts[r.a]+'|'+D.days[di],p=D.pos[k];r.lab=p?p[1]:'';r.th=p?p[0]:'';r.pos=r.lab==='executed'}));
  const NPOS=days.reduce((s,rs)=>s+rs.filter(r=>r.pos).length,0);
  const prof=(mon,a)=>{if(mon==='z')return [D.gmed,D.gsc];const g=D.groups[D.info[a][0]],p=D.prof[g];return p?p:[D.gmed,D.gsc]};
  function devs(v,m,s){const d=new Array(NF);for(let j=0;j<NF;j++)d[j]=Math.min(Math.abs(v[j]-m[j])/s[j],8);return d}
  function score(r,mon,use){const [m,s]=prof(mon,r.a);let t=0;for(const j of use)t+=Math.min(Math.abs(r.v[j]-m[j])/s[j],8);return use.length?t/use.length:0}
  // rank every day; returns per day an array of {r, s, rank}
  function rankAll(mon,use){return days.map(rs=>{const it=rs.map((r,i)=>({r,s:score(r,mon,use),i}));it.sort((x,y)=>y.s-x.s||x.i-y.i);it.forEach((x,k)=>x.rank=k+1);return it})}
  function recall(R,K){let c=0;R.forEach(it=>{for(let k=0;k<Math.min(K,it.length);k++)if(it[k].r.pos)c++});return c}
  return {D,days,NPOS,rankAll,recall,devs,prof,score,NF}})();

(function(){const D=AUD.D,NF=AUD.NF;
  const TH={'01_ip_theft':'IP theft','02_credential_exfil':'Credential exfil.','03_priv_esc':'Privilege escalation','04_fraud':'Fraud','05_sabotage':'Sabotage','06_weight_exfil':'Weight exfil.','07_eval_manip':'Evaluation manip.','08_data_poisoning':'Data poisoning','09_release_manip':'Release manip.','10_safety_sabotage':'Safety sabotage'};
  const THC={'01_ip_theft':'var(--c1)','02_credential_exfil':'var(--c6)','03_priv_esc':'var(--c4)','04_fraud':'var(--c5)','05_sabotage':'var(--c2)','06_weight_exfil':'var(--c3)','07_eval_manip':'var(--c4)','08_data_poisoning':'var(--bad)','09_release_manip':'var(--c1)','10_safety_sabotage':'var(--c6)'};
  const FN=D.features.map(f=>f.replace(/_count$/,'').replace(/_/g,' '));
  const PRE={all:[...Array(NF).keys()],egress:[5,14,15,17],noTime:[...Array(NF).keys()].filter(j=>j!==2),none:[]};
  const PRINTED=[['Claude Opus 4.7',24,'semantic'],['GPT-5.5',23,'semantic'],['GPT-4.1',10,'semantic'],['FACADE',10,'classical'],['peer-fit',8,'classical'],['z-score',7,'classical']];
  const st={mon:'z',K:10,use:PRE.all.slice()};let R=null,Rother=null,anim=null;
  function recompute(){R=AUD.rankAll(st.mon,st.use);Rother=AUD.rankAll(st.mon==='z'?'peer':'z',PRE.all)}
  recompute();
  window.AUD_STATE=()=>({mon:st.mon,K:st.K,use:st.use.slice(),caught:AUD.recall(R,st.K),curve:Array.from({length:20},(_,i)=>AUD.recall(R,i+1))});
  window.AUD_SET=(o)=>{if(o.mon)st.mon=o.mon;if(o.K)st.K=o.K;if(o.use)st.use=o.use.slice();recompute();refresh()};
  const steps=D.days.map((d,i)=>({t:d+' (test day '+(i+1)+' of 15)',c:''}));
  function capFor(k){const it=R[k],pos=it.filter(x=>x.r.pos),c=pos.filter(x=>x.rank<=st.K);
    if(!pos.length)return it.length+' accounts active; no completed harm this day, so the review of the top '+st.K+' finds nothing to catch.';
    return it.length+' accounts active; '+pos.length+' completed harm'+(pos.length>1?'s':'')+' ('+pos.map(x=>D.accts[x.r.a]+', '+TH[x.r.th]+', rank '+x.rank).join('; ')+'). The top '+st.K+' review catches '+c.length+'.'}
  function draw(mode,k,e,w){const it=R[k],n=it.length,H=200,pl=34,pr=8,pt=26,pb=34,W=w,iw=W-pl-pr,bw=iw/n,ih=H-pt-pb;
    const mx=Math.max(2.4,...R.map(d=>d[0].s));const y=v=>pt+ih*(1-Math.min(v,mx)/mx);let s='';
    s+=rc(pl,pt,bw*st.K,ih,'var(--acc2)',{r:0});
    s+=tx(pl+4,pt-8,'reviewed: top '+st.K,{fs:11,c:'var(--acc)'});
    [0,1,2].forEach(v=>{if(v<=mx){s+=ln2(pl,y(v),W-pr,y(v),'var(--line)');s+=tx(pl-5,y(v)+4,v,{fs:11,a:'end',c:'var(--mute)'})}});
    it.forEach((x,i)=>{const h=(ih*(Math.min(x.s,mx)/mx))*(RM?1:e),X=pl+i*bw;const c=x.r.pos?(x.rank<=st.K?'var(--good)':'var(--bad)'):'var(--dim)';
      s+='<rect x="'+X.toFixed(1)+'" y="'+(pt+ih-h).toFixed(1)+'" width="'+Math.max(.6,bw-.4).toFixed(2)+'" height="'+h.toFixed(1)+'" fill="'+c+'"><title>'+D.accts[x.r.a]+': score '+x.s.toFixed(3)+', rank '+x.rank+(x.r.pos?', completed '+TH[x.r.th]:'')+'</title></rect>'});
    const pos=it.filter(x=>x.r.pos);const pts=pos.map(x=>({x:pl+(x.rank-.5)*bw,y:pt+ih-(ih*(Math.min(x.s,mx)/mx))*(RM?1:e)-6,t:TH[x.r.th]+(x.rank<=st.K?' ✓':' ✗'),fs:11}));
    pos.forEach((x,i)=>{s+='<circle cx="'+pts[i].x.toFixed(1)+'" cy="'+(pts[i].y+1).toFixed(1)+'" r="3.5" fill="'+(x.rank<=st.K?'var(--good)':'var(--bad)')+'"/>'});
    placeLabels(pts,W,H-pb+2).forEach(p=>{s+=tx(p.lx,p.ly,p.t,{fs:11,a:p.la})});
    s+=tx(pl,H-pb+15,'1',{fs:11,c:'var(--mute)'})+tx(W-pr,H-pb+15,n,{fs:11,a:'end',c:'var(--mute)'})+tx(pl+iw/2,H-pb+15,'rank that day (most suspicious left)',{fs:11,a:'middle',c:'var(--mute)'});
    s+=tx(4,pt+ih/2,'score',{fs:11,c:'var(--mute)'});
    const lg=legend([['caught',"var(--good)"],['missed completed harm','var(--bad)'],['routine','var(--dim)']],pl,H-4,iw);s+=lg.s;
    return svgW(W,H+lg.h-12,s,'Accounts ranked by suspicion on '+D.days[k])}
  function counters(mode,k,e){let cs=0,ps=0;for(let d=0;d<=k;d++){R[d].forEach(x=>{if(x.r.pos){ps++;if(x.rank<=st.K)cs++}})}
    const tot=AUD.recall(R,st.K);
    return stat('Caught so far','<b>'+cs+'</b> of '+ps,'completed harms in days 1 to '+(k+1))+stat('R@'+st.K+'/day, all 15 days',(tot/AUD.NPOS).toFixed(3),tot+' of '+AUD.NPOS)+stat('Paper, K = 10','24 · 23 · 10','Opus 4.7 · GPT-5.5 · FACADE, of 45 (Figure 4)')}
  function refresh(){$('audKv').textContent=st.K;$('audFn').textContent=st.use.length+' of 20';
    steps.forEach((S,i)=>S.c=capFor(i));
    if(anim){anim.st.lk=-1;anim.draw()}
    const c10=AUD.recall(R,10),ref=D.ref[st.mon].R[9],isDef=st.use.length===NF;
    $('audRep').innerHTML=isDef?('With all 20 features this '+(st.mon==='z'?'robust z-score':'peer-fit')+' catches <b>'+c10+' of '+AUD.NPOS+'</b> at K = 10 (R@10/day '+(c10/AUD.NPOS).toFixed(3)+'): the paper prints '+(st.mon==='z'?'0.156':'0.178')+' ('+(st.mon==='z'?'Table 20, Figure 4':'Figure 4')+'). Reproduced independently from the released audit events'+(c10===ref?', and identical to this page\'s Python run.':'; <b>differs from the Python run ('+ref+')</b>.')):('Custom feature set: '+c10+' of '+AUD.NPOS+' at K = 10.');
    drawCurve();thTable();missList()}
  // feature chips
  $('audChips').innerHTML=FN.map((f,j)=>'<button data-j="'+j+'" class="on" aria-pressed="true">'+f+'</button>').join('');
  const chips=[...$('audChips').querySelectorAll('button')],pres=[...$('audPre').querySelectorAll('button')];
  const syncChips=()=>chips.forEach(b=>{const on=st.use.includes(+b.dataset.j);b.classList.toggle('on',on);b.setAttribute('aria-pressed',on?'true':'false')});
  chips.forEach(b=>b.addEventListener('click',()=>{const j=+b.dataset.j;st.use=st.use.includes(j)?st.use.filter(x=>x!==j):st.use.concat(j).sort((a,b)=>a-b);pres.forEach(p=>p.classList.remove('on'));syncChips();recompute();refresh()}));
  pres.forEach(b=>b.addEventListener('click',()=>{st.use=PRE[b.dataset.p].slice();pres.forEach(p=>p.classList.toggle('on',p===b));syncChips();recompute();refresh()}));
  $('audK').addEventListener('input',e=>{st.K=+e.target.value;refresh()});
  segBind('audM',m=>{st.mon=m;recompute();refresh()});
  // budget curve
  function drawCurve(){fit($('rkPlot'),w=>{const H=240,pl=40,pr=12,pt=14,pb=34,iw=w-pl-pr,ih=H-pt-pb;const x=k=>pl+iw*(k-1)/19,y=v=>pt+ih*(1-v);let s='';
    [0,.25,.5,.75].forEach(v=>{s+=ln2(pl,y(v),w-pr,y(v),'var(--line)')+tx(pl-5,y(v)+4,v.toFixed(2),{fs:11,a:'end',c:'var(--mute)'})});
    [1,5,10,15,20].forEach(k=>{s+=tx(x(k),H-pb+15,k,{fs:11,a:'middle',c:'var(--mute)'})});s+=tx(pl+iw/2,H-4,'review budget K (accounts a day)',{fs:11,a:'middle',c:'var(--mute)'});
    s+=ln2(x(10),pt,x(10),H-pb,'var(--mute)',{da:'2 3'});
    const rnd=k=>{let t=0;AUD.days.forEach(rs=>{const np=rs.filter(r=>r.pos).length;t+=np*Math.min(k,rs.length)/rs.length});return t/AUD.NPOS};
    const line=(f,c,da,sw)=>{let d='';for(let k=1;k<=20;k++)d+=(k>1?'L':'M')+x(k).toFixed(1)+','+y(f(k)).toFixed(1);return '<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="'+(sw||2)+'"'+(da?' stroke-dasharray="'+da+'"':'')+'/>'};
    s+=line(rnd,'var(--dim)','',1.5);
    s+=line(k=>AUD.recall(Rother,k)/AUD.NPOS,'var(--c2)','5 3');
    s+=line(k=>AUD.recall(R,k)/AUD.NPOS,'var(--c1)','',2.4);
    const grp={};PRINTED.forEach(([n,c,kind])=>{(grp[c]=grp[c]||{n:[],kind}).n.push(n)});const pts=Object.entries(grp).map(([c,g])=>({x:x(10),y:y(c/45),t:g.n.join(', ')+' '+c+'/45',fs:11,kind:g.kind}));
    pts.forEach(p=>{s+='<circle cx="'+p.x+'" cy="'+p.y+'" r="3.5" fill="'+(p.kind==='semantic'?'var(--c4)':'var(--c5)')+'"/>'});
    placeLabels(pts,w,H-pb).forEach(p=>{s+=tx(p.lx,p.ly,p.t,{fs:11,a:p.la})});
    const nm=st.mon==='z'?'z-score':'peer-fit',ot=st.mon==='z'?'peer-fit':'z-score';
    const lg=legend([[nm+(st.use.length<NF?' (your features)':''),'var(--c1)'],[ot+' (all 20)','var(--c2)','5 3'],['random queue','var(--dim)']],pl,H+12,iw);
    const ba=Array.from({length:10},(_,i)=>AUD.recall(R,i+1)).reduce((a,b)=>a+b,0)/10/AUD.NPOS;
    s+=lg.s;s+=tx(w-pr,pt+12,'budget-AUC '+ba.toFixed(3),{fs:12,a:'end',w:600});
    $('rkPlot').innerHTML=svgW(w,H+lg.h+4,s,'Recall at each review budget')})}
  function thTable(){const f6=PAPER.tables.F6,cols=f6.cols;const map={};f6.rows.forEach(r=>map[r[0]]=r);const by={};
    R.forEach(it=>it.forEach(x=>{if(x.r.pos){const t=TH[x.r.th];by[t]=by[t]||[0,0];by[t][1]++;if(x.rank<=st.K)by[t][0]++}}));
    let h='<tr><th>threat</th><th class="num">here, K = '+st.K+'</th>'+cols.slice(0,6).map(c=>'<th class="num">'+c+'</th>').join('')+'</tr>';
    f6.rows.filter(r=>r[0]!=='ALL').forEach(r=>{const b=by[r[0]]||[0,0];h+='<tr><td>'+r[0]+'</td><td class="num"><b>'+b[0]+'/'+b[1]+'</b></td>'+r.slice(1,7).map(v=>'<td class="num" style="'+(+v<=.43?'color:var(--bad)':'')+'">'+v+'</td>').join('')+'</tr>'});
    h+='<tr class="basec"><td>all</td><td class="num"><b>'+AUD.recall(R,st.K)+'/'+AUD.NPOS+'</b></td>'+map.ALL.slice(1,7).map(v=>'<td class="num">'+v+'</td>').join('')+'</tr>';$('thTab').innerHTML=h}
  function missList(){const rows=[];R.forEach((it,di)=>it.forEach(x=>{if(x.r.pos){const [m,s]=AUD.prof(st.mon,x.r.a);const d=AUD.devs(x.r.v,m,s);const top=st.use.slice().sort((a,b)=>d[b]-d[a]||a-b).slice(0,3).filter(j=>d[j]>0);
      rows.push({di,x,top:top.map(j=>FN[j]+' '+d[j].toFixed(1)).join(', ')})}}));
    rows.sort((a,b)=>a.x.rank-b.x.rank);
    $('msList').innerHTML=rows.map(o=>{const a=D.accts[o.x.r.a],ho=D.info[o.x.r.a][1],c=o.x.rank<=st.K;return '<button class="msr" data-d="'+o.di+'"><span class="rk" style="color:'+(c?'var(--good)':'var(--bad)')+'">'+o.x.rank+'</span><span>'+a+(ho?' ◇':'')+' · '+TH[o.x.r.th]+' ('+D.info[o.x.r.a][3].replace('s0','non-stealthy').replace('s1','stealthy')+') · '+D.days[o.di].slice(5)+'<br><span class="mute small">'+(o.top||'no deviation on the chosen features')+'</span></span></button>'}).join('');
    $('msList').querySelectorAll('.msr').forEach(b=>b.addEventListener('click',()=>{const d=+b.dataset.d;anim.st.k=d;anim.st.t=1;anim.st.play=false;anim.draw();$('aud').scrollIntoView({block:'start'})}))}
  onTab('t-run',()=>{if(!anim){anim=makeAnim({id:'aud',modes:{z:steps,peer:steps},mode:'z',draw:(m,k,e,w)=>draw(m,k,e,w),counters,dur:2600})}refresh()});
})();
