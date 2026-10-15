// ---- Compiler lab, section 3: instruction count after every XLA pass that changed the program ----
(function(){
  const X=window.XC,D=X.D,$=X.$;const el=$('xc-ps-plot');if(!el||!D.passes)return;
  let which='train_step';
  function draw(){
    const P=D.passes[which];const st=P.steps;// [i, pipeline, after, instructions, fusions, work]
    const W=X.width(el),H=250,L=50,R=12,Tp=14,B=30,iw=W-L-R,ih=H-Tp-B;
    const ymax=Math.max(...st.map(s=>s[3]))*1.08,n=st.length;
    const Xp=i=>L+i*iw/Math.max(1,n-1),Y=v=>Tp+ih-v/ymax*ih;
    let s='';
    [0,.25,.5,.75,1].forEach(f=>{const v=ymax*f;s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'" stroke="var(--line)"/>'+X.T(L-5,Y(v)+4,X.n0(v),{a:'end',fs:10,fill:'var(--mute)'})});
    // pipeline bands
    let prev=null,start=0;const bands=[];
    st.forEach((q,i)=>{if(q[1]!==prev){if(prev!==null)bands.push([prev,start,i-1]);prev=q[1];start=i}});bands.push([prev,start,n-1]);
    bands.forEach((b,j)=>{if(j%2)s+='<rect x="'+(Xp(b[1])-iw/n/2).toFixed(1)+'" y="'+Tp+'" width="'+(Xp(b[2])-Xp(b[1])+iw/n).toFixed(1)+'" height="'+ih+'" fill="var(--soft)"/>'});
    const line=(k,c,dash)=>{s+='<path d="'+st.map((q,i)=>(i?'L':'M')+Xp(i).toFixed(1)+' '+Y(q[k]).toFixed(1)).join('')+'" fill="none" stroke="'+c+'" stroke-width="2"'+(dash?' stroke-dasharray="5 4"':'')+'/>'};
    line(3,'var(--c1)');line(4,'var(--c2)',1);
    st.forEach((q,i)=>{s+='<circle cx="'+Xp(i).toFixed(1)+'" cy="'+Y(q[3]).toFixed(1)+'" r="3.2" fill="var(--c1)"><title>#'+q[0]+' '+X.esc(q[1])+': after '+X.esc(q[2])+'\n'+X.n0(q[3])+' instructions, '+X.n0(q[4])+' fusions</title></circle>'});
    // label the biggest changes
    const deltas=st.map((q,i)=>i?[i,q[3]-st[i-1][3]]:[i,0]).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).slice(0,3);
    deltas.forEach(([i,d])=>{if(!d)return;const x=Xp(i),y=Y(st[i][3])-8;s+=X.T(Math.min(W-R-4,Math.max(L+4,x)),Math.max(Tp+10,y),X.esc(st[i][2]),{a:x>W*.7?'end':(x<W*.3?'start':'middle'),fs:10.5,w:600})});
    s+=X.T(L+iw/2,H-8,'pass dumps in order ('+n+' that changed the program)',{a:'middle',fs:10.5,fill:'var(--mute)'});
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Instructions after each XLA pass">'+s+'</svg>'+
      '<div class="xc-leg"><span><i style="background:var(--c1)"></i>top-level instructions</span><span><i style="background:var(--c2)"></i>of which fusions</span><span><i style="background:var(--soft);border:1px solid var(--line)"></i>alternate bands: pipelines</span></div>';
    const top=st.map((q,i)=>i?{i,p:q[1],a:q[2],d:q[3]-st[i-1][3],v:q[3],f:q[4]-st[i-1][4]}:null).filter(Boolean).filter(r=>r.d||r.f).sort((a,b)=>Math.abs(b.d)-Math.abs(a.d)).slice(0,6);
    $('xc-ps-top').innerHTML='<div class="tw"><table class="xc-tbl"><thead><tr><th>Pass (pipeline)</th><th>Instructions</th></tr></thead><tbody>'+
      top.map(r=>'<tr><td><code>'+X.esc(r.a)+'</code> <span class="xc-small">('+X.esc(r.p)+')</span></td><td>'+(r.d>0?'+':'')+X.n0(r.d)+' to '+X.n0(r.v)+(r.f>0?'; +'+X.n0(r.f)+' fusions':'')+'</td></tr>').join('')+'</tbody></table></div>';
    $('xc-ps-note').innerHTML='Dumping every pass for the '+(which==='train_step'?'train step':'MLP block')+' wrote '+X.n0(P.files)+' files ('+X.mb(P.bytes)+') for '+P.nMods+' compiled modules: besides the function itself, every eager JAX operation the script ran while preparing its inputs (<code>'+P.eagerMods.join('</code>, <code>')+'</code>) is a tiny jitted program of its own. Instruction counts: <code>src/xla/passes.py</code>.';
  }
  X.seg($('xc-ps-seg'),v=>{which=v;draw()});
  X.onRender(draw);draw();
})();
