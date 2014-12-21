var def = {
    'foo.bar' : 'bar'
}

exports.transform = function(org) {
    return org;

    var newObj = {}, val;
    for( var i = 0; i < def.length; i++ ) {
        val = getValue(org, def[i].old);
        if( val == null ) continue;

        setValue(newObj, val, def[i]['new'])
    }
    return newObj;
}

function getValue(obj, def) {
    for( var i = 0; i < def.length; i++ ) {
        if( obj[def] ) obj = obj[def];
        else return null;
    }
    return obj;
}

function setValue(obj, val, def) {
    for( var i = 0; i < def.length; i++ ) {
        if( i < def.length - 1 ) {
            if( !obj[def[i]] ) obj[def[i]] = {};
            obj = def[i];
        } else {
            obj[def[i]] = val;
        }
    }
}

// process the object definitions
var parsed = [];
for( key in def ) {
    parsed.push({
        'old' : key.split('.'),
        'new' : def[key].split('.')
    });
}
def = parsed;