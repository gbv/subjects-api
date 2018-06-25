package GBV::Occurrences::API::Response;
use v5.14;

use JSON::PP ();
use parent 'Plack::Response';
use parent 'Exporter';

our @EXPORT = qw(error response);

our $HEADERS = [
    'Content-Type'                => 'application/json; charset=UTF-8',
    'Access-Control-Allow-Origin' => '*'
];

sub _body {
    state $JSON = JSON::PP->new->convert_blessed->allow_blessed->utf8->pretty
        ->canonical;
    [$JSON->encode($_[0]->body)];
}

sub as_psgi {
    $_[0]->finalize;
}

sub response {
    __PACKAGE__->new($_[1] // 200, $HEADERS, $_[0]);
}

sub error {
    my ($code, $error) = @_;
    die response({error => $error, code => $code}, $code);
}

1;

=head1 NAME

GBV::Occurrences::API::Response - throwable JSON response

=head2 DESCRIPTION

Exports C<response> and C<error> to create and throw L<Plack::Response> objects
with JSON body.

=cut
