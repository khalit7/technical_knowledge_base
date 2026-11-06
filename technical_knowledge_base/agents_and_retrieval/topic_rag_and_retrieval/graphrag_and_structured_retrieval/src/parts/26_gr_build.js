// ---- Reading section 5: the community hierarchy explorer (closed block). The fast-path build and global search are 3D stages since 2026-11-06 (29b_sc_build.js, 29c_sc_glob.js) ----
(function(){
  const D=window.GR,B=D.build,E=GRL.esc,$=id=>document.getElementById(id);
  if(!$('gb-comm'))return;
  // hierarchy explorer
  let lvl='0',sel=null;
  function comm(){const H=B.hierarchy,list=(H[lvl]||[]).filter(c=>lvl==='0'||sel==null||c.parent===sel||(lvl==='2'&&(H['1']||[]).some(p=>p.parent===sel&&p.id===c.parent)));
    $('gb-comm').innerHTML=(lvl!=='0'&&sel!=null?'<div class="small mute" style="grid-column:1/-1">Children of level-0 community '+sel+' ('+list.length+'). <a href="#" id="gb-all">show all</a></div>':'')+
      list.sort((a,b)=>b.n-a.n).map(c=>'<div class="gb-c'+(lvl==='0'&&c.id===sel?' sel':'')+'" data-id="'+c.id+'"><div class="h">community '+c.id+' &middot; '+c.n+' nodes &middot; '+c.paras+' paragraphs</div>'+c.top.map(t=>'<span class="gr-chip">'+E(t)+'</span>').join('')+'</div>').join('');
    const a=$('gb-all');if(a)a.addEventListener('click',e=>{e.preventDefault();sel=null;comm()})}
  $('gb-comm').addEventListener('click',e=>{const c=e.target.closest('.gb-c');if(!c||lvl!=='0')return;sel=+c.dataset.id;lvl='1';
    $('gb-lvl').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m==='1'));comm()});
  RD.seg($('gb-lvl'),m=>{lvl=m;comm()});comm();
})();
