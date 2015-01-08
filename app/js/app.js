var WCGA = {
	widgets : {}
};

WCGA.app = (function() {
	
	var DEFAULT_PAGE = 'home';
	var validPages = [DEFAULT_PAGE, 'search', 'result', 'suggest', 'wizard', 'print'];
	
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
		WCGA.home.init();
		WCGA.search.init();
		WCGA.result.init();

		onSchemaLoad(function(){
			WCGA.wizard.init();
		});
	});
	
	function _updatePage(page) {
		if( page == cPage ) return;
		
		$('body').scrollTop(0);
		
		if( validPages.indexOf(page) == -1 ) page = DEFAULT_PAGE;
		
		$('#'+cPage).hide();
		$('#'+page).show();
		
		cPage = page;
	}
	
	function _updatePageContent(hash) {
		if ( cPage == 'print' ) {
			WCGA.print.query(hash);
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