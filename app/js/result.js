Handlebars.registerHelper('ifCond', function(v1, options) {
  if( v1 !== undefined && v1 !== '') {
    return options.fn(this);
  }
  return options.inverse(this);
});

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
		
		$(window).bind('result-update-event', function(e, result, error){
			if( error ) {
				$('#badness').show();
				$('#result').hide();
				return;
			}

			$('#badness').hide();
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
		
		$('#result').html(getResultHtml(result));
		
		$('.result-back-btn').on('click', function(){
			$(window).trigger('back-to-search-event');
		});
	}


	function getResultHtml(result) {
		var dataTemplate = {
			cUrl : window.location.href,
			title : result.title || '',
			link  : result.link || '',
			description : result.description ? result.description.replace(/\n/g,'<br />') : '',
			assistanceType : result.assistanceType ? result.assistanceType.join(', ') : 'Unknown',
			organization : result.organization || '',
			contact : result.contact || '',
			CFDANumber : result.CFDANumber || '',
			fundingOppNumber : result.fundingOppNumber || '',
			dueDate : formatDate(result.dueDate),
			office : result.office,
			category : result.category ? result.category.join('<br />') : '',
			costSharing : result.costShareText || '',
			eligibleApplicants : result.eligibleApplicants ? result.eligibleApplicants.join('<br />') : '',
			additionalEligibilityInfo : result.additionalEligibilityInfo ? result.additionalEligibilityInfo.replace(/\n/g,'<br />') : ''
		}

		// TODO: regex replace urls
		//dataTemplate.description = dataTemplate.description.replace(/(http:\/\/.)/g, '$1 ' )

		// set amount
		if( dataTemplate.minAmount !== undefined && result.maxAmount !== undefined ) {
			dataTemplate.amount = formatDollars(result.minAmount)+' - '+formatDollars(result.maxAmount);
		} else if ( result.awardAmountText !== undefined ) {
			dataTemplate.amount = result.awardAmountText;
		} else {
			dataTemplate.amount = 'Unknown';
		}

		// set the ical url
		dataTemplate.ical = '/rest/ical?title=' + encodeURIComponent(dataTemplate.title) +
			'&dueDate=' + encodeURIComponent(result.dueDate) +
			'&url=' + encodeURIComponent(window.location.href);

		return resultTemplate(dataTemplate);
	}

	function formatDate(date) {
		if( !date ) return '';
		date = new Date(date);

		return [
			date.getMonth()+1,
			date.getDate(),
			date.getYear()+1900
		].join('/');
	}

	function formatDollars(amount) {
		if( !amount ) return '$0';
		if( typeof amount != 'string' ) amount = amount+'';

		amount = amount.split('');
		var c = 0;
		for( var i = amount.length-1; i >= 0; i-- ) {
			c++;
			if( c % 3 == 0 && i != amount.length-1 ) amount.splice(i,0,',');
		}
		return '$'+amount.join('');
	}

	
	return {
		init : init,
		updateResult : updateResult,
		getResultHtml : getResultHtml,
		onLoad : onLoad
	}
	
})();