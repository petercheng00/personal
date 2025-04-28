#!/usr/bin/env bash

set -eux

username=$1
server=ssh.nyc1.nearlyfreespeech.net

rm -rf public resources
hugo
rsync -avzch --progress --delete public/ "$username@$server:"
