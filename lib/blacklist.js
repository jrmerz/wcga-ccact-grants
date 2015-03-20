var blaclistCollection;
var collection = global.collection;
var db = global.db;

db.collection('blacklist', function(err, coll) {
    blaclistCollection = coll;
});


app.post('/rest/blacklist', function(req, resp){
    if( !req.user ) return resp.send({error: true, message: 'You are not logged in'});
    if( !req.user.admin ) return resp.send({error: true, message: 'must be an admin'});

    var body = req.body;
    if( !body ) resp.send({error: true, message: 'no body'});
    if( !body.id || !body.reason || !body.title ) return resp.send({error: true, message: 'id and reason required'});

    var blacklist = {
        id : body.id,
        user : req.user.email,
        reason : body.reason,
        title : body.title,
        timestamp : new Date().getTime()
    }

    blaclistCollection.update({id: body.id}, blacklist, { upsert: true }, function(err, result) {
        if( err ) return resp.send({error: true, message: err});

        collection.remove({id: body.id}, function(err, result) {
            if( err ) return resp.send({error: true, message: err});

            resp.send({success: true, result: result});
        });
    });
});

app.get('/rest/getBlacklist', function(req, resp){
    if( !req.user ) return resp.send({error: true, message: 'You are not logged in'});
    if( !req.user.admin ) return resp.send({error: true, message: 'must be an admin'});

    blaclistCollection.find({}).sort([['timestamp', -1]]).toArray(function(err, result) {
        if( err ) return resp.send({error: true, message: err});
        resp.send(result);
    });
});