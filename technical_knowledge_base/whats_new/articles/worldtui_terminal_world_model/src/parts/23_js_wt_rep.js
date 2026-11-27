// Fig. 2: one self-repair training example, step by step (the step list is sx-rep in 20_read_b.html).
// Illustrative screens built from the post's own example: a filename seen earlier, misspelt by the model's tab completion.
(function(){
  const el=document.getElementById('wt-rep-svg');if(!el||!window.RD)return;
  const cap=document.getElementById('wt-rep-cap');
  const N=34,MONO='ui-monospace,Menlo,Consolas,monospace';
  // the rendered advance of one character at 12 px, so the highlighted cells sit under their characters
  let CW=0;function charW(){if(CW)return CW;try{const c=document.createElement('canvas').getContext('2d');c.font='12px '+MONO;CW=c.measureText('MMMMMMMMMM').width/10}catch(e){}return CW||7.2}
  const P=(r)=>r.map(x=>(x+' '.repeat(N)).slice(0,N));
  // screens: rec = the recording, mod = the model's own screen, per step
  const REC0=P(['$ ls','notes.txt  projects  snake.py','$ cat no','','']);
  const REC1=P(['$ ls','notes.txt  projects  snake.py','$ cat notes.txt','','']);
  const REC2=P(['$ ls','notes.txt  projects  snake.py','$ cat notes.txt','buy milk','$']);
  const MOD1=P(['$ ls','notes.txt  projects  snake.py','$ cat nots.txt','','']);
  const BAD_REC=P(['$ ls','notes.txt  plans.md','$','','']),BAD_MOD=P(['$ ls','notes.txt  todo.md','$','','']);
  const ST=[
    {rec:REC0,mod:null,recT:'Recording: the user has typed cat no, Tab next',modT:'Model: not started',cap:'A point just before the command that prints output.'},
    {rec:REC1,mod:MOD1,recT:'Recording, after Tab',modT:'Model, playing Tab itself',cap:'The model completes the filename from its own screens.'},
    {rec:REC1,mod:MOD1,recT:'Recording, after Tab',modT:'Model: differs in 6 cells',diff:true,cap:'One row differs, by a few cells: small enough to repair.'},
    {rec:REC2,mod:MOD1,recT:'Recording, after Enter (the target)',modT:'Model screen plus the correction',diff:true,fix:true,op:["ROW_2 9 'es.txt'   ROW_3 0 'buy milk'","ROW_4 0 '$'   CURSOR 4 2 1"],cap:'Target for Enter: the edit from the wrong screen to the real one.'},
    {rec:REC2,mod:REC2,recT:'Recording, then a few real events',modT:'Trained frame: repaired',train:true,op:["ROW_2 9 'es.txt'   ROW_3 0 'buy milk'","ROW_4 0 '$'   CURSOR 4 2 1"],cap:'The correction is a training target; real events follow it.'},
    {rec:BAD_REC,mod:BAD_MOD,recT:'Another recording: ls lists plans.md',modT:'Model listed todo.md',diff:true,bad:true,op:["needs ROW_1 11 'plans.md'","a word never on an earlier screen"],cap:'A word the model never saw: this example is skipped.'}
  ];
  function pane(x,y,w,cw,title,rows,other,o,isMod){
    const rh=17,h=24+5*rh+8;let s='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="8" fill="var(--card)" stroke="var(--line)"/>';
    s+=RD.t(x+8,y+16,RD.esc(title),{fs:12,w:600,fill:isMod&&o.bad?'var(--bad)':'var(--ink)'});
    if(!rows){s+=RD.t(x+8,y+24+2*rh,'(it plays from the next step)',{fs:12,fill:'var(--mute)'});return s}
    const x0=x+8;
    rows.forEach((row,r)=>{const yy=y+24+r*rh;
      for(let i=0;i<N;i++){
        const d=other&&row[i]!==other[r][i];
        if(isMod&&d&&o.diff&&!o.fix)s+='<rect x="'+(x0+i*cw)+'" y="'+(yy+2)+'" width="'+cw+'" height="'+(rh-2)+'" fill="var(--bad)" fill-opacity=".35"/>'}
      s+='<text x="'+x0+'" y="'+(yy+13)+'" font-size="12" style="white-space:pre;font-family:'+MONO+'" fill="var(--ink)">'+RD.esc(row.replace(/ +$/,''))+'</text>'});
    return s}
  function draw(i){
    const o=ST[i],W=RD.width(el),w=W-4,cw=charW(),rh=17,ph=24+5*rh+8;
    let s=pane(2,2,w,cw,o.recT,o.rec,null,o,false);
    let modRows=o.mod;
    if(o.fix){modRows=REC2}
    s+=pane(2,ph+12,w,cw,o.modT,modRows,o.fix?MOD1:o.rec,o,true);
    if(o.fix){ // the correction's cells, green, over the repaired screen
      const x0=10,y=ph+12;const mark=(r,a,b)=>{let t='';for(let k=a;k<=b;k++)t+='<rect x="'+(x0+k*cw)+'" y="'+(y+24+r*rh+2)+'" width="'+cw+'" height="'+(rh-2)+'" fill="var(--c3)" fill-opacity=".35"/>';return t};
      s+=mark(2,9,14)+mark(3,0,7)+mark(4,0,0)}
    const oy=2*ph+22;
    if(o.op){s+='<rect x="2" y="'+oy+'" width="'+w+'" height="46" rx="8" fill="'+(o.bad?'var(--bad)':'var(--c3)')+'" fill-opacity=".12" stroke="'+(o.bad?'var(--bad)':'var(--c3)')+'"/>';
      o.op.forEach((l,k)=>{s+='<text x="10" y="'+(oy+19+k*17)+'" font-size="12" style="font-family:'+MONO+'" fill="'+(o.bad?'var(--bad)':'var(--ink)')+'">'+RD.esc(l)+'</text>'})}
    el.innerHTML=RD.svg(W,oy+50,s,'Recorded screen and the model\'s screen, step '+(i+1));
    cap.textContent=o.cap}
  const A=RD.anim({card:'wt-rep',ctl:'wt-rep-ctl',n:ST.length,draw,label:'Self-repair step',list:'sx-rep'});
  RD.onResize(()=>A.redraw());
  window.WT_REP={n:ST.length};
})();
