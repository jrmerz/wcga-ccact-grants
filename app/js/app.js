var WCGA = {
	widgets : {}
};

WCGA.app = (function() {
	
	var DEFAULT_PAGE = 'home';
	var validPages = [DEFAULT_PAGE, 'search', 'result', 'suggest', 'wizard', 'print'];
	
	var cPage = '';
	
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