<?php

function response($data, int $code=200) {
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

	$headers = [
    	'Access-Control-Allow-Origin' => '*',
        'Content-Type' => 'application/json; charset=UTF-8',
        'Content-Length' => strlen($json),
	];

	foreach ($headers as $header => $value) {
		header("$header: $value", false);
	}

	http_response_code($code);

	print $json;
	exit;
}

function error(int $code, string $message, array $error=[]) {
    $error['code'] = $code;
    $error['message'] = $message;
	response($error, $code);
}

function load(string $file) {
    return json_decode(file_get_contents($file), true);
}

function startswith($haystack, $needle) {
    return substr($haystack, 0, strlen($needle)) === $needle;
}    
