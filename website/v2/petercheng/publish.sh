#!/usr/bin/env bash

set -eux

username=$1
server=ssh.phx.nearlyfreespeech.net

rm -rf public
hugo
# rsync is problematic on WSL (https://github.com/microsoft/WSL/issues/2138)
# --whole-file is one workaround
# Not being able to use -z is another limitation
rsync -avh --whole-file --progress --delete public/ "$username@$server:"
