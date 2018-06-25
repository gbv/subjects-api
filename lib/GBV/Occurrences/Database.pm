package GBV::Occurrences::Database;
use v5.14;

use URI::Escape;
use Time::Piece;
use HTTP::Tiny;
use JSON::PP;
use PICA::Path;
use Scalar::Util qw(blessed);
use List::Util qw(pairmap uniq any);
use GBV::Occurrences::API::Response;
use Catmandu::Importer::SRU;

our $CACHE = {};

sub new {
    my ($class, $uri) = @_;

    my $db = $CACHE->{$uri} //= do {
        my $res = HTTP::Tiny->new->get("$uri?format=jsonld");

        error(404, "unknown database: $uri") unless $res->{success};
        my $db = decode_json($res->{content});

        # TODO: add date to count
        $db->{prefLabel} = delete $db->{title} if $db->{title};

        $db->{limit}     = 1000;    # TODO: configure this
        $db->{threshold} = 1;       # TODO: configure this

        bless $db, $class;
    };

    return $db;
}

sub TO_JSON {
    my $self = shift;
    return {%$self};
}

sub count_via_sru {
    my $self = shift;
    my $cql  = _cql_query(@_);

    my $url
        = $self->{srubase}
        . "?version=1.2&operation=searchRetrieve"
        . "&query="
        . uri_escape($cql)
        . "&maximumRecords=0&recordSchema=picaxml";

    my $res = HTTP::Tiny->new->get($url);
    if ($res->{success} and $res->{content} =~ /numberOfRecords>([0-9]+)</m) {
        return $1;
    }
    else {
        error(500, "failed to get occurrences via SRU: $url");
    }
}

sub startswith {
    substr($_[0], 0, length($_[1])) eq $_[1];
}

sub _concept_cql {
    my $concept = shift;
    my $scheme = shift // $concept->{inScheme}->[0];

    my $uri = $concept->{uri};
    my $cqlkey = $scheme->{CQLKEY} // return ();

    my $id = substr($uri, length $scheme->{namespace});

    if ($cqlkey eq 'ddc') {
        if (startswith($id, 'class/')) {
            $id = substr($id, length 'class/');
            $id =~ s!e\d\d/$!!;    # remove optional edition number

            # TODO: support table entries and decomposed DDC numbers
        }
        else {
            error(400, "DDC URI not supported: $uri");
        }
    }
    elsif ($cqlkey eq 'rvk' || $cqlkey eq 'kab') {
        $id =~ s/_/ /g;
        $id =~ s/-/ - /g;
    }

    return ($cqlkey, $id);
}

sub _cql_query {
    join ' and ', pairmap {"pica.$a=\"$b\""} @_;
}

sub _occurrence {
    my $self = shift;

    my $database = {uri => $self->{uri}};
    $database->{$_} = $self->{$_} for grep {$self->{$_}} qw(prefLabel notation);

    return {
        database  => $database,
        modified  => localtime->datetime . localtime->strftime('%z'),
        memberSet => [
            map {
                {
                    uri      => $_->{uri},
                    inScheme => [{'uri' => $_->{inScheme}->[0]->{uri}}]
                }
            } @_
        ]
    };
}

sub occurrence {
    my ($self, %param) = @_;
    my @concepts = @{$param{members}};

    my $occurrence = $self->_occurrence(@concepts);

    my @query = map {_concept_cql($_)} @concepts;

    $occurrence->{count} = $self->count_via_sru(@query);
    return () if $occurrence->{count} < $self->{threshold};

    $occurrence->{url} = $self->url(@query);

    return $occurrence;
}

sub cooccurrences {
    my ($self, %param) = @_;
    my @concepts = @{$param{members}};

    # only use schemes with PICAPATH
    my %schemes = map {
        unless (blessed $_->{PICAPATH}) {
            $_->{PICAPATH} = PICA::Path->new($_->{PICAPATH});
        }
        ($_->{uri} => $_)
    } grep {$_->{PICAPATH}} @{$param{schemes}};

    my $cql = _cql_query(map {_concept_cql($_)} @concepts);

    my $sru = Catmandu::Importer::SRU->new(
        base         => $self->{srubase},
        query        => $cql,
        limit        => $self->{limit},
        total        => $self->{limit},
        recordSchema => 'picaxml',
        parser       => 'picaxml',
    );

    my %co;

    $sru->each(
        sub {
            foreach my $field (@{$_[0]->{record}}) {
                foreach my $scheme (values %schemes) {
                    $scheme->{PICAPATH}->match_field($field) or next;
                    my @values
                        = uniq($scheme->{PICAPATH}->match_subfields($field))
                        or next;
                    my $occ = $co{$scheme->{uri}} //= {};
                    $occ->{$_}++ for @values;
                }
            }
        }
    );

    map {
        my $scheme = $_;
        my $values = $co{$_};
        map {
            my $concept = $self->concept($schemes{$scheme}, $_);
            if (any {$concept->{uri} eq $_->{uri}} @concepts) {
                ();
            }
            else {
                my $occ = $self->_occurrence(@concepts);
                $occ->{count} = $values->{$_};
                push @{$occ->{memberSet}}, $concept;

                my @query
                    = map {_concept_cql($_, $schemes{$_->{inScheme}->[0]->{uri}})}
                    @{$occ->{memberSet}};
                $occ->{url} = $self->url(@query);

                $occ;
            }
            } grep {$values->{$_} >= $self->{threshold}} keys %$values
    } keys %co;
}

sub url {
    my $self = shift;

    # TODO: check IKT
    $self->{url}
        . "CMD?ACT=SRCHA&IKT=1016&SRT=YOP&TRM="
        . uri_escape(join ' ', pairmap {"$a \"$b\""} @_);
}

# build concept from scheme and notation
sub concept {
    my ($self, $scheme, $notation) = @_;

    my $local = $notation;
    my $uri;

    if ($scheme->{uri} eq 'http://bartoc.org/en/node/241') {    # DDC
        $uri = $scheme->{namespace} . "class/$notation/e23/";
    }
    elsif ($scheme->{uri} eq 'http://bartoc.org/en/node/533') {    # RVK
        $local =~ s/ /_/g;    # FIXME: this does not recover all
        $uri = $scheme->{namespace} . $local;
    }

    # TODO: add more specific rukles
    elsif ($scheme->{namespace}) {
        $uri = $scheme->{namespace} . $notation;
    }

    return {
        notation => [$notation],
        inScheme => [{uri => $scheme->{uri}}],
        ($uri ? (uri => $uri) : ())
    };
}

1;

=head1 NAME

GBV::Occurrences::Database - Database to query occurrences from

=head1 DESCRIPTION

By now only PICA databases are supported but occurrences could be retrieved
from any other source as well.

=cut
