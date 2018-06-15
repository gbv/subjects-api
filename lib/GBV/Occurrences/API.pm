package GBV::Occurrences::API;
use v5.14;

use GBV::Occurrences::API::Response;
use GBV::Occurrences::Database;

use Plack::Request;
use List::Util qw(all uniq);

use parent 'Plack::Component';

sub call {
    my ( $self, $env ) = @_;
    my $req = Plack::Request->new($env);

    # concept URIs (die if scheme not detected)
    my @members = map {
        $self->scheme($_)
          || error( 404, "failed to detect concept scheme of URI $_" )
    } parameters( $req, 'members' );

    # scheme URIs (ignore unknowns)
    my @schemes = map {
        my $uri = $_;
        grep { $_->{uri} eq $uri } @{ $self->{schemes} }
    } parameters( $req, ' schemes ' );

    # TODO: customize database
    # $database = array_filter(preg_split(' / [
    #            \s|]+/', $_GET['database'] ?? ''));
    my $database = GBV::Occurrences::Database->new('gvk');
    my $dbkey    = 'gvk';

    my @occurrences = map { $database->occurrence($_) } @members;

    if ( @occurrences == 2 and ( all { $_->{count} } @occurrences ) ) {
        push @occurrences, $database->occurrence(@members);
    }

    $self->log_occurrences(@occurrences);

    response( \@occurrences )->as_psgi;
}

sub parameters {

    # lists of values separated by whitespace or ' | '
    uniq(
        grep { $_ ne '' }
        map  { split /[\s|]+/ } $_[0]->query_parameters->get_all( $_[1] )
    );
}

sub startswith {
    defined $_[1] and substr( $_[0], 0, length( $_[1] ) ) eq $_[1];
}

sub scheme {
    my ( $self, $uri ) = @_;

    return { uri => $uri, inScheme => [$_] }
      for grep { startswith( $uri, $_->{namespace} ) } @{ $self->{schemes} };
}

sub log_occurrences {
    my $self = shift;

    if ( open( my $fh, '>>', 'occurrences.txt' ) ) {
        foreach (@_) {
            say join ' ',
              $_->{database}->{uri}, $_->{modified}, $_->{count},
              map { $_->{uri} } @{ $_->{memberSet} };
        }
    }
}

1;
