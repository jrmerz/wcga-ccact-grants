/**
 * This will actually extend the MQE expressjs server
 * 
 * make sure mongo is fired up w/ text search enabled
 * mongod --setParameter textSearchEnabled=true
 * 
 */
var config = require(process.argv[2]);

var ObjectId = require('mongodb').ObjectID;
var CursorStream = require('mongodb').CursorStream;
var async = require('async');

var data = require('./lib/data.js');

var exec = require('child_process').exec;

var collection;

var ignoreList = ['_id','lastUpdate','lastRun', 'metadata', 'spectra'];

// express app
exports.bootstrap = function(server) {
    var db = server.mqe.getDatabase();


    if( config.dev ) {
        server.app.use("/", server.express.static(__dirname+"/app"));
        console.log('using: '+__dirname+"/app");
    } else {
        server.app.use("/", server.express.static(__dirname+"/dist"));
        console.log('using: '+__dirname+"/dist");
    }
    
};


