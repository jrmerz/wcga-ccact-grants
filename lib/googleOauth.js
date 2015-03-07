/**
    helper for google oauth dance
**/
var GoogleStrategy   = require('passport-google-oauth').OAuth2Strategy;

var scopes = ['email'];

exports.init = function(app, passport, mongo, config) {
    var strategy = new GoogleStrategy(
      {
        clientID: config.google.clientID,
        clientSecret: config.google.clientSecret,
        callbackURL: config.url + '/auth/google/return',
      },
      function(accessToken, refreshToken, profile, done) {
        if( config.admins.indexOf(profile._json.email) ) {
          profile._json.admin = true;
        }
        done(null, profile);
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
        { successRedirect: '/',
          failureRedirect: '/login.html#fail' 
        }
      )
    );
}
