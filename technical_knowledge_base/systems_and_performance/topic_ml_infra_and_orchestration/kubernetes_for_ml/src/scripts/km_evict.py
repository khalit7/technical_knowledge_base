#!/usr/bin/env python3
"""Evict one pod through the Eviction API (what kubectl drain and node-pressure tooling call), so the pod
gets the DisruptionTarget condition. usage: km_evict.py <namespace> <pod>"""
import sys
from kubernetes import client, config
config.load_kube_config(context="kind-mi-kind")
ns, pod = sys.argv[1], sys.argv[2]
body = client.V1Eviction(metadata=client.V1ObjectMeta(name=pod, namespace=ns))
client.CoreV1Api().create_namespaced_pod_eviction(pod, ns, body)
print("evicted", pod)
