/**
    helper for google oauth dance
**/
var fs = require('fs');
var GoogleStrategy   = require('passport-google-oauth').OAuth2Strategy;

var scopes = ['email'];
var mongo = global.mongo;
var app = global.app;
var config = global.appConfig;

// allow google config outside main config
if( !config.google && fs.existsSync('/etc/funding-wizard/google.json') ) {
  config.google = require('/etc/funding-wizard/google.json');
}

exports.init = function(passport) {

    var strategy = new GoogleStrategy(
      {
        clientID: config.google.clientID,
        clientSecret: config.google.clientSecret,
        callbackURL: 'http://'+config.server.host + 
                      (config.server.localport && config.server.remoteport != 80 ? ':'+config.server.remoteport : '') + 
                      '/auth/google/return',
      },
      function(accessToken, refreshToken, profile, done) {
        var user = {};
        try {
          user = {
            id : profile.id,
            displayName: profile.displayName,
            name : profile.name,
            email: profile.emails[0].value
          }
        } catch(e) {
          done(e);
          return;
        }
        if( !config.admins ) return done(null, user);

        if( config.admins.indexOf(user.email) > -1 ) {
          user.admin = true;
        }

        done(null, user);
      }
    );

    passport.use(strategy);

    app.get('/auth/google', 
      passport.authenticate('google', 
        { 
          accessType: 'offline',
          scope: scopes 
        }
      )
    );

    app.get('/auth/google/return', 
      passport.authenticate('google', 
        { successRedirect: '/#add',
          failureRedirect: '/#add/fail' 
        }
      )
    );
}
