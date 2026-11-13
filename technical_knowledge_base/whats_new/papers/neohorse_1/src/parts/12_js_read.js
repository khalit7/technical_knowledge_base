// ---- The paper tab, part 1: shared data; the loop is now a 3D stage (31_js_sc_loop.js) ----
const RCD=PAPER.rc,TB=PAPER.tables;
// ---- Figure 4, interactive: which spans of a two-turn interaction get loss ----
(function(){
  const seq=[['u1','USER','Request'],['a1r','ASSISTANT','Reasoning'],['a1c','ASSISTANT','Tool call'],['t1','TOOL','Result'],['a1x','ASSISTANT','Reasoning'],['a1v','ASSISTANT','Response'],
    ['u2','USER','Request'],['a2r','ASSISTANT','Reasoning'],['a2c','ASSISTANT','Tool call'],['t2','TOOL','Result'],['a2x','ASSISTANT','Reasoning'],['a2v','ASSISTANT','Response']];
  let cur='2';
  function draw(w){const turn=id=>id[1]==='1'||id==='u1'||id==='t1'?'1':'2';
    const rows=w<560?2:1,per=Math.ceil(seq.length/rows),bw=(w-8)/per,bh=40;let s='';
    seq.forEach((b,i)=>{const r=Math.floor(i/per),c=i%per,x=4+c*bw,y=26+r*(bh+44),t=turn(b[0]);
      const isCur=t===cur,earlier=+t<+cur,later=+t>+cur,isA=b[1]==='ASSISTANT',reason=b[2]==='Reasoning';
      let st,f,op=1;
      if(later){st='not in this example';f='var(--soft)';op=.3}
      else if(earlier&&isA&&reason){st='omitted';f='var(--soft)';op=.35}
      else if(isCur&&isA){st='m = 1';f='var(--acc)'}
      else {st='m = 0';f='var(--dim)'}
      s+=rc(x+1,y,bw-2,bh,f,{op,r:5})+tx(x+bw/2,y+16,b[1].slice(0,4)==='ASSI'?'ASST':b[1],{fs:11,a:'middle',c:isCur&&isA?'var(--tk)':'var(--ink)',op})+tx(x+bw/2,y+31,b[2].length*6.2>bw-4?b[2].slice(0,Math.floor((bw-4)/6.2)):b[2],{fs:11,a:'middle',c:isCur&&isA?'var(--tk)':'var(--mute)',op});
      s+=tx(x+bw/2,y+bh+14,st==='not in this example'?'':st,{fs:11,a:'middle',c:st==='m = 1'?'var(--acc)':'var(--mute)'});
      if(c===0||b[0]==='u2')s+=tx(x+2,y-8,'User turn '+t+(t===cur?' (current)':earlier?' (history)':''),{fs:11,w:600,c:t===cur?'var(--acc)':'var(--mute)'});
    });
    $('mkSvg').innerHTML=svgW(w,26+rows*(bh+44),s,'Loss mask over a two-turn interaction');
    $('mkCap').innerHTML=cur==='2'?'Training on turn 2: turn 1 is history. Its request, tool call, result and visible response stay as context with no loss; its reasoning is dropped. In turn 2 every assistant span (reasoning, tool call, response) gets loss; the user request and the tool result do not.':'Training on turn 1: nothing comes before it, and turn 2 is simply not in this example. Each user turn becomes its own training example with the history before it, so a 10-turn conversation can yield up to 10 examples.'}
  fit($('mkSvg'),draw);segBind('mkM',m=>{cur=m;refit($('mkSvg'))});
})();
