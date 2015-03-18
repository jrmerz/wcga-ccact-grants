var passport         = require('passport');
var cookieParser     = require('cookie-parser');
var session          = require('express-session');
var ObjectID         = require('mongodb').ObjectID;


var googleOauthHelper = require('./googleOauth.js');
var app = global.app;
var config = global.appConfig;

// in memory for now
var sessionStore = {};
var mongo;

var sessions = {};

passport.serializeUser(function(user, done) {
    sessionStore[user.id] = user;
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  if( sessionStore[id] ) done(null, sessionStore[id])
  else done({error:true, message:'not logged in'});
});


app.use(cookieParser()); // read cookies (needed for auth)

// required for passport
app.use(session({
    key: 'app.sess',
    //store: sessionStore,
    secret: 'wealllovecoookie',
    resave: false,
    cookie: { 
      domain: global.appConfig.host,
      maxAge: 1000*60*60*24*30
    },
    saveUninitialized: true}
)); // session secret
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions

// init google oauth
googleOauthHelper.init(passport);

app.use(function(req, resp, next){
  console.log(req.originalUrl);
  if( req.originalUrl == '/admin.html' ) {
    if( !req.user ) return resp.redirect('/auth/google');
    if( !req.user.admin ) return resp.redirect('/');
  }
  next();
});

app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});


// this script will be called in header of any page that cares about user auth
app.get('/scripts/user.js', function(req, resp){
  resp.set('Content-Type', 'application/javascript');
  var user = req.user;
  if( !user ) {
    return resp.send('if(!window.WCGA)window.WCGA={};WCGA.user='+JSON.stringify({error: true, message: 'not logged in', status: -1})+';');
  }
  resp.send('if(!window.WCGA)window.WCGA={};WCGA.user='+JSON.stringify(user)+';');
});