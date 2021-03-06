WCGA.wizard = (function() {

    var widget;
    var dt;
    var chart;

    function init() {
        widget = new WCGA.WizardPanel();
        widget.init();
        $('#wizard-root').append(widget.getPanel());

        widget.on('update', updateChart);

        $(window).on('resize', redraw);

        $('.wizard-reset').on('click', widget.reset);

        //setTimeout(function(){
        //    updateChart({});
        //}.bind(200));
    }

    function onShow() {
        chart = '';
        $('.wizard-chart').html('');
        updateChart({});
    }

    // todo: perhaps recreate chart completely on show

    function updateChart(data) {
        var query = formatQuery(data);

        $('.wizard-num-results').html('<i class="fa fa-spinner fa-spin"></i>');
        $.get('/rest/filters?text='+encodeURIComponent(query.text) +
            '&filters='+encodeURIComponent(JSON.stringify(query.filters)),
            function(resp){

                setTimeout(function(){
                    if( resp.total ) $('.wizard-num-results').html(resp.total);
                    else $('.wizard-num-results').html(0);
                }, 500);


                var data = [['Category', 'Count']];

                if( resp.filters && resp.filters.category ) {
                    for( var i = 0; i < resp.filters.category.length; i++ ) {
                        var filter = resp.filters.category[i];
                        data.push([filter.filter, filter.count]);
                        if( i == 9 ) break;
                    }
                } else {
                    data.push(['',0])
                }

                dt = google.visualization.arrayToDataTable(data);

                if( !chart ) {
                    chart = new google.visualization.ColumnChart($('.wizard-chart')[0]);
                }

                redraw();
            }
        );

        $('#wizard-search-btn').attr('href',
            '#search/' + encodeURIComponent(query.text) +
            '/' + encodeURIComponent(JSON.stringify(query.filters)) +
            '/0/6'
        );

        if( Object.keys(data).length == 0 ) {
            $('.wizard-reset').hide();
        } else {
            $('.wizard-reset').show();
        }
    }

    function redraw() {
        if( !chart || !dt ) return;

        chart.draw(dt, {
            title : 'Summary of funding opportunities by category',
            titleTextStyle : {
                    fontSize : 10
            },
            legend : {
                position : 'none'
            },
            hAxis : {
                textStyle : {
                    fontSize : 10
                }
            },
            vAxis : {
                minValue : 0,
                viewWindow : {
                    min : 0
                }
            },
            animation : {
                duration : 500,
                easing : 'out'
            }
        });
    }

    function formatQuery(data) {
        var mqeQuery = {
            filters : [],
            text : ''
        }

        for( var key in data ) {
            if( key == 'keywords' ) {
                mqeQuery.text = data.keywords;
            } else if ( key == 'zipCodes' ) {
                mqeQuery.filters.push({
                    '$or' : [
                        { zipcode : { '$in' : data.zipCodes.replace(/\s/g,'').split(',') }},
                        { zipcode : { '$exists' : false }}
                    ]
                });
            } else if ( Array.isArray(data[key]) ) {
                if( data[key].length == 1 ) {
                    var filter = {};
                    filter[key] = data[key][0];
                    mqeQuery.filters.push(filter);
                } else {
                    var filter = {};
                    filter[key] = { '$in' : data[key]};
                    mqeQuery.filters.push(filter);
                }
            } else {
                var filter = {};
                filter[key] = data[key];
                mqeQuery.filters.push(filter);
            }
        }
        return mqeQuery;
    }

    return {
        init : init,
        onShow : onShow
    }
})();






