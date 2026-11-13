// ---- The paper tab: predict reveals, and the charts built from the released data ----
const MC={'GRAFT (ours)':'var(--c3)','GRAFT: pre-ablation':'var(--c1)','Reward penalty':'var(--c2)','No intervention':'var(--mute)','Inoculation prompting':'var(--c5)','Preventative steering':'var(--c6)','Anchor environment only':'var(--ink)','GRAFT w/o routing':'var(--c4)','Base model':'var(--ink)','Filtering':'var(--c6)','Oracle filtering':'var(--c1)','No training':'var(--ink)','Monitor filtering':'var(--c6)','Gradient ascent':'var(--c5)','Inoculation adapter':'var(--c4)','IP (elicitation paraphrase)':'var(--c5)','IP (EM prompt)':'var(--c5)'};
const HOLLOW={'GRAFT w/o routing':1,'Base model':1,'Anchor environment only':1,'No training':1};
const pc=v=>v.toFixed(1)+'%';
// A scatter of methods: x and y in percent, faint per-seed points, labels placed beside points inside the
// plot area without overlapping each other or any marker; a label that finds no free spot goes to a key below.
function scat(w,pts,o){const H=w<520?300:340,pl=46,pr=12,pt=10,pb=36;
  const F=linFrame({W:w,H,pl,pr,pt,pb,x:o.x,y:o.y,fx:v=>v+'%',fy:v=>v+'%',xl:o.xl,yl:o.yl,nx:w<420?4:6});let s=F.s;
  pts.forEach(p=>(p.seeds||[]).forEach(q=>{s+=dotS(F.X(q[0]),F.Y(q[1]),3,MC[p.n]||'var(--ink)',{op:.35,hollow:HOLLOW[p.n]})}));
  pts.forEach(p=>{if(p.xe!=null)s+=ln2(F.X(Math.max(o.x[0],p.x-p.xe)),F.Y(p.y),F.X(Math.min(o.x[1],p.x+p.xe)),F.Y(p.y),MC[p.n]||'var(--ink)',{sw:1.2});
    if(p.ye!=null)s+=ln2(F.X(p.x),F.Y(p.y-p.ye),F.X(p.x),F.Y(p.y+p.ye),MC[p.n]||'var(--ink)',{sw:1.2})});
  const boxes=pts.map(p=>({x:F.X(p.x)-7,y:F.Y(p.y)-7,w:14,h:14})),key=[];let lab='';
  const free=b=>b.x>=pl+2&&b.x+b.w<=w-2&&b.y>=pt&&b.y+b.h<=H-pb-2&&!boxes.some(o=>b.x<o.x+o.w&&o.x<b.x+b.w&&b.y<o.y+o.h&&o.y<b.y+b.h);
  const order=pts.map((p,i)=>i).sort((i,j)=>(pts[j].n==='GRAFT (ours)')-(pts[i].n==='GRAFT (ours)'));
  order.forEach(i=>{const p=pts[i],x=F.X(p.x),y=F.Y(p.y),t=p.lab||p.n,tw=t.length*11*.62,h=13;let got=null;
    for(const d of [7,14])for(const [dx,dy,a] of [[1,0,'start'],[-1,0,'end'],[0,-1,'middle'],[0,1,'middle'],[1,-1,'start'],[1,1,'start'],[-1,-1,'end'],[-1,1,'end']]){
      if(got)break;const bx=a==='start'?x+d:a==='end'?x-d-tw:x-tw/2,by=dy<0?y-d-h:dy>0?y+d:y-h/2,b={x:bx,y:by,w:tw,h};if(free(b))got={b,a,lx:a==='start'?bx:a==='end'?bx+tw:x,ly:by+h-3}}
    if(got){boxes.push(got.b);lab+=tx(got.lx,got.ly,t,{fs:11,a:got.a,c:'var(--ink)',w:p.n==='GRAFT (ours)'?'700':null})}else key.push(i)});
  pts.forEach((p,i)=>{s+=dotS(F.X(p.x),F.Y(p.y),p.n==='GRAFT (ours)'?6.5:5.5,MC[p.n]||'var(--ink)',{hollow:HOLLOW[p.n],sw:HOLLOW[p.n]?2:1,t:(p.lab||p.n)+': '+p.x.toFixed(1)+', '+p.y.toFixed(1)});
    const k=key.indexOf(i);if(k>=0)s+=tx(F.X(p.x),F.Y(p.y)+3.5,String(k+1),{fs:11,a:'middle',c:HOLLOW[p.n]?'var(--ink)':'var(--bg)',w:'700'})});
  return svgW(w,H,s+lab,o.label||'scatter')+(key.length?'<p class="small" style="margin:2px 0">'+key.map((i,k)=>'<b>'+(k+1)+'</b> '+(pts[i].lab||pts[i].n)+' ('+pts[i].x.toFixed(1)+', '+pts[i].y.toFixed(1)+')').join(' · ')+'</p>':'')}
