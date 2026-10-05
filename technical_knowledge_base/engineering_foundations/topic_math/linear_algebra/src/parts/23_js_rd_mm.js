// ---- Reading s3: one product PQ computed four ways (row-column, column picture, outer products, composition) ----
(function(){
  const $=id=>document.getElementById(id);if(!$('rd-mm-card'))return;
  const P=[[1,2],[3,4]],Q=[[5,6],[7,8]],PQ=LA.mul(P,Q);
  let mode='rc';
  // each step: {res: 2x2 of numbers or null, hp: cells of P to highlight, hq: cells of Q, hr: cells of result, work, mults, title, text}
  function steps(){const S=[];const blank=[[null,null],[null,null]];
    const start={res:blank,hp:[],hq:[],hr:[],work:'',mults:0,title:'Start',text:'P is 2 x 2 and Q is 2 x 2, so PQ is 2 x 2: four numbers to find. Every way of finding them does the same 8 multiplications.'};
    S.push(start);
    if(mode==='rc'){let r=blank.map(x=>x.slice()),m=0;
      for(let i=0;i<2;i++)for(let j=0;j<2;j++){r=r.map(x=>x.slice());r[i][j]=PQ[i][j];m+=2;
        S.push({res:r,hp:[[i,0],[i,1]],hq:[[0,j],[1,j]],hr:[[i,j]],mults:m,work:'(PQ)'+(i+1)+(j+1)+' = row '+(i+1)+' of P · column '+(j+1)+' of Q = '+P[i][0]+'×'+Q[0][j]+' + '+P[i][1]+'×'+Q[1][j]+' = '+PQ[i][j],
          title:'Entry ('+(i+1)+', '+(j+1)+')',text:'One dot product per entry: the reading used for attention scores, where every query row meets every key column.'})}}
    if(mode==='col'){let r=blank.map(x=>x.slice()),m=0;
      for(let j=0;j<2;j++){r=r.map(x=>x.slice());r[0][j]=PQ[0][j];r[1][j]=PQ[1][j];m+=4;
        S.push({res:r,hp:[[0,0],[1,0],[0,1],[1,1]],hq:[[0,j],[1,j]],hr:[[0,j],[1,j]],mults:m,work:'column '+(j+1)+' of PQ = '+Q[0][j]+'·(1, 3) + '+Q[1][j]+'·(2, 4) = ('+PQ[0][j]+', '+PQ[1][j]+')',
          title:'Column '+(j+1),text:'A whole column at once: a combination of the columns of P, with weights from column '+(j+1)+' of Q. Every output lies in the span of P\'s columns.'})}}
    if(mode==='outer'){const L1=[[P[0][0]*Q[0][0],P[0][0]*Q[0][1]],[P[1][0]*Q[0][0],P[1][0]*Q[0][1]]];
      S.push({res:L1,hp:[[0,0],[1,0]],hq:[[0,0],[0,1]],hr:[[0,0],[0,1],[1,0],[1,1]],mults:4,work:'layer 1 = column 1 of P × row 1 of Q = (1, 3)(5, 6) = [[5, 6], [15, 18]]',
        title:'Rank-1 layer 1',text:'An outer product fills the whole 2 x 2 at once, but every row is a multiple of (5, 6): rank 1. The partial sum shown is already a full matrix.'});
      S.push({res:PQ,hp:[[0,1],[1,1]],hq:[[1,0],[1,1]],hr:[[0,0],[0,1],[1,0],[1,1]],mults:8,work:'layer 2 = (2, 4)(7, 8) = [[14, 16], [28, 32]]; running sum [[5+14, 6+16], [15+28, 18+32]] = [[19, 22], [43, 50]]',
        title:'Add rank-1 layer 2',text:'The product is the sum of two rank-1 layers. The SVD, LoRA (BA as r layers) and a layer\'s gradient (g xᵀ) are all read this way.'})}
    if(mode==='comp'){let r=blank.map(x=>x.slice());
      S.push({res:r,hp:[],hq:[[0,0],[1,0]],hr:[],mults:0,work:'Q e₁ = (5, 7): where Q sends the first axis arrow is just its first column, no arithmetic',title:'Apply Q to e₁',text:'Composition: (PQ)x = P(Qx). First Q acts on e₁ = (1, 0), which reads off Q\'s first column.'});
      r=r.map(x=>x.slice());r[0][0]=19;r[1][0]=43;
      S.push({res:r,hp:[[0,0],[0,1],[1,0],[1,1]],hq:[],hr:[[0,0],[1,0]],mults:4,work:'P (5, 7) = (1×5 + 2×7, 3×5 + 4×7) = (19, 43): column 1 of PQ',title:'Then apply P',text:'Then P acts on the result. Where e₁ lands after both maps is the first column of PQ. Read right to left: Q first.'});
      S.push({res:r,hp:[],hq:[[0,1],[1,1]],hr:[],mults:4,work:'Q e₂ = (6, 8), the second column of Q',title:'Apply Q to e₂',text:'The same for the second axis arrow.'});
      r=r.map(x=>x.slice());r[0][1]=22;r[1][1]=50;
      S.push({res:r,hp:[[0,0],[0,1],[1,0],[1,1]],hq:[],hr:[[0,1],[1,1]],mults:8,work:'P (6, 8) = (6 + 16, 18 + 32) = (22, 50): column 2 of PQ',title:'Then apply P',text:'The columns of PQ are where the axis arrows land after Q then P: composition and the column picture are the same arithmetic. QP would apply P first and gives a different matrix, [[23, 34], [31, 46]].'})}
    return S}
  const grid=(M,hl,dim)=>'<span class="mmgrid">'+[0,1].map(i=>[0,1].map(j=>{const on=hl.some(h=>h[0]===i&&h[1]===j);const v=M[i][j];return '<span class="'+(on?'on':'')+(v===null?' dim':'')+'">'+(v===null?'?':v)+'</span>'}).join('')).join('')+'</span>';
  function draw(i){const S=steps(),s=S[Math.min(i,S.length-1)];
    $('rd-mm-mats').innerHTML='<span>P</span>'+grid(P,s.hp)+'<span>Q</span>'+grid(Q,s.hq)+'<span>=</span>'+grid(s.res,s.hr);
    $('rd-mm-work').textContent=s.work||' ';
    const known=s.res.flat().filter(v=>v!==null).length;
    $('rd-mm-cnt').innerHTML=RD.stat('Multiplications so far',String(s.mults),'of 8')+RD.stat('Entries of PQ known',String(known),'of 4');
    $('rd-mm-cap').innerHTML='<div class="t">Step '+(i+1)+' of '+S.length+': '+s.title+'</div><p>'+s.text+'</p>'}
  const an=RD.anim({card:'rd-mm-card',ctl:'rd-mm-ctl',n:steps().length,draw,ms:2200,label:'Step of the multiplication'});
  RD.seg($('rd-mm-seg'),m=>{mode=m;an.reset(steps().length);an.play()});
})();
