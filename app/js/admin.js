var WCGA = {};

WCGA.admin = (function(){

    var currentStatus = '';
    var statusMap = {};
    var ignoreVars = ['_id', 'status', 'history', 'catalogName', 'suggestedBy', 'inserted', 'link', 'title'];
    var labelMap = {
        name : 'Contact Name',
        email : 'Contact Email'
    }

    function init() {
        $('#username').text(WCGA.user.displayName);
        $('#status').on('change', reload);

        $('a[role="tab"]').on('click', function() {
            $('a[role="tab"]').parent().removeClass('active');
            $(this).parent().addClass('active')

            $('.tab-panel').hide();
            $('#'+$(this).attr('panel')).show();

            if( $(this).attr('panel') == 'blacklisted' ) loadBlacklist();
        });

        reload();
    }

    function loadBlacklist() {
        var panel = $('#blacklisted');
        panel.html('<i class="fa fa-spinner fa-spin"></i> Loading blacklist...');

        $.get('/rest/getBlacklist', function(resp){
            if( resp.error ) {
                return panel.html('<div class="alert alert-danger">Error loading blacklist :(</div>');
            }
            if( resp.length == 0 ) {
                return panel.html('<div class="alert alert-info">No blacklisted items</div>');
            }

            var html = '<ul class="list-group">';
            for( var i = 0; i < resp.length; i++ ) {
                html += '<li class="list-group-item">' +
                            '<h4>'+resp[i].title+'</h4>' +
                            '<div><b>Reason:</b> '+resp[i].reason+'</div>' +
                            '<div>By '+resp[i].user+' on '+(new Date(resp[i].timestamp).toLocaleDateString())+'</div>' +
                        '</li>';
            }

            panel.html(html+'</ul>');
        });
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
                '<div class="panel '+getStatusClass(currentStatus)+'" style="margin: 10px 20px" item="'+item._id+'">' +
                    '<div class="panel-heading">'+
                        item.title+' '+
                        (item.history.length > 0 ? '<span class="pull-right updated-by">&nbsp;By '+item.history[item.history.length-1].user+'</span>' : '')+
                        createSelector(item._id, currentStatus)+
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
        $('#response').find('.status-selector').on('change', updateStatus);
    }

    function createSelector(id, status) {
        if( status ) statusMap[id] = status;
        else status = statusMap[id];

        return '<span class="pull-right"><select class="status-selector" item="'+id+'" >'+
            '<option value="pending" '+(status == 'pending' ? 'selected' : '')+'>Pending</option>'+
            '<option value="approved" '+(status == 'approved' ? 'selected' : '')+'>Approved</option>'+
            '<option value="rejected" '+(status == 'rejected' ? 'selected' : '')+'>Rejected</option>'+
        '</select></span>';
    }

    function updateStatus() {
        var $this = $(this);

        var newStatus = $this.val();
        var id = $this.attr('item');

        var parent = $this.parent()
        parent.html('<i class="fa fa-spinner fa-spin"></i> Changing...');

        $.get('/rest/setStatus?id='+id+'&status='+newStatus, function(resp) {
            if( resp.error ) {
                console.log(resp);
                alert('Server error setting status :(');
                parent.html(createSelector(id));
                parent.find('status-selector').on('change', updateStatus);
                return;
            }

            parent.html(createSelector(id, newStatus));
            parent.find('.status-selector').on('change', updateStatus);

            $('.panel[item="'+id+'"]').attr('class', 'panel '+getStatusClass(newStatus));
            $('.panel[item="'+id+'"] .updated-by').html('&nbsp;By '+WCGA.user.email);
        });
    }

    function getStatusClass(status) {
        if( status == 'pending' ) return 'panel-default';
        if( status == 'approved' ) return 'panel-primary';
        if( status == 'rejected' ) return 'panel-danger';
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