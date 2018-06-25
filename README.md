Simple JSON API to retrieve [JSKOS Concept Occurrences](http://gbv.github.io/jskos/jskos.html#concept-occurrences) from GBV databases.

[![Build Status](https://travis-ci.org/gbv/occurrences-api.svg)](https://travis-ci.org/gbv/occurrences-api)
[![Coverage Status](https://coveralls.io/repos/gbv/occurrences-api/badge.svg)](https://coveralls.io/r/gbv/occurrences-api)

## Installation

From source:

    git clone https://github.com/gbv/occurrences-api.git

## Requirements

Requires Perl >= 5.14.0, cpanminus and Perl packages listed in `cpanfile`. Perl
modules should be installed indepdendently from system Perl into subdirectoy
`local`. This may take a while.

~~~
cpanm --installdeps --skip-satisifed --notest -L local .
~~~

You may first need to install system packages listed in `apt.txt`:

~~~
sudo xargs apt-get -y install < apt.txt
~~~

## Development

    plackup -Ilib -r 

## Deployment

With pm2 (modify `pm2.config.json` to change port if needed):

    pm2 start pm2.config.json

Update:

    pm2 restart occurrences-api

## Usage

JSKOS Occurrences API is still being defined. Supported query parameters so far:

* `member`
* `scheme` (use `*` for all)
* `database`
* `threshold`

## Examples

* `?member=http://rvk.uni-regensburg.de/nt/IB_1060&scheme=*&threshold=2`
* ...
