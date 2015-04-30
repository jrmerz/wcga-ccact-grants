var YahooStrategy = require('passport-yahoo-oauth').Strategy;
var fs = require('fs');

var app = global.app;
var config = global.appConfig;

exports.init = function(passport) {
    if( !config.yahoo && fs.existsSync('/etc/funding-wizard/yahoo.json') ) {
        config.yahoo = require('/etc/funding-wizard/yahoo.json');
    } else if( !config.yahoo ) {
        return console.log('Ignoring yahoo auth.  No config found');
    }



    passport.use(new YahooStrategy({
        consumerKey: config.yahoo.consumerKey,
        consumerSecret: config.yahoo.consumerSecret,
        callbackURL: "http://"+config.server.host+"/auth/yahoo/callback"
      },
      function(token, tokenSecret, profile, done) {
        debugger;
        console.log('here!!');
        console.log(token);
        console.log(tokenSecret);
        console.log(profile);

        done(null, profile);


        /*User.findOrCreate({ yahooId: profile.id }, function (err, user) {
          return done(err, user);
        });*/
      }
    ));

    app.get('/auth/yahoo',  passport.authenticate('yahoo'));

    app.get('/auth/yahoo/callback',
      passport.authenticate('yahoo', { 
          successRedirect: '/#add',
          failureRedirect: '/#add/fail' 
        })
    );
}