// ---- Reproduce a run: a six-step walkthrough on the recorded registry, and every run's loss curve ----
(function(){
const M=window.MP,U=window.MPU,$=id=>document.getElementById(id),esc=U.esc;
const CUR=M.repro.checks.code_sha.now;const sh=x=>String(x).slice(0,8); // code hash of src/lab now (12 chars), as reproduce.py read it
const NOW={data:M.repro.checks.data_sha.now,torch:M.repro.checks.torch.now,platform:M.repro.checks.platform.now};
let ver=M.champion;
$('rp-pick').innerHTML=M.versions.map(v=>'<button data-v="'+v.v+'">version '+v.v+(v.v===M.champion?' (champion)':'')+'</button>').join('');
function steps(){const v=M.versions.find(x=>x.v===ver),r=M.runs.find(x=>x.id===v.run),champ=M.versions.find(x=>x.v===M.champion),cr=M.runs.find(x=>x.id===champ.run);
  const ok=b=>b?'<span class="mp-ok">same</span>':'<span class="mp-no">different</span>';
  const codeOK=v.code===CUR&&r.code===CUR;
  const cmd='python flow.py run --lr '+r.lr+' --steps '+r.steps+' --seed '+r.seed+' --split '+r.split;
  const S=[];
  S.push(['1. Resolve the name','<code>'+(ver===M.champion?'models:/mi-tiny-gpt@champion':'models:/mi-tiny-gpt/'+ver)+'</code> &rarr; version '+ver+', source <code>models:/'+v.model+'...</code>, run <code>'+v.run+'...</code>. A version is immutable: it will always point at this model and this run.']);
  S.push(['2. Read the run record','params lr '+r.lr+', steps '+r.steps+', seed '+r.seed+', split '+r.split+'; tags code_sha '+r.code+'..., data_sha '+r.data+'..., val_sha '+r.val+'..., torch '+r.torch+', platform '+r.platform+'; the version\'s own tags add ckpt_sha '+v.ckpt+'... and the Metaflow run '+v.mf+'.']);
  S.push(['3. Check the inputs you have now','<div class="tw"><table class="small"><thead><tr><th>input</th><th>recorded</th><th>now</th><th></th></tr></thead><tbody>'+
    '<tr><td>code_sha (run)</td><td class="mp-r">'+sh(r.code)+'</td><td class="mp-r">'+sh(CUR)+'</td><td>'+ok(r.code===CUR)+'</td></tr>'+
    '<tr><td>code_sha (version tag)</td><td class="mp-r">'+sh(v.code)+'</td><td class="mp-r">'+sh(CUR)+'</td><td>'+ok(v.code===CUR)+'</td></tr>'+
    '<tr><td>data_sha</td><td class="mp-r">'+sh(r.data)+'</td><td class="mp-r">'+sh(NOW.data)+'</td><td>'+ok(r.data===NOW.data)+'</td></tr>'+
    '<tr><td>torch</td><td>'+r.torch+'</td><td>'+NOW.torch+'</td><td>'+ok(r.torch===NOW.torch)+'</td></tr>'+
    '<tr><td>platform</td><td class="small">'+r.platform+'</td><td class="small">'+NOW.platform+'</td><td>'+ok(r.platform===NOW.platform)+'</td></tr></tbody></table></div>'+
    (codeOK?'All inputs match: a rerun should give the same bytes on this machine.':'<b>The code hash does not match.</b> Version '+ver+' came from the run that was resumed after the register fix: its start step, and so its recorded hash, is from the code before the fix. The training code (train.py and the train step) did not change between the two hashes, so the trained weights should be the same, but the record cannot prove it: <code>reproduce.py '+ver+' --check-only</code> printed <code>"same": false</code> for code_sha and the rerun was not made.')]);
  S.push(['4. Rerun with the recorded parameters','<pre>'+esc(cmd)+'</pre>The flow re-splits the data, checks its hash, trains with torchrun (2 ranks, gloo), evaluates and registers a new version; the gate decides whether the alias moves.']);
  if(ver===M.champion||ver===+M.repro.rerun.version){const R=M.repro,a=ver===M.champion;
    S.push(['5. Compare the outputs, same machine','Version '+R.version+' recorded against its rerun, version '+R.rerun.version+' (Metaflow run '+R.rerun.metaflow_run+'): held-out loss '+R.recorded.val_loss+' and '+R.rerun.val_loss+'; last training loss '+R.recorded.train_loss_last+' and '+R.rerun.train_loss_last+'; checkpoint SHA-256 '+R.recorded.ckpt_sha+'... and '+R.rerun.ckpt_sha+'.... <b>Bit-identical on all three</b>; the gate kept the alias on version '+M.champion+' (equal, not lower). '+(a?'':'(This version is that rerun.)')+' Loading <code>@champion</code> by name gave '+M.load_champion.val_loss+' in '+M.load_champion.load_secs+' s.']);
    S.push(['6. And on another platform','The same command in the Linux container <code>mi-train:1</code>, same train.py and torch 2.14.1: step 200 loss '+M.xplat.logged[M.xplat.logged.length-1][2]+' against '+M.xplat.logged[M.xplat.logged.length-1][1]+', held-out loss '+M.xplat.cval+', checkpoint '+M.xplat.cck+'...: <b>not bit-identical</b>, equivalent to five decimals. Reading section 8 shows where it diverges (step 2 for rank 0\'s loss, step 12 for the global loss).']);
  }else{S.push(['5. Compare the outputs','<span class="mp-nr">not rerun here</span> Only the champion was rerun (one rerun shows the mechanism; each costs a full workflow run, 17 to 19 s here). Expected from the champion\'s result: bit-identical on this machine '+(codeOK?'':'if the training code is truly unchanged, ')+'with the same platform and library builds.']);
    S.push(['6. Is it comparable with the champion?',r.split===cr.split&&r.val===cr.val?'Yes: same held-out text (val_sha '+r.val+'...), so its loss '+v.val_loss+' and the champion\'s '+champ.val_loss+' are on the same test.':'<b>No.</b> Its held-out text differs (val_sha '+r.val+'... against '+cr.val+'...): its loss '+v.val_loss+' is on another test, and no ranking against the champion\'s '+champ.val_loss+' means anything. Rescore both on one frozen set.'])}
  return S}
let cur=0,S=steps();
function draw(i){cur=i;$('rp-steps').innerHTML=S.map((s,k)=>'<div class="rp-step '+(k<i?'past':k===i?'cur':'fut')+'"><h4>'+s[0]+'</h4><div class="small">'+s[1]+'</div></div>').join('');
  [...$('rp-pick').children].forEach(b=>b.classList.toggle('on',+b.dataset.v===ver))}
const A=RD.anim({card:'rp-card',ctl:'rp-ctl',n:6,draw:draw,ms:2200,label:'Step'});
$('rp-pick').addEventListener('click',e=>{const b=e.target.closest('button[data-v]');if(!b)return;ver=+b.dataset.v;S=steps();draw(+$('rp-ctl-s').value);curves()});
function curves(){const el=$('rp-curves'),W=Math.max(300,el.clientWidth||600),H=200,L=40,Rr=10,T=8,B=26;
  const rs=M.runs.filter(r=>r.curve.length);const ys=rs.flatMap(r=>r.curve.map(p=>p[1]));const lo=2.0,hi=Math.min(4.5,Math.max(...ys));
  const x=s=>L+(s/200)*(W-L-Rr),y=v=>T+(hi-Math.max(lo,Math.min(hi,v)))/(hi-lo)*(H-T-B);
  const sv=M.versions.find(v=>v.v===ver);let g='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Training loss of every run">';
  [2,2.5,3,3.5,4].forEach(v=>{if(v>hi)return;g+='<line x1="'+L+'" x2="'+(W-Rr)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/><text x="'+(L-4)+'" y="'+(y(v)+4)+'" text-anchor="end" font-size="10.5" fill="var(--mute)">'+v.toFixed(1)+'</text>'});
  [0,50,100,150,200].forEach(s=>g+='<text x="'+x(s)+'" y="'+(H-8)+'" text-anchor="middle" font-size="10.5" fill="var(--mute)">'+s+'</text>');
  rs.forEach(r=>{const on=r.id===sv.run;g+='<polyline fill="none" stroke="'+(on?'var(--acc)':'var(--dim)')+'" stroke-width="'+(on?2.4:1.2)+'" points="'+r.curve.map(p=>x(p[0])+','+y(p[1])).join(' ')+'"><title>lr '+r.lr+', split '+r.split+'</title></polyline>'});
  g+='</svg>';el.innerHTML=g;const r=M.runs.find(x=>x.id===sv.run);
  $('rp-cc').innerHTML='All-reduced training loss logged every 10 steps by each run that trained (MLflow metric train_loss; 6 runs; the hung run logged none). Highlighted: version '+ver+' (lr '+r.lr+', split '+r.split+', final '+r.train_loss.toFixed(4)+'). Versions 3 and 5 overlap exactly. Axis clipped at '+hi.toFixed(1)+' (step 1 starts near 4.3).'}
(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-rep']=window.TAB_RENDER['t-rep']||[]).push(()=>{draw(+$('rp-ctl-s').value);curves()});
addEventListener('resize',()=>{if(!$('t-rep').hidden)curves()});
})();
