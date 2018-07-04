use v5.14;
use Catmandu::Util;
use GBV::Occurrences::API;
use GBV::Occurrences::API::Response;
use GBV::Occurrences::Database;
use Plack::Builder;
use List::Util 'any';

my $config = Catmandu::Util::read_json('config.json');
my $app    = GBV::Occurrences::API->new(%$config);

builder {
    enable_if { $ENV{HTTP_PROXY} } 'XForwardedFor',
      trust => [ $ENV{HTTP_PROXY} || () ];

    enable 'ConditionalGET';    # If-None-Match / If-Modified-Since
    enable 'Head';              # HTTP HEAD
    enable 'ETag';              # Add ETag

    enable 'HTTPExceptions';    # serialize exceptions as JSON

    builder {
        mount '/database' => sub {
            my $env = shift;
            my @dbs = values %{$GBV::Occurrences::Database::CACHE};
            response( \@dbs )->as_psgi;
        };
        mount '/voc' => sub {
            my @schemes = map {
                my %s = %$_;
                +{ map { $_ => $s{$_} } grep { $_ !~ /^[A-Z]/ } keys %s };
            } @{ $config->{schemes} };

            my $param = Plack::Request->new(shift)->parameters;

            @schemes = grep { $_->{uri} eq $param->{uri} } @schemes
              if $param->{uri};

            @schemes = grep {
                    any { $_ eq $param->{id} }
                    ($_->{uri}, @{ $_->{identifier} // [] })
                } @schemes if $param->{id};

                response( \@schemes )->as_psgi;
            };
        mount '/' => $app->to_app;
    }
}
