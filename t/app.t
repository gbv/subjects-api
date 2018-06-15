use v5.14;
use Test::More;
use Plack::Test;
use Plack::Util;
use HTTP::Request;
use URI::Escape;
use List::Util qw(pairmap);

ok my $app = Plack::Util::load_psgi('app.psgi'), 'load app';

test_psgi $app, sub {
    my $cb = shift;

    local *request = sub {
        my $url = '';
        $url .= '?' . join('&', pairmap {"$a=".uri_escape($b)} @_) if @_;
        $cb->( HTTP::Request->new( GET => $url) );
    };

    my $res = request();
    is '[]', ($res->content =~ s/\s*//gr), 'empty response by default';
    is $res->header('Content-Type'), 'application/json; charset=UTF-8';
    is $res->header('Access-Control-Allow-Origin'), '*'; 

    my $res = request(members => 'x');
    is $res->code, 404;
};

done_testing;
