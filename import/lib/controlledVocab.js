// dates for date math
var lastWeek = new Date();
lastWeek.setDate(lastWeek.getDate() - 7);

var lastMonth = new Date();
lastMonth.setMonth(lastWeek.getMonth() - 1);

var threeMonths = new Date();
threeMonths.setMonth(threeMonths.getMonth() - 3);

var sixMonths = new Date();
sixMonths.setMonth(sixMonths.getMonth() - 6);


exports.process = function(item) {
    // set awardAmountText
    if( item.maxAmount != null ) {
        item.maxAmount = parseInt(item.maxAmount);

        if( item.maxAmount >= 10000000 ) {
            item.awardAmountText = 'greater than $10M'
        } else if ( item.maxAmount >= 1000000 ) {
            item.awardAmountText = '$1M to $10M';
        } else if ( item.maxAmount >= 500000 ) {
            item.awardAmountText = '$500K to $1M';
        } else if ( item.maxAmount >= 250000 ) {
            item.awardAmountText = '$250K to $500K';
        } else if ( item.maxAmount >= 100000 ) {
            item.awardAmountText = '$100K to $250K';
        } else if ( item.maxAmount >= 50000 ) {
            item.awardAmountText = '$50K to $100K'
        } else {
            item.awardAmountText = 'up to $50K';
        }
    } else {
        item.awardAmountText = 'Unspecified Award';
    }

    debugger;

    // set lastUpdatedText
    if( item.lastUpdated ) {
        if( item.lastUpdated.getTime() > lastWeek.getTime() ) {
            item.lastUpdatedText = 'Within Last Week';
        } else if ( item.lastUpdated.getTime() > lastMonth.getTime() ) {
            item.lastUpdatedText = 'Within Last 4 Weeks';
        } else {
            item.lastUpdatedText = 'More than 4 Weeks Ago';
        }
    } else if( item.lastUpdatedText ) {
        delete item.lastUpdatedText;
    }

    // set dateEnteredText
    if( item.dateEntered ) {
        if( item.dateEntered.getTime() > lastWeek.getTime() ) {
            item.dateEnteredText = 'Within Last Week';
        } else if ( item.dateEntered.getTime() >= lastMonth.getTime() ) {
            item.dateEnteredText = 'Within Last Last Month';
        } else if ( item.dateEntered.getTime() >= sixMonths.getTime() ) {
            item.dateEnteredText = 'Within 1 to 6 Months';
        } else {
            item.dateEnteredText = 'More Than 6 Months Ago';
        }
    } else if( item.dateEnteredText ) {
        delete item.dateEnteredText;
    }

    // set deadlineText
    if( item.dueDate ) {
        if ( item.dueDate.getTime() >= lastMonth.getTime() ) {
            item.deadlineText = 'due in less than 1 month';
        } else if ( item.dueDate.getTime() >= threeMonths.getTime() ) {
            item.deadlineText = 'due in 1 to 3 months';
        } else if ( item.dueDate.getTime() >= sixMonths.getTime() ) {
            item.deadlineText = 'due in 3 to 6 months';
        } else {
            item.deadlineText = 'due after 6 month';
        }
    } else {
        item.deadlineText = 'Unspecified due date';
    }

    // set costShareText
    if( item.costShare === undefined ) {
        item.costShareText = 'Cost Share Not Specified'
    } else if ( item.costShare === true || item.costShare == 'y' ) {
        item.costShareText = 'Cost Share is Required';
    } else {
        item.costShareText = 'Cost Share in Not Required';
    }
}