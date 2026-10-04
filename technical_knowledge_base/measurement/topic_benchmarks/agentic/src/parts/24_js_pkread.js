// ---- pass^k and pass@k from real tau2-bench trials (shared helpers + the Reading animation) ----
window.PK=(function(){
  const C=(n,k)=>{if(k<0||k>n)return 0;let r=1;for(let i=1;i<=k;i++)r=r*(n-k+i)/i;return r};
  const tasks=s=>{const o=[];for(let i=0;i<s.tr.length;i+=4)o.push(s.tr.slice(i,i+4));return o};
  const cnt=t=>{let c=0;for(const ch of t)if(ch==='1')c++;return c};
  const hat=(c,n,k)=>C(c,k)/C(n,k), at=(c,n,k)=>1-C(n-c,k)/C(n,k);
  function metric(s,k,kind){const T=tasks(s);let sum=0;for(const t of T){const c=cnt(t);sum+=kind==='at'?at(c,4,k):hat(c,4,k)}return 100*sum/T.length}
  function hist(s){const h=[0,0,0,0,0];tasks(s).forEach(t=>h[cnt(t)]++);return h}
  const label=s=>s.m+(s.eff&&s.eff!=='None'?' ('+s.eff+')':'');
  const ok=()=>AG.tau.filter(s=>s.ok);
  return {C,tasks,cnt,hat,at,metric,hist,label,ok};
})();

