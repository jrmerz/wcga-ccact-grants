WCGA.print = (function() {

    function query(hash) {
        MQE.updateSearch(hash);

        $(window).bind("search-update-event", function(e, results){
            render(results);
        });
    }

    function render(results) {
        WCGA.search.updateResults(results, '#print-results');
    }

    return {
        query: query
    }
})();