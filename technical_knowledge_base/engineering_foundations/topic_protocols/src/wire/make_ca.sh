#!/bin/sh
# Create a throwaway local CA and a server certificate for api.llm.test (and 127.0.0.1).
# Usage: sh make_ca.sh <outdir>. Keys never enter the repo; only the public certs are recorded in raw/.
set -e
D="${1:?outdir}"; mkdir -p "$D"; cd "$D"
openssl ecparam -name prime256v1 -genkey -noout -out ca.key
openssl req -x509 -new -key ca.key -sha256 -days 30 -subj "/CN=Wire Lab Root CA" \
  -addext "basicConstraints=critical,CA:TRUE" -addext "keyUsage=critical,keyCertSign,cRLSign" -addext "subjectKeyIdentifier=hash" -out ca.pem
openssl ecparam -name prime256v1 -genkey -noout -out server.key
openssl req -new -key server.key -subj "/CN=api.llm.test" -out server.csr
printf 'basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature\nextendedKeyUsage=serverAuth\nsubjectAltName=DNS:api.llm.test,DNS:localhost,IP:127.0.0.1\nsubjectKeyIdentifier=hash\nauthorityKeyIdentifier=keyid\n' > ext.cnf
openssl x509 -req -in server.csr -CA ca.pem -CAkey ca.key -CAcreateserial -days 7 -sha256 -extfile ext.cnf -out server.pem
cat server.pem ca.pem > chain.pem
echo "CA and server cert in $D"
