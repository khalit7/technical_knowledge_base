// ---- Edit format bench tab (t-edit): data HB.bench ----
(function(){
  const H=window.HB, B=H&&H.bench; if(!B||!document.getElementById('t-edit'))return;
  const esc=RD.esc, F=['exact','sr','udiff','whole','patch'];
  const FN={exact:'Exact replace (tool call)',sr:'SEARCH/REPLACE',udiff:'Unified diff',whole:'Whole file',patch:'apply_patch'};
  const APN={exact:'exact replace',sr_aider:'Aider do_replace',sr_strict:'exact SEARCH match',udiff_git:'git apply',udiff_recount:'git apply --recount',udiff_aider:'Aider udiff applier',whole:'write the file',patch:'Codex apply_patch (port)'};
  // format specs
  document.getElementById('hbe-spec').innerHTML=F.map(f=>'<details class="mist"><summary>'+FN[f]+'</summary><div class="b"><pre class="hb-code" style="white-space:pre-wrap">'+esc(B.spec[f])+'</pre></div></details>').join('');
  const models=B.models.filter(m=>B.runs[m.id]);
  const msel=document.getElementById('hbe-model');
  msel.innerHTML=models.map(m=>'<option value="'+m.id+'">'+esc(m.label)+'</option>').join('');
  const st={m:models[0].id,when:'1',sel:null};
  const prim=f=>B.primary[f];
  function cell(m,t,f,when){
    const a=(B.runs[m][t]||{})[f]; if(!a)return {cls:'na',txt:'-'};
    const r1=a[0].res[prim(f)], rl=a[a.length-1].res[prim(f)];
    if(when==='1'||a.length===1){if(r1[1])return {cls:'ok',txt:'ok'};return r1[0]?{cls:'wrong',txt:'wrong'}:{cls:'fail',txt:'refused'}}
    if(rl[1])return {cls:r1[1]?'ok':'rec',txt:'ok'};return rl[0]?{cls:'wrong',txt:'wrong'}:{cls:'fail',txt:'refused'};
  }
  const mx=document.getElementById('hbe-mx');
  function counts(m,when,upto){
    let ok=0,wrong=0,fail=0,k=0;
    B.tasks.forEach(t=>F.forEach(f=>{if(upto!=null&&k++>=upto)return;const c=cell(m,t.id,f,when);if(c.cls==='ok'||c.cls==='rec')ok++;else if(c.cls==='wrong')wrong++;else if(c.cls==='fail')fail++}));
    return {ok,wrong,fail};
  }
  function drawMatrix(upto){
    let k=0;
    mx.innerHTML='<thead><tr><th class="t">Edit</th>'+F.map(f=>'<th>'+FN[f]+'</th>').join('')+'</tr></thead><tbody>'+
      B.tasks.map(t=>'<tr><th class="t" title="'+esc(t.ask)+'">'+esc(t.id)+' <span class="mute">'+esc(t.file)+'</span></th>'+F.map(f=>{const show=upto==null||k<upto;const last=upto!=null&&k===upto-1;k++;
        if(!show)return '<td class="c na" data-t="'+t.id+'" data-f="'+f+'"></td>';
        const c=cell(st.m,t.id,f,st.when);return '<td class="c '+c.cls+(last?' flash':'')+(st.sel&&st.sel[0]===t.id&&st.sel[1]===f?' sel':'')+'" data-t="'+t.id+'" data-f="'+f+'">'+c.txt+'</td>'}).join('')+'</tr>').join('')+'</tbody>';
    const c=counts(st.m,st.when,upto);
    document.getElementById('hbe-stats').innerHTML=RD.stat('correct',String(c.ok),'of '+(upto==null?B.tasks.length*F.length:upto)+' cells')+RD.stat('applied but wrong',String(c.wrong),'')+RD.stat('refused by the applier',String(c.fail),'');
  }
  const N=B.tasks.length*F.length;
  const cap=document.getElementById('hbe-cap');
  const an=RD.anim({card:'hbe-card',ctl:'hbe-ctl',n:N+1,ms:260,label:'Cells shown',tab:'t-edit',start:N,
    draw:i=>{drawMatrix(i>=N?null:i);const t=B.tasks[Math.floor(Math.max(0,i-1)/F.length)],f=F[Math.max(0,i-1)%F.length];
      cap.innerHTML=i>=N?'All '+N+' cells, '+(st.when==='1'?'first attempt':'after one retry')+'. Switch "Show" to see which refusals the error message repaired.':
        (i===0?'Replay: one cell per step, edit by edit.':'<b>'+esc(t.id)+', '+FN[f]+'</b>: '+esc(t.ask))}});
  mx.addEventListener('click',e=>{const td=e.target.closest('td.c');if(!td)return;st.sel=[td.dataset.t,td.dataset.f];an.go(N);detail()});
  RD.seg(document.getElementById('hbe-when'),v=>{st.when=v;an.go(N)});
  msel.addEventListener('change',()=>{st.m=msel.value;an.go(N);detail();});
  function detail(){
    const d=document.getElementById('hbe-det'); if(!st.sel){return}
    const [tid,f]=st.sel, t=B.tasks.find(x=>x.id===tid), a=(B.runs[st.m][tid]||{})[f];
    if(!a){d.innerHTML='<span class="mute">Not run for this model.</span>';return}
    let h='<b>'+esc(tid)+'</b>, '+esc(t.file)+', '+FN[f]+'. <span class="mute">Request: '+esc(t.ask)+'</span>';
    a.forEach((x,i)=>{
      h+='<h4 style="margin:10px 0 2px">'+(i===0?'First attempt':'Retry, after the error was sent back')+' <span class="mute small">('+(x.out??'-')+' output tokens'+(x.think?', of which '+x.think+' thinking':'')+')</span></h4><pre class="hb-code">'+esc(x.reply||'(no reply)')+'</pre><div class="hbe-ap">'+
        Object.entries(x.res).map(([k,v])=>'<span>'+esc(APN[k]||k)+'</span><span><span class="'+(v[1]?'y':(v[0]?'w':'n'))+'">'+(v[1]?'correct':(v[0]?'applied, check failed':'refused'))+'</span> '+(v[1]?'':'<span class="mute">'+esc(v[2].slice(0,300))+'</span>')+'</span>').join('')+'</div>';
      if(x.err&&i<a.length-1)h+='<div class="small"><b>Sent back to the model:</b></div><pre class="hb-code" style="white-space:pre-wrap">'+esc(x.err)+'</pre>';
    });
    d.innerHTML=h;
  }
  // summary across models
  function med(a){a=a.filter(x=>x!=null).sort((p,q)=>p-q);return a.length?a[Math.floor(a.length/2)]:null}
  document.getElementById('hbe-sum').innerHTML=models.map(m=>{
    const rows=F.map(f=>{let c1=0,c2=0;const toks=[];B.tasks.forEach(t=>{const a=(B.runs[m.id][t.id]||{})[f];if(!a)return;toks.push(a[0].out);if(a[0].res[prim(f)][1])c1++;if(a[a.length-1].res[prim(f)][1])c2++});
      const n=B.tasks.length;return '<div class="row"><span>'+FN[f]+'</span><span class="tr"><span class="f" style="left:0;width:'+(c2/n*100)+'%;background:var(--acc2)"></span><span class="f" style="left:0;width:'+(c1/n*100)+'%;background:var(--acc)"></span></span><span class="v">'+c1+' / '+c2+' <span class="mute small">'+(med(toks)??'-')+' tok</span></span></div>'}).join('');
    return '<h4 style="margin:12px 0 4px">'+esc(m.label)+'</h4>'+rows}).join('');
  // appliers table
  const apps=[['udiff','udiff_git'],['udiff','udiff_recount'],['udiff','udiff_aider'],['sr','sr_strict'],['sr','sr_aider']];
  document.getElementById('hbe-apps').innerHTML='<thead><tr><th>Applier</th>'+models.map(m=>'<th class="num">'+esc(m.label.split(',')[0])+(m.label.includes('thinking on')?' (thinking)':m.label.includes('thinking off')?' (no thinking)':'')+'</th>').join('')+'</tr></thead><tbody>'+
    apps.map(([f,k])=>'<tr><td>'+esc(APN[k])+' <span class="mute small">('+FN[f]+' replies)</span></td>'+models.map(m=>{let c=0,n=0;B.tasks.forEach(t=>{const a=(B.runs[m.id][t.id]||{})[f];if(!a)return;n++;if(a[0].res[k]&&a[0].res[k][1])c++});return '<td class="num">'+c+' of '+n+'</td>'}).join('')+'</tr>').join('')+'</tbody>';
  // failures grouped
  const why=document.getElementById('hbe-why');
  why.innerHTML=F.map(f=>{const items=[];models.forEach(m=>B.tasks.forEach(t=>{const a=(B.runs[m.id][t.id]||{})[f];if(!a)return;const r=a[0].res[prim(f)];if(!r[1])items.push('<li><b>'+esc(t.id)+'</b> <span class="mute">('+esc(m.label.split(',')[0])+(m.label.includes('thinking on')?', thinking':'')+(m.backend==='local'?'':'')+')</span>: '+esc(r[2].split('\n')[0].slice(0,160))+'</li>')}));
    return '<details class="mist"><summary>'+FN[f]+': '+items.length+' first-attempt failures across models</summary><div class="b"><ul class="tight">'+(items.join('')||'<li>none</li>')+'</ul></div></details>'}).join('');
  (window.TAB_RENDER=window.TAB_RENDER||{});
  st.sel=['t02','udiff'];detail();
})();
