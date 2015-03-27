var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;

MongoClient.connect('mongodb://localhost:27017/wcga', function(err, db) {
    db.collection('suggest', function(err, coll) {
        collection = coll;
        db.collection('grants', function(err, coll) {
            searchCollection = coll;
            test(collection, searchCollection);
        });
    });
});

function test(collection, searchCollection) {
    collection.findOne({_id: ObjectID('550eefcee876f3a0f174a0f6')}, function(err, resp){
        console.log(resp);
        console.log(resp._id+'');
        console.log('*************');

        searchCollection.findOne({id: resp._id+''}, function(err, result){
            console.log(err);
            console.log(result);
        });
    });
}