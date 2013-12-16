var express = require('express');

var app = module.exports = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.use(express.logger('dev'));
app.use(express.cookieParser());
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.session({secret: "12kl5jv953BGADG32fSD21ed1fG5vjfdjsajfj32j5t"}));
app.use(app.router);

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

require('./routes/version-check.js')(app);
