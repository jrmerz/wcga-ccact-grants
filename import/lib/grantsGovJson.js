var request = require('request');
var async = require('async');
var md5 = require('md5');
var config = require('./grantsGovConf').config;
var vocab = require('./controlledVocab');

var defaultSearch = {
    "fundingCategories" : "NR|RA",
    "fundingInstruments" : "CA|G",
    "startRecordNum" : 0,
    "oppStatuses" : "open",
    "sortBy" : "openDate|desc"
};
var searchUrl = 'http://www.grants.gov/grantsws/OppsSearch?jp=';
var applyUrl = 'http://apply07.grants.gov/apply/GetGrant?opportunity=';

var attributeMap = {
    root : {
        title : 'opportunityTitle',
        originalDueDate : 'dueDate',
        opportunityNumber : 'fundingOppNumber',
        originalDueDate : 'applicationsDueDate',
    },
    synopsis : {
        synopsisDesc : 'description',
        agencyName : 'office',
        postingDate : 'postingDate',
        awardCeiling : 'maxAmount',
        awardFloor : 'minAmount',
        archiveDate : 'archiveDate',
        costSharing : 'costSharing',
        organization : 'agencyName',
        contactEmail : 'agencyContactEmail',
        numberOfRewards : 'numberOfAwards',
        estimatedFunding : 'estimatedFunding',
        applicantEligibilityDesc : 'additionalEligibilityInfo',
        createTimeStamp : 'dateEntered'
    },
    // merge these into contact HTML
    contact : ['agencyContacDesc', 'agencyContactEmail', 'agencyContactPhone'],
    // turn these into dates
    dates : ['applicationsDueDate', 'postingDate', 'archiveDate','dateEntered']
}


overviews = [];

exports.run = function(collection, callback) {
    overviews = [];

    // get the current search results
    defaultSearch.startRecordNum = 0;
    console.log('Querying: '+ defaultSearch.startRecordNum);
    get(searchUrl+encodeURIComponent(JSON.stringify(defaultSearch)),
        function(err, resp) {
            // TODO: process error
            getOverview(JSON.parse(resp), collection, callback);
        }
    );
}

function getOverview(resp, collection, callback) {
    for( var i = 0; i < resp.oppHits.length; i++ ) {
        // TODO: check blacklists
        overviews.push(resp.oppHits[i]);
    }

    if( resp.searchParams.startRecordNum + resp.searchParams.rows < resp.hitCount ) {
        defaultSearch.startRecordNum = resp.searchParams.startRecordNum + resp.searchParams.rows;
        console.log('Querying: '+ defaultSearch.startRecordNum);

        get(searchUrl+encodeURIComponent(JSON.stringify(defaultSearch)),
            function(err, resp) {
                getOverview(JSON.parse(resp), collection, callback);
            }
        );
    } else {
        getDetails(collection, callback)
    }
}

var c = 0;
function getDetails(collection, callback) {
    async.eachSeries(
        overviews,
        function(result, next){

            get('http://www.grants.gov/grantsws/OppDetails?oppId='+result.id,
                function(err, resp) {
                    if( err ) {
                        console.log(error);
                        return next();
                    }

                    var obj = createItemFromResp(JSON.parse(resp));
                    vocab.process(obj);

                    // set md5 for change checking
                    obj.md5 = md5(JSON.stringify(obj));

                    collection.findOne({link: obj.link}, function(err, item) {
                        if( !item ) {
                            console.log('INSERTING: '+obj.fundingOppNumber);
                            upsert(obj, collection, next); // new
                        } else if( item.md5 != obj.md5 ) {
                            console.log('UPDATING: '+obj.fundingOppNumber);

                            /* debugging
                                for( var key in obj ) {
                                var st1 = JSON.stringify(obj[key]);
                                var st2 = JSON.stringify(item[key]);
                                if( st1 != st2 ) {
                                    console.log('  --new['+key+']: '+st1);
                                    console.log('  --old['+key+']: '+st2);
                                }
                            }*/

                            upsert(obj, collection, next); // update
                        } else {
                            console.log('skipping: '+obj.fundingOppNumber);
                            next(); // no changes
                        }
                    });
                }
            );
        },
        function(err){
            callback(err);
        }
    );
}

function upsert(obj, collection, next) {
    collection.update(
        {link: obj.link}, 
        obj, 
        {upsert: true, w: 1}, 
        function(err, result) {
            next();
        }
    );
}

