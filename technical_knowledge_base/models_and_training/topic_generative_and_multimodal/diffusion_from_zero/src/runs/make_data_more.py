"""Build parts/20_js_dz_0more.js (window.DZX) and out/page_data_more.json (plain Python 3, no torch, seconds).

Added on 2026-10-24 when this page became the owner of diffusion from zero (the forward process, the denoiser and its
target, the training loss): it carries the root Diffusion lab's recordings that the absorbed sections show, read from
the root's src/diff/out/page_data.json and never recomputed:
  lab    the lab's numbers (its f block: schedules, training run, sampler and guidance scores, SD 1.5 timings)
  traj   recorded sampling trajectories (the same three noise images through 1, 4, 20, 50 DDIM steps and 20 DDPM steps)
  st     four strips: the epsilon-model and the v-model at 1 DDIM step, the v-model at 50, the v-model sampled as epsilon
  per_t  validation error by timestep of the epsilon- and v-models (2,048 validation images, EMA weights)
  txt    corrections to sentences in window.DZ (written by make_data.py, which needs the scratch strips and cannot be
         rerun here): the samplers sentence pointed at a tab that is now part of the Reading flow.
fill_static.py writes all of these numbers and sentences into the built HTML, so they are static text.
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "out")
LAB = os.path.join(HERE, "..", "..", "..", "src", "diff", "out", "page_data.json")


def main():
    lab = json.load(open(LAB))
    dz = json.load(open(os.path.join(OUT, "page_data.json")))
    st = {k: lab["st"][k] for k in ("ddim_1", "v_ddim_1", "v_ddim_50", "mm_50")}
    per_t = {k: lab["train"][k]["per_t"] for k in ("eps", "v")}
    old = dz["txt"]["dz-samp-txt"]
    new = old.replace("Every sample and number is in the {Sampler workbench|#t-dzsamp}.",
                      "Every sample and number is in the workbench above.")
    assert new != old, "samplers sentence changed upstream; update the override"
    out = {"lab": lab["f"], "traj": lab["traj"], "st": st, "per_t": per_t, "txt": {"dz-samp-txt": new}}
    js = "// ---- written by src/runs/make_data_more.py from the root Diffusion lab's recordings; do not edit by hand ----\n"
    js += "window.DZX=" + json.dumps(out, separators=(",", ":")) + ";\n"
    open(os.path.join(HERE, "..", "parts", "20_js_dz_0more.js"), "w").write(js)
    json.dump(out, open(os.path.join(OUT, "page_data_more.json"), "w"), separators=(",", ":"))
    print("DZX", len(js) // 1024, "KB")


if __name__ == "__main__":
    main()
