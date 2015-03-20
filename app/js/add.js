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
                    '<div style="margin-bottom: 15px"><a class="btn btn-default" href="/auth/google"><i class="fa fa-google"></i> Login with Google</a></div>'+
                    //'<div><a class="btn btn-default" href="/auth/yahoo"><i class="fa fa-yahoo"></i> Login with Yahoo</a></div>'+
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
                    '<li class="list-group-item" grant="'+resp[i]._id +'">'+
                        '<span class="pull-right label '+getLabelClass(resp[i].status)+'">'+resp[i].status+'</span>'+
                        resp[i].title+'<br />'+
                        '<a href="'+resp[i].link+'" target="_blank">'+resp[i].link+'</a>'+
                        '<div style="text-align:right"><a class="btn btn-danger remove-suggest-btn" style="font-size: 16px" grant="' + 
                            resp[i]._id +'"><i class="fa fa-trash"></i></a></div>'+
                    '</li>';
            }
            html += '</ul>';
            $('#my-suggestions-content').html(html);

            $('#my-suggestions-content').find('.remove-suggest-btn').on('click', function(){
                if( !confirm('Are you sure you want to remove this suggestion?') ) return;

                var btn = $(this);
                btn.addClass('disabled').html('<i class="fa fa-spinner fa-spin"></i>');
                $.get('/rest/removeSuggestion?id='+btn.attr('grant'), function(resp){
                    btn.removeClass('disabled').html('<i class="fa fa-trash"></i>');

                    if( resp.error ) return alert('Error removing grant :(');

                    alert('Success!');
                    $('li[grant="'+btn.attr('grant')+'"]').remove();
                });
                
            });
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