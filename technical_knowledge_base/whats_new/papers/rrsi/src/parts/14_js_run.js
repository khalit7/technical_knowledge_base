// ---- Replay the released runs: every recorded round, the rule re-applied, the four runs side by side ----
const RUNS_=window.RUNS.runs, RUN=Object.fromEntries(RUNS_.map(r=>[r.id,r]));
const ST={accepted:['kept',CB],rejected_floor:['below the floor','var(--c4)'],rejected_cost:['rejected by the cost or token rule',CO],rejected_score:['rejected on score or cost',CO],lost_to_peer:['admissible, lost to the other candidate',CG],
  critic_reject:['rejected by the critic','var(--mute)'],smoke_fail:['failed the liveness test','var(--mute)'],screen_kill:['killed by the 24-task screen','var(--mute)'],no_proposal:['no proposal','var(--mute)'],void:['void','var(--mute)']};
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const sgn=(v,d)=>(v>0?'+':v<0?'−':'')+fmt(Math.abs(v),d||0);
function rounds(r){const ts=[...new Set(r.c.map(c=>c.t))].sort((a,b)=>a-b);return ts.map((t,i)=>({t,i,cs:r.c.filter(c=>c.t===t),before:r.traj[i],after:r.traj[i+1]}))}
function greedyPick(R){const ms=R.cs.filter(c=>c.n!=null);if(!ms.length)return null;const b=ms.reduce((a,c)=>c.n>a.n?c:a);return b.n>R.before[1]?b:null}
(function(){
  const sel=$('rpEp');RUNS_.forEach((r,i)=>{const o=document.createElement('option');o.value=i;o.textContent=r.name+(r.id==='coding_gemini'?' (earlier procedure)':r.id==='eng'?' (adapted rules)':'');sel.appendChild(o)});
  let r=RUNS_[0],RD=rounds(r);const modes={rec:[],g:[]};
  function cand(c,inc,r){const s=ST[c.st]||[c.st,CG];const dn=c.n!=null?c.n-inc[1]:null;
    return '<div class="e1"><div><b>'+esc(c.id)+'</b> <span class="verdict" style="background:none;border:1px solid '+s[1]+';color:'+s[1]+'">'+s[0]+'</span>'+(c.comp.length?' <span class="tag2">'+c.comp.join(', ')+'</span>':'')+(c.ne?' <span class="tag2">'+c.ne+' edit'+(c.ne>1?'s':'')+'</span>':'')+'</div>'+
      (dn!=null?'<div class="small">'+fmt(c.n)+' '+r.unit+' ('+sgn(dn)+' against the incumbent'+(c.dC!=null?', tokens '+(c.dC>=0?'+':'−')+Math.abs(c.dC*100).toFixed(1)+'%':'')+')</div>':'')+
      (c.sum?'<div class="small">'+esc(c.sum)+'</div>':'')+(c.fr?'<div class="small mute">Critic, first draft: '+esc(c.fr)+'</div>':'')+'<div class="small mute">Record: '+esc(c.why)+'</div></div>'}
  function build(){RD=rounds(r);for(const m of ['rec','g']){const A=modes[m];A.length=0;
      A.push({t:'Start: '+r.base,c:'Base harness '+fmt(r.traj[0][1])+' of '+fmt(r.denom)+' '+r.unit+' ('+(r.traj[0][1]/r.denom*100).toFixed(2)+'%). Noise band δ = '+r.delta.toFixed(4)+' ('+(r.delta*r.denom).toFixed(1)+' '+r.unit+'); '+r.budget+'. '+esc(r.note)});
      RD.forEach(R=>{const won=R.cs.find(c=>c.st==='accepted');let head='Round '+R.t+': '+(won?won.id+' kept, incumbent '+sgn(R.after[1]-R.before[1])+' '+r.unit:'incumbent unchanged');
        let pre='';if(m==='g'){const gp=greedyPick(R);const same=(gp&&won&&gp.id===won.id)||(!gp&&!won);pre='<div class="small"><b>Keep the best score</b> would '+(gp?'keep '+gp.id+' ('+sgn(gp.n-R.before[1])+')':'keep the incumbent')+(same?', the same as the record.':'; the record '+(won?'kept '+won.id:'kept the incumbent')+'.')+'</div>';if(!same)head+=' (rules disagree)'}
        A.push({t:head,c:pre+'<div class="tr">'+R.cs.map(c=>cand(c,R.before,r)).join('')+'</div>'})})}}
  function info(){$('rpInfo').innerHTML=esc(r.policy)+' policy, proposer '+esc(r.proposer)+'; evolve set '+esc(r.evolveSet)+'; '+r.T+' rounds, '+r.m+' candidate'+(r.m>1?'s':'')+' a round.';
    $('rpLeg').innerHTML=[['kept',CB,1],['below the floor','var(--c4)'],['rejected by cost, token or score rule',CO],['lost to the other candidate',CG],['not evaluated (critic, smoke test, screen, no proposal)','var(--mute)']].map(x=>'<span><i style="background:'+x[1]+'"></i>'+x[0]+'</span>').join('')}
  build();info();
  const anim=makeAnim({id:'rp',modes,mode:'rec',dur:1500,
    draw:(m,k,e,w)=>{const H=Math.min(330,Math.max(250,w*.5)),pl=50,pr=12,pt=14,pb=50;const N=RD.length,dc=r.delta*r.denom;
      const incs=r.traj.map(p=>p[1]);let lo=Math.min(...incs)-2.2*dc,hi=Math.max(...incs)+1.2*dc;
      const X=i=>pl+(w-pl-pr)*i/N,Y=v=>pt+(H-pt-pb)*(1-(Math.max(lo,Math.min(hi,v))-lo)/(hi-lo));let s='';
      const step=(hi-lo)/5,mag=10**Math.floor(Math.log10(step)),st=[1,2,5,10].map(x=>x*mag).find(x=>x>=step);
      for(let v=Math.ceil(lo/st)*st;v<=hi;v+=st)s+=ln2(pl,Y(v),w-pr,Y(v),'var(--line)')+tx(pl-6,Y(v)+4,fmt(v),{a:'end',fs:11,c:CG});
      const tk=N>30?10:5;for(let i=0;i<=N;i+=tk)s+=tx(X(i),H-pb+15,i,{a:'middle',fs:11,c:CG});
      s+=tx((pl+w-pr)/2,H-pb+30,'round (the step after the start); '+r.unit+' on the evolve set',{a:'middle',fs:11,c:CG});
      // floor and incumbent
      let best=r.traj[0][1],fl='',inc='';for(let i=0;i<=Math.min(k,N);i++){const v=r.traj[i][1];best=Math.max(best,v);
        if(i<N&&i<k)fl+=ln2(X(i),Y(best-dc),X(i+1),Y(best-dc),'var(--c4)',{da:'4 3',op:.9});
        const x0=X(i),x1=i<k?X(i+1):X(i)+(X(i+1)-X(i))*e*0;inc+=(i?'L':'M')+x0.toFixed(1)+','+Y(v).toFixed(1);if(i<k)inc+='L'+X(i+1).toFixed(1)+','+Y(v).toFixed(1)}
      s+=fl+'<path d="'+inc+'" fill="none" stroke="var(--ink)" stroke-width="2"/>'+'<circle cx="'+X(0)+'" cy="'+Y(r.traj[0][1])+'" r="4" fill="var(--ink)"/>'+(k===0?tx(X(0)+8,Y(r.traj[0][1])-8,'base harness: '+fmt(r.traj[0][1])+' '+r.unit,{fs:11}):'');
      // candidates of rounds up to k
      for(let i=1;i<=Math.min(k,N);i++){const R=RD[i-1],cur=i===k,op=cur?Math.max(.15,e):.45;const gp=m==='g'?greedyPick(R):null;const won=R.cs.find(c=>c.st==='accepted');
        R.cs.forEach((c,j)=>{const col=(ST[c.st]||[0,CG])[1],x=X(i)-(R.cs.length>1?(j?-4:4):0)*(w<500?.8:1);
          if(c.n==null){s+=G(op,'<line x1="'+x+'" x2="'+x+'" y1="'+(H-pb-2)+'" y2="'+(H-pb-9)+'" stroke="var(--mute)" stroke-width="2"/>');return}
          const out=c.n<lo||c.n>hi,y=Y(c.n);s+=G(op,out?'<polygon points="'+(x-5)+','+(y-6)+' '+(x+5)+','+(y-6)+' '+x+','+(y+1)+'" fill="'+col+'"/>':'<circle cx="'+x+'" cy="'+y+'" r="'+(cur?5:4)+'" fill="'+(c.st==='accepted'?col:'var(--bg)')+'" stroke="'+col+'" stroke-width="1.8"/>')});
        if(m==='g'){const same=(gp&&won&&gp.id===won.id)||(!gp&&!won);if(!same)s+=G(op,'<rect x="'+(X(i)-8)+'" y="'+(pt-2)+'" width="16" height="'+(H-pt-pb+4)+'" fill="'+CO+'" opacity=".12"/>'+tx(X(i),pt+9,'≠',{a:'middle',fs:12,c:CO,w:700}))}}
      if(lo>Math.min(...r.c.filter(c=>c.n!=null).map(c=>c.n)))s+=tx(w-pr,H-pb-12,'▼ off the chart below',{a:'end',fs:11,c:CG});
      return svgW(w,H,s,'Replay of a released run')},
    counters:(m,k)=>{const N=RD.length,cur=r.traj[Math.min(k,N)],R=RD.slice(0,k);const cnt={};R.forEach(x=>x.cs.forEach(c=>cnt[c.st]=(cnt[c.st]||0)+1));
      const gate=['critic_reject','smoke_fail','screen_kill','no_proposal','void'].reduce((a,s)=>a+(cnt[s]||0),0);
      let dis=0;R.forEach(x=>{const gp=greedyPick(x),won=x.cs.find(c=>c.st==='accepted');if(!((gp&&won&&gp.id===won.id)||(!gp&&!won)))dis++});
      return stat('Round',k?RD[k-1].t:'start',k?'round '+k+' of '+N+' in this run':'')+stat('Incumbent',fmt(cur[1])+' '+r.unit,sgn(cur[1]-r.traj[0][1])+' since the start ('+sgn((cur[1]-r.traj[0][1])/r.denom*100,2)+' pts)')+
        stat('Tokens per trial',cur[2]?fmt(cur[2]/1e3)+'k':'not logged',cur[2]&&r.traj[0][2]?'× '+(cur[2]/r.traj[0][2]).toFixed(2)+' the base':'')+
        stat('Decisions so far',(cnt.accepted||0)+' kept','floor '+(cnt.rejected_floor||0)+', cost or score '+((cnt.rejected_cost||0)+(cnt.rejected_score||0)+(cnt.lost_to_peer||0))+', not evaluated '+gate)+(m==='g'?stat('Rounds where the rules disagree',dis,'keep-the-best against the record'):'')}});
  sel.addEventListener('change',()=>{r=RUNS_[+sel.value];build();info();if(anim){anim.st.k=0;anim.st.t=1;anim.st.play=false;anim.st.lk=-1;anim.draw()}});
})();
// Re-judge: Algorithm 2 (rrsi/selection.py) applied to each recorded round against the recorded incumbent
const RJ_CFG={coding_opus:{b0:.10,b1:44.5,ws:0,wc:15,wn:.5,paper:.017},lab:{b0:.10,b1:35.4,ws:1414,wc:15,wn:.5,paper:.004}};
const KSTR=new Set(['client_tool','skill','memory','subagent']);
function rejudge(r,cfg,delta){let inc=[r.traj[0][1]/r.denom,r.traj[0][2]],Sst=inc[0];const acc=new Set(),out=[];
  rounds(r).forEach(R=>{const adm=[],dec={},pt={};
    R.cs.forEach(c=>{if(c.S==null){dec[c.id]='gate';return}const dS=c.S-inc[0],dC=(c.C-inc[1])/inc[1];const nu=[...new Set(c.comp)].filter(l=>KSTR.has(l)&&!acc.has(l)).length;
      let d;if(c.S<Sst-delta)d='floor';else if(dS>delta)d=dC<=cfg.b0+cfg.b1*dS?'ok':'cost';else d=cfg.ws*dS-cfg.wc*dC+cfg.wn*nu>0?'ok':'cost';dec[c.id]=d;pt[c.id]=[dS,dC,nu];if(d==='ok')adm.push(c)});
    const win=adm.length?adm.reduce((a,c)=>c.S>a.S?c:a):null;
    R.cs.forEach(c=>out.push({t:R.t,c,d:c===win?'win':dec[c.id]==='ok'?'lose':dec[c.id],p:pt[c.id]}));
    const rec=R.cs.find(c=>c.st==='accepted');if(rec){inc=[rec.S,rec.C];Sst=Math.max(Sst,rec.S);rec.comp.forEach(l=>acc.add(l))}});
  return out}
