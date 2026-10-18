"""Train (or evaluate) the sinusoidal tiny GPT with the token embedding multiplied by sqrt(d_model) = 16 before the
sinusoids are added, as Vaswani et al. 2017 section 3.4 do ("we multiply those weights by sqrt(d_model)"). The root's
tiny_gpt.py adds the unit-amplitude sinusoids to embeddings initialised at std 0.02, so position swamps content (norm
about 11.3 against 0.32). Everything else is the sinusoidal preset and train.py unchanged.
Run: python train_scaled.py train --preset sinusoidal --steps 1500 --name pe_sinusoidal_x16 ...   (train.py arguments)
     python train_scaled.py eval pe_sinusoidal_x16 --device cpu                                     (eval.py arguments)"""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.normpath(os.path.join(HERE, "../../../src/data")))
import tiny_gpt


def patch():
    orig = tiny_gpt.GPT.embed
    def embed(self, idx, start=0):
        if self.cfg.pos != "sinusoidal" or not getattr(self, "scale_emb", True):
            return orig(self, idx, start)
        T = idx.shape[1]
        pos = tiny_gpt.torch.arange(start, start + T, device=idx.device)
        x = self.wte(idx) * math.sqrt(self.cfg.d_model) + self.wpe_table[pos].to(self.wte.weight.dtype)
        return self.drop(x), pos
    tiny_gpt.GPT.embed = embed


if __name__ == "__main__":
    patch()
    mode = sys.argv.pop(1)
    import train, eval as ev
    (train.main if mode == "train" else ev.main)()
