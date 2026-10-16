# mi-train: the running example's image (Python 3.12, torch CPU, train.py, TinyShakespeare).
# Build context: this folder plus input.txt (fetch_data.sh downloads it at a pinned commit and checks sha256).
FROM python:3.12-slim-trixie@sha256:a6e34c598f2467ed0e9a8d349809fcd8b5c603269512df273a0bb1784edc11b1
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch==2.14.1 \
 && pip install --no-cache-dir numpy==2.5.4
ENV OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 PYTHONUNBUFFERED=1 MI_DATA=/opt/mi/input.txt
COPY input.txt train.py /opt/mi/
WORKDIR /opt/mi
CMD ["python", "/opt/mi/train.py"]