const RJ_MAP={accepted:['win'],rejected_floor:['floor'],rejected_cost:['cost'],rejected_score:['floor','cost'],lost_to_peer:['lose'],smoke_fail:['gate'],critic_reject:['gate'],no_proposal:['gate']};
(function(){const DL={win:'kept',lose:'admissible, lost',floor:'below the floor',cost:'cost or token rule',gate:'not evaluated'};
  function go(){const id=$('rjRun').value,r=RUN[id],c0=RJ_CFG[id];const dm=+$('rjD').value/8,bm=+$('rjB').value/4,wc=+$('rjW').value*5;
    const delta=r.delta*dm,cfg=Object.assign({},c0,{b1:c0.b1*bm,wc});
    $('rjDV').textContent=delta.toFixed(4)+' ('+(delta*r.denom).toFixed(1)+' '+r.unit+(Math.abs(delta-r.delta)<1e-9?', as run':Math.abs(delta-c0.paper)<.0006?', near Table 5':'')+')';
    $('rjBV').textContent=cfg.b1.toFixed(1)+(bm===1?' (released)':'');$('rjWV').textContent=wc+(wc===15?' (released)':'');
    const J=rejudge(r,cfg,delta),meas=J.filter(x=>x.d!=='gate');const agree=meas.filter(x=>RJ_MAP[x.c.st]&&RJ_MAP[x.c.st].includes(x.d));
    const recW=new Set(r.c.filter(c=>c.st==='accepted').map(c=>c.id)),newW=new Set(J.filter(x=>x.d==='win').map(x=>x.c.id));
    const flips=meas.filter(x=>!(RJ_MAP[x.c.st]||[]).includes(x.d));
    $('rjOut').innerHTML=stat('Agree with the record',agree.length+' of '+meas.length,'measured candidates')+stat('Winners now',newW.size,'recorded: '+recW.size+(([...newW].every(x=>recW.has(x))&&newW.size===recW.size)?', the same':''))+stat('Noise band',delta.toFixed(4),'released '+r.delta.toFixed(4)+', Table 5 '+c0.paper);
    $('rjList').innerHTML=flips.length?'<p class="small"><b>Decisions that differ from the record:</b> '+flips.map(x=>'round '+x.t+' '+x.c.id+' ('+sgn(x.p[0]*r.denom)+' '+r.unit+', tokens '+(x.p[1]>=0?'+':'−')+Math.abs(x.p[1]*100).toFixed(0)+'%): recorded '+(ST[x.c.st]||[x.c.st])[0]+', now '+DL[x.d]).join('; ')+'. Each round is judged against the incumbent the run actually had, so a changed winner does not change later rounds here.</p>':'<p class="small">Every measured decision matches the record.</p>';
    fit($('rjSvg'),w=>{const H=Math.min(320,Math.max(240,w*.5)),pl=46,pr=12,pt=12,pb=40,dc=delta*r.denom;const xs=meas.map(x=>x.p[0]*r.denom);
      const span=Math.max(r.delta*r.denom*1.5,dc*1.5);const xlo=-3*span,xhi=2.2*span,ylo=-60,yhi=220;
      const X=v=>pl+(w-pl-pr)*(Math.max(xlo,Math.min(xhi,v))-xlo)/(xhi-xlo),Y=v=>pt+(H-pt-pb)*(1-(Math.max(ylo,Math.min(yhi,v))-ylo)/(yhi-ylo));let s='';
      [-50,0,50,100,150,200].forEach(v=>s+=ln2(pl,Y(v),w-pr,Y(v),v?'var(--line)':'var(--mute)')+tx(pl-6,Y(v)+4,(v>0?'+':'')+v+'%',{a:'end',fs:11,c:CG}));
      const st=[1,2,5,10,20,50,100,200].find(x=>x>=(xhi-xlo)/6);for(let v=Math.ceil(xlo/st)*st;v<=xhi;v+=st)s+=tx(X(v),H-pb+15,(v>0?'+':'')+v,{a:'middle',fs:11,c:CG});
      s+=tx((pl+w-pr)/2,H-6,'score change against the incumbent ('+r.unit+')',{a:'middle',fs:11,c:CG})+'<text x="11" y="'+((pt+H-pb)/2)+'" font-size="11" fill="var(--mute)" text-anchor="middle" transform="rotate(-90 11 '+((pt+H-pb)/2)+')">token change</text>';
      s+=ln2(X(-dc),pt,X(-dc),H-pb,'var(--c4)',{da:'4 3'})+ln2(X(dc),pt,X(dc),H-pb,'var(--mute)',{da:'2 3'});
      s+=tx(X(-dc)-4,pt+10,'floor',{a:'end',fs:11,c:'var(--c4)'})+tx(X(dc)+4,pt+10,'band',{fs:11,c:CG});
      // Eq. 7 line right of the band; Eq. 17 line inside it (nu = 0)
      const e7=v=>(cfg.b0+cfg.b1*v/r.denom)*100,e17=v=>cfg.wc?(cfg.ws*v/r.denom)/cfg.wc*100:(v>0?yhi:ylo);
      s+='<path d="M'+X(dc)+','+Y(e7(dc))+'L'+X(xhi)+','+Y(e7(xhi))+'" stroke="'+CB+'" stroke-width="1.6" fill="none"/>';
      s+='<path d="M'+X(-dc)+','+Y(e17(-dc))+'L'+X(dc)+','+Y(e17(dc))+'" stroke="'+CB+'" stroke-width="1.6" fill="none" stroke-dasharray="5 3"/>';
      meas.forEach(x=>{const col=x.d==='win'?CB:x.d==='lose'?CG:x.d==='floor'?'var(--c4)':CO,ch=!(RJ_MAP[x.c.st]||[]).includes(x.d);s+='<circle cx="'+X(x.p[0]*r.denom)+'" cy="'+Y(x.p[1]*100)+'" r="'+(ch?6:4.5)+'" fill="'+(x.d==='win'?col:'var(--bg)')+'" stroke="'+(ch?'var(--ink)':col)+'" stroke-width="'+(ch?2.4:1.6)+'"><title>'+x.c.id+'</title></circle>'});
      $('rjSvg').innerHTML=svgW(w,H,s,'Recorded candidates on the rule plane')+'<p class="small mute" style="margin:2px 0 0">Solid blue: Eq. 7, admissible below it. Dashed blue: Eq. 17 with ν = 0, admissible below it (a new structural component shifts it up by '+(cfg.wc?(cfg.wn/cfg.wc*100).toFixed(1):'∞')+' points of tokens). Black ring: a decision that differs from the record. Points beyond the axes are drawn at the edge.</p>'})}
  ['rjRun','rjD','rjB','rjW'].forEach(i=>$(i).addEventListener(i==='rjRun'?'change':'input',go));onTab('t-run',go)})();
