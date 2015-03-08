// using this url...xmlextract_WAR_grantsxmlextractportlet_INSTANCE_5NxW0PeTnSUa
// http://www.grants.gov/web/grants/xml-extract.html?p_p_id=&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_cacheability=cacheLevelPage&p_p_col_id=column-1&p_p_col_pos=1&p_p_col_count=2&download=GrantsDBExtract20141215.zip
var fs = require('fs');
var unzip = require('unzip');
var request = require('request');
var async = require('async');
var md5 = require('MD5');
var parseString = require('xml2js').parseString;

var config = require('./grantsGovConf').config;
var vocab = require('./controlledVocab');

var url = 'http://www.grants.gov/web/grants/xml-extract.html' +
          '?p_p_id=&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view'+
          '&p_p_cacheability=cacheLevelPage&p_p_col_id=column-1'+
          '&p_p_col_pos=1&p_p_col_count=2&download=GrantsDBExtract';
var applyUrl = 'http://apply07.grants.gov/apply/GetGrant?opportunity=';

var dir = __dirname+'/data/';
var rootFileName = 'GrantsDBExtract';

// attributes we did not explicitly handle during parse
var unknowns = [];

// for translation from Grants.gov object to our object
var etlConfig = {
    // mapping of attribute names
    // Note, things like FundingInstrumentType are handled on a case by case bases
    map : {
        FundingOppTitle           : 'title',
        FundingOppDescription     : 'description',
        Agency                    : 'office',
        ApplicationsDueDate       : 'dueDate',
        Location                  : 'location',
        PostDate                  : 'postDate',
        AwardCeiling              : 'maxAmount',
        AwardFloor                : 'minAmount',
        ArchiveDate               : 'archiveDate',
        CFDANumber                : 'CFDANumber', // placing this here cause it still needs to become a single string
        CostSharing               : 'costShare',
        AgencyMailingAddress      : 'contactEmail',
        NumberOfAwards            : 'numberOfAwards',
        EstimatedFunding          : 'estimatedFunding',
        FundingOppNumber          : 'fundingOppNumber',
        AdditionalEligibilityInfo : 'additionalEligibilityInfo',
        Office                    : 'organization',
        ApplicationsDueDateExplanation : 'ApplicationsDueDateExplanation',
        OtherCategoryExplanation       : 'OtherCategoryExplanation'
    },
    // list of attributes to ignore
    ignore : ['UserID','Password'],
    // list of date types
    dates : ['postDate', 'dueDate', 'archiveDate'],
    // list of numberic types
    numberic : ['maxAmount', 'minAmount', 'numberOfAward', 'estimatedFunding']
}


exports.run = function(collection, callback) {
    var date = new Date();
    var m = date.getMonth()+1;
    var d = date.getDate();
    if( m < 10 ) m = '0'+m;
    if( d < 10 ) d = '0'+d;

    date = [date.getYear()+1900, m, d].join('');

    if( checkCache(date) ) {
        console.log('Using cache');
        readCache(date, process, collection, callback);
    } else {
        console.log('requesting...');
        console.log(url+date+'.zip');
        request(url+date+'.zip')
            .on('end', function(){
                readCache(date, process, collection, callback);
            })
            .pipe(fs.createWriteStream(dir+rootFileName+date+'.zip'));
    }
}

function process(err, xml, collection, callback) {
    if( err ) console.log(err);

    var active = getActive(xml.Grants.FundingOppSynopsis);
    var items = [];
    for( var i = 0; i < active.length; i++ ) {
        var item = createItemFromOpp(active[i]);
        items.push(item);
    }

    // Nice debug info
    //console.log(xml.Grants.FundingOppSynopsis.length);
    //console.log(items.length);
    //console.log(unknowns);

    removeBlackListItems(items);
    insert(collection, items, callback);
}

