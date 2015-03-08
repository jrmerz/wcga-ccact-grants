/**
 * Boostraped by the MQE, ExpressJS server
 */

var ical = require('ical-generator');
var fs = require('fs');

// global ns provided by mqe
var app = global.app;
var mqe = global.mqe;
var config = global.appConfig;
var express = global.express;
var logger = global.logger;

// express app
exports.bootstrap = function(server) {
    app.get('/rest/schema', function(req, resp) {
        resp.setHeader("content-type", "application/json");
        fs.createReadStream(__dirname+"/lib/schema.json").pipe(resp);
    });

    app.get('/rest/filters', function(req, resp) {
        var query = mqe.queryParser(req);
        var options = mqe.getOptionsFromQuery(query);

        mqe.filterCounts(options, function(err, result){
            if( err ) return resp.send({error: true, message: err});

            var filters = {
                filters : result
            }

            mqe.filterCountsQuery(query, function(err, result){
                if( err ) return resp.send({error: true, message: err});
                filters.total = result;

                resp.send(filters);
            });
        });
    });

    app.get('/rest/counts', function(req, resp){
        var query = mqe.queryParser(req);

        mqe.filterCountsQuery(query, function(err, result){
            if( err ) return resp.send({error: true, message: err});

            var counts = {
                'default' : result
            };

            // now do new filter
            var lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth()-1);
            query.filters.push({
                postDate : { $gte: lastMonth }
            });

            mqe.filterCountsQuery(query, function(err, result){
                if( err ) return resp.send({error: true, message: err});

                counts['new'] = result;
                resp.send(counts);
            });
        });
    });

    app.get('/rest/ical', function(req, resp){
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

    app.use('/', express.static(__dirname + (config.dev ? '/app' : '/dist')));
    logger.info('serving: '+__dirname+ (config.dev ? '/app' : '/dist'));
};


