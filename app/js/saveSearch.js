
WCGA.saveSearch = (function() {

    // helper function from search
    var isZip;
    var searchCount = 0;

    function init(isZipHelper) {
        isZip = isZipHelper

        $('#save-search-btn').on('click', showSavePopup);
        $('#saveSearchPopup').modal({show: false});
        $('#save-search-confirm').on('click', saveSearch);
        $('#remove-save-search-btn').on('click', removeSearch);

        $(window).bind("search-update-event", function(e, results){
            var searches = getSavedSearches();
            
            if( !searches ) {
                $('#remove-save-search-btn').hide();
                $('#save-search-btn').show();
                return;
            }

            var query = MQE.getCurrentQuery();
            
            // remove post date query if there is one
            for( var i = 0; i < query.filters.length; i++ ) {
                var key = Object.keys(query.filters[i])[0];
                if( key == 'postDate' ) {
                    query.filters.splice(i, 1);
                    break;
                }
            }

            query = query.text+'/'+JSON.stringify(query.filters);
            var savedSearch = null;
            for( var key in searches ) {
                if( searches[key].indexOf(query) > -1 ) {
                    savedSearch = key;
                }
            }

            if( savedSearch ) {
                $('#remove-save-search-btn').show().attr('name', savedSearch);
                $('#save-search-btn').hide();
            } else {
                $('#remove-save-search-btn').hide();
                $('#save-search-btn').show();
            }

        });

        
        // set current saved searches
        var searches = getSavedSearches();
        if( !searches ) return;

        for( var key in searches ) {
            addSearch(key, searches[key]);
        }

        $('#current-saved-search').show();
    }

    function addSearch(name, urlQuery) {
        name = name.replace(/"/g,"'");

        var ele = $('<div id="saved-search-'+searchCount+'" class="saved-search-list-item" name="search-'+name+'">' + 
                '<div class="saved-search-result-title">'+name+'</div><div class="saved-search-result">Loading...</div>'+
        '</div>');

        ele.on('click', function(){
            var query = urlQuery.split('/');
            for( var i = 1; i < query.length; i++ ) {
                query[i] = encodeURIComponent(query[i]);
            }

            window.location = query.join('/');
        }).on('mouseover', function(){
            var query = urlQuery.split('/');
            var search = MQE.getSearchObject(query);

            var html = createHTMLList(search);
            var offset = ele.offset();

            $('#current-saved-search-list-preview')
                .css('top', offset.top).css('left', offset.left+ele.width()+25)
                .html(html)
                .show();
        }).on('mouseout', function(){
            $('#current-saved-search-list-preview').hide();
        });

        $('#current-saved-search-list').append(ele);

        // now query for counts
        var query = urlQuery.split('/');
        var search = MQE.getSearchObject(query);
        var url = MQE.getRestUrl(search).replace(/rest\/query/,'rest/counts');

        $.get(url, function(resp){
            var html = 'Total Items: '+resp['default']+'<br />'+
                '<span class="new"><i class="fa fa-star-o"></i> New</span> Items: '+resp['new'];
            ele.find('.saved-search-result').html(html);
        });

        searchCount++;
    }

    function saveSearch() {
        var name = $('#save-search-name').val();
        if( name.length == 0 ) return alert('Please provide a name to reference this search by');

        searches = getSavedSearches() || {};
        searches[name] = $('#save-search-value').val();
        $('#save-search-value').val('');

        addSearch(name, searches[name]);
        window.localStorage.setItem('wcgaSavedSearch', JSON.stringify(searches));

        $('#current-saved-search').show();

        $('#remove-save-search-btn').show().attr('name', name);
        $('#save-search-btn').hide();

        $('#saveSearchPopup').modal('hide');
    }

    function showSavePopup() {
        var query = MQE.getCurrentQuery();
        query.page = 0;

        var html = createHTMLList(query);

        $('#save-search-content').html(html);
        $('#save-search-value').val(decodeURIComponent(MQE.queryToUrlString(query)));

        $('#saveSearchPopup').modal('show');
    }

    function createHTMLList(query) {
        var html = '<ul class="list-group" style="margin:0">';
        if( query.text.length > 0 ) html += '<li class="list-group-item"><b>Keywords:</b> <span class="light-gray">'+query.text+'</span></li>';
        else html += '<li class="list-group-item"><b>Keywords:</b> <span class="light-gray">[None]</span></li>';

        for( var i = query.filters.length - 1; i >= 0; i-- ) {
            var label = Object.keys(query.filters[i])[0];
            value = query.filters[i][label];

            label = WCGA.labels.filters[label] ? WCGA.labels.filters[label] : label;

            var zips = isZip(query.filters[i]);
            if( zips ) {
                label = 'Zip Codes';
                value = zips.join(', ');

            // due to nature of save search results, we don't want to store this flag
            } else if ( label == 'postDate' ) {
                query.filters.splice(i,1);
                continue;
            }

            html += '<li class="list-group-item"><b>'+label+':</b> '+
                    '<span class="light-gray">'+value+'</span></li>';
        }

        html += '</ul>';
        return html;
    }

    function removeSearch() {
        var name = $(this).attr('name');

        var searches = getSavedSearches();
        if( !searches ) return;

        delete searches[name];
        window.localStorage.setItem('wcgaSavedSearch', JSON.stringify(searches));
        $('div[name="search-'+name+'"]').remove();

        if( Object.keys(searches).length == 0 ) {
            $('#current-saved-search').hide();
        }

        $('#remove-save-search-btn').hide();
        $('#save-search-btn').show();
    }

    function getSavedSearches() {
        var searches = window.localStorage.getItem('wcgaSavedSearch');
        if( !searches ) return null;

        searches = JSON.parse(searches);

        if( Object.keys(searches).length == 0 ) return null;
        return searches;
    }

    return {
        init: init
    }

})();