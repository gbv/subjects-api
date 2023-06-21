# Subjects API

<!-- [![Test](https://github.com/gbv/jskos-server/actions/workflows/test.yml/badge.svg)](https://github.com/gbv/jskos-server/actions/workflows/test.yml) -->
[![GitHub package version](https://img.shields.io/github/package-json/v/gbv/subjects-api.svg?label=version)](https://github.com/gbv/subjects-api)<!-- [![Uptime Robot status](https://img.shields.io/uptimerobot/status/m780815088-08758d5c5193e7b25236cfd7.svg?label=%2Fapi%2F)](https://stats.uptimerobot.com/qZQx1iYZY/780815088) --> [![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg)](https://github.com/RichardLitt/standard-readme)

> API to provide information about subject indexing in the K10plus catalog

This API can be used to query how a concept or combination of concepts is used in records of a database. This basically includes: which concepts a record is index with ([subjects](#get-subjects)), which records have been indexed with a concept ([records](#get-records)), the number of records indexed with a concept and/or a deep link into a catalog to get these records ([occurrences](#get-occurrences), [links](#get-links)), and which concepts are used together with other concepts ([co-occurrences](#get-occurrences)).

## Table of Contents

- [Install](#install)
  - [Configuration](#configuration)
  - [Backends](#backends)
- [Usage](#usage)
- [API](#api)
  - [GET /subjects](#get-subjects)
  - [GET /records](#get-records)
  - [GET /occurrences](#get-occurrences)
  - [GET /links](#get-links)
  - [GET /voc](#get-voc)
  - [GET /databases](#get-databases)
  - [GET /status](#get-status)
- [Maintainers](#maintainers)
- [Contributing](#contributing)
- [License](#license)

## Install

Requires Node.js v16 or newer.

```bash
git clone https://github.com/gbv/subjects-api.git
cd subjects-api
npm i
```

### Configuration

Optionally create a configuration file `.env` to change certain config options. Here are the default values:

```env
PORT=3141
BACKEND=SQLite
DATABASE=./subjects.db
SCHEMES=./vocabularies.json
LINKS=./links.json
```

All vocabularies included in [K10Plus Subjects] are preconfigured via `vocabularies.json`.

Then full the backend database (SQLite by default) with subject indexing data from K10plus catalog. The script `./bin/import.js` can be used to do so (***not documented yet***). 

### Backends

#### SQLite

Requires to start the application once to create SQLite database file under `subjects.db`. Then download data from <https://doi.org/10.5281/zenodo.7016625> (given as tabulator separated file table with columns PPN, vocabulary key, and notation) and import into SQLite file:

~~~~
URL=$(curl -sL "https://zenodo.org/api/records/7016625" | jq -r '.files[]|select(.key|endswith(".tsv.gz"))|.links.self')
curl -sL $URL | zcat | sqlite3 subjects.db -cmd ".mode tabs" ".import /dev/stdin subjects"
~~~~

#### SPARQL (experimental)

Requires a SPARQL-Endpoint, including SPARQL Update and SPARQL Graph Store Protocol for write access. Only tested with Apache Jena Fuseki.

~~~
BACKEND=SPARQL
DATABASE=http://localhost:3030/k10plus
GRAPH=https://uri.gbv.de/graph/kxp-subjects     # optional
~~~

#### PostgreSQL (experimental)

Requires PostgreSQL database. It turned out performance of SQLite is better, for this reasons this backend is not developed further.

#### SRU (not implemented yet)

Requires a SRU-API to query from so live data can be returned.

## Usage

```bash
npm run start
```

Some backends allow to import data from a headerless TSV file with three
columns for PPN, vocabulary id (`VOC`), and notation:

```bash
npm run import -- subjects.tsv
```

Option `--full` replaces the existing backend data, otherwise the data is added
to existing subjects data.  Option `--modified` can be used to set the
modification date (timestamp of file by default).

#### SPARQL

Requires `DATABASE` set to URL of SPARQL endpoint. Optionally configure a named graph with `GRAPH`.

## API

### GET /subjects

*Not implemented yet, see <https://github.com/gbv/subjects-api/issues/41>.*

Returns a (possibly empty) array of [JSKOS Concepts](https://gbv.github.io/jskos/jskos.html#concepts) a record is indexed with. The special value `null` can be included as last array element to indicate that more subjects may exist.

**Query parameters:**

- `record` - URIs of records, separated by `|`
- `scheme` - URIs of concept schemes, separated by `|`. The default value `*` can be used to include all concept schemes.

This endpoint returns the same information as [/occurrences](#get-occurrences) endpoint with query parameter `record` and `scheme` (parameter `member` not set) but with different output format (JSKOS Concepts instead of Concept Occurrences).

### GET /records

*Not implemented yet, see <https://github.com/gbv/subjects-api/issues/42>.*

### GET /occurrences

Returns a (possibly empty) array of [JSKOS Concept Occurrences](https://gbv.github.io/jskos/jskos.html#concept-occurrences). Depending on query parameters the result consists of:

- the occurrence of a concept specified via `member`
- the occurrence of concepts in a record specified via `record`
- the co-occurrences of a concept specified via `member` in all records, when query parameter `scheme` is given

Occurrences contain deep links into K10plus catalog for selected vocabularies.

**Query parameters:**

- `member` - URI of a concept from supported vocabularies
- `record` - URI of a record
- `scheme` - URI of a target concept scheme (when given, co-occurrences are returned; when value `*` is given, all supported target schemes are used)
- `threshold` - a minimum threshold for co-occurrences to be included

There is a deprecated alias at `/api` to be removed soon. 

### GET /links

*Not implemented yet, see <https://github.com/gbv/subjects-api/issues/44>.*

Return a list if deep links into database to list all records indexed with a given concept.

**Query parameters:**

- `subject` - URIs of a concepts

**Return format:**

JSON Array of objects, each with:

- `url`
- `label` (name of the database)
- `description` (optional)

This endpoint returns the same information as [/occurrences](#get-occurrences) endpoint with query parameter `subject` instead of `member` but a different return format and no number of records.

### GET /voc

Returns an array of supported vocabularies as [JSKOS Concept Schemes](https://gbv.github.io/jskos/jskos.html#concept-schemes).

There is a deprecated alias at `/api/voc` to be removed soon. 

### GET /databases

Returns an array of supported databases. Return format is experimental.

### GET /status

Returns information about the service. Return format is experimental.

## Maintainers

- [@stefandesu](https://github.com/stefandesu)
- [@nichtich](https://github.com/nichtich)

## Contributing

PRs accepted against the `dev` branch.

Small note: If editing the README, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## License

MIT © 2022 Verbundzentrale des GBV (VZG)

[K10Plus Subjects]: https://github.com/gbv/k10plus-subjects
