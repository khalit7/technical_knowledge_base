// ---- Reading tab, part 2: the logical-axis rules animation and the sharding table ----
(function(){
  const U=LCU, esc=U.esc, $=id=>document.getElementById(id), t=RD.t;
  const RULES=LC.cfg.rules['llama2-7b'];
  const CASE={f8:LC.shard.cases[0],f2t4:LC.shard.cases[1]};
  const MESH={f8:{fsdp:8},f2t4:{fsdp:2,tensor:4}};
  const W8={wi:{path:'decoder.layers.mlp.wi_0.kernel',names:['embed','layers','mlp'],dims:[0,2]},
            q:{path:'decoder.layers.self_attention.query.kernel',names:['embed_attn','layers','q_heads','kv'],dims:[0,2]},
            emb:{path:'token_embedder.embedding',names:['vocab','embed_vocab'],dims:[0,1]}};
  const flat=a=>a==null?[]:(Array.isArray(a)?a:[a]);
  const fmtAx=a=>a==null?'None':(Array.isArray(a)?(a.length===1?"'"+a[0]+"'":'('+a.map(x=>"'"+x+"'").join(', ')+')'):"'"+a+"'");
  const fmtSpec=r=>'P('+r.map(fmtAx).join(', ')+')';
  // logical_to_spec (utils/sharding.py) followed by remove_size_one_mesh_axis, applied to MaxText's own rules
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
  let wsel='wi',msel='f8',steps=[];
  function build(){const w=W8[wsel],m=MESH[msel],r=resolve(w.names,m);const rec=CASE[msel].rows.find(x=>x.name===w.path);
    steps=[{k:'intro'}].concat(r.trace.map(x=>({k:'rule',x})),[{k:'drop'},{k:'devices'}]);return {w,m,r,rec}}
  let B=build();
  function draw(i){
    const {w,m,r,rec}=B,st=steps[i],W=U.width($('lc-rule-svg'));let s='',H;
    const meshTxt=Object.entries(m).map(([a,n])=>a+' '+n).join(' x ');
    const shape=rec?rec.shape:[];
    // the weight's dimensions as boxes with their logical names and current assignment
    const nd=w.names.length,bw=Math.min(190,(W-20)/nd-8);
    const cur=w.names.map(()=>undefined);
    if(st.k!=='intro'){const upto=st.k==='rule'?steps.indexOf(st):steps.length;for(let j=1;j<=Math.min(upto,steps.length-1);j++){const sj=steps[j];if(sj.k==='rule'&&sj.x.act==='assign')cur[sj.x.pos]=sj.x.axes}}
    if(st.k!=='devices'){
      w.names.forEach((nm,j)=>{const x=10+j*(bw+8),y=14,hot=st.k==='rule'&&st.x.pos===j;
        s+='<rect x="'+x+'" y="'+y+'" width="'+bw+'" height="58" rx="6" fill="'+(hot?'var(--acc2)':'var(--soft)')+'" stroke="'+(hot?'var(--acc)':'var(--line)')+'"/>';
        s+=t(x+8,y+16,'dim '+j+': '+esc(nm),{fs:11,w:600});s+=t(x+8,y+31,'size '+(shape[j]!=null?U.num(shape[j]):'?'),{fs:10,fill:'var(--mute)'});
        const a=st.k==='drop'?r.fin[j]:cur[j];
        s+=t(x+8,y+48,a===undefined?'unassigned':(a===null?'None (replicated)':'→ '+fmtAx(a)),{fs:10.5,fill:a===undefined?'var(--mute)':'var(--good)'});});
      H=86;
      if(st.k==='rule'){const x=st.x;const ax=flat(x.axes);let sx=10;const y=H+8;
        s+=t(10,y,'rule '+(x.idx+1)+' of '+RULES.length+': ['+esc(x.nm)+', '+esc(fmtAx(x.axes))+']',{fs:11,w:600});
        ax.forEach(a=>{const c=x.clash.includes(a),sz=m[a]||1,lab=a+' ('+sz+')',wd=lab.length*6.4+12;if(sx+wd>W-6){sx=10}
          s+='<rect x="'+sx+'" y="'+(y+8)+'" width="'+wd+'" height="18" rx="9" fill="'+(c?'var(--bad)':(sz>1?'var(--acc)':'var(--dim)'))+'" fill-opacity="'+(c?.25:(sz>1?.25:.6))+'" stroke="'+(c?'var(--bad)':'var(--line)')+'"/>';
          s+=t(sx+6,y+21,esc(lab),{fs:10});sx+=wd+4});
        H=y+36}
      else if(st.k==='drop'){s+=t(10,H+10,'Drop mesh axes of size 1 on mesh '+meshTxt+' ->  '+fmtSpec(r.fin),{fs:11.5,w:600});H+=22}
    } else {
      // devices: the 2-D view (layer axis left out), split as the spec says
      const d0=w.dims[0],d1=w.dims[1],R=shape[d0],C=shape[d1]*(w.names.length===4?shape[3]:1);
      const ar=R/C,bwid=Math.min(W-30,520),bh=Math.max(60,Math.min(220,bwid*ar));
      const ax0=flat(r.fin[d0]),ax1=flat(r.fin[d1]);const n0=ax0.reduce((p,a)=>p*(m[a]||1),1),n1=ax1.reduce((p,a)=>p*(m[a]||1),1);
      for(let a=0;a<n0;a++)for(let b=0;b<n1;b++){const x=10+b*bwid/n1,y=18+a*bh/n0;const id=a*n1+b;
        s+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+(bwid/n1-1.5).toFixed(1)+'" height="'+(bh/n0-1.5).toFixed(1)+'" fill="var(--c'+(1+id%6)+')" fill-opacity=".55"/>';
        if(bwid/n1>40&&bh/n0>14)s+=t(x+4,y+12,'device '+id,{fs:10})}
      const n=8/(n0*n1);
      s+=t(10,12,'rows: '+w.names[d0]+' '+U.num(R)+' split '+n0+' ways   columns: '+(w.names.length===4?w.names[2]+' x '+w.names[3]:w.names[d1])+' '+U.num(C)+' split '+n1+' ways',{fs:10.5,fill:'var(--mute)'});
      H=bh+40;s+=t(10,H-8,n>1?'each block is held by '+n+' devices (replicated over the unused mesh axes)':'each of the 8 devices holds one block',{fs:10.5,fill:'var(--mute)'});
    }
    $('lc-rule-svg').innerHTML=RD.svg(W,H,s,'Logical axis rules, step '+(i+1));
    let cap='';
    if(st.k==='intro')cap='<b>The weight.</b> <code>'+esc(w.path)+'</code> has shape ['+shape.map(x=>U.num(x)).join(', ')+'] and logical names ('+w.names.map(n=>"'"+n+"'").join(', ')+'). The mesh is '+meshTxt+' (the other '+(12-Object.keys(m).length)+' of MaxText\'s 12 mesh axes have size 1). Rules are tried in their order in the config; only rules naming one of this weight\'s dimensions matter: '+(steps.length-3)+' of the '+RULES.length+'.';
    else if(st.k==='rule'){const x=st.x;cap=x.act==='assign'?'<b>Assign.</b> Rule '+(x.idx+1)+' names <code>'+esc(x.nm)+'</code> and none of its mesh axes is used by another dimension yet, so dimension '+x.pos+' takes '+esc(fmtAx(x.axes))+'.':
      (x.act==='clash'?'<b>Skip: collision.</b> Rule '+(x.idx+1)+' would give <code>'+esc(x.nm)+'</code> '+esc(fmtAx(x.axes))+', but '+x.clash.map(a=>'<code>'+a+'</code>').join(', ')+' already shard another dimension of this array. The next rule with the same name gets its chance.':
      '<b>Skip: already assigned.</b> Dimension '+x.pos+' took an earlier rule; later rules for <code>'+esc(x.nm)+'</code> are ignored.')}
    else if(st.k==='drop'){const ok=rec&&rec.spec===fmtSpec(r.fin);cap='<b>Result.</b> Removing mesh axes of size 1 leaves <code>'+esc(fmtSpec(r.fin))+'</code>. MaxText\'s own code on 8 simulated devices produced <code>'+esc(rec?rec.spec:'?')+'</code>: '+(ok?'<span class="lc-ok">the same</span>.':'<span class="lc-bad">different</span>.')}
    else cap='<b>On the devices.</b> Each device holds a block of ['+(rec?rec.shard_shape.map(x=>U.num(x)).join(', '):'?')+'] (layer axis included), '+U.MB(rec?rec.bytes_per_device:0)+' in float32. The compiler gathers blocks when a matmul needs the whole dimension (FSDP) or reduces partial sums (tensor parallelism): the Sharding and scale page shows which collectives.';
    $('lc-rule-cap').innerHTML=cap;
    const nAssign=steps.slice(1,i+1).filter(x=>x.k==='rule'&&x.x.act==='assign').length,nSkip=steps.slice(1,i+1).filter(x=>x.k==='rule'&&x.x.act!=='assign').length;
    $('lc-rule-cnt').innerHTML=RD.stat('Rules applied',String(nAssign),'')+RD.stat('Rules skipped',String(nSkip),'collision or already assigned')+RD.stat('Bytes per device',rec?U.MB(rec.bytes_per_device):'?','of '+U.MB(rec?rec.bytes:0));
  }
  const ra=U.anim({card:'lc-rule-card',ctl:'lc-rule-ctl',n:steps.length,tab:'t-read',draw:draw,label:'Rule step',ms:1700});
  const rebuild=()=>{B=build();ra.reset(steps.length)};
  U.seg($('lc-rule-w'),v=>{wsel=v;rebuild()});U.seg($('lc-rule-m'),v=>{msel=v;rebuild()});

  // sharding table
  const sel=$('lc-shtab-sel'),tb=document.querySelector('#lc-shtab tbody');
  sel.innerHTML=LC.shard.cases.map((c,i)=>'<option value="'+i+'">'+esc(c.label)+'</option>').join('');
  function showTab(){const c=LC.shard.cases[+sel.value];
    $('lc-shtab-stats').innerHTML=RD.stat('Parameters',U.num(c.params),c.n+' arrays')+RD.stat('Float32 bytes',U.MB(c.bytes),'')+RD.stat('Per device',U.MB(c.bytes_dev),'mesh '+Object.entries(c.mesh).map(([a,n])=>a+' '+n).join(' x '));
    tb.innerHTML=c.rows.map(r=>'<tr><td><code>'+esc(r.name)+'</code></td><td>['+r.shape.map(x=>U.num(x)).join(', ')+']</td><td><code>'+esc((r.logical||[]).join(', '))+'</code></td><td><code>'+esc(r.spec)+'</code></td><td>'+
      (r.error?'<span class="lc-bad">IndivisibleError</span>':'['+r.shard_shape.map(x=>U.num(x)).join(', ')+'] '+U.MB(r.bytes_per_device))+'</td></tr>').join('')+
      (c.label.includes('scan_layers=False')?'<tr><td colspan="5" class="mute small">Layers 1 to 31 omitted: the same nine arrays each.</td></tr>':'')}
  sel.addEventListener('change',showTab);showTab();
})();
