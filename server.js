/**
 * This will actually extend the MQE expressjs server
 * 
 * make sure mongo is fired up w/ text search enabled
 * mongod --setParameter textSearchEnabled=true
 * 
 */
var config = require(process.argv[2]);
var ical = require('ical-generator');

// express app
exports.bootstrap = function(server) {
    var db = server.mqe.getDatabase();


    server.app.get('/rest/ical', function(req, resp){
        cal = ical();
        cal.setDomain('westcoastoceans.org').setName(req.query.title);

        cal.addEvent({
            start: new Date(req.query.dueDate),
            end: new Date(req.query.dueDate),
            summary: req.query.title,
            description: 'Application Due Date',
            url: req.query.url,
            allDay: true
        });

        cal.serve(resp);
    });

    if( config.dev ) {
        server.app.use("/", server.express.static(__dirname+"/app"));
        console.log('using: '+__dirname+"/app");
    } else {
        server.app.use("/", server.express.static(__dirname+"/dist"));
        console.log('using: '+__dirname+"/dist");
    }
    
};


