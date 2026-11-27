// Fig. 1 (hero): what one keypress costs WorldTUI to decode, for seven illustrative 32 x 96 screen changes.
// The encoder is a port of src/recompute.py (same rules, same tie-breaks); check_page.mjs compares it with the recorded
// counts in window.ARTICLE.recompute on every scenario. A widget: nothing moves by itself.
(function(){
  const el=document.getElementById('wt-cost-svg');if(!el||!window.ARTICLE||!ARTICLE.recompute)return;
  const S=ARTICLE.recompute.scen,ROWS=32,COLS=96;
  const pad=l=>{const o=l.map(x=>(x+' '.repeat(COLS)).slice(0,COLS));while(o.length<ROWS)o.push(' '.repeat(COLS));return o};
  function span(a,b){let lo=-1,hi=-1;for(let i=0;i<COLS;i++)if(a[i]!==b[i]){if(lo<0)lo=i;hi=i}return lo<0?null:[lo,hi]}
  function encode(before,after,allowCopy){
    const ops=[];
    for(let r=0;r<ROWS;r++){
      if(after[r]===before[r])continue;
      const s=span(before[r],after[r]);
      let best={row:r,kind:'write',src:null,col:s[0],text:after[r].slice(s[0],s[1]+1),tokens:2+s[1]-s[0]+1};
      if(allowCopy)for(let src=0;src<ROWS;src++){if(src===r)continue;
        const t=span(before[src],after[r]);
        const c=t===null?{row:r,kind:'copy',src,col:null,text:'',tokens:3}:{row:r,kind:'copy',src,col:t[0],text:after[r].slice(t[0],t[1]+1),tokens:4+t[1]-t[0]+1};
        if(c.tokens<best.tokens)best=c}
      ops.push(best)}
    return ops}
  function cost(before,after,allowCopy){const ops=encode(before,after,allowCopy);
    return {ops,seq:ops.reduce((a,o)=>a+o.tokens,0)+5,par:(ops.length?Math.max(...ops.map(o=>o.tokens)):1)+3}}
  window.WT_COST={pad,encode,cost};
  const btns=document.getElementById('wt-scn'),out=document.getElementById('wt-cost-out'),opsEl=document.getElementById('wt-cost-ops'),scr=document.getElementById('wt-cost-scr');
  btns.innerHTML=S.map((s,i)=>'<button data-m="'+i+'"'+(i===0?' class="on"':'')+'>'+RD.esc(s.label)+'</button>').join('');
  let cur=0;
  const f=n=>n.toLocaleString('en-US');
  const q=t=>/^ +$/.test(t)?t.length+' spaces':"'"+(t.length>36?t.slice(0,33)+'...':t)+"'";
  function opText(o){return o.kind==='write'?'ROW_'+o.row+' '+o.col+' '+q(o.text):'ROW_'+o.row+' COPY '+o.src+(o.col===null?'':' '+o.col+' '+q(o.text))}
  function draw(){
    const s=S[cur],b=pad(s.before),a=pad(s.after),c=cost(b,a,true),n=cost(b,a,false);
    const W=RD.width(el),lw=46,cw=(W-lw-6)/COLS,rh=7,top=18,H=top+ROWS*rh+22;
    const longest=c.ops.length?c.ops.reduce((m,o)=>o.tokens>m.tokens?o:m,c.ops[0]):null;
    let g=RD.t(lw,12,'column 0',{fs:11,fill:'var(--mute)'})+RD.t(W-6,12,'95',{fs:11,fill:'var(--mute)',a:'end'});
    const byRow={};c.ops.forEach(o=>byRow[o.row]=o);
    for(let r=0;r<ROWS;r++){const y=top+r*rh,o=byRow[r];
      if(r%8===0||r===31)g+=RD.t(lw-5,y+rh,'row '+r,{fs:11,fill:'var(--mute)',a:'end'});
      if(!o){g+='<rect x="'+lw+'" y="'+(y+1)+'" width="'+(COLS*cw)+'" height="'+(rh-2)+'" rx="1" fill="var(--dim)" fill-opacity=".45"/>';continue}
      if(o.kind==='copy')g+='<rect x="'+lw+'" y="'+(y+1)+'" width="'+(COLS*cw)+'" height="'+(rh-2)+'" rx="1" fill="var(--c1)" fill-opacity=".75"/>';
      else g+='<rect x="'+lw+'" y="'+(y+1)+'" width="'+(COLS*cw)+'" height="'+(rh-2)+'" rx="1" fill="var(--dim)" fill-opacity=".25"/>';
      if(o.col!==null)g+='<rect x="'+(lw+o.col*cw)+'" y="'+(y+1)+'" width="'+Math.max(1.5,o.text.length*cw)+'" height="'+(rh-2)+'" rx="1" fill="var(--c3)"/>';
      if(o===longest)g+='<rect x="'+(lw-2)+'" y="'+y+'" width="'+(COLS*cw+4)+'" height="'+rh+'" rx="2" fill="none" stroke="var(--c2)" stroke-width="1.6"/>'}
    if(longest)g+=RD.t(lw,top+ROWS*rh+16,'orange outline: the longest edit, row '+longest.row+', '+longest.tokens+' tokens',{fs:11.5,fill:'var(--c2)'});
    el.innerHTML=RD.svg(W,H,g,'Which of the 32 rows the edit writes, copies or leaves unchanged');
    out.innerHTML=RD.stat('Rows changed',c.ops.length+' of 32',c.ops.filter(o=>o.kind==='copy').length+' by COPY')+
      RD.stat('Sequential steps',f(c.seq),'every token, one at a time')+
      RD.stat('Without COPY',f(n.seq),'every changed row written')+
      RD.stat('Row-parallel steps',f(c.par),'longest row, then the cursor');
    const shown=c.ops.slice(0,8).map(opText);
    opsEl.textContent=shown.join(' · ')+(c.ops.length>8?' · ... ('+(c.ops.length-8)+' more rows)':'')+(c.ops.length?' · ':'')+'CURSOR '+s.cursor[0]+' '+s.cursor[1]+' 1 · OUTPUT_END';
    const num=(L)=>L.map((l,i)=>(i<10?' ':'')+i+' |'+l.replace(/ +$/,'')).join('\n');
    scr.textContent='before:\n'+num(b)+'\n\nafter ('+s.what+'):\n'+num(a);
  }
  RD.seg(btns,v=>{cur=+v;draw()});
  window.WT_COST.go=i=>{cur=i;draw()};
  RD.onRender(draw);RD.onResize(draw);draw();
})();