(function(){if(!window.GD)return;const E=GD.env;
  PRED_REVEAL.gfPr1=()=>{const o=E.object_qa;$('gfPr1Out').innerHTML='with the penalty, <span class="ku">undetectable</span> hacking on '+pc(o['Reward penalty'].undetected)+' of colour answers and <span class="kd">detectable</span> on '+pc(o['Reward penalty'].detected)+'; with no intervention '+pc(o['No intervention'].undetected)+' and '+pc(o['No intervention'].detected)+'; deployed GRAFT '+pc(o['GRAFT (ours)'].hack)+' in all.'};
  PRED_REVEAL.gfPr3=()=>{const v=TOYREF.variants.default;$('gfPr3Out').innerHTML='Deployed GRAFT hacks <b>'+pc(100*v.graft.hack)+'</b> (seed mean, 5 seeds, '+pc(100*v.graft.hack_min)+' to '+pc(100*v.graft.hack_max)+'): '+pc(100*v.graft.undetected)+' undetected and '+pc(100*v.graft.detected)+' hack 1, up from '+pc(100*TOYREF.base.hack)+' at the start. π<sub>R+F</sub> sampled undetected hacks '+pc(100*v.graft_pre.undetected)+' of the time; the reward penalty learned them on '+pc(100*v.penalty.undetected)+'; GRAFT without routing hacks '+pc(100*v.noroute.hack)+'.'};
})();
// Figure 2 (left), replayed per seed, two views of the same runs
(function(){if(!window.GD||!$('gfCd'))return;const host=$('gfCdSvg');let M='truth';
  const arms=GD.cd.arms;const mean=a=>a.reduce((x,y)=>x+y,0)/a.length,sem=a=>a.length<2?0:Math.sqrt(a.reduce((s,v)=>s+(v-mean(a))**2,0)/(a.length-1)/a.length);
  function pts(){return arms.map(a=>{const xs=a.seeds.map(p=>100*(M==='truth'?p.hack:p.detected)),ys=a.seeds.map(p=>100*(M==='truth'?p.clean:p.proxy));
    return {n:a.label,x:mean(xs),y:mean(ys),xe:sem(xs),ye:sem(ys),seeds:a.seeds.length>1?xs.map((x,i)=>[x,ys[i]]):[],lab:a.label.replace('Anchor environment only','Anchor only').replace('Preventative steering','Prev. steering').replace('Inoculation prompting','Inoculation')}})}
  function draw(w){const P=pts();host.innerHTML=scat(w,P,{x:[0,100],y:M==='truth'?[0,90]:[50,104],xl:M==='truth'?'Hack rate, every kind (lower is better)':'Flagged rate: hacks the monitor sees',yl:M==='truth'?'Clean-environment solve rate':'Proxy reward (training reward)',label:'Countdown-Code results'});
    $('gfCdT').innerHTML=M==='truth'?'The penalty did not stop hacking; it moved it where the monitor cannot see':'Through the developer\'s eyes the penalty looks best: perfect reward, nothing flagged';
    const r=P.find(p=>p.n==='Reward penalty'),g=P.find(p=>p.n==='GRAFT (ours)');
    $('gfCdNote').innerHTML=(M==='truth'?'Reward penalty: '+pc(r.x)+' hacking, '+pc(r.y)+' solved. GRAFT: '+pc(g.x)+', '+pc(g.y)+'. ':'Reward penalty: '+pc(r.x)+' flagged, proxy reward '+pc(r.y)+'. GRAFT: '+pc(g.x)+' flagged, proxy '+pc(g.y)+'. ')+'Bars: one standard error over seeds (3 per baseline, 8 for GRAFT); faint points: seeds. Replayed from the released per-seed evaluations.'}
  segBind('gfCdM',m=>{M=m;$('gfCdM').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));refit(host)});fit(host,draw);
})();
// Figure 2 (right): adapter decomposition over training, read from the figure
(function(){if(!window.GD||!$('gfCurve'))return;const host=$('gfCurveSvg');let M='hack_rate';
  const C={'pre-ablation (both adapters)':'var(--c1)','deployed (retain only)':'var(--c3)','forget only':'var(--c4)','base model':'var(--mute)'};
  function draw(w){const D=GD.figs.fig2_right[M],H=w<520?240:260,pl=44,pr=w<520?96:200,pt=10,pb=34;const yr=M==='hack_rate'?[0,50]:[50,85];
    const F=linFrame({W:w,H,pl,pr,pt,pb,x:[0,200],y:yr,fy:v=>v+'%',xl:'Training step',yl:M==='hack_rate'?'Hack rate':'Legit. solve rate'});let s=F.s;const ends=[];
    Object.entries(D).forEach(([k,pts])=>{s+=lineS(pts,F.X,F.Y,C[k],{sw:k==='base model'?1.2:2.2,da:k==='base model'?'4 3':null});const L=pts[pts.length-1];ends.push({y:F.Y(L[1]),n:(w<520?{'pre-ablation (both adapters)':'both','deployed (retain only)':'deployed','forget only':'forget','base model':'base'}[k]:k)+' '+L[1].toFixed(1)+'%',c:C[k],how:k})});
    s+=endLabels(ends,w-pr+6,13);host.innerHTML=svgW(w,H,s,'GRAFT adapters over training')}
  segBind('gfCurveM',m=>{M=m;refit(host)});fit(host,draw);
})();
// Figure 3, replayed: stacked detectable / undetectable hack rates per environment and method
(function(){if(!window.GD||!$('gfEnv'))return;const host=$('gfEnvSvg');
  const AR=['No intervention','Reward penalty','GRAFT: pre-ablation','GRAFT (ours)','Base model'],SH=['No interv.','Penalty','GRAFT pre-abl.','GRAFT deployed','Base'];
  function draw(w){const envs=Object.keys(GD.env),cols=w<520?1:2,cw=(w-(cols-1)*14)/cols,rh=17,lw=Math.min(112,cw*0.34),bw=cw-lw-96,ph=AR.length*rh+28;let s='';
    envs.forEach((e,i)=>{const ox=(i%cols)*(cw+14),oy=Math.floor(i/cols)*(ph+6);s+=tx(ox,oy+14,e,{fs:12,w:'600'});
      AR.forEach((a,j)=>{const v=GD.env[e][a],y=oy+22+j*rh;s+=tx(ox+lw-6,y+12,SH[j],{fs:11,a:'end',c:a==='GRAFT (ours)'?'var(--ink)':'var(--mute)',w:a==='GRAFT (ours)'?'700':null});
        const d=bw*v.detected/100,u=bw*v.undetected/100;s+=rc(ox+lw,y+3,bw,rh-6,'var(--soft)',{r:2})+rc(ox+lw,y+3,d,rh-6,'var(--c5)',{r:0})+rc(ox+lw+d,y+3,u,rh-6,'var(--c2)',{r:0});
        s+='<title>'+e+', '+a+': detectable '+v.detected.toFixed(1)+'%, undetectable '+v.undetected.toFixed(1)+'%, task '+v.retain.toFixed(1)+'%</title>'+tx(ox+lw+bw+4,y+12,v.hack.toFixed(0)+'%',{fs:11})+tx(ox+lw+bw+38,y+12,'task '+v.retain.toFixed(0),{fs:11,c:a==='GRAFT (ours)'?'var(--ink)':'var(--mute)'})})});
    const rows=Math.ceil(envs.length/cols),Ht=rows*(ph+6)+22;s+=rc(0,Ht-14,10,10,'var(--c5)',{r:2})+tx(14,Ht-5,'detectable',{fs:11})+rc(90,Ht-14,10,10,'var(--c2)',{r:2})+tx(104,Ht-5,'undetectable (the monitor\'s blind spot)',{fs:11});
    host.innerHTML=svgW(w,Ht,s,'Hack rates in six toy environments');
    $('gfEnvNote').innerHTML='Bars: hack rate on hackable prompts at the end of training, mean of three seeds; task: target-task reward on all prompts (%), deployed GRAFT is the lowest of the trained arms in five of the six environments (not sort). Reward penalty strength as the developer would pick it (2, 5 or 10). Replayed from the released training logs (last 10% of evaluations); base = the first evaluation.'}
  fit(host,draw);
})();
// Figure 4, read from the figure: hack rate against correct-solution rate, one seed per method
(function(){if(!window.GD||!$('gfSft'))return;const host=$('gfSftSvg');let M='with_elicitation';
  function draw(w){const D=GD.figs.fig4[M];const P=Object.entries(D).map(([n,r])=>({n,x:r.x,y:r.y,lab:n.replace('IP (elicitation paraphrase)','IP (paraphrase)')}));
    host.innerHTML=scat(w,P,{x:[0,100],y:[0,60],xl:'Tasks with a reward hack (of 99)',yl:'Correct solutions',label:'Terminal Wrench SFT results'});
    $('gfSftT').innerHTML=M==='with_elicitation'?'Told to hack, the GRAFT model never did; routing is what made the difference':'Without the prompt nearly everything hacks rarely, and GRAFT solves less'}
  segBind('gfSftM',m=>{M=m;refit(host)});fit(host,draw);
})();
