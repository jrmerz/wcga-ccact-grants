WCGA.add = (function() {

    var widget;
    var dt;
    var chart;

    function init() {
        widget = new WCGA.WizardPanel(true);
        widget.init();
        $('#add-root').append(widget.getPanel());

        $('.add-reset').on('click', widget.reset);

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