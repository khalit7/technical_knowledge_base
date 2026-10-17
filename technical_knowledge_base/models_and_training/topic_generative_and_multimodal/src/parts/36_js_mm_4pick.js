// ---- Model map: "which model for which job" picker. Filters the table by job, licence need and a weights-only memory estimate ----
(function(){
  const M=window.MM,D=M.D,$=M.$,esc=M.esc;
  $('mm-p-job').innerHTML=Object.keys(D.jobs).map(k=>'<option value="'+k+'"'+(k==='t2i'?' selected':'')+'>'+esc(D.jobs[k])+'</option>').join('');
  // weights memory in GB = parameters (billions) x bytes per parameter; must fit in 75% of the chosen memory
  const memGB=(r,q)=>r.sb==null?null:r.sb*q;
  function why(r,lic,hw,q){
    if(r.acc==='closed')return hw==='api'?null:'closed: API or product only';
    if(lic==='osi'&&r.acc!=='osi')return 'licence: '+r.lic;
    if(lic==='small'&&(r.acc==='nc'))return 'licence: '+r.lic;
    if(hw!=='api'){const m=memGB(r,q);if(m==null)return 'size not stated, cannot check memory';
      if(m>0.75*(+hw))return 'weights alone need about '+m.toFixed(1)+' GB at this precision, over 75% of '+hw+' GB';}
    return null;
  }
  function run(){
    const job=$('mm-p-job').value,lic=$('mm-p-lic').value,hw=$('mm-p-hw').value,q=+$('mm-p-q').value;
    const cand=D.rows.filter(r=>r.jobs.indexOf(job)>=0&&r.acc!=='paper'&&(r.st!=='retired'));
    const ord=(a,b)=>(a.st==='current'?0:1)-(b.st==='current'?0:1)||(a.d<b.d?1:a.d>b.d?-1:0);
    const ok=cand.filter(r=>!why(r,lic,hw,q)).sort(ord),no=cand.filter(r=>why(r,lic,hw,q)).sort(ord);
    const card=(r,x)=>{const m=memGB(r,q);
      return '<div class="mm-rec'+(x?' x':'')+'"><b>'+M.dot(r.fam)+esc(r.n)+'</b> <span class="mute small">'+esc(r.o)+', '+esc(r.d)+', '+esc(r.st)+'</span><br>'+
      '<span class="small">'+M.accTag(r.acc)+' '+esc(r.size)+(m!=null&&r.acc!=='closed'?'; weights about <b>'+m.toFixed(m<1?2:1)+' GB</b> at this precision':'')+'</span><br>'+
      '<span class="small">'+(x?'<b>Excluded:</b> '+esc(x):(r.acc==='restr'?'<b>Read the conditions:</b> '+esc(r.lic):(r.acc==='nc'?'<b>Non-commercial:</b> '+esc(r.lic):'<span class="mm-j">judgement</span> '+esc(r.v))))+'</span> '+
      '<a href="#" data-row="'+r.id+'" class="small">row</a></div>'};
    let h='<p class="small">'+ok.length+' of '+cand.length+' candidates for this job pass your filters.</p>';
    h+=ok.slice(0,4).map(r=>card(r,null)).join('')||'<p class="small"><b>Nothing passes.</b> Relax the licence need, raise the hardware or lower the precision.</p>';
    if(ok.length>4)h+='<p class="small mute">Also passing: '+ok.slice(4).map(r=>esc(r.n)).join(', ')+'.</p>';
    if(no.length)h+='<p class="small" style="margin-top:10px"><b>Excluded, best first</b></p>'+no.slice(0,3).map(r=>card(r,why(r,lic,hw,q))).join('');
    h+='<p class="small mute">Ranking is current versions first, then newest; quality is not ranked here because arena scores move weekly. Check an independent arena or benchmark (see the {{Long-context and multimodal benchmarks|n:3ef5c17b0d0d810bb4dfc98919c9be8a}} page) before choosing.</p>';
    $('mm-p-out').innerHTML=h;
  }
  ['mm-p-job','mm-p-lic','mm-p-hw','mm-p-q'].forEach(id=>$(id).addEventListener('change',run));
  $('mm-p-out').addEventListener('click',e=>{const a=e.target.closest('a[data-row]');if(!a)return;e.preventDefault();M.showRow(a.dataset.row)});
  run();
})();
