# Occurrences-API

<!-- [![Test](https://github.com/gbv/jskos-server/actions/workflows/test.yml/badge.svg)](https://github.com/gbv/jskos-server/actions/workflows/test.yml) -->
[![GitHub package version](https://img.shields.io/github/package-json/v/gbv/occurrences-api.svg?label=version)](https://github.com/gbv/occurrences-api)
<!-- [![Uptime Robot status](https://img.shields.io/uptimerobot/status/m780815088-08758d5c5193e7b25236cfd7.svg?label=%2Fapi%2F)](https://stats.uptimerobot.com/qZQx1iYZY/780815088) -->
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg)](https://github.com/RichardLitt/standard-readme)

> API to provide (co-)occurrences based on the K10plus catalog.

An occurrence gives information about how often a concept (or combination of concepts for co-occurrences) is used in a database.

## Table of Contents

- [Install](#install)
  - [Configuration](#configuration)
- [Usage](#usage)
- [API](#api)
  - [GET /api](#get-api)
  - [GET /api/voc](#get-apivoc)
- [Maintainers](#maintainers)
- [Contributing](#contributing)
- [License](#license)

## Install

Requires Node.js v16 or later.

```bash
git clone https://github.com/gbv/occurrences-api.git
cd occurrences-api
npm i
```

### Configuration

1. (optional) Create a configuration file `.env` to change certain config options. Here are the default values:

```env
PORT=3141
DATABASE=./subjects.db
SCHEMES=./vocabularies.json
LINKS=./links.json
```

2. (optional) All vocabularies supported in [K10Plus Subjects] are preconfigured. To override those vocabularies, set the `SCHEMES` config option to a JSON file provided by you.

3. (required) Fill backend database with subject indexing data from K10plus catalog. This requires to start the application once to create SQLite database file under `subjects.db`. Then download data from <https://doi.org/10.5281/zenodo.7016625> (given as tabulator separated file table with columns PPN, vocabulary key, and notation) and import into SQLite file:

  ~~~~
  URL=$(curl -sL "https://zenodo.org/api/records/7016625" | jq -r '.files[]|select(.key|endswith(".tsv.gz"))|.links.self')
  curl -sL $URL | zcat | sqlite3 subjects.db -cmd ".mode tabs" ".import /dev/stdin subjects"
  ~~~~

## Usage

```bash
npm run start
```

## API

### GET /api

Returns a (possibly empty) array of [JSKOS Concept Occurrences](https://gbv.github.io/jskos/jskos.html#concept-occurrences). Existence of query parameter `scheme` defines whether simple occurrences or co-occurrences are returned. Simple occurrences also contain deep links into K10plus catalog for selected vocabularies.

**Query parameters:**

- `member` (required) - URI of a concept from supported vocabularies
- `scheme` (optional) - URI of a target concept scheme (when given, co-occurrences are returned; when value `*` is given, all supported target schemes are used)
- `threshold` (optional) - a minimum threshold for the frequency of co-occurrences

### GET /api/voc

Returns an array of supported vocabularies as [JSKOS Concept Schemes](https://gbv.github.io/jskos/jskos.html#concept-schemes).

## Maintainers

- [@stefandesu](https://github.com/stefandesu)
- [@nichtich](https://github.com/nichtich)

## Contributing

PRs accepted against the `dev` branch.

Small note: If editing the README, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## License

MIT © 2022 Verbundzentrale des GBV (VZG)

[K10Plus Subjects]: https://github.com/gbv/k10plus-subjects
