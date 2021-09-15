use v5.14;
use Test::More;
do 't/lib/App.pm';

my $res = request(GET => '/occurrences');
is $res->header('Content-Type'), 'application/json; charset=UTF-8',
    'Content-Type';
is $res->header('Access-Control-Allow-Origin'), '*',
    'Access-Control-Allow-Origin';

$res = request(HEAD => '/occurrences');
is $res->code,    200, 'HEAD';
is $res->content, '',  'HEAD';

done_testing;
