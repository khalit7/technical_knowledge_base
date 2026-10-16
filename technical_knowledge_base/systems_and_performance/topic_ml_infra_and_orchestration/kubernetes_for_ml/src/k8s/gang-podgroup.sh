#!/bin/sh
# The PodGroup that makes <job>'s two pods one gang: none is bound until both can be.
cat <<EOF2
apiVersion: scheduling.k8s.io/v1beta1
kind: PodGroup
metadata: {name: $1, namespace: km}
spec:
  schedulingPolicy:
    gang: {minCount: 2}
EOF2
