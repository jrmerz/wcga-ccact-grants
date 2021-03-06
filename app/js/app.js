var WCGA = {
	widgets : {}
};

WCGA.app = (function() {
	
	var DEFAULT_PAGE = 'home';
	var validPages = [DEFAULT_PAGE, 'search', 'result', 'suggest', 'wizard', 'print', 'add'];
	
	var cPage = '';

	var schemaListeners = [];
	
	$(document).ready(function() {
		// mqe.js handles the hash parsing and fires this event when search is complete
		$(window).bind('page-update-event', function(e, hash){
			_updatePage(hash[0]);
			_updatePageContent(hash);
		});

		MQE.init({
			defaultPage:DEFAULT_PAGE,
			resultQueryParameter : 'id'
		});

		// assume we are taking a snapshot
		if(!WCGA.home) {
			WCGA.result.init();
			return;
		}

		WCGA.home.init();
		WCGA.search.init();
		WCGA.result.init();

		onSchemaLoad(function(){
			WCGA.wizard.init();
			WCGA.add.init();
		});

		if( WCGA.user.admin ) $('#top').html('<a class="btn btn-link" href="/admin.html"><i class="fa fa-cogs"></i> Admin Interface</a>');
	});
	
	function _updatePage(page) {
		if( page == cPage ) return;
		
		$('body').scrollTop(0);
		
		if( validPages.indexOf(page) == -1 ) page = DEFAULT_PAGE;
		
		$('.page').hide();
		$('#'+page).show();
		
		cPage = page;
	}
	
	function _updatePageContent(hash) {
		if ( cPage == 'print' ) {
			WCGA.print.query(hash);
		} else if ( cPage == 'wizard' ) {
			WCGA.wizard.onShow();
		} else if ( cPage == 'add' ) {
			WCGA.add.onShow();
		}
	}

	$.get('/rest/schema', function(resp){
		WCGA.schema = resp;
		for( var i = 0; i < schemaListeners.length; i++ ) {
			schemaListeners[i]();
		}
	});

	function onSchemaLoad(fn) {
		if( WCGA.schema ) fn();
		else schemaListeners.push(fn);
	}

	return {
		onSchemaLoad : onSchemaLoad
	}
	
})();


WCGA.labels = {};

WCGA.labels.filters = {
	category : 'Category',
	fundingSource : 'Funding Source',
	eligibleApplicants : 'Eligible Applicants',
	assistanceType : 'Assistance Type',
	awardAmountText : 'Award Amount',
	deadlineText : 'Deadline'
};