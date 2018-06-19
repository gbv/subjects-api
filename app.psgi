use v5.14;
use lib 'local/lib/perl5';
use Catmandu::Util;
use GBV::Occurrences::API;
use GBV::Occurrences::API::Response;
use GBV::Occurrences::Database;
use Plack::Builder;

my $config = Catmandu::Util::read_json('config.json');
my $app = GBV::Occurrences::API->new(%$config);

builder {
    enable_if { $ENV{HTTP_PROXY} } 'XForwardedFor', 
        trust => [$ENV{HTTP_PROXY} || ()];

    enable 'ConditionalGET';  # If-None-Match / If-Modified-Since
    enable 'Head';            # HTTP HEAD
    enable 'ETag';            # Add ETag

    enable 'HTTPExceptions';  # serialize exceptions as JSON

    builder {
        mount '/database' => sub {
            my $env = shift;
            my @dbs = values %{$GBV::Occurrences::Database::CACHE};
            return response(\@dbs)->as_psgi;
        };
        mount '/' => $app->to_app;
    }
}
