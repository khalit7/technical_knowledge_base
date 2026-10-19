// ---- Release history: firsts (when each lab first shipped a feature, first in this table; how many labs had by each date) ----
(function(){
  const RH=window.RH,ROWS=RH.ROWS,$=id=>document.getElementById(id),esc=RH.esc;
  const F=[{k:'open',n:'Open weights',c:'var(--c1)',f:r=>r.o,p:{w:'o',k:[]}},{k:'moe',n:'MoE',c:'var(--c2)',f:r=>r.k.includes('moe'),p:{w:'',k:['moe']}},
    {k:'reasoning',n:'Reasoning',c:'var(--c3)',f:r=>r.k.includes('reasoning'),p:{w:'',k:['reasoning']}},{k:'multimodal',n:'Multimodal',c:'var(--c4)',f:r=>r.k.includes('multimodal'),p:{w:'',k:['multimodal']}},
    {k:'hybrid-attention',n:'Hybrid attention',c:'var(--c5)',f:r=>r.k.includes('hybrid-attention'),p:{w:'',k:['hybrid-attention']}}];
  const byDate=RH.byDate;
  const FIRST={};F.forEach(x=>{FIRST[x.k]={};byDate.forEach(r=>{if(x.f(r)&&!FIRST[x.k][r.l])FIRST[x.k][r.l]=r})});
  const labFirst={};byDate.forEach(r=>{if(!labFirst[r.l])labFirst[r.l]=r});
  RH.FIRST=FIRST;
  const on=new Set(F.map(x=>x.k)),st={s:'lab',dir:1,sel:null};
  $('fsF').innerHTML=F.map(x=>'<button data-k="'+x.k+'" class="on" aria-pressed="true"><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:'+x.c+';margin-right:5px"></i>'+x.n+' ('+Object.keys(FIRST[x.k]).length+' labs)</button>').join('');
  $('fsF').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.k;on.has(k)?on.delete(k):on.add(k);b.classList.toggle('on',on.has(k));b.setAttribute('aria-pressed',on.has(k));plot()}));
  $('fsGo').innerHTML=F.map(x=>'<button class="rh-go" data-k="'+x.k+'">'+x.n+'</button>').join(' ');
  $('fsGo').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{const x=F.find(y=>y.k===b.dataset.k);RH.tlFirsts(Object.assign({q:'',lab:'',year:''},x.p))}));
  const T0=Date.UTC(2023,0,1),T1=Date.UTC(2026,9,1),W=900,H=360,pl=40,pr=150,pt=14,pb=34,NL=RH.LABS.length;
  const X=t=>pl+(W-pl-pr)*(t-T0)/(T1-T0),Y=v=>pt+(H-pt-pb)*(1-v/NL);
  function endLabels(ends,x){ends.sort((a,b)=>a.y-b.y);let last=-99,s='';ends.forEach(e=>{e.ly=Math.max(e.y,last+14);last=e.ly});ends.forEach(e=>{s+='<text x="'+x+'" y="'+(e.ly+4)+'" font-size="11" fill="'+e.c+'"><title>'+e.how+'</title>'+e.n+'</text>'});return s}
  function plot(){let s='';
    for(let v=0;v<=NL;v+=4)s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/><text x="'+(pl-6)+'" y="'+(Y(v)+4)+'" font-size="11" text-anchor="end" fill="var(--mute)">'+v+'</text>';
    s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(NL)+'" y2="'+Y(NL)+'" stroke="var(--mute)" stroke-dasharray="3 3"/><text x="'+(W-pr-4)+'" y="'+(Y(NL)-4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">all '+NL+' labs in the table</text>';
    for(let y=2023;y<=2026;y++){const x=X(Date.UTC(y,0,1));s+='<line x1="'+x+'" x2="'+x+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--line)" stroke-dasharray="2 3"/><text x="'+(x+4)+'" y="'+(H-pb+16)+'" font-size="11" fill="var(--mute)">'+y+'</text>'}
    s+='<text x="12" y="'+((pt+H-pb)/2)+'" font-size="11.5" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 12 '+((pt+H-pb)/2)+')">labs that had shipped it</text>';
    const ends=[];
    F.filter(x=>on.has(x.k)).forEach(x=>{const rs=Object.values(FIRST[x.k]).sort((a,b)=>a.ts-b.ts);let p='M'+X(T0)+','+Y(0),dots='';
      rs.forEach((r,j)=>{p+=' H'+X(r.ts)+' V'+Y(j+1);dots+='<circle data-i="'+r.i+'" cx="'+X(r.ts)+'" cy="'+Y(j+1)+'" r="3.6" fill="'+x.c+'" style="cursor:pointer"><title>'+x.n+': '+esc(r.l)+' first, with '+esc(r.m)+' ('+r.d+'); '+(j+1)+' labs</title></circle>'});
      p+=' H'+X(T1);s+='<path d="'+p+'" fill="none" stroke="'+x.c+'" stroke-width="2"/>'+dots;
      ends.push({y:Y(rs.length),c:x.c,n:x.n+' '+rs.length,how:x.n+': '+rs.length+' of '+NL+' labs by 30 September 2026'})});
    s+=endLabels(ends,W-pr+6);
    $('fsPlot').innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="100%" style="min-width:600px" role="img" aria-label="Number of labs that had shipped each feature, by date">'+s+'</svg>';
    $('fsPlot').querySelectorAll('circle[data-i]').forEach(c=>c.addEventListener('click',()=>show(+c.dataset.i)))}
  function show(i){st.sel=i;$('fsDet').innerHTML=RH.detail(ROWS[i]);table()}
  function table(){
    const labs=RH.LABS.slice(),k=st.s;
    labs.sort((a,b)=>{let x,y;if(k==='lab'){x=a.toLowerCase();y=b.toLowerCase()}else if(k==='row'){x=labFirst[a].sk;y=labFirst[b].sk}else{x=FIRST[k][a]?FIRST[k][a].sk:'9';y=FIRST[k][b]?FIRST[k][b].sk:'9'}return st.dir*(x<y?-1:x>y?1:0)});
    const earliest={};F.forEach(x=>{earliest[x.k]=Object.values(FIRST[x.k]).sort((a,b)=>a.sk<b.sk?-1:1)[0].sk});
    const ar=c=>st.s===c?(st.dir>0?' ▲':' ▼'):'';
    let s='<thead><tr><th data-s="lab">Lab'+ar('lab')+'</th><th data-s="row">First row'+ar('row')+'</th>'+F.map(x=>'<th data-s="'+x.k+'">'+x.n+ar(x.k)+'</th>').join('')+'</tr></thead><tbody>';
    labs.forEach(l=>{s+='<tr><td class="ln">'+RH.labLink(l)+'</td><td data-i="'+labFirst[l].i+'"'+(st.sel===labFirst[l].i?' class="on"':'')+' title="'+esc(labFirst[l].m)+'">'+labFirst[l].d+'</td>';
      F.forEach(x=>{const r=FIRST[x.k][l];s+=r?'<td data-i="'+r.i+'" class="'+(r.sk===earliest[x.k]?'first ':'')+(st.sel===r.i?'on':'')+'" title="'+esc(r.m)+'">'+r.d+'</td>':'<td class="na">n</td>'});s+='</tr>'});
    $('fsTab').innerHTML=s+'</tbody>';
    $('fsTab').querySelectorAll('th').forEach(th=>th.addEventListener('click',()=>{const c=th.dataset.s;if(st.s===c)st.dir=-st.dir;else{st.s=c;st.dir=1}table()}));
    $('fsTab').querySelectorAll('td[data-i]').forEach(td=>td.addEventListener('click',()=>show(+td.dataset.i)))}
  let drawn=false;RH.onOpen(()=>{plot();if(!drawn){table();drawn=true}});
})();
