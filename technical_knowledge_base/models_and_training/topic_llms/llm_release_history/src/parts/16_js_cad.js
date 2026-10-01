// ---- Cadence: releases per lab per quarter, open and closed, with row and column totals and the median gap ----
(function(){
  const esc=RH.esc,NQ=15,st={s:'first',w:'',sel:null};
  const med=a=>{if(!a.length)return null;const s=a.slice().sort((x,y)=>x-y),n=s.length;return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2};
  const rowsOf=l=>ROWS.filter(r=>r.l===l).sort((a,b)=>a.ts-b.ts);
  const GAP={};RH.LABS.forEach(l=>{const rs=rowsOf(l);GAP[l]=rs.length>=3?med(rs.slice(1).map((r,j)=>Math.round((r.ts-rs[j].ts)/864e5))):null});
  function draw(){
    const keep=r=>!st.w||(st.w==='o'?r.o:!r.o);
    const labs=RH.LABS.slice(),n=l=>ROWS.filter(r=>r.l===l&&keep(r)).length;
    const first=l=>rowsOf(l)[0].sk;
    labs.sort((a,b)=>st.s==='n'?n(b)-n(a)||(first(a)<first(b)?-1:1):st.s==='gap'?((GAP[a]==null)-(GAP[b]==null))||(GAP[a]-GAP[b])||0:st.s==='name'?(a.toLowerCase()<b.toLowerCase()?-1:1):(first(a)<first(b)?-1:1));
    let s='<table class="hmx"><thead><tr><th></th>'+Array.from({length:NQ},(_,q)=>'<th title="'+RH.qName(q)+'">'+(q%4===0?"'"+String(23+q/4):'')+'Q'+(q%4+1)+'</th>').join('')+'<th>rows</th><th title="median days between consecutive rows">gap</th></tr></thead><tbody>';
    const col=Array(NQ).fill(0);
    labs.forEach(l=>{s+='<tr><th class="ln" title="'+esc(l)+'">'+esc(l)+'</th>';
      for(let q=0;q<NQ;q++){const rs=ROWS.filter(r=>r.l===l&&r.q===q&&keep(r));const o=rs.filter(r=>r.o).length;col[q]+=rs.length;
        if(!rs.length){s+='<td class="e"></td>';continue}
        const p=Math.round(100*o/rs.length);
        s+='<td data-l="'+esc(l)+'" data-q="'+q+'"'+(st.sel&&st.sel.l===l&&st.sel.q===q?' class="on"':'')+' title="'+esc(l)+', '+RH.qName(q)+': '+rs.length+' ('+o+' open, '+(rs.length-o)+' closed)"><i style="top:0;background:linear-gradient(to top,var(--open) '+p+'%,var(--closed) '+p+'%);opacity:.55"></i><span>'+rs.length+'</span></td>'}
      s+='<td class="tot">'+n(l)+'</td><td class="tot">'+(GAP[l]==null?'n':GAP[l]+'d')+'</td></tr>'});
    s+='<tr><th class="ln">All labs</th>'+col.map(c=>'<td class="tot">'+c+'</td>').join('')+'<td class="tot">'+col.reduce((a,b)=>a+b,0)+'</td><td class="tot"></td></tr></tbody></table>';
    s+='<div class="hmleg" style="margin-top:6px"><span><i style="display:inline-block;width:12px;height:12px;background:var(--open);opacity:.55;margin-right:4px"></i>open weights share</span><span><i style="display:inline-block;width:12px;height:12px;background:var(--closed);opacity:.55;margin-right:4px"></i>closed share</span><span>gap: median days between a lab\'s consecutive rows (n: fewer than 3 rows)</span></div>';
    $('cdPlot').innerHTML=s;
    $('cdPlot').querySelectorAll('td[data-q]').forEach(td=>td.addEventListener('click',()=>{st.sel={l:td.dataset.l,q:+td.dataset.q};detail();draw()}))}
  function detail(){const {l,q}=st.sel,rs=ROWS.filter(r=>r.l===l&&r.q===q);
    $('cdDet').innerHTML='<b>'+RH.labLink(l)+', '+RH.qName(q)+'</b>: '+rs.length+' row'+(rs.length>1?'s':'')+(GAP[l]!=null?'; median gap for this lab '+GAP[l]+' days':'')+'.<ul class="tight">'+rs.map(r=>'<li>'+r.d+' <b>'+esc(r.m)+'</b>, '+(r.o?'<span style="color:var(--open)">open</span>':'<span style="color:var(--closed)">closed</span>')+', '+RH.szTxt(r)+'. '+esc(r.n)+'. '+A(r.u,'source')+'</li>').join('')+'</ul><button id="cdGo">Show '+esc(l)+' in the table</button>';
    $('cdGo').addEventListener('click',()=>RH.goTable({lab:l}))}
  $('cdSort').addEventListener('change',e=>{st.s=e.target.value;draw()});
  $('cdW').addEventListener('change',e=>{st.w=e.target.value;draw()});
  onTab('t-cad',draw);
  window.__cd={GAP};
})();
