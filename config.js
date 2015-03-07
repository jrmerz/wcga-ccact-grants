
exports.debug = true;

exports.node = 'node';

exports.dev = true;

exports.db = {
	// start command for mongo
	initd           : "mongod --port 27017",

	// connection string for the database, includes database name
	url             : "mongodb://localhost:27017/wcga",

	
	// collection where the queryable items are stored
	mainCollection  : "grants",


    indexedFilters : ['category','fundingSource','eligibleApplicants','assistanceType',
    					'awardAmountText','deadlineText'],  

    // currently MQE only allows one sort option, place the attribute you wish to sort on here
    sortBy            : 'title',
    
    // currently Mongo only allows the creation of text search on one attribute.  MQE will
    // combine all filters listed below into a single attribute that will be used for
    // the text search index
    textIndexes       : ['title','description','organization','office','category',
    					'fundingSource','eligibleApplicants','assistanceType','obtainFundingOppText'],

    blacklist : ['_id', 'md5']
}


exports.server = {
	host : "localhost",
	
	// port outside world goes to.  most likely 80
	remoteport : 80,
	
	// local port on machine
	localport : 3003,
	
	// remote hosts that are allowed to access this sites mqe
	allowedDomains : ["testnode.com","localhost","192.168.1.113"],
	
	script : "/Users/jrmerz/dev/personal/wcga-ccact-grants/server.js"
}