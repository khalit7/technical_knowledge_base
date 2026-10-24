// ---- The process-tree simulator (Linux rules and OSTEP fork.py rules), used in Reading section 5 ----
window.TREESIM=(function(){
  // mode: 'linux' | 'ostep' | 'ostepR' | 'ostepL'; opts: {reap: PID 1 reaps, sub: set of subreaper names}
  function run(actions,mode,opts){
    opts=opts||{};const sub=opts.sub||{};
    const root='a',ch={a:[]},par={},z={},alive={a:true},states=[];
    const snap=(say,act,ok)=>states.push({ch:JSON.parse(JSON.stringify(ch)),z:Object.assign({},z),say,act,ok,alive:Object.assign({},alive)});
    snap('Process a (PID 1) exists.','',true);
    const collect=p=>{let L=[p];(ch[p]||[]).forEach(c=>{L=L.concat(collect(c))});return L};
    for(const raw of actions){
      const a=raw.trim();if(!a)continue;let m;
      if((m=a.match(/^(\w+)\+(\w+)$/))){const [_,p,c]=m;if(!alive[p]){snap(a+': '+p+' is not a live process (ignored)',a,false);continue}
        if(ch[c]||alive[c]||z[c]){snap(a+': the name '+c+' is already used (ignored)',a,false);continue}
        ch[p].push(c);ch[c]=[];par[c]=p;alive[c]=true;snap(p+' forks '+c+'.',a,true);continue}
      if((m=a.match(/^(\w+)-$/))){const p=m[1];if(!alive[p]){snap(a+': '+p+' is not a live process (ignored)',a,false);continue}
        if(p===root){snap('a is PID 1: if it exits, the kernel kills everything in the namespace. Not allowed here.',a,false);continue}
        const ep=par[p];
        if(mode==='ostepL'&&ch[p].length){snap(p+' EXITS (failed: has children), as fork.py -L reports.',a,false);continue}
        if(mode==='ostep'){const d=collect(p).slice(1);d.forEach(x=>{ch[x]=[];par[x]=root;ch[root].push(x)});ch[ep].splice(ch[ep].indexOf(p),1);delete ch[p];delete alive[p];
          snap(p+' exits; fork.py moves all '+d.length+' descendant(s) directly under a.',a,true);continue}
        if(mode==='ostepR'||mode==='ostepL'){const kids=ch[p].slice();kids.forEach(x=>{par[x]=ep;ch[ep].push(x)});ch[ep].splice(ch[ep].indexOf(p),1);delete ch[p];delete alive[p];
          snap(p+' exits; its children ('+(kids.join(', ')||'none')+') move to its parent '+ep+'.',a,true);continue}
        // linux
        const kids=ch[p].filter(x=>alive[x]||z[x]);
        let reaper=root;for(let q=ep;q;q=par[q]){if(sub[q]&&alive[q]){reaper=q;break}}
        kids.forEach(x=>{par[x]=reaper;ch[reaper].push(x)});ch[p]=[];alive[p]=false;z[p]=true;
        let say=p+' exits and is a zombie until '+ep+' waits.'+(kids.length?' Its children ('+kids.join(', ')+') are adopted by '+reaper+(reaper===root?' (PID 1)':' (subreaper)')+'.':'');
        // PID 1 that reaps: collect its zombies (including adopted zombies)
        if(opts.reap){ch[root].filter(x=>z[x]).forEach(x=>{ch[root].splice(ch[root].indexOf(x),1);delete z[x];delete ch[x];say+=' PID 1 reaps '+x+'.'})}
        snap(say,a,true);continue}
      if((m=a.match(/^(\w+)\*$/))){const p=m[1];if(!alive[p]){snap(a+': '+p+' is not a live process (ignored)',a,false);continue}
        if(mode!=='linux'){snap(a+': fork.py has no wait; ignored in OSTEP modes.',a,false);continue}
        const zs=ch[p].filter(x=>z[x]);zs.forEach(x=>{ch[p].splice(ch[p].indexOf(x),1);delete z[x];delete ch[x]});
        snap(p+' calls wait: '+(zs.length?'reaps '+zs.join(', ')+'.':'no exited children to reap.'),a,true);continue}
      snap('Could not read "'+a+'": use x+y, x- or x*.',a,false);
    }
    return states;
  }
  function flat(st){const out=[];const walk=(p,d)=>{out.push([d,p]);(st.ch[p]||[]).forEach(c=>walk(c,d+1))};walk('a',0);return out}
  return {run,flat};
})();
(function(){
  // ---- Reading 5: the process-tree simulator (moved from the old Process lab tab) ----
  if(!document.getElementById('rd-tree-card')||!window.RD)return;
  const $=id=>document.getElementById(id);
  const tin=$('rd-tree-in'),tout=$('rd-tree-out'),tcap=$('rd-tree-cap'),tcnt=$('rd-tree-cnt');
  let mode='linux',tst=[];
  function compute(){tst=TREESIM.run(tin.value.split(','),mode,{reap:$('rd-tree-reap').checked,sub:$('rd-tree-sub').checked?{b:true}:{}})}
  function tdraw(i){const s=tst[Math.min(i,tst.length-1)],prev=i>0?tst[i-1]:null;
    const lines=TREESIM.flat(s).map(([d,p])=>{const isZ=s.z[p],isNew=prev&&!TREESIM.flat(prev).some(x=>x[1]===p);
      return '<span class="'+(isZ?'z':'')+(isNew?' new':'')+'">'+'   '.repeat(d)+(d?'\u2514\u2500 ':'')+p+(p==='a'?' (PID 1)':'')+(isZ?' [Z]':'')+'</span>'});
    tout.innerHTML=lines.join('\n');
    const nz=Object.keys(s.z).length,live=Object.keys(s.alive).filter(k=>s.alive[k]).length;
    tcnt.innerHTML=RD.stat('Live processes',live,'')+RD.stat('Zombies',nz,mode==='linux'?'exited, not yet waited for':'fork.py has no zombies');
    tcap.innerHTML='<div class="t">Step '+(i+1)+' of '+tst.length+(s.act?': <code>'+RD.esc(s.act)+'</code>':'')+'</div><p'+(s.ok?'':' class="bad"')+'>'+RD.esc(s.say)+'</p>'}
  compute();
  const T=RD.anim({card:'rd-tree-card',ctl:'rd-tree-ctl',n:tst.length,draw:tdraw,ms:1500,label:'Step of the process tree'});
  const rerun=()=>{compute();T.reset(tst.length);T.go(tst.length-1)};
  RD.seg($('rd-tree-mode'),m=>{mode=m;rerun()});
  ['rd-tree-reap','rd-tree-sub'].forEach(id=>$(id).addEventListener('change',rerun));
  // Run (a reader action): recompute and play from step 1
  $('rd-tree-go').addEventListener('click',()=>{compute();T.reset(tst.length);T.play()});
  let seed=7;const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648};
  $('rd-tree-rand').addEventListener('click',()=>{
    // illustrative random actions from this page's own generator (not Python's random, so not fork.py's seeds)
    const names='bcdefghijklmnopqrstuvwxyz'.split('');let live=['a'],k=0;const acts=[];
    for(let n=0;n<10;n++){if(rnd()<0.65||live.length===1){const p=live[Math.floor(rnd()*live.length)],c=names[k++];acts.push(p+'+'+c);live.push(c)}
      else{const cand=live.filter(x=>x!=='a');const v=cand[Math.floor(rnd()*cand.length)];acts.push(v+'-');live=live.filter(x=>x!==v)}}
    tin.value=acts.join(',');rerun()});
  // check against recorded fork.py runs
  $('rd-tree-check').addEventListener('click',()=>{
    let ok=0;const log=[];
    PD.ostep.forEach(c=>{const md=c.flags==='-R'?'ostepR':c.flags==='-L'?'ostepL':'ostep';const st=TREESIM.run(c.actions.split(','),md,{});
      const got=TREESIM.flat(st[st.length-1]),same=JSON.stringify(got)===JSON.stringify(c.final);if(same)ok++;
      log.push((same?'match ':'DIFF  ')+'seed '+c.seed+' '+(c.flags||'(default)')+'  '+c.actions)});
    $('rd-tree-checkout').innerHTML='<span class="'+(ok===PD.ostep.length?'ok':'bad')+'">'+ok+' of '+PD.ostep.length+' final trees match</span> fork.py\'s own output (seeds 1 to 12, 10 actions, fork rate 0.6, default, -R and -L).';
    const L=$('rd-tree-checklog');L.hidden=false;L.textContent=log.join('\n')});
})();
