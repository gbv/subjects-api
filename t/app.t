use v5.14;
use Test::More;
do 't/lib/App.pm';

my $res = request();
is '[]', ($res->content =~ s/\s*//gr), 'empty response by default';
is $res->code, 200;

$res = request(member => 'x');
is $res->code, 404;

$res = request('/xxx');
is $res->code, 404;

$res = request('/database');
is $res->code, 200;

$res = request('/voc');
is $res->code, 200;

done_testing;