WCGA.WizardPanel = function(editMode) {

    // required to add a grant
    var required = ['title', 'link', 'description', 'name', 'email', 'dueDate'];

    var data = {};

    var panel = $(
        '<div>'+
            '<div class="wizard-reset-outer">' +
                '<a class="btn btn-default wizard-reset animated flipInX">Reset</a>' +
            '</div>' +
            '<div class="wizard">' +
                '<div class="row">' +
                    '<div class="col-sm-3 wizard-left"></div>' +
                    '<div class="col-sm-6 wizard-main">'+
                        '<div class="wizard-select-outer"><select class="wizard-select form-control"></select></div>'+
                        '<div class="wizard-panel-root"></div>'+
                        '<div class="wizard-search-root">'+
                            '<table style="width: 100%"><tr>' +
                                '<td>' +
                                    '<a class="btn btn-default" id="wizard-search-btn">View Search Results</a>' +
                                '</td>' +
                                '<td class="wizard-num-results-outer">' +
                                    'Number of Results: <span class="wizard-num-results"></span>' +
                                '</td>' +
                            '</tr></table>'+
                        '</div>'+
                    '</div>'+
                    '<div class="col-sm-3 wizard-right"></div>' +
                '</div>' +
            '</div>' +
            '<div class="wizard-chart-outer">' +
                '<div class="wizard-chart"></div>' +
            '</div>'+
        '</div>'
    );

    if( editMode ) {
        panel.find('.wizard-chart-outer').html('')
            .removeClass('wizard-chart-outer')
            .addClass('wizard-add-result');
        panel.find('.wizard-search-root').hide();
    }

    $(window).on('resize', resize);

    var cPanel = null;

    var listeners = {};

    var schema = {
        title : {
            position : 'left',
            title : 'Basic Information',
            label : 'Basic Information',
            helpText : 'Basic information about the grant.',
            editOnly : true,
            fullWidth : true,
            inputs : [
                {key: 'title', type: 'text', label:'Title', multi: true},
                {key: 'link', type: 'text', label: 'URL', multi: true},
                {key: 'description', type: 'textarea', label:'Description', multi: true},
            ]
        },
        assistanceType : {
            position : 'left',
            title : 'Assistance Type',
            editLabel : 'Assitance Type',
            label : 'What are you looking for: ',
            emptyLabel : 'All Assistance Types',
            helpText : 'Select a specific type of assistance you are looking for.',
            inputs : [
                {key: 'Grant', type: 'checkbox'},
                {key: 'Rebate', type: 'checkbox'},
                {key: 'Loan', type: 'checkbox'},
                {key: 'Tax Incentive', type: 'checkbox'},
                {key: 'Other', type: 'checkbox'}
            ]
        },
        zipCodes : {
            position : 'left',
            title : 'Find Local Rebates',
            editLabel : 'Zip Codes',
            label : 'Include local opportunities, like rebates, in search:',
            emptyLabel : 'No',
            helpText : 'Enter your zip code to find local opportunities.',
            inputs : [
                {key: 'Zipcodes', type: 'text', noLabel : true, placeholder : 'Comma separate' },
                {key: 'wizard-zipcode-buttons', type: 'div'} // placeholder
            ]
        },
        eligibleApplicants : {
            position : 'left',
            title : 'Eligible Applicants',
            label : 'For these eligible applicants',
            editLabel : 'Eligible Applicants',
            emptyLabel : 'All Applicant Types',
            helpText : 'Eligible Applicant specifies who may apply of the opportunity. Individual grants may include '+
                        'additional constraints on the applicants. An entity may belong to multiple eligibility types.',
            inputs : [],
            hasIndent : true
        },
        category : {
            position : 'left',
            title : 'Categories',
            label : 'In these categories',
            editLabel : 'Categories',
            emptyLabel : 'All Categories',
            helpText : 'Identifies the basic functional category or subcategories that identify specific '+
                        'areas of interest. These categories represent the general topic of the funding opportunity.',
            inputs : [], // these will be added in from the schema.json file
            hasIndent : true
        },
        keywords : {
            position : 'right',
            title : 'Key Terms',
            label : 'With these key terms',
            emptyLabel : 'None',
            searchOnly : true,
            helpText : 'Use this to search for grants using free text.',
            inputs : [
                {key: 'keywords', type: 'text', noLabel : true}
            ]
        },
        fundingSource : {
            position : 'right',
            title : 'Funding Source',
            editOnly : true,
            editLabel : 'Funding Source',
            inputs : [
                {key: 'Federal', type: 'checkbox'},
                {key: 'State', type: 'checkbox'},
                {key: 'Local', type: 'checkbox'},
                {key: 'Other', type: 'checkbox'}
            ]
        },
        awardAmountText : {
            position : 'right',
            title : 'Funding Range',
            label : 'With funding in the range of:',
            editLabel : 'Funding Range',
            emptyLabel : 'Any Funding Level',
            helpText : 'This specifies the range of funding for a typical accepted application for the opportunity.',
            inputs : [
                {key: 'Amount Varies', type: 'checkbox', searchOnly : true},
                {key: 'up to $50K', type: 'checkbox', searchOnly : true},
                {key: '$50K to $100K', type: 'checkbox', searchOnly : true},
                {key: '$100K to $250K', type: 'checkbox', searchOnly : true},
                {key: '$250K to $500K', type: 'checkbox', searchOnly : true},
                {key: '$500K to $1M', type: 'checkbox', searchOnly : true},
                {key: '$1M to $10M', type: 'checkbox', searchOnly : true},
                {key: 'greater than $10M', type: 'checkbox', searchOnly : true},
                {key: 'minAmount', label : 'Min Amount', type: 'text', editOnly : true, isAttribute: true},
                {key: 'maxAmount', label : 'Max Amount', type: 'text', editOnly : true, isAttribute: true},
            ]
        },
        deadlineText : {
            position : 'right',
            title : 'Application Deadline',
            label : 'Where the application deadline is:',
            emptyLabel : 'Any Deadline',
            editLabel : 'Deadline',
            helpText : 'This specifies the range of funding for a typical accepted application for the opportunity.',
            inputs : [
                {key: 'due in less than 1 month', type: 'checkbox', searchOnly : true},
                {key: 'due in 1 to 3 months', type: 'checkbox', searchOnly : true},
                {key: 'due in 3 to 6 months', type: 'checkbox', searchOnly : true},
                {key: 'due after 6 months', type: 'checkbox', searchOnly : true},
                {key: 'Unspecified due date', type: 'checkbox', searchOnly : true},
                {key: 'dueDate', editLabel : 'Deadline', type: 'date', noLabel: true, editOnly: true, isAttribute: true, placeholder: 'MM/DD/YYYY'}
            ]
        },
        contactInfo : {
            position : 'right',
            title : 'Contact Information',
            label : 'Contact Information',
            editOnly : true,
            inputs : [
                {key: 'name', type: 'text', label: 'Name', isAttribute: true},
                {key: 'email', type: 'text', label: 'Email', isAttribute: true},
                {key: 'phone', type: 'text', label: 'Phone', isAttribute: true},
            ]
        }
    }

    // add inputs with subcategories defined by the /rest/schema call
    var types = ['category', 'eligibleApplicants'];
    for( var j = 0; j < types.length; j++ ) {
        var type = types[j];
        for( var key in WCGA.schema[type] ) {
            var input = {
                key : key,
                type : 'checkbox'
            }

            schema[type].inputs.push(input);

            for( var i = 0; i < WCGA.schema[type][key].length; i++ ) {
                var input = {
                    key : WCGA.schema[type][key][i],
                    type : 'checkbox',
                    indent : true
                }

                schema[type].inputs.push(input);
            }
        }
    }

    function init() {
        // main panels and buttons

        var index = 1;
        for( var key in schema ) {
            if( schema[key].editOnly && !editMode ) continue;
            if( schema[key].searchOnly && editMode ) continue;

            _initPanel(key, schema[key], index);
            index++;
        }

        // now put everything together
        var left = panel.find('.wizard-left');
        var right = panel.find('.wizard-right');

        var c = 0;
        for( var key in schema ) {
            if( schema[key].editOnly && !editMode ) continue;

            if( schema[key].position == 'left' ) {
                left.append(schema[key].button);
            } else {
                right.append(schema[key].button);
            }

            if( c == 0 ) {
                schema[key].button.addClass('active');
                cPanel = schema[key].panel;
                panel.find('.wizard-panel-root').append(cPanel);
            }
            c++;
        }

        panel.find('.wizard-select').on('change', function(){
            selectPanel($(this).val());
        });

        resize();
    }

    function initEdit() {
        data.name = WCGA.user.displayName;
        if( WCGA.user.email ) data.email = WCGA.user.email;

        schema.contactInfo.panel.find('#wi-contactInfo-name').val(WCGA.user.displayName);
        schema.contactInfo.panel.find('#wi-contactInfo-email').val(WCGA.user.email || '');
        _updateEditLabels();
    }

    function reset() {
        data = {};

        // clear all inputs
        for( var key in schema ) {
            if( !schema[key].panel ) continue;

            $(schema[key].panel).find('.wizard-input').each(function(){

                var ele = $(this);

                if( ele.attr('type') == 'checkbox' ) {
                    ele.prop('checked', false);
                } else {
                    ele.val('');
                }
            });
        }


        // update all labels
        if( !editMode ) _updateLabels();
        else _updateEditLabels();

        fire('update', data);
    }

    function _initPanel(name, panelSchema, index) {
        var label = (editMode && panelSchema.editLabel) ? panelSchema.editLabel : panelSchema.label;
        var btn = $(
            '<button class="btn btn-default wizard-btn" attribute="'+name+'">' +
                '<div><b>'+index+'.</b> '+label+'</div>'+
                '<div class="wizard-btn-value" attribute="'+name+'">' +
                    (editMode ? '[Not Set]' : panelSchema.emptyLabel) +
                '</div>'+
            '</button>'
        ).on('click', _setMainPanel);

        panel.find('.wizard-select').append($('<option value="'+name+'">'+label+'</option>'));

        var innerPanel = $(
            '<div class="wizard-panel animated fadeInDown" attribute="'+name+'">' +
                '<h3>'+((editMode && panelSchema.editLabel) ? panelSchema.editLabel : panelSchema.title)+'</h3>' +
                '<div class="wizard-panel-inner" '+(panelSchema.fullWidth ? 'style="display:block"' : '')+'></div>' +
                ((!editMode && panelSchema.helpText) ? '<div class="wizard-panel-help">'+panelSchema.helpText+'</div>' : '') +
            '</div>'
        );

        _initInputs(name, panelSchema.inputs, innerPanel, panelSchema.fullWidth, panelSchema.hasIndent);

        panelSchema.button = btn;
        panelSchema.panel = innerPanel;
    }

    function  _initInputs(name, inputs, panel, fullWidth, hasIndent) {
        var inputPanel = panel.find('.wizard-panel-inner');

        if( hasIndent ) {
            var expandBtn = $('<a class="btn btn-link" expand="true" attribute="'+name+'">Show Sub-Categories</a>');
            expandBtn.on('click', function(){
                var ele = $(this);
                var expand = ele.attr('expand');
                var attr = ele.attr('attribute');

                if( expand == 'true' ) {
                    ele.html('Hide Sub-Categories');
                    ele.attr('expand', 'false');
                    inputPanel.find('[indent]').show();
                } else {
                    ele.html('Show Sub-Categories');
                    ele.attr('expand', 'true');
                    inputPanel.find('[indent]').hide();
                }
            });
            inputPanel.append(expandBtn);
        }

        for( var i = 0; i < inputs.length; i++ ) {
            if( editMode && inputs[i].searchOnly ) continue;
            if( !editMode && inputs[i].editOnly ) continue;

            var ele = _initInput(name, inputs[i], fullWidth);
            inputPanel.append(ele);
        }
    }

    function _initInput(name, input, fullWidth) {
        var root = $('<div></div>');
        var id = _getId(name, input.key);

        var label = input.noLabel ? '' : (input.label || input.key);
        var attrName = input.isAttribute ? input.key : name;

        if( input.type == 'checkbox' ) {
            var cb = $(
                '<div class="checkbox" '+(input.indent ? 'indent style="display:none"' : '')+'>' +
                    '<label>' +
                        (input.indent ? '&nbsp;&nbsp;&nbsp;&nbsp;' : '')+
                        '<input class="wizard-input" id="'+id+'" type="checkbox" attribute="'+name+'" '+(input.multi ? 'multi="'+
                            input.key+'"' : '')+' value="'+input.key+'" /> '+ label +
                    '</label>' +
                '</div>'
            );
            cb.find('input').on('click', _setAttribute);
            root.append(cb);
        } else if ( input.type == 'text' || input.type == 'number' || input.type == 'date' ) {
            var text = $(
                '<div class="form-group">'+
                    '<label for="'+id+'">'+label+'</label>'+
                    '<input type="'+input.type+'" id="'+id+'" attribute="'+attrName+'" class="form-control wizard-input" '+
                        (input.multi ? 'multi="'+input.key+'"' : '')+
                        (input.placeholder ? ' placeholder="'+input.placeholder+'"' : '')+' style="'+(!fullWidth ? 'max-width: 200px' : '')+'">'+
                '</div>'
            );
            text.find('input').on('change', _setAttribute);

            root.append(text);
        } else if( input.type == 'div' ){
            root.append($('<div id="'+id+'" attribute="'+name+'" value="'+input.key+'"></div>'))

        } else if( input.type == 'textarea' ){

            var text = $('<div><label>'+label+'</label><br /><textarea class="wizard-input form-control" id="'+id+'" attribute="'+
                attrName+'" '+(input.multi ? 'multi="'+input.key+'"' : '')+' type="text"></textarea></div>');
            text.find('textarea').on('change', _setAttribute);
            root.append(text);
        }

        return root;
    }

    // when a main panels input is updates, this updates the data object
    // then fires update event with new data
    function _setAttribute(e) {
        var ele = $(this);
        var type = ele.attr('type');
        var name = ele.attr('attribute');
        var multi = ele.attr('multi');

        if( multi ) name = multi;

        if( type == 'checkbox' ) {
            var val = ele.attr('value');

            if( ele.is(':checked') ) {
                if( data[name] ) data[name].push(val);
                else data[name] = [val];
            } else if( data[name] ) {
                data[name].splice(data[name].indexOf(val),1);
                if( data[name].length == 0 ) delete data[name];
            }
        } else if ( type == 'text' || type == 'number' ) {
            data[name] = ele.val();
        } else if ( type == 'date' ) {
            data[name] = ele.val();

            if( data[name].match(/\d\d\d\d-\d\d-\d\d/) ) {
              var parts = data[name].split('-');
              data[name] = parts[1]+'/'+parts[2]+'/'+parts[0];
            }
        }

        if( data.link && !data.link.match(/(http|https|ftp):\/\/.*/) ) data.link = 'http://'+data.link;

        if( !editMode ) _updateLabels();
        else _updateEditLabels();

        fire('update', data);
    }

    function _updateLabels() {
        var labels = panel.find('.wizard-btn-value');

        labels.each(function(){
            var ele = $(this);
            var attr = ele.attr('attribute');

            if( data[attr] ) {
                if( Array.isArray(data[attr]) ) {
                    ele.text(data[attr].join(' | '));
                } else {
                    ele.text(data[attr]);
                }
            } else {
                ele.text(schema[attr].emptyLabel || '');
            }
        });
    }

    // update the labels (if we are not in edit mode)
    function _updateEditLabels() {
        var labels = panel.find('.wizard-btn-value');

        labels.each(function(){
            var ele = $(this);
            var attr = ele.attr('attribute');

            if( data[attr] ) {
                if( Array.isArray(data[attr]) ) {
                    ele.text(data[attr].join(', '));
                } else {
                    ele.text(data[attr]);
                }
            } else if( attr == 'awardAmountText' && data.minAmount !== undefined && data.maxAmount !== undefined ) {
                ele.text('$'+data.minAmount.replace(/\D/,'') +' to $'+data.maxAmount.replace(/\D/,'') );
            } else if( attr == 'contactInfo' && data.name ) {
                 ele.text(data.name);
            } else if( attr == 'deadlineText' && data.dueDate ) {
                if( data.dueDate.match(/^\d\d\d\d-\d\d-\d\dT.*Z$/) ) {
                    var parts = data.dueDate.replace(/T.*/,'').split('-');
                    ele.text(parts[1]+'/'+parts[2]+'/'+parts[0]);
                } else {
                    ele.text(data.dueDate);
                }
            } else {
                ele.text('[Not Set]');
            }
        });


        html = '<h4>Grant</h4><ul>'
        for( var key in data ) {
            var label = getLabel(key);

            if( Array.isArray(data[key]) ) {
                html += '<li><b>'+label+':</b> <span style="color:#888">'+data[key].join(', ')+'</span></li>';
            } else if ( key == 'link' ) {
                html += '<li><b>'+label+':</b> <a href="'+data[key]+'" target="_blank">'+data[key]+'</a></li>';
            } else if ( key == 'dueDate' && data.dueDate.match(/^\d\d\d\d-\d\d-\d\dT.*Z$/) ) {
                var parts = data.dueDate.replace(/T.*/,'').split('-');
                html += '<li><b>'+label+':</b> <span style="color:#888">'+parts[1]+'/'+parts[2]+'/'+parts[0]+'</span></li>';
            } else if ( data[key] != '' ) {
                html += '<li><b>'+label+':</b> <span style="color:#888">'+data[key]+'</span></li>';
            }
        }
        html += '</ul>';

        html += '<div style="margin-top:15; text-align:center">'+
                    '<div id="suggest-error-root" class="alert alert-danger" style="display:none"></div>'+
                    '<div><a class="btn btn-primary" id="suggest-btn">Suggest!</a></div>'+
                '</div>';

        $('.wizard-add-result')
            .html(html)
            .find('#suggest-btn').on('click', suggest);
    }

    function showError(msg) {
        $('#suggest-error-root').show().html(msg);
    }

    function suggest() {
        // make sure date format is correct.
        if( !data.dueDate ) return showError('Deadline required');

        if( !data.dueDate.match(/^\d\d\d\d-\d\d-\d\dT.*Z$/) ) {
            if( !data.dueDate.match(/^\d\d?\/\d\d?\/\d\d\d\d$/) ) {
                return showError('Invalid date format: '+data.dueDate+' should be MM/DD/YYYY');
            }

            var parts = data.dueDate.split('/');
            var year = parseInt(parts[2]);
            var month = parseInt(parts[0]);
            var day = parseInt(parts[1]);

            var d = new Date(year, month-1, day, 12, 0, 0);
            data.dueDate = d.toISOString();
        }


        $('#suggest-btn').addClass('disabled').html('<i class="fa fa-spinner fa-spin"></i> Suggesting...');

        $.ajax({
            type : 'POST',
            data : JSON.stringify(data),
            dataType: 'json',
            contentType:"application/json; charset=utf-8",
            url : '/rest/suggest',
            success : function(resp) {
                $('#suggest-btn').removeClass('disabled').html('Suggest!');
                if( resp.error ) {
                    $('#suggest-error-root').show();
                    if( resp.code == 100 ) {
                        var missing = [];
                        for( var i = 0; i < required.length; i++ ) {
                            if( data[required[i]] === undefined || data[required[i]] == '' ) {
                                missing.push(getLabel(required[i]));
                            }
                        }
                        showError('<b>Missing Required:</b> '+missing.join(', '));

                    } else {
                        showError(JSON.stringify(resp.message));
                    }
                    return;
                } else {
                    $('#suggest-error-root').html('').hide();
                }

                alert('Success!');
                reset();
            },
            error : function() {
                alert('Server Error :(');
                $('#suggest-btn').removeClass('disabled').html('Suggest!');
            }
        });
    }

    function getLabel(newkey) {
        for( var key in schema ) {
            if( !schema[key].inputs ) return;

            for( var i = 0; i < schema[key].inputs.length; i++ ) {
                if( schema[key].inputs[i].key == newkey ) {
                    if( schema[key].inputs[i].label ) return schema[key].inputs[i].label;
                    if( schema[key].inputs[i].editLabel ) return schema[key].inputs[i].editLabel;
                    return key;
                }
            }

            if( key == newkey && schema[key].editLabel ) {
                return schema[key].editLabel;
            }
        }
        return newkey;
    }


    // update the center visible panel
    function _setMainPanel(e) {
        selectPanel($(e.currentTarget).attr('attribute'));
    }

    function selectPanel(attribute) {
        if( cPanel ) cPanel.detach();

        panel.find('.wizard-btn').removeClass('active');
        panel.find('.wizard-btn[attribute="'+attribute+'"]').addClass('active');

        panel.find('.wizard-select').val(attribute);

        cPanel = schema[attribute].panel;
        panel.find('.wizard-panel-root').append(cPanel);
    }

    function _getId(attributeName, value) {
        return 'wi-'+attributeName.replace(/\W+/g, '')+'-'+value.replace(/\W+/g, '')
    }

    function getData() {
        return data;
    }

    function getPanel() {
        return panel;
    }

    function getSchema() {
        return schema;
    }

    function fire(event, data) {
        if( !listeners[event] ) return;
        for( var i = 0; i < listeners[event].length; i++ ) {
            listeners[event][i](data);
        }
    }

    function on(event, fn) {
        if( listeners[event] ) listeners[event].push(fn);
        else listeners[event] = [fn];
    }

    function resize() {
        var w = $(window).width();
        if( w < 768 ) {
            panel.find('.wizard-btn').hide();
            panel.find('.wizard-select-outer').show();
        } else {
            panel.find('.wizard-btn').show();
            panel.find('.wizard-select-outer').hide();
        }
    }

    return {
        init : init,
        reset : reset,
        getData : getData,
        getPanel : getPanel,
        on : on,
        initEdit : initEdit
    }
};
