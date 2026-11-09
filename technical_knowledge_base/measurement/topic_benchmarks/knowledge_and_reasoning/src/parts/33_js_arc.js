// ---- ARC-AGI: a solver for real tasks and an RHAE calculator (data: window.KR.arc; the exact-match figure is the 3D stage in 37_js_sc_arc.js) ----
(function(){
  const K=window.KR,E=KU.esc,A=KU.a;
  // ---- solver ----
  const tb=document.getElementById('sv-task');
  const ORD=['25ff71a9','3c9b0459','d4f3cd78','007bbfb7','28a6681f'].map(id=>K.arc.find(t=>t.id===id)).filter(Boolean);
  tb.innerHTML=ORD.map((t,i)=>'<button data-m="'+i+'"'+(i?'':' class="on"')+'>'+(t.v==='arc1'?'ARC-AGI-1 ':'ARC-AGI-2 ')+t.id+'</button>').join('');
  const pal=document.getElementById('sv-pal');let col=0;
  pal.innerHTML=KU.ARC.map((c,i)=>'<button data-c="'+i+'" style="background:'+c+'" aria-label="'+KU.ARCN[i]+'" title="'+KU.ARCN[i]+'"'+(i?'':' class="on"')+'></button>').join('');
  pal.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;col=+b.dataset.c;pal.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b))});
  let T=null,ed=null,tries=0,done=false;
  const R=document.getElementById('sv-r'),C=document.getElementById('sv-c'),res=document.getElementById('sv-res'),ans=document.getElementById('sv-ans');
  const edBox=document.getElementById('sv-ed');
  function cellSize(rows,cols){const w=Math.min(360,KU.width(edBox.parentNode.parentNode)-20);return Math.max(9,Math.min(26,Math.floor(w/Math.max(rows,cols))))}
  function drawEd(){const c=cellSize(ed.length,ed[0].length);edBox.innerHTML=KU.grid(ed,c,null,'your output grid');const s=edBox.querySelector('svg');s.classList.add('ed');s.dataset.cs=c}
  function resize(r,c){r=Math.max(1,Math.min(30,r|0));c=Math.max(1,Math.min(30,c|0));const n=[];for(let i=0;i<r;i++){n.push([]);for(let j=0;j<c;j++)n[i].push(ed&&ed[i]&&ed[i][j]!=null?ed[i][j]:0)}ed=n;R.value=r;C.value=c;drawEd()}
  function load(i){T=ORD[i];tries=0;done=false;res.textContent='';ans.innerHTML='';
    document.getElementById('sv-meta').innerHTML=(T.v==='arc1'?'ARC-AGI-1 training set':'ARC-AGI-2 public evaluation set')+', task '+T.id+': '+T.train.length+' demonstrations. '+A('task file',T.url)+'. Two attempts.';
    const dc=Math.max(...T.train.flatMap(p=>[p.input.length,p.input[0].length,p.output.length,p.output[0].length]))>6?(KU.width(tb)<460?6:9):(KU.width(tb)<460?11:15);
    document.getElementById('sv-demos').innerHTML=T.train.map((p,j)=>'<div class="pair">'+KU.grid(p.input,dc,null,'demo '+(j+1)+' input')+'<span class="ar">→</span>'+KU.grid(p.output,dc,null,'demo '+(j+1)+' output')+'</div>').join('');
    const ti=T.test[0].input,ic=Math.max(9,Math.min(22,Math.floor(300/Math.max(ti.length,ti[0].length))));
    document.getElementById('sv-in').innerHTML=KU.grid(ti,ic,null,'test input');
    ed=null;resize(ti.length,ti[0].length)}
  // painting
  let painting=false;
  function paintAt(e){const s=edBox.querySelector('svg');if(!s||done)return;const r=s.getBoundingClientRect(),cs=+s.dataset.cs*(r.width/s.viewBox.baseVal.width);
    const x=Math.floor((e.clientX-r.left)/cs),y=Math.floor((e.clientY-r.top)/cs);if(y>=0&&y<ed.length&&x>=0&&x<ed[0].length&&ed[y][x]!==col){ed[y][x]=col;drawEd()}}
  edBox.addEventListener('pointerdown',e=>{painting=true;paintAt(e)});addEventListener('pointerup',()=>painting=false);
  edBox.addEventListener('pointermove',e=>{if(painting)paintAt(e)});
  R.addEventListener('change',()=>resize(+R.value,+C.value));C.addEventListener('change',()=>resize(+R.value,+C.value));
  document.getElementById('sv-copy').addEventListener('click',()=>{if(done)return;ed=T.test[0].input.map(r=>r.slice());R.value=ed.length;C.value=ed[0].length;drawEd()});
  document.getElementById('sv-clr').addEventListener('click',()=>{if(done)return;ed=ed.map(r=>r.map(()=>0));drawEd()});
  document.getElementById('sv-sub').addEventListener('click',()=>{if(done)return;const exp=T.test[0].output;tries++;
    const same=ed.length===exp.length&&ed[0].length===exp[0].length&&ed.every((r,i)=>r.every((v,j)=>v===exp[i][j]));
    let wrong=0;if(ed.length===exp.length&&ed[0].length===exp[0].length)ed.forEach((r,i)=>r.forEach((v,j)=>{if(v!==exp[i][j])wrong++}));
    if(same){done=true;res.innerHTML='<b style="color:var(--good)">Solved on attempt '+tries+'.</b> Exact match.'}
    else if(tries>=2){done=true;res.innerHTML='<b style="color:var(--bad)">Not solved in two attempts.</b> '+(ed.length!==exp.length||ed[0].length!==exp[0].length?'The grid size is wrong ('+exp.length+'×'+exp[0].length+' expected).':wrong+' cell'+(wrong>1?'s':'')+' wrong.')+' The answer:';
      const c=cellSize(exp.length,exp[0].length);ans.innerHTML=KU.grid(exp,c,(i,j)=>ed[i]&&ed[i][j]!==exp[i][j]?'#ff2d55':null,'answer')}
    else res.innerHTML='Attempt 1 failed'+(ed.length!==exp.length||ed[0].length!==exp[0].length?' (grid size is part of the answer)':'')+'. One attempt left. No cell-level feedback: ARC tells you only right or wrong.'});
  KU.seg(tb,m=>load(+m));
  load(0);
  // ---- RHAE calculator ----
  const PRE={human:{h:[8,12,20,25,40],a:[8,12,20,25,40],d:[1,1,1,1,1]},two:{h:[8,12,20,25,40],a:[16,24,40,50,80],d:[1,1,1,1,1]},
    ten:{h:[8,12,20,25,40],a:[8,12,20,25,400],d:[1,1,1,1,1]},stop:{h:[8,12,20,25,40],a:[8,12,20,0,0],d:[1,1,1,0,0]},fast:{h:[8,12,20,25,40],a:[4,6,10,12,20],d:[1,1,1,1,1]}};
  const tbl=document.getElementById('rh-t'),out=document.getElementById('rh-out');
  function rhRows(p){tbl.innerHTML='<tr><th>Level = weight</th><th>Human baseline</th><th>Agent actions</th><th>Done</th><th>Level score</th></tr>'+
    p.h.map((h,i)=>'<tr><td>'+(i+1)+'</td><td><input type="number" min="1" value="'+h+'" data-k="h" data-i="'+i+'" aria-label="human actions level '+(i+1)+'"></td><td><input type="number" min="1" value="'+(p.a[i]||'')+'" data-k="a" data-i="'+i+'" aria-label="agent actions level '+(i+1)+'"></td><td><input type="checkbox" data-k="d" data-i="'+i+'"'+(p.d[i]?' checked':'')+' aria-label="level '+(i+1)+' completed"></td><td class="sc" id="rh-s'+i+'"></td></tr>').join('');calc()}
  function calc(){const v=k=>[...tbl.querySelectorAll('[data-k="'+k+'"]')].map(x=>k==='d'?x.checked:+x.value);
    const h=v('h'),a=v('a'),d=v('d');let cap=0,sum=0,W=0;let stop=false;
    h.forEach((hh,i)=>{const w=i+1;W+=w;const ok=d[i]&&!stop&&a[i]>0&&hh>0;if(!d[i])stop=true;// levels are sequential
      const S=ok?Math.min(1.15,Math.pow(hh/a[i],2)):0;if(ok)cap+=w;sum+=w*S;
      document.getElementById('rh-s'+i).textContent=ok?(100*S).toFixed(1)+'%':'0 (not completed)'});
    const Eg=Math.min(cap,sum)/W;
    out.innerHTML=KU.stat('Game score E',(100*Eg).toFixed(1)+'%','min(completed weight, Σ w·S) / 15')+KU.stat('Uncapped Σ w·S / 15',(100*sum/W).toFixed(1)+'%')+KU.stat('Cap: completed weight / 15',(100*cap/W).toFixed(1)+'%')+
      KU.stat('If every game looked like this','benchmark = '+(100*Eg).toFixed(1)+'%','mean of game scores')}
  tbl.addEventListener('input',calc);tbl.addEventListener('change',calc);
  KU.seg(document.getElementById('rh-pre'),m=>rhRows(PRE[m]));
  rhRows(PRE.human);
  KU.onResize('t-read',()=>drawEd());
})();
