Simple JSON API to retrieve [JSKOS Concept Occurrences](http://gbv.github.io/jskos/jskos.html#concept-occurrences) from PICA databases.

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

## Configuration

Initialize or update the list of supported vocabularies from BARTOC.org:

    script/update-schemes.sh

Initialize or update the list of supported PICA databases from <http://uri.gbv.de/database/>:

    script/update-databases.sh

## Deployment

With pm2 (modify `ecosystem.config.json` to change port if needed):

    pm2 start ecosystem.config.json

Update (also required after configuration has been changed):

    pm2 reload occurrences-api

## API

### GET /occurrences

List occurrences or co-occurrences of a concept in a database.

**Parameters:**

* `member` - concept URI to search for
* `database` - database URI or database key to search in
* `scheme` (use `*` for all)
* `threshold` - minimal number of co-occurrences to report (default is 2)

Occurrences are returned if no `scheme` is given, co-occurrences are returned otherwise, unless the total number of records exceeds 2000.

### GET /voc

List supported vocabularies (concept schemes) as array of [JSKOS Concept Schemes](https://gbv.github.io/jskos/jskos.html#concept-schemes).

This endpoint is compatible with [JSKOS Server endpoint /voc](https://github.com/gbv/jskos-server#get-voc) but it only supports URL parameter `uri`.

### GET /databases 

List supported databases as array of JSON objects.

*The format of a database record (except fields `uri` and `prefLabel`) may slightly change in a future version of this service.*

## Examples

* <http://coli-conc.gbv.de/occurrences/api/occurrences?member=http://uri.gbv.de/terminology/bk/35.08&database=opac-de-627&scheme=*&threshold=2> (BK)
* <http://coli-conc.gbv.de/occurrences/api/occurrences?member=http://uri.gbv.de/terminology/bk/35.08&database=opac-de-627&scheme=http://bartoc.org/en/node/533&threshold=2> (BK->RVK)
* <http://coli-conc.gbv.de/occurrences/api/occurrences?member=http://rvk.uni-regensburg.de/nt/AR_25100&database=opac-de-627&scheme=http://bartoc.org/en/node/18785>
