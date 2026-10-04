// ---- D4RL results tab: six printed tables, one at a time, and one cell across all of them ----
(function(){
  const T=window.D4RL,$=id=>document.getElementById(id);
  const META={
    corl_last:'<b>Tarasov et al., CORL (arXiv v4, October 2023), Table 1.</b> One codebase for every method, hyperparameters from the original papers where possible. Score of the <b>last</b> policy after 1 million gradient steps (SAC-N, EDAC and DT use their own schedules), mean ± s.d. over 4 seeds; 10 evaluation episodes (100 on Maze2D). Datasets: Gym-MuJoCo v2, Maze2D v1, AntMaze v2, Adroit v1. Averages are the paper\'s own.',
    corl_best:'<b>CORL, Table 2.</b> The same runs as Table 1, but the <b>best</b> score seen at any evaluation during training. Choosing the best checkpoint needs online evaluation, which an offline method does not have; the gap between Tables 1 and 2 is a measure of how much that choice is worth.',
    corl_o2o:'<b>CORL, Table 3.</b> 1 million offline steps, then 1 million steps of online fine-tuning; each cell is the score after the offline stage → after fine-tuning, mean ± s.d. over 4 seeds. AntMaze v2 (100 evaluation episodes) and the original Adroit cloned datasets (10 episodes; the Cal-QL paper used modified ones). Averages are the paper\'s own.',
    iql_t1:'<b>Kostrikov, Nair and Levine, IQL (2021), Table 1.</b> Locomotion on <b>v2</b>, AntMaze on <b>v0</b>. Baselines collected or rerun by the IQL authors, with CQL rerun on v2 "using an author-suggested implementation"; no standard deviations printed. Totals are the paper\'s sums.',
    cql_t1:'<b>Kumar et al., CQL (2020), Table 1.</b> CQL(H) over 4 seeds; SAC, BC, BEAR and BRAC from the D4RL paper. Dataset names are printed without versions: they are the original <b>v0</b> datasets (IQL paper §5.2). "mixed" is D4RL\'s medium-replay. No standard deviations printed.',
    d4rl_t2:'<b>Fu et al., D4RL (arXiv v4), Table 2.</b> The benchmark paper\'s own baselines on the original <b>v0</b> datasets, 3 seeds. The SAC column is online SAC with interaction (by definition 100 on Gym-MuJoCo, where SAC is the expert reference); every other column is offline. No standard deviations printed.'};
  const DOMS=[['gym',t=>/^(halfcheetah|hopper|walker2d)/.test(t),'Gym-MuJoCo'],['maze2d',t=>/^maze2d/.test(t),'Maze2D'],['antmaze',t=>/^antmaze/.test(t),'AntMaze'],['adroit',t=>/^(pen|door|hammer|relocate)/.test(t),'Adroit'],['kitchen',t=>/^kitchen/.test(t),'Kitchen'],['other',t=>/^(flow|carla)/.test(t),'Flow, CARLA']];
  const AVGDOM={'Gym-MuJoCo avg':'gym','Maze2d avg':'maze2d','AntMaze avg':'antmaze','Adroit avg':'adroit','Adroit Avg':'adroit','Total avg':'all','locomotion-v2 total':'gym','antmaze-v0 total':'antmaze','total':'all'};
  let src='corl_last',dom='all',sortCol=-1;
  const cellCol=v=>{const p=Math.max(0,Math.min(1,v/100));return 'color-mix(in srgb, var(--c1) '+Math.round(p*55)+'%, var(--bg))'};
  const domOf=t=>{const d=DOMS.find(d=>d[1](t));return d?d[0]:'other'};
  function show(){const t=T[src],o2o=src==='corl_o2o',hasSd=src==='corl_last'||src==='corl_best';
    $('dt-meta').innerHTML=META[src];
    const doms=[...new Set(t.rows.filter(r=>!/total/.test(r.task)).map(r=>domOf(r.task)))];if(dom!=='all'&&doms.indexOf(dom)<0)dom='all';
    $('dt-dom').innerHTML='<button data-d="all" class="'+(dom==='all'?'on':'')+'">All</button>'+DOMS.filter(d=>doms.indexOf(d[0])>=0).map(d=>'<button data-d="'+d[0]+'" class="'+(dom===d[0]?'on':'')+'">'+d[2]+'</button>').join('');
    let rows=t.rows.filter(r=>!/total/.test(r.task)&&(dom==='all'||domOf(r.task)===dom));
    const val=(r,j)=>o2o?r.v[j][2]:(hasSd?r.v[j][0]:r.v[j]);
    if(sortCol>=0&&sortCol<t.cols.length)rows=rows.slice().sort((a,b)=>val(b,sortCol)-val(a,sortCol));
    let h='<thead><tr><th class="mh">Dataset</th>'+t.cols.map((c,j)=>'<th data-c="'+j+'" style="cursor:pointer">'+c+(sortCol===j?' ▾':'')+'</th>').join('')+'</tr></thead><tbody>';
    rows.forEach(r=>{let best=-Infinity;t.cols.forEach((c,j)=>{best=Math.max(best,val(r,j))});
      h+='<tr><th class="mh">'+r.task+'</th>'+t.cols.map((c,j)=>{const v=val(r,j),b=v===best;
        if(o2o){const x=r.v[j];return '<td style="background:'+cellCol(x[2])+'">'+RD.n(x[0],2)+' → '+(b?'<b>':'')+RD.n(x[2],2)+(b?'</b>':'')+'<small style="display:block;color:var(--mute);font-size:10.5px">±'+RD.n(x[1],2)+' → ±'+RD.n(x[3],2)+'</small></td>'}
        if(hasSd)return '<td style="background:'+cellCol(v)+'">'+(b?'<b>':'')+RD.n(v,2)+(b?'</b>':'')+'<small style="display:block;color:var(--mute);font-size:10.5px">±'+RD.n(r.v[j][1],2)+'</small></td>';
        return '<td style="background:'+cellCol(v)+'">'+(b?'<b>':'')+RD.n(v,1)+(b?'</b>':'')+'</td>'}).join('')+'</tr>'});
    // printed averages or totals for the domains shown
    const avg=[];if(t.avgs)Object.keys(t.avgs).forEach(k=>{const d=AVGDOM[k];if(dom==='all'||d===dom)avg.push([k,t.avgs[k]])});
    t.rows.filter(r=>/total/.test(r.task)).forEach(r=>{const d=AVGDOM[r.task];if(dom==='all'||d===dom)avg.push([r.task,r.v])});
    avg.forEach(([k,v])=>{h+='<tr style="border-top:2px solid var(--line)"><th class="mh">'+k+' <small>(printed)</small></th>'+v.map(x=>'<td>'+(Array.isArray(x)?RD.n(x[0],2)+' → '+RD.n(x[1],2):RD.n(x,2))+'</td>').join('')+'</tr>'});
    $('dt-tab').innerHTML=h+'</tbody>'}
  // one method on one dataset, across the tables (names matched without the version suffix; "mixed" = medium-replay)
  const ALIAS={'CQL(H)':'CQL','10%BC':'10% BC'};const base=t=>t.replace(/-v\d$/,'').replace(/-mixed$/,'-medium-replay');
  const LBL={corl_last:'CORL 2023, last policy',corl_best:'CORL 2023, best policy',corl_o2o:'CORL 2023, after offline stage',iql_t1:'IQL paper 2021',cql_t1:'CQL paper 2020',d4rl_t2:'D4RL paper 2020'};
  function lookups(){const out={};Object.keys(T).forEach(s=>{const t=T[s];t.rows.forEach(r=>{if(/total/.test(r.task))return;t.cols.forEach((c,j)=>{const m=ALIAS[c]||c,d=base(r.task);
    const v=s==='corl_o2o'?r.v[j][0]:(Array.isArray(r.v[j])?r.v[j][0]:r.v[j]),sd=s==='corl_o2o'?r.v[j][1]:(Array.isArray(r.v[j])?r.v[j][1]:null);
    ((out[m]=out[m]||{})[d]=out[m][d]||[]).push({s,task:r.task,v,sd})})})});return out}
  const LK=lookups();
  const methods=Object.keys(LK).filter(m=>Object.values(LK[m]).some(a=>new Set(a.map(x=>x.s)).size>1)).sort();
  $('dt-m').innerHTML=methods.map(m=>'<option'+(m==='CQL'?' selected':'')+'>'+m+'</option>').join('');
  function fillD(){const m=$('dt-m').value,ds=Object.keys(LK[m]).filter(d=>LK[m][d].length>1).sort();const prev=$('dt-d').value;
    $('dt-d').innerHTML=ds.map(d=>'<option'+(d===(ds.indexOf(prev)>=0?prev:(ds.indexOf('halfcheetah-medium-expert')>=0?'halfcheetah-medium-expert':ds[0]))?' selected':'')+'>'+d+'</option>').join('');xshow()}
  function xshow(){const m=$('dt-m').value,d=$('dt-d').value,a=(LK[m]&&LK[m][d])||[];const mx=Math.max(100,...a.map(x=>x.v));
    $('dt-x').innerHTML='<div class="bars">'+a.map(x=>'<div class="row"><span class="nm" title="'+LBL[x.s]+'">'+LBL[x.s]+' <small style="color:var(--mute)">('+x.task+')</small></span><span class="track"><span class="fill" style="width:'+(100*Math.max(0,x.v)/mx).toFixed(1)+'%;background:var(--c1)"></span></span><span class="val">'+RD.n(x.v,2)+(x.sd!=null?' ±'+RD.n(x.sd,1):'')+'</span></div>').join('')+'</div>'}
  $('dt-src').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;src=b.dataset.s;sortCol=-1;[...b.parentNode.children].forEach(x=>x.classList.toggle('on',x===b));show()});
  $('dt-dom').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;dom=b.dataset.d;show()});
  $('dt-tab').addEventListener('click',e=>{const th=e.target.closest('th[data-c]');if(!th)return;const c=+th.dataset.c;sortCol=sortCol===c?-1:c;show()});
  $('dt-m').addEventListener('change',fillD);$('dt-d').addEventListener('change',xshow);
  show();fillD();
})();
