'use strict'

var async = require('async');
var request = require('request');
var md5 = require('MD5');
var ObjectID = require('mongodb').ObjectID;
var MongoClient = require('mongodb').MongoClient, db, collection;
var importLog, lastRun, config, count;

var grantsGov = require('./lib/grantsGov');

var verbose = false;


function log(msg) {
    if( verbose ) console.log(' --import: '+msg);
}

function run() {
	lastRun = new Date();
	count = {
			error : 0,
			update : 0,
			found : 0,
			remove : 0,
			insert : 0
	}
	importLog = "\n==== Spectra Import @"+lastRun.toLocaleString()+" ====\n";

	connect();
}

function connect() {	
	MongoClient.connect('mongodb://localhost:27017/wcga', function(err, database) {
		if(!err) {
			db = database;
			console.log('connected to mongo db');
		} else {
			console.log('unable to connect db');
			console.log(err);
			return;
		}

		db.collection('grants', function(err, c) { 
			if( err ) {
				console.log('unable to connect to collection: '+config.db.mainCollection);
				console.log(err);
				return;
			}
			collection = c;

			grantsGov.run(c, function(){
				console.log('done');
			});
			
		});
	});
}

run();