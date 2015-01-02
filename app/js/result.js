WCGA.result = (function() {
	
	var resultTemplate = null;
	
	var loaded = false;
	var waiting = null;
	
	var loadHandlers = [];
	var ignoreAttrs = ['_id', 'count', 'lengths'];
	
	function init() {
		$('#result').load('/result.handlebars', function() {
			var source = $("#result-template").html();
			resultTemplate = Handlebars.compile(source);
			
			loaded = true;
			
			if( waiting != null ) updateResult(waiting);
			
			for( var i = 0; i < loadHandlers.length; i++ ) {
				var f = loadHandlers[i];
				f();
			}
		});
		
		$(window).bind('result-update-event', function(e, result){
			console.log(result);
			updateResult(result);
		});
	}
	
	// fires when template is loaded
	function onLoad(handler) {
		if( resultTemplate == null ) loadHandlers.push(handler);
		else handler();
	}


	function updateResult(result) {
		if( !loaded ) {
			waiting = result;
			return;
		}
		
		var resultPanel = $("#result");

		result.ecosis._title = getTitle(result);

		resultPanel.html(getResultHtml(result));
		

		var metadata = '<table class="table">';
		for( var key in result ) {
			if( ignoreAttrs.indexOf(key) == -1 && result[key] && (result[key].length / result.ecosis.spectra_count) < .05 ) {
				var label = WCGA.labels.filters[key] ? WCGA.labels.filters[key] : key;

				metadata += "<tr><td>"+label+"</td><td><div style='max-height:100px;overflow:auto'>"+wrapFilterLinks(key, result[key])+"</div></td></tr>";
			}
		}
		metadata += '</table>';

		resultPanel.find("#result-metadata").html(metadata);

		$("#result-back-btn").on('click', function(){
			$(window).trigger("back-to-search-event");
		});

		// set nav handler
		$('a[goto]').on('click', function(){
			var heading = $(this).attr('goto');
			if( !heading || heading == '' ) return;

			$('body,html').animate({scrollTop: $('#'+heading).offset().top-120}, 500);
		});
	}


	function wrapFilterLinks(key, values) {
		var links = '';
		for( var i = 0; i < values.length; i++ ) {
			links += wrapFilterLink(key, values[i]);
			if( i < values.length-1 ) links += ', ';
		}
		return links;
	}

	function wrapFilterLink(key, value, icon) {
		if( value.length > 30 ) return value;

		var q = MQE.getCurrentQuery();
		q.text = '';
		q.page = 0;
		var f = {};
		f[key] = value;
		q.filters = [f];
		return '<a href="'+MQE.queryToUrlString(q)+'" title="Filter by '+key+'='+value+'">'+
					(icon ? '<i class="fa fa-filter"></i> ' : '')+value+'</a>';
	}
	
	function getResultHtml(result) {

		result.isChecked = ESIS.compare.selected(result._id);

		return resultTemplate(result);
		
	}

	
	return {
		init : init,
		updateResult : updateResult,
		getResultHtml : getResultHtml,
		onLoad : onLoad
	}
	
})();