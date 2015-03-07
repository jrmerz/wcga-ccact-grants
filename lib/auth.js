var passport         = require('passport');
var cookieParser     = require('cookie-parser');
var bodyParser       = require('body-parser');
var session          = require('express-session');
var ObjectID         = require('mongodb').ObjectID;


var googleOauthHelper = require('./auth/googleOauth.js');



// in memory for now
var sessionStore = {};
var mongo;

var sessions = {};

passport.serializeUser(function(user, done) {
    sessionStore[user.email] = user;
    done(null, user._id);
});

passport.deserializeUser(function(id, done) {
  if( sessionStore[id] ) done(null, sessionStore[id])
  else done({error:true, message:'not logged in'});
});

exports.init = function(app, callback) {
  app.use(cookieParser()); // read cookies (needed for auth)
  app.use(bodyParser.json()); // get information from html forms
  app.use(bodyParser.urlencoded({ extended: true }));
  
  // required for passport
  app.use(session({
      key: 'app.sess',
      store: sessionStore,
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
  googleOauthHelper.init(app, passport);

  app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
  });

  callback();
}

