use v5.14;
use lib 'local/lib/perl5';
use Catmandu::Util;
use GBV::Occurrences::API;
use Plack::Builder;

my $config = Catmandu::Util::read_json('config.json');

builder {
    enable 'HTTPExceptions';
    GBV::Occurrences::API->new(%$config)->to_app;
}
