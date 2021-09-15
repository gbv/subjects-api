use v5.14;
use Test::More;
do 't/lib/App.pm';

my $res = request('/occurrences');
is '[]', ($res->content =~ s/\s*//gr), 'empty response by default';
is $res->code, 200;

$res = request('/occurrences', member => 'x');
is $res->code, 404;

$res = request('/xxx');
is $res->code, 404;

$res = request('/databases');
is $res->code, 200;

$res = request('/voc');
is $res->code, 200;

$res = request('/');
is $res->code, 200;

done_testing;
