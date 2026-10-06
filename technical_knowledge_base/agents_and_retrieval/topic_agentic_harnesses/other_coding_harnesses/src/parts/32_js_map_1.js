// ---- Repo map lab (t-map): Aider's real PageRank output on mini-SWE-agent's source, three scenarios, four budgets ----
(function(){
  const D=window.HM_DATA;if(!D)return;
  const $=id=>document.getElementById(id),esc=RD.esc;
  const F=D.files.map(f=>f[0]);
  const ORDER=['cold','chat','chat_ident'];
  const CAP={
    cold:'Nothing in the chat and no message: PageRank restarts uniformly, so files whose names are used everywhere rank highest. utils/serialize.py leads with 0.130.',
    chat:'agents/default.py is added to the chat: it gets a restart weight of 100/59 = 1.69 and its outgoing edges are multiplied by 50, so the files it uses climb. It is now sent in full and left out of the map.',
    chat_ident:'Same, plus the message "Make DockerEnvironment retry when docker exec times out": environments/docker.py and models/utils/retry.py get restart weight 3.39 each (name match plus path match), so both jump into the top three.'};
  let sc='cold',bud='1024',all=false;
  const shown=t=>{const s=new Set();t.split('\n').forEach(l=>{if(l.endsWith(':')&&!/^[\s│⋮]/.test(l))s.add(l.slice(0,-1))});return s};
  function draw(){
    const S=D.sc[sc],M=S.maps[bud],inMap=shown(M.text),chat=new Set(S.chat);
    const mx=Math.max(...ORDER.map(k=>Math.max(...D.sc[k].rank)));
    // rows persist; rank changes move them: by rank in the current scenario
    const idx=F.map((f,i)=>i).filter(i=>S.rank[i]>0).sort((a,b)=>S.rank[b]-S.rank[a]);
    const H=20,shownN=all?idx.length:Math.min(20,idx.length),box=$('hm-bars');
    if(!box.dataset.built){box.style.position='relative';box.innerHTML=F.map((f,i)=>'<div class="row" data-f="'+i+'" title="'+esc(f)+'" style="position:absolute;left:0;right:0;top:0;transition:transform .7s ease,opacity .5s"><span class="nm">&lrm;'+esc(f)+'&lrm;</span><span class="track"><span class="fill"></span></span><span class="val"></span></div>').join('');box.dataset.built=1}
    box.style.height=(shownN*H)+'px';
    const pos={};idx.forEach((i,k)=>pos[i]=k);
    box.querySelectorAll('.row').forEach(row=>{const i=+row.dataset.f,f=F[i],r=S.rank[i],k=pos[i];
      const vis=k!=null&&k<shownN;row.style.opacity=vis?1:0;row.style.pointerEvents=vis?'':'none';row.style.transform='translateY('+((k==null?idx.length:k)*H)+'px)';
      row.classList.toggle('mv',S.mentioned.includes(f)||chat.has(f));
      const fl=row.querySelector('.fill');fl.className='fill '+(chat.has(f)?'chat':(inMap.has(f)?'in':'out'));fl.style.width=(100*(r||0)/mx).toFixed(1)+'%';
      row.querySelector('.val').textContent=(r||0).toFixed(3)});
    $('hm-all').textContent=all?'Show the top 20 only':'Show all '+idx.length+' ranked files';
    $('hm-text').textContent=M.text;
    $('hm-tok').textContent=' map is '+M.tokens.toLocaleString('en-US')+' tokens ('+M.chars.toLocaleString('en-US')+' characters), '+inMap.size+' files';
    $('hm-cap').textContent=CAP[sc];
    document.querySelectorAll('#hm-seg button').forEach(b=>b.classList.toggle('on',b.dataset.m===sc));
  }
  const A=RD.anim({card:'hm-card',ctl:'hm-anim',n:3,ms:2600,tab:'t-map',label:'Scenario',draw:i=>{sc=ORDER[i];draw()}});
  $('hm-seg').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;A.go(ORDER.indexOf(b.dataset.m))});
  $('hm-bud').addEventListener('change',e=>{bud=e.target.value;draw()});
  $('hm-all').addEventListener('click',()=>{all=!all;draw()});
  draw();
})();