function insert(collection, items, callback) {
    async.eachSeries(
        items,
        function(item, next){

            item.id = md5(item.link);
            item.md5 = md5(JSON.stringify(item));

            collection.findOne({link: item.link}, function(err, mongoItem) {
                if( !mongoItem ) {
                    console.log('INSERTING: '+item.fundingOppNumber);
                    upsert(item, collection, next); // new
                } else if( item.md5 != mongoItem.md5 ) {
                    console.log('UPDATING: '+item.fundingOppNumber);

                    // set the last updated time
                    item['lastUpdated'] = new Date();

                    /* debugging
                        for( var key in obj ) {
                        var st1 = JSON.stringify(obj[key]);
                        var st2 = JSON.stringify(item[key]);
                        if( st1 != st2 ) {
                            console.log('  --new['+key+']: '+st1);
                            console.log('  --old['+key+']: '+st2);
                        }
                    }*/

                    upsert(item, collection, next); // update
                } else {
                    //console.log('skipping: '+item.fundingOppNumber);
                    next(); // no changes
                }
            });
        },
        function(err){
            clean(items, collection, function(){
                if( callback ) callback(err);
            });
        }
    );
}

function clean(items, collection, callback) {
    var links = [];
    for( var i = 0; i < items.length; i++ ) {
        links.push(items[i].link);
    }

    collection.remove(
        {
            catalogName : 'grants.gov',
            link : { '$nin' : links }
        },
        function( err, resp ) {
            if( err ) console.log(err);
            console.log('REMOVED: '+resp);
            callback();
        }
    )
}  

function upsert(item, collection, next) {
    collection.update(
        {link: item.link}, 
        item, 
        {upsert: true, w: 1}, 
        function(err, result) {
            next();
        }
    );
}

function removeBlackListItems(opps) {
    for( var i = opps.length-1; i >= 0; i-- ) {
        if( opps[i].office && config.blacklist.organizations.indexOf(opps[i].office) != -1 ) {
            opps.splice(i, 1);
            continue;
        }


        for( var j = 0; j < config.blacklist.titleWords.length; j++ ) {
            if( opps[i].title.indexOf(config.blacklist.titleWords[j]) != -1 ) {
                opps.splice(i, 1);
                break;
            }
        }
    }
}

