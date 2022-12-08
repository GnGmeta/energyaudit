var express = require('express');
var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');

//MongoDB 접속
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var autoIncrement = require('mongoose-auto-increment');

var db = mongoose.connection;
db.on('error', console.error);
db.once('open', function(){
    console.log('mongodb connect');
});

/* mongodb connection
var connect = mongoose.connect('mongodb://127.0.0.1:27017/crwaling', { useMongoClient: true });
autoIncrement.initialize(connect);
*/
process.setMaxListeners(0);

var crwaling = require('./routes/crwaling');

var app = express();
var port = 3000;

//정적 패스 추가
app.use('/assets', express.static(__dirname + '/assets'));
app.use('/vendor', express.static(__dirname + '/vendor'));

app.use(logger('dev'));
app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: false })); 
app.use(cookieParser());

var flash = require('connect-flash');
 
app.use(flash());

app.use('/crwaling',crwaling);

app.listen( port, function(){
    console.log('Express listening on port', port);
});




