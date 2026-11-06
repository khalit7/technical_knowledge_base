// ---- Reading, section 3: expected cost against horizon (log-log), behaviour cloning against DAgger, exact (2D: a log-log curve reads best flat) ----
(function(){
  const E=window.OF,$=id=>document.getElementById(id);if(!$('hz-A'))return;
  // ---- cost against horizon, log-log ----
  const HZ=$('hz-A'),Ts=[5,10,20,40,80,160,320],eps=0.02;let rows=null;
  function hz(){if(!rows)rows=Ts.map(T=>{const ds=E.dagger(eps,T,8,5,7);return {T,bc:E.exact(ds[0],eps,T).J,dag:E.exact(ds[ds.length-1],eps,T).J}});
    const W=RD.width(HZ),H=250,l=44,r=12,t=12,b=34,lx0=Math.log10(4),lx1=Math.log10(400),ly0=-2,ly1=Math.log10(3000);
    const X=v=>l+(W-l-r)*(Math.log10(v)-lx0)/(lx1-lx0),Y=v=>t+(H-t-b)*(ly1-Math.max(ly0,Math.min(ly1,Math.log10(v))))/(ly1-ly0);let s='';
    [0.01,0.1,1,10,100,1000].forEach(v=>{s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'" stroke="var(--line)"/>'+RD.t(l-4,Y(v)+4,String(v),{a:'end',fs:11,fill:'var(--mute)'})});
    Ts.forEach(T=>{s+=RD.t(X(T),H-b+14,String(T),{a:'middle',fs:11,fill:'var(--mute)'})});
    s+=RD.t((l+W-r)/2,H-4,'horizon T (steps)',{a:'middle',fs:11,fill:'var(--mute)'})+RD.t(l+4,t+10,'expected cost J',{fs:11,fill:'var(--mute)'});
    const line=(f,col,dash,w)=>{const p=[];for(let k=0;k<=40;k++){const T=Math.pow(10,lx0+(lx1-lx0)*k/40);p.push(X(T).toFixed(1)+','+Y(f(T)).toFixed(1))}return '<polyline fill="none" stroke="'+col+'" stroke-width="'+(w||1.4)+'"'+(dash?' stroke-dasharray="'+dash+'"':'')+' points="'+p.join(' ')+'"/>'};
    s+=line(T=>eps*T*T,'var(--c2)','5 4')+line(T=>eps*T,'var(--c1)','5 4')+line(T=>T,'var(--mute)','2 3',1);
    const ser=(k,col)=>'<polyline fill="none" stroke="'+col+'" stroke-width="2.4" points="'+rows.map(o=>X(o.T).toFixed(1)+','+Y(o[k]).toFixed(1)).join(' ')+'"/>'+rows.map(o=>'<circle cx="'+X(o.T).toFixed(1)+'" cy="'+Y(o[k]).toFixed(1)+'" r="3.2" fill="'+col+'"><title>T = '+o.T+': J = '+RD.n(o[k],2)+'</title></circle>').join('');
    s+=ser('bc','var(--c2)')+ser('dag','var(--c1)');
    HZ.innerHTML=RD.svg(W,H,s,'Expected cost against horizon');
    $('hz-L').innerHTML='<span><i style="background:var(--c2)"></i>Behaviour cloning (exact)</span><span><i style="background:var(--c1)"></i>DAgger, 8 rounds (exact)</span><span><i style="background:var(--c2);height:1px"></i>dashed: εT² bound</span><span><i style="background:var(--c1);height:1px"></i>dashed: εT</span><span><i style="background:var(--mute);height:1px"></i>dotted: J = T (out of lane every step)</span>'}
  RD.onRender(hz);RD.onResize(hz);hz();
})();
