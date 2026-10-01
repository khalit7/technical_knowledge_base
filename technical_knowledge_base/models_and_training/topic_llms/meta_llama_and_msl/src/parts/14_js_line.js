// ---- Lineage tab: three lanes on one time axis, a card per event ----
(function(){
  if(!$('t-line'))return;let range='all',sel=-1;
  const dt=s=>{const [y,m,d]=s.split('-').map(Number);return y+(m-1)/12+(d-1)/365};
  const LANES=[['o','Open weights','var(--open)'],['g','Organisation','var(--mute)'],['c','Closed','var(--closed)']];
  const MON=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const nice=s=>{const [y,m,d]=s.split('-').map(Number);return d+' '+MON[m-1]+' '+y};
  function draw(){const host=$('lnSvg');const narrow=host.clientWidth<560,W=narrow?360:880,pl=narrow?8:96,pr=14,laneH=narrow?62:78,top=24,H=top+laneH*3+30;
    const x0=range==='z'?2025:2023,x1=2026.84,X=v=>pl+(W-pl-pr)*(v-x0)/(x1-x0);let s='';
    for(let y=Math.ceil(x0);y<=2026;y++){s+='<line x1="'+X(y)+'" x2="'+X(y)+'" y1="'+(top-6)+'" y2="'+(H-24)+'" stroke="var(--line)"/><text x="'+(X(y)+3)+'" y="'+(H-10)+'" font-size="11" fill="var(--mute)">'+y+'</text>';
      if(range==='z')[0.25,0.5,0.75].forEach(q=>{if(y+q<x1)s+='<line x1="'+X(y+q)+'" x2="'+X(y+q)+'" y1="'+(top-6)+'" y2="'+(H-24)+'" stroke="var(--line)" stroke-dasharray="2 3"/>'})}
    LANES.forEach(([k,n,c],i)=>{const y=top+laneH*i+laneH/2;s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y+'" y2="'+y+'" stroke="'+c+'" stroke-opacity=".35"/>';
      s+=narrow?'<text x="'+(pl)+'" y="'+(y-laneH/2+12)+'" font-size="10.5" fill="'+c+'">'+n+'</text>':'<text x="'+(pl-8)+'" y="'+(y+4)+'" font-size="11.5" text-anchor="end" fill="'+c+'">'+n+'</text>'});
    const placed={};
    LINE.forEach((e,i)=>{const v=dt(e[0]);if(v<x0)return;const li=LANES.findIndex(l=>l[0]===e[1]),y=top+laneH*li+laneH/2,x=X(v),c=LANES[li][2];
      const gap=narrow?44:64,lu=placed[e[1]+'U'],ld=placed[e[1]+'D'];let up=null;if(lu==null||x-lu>=gap)up=true;else if(ld==null||x-ld>=gap)up=false;if(up===true)placed[e[1]+'U']=x;if(up===false)placed[e[1]+'D']=x;
      s+='<g class="lnd" data-i="'+i+'" tabindex="0"><circle cx="'+x+'" cy="'+y+'" r="'+(i===sel?8:6)+'" fill="'+(e[2]?c:'var(--bg)')+'" stroke="'+c+'" stroke-width="'+(i===sel?3:2)+'"/><title>'+nice(e[0])+': '+e[3]+'</title>';
      if((!narrow||range==='z')&&up!==null){const ty=up?y-11:y+19;const short=e[3].replace(' (Llama 1)','').replace('Llama 4 Scout and Maverick','Llama 4').replace('Meta Superintelligence Labs formed','MSL formed').replace('MSL restructured into four groups','four groups').replace('Muse Spark 1.2 and Muse Code','Spark 1.2 + Code').replace('Muse Voice Transcribe','Voice').replace('The Meta Muse agent','Muse agent').replace('Mac client flaw disclosed','Mac flaw').replace('The LMArena episode','LMArena').replace('600 jobs cut at MSL','600 cuts').replace('Yann LeCun leaves','LeCun leaves').replace('Muse Glimmer 30B','Glimmer').replace('Muse Spark','Spark');
        s+='<text x="'+x+'" y="'+ty+'" font-size="'+(narrow?9.5:10.5)+'" text-anchor="middle" fill="var(--mute)">'+short+'</text>'}
      s+='</g>'});
    host.innerHTML=svgEl(W,H,s,'Meta releases and events on a time axis');
    host.querySelectorAll('.lnd').forEach(g=>{const f=()=>{sel=+g.dataset.i;draw();const c=$('ln-c'+sel);if(c)c.scrollIntoView({block:'nearest'})};g.addEventListener('click',f);g.addEventListener('keydown',ev=>{if(ev.key==='Enter')f()})});
    $('lnCards').innerHTML=LINE.map((e,i)=>dt(e[0])<x0?'':'<div class="tl-item '+(e[2]?'o':(e[1]==='c'?'c':''))+(i===sel?' sel':'')+'" id="ln-c'+i+'"><div class="cardh"><h3>'+e[3]+'</h3><span class="dt">'+nice(e[0])+' · '+(e[1]==='g'?'organisation':(e[2]?'open weights':'closed'))+'</span></div><p class="small" style="margin:4px 0 0">'+e[4]+' ('+A(e[5],e[6])+')</p></div>').join('')}
  segBind('lnR',m=>{range=m;draw()});
  onTab('t-line',draw);
  let rw=0;addEventListener('resize',()=>{const h=$('lnSvg');if(!h||!h.clientWidth)return;const w=h.clientWidth<560;if(w!==rw){rw=w;draw()}});
})();
