WCGA.search = (function() {
	
	// handle bar template layouts
	var RESULT_TEMPLATE = [
	    '<div class="search-result-row animated fadeIn">',
	    	'<h4>{{{new}}}<a href="#result/{{id}}">{{title}}</a></h4>',
	    	'<div class="row">',
	    		'<div class="col-md-3">',
	    			'<div style="min-height: 75px"><b>Application Cycle</b><br /> <span style="color:#888">{{dueDateNice}}</span></div>',
	    			'<div style="min-height: 75px"><b>Award Amount</b><br /> <span style="color:#888">{{awardAmountNice}}</span></div>',
	    		'</div>',
	    		'<div class="col-md-9">',
	    			'<div style="color:#333">{{description}}</div>',
	    			'<div><a href="{{link}}" class="btn btn-link" target="_blank"><i class="fa fa-external-link"></i> Link to Site</a></div>',
	    		'</div>',
	    	'</div>',
	    '</div>'
	].join('');
	var TITLE_TEMPLATE = "Search Results: <span style='color:#888'>{{start}} to {{end}} of {{total}}</span>";
	
	// template functions
	var rowTemplate;
	var titleTemplate;
	

	var openFilters = [];
	var staticFilters = {};
	var activeZipcodes = [];
	
	function init() {
		
		rowTemplate = Handlebars.compile(RESULT_TEMPLATE);
		titleTemplate = Handlebars.compile(TITLE_TEMPLATE);
		
		$(window).bind("search-start-event", function(e, results){
			_loading(true);
		});

		$(window).bind("search-update-event", function(e, results){
			_loading(false);
			_updateResultsTitle(results);
			updateResults(results);
			_updateFilters(results); // this should always be before adding active filters
			_updateActiveFilters(results);
			_updatePaging(results);
		});
		
		// set search handlers
		$("#search-btn").on('click', function(){
			_search();
		});
		$("#search-text").on('keypress', function(e){
			if( e.which == 13 ) _search();
		});

		// zipcode controls
		$('#input-search-zipcode').on('focus', function(){
			$('#input-search-zipcode-help').show('slow');
		}).on('blur', function(){
			$('#input-search-zipcode-help').hide('slow');
		}).on('keypress', function(e){
			if( e.which == 13 ) _setZipcode();
		});
		$('#search-add-zipcode').on('click', _setZipcode);
		$('#search-clear-zipcode').on('click', _clearZipcode);

		// print button
		$('#print-btn').on('click', function(){
			var query = MQE.getCurrentQuery();
			query.page = 0;
			query.itemsPerPage = 100;

			window.open(MQE.queryToUrlString(query).replace(/search/, 'print'),'_blank','menubar=yes,location=yes,resizable=yes,scrollbars=yes,status=no')
		});

		// new filter control
		$('#filters-new').on('click', function(){
			if( $(this).is(':checked') ) _setNewFilter();
			else _removeNewFilter();
		});

		// save search controls
		WCGA.saveSearch.init(_isZipFilter);
	}

	function _setZipcode() {
		var query = MQE.getCurrentQuery();

		// remove current
		for( var i = 0; i < query.filters.length; i++ ) {
			if( _isZipFilter(query.filters[i]) ) {
				query.filters.splice(i,1);
				break;
			}
		}

		var zipcodes = $('#input-search-zipcode').val().replace(/\s/g,'').split(',');
		query.filters.push({
			'$or' : [ 
				{ zipcode : { '$in' : zipcodes }},
				{ zipcode : { '$exists' : false }}
			]
		});
		$('#input-search-zipcode').val('')
		query.page = 0;
		window.location = MQE.queryToUrlString(query);
	}

	function _clearZipcode() {
		var query = MQE.getCurrentQuery();

		var zipcode = null;
		for( var i = 0; i < query.filters.length; i++ ) {
			if( _isZipFilter(query.filters[i]) ) {
				zipcode = query.filters.splice(i,1);
				break;
			}
		}

		query.page = 0;
		if( zipcode ) window.location = MQE.queryToUrlString(query);
	}
	
	function _search() {
		var query = MQE.getCurrentQuery();
		query.page = 0;
		query.text = $("#search-text").val();
		window.location = MQE.queryToUrlString(query);
	}

	function _updateActiveFilters() {
		var query = MQE.getCurrentQuery();
		
		// make sure text box is always correct
		$("#search-text").val(query.text);
		
		var filterCategories = {
			assistanceType : 'All Assistance Types',
			eligibleApplicants : 'All Applicant Types',
			awardAmountText : 'All Funding Ranges',
			deadlineText : 'Any Deadline',
			category : 'All Categories'
		}

		for( var key in filterCategories ) {
			var arr = getCatActiveFilters(query.filters, key);

			if( arr.length == 0 ) {
				$('#filters-'+key).html('<ul style="list-style:none"><li class="light-gray">'+filterCategories[key]+'<li></ul>');
			} else {
				var html = '<ul style="list-style:none">';
				for( var i = 0; i < arr.length; i++ ) {
					var tmpQuery = MQE.getCurrentQuery();
					tmpQuery.page = 0;
					removeFilter(tmpQuery.filters, key, arr[i]);

					html += '<li><a href="' + MQE.queryToUrlString(tmpQuery).replace(/"/g,'\\"') + 
						'"><i class="fa fa-times"></i> '+arr[i][key]+'</a></li>'
				}
				$('#filters-'+key).html(html+'</ul>');
			}
		}

		_setActiveZips(query.filters);

		// set new checkbox
		$('#filters-new').prop('checked', false);
		for( var i = 0; i < query.filters.length; i++ ) {
			var key = Object.keys(query.filters[i])[0];
			if( key == 'postDate' ) {
				$('#filters-new').prop('checked', true);
				query.filters.splice(i,1);
				break;
			}
		}

		// add other filters
		var html = '<ul style="list-style:none">';
		for( var i = 0; i < query.filters.length; i++ ) {
			var key = Object.keys(query.filters[i])[0];

			var tmpQuery = MQE.getCurrentQuery();
			tmpQuery.page = 0;
			
			removeFilter(tmpQuery.filters, key, query.filters[i]);
			
			html += '<li><a href="' + MQE.queryToUrlString(tmpQuery).replace(/"/g,'\\"') + 
					'"><i class="fa fa-times"></i> '+query.filters[i][key]+'</a></li>'
		}
		if( query.filters.length == 0 ) html += '<li class="light-gray">None<li>';
		$('#filters-other').html(html+'</ul>');
	}

	function _setNewFilter() {
		var tmpQuery = MQE.getCurrentQuery();
		tmpQuery.page = 0;

		var lastMonth = new Date();
		lastMonth.setMonth(lastMonth.getMonth()-1);

		tmpQuery.filters.push({
			postDate : { $gte: lastMonth }
		});

		window.location = MQE.queryToUrlString(tmpQuery);
	}

	function _removeNewFilter() {
		var tmpQuery = MQE.getCurrentQuery();
		tmpQuery.page = 0;
		
		for( var i = 0; i < tmpQuery.filters.length; i++ ) {
			var key = Object.keys(tmpQuery.filters[i])[0];
			if( key == 'postDate' ) {
				tmpQuery.filters.splice(i, 1);
				break;
			}
		}
		window.location = MQE.queryToUrlString(tmpQuery);
	}

	function _setActiveZips(filters) {
		var hasZips = false;
		activeZipcodes = [];

		for( var i = 0; i < filters.length; i++ ) {
			var zips = _isZipFilter(filters[i]);
			if( !zips ) continue;

			filters.splice(i,1);
			activeZipcodes = zips;

			var html = '<ul style="list-style:none">';
			for( var i = 0; i < zips.length; i++ ) {
				html += '<li><a style="cursor:pointer" zip="'+zips[i]+'"><i class="fa fa-times" ></i> '+zips[i]+'</a></li>';
			}

			$('#filters-zipCodes').html(html+'</ul>');
			$('#filters-zipCodes a').on('click', _removeZip);
			hasZips = true;
			break;
		}

		if( !hasZips ) {
			$('#filters-zipCodes').html('<ul style="list-style:none"><li class="light-gray">Not Included<li></ul>');
		}
	}

	function removeFilter(filters, key, val) {
		for( var i = 0; i < filters.length; i++ ) {
			if( filters[i][key] == val[key] ) {
				filters.splice(i, 1);
				return;
			}
		}
	}

	function getCatActiveFilters(filters, cat) {
		var array = [];
		for( var i = filters.length - 1; i >= 0; i-- ) {
			var key = Object.keys(filters[i])[0];
			if( key == cat ) {
				array.push(filters[i]);
				filters.splice(i, 1);
			}
		}
		return array;
	}
	
	function _updateFilters(results) {
		var panel = $("#filter-nav").html("");
		
		// add the title
		panel.append($('<li class="nav-header">Narrow Your Search</li>'));
		panel.append($('<li class="divider"></li>'));
		
		var activeFilters = MQE.getCurrentQuery().filters;

		// first all active filters
		for( var i = 0; i < activeFilters.length; i++ ) {
			var key = Object.keys(activeFilters[i])[0];
			if( !results.filters[key] ) continue;

			var val = activeFilters[i][key];
			for( var j = results.filters[key].length - 1; j >= 0; j-- ) {
				if( results.filters[key][j].filter == val ) {
					results.filters[key].splice(j, 1);
				}
			}
		}
		
		// add filter blocks
		var c = 0;
		for( var key in results.filters ) {
			if( results.filters[key].length == 0 ) continue;
			
			
			var label = WCGA.labels.filters[key] ? WCGA.labels.filters[key] : key;
			
			var title = $("<li><a id='filter-block-title-"+key.replace(/\s/g,"_")+"' class='search-block-title'>"+label+"</a></li>");
			
			var display = "";
			if( openFilters.indexOf(key) > -1 ) display = "style='display:block'" 
			var block = $("<ul id='filter-block-"+key.replace(/\s/g,"_")+"' class='filter-block' "+display+"></ul>");
			
			for( var i = 0; i < results.filters[key].length; i++ ) {
				var item = results.filters[key][i];
				var query = MQE.getCurrentQuery();
				query.page = 0;

				var filter = {};
				filter[key] = item.filter;
				query.filters.push(filter);
				
				block.append($('<li><a href="'+MQE.queryToUrlString(query).replace(/"/g,'\\"')+'">'+item.filter+' ('+item.count+')</a></li>'));
			}
			
			title.append(block);
			panel.append(title);
			c++;
		}
		
		if( c == 0 ) {
			panel.append($("<div>No filters available for this search</div>"));
			return;
		}
		
		// add hide/show handlers for the blocks
		$(".search-block-title").on('click', function(e){
			var id = e.target.id.replace(/filter-block-title-/, '');
			var panel = $("#filter-block-"+id);
			
			if( panel.css("display") == "none" ) {
				panel.show('blind');
				openFilters.push(id);
			} else {
				panel.hide('blind');
				openFilters.splice(openFilters.indexOf(id),1);
			}
		});
	}
	
	function _updatePaging(results) {
		var tmpQuery = MQE.getCurrentQuery();
		var numPages = Math.ceil( parseInt(results.total) / tmpQuery.itemsPerPage );
		var cPage = Math.floor( parseInt(results.start+1) / tmpQuery.itemsPerPage );
		
		var buttons = [];
		
		// going to show 7 buttons
		var startBtn = cPage - 3;
		var endBtn = cPage + 3;
		
		if( endBtn > numPages ) {
			startBtn = numPages-7;
			endBtn = numPages;
		}
		if( startBtn < 0 ) {
			startBtn = 0;
			endBtn = 6;
			if( endBtn > numPages ) endBtn = numPages;
		}
		
		var panel = $(".search-paging-btns");
		panel.html("");
		
		// add back button
		if( cPage != 0 ) {
			tmpQuery.page = cPage-1;
			panel.append($('<li><a href="'+MQE.queryToUrlString(tmpQuery).replace(/"/g,'\\"')+'">&#171;</a></li>'));
		}
		
		for( var i = startBtn; i < endBtn; i++ ) {
			var label = i+1;
			tmpQuery.page = i;
			var btn = $('<li><a href="'+MQE.queryToUrlString(tmpQuery).replace(/"/g,'\\"')+'">'+label+'</a></li>');
			if( cPage == i ) btn.addClass('active');
			panel.append(btn);
		}
		
		// add next button
		if(  cPage != numPages-1 && numPages != 0 ) {
			tmpQuery.page = cPage+1;
			panel.append($('<li><a href="'+MQE.queryToUrlString(tmpQuery).replace(/"/g,'\\"')+'">&#187;</a></li>'));
		}
		
	}
	
	function _updateResultsTitle(results) {
		var end = results.end;
		if( results.total < end ) end = results.total;
		
		var start = parseInt(results.start)+1;
		if( end == 0 ) start = 0;
		
		
		$(".results-title").html(titleTemplate({
			start : start,
			end   : end,
			total : results.total
		}));
	}

	function _isZipFilter(filter) {
		if( filter['$or'] === undefined ) return false;
		if( !Array.isArray(filter['$or']) ) return false;

		var zips = [];
		for( var i = 0; i < filter['$or'].length; i++ ) {
			if( filter['$or'][i].zipcode === undefined ) {
				return false;
			} else if ( filter['$or'][i].zipcode['$in'] !== undefined ) {
				return filter['$or'][i].zipcode['$in'];
			}
		}
		return false;
	}

	function _removeZip(e) {
		var zip = e.currentTarget.getAttribute('zip');
		var query = MQE.getCurrentQuery();

		// remove current
		for( var i = 0; i < query.filters.length; i++ ) {
			if( _isZipFilter(query.filters[i]) ) {
				query.filters.splice(i,1);
				break;
			}
		}

		activeZipcodes.splice(activeZipcodes.indexOf(zip), 1);
		if( activeZipcodes.length > 0 ) {
			query.filters.push({
				'$or' : [ 
					{ zipcode : { '$in' : activeZipcodes }},
					{ zipcode : { '$exists' : false }}
				]
			});
		}

		query.page = 0;
		window.location = MQE.queryToUrlString(query);
	}
	
	function updateResults(results, panelId) {
		var panel = $(panelId || "#results-panel").html("");
		
		if( results.items.length == 0 ) {
			panel.append("<div style='font-style:italic;color:#999;padding:15px 10px'>No results found for your current search.</div>");
			return;
		}

		for( var i = 0; i < results.items.length; i++ ) {
			var item = results.items[i];

			panel.append(rowTemplate({
				id         : item.id,
				title       : item.title,
				description : (item.description.length > 500) ? item.description.substring(0,500) + '...' : item.description,
				link        : item.link,
				'new'       : _getNewHtml(item),
				dueDateNice : _getNiceDate(item.dueDate),
				awardAmountNice : _getNiceDollars(item.estimatedFunding),
			}));
		}
	}

	function _getNewHtml(item) {
		if( !item.postDate ) return '';

		var now = new Date();
		now.setMonth(now.getMonth()-1);

		var posted = new Date(item.postDate);
		

		if( now.getTime() < posted.getTime() ) {
			return '<span class="new"><i class="fa fa-star-o"></i> New</span> ';
		}
		return '';
	}

	function _getNiceDate(date) {
		if( !date ) return '';
		date = new Date(date);
		return [date.getMonth()+1,
				date.getDate(),
				date.getYear()+1900].join('/');
	}

	function _getNiceDollars(amount) {
		if( !amount ) return 'Unknown';

		var formatted = '';
		amount = (amount+'').split('');
		var c = 0;
		for( var i = amount.length-1; i >= 0; i-- ) {
			c++;
			if( c % 3 == 0 && i != 0) amount.splice(i,0,',');
		}

		return '$'+amount.join('');
	}

	function _hasFilter(item, key) {
		var filter = {};
		var tmpQuery = CERES.mqe.getCurrentQuery();
		filter[key] = item[key];
		for( var i = 0; i < tmpQuery.filters.length; i++ ) {
			if( tmpQuery.filters[i][key] && tmpQuery.filters[i][key] == item[key] ) return true;
		}
		return false;
	}
	
	function _createFilterUrl(key, value) {
		var tmpQuery = CERES.mqe.getCurrentQuery();
		var filter = {};
		filter[ESIS.filters[key] ? ESIS.filters[key] : key] = value;
		tmpQuery.page = 0;
		tmpQuery.filters.push(filter);
		return CERES.mqe.queryToUrlString(tmpQuery).replace(/"/g,'\\"');
	}

	var loadingTimer = -1;
	function _loading(loading) {
		if( loadingTimer != -1 ) clearTimeout(loadingTimer);

		if( loading ) {	
			loadingTimer = setTimeout(function(){
				loadingTimer = -1;
				$('#loading').show();
			}, 150);
		} else {
			loadingTimer = -1;
			$('#loading').hide();
		}
	}

	
	return {
		init : init,
		updateResults : updateResults
	}
})();
                   
                   
