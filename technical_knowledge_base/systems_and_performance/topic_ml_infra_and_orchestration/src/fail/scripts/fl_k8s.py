#!/usr/bin/env python3
"""Fill fl-jobset.yaml for one run: fl_k8s.py NAME MAXR "train args" > out.yaml"""
import sys, os
name, maxr, args = sys.argv[1], sys.argv[2], sys.argv[3]
t = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "fl-jobset.yaml")).read()
print(t.replace("__NAME__", name).replace("__MAXR__", maxr).replace("__ARGS__", args), end="")
