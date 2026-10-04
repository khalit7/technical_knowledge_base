// ---- Estimator lab, part d: experiment 4, cliff walking (Example 6.6), SARSA against Q-learning side by side.
(function(){
'use strict';
const U=window.LBU;if(!U)return;const{$,E}=U,MI='−';
const sec=$('lb-cl'),NM={sarsa:'SARSA',q:'Q-learning',esarsa:'Expected SARSA'},EP=500;
const S={a:'sarsa',b:'q',eps:0.1,al:0.5,seed:1,runs:100,sm:10,ra:null,rb:null,res:{},on:{}};
// position in the replay: episode e (0-based) and step k within it; k = -1 means "the episode is complete, show the Q table after it"
function rec(){const c={eps:S.eps,alpha:S.al,episodes:EP};S.ra=E.clRun(S.a,S.seed,0,c,true);S.rb=E.clRun(S.b,S.seed,0,c,true)}
const P={e:0,k:0};// decoded from the transport's frame index
function len(r,e){return r.paths[e].length-1}
function maxK(e){return Math.max(len(S.ra,e),len(S.rb,e))}
// frame index <-> (e, k): frames are counted cumulatively so the scrubber can move by episode
function qAfter(r,e){return e+1<EP?r.Qs[e+1]:r.Q}
function grid(el,r,w){const W=Math.max(300,Math.round(el.clientWidth||320)),c=W/12,H=c*4;let s='';const e=P.e,k=P.k,path=r.paths[e],kk=k<0?path.length-1:Math.min(k,path.length-1),Q=k<0||kk===path.length-1?qAfter(r,e):r.Qs[e];
  for(let st=0;st<48;st++){const rr=(st/12)|0,cc=st%12,x=cc*c,y=rr*c;
    if(E.clCliff(st)){s+='<rect x="'+x+'" y="'+y+'" width="'+c+'" height="'+c+'" fill="var(--bad)" fill-opacity=".22"/>';continue}
    let b=-Infinity,ba=-1,nt=0;for(let a=0;a<4;a++){const q=Q[st*4+a];if(q>b){b=q;ba=a;nt=1}else if(q===b)nt++}
    if(st!==E.CG)s+='<rect x="'+x+'" y="'+y+'" width="'+c+'" height="'+c+'" fill="var(--acc)" fill-opacity="'+Math.min(0.6,0.6*Math.max(0,-b)/25).toFixed(3)+'"/>';
    if(st!==E.CG&&nt===1){const d=E.GA[ba],cx=x+c/2,cy=y+c/2,L=c*0.32,l2=c*0.05,px=-d[0]*c*0.13,py=d[1]*c*0.13,ax=cx+d[1]*L,ay=cy+d[0]*L,bx=cx-d[1]*l2,by=cy-d[0]*l2;
      s+='<path d="M'+ax.toFixed(1)+' '+ay.toFixed(1)+'L'+(bx+px).toFixed(1)+' '+(by+py).toFixed(1)+'L'+(bx-px).toFixed(1)+' '+(by-py).toFixed(1)+'Z" fill="var(--mute)" opacity=".75"/>'}}
  for(let i=0;i<=12;i++)s+='<line x1="'+(i*c)+'" x2="'+(i*c)+'" y1="0" y2="'+H+'" stroke="var(--line)"/>';for(let i=0;i<=4;i++)s+='<line y1="'+(i*c)+'" y2="'+(i*c)+'" x1="0" x2="'+W+'" stroke="var(--line)"/>';
  const fz=Math.max(9,Math.min(13,c*0.42));s+='<text x="'+(c/2)+'" y="'+(3*c+c*0.66)+'" font-size="'+fz+'" text-anchor="middle" font-weight="700">S</text><text x="'+(11*c+c/2)+'" y="'+(3*c+c*0.66)+'" font-size="'+fz+'" text-anchor="middle" font-weight="700">G</text>';
  s+='<text x="'+(6*c)+'" y="'+(3*c+c*0.64)+'" font-size="'+fz+'" text-anchor="middle" fill="var(--bad)" font-weight="600">The Cliff</text>';
  // this episode's trail; a fall shows as a cross on the cliff cell
  const cen=st=>[(st%12)*c+c/2,((st/12)|0)*c+c/2];let d='',pen=false;
  for(let i=0;i<=kk;i++){const st=path[i],p=cen(st);if(E.clCliff(st)){s+='<path d="M'+(p[0]-c*0.22)+' '+(p[1]-c*0.22)+'l'+(c*0.44)+' '+(c*0.44)+'m0 '+(-c*0.44)+'l'+(-c*0.44)+' '+(c*0.44)+'" stroke="var(--bad)" stroke-width="2"/>';if(pen)d+='L'+p[0].toFixed(1)+' '+p[1].toFixed(1);pen=false;continue}
    d+=(pen?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1);pen=true}
  s+='<path d="'+d+'" fill="none" stroke="'+(w?'var(--c2)':'var(--c1)')+'" stroke-width="2" stroke-opacity=".75" stroke-linejoin="round"/>';
  const ag=cen(path[kk]);s+='<circle cx="'+ag[0].toFixed(1)+'" cy="'+ag[1].toFixed(1)+'" r="'+(c*0.2).toFixed(1)+'" fill="'+(w?'var(--c2)':'var(--c1)')+'" stroke="var(--bg)" stroke-width="1.5"/>';
  el.innerHTML='<svg viewBox="-1 -1 '+(W+2)+' '+(H+2)+'" width="'+W+'" height="'+(H+2)+'" role="img" aria-label="Cliff gridworld">'+s+'</svg>';
  // status
  let G=0,falls=0;for(let i=1;i<=kk;i++){if(E.clCliff(path[i])){G+=-100;falls++}else if(!(i>0&&E.clCliff(path[i-1])))G+=-1}
  const done=kk===path.length-1,last=r.ret.slice(Math.max(0,e-9),e+1),gp=E.clGreedyPath(Q);
  return 'episode '+(e+1)+' · '+(done?'finished: return <b>'+U.f(r.ret[e],0)+'</b>':'step '+kk+', return so far '+U.f(G,0))+' · falls '+falls+'<br>mean return, last '+last.length+' episodes: '+U.f(last.reduce((a,b)=>a+b,0)/last.length,1)+' · greedy path: '+(gp.len>0?'<b>'+gp.len+' steps</b>':'none yet (loops or falls)')}
function draw(){$('lb-cl-sa').innerHTML=grid($('lb-cl-va'),S.ra,0);$('lb-cl-sb').innerHTML=grid($('lb-cl-vb'),S.rb,1);
  const qa=P.k<0?qAfter(S.ra,P.e):S.ra.Qs[P.e],qb=P.k<0?qAfter(S.rb,P.e):S.rb.Qs[P.e],ga=E.clGreedyPath(qa),gb=E.clGreedyPath(qb);let t;
  if(P.e<20)t='Early on both wander: every Q-value starts at 0, so untried moves look best and the first episodes take hundreds of steps, with many falls.';
  else{const desc=(g,nm)=>g.len===13?nm+'\'s greedy path runs along the cliff edge (13 steps, the shortest)':g.len>13?nm+'\'s greedy path keeps away from the edge ('+g.len+' steps)':nm+' has no clean greedy path yet';
    t=desc(ga,NM[S.a])+'; '+desc(gb,NM[S.b])+'. ';
    if(S.a==='sarsa'&&S.b==='q')t+='Q-learning\'s values describe the shortest path, but it walks it with 10% random moves, and next to the edge a random move down is a fall: its returns stay worse than SARSA\'s.'}
  $('lb-cl-cap').innerHTML=t}
let A=null;
// the transport counts frames i = e * M + k, with k = M - 1 meaning "episode e complete, show the Q table after it"; in step mode one frame is one step of both agents
const M=100000,enc=()=>P.e*M+(P.k<0?M-1:P.k),dec=i=>{P.e=Math.floor(i/M);const k=i%M;P.k=k===M-1?-1:k};
function init(){rec();
  A=U.anim({p:'lb-cl',sec,speeds:[['a step at a time',10],['an episode at a time',4],['25 episodes at a time',40]],def:1,scrubLabel:'Episode',
    n:()=>EP*M,label:i=>{dec(i);return'episode '+(P.e+1)+' of '+EP},
    draw:i=>{dec(i);draw()},
    adv:(i,k,sp)=>{dec(i);for(let j=0;j<k;j++){if(sp===0){if(P.k<0||P.k>=maxK(P.e)){if(P.e<EP-1){P.e++;P.k=0}else P.k=-1}else P.k++}
        else{if(P.k>=0)P.k=-1,P.e=Math.min(EP-1,P.e+(sp===1?0:24));else P.e=Math.min(EP-1,P.e+(sp===1?1:25))}}return enc()},
    back:i=>{dec(i);const sp=+$('lb-cl-spd').value;if(sp===0){if(P.k>0)P.k--;else if(P.k<0)P.k=Math.max(0,maxK(P.e)-1);else if(P.e>0){P.e--;P.k=-1}}else{if(P.k<0&&P.e>0)P.e--;P.k=-1}return enc()},
    scrubMax:()=>EP,toScrub:i=>{dec(i);return P.k<0?P.e+1:P.e},fromScrub:v=>{if(v===0){P.e=0;P.k=0}else{P.e=v-1;P.k=-1}return enc()}});
  A.show();
  ['a','b'].forEach(w=>$('lb-cl-m'+w).onchange=e=>{S[w]=e.target.value;rec();A.show();run()});
  $('lb-cl-eps').onchange=e=>{S.eps=+e.target.value;rec();A.show();run()};$('lb-cl-al').onchange=e=>{S.al=+e.target.value;rec();A.show();run()};
  $('lb-cl-seed').onchange=e=>{S.seed=+e.target.value;rec();A.show();run()};
  $('lb-cl-runs').onchange=e=>{S.runs=+e.target.value;run()};$('lb-cl-sm').onchange=e=>{S.sm=+e.target.value;plot()};
  U.watch(sec,()=>{if(!S.res[key()]&&!job)run()})}
let job=null;
function key(){return[S.a,S.b,S.eps,S.al,S.runs].join('|')}
function run(){const k=key();if(S.res[k]){plot();checks();return}if(job)job.cancel=true;$('lb-cl-chk').innerHTML='<li><span class="lb-in">•</span><span>running '+S.runs+' runs of each agent...</span></li>';
  job=U.job(E.clJob({seed:1,runs:S.runs,episodes:EP,eps:S.eps,alpha:S.al,algs:[S.a,S.b]}),p=>U.prog($('lb-cl-pg'),p),r=>{S.res[k]=r;job=null;plot();checks()});plot()}
function smooth(y,w){if(w<=1)return y;const o=[];let s=0;for(let i=0;i<y.length;i++){s+=y[i];if(i>=w)s-=y[i-w];o.push(i>=w-1?s/w:null)}return o}
function plot(){const el=$('lb-cl-ch'),r=S.res[key()],xs=[];for(let i=1;i<=EP;i++)xs.push(i);
  const it=[{k:'a',lab:NM[S.a],c:'var(--c1)'},{k:'b',lab:NM[S.b],c:'var(--c2)'}];
  const ser=r?it.map((m,i)=>({x:xs,y:smooth(r.mean[i],S.sm),c:m.c,off:S.on[m.k]===false})):[];
  U.chart(el,{x:[0,EP],y:[-100,0],yt:[-100,-75,-50,-25,0],yf:v=>v<0?MI+(-v):String(v),xt:[0,100,200,300,400,500],xl:'episodes',series:ser,label:'Sum of rewards per episode'});
  U.legend($('lb-cl-lg'),it,S.on,plot)}
function checks(){const r=S.res[key()];if(!r)return;const R=[],late=r.mean.map(m=>m.slice(400).reduce((a,b)=>a+b,0)/100),n=S.runs;
  const cnt=pl=>{const o={};pl.forEach(x=>o[x]=(o[x]||0)+1);return o},ca=cnt(r.plen[0]),cb=cnt(r.plen[1]);
  const fmt=c=>Object.keys(c).sort((x,y)=>(+x<0?999:+x)-(+y<0?999:+y)).map(k=>(+k<0?'none':k+' steps')+': '+c[k]).join(', ');
  R.push([null,'Mean return over episodes 401 to 500: '+NM[S.a]+' <b>'+U.f(late[0],1)+'</b>, '+NM[S.b]+' <b>'+U.f(late[1],1)+'</b>.']);
  if(S.a==='sarsa'&&S.b==='q'){R[0][0]=late[0]>late[1];R[0][1]+=' The book: Q-learning\'s "online performance is worse than that of Sarsa".';}
  R.push([null,'Greedy path after 500 episodes, over '+n+' runs: '+NM[S.a]+' '+fmt(ca)+'; '+NM[S.b]+' '+fmt(cb)+'. "None" means the greedy moves loop through rarely visited cells.']);
  if(S.b==='q'&&S.eps===0.1)R[1][0]=r.plen[1].every(x=>x===13)?true:null;
  const ex=E.clEvalEps(E.clQstar(),S.eps);const qi=[S.a,S.b].indexOf('q');
  R.push([qi>=0?Math.abs(late[qi]-ex)<2.5:null,'Independent check: acting ε-greedily around the optimal (edge) path has an exact expected return of <b>'+U.f(ex,2)+'</b> (policy evaluation on the known grid, no sampling)'+(qi>=0?'; Q-learning\'s simulated late average, '+U.f(late[qi],2)+', agrees.':'.')+' Optimal with no exploration: '+MI+'13.']);
  R.push([null,'With ε shrinking toward 0 both methods would converge to the optimal path, as the book notes; try ε = 0.05 to see the gap narrow.']);
  U.checks($('lb-cl-chk'),R)}
let inited=false;
U.onRender('t-cl',()=>{if(!inited){inited=true;init()}A.show();plot()});
window.LB_TEST=Object.assign(window.LB_TEST||{},{cl:()=>({A,S,P,busy:()=>!!job})});
})();
