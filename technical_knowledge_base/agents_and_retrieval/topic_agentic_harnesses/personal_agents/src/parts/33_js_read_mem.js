// ---- Reading 5: who decides to look in the history? (recorded runs, graded) ----
(function(){
  const host=document.getElementById('hp-mem');if(!host||!window.HPD)return;
  const MODES=[['off','No history tool','The agent has MEMORY.md only'],['tool','Search tool','search_history is available; the model decides'],
    ['hint','Tool + one rule','plus: "search past sessions first" for anything recurring'],['inject','Gateway retrieves','the gateway searches with the message\'s words and puts the hits in the prompt']];
  const list=document.getElementById('hp-mem-list');
  function rows(model){
    return MODES.map(([m,name,desc])=>{
      const rs=Object.keys(HPD).filter(k=>k.indexOf('s2_'+model+'_'+m+'_')===0).sort().map(k=>[k,HPD[k]]);
      return {m,name,desc,rs,ok:rs.filter(([,r])=>r.grade.ok).length,se:rs.filter(([,r])=>r.grade.searched).length};
    });
  }
  let model='haiku';
  function draw(){
    const R=rows(model);
    host.innerHTML='<div class="hp-bars">'+R.map(r=>{
      const n=r.rs.length||1,p=r.ok/n;
      return '<div class="row"><div class="nm"><b>'+r.name+'</b><br><span class="small mute">'+RD.esc(r.desc)+'</span></div><div class="track"><span style="width:'+(100*p)+'%;background:var(--good)"></span><span style="width:'+(100*(1-p))+'%;background:var(--bad);opacity:.35"></span></div><div class="val">'+r.ok+' of '+r.rs.length+'</div></div>';
    }).join('')+'</div><p class="small mute">Green: the advice to Sam said the car was already serviced (so do not book). Model searched the history in: '+R.map(r=>r.name+' '+r.se+' of '+r.rs.length).join('; ')+'.</p>';
    list.innerHTML='<div class="tw"><table class="hp-t"><tr><th>Run</th><th>Searched?</th><th>Retrieved by gateway</th><th>Advice sent to Sam</th></tr>'+
      R.concat(model==='haiku'&&HPD.s2_haiku_hintbug_1?[{rs:[['s2_haiku_hintbug_1 (parser bug, see below)',HPD.s2_haiku_hintbug_1]]}]:[]).map(r=>r.rs.map(([k,x])=>{const ret=(x.runs[0]&&x.runs[0].ret)||[];
        return '<tr><td>'+RD.esc(k.replace('s2_',''))+'</td><td>'+(x.grade.searched?'yes':'no')+'</td><td class="small">'+(ret.length?RD.esc(ret.join(' | ')):'')+'</td><td class="small"><span class="pill '+(x.grade.ok?'ok':'bad')+'">'+(x.grade.ok?'right':'wrong')+'</span>'+RD.esc(x.grade.advice)+'</td></tr>'}).join('')).join('')+'</table></div>';
  }
  const seg=document.getElementById('hp-mem-model');if(seg)RD.seg(seg,v=>{model=v;draw()});
  draw();
})();
