use v5.14;
use Test::More;
use Catmandu::Util;
use GBV::Occurrences::API;

my $config = Catmandu::Util::read_json('config.json');
my $app    = GBV::Occurrences::API->new(%$config);

my @uris = qw(http://dewey.info/class/012/e23/);    # test with edition

foreach my $scheme (@{$config->{schemes}}) {
    my $namespace = $scheme->{namespace} or next;
    foreach (@{$scheme->{EXAMPLES} // []}) {
        push @uris, $namespace . $_;
    }
}

# test simple occurrences
foreach (@uris) {
    my $occ = $app->query(member => [$_]);
    ok $occ->[0]->{count} > 0, $_;
}

done_testing;
