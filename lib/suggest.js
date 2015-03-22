var ObjectID = require('mongodb').ObjectID;
var controlledVocab = require('../import/lib/controlledVocab');

var app = global.app;
var db = global.db;
var collection;
var searchCollection = global.collection;

var required = ['title', 'link', 'description', 'name', 'email', 'dueDate'];

exports.init = function() {
    db.collection('suggest', function(err, coll) {
        collection = coll;
    });
}

app.get('/rest/mySuggestions', function(req, resp){
    if( !req.user ) return resp.send({error: true, message: 'You are not logged in'});

    collection
        .find({suggestedBy: req.user.email})
        .sort({title: 1})
        .toArray(function(err, results){
            if( err ) return resp.send({error: true, message: err});
            resp.send(results);
        });
});

app.get('/rest/suggestions', function(req, resp){
    if( !req.user ) return resp.send({error: true, message: 'You are not logged in'});
    if( !req.user.admin ) return resp.send({error: true, message: 'must be an admin'});

    var status = req.query.status;

    if( !status ) return resp.send({error: true, message: 'status required'});

    collection
        .find({status: status})
        .sort({title: 1})
        .toArray(function(err, results){
            if( err ) return resp.send({error: true, message: err});
            resp.send(results);
        });
});

app.post('/rest/suggest', function(req, resp){
    if( !req.user ) return resp.send({error: true, message: 'You must be logged in to suggest a grant'});

    var data = req.body;

    for( var i = 0; i < required.length; i++ ) {
        if( !data[required[i]] ) {
            return resp.send({error: true, message: required[i]+' required', code: 100});
        }
    }

    data.dueDate = new Date(data.dueDate);

    data.catalogName = 'suggest';
    data.suggestedBy = req.user.email;
    data.status = 'pending';
    data.history = [];
    data.inserted = new Date();
    data.lastUpdated = new Date();

    // try an parse out numbers
    if( data.minAmount !== undefined && typeof data.minAmount == 'string') {
        data.minAmount = parseInt(data.minAmount.replace(/\D/g,''));
    }
    if( data.maxAmount !== undefined && typeof data.maxAmount == 'string') {
        data.maxAmount = parseInt(data.maxAmount.replace(/\D/g,''));
    }

    try {
        if( data.zipCodes && typeof data.zipCodes == 'string') {
            data.zipCodes = data.zipCodes.replace(/[^0-9,]/g,'').split(',');
        }
    } catch(e) {}

    controlledVocab.process(data);

    collection.insert(data, {w: 1}, function(err, result){
        if( err ) return resp.send({error: true, message: err});
        resp.send({success: true});
    });
});

app.get('/rest/removeSuggestion', function(req, resp){
    if( !req.user ) return resp.send({error: true, message: 'You must be logged in to suggest a grant'});

    var id = req.query.id;

    collection.findOne({_id: new ObjectID(id)}, {suggestedBy: 1}, function(err, result){
        if( err ) return resp.send({error: true, message: err});
        if( !result ) return resp.send({error: true, message: 'grant not found'});

        if( result.suggestedBy != req.user.email ) {
            return callback({error: true, message: 'you did not suggest this grant'});
        }

        collection.remove({_id: new ObjectID(id)}, function(err, result){
            if( err ) return resp.send({error: true, message: err});

            removeGrant(id, function(err, result){
                if( err ) return resp.send({error: true, message: err});
                resp.send({success: true});
            });
        });
    });
});

app.get('/rest/setStatus', function(req, resp){
    if( !req.user ) return resp.send({error: true, message: 'not logged in'});
    if( !req.user.admin ) return resp.send({error: true, message: 'must be an admin'});

    var id = req.query.id;
    var status = req.query.status;

    if( !id || !status ) return resp.send({error: true, message: 'id and status required'});


    collection.update(
        {_id: new ObjectID(id)}, 
        {
            $set: {
                status : status
            }, 
            $push: { 
                history : {
                    user : req.user.email,
                    status : status,
                    timestamp : new Date().getTime()
                }
            }
        }, 
        function(err, result) {
        if( err ) return resp.send({error: true, message: err});

        handleStatusUpdate(id, status, function(err){
            if( err ) return resp.send({error: true, message: err});
            resp.send({success: true, resp: result});
        });
    });
});

function handleStatusUpdate(id, status, callback) {
    if( status == 'approved' ) approveGrant(id, callback);
    else if( status == 'rejected' ) removeGrant(id, callback);
    else if( status == 'pending' ) removeGrant(id, callback);
}

function approveGrant(id, callback) {
    collection.findOne({_id: new ObjectID(id)}, function(err, result){
        if( err ) return callback({error: true, message: err});
        if( !result ) return callback({error: true, message: 'grant not found'});

        delete result._id;
        delete result.history;
        result.id = id;

        searchCollection.insert(result, {w: 1}, function(err, insertResult){
            if( err ) return callback({error: true, message: err});

            callback(null, result);
        });
    });
}

function removeGrant(id, callback) {
    searchCollection.remove({id: id}, function(err, result){
        if( err ) return callback({error: true, message: err});
        callback(null, result);
    });
}

