// run: always
interface Reply { answer: string; confidence: number }
const raw = '{"answer": "Paris"}';                 // the model forgot confidence
const reply = JSON.parse(raw) as Reply;            // as: a claim, not a check
console.log(reply.confidence.toFixed(2));
