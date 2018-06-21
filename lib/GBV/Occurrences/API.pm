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

    error( 404, 'not found' ) if $req->path ne '/';

    # lists of non-empty values separated by whitespace or '|'
    my $param = sub {
        grep  { $_ ne '' }
          map { split /[\s|]+/ } $req->query_parameters->get_all( $_[0] );
    };

    my %query = (
        member   => [ $param->('member'), $param->('members') ],
        scheme   => [ $param->('schemes') ],
        database => [ $param->('database') ],
    );

    my $occurrences = $self->query(%query);
    $self->log_occurrences(@$occurrences);

    response($occurrences)->as_psgi;
}

sub query {
    my ( $self, %param ) = @_;

    my @databases = @{ $param{database} // [] };
    push @databases, 'http://uri.gbv.de/database/gvk' unless @databases;
    @databases = map { GBV::Occurrences::Database->new($_) } uniq(@databases);

    my @members = map {
        $self->_scheme($_)
          || error( 404, "failed to detect concept scheme of URI $_" )
    } @{ $param{member} // [] };

    my @schemes = map {
        my $uri = $_;
        grep { $_->{uri} eq $uri } @{ $self->{schemes} }
    } @{ $param{scheme} // [] };

    # TODO: make use of scheme parameter

    my @occurrences;

    foreach my $db (@databases) {
        my @occ = map { $db->occurrence($_) } @members;
        if ( @occ == 2 and ( all { $_->{count} } @occurrences ) ) {
            push @occ, $db->occurrence(@members);
        }
        push @occurrences, @occ;
    }

    \@occurrences;
}

sub _startswith {
    defined $_[1] and substr( $_[0], 0, length( $_[1] ) ) eq $_[1];
}

sub _scheme {
    my ( $self, $uri ) = @_;

    return { uri => $uri, inScheme => [$_] }
      for grep { _startswith( $uri, $_->{namespace} ) } @{ $self->{schemes} };
}

sub log_occurrences {
    my $self = shift;

    if ( open( my $fh, '>>', 'occurrences.txt' ) ) {
        foreach (@_) {
            say join ' ', $_->{database}->{uri}, $_->{modified}, $_->{count},
              map { $_->{uri} } @{ $_->{memberSet} };
        }
    }
}

1;
