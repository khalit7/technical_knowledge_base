// ---- Compare labs: every lab on the same axes, filter by constraint and openness, sort by any axis ----
(function(){
  if(!$('cmp'))return;
  const WC={full:['Fully open','weights, data and code'],open:['Open, permissive','MIT or Apache 2.0'],openr:['Open, restricted','custom or non-commercial licence'],api:['API only','weights promised'],closed:['Closed',''],na:['Not a model','']};
  const WORD={full:5,open:4,openr:3,api:2,closed:1,na:0};
  let grp='all',wf='all',sort='grp',open=null;
  const chips=$('cmpG');chips.innerHTML='<button data-m="all" class="on">All constraints</button>'+GROUPS.map(g=>'<button data-m="'+g[0]+'">'+g[1]+'</button>').join('');
  segBind('cmpG',v=>{grp=v;draw()});segBind('cmpW',v=>{wf=v;draw()});
  $('cmpS').addEventListener('change',e=>{sort=e.target.value;draw()});
  const num=v=>v==null?'·':(v>=1000?(v/1000).toFixed(v%1000?2:0)+'T':fmt(v,v<20&&v%1?1:0)+'B');
  function draw(){
    let rows=LABS.filter(l=>(grp==='all'||l.g===grp)&&(wf==='all'||(wf==='open'?['full','open','openr'].includes(l.w):!['full','open','openr'].includes(l.w))));
    const gi=g=>GROUPS.findIndex(x=>x[0]===g);
    const key={grp:l=>gi(l.g)*1e6-(l.tot||0),name:l=>l.n.toLowerCase(),tot:l=>-(l.tot||-1),act:l=>-(l.act||-1),aa:l=>-(l.aa||-1),w:l=>-WORD[l.w],date:l=>l.d?-Date.parse(l.d.length===7?l.d+'-15':l.d):0}[sort];
    rows=rows.slice().sort((a,b)=>{const x=key(a),y=key(b);return x<y?-1:x>y?1:0});
    let h='<table class="hm cmp"><thead><tr><th class="mh">Lab<small>headline release</small></th><th>Constraint it optimises<small>what it makes cheap or possible</small></th><th>Weights<small>licence</small></th><th class="num">Total / active<small>parameters</small></th><th>Architecture</th><th>Price<small>per 1M tokens, in / out</small></th><th class="num">AA v4.3<small>index</small></th><th>Evidence<small>who measured it</small></th></tr></thead><tbody>';
    rows.forEach(l=>{const g=GROUPS[gi(l.g)],w=WC[l.w],on=open===l.id;
      h+='<tr class="cr'+(on?' on':'')+'" data-id="'+l.id+'"><th class="mh"><b>'+l.n+'</b><small>'+l.h+(l.d?', '+l.dt:'')+'</small></th><td style="text-align:left"><span class="gdot" style="background:var('+g[2]+')"></span>'+g[1]+'<small class="cm">'+l.bet+'</small></td>'+
        '<td style="text-align:left"><span class="tag w-'+l.w+'">'+w[0]+'</span><small class="cm">'+l.lic+'</small></td><td class="num">'+(l.tot?num(l.tot)+(l.act==null?' total, active not published':l.act!==l.tot?' / '+num(l.act):' dense'):'·')+'</td>'+
        '<td style="text-align:left"><small class="cm" style="color:var(--ink)">'+l.arch+'</small></td><td style="text-align:left"><small class="cm" style="color:var(--ink)">'+(l.p||'·')+'</small></td><td class="num">'+(l.aa!=null?l.aa.toFixed(1):'·')+'</td>'+
        '<td style="text-align:left"><span class="ev ev-'+l.ev+'">'+{v:'vendor only',i:'independent',m:'mixed'}[l.ev]+'</span><small class="cm">'+l.evt+'</small></td></tr>';
      if(on)h+='<tr class="cdet"><td colspan="8">'+l.why+' <a href="#" data-tab="t-read" data-to="'+l.s+'">Read the section</a></td></tr>'});
    h+='</tbody></table>';
    $('cmpTab').innerHTML=h;$('cmpN').textContent=rows.length+' of '+LABS.length+' labs';
    $('cmpTab').querySelectorAll('tr.cr').forEach(tr=>tr.addEventListener('click',()=>{open=open===tr.dataset.id?null:tr.dataset.id;draw()}));
    $('cmpTab').querySelectorAll('a[data-tab]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();window.__showTab&&window.__showTab(a.dataset.tab);const to=document.getElementById(a.dataset.to);if(to)to.scrollIntoView({block:'start'})}));
  }
  onTab('t-cmp',draw);draw();
})();
