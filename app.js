var express = require('express')
  , context = require('superagent-defaults')
  , envs = require('envs')
  , GITHUB_LOGIN = envs(GITHUB_LOGIN)
  , GITHUB_PASSWORD = envs(GITHUB_PASSWORD);

var app = module.exports = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.use(express.logger('dev'));
app.use(express.cookieParser());
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.session({secret: "12kl5jv953BGADG32fSD21ed1fG5vjfdjsajfj32j5t"}));
app.use(app.router);

app.use(function(req, res, next) {
  req.superagent = context()
    .on('request', function(request){
      request
        .set('Accept', 'application/json')
        .set('User-Agent', 'curl/7.24.0 (x86_64-apple-darwin12.0) libcurl/7.24.0 OpenSSL/0.9.8r zlib/1.2.5')
        .set('Content-Type', 'application/json')
        .auth(GITHUB_LOGIN, GITHUB_PASSWORD);
    });
  next();
});

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

require('./routes/version-check.js')(app);
