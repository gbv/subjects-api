<?php

include_once 'utils.php';

$config = load('config.json');

// lists of URIs separated by whitespace or '|'
$members  = array_unique(array_filter(preg_split('/[\s|]+/', $_GET['members'] ?? '')));

// detect concept schemes that members origin from
$members = array_map(function($uri) use ($config) {
    foreach ($config['schemes'] as $scheme) {
        if ($scheme['namespace'] && startswith($uri, $scheme['namespace'])) {
            return [
                'uri'      => $uri,
                'inScheme' => [$scheme]
            ];
        }
    }
	error(404, "failed to detect concept scheme of URI $uri");
}, $members);

// lists of URIs separated by whitespace or '|'
$schemes = array_unique(array_filter(preg_split('/[\s|]+/', $_GET['schemes'] ?? '')));
$tmp = [];
foreach ($config['schemes'] as $scheme) {
    if (in_array($scheme['uri'], $schemes)) {
        $tmp[$scheme['uri']] = $scheme;
    }
}
$schemes = $tmp;
//unset($schemes[ $members[0]['inScheme'][0]['uri'] ]);

foreach ($schemes as $scheme) {
       if (!isset($scheme['PICAPATH'])) {
        error(400, "co-occurrence with ".$scheme['uri']." not supported yet");
    }
}

// TODO: customize database
$database = array_filter(preg_split('/[\s|]+/', $_GET['database'] ?? ''));
$dbkey = 'gvk';

function getSimpleOccurrence($concept, $dbkey) {
    $uri     = $concept['uri'];
    $scheme  = $concept['inScheme'][0];
    $cqlkey  = $scheme['CQLKEY'];

    $id = substr($uri, strlen($scheme['namespace']));

    if ($cqlkey == 'ddc') {
        if (startswith($id, 'class/')) {
            $id = substr($id, strlen('class/'));
        } else {
            error(400, "DDC URI not supported: $uri");
        }
    } elseif ($cqlkey == 'rvk' || $cqlkey == 'kab') {
        $id = preg_replace('/_/',' ',$id);
        $id = preg_replace('/-/',' - ',$id);
    }

    $count = getNumberOfRecordsViaSRU("http://sru.gbv.de/$dbkey", $cqlkey, $id);
    $time  = date("c",time());

    return [
        "database"  => [ "uri" => "http://uri.gbv.de/database/$dbkey" ],
        "memberSet" => [ 
            [ 
                "uri" => $uri,
                "inScheme" => [ [ 'uri' => $scheme['uri'] ] ]
            ] 
        ],
        "count"     => $count,
        "modified"  => $time,
        "url"       =>
            "https://gso.gbv.de/DB=2.1/CMD?ACT=SRCHA&IKT=1016&SRT=YOP&TRM="
                .urlencode("$cqlkey $id")
    ];
}

function getNumberOfRecordsViaSRU($sru, $cqlkey, $id) {
    $url = "$sru?version=1.2&operation=searchRetrieve"
        . "&query=".urlencode("pica.$cqlkey=\"$id\"")
        . "&maximumRecords=0&recordSchema=picaxml";
	$xml = file_get_contents($url);
    if (preg_match('/numberOfRecords>([0-9]+)</', $xml, $match)) {
        return $match[1];
    } else {
        error(500, "failed to get occurrences via SRU: $url");
    }
}

function logOccurrence($occ, $file) {
    $row = array_map(function ($member) {
        return $member['uri']; },
        $occ['memberSet']
    );
    array_unshift($row, $occ['count']);
    array_unshift($row, $occ['modified']);
    array_unshift($row, $occ['database']['uri']);
    file_put_contents($file, implode(" ", $row)."\n", FILE_APPEND);
}

$occurrences = array_map(function ($member) use ($dbkey) {
    $occ = getSimpleOccurrence($member, $dbkey);
    logOccurrence($occ, 'occurrences.txt');
    return $occ;
}, $members);

if (count($schemes)) {
    # TODO: get records and count in PICAPATH
}

response($occurrences);
