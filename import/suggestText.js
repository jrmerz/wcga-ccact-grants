/**
    Each import, we should make sure the controlled text for all suggested grants is up to date.
**/
var controlledVocab = require('./lib/controlledVocab');
var async = require('async');
var searchCollection, collection;
var callback;

exports.run = function(db, sc, cb) {
    console.log('Updating suggest grant text');

    searchCollection = sc;
    callback = cb;

    db.collection('suggest', function(err, coll) {
        collection = coll;
        process();
    });
}

function process() {
    collection.find({ status: { $ne: 'expired' } }).toArray(function(err, results){
        if( err ) return console.log(err);

        async.eachSeries(results, processItem, callback);
    });
}

function processItem(item, next) {
    var str1 = JSON.stringify(item);

    controlledVocab.process(item);

    var str2 = JSON.stringify(item);

    // check to see if no changes
    if( str1 == str2 ) return next();

    // if changes, update the suggest collection
    collection.update({_id: item._id}, item, function(err, result){
        if( err ) {
            console.log(err);
            return next();
        }

        // if this suggestion is not approved, we are done
        if( item.status != 'approved' ) return next();

        // prep for update in search
        item.id = item._id+'';
        delete item._id;
        delete item.history;

        searchCollection.update({id: item.id}, item, function(err, result){
            if( err ) console.log(err);
            next();
        });
    });
}