// The four runs side by side, and the held-out record
onTab('t-run',()=>{const X=RC.runs;let h='<table><thead><tr><th>Run</th><th class="num">Rounds</th><th class="num">Evaluated</th><th class="num">Kept</th><th class="num">Kept inside the band</th><th class="num">Start → end</th><th class="num">Tokens per trial</th><th class="num">No proposal</th><th class="num">Critic sent back</th></tr></thead><tbody>';
  RUNS_.forEach(r=>{const x=X[r.id];const ev=r.c.filter(c=>c.n!=null).length;h+='<tr><td>'+esc(r.name)+'</td><td class="num">'+r.T+'</td><td class="num">'+ev+'</td><td class="num">'+x.steps.length+'</td><td class="num">'+x.inside_band+' of '+x.steps.length+'</td><td class="num">'+fmt(x.start)+' → '+fmt(x.end)+' '+r.unit+' ('+sgn((x.end-x.start)/r.denom*100,1)+' pts)</td><td class="num">'+(x.tok0?(x.tok0/1e6).toFixed(2)+'M → '+(x.tok1/1e6).toFixed(2)+'M':x.tok1?'→ '+(x.tok1/1e6).toFixed(2)+'M':'not logged')+'</td><td class="num">'+x.no_proposal+'</td><td class="num">'+x.critic_first_rejects+'</td></tr>'});
  $('rsT').innerHTML=h+'</tbody></table><p class="small mute">"Kept inside the band": accepted edits whose step was no larger than the run\'s noise band δ (in '+'counts: coding '+X.coding_opus.delta_count+', Gemini coding '+X.coding_gemini.delta_count+', Harvey LAB '+X.lab.delta_count+', engineering '+X.eng.delta_count+'). Steps: '+RUNS_.map(r=>r.name+': '+X[r.id].steps.map(s=>sgn(s[2])).join(', ')).join('; ')+'.</p>';
  const L=RUN.lab.heldout,b=L.filter(x=>x.label==='heldout_basev0'),c0=L.find(x=>x.label==='heldout_champ'),c1=L.find(x=>x.label==='heldout_champ_r20a');const p=v=>(v*100).toFixed(2);
  $('hoT').innerHTML='<div class="tw"><table><thead><tr><th>Source</th><th class="num">H<sub>0</sub></th><th class="num">RRSI</th><th class="num">Gain</th></tr></thead><tbody><tr><td>Paper, '+A(PAPER.meta.ax+'#S4.T1','Table 1')+'</td><td class="num">86.9</td><td class="num">89.2</td><td class="num">+2.3</td></tr>'+
   '<tr><td>Released record, final harness (after round 20)</td><td class="num">'+p(b[0].passed/3650)+'<br><span class="mute small">'+b.map(x=>x.passed).join(', ')+' of 3,650</span></td><td class="num">'+p(c1.passed/3650)+'<br><span class="mute small">'+c1.passed+' of 3,650</span></td><td class="num">+'+((c1.passed-b[0].passed)/36.5).toFixed(2)+'</td></tr>'+
   '<tr><td>Released record, earlier champion</td><td class="num">'+p(b[0].passed/3650)+'</td><td class="num">'+p(c0.passed/3650)+'</td><td class="num">+'+((c0.passed-b[0].passed)/36.5).toFixed(2)+'</td></tr></tbody></table></div><p class="small mute">Criteria passed over the 40 held-out tasks, judged by Gemini 3.5 Flash. The base was measured four times and moved by one criterion. The paper\'s numbers may come from a later re-measurement; it does not say.</p>'});
