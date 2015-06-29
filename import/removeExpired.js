
exports.run = function(db, mainCollection) {
    console.log('Removing expired grants');

    var query = {
        dueDate :  { "$lte" : new Date() }
    }

    mainCollection.remove(query, function(err, resp){
        if( err ) console.log(err);

        console.log('Removed grants from search');
        markExpiredSuggestions(db);
    });
}

function markExpiredSuggestions(db) {
    db.collection('suggest', function(err, c) {
        if( err ) {
            console.log(err);
            done();
        }

        var query = {
            dueDate :  { '$lte' : new Date() }
        };

        var action = {
            $set: {
                status : 'expired'
            }
        };

        c.update(query, action, function(err, results){
            if( err ) {
                console.log(err);
                done();
            }

            console.log('Marking expired suggestions')
            done();
        });

    });
}

function done() {
    console.log('done.');
    process.exit(1);
}
