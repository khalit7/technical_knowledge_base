// ---- Reading 4: the same correction, four ways (recorded runs from window.HPD) ----
window.HP=window.HP||{};
// one chip per step of a recording: tool, class, decision; plus the incoming message
HP.chips=function(rec,upto){
  let out=[],k=0;
  rec.runs.forEach((r,ri)=>{
    out.push({run:1,txt:(ri?'new run: ':'run: ')+r.kind+' '+r.at,k:k});
    r.steps.forEach(s=>{
      if(s.msg){out.push({msg:1,txt:'Sam'+(s.mode==='steer'?' (steered in)':s.mode==='followup'?' (queued until the run ends)':s.mode==='interrupt'?' (aborts the run)':'')+': "'+s.msg+'"',mode:s.mode,k:k});return}
      k++;
      if(!s.tool){out.push({txt:s.fin?'finish':'(no action)',k:k,cls:'read'});return}
      out.push({txt:s.tool+(s.dec&&s.dec!=='allow'?' ['+s.dec+']':''),cls:s.cls,dec:s.dec,k:k,s:s});
    });
    if(r.end==='interrupted by a new message')out.push({txt:'run aborted',k:k,cls:'read'});
  });
  return out;
};
HP.outcome=function(rec){
  const f=rec.final||{},o=[];
  (f.outbox||[]).forEach(x=>o.push(['bad','SENT to '+(x.id==='m1'?'the garage':x.id)+': "'+(x.text||'')+'"']));
  (f.approvals||[]).forEach(x=>o.push(['mid','HELD, still waiting in the approval queue: '+x.tool+' "'+(x.args&&x.args.text||x.args&&x.args.amount||'')+'"']));
  (f.drafts||[]).forEach(x=>o.push(['ok','Draft only: "'+(x.text||'')+'"']));
  (f.pending_memory||[]).forEach(x=>o.push(['ok','Memory write staged for review: "'+x+'"']));
  if(!o.length)o.push(['ok','Nothing sent, nothing held']);
  return o;
};
(function(){
  const host=document.getElementById('hp-st-grid');if(!host||!window.HPD)return;
  const cap=document.getElementById('hp-st-cap');
  let model='haiku',rep='';
  const cells=[['steer','off','Steer, no gate'],['followup','off','Follow-up, no gate'],['steer','on','Steer, gate on'],['followup','on','Follow-up, gate on']];
  function rec(st,g){
    const base='s1_'+model+'_'+st+'_gate'+g;
    return HPD[base+rep]||HPD[base];
  }
  let maxK=1;
  function draw(i){
    maxK=1;let html='';
    cells.forEach(([st,g,name])=>{
      const r=rec(st,g);
      if(!r){html+='<div class="card"><b>'+name+'</b><p class="small mute">not recorded for this model</p></div>';return}
      const ch=HP.chips(r);ch.forEach(c=>{maxK=Math.max(maxK,c.k)});
      html+='<div class="card"><b>'+name+'</b> <span class="small mute">'+RD.esc(r.model_ids.join(', '))+'</span><div class="hp-runbox">'+
        ch.map(c=>{const vis=c.k<=i;let cl='s'+(c.msg?' msg':'')+(c.cls==='read'?' read':c.cls==='reversible'||c.cls==='staged'?' rev':c.cls==='irreversible'?' irr':'')+(c.dec==='hold'?' held':'')+(c.cls==='irreversible'&&c.dec==='allow'?' done':'')+(vis?'':' off');
          return '<span class="'+cl+'" title="'+RD.esc(c.s&&c.s.say||c.txt)+'">'+RD.esc(c.txt)+'</span>'}).join('')+'</div>'+
        (i>=maxStep()?'<ul class="tight small">'+HP.outcome(r).map(([c,t])=>'<li><span class="pill '+c+'">'+(c==='bad'?'irreversible':c==='mid'?'pending':'safe')+'</span>'+RD.esc(t)+'</li>').join('')+'</ul>':'')+'</div>';
    });
    host.innerHTML=html;
    cap.innerHTML=i===0?'<div class="t">The request</div><p>Sam asks the agent to book the garage. After the agent\'s first tool call, a correction arrives: the car was already serviced.</p>':
      i>=maxStep()?'<div class="t">Outcomes</div><p>Steer: the correction is read before the next model call. Follow-up: it waits until the run ends, by which time the booking reply has been sent (no gate) or held (gate on).</p>':
      '<div class="t">Model call '+i+'</div><p>Each chip is one action; a yellow chip is the incoming message, placed where the harness delivered it. Hover a chip for the model\'s words.</p>';
  }
  function maxStep(){let m=1;cells.forEach(([st,g])=>{const r=rec(st,g);if(r)HP.chips(r).forEach(c=>{m=Math.max(m,c.k)})});return m}
  const A=RD.anim({card:'hp-st-card',ctl:'hp-st-ctl',n:maxStep()+1,draw,ms:1600,label:'Model call'});
  const ms=document.getElementById('hp-st-model'),rp=document.getElementById('hp-st-rep');
  if(ms)RD.seg(ms,v=>{model=v;rp.disabled=v!=='haiku';if(v!=='haiku'){rep='';rp.value=''}A.reset(maxStep()+1)});
  if(rp)rp.addEventListener('change',()=>{rep=rp.value;A.reset(maxStep()+1)});
})();
