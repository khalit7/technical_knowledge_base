// ---- The toy world (mirrors grammar.py): facts, restatements, the three tasks ----
(function(g){
  const NAMES=['ann','bob','cal','dee','eve','fay','gus','hal'],COLOURS=['red','blue','green','gold','grey','pink'],OBJECTS=['cup','box','hat','key','pen','bag'];
  const pick=(r,a)=>a[Math.floor(r()*a.length)];
  function sample(r,a,k){const b=a.slice(),o=[];for(let i=0;i<k;i++){o.push(b.splice(Math.floor(r()*b.length),1)[0])}return o}
  function facts(r){const k=2+Math.floor(r()*2);return sample(r,NAMES,k).map(n=>[n,pick(r,COLOURS),pick(r,OBJECTS)])}
  const factWords=fs=>fs.flatMap(([n,c,o])=>[n,c,o,'.']);
  // a generate prompt: facts, zero to two restatements, then "so <name>"; answer "<colour> <object> ."
  function prompt(r){const fs=facts(r),pre=[];const nr=Math.floor(r()*3);for(let i=0;i<nr;i++){const f=pick(r,fs);pre.push('so',f[0],f[1],f[2],'.')}
    const ask=pick(r,fs);return {facts:fs,pre,ask:ask[0],words:factWords(fs).concat(pre,['so',ask[0]]),answer:[ask[1],ask[2],'.']}}
  // the right answer for any name in a fact list
  const answerOf=(fs,name)=>{const f=fs.find(x=>x[0]===name);return f?[f[1],f[2],'.']:null};
  g.LANG={NAMES,COLOURS,OBJECTS,facts,factWords,prompt,answerOf};
})(typeof window!=='undefined'?window:globalThis);
