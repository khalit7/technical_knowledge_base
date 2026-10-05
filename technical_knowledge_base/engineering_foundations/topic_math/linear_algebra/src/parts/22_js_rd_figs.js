// ---- Reading tab: static figures (vectors, maps, unit balls, subspaces, LoRA spectra) and the real-data fills ----
(function(){
  const D=window.LA_DATA,F=LA.fixed,$=id=>document.getElementById(id);
  // arrow from (x1,y1) to (x2,y2) in screen coordinates
  const arrow=(x1,y1,x2,y2,col,w,dash)=>{const a=Math.atan2(y2-y1,x2-x1),h=8;
    return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+col+'" stroke-width="'+(w||2)+'"'+(dash?' stroke-dasharray="'+dash+'"':'')+'/>'+
      '<polygon points="'+x2+','+y2+' '+(x2-h*Math.cos(a-0.4))+','+(y2-h*Math.sin(a-0.4))+' '+(x2-h*Math.cos(a+0.4))+','+(y2-h*Math.sin(a+0.4))+'" fill="'+col+'"/>'};
  window.RDF={arrow};
  // ---------- 1. vectors ----------
  function vec(){const el=$('rd-vec-svg');if(!el)return;const W=Math.min(RD.width(el),520),H=Math.round(W*0.8);
    const x0=-0.6,x1=2.6,y0=-2.4,y1=1.6,sx=v=>(v-x0)/(x1-x0)*W,sy=v=>H-(v-y0)/(y1-y0)*H;
    let b='';for(let g=-2;g<=2;g++){b+='<line x1="'+sx(g)+'" y1="'+sy(y0)+'" x2="'+sx(g)+'" y2="'+sy(y1)+'" stroke="var(--line)"/><line x1="'+sx(x0)+'" y1="'+sy(g)+'" x2="'+sx(x1)+'" y2="'+sy(g)+'" stroke="var(--line)"/>'}
    b+='<line x1="'+sx(x0)+'" y1="'+sy(0)+'" x2="'+sx(x1)+'" y2="'+sy(0)+'" stroke="var(--mute)"/><line x1="'+sx(0)+'" y1="'+sy(y0)+'" x2="'+sx(0)+'" y2="'+sy(y1)+'" stroke="var(--mute)"/>';
    b+='<line x1="'+sx(2)+'" y1="'+sy(1)+'" x2="'+sx(2)+'" y2="'+sy(0)+'" stroke="var(--mute)" stroke-dasharray="4 3"/>';
    b+='<circle cx="'+sx(2)+'" cy="'+sy(0)+'" r="4" fill="var(--c1)"/>';
    const vs=[[2,1,'var(--ink)','x = (2, 1)'],[1,0,'var(--c1)','cat (1, 0): 2'],[0,1,'var(--c3)','dog (0, 1): 1'],[1,-2,'var(--c2)','sat (1, -2): 0']];
    vs.forEach(v=>{b+=arrow(sx(0),sy(0),sx(v[0]),sy(v[1]),v[2],v[2]==='var(--ink)'?2.6:2)});
    const lab=[[2,1,6,-6,'start'],[1,0,0,-10,'middle'],[0,1,6,-4,'start'],[1,-2,8,4,'start']];
    vs.forEach((v,i)=>{b+=RD.t(sx(v[0])+lab[i][2],sy(v[1])+lab[i][3],v[3],{a:lab[i][4],fill:v[2],fs:12,w:600})});
    b+=RD.t(sx(2)-4,sy(0)+16,'projection (2, 0)',{fs:11,fill:'var(--mute)',a:'end'});
    el.innerHTML=RD.svg(W,H,b,'The input and the three word vectors')}
  // ---------- 2. maps ----------
  const MAPS={A:[[3,0],[4,5]],rot:LA.rot(Math.PI/6),shear:[[1,1],[0,1]],proj:[[1,0],[0,0]],refl:[[1,0],[0,-1]],W:[[2,-2],[-2,5]]};
  const MAPCAP={A:'A sends e1 to its first column (3, 4) and e2 to (0, 5). The unit square becomes a parallelogram of area 15 = det A.',
    rot:'A rotation by 30 degrees: columns (0.866, 0.5) and (-0.5, 0.866). Lengths and angles are kept; det = 1.',
    shear:'A shear: e1 stays, e2 goes to (1, 1). Area is kept (det = 1) but angles are not.',
    proj:'Projection onto the horizontal axis: e2 goes to 0. The square collapses to a segment: det = 0, rank 1, and the map cannot be undone.',
    refl:'Reflection across the horizontal axis: det = -1, the square is flipped (orientation reversed) but keeps its area.',
    W:'S = WᵀW = [[2, -2], [-2, 5]], built from the tiny model: symmetric, det = 6. Section 11 finds its eigenvectors.'};
  let mapM='A';
  function map(){const el=$('rd-map-svg');if(!el)return;const M=MAPS[mapM],W=Math.min(RD.width(el),520),H=Math.round(W*0.78);
    const pts=[[1,1],[-1,1],[1,-1],[-1,-1]].map(p=>LA.mv(M,p));let R=2;pts.forEach(p=>{R=Math.max(R,Math.abs(p[0])*1.1,Math.abs(p[1])*1.1)});
    const sc=Math.min(W,H)/(2*R),cx=W/2,cy=H/2,X=v=>cx+v*sc,Y=v=>cy-v*sc;let b='';
    for(let g=-Math.floor(R);g<=Math.floor(R);g++){b+='<line x1="'+X(g)+'" y1="0" x2="'+X(g)+'" y2="'+H+'" stroke="var(--line)"/><line x1="0" y1="'+Y(g)+'" x2="'+W+'" y2="'+Y(g)+'" stroke="var(--line)"/>'}
    // transformed grid of [-1,1]^2 at 0.5 spacing
    for(let g=-1;g<=1.001;g+=0.5){const a=LA.mv(M,[g,-1]),c=LA.mv(M,[g,1]),d=LA.mv(M,[-1,g]),e=LA.mv(M,[1,g]);
      b+='<line x1="'+X(a[0])+'" y1="'+Y(a[1])+'" x2="'+X(c[0])+'" y2="'+Y(c[1])+'" stroke="var(--c4)" stroke-opacity=".45"/><line x1="'+X(d[0])+'" y1="'+Y(d[1])+'" x2="'+X(e[0])+'" y2="'+Y(e[1])+'" stroke="var(--c4)" stroke-opacity=".45"/>'}
    const sq=[[0,0],[1,0],[1,1],[0,1]].map(p=>LA.mv(M,p));b+='<polygon points="'+sq.map(p=>X(p[0])+','+Y(p[1])).join(' ')+'" fill="var(--c5)" fill-opacity=".28" stroke="var(--c5)"/>';
    b+='<polygon points="'+[[0,0],[1,0],[1,1],[0,1]].map(p=>X(p[0])+','+Y(p[1])).join(' ')+'" fill="none" stroke="var(--mute)" stroke-dasharray="3 3"/>';
    let circ='';for(let i=0;i<=72;i++){const t=i/72*2*Math.PI,p=LA.mv(M,[Math.cos(t),Math.sin(t)]);circ+=(i?'L':'M')+X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1)}
    b+='<path d="'+circ+'" fill="none" stroke="var(--c6)" stroke-width="2"/>';
    const c1=[M[0][0],M[1][0]],c2=[M[0][1],M[1][1]];
    b+=arrow(X(0),Y(0),X(c1[0]),Y(c1[1]),'var(--c1)',2.4);if(LA.norm(c2)>1e-9)b+=arrow(X(0),Y(0),X(c2[0]),Y(c2[1]),'var(--c2)',2.4);
    b+=RD.t(X(c1[0])+5,Y(c1[1])+14,'Ae₁',{fill:'var(--c1)',fs:12,w:600})+RD.t(X(c2[0])+5,Y(c2[1])-5,'Ae₂',{fill:'var(--c2)',fs:12,w:600});
    el.innerHTML=RD.svg(W,H,b,'A matrix acting on the plane');
    $('rd-map-cap').innerHTML='<b>det = '+F(LA.det2(M),3)+'.</b> '+MAPCAP[mapM]+' <span class="mute">Faint grid: the plane before; purple grid, teal ellipse and yellow parallelogram: the square [-1, 1]², the unit circle and the unit square after the map.</span>'}
  // ---------- 7. unit balls ----------
  function balls(){const el=$('rd-ball-svg');if(!el)return;const W=Math.min(RD.width(el),460),H=Math.round(W*0.8),R=1.55,sc=Math.min(W,H)/(2*R),cx=W/2,cy=H/2,X=v=>cx+v*sc,Y=v=>cy-v*sc;
    let b='<line x1="0" y1="'+cy+'" x2="'+W+'" y2="'+cy+'" stroke="var(--line)"/><line x1="'+cx+'" y1="0" x2="'+cx+'" y2="'+H+'" stroke="var(--line)"/>';
    b+='<polygon points="'+[[1,0],[0,1],[-1,0],[0,-1]].map(p=>X(p[0])+','+Y(p[1])).join(' ')+'" fill="var(--c2)" fill-opacity=".12" stroke="var(--c2)" stroke-width="2"/>';
    b+='<circle cx="'+cx+'" cy="'+cy+'" r="'+sc+'" fill="none" stroke="var(--c1)" stroke-width="2"/>';
    b+='<rect x="'+X(-1)+'" y="'+Y(1)+'" width="'+2*sc+'" height="'+2*sc+'" fill="none" stroke="var(--c3)" stroke-width="2"/>';
    // loss contour lines 0.4x + y = c touching the diamond (c = 1) and the circle (c = sqrt(1.16))
    const line=(c,col)=>{const xa=-R,xb=R;return '<line x1="'+X(xa)+'" y1="'+Y(c-0.4*xa)+'" x2="'+X(xb)+'" y2="'+Y(c-0.4*xb)+'" stroke="'+col+'" stroke-dasharray="5 4"/>'};
    b+=line(1,'var(--c2)')+line(Math.sqrt(1.16),'var(--c1)');
    b+='<circle cx="'+X(0)+'" cy="'+Y(1)+'" r="5" fill="var(--c2)"/>';const t=[0.4,1].map(v=>v/Math.sqrt(1.16));b+='<circle cx="'+X(t[0])+'" cy="'+Y(t[1])+'" r="5" fill="var(--c1)"/>';
    b+=RD.t(X(1.02),Y(-0.08),'L1',{fill:'var(--c2)',fs:12,w:600})+RD.t(X(0.72),Y(-0.85),'L2',{fill:'var(--c1)',fs:12,w:600})+RD.t(X(-1.0),Y(1.08),'L∞',{fill:'var(--c3)',fs:12,w:600,a:'start'});
    b+=RD.t(X(0)+8,Y(1)-8,'(0, 1): corner, x₁ = 0',{fs:11,fill:'var(--c2)'});b+=RD.t(X(t[0])+8,Y(t[1])+16,'(0.37, 0.93)',{fs:11,fill:'var(--c1)'});
    el.innerHTML=RD.svg(W,H,b,'Unit balls of the L1, L2 and L-infinity norms')}
  // ---------- 6. four subspaces of W ----------
  function sub(){const el=$('rd-sub-svg');if(!el)return;const W=Math.min(RD.width(el),640),stack=W<520,pw=stack?W:W/2,ph=Math.round(Math.min(280,pw*0.72)),H=stack?2*ph+10:ph;let b='';
    // panel 1: input plane R^2
    const lx=pw/2,ly=ph/2+8,s1=Math.min(pw,ph)/6;
    b+='<rect x="4" y="22" width="'+(pw-8)+'" height="'+(ph-26)+'" rx="8" fill="var(--c1)" fill-opacity=".08" stroke="var(--line)"/>';
    b+='<line x1="10" y1="'+ly+'" x2="'+(pw-10)+'" y2="'+ly+'" stroke="var(--line)"/><line x1="'+lx+'" y1="26" x2="'+lx+'" y2="'+(ph-8)+'" stroke="var(--line)"/>';
    b+=RDF.arrow(lx,ly,lx+2*s1,ly-1*s1,'var(--ink)',2.2)+RD.t(lx+2*s1+4,ly-s1-4,'x = (2, 1)',{fs:11});
    b+='<circle cx="'+lx+'" cy="'+ly+'" r="4" fill="var(--c2)"/>'+RD.t(lx+6,ly+15,'null space = {0}',{fs:11,fill:'var(--c2)'});
    b+=RD.t(6,15,'Input ℝ²: row space is all of it',{fs:11.5,w:600});
    // panel 2: output R^3, isometric projection
    const ox0=stack?0:pw,oy0=stack?ph+10:0,ox=ox0+pw/2,oy=oy0+ph/2+14,k=Math.min(pw,ph)/7;
    const P=(p)=>[ox+(p[0]-p[1])*0.866*k,oy-(p[2]-(p[0]+p[1])*0.5)*k];
    const c1=[1,0,1],c2=[0,1,-2],n=[-1,2,1],nl=Math.sqrt(6);
    const corner=(a,c)=>c1.map((v,i)=>a*v+c*c2[i]);const cs=[[-1.1,-1.1],[1.1,-1.1],[1.1,1.1],[-1.1,1.1]].map(q=>P(corner(q[0],q[1])));
    b+='<polygon points="'+cs.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ')+'" fill="var(--c3)" fill-opacity=".18" stroke="var(--c3)"/>';
    [[1,0,0],[0,1,0],[0,0,1]].forEach((e,i)=>{const a=P(e.map(v=>v*2.2)),o=P([0,0,0]);b+='<line x1="'+o[0]+'" y1="'+o[1]+'" x2="'+a[0]+'" y2="'+a[1]+'" stroke="var(--line)"/>'+RD.t(a[0],a[1]-3,['cat','dog','sat'][i],{fs:10,fill:'var(--mute)',a:'middle'})});
    const na=P(n.map(v=>-1.6*v/nl)),nb=P(n.map(v=>1.9*v/nl));b+='<line x1="'+na[0]+'" y1="'+na[1]+'" x2="'+nb[0]+'" y2="'+nb[1]+'" stroke="var(--c2)" stroke-width="2.4"/>';
    b+=RD.t(ox0+pw-6,oy0+ph-8,'orange line: left null space (-1, 2, 1)',{fs:11,fill:'var(--c2)',a:'end'});
    const z=P([2,1,0]),o=P([0,0,0]);b+=RDF.arrow(o[0],o[1],z[0],z[1],'var(--ink)',2.2)+RD.t(z[0]+5,z[1]+12,'z = (2, 1, 0)',{fs:11});
    b+=RD.t(ox0+6,oy0+15,'Output ℝ³: column space is a plane',{fs:11.5,w:600});
    el.innerHTML=RD.svg(W,H,b,'The four fundamental subspaces of W')}
  // ---------- 1. embedding cosines (real GPT-2) ----------
  function embcos(){const el=$('rd-embcos');if(!el)return;const w=D.emb_words,c=D.emb_cos;
    let h='<table class="mini"><thead><tr><th></th>'+w.map(x=>'<th class="num">'+x+'</th>').join('')+'</tr></thead><tbody>';
    w.forEach((x,i)=>{h+='<tr><th>'+x+'</th>'+c[i].map((v,j)=>{const a=j===i?0:Math.max(0,Math.min(1,(v-0.15)/0.55));return '<td class="num" style="background:color-mix(in srgb,var(--c1) '+Math.round(a*45)+'%,transparent)">'+(j===i?'1':v.toFixed(2))+'</td>'}).join('')+'</tr>'});
    el.innerHTML=h+'</tbody></table>';
    $('rd-embcos-cap').innerHTML='Input embeddings of GPT-2 small ('+D.model+', revision '+D.revision.slice(0,7)+'), each word a single token with its leading space. The pairs you would expect stand out: king and queen '+c[4][5].toFixed(2)+', Paris and London '+c[7][8].toFixed(2)+', cat and dog '+c[0][1].toFixed(2)+'. But two random tokens already average '+D.emb_rand_cos_mean.toFixed(2)+' (20,000 random pairs, standard deviation '+D.emb_rand_cos_sd.toFixed(2)+'), not 0: section 15 explains why, and why a cosine must be read against that baseline.'}
  // ---------- 14. GPT-2 low-rank table ----------
  const k90=s=>{const t=s.reduce((a,v)=>a+v*v,0);let c=0;for(let i=0;i<s.length;i++){c+=s[i]*s[i];if(c>=0.9*t)return i+1}return s.length};
  window.RDF.k90=k90;
  const NAMES={W_Q:'Query W_Q',W_K:'Key W_K',W_V:'Value W_V',W_O:'Attention output W_O',W_in:'MLP input (768 to 3072)',W_out:'MLP output (3072 to 768)'};window.RDF.NAMES=NAMES;
  function lowtab(){const el=$('rd-low-tab');if(!el)return;const L=k=>(k||[]).find(p=>p[0]===64);
    let h='<table class="mini"><thead><tr><th>Layer 5 matrix</th><th class="num">k90 real</th><th class="num">k90 random</th><th class="num">Output error at k = 64</th><th class="num">Loss at k = 64</th></tr></thead><tbody>';
    Object.keys(D.mats).forEach(n=>{const m=D.mats[n],l=L(m.loss_k);h+='<tr><td>'+NAMES[n]+'</td><td class="num">'+k90(m.s)+'</td><td class="num">'+k90(m.rand_s)+'</td><td class="num">'+(100*m.out_err[63]).toFixed(0)+'%</td><td class="num">'+l[1].toFixed(3)+' (+'+(l[1]-D.base_loss).toFixed(2)+')</td></tr>'});
    el.innerHTML=h+'</tbody></table>';$('rd-low-base').textContent=D.base_loss.toFixed(3);
    $('rd-low-whole').innerHTML='all 48 matrices: '+D.whole.map(w=>Math.round(w.frac*100)+'% of rank, loss '+w.loss.toFixed(2)).join('; ');
    const s=$('rd-svd-k90');if(s)s.textContent=k90(D.mats.W_Q.s);const r=$('rd-svd-rk90');if(r)r.textContent=k90(D.mats.W_Q.rand_s)}
  // ---------- 14. LoRA spectra ----------
  function lora(){const el=$('rd-lora-svg');if(!el)return;const W=RD.width(el),two=W>=560,pw=two?(W-20)/2:W,ph=210,H=two?ph:2*ph+16;let b='';
    D.lora.forEach((L,j)=>{const ox=two?j*(pw+20):0,oy=two?0:j*(ph+16),l=ox+38,r=ox+pw-8,t=oy+22,bt=oy+ph-28,n=L.r+1;
      const X=i=>l+(i-1)/(n-1)*(r-l),Y=v=>bt-v*(bt-t);
      b+=RD.t(ox+4,oy+12,L.name.split('/')[1]+' (r = '+L.r+', α = '+L.alpha+')',{fs:11.5,w:600});
      [0,0.5,1].forEach(v=>{b+='<line x1="'+l+'" y1="'+Y(v)+'" x2="'+r+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(l-4,Y(v)+4,v.toFixed(1),{fs:10,a:'end',fill:'var(--mute)'})});
      const med=[];for(let i=0;i<n;i++){const vs=L.layers.map(x=>x.s[i]/x.s[0]).sort((a,c)=>a-c);med.push(vs[Math.floor(vs.length/2)])}
      L.layers.forEach(x=>{b+='<polyline points="'+x.s.slice(0,n).map((v,i)=>X(i+1).toFixed(1)+','+Y(v/x.s[0]).toFixed(1)).join(' ')+'" fill="none" stroke="var(--c'+(j?4:1)+')" stroke-opacity=".3"/>'});
      b+='<polyline points="'+med.map((v,i)=>X(i+1).toFixed(1)+','+Y(v).toFixed(1)).join(' ')+'" fill="none" stroke="var(--c'+(j?4:1)+')" stroke-width="2.6"/>';
      const ticks=L.r<=8?[1,2,4,6,8,9]:[1,8,16,24,33];ticks.forEach(i=>{b+=RD.t(X(i),bt+14,String(i),{fs:10,a:i===n?'end':'middle',fill:'var(--mute)'})});
      b+=RD.t((l+r)/2,bt+26,'singular value index i',{fs:10,a:'middle',fill:'var(--mute)'})});
    el.innerHTML=RD.svg(W,H,b,'Singular values of two real LoRA updates');
    const frac=L=>{const f=L.layers.map(x=>{const t=x.s.reduce((a,v)=>a+v*v,0);return x.s[0]*x.s[0]/t}).sort((a,c)=>a-c);return f[Math.floor(f.length/2)]};
    const fa=frac(D.lora[0]),fb=frac(D.lora[1]);$('rd-lora-top1a').textContent=Math.round(fa*100)+'%';$('rd-lora-top1b').textContent=Math.round(fb*100)+'%';
    $('rd-lora-cap').innerHTML='Each thin line is one of the 12 layers: the singular values of ΔW = (α/r)BA for the whole <code>c_attn</code> matrix, divided by the largest; the thick line is the median. The value at index r + 1 is zero (about 10⁻¹⁴ before rounding). Adapters: '+D.lora.map(L=>'<code>'+L.name+'</code> (revision '+L.rev.slice(0,7)+')').join(' and ')+', read with PyTorch, base GPT-2 small.'}
  function attn(){const a=$('rd-attn-randcos');if(a)a.textContent=D.emb_rand_cos_mean.toFixed(2);const m=$('rd-attn-mean');if(m)m.textContent=Math.round(D.emb_mean_ratio*100)+'%';
    const q=$('rd-attn-qkrank');if(q)q.textContent=D.head0_qk_rank}
  function all(){vec();map();balls();sub();lora()}
  embcos();lowtab();attn();
  const seg=$('rd-map-seg');if(seg)RD.seg(seg,m=>{mapM=m;map()});
  RD.onRender(all);RD.onResize(all);all();
})();
