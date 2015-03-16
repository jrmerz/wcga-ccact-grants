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
                "<br /><a class='btn btn-link'>My Suggestions</a></div>");
        $('#add-user').append(userPanel);

        widget = new WCGA.WizardPanel(true);
        widget.init();

        $('#add-root').append(widget.getPanel());

        $('.add-reset').on('click', widget.reset);

        widget.initEdit();

        //setTimeout(function(){
        //    updateChart({});
        //}.bind(200));
    }

    function onShow() {
        chart = '';
    }


    return {
        init : init,
        onShow : onShow
    }
})();