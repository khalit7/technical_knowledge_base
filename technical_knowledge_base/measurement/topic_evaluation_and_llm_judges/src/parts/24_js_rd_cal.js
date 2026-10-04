// ---- Reading, Calibration: the human-agreement ceiling (MT-Bench Table 5, first turn) and Cohen's kappa ----
(function(){
  const el=document.getElementById('rd-agr');if(!el)return;
  // Zheng et al. 2023 (arXiv:2306.05685v4), Table 5 (a) first turn: agreement %, number of votes
  const AG={s2:{rand:50,rows:[['Two experts',81,479,'hu'],['GPT-4 single vs experts',85,739,''],['GPT-4 pairwise vs experts',85,859,'']]},
            s1:{rand:33,rows:[['Two experts',63,721,'hu'],['GPT-4 single vs experts',60,1280,''],['GPT-4 pairwise vs experts',66,1343,'']]}};
  let m='s2';
  function draw(){const d=AG[m];
    const rows=[['Random judge',d.rand,null,'ref']].concat(d.rows);
    el.innerHTML=rows.map(r=>'<div class="row '+r[3]+'"><span>'+r[0]+'</span><span class="tr"><span class="fl" style="width:'+r[1]+'%"></span></span><span class="v">'+r[1]+'%</span></div>').join('');
    document.getElementById('rd-agr-note').innerHTML=(m==='s2'?'Only votes where both sides picked a winner; random agreement is 50%.':'Ties and position-inconsistent verdicts counted as ties; random agreement is 33%.')+
      ' Votes: '+d.rows.map(r=>r[2].toLocaleString('en-US')).join(', ')+' (in row order). Source: <a href="https://arxiv.org/abs/2306.05685" target="_blank" rel="noopener noreferrer">Zheng et al. 2023, Table 5</a>.';}
  RD.seg(document.getElementById('rd-agr-seg'),v=>{m=v;draw()});draw();

  // Cohen's kappa on an illustrative 200-item gold slice (expert passes 180)
  const K={a:{tp:180,fn:0,fp:20,tn:0},b:{tp:170,fn:10,fp:10,tn:10}};
  const kap=c=>{const n=c.tp+c.fn+c.fp+c.tn,po=(c.tp+c.tn)/n,pj=(c.tp+c.fp)/n,ph=(c.tp+c.fn)/n,pe=pj*ph+(1-pj)*(1-ph);return {n,po,pe,k:(po-pe)/(1-pe)}};
  function dk(v){const c=K[v],r=kap(c);
    document.getElementById('rd-kap').innerHTML='<thead><tr><th></th><th>Judge: pass</th><th>Judge: fail</th></tr></thead><tbody><tr><th>Expert: pass</th><td>'+c.tp+'</td><td>'+c.fn+'</td></tr><tr><th>Expert: fail</th><td>'+c.fp+'</td><td>'+c.tn+'</td></tr></tbody>';
    document.getElementById('rd-kap-out').innerHTML=RD.stat('Raw agreement',(100*r.po).toFixed(0)+'%','p_o = '+(c.tp+c.tn)+' / '+r.n)+RD.stat('Chance agreement',(100*r.pe).toFixed(0)+'%','p_e from the two pass rates')+RD.stat('Cohen\'s kappa',(Math.abs(r.k)<1e-9?0:r.k).toFixed(2),r.k<0.01?'no information beyond the base rate':'moderate agreement');}
  RD.seg(document.getElementById('rd-kap-seg'),dk);dk('a');
  window.RD_CHECK=window.RD_CHECK||{};window.RD_CHECK.kappa={a:kap(K.a).k,b:kap(K.b).k};
})();