function createItemFromOpp(obj) {
    var item = {};

    // map attributes
    for( var key in etlConfig.map ) {
        if( hasAttribute(obj, key) ) {
            item[etlConfig.map[key]] = obj[key][0];
            delete obj[key];
        }
    }

    // set link
    // TODO: should this be fundingOppUrl?
    item.link = applyUrl+item.fundingOppNumber;

    // set contact information
    if( hasAttribute(obj, 'AgencyContact') ) {
        item.contact = obj.AgencyContact[0]._;
        delete obj.AgencyContact;
    }

    // set the obtain Funding text
    if( hasAttribute(obj, 'ObtainFundingOppText') ) {
        item.obtainFundingOppText = obj.ObtainFundingOppText[0]._;
        delete obj.ObtainFundingOppText;
    }
    
    // set category and fundingActivityCategory
    if( hasAttribute(obj, 'FundingActivityCategory') ) {
        item.category = [];
        item.fundingActivityCategory = [];
        for( var i = 0; i < obj.FundingActivityCategory.length; i++ ) {
            var id = obj.FundingActivityCategory[i];
            var cat = config.categories[id];

            item.fundingActivityCategory.push(id);
            if( !cat ) continue;

            var name = cat.wgca.length > 0 ? cat.wgca : cat.grantsGov;
            if( item.category.indexOf(name) == -1 ) {
                item.category.push(name);
            }
        }
        
        delete obj.FundingActivityCategory;
    }

    // static values
    item.catalogName = 'grants.gov';
    item.fundingSource = 'Federal';

    // set the assistance types
    if( hasAttribute(obj, 'FundingInstrumentType') ) {
        item.assistanceType = [];
        item.fundingInstrumentType = [];

        for( var i = 0; i < obj.FundingInstrumentType.length; i++ ) {
            var id = obj.FundingInstrumentType[i];
            var type = config.assistanceTypes[id] || 'Other';

            if( item.assistanceType.indexOf(type) == -1 ) {
                item.assistanceType.push(type);
            }
            item.fundingInstrumentType.push(id);
        }

        delete obj.FundingInstrumentType;
    }

    // set the eligibleApplicants
    // TODO: eligibleApplicants should 'bubble' and add parent categories if they exist
    if( hasAttribute(obj, 'EligibilityCategory') ) {
        item.eligibilityCategory = [];
        item.eligibleApplicants = [];

        for( var i = 0; i < obj.EligibilityCategory.length; i++ ) {
            var id = parseInt(obj.EligibilityCategory[i])+'';
            var app = config.eligibleApplicants[id];

            item.eligibilityCategory.push(id);
            if( !app ) continue;
            
            if( item.eligibleApplicants.indexOf(app.wgca) == -1 ) {
                item.eligibleApplicants.push(app.wgca);
            }
        }

        delete obj.EligibilityCategory;
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
    for( var i = 0; i < etlConfig.dates.length; i++ ) {
        if( item[etlConfig.dates[i]] ) {
            item[etlConfig.dates[i]] = dateStrToDate(item[etlConfig.dates[i]]);
        }
    }

    // parse ints, make sure they are ints
    for( var i = 0; i < etlConfig.numberic.length; i++ ) {
        if( !item[etlConfig.numberic[i]] ) continue;

        item[etlConfig.numberic[i]] = parseInt(item[etlConfig.numberic[i]]);
        if( isNaN(item[etlConfig.numberic[i]]) ) {
            delete item[etlConfig.numberic[i]];
        }
    }

    // remove ignore attributes
    for( var i = 0; i < etlConfig.ignore.length; i++ ) {
        if( obj[etlConfig.ignore[i]] ) {
            delete obj[etlConfig.ignore[i]];
        }
    }

    // keep track of attributes we are not handling
    // handy for debugging schema changes
    for( var key in obj ) {
        if( unknowns.indexOf(key) == -1 ) unknowns.push(key);
    }

    // process WCGA controlled vocabularies
    vocab.process(item);

    return item;
}

// helper for grabbing attr
function hasAttribute(obj, attr) {
    if( obj[attr] === undefined ) return false;
    if( obj[attr].length == 0 ) return false;
    return true
}

// Get the active Grants (not expired)
function getActive(opportunities) {
    var active = [], i, date;
    var now = new Date().getTime();

    for( i = 0; i < opportunities.length; i++ ) {
        if( !opportunities[i].ApplicationsDueDate ) continue;

        date = opportunities[i].ApplicationsDueDate;
        if( date.length == 0 ) continue;

        date = dateStrToDate(date[0]);
        if( date.getTime() > now ) active.push(opportunities[i]);
    }
    return active;
}


// read from the zip file
function readCache(date, process, collection, callback) {
    fs.createReadStream(dir+rootFileName+date+'.zip')
      .pipe(unzip.Parse())
      .on('entry', function (entry) {
        var fileName = entry.path;
        var type = entry.type; // 'Directory' or 'File'
        var size = entry.size;
        if ( fileName.match(/.*.xml$/) ) {
          var xml = '';
          entry.on('data', function(data){
            xml += data;
          });
          entry.on('end', function(){
            parseXml(xml, process, collection, callback);
          });
        } else {
          entry.autodrain();
        }
    });
}

// parse xml lib wrapper
function parseXml(xml, process, collection, callback) {
    parseString(xml, function (err, result) {
        process(err, result, collection, callback);
    });
}

// check if the file has already be downloaded
function checkCache(date) {
    if( !fs.existsSync(dir) ) {
        fs.mkdirSync(dir);
    }

    // TODO, add cleanup hear.  Only store ... last 5?

    if( !fs.existsSync(dir+rootFileName+date+'.zip') ) {
        return false;
    }

    return true;
}

// parse Grants.gov fubar date string
function dateStrToDate(date) {
    return new Date(
        parseInt(date.substring(4,8)),
        parseInt(date.substring(0,2)),
        parseInt(date.substring(2,4))
    );
}

// clean up data dir, keep at most 4 snapshots
function cleanUpZips() {
    var files = fs.readdirSync(dir);
    if( files.length < 5 ) return; 

    var zips = [];
    for( var i = 0; i < files.length; i++ ) {
        if( files[i].match(/GrantsDBExtract.*zip/) ) {
            var t = files[i].replace(/\D/g,'');
            zips.push({
                name : files[i],
                date : new Date(
                    parseInt(t.substring(0,4)),
                    parseInt(t.substring(4,6)-1),
                    parseInt(t.substring(6,8))
                ).getTime()
            });
        }
    }

    zips.sort(function(a, b){
        if( a.date > b.date ) return -1;
        if( a.date < b.date ) return 1;
        return 0;
    });

    for( var i = 4; i < zips.length; i++ ) {
        fs.unlinkSync(dir+zips[i].name);
    }
}
exports.cleanUpZips = cleanUpZips;


