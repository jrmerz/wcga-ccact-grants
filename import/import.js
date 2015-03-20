'use strict'

var async = require('async');
var request = require('request');
var ObjectID = require('mongodb').ObjectID;
var MongoClient = require('mongodb').MongoClient, db, collection;
var importLog, lastRun, config, count;

var grantsGov = require('./lib/grantsGovXml');
var removeExpired = require('./removeExpired');

var verbose = false;


config = require(process.argv[2]);

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
	MongoClient.connect(config.db.url, function(err, database) {
		if(!err) {
			db = database;
			console.log('connected to mongo db');
		} else {
			console.log('unable to connect db');
			console.log(err);
			return;
		}

		db.collection('blacklist', function(err, c) { 
			if( err ) {
				console.log('unable to connect to collection: blacklist');
				console.log(err);
				return;
			}

			c.find({}, {id: 1}).toArray(function(err, resp){
				if( err ) return console.log(err);
				
				var blacklist = [];
				for( var i = 0; i < resp.length; i++ ) blacklist.push(resp[i].id);

				connectToMain(blacklist);
			});
		});
	});
}

function connectToMain(blacklist) {
	db.collection(config.db.mainCollection, function(err, c) { 
		if( err ) {
			console.log('unable to connect to collection: '+config.db.mainCollection);
			console.log(err);
			return;
		}
		collection = c;

		grantsGov.run(c, blacklist, function(){
			grantsGov.cleanUpZips();

			removeExpired.run(db, collection);
		});
		
	});
}

run();