requires 'perl', '5.14.0';

requires 'Plack', '1.0';
requires 'Plack::Middleware::ETag'; 
requires 'Plack::Middleware::XForwardedFor'; 

requires 'URI::Escape';
requires 'List::Util', '1.45';
requires 'Catmandu', '0.95';
requires 'Catmandu::SRU', '0.42';
requires 'Catmandu::PICA', '0.26';

requires 'local::lib';

test_requires 'HTTP::Request';
