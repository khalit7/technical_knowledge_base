"""Train or evaluate a tiny GPT with the shared train.py / eval.py, optionally with the output gate (--gate).

  av_train.py train --name av_gate --gate --preset rope ...   (all other flags go to src/data/train.py)
  av_train.py eval av_gate                                     (src/data/eval.py, gate restored from av.json)
"""
import os, sys, json

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import av_model  # noqa: E402  (puts src/data on sys.path)

SCR = os.environ["LA_SCRATCH"]

if __name__ == "__main__":
    mode, args = sys.argv[1], sys.argv[2:]
    if mode == "train":
        gate = "--gate" in args
        args = [a for a in args if a != "--gate"]
        name = args[args.index("--name") + 1]
        d = os.path.join(SCR, "runs", name); os.makedirs(d, exist_ok=True)
        json.dump({"gate": gate}, open(os.path.join(d, "av.json"), "w"))
        if gate:
            av_model.enable_gate()
        import train
        sys.argv = ["train.py"] + args
        train.main()
    elif mode == "eval":
        av_model.maybe_enable(os.path.join(SCR, "runs", args[0]))
        import eval as ev
        sys.argv = ["eval.py"] + args
        ev.main()
