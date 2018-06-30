#!/usr/bin/env bash

set -eux

username=$1
server=ssh.phx.nearlyfreespeech.net

rm -r public
hugo
rsync -r public/* "$username@$server:"
