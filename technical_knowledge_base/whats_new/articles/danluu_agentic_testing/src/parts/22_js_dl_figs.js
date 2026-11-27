// ---- Static figures of the Reading tab (prefix dl): the hero (cost against fully correct runs, both efforts), what the agents
// did (counts the article reports from reading runs), two bugs easy inputs cannot see, the medium-against-xhigh rank scatter, and
// the closed data table. Chart data: window.ARTICLE.recompute (written by src/recompute.py from src/inputs/chart.json).
(function(){
  if(!window.RD||!window.ARTICLE||!document.getElementById('dl-hero-svg'))return;
  const $=id=>document.getElementById(id), t=RD.t, RC=window.ARTICLE.recompute, E=RC.effort;
  const FAM={Default:'d',Verus:'f',Creusot:'f',Kani:'f','Lean 4':'f',ACL2:'f',Alloy:'f','TLA+':'f',Spin:'f',SMT:'f',
    QuickCheck:'r',Hegel:'r',Proptest:'r',PBT:'r',Fuzzing:'r','Fuzz risky':'r',Metamorphic:'r',Differential:'r',
    TDD:'p','built-in':'p',rstest:'p',Insta:'p',Mutation:'p',Judgement:'p',Audit:'p','Make no mistakes':'p',
    'Hegel Skill':'s',ToB:'s',ECC:'s',Skill:'s'};
  const COL={d:'var(--c2)',f:'var(--c1)',r:'var(--c3)',p:'var(--c5)',s:'var(--c4)'};
  const NAME={d:'Default',f:'formal tool',r:'randomised testing',p:'process instruction',s:'skill'};
  window.DL={FAM,COL,NAME};
  const rows=e=>E[e].rows;
  const tri=(x,y,r)=>'M'+x+' '+(y-r)+'L'+(x+r*0.9)+' '+(y+r*0.65)+'L'+(x-r*0.9)+' '+(y+r*0.65)+'Z';

  function hero(){
    const el=$('dl-hero-svg'),W=RD.width(el),narrow=W<520,H=narrow?330:380;
    const L=narrow?40:46,R=W-12,T=14,B=H-36;
    const X=v=>L+(v-2.6)/(8.4-2.6)*(R-L),Y=v=>B-(v-45)/(90-45)*(B-T);
    let s='';
    [50,60,70,80,90].forEach(v=>{s+='<line x1="'+L+'" x2="'+R+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+t(L-5,Y(v)+4,v+'%',{fs:11.5,a:'end',fill:'var(--mute)'})});
    [3,4,5,6,7,8].forEach(v=>{s+=t(X(v),B+16,'$'+v,{fs:11.5,a:'middle',fill:'var(--mute)'})});
    s+=t((L+R)/2,B+31,'average cost per run',{fs:11.5,a:'middle',fill:'var(--mute)'});
    // one condition's 95% interval at 80 runs (Wilson, at the xhigh pooled rate), drawn at the left as a scale bar
    const w=wilson(62,80); s+='<line x1="'+(L+10)+'" x2="'+(L+10)+'" y1="'+Y(100*w[0])+'" y2="'+Y(100*w[1])+'" stroke="var(--mute)" stroke-width="2"/>'+
      '<line x1="'+(L+6)+'" x2="'+(L+14)+'" y1="'+Y(100*w[0])+'" y2="'+Y(100*w[0])+'" stroke="var(--mute)"/><line x1="'+(L+6)+'" x2="'+(L+14)+'" y1="'+Y(100*w[1])+'" y2="'+Y(100*w[1])+'" stroke="var(--mute)"/>'+
      t(L+18,Y(77.5)+4,narrow?'95% CI':'one 95% interval',{fs:11.5,fill:'var(--mute)'});
    // effort averages
    [['medium',3.59,63.4],['xhigh',5.55,77.5]].forEach(a=>{s+='<circle cx="'+X(a[1])+'" cy="'+Y(a[2])+'" r="11" fill="none" stroke="var(--ink)" stroke-dasharray="3 2"/>'});
    s+=t(X(3.59),Y(63.4)+(narrow?52:60),'medium',{fs:12,a:'middle',fill:'var(--ink)',w:600})+t(X(5.55)+(narrow?0:10),Y(77.5)-(narrow?52:62),'xhigh',{fs:12,a:'middle',fill:'var(--ink)',w:600});
    const d=['medium','xhigh'].map(e=>rows(e).find(r=>r.label==='Default'));
    s+='<line x1="'+X(d[0].cost)+'" y1="'+Y(d[0].pct)+'" x2="'+X(d[1].cost)+'" y2="'+Y(d[1].pct)+'" stroke="var(--c2)" stroke-width="1.5" stroke-dasharray="4 3"/>';
    ['medium','xhigh'].forEach(e=>rows(e).forEach(r=>{const f=FAM[r.label],x=X(r.cost),y=Y(r.pct),rr=f==='d'?6:4.2;
      s+=e==='medium'?'<circle cx="'+x+'" cy="'+y+'" r="'+rr+'" fill="'+COL[f]+'" fill-opacity=".8"><title>'+r.label+', '+e+': $'+r.cost.toFixed(2)+', '+r.pct+'%</title></circle>'
        :'<path d="'+tri(x,y,rr+1.2)+'" fill="'+COL[f]+'" fill-opacity=".8"><title>'+r.label+', '+e+': $'+r.cost.toFixed(2)+', '+r.pct+'%</title></path>'}));
    // a few labels (all values are in the closed table)
    const LB=[narrow?['Default','medium',-4,22,'start']:['Default','medium',-8,14,'end'],['Default','xhigh',8,-6,'start'],['Hegel Skill','xhigh',-8,-8,'end'],['Audit','xhigh',8,-4,'start'],['Verus','medium',8,12,'start'],['Alloy','xhigh',8,4,'start'],['Fuzz risky','medium',8,-6,'start']];
    LB.forEach(l=>{const r=rows(l[1]).find(q=>q.label===l[0]);if(narrow&&(l[0]==='Alloy'||l[0]==='Fuzz risky'))return;
      s+=t(X(r.cost)+l[2],Y(r.pct)+l[3],l[0]+' '+r.pct+'%',{fs:11.5,a:l[4],fill:l[0]==='Default'?'var(--c2)':'var(--ink)',w:l[0]==='Default'?700:400})});
    el.innerHTML=RD.svg(W,H,s,'Average cost per run against share of fully correct runs for 30 conditions at medium and xhigh effort');
  }
  function wilson(k,n){const z=1.959964,p=k/n,d=1+z*z/n,c=(p+z*z/(2*n))/d,h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return [c-h,c+h]}
  window.DL.wilson=wilson;

  // what the agents did: counts out of 160 the article reports (pale: did the named thing; dark: the deeper step)
  const USE=[['TLA+',[['built a model',159,0],['modelled the entropy coders',30,1],['changed the Rust code from it',0,1]]],
    ['Differential testing',[['did something called that',135,0],['two independent implementations',0,1]]],
    ['Fuzzing',[['structured random inputs',10,1],['found real bugs (about half)',5,1]]],
    ['Kani',[['real use that caught a bug',1,1]]],
    ['Audit first',[['audited',152,0],['used a fresh independent agent',42,1]]],
    ['TDD',[['failing test before real code',67,0],['Default, the same count',0,1]]],
    ['Skills',[['Hegel skill used',157,0],['ECC skill read',153,0],['ToB skill opened',108,0]]]];
  function use(){
    const el=$('dl-use-svg'),W=RD.width(el),narrow=W<520,lw=narrow?0:200,x0=narrow?8:lw+8,x1=W-34,bh=12;
    let y=8,s='';const X=v=>x0+v/160*(x1-x0);
    USE.forEach(g=>{s+=t(8,y+12,g[0],{fs:12.5,fill:'var(--ink)',w:700});y+=18;
      g[1].forEach(it=>{if(narrow){s+=t(8,y+11,it[0],{fs:11.5,fill:'var(--mute)'});y+=15}else s+=t(x0-8,y+10,it[0],{fs:11.5,a:'end',fill:'var(--mute)'});
        s+='<rect x="'+x0+'" y="'+y+'" width="'+(x1-x0)+'" height="'+bh+'" rx="3" fill="var(--soft)"/>';
        s+='<rect x="'+x0+'" y="'+y+'" width="'+Math.max(it[1]?2:0,X(it[1])-x0)+'" height="'+bh+'" rx="3" fill="var(--c1)" fill-opacity="'+(it[2]?1:.4)+'"/>';
        s+=t(Math.max(X(it[1]),x0)+5,y+10,String(it[1]),{fs:11.5,fill:'var(--ink)',w:600});y+=bh+6});
      y+=4});
    s+=t(x1,y+8,'of 160 runs',{fs:11.5,a:'end',fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,y+14,s,'How many of 160 runs did the named technique, and the deeper step, per condition');
  }

  // two bugs easy inputs cannot see
  function blind(){
    const el=$('dl-blind-svg'),W=RD.width(el),H=narrowH(W);let s='';
    function narrowH(w){return w<520?430:360}
    const narrow=W<520, pw=narrow?W-16:(W-24)/2, ax=8, bx=narrow?8:ax+pw+8, by=narrow?200:0;
    // panel A: four streams, identical against distinct, decoded by a correct decoder and one that swaps streams 2 and 3
    s+=t(ax,14,'A. Four streams: swap two',{fs:12.5,fill:'var(--ink)',w:700});
    const cell=(x,y,txt,c)=>'<rect x="'+x+'" y="'+y+'" width="'+(pw/4-6)+'" height="22" rx="4" fill="'+c+'" fill-opacity=".25" stroke="'+c+'"/>'+t(x+(pw/4-6)/2,y+15,txt,{fs:12,a:'middle',fill:'var(--ink)'});
    const rowA=(y,lab,vals,cols,verdict,vc)=>{let q=t(ax,y-4,lab,{fs:11.5,fill:'var(--mute)'});vals.forEach((v,i)=>q+=cell(ax+i*pw/4,y,v,cols[i]));return q+t(ax+pw-4,y+40,verdict,{fs:11.5,a:'end',fill:vc,w:600})};
    s+=rowA(40,'test input: four identical streams',['ab','ab','ab','ab'],['var(--mute)','var(--mute)','var(--mute)','var(--mute)'],'swapped decoder: same output, test passes','var(--bad)');
    s+=rowA(110,'test input: four different streams',['ab','cd','ef','gh'],['var(--c1)','var(--c3)','var(--c5)','var(--c4)'],'swapped decoder: ab ef cd gh, test fails','var(--good)');
    // panel B: Number_of_Sequences when byte0 == 255, correct against the agents' formula
    const L=bx+(narrow?40:42),R=bx+pw-6,T=by+34,B=by+(narrow?200:190);
    s+=t(bx,by+14,'B. Number_of_Sequences, 3-byte form',{fs:12.5,fill:'var(--ink)',w:700});
    const lo=32512,hi=43690,X=v=>L+(v-lo)/(hi-lo)*(R-L),Y=v=>B-(v-lo)/(hi-lo)*(B-T);
    [32512,38000,43690].forEach(v=>{s+=t(X(v),B+14,v.toLocaleString('en-US'),{fs:11.5,a:v===lo?'start':v===hi?'end':'middle',fill:'var(--mute)'})});
    [32512,38000,43690].forEach(v=>{s+=t(L-4,Y(v)+4,(v/1000).toFixed(1)+'k',{fs:11.5,a:'end',fill:'var(--mute)'})});
    s+=t((L+R)/2,B+28,'true count in the block',{fs:11.5,a:'middle',fill:'var(--mute)'});
    s+='<line x1="'+X(lo)+'" y1="'+Y(lo)+'" x2="'+X(hi)+'" y2="'+Y(hi)+'" stroke="var(--good)" stroke-width="2"/>';
    let p='';for(let nb=lo;nb<=hi;nb+=16){const v=nb-0x7F00,bug=((v&0xFF)+((v>>8)<<8))|0x7F00;p+=(p?'L':'M')+X(nb).toFixed(1)+' '+Y(bug).toFixed(1)}
    s+='<path d="'+p+'" fill="none" stroke="var(--bad)" stroke-width="1.5"/>';
    s+='<rect x="'+X(lo)+'" y="'+T+'" width="'+(X(32768)-X(lo))+'" height="'+(B-T)+'" fill="var(--good)" opacity=".12"/>';
    s+=t(X(hi)-4,Y(hi)+16,'+ 0x7F00 (spec)',{fs:11.5,a:'end',fill:'var(--good)',w:600});
    s+=t(X(hi)-4,Y(lo)-8,'| 0x7F00 (agents): stuck below 32,768',{fs:11.5,a:'end',fill:'var(--bad)',w:600});
    s+=t(X(32768)+4,T+12,'agree only here',{fs:11.5,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,narrow?by+236:226,s,'Two bugs that easy test inputs cannot reveal');
  }

  // medium against xhigh, one dot per condition
  function rank(){
    const el=$('dl-rank-svg'); if(!el)return;
    const W=RD.width(el),H=Math.min(380,Math.max(280,W*0.8)),L=44,R=W-12,T=12,B=H-40;
    const X=v=>L+(v-48)/(78-48)*(R-L),Y=v=>B-(v-66)/(89-66)*(B-T);let s='';
    [50,55,60,65,70,75].forEach(v=>{s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+T+'" y2="'+B+'" stroke="var(--line)"/>'+t(X(v),B+15,v+'%',{fs:11.5,a:'middle',fill:'var(--mute)'})});
    [70,75,80,85].forEach(v=>{s+='<line x1="'+L+'" x2="'+R+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+t(L-5,Y(v)+4,v+'%',{fs:11.5,a:'end',fill:'var(--mute)'})});
    s+=t((L+R)/2,B+31,'fully correct at medium',{fs:11.5,a:'middle',fill:'var(--mute)'});
    s+=t(L+4,T+10,'at xhigh',{fs:11.5,fill:'var(--mute)'});
    const M=rows('medium'),Xh=rows('xhigh');
    M.forEach(m=>{const x=Xh.find(q=>q.label===m.label),f=FAM[m.label];
      s+='<circle cx="'+X(m.pct)+'" cy="'+Y(x.pct)+'" r="'+(f==='d'?6.5:5)+'" fill="'+COL[f]+'" fill-opacity=".85"><title>'+m.label+': '+m.pct+'% medium, '+x.pct+'% xhigh</title></circle>'});
    [['Default',8,4,'start'],['Fuzz risky',-8,4,'end'],['ECC',8,12,'start'],['Audit',8,4,'start'],['Verus',8,4,'start'],['Alloy',8,4,'start']].forEach(l=>{
      const m=M.find(q=>q.label===l[0]),x=Xh.find(q=>q.label===l[0]);s+=t(X(m.pct)+l[1],Y(x.pct)+l[2],l[0],{fs:11.5,a:l[3],fill:l[0]==='Default'?'var(--c2)':'var(--ink)',w:l[0]==='Default'?700:400})});
    el.innerHTML=RD.svg(W,H,s,'Share of fully correct runs at medium against xhigh for 30 conditions');
  }

  // the closed data table
  function table(){
    const el=$('dl-data'); if(!el||el.dataset.done)return; el.dataset.done=1;
    const P=window.DL_P||{};
    let h='<tr><th>Condition</th><th>Family</th><th>Medium: runs passed</th><th>%</th><th>$ per run</th><th>xhigh: runs passed</th><th>%</th><th>$ per run</th></tr>';
    const M=rows('medium'),Xh=rows('xhigh');
    M.slice().sort((a,b)=>(a.pct+Xh.find(q=>q.label===a.label).pct)-(b.pct+Xh.find(q=>q.label===b.label).pct)).forEach(m=>{const x=Xh.find(q=>q.label===m.label);
      h+='<tr'+(m.label==='Default'?' class="on"':'')+'><td>'+m.label+'</td><td>'+NAME[FAM[m.label]]+'</td><td>'+m.k+' of '+m.n+'</td><td>'+m.pct.toFixed(1)+'</td><td>'+m.cost.toFixed(2)+' ± '+m.cost_sd.toFixed(2)+'</td><td>'+x.k+' of '+x.n+'</td><td>'+x.pct.toFixed(1)+'</td><td>'+x.cost.toFixed(2)+' ± '+x.cost_sd.toFixed(2)+'</td></tr>'});
    el.innerHTML=h+'<tr><td colspan="8" class="small mute">Sorted worst to best by the mean of the two efforts, the order of the post\'s sections. ± is one standard deviation of the mean cost, read from the chart\'s bootstrap ellipses. Equal-condition averages printed by the chart: medium $3.59 and 63.4%, xhigh $5.55 and 77.5%.</td></tr>';
  }
  function all(){hero();use();blind();rank();table()}
  RD.onRender(all);RD.onResize(all);
})();
