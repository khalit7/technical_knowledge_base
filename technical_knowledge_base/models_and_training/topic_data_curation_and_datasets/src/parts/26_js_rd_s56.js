// ---- Reading tab, sections 5 and 6: FineWeb-Edu vs DCLM bars, n-gram decontamination demo ----
(function(){
  const D=window.RDD,esc=RD.esc;
  const sb=document.getElementById('rd-smol-bars');
  if(sb){const rows=[];D.smol.forEach(r=>{rows.push([r[0]+': FineWeb-Edu',r[1],r[1]>r[2],'var(--c3)']);rows.push([r[0]+': DCLM',r[2],r[2]>r[1],'var(--c1)'])});RD.bars(sb,rows,80,v=>v.toFixed(1))}

  const view=document.getElementById('rd-dc-view');if(!view)return;
  const ITEM='A bakery sells muffins in boxes of 6. On Monday it sold 14 boxes and on Tuesday it sold 9 more boxes than on Monday. How many muffins did the bakery sell on the two days together?';
  const DOCS={copy:'Homework help thread. Question: A bakery sells muffins in boxes of 6. On Monday it sold 14 boxes and on Tuesday it sold 9 more boxes than on Monday. How many muffins did the bakery sell on the two days together? Answer: 222.',
    para:'Practice problem: muffins come in boxes of six at a bakery. Monday\'s sales were 14 boxes, and on Tuesday it sold 9 more boxes than on Monday. Find the total number of muffins sold over both days.',
    topic:'Our bakery sells muffins in boxes of 6 and in single packs. On Monday it sold out before noon, so on Tuesday we baked twice as many. How many muffins did you buy from us this week?'};
  let n=8,doc='copy';
  const toks=s=>s.toLowerCase().replace(/[^a-z0-9' ]/g,' ').split(/\s+/).filter(Boolean);
  function draw(){
    const it=toks(ITEM),dt=toks(DOCS[doc]),G=new Set();
    for(let i=0;i+n<=dt.length;i++)G.add(dt.slice(i,i+n).join(' '));
    const cov=new Array(it.length).fill(false);
    for(let i=0;i+n<=it.length;i++)if(G.has(it.slice(i,i+n).join(' ')))for(let j=i;j<i+n;j++)cov[j]=true;
    const f=cov.filter(Boolean).length/it.length,flag=f>0.5;
    view.innerHTML='<div class="small mute">Test item ('+it.length+' tokens), covered tokens highlighted:</div><div class="rd-doc">'+it.map((w,i)=>cov[i]?'<span class="k">'+esc(w)+'</span>':esc(w)).join(' ')+'</div>'+
      '<div class="small mute">Training page:</div><div class="rd-doc">'+esc(DOCS[doc])+'</div>'+
      '<div class="an-cnt">'+RD.stat('n-gram length',n)+RD.stat('Item tokens covered',(100*f).toFixed(0)+'%',cov.filter(Boolean).length+' of '+it.length)+RD.stat('Tulu 3 rule (over 50%)',flag?'contaminated':'not flagged')+'</div>';
  }
  RD.seg(document.getElementById('rd-dc-n'),v=>{n=+v;draw()});RD.seg(document.getElementById('rd-dc-doc'),v=>{doc=v;draw()});draw();
})();
