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

	var currentResult = {};
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
			// double check page
			var page = window.location.hash.replace(/\/.*/,'');

			if( page.indexOf('result') == -1 ) return;

			if( error ) {
				$('#badness').show();
				$('#result').hide();
				return;
			}

			$('#badness').hide();
			updateResult(result);
		});

		if( WCGA.user && WCGA.user.admin ) {
			$('#blacklist-popup').modal({show: false});
			$('#blacklist-btn').on('click', blacklist);
		}
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

		currentResult = result;
		$('#result').html(getResultHtml(result));

		$('.result-back-btn').on('click', function(){
			$(window).trigger('back-to-search-event');
		});

		if( WCGA.user && WCGA.user.admin ) {
			var btn;
			if( result.catalogName == 'suggest' ) {
				var btnInner = $('<a class="btn btn-default"><i class="fa fa-trash"></i> Reject</a>').on('click', reject);
				btn = $('<div><div class="help-text">This is a suggested grant</div></div>');
				btn.append(btnInner);
			} else {
				btn = $('<a class="btn btn-default"><i class="fa fa-trash"></i> Remove</a>').on('click', showBlacklist);
			}


			$('#outer-blacklist')
				.append(btn)
				.show()
		}

		window.__mqe_lploaded = true;
		if( window.__mqe_lpready ) window.__mqe_lpready();
	}

	function reject() {
		if( !confirm('Are you sure you want to reject this grant?') ) return;

		$.get('/rest/setStatus?id='+currentResult.id+'&status=rejected', function(resp) {
			if( resp.error ) return alert('Server error rejecting grant :(');

			alert('Grant Rejected');
			window.location = '#search';
		});
	}

	function showBlacklist() {
		$('#blacklist-id').text(currentResult.id);
		$('#blacklist-title').text(currentResult.title);
		$('#blacklist-reason').val('');

		$('#blacklist-popup').modal('show');
	}

	function blacklist() {
		var reason = $('#blacklist-reason').val();
		if( !reason ) return alert('You must provide a reason');

		$('#blacklist-btn').addClass('disabled').html('<i class="fa fa-spinner fa-spin"></i> Blacklisting...');

		$.ajax({
			url : '/rest/blacklist',
			type : 'POST',
			data : {
				id : currentResult.id,
				title : currentResult.title,
				reason : reason
			},
			success : function(resp) {
				$('#blacklist-btn').removeClass('disabled').html('Remove');
				if( resp.error ) return alert('Server error blacklisting grant :(');

				alert('Success!');
				$('#blacklist-popup').modal('hide');
			},
			error : function() {
				$('#blacklist-btn').removeClass('disabled').html('Remove');
				alert('Server error blacklisting grant :(');
			}
		})
	}

	function getResultHtml(result) {
		var dataTemplate = {
			cUrl : window.location.href,
			title : result.title || '',
			link  : result.link || '',
			description : result.description ? result.description.replace(/\n/g,'<br />') : '',
			assistanceType : result.assistanceType ? result.assistanceType.sort().join(', ') : 'Unknown',
			organization : result.organization || '',
			contact : result.contact || '',
			CFDANumber : result.CFDANumber || '',
			fundingOppNumber : result.fundingOppNumber || '',
      oppId : result.oppId,
			dueDate : formatDate(result.dueDate),
			office : result.office,
			category : result.category ? result.category.sort().join('<br />') : '',
			costSharing : result.costShareText || '',
			eligibleApplicants : result.eligibleApplicants ? result.eligibleApplicants.sort().join('<br />') : '',
			additionalEligibilityInfo : result.additionalEligibilityInfo ? result.additionalEligibilityInfo.replace(/\n/g,'<br />') : ''
		}

		// TODO: regex replace urls
		//dataTemplate.description = dataTemplate.description.replace(/(http:\/\/.)/g, '$1 ' )

		// is it new?
		if( result.postDate ) {
			var now = new Date();
			now.setMonth(now.getMonth()-1);
			var posted = new Date(result.postDate);

			if( now.getTime() < posted.getTime() ) {
				dataTemplate['new'] = '<span class="new"><i class="fa fa-star-o"></i> New</span> ';
			}
		}
		if( !dataTemplate['new'] ) dataTemplate['new'] = '';


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
