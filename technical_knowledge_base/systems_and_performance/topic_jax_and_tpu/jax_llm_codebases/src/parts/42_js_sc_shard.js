// ---- Scene, Fig. 3 (2026-11-12): one weight of Llama 2 7B walks MaxText's logical axis rules onto a mesh of 8 chips.
// Rules: LC.cfg.rules['llama2-7b'] (base.yml at 1a95d1e5 as MaxText's parser returned them, runs/lc_cfg.py). The page applies
// logical_to_spec's algorithm (utils/sharding.py) and remove_size_one_mesh_axis here and checks the result against the PartitionSpec,
// block shape and bytes per device MaxText's own code produced on 8 simulated CPU devices (LC.shard, runs/lc_shard.py).
// The rule trace is the table #lc-rt beside the step list #sx-shard. ----
(function(){
  if(!document.getElementById('stg-shard')||!window.S3||!window.LC)return;const {at,off,mix}=S3,U=LCU,esc=U.esc,$=id=>document.getElementById(id);
  const RULES=LC.cfg.rules['llama2-7b'];
  const CASE={f8:LC.shard.cases[0],f2t4:LC.shard.cases[1]};
  const MESH={f8:{fsdp:8},f2t4:{fsdp:2,tensor:4}};
  const W8={wi:{path:'decoder.layers.mlp.wi_0.kernel',names:['embed','layers','mlp'],dims:[0,2]},
            q:{path:'decoder.layers.self_attention.query.kernel',names:['embed_attn','layers','q_heads','kv'],dims:[0,2]},
            emb:{path:'token_embedder.embedding',names:['vocab','embed_vocab'],dims:[0,1]}};
  const flat=a=>a==null?[]:(Array.isArray(a)?a:[a]);
  const fmtAx=a=>a==null?'None':(Array.isArray(a)?(a.length===1?"'"+a[0]+"'":'('+a.map(x=>"'"+x+"'").join(', ')+')'):"'"+a+"'");
  const fmtSpec=r=>'P('+r.map(fmtAx).join(', ')+')';
  // logical_to_spec: a dimension takes the first matching rule whose mesh axes no other dimension uses yet; then size-1 axes are dropped
  function resolve(names,mesh){
    const res=names.map(()=>undefined),trace=[];
    RULES.forEach((rl,idx)=>{const [nm,axes]=rl;const pos=names.indexOf(nm);if(pos<0)return;
      const want=flat(axes),used=new Set();res.forEach((v,j)=>{if(v!==undefined&&j!==pos)flat(v).forEach(a=>used.add(a))});
      const clash=want.filter(a=>used.has(a));
      if(res[pos]!==undefined)trace.push({idx,nm,axes,pos,act:'taken',clash:[]});
      else if(clash.length)trace.push({idx,nm,axes,pos,act:'clash',clash});
      else{res[pos]=axes;trace.push({idx,nm,axes,pos,act:'assign',clash:[]})}});
    const fin=res.map(v=>{if(v===undefined)return null;const k=flat(v).filter(a=>(mesh[a]||1)>1);return k.length===0?null:(k.length===1?k[0]:k)});
    return {res,fin,trace};
  }
  let wsel='wi',msel='f8',B=null;
  function build(){const w=W8[wsel],m=MESH[msel],r=resolve(w.names,m),rec=CASE[msel].rows.find(x=>x.name===w.path);
    const shape=rec.shape,d0=w.dims[0],d1=w.dims[1];
    const R=shape[d0],C=shape[d1]*(w.names.length===4?shape[3]:1);
    const colName=w.names.length===4?w.names[2]+' × '+w.names[3]:w.names[d1];
    const n0=flat(r.fin[d0]).reduce((p,a)=>p*(m[a]||1),1),n1=flat(r.fin[d1]).reduce((p,a)=>p*(m[a]||1),1);
    // chips: 2 rows x 4 columns; coordinates on the mesh axes
    const chips=[];for(let d=0;d<8;d++){const co=msel==='f8'?{fsdp:d}:{fsdp:Math.floor(d/4),tensor:d%4};chips.push({d,row:Math.floor(d/4),col:d%4,co})}
    const bix=(axes,co)=>flat(axes).reduce((i,a)=>i*(m[a]||1)+(co[a]||0),0);
    chips.forEach(c=>{c.b0=bix(r.fin[d0],c.co);c.b1=bix(r.fin[d1],c.co)});
    // the plate: rows (first dimension) in depth, columns across; proportions follow the shape, the short side at least .9
    let pw=4.2,pd=4.2*R/C;if(pd>2.3){pd=2.3;pw=2.3*C/R}pw=Math.max(.9,pw);pd=Math.max(.9,pd);
    B={w,m,r,rec,shape,d0,d1,R,C,colName,n0,n1,chips,pw,pd,ok:rec.spec===fmtSpec(r.fin)};
    table()}
  // the rule trace, written beside the step list
  function table(){const {w,r,m,rec,ok}=B;
    document.querySelector('#lc-rt tbody').innerHTML=r.trace.map(x=>'<tr><td><code>['+esc(x.nm)+', '+esc(fmtAx(x.axes))+']</code> <span class="mute small">rule '+(x.idx+1)+' of '+RULES.length+'</span></td><td>'+x.pos+': <code>'+esc(w.names[x.pos])+'</code></td><td>'+
      (x.act==='assign'?'<span class="as">assigned</span>':x.act==='clash'?'<span class="sk">skipped: '+x.clash.map(a=>'<code>'+esc(a)+'</code>').join(', ')+' already used</span>':'<span class="sk">skipped: dimension already assigned</span>')+'</td></tr>').join('');
    $('lc-rt-res').innerHTML='Rules tried for this weight: '+r.trace.length+' of '+RULES.length+'. After dropping size-1 axes on mesh '+Object.entries(m).map(([a,n])=>a+' '+n).join(' &times; ')+': <code>'+esc(fmtSpec(r.fin))+'</code>. MaxText\'s own code: <code>'+esc(rec.spec)+'</code>, '+(ok?'<span class="lc-ok">the same</span>':'<span class="lc-bad">different</span>')+
      '; each device holds ['+rec.shard_shape.map(x=>U.num(x)).join(', ')+'], '+U.MB(rec.bytes_per_device)+' of '+U.MB(rec.bytes)+' in float32.'}
  // geometry: the weight stands as a glass plate at the back (rows of its first dimension top to bottom, as a matrix is written), the 8 chips lie on the floor in front
  const Y0=.35,ZP=-1.0,CX=[-1.65,-.55,.55,1.65],CZ=[.45,1.35],CW=.9,CH=.22,CD=.75;
  const axCol=(P,a)=>a==='tensor'?P.c2:P.c1;
  // the rule's mesh axes, with size-1 axes counted rather than listed (they are dropped at step 4)
  const short=(v,m)=>{if(v===undefined)return 'no rule';const a=flat(v),k=a.filter(x=>(m[x]||1)>1),d=a.length-k.length;return (k.length?k.join(', '):'nothing of size > 1')+(d?' (+'+d+' size-1)':'')};
  function draw(R,k,e){const P=R.P,b=B,w=b.w;R.grid(-3.4,3.4,-1.6,2.2,.5);
    const BC=[P.c1,P.c2,P.c3,P.c4,P.c5,P.c6,mix(P.c1,P.c3,.5),mix(P.c2,P.c4,.5)];
    const ph=Math.min(b.pd,2.1),pw=b.pw*(ph/b.pd),x0=-pw/2,top=Y0+ph;
    // 1. the weight as one glass plate
    const cut=k>=3?at(k,e,3):0,plateA=k===1?.4:1;
    if(cut<1)R.glass([x0,Y0,ZP],[pw,0,0],[0,ph,0],{c:P.c4,a:plateA*(1-cut),nu:Math.max(2,Math.round(8*pw/Math.max(pw,ph))),nv:Math.max(2,Math.round(8*ph/Math.max(pw,ph))),th:.04});
    // 4. cut into one block per distinct shard (gaps open as the step plays)
    const bw=pw/b.n1,bh=ph/b.n0,bc=(i,j)=>[x0+(j+.5)*bw,top-(i+.5)*bh,ZP];
    if(cut>0){const g=.06*cut;for(let i=0;i<b.n0;i++)for(let j=0;j<b.n1;j++){const ci=(i*b.n1+j)%BC.length;
      R.glass([x0+j*bw+g/2,top-(i+1)*bh+g/2,ZP],[bw-g,0,0],[0,bh-g,0],{c:BC[ci],a:cut,nu:2,nv:2,th:.04})}}
    // edge labels: logical name and size; step 3 the mesh axes the rules gave it; step 4 what is left
    const la=k===1?.5:1;
    [b.d0,b.d1].forEach(j=>{const col=j===b.d1,nm=col?b.colName:w.names[j],sz=col?b.C:b.R;let t=nm+' · '+U.num(sz);
      if(k===2)t=nm+' → '+short(b.r.res[j],b.m);
      if(k>=3)t=nm+' → '+(b.r.fin[j]?flat(b.r.fin[j]).join(', ')+', '+(col?b.n1:b.n0)+' ways':'None, not split');
      if(col)R.label([0,top,ZP],t,{mono:true,fs:12.5,b:1,dy:-14,c:P.ink,a:la});else R.label([x0,Y0+ph/2,ZP],t,{mono:true,fs:12.5,b:1,al:'right',dx:-10,c:P.ink,a:la})});
    if(k===0)R.label([pw/2,Y0+ph/2,ZP],'layers axis left out',{al:'left',dx:10,fs:12,c:P.mute,a:e,wide:1});
    if(k>=3)R.label([0,top,ZP],fmtSpec(b.r.fin)+(b.ok?'  ✓ same as MaxText':'  ✗ not MaxText'),{mono:true,fs:13,b:1,dy:-34,c:b.ok?P.good:P.bad,a:k===3?e:1});
    // 2. the chips of the mesh
    const chipA=k<1?0:k===1?e:1;
    b.chips.forEach(c=>{const p=[CX[c.col],0,CZ[c.row]];let fill=P.paper;
      if(k>=4){const ci=(c.b0*b.n1+c.b1)%BC.length;fill=mix(P.paper,BC[ci],.55*e)}
      R.box(p,[CW,CH,CD],{fill,a:chipA});
      if(k===1)R.label([p[0],CH,p[2]],'chip '+c.d,{fs:12,c:P.mute,a:chipA,wide:1})});
    if(chipA>0){if(msel==='f8')R.label([0,0,CZ[1]+CD/2],'mesh: fsdp 8, all 8 chips on one axis',{fs:12.5,b:1,dy:18,c:P.c1,a:chipA});
      else{R.label([0,0,CZ[1]+CD/2],'tensor 4 (columns)',{fs:12.5,b:1,dy:18,c:P.c2,a:chipA});R.label([CX[0]-CW/2,0,(CZ[0]+CZ[1])/2],'fsdp 2 (rows)',{fs:12.5,b:1,al:'right',dx:-8,c:P.c1,a:chipA})}}
    // 3. the rules give each named dimension its mesh axes: dots run from the mesh to the plate edge that takes them
    if(k===2)[b.d0,b.d1].forEach(j=>{flat(b.r.fin[j]).forEach(a=>{const tgt=j===b.d1?[0,top,ZP]:[x0,Y0+ph/2,ZP],src=a==='tensor'||msel==='f8'?[0,CH,CZ[1]]:[CX[0],CH,(CZ[0]+CZ[1])/2];
      R.flowArc(src,tgt,.4,{c:axCol(P,a),r:.065,a:e,n:8})})});
    // 5. every chip receives its block (a replicated block goes to several chips)
    if(k>=4){b.chips.forEach(c=>{const ci=(c.b0*b.n1+c.b1)%BC.length;R.flowArc(bc(c.b0,c.b1),[CX[c.col],CH+.04,CZ[c.row]],.25,{c:BC[ci],r:.06,a:e,n:5,speed:1.2})});
      const rep=8/(b.n0*b.n1);
      R.label([CX[3]+CW/2,CH,CZ[0]],'each chip: '+U.MB(b.rec.bytes_per_device),{al:'left',dx:10,fs:12.5,b:1,c:P.ink,a:e,grp:'out'});
      R.label([CX[3]+CW/2,CH,CZ[1]],rep>1?'each block on '+rep+' chips':'one block per chip',{al:'left',dx:10,fs:12.5,c:P.mute,a:e,grp:'out'})}
  }
  build();
  const full={cam:[.3,.42],bounds:[[-2.4,0,-1.1],[2.4,2.45,1.8]]};
  const st=S3.stage({id:'stg-shard',list:'sx-shard',fig:'Fig. 3 · logical names to chips (MaxText\'s rules, recorded specs)',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1400,hold:5000,draw,
    margin:w=>w<520?[22,10,26,10]:[30,130,26,120],
    view:k=>k===0?{cam:[.25,.22],bounds:[[-2.2,.3,-1.1],[2.2,2.5,-.9]]}:full});
  const re=()=>{build();if(st)st.list('sx-shard')};
  U.seg($('lc-rule-w'),v=>{wsel=v;re()});U.seg($('lc-rule-m'),v=>{msel=v;re()});
})();
