use v5.14;
use Catmandu::Util;
use GBV::Occurrences::API;
use GBV::Occurrences::API::Response;
use Plack::Builder;
use Plack::App::Directory;
use List::Util 'any';

my $schemes = Catmandu::Util::read_json('data/schemes.json');
my $dbs     = Catmandu::Util::read_json('data/databases.json');
my $app     = GBV::Occurrences::API->new(schemes => $schemes, databases => $dbs);

{
    package DirectoryIndex; ## no critic
    use parent 'Plack::App::Directory';

    sub serve_path {
        my ($self, $env, $dir) = @_;
        $dir =~ s/\.$//;
        $dir .= "index.html" if -d $dir and -f "${dir}index.html";
        $self->SUPER::serve_path($env, $dir);
    }
}

builder {
    enable_if { $ENV{HTTP_PROXY} } 'XForwardedFor',
      trust => [ $ENV{HTTP_PROXY} || () ];

    enable 'ConditionalGET';    # If-None-Match / If-Modified-Since
    enable 'Head';              # HTTP HEAD
    enable 'ETag';              # Add ETag

    enable 'HTTPExceptions';    # serialize exceptions as JSON

    builder {
        mount '/databases' => sub {
            response( $dbs )->as_psgi;
        };
        mount '/voc' => sub {
            my $env = shift;
            my $uri = Plack::Request->new($env)->parameters->{uri};
            my @uris = defined $uri ? split /\|/, $uri : ();
            my @voc = @$schemes;

            if (@uris) {
                my %ids = map { $_ => 1 } @uris;
                @voc = grep {
                    any { exists $ids{$_} }
                    ($_->{uri}, @{ $_->{identifier} // [] })
                } @voc
            }

            response( \@voc )->as_psgi;
        };
        mount '/occurrences' => $app->to_app;

        mount '/' => DirectoryIndex->new( root => 'public' );
    }
}
