// ---- Part 2, Version explorer tab (t-pb-ver): 21 changes run on CPython 3.11 to 3.15 ----
(function(){
  const $=id=>document.getElementById(id),E=PBU.esc,V=PB.ver,F=V.features,VS=['3.11','3.12','3.13','3.14','3.15'];
  const KIND={syntax:'Syntax',typing:'Typing',library:'Library',behaviour:'Behaviour',errors:'Errors and warnings',removal:'Removals'};
  let minV='3.12',kind='all',sel={f:F.findIndex(f=>f.id==='v14_tstrings'),v:'3.14'};
  const lastLine=o=>{const ls=(o||'').trim().split('\n');return ls[ls.length-1]};
  function status(r){if(r.rc!==0){const m=lastLine(r.out).match(/^(\w+(?:Error|Exception))/);return {c:'bad',t:m?m[1]:'exit '+r.rc}}
    if(/Warning/.test(r.out))return {c:'warn',t:'ran, warned'};return {c:'ok',t:'ran'}}
  const vnum=v=>+v.split('.')[1];
  function grid(){
    $('vx-grid').innerHTML='<thead><tr><th class="f">Change (introduced in)</th>'+VS.map(v=>'<th>'+v+'<span class="vx-cell">'+E(V.interpreters[v])+'</span></th>').join('')+'</tr></thead><tbody>'+
      F.map((f,i)=>{const off=vnum(f.v)>vnum(minV)&&f.kind!=='removal'&&f.kind!=='errors';const hid=kind!=='all'&&f.kind!==kind;
        return '<tr class="'+(off?'off ':'')+(hid?'hid':'')+'"><th class="f">'+E(f.title)+' <span class="k">'+f.v+(f.pep?' · '+E(f.pep):'')+' · '+KIND[f.kind]+(off?' <span class="vx-need">needs '+f.v+'</span>':'')+'</span></th>'+
          VS.map(v=>{const s=status(f.runs[v]);return '<td class="c '+s.c+(sel.f===i&&sel.v===v?' sel':'')+'" data-f="'+i+'" data-v="'+v+'" title="'+E(f.title)+' on '+v+'">'+(s.c==='bad'?'&#10007;':'&#10003;')+'<span class="vx-cell">'+E(s.t)+'</span></td>'}).join('')+'</tr>'}).join('')+'</tbody>';
    const usable=F.filter(f=>vnum(f.v)<=vnum(minV)&&f.kind!=='removal'&&f.kind!=='errors').length,newer=F.filter(f=>vnum(f.v)>vnum(minV)&&f.kind!=='removal'&&f.kind!=='errors');
    $('vx-sum').innerHTML='Supporting '+minV+' and later, you can use <b>'+usable+'</b> of the new features shown; <b>'+newer.length+'</b> need a newer minimum'+(newer.length?': '+newer.map(f=>E(f.title)).join('; '):'')+'. Removals and error-message changes apply whatever you choose.';
  }
  function detail(){
    const f=F[sel.f],r=f.runs[sel.v],s=status(r);
    $('vx-detail').innerHTML='<h3>'+E(f.title)+'</h3><div><span class="tag">new in '+f.v+'</span>'+(f.pep?'<span class="tag"><a href="'+E(f.url)+'" target="_blank" rel="noopener noreferrer">'+E(f.pep)+'</a></span>':'<span class="tag"><a href="'+E(f.url)+'" target="_blank" rel="noopener noreferrer">What\'s New</a></span>')+'<span class="tag">'+KIND[f.kind]+'</span></div>'+
      '<p class="small">'+E(f.note)+'</p><div class="pb-code">'+E(f.src)+'</div>'+
      '<div class="seg" id="vx-vs">'+VS.map(v=>'<button data-m="'+v+'"'+(v===sel.v?' class="on"':'')+'>'+v+'</button>').join('')+'</div>'+
      '<div class="pb-term">'+PBU.block({cmd:'python'+sel.v+' '+f.id+'.py'+(f.id==='v15_utf8_default'?'   # LC_ALL=en_US.ISO8859-1':''),out:r.out,rc:r.rc})+'</div>';
    $('vx-vs').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;sel.v=b.dataset.m;grid();detail()});
  }
  $('vx-kind').innerHTML='<button data-m="all" class="on">All kinds</button>'+Object.entries(KIND).map(([k,t])=>'<button data-m="'+k+'">'+t+'</button>').join('');
  $('vx-kind').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;kind=b.dataset.m;$('vx-kind').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));grid()});
  RD.seg($('vx-min'),m=>{minV=m;grid()});
  $('vx-grid').addEventListener('click',e=>{const td=e.target.closest('td.c');if(!td)return;sel={f:+td.dataset.f,v:td.dataset.v};grid();detail()});
  grid();detail();

  // drill: first version where it runs
  const pool=F.filter(f=>f.kind!=='removal'&&f.kind!=='errors'&&f.id!=='v14_finally_return'&&f.id!=='v15_utf8_default');let di=0;
  function drill(){
    const f=pool[di%pool.length];const first=VS.find(v=>f.runs[v].rc===0);
    const el=$('vx-drill');
    PBU.drill(el,'<span class="mute small">Question '+(di%pool.length+1)+' of '+pool.length+'.</span> What is the oldest version on which this runs?<div class="pb-code" style="font-weight:400">'+E(f.src)+'</div>',
      VS.map(v=>({t:v,right:v===first})),
      ()=>{const prev=VS[VS.indexOf(first)-1];return '<b>'+first+'</b>: '+E(f.title)+(f.pep?' ('+E(f.pep)+')':'')+'.'+(prev?' On '+prev+' it fails with:<div class="pb-term">'+E(lastLine(f.runs[prev].out))+'</div>':'')+'<button id="vx-next">Next question</button>'});
  }
  $('vx-drill').addEventListener('click',e=>{if(e.target.id==='vx-next'){di++;drill()}});
  drill();

  // release lines
  const LIFE=[['3.11','2022-10-24','2027-10','security'],['3.12','2023-10-02','2028-10','security'],['3.13','2024-10-07','2029-10','security'],['3.14','2025-10-07','2030-10','bugfix'],['3.15','2026-10-09','2031-10','prerelease (rc3)'],['3.16','2027-10-06','2032-10','in development']];
  const d=s=>{const p=s.split('-');return +p[0]+((+p[1]-1)+((+p[2]||1)-1)/30)/12};
  function life(){
    const el=$('vx-life'),w=PBU.width(el),L0=44,R=10,y0=6,rh=22,X0=2022.5,X1=2033,X=v=>L0+(w-L0-R)*(v-X0)/(X1-X0);
    let s='';LIFE.forEach((r,k)=>{const y=y0+k*rh,a=X(d(r[1])),b=X(d(r[2]+'-01')),b2=X(Math.min(d(r[1])+(vnum(r[0])>=13?2:1.5),d(r[2]+'-01')));
      s+='<text x="0" y="'+(y+14)+'" font-size="12" font-weight="600">'+r[0]+'</text><rect x="'+a+'" y="'+(y+3)+'" width="'+Math.max(1,b2-a)+'" height="14" fill="var(--c3)" opacity=".8"></rect><rect x="'+b2+'" y="'+(y+3)+'" width="'+Math.max(1,b-b2)+'" height="14" fill="var(--c5)" opacity=".55"></rect>';
      if(b-a>130)s+='<text x="'+(a+4)+'" y="'+(y+14)+'" font-size="10.5" fill="var(--bg)">'+r[3]+'</text>'});
    const yA=y0+LIFE.length*rh;for(let v=2023;v<=2032;v++){const x=X(v);s+='<line x1="'+x+'" x2="'+x+'" y1="'+yA+'" y2="'+(yA+4)+'" stroke="var(--mute)"></line>'+(w>500||v%2?'<text x="'+x+'" y="'+(yA+15)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+v+'</text>':'')}
    const xt=X(d('2026-10-05'));s+='<line x1="'+xt+'" x2="'+xt+'" y1="0" y2="'+yA+'" stroke="var(--bad)" stroke-width="1.5"></line>';
    el.innerHTML=RD.svg(w,yA+20,s,'Python release lines from first release to end of life')+'<div class="pb-legend"><span><i style="background:var(--c3)"></i>bug fixes: two years from 3.13 on, 18 months before (PEP 602)</span><span><i style="background:var(--c5);opacity:.55"></i>security fixes to end of life</span><span><i style="background:var(--bad)"></i>2026-10-05</span><span>Label: status on the devguide today</span></div>';
  }
  PBU.onTab('t-pb-ver',life);
  let rz=0;addEventListener('resize',()=>{const t=$('t-pb-ver');if(!t||t.hidden)return;clearTimeout(rz);rz=setTimeout(life,60)});
  life();
  RD.tabLinks($('t-pb-ver'));
})();
