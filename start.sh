#!/bin/bash -e

cd "$(dirname "${BASH_SOURCE[0]}")"
eval $(perl -Mlocal::lib=local)

./script/update-databases.sh
./script/update-schemes.sh

plackup -Ilib --port 3003
