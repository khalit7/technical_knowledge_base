// ---- Reading section 2: the residual stream under four placements, init or trained, stepped sub-layer by sub-layer (moved from the old Residual stream tab) ----
(function(){
  const D=window.NSD,C=window.NSC,$=id=>document.getElementById(id);
  if(!D||!C||!window.RD||!$('rs-ch'))return;
  const R=D.resid,P=R.points,N=P.length;
  const PL=[['pre','Pre-norm','var(--c1)'],['post','Post-norm','var(--c2)'],['sandwich','Sandwich (peri)','var(--c3)'],['output','Output norm (OLMo 2)','var(--c4)']];
  const st={when:'init',q:'median_norm',init:'gpt2'};
  const key=p=>p==='pre'&&st.init==='flat'?'pre_flat':p;
  const get=p=>{const m=R.models[key(p)];return m&&m[st.when]};
  const ptName=i=>i===0?'after the embedding':'after block '+Math.ceil(i/2)+(i%2?' attention':' feed-forward');
  const qName={median_norm:'median token norm',trace_norm:'norm of token "o" (157)',tok0_norm:'norm of token 0',max_abs:'largest single entry'};
  function draw(i){
    const ser=PL.map(([p,l,c])=>{const m=get(p);return {name:l,color:c,end:true,pts:m?m[st.q].slice(0,i+1).map((v,j)=>[j,v]):[]}});
    const all=[].concat(...PL.map(([p])=>{const m=get(p);return m?m[st.q]:[]}));
    C.line($('rs-ch'),ser,{xmax:N-1,log:true,ymin:Math.max(0.05,Math.min(...all)*0.8),ymax:Math.max(...all)*1.25,xl:'sub-layer (0 = embedding)',yl:qName[st.q]+' (log)',vx:i,label:'residual stream size by sub-layer'});
    $('rs-leg').innerHTML=PL.map(([p,l,c])=>'<span style="--sw:'+c+'">'+l+(get(p)?'':' (not recorded)')+'</span>').join('');
    $('rs-cnt').innerHTML=PL.map(([p,l,c])=>{const m=get(p);return '<div class="stat" style="--sw:'+c+'"><div class="k">'+l+'</div><div class="v">'+(m?C.fmt(m[st.q][i]):'n/a')+'</div><div class="d">'+(m?'&times;'+C.fmt(m[st.q][i]/m[st.q][0])+' from the embedding':'')+'</div></div>'}).join('');
    const cap=(R.caps[st.when]||{})[i]||'';
    $('rs-cap').innerHTML='<b>Point '+i+' of '+(N-1)+': '+ptName(i)+'.</b> '+cap;
  }
  const an=RD.anim({card:'rs-card',ctl:'rs-ctl',n:N,ms:900,draw,label:'Sub-layer'});
  const re=()=>an.reset(N);
  RD.seg($('rs-when'),m=>{st.when=m;re()});RD.seg($('rs-q'),m=>{st.q=m;an.redraw()});RD.seg($('rs-init'),m=>{st.init=m;re()});
  function tab(){
    const rows=R.table;
    $('rs-tab').innerHTML='<table><thead><tr><th>Model (trained)</th><th class="num">largest entry</th><th>where</th><th class="num">median |entry|</th><th class="num">ratio</th></tr></thead><tbody>'+
      rows.map(r=>'<tr><td>'+C.esc(r.label)+'</td><td class="num">'+C.fmt(r.max)+'</td><td>'+C.esc(r.where)+'</td><td class="num">'+C.fmt(r.med)+'</td><td class="num">'+C.fmt(r.ratio)+'</td></tr>').join('')+'</tbody></table>';
  }
  if($('rs-tab'))tab();
  RD.onResize(()=>an.redraw());
})();
