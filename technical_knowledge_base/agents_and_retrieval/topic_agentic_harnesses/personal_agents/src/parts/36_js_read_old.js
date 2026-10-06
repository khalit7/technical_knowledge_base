// ---- Reading 10: the old page, claim by claim (from src/old_claims.json) ----
(function(){
  const t=document.getElementById('hp-old');if(!t||!window.HPOLD)return;
  const SEC={rs0:'In one screen',rs1:'1',rs2:'2',rs3:'3',rs4:'4',rs5:'5',rs6:'6',rs7:'7',rs8:'8',rs9:'9',rs10:'10'};
  const PC={verified:'ok',corrected:'mid',unconfirmed:'bad'};
  function draw(f){
    t.innerHTML='<tr><th>Old claim</th><th>Status</th><th>What the primary source says</th><th>Section</th></tr>'+
      HPOLD.filter(r=>f==='all'||r[1]===f).map(r=>'<tr><td>'+RD.esc(r[0])+'</td><td><span class="pill '+PC[r[1]]+'">'+r[1]+'</span></td><td>'+RD.esc(r[2])+'</td><td><a href="#'+r[3]+'">'+SEC[r[3]]+'</a></td></tr>').join('');
  }
  const c={};HPOLD.forEach(r=>{c[r[1]]=(c[r[1]]||0)+1});
  document.querySelectorAll('#hp-old-f button').forEach(b=>{if(b.dataset.m!=='all')b.textContent+=' ('+c[b.dataset.m]+')';else b.textContent+=' ('+HPOLD.length+')'});
  RD.seg(document.getElementById('hp-old-f'),draw);draw('all');
  // counts quoted in In one screen
  if(window.HPD){const ks=Object.keys(HPD);const a=document.getElementById('hp-nrec'),b=document.getElementById('hp-ncalls');
    if(a)a.textContent=ks.length;if(b)b.textContent=ks.reduce((s,k)=>s+HPD[k].calls,0)}
})();
