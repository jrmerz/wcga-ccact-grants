var YahooStrategy = require('passport-yahoo').Strategy;
var app = global.app;
var config = global.appConfig;

exports.init = function(passport) {

    var url = 'http://'+config.server.host +
            (config.server.localport && config.server.remoteport != 80 ? ':'+config.server.remoteport : '');

    passport.use(new YahooStrategy({
        returnURL: url+'/auth/yahoo/return',
        realm: url
      },
      function(identifier, profile, done) {

        var user;
        try {
          user = {
            id : identifier.replace(/.*\//, ''),
            name : profile.displayName,
            displayName : profile.displayName,
            auth:  'Yahoo'
          }
        } catch(e) {
          done(e);
          return;
        }

        done(null, user);
      }
    ));

    app.get('/auth/yahoo',
      passport.authenticate('yahoo'));

    app.get('/auth/yahoo/return',
      passport.authenticate('yahoo', { failureRedirect: '/login' }),
      function(req, res) {
        // Successful authentication, redirect home.
        res.redirect('/');
      });

};
