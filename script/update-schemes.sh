#!/bin/bash
SCHEMES=data/schemes.json
echo "Updating $SCHEMES"
curl -s http://bartoc.org/data/dumps/latest.ndjson | \
    jq -s '[ .[]|select(.CQLKEY)|{uri,identifier,prefLabel,notation,namespace,notationPattern,CQLKEY,EXAMPLES}|del(..|nulls) ]' \
    > "$SCHEMES"
echo Got `jq length "$SCHEMES"` concept schemes
