var WCGA = {};

WCGA.admin = (function(){

    var currentStatus = '';
    var ignoreVars = ['_id', 'status', 'history', 'catalogName', 'suggestedBy', 'inserted', 'link', 'title'];
    var labelMap = {
        name : 'Contact Name',
        email : 'Contact Email'
    }

    function init() {
        $('#username').text(WCGA.user.displayName);
        $('#status').on('change', reload);

        reload();
    }

    function reload() {
        currentStatus = $('#status').val();
        $('#response').html('loading...');
        $.get('/rest/suggestions?status='+currentStatus, renderResponse);
    }

    function renderResponse(resp) {
        if( resp.error ) return $('#response').html('Error loading suggestions :(');

        if( resp.length == 0 ) {
            $('#response').html('No suggestions with status: <b>'+ currentStatus +'</b> found');
            return;
        }
        
        var html = '';
        for( var i = 0; i < resp.length; i++ ) {
            var item = resp[i];

            html += 
                '<div class="panel panel-primary" style="margin: 10px 20px">' +
                    '<div class="panel-heading">'+
                        item.title+' '+createSelector()+
                    '</div>'+
                    '<div class="panel-body">'+
                        '<div><a href="'+item.link+'" target="_blank">'+item.link+'</a></div>'+
                        '<div style="padding:10px">'+(item.description || 'No description provided')+'</div>'+
                        '<div>'+
                            '<ul class="list-group">';

            for( var key in item ) {
                if( ignoreVars.indexOf(key) != -1 ) continue;

                html += '<li class="list-group-item"><b>'+getLabel(key)+':</b> <span style="color:#888">'+item[key]+'</span></li>';
            }


            html += '</ul></div>';

            html += '<div style="margin-top: 10px">Suggested By: <a href="mailto:'+
                        item.suggestedBy+'">'+item.suggestedBy+'</a> on '+(new Date(item.inserted).toLocaleDateString())+'</div>'+
                    '</div>'+
                '</div>';
        }
        $('#response').html(html);
    }

    function createSelector() {
        return '<select class="pull-right">'+
            '<option value="pending">Pending</option>'+
            '<option value="approved">Approved</option>'+
            '<option value="rejected">Rejected</option>'+
        '</select>';
    }

    function getLabel(key) {
        if( labelMap[key] ) return labelMap[key];
        return key;
    } 

    return {
        init : init,
        reload : reload
    }

})();

$(document).on('ready', function(){
    WCGA.admin.init();
});