function get(url, callback) {
    request(url, function (error, response, body) {
        if( error ) return callback(error);
        if( response.statusCode == 200) {
            return callback(null, body);
        }
        return callback({
            error: true, 
            message: 'Error response: '+response.statusCode
        });
    });
}

/* prepare object 
    make sure the arrays are sorted, otherwise md5's will be off, the come back as a collection.
*/
var idSorts = ['applicantTypes','cfdas','fundingActivityCategories','fundingInstruments','opportunityPkgs','synopsisAttachments']
function prep(obj) {
    if( obj.opportunityHistoryDetails ) {
        delete obj.opportunityHistoryDetails;
    }

    if( obj.errorMessages ) {
        delete obj.errorMessages;
    }

    for( var i = 0; i < idSorts.length; i++ ) {
        if( obj[idSorts[i]] ) {
            obj[idSorts[i]].sort(function(a, b){
                if( a.id > b.id ) return 1;
                if( a.id < b.id ) return -1;
                return 0;
            });
        }
    }
}

function createItemFromResp(obj) {
    var item = {};

    // map the root attributes
    for( var key in attributeMap.root ) {
        if( obj[key] ) item[attributeMap.root[key]] = obj[key];
    }

    // map the attributes from the synopsis
    if( obj.synopsis ) {
        for( var key in attributeMap.synopsis ) {
            if( obj.synopsis[key] ) item[attributeMap.synopsis[key]] = obj.synopsis[key];
        }
    }

    // set link
    item.link = applyUrl+item.fundingOppNumber;

    // set contact information
    if( obj.synopsis ) {
        item.contact = [];
        for( var i = 0; i < attributeMap.contact.length; i++ ) {
            if( obj.synopsis[attributeMap.contact[i]] ) {
                item.contact.push(obj.synopsis[attributeMap.contact[i]]);
            }
        }
        item.contact = item.contact.join('<br />');
    }
    
    // set category and fundingActivityCategory
    if( obj.fundingActivityCategories ) {
        item.category = [];
        item.fundingActivityCategory = [];
        for( var i = 0; i < obj.fundingActivityCategories.length; i++ ) {
            var id = obj.fundingActivityCategories[i].id;
            var cat = config.categories[id];

            if( !cat ) continue;

            var name = cat.wgca.length > 0 ? cat.wgca : cat.grantsGov;
            if( item.category.indexOf(name) == -1 ) {
                item.category.push(name);
            }
            item.fundingActivityCategory.push(id);
        }
    }

    // set CFDANumber
    // just grabbing first for now
    if( obj.cfdas && obj.cfdas.length > 0 ) {
        item.CFDANumber = obj.cfdas[0].id
    }

    // static values
    item.catalogName = 'grants.gov';
    item.fundingSource = 'Federal';

    // set the assistance types
    if( obj.fundingInstruments ) {
        item.assistanceType = [];
        item.fundingInstrumentType = [];

        for( var i = 0; i < obj.fundingInstruments.length; i++ ) {
            var id = obj.fundingInstruments[i].id;
            var type = config.assistanceTypes[id];
            var name = type || obj.fundingInstruments[i].description;

            if( item.assistanceType.indexOf(name) == -1 ) {
                item.assistanceType.push(name);
            }
            item.fundingInstrumentType.push(id);
        }
    }

    // set the
    if( obj.applicantTypes ) {
        item.eligibilityCategory = [];
        item.eligibleApplicants = [];

        for( var i = 0; i < obj.applicantTypes.length; i++ ) {
            var id = parseInt(obj.applicantTypes[i].id)+'';
            var app = config.eligibleApplicants[id];

            if( !app ) continue;
            item.eligibilityCategory.push(obj.applicantTypes[i].id);
            if( item.eligibleApplicants.indexOf(app.wgca) == -1 ) {
                item.eligibleApplicants.push(app.wgca);
            }
        }
    }

    // now sort all arrays
    for( var key in item ) {
        if( Array.isArray(item[key]) ) {
            item[key].sort(function(a, b){
                if( a > b ) return 1;
                if( a < b ) return -1;
                return 0;
            });
        }
    }

    // turn date strings into objects
    for( var i = 0; i < attributeMap.dates.length; i++ ) {
        if( item[attributeMap.dates[i]] ) {
            item[attributeMap.dates[i]] = new Date(item[attributeMap.dates[i]]);
        }
    }

    return item;
}


