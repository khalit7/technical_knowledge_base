// ---- Scheduling cycle tab (t-kmcyc): recorded scores, and the same formulas on the reader's own sequence ----
window.KMCYC=(function(){
  const K=window.KM,$=id=>document.getElementById(id),E=RD.esc;
  const WK=['mi-kind-worker','mi-kind-worker2','mi-kind-worker3'],ALL=['mi-kind-control-plane'].concat(WK);
  const WN={'mi-kind-control-plane':'control plane','mi-kind-worker':'worker','mi-kind-worker2':'worker2','mi-kind-worker3':'worker3'};
  const POD={cpu:100,mem:64*1024*1024};
  const PROF={e6spread:{type:'LeastAllocated',res:[['cpu',1],['memory',1]]},e6pack:{type:'MostAllocated',res:[['cpu',1],['memory',1],['example.com/gpu',5]]}};
  function balanced(req,alloc){const fr=[];req.forEach((r,i)=>{if(alloc[i])fr.push(Math.min(r/alloc[i],1))});
    let std=0;if(fr.length===2)std=Math.abs((fr[0]-fr[1])/2);else if(fr.length>2){const m=fr.reduce((a,b)=>a+b,0)/fr.length;std=Math.sqrt(fr.reduce((a,f)=>a+(f-m)*(f-m),0)/fr.length)}
    return Math.trunc((1-std)*100)}
  // the ported scoring of one pod against the current state (same as src/recompute.py)
  function scorePod(tag,state,g){const P=PROF[tag],B=K.cycbase[tag];
    return ALL.map(n=>{const b=B[n],s=state[n],row={node:n,gpuUsed:s.gpu,gpuFree:b.gpu-s.gpu,filters:[]};
      const tainted=b.taints.length>0;row.filters.push(['TaintToleration',!tainted,tainted?'untolerated taint '+b.taints[0]:'no untolerated taint']);
      const fitOK=b.gpu-s.gpu>=g;row.filters.push(['NodeResourcesFit',fitOK,fitOK?(b.gpu-s.gpu)+' GPUs free, '+g+' asked':'Insufficient example.com/gpu ('+(b.gpu-s.gpu)+' free, '+g+' asked)']);
      row.fits=!tainted&&fitOK;if(!row.fits)return row;
      const vals=P.res.map(([nm,w])=>{let req,cap;if(nm==='cpu'){req=s.nzcpu+POD.cpu;cap=b.cpu}else if(nm==='memory'){req=s.nzmem+POD.mem;cap=b.mem}else{req=s.gpu+g;cap=b.gpu}
        const v=P.type==='LeastAllocated'?Math.floor((cap-req)*100/cap):Math.floor(Math.min(req,cap)*100/cap);return [v,w,nm]});
      row.fitParts={};vals.forEach(v=>row.fitParts[v[2]]=v[0]);
      row.fit=Math.floor(vals.reduce((a,v)=>a+v[0]*v[1],0)/vals.reduce((a,v)=>a+v[1],0));
      const wp=balanced([s.rcpu+POD.cpu,s.rmem+POD.mem],[b.cpu,b.mem]),wo=balanced([s.rcpu,s.rmem],[b.cpu,b.mem]);
      row.balanced=50+Math.floor((50+wp-wo)/2);row.taint=300;row.image=0;row.total=row.taint+row.fit+row.balanced+row.image;return row})}
  function initState(tag){const B=K.cycbase[tag],st={};ALL.forEach(n=>st[n]={nzcpu:B[n].nzcpu,nzmem:B[n].nzmem,rcpu:B[n].rcpu,rmem:B[n].rmem,gpu:B[n].rgpu,pods:[]});return st}
  // run a whole sequence: recorded mode takes the recorded bound node, own mode the first of the ties
  function simulate(tag,seq,recorded){const st=initState(tag),out=[];
    seq.forEach((g,i)=>{const rows=scorePod(tag,st,g),feas=rows.filter(r=>r.fits);let best=null,ties=[];
      if(feas.length){const mx=Math.max(...feas.map(r=>r.total));ties=feas.filter(r=>r.total===mx).map(r=>r.node);best=ties[0]}
      let bound=best;if(recorded){const R=K.scores[tag].steps[i];bound=R?R.bound:best}
      const snap=JSON.parse(JSON.stringify(st));out.push({g,rows,bound,ties,feasible:feas.length,before:snap});
      if(bound){const s=st[bound];s.nzcpu+=POD.cpu;s.nzmem+=POD.mem;s.rcpu+=POD.cpu;s.rmem+=POD.mem;s.gpu+=g;s.pods.push({i,g})}});
    return out}
  let tag='e6spread',src='rec',seq=[2,1,1,2,2,4],sim=[];
  const PH=['Queue','Filter','Score','Select','Bind'];
  const PC=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)'];
  function load(){sim=simulate(tag,seq,src==='rec')}
  function draw(k){const pi=Math.floor(k/5),ph=k%5,S=sim[pi];if(!S)return;
    $('km-cyc-ph').innerHTML='<span class="done">pod p'+(pi+1)+', '+S.g+' GPU'+(S.g>1?'s':'')+'</span>'+PH.map((p,j)=>'<span class="'+(j===ph?'on':(j<ph?'done':''))+'">'+p+'</span>').join('');
    const logged=src==='rec'?K.scores[tag].steps[pi]:null;
    $('km-cyc-nodes').innerHTML=ALL.map(n=>{const r=S.rows.find(x=>x.node===n),b=K.cycbase[tag][n],st=S.before[n];
      const placed=ph>=4&&S.bound===n;let h='<div class="nd'+(ph>=1&&!r.fits?' out':'')+(ph>=3&&S.bound===n?' win':'')+'"><b>'+WN[n]+'</b>';
      if(b.gpu){h+='<div class="slots">';let used=[];st.pods.forEach(p=>{for(let j=0;j<p.g;j++)used.push(PC[p.i%6])});
        for(let j=0;j<4;j++){if(j<used.length)h+='<i class="u" style="background:'+used[j]+'"></i>';else if(placed&&j<used.length+S.g)h+='<i class="n"></i>';else h+='<i></i>'}h+='</div>'}
      else h+='<div class="small mute">no GPUs, '+b.pods+' system pods</div>';
      if(ph>=1)h+=r.filters.map(f=>'<div class="fl">'+f[0]+': <span class="'+(f[1]?'ok':'no')+'">'+(f[1]?'pass':'reject')+'</span> <span class="mute">'+E(f[2])+'</span></div>').join('');
      if(ph>=2&&r.fits){const lg=logged&&logged.rows.find(x=>x.node===n),L=lg&&lg.logged;
        const bar=(nm,v,mx,lv)=>'<div class="row"><span>'+nm+'</span><span class="tr"><span class="fi" style="width:'+Math.max(0,Math.min(100,v/mx*100))+'%"></span></span><span class="v">'+v+(lv!=null?(lv===v?' <span class="chk">&#10003;</span>':' (log '+lv+')'):'')+'</span></div>';
        if(S.feasible===1)h+='<div class="small mute">only feasible node: scoring skipped</div>';
        else h+='<div class="sc">'+bar('Taint x3',r.taint,300,L&&L.taint)+bar('Fit',r.fit,100,L&&L.fit)+bar('Balanced',r.balanced,100,L&&L.balanced)+'</div><div class="tot">total '+r.total+(L?(L.total===r.total?' <span class="chk">&#10003; logged</span>':' (logged '+L.total+')'):'')+'</div>'}
      return h+'</div>'}).join('');
    const free=WK.reduce((a,n)=>a+(K.cycbase[tag][n].gpu-S.before[n].gpu),0);
    const cap=[ 'p'+(pi+1)+' enters the active queue (priority 0, then age). PreEnqueue: no scheduling gate, so it is eligible.',
      S.rows.filter(r=>r.fits).length+' of 4 nodes pass every Filter. '+(S.feasible?'':'None fits: '+free+' GPUs free in total, but not '+S.g+' on one node.'),
      S.feasible>1?'Each feasible node gets each Score plugin\'s 0 to 100, times its weight. '+(tag==='e6spread'?'GPUs are not in the default strategy: NodeResourcesFit sees only CPU and memory.':'GPUs count with weight 5: fuller nodes score higher.'):(S.feasible===1?'One feasible node: the scheduler skips scoring and takes it.':'Nothing to score. PostFilter (preemption) runs: all pods have the same priority, so "No preemption victims found".'),
      S.bound?(S.ties.length>1?'Tie between '+S.ties.map(x=>WN[x]).join(', ')+(src==='rec'?'; the scheduler\'s random draw picked '+WN[S.bound]+'.':'; here the first by name, '+WN[S.bound]+' (the real scheduler draws at random).'):'Highest total: '+WN[S.bound]+'.'):'No node: the pod is Unschedulable and waits for a cluster event (a pod finishing, a node added).',
      S.bound?'Reserve, Permit, then the binding cycle writes the Binding: p'+(pi+1)+' is on '+WN[S.bound]+'.':'"0/4 nodes are available: 1 node(s) had untolerated taint(s), 3 Insufficient example.com/gpu."'];
    $('km-cyc-cap').innerHTML='<div class="t">'+PH[ph]+'</div>'+E(cap[ph])}
  function table(){const a=simulate('e6spread',[2,1,1,2,2,4],true),b=simulate('e6pack',[2,1,1,2,2,4],true);
    const tot=s=>WK.map(n=>{const r=s.rows.find(x=>x.node===n);return r.fits?(s.feasible===1?'(only)':r.total):'x'}).join(', ');
    $('km-cyc-tab').innerHTML=a.map((s,i)=>'<tr><td>p'+(i+1)+'</td><td class="num">'+s.g+'</td><td>'+(s.bound?WN[s.bound]:'<b>Pending</b>')+'</td><td>'+tot(s)+'</td><td>'+(b[i].bound?WN[b[i].bound]:'<b>Pending</b>')+'</td><td>'+tot(b[i])+'</td></tr>').join('')}
  let A=null;
  function init(){if(!$('km-cyc-card'))return;load();table();
    A=RD.anim({card:'km-cyc-card',ctl:'km-cyc-ctl',n:sim.length*5,draw,ms:1100,label:'Pod and phase'});
    RD.seg($('km-cyc-prof'),m=>{tag=m;load();A.reset(sim.length*5)});
    RD.seg($('km-cyc-src'),m=>{src=m;$('km-cyc-own').hidden=m!=='own';if(m==='rec')seq=[2,1,1,2,2,4];else parse();load();A.reset(sim.length*5)});
    $('km-cyc-seq').addEventListener('input',()=>{parse();load();A.reset(sim.length*5)});
    (window.TAB_RENDER=window.TAB_RENDER||{})['t-kmcyc']=[()=>A.redraw()]}
  function parse(){const v=$('km-cyc-seq').value.split(/[^0-9]+/).filter(x=>x).map(Number).filter(x=>x>=1&&x<=4).slice(0,10);
    if(v.length){seq=v;$('km-cyc-seqmsg').textContent=v.length+' pods'}else{seq=[1];$('km-cyc-seqmsg').textContent='enter numbers 1 to 4'}}
  init();
  return {simulate,scorePod};
})();
