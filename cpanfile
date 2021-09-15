requires 'perl', '5.14.0';

requires 'Plack', '1.0';
requires 'Plack::Middleware::ETag'; 
requires 'Plack::Middleware::XForwardedFor'; 

requires 'URI::Escape';
requires 'List::Util', '1.45';
requires 'Catmandu', '1.2010';
requires 'Catmandu::SRU', '0.43';
requires 'Catmandu::PICA', '1.07';

requires 'local::lib';

test_requires 'HTTP::Request';
