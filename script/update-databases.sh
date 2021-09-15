#!/bin/bash
DBS=data/databases.json
echo "Updating $DBS"

( while read dbkey;
  do curl -s "http://uri.gbv.de/database/$dbkey?format=jsonld"
  done < config/dbkeys
) | jq -s 'map({dbkey,uri,url,prefLabel:.title,picabase,srubase})' > "$DBS"

echo Got `jq length "$DBS"` concept schemes
