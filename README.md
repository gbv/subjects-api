# Occurrences API

<!-- [![Test](https://github.com/gbv/jskos-server/actions/workflows/test.yml/badge.svg)](https://github.com/gbv/jskos-server/actions/workflows/test.yml) -->
[![GitHub package version](https://img.shields.io/github/package-json/v/gbv/occurrences-api.svg?label=version)](https://github.com/gbv/occurrences-api)
<!-- [![Uptime Robot status](https://img.shields.io/uptimerobot/status/m780815088-08758d5c5193e7b25236cfd7.svg?label=%2Fapi%2F)](https://stats.uptimerobot.com/qZQx1iYZY/780815088) -->
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg)](https://github.com/RichardLitt/standard-readme)

> API to provide co-occurrences based on the K10plus catalog.

## Table of Contents <!-- omit in toc -->
- [Install](#install)
  - [Configuration](#configuration)
- [Usage](#usage)
- [Maintainers](#maintainers)
- [Contributing](#contributing)
  - [Publish](#publish)
- [License](#license)

## Install

Requires Node.js v16 or later.

```bash
git clone https://github.com/gbv/occurrences-api.git
cd occurrences-api
npm i
```

### Configuration

<!-- TODO: Make it easier to provide the database file. -->
1. (required) You need an SQLite database file under `subjects.db` which contains PPNs and their cataloging from the K10plus catalog. See [K10Plus Subjects] on how to obtain this database file.

2. (optional) Create a configuration file `.env` to change certain config options. Here are the default values:

```env
PORT=3141
DATABASE=./subjects.db
SCHEMES=./schemes.json
```

3. (optional) All vocabularies supported in [K10Plus Subjects] are preconfigured. To override those vocabularies, set the `SCHEMES` config option to a JSON file provided by you.

## Usage

```bash
npm run start
```

## Maintainers

- [@stefandesu](https://github.com/stefandesu)
- [@nichtich](https://github.com/nichtich)

## Contributing

PRs accepted against the `dev` branch.

Small note: If editing the README, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.

### Publish
**For maintainers only**

Never work on the master branch directly. Always make changes on `dev` (ideally as PRs) and then run the release script:

```bash
npm run release:patch # or minor or major
```

## License

MIT © 2022 Verbundzentrale des GBV (VZG)

[K10Plus Subjects]: https://github.com/gbv/k10plus-subjects
