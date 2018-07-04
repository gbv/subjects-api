#!/bin/bash -e

cd "$(dirname "${BASH_SOURCE[0]}")"
eval $(perl -Mlocal::lib=local)
plackup -Ilib --port 3003
