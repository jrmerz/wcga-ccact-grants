var WCGA = {};

WCGA.admin = (function(){

    function init() {
        reload();
    }

    function reload() {
        $.get('/rest/suggestions?status='+$('#status').val(), function(resp){
            console.log(resp);
        });
    }

    return {
        init : init,
        reload : reload
    }

})();

$(window).on('ready', function(){
    debugger;
    WCGA.admin.init();
});