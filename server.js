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
var spectraCollection;
var packageCollection;

var ignoreList = ['_id','lastUpdate','lastRun', 'metadata', 'spectra'];

// express app
exports.bootstrap = function(server) {
    var db = server.mqe.getDatabase();
    
    db.collection(config.db.mainCollection, function(err, coll) { 
        if( err ) return console.log(err);

        collection = coll;
    });

    db.collection(config.db.spectraCollection, function(err, coll) { 
        if( err ) return console.log(err);

        spectraCollection = coll;
    });

    db.collection(config.db.packageCollection, function(err, coll) { 
        if( err ) return console.log(err);

        packageCollection = coll;
    });

    server.app.get('/rest/getSpectra', function(req, res){
        data.getSpectra({package: packageCollection, spectra: spectraCollection}, req, res);
    });

    server.app.get('/rest/getDerivedData', function(req, res){
        data.getDerivedData({package: packageCollection, spectra: spectraCollection}, req, res);
    });

    server.app.get('/rest/download', function(req, res){
        data.download({package: packageCollection, spectra: spectraCollection}, req, res);
    });

    // takes params format and raw
    /*
    server.app.get('/rest/download', function(req, res){
        var format = '\t';
        var includeMetadata = true;

        if( req.query.format ) {
            if( req.query.format == 'spaces' ) format = '    ';
            if( req.query.format == 'comma' ) format = ',';
            delete req.query.format;
        }

        if( req.query.raw ) {
            if( req.query.raw == 'true' ) includeMetadata = false;
            delete req.query.raw;
        }

        server.mqe.getItem(req, function(err, item){
            if( err ) return res.send(err);

            var txt = '';

            if( includeMetadata ) {
                for( var key in item ) {
                    if( ignoreList.indexOf(key) > -1 ) continue;
                    txt += key+format+item[key]+'\n';
                }
                for( var key in item.metadata ) {
                    txt += key+format+item.metadata[key]+'\n';
                }
                txt += '\n';
            }
            

            for( var i = 0; i < item.spectra.length; i++ ) {
                txt += item.spectra[i][0]+format+item.spectra[i][1]+'\n';
            }

            res.set('Content-Disposition', 'attachment; filename="'+item._id+'.txt"');
            res.send(txt);
        });
    });
    */
    

    server.app.get('/rest/downloadQueryData', function(req, resp) {
        var q = server.mqe.requestToQuery(req);

        resp.set('Content-Disposition', 'attachment; filename="query-data.csv"');
        resp.set('Content-Type', 'text/csv');

        getQueryIdsAndCounts(q.options, function(ids){
            resp.write('wavelength');
            for( var id in ids ) {
                if( ids[id] == 1 ) {
                    resp.write(','+id);
                } else {
                    var c = ids[i];
                    for( var i = 0; i < c; i++ ) {
                        resp.write(','+id+'-'+i);
                    }
                }
            }
            resp.write('\n');

            var cursor = collection.aggregate(
                [
                    {
                        $match : q.options
                    },
                    {
                        $limit : 10000
                    },
                    { 
                        $project : { 
                            _id : 1, 
                            spectra : 1
                        } 
                    },
                    { $unwind: "$spectra" },
                    { 
                        $group: { 
                            _id: "$spectra.wavelength", 
                            values : { 
                                $push : "$spectra.values"
                            },
                            ids : {
                                $push : "$_id"
                            }
                        }
                    },
                    {
                        $sort : { _id : 1 } 
                    }
                ], 
                {
                    allowDiskUse: true, 
                    cursor: { batchSize: 0 }
                }
            );

            // Use cursor as stream
            cursor.on('data', function(data) {
                var row = createQueryDataRow(ids, data);

                var out = data._id;
                for( var id in row ) {
                    out += ','+row[id];
                }
                resp.write(out+'\n');

            });

            cursor.on('end', function() {
                resp.end('');
            });
        });
    });


    server.app.get('/rest/group/getInfo', function(req, resp){
        getGroupInfo(req, resp);
    });

    server.app.get('/rest/import', function(req, resp){
        server.runImport(function(obj){
            server.mqe.clearCache();
            resp.send(obj);
        });
    });

    server.app.get('/rest/gitInfo', function(req, resp){
        gitInfo(function(txt){
            resp.send(txt);
        });
    });

    if( config.dev ) {
        server.app.use("/", server.express.static(__dirname+"/app"));
        console.log('using: '+__dirname+"/app");
    } else {
        server.app.use("/", server.express.static(__dirname+"/dist"));
        console.log('using: '+__dirname+"/dist");
    }
    
};


