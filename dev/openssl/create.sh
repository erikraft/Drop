#!/bin/sh

cnf_dir='/mnt/openssl/'
certs_dir='/etc/ssl/certs/'
openssl req -config ${cnf_dir}erikraftdropCA.cnf -new -x509 -days 1 -keyout ${certs_dir}erikraftdropCA.key -out ${certs_dir}erikraftdropCA.crt
openssl req -config ${cnf_dir}erikraftdropCert.cnf -new -out /tmp/erikraftdrop-dev.csr -keyout ${certs_dir}erikraftdrop-dev.key
openssl x509 -req -in /tmp/erikraftdrop-dev.csr -CA ${certs_dir}erikraftdropCA.crt -CAkey ${certs_dir}erikraftdropCA.key -CAcreateserial -extensions req_ext -extfile ${cnf_dir}erikraftdropCert.cnf -sha512 -days 1 -out ${certs_dir}erikraftdrop-dev.crt

exec "$@"
