// ---- Sharing a GPU tab: MIG placement on an A100 40GB, with NVIDIA's published placements (nvidia-smi mig -lgipp) ----
(function(){
  const $=id=>document.getElementById(id);if(!$('mg-gpu'))return;
  const P=[{id:19,n:'1g.5gb',c:1,s:1,at:[0,1,2,3,4,5,6],gb:5},{id:20,n:'1g.5gb+me',c:1,s:1,at:[0,1,2,3,4,5,6],gb:5,max:1},{id:15,n:'1g.10gb',c:1,s:2,at:[0,2,4,6],gb:10},
    {id:14,n:'2g.10gb',c:2,s:2,at:[0,2,4],gb:10},{id:9,n:'3g.20gb',c:3,s:4,at:[0,4],gb:20},{id:5,n:'4g.20gb',c:4,s:4,at:[0],gb:20},{id:0,n:'7g.40gb',c:7,s:8,at:[0],gb:40}];
  const PRE=[['4-2-1 (example 1)',[[5,0],[14,4],[19,6]]],['3-2-1-1 (example 2)',[[9,4],[19,0],[19,1],[14,2]]],['2-1-1-1-1-1 (example 3)',[[14,4],[19,0],[19,1],[19,2],[19,3],[19,6]]],['7 x 1g.5gb',[[19,0],[19,1],[19,2],[19,3],[19,4],[19,5],[19,6]]],['1-1-2, then 3g (the failing order)',[[19,6],[19,5],[14,2]]]];
  let inst=[],sel=null,msg='Pick a profile above.',bad=false;
  const prof=id=>P.find(p=>p.id===id);
  const used=()=>{const u=Array(8).fill(null);inst.forEach((x,k)=>{const p=prof(x.id);for(let j=x.at;j<x.at+p.s;j++)u[j]=k});return u};
  const comp=()=>inst.reduce((a,x)=>a+prof(x.id).c,0);
  function free(p){const u=used();if(p.max&&inst.filter(x=>x.id===p.id).length>=p.max)return[];if(comp()+p.c>7)return[];
    return p.at.filter(a=>{for(let j=a;j<a+p.s;j++)if(j>7||u[j]!==null)return false;return true})}
  function render(){
    $('mg-prof').innerHTML='<span class="small mute" style="align-self:center">Add:</span>'+P.map(p=>'<button data-id="'+p.id+'"'+(sel===p.id?' class="on"':'')+'>'+p.n+'</button>').join('');
    const u=used(),p=sel===null?null:prof(sel),fr=p?free(p):[];let h='',j=0;
    while(j<8){if(u[j]!==null){const x=inst[u[j]],q=prof(x.id);h+='<div class="inst" style="grid-column:'+(j+1)+' / span '+q.s+'" data-k="'+u[j]+'" title="Click to remove"><b>'+q.n+'</b><span>'+x.at+':'+q.s+'</span></div>';j+=q.s;continue}
      if(p&&fr.indexOf(j)>=0){h+='<button class="cand" style="grid-column:'+(j+1)+' / span '+p.s+'" data-at="'+j+'">place at '+j+'</button>';j+=p.s;continue}
      h+='<div class="sl">free</div>';j++}
    $('mg-gpu').innerHTML=h;$('mg-axis').innerHTML=[0,1,2,3,4,5,6,7].map(k=>'<span>slice '+k+'</span>').join('');
    if(p&&!fr.length&&!bad){msg='No valid position for '+p.n+' now: '+(comp()+p.c>7?'it would need '+(comp()+p.c)+' compute slices of 7.':p.max&&inst.some(x=>x.id===p.id)?'only one may exist.':'its allowed starts {'+p.at.join(',')+'} are all blocked by placed instances (fragmentation).');bad=true}
    const m=$('mg-msg');m.textContent=msg;m.className='msg'+(bad?' bad':'');
    const mem=inst.reduce((a,x)=>a+prof(x.id).gb,0),ms=u.filter(x=>x!==null).length;
    $('mg-stats').innerHTML=RD.stat('Instances',inst.length,'GPU instances')+RD.stat('Compute slices',comp()+' / 7','SM groups')+RD.stat('Memory slices',ms+' / 8',mem+' GB in profiles')+RD.stat('CUDA devices',inst.length||'(whole GPU)','one per instance');}
  $('mg-prof').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;sel=+b.dataset.id;bad=false;const p=prof(sel);const fr=free(p);msg=fr.length?p.n+': '+p.c+' compute slice'+(p.c>1?'s':'')+', '+p.s+' memory slice'+(p.s>1?'s':'')+'. Allowed starts {'+p.at.join(',')+'}; free now: {'+fr.join(',')+'}.':'';render()});
  $('mg-gpu').addEventListener('click',e=>{const c=e.target.closest('.cand'),i=e.target.closest('.inst');
    if(c){inst.push({id:sel,at:+c.dataset.at});msg='Placed '+prof(sel).n+' at '+c.dataset.at+':'+prof(sel).s+'.';bad=false;render()}
    else if(i){const x=inst[+i.dataset.k];inst.splice(+i.dataset.k,1);msg='Removed '+prof(x.id).n+' from '+x.at+'.';bad=false;render()}});
  $('mg-pre').insertAdjacentHTML('beforeend',PRE.map((p,k)=>'<button data-k="'+k+'">'+p[0]+'</button>').join(''));
  $('mg-pre').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const pr=PRE[+b.dataset.k];inst=pr[1].map(x=>({id:x[0],at:x[1]}));sel=null;bad=false;
    msg=+b.dataset.k===4?'The guide created 1g.5gb, 1g.5gb, 2g.10gb and then 3g.20gb, which failed with "Insufficient Resources". It did not print where the driver put the first three; 6, 5 and 2 here are an illustrative placement (the driver put a first 1g.5gb at 6 in examples 1 and 3). Now pick 3g.20gb: neither of its starts, 0 or 4, is free.':'Geometry from the guide\'s example: placements as nvidia-smi mig -lgi printed them.';render()});
  render();
})();
