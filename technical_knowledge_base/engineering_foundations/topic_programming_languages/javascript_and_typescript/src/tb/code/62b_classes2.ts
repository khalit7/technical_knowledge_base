interface Tokenizer { encode(text: string): number[] }
class WhitespaceTokenizer implements Tokenizer {
  private vocab = new Map<string, number>();     // private: checked by tsc, erased at run time
  #calls = 0;                                    // #private: enforced by JavaScript itself
  readonly name: string;
  constructor(name: string) { this.name = name; }
  encode(text: string): number[] {
    this.#calls++;
    return text.split(/\s+/).map(w => {
      if (!this.vocab.has(w)) this.vocab.set(w, this.vocab.size);
      return this.vocab.get(w)!;
    });
  }
}
const t = new WhitespaceTokenizer("ws");
console.log(t.name, t.encode("to be or not to be"));
console.log((t as any).vocab.size, (t as any)["#calls"]);
