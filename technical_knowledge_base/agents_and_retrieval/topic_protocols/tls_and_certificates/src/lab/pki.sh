#!/bin/sh
# Throwaway PKI for the TLS page's lab. Usage: OPENSSL=<openssl 3.5+> sh pki.sh <outdir>
# Keys stay in <outdir> (scratch, never the repo); run_all.sh copies only the public certificates to ../raw/certs/.
# Root (ECDSA P-256) -> intermediate "TLS Lab Issuing CA 1" -> leaf api.llm.test, plus:
#   leaf_b      a second leaf for the same name (rotation test)
#   client      a workload client certificate whose identity is a SPIFFE ID in a URI SAN
#   rsa_*       the same chain with RSA-2048 keys
#   mldsa44_*, mldsa65_*  the same chain with ML-DSA keys (FIPS 204), to measure post-quantum certificate sizes
set -e
O="${OPENSSL:-openssl}"; D="${1:?outdir}"; mkdir -p "$D"; cd "$D"
ext() { printf '%s\n' "$@" > ext.cnf; }
mkca() { # name keyalgargs subject [issuer]
  n=$1; shift; kargs=$1; shift; subj=$1; shift; iss=$1
  $O genpkey $kargs -out $n.key 2>/dev/null
  if [ -z "$iss" ]; then
    $O req -x509 -new -key $n.key -days 3650 -subj "$subj" -addext "basicConstraints=critical,CA:TRUE" \
      -addext "keyUsage=critical,keyCertSign,cRLSign" -addext "subjectKeyIdentifier=hash" -out $n.pem
  else
    $O req -new -key $n.key -subj "$subj" -out $n.csr
    ext "basicConstraints=critical,CA:TRUE,pathlen:0" "keyUsage=critical,keyCertSign,cRLSign" "subjectKeyIdentifier=hash" "authorityKeyIdentifier=keyid"
    $O x509 -req -in $n.csr -CA $iss.pem -CAkey $iss.key -CAcreateserial -days 1825 -extfile ext.cnf -out $n.pem 2>/dev/null
  fi
}
mkleaf() { # name keyalgargs subject issuer days san eku
  $O genpkey $2 -out $1.key 2>/dev/null
  $O req -new -key $1.key -subj "$3" -out $1.csr
  ext "basicConstraints=critical,CA:FALSE" "keyUsage=critical,digitalSignature" "extendedKeyUsage=$7" "subjectAltName=$6" "subjectKeyIdentifier=hash" "authorityKeyIdentifier=keyid"
  $O x509 -req -in $1.csr -CA $4.pem -CAkey $4.key -CAcreateserial -days $5 -extfile ext.cnf -out $1.pem 2>/dev/null
}
EC="-algorithm EC -pkeyopt ec_paramgen_curve:P-256"
mkca root "$EC" "/CN=TLS Lab Root CA"
mkca inter "$EC" "/CN=TLS Lab Issuing CA 1" root
SAN="DNS:api.llm.test,DNS:localhost,IP:127.0.0.1"
mkleaf leaf "$EC" "/CN=api.llm.test" inter 47 "$SAN" serverAuth
mkleaf leaf_b "$EC" "/CN=api.llm.test" inter 47 "$SAN" serverAuth
mkleaf client "$EC" "/CN=gateway" inter 1 "URI:spiffe://lab.test/ns/serving/sa/gateway" clientAuth
cat leaf.pem inter.pem > fullchain.pem; cat leaf_b.pem inter.pem > fullchain_b.pem; cat client.pem inter.pem > client_chain.pem
for a in rsa mldsa44 mldsa65; do
  case $a in rsa) K="-algorithm RSA -pkeyopt rsa_keygen_bits:2048";; mldsa44) K="-algorithm ML-DSA-44";; mldsa65) K="-algorithm ML-DSA-65";; esac
  mkca ${a}_root "$K" "/CN=TLS Lab Root CA ($a)"
  mkca ${a}_inter "$K" "/CN=TLS Lab Issuing CA 1 ($a)" ${a}_root
  mkleaf ${a}_leaf "$K" "/CN=api.llm.test" ${a}_inter 47 "$SAN" serverAuth
  cat ${a}_leaf.pem ${a}_inter.pem > ${a}_fullchain.pem
done
rm -f *.csr ext.cnf
echo "PKI in $D"
