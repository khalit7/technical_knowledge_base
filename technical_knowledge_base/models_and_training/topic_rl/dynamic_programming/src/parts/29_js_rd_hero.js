// ---- Reading top: the hero figure. Left, one optimality backup of Class 3 (student MDP, gamma 1, optimal successor values);
// right, the same backup applied to every cell of Silver's shortest-path grid, after 1, 3 and 6 synchronous sweeps. Static: no controls. ----
(function(){
  const D=window.DPE,P=document.getElementById('dp-heroP');if(!P)return;
  const w=D.W.silver,F=[D.init(w)];for(let k=0;k<6;k++)F.push(D.sweep(w,F[k],1,'vi',null,false).V);
  function tree(x0,y0,TW){// returns svg for the backup tree inside a box TW wide starting at x0,y0; height 196
    let s='';const cx=x0+TW/2,ax=[x0+TW*0.2,x0+TW*0.66];
    const node=(x,y,lab,val,hl)=>'<circle cx="'+x+'" cy="'+y+'" r="'+(hl?27:22)+'" fill="'+(hl?'var(--acc2)':'var(--soft)')+'" stroke="'+(hl?'var(--acc)':'var(--line)')+'" stroke-width="'+(hl?2:1)+'"/>'+RD.t(x,y-2,lab,{a:'middle',fs:11,w:600})+RD.t(x,y+11,val,{a:'middle',fs:11});
    const line=(x1,y1,x2,y2,c)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+(c||'var(--mute)')+'" stroke-width="1.5"/>';
    // root
    s+=line(cx,y0+57,ax[0],y0+90,'var(--acc)')+line(cx,y0+57,ax[1],y0+90);
    s+=node(cx,y0+30,'Class 3','V = 10',true);
    s+=RD.t(cx+32,y0+22,'max',{fs:11,w:600,fill:'var(--acc)'});
    // actions
    s+='<circle cx="'+ax[0]+'" cy="'+(y0+90)+'" r="5" fill="var(--acc)"/><circle cx="'+ax[1]+'" cy="'+(y0+90)+'" r="5" fill="var(--ink)"/>';
    s+=RD.t(ax[0]-9,y0+84,'Study',{a:'end',fs:11,w:600})+RD.t(ax[0]-9,y0+98,'+10, ends',{a:'end',fs:11})+RD.t(ax[0]+9,y0+110,'= 10',{fs:12,w:700,fill:'var(--acc)'});
    s+=RD.t(ax[1]+9,y0+86,'Pub, +1',{fs:11,w:600})+RD.t(ax[1]+9,y0+100,'= 9.4',{fs:12,w:700});
    // Pub's successors
    const sx=[ax[1]-TW*0.24,ax[1],ax[1]+TW*0.24].map(x=>Math.min(x0+TW-20,Math.max(x0+20,x))),pr=['0.2','0.4','0.4'],nm=['Class 1','Class 2','Class 3'],vv=['6','8','10'];
    sx.forEach((x,i)=>{s+=line(ax[1],y0+95,x,y0+150);s+=RD.t((ax[1]+x)/2+(i===1?14:i===0?-16:16),y0+126,pr[i],{a:'middle',fs:11,fill:'var(--mute)'});s+=node(x,y0+172,nm[i].replace('Class ','C'),vv[i])});
    return s}
  function grids(x0,y0,GW){// three 4x4 grids after 1, 3, 6 sweeps in a row GW wide; returns [svg,height]
    const gap=10,cs=Math.max(18,Math.min(30,Math.floor((GW-2*gap)/12)));const gw=cs*4,tot=gw*3+gap*2,ox=x0+Math.floor((GW-tot)/2);let s='';
    [1,3,6].forEach((k,j)=>{const X0=ox+j*(gw+gap),V=F[k];
      s+=RD.t(X0+gw/2,y0+11,'after '+k+' sweep'+(k>1?'s':''),{a:'middle',fs:11,w:600});
      for(let c=0;c<w.n;c++){const [x,y]=w.cells[c],X=X0+x*cs,Y=y0+18+y*cs,t=w.term[c];
        s+='<rect x="'+X+'" y="'+Y+'" width="'+cs+'" height="'+cs+'" fill="'+(t?'color-mix(in srgb, var(--c3) 40%, var(--bg))':RD.colorScale(V[c],-6,0))+'" stroke="var(--line)"/>';
        s+=RD.t(X+cs/2,Y+cs/2+4,t?'G':String(V[c]).replace('-','−'),{a:'middle',fs:11,w:t?700:400})}});
    return [s,18+cs*4+4]}
  function draw(){const W=RD.width(P);let s='',H;
    if(W>=640){const TW=Math.min(330,W*0.44);s+=tree(0,6,TW);const [g,gh]=grids(TW+20,24,W-TW-20);s+=g;
      s+=RD.t(TW+10,14,'the same backup on every cell, all at once',{fs:11,fill:'var(--mute)'});H=Math.max(206,gh+30)}
    else{const TW=Math.min(W,340);s+=tree(Math.floor((W-TW)/2),6,TW);const [g,gh]=grids(0,232,W);s+=RD.t(W/2,224,'the same backup on every cell, all at once',{a:'middle',fs:11,fill:'var(--mute)'});s+=g;H=232+gh+4}
    P.innerHTML=RD.svg(W,H,s,'One Bellman backup of Class 3, and value iteration sweeping out from the goal of a 4 by 4 grid')}
  RD.onRender(draw);RD.onResize(draw);draw();
})();
