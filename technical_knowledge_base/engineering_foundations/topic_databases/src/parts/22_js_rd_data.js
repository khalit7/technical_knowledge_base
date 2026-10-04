// ---- Reading tab: the chat product's tiny sample data (sections 1 and 2) and the measured numbers behind the animations ----
// Measured numbers come from src/read/measure_read.py (src/read/inputs/read_measure.json); src/read/recompute.py checks them.
window.RDD={
  users:{cols:['id','name','email','plan'],rows:[[1,'Ada','ada@example.com','pro'],[2,'Ben','ben@example.com','free'],[3,'Chen','chen@example.com','free']]},
  chats:{cols:['id','user_id','title'],rows:[[10,1,'Trip plan'],[11,1,'SQL help'],[12,2,'A poem'],[13,3,'Recipe']]},
  messages:{cols:['id','chat_id','role','tokens'],rows:[[100,10,'user',12],[101,10,'assistant',340],[102,11,'user',25],[103,11,'assistant',610],[104,12,'user',8],[105,12,'assistant',150],[106,13,'user',30],[107,11,'user',14],[108,11,'assistant',220]]},
  credits:{cols:['user_id','balance'],rows:[[1,40],[2,1],[3,0]]},
  // foreign keys: [table, column] -> [table, column]
  fks:[['chats','user_id','users','id'],['messages','chat_id','chats','id'],['credits','user_id','users','id']],
  // measured on 2026-10-04: PostgreSQL 16.2 (pgserver wheel) and DuckDB 1.5.6 on an Apple M1 Pro laptop, 1,000,000 messages over 100,000 chats
  M:{
    date:'2026-10-04',pg:'16.2',duck:'1.5.6',rows:1000000,
    heapPages:19235,heapBytes:157573120,
    seqPages:19349,seqHit:14435,seqRead:4914,seqMs:28.194,
    idxPages:12,idxMs:0.061,chatRows:6,chatHeapPages:6,indexBytes:9306112,idxOnlyPages:7,
    aggRowBytes:157704192,aggRowMs:70.021,
    pq:{chat_id:1954529,content:22407143,created_at:2968199,id:1053149,model:316886,role:862,tokens:1362205},
    pqU:{chat_id:2652956,content:83486329,created_at:8000279,id:8000279,model:379884,role:254530,tokens:1486572},
    pqFile:30341486,aggColMs:2.58,
    credits:{naive:{sent:2,balance:0},lock:{sent:1,balance:0},serializable:{sent:1,balance:0,err:'could not serialize access due to concurrent update'}}
  }
};
