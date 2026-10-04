// ---- Reading tab: "One episode, four learners" (before/after animation). Engine: MFE.fourLearners in 21_js_mf_engine.js.
(function(){
'use strict';
const M=window.MFE,card=document.getElementById('rd-four');if(!M||!card||!window.RD)return;
const D=M.mDefault();if(!D)return;
const AL=0.5,EPS=0.1,T=D.T,L=M.fourLearners(D.Q0,T,AL,EPS),F=L.F,N=F.length;
const NM={mc:'Monte Carlo',sarsa:'SARSA',esarsa:'Expected SARSA',q:'Q-learning'},ORD=['sarsa','esarsa','q','mc'],CL={mc:'var(--c4)',sarsa:'var(--c1)',esarsa:'var(--c3)',q:'var(--c2)'};
const n=v=>RD.n(v,2),ROW=['top','middle','bottom'];
const cell=s=>s===M.MS?'the start':s===M.MG?'the goal':ROW[(s/M.MC)|0]+' row, column '+(s%M.MC+1);
// the key step: the exploratory move into the cliff, and the step before it (whose update sees it as A')
const kFall=T.findIndex(s=>s.r===-100),kPrev=kFall-1,kPair=kPrev>=0?T[kPrev].s*4+T[kPrev].a:-1;
let mode='sarsa';
function draw(i){const fr=F[i],Q=fr.Q[mode],el=document.getElementById('rd-fourP'),W=RD.width(el),c=Math.min(68,Math.floor((W-2)/M.MC)),GW=c*M.MC,GH=c*M.MR,ox=Math.floor((W-GW)/2);let s='';
  const tri=(x,y,a)=>{const cx=x+c/2,cy=y+c/2,p=[[x,y,x+c,y],[x,y+c,x+c,y+c],[x+c,y,x+c,y+c],[x,y,x,y+c]][a];return'M'+cx+' '+cy+'L'+p[0]+' '+p[1]+'L'+p[2]+' '+p[3]+'Z'};
  const step=i>0?T[i-1]:null,hiK=step?step.s*4+step.a:-1;
  for(let st=0;st<M.MR*M.MC;st++){const r=(st/M.MC)|0,cc=st%M.MC,x=ox+cc*c,y=r*c;
    if(M.mCliff(st)){s+='<rect x="'+x+'" y="'+y+'" width="'+c+'" height="'+c+'" fill="var(--bad)" fill-opacity=".22"/>';continue}
    if(st===M.MG){s+='<rect x="'+x+'" y="'+y+'" width="'+c+'" height="'+c+'" fill="var(--good)" fill-opacity=".18"/>';continue}
    let b=-Infinity,ba=0;for(let a=0;a<4;a++){const q=Q[st*4+a];s+='<path d="'+tri(x,y,a)+'" fill="'+RD.colorScale(Math.max(-15,q),-15,1)+'" stroke="var(--line)" stroke-width=".6"/>';if(q>b){b=q;ba=a}}
    if(st*4<=hiK&&hiK<st*4+4){s+='<path d="'+tri(x,y,hiK%4)+'" fill="none" stroke="var(--ink)" stroke-width="2"/>'}
    const d=M.GA[ba],cx=x+c/2,cy=y+c/2,Lr=c*0.26;s+='<path d="M'+(cx-d[1]*Lr*0.4).toFixed(1)+' '+(cy-d[0]*Lr*0.4).toFixed(1)+'L'+(cx+d[1]*Lr).toFixed(1)+' '+(cy+d[0]*Lr).toFixed(1)+'" stroke="var(--ink)" stroke-width="1.6" marker-end="url(#rdfa)" opacity=".75"/>'}
  for(let k=0;k<=M.MC;k++)s+='<line x1="'+(ox+k*c)+'" x2="'+(ox+k*c)+'" y1="0" y2="'+GH+'" stroke="var(--mute)" stroke-width=".6"/>';for(let k=0;k<=M.MR;k++)s+='<line x1="'+ox+'" x2="'+(ox+GW)+'" y1="'+(k*c)+'" y2="'+(k*c)+'" stroke="var(--mute)" stroke-width=".6"/>';
  const fz=Math.max(10,Math.min(13,c*0.3));s+='<text x="'+(ox+c*0.14)+'" y="'+(2*c+c*0.3)+'" font-size="'+fz+'" font-weight="700">S</text><text x="'+(ox+5*c+c/2)+'" y="'+(2*c+c*0.62)+'" font-size="'+fz+'" font-weight="700" text-anchor="middle">G</text><text x="'+(ox+3*c)+'" y="'+(2*c+c*0.6)+'" font-size="'+fz+'" fill="var(--bad)" font-weight="600" text-anchor="middle">cliff</text>';
  // trail so far
  const cen=st=>[ox+(st%M.MC)*c+c/2,((st/M.MC)|0)*c+c/2];let path='',pen=false,pos=M.MS;const p0=cen(M.MS);path='M'+p0[0]+' '+p0[1];pen=true;
  for(let k=0;k<i;k++){const st=T[k];if(st.r===-100){const h=cen(st.hit);path+='L'+h[0]+' '+h[1];s+='<path d="M'+(h[0]-c*0.18)+' '+(h[1]-c*0.18)+'l'+(c*0.36)+' '+(c*0.36)+'m0 '+(-c*0.36)+'l'+(-c*0.36)+' '+(c*0.36)+'" stroke="var(--bad)" stroke-width="2.2"/>';const q=cen(M.MS);path+='M'+q[0]+' '+q[1]}else{const q=cen(st.s2);path+='L'+q[0]+' '+q[1]}pos=st.s2}
  s+='<path d="'+path+'" fill="none" stroke="var(--acc)" stroke-width="2" stroke-opacity=".7" stroke-linejoin="round"/>';const ag=cen(pos);s+='<circle cx="'+ag[0]+'" cy="'+ag[1]+'" r="'+(c*0.13)+'" fill="var(--acc)" stroke="var(--bg)" stroke-width="1.5"/>';
  el.innerHTML='<svg viewBox="0 0 '+W+' '+(GH+2)+'" width="'+W+'" height="'+(GH+2)+'" role="img" aria-label="Small cliff with the episode so far"><defs><marker id="rdfa" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L6 3L0 6Z" fill="var(--ink)"/></marker></defs>'+s+'</svg>';
  // caption
  const tt=document.getElementById('rd-fourT'),tx=document.getElementById('rd-fourX');
  if(i===0){tt.textContent='Before the episode: all four learners hold the same table';tx.innerHTML='Q-learning\'s 30 earlier episodes have taught it the edge path: one up, right along the middle row, down to the goal. The episode below is '+T.length+' steps long and includes one random move into the cliff.'}
  else{const st=step,mv=(st.x?'random':'greedy')+' move <b>'+M.AN[st.a]+'</b>';
    tt.textContent='Step '+i+' of '+T.length+(i===T.length?': the episode ends':'');
    let x='In '+cell(st.s)+', a '+mv+(st.r===-100?': <b>falls into the cliff</b>, reward '+RD.n(-100,0)+', back to the start.':st.done?' reaches the goal, reward '+RD.n(-1,0)+'.':(st.s2===st.s?' bumps into the wall and stays, reward '+RD.n(-1,0)+'.':' to '+cell(st.s2)+', reward '+RD.n(-1,0)+'.'));
    if(!st.done)x+=' Next action <i>A&prime;</i> = '+M.AN[st.a2]+(st.x2?' (a random move)':'')+'.';
    if(i-1===kPrev)x+=' <b>This is the moment:</b> <i>A&prime;</i> is the random step into the cliff. SARSA\'s target uses it; Q-learning\'s ignores it; Expected SARSA weighs it by its 2.5% chance.';
    if(i===T.length)x+=' Only now does Monte Carlo update, pulling each of the '+T.length+' visited pairs toward the return that followed it (from '+RD.n(L.G[0],0)+' at the start).';
    tx.innerHTML=x}
  // table: this step's target and update for each learner
  let h='<tr><th>Learner</th><th>Target for this step</th><th>Q(S, A): before to after</th></tr>';
  ORD.forEach(k=>{let tg='',up='';
    if(i===0){tg='nothing yet';up='&nbsp;'}
    else{const u=fr.u[k],st=step;
      if(k==='mc'){if(!u){tg='waits: the return is not known until the episode ends';up='unchanged'}else{const m=u[u.length-1];tg='return G = '+n(m.tg)+' (and '+(u.length-1)+' earlier pairs, each toward its own return)';up=n(m.old)+' &rarr; <b>'+n(m.nw)+'</b>'}}
      else{const lab=k==='sarsa'?'R + Q(S&prime;, A&prime;)':k==='q'?'R + max Q(S&prime;, &middot;)':'R + E<sub>&pi;</sub>Q(S&prime;, &middot;)';
        tg=st.done?'R = '+n(st.r)+' (terminal)':lab+' = '+n(st.r)+' + ('+n(u.boot)+') = '+n(u.tg);up=n(u.old)+' &rarr; <b>'+n(u.nw)+'</b>'}}
    h+='<tr><td><span style="color:'+CL[k]+'">&#9632;</span> '+NM[k]+'</td><td>'+tg+'</td><td class="num">'+up+'</td></tr>'});
  document.getElementById('rd-fourTab').innerHTML=h;
  // counters: the key pair before and now, and the total change so far
  let cnt='';ORD.forEach(k=>{let tot=0;for(let j=0;j<D.Q0.length;j++)tot+=Math.abs(fr.Q[k][j]-D.Q0[j]);
    cnt+=RD.stat(NM[k],n(fr.Q[k][kPair]),'Q('+cell(T[kPrev].s)+', '+M.AN[T[kPrev].a]+'), was '+n(D.Q0[kPair])+' · total change '+RD.n(tot,1))});
  document.getElementById('rd-fourN').innerHTML=cnt}
const an=RD.anim({card:'rd-four',ctl:'rd-fourC',n:N,draw,ms:1700,label:'Step of the episode'});
document.getElementById('rd-fourM').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mode=b.dataset.m;[...b.parentNode.children].forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',String(x===b))});an.redraw()});
RD.onResize(()=>an.redraw());
window.RD_TEST=Object.assign(window.RD_TEST||{},{four:{an,D,L,kPrev,kPair}});
})();
