use v5.14;
use Test::More;
use Catmandu::Util;
use GBV::Occurrences::API;

my $config = Catmandu::Util::read_json('config.json');
my $app = GBV::Occurrences::API->new(%$config);

my @examples = qw(
    http://uri.gbv.de/terminology/bk/77.53
    http://dewey.info/class/012
    http://dewey.info/class/012/e23/
);

foreach (@examples) {
    my $occ = $app->query( member => [$_] );
    ok $occ->[0]->{count} > 0, $_;
}

done_testing;
