// ---- Reading, whose text: one toy prompt graded three ways (SFT on the teacher's route, logit KD on it, on-policy) ----
window.TOYG=(function(){
  // draw the toy graph; opts: {route:[nodes], upto:k, s, t, bad:Set of step indices with no edge, cur:node}
  function draw(el,G,o){
    const W=RD.width(el),H=Math.round(Math.min(340,Math.max(220,W*0.78))),pad=16;
    const X=x=>pad+x*(W-2*pad),Y=y=>pad+y*(H-2*pad);
    let s='';
    G.edges.forEach(([a,b])=>{s+='<line x1="'+X(G.xy[a][0])+'" y1="'+Y(G.xy[a][1])+'" x2="'+X(G.xy[b][0])+'" y2="'+Y(G.xy[b][1])+'" stroke="var(--line)" stroke-width="1.5"/>'});
    (o.paths||[]).forEach(pth=>{let prev=pth.from;pth.route.forEach((v,i)=>{if(i>=pth.upto)return;const bad=pth.bad&&pth.bad.has(i);
      s+='<line x1="'+X(G.xy[prev][0])+'" y1="'+Y(G.xy[prev][1])+'" x2="'+X(G.xy[v][0])+'" y2="'+Y(G.xy[v][1])+'" stroke="var('+(bad?'--bad':pth.col)+')" stroke-width="'+(pth.w||3.5)+'" stroke-linecap="round"'+(bad?' stroke-dasharray="5 4"':'')+' opacity="'+(pth.op||1)+'"/>';prev=v})});
    for(let i=0;i<G.n;i++){const isS=i===o.s,isT=i===o.t,isC=i===o.cur;
      s+='<circle cx="'+X(G.xy[i][0])+'" cy="'+Y(G.xy[i][1])+'" r="'+(isS||isT?10:8)+'" fill="'+(isS?'var(--c3)':isT?'var(--c4)':'var(--bg)')+'" stroke="'+(isC?'var(--acc)':'var(--mute)')+'" stroke-width="'+(isC?3:1)+'"/>';
      s+='<text x="'+X(G.xy[i][0])+'" y="'+(Y(G.xy[i][1])+3.5)+'" text-anchor="middle" font-size="9.5" fill="'+(isS||isT?'var(--bg)':'var(--ink)')+'">'+G.names[i]+'</text>'}
    el.innerHTML=PF.svg(W,H,o.label||'The toy graph',s);
  }
  return {draw};
})();
(function(){
  const $=id=>document.getElementById(id);if(!$('fl'))return;
  if(!DS.toy||!DS.toy.anim){$('flT').textContent='Toy data not built yet.';return}
  const G=DS.toy.graph,A=DS.toy.anim,NM=G.names,EOS=G.n+1;
  const nm=v=>v===EOS?'end':v===G.n?'sep':NM[v];
  let mode='sft';
  const R=()=>A.routes[mode==='rkl'?'student':'teacher'];
  const nSteps=()=>R().pos.length+2;
  const tr=A.routes.teacher.route,teachSet=new Set([A.s,...tr]);
  function bars(pos){
    const keys=[...new Set([...Object.keys(pos.t),...Object.keys(pos.s)].map(Number))].sort((a,b)=>(pos.t[b]||0)-(pos.t[a]||0)).slice(0,6);
    const tgt=k=>mode==='sft'?(k===pos.next?1:0):(pos.t[k]||0);
    let h='';keys.forEach(k=>{const tv=tgt(k),sv=pos.s[k]||0,isNext=k===pos.next;
      h+='<div class="dk-row" style="grid-template-columns:minmax(0,7em) minmax(0,1fr) 6.6em"><span class="nm" style="font-weight:'+(isNext?700:400)+'">'+nm(k)+(isNext?(mode==='rkl'?' ← student':' ← teacher'):'')+'</span><span class="tr" style="height:20px"><span class="f" style="width:'+(tv*100).toFixed(1)+'%;bottom:50%"></span><span class="f" style="width:'+(sv*100).toFixed(1)+'%;top:50%;background:var(--c2)"></span></span><span class="v">'+PF.pct(tv,0)+' / '+PF.pct(sv,0)+'</span></div>'});
    return h;
  }
  function draw(i){
    const r=R(),L=r.pos.length,k=i-1,route=r.route;
    const badIdx=new Set();r.pos.forEach((p,j)=>{if(!p.valid_edge&&j<route.length)badIdx.add(j)});
    const upto=i===0?0:Math.min(route.length,i===nSteps()-1?route.length:k);
    const cur=i===0?A.s:(k<L?r.pos[Math.min(k,L-1)].at:route[route.length-1]);
    const paths=[];if(mode==='rkl')paths.push({from:A.s,route:tr,upto:tr.length,col:'--dim',w:6,op:.8});
    paths.push({from:A.s,route,upto,col:mode==='rkl'?'--c2':'--c1',bad:badIdx});
    TOYG.draw($('flG'),G,{s:A.s,t:A.t,cur,paths,label:'Route from '+NM[A.s]+' to '+NM[A.t]});
    $('flGh').innerHTML=(mode==='rkl'?'The student\'s route <small>(the teacher\'s, grey, for comparison)</small>':'The teacher\'s route')+' <small>· '+NM[A.s]+' to '+NM[A.t]+', shortest '+A.dist+' steps, at most '+A.budget+'</small>';
    $('flR').innerHTML='<span>'+NM[A.s]+'</span>'+route.concat([EOS]).map((v,j)=>'<span class="'+(j===k?'cur ':'')+(badIdx.has(j)?'bad ':'')+(i>0&&j>k&&i<nSteps()-1?'fut':'')+'">'+nm(v)+'</span>').join('');
    $('flRh').innerHTML=mode==='rkl'?'Written by the student, graded by the teacher':'Written by the teacher, imitated by the student';
    let T,P;
    const pos=k>=0&&k<L?r.pos[k]:null;
    const sumL=(upTo)=>{let s=0;for(let j=0;j<upTo&&j<L;j++){const p=r.pos[j];s+=mode==='sft'?p.ce:mode==='fkl'?p.fkl:p.rkl}return s};
    if(i===0){
      T='The prompt: go from '+NM[A.s]+' to '+NM[A.t];
      P=mode==='rkl'?'The student writes its own route by sampling, then the teacher scores every token the student wrote. The student is the toy at '+A.ckpt.replace('sft','SFT')+': it already knows the format and many edges, and still makes mistakes.':'The teacher writes a route by sampling. The student, the toy at '+A.ckpt.replace('sft','SFT')+', is then trained on that route, position by position.';
      $('flB').innerHTML='';
    }else if(pos){
      const at=NM[pos.at],nx=nm(pos.next),tp=pos.t[pos.next]||0,sp=pos.s[pos.next]||0;
      const offT=!teachSet.has(pos.at);
      $('flB').innerHTML=bars(pos);
      if(mode==='sft'){T='Position '+(k+1)+': at '+at+', the teacher wrote '+nx;
        P='Hard label: the target is '+nx+' alone. The student gave it '+PF.pct(sp,0)+', so this position costs '+pos.ce.toFixed(2)+' nats of cross-entropy. '+(Object.keys(pos.t).length>1?'The teacher also rated '+Object.keys(pos.t).map(Number).filter(v=>v!==pos.next).sort((a,b)=>pos.t[b]-pos.t[a]).slice(0,2).map(v=>nm(v)+' at '+PF.pct(pos.t[v],0)).join(' and ')+'; the student never hears it.':'The teacher was sure, so nothing is lost here.');}
      else if(mode==='fkl'){T='Position '+(k+1)+': at '+at+', match the teacher\'s whole distribution';
        P='Target: the teacher\'s probabilities for every next node (blue). Forward KL here is '+pos.fkl.toFixed(2)+' nats. The student learns that '+(Object.keys(pos.t).length>1?'several continuations are good, and how good':'only '+nx+' is right')+', from the same route the SFT student saw.';}
      else{T='Position '+(k+1)+': the student is at '+at+(offT?', where the teacher\'s route never went,':'')+' and chose '+nx;
        P='The teacher gives the student\'s choice '+PF.pct(tp,tp<0.01?1:0)+(pos.valid_edge?'':' (there is no edge from '+at+' to '+nx+')')+'. Reverse KL at this position: '+pos.rkl.toFixed(2)+' nats'+(pos.rkl>1?', a strong push away from what it did':'')+'. '+(offT?'Off-policy training never grades this state, because the teacher never visits it.':'This state is on the teacher\'s route too.');}
    }else{
      const offStates=r.pos.filter(p=>!teachSet.has(p.at)).length;
      T=mode==='rkl'?'Done: '+(r.ok?'a correct route':'the route fails ('+r.why+')'):'Done: the teacher\'s route, '+(r.ok?'correct':r.why);
      P=mode==='sft'?'One token of target per position, all on states the teacher chose. Total cross-entropy '+sumL(L).toFixed(2)+' nats.':mode==='fkl'?'A whole distribution per position, but still only on the teacher\'s states. Total forward KL '+sumL(L).toFixed(2)+' nats.':'Every position is a state the student itself reached: '+offStates+' of '+L+' are states the teacher\'s route never visits. The largest grades fall exactly on the student\'s own mistakes. Total reverse KL '+sumL(L).toFixed(2)+' nats.';
      $('flB').innerHTML='';
    }
    $('flT').textContent=T;$('flP').textContent=P;
    const done=Math.min(Math.max(0,i===nSteps()-1?L:k+1),L);
    const vis=r.pos.slice(0,done).filter(p=>!teachSet.has(p.at)).length;
    $('flN').innerHTML=RD.stat('Positions trained',done+' / '+L,'one per token, including "end"')+
      RD.stat('Teacher numbers used',PF.comma(done*(mode==='sft'?1:G.n+3)),mode==='sft'?'one target token per position':'a full distribution over '+(G.n+3)+' tokens per position')+
      RD.stat('States off the teacher\'s route',vis,mode==='rkl'?'graded here, never by off-policy training':'none: the teacher chose every state')+
      RD.stat(mode==='sft'?'Cross-entropy so far':mode==='fkl'?'Forward KL so far':'Reverse KL so far',sumL(done).toFixed(2)+' nats','summed over positions');
    $('flFoot').innerHTML='Real samples and probabilities: teacher '+PF.comma(DS.toy.teacher.params)+' parameters, student '+PF.comma(DS.toy.student.params)+' (checkpoint: '+A.ckpt+'). Bars: blue is the training target (one-hot for SFT, the teacher\'s distribution otherwise), orange is the student\'s distribution before the update; the top six next nodes by teacher probability are shown.';
  }
  const AN=RD.anim({card:'fl',ctl:'flC',n:nSteps(),ms:1700,label:'Position',draw});
  $('flM').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mode=b.dataset.m;[...$('flM').children].forEach(x=>x.classList.toggle('on',x===b));AN.reset(nSteps());AN.play()});
  addEventListener('resize',()=>{if($('fl').offsetParent)AN.redraw()});
})();
