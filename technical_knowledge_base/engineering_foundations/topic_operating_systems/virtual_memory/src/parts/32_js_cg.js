// ---- Memory replay tab: four measured cgroup runs, replayed; and the oom_badness calculator ----
(function(){
  const $=id=>document.getElementById(id);if(!$('cg-card'))return;
  const D=window.VM_DATA,CG=D.cg,esc=RD.esc;
  const fmt=(x,d)=>Number(x).toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  const SC=[['pagecache','Page cache only','A 768 MiB file is written, then read twice, in a 512 MiB container without swap.'],
    ['anon_oom','Grow until killed','A 256 MiB file is cached, then a process allocates 32 MiB every 0.15 s; no swap.'],
    ['swap','Swap allowed','A process allocates 640 MiB in 64 MiB steps and then walks it 3 times; 512 MiB of swap allowed.'],
    ['shm','/dev/shm counts','320 MiB is written to /dev/shm (as DataLoader workers do), then a process allocates 320 MiB; no swap.']];
  let cur='pagecache';
  $('cg-mode').innerHTML=SC.map(s=>'<button data-m="'+s[0]+'"'+(s[0]===cur?' class="on"':'')+'>'+s[1]+'</button>').join('');
  const COL={anon:'var(--c3)',file:'var(--c1)',shmem:'var(--c4)',swap:'var(--c5)'};
  $('cg-leg').innerHTML='<span style="--sw:var(--c3)">anon</span><span style="--sw:var(--c1)">file (page cache)</span><span style="--sw:var(--c4)">shmem (/dev/shm)</span><span style="--sw:var(--c5)">swap (dashed line)</span><span style="--sw:var(--bad)">memory.max</span>';
  const LIM=512*1024;
  function chart(i){const d=CG[cur],S=d.samples,W=Math.max(280,Math.min(880,$('cg-svg').clientWidth||600)),Hh=W<500?200:240,pl=40,pr=8,pt=8,pb=24;
    const tmax=S[S.length-1][0],ymax=Math.max(LIM,...S.map(s=>s[1]),...S.map(s=>s[5]))*1.08;
    const x=t=>pl+(W-pl-pr)*t/tmax,y=v=>pt+(Hh-pt-pb)*(1-v/ymax);
    const area=(lo,hi,c)=>{let p='M'+x(S[0][0])+','+y(hi(S[0]));S.forEach(s=>p+='L'+x(s[0]).toFixed(1)+','+y(hi(s)).toFixed(1));for(let k=S.length-1;k>=0;k--)p+='L'+x(S[k][0]).toFixed(1)+','+y(lo(S[k])).toFixed(1);return '<path d="'+p+'Z" fill="'+c+'" opacity=".75"/>'};
    const A=s=>s[2],Fo=s=>s[2]+s[3]-s[4],Sh=s=>s[2]+s[3];
    let b='';for(let v=0;v<=ymax;v+=128*1024){b+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+RD.t(pl-4,y(v)+4,(v/1024)+'',{a:'end',fs:10,fill:'var(--mute)'})}
    b+=RD.t(4,pt+8,'MiB',{fs:10,fill:'var(--mute)'});
    for(let t=0;t<=tmax;t+=(tmax>8000?2000:500))b+=RD.t(x(t),Hh-8,(t/1000)+' s',{a:'middle',fs:10,fill:'var(--mute)'});
    b+=area(()=>0,A,COL.anon)+area(A,Fo,COL.file)+area(Fo,Sh,COL.shmem);
    b+='<path d="'+S.map((s,k)=>(k?'L':'M')+x(s[0]).toFixed(1)+','+y(s[5]).toFixed(1)).join('')+'" fill="none" stroke="var(--c5)" stroke-width="2" stroke-dasharray="5 3"/>';
    b+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(LIM)+'" y2="'+y(LIM)+'" stroke="var(--bad)" stroke-width="1.5"/>'+RD.t(W-pr-2,y(LIM)-4,'memory.max 512 MiB',{a:'end',fs:10,fill:'var(--bad)'});
    d.marks.forEach(m=>{if(m[0]<=tmax)b+='<line x1="'+x(m[0])+'" x2="'+x(m[0])+'" y1="'+pt+'" y2="'+(Hh-pb)+'" stroke="var(--mute)" stroke-dasharray="2 3"/>'});
    const s=S[i];b+='<line x1="'+x(s[0])+'" x2="'+x(s[0])+'" y1="'+pt+'" y2="'+(Hh-pb)+'" stroke="var(--ink)" stroke-width="1.5"/>';
    $('cg-svg').innerHTML=RD.svg(W,Hh,b,'memory of the container over time');}
  function draw(i){const d=CG[cur],S=d.samples;i=Math.min(i,S.length-1);chart(i);const s=S[i];
    const mi=d.marks.filter(m=>m[0]<=s[0]).length-1;
    $('cg-marks').innerHTML=d.marks.map((m,k)=>'<li class="'+(k===mi?'on':(k<mi?'past':''))+'">'+(m[0]/1000).toFixed(1)+' s: '+esc(m[1])+'</li>').join('');
    const sc=SC.find(x=>x[0]===cur);
    $('cg-cap').innerHTML='<div class="t">'+sc[1]+' at '+(s[0]/1000).toFixed(2)+' s</div><p>'+sc[2]+(i===S.length-1?' <b>Final:</b> '+d.log.map(esc).join('; ')+'.':'')+'</p>';
    const k=v=>fmt(v/1024)+' MiB';
    $('cg-cnt').innerHTML=RD.stat('memory.current',k(s[1]),'')+RD.stat('anon',k(s[2]),'')+RD.stat('file (incl. shmem)',k(s[3]),'shmem '+k(s[4]))+RD.stat('swap',k(s[5]),'')+RD.stat('max events',fmt(s[6]),'reclaim forced by the limit')+RD.stat('oom_kill',s[7],s[7]?'a process was SIGKILLed':'');
    $('cg-cmd').textContent=d.cmd;}
  const an=RD.anim({card:'cg-card',ctl:'cg-ctl',n:CG[cur].samples.length,draw,ms:110,label:'Sample'});
  RD.seg($('cg-mode'),m=>{cur=m;an.reset(CG[cur].samples.length);an.play()});
  window.VMCG={pick(m){cur=m;$('cg-mode').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m===m));an.reset(CG[cur].samples.length)}};
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-cg']=window.TAB_RENDER['t-cg']||[]).push(()=>{an.redraw();oo()});
  addEventListener('resize',()=>{if(!$('t-cg').hidden)an.redraw()});

  // oom_badness calculator
  const O=D.oom,TOT=Math.floor(O.memtotal_kb/4)+Math.floor(O.swaptotal_kb/4);
  $('oo-tot').textContent='MemTotal '+fmt(O.memtotal_kb)+' KiB + SwapTotal '+fmt(O.swaptotal_kb)+' KiB = '+fmt(TOT)+' pages';
  const def=O.procs.slice(0,3).map(p=>({rss:p.rss_pages,pte:p.vmpte_kb,adj:p.oom_score_adj,ker:p.oom_score}));
  $('oo-rows').innerHTML=def.map((p,i)=>'<div class="pr"><div>'+'ABC'[i]+'</div><input type="number" id="oo-r'+i+'" value="'+(p.rss*4/1024).toFixed(3)+'" min="0" step="any" aria-label="RSS of '+'ABC'[i]+'"><input type="number" id="oo-a'+i+'" value="'+p.adj+'" min="-1000" max="1000" step="100" aria-label="oom_score_adj of '+'ABC'[i]+'"></div>').join('');
  function oo(){const lim=Math.max(1,+$('oo-lim').value||0),sw=Math.max(0,+$('oo-sw').value||0),tot=Math.floor((lim+Math.min(sw,O.swaptotal_kb/1024))*256);
    const rows=def.map((p,i)=>{const mibv=+$('oo-r'+i).value||0,rss=Math.round(mibv*256),adj=Math.max(-1000,Math.min(1000,Math.round(+$('oo-a'+i).value||0)));
      const pt=Math.floor(p.pte*1024/4096),base=rss+pt,unk=adj===-1000;
      const cg=unk?null:base+adj*Math.floor(tot/1000),mach=unk?0:Math.floor((1000+Math.floor((base+adj*Math.floor(TOT/1000))*1000/TOT))*2/3);
      const same=Math.abs(rss-p.rss)<=1&&adj===p.adj;
      return {n:'ABC'[i],rss,pt,adj,cg,mach,ker:same?p.ker:null}});
    const alive=rows.filter(r=>r.cg!==null&&r.rss>0),win=alive.length?alive.reduce((a,b)=>b.cg>a.cg?b:a):null;
    $('oo-tbl').innerHTML='<thead><tr><th>Process</th><th class="num">rss pages</th><th class="num">page-table pages</th><th class="num">adj</th><th class="num">points in this cgroup</th><th class="num">/proc oom_score</th><th class="num">kernel said</th></tr></thead><tbody>'+rows.map(r=>'<tr'+(win&&r===win?' style="background:var(--hl)"':'')+'><td>'+r.n+'</td><td class="num">'+fmt(r.rss)+'</td><td class="num">'+r.pt+'</td><td class="num">'+r.adj+'</td><td class="num">'+(r.cg===null?'never killed':fmt(r.cg))+'</td><td class="num">'+r.mach+'</td><td class="num">'+(r.ker===null?'':r.ker+(r.ker===r.mach?' <span class="pill ok">=</span>':' <span class="pill bad">!=</span>'))+'</td></tr>').join('')+'</tbody>';
    $('oo-who').innerHTML='totalpages in this cgroup = ('+fmt(lim)+' + '+fmt(Math.min(sw,O.swaptotal_kb/1024))+') MiB = '+fmt(tot)+' pages, so each 100 of adj is worth '+fmt(100*Math.floor(tot/1000))+' pages ('+fmt(100*Math.floor(tot/1000)/256)+' MiB). '+(win?'<b>If this cgroup hits its limit, '+win.n+' is killed first.</b>':'Nothing can be killed.')+' Page tables are fixed at the measured values. "kernel said" appears while a row matches the measured run.';}
  ['oo-lim','oo-sw',0,1,2].forEach(k=>{if(typeof k==='number'){$('oo-r'+k).addEventListener('input',oo);$('oo-a'+k).addEventListener('input',oo)}else $(k).addEventListener('input',oo)});
  oo();
})();
