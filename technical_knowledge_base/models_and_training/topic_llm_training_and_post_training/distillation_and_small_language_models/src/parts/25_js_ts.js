// ---- shared method names for the toy, and the Reading tab's summary of final results ----
window.TOYM={
  order:['sft','fkl','fkl_t2','rkl_off','fkl_on','rkl_on','sft_on'],
  name:{sft:'SFT on the teacher\'s routes',fkl:'Logit KD, forward KL',fkl_t2:'Logit KD, forward KL at T = 2',rkl_off:'Reverse KL on the teacher\'s routes',fkl_on:'On-policy, forward KL',rkl_on:'On-policy, reverse KL',sft_on:'SFT, then on-policy reverse KL'},
  kind:{sft:'off-policy, hard labels',fkl:'off-policy',fkl_t2:'off-policy',rkl_off:'off-policy',fkl_on:'on-policy',rkl_on:'on-policy',sft_on:'off then on'},
  col:{sft:'--c1',fkl:'--c6',fkl_t2:'--c5',rkl_off:'--c3',fkl_on:'--c4',rkl_on:'--c2',sft_on:'--ink'}
};
(function(){
  const $=id=>document.getElementById(id);if(!$('ts'))return;
  if(!DS.toy||!DS.toy.summary){$('tsBars').textContent='Toy results not built yet.';return}
  const S=DS.toy.summary,tch=DS.toy.teacher;
  function draw(){
    const ms=TOYM.order.filter(m=>S[m]);
    const maxD=Math.max(tch.distinct,...ms.map(m=>S[m].distinct[3]));
    let h='<div class="tw"><table class="tbl-s"><thead><tr><th>Method</th><th>Correct routes (temperature 1)</th><th class="num">mean</th><th>Distinct correct routes in 8 tries</th><th class="num">mean</th></tr></thead><tbody>';
    const bar=(v,lo,hi,mx,c)=>'<div style="position:relative;height:12px;background:var(--soft);border-radius:3px;min-width:80px"><div style="position:absolute;left:0;top:0;bottom:0;width:'+(v/mx*100).toFixed(1)+'%;background:var('+c+');border-radius:3px"></div><div style="position:absolute;top:5px;height:2px;left:'+(lo/mx*100).toFixed(1)+'%;width:'+Math.max(0.5,(hi-lo)/mx*100).toFixed(1)+'%;background:var(--ink)"></div></div>';
    h+='<tr><td><b>Teacher</b> <span class="small mute">(reference)</span></td><td>'+bar(tch.succ,tch.succ,tch.succ,1,'--dim')+'</td><td class="num">'+PF.pct(tch.succ,1)+'</td><td>'+bar(tch.distinct,tch.distinct,tch.distinct,maxD,'--dim')+'</td><td class="num">'+tch.distinct.toFixed(2)+'</td></tr>';
    ms.forEach(m=>{const s=S[m];h+='<tr><td>'+TOYM.name[m]+' <span class="small mute">('+TOYM.kind[m]+')</span></td><td>'+bar(s.succ[0],s.succ[2],s.succ[3],1,TOYM.col[m])+'</td><td class="num">'+PF.pct(s.succ[0],1)+'</td><td>'+bar(s.distinct[0],s.distinct[2],s.distinct[3],maxD,TOYM.col[m])+'</td><td class="num">'+s.distinct[0].toFixed(2)+'</td></tr>'});
    h+='</tbody></table></div>';
    $('tsBars').innerHTML=h;
    $('tsFoot').innerHTML='After '+PF.comma(DS.toy.student.steps)+' steps of '+DS.toy.student.batch+' prompts; mean of '+S[ms[0]].n+' seeds, the black line spans the lowest and highest seed. Success: share of 7,936 sampled routes (all 992 prompts, 8 each) that are correct. Distinct: different correct routes among 8 samples per prompt, averaged over prompts (more means the student keeps more of the teacher\'s variety).';
  }
  RD.onRender(draw);draw();
})();