(function(){
  const fig=document.getElementById('an2-fig');if(!fig)return;
  const sel=document.getElementById('an2-set');
  const sets=PK.ok();
  sets.forEach((s,i)=>{const o=document.createElement('option');o.value=i;o.textContent=s.domn+': '+PK.label(s)+' ('+s.date+')';sel.appendChild(o)});
  let si=Math.max(0,sets.findIndex(s=>s.m==='GPT-5.2'&&s.dom==='retail'&&s.eff==='high'));sel.value=si;
  let kind='hat';
  // steps: 0 raw trials, 1 grouped, then k = 1..4
  const N=6;
  function draw(i){
    const s=sets[si],T=PK.tasks(s),h=PK.hist(s),nT=T.length;
    const k=i<2?1:i-1;
    const W=RD.width(fig),cols=5,gap=8;
    const per=Math.max(4,Math.ceil(Math.max(...h)/12)); // squares per row in a column
    const colW=(W-gap*(cols-1))/cols;const sq=Math.max(5,Math.min(16,Math.floor(colW/per)-1));
    const rowsMax=Math.ceil(Math.max(...h)/per);
    const top=34,H=top+rowsMax*(sq+1)+30;
    let b='';
    if(i===0){
      // raw: every task as 4 cells in submission order
      const per0=Math.max(1,Math.floor(W/(4*5+6)));const cw=5;const rows=Math.ceil(nT/per0);
      const H0=Math.max(H,top+rows*(cw+3)+10);
      for(let j=0;j<nT;j++){const x=(j%per0)*(4*cw+6),y=top+Math.floor(j/per0)*(cw+3);
        for(let q=0;q<4;q++)b+='<rect x="'+(x+q*cw)+'" y="'+y+'" width="'+(cw-1)+'" height="'+(cw-1)+'" fill="'+(T[j][q]==='1'?'var(--good)':'var(--bad)')+'"/>'}
      b+=RD.t(0,16,nT+' tasks &times; 4 trials, in file order (green: reward 1, orange: 0)',{fs:12,fill:'var(--mute)'});
      fig.innerHTML=RD.svg(W,H0,b,'Raw trials');
    }else{
      for(let c=0;c<5;c++){
        const x0=c*(colW+gap);
        b+=RD.t(x0+colW/2,14,c+' of 4',{a:'middle',fs:12,w:600});
        b+=RD.t(x0+colW/2,28,h[c]+' task'+(h[c]===1?'':'s'),{a:'middle',fs:11,fill:'var(--mute)'});
        const f=i===1?(c/4):(kind==='at'?PK.at(c,4,k):PK.hat(c,4,k));
        for(let j=0;j<h[c];j++){const x=x0+(j%per)*(sq+1),y=top+Math.floor(j/per)*(sq+1);
          b+='<rect x="'+x+'" y="'+y+'" width="'+sq+'" height="'+sq+'" fill="var(--soft)" stroke="var(--line)"/>';
          if(f>0)b+='<rect x="'+x+'" y="'+(y+sq*(1-f))+'" width="'+sq+'" height="'+(sq*f)+'" fill="'+(kind==='at'&&i>1?'var(--c4)':'var(--c1)')+'"/>'}
        b+=RD.t(x0+colW/2,H-8,'counts '+(+f.toFixed(3))+' each',{a:'middle',fs:10.5,fill:'var(--mute)'});
      }
      fig.innerHTML=RD.svg(W,H,b,'Tasks grouped by successes out of 4');
    }
    const v1=PK.metric(s,1,'hat'),vk=PK.metric(s,k,kind),hatk=PK.metric(s,k,'hat'),atk=PK.metric(s,k,'at');
    const name=kind==='at'?'pass@'+k:'pass^'+k;
    const caps=[
      ['The raw trials','Sierra released every trajectory behind this leaderboard entry. Each task was run 4 times with the same user instructions and database; only the sampling of the agent and the simulated user differs.'],
      ['Group the tasks by how often they passed','Each task moves to the column of its success count. pass^1 is the average fill: every task counts c/4. That is the number most tables print.'],
    ];
    const capK=kind==='hat'?
      ['k = '+k+': '+name+', every one of '+k+' tries must pass','A task with c successes counts C(c,'+k+')/C(4,'+k+'), the chance that '+k+' of its 4 recorded trials drawn without replacement all passed.'+(k===4?' At k = 4 only the 4-of-4 column counts at all.':'')]:
      ['k = '+k+': '+name+', any one of '+k+' tries may pass','A task with c successes counts 1 &minus; C(4&minus;c,'+k+')/C(4,'+k+'). Columns 1 to 3 fill up: the best case rewards a task solved once.'];
    const cap=i<2?caps[i]:capK;
    document.getElementById('an2-cap').innerHTML='<div class="t">'+cap[0]+'</div><p>'+cap[1]+'</p>';
    const pubTxt=(k>=1&&s.pub[k-1]!=null)?s.pub[k-1].toFixed(2)+'%':'';
    document.getElementById('an2-cnt').innerHTML=RD.stat('k',i<2?1:k,'')+RD.stat(i<2?'pass^1':name,vk.toFixed(2)+'%',i<2?'mean success':'computed from the trials')+
      RD.stat('pass^'+k+' published',(i<2?s.pub[0].toFixed(2):s.pub[k-1].toFixed(2))+'%','leaderboard ('+s.by+')')+
      RD.stat('Gap to pass^1',(vk-v1>=0?'+':'&minus;')+Math.abs(vk-v1).toFixed(2)+' pts',kind==='at'?'best case':'reliability')+
      RD.stat('Tasks solved 4 of 4',h[4]+' of '+nT,'');
  }
  const A=RD.anim({card:'an2',ctl:'an2-ctl',n:N,draw,ms:2200,label:'Step'});
  document.querySelectorAll('#an2-mode button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('#an2-mode button').forEach(x=>x.classList.toggle('on',x===b));kind=b.dataset.m;A.redraw()}));
  sel.addEventListener('change',()=>{si=+sel.value;A.redraw()});
  RD.onResize(()=>A.redraw());
  // the real airline task card
  const tc=document.getElementById('rd-tau-task');
  if(tc){const t=AG.tauTask,E=RD.esc;
    const op=AG.tau.filter(s=>s.ok&&s.dom==='airline').map(s=>{const v=PK.tasks(s)[0];return PK.label(s)+' '+v.split('').map(x=>x==='1'?'&#10003;':'&#10007;').join('')}).join('; ');
    tc.innerHTML='<div class="kv"><dt>Purpose</dt><dd>'+E(t.purpose)+'</dd><dt>Simulated user is told</dt><dd>'+E(t.reason)+' '+E(t.known)+'</dd><dt>and, if refused</dt><dd>'+E(t.instr)+'</dd>'+
      '<dt>Checked</dt><dd>reward basis '+t.basis.join(' + ')+'; expected actions: '+(t.actions.length?t.actions.length:'none (the database must not change)')+'; statement: "'+E(t.nl[0])+'"</dd>'+
      '<dt>Trials (4 each)</dt><dd>'+op+'</dd></div><p class="mute" style="margin:4px 0 0">From the released airline trajectory files (Sierra submissions, Feb to Mar 2026); the task is the same for every model.</p>'}
})();
