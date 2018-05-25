<?php

include_once 'utils.php';

$config = load('config.json');

if (!$_GET) {
    error('400', 'missing query parameters', [ 'examples' => $config['examples'] ]);
}

// lists of URIs separated by whitespace or '|'
$schemes  = array_filter(preg_split('/[\s|]+/', $_GET['schemes'] ?? ''));
$members  = array_filter(preg_split('/[\s|]+/', $_GET['members'] ?? ''));
$database = array_filter(preg_split('/[\s|]+/', $_GET['database'] ?? ''));

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

if (!$members) {
	error(400, 'missing query parameter members (space-separated list of URIs)');
}

if (count($members)>1) {
	error(400, 'occurrences with multiple members not supported yet');
}

// TODO: customize database
$database = "http://uri.gbv.de/database/gvk";
$sru      = "http://sru.gbv.de/gvk";

// query one concept
$concept = $members[0];
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
} elseif ($cqlkey == 'rvk') {
    $id = preg_replace('/_/',' ',$id);
    $id = preg_replace('/-/',' - ',$id);
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

// get number of records via SRU
$count = getNumberOfRecordsViaSRU($sru, $cqlkey, $id);
$time  = date("c",time());

$occurrence = [
    "database"  => [ "uri" => $database ],
    "memberSet" => [ [ "uri" => $uri ] ],
    "count"     => $count,
    "modified"  => $time,
    "url"       => 
        "https://gso.gbv.de/DB=2.1/CMD?ACT=SRCHA&IKT=1016&SRT=YOP&TRM="
            .urlencode("$cqlkey $id")
];

function logOccurrence($occ, $file) {
    $row = array_map(function ($member) { 
        return $member['uri']; }, 
        $occ['memberSet']
    );
    array_unshift($row, $occ['count']);
    array_unshift($row, $occ['modified']);
    array_unshift($row, $occ['database']['uri']);
    file_put_contents($file, implode(" ", $row), FILE_APPEND);
}

logOccurrence($occurrence, 'occurrences.txt');

response($occurrence);
