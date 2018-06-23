package GBV::Occurrences::API;
use v5.14;

use GBV::Occurrences::API::Response;
use GBV::Occurrences::Database;

use Plack::Request;
use List::Util qw(all uniq any);

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
        scheme   => [ $param->('scheme') ],
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

    my @schemes = @{ $param{scheme} // [] };

    # all concept schemes
    if ( length @schemes == 1 and $schemes[0] eq '*' ) {
        @schemes = @{ $self->{schemes} };
    }

    # all concept schemes except those what members come from
    elsif ( length @schemes == 1 and $schemes[0] eq '?' ) {
        my @memberSchemes = map {
            map { $_->{uri} }
              @{ $_->{inScheme} }
        } @members;
        @schemes = grep {
            my $uri = $_->{uri};
            all { $_ ne $uri } @memberSchemes;
        } @{ $self->{schemes} };
    }

    # selected concept schemes only
    else {
        @schemes = grep {
            my %ids =
              map { $_ => 1 } ( $_->{uri}, @{ $_->{identifier} // [] } );
            any { $ids{$_} } @schemes
        } @{ $self->{schemes} };
    }

    my @occurrences;

    foreach my $db (@databases) {

        # simple occurrence for each member
        my @occ = map { $db->occurrence($_) } @members;

        # co-occurrence if two members given
        if ( @occ == 2 and ( all { $_->{count} } @occurrences ) ) {
            push @occ, $db->occurrence(@members);
        }

        # co-ocurrence if one member and scheme(s) given
        elsif ( @occ == 1
            and @schemes
            and grep { $_ && $_ < $db->{limit} } $occ[0]->{count} )
        {
            push @occ, $db->cooccurrences( $members[0], @schemes );
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
