// ---- Tab: A day, replayed (s3 recordings) ----
(function(){
  const card=document.getElementById('dy-card');if(!card||!window.HPD)return;
  let model='sonnet',A=null,flat=[];
  const rec=()=>HPD['s3_'+model+'_day'];
  function flatten(r){
    const out=[];
    r.runs.forEach((run,ri)=>run.steps.forEach(s=>{if(!s.msg)out.push({ri,run,s})}));
    return out;
  }
  function stateUpTo(i){
    const S={cal:[['e1','Thursday 8 October','11:00','1:1 with Priya'],['e2','Wednesday 7 October','09:00','Team planning']],drafts:[],appr:[],out:[],pay:[],mem:[],owner:[],undo:[],refused:[]};
    let last=null;
    for(let k=0;k<=i&&k<flat.length;k++){
      const s=flat[k].s;if(!s.tool)continue;const a=s.args||{};last=k;
      if(s.dec==='hold'){S.appr.push([k,s.tool+' '+(a.text?'"'+a.text+'"':a.amount?a.amount+' for '+a.id:JSON.stringify(a))]);continue}
      if(s.dec==='stage'){S.mem.push([k,a.fact||'']);continue}
      if(s.dec==='deny'){S.refused.push([k,s.tool+': '+s.why]);continue}
      if(s.tool==='draft_reply'){S.drafts.push([k,a.id+': "'+(a.text||'')+'"']);S.undo.push([k,'delete draft '+a.id])}
      if(s.tool==='notify_owner')S.owner.push([k,a.text||'']);
      if(s.tool==='send_reply')S.out.push([k,a.id+': "'+(a.text||'')+'"']);
      if(s.tool==='pay_invoice')S.pay.push([k,a.amount+' for '+a.id]);
      if(s.tool==='move_event'){const e=S.cal.find(x=>x[0]===a.id);if(e){S.undo.push([k,'move '+e[0]+' back to '+e[1]+' '+e[2]]);e[1]=a.day;e[2]=a.time;e.k=k}}
      if(s.tool==='create_event'){const e=['e'+(S.cal.length+1),a.day,a.time,a.title];e.k=k;S.cal.push(e);S.undo.push([k,'delete '+e[0]])}
    }
    return S;
  }
  const li=(arr,i,f)=>arr.length?'<ul>'+arr.map(x=>'<li'+(x[0]===i?' class="new"':'')+'>'+RD.esc(f?f(x):x[1])+'</li>').join('')+'</ul>':'<ul><li class="mute">none</li></ul>';
  function draw(i){
    const r=rec();if(!r)return;
    const f=flat[i];if(!f)return;
    const s=f.s,run=f.run;
    document.querySelectorAll('#dy-tl button').forEach(b=>b.classList.toggle('on',+b.dataset.r===f.ri));
    let h='<div class="small mute">Run '+(f.ri+1)+' of '+r.runs.length+': <b>'+RD.esc(run.kind)+'</b> at '+RD.esc(run.at)+' ('+(run.origin==='owner'?'Sam started it':'unattended')+'), model call '+s.n+'</div>';
    h+='<div class="small"><b>Trigger:</b> '+RD.esc(run.text)+'</div>';
    if(run.ret&&run.ret.length)h+='<div class="small"><b>Gateway retrieved:</b> '+RD.esc(run.ret.join(' | '))+'</div>';
    h+='<div class="say">'+RD.esc(s.say)+'</div>';
    if(s.tool){h+='<div class="act">'+RD.esc(s.tool)+' '+RD.esc(JSON.stringify(s.args))+'</div><div class="small">class <b>'+RD.esc(s.cls)+'</b>, gate: <span class="dec '+s.dec+'">'+RD.esc(s.dec)+'</span> ('+RD.esc(s.why)+')</div><div class="act small mute">'+RD.esc(s.res)+'</div>'}
    else h+='<div class="small mute">'+(s.fin?'finish: the run ends here.':'No ACTION line in this reply.')+'</div>';
    h+='<div class="small mute">This call: '+(s.tin||0).toLocaleString('en-US')+' tokens in, '+(s.tout||0).toLocaleString('en-US')+' out</div>';
    if(run.end&&i===flat.length-1||flat[i+1]&&flat[i+1].ri!==f.ri)h+='<div class="small"><b>Run ended:</b> '+RD.esc(run.end)+(run.summary?' ("'+RD.esc(run.summary)+'")':'')+'</div>';
    document.getElementById('dy-step').innerHTML=h;
    const S=stateUpTo(i);
    document.getElementById('dy-state').innerHTML='<h4>Calendar</h4>'+li(S.cal,i,x=>x[0]+' '+x[1]+' '+x[2]+' '+x[3]).replace(/<li>/g,'<li>')+
      '<h4>Approval queue (outside the chat)</h4>'+li(S.appr,i)+'<h4>Sent or paid (irreversible)</h4>'+li(S.out.concat(S.pay),i)+
      '<h4>Messages to Sam</h4>'+li(S.owner,i)+'<h4>Drafts</h4>'+li(S.drafts,i)+'<h4>Memory writes staged</h4>'+li(S.mem,i)+
      '<h4>Refused</h4>'+li(S.refused,i)+'<h4>Undo log</h4>'+li(S.undo,i);
  }
  function setup(){
    const r=rec();if(!r)return;flat=flatten(r);
    document.getElementById('dy-tl').innerHTML=r.runs.map((run,ri)=>'<button data-r="'+ri+'">'+RD.esc(run.at+' '+run.kind)+'</button>').join('');
    document.getElementById('dy-tot').textContent=r.calls+' model calls, '+r.tin.toLocaleString('en-US')+' tokens in, '+r.tout.toLocaleString('en-US')+' out, $'+r.cost.toFixed(4)+' API-price equivalent ('+r.model_ids.join(', ')+')';
    const n=[];const cnt={};flat.forEach(f=>{if(f.s.tool)cnt[f.s.dec]=(cnt[f.s.dec]||0)+1});
    const unatt=r.runs.filter(x=>x.origin!=='owner');
    const irrU=unatt.reduce((a,x)=>a+x.steps.filter(s=>s.cls==='irreversible').length,0);
    n.push('Gate decisions over the day: '+Object.keys(cnt).map(k=>k+' '+cnt[k]).join(', ')+'.');
    n.push('Unattended runs ('+unatt.map(x=>x.at+' '+x.kind).join(', ')+') proposed '+irrU+' irreversible action'+(irrU===1?'':'s')+'.');
    n.push('Runs that hit the 8-call limit: '+(r.runs.filter(x=>x.end==='step limit').map(x=>x.at+' '+x.kind).join(', ')||'none')+'.');
    n.push('Still waiting for Sam at the end: '+((r.final.approvals||[]).map(a=>a.tool+' ('+a.run+')').join(', ')||'nothing')+'.');
    document.getElementById('dy-notes').innerHTML=n.map(x=>'<li>'+RD.esc(x)+'</li>').join('');
    if(A)A.reset(flat.length);
  }
  setup();
  A=RD.anim({card:'dy-card',ctl:'dy-ctl',n:flat.length,draw,ms:1700,label:'Step',tab:'t-day'});
  RD.seg(document.getElementById('dy-model'),v=>{model=v;setup()});
  document.getElementById('dy-tl').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const k=flat.findIndex(f=>f.ri===+b.dataset.r);if(k>=0)A.go(k)});
})();
