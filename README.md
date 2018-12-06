Simple JSON API to retrieve [JSKOS Concept Occurrences](http://gbv.github.io/jskos/jskos.html#concept-occurrences) from GBV databases.

[![Build Status](https://travis-ci.org/gbv/occurrences-api.svg)](https://travis-ci.org/gbv/occurrences-api)
[![Coverage Status](https://coveralls.io/repos/gbv/occurrences-api/badge.svg)](https://coveralls.io/r/gbv/occurrences-api)

## Installation

From source:

    git clone https://github.com/gbv/occurrences-api.git

## Requirements

Requires Perl >= 5.14.0, cpanminus and Perl packages listed in `cpanfile`. Perl
modules should be installed indepdendently from system Perl into subdirectoy
`local` with local::lib:

    eval $(perl -Mlocal::lib=local)
    cpanm --installdeps --notest .

You may first need to install system packages listed in `apt.txt`:

    sudo xargs apt-get -y install < apt.txt

## Development

    plackup -Ilib -r 

## Deployment

With pm2 (modify `ecosystem.config.json` to change port if needed):

    pm2 start ecosystem.config.json

Update:

    pm2 reload occurrences-api

## Usage

JSKOS Occurrences API is still being defined. Supported query parameters so far:

* `member`
* `scheme` (use `*` for all)
* `database`
* `threshold`

## Examples

* <http://coli-conc.gbv.de/occurrences/api/?member=http://uri.gbv.de/terminology/bk/35.08&scheme=*&threshold=2>
* ...
