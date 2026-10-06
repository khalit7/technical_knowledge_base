// ---- Reading section 1: the action boundary, two recorded runs side by side (mini-SWE-agent text mode + Claude Haiku via claude -p) ----
(function(){
  const D=window.HR_DATA;if(!D)return;
  const get=id=>D.runs.find(r=>r.id===id);
  const L=get('mswe_haiku_free'),Rr=get('mswe_haiku_cut'),A=get('aider_haiku_diff');if(!L||!Rr)return;
  const $=id=>document.getElementById(id),esc=RD.esc,fmt=n=>Number(n).toLocaleString('en-US');
  const BLK=/```mswea_bash_command[\s\S]*?```/g;
  const nb=t=>(t.match(BLK)||[]).length;
  // highlight: action blocks, and stretches the model wrote as if it were the harness (<user>, <output>, <returncode> ... closing tag)
  function hl(t){
    const marks=[];let m;
    const re1=/```mswea_bash_command[\s\S]*?```/g;while((m=re1.exec(t)))marks.push([m.index,m.index+m[0].length,'act']);
    const re2=/<(user|output|returncode|parameter[^>]*)>[\s\S]*?(<\/(user|output|returncode|parameter)>|$)/g;while((m=re2.exec(t)))marks.push([m.index,m.index+m[0].length,'inv']);
    marks.sort((a,b)=>a[0]-b[0]);let out='',p=0;
    for(const [s,e,c] of marks){if(s<p)continue;out+=esc(t.slice(p,s))+'<span class="'+c+'">'+esc(t.slice(s,e))+'</span>';p=e}
    return out+esc(t.slice(p));
  }
  const fe=r=>r.calls.filter((c,i)=>i>0&&/^Format error/.test(c.obs||'')).length;
  const resp=(r,i)=>{const n=r.calls[i+1];if(!n)return 'Harness: the reply\'s single action printed the submit line, so the run ended. Tests afterwards: '+r.tests_failed_after+' failing.';
    const o=n.obs||'';return /^Format error/.test(o)?'Harness: refused, "'+esc(o.split('\n').find(l=>/Expected/.test(l))||'format error')+'"; nothing ran.':'Harness ran the action. Real output: '+esc(o.replace(/\s+/g,' ').slice(0,170))+'...'};
  function side(r,i,pre,rs,cnt){
    if(i>=r.calls.length){$(pre).innerHTML='<span class="mute">(run already over: '+r.calls.length+' calls)</span>';$(rs).innerHTML='';}
    else{const c=r.calls[i];let t=c.full_text||c.text;const lim=1800;
      let keep=t.length;if(c.cut){BLK.lastIndex=0;const m=BLK.exec(t);if(m)keep=m.index+m[0].length}
      const a=t.slice(0,Math.min(keep,lim)),b=keep<lim?t.slice(keep,lim):'';
      $(pre).innerHTML=hl(a)+(b?'<span class="cutm">cut here: the harness never sees what follows</span><span class="gone">'+esc(b)+'</span>':'')+(t.length>lim?'\n[... '+(t.length-lim)+' more chars]':'');
      $(rs).innerHTML=resp(r,i)}
    const k=Math.min(i+1,r.calls.length),cs=r.calls.slice(0,k);
    const blocks=cs.reduce((a,c)=>a+nb(c.full_text||c.text),0),out=cs.reduce((a,c)=>a+(c.out||0),0);
    const fes=r.calls.slice(1,k+1).filter(c=>/^Format error/.test(c.obs||'')).length;
    $(cnt).innerHTML='After call <b>'+k+'</b>: action blocks the model wrote <b>'+blocks+'</b>, replies refused <b>'+fes+'</b>, output tokens <b>'+fmt(out)+'</b>';
  }
  const N=Math.max(L.calls.length,Rr.calls.length);
  const caps=['The first reply is fine in both runs: one thought, one action. The harness runs it.',
    'Call 2. Left: one action, then an invented exchange and a second copy of the action; two blocks, so the parser refuses the reply. Right: the same kind of reply, cut after the first block, so it runs.'];
  RD.anim({card:'rd-ab-card',ctl:'rd-ab-ctl',n:N,ms:3200,label:'Model call',draw:i=>{
    side(L,i,'rd-ab-l','rd-ab-lr','rd-ab-lc');side(Rr,i,'rd-ab-r','rd-ab-rr','rd-ab-rc');
    $('rd-ab-cap').innerHTML='<div class="t">Model call '+(i+1)+' of '+N+'</div><p>'+(caps[i]||(i>=Rr.calls.length?'The cut run has already submitted (no file changed). The uncut run keeps going: every multi-block reply is refused, and it ends only when a reply holds the submit command alone.':'Both keep going. Watch the orange stretches: the model is writing the harness\'s side of the conversation.'))+'</p>'}});
  $('rd-ab-maxb').textContent=Math.max(...L.calls.map(c=>nb(c.full_text||c.text)));
  $('rd-ab-fe').textContent=fe(L);$('rd-ab-fc').textContent=L.calls.length;
  $('rd-ab-out').textContent=fmt(Rr.totals.out);$('rd-ab-nc').textContent=Rr.calls.length;
  if(A)$('rd-ab-aider').textContent=A.totals.calls+' model calls ('+A.totals.model_seconds+' s of model time)';
})();
