use v5.14;
use Plack::Test;
use Plack::Util;
use HTTP::Request;
use URI::Escape;
use List::Util qw(pairmap);

# request $method => $base, %query, \@headers

sub request(@) {    ## no critic
    state $app = Plack::Test->create(
        Plack::Util::load_psgi($ENV{TEST_URL} || 'app.psgi'));

    my $method = (@_ && $_[0] =~ /^[A-Z]+$/) ? shift : 'GET';
    my $url    = (@_ && $_[0] =~ qr{^/})     ? shift : '/';

    my $header = @_ && ref $_[length @_ - 1] ? pop : [];

    $url .= '?' . join('&', pairmap {"$a=" . uri_escape($b)} @_) if @_;

    $app->request(HTTP::Request->new($method => $url, $header));
}
