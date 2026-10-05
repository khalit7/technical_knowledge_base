#!/usr/bin/env python3
"""Write parts/32_js_cal_data.js from inputs/calibration.json (run from src/)."""
import json
C = json.load(open("inputs/calibration.json"))
open("parts/32_js_cal_data.js", "w").write("window.CAL_DATA=" + json.dumps(C, separators=(",", ":")) + ";\n")
