# mi-ray: the running example image plus Ray 2.59.0 (Ray Train, dashboard for the state API).
# Ray runs in containers, not natively on the Mac: Ray refuses multi-node clusters on macOS without an override,
# and its Unix socket paths under a long temp folder exceed macOS's 103-byte limit.
FROM mi-train:1
RUN pip install --no-cache-dir "ray[default,train]==2.59.0"
ENV RAY_USAGE_STATS_ENABLED=0
RUN mkdir -p /opt/mi/ray && ln -s /opt/mi /opt/mi/train
COPY ray_train.py /opt/mi/ray/
