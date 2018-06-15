Simple JSON API to retrieve [JSKOS Concept Occurrences](http://gbv.github.io/jskos/jskos.html#concept-occurrences) from GBV databases.

## Installation

From source:

    git clone https://github.com/gbv/occurrences-api.git

## Requirements

Requires Perl >= 5.14.0, cpanminus and Perl packages listed in `cpanfile`. 

On Debian install Perl packages via apt:

    sudo xargs apt-get -y install < apt.txt

Additional modules can be installed to a local directory:

~~~
export PERL5LIB=$(pwd)/local/lib/perl5
export PERL_LOCAL_LIB_ROOT=$(pwd)/local/lib/perl5
export PERL_MM_OPT="INSTALL_BASE=$(pwd)/local"
cpanm --installdeps --skip-satisifed --notest .
~~~

## Development

    plackup -Ilib -r 

## Deployment

With pm2 (modify `pm2.config.json` to change port if needed):

    pm2 start pm2.config.json

