WCGA.add = (function() {

    var widget;
    var dt;
    var chart;

    var login = $(
        '<div style="text-align:center; padding-top:100px; border-top: 1px solid #ccc">'+
            '<div class="panel panel-primary" style="display:inline-block; text-align:left">'+
                '<div class="panel-heading">'+
                    '<h3 class="panel-title">Login</h3>'+
                '</div>'+
                '<div class="panel-body" style="text-align: center">'+
                    '<div><a class="btn btn-default" href="/auth/google">Login with Google</a></div>'+
                    '<div class="help-text">To suggest a grant you must first login in a Google Account.</div>'+
                '</div>'+
            '</div>'+
        '</div>'
    );

    function init() {
        if( WCGA.user.error ) {
            $('#add-root').append(login);
            return;
        }

        var userPanel = $('<div>Welcome, '+WCGA.user.displayName+" <a href='/logout' class='btn btn-link pull-right'>Signout</a>"+
                "<br /><a class='btn btn-link' id='my-suggestions-show'>My Suggestions</a></div>");
        $('#add-user').append(userPanel);
        $('#my-suggestions-show').on('click', showMySuggestions);

        widget = new WCGA.WizardPanel(true);
        widget.init();

        $('#add-root').append(widget.getPanel());

        $('.add-reset').on('click', widget.reset);

        widget.initEdit();

        // init my suggestions popup
        $('#my-suggestions').modal({show: false});
    }

    function showMySuggestions() {
        $('#my-suggestions').modal('show');
        $('#my-suggestions-content').html('<i class="fa spinner spin"></i> Loading...');

        $.get('/rest/mySuggestions', function(resp){
            if( resp.error ) {
                $('#my-suggestions-content').html('Server error loading suggestions :(');
                return;
            }

            if( resp.length == 0 ) {
                $('#my-suggestions-content').html('You have no suggestions');
                return;
            }

            var html = '<ul class="list-group">';
            for( var i = 0; i < resp.length; i++ ) {
                html += 
                    '<li class="list-group-item">'+
                        '<span class="pull-right label '+getLabelClass(resp[i].status)+'">'+resp[i].status+'</span>'+
                        resp[i].title+'<br />'+
                        '<a href="'+resp[i].link+'" target="_blank">'+resp[i].link+'</a>'+
                    '</li>';
            }
            html += '</ul>';
            $('#my-suggestions-content').html(html);
        });
    }

    function getLabelClass(status) {
        if( status == 'rejected' ) return 'label-danger';
        if( status == 'approved' ) return 'label-success';
        return '';
    }

    function onShow() {
        chart = '';
    }


    return {
        init : init,
        onShow : onShow
    }
})();