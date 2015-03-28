/**
    add category bubbling
**/
var schema = require('../../lib/schema.json');

var bubble = {};

// create a lookup object for the attribute 'bubbling'
bubble.eligibleApplicants = {};
for( var key in schema.eligibleApplicants ) {
    for( var i = 0; i < schema.eligibleApplicants[key].length; i++ ) {
        bubble.eligibleApplicants[schema.eligibleApplicants[key][i]] = key;
    }
}

bubble.category = {};
for( var key in schema.category ) {
    for( var i = 0; i < schema.category[key].length; i++ ) {
        bubble.category[schema.category[key][i]] = key;
    }
}

exports.process = function(item) {

    for( var key in bubble ) {
        if( !item[key] ) continue;

        for( var i = 0; i < item[key].length; i++ ) {
            if( bubble[key][item[key][i]] ) {
                var parent = bubble[key][item[key][i]];
                
                if( item[key].indexOf(parent) == -1 ) {
                    item[key].push(parent);
                }
            }
        }
    }
}