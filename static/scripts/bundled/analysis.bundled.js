webpackJsonp([0,1],[
/* 0 */
/*!*****************************************!*\
  !*** ./galaxy/scripts/apps/analysis.js ***!
  \*****************************************/
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(_, Backbone) {
	var jQuery = __webpack_require__( /*! jquery */ 3 ),
	    $ = jQuery,
	    GalaxyApp = __webpack_require__( /*! galaxy */ 4 ).GalaxyApp,
	    QUERY_STRING = __webpack_require__( /*! utils/query-string-parsing */ 11 ),
	    PANEL = __webpack_require__( /*! layout/panel */ 12 ),
	    ToolPanel = __webpack_require__( /*! ./tool-panel */ 13 ),
	    HistoryPanel = __webpack_require__( /*! ./history-panel */ 60 ),
	    PAGE = __webpack_require__( /*! layout/page */ 99 ),
	    ToolForm = __webpack_require__( /*! mvc/tool/tool-form */ 20 );
	
	/** define the 'Analyze Data'/analysis/main/home page for Galaxy
	 *  * has a masthead
	 *  * a left tool menu to allow the user to load tools in the center panel
	 *  * a right history menu that shows the user's current data
	 *  * a center panel
	 *  Both panels (generally) persist while the center panel shows any
	 *  UI needed for the current step of an analysis, like:
	 *      * tool forms to set tool parameters,
	 *      * tables showing the contents of datasets
	 *      * etc.
	 */
	window.app = function app( options, bootstrapped ){
	    window.Galaxy = new GalaxyApp( options, bootstrapped );
	    Galaxy.debug( 'analysis app' );
	    // TODO: use router as App base (combining with Galaxy)
	
	    // .................................................... panels and page
	    var config = options.config,
	        toolPanel = new ToolPanel({
	            el                  : '#left',
	            userIsAnonymous     : Galaxy.user.isAnonymous(),
	            search_url          : config.search_url,
	            toolbox             : config.toolbox,
	            toolbox_in_panel    : config.toolbox_in_panel,
	            stored_workflow_menu_entries : config.stored_workflow_menu_entries,
	            nginx_upload_path   : config.nginx_upload_path,
	            ftp_upload_site     : config.ftp_upload_site,
	            default_genome      : config.default_genome,
	            default_extension   : config.default_extension,
	        }),
	        centerPanel = new PANEL.CenterPanel({
	            el              : '#center'
	        }),
	        historyPanel = new HistoryPanel({
	            el              : '#right',
	            galaxyRoot      : Galaxy.root,
	            userIsAnonymous : Galaxy.user.isAnonymous(),
	            allow_user_dataset_purge: config.allow_user_dataset_purge,
	        }),
	        analysisPage = new PAGE.PageLayoutView( _.extend( options, {
	            el              : 'body',
	            left            : toolPanel,
	            center          : centerPanel,
	            right           : historyPanel,
	        }));
	
	    // .................................................... decorate the galaxy object
	    // TODO: most of this is becoming unnecessary as we move to apps
	    Galaxy.page = analysisPage;
	    Galaxy.params = Galaxy.config.params;
	
	    // add tool panel to Galaxy object
	    Galaxy.toolPanel = toolPanel.tool_panel;
	    Galaxy.upload = toolPanel.uploadButton;
	
	    Galaxy.currHistoryPanel = historyPanel.historyView;
	    Galaxy.currHistoryPanel.listenToGalaxy( Galaxy );
	
	    //HACK: move there
	    Galaxy.app = {
	        display : function( view, target ){
	            // TODO: Remove this line after select2 update
	            $( '.select2-hidden-accessible' ).remove();
	            centerPanel.display( view );
	        },
	    };
	
	    // .................................................... routes
	    /**  */
	    var router = new ( Backbone.Router.extend({
	        // TODO: not many client routes at this point - fill and remove from server.
	        // since we're at root here, this may be the last to be routed entirely on the client.
	        initialize : function( options ){
	            this.options = options;
	        },
	
	        /** override to parse query string into obj and send to each route */
	        execute: function( callback, args, name ){
	            Galaxy.debug( 'router execute:', callback, args, name );
	            var queryObj = QUERY_STRING.parse( args.pop() );
	            args.push( queryObj );
	            if( callback ){
	                callback.apply( this, args );
	            }
	        },
	
	        routes : {
	            '(/)' : 'home',
	            // TODO: remove annoying 'root' from root urls
	            '(/)root*' : 'home',
	        },
	
	        /**  */
	        home : function( params ){
	            // TODO: to router, remove Globals
	            // load a tool by id (tool_id) or rerun a previous tool execution (job_id)
	            if( ( params.tool_id || params.job_id ) && params.tool_id !== 'upload1' ){
	                this._loadToolForm( params );
	
	            } else {
	                // show the workflow run form
	                if( params.workflow_id ){
	                    this._loadCenterIframe( 'workflow/run?id=' + params.workflow_id );
	                // load the center iframe with controller.action: galaxy.org/?m_c=history&m_a=list -> history/list
	                } else if( params.m_c ){
	                    this._loadCenterIframe( params.m_c + '/' + params.m_a );
	                // show the workflow run form
	                } else {
	                    this._loadCenterIframe( 'welcome' );
	                }
	            }
	        },
	
	        /** load the center panel with a tool form described by the given params obj */
	        _loadToolForm : function( params ){
	            //TODO: load tool form code async
	            params.id = params.tool_id;
	            centerPanel.display( new ToolForm.View( params ) );
	        },
	
	        /** load the center panel iframe using the given url */
	        _loadCenterIframe : function( url, root ){
	            root = root || Galaxy.root;
	            url = root + url;
	            centerPanel.$( '#galaxy_main' ).prop( 'src', url );
	        },
	
	    }))( options );
	
	    // .................................................... when the page is ready
	    // render and start the router
	    $(function(){
	        analysisPage
	            .render()
	            .right.historyView.loadCurrentHistory();
	
	        // use galaxy to listen to history size changes and then re-fetch the user's total size (to update the quota meter)
	        // TODO: we have to do this here (and after every page.render()) because the masthead is re-created on each
	        // page render. It's re-created each time because there is no render function and can't be re-rendered without
	        // re-creating it.
	        Galaxy.listenTo( analysisPage.right.historyView, 'history-size-change', function(){
	            // fetch to update the quota meter adding 'current' for any anon-user's id
	            Galaxy.user.fetch({ url: Galaxy.user.urlRoot() + '/' + ( Galaxy.user.id || 'current' ) });
	        });
	        analysisPage.right.historyView.connectToQuotaMeter( analysisPage.masthead.quotaMeter );
	
	        // start the router - which will call any of the routes above
	        Backbone.history.start({
	            root        : Galaxy.root,
	            pushState   : true,
	        });
	    });
	};
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! underscore */ 1), __webpack_require__(/*! libs/backbone */ 2)))

/***/ },
/* 1 */,
/* 2 */,
/* 3 */,
/* 4 */,
/* 5 */,
/* 6 */,
/* 7 */,
/* 8 */,
/* 9 */,
/* 10 */,
/* 11 */
/*!******************************************************!*\
  !*** ./galaxy/scripts/utils/query-string-parsing.js ***!
  \******************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_RESULT__ = function(){
	// ============================================================================
	function get( key, queryString ){
	    queryString = queryString || window.location.search.substr( 1 );
	    var keyRegex = new RegExp( key + '=([^&#$]+)' ),
	        matches = queryString.match( keyRegex );
	    if( !matches || !matches.length ){
	        return undefined;
	    }
	    matches = matches.splice( 1 );
	    if( matches.length === 1 ){
	        return matches[0];
	    }
	    return matches;
	}
	
	function parse( queryString ){
	    if( !queryString ){ return {}; }
	    var parsed = {},
	        split = queryString.split( '&' );
	    split.forEach( function( pairString ){
	        var pair = pairString.split( '=' );
	        parsed[ pair[0] ] = decodeURI( pair[1] );
	    });
	    return parsed;
	}
	
	// ============================================================================
	    return {
	        get     : get,
	        parse   : parse,
	    };
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ },
/* 12 */,
/* 13 */
/*!*******************************************!*\
  !*** ./galaxy/scripts/apps/tool-panel.js ***!
  \*******************************************/
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function($, _) {var LeftPanel = __webpack_require__( /*! layout/panel */ 12 ).LeftPanel,
	    Tools = __webpack_require__( /*! mvc/tool/tools */ 14 ),
	    Upload = __webpack_require__( /*! mvc/upload/upload-view */ 48 ),
	    _l = __webpack_require__( /*! utils/localization */ 7 );
	
	/* Builds the tool menu panel on the left of the analysis page */
	var ToolPanel = LeftPanel.extend({
	
	    title : _l( 'Tools' ),
	
	    initialize: function( options ){
	        LeftPanel.prototype.initialize.call( this, options );
	        this.log( this + '.initialize:', options );
	
	        /** @type {Object[]} descriptions of user's workflows to be shown in the tool menu */
	        this.stored_workflow_menu_entries = options.stored_workflow_menu_entries || [];
	
	        // create tool search, tool panel, and tool panel view.
	        var tool_search = new Tools.ToolSearch({
	            search_url  : options.search_url,
	            hidden      : false
	        });
	        var tools = new Tools.ToolCollection( options.toolbox );
	        this.tool_panel = new Tools.ToolPanel({
	            tool_search : tool_search,
	            tools       : tools,
	            layout      : options.toolbox_in_panel
	        });
	        this.tool_panel_view = new Tools.ToolPanelView({ model: this.tool_panel });
	
	        // add upload modal
	        this.uploadButton = new Upload({
	            nginx_upload_path   : options.nginx_upload_path,
	            ftp_upload_site     : options.ftp_upload_site,
	            default_genome      : options.default_genome,
	            default_extension   : options.default_extension,
	        });
	    },
	
	    render : function(){
	        var self = this;
	        LeftPanel.prototype.render.call( self );
	        self.$( '.panel-header-buttons' ).append( self.uploadButton.$el );
	
	        // if there are tools, render panel and display everything
	        if (self.tool_panel.get( 'layout' ).size() > 0) {
	            self.tool_panel_view.render();
	            //TODO: why the hide/show?
	            self.$( '.toolMenu' ).show();
	        }
	        self.$( '.toolMenuContainer' ).prepend( self.tool_panel_view.$el );
	
	        self._renderWorkflowMenu();
	
	        // if a tool link has the minsizehint attribute, handle it here (gen. by hiding the tool panel)
	        self.$( 'a[minsizehint]' ).click( function() {
	            if ( parent.handle_minwidth_hint ) {
	                parent.handle_minwidth_hint( $( self ).attr( 'minsizehint' ) );
	            }
	        });
	    },
	
	    /** build the dom for the workflow portion of the tool menu */
	    _renderWorkflowMenu : function(){
	        var self = this;
	        // add internal workflow list
	        self.$( '#internal-workflows' ).append( self._templateTool({
	            title   : _l( 'All workflows' ),
	            href    : 'workflow/list_for_run'
	        }));
	        _.each( self.stored_workflow_menu_entries, function( menu_entry ){
	            self.$( '#internal-workflows' ).append( self._templateTool({
	                title : menu_entry.stored_workflow.name,
	                href  : 'workflow/run?id=' + menu_entry.encoded_stored_workflow_id
	            }));
	        });
	    },
	
	    /** build a link to one tool */
	    _templateTool: function( tool ) {
	        return [
	            '<div class="toolTitle">',
	                // global
	                '<a href="', Galaxy.root, tool.href, '" target="galaxy_main">', tool.title, '</a>',
	            '</div>'
	        ].join('');
	    },
	
	    /** override to include inital menu dom and workflow section */
	    _templateBody : function(){
	        return [
	            '<div class="unified-panel-body unified-panel-body-background">',
	                '<div class="toolMenuContainer">',
	                    '<div class="toolMenu" style="display: none">',
	                        '<div id="search-no-results" style="display: none; padding-top: 5px">',
	                            '<em><strong>', _l( 'Search did not match any tools.' ), '</strong></em>',
	                        '</div>',
	                    '</div>',
	                    '<div class="toolSectionPad"/>',
	                    '<div class="toolSectionPad"/>',
	                    '<div class="toolSectionTitle" id="title_XXinternalXXworkflow">',
	                        '<span>', _l( 'Workflows' ), '</span>',
	                    '</div>',
	                    '<div id="internal-workflows" class="toolSectionBody">',
	                        '<div class="toolSectionBg"/>',
	                    '</div>',
	                '</div>',
	            '</div>'
	        ].join('');
	    },
	
	    toString : function(){ return 'ToolPanel'; }
	});
	
	module.exports = ToolPanel;
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! jquery */ 3), __webpack_require__(/*! underscore */ 1)))

/***/ },
/* 14 */
/*!******************************************!*\
  !*** ./galaxy/scripts/mvc/tool/tools.js ***!
  \******************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone, $) {/**
	 * Model, view, and controller objects for Galaxy tools and tool panel.
	 */
	
	 !(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	    __webpack_require__(/*! libs/underscore */ 1),
	    __webpack_require__(/*! viz/trackster/util */ 15),
	    __webpack_require__(/*! mvc/dataset/data */ 16),
	    __webpack_require__(/*! mvc/tool/tool-form */ 20)
	
	], __WEBPACK_AMD_DEFINE_RESULT__ = function(_, util, data, ToolForm) {
	    'use strict';
	
	/**
	 * Mixin for tracking model visibility.
	 */
	var VisibilityMixin = {
	    hidden: false,
	
	    show: function() {
	        this.set("hidden", false);
	    },
	
	    hide: function() {
	        this.set("hidden", true);
	    },
	
	    toggle: function() {
	        this.set("hidden", !this.get("hidden"));
	    },
	
	    is_visible: function() {
	        return !this.attributes.hidden;
	    }
	
	};
	
	/**
	 * A tool parameter.
	 */
	var ToolParameter = Backbone.Model.extend({
	    defaults: {
	        name: null,
	        label: null,
	        type: null,
	        value: null,
	        html: null,
	        num_samples: 5
	    },
	
	    initialize: function(options) {
	        this.attributes.html = unescape(this.attributes.html);
	    },
	
	    copy: function() {
	        return new ToolParameter(this.toJSON());
	    },
	
	    set_value: function(value) {
	        this.set('value', value || '');
	    }
	});
	
	var ToolParameterCollection = Backbone.Collection.extend({
	    model: ToolParameter
	});
	
	/**
	 * A data tool parameter.
	 */
	var DataToolParameter = ToolParameter.extend({});
	
	/**
	 * An integer tool parameter.
	 */
	var IntegerToolParameter = ToolParameter.extend({
	    set_value: function(value) {
	        this.set('value', parseInt(value, 10));
	    },
	
	    /**
	     * Returns samples from a tool input.
	     */
	    get_samples: function() {
	        return d3.scale.linear()
	                        .domain([this.get('min'), this.get('max')])
	                        .ticks(this.get('num_samples'));
	    }
	});
	
	var FloatToolParameter = IntegerToolParameter.extend({
	    set_value: function(value) {
	        this.set('value', parseFloat(value));
	    }
	});
	
	/**
	 * A select tool parameter.
	 */
	var SelectToolParameter = ToolParameter.extend({
	    /**
	     * Returns tool options.
	     */
	    get_samples: function() {
	        return _.map(this.get('options'), function(option) {
	            return option[0];
	        });
	    }
	});
	
	// Set up dictionary of parameter types.
	ToolParameter.subModelTypes = {
	    'integer': IntegerToolParameter,
	    'float': FloatToolParameter,
	    'data': DataToolParameter,
	    'select': SelectToolParameter
	};
	
	/**
	 * A Galaxy tool.
	 */
	var Tool = Backbone.Model.extend({
	    // Default attributes.
	    defaults: {
	        id: null,
	        name: null,
	        description: null,
	        target: null,
	        inputs: [],
	        outputs: []
	    },
	
	    urlRoot: Galaxy.root + 'api/tools',
	
	    initialize: function(options) {
	
	        // Set parameters.
	        this.set('inputs', new ToolParameterCollection(_.map(options.inputs, function(p) {
	            var p_class = ToolParameter.subModelTypes[p.type] || ToolParameter;
	            return new p_class(p);
	        })));
	    },
	
	    /**
	     *
	     */
	    toJSON: function() {
	        var rval = Backbone.Model.prototype.toJSON.call(this);
	
	        // Convert inputs to JSON manually.
	        rval.inputs = this.get('inputs').map(function(i) { return i.toJSON(); });
	        return rval;
	    },
	
	    /**
	     * Removes inputs of a particular type; this is useful because not all inputs can be handled by
	     * client and server yet.
	     */
	    remove_inputs: function(types) {
	        var tool = this,
	            incompatible_inputs = tool.get('inputs').filter( function(input) {
	                return ( types.indexOf( input.get('type') ) !== -1);
	            });
	        tool.get('inputs').remove(incompatible_inputs);
	    },
	
	    /**
	     * Returns object copy, optionally including only inputs that can be sampled.
	     */
	    copy: function(only_samplable_inputs) {
	        var copy = new Tool(this.toJSON());
	
	        // Return only samplable inputs if flag is set.
	        if (only_samplable_inputs) {
	            var valid_inputs = new Backbone.Collection();
	            copy.get('inputs').each(function(input) {
	                if (input.get_samples()) {
	                    valid_inputs.push(input);
	                }
	            });
	            copy.set('inputs', valid_inputs);
	        }
	
	        return copy;
	    },
	
	    apply_search_results: function(results) {
	        ( _.indexOf(results, this.attributes.id) !== -1 ? this.show() : this.hide() );
	        return this.is_visible();
	    },
	
	    /**
	     * Set a tool input's value.
	     */
	    set_input_value: function(name, value) {
	        this.get('inputs').find(function(input) {
	            return input.get('name') === name;
	        }).set('value', value);
	    },
	
	    /**
	     * Set many input values at once.
	     */
	    set_input_values: function(inputs_dict) {
	        var self = this;
	        _.each(_.keys(inputs_dict), function(input_name) {
	            self.set_input_value(input_name, inputs_dict[input_name]);
	        });
	    },
	
	    /**
	     * Run tool; returns a Deferred that resolves to the tool's output(s).
	     */
	    run: function() {
	        return this._run();
	    },
	
	    /**
	     * Rerun tool using regions and a target dataset.
	     */
	    rerun: function(target_dataset, regions) {
	        return this._run({
	            action: 'rerun',
	            target_dataset_id: target_dataset.id,
	            regions: regions
	        });
	    },
	
	    /**
	     * Returns input dict for tool's inputs.
	     */
	    get_inputs_dict: function() {
	        var input_dict = {};
	        this.get('inputs').each(function(input) {
	            input_dict[input.get('name')] = input.get('value');
	        });
	        return input_dict;
	    },
	
	    /**
	     * Run tool; returns a Deferred that resolves to the tool's output(s).
	     * NOTE: this method is a helper method and should not be called directly.
	     */
	    _run: function(additional_params) {
	        // Create payload.
	        var payload = _.extend({
	                tool_id: this.id,
	                inputs: this.get_inputs_dict()
	            }, additional_params);
	
	        // Because job may require indexing datasets, use server-side
	        // deferred to ensure that job is run. Also use deferred that
	        // resolves to outputs from tool.
	        var run_deferred = $.Deferred(),
	            ss_deferred = new util.ServerStateDeferred({
	            ajax_settings: {
	                url: this.urlRoot,
	                data: JSON.stringify(payload),
	                dataType: "json",
	                contentType: 'application/json',
	                type: "POST"
	            },
	            interval: 2000,
	            success_fn: function(response) {
	                return response !== "pending";
	            }
	        });
	
	        // Run job and resolve run_deferred to tool outputs.
	        $.when(ss_deferred.go()).then(function(result) {
	            run_deferred.resolve(new data.DatasetCollection(result));
	        });
	        return run_deferred;
	    }
	});
	_.extend(Tool.prototype, VisibilityMixin);
	
	/**
	 * Tool view.
	 */
	var ToolView = Backbone.View.extend({
	
	});
	
	/**
	 * Wrap collection of tools for fast access/manipulation.
	 */
	var ToolCollection = Backbone.Collection.extend({
	    model: Tool
	});
	
	/**
	 * Label or section header in tool panel.
	 */
	var ToolSectionLabel = Backbone.Model.extend(VisibilityMixin);
	
	/**
	 * Section of tool panel with elements (labels and tools).
	 */
	var ToolSection = Backbone.Model.extend({
	    defaults: {
	        elems: [],
	        open: false
	    },
	
	    clear_search_results: function() {
	        _.each(this.attributes.elems, function(elt) {
	            elt.show();
	        });
	
	        this.show();
	        this.set("open", false);
	    },
	
	    apply_search_results: function(results) {
	        var all_hidden = true,
	            cur_label;
	        _.each(this.attributes.elems, function(elt) {
	            if (elt instanceof ToolSectionLabel) {
	                cur_label = elt;
	                cur_label.hide();
	            }
	            else if (elt instanceof Tool) {
	                if (elt.apply_search_results(results)) {
	                    all_hidden = false;
	                    if (cur_label) {
	                        cur_label.show();
	                    }
	                }
	            }
	        });
	
	        if (all_hidden) {
	            this.hide();
	        }
	        else {
	            this.show();
	            this.set("open", true);
	        }
	    }
	});
	_.extend(ToolSection.prototype, VisibilityMixin);
	
	/**
	 * Tool search that updates results when query is changed. Result value of null
	 * indicates that query was not run; if not null, results are from search using
	 * query.
	 */
	var ToolSearch = Backbone.Model.extend({
	    defaults: {
	        search_hint_string: "search tools",
	        min_chars_for_search: 3,
	        clear_btn_url: "",
	        search_url: "",
	        visible: true,
	        query: "",
	        results: null,
	        // ESC (27) will clear the input field and tool search filters
	        clear_key: 27
	    },
	
	    urlRoot: Galaxy.root + 'api/tools',
	
	    initialize: function() {
	        this.on("change:query", this.do_search);
	    },
	
	    /**
	     * Do the search and update the results.
	     */
	    do_search: function() {
	        var query = this.attributes.query;
	
	        // If query is too short, do not search.
	        if (query.length < this.attributes.min_chars_for_search) {
	            this.set("results", null);
	            return;
	        }
	
	        // Do search via AJAX.
	        var q = query;
	        // Stop previous ajax-request
	        if (this.timer) {
	            clearTimeout(this.timer);
	        }
	        // Start a new ajax-request in X ms
	        $("#search-clear-btn").hide();
	        $("#search-spinner").show();
	        var self = this;
	        this.timer = setTimeout(function () {
	            // log the search to analytics if present
	            if ( typeof ga !== 'undefined' ) {
	                ga( 'send', 'pageview', Galaxy.root + '?q=' + q );
	            }
	            $.get( self.urlRoot, { q: q }, function (data) {
	                self.set("results", data);
	                $("#search-spinner").hide();
	                $("#search-clear-btn").show();
	            }, "json" );
	        }, 400 );
	    },
	
	    clear_search: function() {
	        this.set("query", "");
	        this.set("results", null);
	    }
	
	});
	_.extend(ToolSearch.prototype, VisibilityMixin);
	
	/**
	 * Tool Panel.
	 */
	var ToolPanel = Backbone.Model.extend({
	
	    initialize: function(options) {
	        this.attributes.tool_search = options.tool_search;
	        this.attributes.tool_search.on("change:results", this.apply_search_results, this);
	        this.attributes.tools = options.tools;
	        this.attributes.layout = new Backbone.Collection( this.parse(options.layout) );
	    },
	
	    /**
	     * Parse tool panel dictionary and return collection of tool panel elements.
	     */
	    parse: function(response) {
	        // Recursive function to parse tool panel elements.
	        var self = this,
	            // Helper to recursively parse tool panel.
	            parse_elt = function(elt_dict) {
	                var type = elt_dict.model_class;
	                // There are many types of tools; for now, anything that ends in 'Tool'
	                // is treated as a generic tool.
	                if ( type.indexOf('Tool') === type.length - 4 ) {
	                    return self.attributes.tools.get(elt_dict.id);
	                }
	                else if (type === 'ToolSection') {
	                    // Parse elements.
	                    var elems = _.map(elt_dict.elems, parse_elt);
	                    elt_dict.elems = elems;
	                    return new ToolSection(elt_dict);
	                }
	                else if (type === 'ToolSectionLabel') {
	                    return new ToolSectionLabel(elt_dict);
	                }
	            };
	
	        return _.map(response, parse_elt);
	    },
	
	    clear_search_results: function() {
	        this.get('layout').each(function(panel_elt) {
	            if (panel_elt instanceof ToolSection) {
	                panel_elt.clear_search_results();
	            }
	            else {
	                // Label or tool, so just show.
	                panel_elt.show();
	            }
	        });
	    },
	
	    apply_search_results: function() {
	        var results = this.get('tool_search').get('results');
	        if (results === null) {
	            this.clear_search_results();
	            return;
	        }
	
	        var cur_label = null;
	        this.get('layout').each(function(panel_elt) {
	            if (panel_elt instanceof ToolSectionLabel) {
	                cur_label = panel_elt;
	                cur_label.hide();
	            }
	            else if (panel_elt instanceof Tool) {
	                if (panel_elt.apply_search_results(results)) {
	                    if (cur_label) {
	                        cur_label.show();
	                    }
	                }
	            }
	            else {
	                // Starting new section, so clear current label.
	                cur_label = null;
	                panel_elt.apply_search_results(results);
	            }
	        });
	    }
	});
	
	/**
	 * View classes for Galaxy tools and tool panel.
	 *
	 * Views use the templates defined below for rendering. Views update as needed
	 * based on (a) model/collection events and (b) user interactions; in this sense,
	 * they are controllers are well and the HTML is the real view in the MVC architecture.
	 */
	
	/**
	 * Base view that handles visibility based on model's hidden attribute.
	 */
	var BaseView = Backbone.View.extend({
	    initialize: function() {
	        this.model.on("change:hidden", this.update_visible, this);
	        this.update_visible();
	    },
	    update_visible: function() {
	        ( this.model.attributes.hidden ? this.$el.hide() : this.$el.show() );
	    }
	});
	
	/**
	 * Link to a tool.
	 */
	var ToolLinkView = BaseView.extend({
	    tagName: 'div',
	
	    render: function() {
	        // create element
	        var $link = $('<div/>');
	        $link.append(templates.tool_link(this.model.toJSON()));
	
	        // open upload dialog for upload tool
	        if (this.model.id === 'upload1') {
	            $link.find('a').on('click', function(e) {
	                e.preventDefault();
	                Galaxy.upload.show();
	            });
	        }
	        else if ( this.model.get( 'model_class' ) === 'Tool' ) { // regular tools
	            var self = this;
	            $link.find('a').on('click', function(e) {
	                e.preventDefault();
	                var form = new ToolForm.View( { id : self.model.id, version : self.model.get('version') } );
	                form.deferred.execute(function() {
	                    Galaxy.app.display( form );
	                });
	            });
	        }
	
	        // add element
	        this.$el.append($link);
	        return this;
	    }
	});
	
	/**
	 * Panel label/section header.
	 */
	var ToolSectionLabelView = BaseView.extend({
	    tagName: 'div',
	    className: 'toolPanelLabel',
	
	    render: function() {
	        this.$el.append( $("<span/>").text(this.model.attributes.text) );
	        return this;
	    }
	});
	
	/**
	 * Panel section.
	 */
	var ToolSectionView = BaseView.extend({
	    tagName: 'div',
	    className: 'toolSectionWrapper',
	
	    initialize: function() {
	        BaseView.prototype.initialize.call(this);
	        this.model.on("change:open", this.update_open, this);
	    },
	
	    render: function() {
	        // Build using template.
	        this.$el.append( templates.panel_section(this.model.toJSON()) );
	
	        // Add tools to section.
	        var section_body = this.$el.find(".toolSectionBody");
	        _.each(this.model.attributes.elems, function(elt) {
	            if (elt instanceof Tool) {
	                var tool_view = new ToolLinkView({model: elt, className: "toolTitle"});
	                tool_view.render();
	                section_body.append(tool_view.$el);
	            }
	            else if (elt instanceof ToolSectionLabel) {
	                var label_view = new ToolSectionLabelView({model: elt});
	                label_view.render();
	                section_body.append(label_view.$el);
	            }
	            else {
	                // TODO: handle nested section bodies?
	            }
	        });
	        return this;
	    },
	
	    events: {
	        'click .toolSectionTitle > a': 'toggle'
	    },
	
	    /**
	     * Toggle visibility of tool section.
	     */
	    toggle: function() {
	        this.model.set("open", !this.model.attributes.open);
	    },
	
	    /**
	     * Update whether section is open or close.
	     */
	    update_open: function() {
	        (this.model.attributes.open ?
	            this.$el.children(".toolSectionBody").slideDown("fast") :
	            this.$el.children(".toolSectionBody").slideUp("fast")
	        );
	    }
	});
	
	var ToolSearchView = Backbone.View.extend({
	    tagName: 'div',
	    id: 'tool-search',
	    className: 'bar',
	
	    events: {
	        'click': 'focus_and_select',
	        'keyup :input': 'query_changed',
	        'click #search-clear-btn': 'clear'
	    },
	
	    render: function() {
	        this.$el.append( templates.tool_search(this.model.toJSON()) );
	        if (!this.model.is_visible()) {
	            this.$el.hide();
	        }
	        this.$el.find('[title]').tooltip();
	        return this;
	    },
	
	    focus_and_select: function() {
	        this.$el.find(":input").focus().select();
	    },
	
	    clear: function() {
	        this.model.clear_search();
	        this.$el.find(":input").val('');
	        this.focus_and_select();
	        return false;
	    },
	
	    query_changed: function( evData ) {
	        // check for the 'clear key' (ESC) first
	        if( ( this.model.attributes.clear_key ) &&
	            ( this.model.attributes.clear_key === evData.which ) ){
	            this.clear();
	            return false;
	        }
	        this.model.set("query", this.$el.find(":input").val());
	    }
	});
	
	/**
	 * Tool panel view. Events triggered include:
	 * tool_link_click(click event, tool_model)
	 */
	var ToolPanelView = Backbone.View.extend({
	    tagName: 'div',
	    className: 'toolMenu',
	
	    /**
	     * Set up view.
	     */
	    initialize: function() {
	        this.model.get('tool_search').on("change:results", this.handle_search_results, this);
	    },
	
	    render: function() {
	        var self = this;
	
	        // Render search.
	        var search_view = new ToolSearchView( { model: this.model.get('tool_search') } );
	        search_view.render();
	        self.$el.append(search_view.$el);
	
	        // Render panel.
	        this.model.get('layout').each(function(panel_elt) {
	            if (panel_elt instanceof ToolSection) {
	                var section_title_view = new ToolSectionView({model: panel_elt});
	                section_title_view.render();
	                self.$el.append(section_title_view.$el);
	            }
	            else if (panel_elt instanceof Tool) {
	                var tool_view = new ToolLinkView({model: panel_elt, className: "toolTitleNoSection"});
	                tool_view.render();
	                self.$el.append(tool_view.$el);
	            }
	            else if (panel_elt instanceof ToolSectionLabel) {
	                var label_view = new ToolSectionLabelView({model: panel_elt});
	                label_view.render();
	                self.$el.append(label_view.$el);
	            }
	        });
	
	        // Setup tool link click eventing.
	        self.$el.find("a.tool-link").click(function(e) {
	            // Tool id is always the first class.
	            var
	                tool_id = $(this).attr('class').split(/\s+/)[0],
	                tool = self.model.get('tools').get(tool_id);
	
	            self.trigger("tool_link_click", e, tool);
	        });
	
	        return this;
	    },
	
	    handle_search_results: function() {
	        var results = this.model.get('tool_search').get('results');
	        if (results && results.length === 0) {
	            $("#search-no-results").show();
	        }
	        else {
	            $("#search-no-results").hide();
	        }
	    }
	});
	
	/**
	 * View for working with a tool: setting parameters and inputs and executing the tool.
	 */
	var ToolFormView = Backbone.View.extend({
	    className: 'toolForm',
	
	    render: function() {
	        this.$el.children().remove();
	        this.$el.append( templates.tool_form(this.model.toJSON()) );
	    }
	});
	
	/**
	 * Integrated tool menu + tool execution.
	 */
	var IntegratedToolMenuAndView = Backbone.View.extend({
	    className: 'toolMenuAndView',
	
	    initialize: function() {
	        this.tool_panel_view = new ToolPanelView({collection: this.collection});
	        this.tool_form_view = new ToolFormView();
	    },
	
	    render: function() {
	        // Render and append tool panel.
	        this.tool_panel_view.render();
	        this.tool_panel_view.$el.css("float", "left");
	        this.$el.append(this.tool_panel_view.$el);
	
	        // Append tool form view.
	        this.tool_form_view.$el.hide();
	        this.$el.append(this.tool_form_view.$el);
	
	        // On tool link click, show tool.
	        var self = this;
	        this.tool_panel_view.on("tool_link_click", function(e, tool) {
	            // Prevents click from activating link:
	            e.preventDefault();
	            // Show tool that was clicked on:
	            self.show_tool(tool);
	        });
	    },
	
	    /**
	     * Fetch and display tool.
	     */
	    show_tool: function(tool) {
	        var self = this;
	        tool.fetch().done( function() {
	            self.tool_form_view.model = tool;
	            self.tool_form_view.render();
	            self.tool_form_view.$el.show();
	            $('#left').width("650px");
	        });
	    }
	});
	
	// TODO: move into relevant views
	var templates = {
	    // the search bar at the top of the tool panel
	    tool_search : _.template([
	        '<input id="tool-search-query" class="search-query parent-width" name="query" ',
	                'placeholder="<%- search_hint_string %>" autocomplete="off" type="text" />',
	        '<a id="search-clear-btn" title="clear search (esc)"> </a>',
	        //TODO: replace with icon
	        '<span id="search-spinner" class="search-spinner fa fa-spinner fa-spin"></span>',
	    ].join('')),
	
	    // the category level container in the tool panel (e.g. 'Get Data', 'Text Manipulation')
	    panel_section : _.template([
	        '<div class="toolSectionTitle" id="title_<%- id %>">',
	            '<a href="javascript:void(0)"><span><%- name %></span></a>',
	        '</div>',
	        '<div id="<%- id %>" class="toolSectionBody" style="display: none;">',
	            '<div class="toolSectionBg"></div>',
	        '<div>'
	    ].join('')),
	
	    // a single tool's link in the tool panel; will load the tool form in the center panel
	    tool_link : _.template([
	        '<span class="labels">',
	            '<% _.each( labels, function( label ){ %>',
	            '<span class="label label-default label-<%- label %>">',
	                '<%- label %>',
	            '</span>',
	            '<% }); %>',
	        '</span>',
	        '<a class="<%- id %> tool-link" href="<%= link %>" target="<%- target %>" minsizehint="<%- min_width %>">',
	            '<%- name %>',
	        '</a>',
	        ' <%- description %>'
	    ].join('')),
	
	    // the tool form for entering tool parameters, viewing help and executing the tool
	    // loaded when a tool link is clicked in the tool panel
	    tool_form : _.template([
	        '<div class="toolFormTitle"><%- tool.name %> (version <%- tool.version %>)</div>',
	        '<div class="toolFormBody">',
	            '<% _.each( tool.inputs, function( input ){ %>',
	            '<div class="form-row">',
	                '<label for="<%- input.name %>"><%- input.label %>:</label>',
	                '<div class="form-row-input">',
	                    '<%= input.html %>',
	                '</div>',
	                '<div class="toolParamHelp" style="clear: both;">',
	                    '<%- input.help %>',
	                '</div>',
	                '<div style="clear: both;"></div>',
	            '</div>',
	            '<% }); %>',
	        '</div>',
	        '<div class="form-row form-actions">',
	            '<input type="submit" class="btn btn-primary" name="runtool_btn" value="Execute" />',
	        '</div>',
	        '<div class="toolHelp">',
	            '<div class="toolHelpBody"><% tool.help %></div>',
	        '</div>',
	    // TODO: we need scoping here because 'help' is the dom for the help menu in the masthead
	    // which implies a leaky variable that I can't find
	    ].join(''), { variable: 'tool' }),
	};
	
	
	// Exports
	return {
	    ToolParameter: ToolParameter,
	    IntegerToolParameter: IntegerToolParameter,
	    SelectToolParameter: SelectToolParameter,
	    Tool: Tool,
	    ToolCollection: ToolCollection,
	    ToolSearch: ToolSearch,
	    ToolPanel: ToolPanel,
	    ToolPanelView: ToolPanelView,
	    ToolFormView: ToolFormView
	};
	
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 15 */
/*!**********************************************!*\
  !*** ./galaxy/scripts/viz/trackster/util.js ***!
  \**********************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone, $) {!(__WEBPACK_AMD_DEFINE_RESULT__ = function(){
	
	/**
	 * Stringifies a number adding commas for digit grouping as per North America.
	 */
	function commatize( number ) {
	    number += ''; // Convert to string
	    var rgx = /(\d+)(\d{3})/;
	    while (rgx.test(number)) {
	        number = number.replace(rgx, '$1' + ',' + '$2');
	    }
	    return number;
	}
	
	/**
	 * Helper to determine if object is jQuery deferred.
	 */
	var is_deferred = function ( d ) {
	    return ('promise' in d);
	};
	
	/**
	 * Implementation of a server-state based deferred. Server is repeatedly polled, and when
	 * condition is met, deferred is resolved.
	 */
	var ServerStateDeferred = Backbone.Model.extend({
	    defaults: {
	        ajax_settings: {},
	        interval: 1000,
	        success_fn: function(result) { return true; }
	    },
	
	    /**
	     * Returns a deferred that resolves when success function returns true.
	     */
	    go: function() {
	        var deferred = $.Deferred(),
	            self = this,
	            ajax_settings = self.get('ajax_settings'),
	            success_fn = self.get('success_fn'),
	            interval = self.get('interval'),
	             _go = function() {
	                 $.ajax(ajax_settings).success(function(result) {
	                     if (success_fn(result)) {
	                         // Result is good, so resolve.
	                         deferred.resolve(result);
	                     }
	                     else {
	                         // Result not good, try again.
	                         setTimeout(_go, interval);
	                     }
	                 });
	             };
	         _go();
	         return deferred;
	    }
	});
	
	/**
	 * Returns a random color in hexadecimal format that is sufficiently different from a single color
	 * or set of colors.
	 * @param colors a color or list of colors in the format '#RRGGBB'
	 */
	var get_random_color = function(colors) {
	    // Default for colors is white.
	    if (!colors) { colors = "#ffffff"; }
	
	    // If needed, create list of colors.
	    if ( typeof(colors) === "string" ) {
	        colors = [ colors ];
	    }
	
	    // Convert colors to numbers.
	    for (var i = 0; i < colors.length; i++) {
	        colors[i] = parseInt( colors[i].slice(1), 16 );
	    }
	
	    // -- Perceived brightness and difference formulas are from
	    // -- http://www.w3.org/WAI/ER/WD-AERT/#color-contrast
	
	    // Compute perceived color brightness (based on RGB-YIQ transformation):
	    var brightness = function(r, g, b) {
	        return ( (r * 299) + (g * 587) + (b * 114) ) / 1000;
	    };
	
	    // Compute color difference:
	    var difference = function(r1, g1, b1, r2, g2, b2) {
	        return ( Math.max(r1, r2) - Math.min(r1, r2) ) +
	               ( Math.max(g1, g2) - Math.min(g1, g2) ) +
	               ( Math.max(b1, b2) - Math.min(b1, b2) );
	    };
	
	    // Create new random color.
	    var new_color, nr, ng, nb,
	        other_color, or, og, ob,
	        n_brightness, o_brightness,
	        diff, ok = false,
	        num_tries = 0;
	    do {
	        // New color is never white b/c random in [0,1)
	        new_color = Math.round( Math.random() * 0xffffff );
	        nr = ( new_color & 0xff0000 ) >> 16;
	        ng = ( new_color & 0x00ff00 ) >> 8;
	        nb = new_color & 0x0000ff;
	        n_brightness = brightness(nr, ng, nb);
	        ok = true;
	        for (i = 0; i < colors.length; i++) {
	            other_color = colors[i];
	            or = ( other_color & 0xff0000 ) >> 16;
	            og = ( other_color & 0x00ff00 ) >> 8;
	            ob = other_color & 0x0000ff;
	            o_brightness = brightness(or, og, ob);
	            diff = difference(nr, ng, nb, or, og, ob);
	            // These thresholds may need to be adjusted. Brightness difference range is 125;
	            // color difference range is 500.
	            if ( ( Math.abs(n_brightness - o_brightness) < 40 ) ||
	                 ( diff < 200 ) ) {
	                ok = false;
	                break;
	            }
	        }
	
	        num_tries++
	;    } while (!ok && num_tries <= 10 );
	
	    // Add 0x1000000 to left pad number with 0s.
	    return '#' + ( 0x1000000 + new_color ).toString(16).substr(1,6);
	};
	
	return {
	    commatize: commatize,
	    is_deferred: is_deferred,
	    ServerStateDeferred : ServerStateDeferred,
	    get_random_color    : get_random_color
	};
	
	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 16 */
/*!********************************************!*\
  !*** ./galaxy/scripts/mvc/dataset/data.js ***!
  \********************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone, _, $) {// Additional dependencies: jQuery, underscore.
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(/*! mvc/ui/ui-modal */ 17), __webpack_require__(/*! mvc/ui/ui-frames */ 18), __webpack_require__(/*! mvc/ui/icon-button */ 19)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Modal, Frames, mod_icon_btn) {
	
	/**
	 * Dataset metedata.
	 */
	var DatasetMetadata = Backbone.Model.extend({});
	
	/**
	 * A dataset. In Galaxy, datasets are associated with a history, so
	 * this object is also known as a HistoryDatasetAssociation.
	 */
	var Dataset = Backbone.Model.extend({
	    defaults: {
	        id: '',
	        type: '',
	        name: '',
	        hda_ldda: 'hda',
	        metadata: null
	    },
	
	    initialize: function() {
	        // Metadata can be passed in as a model or a set of attributes; if it's
	        // already a model, there's no need to set metadata.
	        if (!this.get('metadata')) {
	            this._set_metadata();
	        }
	
	        // Update metadata on change.
	        this.on('change', this._set_metadata, this);
	    },
	
	    _set_metadata: function() {
	        var metadata = new DatasetMetadata();
	
	        // Move metadata from dataset attributes to metadata object.
	        _.each(_.keys(this.attributes), function(k) {
	            if (k.indexOf('metadata_') === 0) {
	                // Found metadata.
	                var new_key = k.split('metadata_')[1];
	                metadata.set(new_key, this.attributes[k]);
	                delete this.attributes[k];
	            }
	        }, this);
	
	        // Because this is an internal change, silence it.
	        this.set('metadata', metadata, { 'silent': true });
	    },
	
	    /**
	     * Returns dataset metadata for a given attribute.
	     */
	    get_metadata: function(attribute) {
	        return this.attributes.metadata.get(attribute);
	    },
	
	    urlRoot: Galaxy.root + "api/datasets"
	});
	
	/**
	 * A tabular dataset. This object extends dataset to provide incremental chunked data.
	 */
	var TabularDataset = Dataset.extend({
	    defaults: _.extend({}, Dataset.prototype.defaults, {
	        chunk_url: null,
	        first_data_chunk: null,
	        chunk_index: -1,
	        at_eof: false
	    }),
	
	    initialize: function(options) {
	        Dataset.prototype.initialize.call(this);
	
	        // If first data chunk is available, next chunk is 1.
	        this.attributes.chunk_index = (this.attributes.first_data_chunk ? 1 : 0);
	        this.attributes.chunk_url = Galaxy.root + 'dataset/display?dataset_id=' + this.id;
	        this.attributes.url_viz = Galaxy.root + 'visualization';
	    },
	
	    /**
	     * Returns a jQuery Deferred object that resolves to the next data chunk or null if at EOF.
	     */
	    get_next_chunk: function() {
	        // If already at end of file, do nothing.
	        if (this.attributes.at_eof) {
	            return null;
	        }
	
	        // Get next chunk.
	        var self = this,
	            next_chunk = $.Deferred();
	        $.getJSON(this.attributes.chunk_url, {
	            chunk: self.attributes.chunk_index++
	        }).success(function(chunk) {
	            var rval;
	            if (chunk.ck_data !== '') {
	                // Found chunk.
	                rval = chunk;
	            }
	            else {
	                // At EOF.
	                self.attributes.at_eof = true;
	                rval = null;
	            }
	            next_chunk.resolve(rval);
	        });
	
	        return next_chunk;
	    }
	});
	
	var DatasetCollection = Backbone.Collection.extend({
	    model: Dataset
	});
	
	/**
	 * Provides a base for table-based, dynamic view of a tabular dataset.
	 * Do not instantiate directly; use either TopLevelTabularDatasetChunkedView
	 * or EmbeddedTabularDatasetChunkedView.
	 */
	var TabularDatasetChunkedView = Backbone.View.extend({
	
	    /**
	     * Initialize view and, importantly, set a scroll element.
	     */
	    initialize: function(options) {
	        // Row count for rendering.
	        this.row_count = 0;
	        this.loading_chunk = false;
	
	        // load trackster button
	        new TabularButtonTracksterView({
	            model   : options.model,
	            $el     : this.$el
	        });
	    },
	
	    expand_to_container: function(){
	        if (this.$el.height() < this.scroll_elt.height()){
	            this.attempt_to_fetch();
	        }
	    },
	
	    attempt_to_fetch: function( func ){
	        var self = this;
	        if ( !this.loading_chunk && this.scrolled_to_bottom() ) {
	            this.loading_chunk = true;
	            this.loading_indicator.show();
	            $.when(self.model.get_next_chunk()).then(function(result) {
	                if (result) {
	                    self._renderChunk(result);
	                    self.loading_chunk = false;
	                }
	                self.loading_indicator.hide();
	                self.expand_to_container();
	            });
	        }
	    },
	
	    render: function() {
	        // Add loading indicator.
	        this.loading_indicator = $('<div/>').attr('id', 'loading_indicator');
	        this.$el.append(this.loading_indicator);
	
	        // Add data table and header.
	        var data_table = $('<table/>').attr({
	            id: 'content_table',
	            cellpadding: 0
	        });
	        this.$el.append(data_table);
	        var column_names = this.model.get_metadata('column_names'),
	            header_container = $('<thead/>').appendTo(data_table),
	            header_row = $('<tr/>').appendTo(header_container);
	        if (column_names) {
	            header_row.append('<th>' + column_names.join('</th><th>') + '</th>');
	        } else {
	            for (var j = 1; j <= this.model.get_metadata('columns'); j++) {
	                header_row.append('<th>' + j + '</th>');
	            }
	        }
	
	        // Render first chunk.
	        var self = this,
	            first_chunk = this.model.get('first_data_chunk');
	        if (first_chunk) {
	            // First chunk is bootstrapped, so render now.
	            this._renderChunk(first_chunk);
	        }
	        else {
	            // No bootstrapping, so get first chunk and then render.
	            $.when(self.model.get_next_chunk()).then(function(result) {
	                self._renderChunk(result);
	            });
	        }
	
	        // -- Show new chunks during scrolling. --
	
	        // Set up chunk loading when scrolling using the scrolling element.
	        this.scroll_elt.scroll(function(){
	            self.attempt_to_fetch();
	        });
	    },
	
	    /**
	     * Returns true if user has scrolled to the bottom of the view.
	     */
	    scrolled_to_bottom: function() {
	        return false;
	    },
	
	    // -- Helper functions. --
	
	    _renderCell: function(cell_contents, index, colspan) {
	        var $cell = $('<td>').text(cell_contents);
	        var column_types = this.model.get_metadata('column_types');
	        if (colspan !== undefined) {
	            $cell.attr('colspan', colspan).addClass('stringalign');
	        } else if (column_types) {
	            if (index < column_types.length) {
	                if (column_types[index] === 'str' || column_types[index] === 'list') {
	                    /* Left align all str columns, right align the rest */
	                    $cell.addClass('stringalign');
	                }
	            }
	        }
	        return $cell;
	    },
	
	    _renderRow: function(line) {
	        // Check length of cells to ensure this is a complete row.
	        var cells = line.split('\t'),
	            row = $('<tr>'),
	            num_columns = this.model.get_metadata('columns');
	
	        if (this.row_count % 2 !== 0) {
	            row.addClass('dark_row');
	        }
	
	        if (cells.length === num_columns) {
	            _.each(cells, function(cell_contents, index) {
	                row.append(this._renderCell(cell_contents, index));
	            }, this);
	        }
	        else if (cells.length > num_columns) {
	            // SAM file or like format with optional metadata included.
	            _.each(cells.slice(0, num_columns - 1), function(cell_contents, index) {
	                row.append(this._renderCell(cell_contents, index));
	            }, this);
	            row.append(this._renderCell(cells.slice(num_columns - 1).join('\t'), num_columns - 1));
	        }
	        else if (num_columns > 5 && cells.length === num_columns - 1 ) {
	            // SAM file or like format with optional metadata missing.
	            _.each(cells, function(cell_contents, index) {
	                row.append(this._renderCell(cell_contents, index));
	            }, this);
	            row.append($('<td>'));
	        }
	        else {
	            // Comment line, just return the one cell.
	            row.append(this._renderCell(line, 0, num_columns));
	        }
	
	        this.row_count++;
	        return row;
	    },
	
	    _renderChunk: function(chunk) {
	        var data_table = this.$el.find('table');
	        _.each(chunk.ck_data.split('\n'), function(line, index) {
	            if (line !== ''){
	                data_table.append(this._renderRow(line));
	            }
	        }, this);
	    }
	});
	
	/**
	 * Tabular view that is placed at the top level of page. Scrolling occurs
	 * view top-level elements outside of view.
	 */
	var TopLevelTabularDatasetChunkedView = TabularDatasetChunkedView.extend({
	
	    initialize: function(options) {
	        TabularDatasetChunkedView.prototype.initialize.call(this, options);
	
	        // Scrolling happens in top-level elements.
	        scroll_elt = _.find(this.$el.parents(), function(p) {
	            return $(p).css('overflow') === 'auto';
	        });
	
	        // If no scrolling element found, use window.
	        if (!scroll_elt) { scroll_elt = window; }
	
	        // Wrap scrolling element for easy access.
	        this.scroll_elt = $(scroll_elt);
	    },
	
	    /**
	     * Returns true if user has scrolled to the bottom of the view.
	     */
	    scrolled_to_bottom: function() {
	        return (this.$el.height() - this.scroll_elt.scrollTop() - this.scroll_elt.height() <= 0);
	    }
	
	});
	
	/**
	 * Tabular view tnat is embedded in a page. Scrolling occurs in view's el.
	 */
	var EmbeddedTabularDatasetChunkedView = TabularDatasetChunkedView.extend({
	
	    initialize: function(options) {
	        TabularDatasetChunkedView.prototype.initialize.call(this, options);
	
	        // Because view is embedded, set up div to do scrolling.
	        this.scroll_elt = this.$el.css({
	            position: 'relative',
	            overflow: 'scroll',
	            height: options.height || '500px'
	        });
	    },
	
	    /**
	     * Returns true if user has scrolled to the bottom of the view.
	     */
	    scrolled_to_bottom: function() {
	        return this.$el.scrollTop() + this.$el.innerHeight() >= this.el.scrollHeight;
	    }
	
	});
	
	// button for trackster visualization
	var TabularButtonTracksterView = Backbone.View.extend({
	
	    // gene region columns
	    col: {
	        chrom   : null,
	        start   : null,
	        end     : null
	    },
	
	    // url for trackster
	    url_viz     : null,
	
	    // dataset id
	    dataset_id  : null,
	
	    // database key
	    genome_build: null,
	
	    // data type
	    file_ext   : null,
	
	    // backbone initialize
	    initialize: function (options) {
	        // check if environment is available
	        var Galaxy = parent.Galaxy;
	
	        // link galaxy modal or create one
	        if (Galaxy && Galaxy.modal) {
	            this.modal = Galaxy.modal;
	        }
	
	        // link galaxy frames
	        if (Galaxy && Galaxy.frame) {
	            this.frame = Galaxy.frame;
	        }
	
	        // check
	        if (!this.modal || !this.frame) {
	            return;
	        }
	
	        // model/metadata
	        var model       = options.model;
	        var metadata    = model.get('metadata');
	
	        // check for datatype
	        if (!model.get('file_ext')) {
	            return;
	        }
	
	        // get data type
	        this.file_ext = model.get('file_ext');
	
	        // check for bed-file format
	        if (this.file_ext == 'bed')
	        {
	            // verify that metadata exists
	            if (metadata.get('chromCol') && metadata.get('startCol') && metadata.get('endCol'))
	            {
	                // read in columns
	                this.col.chrom   = metadata.get('chromCol') - 1;
	                this.col.start   = metadata.get('startCol') - 1;
	                this.col.end     = metadata.get('endCol') - 1;
	            } else {
	                console.log('TabularButtonTrackster : Bed-file metadata incomplete.');
	                return;
	            }
	        }
	
	        // check for vcf-file format
	        if (this.file_ext == 'vcf')
	        {
	            // search array
	            function search (str, array) {
	                for (var j = 0; j < array.length; j++)
	                    if (array[j].match(str)) return j;
	                return -1;
	            };
	
	            // load
	            this.col.chrom = search('Chrom', metadata.get('column_names'));
	            this.col.start = search('Pos', metadata.get('column_names'));
	            this.col.end   = null;
	
	            // verify that metadata exists
	            if (this.col.chrom == -1 || this.col.start == -1) {
	                console.log('TabularButtonTrackster : VCF-file metadata incomplete.');
	                return;
	            }
	        }
	
	        // check
	        if(this.col.chrom === undefined) {
	            return;
	        }
	
	        // get dataset id
	        if (model.id) {
	            this.dataset_id = model.id;
	        } else {
	            console.log('TabularButtonTrackster : Dataset identification is missing.');
	            return;
	        }
	
	        // get url
	        if (model.get('url_viz')) {
	            this.url_viz = model.get('url_viz');
	        } else {
	            console.log('TabularButtonTrackster : Url for visualization controller is missing.');
	            return;
	        }
	
	        // get genome_build / database key
	        if (model.get('genome_build')) {
	            this.genome_build = model.get('genome_build');
	        }
	
	        // create the icon
	        var btn_viz = new mod_icon_btn.IconButtonView({
	            model : new mod_icon_btn.IconButton({
	                title       : 'Visualize',
	                icon_class  : 'chart_curve',
	                id          : 'btn_viz'
	            })
	        });
	
	        // set element
	        this.setElement(options.$el);
	
	        // add to element
	        this.$el.append(btn_viz.render().$el);
	
	        // hide the button
	        this.hide();
	    },
	
	    // backbone events
	    events:
	    {
	        'mouseover tr'  : 'show',
	        'mouseleave'    : 'hide'
	    },
	
	    // show button
	    show: function (e) {
	        // is numeric
	        function is_numeric(n) {
	            return !isNaN(parseFloat(n)) && isFinite(n);
	        };
	
	        // check
	        if(this.col.chrom === null)
	            return;
	
	        // get selected data line
	        var row = $(e.target).parent();
	
	        // verify that location has been found
	        var chrom = row.children().eq(this.col.chrom).html();
	        var start = row.children().eq(this.col.start).html();
	
	        // end is optional
	        var end = this.col.end ? row.children().eq(this.col.end).html() : start;
	
	        // double check location
	        if (!chrom.match("^#") && chrom !== "" && is_numeric(start)) {
	
	            // get target gene region
	            var btn_viz_pars = {
	                dataset_id  : this.dataset_id,
	                gene_region : chrom + ":" + start + "-" + end
	            };
	
	            // get button position
	            var offset  = row.offset();
	            var left    = offset.left - 10;
	            var top     = offset.top - $(window).scrollTop() + 3;
	
	            // update css
	            $('#btn_viz').css({'position': 'fixed', 'top': top + 'px', 'left': left + 'px'});
	            $('#btn_viz').off('click');
	            $('#btn_viz').click(this.create_trackster_action(this.url_viz, btn_viz_pars, this.genome_build));
	
	            // show the button
	            $('#btn_viz').show();
	        } else {
	            // hide the button
	            $('#btn_viz').hide();
	        }
	    },
	
	    // hide button
	    hide: function () {
	        this.$el.find('#btn_viz').hide();
	    },
	
	    // create action
	    create_trackster_action : function (vis_url, dataset_params, dbkey) {
	        // link this
	        var self = this;
	
	        // create function
	        return function() {
	            var listTracksParams = {};
	            if (dbkey) {
	                listTracksParams[ 'f-dbkey' ] = dbkey;
	            }
	            $.ajax({
	                url: vis_url + '/list_tracks?' + $.param( listTracksParams ),
	                dataType: 'html',
	                error: function() {
	                    // show error message
	                    self.modal.show({
	                        title   : 'Something went wrong!',
	                        body    : 'Unfortunately we could not add this dataset to the track browser. Please try again or contact us.',
	                        buttons : {
	                            'Cancel': function(){
	                                self.modal.hide();
	                            }
	                        }
	                    });
	                },
	                success: function(table_html) {
	                    self.modal.show({
	                        title   : 'View Data in a New or Saved Visualization',
	                        buttons :{
	                            'Cancel': function(){
	                                self.modal.hide();
	                            },
	                            'View in saved visualization': function(){
	                                // show modal with saved visualizations
	                                self.modal.show(
	                                {
	                                    title   : 'Add Data to Saved Visualization',
	                                    body    : table_html,
	                                    buttons : {
	                                        'Cancel': function(){
	                                            self.modal.hide();
	                                        },
	                                        'Add to visualization': function(){
	                                            // hide
	                                            self.modal.hide();
	
	                                            // search selected fields
	                                            self.modal.$el.find('input[name=id]:checked').each(function(){
	                                                // get visualization id
	                                                var vis_id = $(this).val();
	                                                dataset_params.id = vis_id;
	
	                                                // add widget
	                                                self.frame.add({
	                                                    title    : 'Trackster',
	                                                    type     : 'url',
	                                                    content  : vis_url + '/trackster?' + $.param(dataset_params)
	                                                });
	                                            });
	                                        }
	                                    }
	                                });
	                            },
	                            'View in new visualization': function(){
	                                // hide
	                                self.modal.hide();
	
	                                // add widget
	                                self.frame.add({
	                                    title    : 'Trackster',
	                                    type     : 'url',
	                                    content  : vis_url + '/trackster?' + $.param(dataset_params)
	                                });
	                            }
	                        }
	                    });
	                }
	            });
	            return false;
	        };
	    }
	});
	
	// -- Utility functions. --
	
	/**
	 * Create a model, attach it to a view, render view, and attach it to a parent element.
	 */
	var createModelAndView = function(model, view, model_config, parent_elt) {
	    // Create model, view.
	    var a_view = new view({
	        model: new model(model_config)
	    });
	
	    // Render view and add to parent element.
	    a_view.render();
	    if (parent_elt) {
	        parent_elt.append(a_view.$el);
	    }
	
	    return a_view;
	};
	
	/**
	 * Create a tabular dataset chunked view (and requisite tabular dataset model)
	 * and appends to parent_elt.
	 */
	var createTabularDatasetChunkedView = function(options) {
	    // If no model, create and set model from dataset config.
	    if (!options.model) {
	        options.model = new TabularDataset(options.dataset_config);
	    }
	
	    var parent_elt = options.parent_elt;
	    var embedded = options.embedded;
	
	    // Clean up options so that only needed options are passed to view.
	    delete options.embedded;
	    delete options.parent_elt;
	    delete options.dataset_config;
	
	    // Create and set up view.
	    var view = (embedded ? new EmbeddedTabularDatasetChunkedView(options) :
	                           new TopLevelTabularDatasetChunkedView(options));
	    view.render();
	
	    if (parent_elt) {
	        parent_elt.append(view.$el);
	        // If we're sticking this in another element, once it's appended check
	        // to make sure we've filled enough space.
	        // Without this, the scroll elements don't work.
	        view.expand_to_container();
	    }
	
	    return view;
	};
	
	return {
	    Dataset: Dataset,
	    TabularDataset: TabularDataset,
	    DatasetCollection: DatasetCollection,
	    TabularDatasetChunkedView: TabularDatasetChunkedView,
	    createTabularDatasetChunkedView: createTabularDatasetChunkedView
	};
	
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! underscore */ 1), __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 17 */,
/* 18 */,
/* 19 */
/*!**********************************************!*\
  !*** ./galaxy/scripts/mvc/ui/icon-button.js ***!
  \**********************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone, _, $) {!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	    //jquery
	    //backbone
	], __WEBPACK_AMD_DEFINE_RESULT__ = function(){
	//=============================================================================
	/**
	 * backbone model for icon buttons
	 */
	var IconButton = Backbone.Model.extend({
	    defaults: {
	        title           : "",
	        icon_class      : "",
	        on_click        : null,
	        menu_options    : null,
	        is_menu_button  : true,
	        id              : null,
	        href            : null,
	        target          : null,
	        enabled         : true,
	        visible         : true,
	        tooltip_config  : {}
	    }
	});
	
	/**
	 *  backbone view for icon buttons
	 */
	var IconButtonView = Backbone.View.extend({
	
	    initialize : function(){
	        // better rendering this way
	        this.model.attributes.tooltip_config = { placement : 'bottom' };
	        this.model.bind( 'change', this.render, this );
	    },
	
	    render : function( ){
	        // hide tooltip
	        this.$el.tooltip( 'hide' );
	
	        var new_elem = this.template( this.model.toJSON() );
	        // configure tooltip
	        new_elem.tooltip( this.model.get( 'tooltip_config' ));
	        this.$el.replaceWith( new_elem );
	        this.setElement( new_elem );
	        return this;
	    },
	
	    events : {
	        'click' : 'click'
	    },
	
	    click : function( event ){
	        // if on_click pass to that function
	        if( _.isFunction( this.model.get( 'on_click' ) ) ){
	            this.model.get( 'on_click' )( event );
	            return false;
	        }
	        // otherwise, bubble up ( to href or whatever )
	        return true;
	    },
	
	    // generate html element
	    template: function( options ){
	        var buffer = 'title="' + options.title + '" class="icon-button';
	
	        if( options.is_menu_button ){
	            buffer += ' menu-button';
	        }
	
	        buffer += ' ' + options.icon_class;
	
	        if( !options.enabled ){
	            buffer += '_disabled';
	        }
	
	        // close class tag
	        buffer += '"';
	
	        if( options.id ){
	            buffer += ' id="' + options.id + '"';
	        }
	
	        buffer += ' href="' + options.href + '"';
	        // add target for href
	        if( options.target ){
	            buffer += ' target="' + options.target + '"';
	        }
	        // set visibility
	        if( !options.visible ){
	            buffer += ' style="display: none;"';
	        }
	
	        // enabled/disabled
	        if ( options.enabled ){
	            buffer = '<a ' + buffer + '/>';
	        } else {
	            buffer = '<span ' + buffer + '/>';
	        }
	
	        // return element
	        return $( buffer );
	    }
	} );
	
	// define collection
	var IconButtonCollection = Backbone.Collection.extend({
	    model: IconButton
	});
	
	/**
	 * menu with multiple icon buttons
	 * views are not needed nor used for individual buttons
	 */
	var IconButtonMenuView = Backbone.View.extend({
	
	    tagName: 'div',
	
	    initialize: function(){
	        this.render();
	    },
	
	    render: function(){
	        // initialize icon buttons
	        var self = this;
	        this.collection.each(function(button){
	            // create and add icon button to menu
	            var elt = $('<a/>')
	                .attr('href', 'javascript:void(0)')
	                .attr('title', button.attributes.title)
	                .addClass('icon-button menu-button')
	                .addClass(button.attributes.icon_class)
	                .appendTo(self.$el)
	                .click(button.attributes.on_click);
	
	            // configure tooltip
	            if (button.attributes.tooltip_config){
	                elt.tooltip(button.attributes.tooltip_config);
	            }
	
	            // add popup menu to icon
	            var menu_options = button.get('options');
	            if (menu_options){
	                make_popupmenu(elt, menu_options);
	            }
	        });
	
	        // return
	        return this;
	    }
	});
	
	/**
	 * Returns an IconButtonMenuView for the provided configuration.
	 * Configuration is a list of dictionaries where each dictionary
	 * defines an icon button. Each dictionary must have the following
	 * elements: icon_class, title, and on_click.
	 */
	var create_icon_buttons_menu = function(config, global_config)
	{
	    // initialize global configuration
	    if (!global_config) global_config = {};
	
	    // create and initialize menu
	    var buttons = new IconButtonCollection(
	        _.map(config, function(button_config){
	            return new IconButton(_.extend(button_config, global_config));
	        })
	    );
	
	    // return menu
	    return new IconButtonMenuView( {collection: buttons} );
	};
	
	
	//=============================================================================
	    return {
	        IconButton              : IconButton,
	        IconButtonView          : IconButtonView,
	        IconButtonCollection    : IconButtonCollection,
	        IconButtonMenuView      : IconButtonMenuView,
	        create_icon_buttons_menu: create_icon_buttons_menu
	    };
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__))
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! underscore */ 1), __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 20 */
/*!**********************************************!*\
  !*** ./galaxy/scripts/mvc/tool/tool-form.js ***!
  \**********************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/**
	    This is the regular tool form.
	*/
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(/*! utils/utils */ 21), __webpack_require__(/*! mvc/ui/ui-misc */ 22), __webpack_require__(/*! mvc/tool/tool-form-base */ 28), __webpack_require__(/*! mvc/tool/tool-template */ 44)], __WEBPACK_AMD_DEFINE_RESULT__ = function( Utils, Ui, ToolFormBase, ToolTemplate ) {
	    var View = ToolFormBase.extend({
	        initialize: function( options ) {
	            var self = this;
	            ToolFormBase.prototype.initialize.call( this, Utils.merge({
	                customize       : function( options ) {
	                    // build execute button
	                    options.buttons = {
	                        execute : execute_btn = new Ui.Button({
	                            icon     : 'fa-check',
	                            tooltip  : 'Execute: ' + options.name + ' (' + options.version + ')',
	                            title    : 'Execute',
	                            cls      : 'btn btn-primary',
	                            floating : 'clear',
	                            onclick  : function() {
	                                execute_btn.wait();
	                                self.portlet.disable();
	                                self.submit( options, function() {
	                                    execute_btn.unwait();
	                                    self.portlet.enable();
	                                } );
	                            }
	                        })
	                    };
	                    // remap feature
	                    if ( options.job_id && options.job_remap ) {
	                        options.inputs[ 'rerun_remap_job_id' ] = {
	                            label       : 'Resume dependencies from this job',
	                            name        : 'rerun_remap_job_id',
	                            type        : 'select',
	                            display     : 'radio',
	                            ignore      : '__ignore__',
	                            value       : '__ignore__',
	                            options     : [ [ 'Yes', options.job_id ], [ 'No', '__ignore__' ] ],
	                            help        : 'The previous run of this tool failed and other tools were waiting for it to finish successfully. Use this option to resume those tools using the new output(s) of this tool run.'
	                        }
	                    }
	                }
	            }, options ) );
	        },
	
	        /** Submit a regular job.
	         * @param{dict}     options   - Specifies tool id and version
	         * @param{function} callback  - Called when request has completed
	         */
	        submit: function( options, callback ) {
	            var self = this;
	            var job_def = {
	                tool_id         : options.id,
	                tool_version    : options.version,
	                inputs          : this.data.create()
	            }
	            this.trigger( 'reset' );
	            if ( !self.validate( job_def ) ) {
	                Galaxy.emit.debug( 'tool-form::submit()', 'Submission canceled. Validation failed.' );
	                callback && callback();
	                return;
	            }
	            Galaxy.emit.debug( 'tool-form::submit()', 'Validation complete.', job_def );
	            Utils.request({
	                type    : 'POST',
	                url     : Galaxy.root + 'api/tools',
	                data    : job_def,
	                success : function( response ) {
	                    callback && callback();
	                    self.$el.empty().append( ToolTemplate.success( response ) );
	                    parent.Galaxy && parent.Galaxy.currHistoryPanel && parent.Galaxy.currHistoryPanel.refreshContents();
	                },
	                error   : function( response ) {
	                    callback && callback();
	                    Galaxy.emit.debug( 'tool-form::submit', 'Submission failed.', response );
	                    if ( response && response.err_data ) {
	                        var error_messages = self.data.matchResponse( response.err_data );
	                        for (var input_id in error_messages) {
	                            self.highlight( input_id, error_messages[ input_id ]);
	                            break;
	                        }
	                    } else {
	                        self.modal.show({
	                            title   : 'Job submission failed',
	                            body    : ( response && response.err_msg ) || ToolTemplate.error( job_def ),
	                            buttons : {
	                                'Close' : function() {
	                                    self.modal.hide();
	                                }
	                            }
	                        });
	                    }
	                }
	            });
	        },
	
	        /** Validate job dictionary.
	         * @param{dict}     job_def   - Job execution dictionary
	        */
	        validate: function( job_def ) {
	            var job_inputs  = job_def.inputs;
	            var batch_n     = -1;
	            var batch_src   = null;
	            for ( var job_input_id in job_inputs ) {
	                var input_value = job_inputs[ job_input_id ];
	                var input_id    = this.data.match( job_input_id );
	                var input_field = this.field_list[ input_id ];
	                var input_def   = this.input_list[ input_id ];
	                if ( !input_id || !input_def || !input_field ) {
	                    Galaxy.emit.debug('tool-form::validate()', 'Retrieving input objects failed.');
	                    continue;
	                }
	                if ( !input_def.optional && input_value == null ) {
	                    this.highlight( input_id );
	                    return false;
	                }
	                if ( input_value && input_value.batch ) {
	                    var n = input_value.values.length;
	                    var src = n > 0 && input_value.values[ 0 ] && input_value.values[ 0 ].src;
	                    if ( src ) {
	                        if ( batch_src === null ) {
	                            batch_src = src;
	                        } else if ( batch_src !== src ) {
	                            this.highlight( input_id, 'Please select either dataset or dataset list fields for all batch mode fields.' );
	                            return false;
	                        }
	                    }
	                    if ( batch_n === -1 ) {
	                        batch_n = n;
	                    } else if ( batch_n !== n ) {
	                        this.highlight( input_id, 'Please make sure that you select the same number of inputs for all batch mode fields. This field contains <b>' + n + '</b> selection(s) while a previous field contains <b>' + batch_n + '</b>.' );
	                        return false;
	                    }
	                }
	            }
	            return true;
	        }
	    });
	
	    return {
	        View: View
	    };
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ },
/* 21 */,
/* 22 */
/*!******************************************!*\
  !*** ./galaxy/scripts/mvc/ui/ui-misc.js ***!
  \******************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone, $) {/**
	 *  This class contains backbone wrappers for basic ui elements such as Images, Labels, Buttons, Input fields etc.
	 */
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(/*! utils/utils */ 21),
	    __webpack_require__(/*! mvc/ui/ui-select-default */ 23),
	    __webpack_require__(/*! mvc/ui/ui-slider */ 25),
	    __webpack_require__(/*! mvc/ui/ui-options */ 26),
	    __webpack_require__(/*! mvc/ui/ui-drilldown */ 27),
	    __webpack_require__(/*! mvc/ui/ui-buttons */ 24),
	    __webpack_require__(/*! mvc/ui/ui-modal */ 17)], __WEBPACK_AMD_DEFINE_RESULT__ = function( Utils, Select, Slider, Options, Drilldown, Buttons, Modal ) {
	
	    /** Label wrapper */
	    var Label = Backbone.View.extend({
	        tagName: 'label',
	        initialize: function( options ) {
	            this.model = options && options.model || new Backbone.Model( options );
	            this.tagName = options.tagName || this.tagName;
	            this.setElement( $( '<' + this.tagName + '/>' ) );
	            this.listenTo( this.model, 'change', this.render, this );
	            this.render();
	        },
	        title: function( new_title ) {
	            this.model.set( 'title', new_title );
	        },
	        value: function() {
	            return this.model.get( 'title' );
	        },
	        render: function() {
	            this.$el.removeClass()
	                    .addClass( 'ui-label' )
	                    .addClass( this.model.get( 'cls' ) )
	                    .html( this.model.get( 'title' ) );
	            return this;
	        }
	    });
	
	    /** Displays messages used e.g. in the tool form */
	    var Message = Backbone.View.extend({
	        initialize: function( options ) {
	            this.model = options && options.model || new Backbone.Model({
	                message     : null,
	                status      : 'info',
	                cls         : '',
	                persistent  : false
	            }).set( options );
	            this.listenTo( this.model, 'change', this.render, this );
	            this.render();
	        },
	        update: function( options ) {
	            this.model.set( options );
	        },
	        render: function() {
	            this.$el.removeClass().addClass( 'ui-message' ).addClass( this.model.get( 'cls' ) );
	            var status = this.model.get( 'status' );
	            if ( this.model.get( 'large' ) ) {
	                this.$el.addClass((( status == 'success' && 'done' ) ||
	                                   ( status == 'danger' && 'error' ) ||
	                                     status ) + 'messagelarge' );
	            } else {
	                this.$el.addClass( 'alert' ).addClass( 'alert-' + status );
	            }
	            if ( this.model.get( 'message' ) ) {
	                this.$el.html( this.model.get( 'message' ) );
	                this.$el.fadeIn();
	                this.timeout && window.clearTimeout( this.timeout );
	                if ( !this.model.get( 'persistent' ) ) {
	                    var self = this;
	                    this.timeout = window.setTimeout( function() {
	                        self.$el.fadeOut();
	                    }, 3000 );
	                }
	            } else {
	                this.$el.fadeOut();
	            }
	            return this;
	        }
	    });
	
	    /** Renders an input element used e.g. in the tool form */
	    var Input = Backbone.View.extend({
	        initialize: function( options ) {
	            this.model = options && options.model || new Backbone.Model({
	                type            : 'text',
	                placeholder     : '',
	                disabled        : false,
	                visible         : true,
	                cls             : '',
	                area            : false
	            }).set( options );
	            this.tagName = this.model.get( 'area' ) ? 'textarea' : 'input';
	            this.setElement( $( '<' + this.tagName + '/>' ) );
	            this.listenTo( this.model, 'change', this.render, this );
	            this.render();
	        },
	        events: {
	            'input': '_onchange'
	        },
	        value: function( new_val ) {
	            new_val !== undefined && this.model.set( 'value', typeof new_val === 'string' ? new_val : '' );
	            return this.model.get( 'value' );
	        },
	        render: function() {
	            this.$el.removeClass()
	                    .addClass( 'ui-' + this.tagName )
	                    .addClass( this.model.get( 'cls' ) )
	                    .attr( 'id', this.model.id )
	                    .attr( 'type', this.model.get( 'type' ) )
	                    .attr( 'placeholder', this.model.get( 'placeholder' ) )
	                    .val( this.model.get( 'value' ) );
	            this.model.get( 'disabled' ) ? this.$el.attr( 'disabled', true ) : this.$el.removeAttr( 'disabled' );
	            this.$el[ this.model.get( 'visible' ) ? 'show' : 'hide' ]();
	            return this;
	        },
	        _onchange: function() {
	            this.value( this.$el.val() );
	            this.model.get( 'onchange' ) && this.model.get( 'onchange' )( this.model.get( 'value' ) );
	        }
	    });
	
	    /** Creates a hidden element input field used e.g. in the tool form */
	    var Hidden = Backbone.View.extend({
	        initialize: function( options ) {
	            this.model = options && options.model || new Backbone.Model( options );
	            this.setElement( $ ( '<div/>' ).append( this.$info = $( '<div/>' ) )
	                                           .append( this.$hidden = $( '<div/>' ) ) );
	            this.listenTo( this.model, 'change', this.render, this );
	            this.render();
	        },
	        value: function( new_val ) {
	            new_val !== undefined && this.model.set( 'value', new_val );
	            return this.model.get( 'value' );
	        },
	        render: function() {
	            this.$el.attr( 'id', this.model.id );
	            this.$hidden.val( this.model.get( 'value' ) );
	            this.model.get( 'info' ) ? this.$info.show().html( this.model.get( 'info' ) ) : this.$info.hide();
	            return this;
	        }
	    });
	
	    return {
	        Button      : Buttons.ButtonDefault,
	        ButtonIcon  : Buttons.ButtonIcon,
	        ButtonCheck : Buttons.ButtonCheck,
	        ButtonMenu  : Buttons.ButtonMenu,
	        ButtonLink  : Buttons.ButtonLink,
	        Input       : Input,
	        Label       : Label,
	        Message     : Message,
	        Modal       : Modal,
	        RadioButton : Options.RadioButton,
	        Checkbox    : Options.Checkbox,
	        Radio       : Options.Radio,
	        Select      : Select,
	        Hidden      : Hidden,
	        Slider      : Slider,
	        Drilldown   : Drilldown
	    }
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 23 */
/*!****************************************************!*\
  !*** ./galaxy/scripts/mvc/ui/ui-select-default.js ***!
  \****************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone, $, _) {/**
	 *  This class creates/wraps a default html select field as backbone class.
	 */
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(/*! utils/utils */ 21), __webpack_require__(/*! mvc/ui/ui-buttons */ 24)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Utils, Buttons) {
	var View = Backbone.View.extend({
	    // options
	    optionsDefault: {
	        id          : Utils.uid(),
	        cls         : 'ui-select',
	        error_text  : 'No options available',
	        empty_text  : 'Nothing selected',
	        visible     : true,
	        wait        : false,
	        multiple    : false,
	        searchable  : true,
	        optional    : false
	    },
	
	    // initialize
	    initialize: function(options) {
	        // link this
	        var self = this;
	
	        // configure options
	        this.options = Utils.merge(options, this.optionsDefault);
	
	        // create new element
	        this.setElement(this._template(this.options));
	
	        // link elements
	        this.$select = this.$el.find('.select');
	        this.$icon_dropdown = this.$el.find('.icon-dropdown');
	        this.$icon_dropdown.on( 'click', function() { self.$select.select2 && self.$select.select2( 'open' ) });
	
	        // allow regular multi-select field to be resized
	        var minHeight = null;
	        this.$('.icon-resize').on('mousedown', function(event) {
	            var currentY = event.pageY;
	            var currentHeight = self.$select.height();
	            minHeight = minHeight || currentHeight;
	            $('#dd-helper').show().on('mousemove', function(event) {
	                self.$select.height(Math.max(currentHeight + (event.pageY - currentY), minHeight));
	            }).on('mouseup mouseleave', function() {
	                $('#dd-helper').hide().off();
	            });
	        });
	
	        // multiple select fields have an additional button and other custom properties
	        if (this.options.multiple) {
	            // create select all button
	            if (this.options.searchable) {
	                this.all_button = new Buttons.ButtonCheck({
	                    onclick: function() {
	                        var new_value = [];
	                        if (self.all_button.value() !== 0) {
	                            new_value = self._availableOptions();
	                        }
	                        self.value(new_value);
	                        self.trigger('change');
	                    }
	                });
	                this.$el.prepend(this.all_button.$el);
	            } else {
	                this.$el.addClass('ui-select-multiple');
	            }
	            this.$select.prop('multiple', true);
	            this.$icon_dropdown.remove();
	        }
	
	        // update initial options
	        this.update(this.options.data);
	
	        // set initial value
	        if (this.options.value !== undefined) {
	            this.value(this.options.value);
	        }
	
	        // show/hide
	        if (!this.options.visible) {
	            this.hide();
	        }
	
	        // wait
	        if (this.options.wait) {
	            this.wait();
	        } else {
	            this.show();
	        }
	
	        // add change event. fires only on user activity
	        this.$select.on('change', function() {
	            self.trigger('change');
	        });
	
	        // add change event. fires on trigger
	        this.on('change', function() {
	            self.options.onchange && self.options.onchange(this.value());
	        });
	    },
	
	    /** Return/Set current selection
	    */
	    value: function (new_value) {
	        // set new value
	        if (new_value !== undefined) {
	            if (new_value === null) {
	                new_value = '__null__';
	            }
	            if (this.exists(new_value) || this.options.multiple) {
	                this.$select.val(new_value);
	                if (this.$select.select2) {
	                    this.$select.select2('val', new_value);
	                }
	            }
	        }
	        // get current value
	        var current = this._getValue();
	        if (this.all_button) {
	            this.all_button.value($.isArray(current) && current.length || 0, this._size());
	        }
	        return current;
	    },
	
	    /** Return the first select option
	    */
	    first: function() {
	        var options = this.$select.find('option').first();
	        if (options.length > 0) {
	            return options.val();
	        } else {
	            return null;
	        }
	    },
	
	    /** Return the label/text of the current selection
	    */
	    text: function () {
	        return this.$select.find('option:selected').text();
	    },
	
	    /** Show the select field
	    */
	    show: function() {
	        this.unwait();
	        this.$select.show();
	        this.$el.show();
	    },
	
	    /** Hide the select field
	    */
	    hide: function() {
	        this.$el.hide();
	    },
	
	    /** Show a spinner indicating that the select options are currently loaded
	    */
	    wait: function() {
	        this.$icon_dropdown.removeClass();
	        this.$icon_dropdown.addClass('icon-dropdown fa fa-spinner fa-spin');
	    },
	
	    /** Hide spinner indicating that the request has been completed
	    */
	    unwait: function() {
	        this.$icon_dropdown.removeClass();
	        this.$icon_dropdown.addClass('icon-dropdown fa fa-caret-down');
	    },
	
	    /** Returns true if the field is disabled
	    */
	    disabled: function() {
	        return this.$select.is(':disabled');
	    },
	
	    /** Enable the select field
	    */
	    enable: function() {
	        this.$select.prop('disabled', false);
	    },
	
	    /** Disable the select field
	    */
	    disable: function() {
	        this.$select.prop('disabled', true);
	    },
	
	    /** Update all available options at once
	    */
	    update: function(options) {
	        // backup current value
	        var current = this._getValue();
	
	        // remove all options
	        this.$select.find('option').remove();
	
	        // add optional field
	        if (!this.options.multiple && this.options.optional) {
	            this.$select.append(this._templateOption({value : '__null__', label : this.options.empty_text}));
	        }
	
	        // add new options
	        for (var key in options) {
	            this.$select.append(this._templateOption(options[key]));
	        }
	
	        // count remaining entries
	        if (this._size() == 0) {
	            // disable select field
	            this.disable();
	
	            // create placeholder
	            this.$select.append(this._templateOption({value : '__null__', label : this.options.error_text}));
	        } else {
	            // enable select field
	            this.enable();
	        }
	
	        // update to searchable field (in this case select2)
	        if (this.options.searchable) {
	            this.$select.select2('destroy');
	            this.$select.select2({ closeOnSelect: !this.options.multiple });
	            this.$( '.select2-container .select2-search input' ).off( 'blur' );
	        }
	
	        // set previous value
	        this.value(current);
	
	        // check if any value was set
	        if (this._getValue() === null && !(this.options.multiple && this.options.optional)) {
	            this.value(this.first());
	        }
	    },
	
	    /** Set the custom onchange callback function
	    */
	    setOnChange: function(callback) {
	        this.options.onchange = callback;
	    },
	
	    /** Check if a value is an existing option
	    */
	    exists: function(value) {
	        return this.$select.find('option[value="' + value + '"]').length > 0;
	    },
	
	    /** Get current value from dom
	    */
	    _getValue: function() {
	        var val = this.$select.val();
	        if (!Utils.validate(val)) {
	            return null;
	        }
	        return val;
	    },
	
	    /** Returns all currently available options
	    */
	    _availableOptions: function() {
	        var available = [];
	        this.$select.find('option').each(function(i, e){
	            available.push($(e).attr('value'));
	        });
	        return available;
	    },
	
	    /** Number of available options
	    */
	    _size: function() {
	        return this.$select.find('option').length;
	    },
	
	    /** Template for select options
	    */
	    _templateOption: function(options) {
	        return '<option value="' + options.value + '">' + _.escape(options.label) + '</option>';
	    },
	
	    /** Template for select view
	    */
	    _template: function(options) {
	        return  '<div id="' + options.id + '" class="' + options.cls + '">' +
	                    '<select id="' + options.id + '_select" class="select"/>' +
	                    '<div class="icon-dropdown"/>' +
	                    '<div class="icon-resize">' +
	                         '<i class="fa fa-angle-double-right fa-rotate-45"/>' +
	                    '</div>' +
	                '</div>';
	    }
	});
	
	return {
	    View: View
	}
	
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! jquery */ 3), __webpack_require__(/*! underscore */ 1)))

/***/ },
/* 24 */
/*!*********************************************!*\
  !*** ./galaxy/scripts/mvc/ui/ui-buttons.js ***!
  \*********************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone, $) {/** This class contains all button views.
	*/
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(/*! utils/utils */ 21)], __WEBPACK_AMD_DEFINE_RESULT__ = function( Utils ) {
	    /** This renders the default button which is used e.g. at the bottom of the upload modal.
	    */
	    var ButtonBase = Backbone.View.extend({
	        initialize: function( options ) {
	            this.options = Utils.merge( options, {
	                id          : Utils.uid(),
	                title       : '',
	                floating    : 'right',
	                icon        : '',
	                cls         : 'ui-button btn btn-default',
	                cls_wait    : 'btn btn-info'
	            } );
	            this.setElement( this._template( this.options ) );
	            var self = this;
	            $( this.el ).on( 'click' , function() {
	                $( '.tooltip' ).hide();
	                if ( options.onclick && !self.disabled ) {
	                    options.onclick();
	                }
	            } );
	            $( this.el ).tooltip( { title: options.tooltip, placement: 'bottom' } );
	        },
	
	        // disable
	        disable: function() {
	            this.$el.addClass( 'disabled' );
	            this.disabled = true;
	        },
	
	        // enable
	        enable: function() {
	            this.$el.removeClass( 'disabled' );
	            this.disabled = false;
	        },
	
	        // show spinner
	        wait: function() {
	            this.$el.removeClass( this.options.cls ).addClass( this.options.cls_wait ).prop( 'disabled', true );
	            this.$( '.icon' ).removeClass( this.options.icon ).addClass( 'fa-spinner fa-spin' );
	            this.$( '.title' ).html( 'Sending...' );
	        },
	
	        // hide spinner
	        unwait: function() {
	            this.$el.removeClass( this.options.cls_wait ).addClass( this.options.cls ).prop( 'disabled', false );
	            this.$( '.icon' ).removeClass( 'fa-spinner fa-spin' ).addClass( this.options.icon );
	            this.$( '.title' ).html( this.options.title );
	        },
	
	        // template
	        _template: function( options ) {
	            var str =   '<button id="' + options.id + '" type="submit" style="float: ' + options.floating + ';" type="button" class="' + options.cls + '">';
	            if (options.icon) {
	                str +=      '<i class="icon fa ' + options.icon + '"/>&nbsp;';
	            }
	            str +=          '<span class="title">' + options.title + '</span>' +
	                        '</button>';
	            return str;
	        }
	    });
	
	    /** This button allows the right-click/open-in-new-tab feature, its used e.g. for panel buttons.
	    */
	    var ButtonLink = ButtonBase.extend({
	        initialize: function( options ) {
	            ButtonBase.prototype.initialize.call( this, options );
	        },
	        _template: function( options ) {
	            return  '<a id="' + options.id + '" class="' + options.cls + '" href="' + ( options.href || 'javascript:void(0)' ) + '"' +
	                        ' title="' + options.title + '" target="' + ( options.target || '_top' ) + '">' + '<span class="' + options.icon + '"/>' +
	                    '</a>';
	        }
	    });
	
	    /** The check button is used in the tool form and allows to distinguish between multiple states e.g. all, partially and nothing selected.
	    */
	    var ButtonCheck = Backbone.View.extend({
	        initialize: function( options ) {
	            // configure options
	            this.options = Utils.merge(options, {
	                title : 'Select/Unselect all',
	                icons : ['fa fa-square-o', 'fa fa-minus-square-o', 'fa fa-check-square-o'],
	                value : 0
	            });
	
	            // create new element
	            this.setElement( this._template() );
	            this.$title = this.$( '.title' );
	            this.$icon  = this.$( '.icon' );
	
	            // set initial value
	            this.value( this.options.value );
	
	            // set title
	            this.$title.html( this.options.title );
	
	            // add event handler
	            var self = this;
	            this.$el.on('click', function() {
	                self.current = ( self.current === 0 && 2 ) || 0;
	                self.value( self.current );
	                self.options.onclick && self.options.onclick();
	            });
	        },
	
	        /* Sets a new value and/or returns the current value.
	        * @param{Integer}   new_val - Set a new value 0=unchecked, 1=partial and 2=checked.
	        * OR:
	        * @param{Integer}   new_val - Number of selected options.
	        * @param{Integer}   total   - Total number of available options.
	        */
	        value: function ( new_val, total ) {
	            if ( new_val !== undefined ) {
	                if ( total ) {
	                    if ( new_val !== 0 ) {
	                        new_val = ( new_val !== total ) && 1 || 2;
	                    }
	                }
	                this.current = new_val;
	                this.$icon.removeClass()
	                          .addClass( 'icon' )
	                          .addClass( this.options.icons[ new_val ] );
	                this.options.onchange && this.options.onchange( new_val );
	            }
	            return this.current;
	        },
	
	        /** Template containing the check button and the title
	        */
	        _template: function() {
	            return  '<div class="ui-button-check" >' +
	                        '<span class="icon"/>' +
	                        '<span class="title"/>' +
	                    '</div>';
	        }
	    });
	
	    /** This renders a differently styled, more compact button version.
	        TODO: Consolidate with icon-button.js and/or button-default.js.
	    */
	    var ButtonIcon = Backbone.View.extend({
	        initialize : function( options ) {
	            // get options
	            this.options = Utils.merge( options, {
	                id          : Utils.uid(),
	                title       : '',
	                floating    : 'right',
	                cls         : 'ui-button-icon',
	                icon        : '',
	                tooltip     : '',
	                onclick     : null
	            });
	
	            // create new element
	            this.setElement( this._template( this.options ) );
	
	            // link button element
	            this.$button = this.$el.find( '.button' );
	
	            // add event
	            var self = this;
	            $(this.el).on('click', function() {
	                // hide all tooltips
	                $( '.tooltip' ).hide();
	
	                // execute onclick callback
	                if ( options.onclick && !self.disabled ) {
	                    options.onclick();
	                }
	            });
	
	            // add tooltip
	            this.$button.tooltip( { title: options.tooltip, placement: 'bottom' } );
	        },
	
	        // disable
	        disable: function() {
	            this.$button.addClass( 'disabled' );
	            this.disabled = true;
	        },
	
	        // enable
	        enable: function() {
	            this.$button.removeClass( 'disabled' );
	            this.disabled = false;
	        },
	
	        // change icon
	        setIcon: function(icon_cls) {
	            this.$('i').removeClass( this.options.icon ).addClass( icon_cls );
	            this.options.icon = icon_cls;
	        },
	
	        // template
	        _template: function( options ) {
	            // width
	            var width = '';
	            if ( options.title ) {
	                width = 'width: auto;';
	            }
	
	            // string
	            var str =   '<div id="' + options.id + '" style="float: ' + options.floating + '; ' + width + '" class="' + options.cls + '">' +
	                            '<div class="button">';
	            if (options.title) {
	                str +=          '<i class="icon fa ' + options.icon + '"/>&nbsp;' +
	                                '<span class="title">' + options.title + '</span>';
	            } else {
	                str +=          '<i class="icon fa ' + options.icon + '"/>';
	            }
	            str +=          '</div>' +
	                        '</div>';
	            return str;
	        }
	    });
	
	    /** This class creates a button with dropdown menu. It extends the functionality of the Ui.ButtonIcon class.
	        TODO: Consolidate class, use common base class
	    */
	    var ButtonMenu = Backbone.View.extend({
	        // optional sub menu
	        $menu: null,
	
	        // initialize
	        initialize: function ( options ) {
	            // get options
	            this.options = Utils.merge( options, {
	                // same as Ui.ButtonIcon
	                id              : '',
	                title           : '',
	                floating        : 'right',
	                pull            : 'right',
	                icon            : null,
	                onclick         : null,
	                cls             : 'ui-button-icon ui-button-menu',
	                tooltip         : '',
	                
	                // additional options
	                target          : '',
	                href            : '',
	                onunload        : null,
	                visible         : true,
	                tag             : ''
	            } );
	
	            // add template for tab
	            this.setElement( $( this._template( this.options ) ) );
	
	            // find root
	            var $root = $( this.el ).find( '.root' );
	
	            // link head
	            var self = this;
	            $root.on( 'click', function( e ) {
	                // hide all tooltips
	                $( '.tooltip' ).hide();
	
	                // prevent default
	                e.preventDefault();
	
	                // add click event
	                if( self.options.onclick ) {
	                    self.options.onclick();
	                }
	            });
	
	            // visiblity
	            if ( !this.options.visible )
	                this.hide();
	
	            // add tooltip
	            $root.tooltip( { title: options.tooltip, placement: 'bottom' } );
	        },
	
	        // show
	        show: function() {
	            $( this.el ).show();
	        },
	
	        // hide
	        hide: function() {
	            $( this.el ).hide();
	        },
	
	        // add menu item
	        addMenu: function ( options ) {
	            // menu option defaults
	            var menuOptions = {
	                title       : '',
	                target      : '',
	                href        : '',
	                onclick     : null,
	                divider     : false,
	                icon        : null,
	                cls         : 'button-menu btn-group'
	            }
	
	            // get options
	            menuOptions = Utils.merge( options, menuOptions );
	
	            // check if submenu element is available
	            if ( !this.$menu ) {
	                // insert submenu element into root
	                $( this.el ).append( this._templateMenu() );
	
	                // update element link
	                this.$menu = $( this.el ).find( '.menu' );
	            }
	
	            // create
	            var $item = $( this._templateMenuItem( menuOptions ) );
	
	            // add events
	            $item.on( 'click', function( e ) {
	                if( menuOptions.onclick ) {
	                    e.preventDefault();
	                    menuOptions.onclick();
	                }
	            });
	
	            // append menu
	            this.$menu.append( $item );
	
	            // append divider
	            if ( menuOptions.divider ) {
	                this.$menu.append( $( this._templateDivider() ) );
	            }
	        },
	
	        // fill template header
	        _templateMenuItem: function ( options ) {
	            var tmpl =  '<li>' +
	                            '<a class="dropdown-item" href="' + options.href + '" target="' + options.target + '" ';
	            if ( options.download ) {
	                tmpl +=         'download="' + options.download + '"';
	            }
	            tmpl +=         '>';
	            if ( options.icon ) {
	                tmpl +=         '<i class="fa ' + options.icon + '"/>';
	            }
	            tmpl +=             ' ' + options.title +
	                            '</a>' +
	                        '</li>';
	            return tmpl;
	        },
	
	        // fill template header
	        _templateMenu: function () {
	            return '<ul class="menu dropdown-menu pull-' + this.options.pull + '" role="menu"/>';
	        },
	
	        _templateDivider: function() {
	            return '<li class="divider"/>';
	        },
	
	        // element
	        _template: function(options) {
	            // TODO: width/margin should be set in css
	            var width = '';
	            var margin = '';
	            if ( options.title ) {
	                width = 'width: auto;';
	            } else {
	                margin = 'margin: 0px;';
	            }
	            var str =   '<div id="' + options.id + '" style="float: ' + options.floating + '; ' + width + '" class="dropdown ' + options.cls + '">' +
	                            '<div class="root button dropdown-toggle" data-toggle="dropdown" style="' + margin + '">' +
	                                '<i class="icon fa ' + options.icon + '"/>';
	            if ( options.title ) {
	                str +=          '&nbsp;<span class="title">' + options.title + '</span>';
	            }
	            str +=          '</div>' +
	                        '</div>';
	            return str;
	        }
	    });
	
	    return {
	        ButtonDefault   : ButtonBase,
	        ButtonLink      : ButtonLink,
	        ButtonIcon      : ButtonIcon,
	        ButtonCheck     : ButtonCheck,
	        ButtonMenu      : ButtonMenu
	    }
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 25 */
/*!********************************************!*\
  !*** ./galaxy/scripts/mvc/ui/ui-slider.js ***!
  \********************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone, $) {!(__WEBPACK_AMD_DEFINE_ARRAY__ = [ __webpack_require__(/*! utils/utils */ 21) ], __WEBPACK_AMD_DEFINE_RESULT__ = function( Utils ) {
	var View = Backbone.View.extend({
	    initialize : function( options ) {
	        var self = this;
	        this.options = Utils.merge( options, {
	            id      : Utils.uid(),
	            min     : null,
	            max     : null,
	            step    : null,
	            precise : false,
	            split   : 10000
	        } );
	
	        // create new element
	        this.setElement( this._template( this.options ) );
	
	        // determine wether to use the slider
	        this.useslider = this.options.max !== null && this.options.min !== null && this.options.max > this.options.min;
	
	        // set default step size
	        if ( this.options.step === null ) {
	            this.options.step = 1.0;
	            if ( this.options.precise && this.useslider ) {
	                this.options.step = ( this.options.max - this.options.min ) / this.options.split;
	            }
	        }
	
	        // create slider if min and max are defined properly
	        if ( this.useslider ) {
	            this.$slider = this.$( '#slider' );
	            this.$slider.slider( this.options );
	            this.$slider.on( 'slide', function ( event, ui ) {
	                self.value( ui.value );
	            });
	        } else {
	            this.$( '.ui-form-slider-text' ).css( 'width', '100%' );
	        }
	
	        // link text input field
	        this.$text = this.$( '#text' );
	
	        // set initial value
	        this.options.value !== undefined && ( this.value( this.options.value ) );
	
	        // add text field event
	        var pressed = [];
	        this.$text.on( 'change', function () {
	            self.value( $( this ).val() );
	        });
	        this.$text.on( 'keyup', function( e ) {
	            pressed[e.which] = false;
	            self.options.onchange && self.options.onchange( $( this ).val() );
	        });
	        this.$text.on( 'keydown', function ( e ) {
	            var v = e.which;
	            pressed[ v ] = true;
	            if ( self.options.is_workflow && pressed[ 16 ] && v == 52 ) {
	                self.value( '$' )
	                event.preventDefault();
	            } else if (!( v == 8 || v == 9 || v == 13 || v == 37 || v == 39 || ( v >= 48 && v <= 57 && !pressed[ 16 ] ) || ( v >= 96 && v <= 105 )
	                || ( ( v == 190 || v == 110 ) && $( this ).val().indexOf( '.' ) == -1 && self.options.precise )
	                || ( ( v == 189 || v == 109 ) && $( this ).val().indexOf( '-' ) == -1 )
	                || self._isParameter( $( this ).val() )
	                || pressed[ 91 ] || pressed[ 17 ] ) ) {
	                event.preventDefault();
	            }
	        });
	    },
	
	    /** Set and Return the current value
	    */
	    value : function ( new_val ) {
	        if ( new_val !== undefined ) {
	            if ( new_val !== null && new_val !== '' && !this._isParameter( new_val ) ) {
	                isNaN( new_val ) && ( new_val = 0 );
	                this.options.max !== null && ( new_val = Math.min( new_val, this.options.max ) );
	                this.options.min !== null && ( new_val = Math.max( new_val, this.options.min ) );
	            }
	            this.$slider && this.$slider.slider( 'value', new_val );
	            this.$text.val( new_val );
	            this.options.onchange && this.options.onchange( new_val );
	        }
	        return this.$text.val();
	    },
	
	    /** Return true if the field contains a workflow parameter i.e. $('name')
	    */
	    _isParameter: function( value ) {
	        return this.options.is_workflow && String( value ).substring( 0, 1 ) === '$';
	    },
	
	    /** Slider template
	    */
	    _template: function( options ) {
	        return  '<div id="' + options.id + '" class="ui-form-slider">' +
	                    '<input id="text" type="text" class="ui-form-slider-text"/>' +
	                    '<div id="slider" class="ui-form-slider-element"/>' +
	                '</div>';
	    }
	});
	
	return {
	    View : View
	};
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 26 */
/*!*********************************************!*\
  !*** ./galaxy/scripts/mvc/ui/ui-options.js ***!
  \*********************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone, $) {// dependencies
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(/*! utils/utils */ 21), __webpack_require__(/*! mvc/ui/ui-buttons */ 24)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Utils, Buttons) {
	
	/** Base class for options based ui elements **/
	var Base = Backbone.View.extend({
	    // initialize
	    initialize: function(options) {
	        // link this
	        var self = this;
	
	        // configure options
	        this.options = Utils.merge(options, {
	            visible     : true,
	            data        : [],
	            id          : Utils.uid(),
	            error_text  : 'No options available.',
	            wait_text   : 'Please wait...',
	            multiple    : false
	        });
	
	        // create new element
	        this.setElement('<div class="ui-options"/>');
	
	        // create elements
	        this.$message   = $('<div/>');
	        this.$options   = $(this._template(options));
	        this.$menu      = $('<div class="ui-options-menu"/>');
	
	        // append
	        this.$el.append(this.$message);
	        this.$el.append(this.$menu);
	        this.$el.append(this.$options);
	
	        // add select/unselect all button
	        if (this.options.multiple) {
	            this.all_button = new Buttons.ButtonCheck({
	                onclick: function() {
	                    self.$('input').prop('checked', self.all_button.value() !== 0);
	                    self.trigger('change');
	                }
	            });
	            this.$menu.append(this.all_button.$el);
	        }
	
	        // hide input field
	        if (!this.options.visible) {
	            this.$el.hide();
	        }
	
	        // initialize data
	        this.update(this.options.data);
	
	        // set initial value
	        if (this.options.value !== undefined) {
	            this.value(this.options.value);
	        }
	
	        // add change event. fires on trigger
	        this.on('change', function() {
	            this.options.onchange && this.options.onchange(this.value());
	        });
	    },
	
	    /** Update options
	    */
	    update: function(options) {
	        // backup current value
	        var current = this._getValue();
	
	        // remove all options
	        this.$options.empty();
	
	        // add new options using single option templates or full template
	        if (this._templateOptions) {
	            // rebuild options using full template
	            this.$options.append(this._templateOptions(options));
	        } else {
	            // rebuild options using single option templates
	            for (var key in options) {
	                var $option = $(this._templateOption(options[key]));
	                $option.addClass('ui-option');
	                $option.tooltip({title: options[key].tooltip, placement: 'bottom'});
	                this.$options.append($option);
	            }
	        }
	
	        // add change events
	        var self = this;
	        this.$('input').on('change', function() {
	            self.value(self._getValue());
	            self.trigger('change');
	        });
	
	        // set previous value
	        this.value(current);
	
	        // data initialization has been completed
	        this.unwait();
	    },
	
	    /** Return/Set current value
	    */
	    value: function (new_value) {
	        // set new value if available
	        if (new_value !== undefined) {
	            // reset selection
	            this.$('input').prop('checked', false);
	            // set value
	            if (new_value !== null) {
	                // check if its an array
	                if (!(new_value instanceof Array)) {
	                    new_value = [new_value];
	                }
	                // update to new selection
	                for (var i in new_value) {
	                    this.$('input[value="' + new_value[i] + '"]').first().prop('checked', true);
	                }
	            };
	        }
	        // get current value
	        var current = this._getValue();
	        if (this.all_button) {
	            var value = current;
	            if (!(value instanceof Array)) {
	                value = 0;
	            } else {
	                value = value.length;
	            }
	            this.all_button.value(value, this._size());
	        }
	        return current;
	    },
	
	    /** Check if selected value exists (or any if multiple)
	    */
	    exists: function(value) {
	        if (value !== undefined) {
	            if (!(value instanceof Array)) {
	                value = [value];
	            }
	            for (var i in value) {
	                if (this.$('input[value="' + value[i] + '"]').length > 0) {
	                    return true;
	                }
	            }
	        }
	        return false;
	    },
	
	    /** Return first available option
	    */
	    first: function() {
	        var options = this.$('input').first();
	        if (options.length > 0) {
	            return options.val();
	        } else {
	            return null;
	        }
	    },
	
	    /** Wait message during request processing
	    */
	    wait: function() {
	        if (this._size() == 0) {
	            this._messageShow(this.options.wait_text, 'info');
	            this.$options.hide();
	            this.$menu.hide();
	        }
	    },
	
	    /** Hide wait message
	    */
	    unwait: function() {
	        var total = this._size();
	        if (total == 0) {
	            this._messageShow(this.options.error_text, 'danger');
	            this.$options.hide();
	            this.$menu.hide();
	        } else {
	            this._messageHide();
	            this.$options.css('display', 'inline-block');
	            this.$menu.show();
	        }
	    },
	
	    /** Return current selection
	    */
	    _getValue: function() {
	        // track values in array
	        var selected = [];
	        this.$(':checked').each(function() {
	            selected.push($(this).val());
	        });
	
	        // get selected elements
	        if (!Utils.validate(selected)) {
	            return null;
	        }
	
	        // return multiple or single value
	        if (this.options.multiple) {
	            return selected;
	        } else {
	            return selected[0];
	        }
	    },
	
	    /** Returns the number of options
	    */
	    _size: function() {
	        return this.$('.ui-option').length;
	    },
	
	    /** Show message instead if options
	    */
	    _messageShow: function(text, status) {
	        this.$message.show();
	        this.$message.removeClass();
	        this.$message.addClass('ui-message alert alert-' + status);
	        this.$message.html(text);
	    },
	
	    /** Hide message
	    */
	    _messageHide: function() {
	        this.$message.hide();
	    },
	
	    /** Main template function
	    */
	    _template: function() {
	        return '<div class="ui-options-list"/>';
	    }
	});
	
	/** Iconized **/
	var BaseIcons = Base.extend({
	    _templateOption: function(pair) {
	        var id = Utils.uid();
	        return  '<div class="ui-option">' +
	                    '<input id="' + id + '" type="' + this.options.type + '" name="' + this.options.id + '" value="' + pair.value + '"/>' +
	                    '<label class="ui-options-label" for="' + id + '">' + pair.label + '</label>' +
	                '</div>';
	    }
	});
	
	/** Radio button field **/
	var Radio = {};
	Radio.View = BaseIcons.extend({
	    initialize: function(options) {
	        options.type = 'radio';
	        BaseIcons.prototype.initialize.call(this, options);
	    }
	});
	
	/** Checkbox options field **/
	var Checkbox = {};
	Checkbox.View = BaseIcons.extend({
	    initialize: function(options) {
	        options.multiple = true;
	        options.type = 'checkbox';
	        BaseIcons.prototype.initialize.call(this, options);
	    }
	});
	
	/** Radio button options field styled as classic buttons **/
	var RadioButton = {};
	RadioButton.View = Base.extend({
	    // initialize
	    initialize: function(options) {
	        Base.prototype.initialize.call(this, options);
	    },
	
	    /** Return/Set current value
	    */
	    value: function (new_value) {
	        // set new value
	        if (new_value !== undefined) {
	            this.$('input').prop('checked', false);
	            this.$('label').removeClass('active');
	            this.$('[value="' + new_value + '"]').prop('checked', true).closest('label').addClass('active');
	        }
	
	        // get and return value
	        return this._getValue();
	    },
	
	    /** Template for a single option
	    */
	    _templateOption: function(pair) {
	        var cls = 'fa ' + pair.icon;
	        if (!pair.label) {
	            cls += ' no-padding';
	        }
	        var tmpl =  '<label class="btn btn-default">';
	        if (pair.icon) {
	            tmpl +=     '<i class="' + cls + '"/>';
	        }
	        tmpl +=         '<input type="radio" name="' + this.options.id + '" value="' + pair.value + '"/>';
	        if (pair.label) {
	            tmpl +=         pair.label;
	        }
	        tmpl +=     '</label>';
	        return tmpl;
	    },
	
	    /** Main template function
	    */
	    _template: function() {
	        return '<div class="btn-group ui-radiobutton" data-toggle="buttons"/>';
	    }
	});
	
	return {
	    Base        : Base,
	    BaseIcons   : BaseIcons,
	    Radio       : Radio,
	    RadioButton : RadioButton,
	    Checkbox    : Checkbox
	};
	
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 27 */
/*!***********************************************!*\
  !*** ./galaxy/scripts/mvc/ui/ui-drilldown.js ***!
  \***********************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function($) {// dependencies
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(/*! utils/utils */ 21), __webpack_require__(/*! mvc/ui/ui-options */ 26)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Utils, Options) {
	
	/**
	 *  This class creates/wraps a drill down element.
	 */
	var View = Options.BaseIcons.extend({
	    // initialize
	    initialize: function(options) {
	        options.type     = options.display || 'checkbox';
	        options.multiple = (options.display == 'checkbox');
	        Options.BaseIcons.prototype.initialize.call(this, options);
	        this.initial = true;
	    },
	
	    // set expand states for initial value
	    value: function (new_val) {
	        var val = Options.BaseIcons.prototype.value.call(this, new_val);
	        if (this.initial && val !== null && this.header_index) {
	            this.initial = false;
	            var values = val;
	            if (!$.isArray(values)) {
	                values = [values];
	            }
	            for (var i in values) {
	                var list = this.header_index[values[i]];
	                for (var j in list) {
	                    this._setState(list[j], true);
	                }
	            }
	        }
	        return val;
	    },
	
	    /** Expand/collapse a sub group
	    */
	    _setState: function (header_id, is_expanded) {
	        var $button = this.$('.button-' + header_id);
	        var $subgroup = this.$('.subgroup-' + header_id);
	        $button.data('is_expanded', is_expanded);
	        if (is_expanded) {
	            $subgroup.fadeIn('fast')
	            $button.removeClass('fa-plus-square');
	            $button.addClass('fa-minus-square');
	        } else {
	            $subgroup.hide();
	            $button.removeClass('fa-minus-square');
	            $button.addClass('fa-plus-square');
	        }
	    },
	
	    /** Template to create options tree
	    */
	    _templateOptions: function(options) {
	        // link this
	        var self = this;
	
	        // link data
	        this.header_index = {};
	        
	        // attach event handler
	        function attach($el, header_id) {
	            var $button = $el.find('.button-' + header_id);
	            $button.on('click', function() {
	                self._setState(header_id, !$button.data('is_expanded'));
	            });
	        }
	
	        // recursive function which iterates through options
	        function iterate ($tmpl, options, header) {
	            header = header || [];
	            for (i in options) {
	                // current option level in hierarchy
	                var level = options[i];
	
	                // check for options
	                var has_options = level.options.length > 0;
	
	                // copy current header list
	                var new_header = header.slice(0);
	
	                // keep track of header list
	                self.header_index[level.value] = new_header.slice(0);
	
	                // build template
	                var $group = $('<div/>');
	                if (has_options) {
	                    // create button and subgroup
	                    var header_id = Utils.uid();
	                    var $button = $('<span class="button-' + header_id + ' ui-drilldown-button fa fa-plus-square"/>');
	                    var $subgroup = $('<div class="subgroup-' + header_id + '" style="display: none; margin-left: 25px;"/>');
	
	                    // keep track of button and subgroup
	                    new_header.push(header_id);
	
	                    // create expandable header section
	                    var $buttongroup = $('<div/>');
	                    $buttongroup.append($button);
	                    $buttongroup.append(self._templateOption({
	                        label: level.name,
	                        value: level.value
	                    }));
	                    $group.append($buttongroup);
	                    iterate($subgroup, level.options, new_header);
	                    $group.append($subgroup);
	
	                    // attach expand/collapse events
	                    attach($group, header_id);
	                } else {
	                    // append child options
	                    $group.append(self._templateOption({
	                        label: level.name,
	                        value: level.value
	                    }));
	                }
	                $tmpl.append($group);
	            }
	        }
	
	        // iterate through options and create dom
	        var $tmpl = $('<div/>');
	        iterate($tmpl, options);
	
	        // return template
	        return $tmpl;
	    },
	
	    /** Template for drill down view
	    */
	    _template: function(options) {
	        return '<div class="ui-options-list drilldown-container" id="' + options.id + '"/>';
	    }
	});
	
	return {
	    View: View
	}
	
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 28 */
/*!***************************************************!*\
  !*** ./galaxy/scripts/mvc/tool/tool-form-base.js ***!
  \***************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function($) {/**
	    This is the base class of the tool form plugin. This class is e.g. inherited by the regular and the workflow tool form.
	*/
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(/*! utils/utils */ 21), __webpack_require__(/*! utils/deferred */ 29), __webpack_require__(/*! mvc/ui/ui-misc */ 22), __webpack_require__(/*! mvc/form/form-view */ 30),
	        __webpack_require__(/*! mvc/tool/tool-template */ 44), __webpack_require__(/*! mvc/citation/citation-model */ 45), __webpack_require__(/*! mvc/citation/citation-view */ 47)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Utils, Deferred, Ui, FormBase, ToolTemplate, CitationModel, CitationView) {
	    return FormBase.extend({
	        initialize: function(options) {
	            var self = this;
	            FormBase.prototype.initialize.call(this, options);
	            this.deferred = new Deferred();
	            if (options.inputs) {
	                this._buildForm(options);
	                options.needs_update && this.deferred.execute( function( process ) {
	                    self._updateModel( process );
	                });
	            } else {
	                this.deferred.execute(function(process) {
	                    self._buildModel(process, options, true);
	                });
	            }
	        },
	
	        /** Wait for deferred build processes before removal */
	        remove: function() {
	            var self = this;
	            this.$el.hide();
	            this.deferred.execute(function(){
	                FormBase.prototype.remove.call(self);
	                Galaxy.emit.debug('tool-form-base::remove()', 'Destroy view.');
	            });
	        },
	
	        /** Build form */
	        _buildForm: function(options) {
	            var self = this;
	            this.options = Utils.merge(options, this.options);
	            this.options = Utils.merge({
	                icon            : ( (options.icon === undefined) && 'fa-wrench' ) || '',
	                title           : '<b>' + options.name + '</b> ' + options.description + ' (Galaxy Version ' + options.version + ')',
	                operations      : this._operations(),
	                onchange        : function() {
	                    self.deferred.reset();
	                    self.deferred.execute(function(process) {
	                        self._updateModel(process);
	                    });
	                }
	            }, this.options);
	            this.options.customize && this.options.customize( this.options );
	            this.render();
	            if ( !this.options.collapsible ) {
	                this.$el.append( $( '<div/>' ).addClass( 'ui-margin-top-large' ).append( this._footer() ) );
	            }
	        },
	
	        /** Builds a new model through api call and recreates the entire form
	        */
	        _buildModel: function(process, options, hide_message) {
	            var self = this;
	            this.options.id = options.id;
	            this.options.version = options.version;
	
	            // build request url
	            var build_url = '';
	            var build_data = {};
	            if ( options.job_id ) {
	                build_url = Galaxy.root + 'api/jobs/' + options.job_id + '/build_for_rerun';
	            } else {
	                build_url = Galaxy.root + 'api/tools/' + options.id + '/build';
	                if ( Galaxy.params && Galaxy.params.tool_id == options.id ) {
	                    build_data = $.extend( {}, Galaxy.params );
	                    options.version && ( build_data[ 'tool_version' ] = options.version );
	                }
	            }
	
	            // get initial model
	            Utils.request({
	                type    : 'GET',
	                url     : build_url,
	                data    : build_data,
	                success : function(new_model) {
	                    self._buildForm(new_model['tool_model'] || new_model);
	                    !hide_message && self.message.update({
	                        status      : 'success',
	                        message     : 'Now you are using \'' + self.options.name + '\' version ' + self.options.version + ', id \'' + self.options.id + '\'.',
	                        persistent  : false
	                    });
	                    Galaxy.emit.debug('tool-form-base::initialize()', 'Initial tool model ready.', new_model);
	                    process.resolve();
	
	                },
	                error   : function(response) {
	                    var error_message = ( response && response.err_msg ) || 'Uncaught error.';
	                    if ( self.$el.is(':empty') ) {
	                        self.$el.prepend((new Ui.Message({
	                            message     : error_message,
	                            status      : 'danger',
	                            persistent  : true,
	                            large       : true
	                        })).$el);
	                    } else {
	                        Galaxy.modal.show({
	                            title   : 'Tool request failed',
	                            body    : error_message,
	                            buttons : {
	                                'Close' : function() {
	                                    Galaxy.modal.hide();
	                                }
	                            }
	                        });
	                    }
	                    Galaxy.emit.debug('tool-form::initialize()', 'Initial tool model request failed.', response);
	                    process.reject();
	                }
	            });
	        },
	
	        /** Request a new model for an already created tool form and updates the form inputs
	        */
	        _updateModel: function(process) {
	            // link this
	            var self = this;
	            var model_url = this.options.update_url || Galaxy.root + 'api/tools/' + this.options.id + '/build';
	            var current_state = {
	                tool_id         : this.options.id,
	                tool_version    : this.options.version,
	                inputs          : $.extend(true, {}, self.data.create())
	            }
	            this.wait(true);
	
	            // log tool state
	            Galaxy.emit.debug('tool-form-base::_updateModel()', 'Sending current state.', current_state);
	
	            // post job
	            Utils.request({
	                type    : 'POST',
	                url     : model_url,
	                data    : current_state,
	                success : function(new_model) {
	                    self.update(new_model['tool_model'] || new_model);
	                    self.options.update && self.options.update(new_model);
	                    self.wait(false);
	                    Galaxy.emit.debug('tool-form-base::_updateModel()', 'Received new model.', new_model);
	                    process.resolve();
	                },
	                error   : function(response) {
	                    Galaxy.emit.debug('tool-form-base::_updateModel()', 'Refresh request failed.', response);
	                    process.reject();
	                }
	            });
	        },
	
	        /** Create tool operation menu
	        */
	        _operations: function() {
	            var self = this;
	            var options = this.options;
	
	            // button for version selection
	            var versions_button = new Ui.ButtonMenu({
	                icon    : 'fa-cubes',
	                title   : (!options.narrow && 'Versions') || null,
	                tooltip : 'Select another tool version'
	            });
	            if (!options.sustain_version && options.versions && options.versions.length > 1) {
	                for (var i in options.versions) {
	                    var version = options.versions[i];
	                    if (version != options.version) {
	                        versions_button.addMenu({
	                            title   : 'Switch to ' + version,
	                            version : version,
	                            icon    : 'fa-cube',
	                            onclick : function() {
	                                // here we update the tool version (some tools encode the version also in the id)
	                                var id = options.id.replace(options.version, this.version);
	                                var version = this.version;
	                                // queue model request
	                                self.deferred.reset();
	                                self.deferred.execute(function(process) {
	                                    self._buildModel(process, {id: id, version: version})
	                                });
	                            }
	                        });
	                    }
	                }
	            } else {
	                versions_button.$el.hide();
	            }
	
	            // button for options e.g. search, help
	            var menu_button = new Ui.ButtonMenu({
	                icon    : 'fa-caret-down',
	                title   : (!options.narrow && 'Options') || null,
	                tooltip : 'View available options'
	            });
	            if(options.biostar_url) {
	                menu_button.addMenu({
	                    icon    : 'fa-question-circle',
	                    title   : 'Question?',
	                    tooltip : 'Ask a question about this tool (Biostar)',
	                    onclick : function() {
	                        window.open(options.biostar_url + '/p/new/post/');
	                    }
	                });
	                menu_button.addMenu({
	                    icon    : 'fa-search',
	                    title   : 'Search',
	                    tooltip : 'Search help for this tool (Biostar)',
	                    onclick : function() {
	                        window.open(options.biostar_url + '/local/search/page/?q=' + options.name);
	                    }
	                });
	            };
	            menu_button.addMenu({
	                icon    : 'fa-share',
	                title   : 'Share',
	                tooltip : 'Share this tool',
	                onclick : function() {
	                    prompt('Copy to clipboard: Ctrl+C, Enter', window.location.origin + Galaxy.root + 'root?tool_id=' + options.id);
	                }
	            });
	
	            // add admin operations
	            if (Galaxy.user && Galaxy.user.get('is_admin')) {
	                menu_button.addMenu({
	                    icon    : 'fa-download',
	                    title   : 'Download',
	                    tooltip : 'Download this tool',
	                    onclick : function() {
	                        window.location.href = Galaxy.root + 'api/tools/' + options.id + '/download';
	                    }
	                });
	            }
	
	            // button for version selection
	            if (options.requirements && options.requirements.length > 0) {
	                menu_button.addMenu({
	                    icon    : 'fa-info-circle',
	                    title   : 'Requirements',
	                    tooltip : 'Display tool requirements',
	                    onclick : function() {
	                        if (!this.visible) {
	                            this.visible = true;
	                            self.message.update({
	                                persistent  : true,
	                                message     : ToolTemplate.requirements(options),
	                                status      : 'info'
	                            });
	                        } else {
	                            this.visible = false;
	                            self.message.update({
	                                message     : ''
	                            });
	                        }
	                    }
	                });
	            }
	
	            // add toolshed url
	            if (options.sharable_url) {
	                menu_button.addMenu({
	                    icon    : 'fa-external-link',
	                    title   : 'See in Tool Shed',
	                    tooltip : 'Access the repository',
	                    onclick : function() {
	                        window.open(options.sharable_url);
	                    }
	                });
	            }
	
	            return {
	                menu        : menu_button,
	                versions    : versions_button
	            }
	        },
	
	        /** Create footer
	        */
	        _footer: function() {
	            var options = this.options;
	            var $el = $( '<div/>' ).append( ToolTemplate.help( options ) );
	            if ( options.citations ) {
	                var $citations = $( '<div/>' );
	                var citations = new CitationModel.ToolCitationCollection();
	                citations.tool_id = options.id;
	                var citation_list_view = new CitationView.CitationListView({ el: $citations, collection: citations });
	                citation_list_view.render();
	                citations.fetch();
	                $el.append( $citations );
	            }
	            return $el;
	        }
	    });
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 29 */
/*!******************************************!*\
  !*** ./galaxy/scripts/utils/deferred.js ***!
  \******************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone, $) {/**
	 *  This class defines a queue to ensure that multiple deferred callbacks are executed sequentially.
	 */
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(/*! utils/utils */ 21)], __WEBPACK_AMD_DEFINE_RESULT__ = function( Utils ) {
	return Backbone.Model.extend({
	    initialize: function(){
	        this.active = {};
	        this.last = null;
	    },
	
	    /** Adds a callback to the queue. Upon execution a deferred object is parsed to the callback i.e. callback( deferred ).
	     *  If the callback does not take any arguments, the deferred is resolved instantly.
	    */
	    execute: function( callback ) {
	        var self = this;
	        var id = Utils.uid();
	        var has_deferred = callback.length > 0;
	
	        // register process
	        this.active[ id ] = true;
	
	        // deferred process
	        var process = $.Deferred();
	        process.promise().always(function() {
	            delete self.active[ id ];
	            has_deferred && Galaxy.emit.debug( 'deferred::execute()', this.state().charAt(0).toUpperCase() + this.state().slice(1) + ' ' + id );
	        });
	
	        // deferred queue
	        $.when( this.last ).always(function() {
	            if ( self.active[ id ] ) {
	                has_deferred && Galaxy.emit.debug( 'deferred::execute()', 'Running ' + id );
	                callback( process );
	                !has_deferred && process.resolve();
	            } else {
	                process.reject();
	            }
	        });
	        this.last = process.promise();
	    },
	
	    /** Resets the promise queue. All currently queued but unexecuted callbacks/promises will be rejected.
	    */
	    reset: function() {
	        Galaxy.emit.debug('deferred::execute()', 'Reset');
	        for ( var i in this.active ) {
	            this.active[ i ] = false;
	        }
	    },
	
	    /** Returns true if all processes are done.
	    */
	    ready: function() {
	        return $.isEmptyObject( this.active );
	    }
	});
	
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 30 */
/*!**********************************************!*\
  !*** ./galaxy/scripts/mvc/form/form-view.js ***!
  \**********************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone, _, $) {/**
	    This is the main class of the form plugin. It is referenced as 'app' in all lower level modules.
	*/
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(/*! utils/utils */ 21), __webpack_require__(/*! mvc/ui/ui-portlet */ 31), __webpack_require__(/*! mvc/ui/ui-misc */ 22), __webpack_require__(/*! mvc/form/form-section */ 32), __webpack_require__(/*! mvc/form/form-data */ 43)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Utils, Portlet, Ui, FormSection, FormData) {
	    return Backbone.View.extend({
	        initialize: function(options) {
	            this.options = Utils.merge(options, {
	                initial_errors  : false,
	                cls             : 'ui-portlet-limited',
	                icon            : ''
	            });
	            this.modal = ( parent.Galaxy && parent.Galaxy.modal ) || new Ui.Modal.View();
	            this.setElement('<div/>');
	            this.render();
	        },
	
	        /** Update available options */
	        update: function(new_model){
	            var self = this;
	            this.data.matchModel(new_model, function(input_id, node) {
	                var input = self.input_list[input_id];
	                if (input && input.options) {
	                    if (!_.isEqual(input.options, node.options)) {
	                        // backup new options
	                        input.options = node.options;
	
	                        // get/update field
	                        var field = self.field_list[input_id];
	                        if (field.update) {
	                            var new_options = [];
	                            if ((['data', 'data_collection', 'drill_down']).indexOf(input.type) != -1) {
	                                new_options = input.options;
	                            } else {
	                                for (var i in node.options) {
	                                    var opt = node.options[i];
	                                    if (opt.length > 2) {
	                                        new_options.push({
	                                            'label': opt[0],
	                                            'value': opt[1]
	                                        });
	                                    }
	                                }
	                            }
	                            field.update(new_options);
	                            field.trigger('change');
	                            Galaxy.emit.debug('form-view::update()', 'Updating options for ' + input_id);
	                        }
	                    }
	                }
	            });
	        },
	
	        /** Set form into wait mode */
	        wait: function(active) {
	            for (var i in this.input_list) {
	                var field = this.field_list[i];
	                var input = this.input_list[i];
	                if (input.is_dynamic && field.wait && field.unwait) {
	                    if (active) {
	                        field.wait();
	                    } else {
	                        field.unwait();
	                    }
	                }
	            }
	        },
	
	        /** Highlight and scroll to input element (currently only used for error notifications)
	        */
	        highlight: function (input_id, message, silent) {
	            // get input field
	            var input_element = this.element_list[input_id];
	
	            // check input element
	            if (input_element) {
	                // mark error
	                input_element.error(message || 'Please verify this parameter.');
	
	                // trigger expand event for parent containers
	                this.trigger('expand', input_id);
	
	                // scroll to first input element
	                if (!silent) {
	                    if (self==top) {
	                        var $panel = this.$el.parents().filter(function() {
	                            return $(this).css('overflow') == 'auto';
	                        }).first();
	                        $panel.animate({ scrollTop : $panel.scrollTop() + input_element.$el.offset().top - 50 }, 500);
	                    } else {
	                        $('html, body').animate({ scrollTop : input_element.$el.offset().top - 20 }, 500);
	                    }
	                }
	            }
	        },
	
	        /** Highlights errors
	        */
	        errors: function(options) {
	            // hide previous error statements
	            this.trigger('reset');
	
	            // highlight all errors
	            if (options && options.errors) {
	                var error_messages = this.data.matchResponse(options.errors);
	                for (var input_id in this.element_list) {
	                    var input = this.element_list[input_id];
	                    if (error_messages[input_id]) {
	                        this.highlight(input_id, error_messages[input_id], true);
	                    }
	                }
	            }
	        },
	
	        /** Render tool form
	        */
	        render: function() {
	            // link this
	            var self = this;
	
	            // reset events
	            this.off('change');
	            this.off('reset');
	
	            // reset field list, which contains the input field elements
	            this.field_list = {};
	
	            // reset sequential input definition list, which contains the input definitions as provided from the api
	            this.input_list = {};
	
	            // reset input element list, which contains the dom elements of each input element (includes also the input field)
	            this.element_list = {};
	
	            // creates a json data structure from the input form
	            this.data = new FormData.Manager(this);
	
	            // create ui elements
	            this._renderForm();
	
	            // refresh data
	            this.data.create();
	
	            // show errors on startup
	            if (this.options.initial_errors) {
	                this.errors(this.options);
	            }
	
	            // add listener which triggers on checksum change
	            var current_check = this.data.checksum();
	            this.on('change', function() {
	                var new_check = self.data.checksum();
	                if (new_check != current_check) {
	                    current_check = new_check;
	                    self.options.onchange && self.options.onchange();
	                }
	            });
	
	            // add reset listener
	            this.on('reset', function() {
	                for (var i in this.element_list) {
	                    this.element_list[i].reset();
	                }
	            });
	            return this;
	        },
	
	        /** Renders the UI elements required for the form
	        */
	        _renderForm: function() {
	            // create message view
	            this.message = new Ui.Message();
	
	            // create tool form section
	            this.section = new FormSection.View(this, {
	                inputs : this.options.inputs
	            });
	
	            // remove tooltips
	            $( '.tooltip' ).remove();
	
	            // create portlet
	            this.portlet = new Portlet.View({
	                icon        : this.options.icon,
	                title       : this.options.title,
	                cls         : this.options.cls,
	                operations  : this.options.operations,
	                buttons     : this.options.buttons,
	                collapsible : this.options.collapsible,
	                collapsed   : this.options.collapsed
	            });
	
	            // append message
	            this.portlet.append(this.message.$el);
	
	            // append tool section
	            this.portlet.append(this.section.$el);
	
	            // start form
	            this.$el.empty();
	            this.$el.append(this.portlet.$el);
	
	            // show message if available in model
	            if (this.options.message) {
	                this.message.update({
	                    persistent  : true,
	                    status      : 'warning',
	                    message     : this.options.message
	                });
	            }
	
	            // log
	            Galaxy.emit.debug('form-view::initialize()', 'Completed');
	        }
	    });
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! underscore */ 1), __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 31 */
/*!*********************************************!*\
  !*** ./galaxy/scripts/mvc/ui/ui-portlet.js ***!
  \*********************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone, $) {!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(/*! utils/utils */ 21)], __WEBPACK_AMD_DEFINE_RESULT__ = function( Utils ) {
	var View = Backbone.View.extend({
	    visible     : false,
	    initialize  : function( options ) {
	        var self = this;
	        this.options = Utils.merge( options, {
	            id              : Utils.uid(),
	            title           : '',
	            icon            : '',
	            buttons         : null,
	            body            : null,
	            scrollable      : true,
	            nopadding       : false,
	            operations      : null,
	            placement       : 'bottom',
	            cls             : 'ui-portlet',
	            operations_flt  : 'right',
	            collapsible     : false,
	            collapsed       : false
	        });
	        this.setElement( this._template( this.options ) );
	
	        // link content
	        this.$body = this.$( '.portlet-body' );
	        this.$title = this.$( '.portlet-title-text' );
	        this.$header = this.$( '.portlet-header' );
	        this.$content = this.$( '.portlet-content' );
	        this.$footer = this.$( '.portlet-footer' );
	
	        // set content padding
	        if ( this.options.nopadding ) {
	            this.$content.css( 'padding', '0px' );
	            this.$body.css( 'padding', '0px' );
	        }
	
	        // append buttons
	        this.$buttons = this.$( '.portlet-buttons' );
	        if ( this.options.buttons ) {
	            $.each( this.options.buttons, function( name, item ) {
	                item.$el.prop( 'id', name );
	                self.$buttons.append( item.$el );
	            });
	        } else {
	            this.$buttons.remove();
	        }
	
	        // append operations
	        this.$operations = this.$( '.portlet-operations' );
	        if ( this.options.operations ) {
	            $.each( this.options.operations, function( name, item ) {
	                item.$el.prop( 'id', name );
	                self.$operations.append( item.$el );
	            });
	        }
	
	        // add body
	        this.options.body && this.append( this.options.body );
	
	        // make portlet collapsible
	        this.collapsed = false;
	        if ( this.options.collapsible ) {
	            this.$title.addClass( 'no-highlight' ).css({
	                'cursor'            : 'pointer',
	                'text-decoration'   : 'underline'
	            });
	            this.$title.on( 'click', function() {
	                if ( self.collapsed ) { self.expand(); } else { self.collapse(); }
	            });
	            this.options.collapsed && this.collapse();
	        }
	    },
	
	    // append
	    append: function( $el ) {
	        this.$body.append( $el );
	    },
	
	    // remove all content
	    empty: function() {
	        this.$body.empty();
	    },
	
	    // header
	    header: function() {
	        return this.$header;
	    },
	
	    // body
	    body: function() {
	        return this.$body;
	    },
	
	    // footer
	    footer: function() {
	        return this.$footer;
	    },
	
	    // show
	    show: function(){
	        this.visible = true;
	        this.$el.fadeIn( 'fast' );
	    },
	
	    // hide
	    hide: function(){
	        this.visible = false;
	        this.$el.fadeOut( 'fast' );
	    },
	
	    // enable buttons
	    enableButton: function( id ) {
	        this.$buttons.find( '#' + id ).prop( 'disabled', false );
	    },
	
	    // disable buttons
	    disableButton: function( id ) {
	        this.$buttons.find( '#' + id ).prop( 'disabled', true );
	    },
	
	    // hide operation
	    hideOperation: function( id ) {
	        this.$operations.find( '#' + id ).hide();
	    },
	
	    // show operation
	    showOperation: function( id ) {
	        this.$operations.find( '#' + id ).show();
	    },
	
	    // set operation
	    setOperation: function( id, callback ) {
	        var $el = this.$operations.find( '#' + id );
	        $el.off( 'click' );
	        $el.on( 'click', callback );
	    },
	
	    // title
	    title: function( new_title ) {
	        var $el = this.$title;
	        if ( new_title ) {
	            $el.html( new_title );
	        }
	        return $el.html();
	    },
	
	    // collapse portlet
	    collapse: function() {
	        this.collapsed = true;
	        this.$content.height( '0%' );
	        this.$body.hide();
	        this.$footer.hide();
	        this.trigger( 'collapsed' );
	    },
	
	    // expand portlet
	    expand: function() {
	        this.collapsed = false;
	        this.$content.height( '100%' );
	        this.$body.fadeIn( 'fast' );
	        this.$footer.fadeIn( 'fast' );
	        this.trigger( 'expanded' );
	    },
	
	    // disable content access
	    disable: function() {
	        this.$( '.portlet-backdrop' ).show();
	    },
	
	    // enable content access
	    enable: function() {
	        this.$( '.portlet-backdrop' ).hide();
	    },
	
	    // fill regular modal template
	    _template: function( options ) {
	        var tmpl =  '<div id="' + options.id + '" class="' + options.cls + '">';
	        if ( options.title ) {
	            tmpl +=     '<div class="portlet-header">' +
	                            '<div class="portlet-operations" style="float: ' + options.operations_flt + ';"/>' +
	                            '<div class="portlet-title">';
	            if ( options.icon ) {
	                tmpl +=         '<i class="icon fa ' + options.icon + '">&nbsp;</i>';
	            }
	            tmpl +=             '<span class="portlet-title-text">' + options.title + '</span>' +
	                            '</div>' +
	                        '</div>';
	        }
	        tmpl +=         '<div class="portlet-content">';
	        if ( options.placement == 'top' ) {
	            tmpl +=         '<div class="portlet-buttons"/>';
	        }
	        tmpl +=             '<div class="portlet-body"/>';
	        if ( options.placement == 'bottom' ) {
	            tmpl +=         '<div class="portlet-buttons"/>';
	        }
	        tmpl +=         '</div>' +
	                        '<div class="portlet-footer"/>' +
	                        '<div class="portlet-backdrop"/>' +
	                    '</div>';
	        return tmpl;
	    }
	});
	return {
	    View : View
	}
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 32 */
/*!*************************************************!*\
  !*** ./galaxy/scripts/mvc/form/form-section.js ***!
  \*************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone, jQuery, _, $) {/**
	    This class creates a form section and populates it with input elements. It also handles repeat blocks and conditionals by recursively creating new sub sections.
	*/
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(/*! utils/utils */ 21),
	        __webpack_require__(/*! mvc/ui/ui-table */ 33),
	        __webpack_require__(/*! mvc/ui/ui-misc */ 22),
	        __webpack_require__(/*! mvc/ui/ui-portlet */ 31),
	        __webpack_require__(/*! mvc/form/form-repeat */ 34),
	        __webpack_require__(/*! mvc/form/form-input */ 35),
	        __webpack_require__(/*! mvc/form/form-parameters */ 36)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Utils, Table, Ui, Portlet, Repeat, InputElement, Parameters) {
	    var View = Backbone.View.extend({
	        initialize: function(app, options) {
	            this.app = app;
	            this.inputs = options.inputs;
	
	            // fix table style
	            options.cls = 'ui-table-plain';
	
	            // add table class for tr tag
	            // this assist in transforming the form into a json structure
	            options.cls_tr = 'section-row';
	
	            // create/render views
	            this.table = new Table.View(options);
	            this.parameters = new Parameters(app, options);
	            this.setElement(this.table.$el);
	            this.render();
	        },
	
	        /** Render section view
	        */
	        render: function() {
	            this.table.delAll();
	            for (var i in this.inputs) {
	                this.add(this.inputs[i]);
	            }
	        },
	
	        /** Add a new input element
	        */
	        add: function(input) {
	            var self = this;
	            var input_def = jQuery.extend(true, {}, input);
	            input_def.id = input.id = Utils.uid();
	
	            // add to sequential list of inputs
	            this.app.input_list[input_def.id] = input_def;
	
	            // identify field type
	            var type = input_def.type;
	            switch(type) {
	                case 'conditional':
	                    this._addConditional(input_def);
	                    break;
	                case 'repeat':
	                    this._addRepeat(input_def);
	                    break;
	                case 'section':
	                    this._addSection(input_def);
	                    break;
	                default:
	                    this._addRow(input_def);
	            }
	        },
	
	        /** Add a conditional block
	        */
	        _addConditional: function(input_def) {
	            var self = this;
	            input_def.test_param.id = input_def.id;
	            this.app.options.sustain_conditionals && ( input_def.test_param.disabled = true );
	            var field = this._addRow( input_def.test_param );
	
	            // set onchange event for test parameter
	            field.options.onchange = function(value) {
	                var selectedCase = self.app.data.matchCase(input_def, value);
	                for (var i in input_def.cases) {
	                    var case_def = input_def.cases[i];
	                    var section_id = input_def.id + '-section-' + i;
	                    var section_row = self.table.get(section_id);
	                    var nonhidden = false;
	                    for (var j in case_def.inputs) {
	                        if (!case_def.inputs[j].hidden) {
	                            nonhidden = true;
	                            break;
	                        }
	                    }
	                    if (i == selectedCase && nonhidden) {
	                        section_row.fadeIn('fast');
	                    } else {
	                        section_row.hide();
	                    }
	                }
	                self.app.trigger('change');
	            };
	
	            // add conditional sub sections
	            for (var i in input_def.cases) {
	                var sub_section_id = input_def.id + '-section-' + i;
	                var sub_section = new View(this.app, {
	                    inputs  : input_def.cases[i].inputs
	                });
	                sub_section.$el.addClass('ui-table-section');
	                this.table.add(sub_section.$el);
	                this.table.append(sub_section_id);
	            }
	
	            // trigger refresh on conditional input field after all input elements have been created
	            field.trigger('change');
	        },
	
	        /** Add a repeat block
	        */
	        _addRepeat: function(input_def) {
	            var self = this;
	            var block_index = 0;
	
	            // create repeat block element
	            var repeat = new Repeat.View({
	                title           : input_def.title || 'Repeat',
	                title_new       : input_def.title || '',
	                min             : input_def.min,
	                max             : input_def.max,
	                onnew           : function() {
	                    create(input_def.inputs);
	                    self.app.trigger('change');
	                }
	            });
	
	            // helper function to create new repeat blocks
	            function create (inputs) {
	                var sub_section_id = input_def.id + '-section-' + (block_index++);
	                var sub_section = new View(self.app, {
	                    inputs  : inputs
	                });
	                repeat.add({
	                    id      : sub_section_id,
	                    $el     : sub_section.$el,
	                    ondel   : function() {
	                        repeat.del(sub_section_id);
	                        self.app.trigger('change');
	                    }
	                });
	            }
	
	            //
	            // add parsed/minimum number of repeat blocks
	            //
	            var n_min   = input_def.min;
	            var n_cache = _.size(input_def.cache);
	            for (var i = 0; i < Math.max(n_cache, n_min); i++) {
	                var inputs = null;
	                if (i < n_cache) {
	                    inputs = input_def.cache[i];
	                } else {
	                    inputs = input_def.inputs;
	                }
	                create(inputs);
	            }
	
	            // hide options
	            this.app.options.sustain_repeats && repeat.hideOptions();
	
	            // create input field wrapper
	            var input_element = new InputElement(this.app, {
	                label   : input_def.title || input_def.name,
	                help    : input_def.help,
	                field   : repeat
	            });
	            this.table.add(input_element.$el);
	            this.table.append(input_def.id);
	        },
	
	        /** Add a customized section
	        */
	        _addSection: function(input_def) {
	            var self = this;
	
	            // create sub section
	            var sub_section = new View(self.app, {
	                inputs  : input_def.inputs
	            });
	
	            // delete button
	            var button_visible = new Ui.ButtonIcon({
	                icon    : 'fa-eye-slash',
	                tooltip : 'Show/hide section',
	                cls     : 'ui-button-icon-plain'
	            });
	
	            // create portlet for sub section
	            var portlet = new Portlet.View({
	                title       : input_def.title || input_def.name,
	                cls         : 'ui-portlet-section',
	                collapsible : true,
	                collapsed   : true,
	                operations  : {
	                    button_visible: button_visible
	                }
	            });
	            portlet.append( sub_section.$el );
	            portlet.append( $( '<div/>' ).addClass( 'ui-form-info' ).html( input_def.help ) );
	            portlet.setOperation( 'button_visible', function() {
	                if( portlet.collapsed ) {
	                    portlet.expand();
	                } else {
	                    portlet.collapse();
	                }
	            });
	
	            // add expansion event handler
	            portlet.on( 'expanded', function() {
	                button_visible.setIcon( 'fa-eye' );
	            });
	            portlet.on( 'collapsed', function() {
	                button_visible.setIcon( 'fa-eye-slash' );
	            });
	            this.app.on( 'expand', function( input_id ) {
	                ( portlet.$( '#' + input_id ).length > 0 ) && portlet.expand();
	            });
	
	            // show sub section if requested
	            input_def.expanded && portlet.expand();
	
	            // create table row
	            this.table.add(portlet.$el);
	            this.table.append(input_def.id);
	        },
	
	        /** Add a single input field element
	        */
	        _addRow: function(input_def) {
	            var id = input_def.id;
	            var field = this.parameters.create(input_def);
	            this.app.field_list[id] = field;
	            var input_element = new InputElement(this.app, {
	                name                : input_def.name,
	                label               : input_def.label || input_def.name,
	                value               : input_def.value,
	                default_value       : input_def.default_value,
	                text_value          : input_def.text_value || input_def.value,
	                collapsible_value   : input_def.collapsible_value,
	                collapsible_preview : input_def.collapsible_preview,
	                help                : input_def.help,
	                argument            : input_def.argument,
	                disabled            : input_def.disabled,
	                field               : field
	            });
	            this.app.element_list[id] = input_element;
	            this.table.add(input_element.$el);
	            this.table.append(id);
	            input_def.hidden && this.table.get(id).hide();
	            return field;
	        }
	    });
	
	    return {
	        View: View
	    };
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! jquery */ 3), __webpack_require__(/*! underscore */ 1), __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 33 */
/*!*******************************************!*\
  !*** ./galaxy/scripts/mvc/ui/ui-table.js ***!
  \*******************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone, $) {// dependencies
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(/*! utils/utils */ 21)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Utils) {
	
	/**
	 *  This class creates a ui table element.
	 */
	var View = Backbone.View.extend({
	    // current row
	    row: null,
	    
	    // count rows
	    row_count: 0,
	    
	    // defaults options
	    optionsDefault: {
	        content     : 'No content available.',
	        onchange    : null,
	        ondblclick  : null,
	        onconfirm   : null,
	        cls         : 'ui-table',
	        cls_tr      : ''
	    },
	    
	    // events
	    events : {
	        'click'     : '_onclick',
	        'dblclick'  : '_ondblclick'
	    },
	    
	    // initialize
	    initialize : function(options) {
	        // configure options
	        this.options = Utils.merge(options, this.optionsDefault);
	        
	        // create new element
	        var $el = $(this._template(this.options));
	        
	        // link sub-elements
	        this.$thead = $el.find('thead');
	        this.$tbody = $el.find('tbody');
	        this.$tmessage = $el.find('tmessage');
	        
	        // set element
	        this.setElement($el);
	                
	        // initialize row
	        this.row = this._row();
	    },
	    
	    // add header cell
	    addHeader: function($el) {
	        var wrapper = $('<th></th>');
	        wrapper.append($el);
	        this.row.append(wrapper);
	    },
	    
	    // header
	    appendHeader: function() {
	        // append header row
	        this.$thead.append(this.row);
	
	        // row
	        this.row = $('<tr></tr>');
	    },
	    
	    // add row cell
	    add: function($el, width, align) {
	        var wrapper = $('<td></td>');
	        if (width) {
	            wrapper.css('width', width);
	        }
	        if (align) {
	            wrapper.css('text-align', align);
	        }
	        wrapper.append($el);
	        this.row.append(wrapper);
	    },
	    
	    // append
	    append: function(id, fade) {
	        this._commit(id, fade, false);
	    },
	    
	    // prepend
	    prepend: function(id, fade) {
	        this._commit(id, fade, true);
	    },
	    
	    // get element
	    get: function(id) {
	        return this.$el.find('#' + id);
	    },
	    
	    // delete
	    del: function(id) {
	        var item = this.$tbody.find('#' + id);
	        if (item.length > 0) {
	            item.remove();
	            this.row_count--;
	            this._refresh();
	        }
	    },
	
	    // delete all
	    delAll: function() {
	        this.$tbody.empty();
	        this.row_count = 0;
	        this._refresh();
	    },
	        
	    // value
	    value: function(new_value) {
	        // get current id/value
	        this.before = this.$tbody.find('.current').attr('id');
	        
	        // check if new_value is defined
	        if (new_value !== undefined) {
	            this.$tbody.find('tr').removeClass('current');
	            if (new_value) {
	                this.$tbody.find('#' + new_value).addClass('current');
	            }
	        }
	        
	        // get current id/value
	        var after = this.$tbody.find('.current').attr('id');
	        if(after === undefined) {
	            return null;
	        } else {
	            // fire onchange
	            if (after != this.before && this.options.onchange) {
	                this.options.onchange(new_value);
	            }
	            
	            // return current value
	            return after;
	        }
	    },
	    
	    // size
	    size: function() {
	        return this.$tbody.find('tr').length;
	    },
	    
	    // commit
	    _commit: function(id, fade, prepend) {
	        // remove previous item with same id
	        this.del(id);
	        
	        // add
	        this.row.attr('id', id);
	        
	        // add row
	        if (prepend) {
	            this.$tbody.prepend(this.row);
	        } else {
	            this.$tbody.append(this.row);
	        }
	        
	        // fade mode
	        if (fade) {
	            this.row.hide();
	            this.row.fadeIn();
	        }
	        
	        // row
	        this.row = this._row();
	        
	        // row count
	        this.row_count++;
	        this._refresh();
	    },
	    
	    // create new row
	    _row: function() {
	        return $('<tr class="' + this.options.cls_tr + '"></tr>');
	    },
	    
	    // onclick
	    _onclick: function(e) {
	        // get values
	        var old_value = this.value();
	        var new_value = $(e.target).closest('tr').attr('id');
	        if (new_value != ''){
	            // check equality
	            if (new_value && old_value != new_value) {
	                if (this.options.onconfirm) {
	                    this.options.onconfirm(new_value);
	                } else {
	                    this.value(new_value);
	                }
	            }
	        }
	    },
	
	    // ondblclick
	    _ondblclick: function(e) {
	        var value = this.value();
	        if (value && this.options.ondblclick) {
	            this.options.ondblclick(value);
	        }
	    },
	        
	    // refresh
	    _refresh: function() {
	        if (this.row_count == 0) {
	            this.$tmessage.show();
	        } else {
	            this.$tmessage.hide();
	        }
	    },
	        
	    // load html template
	    _template: function(options) {
	        return  '<div>' +
	                    '<table class="' + options.cls + '">' +
	                        '<thead></thead>' +
	                        '<tbody></tbody>' +
	                    '</table>' +
	                    '<tmessage>' + options.content + '</tmessage>' +
	                '<div>';
	    }
	});
	
	return {
	    View: View
	}
	
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 34 */
/*!************************************************!*\
  !*** ./galaxy/scripts/mvc/form/form-repeat.js ***!
  \************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone, $, _) {// dependencies
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(/*! utils/utils */ 21), __webpack_require__(/*! mvc/ui/ui-table */ 33), __webpack_require__(/*! mvc/ui/ui-portlet */ 31), __webpack_require__(/*! mvc/ui/ui-misc */ 22)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Utils, Table, Portlet, Ui) {
	
	/** This class creates a ui component which enables the dynamic creation of portlets
	*/
	var View = Backbone.View.extend({
	    initialize : function(options) {
	        var self = this;
	        this.options = Utils.merge(options, {
	            title       : 'Section',
	            empty_text  : 'Not available.',
	            max         : null,
	            min         : null
	        });
	        this.setElement('<div/>');
	
	        // create button
	        this.button_new = new Ui.ButtonIcon({
	            icon    : 'fa-plus',
	            title   : 'Insert ' + this.options.title_new,
	            tooltip : 'Add new ' + this.options.title_new + ' block',
	            floating: 'clear',
	            onclick : function() {
	                if (options.onnew) {
	                    options.onnew();
	                }
	            }
	        });
	
	        // create table
	        this.table = new Table.View({
	            cls     : 'ui-table-plain',
	            content : ''
	        });
	        this.$el.append(this.table.$el);
	        this.$el.append($('<div/>').append(this.button_new.$el));
	
	        // reset list
	        this.list = {};
	        this.n = 0;
	    },
	
	    /** Number of repeat blocks
	    */
	    size: function() {
	        return this.n;
	    },
	
	    /** Add new repeat block
	    */
	    add: function(options) {
	        if (!options.id || this.list[options.id]) {
	            Galaxy.emit.debug('form-repeat::add()', 'Duplicate repeat block id.');
	            return;
	        }
	        this.n++;
	        var button_delete = new Ui.ButtonIcon({
	            icon    : 'fa-trash-o',
	            tooltip : 'Delete this repeat block',
	            cls     : 'ui-button-icon-plain',
	            onclick : function() {
	                if (options.ondel) {
	                    options.ondel();
	                }
	            }
	        });
	        var portlet = new Portlet.View({
	            id              : options.id,
	            title           : 'placeholder',
	            cls             : 'ui-portlet-repeat',
	            operations      : {
	                button_delete : button_delete
	            }
	        });
	        portlet.append(options.$el);
	        portlet.$el.addClass('section-row');
	        this.list[options.id] = portlet;
	        this.table.add(portlet.$el);
	        this.table.append('row_' + options.id, true);
	        if (this.options.max > 0 && this.n >= this.options.max) {
	            this.button_new.disable();
	        }
	        this._refresh();
	    },
	
	    /** Delete repeat block
	    */
	    del: function(id) {
	        if (!this.list[id]) {
	            Galaxy.emit.debug('form-repeat::del()', 'Invalid repeat block id.');
	            return;
	        }
	        this.n--;
	        var table_row = this.table.get('row_' + id);
	        table_row.remove();
	        delete this.list[id];
	        this.button_new.enable();
	        this._refresh();
	    },
	
	    /** Hides add/del options
	    */
	    hideOptions: function() {
	        this.button_new.$el.hide();
	        _.each( this.list, function( portlet ) {
	            portlet.hideOperation('button_delete');
	        });
	        if( _.isEmpty( this.list ) ) {
	            this.$el.append( $('<div/>').addClass( 'ui-form-info' ).html( this.options.empty_text ) );
	        }
	    },
	
	    /** Refresh view
	    */
	    _refresh: function() {
	        var index = 0;
	        for (var id in this.list) {
	            var portlet = this.list[id];
	            portlet.title(++index + ': ' + this.options.title);
	            if (this.n > this.options.min) {
	                portlet.showOperation('button_delete');
	            } else {
	                portlet.hideOperation('button_delete');
	            }
	        }
	    }
	});
	
	return {
	    View : View
	}
	
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! jquery */ 3), __webpack_require__(/*! underscore */ 1)))

/***/ },
/* 35 */
/*!***********************************************!*\
  !*** ./galaxy/scripts/mvc/form/form-input.js ***!
  \***********************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone) {/**
	    This class creates a form input element wrapper
	*/
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_RESULT__ = function() {
	    return Backbone.View.extend({
	        initialize: function(app, options) {
	            this.app = app;
	            this.field = options.field;
	
	            // set text labels and icons for collapsible button
	            this.text_enable    = app.options.text_enable || 'Enable';
	            this.text_disable   = app.options.text_disable || 'Disable';
	            this.cls_enable     = app.options.cls_enable || 'fa fa-caret-square-o-down';
	            this.cls_disable    = app.options.cls_disable || 'fa fa-caret-square-o-up';
	
	            // set element
	            this.setElement(this._template(options));
	
	            // link elements
	            this.$field = this.$('.ui-form-field');
	            this.$preview = this.$('.ui-form-preview');
	            this.$collapsible = this.$('.ui-form-collapsible');
	            this.$collapsible_icon = this.$('.ui-form-collapsible').find('.icon');
	            this.$error_text = this.$('.ui-form-error-text');
	            this.$error = this.$('.ui-form-error');
	            this.$backdrop = this.$('.ui-form-backdrop');
	
	            // add field element
	            this.$field.prepend(this.field.$el);
	
	            // decide wether to expand or collapse fields
	            this.field.collapsed = options.collapsible_value !== undefined && JSON.stringify( options.value ) == JSON.stringify( options.collapsible_value );
	
	            // refresh view
	            this._refresh();
	
	            // add collapsible hide/show
	            var self = this;
	            this.$collapsible.on('click', function() {
	                self.field.collapsed = !self.field.collapsed;
	                self._refresh();
	            });
	        },
	
	        /** Disable input element
	        */
	        disable: function( silent ) {
	            this.$backdrop.show();
	            silent && this.$backdrop.css({ 'opacity': 0, 'cursor': 'default' } );
	        },
	
	        /** Set error text
	        */
	        error: function(text) {
	            this.$error_text.html(text);
	            this.$error.show();
	            this.$el.addClass('ui-error');
	        },
	
	        /** Reset this view
	        */
	        reset: function() {
	            this.$error.hide();
	            this.$el.removeClass('ui-error');
	        },
	
	        /** Refresh element
	        */
	        _refresh: function() {
	            this.$collapsible_icon.removeClass().addClass('icon');
	            if (!this.field.collapsed) {
	                this.$field.fadeIn('fast');
	                this.$preview.hide();
	                this._tooltip(this.text_disable, this.cls_disable);
	            } else {
	                this.$field.hide();
	                this.$preview.show();
	                this._tooltip(this.text_enable, this.cls_enable);
	            }
	            this.app.trigger('change');
	        },
	
	        /** Set tooltip text
	        */
	        _tooltip: function(title, cls) {
	            this.$collapsible_icon.addClass(cls)
	                               .tooltip({ placement: 'bottom' })
	                               .attr('data-original-title', title)
	                               .tooltip('fixTitle').tooltip('hide');
	        },
	
	        /** Main Template
	        */
	        _template: function(options) {
	            var tmp =   '<div class="ui-form-element">' +
	                            '<div class="ui-form-error ui-error">' +
	                                '<span class="fa fa-arrow-down"/><span class="ui-form-error-text"/>' +
	                            '</div>' +
	                            '<div class="ui-form-title">';
	            if ( !options.disabled && options.collapsible_value !== undefined ) {
	                tmp +=          '<div class="ui-form-collapsible">' +
	                                    '<i class="icon"/>' + options.label +
	                                '</div>';
	            } else {
	                tmp += options.label;
	            }
	            tmp +=          '</div>' +
	                            '<div class="ui-form-field">';
	            tmp +=              '<div class="ui-form-info">';
	            if (options.help) {
	                tmp +=              options.help;
	                if (options.argument && options.help.indexOf('(' + options.argument + ')') == -1) {
	                    tmp += ' (' + options.argument + ')';
	                }
	            }
	            tmp +=              '</div>' +
	                                '<div class="ui-form-backdrop"/>' +
	                            '</div>';
	            if ( options.collapsible_preview ) {
	                tmp +=      '<div class="ui-form-preview">' + options.text_value + '</div>';
	            }
	            tmp += '</div>';
	            return tmp;
	        }
	    });
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2)))

/***/ },
/* 36 */
/*!****************************************************!*\
  !*** ./galaxy/scripts/mvc/form/form-parameters.js ***!
  \****************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone, $) {/**
	    This class creates input elements. New input parameter types should be added to the types dictionary.
	*/
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(/*! utils/utils */ 21),
	        __webpack_require__(/*! mvc/ui/ui-misc */ 22),
	        __webpack_require__(/*! mvc/form/form-select-content */ 37),
	        __webpack_require__(/*! mvc/ui/ui-select-library */ 39),
	        __webpack_require__(/*! mvc/ui/ui-select-ftp */ 41),
	        __webpack_require__(/*! mvc/ui/ui-color-picker */ 42)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Utils, Ui, SelectContent, SelectLibrary, SelectFtp, ColorPicker) {
	
	    // create form view
	    return Backbone.Model.extend({
	        /** Available parameter types */
	        types: {
	            'text'              : '_fieldText',
	            'select'            : '_fieldSelect',
	            'data_column'       : '_fieldSelect',
	            'genomebuild'       : '_fieldSelect',
	            'data'              : '_fieldData',
	            'data_collection'   : '_fieldData',
	            'integer'           : '_fieldSlider',
	            'float'             : '_fieldSlider',
	            'boolean'           : '_fieldBoolean',
	            'drill_down'        : '_fieldDrilldown',
	            'color'             : '_fieldColor',
	            'hidden'            : '_fieldHidden',
	            'hidden_data'       : '_fieldHidden',
	            'baseurl'           : '_fieldHidden',
	            'library_data'      : '_fieldLibrary',
	            'ftpfile'           : '_fieldFtp'
	        },
	
	        // initialize
	        initialize: function(app, options) {
	            this.app = app;
	        },
	
	        /** Returns an input field for a given field type
	        */
	        create: function(input_def) {
	            // add regular/default value if missing
	            if (input_def.value === undefined) {
	                input_def.value = null;
	            }
	            if (input_def.default_value === undefined) {
	                input_def.default_value = input_def.value;
	            }
	
	            // create field wrapper
	            var field = null;
	            var fieldClass = this.types[input_def.type];
	            if (fieldClass && typeof(this[fieldClass]) === 'function') {
	                field = this[fieldClass].call(this, input_def);
	            }
	
	            // match unavailable field types
	            if (!field) {
	                this.app.incompatible = true;
	                if (input_def.options) {
	                    field = this._fieldSelect(input_def);
	                } else {
	                    field = this._fieldText(input_def);
	                }
	                Galaxy.emit.debug('form-parameters::_addRow()', 'Auto matched field type (' + input_def.type + ').');
	            }
	
	            // set initial field value
	            input_def.value !== undefined && ( field.value( input_def.value ) );
	            return field;
	        },
	
	        /** Data input field
	        */
	        _fieldData: function(input_def) {
	            var self = this;
	            return new SelectContent.View(this.app, {
	                id          : 'field-' + input_def.id,
	                extensions  : input_def.extensions,
	                optional    : input_def.optional,
	                multiple    : input_def.multiple,
	                type        : input_def.type,
	                data        : input_def.options,
	                onchange    : function() {
	                    self.app.trigger('change');
	                }
	            });
	        },
	
	        /** Select/Checkbox/Radio options field
	        */
	        _fieldSelect: function (input_def) {
	            // show text field e.g. in workflow editor
	            if( input_def.is_workflow ) {
	                return this._fieldText( input_def );
	            }
	
	            // customize properties
	            if (input_def.type == 'data_column') {
	                input_def.error_text = 'Missing columns in referenced dataset.'
	            }
	
	            // configure options fields
	            var options = [];
	            for (var i in input_def.options) {
	                var option = input_def.options[i];
	                options.push({
	                    label: option[0],
	                    value: option[1]
	                });
	            }
	
	            // identify display type
	            var SelectClass = Ui.Select;
	            switch (input_def.display) {
	                case 'checkboxes':
	                    SelectClass = Ui.Checkbox;
	                    break;
	                case 'radio':
	                    SelectClass = Ui.Radio;
	                    break;
	            }
	
	            // create select field
	            var self = this;
	            return new SelectClass.View({
	                id          : 'field-' + input_def.id,
	                data        : options,
	                error_text  : input_def.error_text || 'No options available',
	                optional    : input_def.optional && input_def.default_value === null,
	                multiple    : input_def.multiple,
	                optional    : input_def.optional,
	                searchable  : input_def.searchable,
	                onchange    : function() {
	                    self.app.trigger('change');
	                }
	            });
	        },
	
	        /** Drill down options field
	        */
	        _fieldDrilldown: function (input_def) {
	            // show text field e.g. in workflow editor
	            if( input_def.is_workflow ) {
	                return this._fieldText( input_def );
	            }
	
	            // create drill down field
	            var self = this;
	            return new Ui.Drilldown.View({
	                id          : 'field-' + input_def.id,
	                data        : input_def.options,
	                display     : input_def.display,
	                onchange    : function() {
	                    self.app.trigger('change');
	                }
	            });
	        },
	
	        /** Text input field
	        */
	        _fieldText: function(input_def) {
	            // field replaces e.g. a select field
	            if (input_def.options) {
	                input_def.area = input_def.multiple;
	                if (!Utils.validate(input_def.value)) {
	                    input_def.value = null;
	                } else {
	                    if ($.isArray(input_def.value)) {
	                        var str_value = '';
	                        for (var i in input_def.value) {
	                            str_value += String(input_def.value[i]);
	                            if (!input_def.multiple) {
	                                break;
	                            }
	                            str_value += '\n';
	                        }
	                        input_def.value = str_value;
	                    }
	                }
	            }
	            // create input element
	            var self = this;
	            return new Ui.Input({
	                id          : 'field-' + input_def.id,
	                area        : input_def.area,
	                onchange    : function( new_value ) {
	                    input_def.onchange ? input_def.onchange( new_value ) : self.app.trigger( 'change' );
	                }
	            });
	        },
	
	        /** Slider field
	        */
	        _fieldSlider: function(input_def) {
	            var self = this;
	            return new Ui.Slider.View({
	                id          : 'field-' + input_def.id,
	                precise     : input_def.type == 'float',
	                is_workflow : input_def.is_workflow,
	                min         : input_def.min,
	                max         : input_def.max,
	                onchange    : function() {
	                    self.app.trigger('change');
	                }
	            });
	        },
	
	        /** Hidden field
	        */
	        _fieldHidden: function(input_def) {
	            return new Ui.Hidden({
	                id          : 'field-' + input_def.id,
	                info        : input_def.info
	            });
	        },
	
	        /** Boolean field
	        */
	        _fieldBoolean: function(input_def) {
	            var self = this;
	            return new Ui.RadioButton.View({
	                id          : 'field-' + input_def.id,
	                data        : [ { label : 'Yes', value : 'true'  },
	                                { label : 'No',  value : 'false' }],
	                onchange    : function() {
	                    self.app.trigger('change');
	                }
	            });
	        },
	
	        /** Color picker field
	        */
	        _fieldColor: function(input_def) {
	            var self = this;
	            return new ColorPicker({
	                id          : 'field-' + input_def.id,
	                onchange    : function() {
	                    self.app.trigger('change');
	                }
	            });
	        },
	
	        /** Library dataset field
	        */
	        _fieldLibrary: function(input_def) {
	            var self = this;
	            return new SelectLibrary.View({
	                id          : 'field-' + input_def.id,
	                optional    : input_def.optional,
	                multiple    : input_def.multiple,
	                onchange    : function() {
	                    self.app.trigger('change');
	                }
	            });
	        },
	
	        /** FTP file field
	        */
	        _fieldFtp: function(input_def) {
	            var self = this;
	            return new SelectFtp.View({
	                id          : 'field-' + input_def.id,
	                optional    : input_def.optional,
	                multiple    : input_def.multiple,
	                onchange    : function() {
	                    self.app.trigger('change');
	                }
	            });
	        }
	    });
	
	    return {
	        View: View
	    };
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 37 */
/*!********************************************************!*\
  !*** ./galaxy/scripts/mvc/form/form-select-content.js ***!
  \********************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone, $, _) {// dependencies
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(/*! utils/utils */ 21), __webpack_require__(/*! mvc/ui/ui-misc */ 22), __webpack_require__(/*! mvc/ui/ui-tabs */ 38)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Utils, Ui, Tabs) {
	// hda/hdca content selector ui element
	var View = Backbone.View.extend({
	    // initialize
	    initialize : function(app, options) {
	        // link app and options
	        this.app = app;
	        this.options = options;
	
	        // track current history elements
	        this.history = {};
	
	
	        // link this
	        var self = this;
	
	        // add element
	        this.setElement('<div class="ui-select-content"/>');
	
	        // list of select fieldsFormSection
	        this.list = {};
	
	        // radio button options
	        var radio_buttons = [];
	
	        // identify selector type
	        if (options.type == 'data_collection') {
	            this.mode = 'collection';
	        } else {
	            if (options.multiple) {
	                this.mode = 'multiple';
	            } else {
	                this.mode = 'single';
	            }
	        }
	
	        // set initial state
	        this.current = this.mode;
	        this.list = {};
	
	        // error messages
	        var extensions = Utils.textify(options.extensions);
	        var hda_error = 'No dataset available.';
	        if (extensions) {
	            hda_error = 'No ' + extensions + ' dataset available.';
	        }
	        var hdca_error = 'No dataset list available.';
	        if (extensions) {
	            hdca_error = 'No ' + extensions + ' dataset collection available.';
	        }
	
	        // add single dataset selector
	        if (this.mode == 'single') {
	            radio_buttons.push({
	                icon    : 'fa-file-o',
	                value   : 'single',
	                tooltip : 'Single dataset'
	            });
	            this.select_single = new Ui.Select.View({
	                optional    : options.optional,
	                error_text  : hda_error,
	                onchange    : function() {
	                    self.trigger('change');
	                }
	            });
	            this.list['single'] = {
	                field: this.select_single,
	                type : 'hda'
	            };
	        }
	
	        // add multiple dataset selector
	        if (this.mode == 'single' || this.mode == 'multiple') {
	            radio_buttons.push({
	                icon    : 'fa-files-o',
	                value   : 'multiple',
	                tooltip : 'Multiple datasets'
	            });
	            this.select_multiple = new Ui.Select.View({
	                multiple    : true,
	                searchable  : false,
	                optional    : options.optional,
	                error_text  : hda_error,
	                onchange    : function() {
	                    self.trigger('change');
	                }
	            });
	            this.list['multiple'] = {
	                field: this.select_multiple,
	                type : 'hda'
	            };
	        }
	
	        // add collection selector
	        if (this.mode == 'single' || this.mode == 'multiple' || this.mode == 'collection') {
	            radio_buttons.push({
	                icon    : 'fa-folder-o',
	                value   : 'collection',
	                tooltip : 'Dataset collection'
	            });
	            var multiple = this.mode == 'multiple';
	            this.select_collection = new Ui.Select.View({
	                error_text  : hdca_error,
	                multiple    : multiple,
	                searchable  : false,
	                optional    : options.optional,
	                onchange    : function() {
	                    self.trigger('change');
	                }
	            });
	            this.list['collection'] = {
	                field: this.select_collection,
	                type : 'hdca'
	            };
	        }
	
	        // create button
	        this.button_type = new Ui.RadioButton.View({
	            value   : this.current,
	            data    : radio_buttons,
	            onchange: function(value) {
	                self.current = value;
	                self.refresh();
	                self.trigger('change');
	            }
	        });
	
	        // add batch mode information
	        this.$batch = $(this.template_batch());
	
	        // number of radio buttons
	        var n_buttons = _.size(this.list);
	
	        // add button to dom
	        var button_width = 0;
	        if (n_buttons > 1) {
	            this.$el.append(this.button_type.$el);
	            button_width = Math.max(0, _.size(this.list) * 35) + 'px';
	        }
	
	        // append field elements
	        for (var i in this.list) {
	            this.$el.append(this.list[i].field.$el.css({
	                'margin-left': button_width
	            }));
	        }
	
	        // append batch message
	        this.$el.append(this.$batch.css({
	            'margin-left': button_width
	        }));
	
	        // update options
	        this.update(options.data);
	
	        // set initial value
	        if (this.options.value !== undefined) {
	            this.value(this.options.value);
	        }
	
	        // refresh view
	        this.refresh();
	
	        // add change event. fires on trigger
	        this.on('change', function() {
	            if (options.onchange) {
	                options.onchange(self.value());
	            }
	        });
	    },
	
	    /** Indicate that select fields are being updated */
	    wait: function() {
	        for (var i in this.list) {
	            this.list[i].field.wait();
	        }
	    },
	
	    /** Indicate that the options update has been completed */
	    unwait: function() {
	        for (var i in this.list) {
	            this.list[i].field.unwait();
	        }
	    },
	
	    /** Update content selector */
	    update: function(options) {
	        // update a particular select field
	        var self = this;
	        function _update(field, options) {
	            if (field) {
	                // identify available options
	                var select_options = [];
	                for (var i in options) {
	                    var item = options[i];
	                    select_options.push({
	                        label: item.hid + ': ' + item.name,
	                        value: item.id
	                    });
	                    // backup to local history
	                    self.history[item.id + '_' + item.src] = item;
	                }
	                // update field
	                field.update(select_options);
	            }
	        }
	
	        // update available options
	        _update(this.select_single, options.hda);
	        _update(this.select_multiple, options.hda);
	        _update(this.select_collection, options.hdca);
	    },
	
	    /** Return the currently selected dataset values */
	    value : function (new_value) {
	        // update current value
	        if (new_value !== undefined) {
	            if (new_value && new_value.values) {
	                try {
	                    // create list with values
	                    var list = [];
	                    for (var i in new_value.values) {
	                        list.push(new_value.values[i].id);
	                    }
	
	                    // identify suitable select field
	                    if (new_value && new_value.values.length > 0 && new_value.values[0].src == 'hdca') {
	                        this.current = 'collection';
	                        this.select_collection.value(list);
	                    } else {
	                        if (this.mode == 'multiple') {
	                            this.current = 'multiple';
	                            this.select_multiple.value(list);
	                        } else {
	                            this.current = 'single';
	                            this.select_single.value(list[0]);
	                        }
	                    }
	                } catch (err) {
	                    Galaxy.emit.debug('tools-select-content::value()', 'Skipped.');
	                }
	            } else {
	                for (var i in this.list) {
	                    this.list[i].field.value(null);
	                }
	            }
	        }
	
	        // refresh view
	        this.refresh();
	
	        // validate value
	        var id_list = this._select().value();
	        if (id_list === null) {
	            return null;
	        }
	
	        // transform into an array
	        if (!(id_list instanceof Array)) {
	            id_list = [id_list];
	        }
	
	        // check if value exists
	        if (id_list.length === 0) {
	            return null;
	        }
	
	        // prepare result dict
	        var result = {
	            batch   : this._batch(),
	            values  : []
	        }
	
	        // append to dataset ids
	        for (var i in id_list) {
	            var details = this.history[id_list[i] + '_' + this.list[this.current].type];
	            if (details) {
	                result.values.push(details);
	            } else {
	                return null;
	            }
	        }
	
	        // sort by history ids
	        result.values.sort(function(a, b){
	            return a.hid - b.hid;
	        });
	
	        // return
	        return result;
	    },
	
	    /** Refreshes data selection view */
	    refresh: function() {
	        this.button_type.value(this.current);
	        for (var i in this.list) {
	            var $el = this.list[i].field.$el;
	            if (this.current == i) {
	                $el.show();
	            } else {
	                $el.hide();
	            }
	        }
	        if (this._batch()) {
	            this.$batch.show();
	        } else {
	            this.$batch.hide();
	        }
	    },
	
	    /** Assists in selecting the current field */
	    _select: function() {
	        return this.list[this.current].field;
	    },
	
	    /** Assists in identifying the batch mode */
	    _batch: function() {
	        if (this.current == 'collection') {
	            var hdca = this.history[this._select().value() + '_hdca'];
	            if (hdca && hdca.map_over_type) {
	                return true;
	            }
	        }
	        if (this.current != 'single') {
	            if (this.mode == 'single') {
	                return true;
	            }
	        }
	        return false;
	    },
	
	    /** Batch message template */
	    template_batch: function() {
	        return  '<div class="ui-form-info">' +
	                    '<i class="fa fa-sitemap" style="font-size: 1.2em; padding: 2px 5px;"/>' +
	                    'This is a batch mode input field. A separate job will be triggered for each dataset.' +
	                '</div>';
	    }
	});
	
	return {
	    View: View
	}
	
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! jquery */ 3), __webpack_require__(/*! underscore */ 1)))

/***/ },
/* 38 */
/*!******************************************!*\
  !*** ./galaxy/scripts/mvc/ui/ui-tabs.js ***!
  \******************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone, $, _) {// dependencies
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(/*! utils/utils */ 21)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Utils) {
	
	// return
	var View = Backbone.View.extend({
	    // defaults options
	    optionsDefault: {
	        title_new       : '',
	        operations      : null,
	        onnew           : null,
	        max             : null,
	        onchange        : null
	    },
	    
	    // initialize
	    initialize : function(options) {
	        // configure
	        this.visible    = false;
	        this.$nav       = null;
	        this.$content   = null;
	        this.first_tab  = null;
	        this.current_id = null;
	            
	        // configure options
	        this.options = Utils.merge(options, this.optionsDefault);
	        
	        // create tabs
	        var $tabs = $(this._template(this.options));
	        
	        // link elements
	        this.$nav       = $tabs.find('.tab-navigation');
	        this.$content   = $tabs.find('.tab-content');
	        
	        // create new element
	        this.setElement($tabs);
	        
	        // clear list
	        this.list = {};
	        
	        // link this
	        var self = this;
	            
	        // append operations
	        if (this.options.operations) {
	            $.each(this.options.operations, function(name, item) {
	                item.$el.prop('id', name);
	                self.$nav.find('.operations').append(item.$el);
	            });
	        }
	        
	        // add built-in add-new-tab tab
	        if (this.options.onnew) {
	            // create tab object
	            var $tab_new = $(this._template_tab_new(this.options));
	            
	            // append to navbar
	            this.$nav.append($tab_new);
	            
	            // add tooltip
	            $tab_new.tooltip({title: 'Add a new tab', placement: 'bottom', container: self.$el});
	            
	            // link click event
	            $tab_new.on('click', function(e) {
	                $tab_new.tooltip('hide');
	                self.options.onnew();
	            });
	        }
	    },
	    
	    // size
	    size: function() {
	        return _.size(this.list);
	    },
	    
	    // front
	    current: function() {
	        return this.$el.find('.tab-pane.active').attr('id');
	    },
	    
	    // append
	    add: function(options) {
	        // self
	        var self = this;
	            
	        // get tab id
	        var id = options.id;
	
	        // create tab object
	        var $tab_title      = $(this._template_tab(options));
	        var $tab_content    = $(this._template_tab_content(options));
	        
	        // add to list
	        this.list[id] = options.ondel ? true : false;
	            
	        // add a new tab either before the add-new-tab tab or behind the last tab
	        if (this.options.onnew) {
	            this.$nav.find('#new-tab').before($tab_title);
	        } else {
	            this.$nav.append($tab_title);
	        }
	        
	        // add content
	        $tab_content.append(options.$el);
	        this.$content.append($tab_content);
	        
	        // activate this tab if this is the first tab
	        if (this.size() == 1) {
	            $tab_title.addClass('active');
	            $tab_content.addClass('active');
	            this.first_tab = id;
	        }
	        
	        // hide add tab
	        if (this.options.max && this.size() >= this.options.max) {
	            this.$el.find('#new-tab').hide();
	        }
	        
	        // add click event to remove tab
	        if (options.ondel) {
	            var $del_icon = $tab_title.find('#delete');
	            $del_icon.tooltip({title: 'Delete this tab', placement: 'bottom', container: self.$el});
	            $del_icon.on('click', function() {
	                $del_icon.tooltip('destroy');
	                self.$el.find('.tooltip').remove();
	                options.ondel();
	                return false;
	            });
	        }
	        
	        // add custom click event handler
	        $tab_title.on('click', function(e) {
	            // prevent default
	            e.preventDefault();
	            
	            // click
	            if (options.onclick) {
	                options.onclick();
	            } else {
	                self.show(id);
	            }
	        });
	        
	        // initialize current id
	        if (!this.current_id) {
	            this.current_id = id;
	        }
	    },
	    
	    // delete tab
	    del: function(id) {
	        // delete tab from dom
	        this.$el.find('#tab-' + id).remove();
	        this.$el.find('#' + id).remove();
	        
	        // check if first tab has been deleted
	        if (this.first_tab == id) {
	            this.first_tab = null;
	        }
	        
	        // show first tab
	        if (this.first_tab != null) {
	            this.show(this.first_tab);
	        }
	        
	        // delete from list
	        if (this.list[id]) {
	            delete this.list[id];
	        }
	        
	        // show add tab
	        if (this.size() < this.options.max) {
	            this.$el.find('#new-tab').show();
	        }
	    },
	    
	    // delete tab
	    delRemovable: function() {
	        for (var id in this.list) {
	            this.del(id);
	        }
	    },
	    
	    // show
	    show: function(id){
	        // show tab view
	        this.$el.fadeIn('fast');
	        this.visible = true;
	        
	        // show selected tab
	        if (id) {
	            // reassign active class
	            this.$el.find('#tab-' + this.current_id).removeClass('active');
	            this.$el.find('#' + this.current_id).removeClass('active');
	            this.$el.find('#tab-' + id).addClass('active');
	            this.$el.find('#' + id).addClass('active');
	            
	            // update current id
	            this.current_id = id;
	        }
	        
	        // change
	        if (this.options.onchange) {
	            this.options.onchange(id);
	        }
	    },
	    
	    // hide
	    hide: function(){
	        this.$el.fadeOut('fast');
	        this.visible = false;
	    },
	
	    // hide operation
	    hideOperation: function(id) {
	        this.$nav.find('#' + id).hide();
	    },
	
	    // show operation
	    showOperation: function(id) {
	        this.$nav.find('#' + id).show();
	    },
	    
	    // set operation
	    setOperation: function(id, callback) {
	        var $el = this.$nav.find('#' + id);
	        $el.off('click');
	        $el.on('click', callback);
	    },
	    
	    // title
	    title: function(id, new_title) {
	        var $el = this.$el.find('#tab-title-text-' + id);
	        if (new_title) {
	            $el.html(new_title);
	        }
	        return $el.html();
	    },
	    
	    // retitle
	    retitle: function(new_title) {
	        var index = 0;
	        for (var id in this.list) {
	            this.title(id, ++index + ': ' + new_title);
	        }
	    },
	    
	    // fill template
	    _template: function(options) {
	        return  '<div class="ui-tabs tabbable tabs-left">' +
	                    '<ul id="tab-navigation" class="tab-navigation nav nav-tabs">' +
	                        '<div class="operations" style="float: right; margin-bottom: 4px;"></div>' +
	                    '</ul>'+
	                    '<div id="tab-content" class="tab-content"/>' +
	                '</div>';
	    },
	    
	    // fill template tab
	    _template_tab_new: function(options) {
	        return  '<li id="new-tab">' +
	                    '<a href="javascript:void(0);">' +
	                        '<i class="ui-tabs-add fa fa-plus-circle"/>' +
	                            options.title_new +
	                    '</a>' +
	                '</li>';
	    },
	    
	    // fill template tab
	    _template_tab: function(options) {
	        var tmpl =  '<li id="tab-' + options.id + '" class="tab-element">' +
	                        '<a id="tab-title-link-' + options.id + '" title="" href="#' + options.id + '" data-original-title="">' +
	                            '<span id="tab-title-text-' + options.id + '" class="tab-title-text">' + options.title + '</span>';
	        
	        if (options.ondel) {
	            tmpl +=         '<i id="delete" class="ui-tabs-delete fa fa-minus-circle"/>';
	        }
	        
	        tmpl +=         '</a>' +
	                    '</li>';
	        
	        return tmpl;
	    },
	    
	    // fill template tab content
	    _template_tab_content: function(options) {
	        return  '<div id="' + options.id + '" class="tab-pane"/>';
	    }
	});
	
	return {
	    View : View
	}
	
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! jquery */ 3), __webpack_require__(/*! underscore */ 1)))

/***/ },
/* 39 */
/*!****************************************************!*\
  !*** ./galaxy/scripts/mvc/ui/ui-select-library.js ***!
  \****************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone) {// dependencies
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(/*! utils/utils */ 21), __webpack_require__(/*! mvc/ui/ui-misc */ 22), __webpack_require__(/*! mvc/ui/ui-table */ 33), __webpack_require__(/*! mvc/ui/ui-list */ 40)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Utils, Ui, Table, List) {
	
	// collection of libraries
	var Libraries = Backbone.Collection.extend({
	    url: Galaxy.root + 'api/libraries?deleted=false'
	});
	
	// collection of dataset
	var LibraryDatasets = Backbone.Collection.extend({
	    initialize: function() {
	        var self = this;
	        this.config = new Backbone.Model({ library_id: null });
	        this.config.on('change', function() {
	            self.fetch({ reset: true });
	        });
	    },
	    url: function() {
	        return Galaxy.root + 'api/libraries/' + this.config.get('library_id') + '/contents';
	    }
	});
	
	// hda/hdca content selector ui element
	var View = Backbone.View.extend({
	    // initialize
	    initialize : function(options) {
	        // link this
	        var self = this;
	
	        // collections
	        this.libraries  = new Libraries();
	        this.datasets   = new LibraryDatasets();
	
	        // link app and options
	        this.options = options;
	
	        // select field for the library
	        // TODO: Remove this once the library API supports searching for library datasets
	        this.library_select = new Ui.Select.View({
	            onchange    : function(value) {
	                self.datasets.config.set('library_id', value);
	            }
	        });
	
	        // create ui-list view to keep track of selected data libraries
	        this.dataset_list = new List.View({
	            name        : 'dataset',
	            optional    : options.optional,
	            multiple    : options.multiple,
	            onchange    : function() {
	                self.trigger('change');
	            }
	        });
	
	        // add reset handler for fetched libraries
	        this.libraries.on('reset', function() {
	            var data = [];
	            self.libraries.each(function(model) {
	                data.push({
	                    value   : model.id,
	                    label   : model.get('name')
	                });
	            });
	            self.library_select.update(data);
	        });
	
	        // add reset handler for fetched library datasets
	        this.datasets.on('reset', function() {
	            var data = [];
	            var library_current = self.library_select.text();
	            if (library_current !== null) {
	                self.datasets.each(function(model) {
	                    if (model.get('type') === 'file') {
	                        data.push({
	                            value   : model.id,
	                            label   : model.get('name')
	                        });
	                    }
	                });
	            }
	            self.dataset_list.update(data);
	        });
	
	        // add change event. fires on trigger
	        this.on('change', function() {
	            options.onchange && options.onchange(self.value());
	        });
	
	        // create elements
	        this.setElement(this._template());
	        this.$('.library-select').append(this.library_select.$el);
	        this.$el.append(this.dataset_list.$el);
	
	        // initial fetch of libraries
	        this.libraries.fetch({
	            reset: true,
	            success: function() {
	                self.library_select.trigger('change');
	                if (self.options.value !== undefined) {
	                    self.value(self.options.value);
	                }
	            }
	        });
	    },
	
	    /** Return/Set currently selected library datasets */
	    value: function(val) {
	        return this.dataset_list.value(val);
	    },
	
	    /** Template */
	    _template: function() {
	        return  '<div class="ui-select-library">' +
	                    '<div class="library ui-margin-bottom">' +
	                        '<span class="library-title">Select Library</span>' +
	                        '<span class="library-select"/>' +
	                    '</div>' +
	                '</div>';
	    }
	});
	
	return {
	    View: View
	}
	
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2)))

/***/ },
/* 40 */
/*!******************************************!*\
  !*** ./galaxy/scripts/mvc/ui/ui-list.js ***!
  \******************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone, $) {// dependencies
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(/*! utils/utils */ 21), __webpack_require__(/*! mvc/ui/ui-portlet */ 31), __webpack_require__(/*! mvc/ui/ui-misc */ 22)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Utils, Portlet, Ui) {
	
	// ui list element
	var View = Backbone.View.extend({
	    // create portlet to keep track of selected list elements
	    initialize : function(options) {
	        // link this
	        var self = this;
	
	        // initialize options
	        this.options = options;
	        this.name = options.name || 'element';
	        this.multiple = options.multiple || false;
	
	        // create message handler
	        this.message = new Ui.Message();
	
	        // create portlet
	        this.portlet = new Portlet.View({ cls: 'ui-portlet-section' });
	
	        // create select field containing the options which can be inserted into the list
	        this.select = new Ui.Select.View({ optional : options.optional });
	
	        // create insert new list element button
	        this.button = new Ui.ButtonIcon({
	            icon        : 'fa fa-sign-in',
	            floating    : 'left',
	            tooltip     : 'Insert new ' + this.name,
	            onclick     : function() {
	                self.add({
	                    id      : self.select.value(),
	                    name    : self.select.text()
	                });
	            }
	        });
	
	        // build main element
	        this.setElement(this._template(options));
	        this.$('.ui-list-message').append(this.message.$el);
	        this.$('.ui-list-portlet').append(this.portlet.$el);
	        this.$('.ui-list-button').append(this.button.$el);
	        this.$('.ui-list-select').append(this.select.$el);
	    },
	
	    /** Return/Set currently selected list elements */
	    value: function(val) {
	        // set new value
	        if (val !== undefined) {
	            this.portlet.empty();
	            if ($.isArray(val)) {
	                for (var i in val) {
	                    var v = val[i];
	                    var v_id = null;
	                    var v_name = null;
	                    if ($.type(v) != 'string') {
	                        v_id = v.id;
	                        v_name = v.name;
	                    } else {
	                        v_id = v_name = v;
	                    }
	                    if (v_id != null) {
	                        this.add({
	                            id      : v_id,
	                            name    : v_name
	                        });
	                    }
	                }
	            }
	            this._refresh();
	        }
	        // get current value
	        var lst = [];
	        this.$('.ui-list-id').each(function() {
	            lst.push({
	                id      : $(this).prop('id'),
	                name    : $(this).find('.ui-list-name').html()
	            });
	        });
	        if (lst.length == 0) {
	            return null;
	        }
	        return lst;
	    },
	
	    /** Add row */
	    add: function(options) {
	        var self = this;
	        if (this.$('[id="' + options.id + '"]').length === 0) {
	            if (Utils.validate(options.id)) {
	                var $el = $(this._templateRow({
	                    id      : options.id,
	                    name    : options.name
	                }));
	                $el.on('click', function() {
	                    $el.remove();
	                    self._refresh();
	                });
	                $el.on('mouseover', function() {
	                    $el.addClass('portlet-highlight');
	                });
	                $el.on('mouseout', function() {
	                    $el.removeClass('portlet-highlight');
	                });
	                this.portlet.append($el);
	                this._refresh();
	            } else {
	                this.message.update({ message: 'Please select a valid ' + this.name + '.', status: 'danger' });
	            }
	        } else {
	            this.message.update({ message: 'This ' + this.name + ' is already in the list.' });
	        }
	    },
	
	    /** Update available options */
	    update: function(options) {
	        this.select.update(options);
	    },
	
	    /** Refresh view */
	    _refresh: function() {
	        if (this.$('.ui-list-id').length > 0) {
	            !this.multiple && this.button.disable();
	            this.$('.ui-list-portlet').show();
	        } else {
	            this.button.enable();
	            this.$('.ui-list-portlet').hide();
	        }
	        this.options.onchange && this.options.onchange();
	    },
	
	    /** Main Template */
	    _template: function(options) {
	        return  '<div class="ui-list">' +
	                    '<div class="ui-margin-top">' +
	                        '<span class="ui-list-button"/>' +
	                        '<span class="ui-list-select"/>' +
	                    '</div>' +
	                    '<div class="ui-list-message"/>' +
	                    '<div class="ui-list-portlet"/>' +
	                '</div>';
	    },
	
	    /** Row Template */
	    _templateRow: function(options) {
	        return  '<div id="' + options.id + '" class="ui-list-id">' +
	                    '<span class="ui-list-delete fa fa-trash"/>' +
	                    '<span class="ui-list-name">' + options.name + '</span>' +
	                '</div>';
	    }
	});
	
	return {
	    View: View
	}
	
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 41 */
/*!************************************************!*\
  !*** ./galaxy/scripts/mvc/ui/ui-select-ftp.js ***!
  \************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone) {// dependencies
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(/*! utils/utils */ 21), __webpack_require__(/*! mvc/ui/ui-list */ 40)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Utils, List) {
	
	/**
	 * FTP file selector
	 */
	var View = Backbone.View.extend({
	    // initialize
	    initialize : function(options) {
	        // link this
	        var self = this;
	
	        // create ui-list view to keep track of selected ftp files
	        this.ftpfile_list = new List.View({
	            name        : 'file',
	            optional    : options.optional,
	            multiple    : options.multiple,
	            onchange    : function() {
	                options.onchange && options.onchange(self.value());
	            }
	        });
	
	        // create elements
	        this.setElement(this.ftpfile_list.$el);
	
	        // initial fetch of ftps
	        Utils.get({
	            url     : Galaxy.root + 'api/remote_files',
	            success : function(response) {
	                var data = [];
	                for (var i in response) {
	                    data.push({
	                        value   : response[i]['path'],
	                        label   : response[i]['path']
	                    });
	                }
	                self.ftpfile_list.update(data);
	            }
	        });
	    },
	
	    /** Return/Set currently selected ftp datasets */
	    value: function(val) {
	        return this.ftpfile_list.value(val);
	    }
	});
	
	return {
	    View: View
	}
	
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2)))

/***/ },
/* 42 */
/*!**************************************************!*\
  !*** ./galaxy/scripts/mvc/ui/ui-color-picker.js ***!
  \**************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone, $) {/** Renders the color picker used e.g. in the tool form **/
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(/*! utils/utils */ 21)], __WEBPACK_AMD_DEFINE_RESULT__ = function( Utils ) {
	    return Backbone.View.extend({
	        colors: {
	            standard: ['c00000','ff0000','ffc000','ffff00','92d050','00b050','00b0f0','0070c0','002060','7030a0'],
	            base    : ['ffffff','000000','eeece1','1f497d','4f81bd','c0504d','9bbb59','8064a2','4bacc6','f79646'],
	            theme   :[['f2f2f2','7f7f7f','ddd9c3','c6d9f0','dbe5f1','f2dcdb','ebf1dd','e5e0ec','dbeef3','fdeada'],
	                      ['d8d8d8','595959','c4bd97','8db3e2','b8cce4','e5b9b7','d7e3bc','ccc1d9','b7dde8','fbd5b5'],
	                      ['bfbfbf','3f3f3f','938953','548dd4','95b3d7','d99694','c3d69b','b2a2c7','92cddc','fac08f'],
	                      ['a5a5a5','262626','494429','17365d','366092','953734','76923c','5f497a','31859b','e36c09'],
	                      ['7f7f7e','0c0c0c','1d1b10','0f243e','244061','632423','4f6128','3f3151','205867','974806']]
	        },
	        initialize : function( options ) {
	            this.options = Utils.merge( options, {} );
	            this.setElement( this._template() );
	
	            // link components
	            this.$panel = this.$( '.ui-color-picker-panel' );
	            this.$view = this.$( '.ui-color-picker-view' );
	            this.$value = this.$( '.ui-color-picker-value' );
	            this.$header = this.$( '.ui-color-picker-header' );
	
	            // build panel
	            this._build();
	
	            // hide panel on start up
	            this.visible = false;
	
	            // set initial value
	            this.value( this.options.value );
	
	            // link boxes
	            this.$boxes = this.$( '.ui-color-picker-box' );
	
	            // add event handler
	            var self = this;
	            this.$boxes.on( 'click', function() {
	                self.value( $( this ).css( 'background-color' ) );
	                self.$header.trigger( 'click' );
	            } );
	            this.$header.on( 'click', function() {
	                self.visible = !self.visible;
	                if ( self.visible ) {
	                    self.$view.fadeIn( 'fast' );
	                } else {
	                    self.$view.fadeOut( 'fast' );
	                }
	            } );
	        },
	
	        // value
	        value : function ( new_val ) {
	            if ( new_val !== undefined && new_val !== null ) {
	                // update color value
	                this.$value.css( 'background-color', new_val );
	            
	                // check selected color in panel
	                this.$( '.ui-color-picker-box' ).empty();
	                this.$( this._getValue() ).html( this._templateCheck() );
	
	                // trigger custom event
	                this.options.onchange && this.options.onchange( new_val );
	            }
	
	            // return current value
	            return this._getValue();
	        },
	
	        // get value from dom
	        _getValue: function() {
	            var rgb = this.$value.css( 'background-color' );
	            rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
	            if ( rgb ) {
	                function hex( x ) {
	                    return ( '0' + parseInt( x ).toString( 16 ) ).slice( -2 );
	                }
	                return '#' + hex( rgb[ 1] ) + hex( rgb[ 2 ] ) + hex( rgb[ 3 ] );
	            } else {
	                return null;
	            }
	        },
	
	        // build panel
	        _build: function() {
	            var $content = this._content({
	                label       : 'Theme Colors',
	                colors      : this.colors.base,
	                padding     : 10
	            });
	            for ( var i in this.colors.theme ) {
	                var line_def = {};
	                if ( i == 0 ) {
	                    line_def[ 'bottom' ] = true;
	                } else {
	                    if ( i != this.colors.theme.length - 1 ) {
	                        line_def[ 'top' ]     = true;
	                        line_def[ 'bottom' ]  = true;
	                    } else {
	                        line_def[ 'top' ]     = true;
	                        line_def[ 'padding' ] = 5;
	                    }
	                }
	                line_def[ 'colors' ] = this.colors.theme[ i ];
	                this._content( line_def );
	            }
	            this._content({
	                label       : 'Standard Colors',
	                colors      : this.colors.standard,
	                padding     : 5
	            });
	        },
	
	        // create content
	        _content: function( options ) {
	            // get parameters
	            var label       = options.label;
	            var colors      = options.colors;
	            var padding     = options.padding;
	            var top         = options.top;
	            var bottom      = options.bottom;
	
	            // create lines
	            var $content = $( this._templateContent() );
	
	            // set label
	            var $label = $content.find( '.label' );
	            if ( options.label ) {
	                $label.html( options.label );
	            } else {
	                $label.hide();
	            }
	
	            // build line
	            var $line = $content.find( '.line' );
	            this.$panel.append( $content );
	            for ( var i in colors ) {
	                var $box = $( this._templateBox( colors[ i ] ) );
	                if ( top ) {
	                    $box.css( 'border-top', 'none' );
	                    $box.css( 'border-top-left-radius', '0px' );
	                    $box.css( 'border-top-right-radius', '0px' );
	                }
	                if ( bottom ) {
	                    $box.css( 'border-bottom', 'none' );
	                    $box.css( 'border-bottom-left-radius', '0px' );
	                    $box.css( 'border-bottom-right-radius', '0px' );
	                }
	                $line.append( $box );
	            }
	            if (padding) {
	                $line.css( 'padding-bottom', padding );
	            }
	            return $content;
	        },
	
	        // check icon
	        _templateCheck: function() {
	            return  '<div class="ui-color-picker-check fa fa-check"/>';
	        },
	
	        // content template
	        _templateContent: function() {
	            return  '<div class="ui-color-picker-content">' +
	                        '<div class="label"/>' +
	                        '<div class="line"/>' +
	                    '</div>';
	        },
	
	        // box template
	        _templateBox: function( color ) {
	            return '<div id="' + color + '" class="ui-color-picker-box" style="background-color: #' + color + ';"/>';
	        },
	
	        // template
	        _template: function() {
	            return  '<div class="ui-color-picker">' +
	                        '<div class="ui-color-picker-header">' +
	                            '<div class="ui-color-picker-value"/>' +
	                            '<div class="ui-color-picker-label">Select a color</div>' +
	                        '</div>' +
	                        '<div class="ui-color-picker-view ui-input">' +
	                            '<div class="ui-color-picker-panel"/>' +
	                        '</div>'
	                    '</div>';
	        }
	    });
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 43 */
/*!**********************************************!*\
  !*** ./galaxy/scripts/mvc/form/form-data.js ***!
  \**********************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone, $, _) {/*
	    This class maps the form dom to an api compatible javascript dictionary.
	*/
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [ __webpack_require__(/*! utils/utils */ 21) ], __WEBPACK_AMD_DEFINE_RESULT__ = function( Utils ) {
	    var Manager = Backbone.Model.extend({
	        initialize: function( app ) {
	            this.app = app;
	        },
	
	        /** Creates a checksum.
	        */
	        checksum: function() {
	            var sum = '';
	            var self = this;
	            this.app.section.$el.find( '.section-row' ).each( function() {
	                var id = $(this).attr( 'id' );
	                var field = self.app.field_list[ id ];
	                if ( field ) {
	                    sum += id + ':' + JSON.stringify( field.value && field.value() ) + ':' + field.collapsed + ';';
	                }
	            });
	            return sum;
	        },
	
	        /** Convert dom into a dictionary of flat id/value pairs used e.g. on job submission.
	        */
	        create: function() {
	            var self = this;
	
	            // get raw dictionary from dom
	            var dict = {};
	            this._iterate( this.app.section.$el, dict );
	
	            // add to result dictionary, label elements
	            var result_dict = {};
	            this.flat_dict = {};
	            function add( flat_id, input_id, input_value ) {
	                self.flat_dict[ flat_id ] = input_id;
	                result_dict[ flat_id ] = input_value;
	                self.app.element_list[ input_id ] && self.app.element_list[ input_id ].$el.attr( 'tour_id', flat_id );
	            }
	            // converter between raw dictionary and job dictionary
	            function convert( identifier, head ) {
	                for ( var index in head ) {
	                    var node = head[ index ];
	                    if ( node.input ) {
	                        var input = node.input;
	                        var flat_id = identifier;
	                        if ( identifier != '' ) {
	                            flat_id += '|';
	                        }
	                        flat_id += input.name;
	                        switch ( input.type ) {
	                            case 'repeat':
	                                var section_label = 'section-';
	                                var block_indices = [];
	                                var block_prefix = null;
	                                for ( var block_label in node ) {
	                                    var pos = block_label.indexOf( section_label );
	                                    if ( pos != -1 ) {
	                                        pos += section_label.length;
	                                        block_indices.push( parseInt( block_label.substr( pos ) ));
	                                        if ( !block_prefix ) {
	                                            block_prefix = block_label.substr( 0, pos );
	                                        }
	                                    }
	                                }
	                                block_indices.sort( function( a, b ) { return a - b; });
	                                var index = 0;
	                                for ( var i in block_indices ) {
	                                    convert( flat_id + '_' + index++, node[ block_prefix + block_indices[ i ] ]);
	                                }
	                                break;
	                            case 'conditional':
	                                var value = self.app.field_list[ input.id ].value();
	                                add( flat_id + '|' + input.test_param.name, input.id, value );
	                                var selectedCase = matchCase( input, value );
	                                if ( selectedCase != -1 ) {
	                                    convert( flat_id, head[ input.id + '-section-' + selectedCase ] );
	                                }
	                                break;
	                            case 'section':
	                                convert( !input.flat && flat_id || '', node );
	                                break;
	                            default:
	                                var field = self.app.field_list[ input.id ];
	                                if ( field && field.value ) {
	                                    var value = field.value();
	                                    if ( input.ignore === undefined || input.ignore != value ) {
	                                        if ( field.collapsed && input.collapsible_value ) {
	                                            value = input.collapsible_value;
	                                        }
	                                        add( flat_id, input.id, value );
	                                        if ( input.payload ) {
	                                            for ( var p_id in input.payload ) {
	                                                add( p_id, input.id, input.payload[ p_id ] );
	                                            }
	                                        }
	                                    }
	                                }
	                        }
	                    }
	                }
	            }
	            convert( '', dict );
	            return result_dict;
	        },
	
	        /** Matches flat ids to corresponding input element
	         * @param{string} flat_id - Flat input id to be looked up.
	         */
	        match: function ( flat_id ) {
	            return this.flat_dict && this.flat_dict[ flat_id ];
	        },
	
	        /** Match conditional values to selected cases
	        */
	        matchCase: function( input, value ) {
	            return matchCase( input, value );
	        },
	
	        /** Matches a new tool model to the current input elements e.g. used to update dynamic options
	        */
	        matchModel: function( model, callback ) {
	            return matchIds( model.inputs, this.flat_dict, callback );
	        },
	
	        /** Matches identifier from api response to input elements e.g. used to display validation errors
	        */
	        matchResponse: function( response ) {
	            var result = {};
	            var self = this;
	            function search ( id, head ) {
	                if ( typeof head === 'string' ) {
	                    var input_id = self.flat_dict[ id ];
	                    input_id && ( result[ input_id ] = head );
	                } else {
	                    for ( var i in head ) {
	                        var new_id = i;
	                        if ( id !== '' ) {
	                            var separator = '|';
	                            if ( head instanceof Array ) {
	                                separator = '_';
	                            }
	                            new_id = id + separator + new_id;
	                        }
	                        search ( new_id, head[ i ] );
	                    }
	                }
	            }
	            search( '', response );
	            return result;
	        },
	
	        /** Map dom tree to dictionary tree with input elements.
	        */
	        _iterate: function( parent, dict ) {
	            var self = this;
	            var children = $( parent ).children();
	            children.each( function() {
	                var child = this;
	                var id = $( child ).attr( 'id' );
	                if ( $( child ).hasClass( 'section-row' ) ) {
	                    var input = self.app.input_list[ id ];
	                    dict[ id ] = ( input && { input : input } ) || {};
	                    self._iterate( child, dict[ id ] );
	                } else {
	                    self._iterate( child, dict );
	                }
	            });
	        }
	    });
	
	    /** Match conditional values to selected cases
	     * @param{dict}   input     - Definition of conditional input parameter
	     * @param{dict}   value     - Current value
	     */
	    var matchCase = function( input, value ) {
	        if ( input.test_param.type == 'boolean' ) {
	            if ( value == 'true' ) {
	                value = input.test_param.truevalue || 'true';
	            } else {
	                value = input.test_param.falsevalue || 'false';
	            }
	        }
	        for ( var i in input.cases ) {
	            if ( input.cases[ i ].value == value ) {
	                return i;
	            }
	        }
	        return -1;
	    };
	
	    /** Match context
	     * @param{dict}   inputs    - Dictionary of input elements
	     * @param{dict}   key       - Reference key which is matched to an input name e.g. data_ref
	     * @param{dict}   callback  - Called with matched context i.e. callback( input, referenced_input )
	     */
	    var matchContext = function( inputs, key, callback, context ) {
	        context = $.extend( true, {}, context );
	        _.each( inputs, function ( input ) {
	            input && input.type && ( context[ input.name ] = input );
	        });
	        _.each( inputs, function ( input ) {
	            if ( _.isObject( input ) ) {
	                if ( input.type && context[ input[ key ] ] ) {
	                    callback ( input, context[ input[ key ] ] );
	                } else {
	                    matchContext( input, key, callback, context );
	                }
	            }
	        });
	    };
	
	    /** Matches a tool model to a dictionary, indexed with flat ids
	     * @param{dict}   inputs    - Dictionary of input elements
	     * @param{dict}   mapping   - Dictionary containing flat ids
	     * @param{dict}   callback  - Called with the mapped dictionary object and corresponding model node
	     */
	    var matchIds = function( inputs, mapping, callback ) {
	        var result = {};
	        var self = this;
	        function search ( id, head ) {
	            for ( var i in head ) {
	                var node = head[ i ];
	                var index = node.name;
	                id != '' && ( index = id + '|' + index );
	                switch ( node.type ) {
	                    case 'repeat':
	                        for ( var j in node.cache ) {
	                            search ( index + '_' + j, node.cache[ j ] );
	                        }
	                        break;
	                    case 'conditional':
	                        var selectedCase = matchCase( node, node.test_param && node.test_param.value );
	                        selectedCase != -1 && search ( index, node.cases[ selectedCase ].inputs );
	                        break;
	                    case 'section':
	                        search ( index, node.inputs );
	                        break;
	                    default:
	                        var mapped = mapping[ index ];
	                        mapped && callback( mapped, node );
	                }
	            }
	        }
	        search( '', inputs );
	        return result;
	    };
	
	    return {
	        Manager         : Manager,
	        matchIds        : matchIds,
	        matchContext    : matchContext
	    }
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! jquery */ 3), __webpack_require__(/*! underscore */ 1)))

/***/ },
/* 44 */
/*!**************************************************!*\
  !*** ./galaxy/scripts/mvc/tool/tool-template.js ***!
  \**************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function($) {// dependencies
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_RESULT__ = function() {
	
	// tool form templates
	return {
	    help: function( options ) {
	        var $tmpl = $( '<div/>' ).addClass( 'ui-form-help' ).append( options.help );
	        $tmpl.find( 'a' ).attr( 'target', '_blank' );
	        return $tmpl;
	    },
	
	    success: function(response) {
	        // check
	        if (!response.jobs || !response.jobs.length) {
	            return this.error(response);
	        }
	
	        // number of jobs
	        var njobs = response.jobs.length;
	
	        // job count info text
	        var njobs_text = '';
	        if (njobs == 1) {
	            njobs_text = '1 job has';
	        } else {
	            njobs_text = njobs + ' jobs have';
	        }
	
	        // create template string
	        var tmpl =  '<div class="donemessagelarge">' +
	                        '<p>' + njobs_text + ' been successfully added to the queue - resulting in the following datasets:</p>';
	        for (var i in response.outputs) {
	            tmpl +=     '<p style="padding: 10px 20px;"><b>' + response.outputs[i].hid + ': ' + response.outputs[i].name + '</b></p>';
	        }
	        tmpl +=         '<p>You can check the status of queued jobs and view the resulting data by refreshing the History pane. When the job has been run the status will change from \'running\' to \'finished\' if completed successfully or \'error\' if problems were encountered.</p>' +
	                    '</div>';
	
	        // return success message element
	        return tmpl;
	    },
	
	    error: function(response) {
	        return  '<div>' +
	                    '<p>' +
	                        'The server could not complete the request. Please contact the Galaxy Team if this error persists.' +
	                    '</p>' +
	                    '<textarea class="ui-textarea" disabled style="color: black; height: 300px !important;">' +
	                        JSON.stringify(response, undefined, 4) +
	                    '</textarea>' +
	                '</div>';
	    },
	
	    requirements: function(options) {
	        var requirements_message = 'This tool requires ';
	        for (var i in options.requirements) {
	            var req = options.requirements[i];
	            requirements_message += req.name;
	            if (req.version) {
	                requirements_message += ' (Version ' + req.version + ')';
	            }
	            if (i < options.requirements.length - 2) {
	                requirements_message += ', ';
	            }
	            if (i == options.requirements.length - 2) {
	                requirements_message += ' and ';
	            }
	        }
	        return requirements_message + '. Click <a target="_blank" href="https://wiki.galaxyproject.org/Tools/Requirements">here</a> for more information.';
	    }
	};
	
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 45 */
/*!*******************************************************!*\
  !*** ./galaxy/scripts/mvc/citation/citation-model.js ***!
  \*******************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone) {!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	    __webpack_require__(/*! libs/bibtex */ 46),
	    __webpack_require__(/*! mvc/base-mvc */ 5),
	    __webpack_require__(/*! utils/localization */ 7)
	], __WEBPACK_AMD_DEFINE_RESULT__ = function( parseBibtex, baseMVC, _l ){
	/* global Backbone */
	// we use amd here to require, but bibtex uses a global or commonjs pattern.
	// webpack will load via commonjs and plain requirejs will load as global. Check both
	parseBibtex = parseBibtex || window.BibtexParser;
	
	var logNamespace = 'citation';
	//==============================================================================
	/** @class model for tool citations.
	 *  @name Citation
	 *  @augments Backbone.Model
	 */
	var Citation = Backbone.Model.extend( baseMVC.LoggableMixin ).extend( {
	    _logNamespace : logNamespace,
	
	    initialize: function() {
	        var bibtex = this.get( 'content' );
	        var entry = parseBibtex(bibtex).entries[0];
	        this.entry = entry;
	        this._fields = {};
	        var rawFields = entry.Fields;
	        for(var key in rawFields) {
	            var value = rawFields[ key ];
	            var lowerKey = key.toLowerCase();
	            this._fields[ lowerKey ] = value;
	        }
	    },
	    entryType: function() {
	        return this.entry.EntryType;
	    },
	    fields: function() {
	        return this._fields;
	    }
	} );
	
	//==============================================================================
	/** @class Backbone collection of citations.
	 */
	var BaseCitationCollection = Backbone.Collection.extend( baseMVC.LoggableMixin ).extend( {
	    _logNamespace : logNamespace,
	
	    /** root api url */
	    urlRoot : Galaxy.root + 'api',
	    partial : true, // Assume some tools in history/workflow may not be properly annotated yet.
	    model : Citation,
	} );
	
	var HistoryCitationCollection = BaseCitationCollection.extend( {
	    /** complete api url */
	    url : function() {
	        return this.urlRoot + '/histories/' + this.history_id + '/citations';
	    }
	} );
	
	var ToolCitationCollection = BaseCitationCollection.extend( {
	    /** complete api url */
	    url : function() {
	        return this.urlRoot + '/tools/' + this.tool_id + '/citations';
	    },
	    partial : false, // If a tool has citations, assume they are complete.
	} );
	
	
	//==============================================================================
	return {
	    Citation : Citation,
	    HistoryCitationCollection  : HistoryCitationCollection,
	    ToolCitationCollection: ToolCitationCollection
	};
	
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2)))

/***/ },
/* 46 */
/*!***************************************!*\
  !*** ./galaxy/scripts/libs/bibtex.js ***!
  \***************************************/
/***/ function(module, exports) {

	/**
	 * Parser.js
	 * Copyright 2012-13 Mayank Lahiri
	 * mlahiri@gmail.com
	 * Released under the BSD License.
	 *
	 * A forgiving Bibtex parser that can:
	 * 
	 * (1) operate in streaming or block mode, extracting entries as dictionaries. 
	 * (2) convert Latex special characters to UTF-8.
	 * (3) best-effort parse malformed entries.
	 * (4) run in a CommonJS environment or a browser, without any dependencies.
	 * (5) be advanced-compiled by Google Closure Compiler.
	 * 
	 * Handwritten as a labor of love, not auto-generated from a grammar. 
	 *
	 * Modes of usage:
	 *
	 * (1) Synchronous, string
	 *
	 *   var entries = BibtexParser(text);
	 *   console.log(entries);
	 *
	 * (2) Asynchronous, stream
	 *
	 *   var entryCallback = function(entry) { console.log(entry); }
	 *   var parser = new BibtexParser(entryCallback);
	 *   parser.parse(chunk1);
	 *   parser.parse(chunk2);
	 *   ...
	 * 
	 * @param {text|function(Object)} arg Either a Bibtex string or callback 
	 *                                    function for processing parsed entries.
	 * @constructor
	 */
	function BibtexParser(arg0) {
	  // Determine how this function is to be used
	  if (typeof arg0 == 'string') {
	    // Passed a string, synchronous call without 'new'
	    var tempStorage = {};
	    var entries = [];
	    function accumulator(entry) {
	      entries.push(entry);
	    }
	    var parser = BibtexParser.call(tempStorage, accumulator);
	    parser.parse(arg0);
	    return {
	      'entries':    entries,
	      'errors':     parser.getErrors()
	    }
	  }
	  if (typeof arg0 != 'function') {
	    throw 'Invalid parser construction.';
	  }
	
	  /** @enum {number} */
	  this.STATES_ = {
	    ENTRY_OR_JUNK:    0,
	    OBJECT_TYPE:      1,
	    ENTRY_KEY:        2, 
	    KV_KEY:           3, 
	    EQUALS:           4,
	    KV_VALUE:         5 
	  }
	  /** @private */ this.DATA_          = {};
	  /** @private */ this.CALLBACK_      = arg0;
	  /** @private */ this.CHAR_          = 0;
	  /** @private */ this.LINE_          = 1;
	  /** @private */ this.CHAR_IN_LINE_  = 0;
	  /** @private */ this.SKIPWS_        = true;
	  /** @private */ this.SKIPCOMMENT_   = true;
	  /** @private */ this.PARSETMP_      = {};
	  /** @private */ this.SKIPTILLEOL_   = false;
	  /** @private */ this.VALBRACES_     = null;
	  /** @private */ this.BRACETYPE_     = null;
	  /** @private */ this.BRACECOUNT_    = 0;
	  /** @private */ this.STATE_         = this.STATES_.ENTRY_OR_JUNK;
	  /** @private */ this.ERRORS_        = [];
	  /** @private */ this.ENTRY_TYPES_   = {
	    'inproceedings'     : 1,
	    'proceedings'       : 2,
	    'article'           : 3,
	    'techreport'        : 4,
	    'misc'              : 5,
	    'mastersthesis'     : 6,
	    'book'              : 7,
	    'phdthesis'         : 8,
	    'incollection'      : 9,
	    'unpublished'       : 10,
	    'inbook'            : 11,
	    'manual'            : 12,
	    'periodical'        : 13,
	    'booklet'           : 14,
	    'masterthesis'      : 15,
	    'conference'        : 16
	    ,'online'           : 998 // Galaxy MOD: Handle @online entries for preprints.
	    ,'data'             : 999 // Galaxy MOD: Handle @data citations coming from figshare.
	  }
	  /** @private */ this.MACROS_        = {
	    'jan'               : 'January',
	    'feb'               : 'February',
	    'mar'               : 'March',
	    'apr'               : 'April',
	    'may'               : 'May',
	    'jun'               : 'June',
	    'jul'               : 'July',
	    'aug'               : 'August',
	    'sep'               : 'September',
	    'oct'               : 'October',
	    'nov'               : 'November',
	    'dec'               : 'December',
	    'Jan'               : 'January',
	    'Feb'               : 'February',
	    'Mar'               : 'March',
	    'Apr'               : 'April',
	    'May'               : 'May',
	    'Jun'               : 'June',
	    'Jul'               : 'July',
	    'Aug'               : 'August',
	    'Sep'               : 'September',
	    'Oct'               : 'October',
	    'Nov'               : 'November',
	    'Dec'               : 'December'
	  }
	
	  /**
	   * Gets an array of all errors encountered during parsing.
	   * Array entries are of the format:
	   *  [ line number, character in line, character in stream, error text ]
	   *
	   * @returns Array<Array>
	   * @public
	   */
	  this.getErrors = function() {
	    return this.ERRORS_;
	  }
	
	  /**
	   * Processes a chunk of data
	   * @public
	   */
	  this.parse = function(chunk) {
	    for (var i = 0; i < chunk.length; i++)
	      this.processCharacter_(chunk[i]);
	  }
	
	  /**
	   * Logs error at current stream position.
	   *
	   * @private
	   */
	  this.error_ = function(text) {
	    this.ERRORS_.push([ this.LINE_, 
	                        this.CHAR_IN_LINE_,
	                        this.CHAR_,
	                        text ])
	  }
	
	  /**
	   * Called after an entire entry has been parsed from the stream.
	   * Performs post-processing and invokes the entry callback pointed to by
	   * this.CALLBACK_. Parsed (but unprocessed) entry data is in this.DATA_.
	   */
	  this.processEntry_ = function() {
	    var data = this.DATA_;
	    if (data.Fields) 
	      for (var f in data.Fields) {
	        var raw = data.Fields[f];
	
	        // Convert Latex/Bibtex special characters to UTF-8 equivalents
	        for (var i = 0; i < this.CHARCONV_.length; i++) {
	          var re = this.CHARCONV_[i][0];
	          var rep = this.CHARCONV_[i][1];
	          raw = raw.replace(re, rep);
	        }
	
	        // Basic substitutions
	        raw = raw.replace(/[\n\r\t]/g, ' ')
	                 .replace(/\s\s+/g, ' ')
	                 .replace(/^\s+|\s+$/g, '')
	
	        // Remove braces and backslashes
	        var len = raw.length;
	        var processed = '';
	        for (var i = 0; i < len; i++) {
	          var c = raw[i];
	          var skip = false;
	          if (c == '\\' && i < len-1) 
	            c = raw[++i];
	          else {
	            if (c == '{' || c == '}')
	              skip = true;
	          }
	          if (!skip)
	            processed += c;
	        }
	        data.Fields[f] = processed
	      }
	
	    if (data.ObjectType == 'string') {
	      for (var f in data.Fields) {  
	        this.MACROS_[f] = data.Fields[f];
	      }
	    } else {
	      // Parsed a new Bibtex entry
	      this.CALLBACK_(data);
	    }
	  }
	
	
	  /**
	   * Processes next character in the stream, invoking the callback after 
	   * each entry has been found and processed.
	   * 
	   * @private
	   * @param {string} c Next character in input stream
	   */
	  this.processCharacter_ = function(c) {
	    // Housekeeping
	    this.CHAR_++;
	    this.CHAR_IN_LINE_++;
	    if (c == '\n') {
	      this.LINE_++;
	      this.CHAR_IN_LINE_ = 1;
	    }
	
	    // Convenience states for skipping whitespace when needed
	    if (this.SKIPTILLEOL_) {
	      if (c == '\n')
	        this.SKIPTILLEOL_ = false;
	      return;
	    }
	    if (this.SKIPCOMMENT_ && c == '%') {
	      this.SKIPTILLEOL_ = true;
	      return;
	    }
	    if (this.SKIPWS_ && /\s/.test(c))
	      return;
	    this.SKIPWS_ = false;
	    this.SKIPCOMMENT_ = false;
	    this.SKIPTILLEOL_ = false;
	
	    // Main state machine
	    var AnotherIteration = true;
	    while (AnotherIteration) {
	      //console.log(this.LINE_, this.CHAR_IN_LINE_, this.STATE_, c)
	      AnotherIteration = false;
	      switch(this.STATE_) {
	        // -- Scan for an object marker ('@')
	        // -- Reset temporary data structure in case previous entry was garbled
	        case this.STATES_.ENTRY_OR_JUNK:
	          if (c == '@') {
	            // SUCCESS:     Parsed a valid start-of-object marker.
	            // NEXT_STATE:  OBJECT_TYPE
	            this.STATE_ = this.STATES_.OBJECT_TYPE;
	            this.DATA_ = {
	              ObjectType    : ''
	            };
	          }
	          this.BRACETYPE_   = null;
	          this.SKIPWS_      = true;
	          this.SKIPCOMMENT_ = true;
	          break;
	
	        // Start at first non-whitespace character after start-of-object '@'
	        // -- Accept [A-Za-z], break on non-matching character
	        // -- Populate this.DATA_.EntryType and this.DATA_.ObjectType
	        case this.STATES_.OBJECT_TYPE:
	          if (/[A-Za-z]/.test(c)) {
	            this.DATA_.ObjectType += c.toLowerCase();
	            this.SKIPWS_      = true;
	            this.SKIPCOMMENT_ = true;
	          } else {
	            // Break from state and validate object type
	            var ot = this.DATA_.ObjectType;
	            if (ot == 'comment') {
	              this.STATE_ = this.STATES_.ENTRY_OR_JUNK;
	            } else {
	              if (ot == 'string') {
	                this.DATA_.ObjectType = ot;
	                this.DATA_.Fields = {};
	                this.BRACETYPE_ = c;
	                this.BRACECOUNT_ = 1;
	                this.STATE_ = this.STATES_.KV_KEY;
	                this.SKIPWS_      = true;
	                this.SKIPCOMMENT_ = true;
	                this.PARSETMP_ = {
	                  Key:    ''
	                }
	              } else {
	                if (ot == 'preamble') {
	                  this.STATE_ = this.STATES_.ENTRY_OR_JUNK;
	                } else {
	                  if (ot in this.ENTRY_TYPES_) {
	                    // SUCCESS:     Parsed a valid object type.
	                    // NEXT_STATE:  ENTRY_KEY
	                    this.DATA_.ObjectType = 'entry';
	                    this.DATA_.EntryType  = ot;
	                    this.DATA_.EntryKey   = '';
	                    this.STATE_           = this.STATES_.ENTRY_KEY;
	                    AnotherIteration      = true;
	                  } else {
	                    // ERROR:       Unrecognized object type.
	                    // NEXT_STATE:  ENTRY_OR_JUNK
	                    this.error_('Unrecognized object type: "' +
	                                this.DATA_.ObjectType + '"')
	                    this.STATE_ = this.STATES_.ENTRY_OR_JUNK;
	                  }
	                }
	              }
	            }
	          }
	          break;
	
	          // Start at first non-alphabetic character after an entry type
	          // -- Populate this.DATA_.EntryKey
	          case this.STATES_.ENTRY_KEY:
	            if ((c === '{' || c === '(') && this.BRACETYPE_ == null) {
	              this.BRACETYPE_   = c;
	              this.BRACECOUNT_  = 1;
	              this.SKIPWS_      = true;
	              this.SKIPCOMMENT_ = true;
	              break;
	            }
	            if (/[,%\s]/.test(c)) {
	              if (this.DATA_.EntryKey.length < 1) { 
	                // Skip comments and whitespace before entry key
	                this.SKIPWS_      = true;
	                this.SKIPCOMMENT_ = true;
	              } else {
	                if (this.BRACETYPE_ == null) {
	                  // ERROR:       No opening brace for object
	                  // NEXT_STATE:  ENTRY_OR_JUNK
	                  this.error_('No opening brace for object.');
	                  this.STATE_ = this.STATES_.ENTRY_OR_JUNK;
	                } else {
	                  // SUCCESS:     Parsed an entry key
	                  // NEXT_STATE:  KV_KEY
	                  this.SKIPWS_      = true;
	                  this.SKIPCOMMENT_ = true;
	                  AnotherIteration  = true;
	                  this.STATE_       = this.STATES_.KV_KEY;
	                  this.PARSETMP_.Key= '';
	                  this.DATA_.Fields = {};
	                }
	              }
	            } else {
	              this.DATA_.EntryKey += c;
	              this.SKIPWS_        = false;
	              this.SKIPCOMMENT_   = false;
	            }
	            break;
	
	          // Start at first non-whitespace/comment character after entry key.
	          // -- Populate this.PARSETMP_.Key
	          case this.STATES_.KV_KEY:
	            // Test for end of entry
	            if ((c == '}' && this.BRACETYPE_ == '{') ||
	                (c == ')' && this.BRACETYPE_ == '(')) {
	              // SUCCESS:       Parsed an entry, possible incomplete
	              // NEXT_STATE:    ENTRY_OR_JUNK
	              this.processEntry_();
	              this.SKIPWS_      = true;
	              this.SKIPCOMMENT_ = true;
	              this.STATE_ = this.STATES_.ENTRY_OR_JUNK;
	              break;
	            }
	            if (/[\-A-Za-z:]/.test(c)) {
	              // Add to key
	              this.PARSETMP_.Key  += c;
	              this.SKIPWS_        = false;
	              this.SKIPCOMMENT_   = false;
	            } else {
	              // Either end of key or we haven't encountered start of key
	              if (this.PARSETMP_.Key.length < 1) {
	                // Keep going till we see a key
	                this.SKIPWS_      = true;
	                this.SKIPCOMMENT_ = true;
	              } else {
	                // SUCCESS:       Found full key in K/V pair
	                // NEXT_STATE:    EQUALS
	                this.SKIPWS_      = true;
	                this.SKIPCOMMENT_ = true;
	                this.STATE_       = this.STATES_.EQUALS;
	                AnotherIteration  = true;
	              }
	            }
	            break;
	
	          // Start at first non-alphabetic character after K/V pair key.
	          case this.STATES_.EQUALS:
	            if ((c == '}' && this.BRACETYPE_ == '{') ||
	                (c == ')' && this.BRACETYPE_ == '(')) {
	              // ERROR:         K/V pair with key but no value
	              // NEXT_STATE:    ENTRY_OR_JUNK
	              this.error_('Key-value pair has key "' +
	                          this.PARSETMP_.Key + '", but no value.');
	              this.processEntry_();
	              this.SKIPWS_      = true;
	              this.SKIPCOMMENT_ = true;
	              this.STATE_ = this.STATES_.ENTRY_OR_JUNK;
	              break;
	            }
	            if (c == '=') {
	              // SUCCESS:       found an equal signs separating key and value
	              // NEXT_STATE:    KV_VALUE
	              this.SKIPWS_          = true;
	              this.SKIPCOMMENT_     = true;
	              this.STATE_           = this.STATES_.KV_VALUE;
	              this.PARSETMP_.Value  = '';
	              this.VALBRACES_       = { '"' : [], '{' : [] };
	            }
	            break;
	
	          // Start at first non-whitespace/comment character after '=' 
	          // -- Populate this.PARSETMP_.Value
	          case this.STATES_.KV_VALUE:
	            var delim             = this.VALBRACES_;
	            var val               = this.PARSETMP_.Value;
	            var doneParsingValue  = false;
	
	            // Test for special characters
	            if (c == '"' || c == '{' || c == '}' || c == ',') {
	              if (c == ',') {
	                // This comma can mean:
	                // (1) just another comma literal
	                // (2) end of a macro reference
	                if (0 === delim['"'].length + delim['{'].length) {
	                  // end of a macro reference
	                  var macro = this.PARSETMP_.Value.trim();
	                  if (macro in this.MACROS_) {
	                    // Successful macro reference
	                    this.PARSETMP_.Value = this.MACROS_[macro];
	                  } else {
	                    // Reference to an undefined macro
	                    this.error_('Reference to an undefined macro: '+macro);
	                  }
	                  doneParsingValue = true;
	                }
	              }
	              if (c == '"') {
	                // This quote can mean:
	                // (1) opening delimiter
	                // (2) closing delimiter
	                // (3) literal, if we have a '{' on the stack
	                if (0 === delim['"'].length + delim['{'].length) {
	                  // opening delimiter
	                  delim['"'].push(this.CHAR_)
	                  this.SKIPWS_        = false;
	                  this.SKIPCOMMENT_   = false;
	                  break;
	                }
	                if (delim['"'].length == 1 && delim['{'].length == 0 &&
	                    (val.length==0 || val[val.length-1] != '\\')) {
	                  // closing delimiter
	                  doneParsingValue = true;
	                } else {
	                  // literal, add to value
	                }
	              }
	              if (c == '{') {
	                // This brace can mean:
	                // (1) opening delimiter
	                // (2) stacked verbatim delimiter
	                if (val.length == 0 || val[val.length-1] != '\\') {
	                  delim['{'].push(this.CHAR_)
	                  this.SKIPWS_        = false;
	                  this.SKIPCOMMENT_   = false;
	                } else {
	                  // literal, add to value
	                }
	              }
	              if (c == '}') {
	                // This brace can mean:
	                // (1) closing delimiter
	                // (2) closing stacked verbatim delimiter
	                // (3) end of object definition if value was a macro
	                if (0 === delim['"'].length + delim['{'].length) {
	                  // end of object definition, after macro
	                  var macro = this.PARSETMP_.Value.trim();
	                  if (macro in this.MACROS_) {
	                    // Successful macro reference
	                    this.PARSETMP_.Value = this.MACROS_[macro];
	                  } else {
	                    // Reference to an undefined macro
	                    this.error_('Reference to an undefined macro: '+macro);
	                  }
	                  AnotherIteration = true;
	                  doneParsingValue = true;
	                } else {
	                  if (val.length == 0 || val[val.length-1] != '\\') {
	                    if (delim['{'].length > 0) {
	                      // pop stack for stacked verbatim delimiter
	                      delim['{'].splice(delim['{'].length-1, 1)
	                      if (0 == delim['{'].length + delim['"'].length) {
	                        // closing delimiter
	                        doneParsingValue = true;
	                      } else {
	                        // end verbatim block
	                      }
	                    }
	                  } else {
	                    // literal, add to value
	                  }
	                }
	              }
	            }
	
	            // If here, then we are either done parsing the value or 
	            // have a literal that should be added to the value.
	            if (doneParsingValue) {
	              // SUCCESS:     value parsed
	              // NEXT_STATE:  KV_KEY
	              this.SKIPWS_        = true;
	              this.SKIPCOMMENT_   = true;
	              this.STATE_         = this.STATES_.KV_KEY;
	              this.DATA_.Fields[this.PARSETMP_.Key] = this.PARSETMP_.Value;
	              this.PARSETMP_      = { Key: '' };
	              this.VALBRACES_     = null;
	            } else {
	              this.PARSETMP_.Value += c;
	            }
	            break;
	      } // end switch (this.STATE_)
	    } // end while(AnotherIteration)
	  } // end function processCharacter 
	
	  /** @private */ this.CHARCONV_ = [
	    [ /\\space /g, '\u0020' ],
	    [ /\\textdollar /g, '\u0024' ],
	    [ /\\textquotesingle /g, '\u0027' ],
	    [ /\\ast /g, '\u002A' ],
	    [ /\\textbackslash /g, '\u005C' ],
	    [ /\\\^\{\}/g, '\u005E' ],
	    [ /\\textasciigrave /g, '\u0060' ],
	    [ /\\lbrace /g, '\u007B' ],
	    [ /\\vert /g, '\u007C' ],
	    [ /\\rbrace /g, '\u007D' ],
	    [ /\\textasciitilde /g, '\u007E' ],
	    [ /\\textexclamdown /g, '\u00A1' ],
	    [ /\\textcent /g, '\u00A2' ],
	    [ /\\textsterling /g, '\u00A3' ],
	    [ /\\textcurrency /g, '\u00A4' ],
	    [ /\\textyen /g, '\u00A5' ],
	    [ /\\textbrokenbar /g, '\u00A6' ],
	    [ /\\textsection /g, '\u00A7' ],
	    [ /\\textasciidieresis /g, '\u00A8' ],
	    [ /\\textcopyright /g, '\u00A9' ],
	    [ /\\textordfeminine /g, '\u00AA' ],
	    [ /\\guillemotleft /g, '\u00AB' ],
	    [ /\\lnot /g, '\u00AC' ],
	    [ /\\textregistered /g, '\u00AE' ],
	    [ /\\textasciimacron /g, '\u00AF' ],
	    [ /\\textdegree /g, '\u00B0' ],
	    [ /\\pm /g, '\u00B1' ],
	    [ /\\textasciiacute /g, '\u00B4' ],
	    [ /\\mathrm\{\\mu\}/g, '\u00B5' ],
	    [ /\\textparagraph /g, '\u00B6' ],
	    [ /\\cdot /g, '\u00B7' ],
	    [ /\\c\{\}/g, '\u00B8' ],
	    [ /\\textordmasculine /g, '\u00BA' ],
	    [ /\\guillemotright /g, '\u00BB' ],
	    [ /\\textonequarter /g, '\u00BC' ],
	    [ /\\textonehalf /g, '\u00BD' ],
	    [ /\\textthreequarters /g, '\u00BE' ],
	    [ /\\textquestiondown /g, '\u00BF' ],
	    [ /\\`\{A\}/g, '\u00C0' ],
	    [ /\\'\{A\}/g, '\u00C1' ],
	    [ /\\\^\{A\}/g, '\u00C2' ],
	    [ /\\~\{A\}/g, '\u00C3' ],
	    [ /\\"\{A\}/g, '\u00C4' ],
	    [ /\\AA /g, '\u00C5' ],
	    [ /\\AE /g, '\u00C6' ],
	    [ /\\c\{C\}/g, '\u00C7' ],
	    [ /\\`\{E\}/g, '\u00C8' ],
	    [ /\\'\{E\}/g, '\u00C9' ],
	    [ /\\\^\{E\}/g, '\u00CA' ],
	    [ /\\"\{E\}/g, '\u00CB' ],
	    [ /\\`\{I\}/g, '\u00CC' ],
	    [ /\\'\{I\}/g, '\u00CD' ],
	    [ /\\\^\{I\}/g, '\u00CE' ],
	    [ /\\"\{I\}/g, '\u00CF' ],
	    [ /\\DH /g, '\u00D0' ],
	    [ /\\~\{N\}/g, '\u00D1' ],
	    [ /\\`\{O\}/g, '\u00D2' ],
	    [ /\\'\{O\}/g, '\u00D3' ],
	    [ /\\\^\{O\}/g, '\u00D4' ],
	    [ /\\~\{O\}/g, '\u00D5' ],
	    [ /\\"\{O\}/g, '\u00D6' ],
	    [ /\\texttimes /g, '\u00D7' ],
	    [ /\\O /g, '\u00D8' ],
	    [ /\\`\{U\}/g, '\u00D9' ],
	    [ /\\'\{U\}/g, '\u00DA' ],
	    [ /\\\^\{U\}/g, '\u00DB' ],
	    [ /\\"\{U\}/g, '\u00DC' ],
	    [ /\\'\{Y\}/g, '\u00DD' ],
	    [ /\\TH /g, '\u00DE' ],
	    [ /\\ss /g, '\u00DF' ],
	    [ /\\`\{a\}/g, '\u00E0' ],
	    [ /\\'\{a\}/g, '\u00E1' ],
	    [ /\\\^\{a\}/g, '\u00E2' ],
	    [ /\\~\{a\}/g, '\u00E3' ],
	    [ /\\"\{a\}/g, '\u00E4' ],
	    [ /\\aa /g, '\u00E5' ],
	    [ /\\ae /g, '\u00E6' ],
	    [ /\\c\{c\}/g, '\u00E7' ],
	    [ /\\`\{e\}/g, '\u00E8' ],
	    [ /\\'\{e\}/g, '\u00E9' ],
	    [ /\\\^\{e\}/g, '\u00EA' ],
	    [ /\\"\{e\}/g, '\u00EB' ],
	    [ /\\`\{\\i\}/g, '\u00EC' ],
	    [ /\\'\{\\i\}/g, '\u00ED' ],
	    [ /\\\^\{\\i\}/g, '\u00EE' ],
	    [ /\\"\{\\i\}/g, '\u00EF' ],
	    [ /\\dh /g, '\u00F0' ],
	    [ /\\~\{n\}/g, '\u00F1' ],
	    [ /\\`\{o\}/g, '\u00F2' ],
	    [ /\\'\{o\}/g, '\u00F3' ],
	    [ /\\\^\{o\}/g, '\u00F4' ],
	    [ /\\~\{o\}/g, '\u00F5' ],
	    [ /\\"\{o\}/g, '\u00F6' ],
	    [ /\\div /g, '\u00F7' ],
	    [ /\\o /g, '\u00F8' ],
	    [ /\\`\{u\}/g, '\u00F9' ],
	    [ /\\'\{u\}/g, '\u00FA' ],
	    [ /\\\^\{u\}/g, '\u00FB' ],
	    [ /\\"\{u\}/g, '\u00FC' ],
	    [ /\\'\{y\}/g, '\u00FD' ],
	    [ /\\th /g, '\u00FE' ],
	    [ /\\"\{y\}/g, '\u00FF' ],
	    [ /\\=\{A\}/g, '\u0100' ],
	    [ /\\=\{a\}/g, '\u0101' ],
	    [ /\\u\{A\}/g, '\u0102' ],
	    [ /\\u\{a\}/g, '\u0103' ],
	    [ /\\k\{A\}/g, '\u0104' ],
	    [ /\\k\{a\}/g, '\u0105' ],
	    [ /\\'\{C\}/g, '\u0106' ],
	    [ /\\'\{c\}/g, '\u0107' ],
	    [ /\\\^\{C\}/g, '\u0108' ],
	    [ /\\\^\{c\}/g, '\u0109' ],
	    [ /\\.\{C\}/g, '\u010A' ],
	    [ /\\.\{c\}/g, '\u010B' ],
	    [ /\\v\{C\}/g, '\u010C' ],
	    [ /\\v\{c\}/g, '\u010D' ],
	    [ /\\v\{D\}/g, '\u010E' ],
	    [ /\\v\{d\}/g, '\u010F' ],
	    [ /\\DJ /g, '\u0110' ],
	    [ /\\dj /g, '\u0111' ],
	    [ /\\=\{E\}/g, '\u0112' ],
	    [ /\\=\{e\}/g, '\u0113' ],
	    [ /\\u\{E\}/g, '\u0114' ],
	    [ /\\u\{e\}/g, '\u0115' ],
	    [ /\\.\{E\}/g, '\u0116' ],
	    [ /\\.\{e\}/g, '\u0117' ],
	    [ /\\k\{E\}/g, '\u0118' ],
	    [ /\\k\{e\}/g, '\u0119' ],
	    [ /\\v\{E\}/g, '\u011A' ],
	    [ /\\v\{e\}/g, '\u011B' ],
	    [ /\\\^\{G\}/g, '\u011C' ],
	    [ /\\\^\{g\}/g, '\u011D' ],
	    [ /\\u\{G\}/g, '\u011E' ],
	    [ /\\u\{g\}/g, '\u011F' ],
	    [ /\\.\{G\}/g, '\u0120' ],
	    [ /\\.\{g\}/g, '\u0121' ],
	    [ /\\c\{G\}/g, '\u0122' ],
	    [ /\\c\{g\}/g, '\u0123' ],
	    [ /\\\^\{H\}/g, '\u0124' ],
	    [ /\\\^\{h\}/g, '\u0125' ],
	    [ /\\Elzxh /g, '\u0127' ],
	    [ /\\~\{I\}/g, '\u0128' ],
	    [ /\\~\{\\i\}/g, '\u0129' ],
	    [ /\\=\{I\}/g, '\u012A' ],
	    [ /\\=\{\\i\}/g, '\u012B' ],
	    [ /\\u\{I\}/g, '\u012C' ],
	    [ /\\u\{\\i\}/g, '\u012D' ],
	    [ /\\k\{I\}/g, '\u012E' ],
	    [ /\\k\{i\}/g, '\u012F' ],
	    [ /\\.\{I\}/g, '\u0130' ],
	    [ /\\i /g, '\u0131' ],
	    [ /\\\^\{J\}/g, '\u0134' ],
	    [ /\\\^\{\\j\}/g, '\u0135' ],
	    [ /\\c\{K\}/g, '\u0136' ],
	    [ /\\c\{k\}/g, '\u0137' ],
	    [ /\\'\{L\}/g, '\u0139' ],
	    [ /\\'\{l\}/g, '\u013A' ],
	    [ /\\c\{L\}/g, '\u013B' ],
	    [ /\\c\{l\}/g, '\u013C' ],
	    [ /\\v\{L\}/g, '\u013D' ],
	    [ /\\v\{l\}/g, '\u013E' ],
	    [ /\\L /g, '\u0141' ],
	    [ /\\l /g, '\u0142' ],
	    [ /\\'\{N\}/g, '\u0143' ],
	    [ /\\'\{n\}/g, '\u0144' ],
	    [ /\\c\{N\}/g, '\u0145' ],
	    [ /\\c\{n\}/g, '\u0146' ],
	    [ /\\v\{N\}/g, '\u0147' ],
	    [ /\\v\{n\}/g, '\u0148' ],
	    [ /\\NG /g, '\u014A' ],
	    [ /\\ng /g, '\u014B' ],
	    [ /\\=\{O\}/g, '\u014C' ],
	    [ /\\=\{o\}/g, '\u014D' ],
	    [ /\\u\{O\}/g, '\u014E' ],
	    [ /\\u\{o\}/g, '\u014F' ],
	    [ /\\H\{O\}/g, '\u0150' ],
	    [ /\\H\{o\}/g, '\u0151' ],
	    [ /\\OE /g, '\u0152' ],
	    [ /\\oe /g, '\u0153' ],
	    [ /\\'\{R\}/g, '\u0154' ],
	    [ /\\'\{r\}/g, '\u0155' ],
	    [ /\\c\{R\}/g, '\u0156' ],
	    [ /\\c\{r\}/g, '\u0157' ],
	    [ /\\v\{R\}/g, '\u0158' ],
	    [ /\\v\{r\}/g, '\u0159' ],
	    [ /\\'\{S\}/g, '\u015A' ],
	    [ /\\'\{s\}/g, '\u015B' ],
	    [ /\\\^\{S\}/g, '\u015C' ],
	    [ /\\\^\{s\}/g, '\u015D' ],
	    [ /\\c\{S\}/g, '\u015E' ],
	    [ /\\c\{s\}/g, '\u015F' ],
	    [ /\\v\{S\}/g, '\u0160' ],
	    [ /\\v\{s\}/g, '\u0161' ],
	    [ /\\c\{T\}/g, '\u0162' ],
	    [ /\\c\{t\}/g, '\u0163' ],
	    [ /\\v\{T\}/g, '\u0164' ],
	    [ /\\v\{t\}/g, '\u0165' ],
	    [ /\\~\{U\}/g, '\u0168' ],
	    [ /\\~\{u\}/g, '\u0169' ],
	    [ /\\=\{U\}/g, '\u016A' ],
	    [ /\\=\{u\}/g, '\u016B' ],
	    [ /\\u\{U\}/g, '\u016C' ],
	    [ /\\u\{u\}/g, '\u016D' ],
	    [ /\\r\{U\}/g, '\u016E' ],
	    [ /\\r\{u\}/g, '\u016F' ],
	    [ /\\H\{U\}/g, '\u0170' ],
	    [ /\\H\{u\}/g, '\u0171' ],
	    [ /\\k\{U\}/g, '\u0172' ],
	    [ /\\k\{u\}/g, '\u0173' ],
	    [ /\\\^\{W\}/g, '\u0174' ],
	    [ /\\\^\{w\}/g, '\u0175' ],
	    [ /\\\^\{Y\}/g, '\u0176' ],
	    [ /\\\^\{y\}/g, '\u0177' ],
	    [ /\\"\{Y\}/g, '\u0178' ],
	    [ /\\'\{Z\}/g, '\u0179' ],
	    [ /\\'\{z\}/g, '\u017A' ],
	    [ /\\.\{Z\}/g, '\u017B' ],
	    [ /\\.\{z\}/g, '\u017C' ],
	    [ /\\v\{Z\}/g, '\u017D' ],
	    [ /\\v\{z\}/g, '\u017E' ],
	    [ /\\texthvlig /g, '\u0195' ],
	    [ /\\textnrleg /g, '\u019E' ],
	    [ /\\eth /g, '\u01AA' ],
	    [ /\\textdoublepipe /g, '\u01C2' ],
	    [ /\\'\{g\}/g, '\u01F5' ],
	    [ /\\Elztrna /g, '\u0250' ],
	    [ /\\Elztrnsa /g, '\u0252' ],
	    [ /\\Elzopeno /g, '\u0254' ],
	    [ /\\Elzrtld /g, '\u0256' ],
	    [ /\\Elzschwa /g, '\u0259' ],
	    [ /\\varepsilon /g, '\u025B' ],
	    [ /\\Elzpgamma /g, '\u0263' ],
	    [ /\\Elzpbgam /g, '\u0264' ],
	    [ /\\Elztrnh /g, '\u0265' ],
	    [ /\\Elzbtdl /g, '\u026C' ],
	    [ /\\Elzrtll /g, '\u026D' ],
	    [ /\\Elztrnm /g, '\u026F' ],
	    [ /\\Elztrnmlr /g, '\u0270' ],
	    [ /\\Elzltlmr /g, '\u0271' ],
	    [ /\\Elzltln /g, '\u0272' ],
	    [ /\\Elzrtln /g, '\u0273' ],
	    [ /\\Elzclomeg /g, '\u0277' ],
	    [ /\\textphi /g, '\u0278' ],
	    [ /\\Elztrnr /g, '\u0279' ],
	    [ /\\Elztrnrl /g, '\u027A' ],
	    [ /\\Elzrttrnr /g, '\u027B' ],
	    [ /\\Elzrl /g, '\u027C' ],
	    [ /\\Elzrtlr /g, '\u027D' ],
	    [ /\\Elzfhr /g, '\u027E' ],
	    [ /\\Elzrtls /g, '\u0282' ],
	    [ /\\Elzesh /g, '\u0283' ],
	    [ /\\Elztrnt /g, '\u0287' ],
	    [ /\\Elzrtlt /g, '\u0288' ],
	    [ /\\Elzpupsil /g, '\u028A' ],
	    [ /\\Elzpscrv /g, '\u028B' ],
	    [ /\\Elzinvv /g, '\u028C' ],
	    [ /\\Elzinvw /g, '\u028D' ],
	    [ /\\Elztrny /g, '\u028E' ],
	    [ /\\Elzrtlz /g, '\u0290' ],
	    [ /\\Elzyogh /g, '\u0292' ],
	    [ /\\Elzglst /g, '\u0294' ],
	    [ /\\Elzreglst /g, '\u0295' ],
	    [ /\\Elzinglst /g, '\u0296' ],
	    [ /\\textturnk /g, '\u029E' ],
	    [ /\\Elzdyogh /g, '\u02A4' ],
	    [ /\\Elztesh /g, '\u02A7' ],
	    [ /\\textasciicaron /g, '\u02C7' ],
	    [ /\\Elzverts /g, '\u02C8' ],
	    [ /\\Elzverti /g, '\u02CC' ],
	    [ /\\Elzlmrk /g, '\u02D0' ],
	    [ /\\Elzhlmrk /g, '\u02D1' ],
	    [ /\\Elzsbrhr /g, '\u02D2' ],
	    [ /\\Elzsblhr /g, '\u02D3' ],
	    [ /\\Elzrais /g, '\u02D4' ],
	    [ /\\Elzlow /g, '\u02D5' ],
	    [ /\\textasciibreve /g, '\u02D8' ],
	    [ /\\textperiodcentered /g, '\u02D9' ],
	    [ /\\r\{\}/g, '\u02DA' ],
	    [ /\\k\{\}/g, '\u02DB' ],
	    [ /\\texttildelow /g, '\u02DC' ],
	    [ /\\H\{\}/g, '\u02DD' ],
	    [ /\\tone\{55\}/g, '\u02E5' ],
	    [ /\\tone\{44\}/g, '\u02E6' ],
	    [ /\\tone\{33\}/g, '\u02E7' ],
	    [ /\\tone\{22\}/g, '\u02E8' ],
	    [ /\\tone\{11\}/g, '\u02E9' ],
	    [ /\\cyrchar\\C/g, '\u030F' ],
	    [ /\\Elzpalh /g, '\u0321' ],
	    [ /\\Elzrh /g, '\u0322' ],
	    [ /\\Elzsbbrg /g, '\u032A' ],
	    [ /\\Elzxl /g, '\u0335' ],
	    [ /\\Elzbar /g, '\u0336' ],
	    [ /\\'\{A\}/g, '\u0386' ],
	    [ /\\'\{E\}/g, '\u0388' ],
	    [ /\\'\{H\}/g, '\u0389' ],
	    [ /\\'\{\}\{I\}/g, '\u038A' ],
	    [ /\\'\{\}O/g, '\u038C' ],
	    [ /\\mathrm\{'Y\}/g, '\u038E' ],
	    [ /\\mathrm\{'\\Omega\}/g, '\u038F' ],
	    [ /\\acute\{\\ddot\{\\iota\}\}/g, '\u0390' ],
	    [ /\\Alpha /g, '\u0391' ],
	    [ /\\Beta /g, '\u0392' ],
	    [ /\\Gamma /g, '\u0393' ],
	    [ /\\Delta /g, '\u0394' ],
	    [ /\\Epsilon /g, '\u0395' ],
	    [ /\\Zeta /g, '\u0396' ],
	    [ /\\Eta /g, '\u0397' ],
	    [ /\\Theta /g, '\u0398' ],
	    [ /\\Iota /g, '\u0399' ],
	    [ /\\Kappa /g, '\u039A' ],
	    [ /\\Lambda /g, '\u039B' ],
	    [ /\\Xi /g, '\u039E' ],
	    [ /\\Pi /g, '\u03A0' ],
	    [ /\\Rho /g, '\u03A1' ],
	    [ /\\Sigma /g, '\u03A3' ],
	    [ /\\Tau /g, '\u03A4' ],
	    [ /\\Upsilon /g, '\u03A5' ],
	    [ /\\Phi /g, '\u03A6' ],
	    [ /\\Chi /g, '\u03A7' ],
	    [ /\\Psi /g, '\u03A8' ],
	    [ /\\Omega /g, '\u03A9' ],
	    [ /\\mathrm\{\\ddot\{I\}\}/g, '\u03AA' ],
	    [ /\\mathrm\{\\ddot\{Y\}\}/g, '\u03AB' ],
	    [ /\\'\{\$\\alpha\$\}/g, '\u03AC' ],
	    [ /\\acute\{\\epsilon\}/g, '\u03AD' ],
	    [ /\\acute\{\\eta\}/g, '\u03AE' ],
	    [ /\\acute\{\\iota\}/g, '\u03AF' ],
	    [ /\\acute\{\\ddot\{\\upsilon\}\}/g, '\u03B0' ],
	    [ /\\alpha /g, '\u03B1' ],
	    [ /\\beta /g, '\u03B2' ],
	    [ /\\gamma /g, '\u03B3' ],
	    [ /\\delta /g, '\u03B4' ],
	    [ /\\epsilon /g, '\u03B5' ],
	    [ /\\zeta /g, '\u03B6' ],
	    [ /\\eta /g, '\u03B7' ],
	    [ /\\texttheta /g, '\u03B8' ],
	    [ /\\iota /g, '\u03B9' ],
	    [ /\\kappa /g, '\u03BA' ],
	    [ /\\lambda /g, '\u03BB' ],
	    [ /\\mu /g, '\u03BC' ],
	    [ /\\nu /g, '\u03BD' ],
	    [ /\\xi /g, '\u03BE' ],
	    [ /\\pi /g, '\u03C0' ],
	    [ /\\rho /g, '\u03C1' ],
	    [ /\\varsigma /g, '\u03C2' ],
	    [ /\\sigma /g, '\u03C3' ],
	    [ /\\tau /g, '\u03C4' ],
	    [ /\\upsilon /g, '\u03C5' ],
	    [ /\\varphi /g, '\u03C6' ],
	    [ /\\chi /g, '\u03C7' ],
	    [ /\\psi /g, '\u03C8' ],
	    [ /\\omega /g, '\u03C9' ],
	    [ /\\ddot\{\\iota\}/g, '\u03CA' ],
	    [ /\\ddot\{\\upsilon\}/g, '\u03CB' ],
	    [ /\\'\{o\}/g, '\u03CC' ],
	    [ /\\acute\{\\upsilon\}/g, '\u03CD' ],
	    [ /\\acute\{\\omega\}/g, '\u03CE' ],
	    [ /\\Pisymbol\{ppi022\}\{87\}/g, '\u03D0' ],
	    [ /\\textvartheta /g, '\u03D1' ],
	    [ /\\Upsilon /g, '\u03D2' ],
	    [ /\\phi /g, '\u03D5' ],
	    [ /\\varpi /g, '\u03D6' ],
	    [ /\\Stigma /g, '\u03DA' ],
	    [ /\\Digamma /g, '\u03DC' ],
	    [ /\\digamma /g, '\u03DD' ],
	    [ /\\Koppa /g, '\u03DE' ],
	    [ /\\Sampi /g, '\u03E0' ],
	    [ /\\varkappa /g, '\u03F0' ],
	    [ /\\varrho /g, '\u03F1' ],
	    [ /\\textTheta /g, '\u03F4' ],
	    [ /\\backepsilon /g, '\u03F6' ],
	    [ /\\cyrchar\\CYRYO /g, '\u0401' ],
	    [ /\\cyrchar\\CYRDJE /g, '\u0402' ],
	    [ /\\cyrchar\{\\'\\CYRG\}/g, '\u0403' ],
	    [ /\\cyrchar\\CYRIE /g, '\u0404' ],
	    [ /\\cyrchar\\CYRDZE /g, '\u0405' ],
	    [ /\\cyrchar\\CYRII /g, '\u0406' ],
	    [ /\\cyrchar\\CYRYI /g, '\u0407' ],
	    [ /\\cyrchar\\CYRJE /g, '\u0408' ],
	    [ /\\cyrchar\\CYRLJE /g, '\u0409' ],
	    [ /\\cyrchar\\CYRNJE /g, '\u040A' ],
	    [ /\\cyrchar\\CYRTSHE /g, '\u040B' ],
	    [ /\\cyrchar\{\\'\\CYRK\}/g, '\u040C' ],
	    [ /\\cyrchar\\CYRUSHRT /g, '\u040E' ],
	    [ /\\cyrchar\\CYRDZHE /g, '\u040F' ],
	    [ /\\cyrchar\\CYRA /g, '\u0410' ],
	    [ /\\cyrchar\\CYRB /g, '\u0411' ],
	    [ /\\cyrchar\\CYRV /g, '\u0412' ],
	    [ /\\cyrchar\\CYRG /g, '\u0413' ],
	    [ /\\cyrchar\\CYRD /g, '\u0414' ],
	    [ /\\cyrchar\\CYRE /g, '\u0415' ],
	    [ /\\cyrchar\\CYRZH /g, '\u0416' ],
	    [ /\\cyrchar\\CYRZ /g, '\u0417' ],
	    [ /\\cyrchar\\CYRI /g, '\u0418' ],
	    [ /\\cyrchar\\CYRISHRT /g, '\u0419' ],
	    [ /\\cyrchar\\CYRK /g, '\u041A' ],
	    [ /\\cyrchar\\CYRL /g, '\u041B' ],
	    [ /\\cyrchar\\CYRM /g, '\u041C' ],
	    [ /\\cyrchar\\CYRN /g, '\u041D' ],
	    [ /\\cyrchar\\CYRO /g, '\u041E' ],
	    [ /\\cyrchar\\CYRP /g, '\u041F' ],
	    [ /\\cyrchar\\CYRR /g, '\u0420' ],
	    [ /\\cyrchar\\CYRS /g, '\u0421' ],
	    [ /\\cyrchar\\CYRT /g, '\u0422' ],
	    [ /\\cyrchar\\CYRU /g, '\u0423' ],
	    [ /\\cyrchar\\CYRF /g, '\u0424' ],
	    [ /\\cyrchar\\CYRH /g, '\u0425' ],
	    [ /\\cyrchar\\CYRC /g, '\u0426' ],
	    [ /\\cyrchar\\CYRCH /g, '\u0427' ],
	    [ /\\cyrchar\\CYRSH /g, '\u0428' ],
	    [ /\\cyrchar\\CYRSHCH /g, '\u0429' ],
	    [ /\\cyrchar\\CYRHRDSN /g, '\u042A' ],
	    [ /\\cyrchar\\CYRERY /g, '\u042B' ],
	    [ /\\cyrchar\\CYRSFTSN /g, '\u042C' ],
	    [ /\\cyrchar\\CYREREV /g, '\u042D' ],
	    [ /\\cyrchar\\CYRYU /g, '\u042E' ],
	    [ /\\cyrchar\\CYRYA /g, '\u042F' ],
	    [ /\\cyrchar\\cyra /g, '\u0430' ],
	    [ /\\cyrchar\\cyrb /g, '\u0431' ],
	    [ /\\cyrchar\\cyrv /g, '\u0432' ],
	    [ /\\cyrchar\\cyrg /g, '\u0433' ],
	    [ /\\cyrchar\\cyrd /g, '\u0434' ],
	    [ /\\cyrchar\\cyre /g, '\u0435' ],
	    [ /\\cyrchar\\cyrzh /g, '\u0436' ],
	    [ /\\cyrchar\\cyrz /g, '\u0437' ],
	    [ /\\cyrchar\\cyri /g, '\u0438' ],
	    [ /\\cyrchar\\cyrishrt /g, '\u0439' ],
	    [ /\\cyrchar\\cyrk /g, '\u043A' ],
	    [ /\\cyrchar\\cyrl /g, '\u043B' ],
	    [ /\\cyrchar\\cyrm /g, '\u043C' ],
	    [ /\\cyrchar\\cyrn /g, '\u043D' ],
	    [ /\\cyrchar\\cyro /g, '\u043E' ],
	    [ /\\cyrchar\\cyrp /g, '\u043F' ],
	    [ /\\cyrchar\\cyrr /g, '\u0440' ],
	    [ /\\cyrchar\\cyrs /g, '\u0441' ],
	    [ /\\cyrchar\\cyrt /g, '\u0442' ],
	    [ /\\cyrchar\\cyru /g, '\u0443' ],
	    [ /\\cyrchar\\cyrf /g, '\u0444' ],
	    [ /\\cyrchar\\cyrh /g, '\u0445' ],
	    [ /\\cyrchar\\cyrc /g, '\u0446' ],
	    [ /\\cyrchar\\cyrch /g, '\u0447' ],
	    [ /\\cyrchar\\cyrsh /g, '\u0448' ],
	    [ /\\cyrchar\\cyrshch /g, '\u0449' ],
	    [ /\\cyrchar\\cyrhrdsn /g, '\u044A' ],
	    [ /\\cyrchar\\cyrery /g, '\u044B' ],
	    [ /\\cyrchar\\cyrsftsn /g, '\u044C' ],
	    [ /\\cyrchar\\cyrerev /g, '\u044D' ],
	    [ /\\cyrchar\\cyryu /g, '\u044E' ],
	    [ /\\cyrchar\\cyrya /g, '\u044F' ],
	    [ /\\cyrchar\\cyryo /g, '\u0451' ],
	    [ /\\cyrchar\\cyrdje /g, '\u0452' ],
	    [ /\\cyrchar\{\\'\\cyrg\}/g, '\u0453' ],
	    [ /\\cyrchar\\cyrie /g, '\u0454' ],
	    [ /\\cyrchar\\cyrdze /g, '\u0455' ],
	    [ /\\cyrchar\\cyrii /g, '\u0456' ],
	    [ /\\cyrchar\\cyryi /g, '\u0457' ],
	    [ /\\cyrchar\\cyrje /g, '\u0458' ],
	    [ /\\cyrchar\\cyrlje /g, '\u0459' ],
	    [ /\\cyrchar\\cyrnje /g, '\u045A' ],
	    [ /\\cyrchar\\cyrtshe /g, '\u045B' ],
	    [ /\\cyrchar\{\\'\\cyrk\}/g, '\u045C' ],
	    [ /\\cyrchar\\cyrushrt /g, '\u045E' ],
	    [ /\\cyrchar\\cyrdzhe /g, '\u045F' ],
	    [ /\\cyrchar\\CYROMEGA /g, '\u0460' ],
	    [ /\\cyrchar\\cyromega /g, '\u0461' ],
	    [ /\\cyrchar\\CYRYAT /g, '\u0462' ],
	    [ /\\cyrchar\\CYRIOTE /g, '\u0464' ],
	    [ /\\cyrchar\\cyriote /g, '\u0465' ],
	    [ /\\cyrchar\\CYRLYUS /g, '\u0466' ],
	    [ /\\cyrchar\\cyrlyus /g, '\u0467' ],
	    [ /\\cyrchar\\CYRIOTLYUS /g, '\u0468' ],
	    [ /\\cyrchar\\cyriotlyus /g, '\u0469' ],
	    [ /\\cyrchar\\CYRBYUS /g, '\u046A' ],
	    [ /\\cyrchar\\CYRIOTBYUS /g, '\u046C' ],
	    [ /\\cyrchar\\cyriotbyus /g, '\u046D' ],
	    [ /\\cyrchar\\CYRKSI /g, '\u046E' ],
	    [ /\\cyrchar\\cyrksi /g, '\u046F' ],
	    [ /\\cyrchar\\CYRPSI /g, '\u0470' ],
	    [ /\\cyrchar\\cyrpsi /g, '\u0471' ],
	    [ /\\cyrchar\\CYRFITA /g, '\u0472' ],
	    [ /\\cyrchar\\CYRIZH /g, '\u0474' ],
	    [ /\\cyrchar\\CYRUK /g, '\u0478' ],
	    [ /\\cyrchar\\cyruk /g, '\u0479' ],
	    [ /\\cyrchar\\CYROMEGARND /g, '\u047A' ],
	    [ /\\cyrchar\\cyromegarnd /g, '\u047B' ],
	    [ /\\cyrchar\\CYROMEGATITLO /g, '\u047C' ],
	    [ /\\cyrchar\\cyromegatitlo /g, '\u047D' ],
	    [ /\\cyrchar\\CYROT /g, '\u047E' ],
	    [ /\\cyrchar\\cyrot /g, '\u047F' ],
	    [ /\\cyrchar\\CYRKOPPA /g, '\u0480' ],
	    [ /\\cyrchar\\cyrkoppa /g, '\u0481' ],
	    [ /\\cyrchar\\cyrthousands /g, '\u0482' ],
	    [ /\\cyrchar\\cyrhundredthousands /g, '\u0488' ],
	    [ /\\cyrchar\\cyrmillions /g, '\u0489' ],
	    [ /\\cyrchar\\CYRSEMISFTSN /g, '\u048C' ],
	    [ /\\cyrchar\\cyrsemisftsn /g, '\u048D' ],
	    [ /\\cyrchar\\CYRRTICK /g, '\u048E' ],
	    [ /\\cyrchar\\cyrrtick /g, '\u048F' ],
	    [ /\\cyrchar\\CYRGUP /g, '\u0490' ],
	    [ /\\cyrchar\\cyrgup /g, '\u0491' ],
	    [ /\\cyrchar\\CYRGHCRS /g, '\u0492' ],
	    [ /\\cyrchar\\cyrghcrs /g, '\u0493' ],
	    [ /\\cyrchar\\CYRGHK /g, '\u0494' ],
	    [ /\\cyrchar\\cyrghk /g, '\u0495' ],
	    [ /\\cyrchar\\CYRZHDSC /g, '\u0496' ],
	    [ /\\cyrchar\\cyrzhdsc /g, '\u0497' ],
	    [ /\\cyrchar\\CYRZDSC /g, '\u0498' ],
	    [ /\\cyrchar\\cyrzdsc /g, '\u0499' ],
	    [ /\\cyrchar\\CYRKDSC /g, '\u049A' ],
	    [ /\\cyrchar\\cyrkdsc /g, '\u049B' ],
	    [ /\\cyrchar\\CYRKVCRS /g, '\u049C' ],
	    [ /\\cyrchar\\cyrkvcrs /g, '\u049D' ],
	    [ /\\cyrchar\\CYRKHCRS /g, '\u049E' ],
	    [ /\\cyrchar\\cyrkhcrs /g, '\u049F' ],
	    [ /\\cyrchar\\CYRKBEAK /g, '\u04A0' ],
	    [ /\\cyrchar\\cyrkbeak /g, '\u04A1' ],
	    [ /\\cyrchar\\CYRNDSC /g, '\u04A2' ],
	    [ /\\cyrchar\\cyrndsc /g, '\u04A3' ],
	    [ /\\cyrchar\\CYRNG /g, '\u04A4' ],
	    [ /\\cyrchar\\cyrng /g, '\u04A5' ],
	    [ /\\cyrchar\\CYRPHK /g, '\u04A6' ],
	    [ /\\cyrchar\\cyrphk /g, '\u04A7' ],
	    [ /\\cyrchar\\CYRABHHA /g, '\u04A8' ],
	    [ /\\cyrchar\\cyrabhha /g, '\u04A9' ],
	    [ /\\cyrchar\\CYRSDSC /g, '\u04AA' ],
	    [ /\\cyrchar\\cyrsdsc /g, '\u04AB' ],
	    [ /\\cyrchar\\CYRTDSC /g, '\u04AC' ],
	    [ /\\cyrchar\\cyrtdsc /g, '\u04AD' ],
	    [ /\\cyrchar\\CYRY /g, '\u04AE' ],
	    [ /\\cyrchar\\cyry /g, '\u04AF' ],
	    [ /\\cyrchar\\CYRYHCRS /g, '\u04B0' ],
	    [ /\\cyrchar\\cyryhcrs /g, '\u04B1' ],
	    [ /\\cyrchar\\CYRHDSC /g, '\u04B2' ],
	    [ /\\cyrchar\\cyrhdsc /g, '\u04B3' ],
	    [ /\\cyrchar\\CYRTETSE /g, '\u04B4' ],
	    [ /\\cyrchar\\cyrtetse /g, '\u04B5' ],
	    [ /\\cyrchar\\CYRCHRDSC /g, '\u04B6' ],
	    [ /\\cyrchar\\cyrchrdsc /g, '\u04B7' ],
	    [ /\\cyrchar\\CYRCHVCRS /g, '\u04B8' ],
	    [ /\\cyrchar\\cyrchvcrs /g, '\u04B9' ],
	    [ /\\cyrchar\\CYRSHHA /g, '\u04BA' ],
	    [ /\\cyrchar\\cyrshha /g, '\u04BB' ],
	    [ /\\cyrchar\\CYRABHCH /g, '\u04BC' ],
	    [ /\\cyrchar\\cyrabhch /g, '\u04BD' ],
	    [ /\\cyrchar\\CYRABHCHDSC /g, '\u04BE' ],
	    [ /\\cyrchar\\cyrabhchdsc /g, '\u04BF' ],
	    [ /\\cyrchar\\CYRpalochka /g, '\u04C0' ],
	    [ /\\cyrchar\\CYRKHK /g, '\u04C3' ],
	    [ /\\cyrchar\\cyrkhk /g, '\u04C4' ],
	    [ /\\cyrchar\\CYRNHK /g, '\u04C7' ],
	    [ /\\cyrchar\\cyrnhk /g, '\u04C8' ],
	    [ /\\cyrchar\\CYRCHLDSC /g, '\u04CB' ],
	    [ /\\cyrchar\\cyrchldsc /g, '\u04CC' ],
	    [ /\\cyrchar\\CYRAE /g, '\u04D4' ],
	    [ /\\cyrchar\\cyrae /g, '\u04D5' ],
	    [ /\\cyrchar\\CYRSCHWA /g, '\u04D8' ],
	    [ /\\cyrchar\\cyrschwa /g, '\u04D9' ],
	    [ /\\cyrchar\\CYRABHDZE /g, '\u04E0' ],
	    [ /\\cyrchar\\cyrabhdze /g, '\u04E1' ],
	    [ /\\cyrchar\\CYROTLD /g, '\u04E8' ],
	    [ /\\cyrchar\\cyrotld /g, '\u04E9' ],
	    [ /\\hspace\{0.6em\}/g, '\u2002' ],
	    [ /\\hspace\{1em\}/g, '\u2003' ],
	    [ /\\hspace\{0.33em\}/g, '\u2004' ],
	    [ /\\hspace\{0.25em\}/g, '\u2005' ],
	    [ /\\hspace\{0.166em\}/g, '\u2006' ],
	    [ /\\hphantom\{0\}/g, '\u2007' ],
	    [ /\\hphantom\{,\}/g, '\u2008' ],
	    [ /\\hspace\{0.167em\}/g, '\u2009' ],
	    [ /\\mkern1mu /g, '\u200A' ],
	    [ /\\textendash /g, '\u2013' ],
	    [ /\\textemdash /g, '\u2014' ],
	    [ /\\rule\{1em\}\{1pt\}/g, '\u2015' ],
	    [ /\\Vert /g, '\u2016' ],
	    [ /\\Elzreapos /g, '\u201B' ],
	    [ /\\textquotedblleft /g, '\u201C' ],
	    [ /\\textquotedblright /g, '\u201D' ],
	    [ /\\textdagger /g, '\u2020' ],
	    [ /\\textdaggerdbl /g, '\u2021' ],
	    [ /\\textbullet /g, '\u2022' ],
	    [ /\\ldots /g, '\u2026' ],
	    [ /\\textperthousand /g, '\u2030' ],
	    [ /\\textpertenthousand /g, '\u2031' ],
	    [ /\\backprime /g, '\u2035' ],
	    [ /\\guilsinglleft /g, '\u2039' ],
	    [ /\\guilsinglright /g, '\u203A' ],
	    [ /\\mkern4mu /g, '\u205F' ],
	    [ /\\nolinebreak /g, '\u2060' ],
	    [ /\\ensuremath\{\\Elzpes\}/g, '\u20A7' ],
	    [ /\\mbox\{\\texteuro\} /g, '\u20AC' ],
	    [ /\\dddot /g, '\u20DB' ],
	    [ /\\ddddot /g, '\u20DC' ],
	    [ /\\mathbb\{C\}/g, '\u2102' ],
	    [ /\\mathscr\{g\}/g, '\u210A' ],
	    [ /\\mathscr\{H\}/g, '\u210B' ],
	    [ /\\mathfrak\{H\}/g, '\u210C' ],
	    [ /\\mathbb\{H\}/g, '\u210D' ],
	    [ /\\hslash /g, '\u210F' ],
	    [ /\\mathscr\{I\}/g, '\u2110' ],
	    [ /\\mathfrak\{I\}/g, '\u2111' ],
	    [ /\\mathscr\{L\}/g, '\u2112' ],
	    [ /\\mathscr\{l\}/g, '\u2113' ],
	    [ /\\mathbb\{N\}/g, '\u2115' ],
	    [ /\\cyrchar\\textnumero /g, '\u2116' ],
	    [ /\\wp /g, '\u2118' ],
	    [ /\\mathbb\{P\}/g, '\u2119' ],
	    [ /\\mathbb\{Q\}/g, '\u211A' ],
	    [ /\\mathscr\{R\}/g, '\u211B' ],
	    [ /\\mathfrak\{R\}/g, '\u211C' ],
	    [ /\\mathbb\{R\}/g, '\u211D' ],
	    [ /\\Elzxrat /g, '\u211E' ],
	    [ /\\texttrademark /g, '\u2122' ],
	    [ /\\mathbb\{Z\}/g, '\u2124' ],
	    [ /\\Omega /g, '\u2126' ],
	    [ /\\mho /g, '\u2127' ],
	    [ /\\mathfrak\{Z\}/g, '\u2128' ],
	    [ /\\ElsevierGlyph\{2129\}/g, '\u2129' ],
	    [ /\\AA /g, '\u212B' ],
	    [ /\\mathscr\{B\}/g, '\u212C' ],
	    [ /\\mathfrak\{C\}/g, '\u212D' ],
	    [ /\\mathscr\{e\}/g, '\u212F' ],
	    [ /\\mathscr\{E\}/g, '\u2130' ],
	    [ /\\mathscr\{F\}/g, '\u2131' ],
	    [ /\\mathscr\{M\}/g, '\u2133' ],
	    [ /\\mathscr\{o\}/g, '\u2134' ],
	    [ /\\aleph /g, '\u2135' ],
	    [ /\\beth /g, '\u2136' ],
	    [ /\\gimel /g, '\u2137' ],
	    [ /\\daleth /g, '\u2138' ],
	    [ /\\textfrac\{1\}\{3\}/g, '\u2153' ],
	    [ /\\textfrac\{2\}\{3\}/g, '\u2154' ],
	    [ /\\textfrac\{1\}\{5\}/g, '\u2155' ],
	    [ /\\textfrac\{2\}\{5\}/g, '\u2156' ],
	    [ /\\textfrac\{3\}\{5\}/g, '\u2157' ],
	    [ /\\textfrac\{4\}\{5\}/g, '\u2158' ],
	    [ /\\textfrac\{1\}\{6\}/g, '\u2159' ],
	    [ /\\textfrac\{5\}\{6\}/g, '\u215A' ],
	    [ /\\textfrac\{1\}\{8\}/g, '\u215B' ],
	    [ /\\textfrac\{3\}\{8\}/g, '\u215C' ],
	    [ /\\textfrac\{5\}\{8\}/g, '\u215D' ],
	    [ /\\textfrac\{7\}\{8\}/g, '\u215E' ],
	    [ /\\leftarrow /g, '\u2190' ],
	    [ /\\uparrow /g, '\u2191' ],
	    [ /\\rightarrow /g, '\u2192' ],
	    [ /\\downarrow /g, '\u2193' ],
	    [ /\\leftrightarrow /g, '\u2194' ],
	    [ /\\updownarrow /g, '\u2195' ],
	    [ /\\nwarrow /g, '\u2196' ],
	    [ /\\nearrow /g, '\u2197' ],
	    [ /\\searrow /g, '\u2198' ],
	    [ /\\swarrow /g, '\u2199' ],
	    [ /\\nleftarrow /g, '\u219A' ],
	    [ /\\nrightarrow /g, '\u219B' ],
	    [ /\\arrowwaveright /g, '\u219C' ],
	    [ /\\arrowwaveright /g, '\u219D' ],
	    [ /\\twoheadleftarrow /g, '\u219E' ],
	    [ /\\twoheadrightarrow /g, '\u21A0' ],
	    [ /\\leftarrowtail /g, '\u21A2' ],
	    [ /\\rightarrowtail /g, '\u21A3' ],
	    [ /\\mapsto /g, '\u21A6' ],
	    [ /\\hookleftarrow /g, '\u21A9' ],
	    [ /\\hookrightarrow /g, '\u21AA' ],
	    [ /\\looparrowleft /g, '\u21AB' ],
	    [ /\\looparrowright /g, '\u21AC' ],
	    [ /\\leftrightsquigarrow /g, '\u21AD' ],
	    [ /\\nleftrightarrow /g, '\u21AE' ],
	    [ /\\Lsh /g, '\u21B0' ],
	    [ /\\Rsh /g, '\u21B1' ],
	    [ /\\ElsevierGlyph\{21B3\}/g, '\u21B3' ],
	    [ /\\curvearrowleft /g, '\u21B6' ],
	    [ /\\curvearrowright /g, '\u21B7' ],
	    [ /\\circlearrowleft /g, '\u21BA' ],
	    [ /\\circlearrowright /g, '\u21BB' ],
	    [ /\\leftharpoonup /g, '\u21BC' ],
	    [ /\\leftharpoondown /g, '\u21BD' ],
	    [ /\\upharpoonright /g, '\u21BE' ],
	    [ /\\upharpoonleft /g, '\u21BF' ],
	    [ /\\rightharpoonup /g, '\u21C0' ],
	    [ /\\rightharpoondown /g, '\u21C1' ],
	    [ /\\downharpoonright /g, '\u21C2' ],
	    [ /\\downharpoonleft /g, '\u21C3' ],
	    [ /\\rightleftarrows /g, '\u21C4' ],
	    [ /\\dblarrowupdown /g, '\u21C5' ],
	    [ /\\leftrightarrows /g, '\u21C6' ],
	    [ /\\leftleftarrows /g, '\u21C7' ],
	    [ /\\upuparrows /g, '\u21C8' ],
	    [ /\\rightrightarrows /g, '\u21C9' ],
	    [ /\\downdownarrows /g, '\u21CA' ],
	    [ /\\leftrightharpoons /g, '\u21CB' ],
	    [ /\\rightleftharpoons /g, '\u21CC' ],
	    [ /\\nLeftarrow /g, '\u21CD' ],
	    [ /\\nLeftrightarrow /g, '\u21CE' ],
	    [ /\\nRightarrow /g, '\u21CF' ],
	    [ /\\Leftarrow /g, '\u21D0' ],
	    [ /\\Uparrow /g, '\u21D1' ],
	    [ /\\Rightarrow /g, '\u21D2' ],
	    [ /\\Downarrow /g, '\u21D3' ],
	    [ /\\Leftrightarrow /g, '\u21D4' ],
	    [ /\\Updownarrow /g, '\u21D5' ],
	    [ /\\Lleftarrow /g, '\u21DA' ],
	    [ /\\Rrightarrow /g, '\u21DB' ],
	    [ /\\rightsquigarrow /g, '\u21DD' ],
	    [ /\\DownArrowUpArrow /g, '\u21F5' ],
	    [ /\\forall /g, '\u2200' ],
	    [ /\\complement /g, '\u2201' ],
	    [ /\\partial /g, '\u2202' ],
	    [ /\\exists /g, '\u2203' ],
	    [ /\\nexists /g, '\u2204' ],
	    [ /\\varnothing /g, '\u2205' ],
	    [ /\\nabla /g, '\u2207' ],
	    [ /\\in /g, '\u2208' ],
	    [ /\\not\\in /g, '\u2209' ],
	    [ /\\ni /g, '\u220B' ],
	    [ /\\not\\ni /g, '\u220C' ],
	    [ /\\prod /g, '\u220F' ],
	    [ /\\coprod /g, '\u2210' ],
	    [ /\\sum /g, '\u2211' ],
	    [ /\\mp /g, '\u2213' ],
	    [ /\\dotplus /g, '\u2214' ],
	    [ /\\setminus /g, '\u2216' ],
	    [ /\\circ /g, '\u2218' ],
	    [ /\\bullet /g, '\u2219' ],
	    [ /\\surd /g, '\u221A' ],
	    [ /\\propto /g, '\u221D' ],
	    [ /\\infty /g, '\u221E' ],
	    [ /\\rightangle /g, '\u221F' ],
	    [ /\\angle /g, '\u2220' ],
	    [ /\\measuredangle /g, '\u2221' ],
	    [ /\\sphericalangle /g, '\u2222' ],
	    [ /\\mid /g, '\u2223' ],
	    [ /\\nmid /g, '\u2224' ],
	    [ /\\parallel /g, '\u2225' ],
	    [ /\\nparallel /g, '\u2226' ],
	    [ /\\wedge /g, '\u2227' ],
	    [ /\\vee /g, '\u2228' ],
	    [ /\\cap /g, '\u2229' ],
	    [ /\\cup /g, '\u222A' ],
	    [ /\\int /g, '\u222B' ],
	    [ /\\int\\!\\int /g, '\u222C' ],
	    [ /\\int\\!\\int\\!\\int /g, '\u222D' ],
	    [ /\\oint /g, '\u222E' ],
	    [ /\\surfintegral /g, '\u222F' ],
	    [ /\\volintegral /g, '\u2230' ],
	    [ /\\clwintegral /g, '\u2231' ],
	    [ /\\ElsevierGlyph\{2232\}/g, '\u2232' ],
	    [ /\\ElsevierGlyph\{2233\}/g, '\u2233' ],
	    [ /\\therefore /g, '\u2234' ],
	    [ /\\because /g, '\u2235' ],
	    [ /\\Colon /g, '\u2237' ],
	    [ /\\ElsevierGlyph\{2238\}/g, '\u2238' ],
	    [ /\\mathbin\{\{:\}\\!\\!\{\-\}\\!\\!\{:\}\}/g, '\u223A' ],
	    [ /\\homothetic /g, '\u223B' ],
	    [ /\\sim /g, '\u223C' ],
	    [ /\\backsim /g, '\u223D' ],
	    [ /\\lazysinv /g, '\u223E' ],
	    [ /\\wr /g, '\u2240' ],
	    [ /\\not\\sim /g, '\u2241' ],
	    [ /\\ElsevierGlyph\{2242\}/g, '\u2242' ],
	    [ /\\NotEqualTilde /g, '\u2242-00338' ],
	    [ /\\simeq /g, '\u2243' ],
	    [ /\\not\\simeq /g, '\u2244' ],
	    [ /\\cong /g, '\u2245' ],
	    [ /\\approxnotequal /g, '\u2246' ],
	    [ /\\not\\cong /g, '\u2247' ],
	    [ /\\approx /g, '\u2248' ],
	    [ /\\not\\approx /g, '\u2249' ],
	    [ /\\approxeq /g, '\u224A' ],
	    [ /\\tildetrpl /g, '\u224B' ],
	    [ /\\not\\apid /g, '\u224B-00338' ],
	    [ /\\allequal /g, '\u224C' ],
	    [ /\\asymp /g, '\u224D' ],
	    [ /\\Bumpeq /g, '\u224E' ],
	    [ /\\NotHumpDownHump /g, '\u224E-00338' ],
	    [ /\\bumpeq /g, '\u224F' ],
	    [ /\\NotHumpEqual /g, '\u224F-00338' ],
	    [ /\\doteq /g, '\u2250' ],
	    [ /\\not\\doteq/g, '\u2250-00338' ],
	    [ /\\doteqdot /g, '\u2251' ],
	    [ /\\fallingdotseq /g, '\u2252' ],
	    [ /\\risingdotseq /g, '\u2253' ],
	    [ /\\eqcirc /g, '\u2256' ],
	    [ /\\circeq /g, '\u2257' ],
	    [ /\\estimates /g, '\u2259' ],
	    [ /\\ElsevierGlyph\{225A\}/g, '\u225A' ],
	    [ /\\starequal /g, '\u225B' ],
	    [ /\\triangleq /g, '\u225C' ],
	    [ /\\ElsevierGlyph\{225F\}/g, '\u225F' ],
	    [ /\\not =/g, '\u2260' ],
	    [ /\\equiv /g, '\u2261' ],
	    [ /\\not\\equiv /g, '\u2262' ],
	    [ /\\leq /g, '\u2264' ],
	    [ /\\geq /g, '\u2265' ],
	    [ /\\leqq /g, '\u2266' ],
	    [ /\\geqq /g, '\u2267' ],
	    [ /\\lneqq /g, '\u2268' ],
	    [ /\\lvertneqq /g, '\u2268-0FE00' ],
	    [ /\\gneqq /g, '\u2269' ],
	    [ /\\gvertneqq /g, '\u2269-0FE00' ],
	    [ /\\ll /g, '\u226A' ],
	    [ /\\NotLessLess /g, '\u226A-00338' ],
	    [ /\\gg /g, '\u226B' ],
	    [ /\\NotGreaterGreater /g, '\u226B-00338' ],
	    [ /\\between /g, '\u226C' ],
	    [ /\\not\\kern\-0.3em\\times /g, '\u226D' ],
	    [ /\\not</g, '\u226E' ],
	    [ /\\not>/g, '\u226F' ],
	    [ /\\not\\leq /g, '\u2270' ],
	    [ /\\not\\geq /g, '\u2271' ],
	    [ /\\lessequivlnt /g, '\u2272' ],
	    [ /\\greaterequivlnt /g, '\u2273' ],
	    [ /\\ElsevierGlyph\{2274\}/g, '\u2274' ],
	    [ /\\ElsevierGlyph\{2275\}/g, '\u2275' ],
	    [ /\\lessgtr /g, '\u2276' ],
	    [ /\\gtrless /g, '\u2277' ],
	    [ /\\notlessgreater /g, '\u2278' ],
	    [ /\\notgreaterless /g, '\u2279' ],
	    [ /\\prec /g, '\u227A' ],
	    [ /\\succ /g, '\u227B' ],
	    [ /\\preccurlyeq /g, '\u227C' ],
	    [ /\\succcurlyeq /g, '\u227D' ],
	    [ /\\precapprox /g, '\u227E' ],
	    [ /\\NotPrecedesTilde /g, '\u227E-00338' ],
	    [ /\\succapprox /g, '\u227F' ],
	    [ /\\NotSucceedsTilde /g, '\u227F-00338' ],
	    [ /\\not\\prec /g, '\u2280' ],
	    [ /\\not\\succ /g, '\u2281' ],
	    [ /\\subset /g, '\u2282' ],
	    [ /\\supset /g, '\u2283' ],
	    [ /\\not\\subset /g, '\u2284' ],
	    [ /\\not\\supset /g, '\u2285' ],
	    [ /\\subseteq /g, '\u2286' ],
	    [ /\\supseteq /g, '\u2287' ],
	    [ /\\not\\subseteq /g, '\u2288' ],
	    [ /\\not\\supseteq /g, '\u2289' ],
	    [ /\\subsetneq /g, '\u228A' ],
	    [ /\\varsubsetneqq /g, '\u228A-0FE00' ],
	    [ /\\supsetneq /g, '\u228B' ],
	    [ /\\varsupsetneq /g, '\u228B-0FE00' ],
	    [ /\\uplus /g, '\u228E' ],
	    [ /\\sqsubset /g, '\u228F' ],
	    [ /\\NotSquareSubset /g, '\u228F-00338' ],
	    [ /\\sqsupset /g, '\u2290' ],
	    [ /\\NotSquareSuperset /g, '\u2290-00338' ],
	    [ /\\sqsubseteq /g, '\u2291' ],
	    [ /\\sqsupseteq /g, '\u2292' ],
	    [ /\\sqcap /g, '\u2293' ],
	    [ /\\sqcup /g, '\u2294' ],
	    [ /\\oplus /g, '\u2295' ],
	    [ /\\ominus /g, '\u2296' ],
	    [ /\\otimes /g, '\u2297' ],
	    [ /\\oslash /g, '\u2298' ],
	    [ /\\odot /g, '\u2299' ],
	    [ /\\circledcirc /g, '\u229A' ],
	    [ /\\circledast /g, '\u229B' ],
	    [ /\\circleddash /g, '\u229D' ],
	    [ /\\boxplus /g, '\u229E' ],
	    [ /\\boxminus /g, '\u229F' ],
	    [ /\\boxtimes /g, '\u22A0' ],
	    [ /\\boxdot /g, '\u22A1' ],
	    [ /\\vdash /g, '\u22A2' ],
	    [ /\\dashv /g, '\u22A3' ],
	    [ /\\top /g, '\u22A4' ],
	    [ /\\perp /g, '\u22A5' ],
	    [ /\\truestate /g, '\u22A7' ],
	    [ /\\forcesextra /g, '\u22A8' ],
	    [ /\\Vdash /g, '\u22A9' ],
	    [ /\\Vvdash /g, '\u22AA' ],
	    [ /\\VDash /g, '\u22AB' ],
	    [ /\\nvdash /g, '\u22AC' ],
	    [ /\\nvDash /g, '\u22AD' ],
	    [ /\\nVdash /g, '\u22AE' ],
	    [ /\\nVDash /g, '\u22AF' ],
	    [ /\\vartriangleleft /g, '\u22B2' ],
	    [ /\\vartriangleright /g, '\u22B3' ],
	    [ /\\trianglelefteq /g, '\u22B4' ],
	    [ /\\trianglerighteq /g, '\u22B5' ],
	    [ /\\original /g, '\u22B6' ],
	    [ /\\image /g, '\u22B7' ],
	    [ /\\multimap /g, '\u22B8' ],
	    [ /\\hermitconjmatrix /g, '\u22B9' ],
	    [ /\\intercal /g, '\u22BA' ],
	    [ /\\veebar /g, '\u22BB' ],
	    [ /\\rightanglearc /g, '\u22BE' ],
	    [ /\\ElsevierGlyph\{22C0\}/g, '\u22C0' ],
	    [ /\\ElsevierGlyph\{22C1\}/g, '\u22C1' ],
	    [ /\\bigcap /g, '\u22C2' ],
	    [ /\\bigcup /g, '\u22C3' ],
	    [ /\\diamond /g, '\u22C4' ],
	    [ /\\cdot /g, '\u22C5' ],
	    [ /\\star /g, '\u22C6' ],
	    [ /\\divideontimes /g, '\u22C7' ],
	    [ /\\bowtie /g, '\u22C8' ],
	    [ /\\ltimes /g, '\u22C9' ],
	    [ /\\rtimes /g, '\u22CA' ],
	    [ /\\leftthreetimes /g, '\u22CB' ],
	    [ /\\rightthreetimes /g, '\u22CC' ],
	    [ /\\backsimeq /g, '\u22CD' ],
	    [ /\\curlyvee /g, '\u22CE' ],
	    [ /\\curlywedge /g, '\u22CF' ],
	    [ /\\Subset /g, '\u22D0' ],
	    [ /\\Supset /g, '\u22D1' ],
	    [ /\\Cap /g, '\u22D2' ],
	    [ /\\Cup /g, '\u22D3' ],
	    [ /\\pitchfork /g, '\u22D4' ],
	    [ /\\lessdot /g, '\u22D6' ],
	    [ /\\gtrdot /g, '\u22D7' ],
	    [ /\\verymuchless /g, '\u22D8' ],
	    [ /\\verymuchgreater /g, '\u22D9' ],
	    [ /\\lesseqgtr /g, '\u22DA' ],
	    [ /\\gtreqless /g, '\u22DB' ],
	    [ /\\curlyeqprec /g, '\u22DE' ],
	    [ /\\curlyeqsucc /g, '\u22DF' ],
	    [ /\\not\\sqsubseteq /g, '\u22E2' ],
	    [ /\\not\\sqsupseteq /g, '\u22E3' ],
	    [ /\\Elzsqspne /g, '\u22E5' ],
	    [ /\\lnsim /g, '\u22E6' ],
	    [ /\\gnsim /g, '\u22E7' ],
	    [ /\\precedesnotsimilar /g, '\u22E8' ],
	    [ /\\succnsim /g, '\u22E9' ],
	    [ /\\ntriangleleft /g, '\u22EA' ],
	    [ /\\ntriangleright /g, '\u22EB' ],
	    [ /\\ntrianglelefteq /g, '\u22EC' ],
	    [ /\\ntrianglerighteq /g, '\u22ED' ],
	    [ /\\vdots /g, '\u22EE' ],
	    [ /\\cdots /g, '\u22EF' ],
	    [ /\\upslopeellipsis /g, '\u22F0' ],
	    [ /\\downslopeellipsis /g, '\u22F1' ],
	    [ /\\barwedge /g, '\u2305' ],
	    [ /\\perspcorrespond /g, '\u2306' ],
	    [ /\\lceil /g, '\u2308' ],
	    [ /\\rceil /g, '\u2309' ],
	    [ /\\lfloor /g, '\u230A' ],
	    [ /\\rfloor /g, '\u230B' ],
	    [ /\\recorder /g, '\u2315' ],
	    [ /\\mathchar"2208/g, '\u2316' ],
	    [ /\\ulcorner /g, '\u231C' ],
	    [ /\\urcorner /g, '\u231D' ],
	    [ /\\llcorner /g, '\u231E' ],
	    [ /\\lrcorner /g, '\u231F' ],
	    [ /\\frown /g, '\u2322' ],
	    [ /\\smile /g, '\u2323' ],
	    [ /\\langle /g, '\u2329' ],
	    [ /\\rangle /g, '\u232A' ],
	    [ /\\ElsevierGlyph\{E838\}/g, '\u233D' ],
	    [ /\\Elzdlcorn /g, '\u23A3' ],
	    [ /\\lmoustache /g, '\u23B0' ],
	    [ /\\rmoustache /g, '\u23B1' ],
	    [ /\\textvisiblespace /g, '\u2423' ],
	    [ /\\ding\{172\}/g, '\u2460' ],
	    [ /\\ding\{173\}/g, '\u2461' ],
	    [ /\\ding\{174\}/g, '\u2462' ],
	    [ /\\ding\{175\}/g, '\u2463' ],
	    [ /\\ding\{176\}/g, '\u2464' ],
	    [ /\\ding\{177\}/g, '\u2465' ],
	    [ /\\ding\{178\}/g, '\u2466' ],
	    [ /\\ding\{179\}/g, '\u2467' ],
	    [ /\\ding\{180\}/g, '\u2468' ],
	    [ /\\ding\{181\}/g, '\u2469' ],
	    [ /\\circledS /g, '\u24C8' ],
	    [ /\\Elzdshfnc /g, '\u2506' ],
	    [ /\\Elzsqfnw /g, '\u2519' ],
	    [ /\\diagup /g, '\u2571' ],
	    [ /\\ding\{110\}/g, '\u25A0' ],
	    [ /\\square /g, '\u25A1' ],
	    [ /\\blacksquare /g, '\u25AA' ],
	    [ /\\fbox\{~~\}/g, '\u25AD' ],
	    [ /\\Elzvrecto /g, '\u25AF' ],
	    [ /\\ElsevierGlyph\{E381\}/g, '\u25B1' ],
	    [ /\\ding\{115\}/g, '\u25B2' ],
	    [ /\\bigtriangleup /g, '\u25B3' ],
	    [ /\\blacktriangle /g, '\u25B4' ],
	    [ /\\vartriangle /g, '\u25B5' ],
	    [ /\\blacktriangleright /g, '\u25B8' ],
	    [ /\\triangleright /g, '\u25B9' ],
	    [ /\\ding\{116\}/g, '\u25BC' ],
	    [ /\\bigtriangledown /g, '\u25BD' ],
	    [ /\\blacktriangledown /g, '\u25BE' ],
	    [ /\\triangledown /g, '\u25BF' ],
	    [ /\\blacktriangleleft /g, '\u25C2' ],
	    [ /\\triangleleft /g, '\u25C3' ],
	    [ /\\ding\{117\}/g, '\u25C6' ],
	    [ /\\lozenge /g, '\u25CA' ],
	    [ /\\bigcirc /g, '\u25CB' ],
	    [ /\\ding\{108\}/g, '\u25CF' ],
	    [ /\\Elzcirfl /g, '\u25D0' ],
	    [ /\\Elzcirfr /g, '\u25D1' ],
	    [ /\\Elzcirfb /g, '\u25D2' ],
	    [ /\\ding\{119\}/g, '\u25D7' ],
	    [ /\\Elzrvbull /g, '\u25D8' ],
	    [ /\\Elzsqfl /g, '\u25E7' ],
	    [ /\\Elzsqfr /g, '\u25E8' ],
	    [ /\\Elzsqfse /g, '\u25EA' ],
	    [ /\\bigcirc /g, '\u25EF' ],
	    [ /\\ding\{72\}/g, '\u2605' ],
	    [ /\\ding\{73\}/g, '\u2606' ],
	    [ /\\ding\{37\}/g, '\u260E' ],
	    [ /\\ding\{42\}/g, '\u261B' ],
	    [ /\\ding\{43\}/g, '\u261E' ],
	    [ /\\rightmoon /g, '\u263E' ],
	    [ /\\mercury /g, '\u263F' ],
	    [ /\\venus /g, '\u2640' ],
	    [ /\\male /g, '\u2642' ],
	    [ /\\jupiter /g, '\u2643' ],
	    [ /\\saturn /g, '\u2644' ],
	    [ /\\uranus /g, '\u2645' ],
	    [ /\\neptune /g, '\u2646' ],
	    [ /\\pluto /g, '\u2647' ],
	    [ /\\aries /g, '\u2648' ],
	    [ /\\taurus /g, '\u2649' ],
	    [ /\\gemini /g, '\u264A' ],
	    [ /\\cancer /g, '\u264B' ],
	    [ /\\leo /g, '\u264C' ],
	    [ /\\virgo /g, '\u264D' ],
	    [ /\\libra /g, '\u264E' ],
	    [ /\\scorpio /g, '\u264F' ],
	    [ /\\sagittarius /g, '\u2650' ],
	    [ /\\capricornus /g, '\u2651' ],
	    [ /\\aquarius /g, '\u2652' ],
	    [ /\\pisces /g, '\u2653' ],
	    [ /\\ding\{171\}/g, '\u2660' ],
	    [ /\\diamond /g, '\u2662' ],
	    [ /\\ding\{168\}/g, '\u2663' ],
	    [ /\\ding\{170\}/g, '\u2665' ],
	    [ /\\ding\{169\}/g, '\u2666' ],
	    [ /\\quarternote /g, '\u2669' ],
	    [ /\\eighthnote /g, '\u266A' ],
	    [ /\\flat /g, '\u266D' ],
	    [ /\\natural /g, '\u266E' ],
	    [ /\\sharp /g, '\u266F' ],
	    [ /\\ding\{33\}/g, '\u2701' ],
	    [ /\\ding\{34\}/g, '\u2702' ],
	    [ /\\ding\{35\}/g, '\u2703' ],
	    [ /\\ding\{36\}/g, '\u2704' ],
	    [ /\\ding\{38\}/g, '\u2706' ],
	    [ /\\ding\{39\}/g, '\u2707' ],
	    [ /\\ding\{40\}/g, '\u2708' ],
	    [ /\\ding\{41\}/g, '\u2709' ],
	    [ /\\ding\{44\}/g, '\u270C' ],
	    [ /\\ding\{45\}/g, '\u270D' ],
	    [ /\\ding\{46\}/g, '\u270E' ],
	    [ /\\ding\{47\}/g, '\u270F' ],
	    [ /\\ding\{48\}/g, '\u2710' ],
	    [ /\\ding\{49\}/g, '\u2711' ],
	    [ /\\ding\{50\}/g, '\u2712' ],
	    [ /\\ding\{51\}/g, '\u2713' ],
	    [ /\\ding\{52\}/g, '\u2714' ],
	    [ /\\ding\{53\}/g, '\u2715' ],
	    [ /\\ding\{54\}/g, '\u2716' ],
	    [ /\\ding\{55\}/g, '\u2717' ],
	    [ /\\ding\{56\}/g, '\u2718' ],
	    [ /\\ding\{57\}/g, '\u2719' ],
	    [ /\\ding\{58\}/g, '\u271A' ],
	    [ /\\ding\{59\}/g, '\u271B' ],
	    [ /\\ding\{60\}/g, '\u271C' ],
	    [ /\\ding\{61\}/g, '\u271D' ],
	    [ /\\ding\{62\}/g, '\u271E' ],
	    [ /\\ding\{63\}/g, '\u271F' ],
	    [ /\\ding\{64\}/g, '\u2720' ],
	    [ /\\ding\{65\}/g, '\u2721' ],
	    [ /\\ding\{66\}/g, '\u2722' ],
	    [ /\\ding\{67\}/g, '\u2723' ],
	    [ /\\ding\{68\}/g, '\u2724' ],
	    [ /\\ding\{69\}/g, '\u2725' ],
	    [ /\\ding\{70\}/g, '\u2726' ],
	    [ /\\ding\{71\}/g, '\u2727' ],
	    [ /\\ding\{73\}/g, '\u2729' ],
	    [ /\\ding\{74\}/g, '\u272A' ],
	    [ /\\ding\{75\}/g, '\u272B' ],
	    [ /\\ding\{76\}/g, '\u272C' ],
	    [ /\\ding\{77\}/g, '\u272D' ],
	    [ /\\ding\{78\}/g, '\u272E' ],
	    [ /\\ding\{79\}/g, '\u272F' ],
	    [ /\\ding\{80\}/g, '\u2730' ],
	    [ /\\ding\{81\}/g, '\u2731' ],
	    [ /\\ding\{82\}/g, '\u2732' ],
	    [ /\\ding\{83\}/g, '\u2733' ],
	    [ /\\ding\{84\}/g, '\u2734' ],
	    [ /\\ding\{85\}/g, '\u2735' ],
	    [ /\\ding\{86\}/g, '\u2736' ],
	    [ /\\ding\{87\}/g, '\u2737' ],
	    [ /\\ding\{88\}/g, '\u2738' ],
	    [ /\\ding\{89\}/g, '\u2739' ],
	    [ /\\ding\{90\}/g, '\u273A' ],
	    [ /\\ding\{91\}/g, '\u273B' ],
	    [ /\\ding\{92\}/g, '\u273C' ],
	    [ /\\ding\{93\}/g, '\u273D' ],
	    [ /\\ding\{94\}/g, '\u273E' ],
	    [ /\\ding\{95\}/g, '\u273F' ],
	    [ /\\ding\{96\}/g, '\u2740' ],
	    [ /\\ding\{97\}/g, '\u2741' ],
	    [ /\\ding\{98\}/g, '\u2742' ],
	    [ /\\ding\{99\}/g, '\u2743' ],
	    [ /\\ding\{100\}/g, '\u2744' ],
	    [ /\\ding\{101\}/g, '\u2745' ],
	    [ /\\ding\{102\}/g, '\u2746' ],
	    [ /\\ding\{103\}/g, '\u2747' ],
	    [ /\\ding\{104\}/g, '\u2748' ],
	    [ /\\ding\{105\}/g, '\u2749' ],
	    [ /\\ding\{106\}/g, '\u274A' ],
	    [ /\\ding\{107\}/g, '\u274B' ],
	    [ /\\ding\{109\}/g, '\u274D' ],
	    [ /\\ding\{111\}/g, '\u274F' ],
	    [ /\\ding\{112\}/g, '\u2750' ],
	    [ /\\ding\{113\}/g, '\u2751' ],
	    [ /\\ding\{114\}/g, '\u2752' ],
	    [ /\\ding\{118\}/g, '\u2756' ],
	    [ /\\ding\{120\}/g, '\u2758' ],
	    [ /\\ding\{121\}/g, '\u2759' ],
	    [ /\\ding\{122\}/g, '\u275A' ],
	    [ /\\ding\{123\}/g, '\u275B' ],
	    [ /\\ding\{124\}/g, '\u275C' ],
	    [ /\\ding\{125\}/g, '\u275D' ],
	    [ /\\ding\{126\}/g, '\u275E' ],
	    [ /\\ding\{161\}/g, '\u2761' ],
	    [ /\\ding\{162\}/g, '\u2762' ],
	    [ /\\ding\{163\}/g, '\u2763' ],
	    [ /\\ding\{164\}/g, '\u2764' ],
	    [ /\\ding\{165\}/g, '\u2765' ],
	    [ /\\ding\{166\}/g, '\u2766' ],
	    [ /\\ding\{167\}/g, '\u2767' ],
	    [ /\\ding\{182\}/g, '\u2776' ],
	    [ /\\ding\{183\}/g, '\u2777' ],
	    [ /\\ding\{184\}/g, '\u2778' ],
	    [ /\\ding\{185\}/g, '\u2779' ],
	    [ /\\ding\{186\}/g, '\u277A' ],
	    [ /\\ding\{187\}/g, '\u277B' ],
	    [ /\\ding\{188\}/g, '\u277C' ],
	    [ /\\ding\{189\}/g, '\u277D' ],
	    [ /\\ding\{190\}/g, '\u277E' ],
	    [ /\\ding\{191\}/g, '\u277F' ],
	    [ /\\ding\{192\}/g, '\u2780' ],
	    [ /\\ding\{193\}/g, '\u2781' ],
	    [ /\\ding\{194\}/g, '\u2782' ],
	    [ /\\ding\{195\}/g, '\u2783' ],
	    [ /\\ding\{196\}/g, '\u2784' ],
	    [ /\\ding\{197\}/g, '\u2785' ],
	    [ /\\ding\{198\}/g, '\u2786' ],
	    [ /\\ding\{199\}/g, '\u2787' ],
	    [ /\\ding\{200\}/g, '\u2788' ],
	    [ /\\ding\{201\}/g, '\u2789' ],
	    [ /\\ding\{202\}/g, '\u278A' ],
	    [ /\\ding\{203\}/g, '\u278B' ],
	    [ /\\ding\{204\}/g, '\u278C' ],
	    [ /\\ding\{205\}/g, '\u278D' ],
	    [ /\\ding\{206\}/g, '\u278E' ],
	    [ /\\ding\{207\}/g, '\u278F' ],
	    [ /\\ding\{208\}/g, '\u2790' ],
	    [ /\\ding\{209\}/g, '\u2791' ],
	    [ /\\ding\{210\}/g, '\u2792' ],
	    [ /\\ding\{211\}/g, '\u2793' ],
	    [ /\\ding\{212\}/g, '\u2794' ],
	    [ /\\ding\{216\}/g, '\u2798' ],
	    [ /\\ding\{217\}/g, '\u2799' ],
	    [ /\\ding\{218\}/g, '\u279A' ],
	    [ /\\ding\{219\}/g, '\u279B' ],
	    [ /\\ding\{220\}/g, '\u279C' ],
	    [ /\\ding\{221\}/g, '\u279D' ],
	    [ /\\ding\{222\}/g, '\u279E' ],
	    [ /\\ding\{223\}/g, '\u279F' ],
	    [ /\\ding\{224\}/g, '\u27A0' ],
	    [ /\\ding\{225\}/g, '\u27A1' ],
	    [ /\\ding\{226\}/g, '\u27A2' ],
	    [ /\\ding\{227\}/g, '\u27A3' ],
	    [ /\\ding\{228\}/g, '\u27A4' ],
	    [ /\\ding\{229\}/g, '\u27A5' ],
	    [ /\\ding\{230\}/g, '\u27A6' ],
	    [ /\\ding\{231\}/g, '\u27A7' ],
	    [ /\\ding\{232\}/g, '\u27A8' ],
	    [ /\\ding\{233\}/g, '\u27A9' ],
	    [ /\\ding\{234\}/g, '\u27AA' ],
	    [ /\\ding\{235\}/g, '\u27AB' ],
	    [ /\\ding\{236\}/g, '\u27AC' ],
	    [ /\\ding\{237\}/g, '\u27AD' ],
	    [ /\\ding\{238\}/g, '\u27AE' ],
	    [ /\\ding\{239\}/g, '\u27AF' ],
	    [ /\\ding\{241\}/g, '\u27B1' ],
	    [ /\\ding\{242\}/g, '\u27B2' ],
	    [ /\\ding\{243\}/g, '\u27B3' ],
	    [ /\\ding\{244\}/g, '\u27B4' ],
	    [ /\\ding\{245\}/g, '\u27B5' ],
	    [ /\\ding\{246\}/g, '\u27B6' ],
	    [ /\\ding\{247\}/g, '\u27B7' ],
	    [ /\\ding\{248\}/g, '\u27B8' ],
	    [ /\\ding\{249\}/g, '\u27B9' ],
	    [ /\\ding\{250\}/g, '\u27BA' ],
	    [ /\\ding\{251\}/g, '\u27BB' ],
	    [ /\\ding\{252\}/g, '\u27BC' ],
	    [ /\\ding\{253\}/g, '\u27BD' ],
	    [ /\\ding\{254\}/g, '\u27BE' ],
	    [ /\\longleftarrow /g, '\u27F5' ],
	    [ /\\longrightarrow /g, '\u27F6' ],
	    [ /\\longleftrightarrow /g, '\u27F7' ],
	    [ /\\Longleftarrow /g, '\u27F8' ],
	    [ /\\Longrightarrow /g, '\u27F9' ],
	    [ /\\Longleftrightarrow /g, '\u27FA' ],
	    [ /\\longmapsto /g, '\u27FC' ],
	    [ /\\sim\\joinrel\\leadsto/g, '\u27FF' ],
	    [ /\\ElsevierGlyph\{E212\}/g, '\u2905' ],
	    [ /\\UpArrowBar /g, '\u2912' ],
	    [ /\\DownArrowBar /g, '\u2913' ],
	    [ /\\ElsevierGlyph\{E20C\}/g, '\u2923' ],
	    [ /\\ElsevierGlyph\{E20D\}/g, '\u2924' ],
	    [ /\\ElsevierGlyph\{E20B\}/g, '\u2925' ],
	    [ /\\ElsevierGlyph\{E20A\}/g, '\u2926' ],
	    [ /\\ElsevierGlyph\{E211\}/g, '\u2927' ],
	    [ /\\ElsevierGlyph\{E20E\}/g, '\u2928' ],
	    [ /\\ElsevierGlyph\{E20F\}/g, '\u2929' ],
	    [ /\\ElsevierGlyph\{E210\}/g, '\u292A' ],
	    [ /\\ElsevierGlyph\{E21C\}/g, '\u2933' ],
	    [ /\\ElsevierGlyph\{E21D\}/g, '\u2933-00338' ],
	    [ /\\ElsevierGlyph\{E21A\}/g, '\u2936' ],
	    [ /\\ElsevierGlyph\{E219\}/g, '\u2937' ],
	    [ /\\Elolarr /g, '\u2940' ],
	    [ /\\Elorarr /g, '\u2941' ],
	    [ /\\ElzRlarr /g, '\u2942' ],
	    [ /\\ElzrLarr /g, '\u2944' ],
	    [ /\\Elzrarrx /g, '\u2947' ],
	    [ /\\LeftRightVector /g, '\u294E' ],
	    [ /\\RightUpDownVector /g, '\u294F' ],
	    [ /\\DownLeftRightVector /g, '\u2950' ],
	    [ /\\LeftUpDownVector /g, '\u2951' ],
	    [ /\\LeftVectorBar /g, '\u2952' ],
	    [ /\\RightVectorBar /g, '\u2953' ],
	    [ /\\RightUpVectorBar /g, '\u2954' ],
	    [ /\\RightDownVectorBar /g, '\u2955' ],
	    [ /\\DownLeftVectorBar /g, '\u2956' ],
	    [ /\\DownRightVectorBar /g, '\u2957' ],
	    [ /\\LeftUpVectorBar /g, '\u2958' ],
	    [ /\\LeftDownVectorBar /g, '\u2959' ],
	    [ /\\LeftTeeVector /g, '\u295A' ],
	    [ /\\RightTeeVector /g, '\u295B' ],
	    [ /\\RightUpTeeVector /g, '\u295C' ],
	    [ /\\RightDownTeeVector /g, '\u295D' ],
	    [ /\\DownLeftTeeVector /g, '\u295E' ],
	    [ /\\DownRightTeeVector /g, '\u295F' ],
	    [ /\\LeftUpTeeVector /g, '\u2960' ],
	    [ /\\LeftDownTeeVector /g, '\u2961' ],
	    [ /\\UpEquilibrium /g, '\u296E' ],
	    [ /\\ReverseUpEquilibrium /g, '\u296F' ],
	    [ /\\RoundImplies /g, '\u2970' ],
	    [ /\\ElsevierGlyph\{E214\}/g, '\u297C' ],
	    [ /\\ElsevierGlyph\{E215\}/g, '\u297D' ],
	    [ /\\Elztfnc /g, '\u2980' ],
	    [ /\\ElsevierGlyph\{3018\}/g, '\u2985' ],
	    [ /\\Elroang /g, '\u2986' ],
	    [ /\\ElsevierGlyph\{E291\}/g, '\u2994' ],
	    [ /\\Elzddfnc /g, '\u2999' ],
	    [ /\\Angle /g, '\u299C' ],
	    [ /\\Elzlpargt /g, '\u29A0' ],
	    [ /\\ElsevierGlyph\{E260\}/g, '\u29B5' ],
	    [ /\\ElsevierGlyph\{E61B\}/g, '\u29B6' ],
	    [ /\\ElzLap /g, '\u29CA' ],
	    [ /\\Elzdefas /g, '\u29CB' ],
	    [ /\\LeftTriangleBar /g, '\u29CF' ],
	    [ /\\NotLeftTriangleBar /g, '\u29CF-00338' ],
	    [ /\\RightTriangleBar /g, '\u29D0' ],
	    [ /\\NotRightTriangleBar /g, '\u29D0-00338' ],
	    [ /\\ElsevierGlyph\{E372\}/g, '\u29DC' ],
	    [ /\\blacklozenge /g, '\u29EB' ],
	    [ /\\RuleDelayed /g, '\u29F4' ],
	    [ /\\Elxuplus /g, '\u2A04' ],
	    [ /\\ElzThr /g, '\u2A05' ],
	    [ /\\Elxsqcup /g, '\u2A06' ],
	    [ /\\ElzInf /g, '\u2A07' ],
	    [ /\\ElzSup /g, '\u2A08' ],
	    [ /\\ElzCint /g, '\u2A0D' ],
	    [ /\\clockoint /g, '\u2A0F' ],
	    [ /\\ElsevierGlyph\{E395\}/g, '\u2A10' ],
	    [ /\\sqrint /g, '\u2A16' ],
	    [ /\\ElsevierGlyph\{E25A\}/g, '\u2A25' ],
	    [ /\\ElsevierGlyph\{E25B\}/g, '\u2A2A' ],
	    [ /\\ElsevierGlyph\{E25C\}/g, '\u2A2D' ],
	    [ /\\ElsevierGlyph\{E25D\}/g, '\u2A2E' ],
	    [ /\\ElzTimes /g, '\u2A2F' ],
	    [ /\\ElsevierGlyph\{E25E\}/g, '\u2A34' ],
	    [ /\\ElsevierGlyph\{E25E\}/g, '\u2A35' ],
	    [ /\\ElsevierGlyph\{E259\}/g, '\u2A3C' ],
	    [ /\\amalg /g, '\u2A3F' ],
	    [ /\\ElzAnd /g, '\u2A53' ],
	    [ /\\ElzOr /g, '\u2A54' ],
	    [ /\\ElsevierGlyph\{E36E\}/g, '\u2A55' ],
	    [ /\\ElOr /g, '\u2A56' ],
	    [ /\\perspcorrespond /g, '\u2A5E' ],
	    [ /\\Elzminhat /g, '\u2A5F' ],
	    [ /\\ElsevierGlyph\{225A\}/g, '\u2A63' ],
	    [ /\\stackrel\{*\}\{=\}/g, '\u2A6E' ],
	    [ /\\Equal /g, '\u2A75' ],
	    [ /\\leqslant /g, '\u2A7D' ],
	    [ /\\nleqslant /g, '\u2A7D-00338' ],
	    [ /\\geqslant /g, '\u2A7E' ],
	    [ /\\ngeqslant /g, '\u2A7E-00338' ],
	    [ /\\lessapprox /g, '\u2A85' ],
	    [ /\\gtrapprox /g, '\u2A86' ],
	    [ /\\lneq /g, '\u2A87' ],
	    [ /\\gneq /g, '\u2A88' ],
	    [ /\\lnapprox /g, '\u2A89' ],
	    [ /\\gnapprox /g, '\u2A8A' ],
	    [ /\\lesseqqgtr /g, '\u2A8B' ],
	    [ /\\gtreqqless /g, '\u2A8C' ],
	    [ /\\eqslantless /g, '\u2A95' ],
	    [ /\\eqslantgtr /g, '\u2A96' ],
	    [ /\\Pisymbol\{ppi020\}\{117\}/g, '\u2A9D' ],
	    [ /\\Pisymbol\{ppi020\}\{105\}/g, '\u2A9E' ],
	    [ /\\NestedLessLess /g, '\u2AA1' ],
	    [ /\\NotNestedLessLess /g, '\u2AA1-00338' ],
	    [ /\\NestedGreaterGreater /g, '\u2AA2' ],
	    [ /\\NotNestedGreaterGreater /g, '\u2AA2-00338' ],
	    [ /\\preceq /g, '\u2AAF' ],
	    [ /\\not\\preceq /g, '\u2AAF-00338' ],
	    [ /\\succeq /g, '\u2AB0' ],
	    [ /\\not\\succeq /g, '\u2AB0-00338' ],
	    [ /\\precneqq /g, '\u2AB5' ],
	    [ /\\succneqq /g, '\u2AB6' ],
	    [ /\\precapprox /g, '\u2AB7' ],
	    [ /\\succapprox /g, '\u2AB8' ],
	    [ /\\precnapprox /g, '\u2AB9' ],
	    [ /\\succnapprox /g, '\u2ABA' ],
	    [ /\\subseteqq /g, '\u2AC5' ],
	    [ /\\nsubseteqq /g, '\u2AC5-00338' ],
	    [ /\\supseteqq /g, '\u2AC6' ],
	    [ /\\nsupseteqq/g, '\u2AC6-00338' ],
	    [ /\\subsetneqq /g, '\u2ACB' ],
	    [ /\\supsetneqq /g, '\u2ACC' ],
	    [ /\\ElsevierGlyph\{E30D\}/g, '\u2AEB' ],
	    [ /\\Elztdcol /g, '\u2AF6' ],
	    [ /\\ElsevierGlyph\{300A\}/g, '\u300A' ],
	    [ /\\ElsevierGlyph\{300B\}/g, '\u300B' ],
	    [ /\\ElsevierGlyph\{3018\}/g, '\u3018' ],
	    [ /\\ElsevierGlyph\{3019\}/g, '\u3019' ],
	    [ /\\openbracketleft /g, '\u301A' ],
	    [ /\\openbracketright /g, '\u301B' ]
	  ]
	
	  return this;
	} // end function BibtexParser
	
	if (typeof module !== 'undefined' && module.exports) {
	  module.exports = BibtexParser;
	}


/***/ },
/* 47 */
/*!******************************************************!*\
  !*** ./galaxy/scripts/mvc/citation/citation-view.js ***!
  \******************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone) {!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	    __webpack_require__(/*! mvc/base-mvc */ 5),
	    __webpack_require__(/*! mvc/citation/citation-model */ 45),
	    __webpack_require__(/*! utils/localization */ 7)
	], __WEBPACK_AMD_DEFINE_RESULT__ = function( baseMVC, citationModel, _l ){
	
	var CitationView = Backbone.View.extend({
	    tagName: 'div',
	    className: 'citations',
	    render: function() {
	        this.$el.append( "<p>" + this.formattedReference() + "</p>" );
	        return this;
	    },
	    formattedReference: function() {
	        var model = this.model;
	        var entryType = model.entryType();
	        var fields = model.fields();
	
	        var ref = "";
	        // Code inspired by...
	        // https://github.com/vkaravir/bib-publication-list/blob/master/src/bib-publication-list.js
	        var authorsAndYear = this._asSentence( (fields.author ? fields.author : "") + (fields.year ? (" (" + fields.year + ")") : "") ) + " ";
	        var title = fields.title || "";
	        var pages = fields.pages ? ("pp. " + fields.pages) : "";
	        var address = fields.address;
	        if( entryType == "article" ) {
	            var volume = (fields.volume ? fields.volume : "") +
	                         (fields.number ? ( " (" + fields.number + ")" ) : "") +
	                         (pages ? ", " + pages : "");
	            ref = authorsAndYear + this._asSentence(title) +
	                    (fields.journal ? ("In <em>" + fields.journal + ", ") : "") +
	                    this._asSentence(volume) + 
	                    this._asSentence(fields.address) +
	                    "<\/em>";
	        } else if( entryType == "inproceedings" || entryType == "proceedings" ) {
	            ref = authorsAndYear + 
	                    this._asSentence(title) + 
	                    (fields.booktitle ? ("In <em>" + fields.booktitle + ", ") : "") +
	                    (pages ? pages : "") +
	                    (address ? ", " + address : "") + 
	                    ".<\/em>";
	        } else if( entryType == "mastersthesis" || entryType == "phdthesis" ) {
	            ref = authorsAndYear + this._asSentence(title) +
	                    (fields.howpublished ? fields.howpublished + ". " : "") +
	                    (fields.note ? fields.note + "." : "");
	        } else if( entryType == "techreport" ) {
	            ref = authorsAndYear + this._asSentence(title) +
	                    this._asSentence(fields.institution) +
	                    this._asSentence(fields.number) +
	                    this._asSentence(fields.type);
	        } else if( entryType == "book" || entryType == "inbook" || entryType == "incollection" ) {
	            ref = authorsAndYear + " " + this._formatBookInfo(fields);
	        } else {
	            ref = authorsAndYear + " " + this._asSentence(title) +
	                    this._asSentence(fields.howpublished) +
	                    this._asSentence(fields.note);
	        }
	        var doiUrl = "";
	        if( fields.doi ) {
	            doiUrl = 'http://dx.doi.org/' + fields.doi;
	            ref += '[<a href="' + doiUrl + '" target="_blank">doi:' + fields.doi + "</a>]";
	        }
	        var url = fields.url || doiUrl;
	        if( url ) {
	            ref += '[<a href="' + url + '" target="_blank">Link</a>]';
	        }
	        return ref;
	    },
	    _formatBookInfo: function(fields) {
	        var info = "";
	        if( fields.chapter ) {
	            info += fields.chapter + " in ";
	        }
	        if( fields.title ) {
	            info += "<em>" + fields.title + "<\/em>";
	        }
	        if( fields.editor ) {
	            info += ", Edited by " + fields.editor + ", ";
	        }
	        if( fields.publisher) {
	            info += ", " + fields.publisher;
	        }
	        if( fields.pages ) {
	            info += ", pp. " + fields.pages + "";
	        }
	        if( fields.series ) {
	            info += ", <em>" + fields.series + "<\/em>";
	        }
	        if( fields.volume ) {
	            info += ", Vol." + fields.volume;
	        }
	        if( fields.issn ) {
	            info += ", ISBN: " + fields.issn;
	        }
	        return info + ".";
	    },
	    _asSentence: function(str) {
	        return (str && str.trim()) ? str + ". " : "";
	    }
	});
	
	var CitationListView = Backbone.View.extend({
	    el: '#citations',
	    /**
	     * Set up view.
	     */
	    initialize: function() {
	        this.listenTo( this.collection, 'add', this.renderCitation );
	    },
	
	    events: {
	        'click .citations-to-bibtex': 'showBibtex',
	        'click .citations-to-formatted': 'showFormatted'
	    },
	
	    renderCitation: function( citation ) {
	        var citationView = new CitationView( { model: citation } );
	        this.$(".citations-formatted").append( citationView.render().el );
	        var rawTextarea = this.$(".citations-bibtex-text");
	        rawTextarea.val( rawTextarea.val() + "\n\r" + citation.attributes.content );
	    },
	
	    render: function() {
	        this.$el.html(this.citationsElement());
	        this.collection.each(function( item ){
	            this.renderCitation( item );
	        }, this);
	        this.showFormatted();
	    },
	
	    showBibtex: function() {
	        this.$(".citations-to-formatted").show();
	        this.$(".citations-to-bibtex").hide();
	        this.$(".citations-bibtex").show();
	        this.$(".citations-formatted").hide();
	        this.$(".citations-bibtex-text").select();
	    },
	
	    showFormatted: function() {
	        this.$(".citations-to-formatted").hide();
	        this.$(".citations-to-bibtex").show();
	        this.$(".citations-bibtex").hide();
	        this.$(".citations-formatted").show();
	    },
	
	    partialWarningElement: function() {
	        if( this.collection.partial ) {
	            return [
	                '<div style="padding:5px 10px">',
	                '<b>Warning: This is a experimental feature.</b> Most Galaxy tools will not annotate',
	                ' citations explicitly at this time. When writing up your analysis, please manually',
	                ' review your histories and find all references',
	                ' that should be cited in order to completely describe your work. Also, please remember to',
	                ' <a href="https://wiki.galaxyproject.org/CitingGalaxy">cite Galaxy</a>.',
	                '</div>',
	            ].join('');
	        } else {
	            return '';
	        }
	    },
	
	    citationsElement: function() {
	        return [
	            '<div class="toolForm">',
	                '<div class="toolFormTitle">',
	                    _l("Citations"),
	                    ' <button type="button" class="btn btn-xs citations-to-bibtex" title="Show all in BibTeX format."><i class="fa fa-pencil-square-o"></i> Show BibTeX</button>',
	                    ' <button type="button" class="btn btn-xs citations-to-formatted" title="Return to formatted citation list."><i class="fa fa-times"></i> Hide BibTeX</button>',
	                '</div>',
	                '<div class="toolFormBody" style="padding:5px 10px">',
	                this.partialWarningElement(),
	                '<span class="citations-formatted" style="word-wrap: break-word;"></span>',
	                '</div>',
	                '<div class="citations-bibtex toolFormBody" style="padding:5px 10px">',
	                '<textarea style="width: 100%; height: 500px;" class="citations-bibtex-text"></textarea>',
	                '</div>',
	            '</div>'
	        ].join( '' );
	    }
	});
	
	//==============================================================================
	return {
	    CitationView : CitationView,
	    CitationListView  : CitationListView
	};
	
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2)))

/***/ },
/* 48 */
/*!**************************************************!*\
  !*** ./galaxy/scripts/mvc/upload/upload-view.js ***!
  \**************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone) {/** Upload app contains the upload progress button and upload modal, compiles model data for API request **/
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(/*! utils/utils */ 21),
	        __webpack_require__(/*! mvc/ui/ui-modal */ 17),
	        __webpack_require__(/*! mvc/ui/ui-tabs */ 38),
	        __webpack_require__(/*! mvc/upload/upload-button */ 49),
	        __webpack_require__(/*! mvc/upload/default/default-view */ 50),
	        __webpack_require__(/*! mvc/upload/composite/composite-view */ 58)], __WEBPACK_AMD_DEFINE_RESULT__ = function(   Utils,
	                    Modal,
	                    Tabs,
	                    UploadButton,
	                    UploadViewDefault,
	                    UploadViewComposite ) {
	return Backbone.View.extend({
	    // default options
	    options : {
	        nginx_upload_path   : '',
	        ftp_upload_site     : 'n/a',
	        default_genome      : '?',
	        default_extension   : 'auto',
	        height              : 500,
	        width               : 900,
	        auto                : {
	            id          : 'auto',
	            text        : 'Auto-detect',
	            description : 'This system will try to detect the file type automatically. If your file is not detected properly as one of the known formats, it most likely means that it has some format problems (e.g., different number of columns on different rows). You can still coerce the system to set your data to the format you think it should be.  You can also upload compressed files, which will automatically be decompressed.'
	        }
	    },
	
	    // upload modal container
	    modal: null,
	
	    // progress button in panel
	    ui_button: null,
	
	    // current history identifier
	    current_history: null,
	
	    // contains all available dataset extensions/types
	    list_extensions: [],
	
	    // contains all available genomes
	    list_genomes: [],
	
	    // initialize
	    initialize: function( options ) {
	        // link this
	        var self = this;
	
	        // merge parsed options
	        this.options = Utils.merge( options, this.options );
	
	        // create model for upload/progress button
	        this.ui_button = new UploadButton.Model();
	
	        // create view for upload/progress button
	        this.ui_button_view = new UploadButton.View({
	            model       : this.ui_button,
	            onclick     : function(e) {
	                e.preventDefault();
	                self.show()
	            },
	            onunload    : function() {
	                var percentage = self.ui_button.get('percentage', 0);
	                if (percentage > 0 && percentage < 100) {
	                    return 'Several uploads are queued.';
	                }
	            }
	        });
	
	        // set element to button view
	        this.setElement( this.ui_button_view.$el );
	
	        // load extensions
	        var self = this;
	        Utils.get({
	            url     : Galaxy.root + 'api/datatypes?extension_only=False',
	            success : function( datatypes ) {
	                for ( key in datatypes ) {
	                    self.list_extensions.push({
	                        id              : datatypes[ key ].extension,
	                        text            : datatypes[ key ].extension,
	                        description     : datatypes[ key ].description,
	                        description_url : datatypes[ key ].description_url,
	                        composite_files : datatypes[ key ].composite_files
	                    });
	                }
	                self.list_extensions.sort( function( a, b ) {
	                    var a_text = a.text && a.text.toLowerCase();
	                    var b_text = b.text && b.text.toLowerCase();
	                    return a_text > b_text ? 1 : a_text < b_text ? -1 : 0;
	                });
	                if ( !self.options.datatypes_disable_auto ) {
	                    self.list_extensions.unshift( self.options.auto );
	                }
	            }
	        });
	
	        // load genomes
	        Utils.get({
	            url     : Galaxy.root + 'api/genomes',
	            success : function( genomes ) {
	                for ( key in genomes ) {
	                    self.list_genomes.push({
	                        id      : genomes[ key ][ 1 ],
	                        text    : genomes[ key ][ 0 ]
	                    });
	                }
	                self.list_genomes.sort( function( a, b ) {
	                    if ( a.id == self.options.default_genome ) { return -1; }
	                    if ( b.id == self.options.default_genome ) { return 1; }
	                    return a.text > b.text ? 1 : a.text < b.text ? -1 : 0;
	                });
	            }
	        });
	    },
	
	    //
	    // event triggered by upload button
	    //
	
	    // show/hide upload frame
	    show: function () {
	        // wait for galaxy history panel
	        var self = this;
	        if ( !Galaxy.currHistoryPanel || !Galaxy.currHistoryPanel.model ) {
	            window.setTimeout(function() { self.show() }, 500)
	            return;
	        }
	
	        // set current user
	        this.current_user = Galaxy.user.id;
	
	        // create modal
	        if ( !this.modal ) {
	            // build tabs
	            this.tabs = new Tabs.View();
	
	            // add tabs
	            this.default_view = new UploadViewDefault( this );
	            this.tabs.add({
	                id      : 'regular',
	                title   : 'Regular',
	                $el     : this.default_view.$el
	            });
	            this.composite_view = new UploadViewComposite( this );
	            this.tabs.add({
	                id      : 'composite',
	                title   : 'Composite',
	                $el     : this.composite_view.$el
	            });
	
	            // make modal
	            this.modal = new Modal.View({
	                title           : 'Download from web or upload from disk',
	                body            : this.tabs.$el,
	                height          : this.options.height,
	                width           : this.options.width,
	                closing_events  : true,
	                title_separator : false
	            });
	        }
	
	        // show modal
	        this.modal.show();
	    },
	
	    // refresh user and current history
	    currentHistory: function() {
	        return this.current_user && Galaxy.currHistoryPanel.model.get( 'id' );
	    },
	
	    // get ftp configuration
	    currentFtp: function() {
	        return this.current_user && this.options.ftp_upload_site;
	    },
	
	    /**
	      * Package API data from array of models
	      * @param{Array} items - Upload items/rows filtered from a collection
	    */
	    toData: function( items, history_id ) {
	        // create dictionary for data submission
	        var data = {
	            payload: {
	                'tool_id'       : 'upload1',
	                'history_id'    : history_id || this.currentHistory(),
	                'inputs'        : {}
	            },
	            files: [],
	            error_message: null
	        }
	        // add upload tools input data
	        if ( items && items.length > 0 ) {
	            var inputs = {};
	            inputs[ 'dbkey' ] = items[0].get( 'genome', null );
	            inputs[ 'file_type' ] = items[0].get( 'extension', null );
	            for ( var index in items ) {
	                var it = items[ index ];
	                it.set( 'status', 'running' );
	                if ( it.get( 'file_size' ) > 0 ) {
	                    var prefix = 'files_' + index + '|';
	                    inputs[ prefix + 'type' ] = 'upload_dataset';
	                    inputs[ prefix + 'space_to_tab' ] = it.get( 'space_to_tab' ) && 'Yes' || null;
	                    inputs[ prefix + 'to_posix_lines' ] = it.get( 'to_posix_lines' ) && 'Yes' || null;
	                    switch ( it.get( 'file_mode' ) ) {
	                        case 'new':
	                            inputs[ prefix + 'url_paste' ] = it.get( 'url_paste' );
	                            break;
	                        case 'ftp':
	                            inputs[ prefix + 'ftp_files' ] = it.get( 'file_path' );
	                            break;
	                        case 'local':
	                            data.files.push( { name: prefix + 'file_data', file: it.get( 'file_data' ) } );
	                    }
	                } else {
	                    data.error_message = 'Upload content incomplete.';
	                    it.set( 'status', 'error' );
	                    it.set( 'info', data.error_message );
	                    break;
	                }
	            }
	            data.payload.inputs = JSON.stringify( inputs );
	        }
	        return data;
	    }
	});
	
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2)))

/***/ },
/* 49 */
/*!****************************************************!*\
  !*** ./galaxy/scripts/mvc/upload/upload-button.js ***!
  \****************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone, $) {// dependencies
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_RESULT__ = function() {
	
	// model for upload/progress bar button
	var Model = Backbone.Model.extend({
	    defaults: {
	        icon        : 'fa-upload',
	        tooltip     : 'Download from URL or upload files from disk',
	        label       : 'Load Data',
	        percentage  : 0,
	        status      : ''
	    }
	});
	
	// view for upload/progress bar button
	var View = Backbone.View.extend({
	    // model
	    model : null,
	
	    // initialize
	    initialize : function( options ) {
	        // link this
	        var self = this;
	
	        // create model
	        var model = options.model;
	
	        // create new element
	        this.setElement( this._template() );
	
	        // add event
	        this.$el.on( 'click', function( e ) { options.onclick( e ); });
	
	        // add tooltip
	        this.$el.tooltip( { title: model.get('tooltip'), placement: 'bottom' } );
	
	        // events
	        model.on( 'change:percentage', function() {
	            self._percentage( model.get( 'percentage' ) );
	        });
	        model.on( 'change:status', function() {
	            self._status( model.get( 'status' ) );
	        });
	
	        // unload event
	        var self = this;
	        $( window ).on( 'beforeunload', function() {
	            var text = "";
	            if ( options.onunload ) {
	                text = options.onunload();
	            }
	            if ( text != "" ) {
	                return text;
	            }
	        });
	    },
	
	    // set status
	    _status: function( value ) {
	        var $el = this.$el.find( '.progress-bar' );
	        $el.removeClass();
	        $el.addClass( 'progress-bar' );
	        $el.addClass( 'progress-bar-notransition' );
	        if ( value != '' ) {
	            $el.addClass( 'progress-bar-' + value );
	        }
	    },
	
	    // set percentage
	    _percentage: function( value ) {
	        var $el = this.$el.find( '.progress-bar' );
	        $el.css( { width : value + '%' } );
	    },
	
	    // template
	    _template: function() {
	        return  '<div class="upload-button">' +
	                    '<div class="progress">' +
	                        '<div class="progress-bar"/>' +
	                        '<a class="panel-header-button" href="javascript:void(0)" id="tool-panel-upload-button">' +
	                            '<span class="fa fa-upload"/>' +
	                        '</a>' +
	                    '</div>' +
	                '</div>';
	    }
	});
	
	return {
	    Model   : Model,
	    View    : View
	};
	
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 50 */
/*!***********************************************************!*\
  !*** ./galaxy/scripts/mvc/upload/default/default-view.js ***!
  \***********************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone, _, $) {/** Renders contents of the default uploader */
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(/*! utils/utils */ 21),
	        __webpack_require__(/*! mvc/upload/upload-model */ 51),
	        __webpack_require__(/*! mvc/upload/default/default-row */ 52),
	        __webpack_require__(/*! mvc/upload/upload-ftp */ 56),
	        __webpack_require__(/*! mvc/ui/ui-popover */ 54),
	        __webpack_require__(/*! mvc/ui/ui-select */ 55),
	        __webpack_require__(/*! mvc/ui/ui-misc */ 22),
	        __webpack_require__(/*! utils/uploadbox */ 57)], __WEBPACK_AMD_DEFINE_RESULT__ = function(   Utils,
	                    UploadModel,
	                    UploadRow,
	                    UploadFtp,
	                    Popover,
	                    Select,
	                    Ui
	                ) {
	
	return Backbone.View.extend({
	    // extension selector
	    select_extension : null,
	
	    // genome selector
	    select_genome: null,
	
	    // jquery uploadbox plugin
	    uploadbox: null,
	
	    // current upload size in bytes
	    upload_size: 0,
	
	    // contains upload row models
	    collection : new UploadModel.Collection(),
	
	    // ftp file viewer
	    ftp : null,
	
	    // keeps track of the current uploader state
	    counter : {
	        announce    : 0,
	        success     : 0,
	        error       : 0,
	        running     : 0,
	        reset : function() {
	            this.announce = this.success = this.error = this.running = 0;
	        }
	    },
	
	    // initialize
	    initialize : function(app) {
	        // link app
	        this.app                = app;
	        this.options            = app.options;
	        this.list_extensions    = app.list_extensions;
	        this.list_genomes       = app.list_genomes;
	        this.ui_button          = app.ui_button;
	        this.ftp_upload_site    = app.currentFtp();
	
	        // link this
	        var self = this;
	
	        // set element
	        this.setElement(this._template());
	
	        // create button section
	        this.btnLocal    = new Ui.Button({ id: 'btn-local', title: 'Choose local file',   onclick: function() { self.uploadbox.select(); }, icon: 'fa fa-laptop' });
	        this.btnFtp      = new Ui.Button({ id: 'btn-ftp',   title: 'Choose FTP file',     onclick: function() { self._eventFtp(); }, icon: 'fa fa-folder-open-o' });
	        this.btnCreate   = new Ui.Button({ id: 'btn-new',   title: 'Paste/Fetch data',    onclick: function() { self._eventCreate(); }, icon: 'fa fa-edit' });
	        this.btnStart    = new Ui.Button({ id: 'btn-start', title: 'Start',               onclick: function() { self._eventStart(); } });
	        this.btnStop     = new Ui.Button({ id: 'btn-stop',  title: 'Pause',               onclick: function() { self._eventStop(); } });
	        this.btnReset    = new Ui.Button({ id: 'btn-reset', title: 'Reset',               onclick: function() { self._eventReset(); } });
	        this.btnClose    = new Ui.Button({ id: 'btn-close', title: 'Close',               onclick: function() { self.app.modal.hide(); } });
	
	        // append buttons to dom
	        var buttons = [ this.btnLocal, this.btnFtp, this.btnCreate, this.btnStop, this.btnReset, this.btnStart, this.btnClose ];
	        for (var i in buttons) {
	            this.$('#upload-buttons').prepend(buttons[i].$el);
	        }
	
	        // file upload
	        var self = this;
	        this.uploadbox = this.$('#upload-box').uploadbox({
	            url             : this.app.options.nginx_upload_path,
	            announce        : function(index, file) { self._eventAnnounce(index, file) },
	            initialize      : function(index) { return self.app.toData([ self.collection.get(index) ], self.history_id) },
	            progress        : function(index, percentage) { self._eventProgress(index, percentage) },
	            success         : function(index, message) { self._eventSuccess(index, message) },
	            error           : function(index, message) { self._eventError(index, message) },
	            complete        : function() { self._eventComplete() },
	            ondragover      : function() { self.$('.upload-box').addClass('highlight'); },
	            ondragleave     : function() { self.$('.upload-box').removeClass('highlight'); }
	        });
	
	        // add ftp file viewer
	        this.ftp = new Popover.View({
	            title       : 'FTP files',
	            container   : this.btnFtp.$el
	        });
	
	        // select extension
	        this.select_extension = new Select.View({
	            css         : 'footer-selection',
	            container   : this.$('#footer-extension'),
	            data        : _.filter(this.list_extensions, function(ext) { return !ext.composite_files }),
	            value       : this.options.default_extension,
	            onchange    : function(extension) {
	                self.updateExtension(extension);
	            }
	        });
	
	        // handle extension info popover
	        self.$('#footer-extension-info').on('click', function(e) {
	            self.showExtensionInfo({
	                $el         : $(e.target),
	                title       : self.select_extension.text(),
	                extension   : self.select_extension.value(),
	                placement   : 'top'
	            });
	        }).on('mousedown', function(e) { e.preventDefault(); });
	
	        // genome extension
	        this.select_genome = new Select.View({
	            css         : 'footer-selection',
	            container   : this.$('#footer-genome'),
	            data        : this.list_genomes,
	            value       : this.options.default_genome,
	            onchange    : function(genome) {
	                self.updateGenome(genome);
	            }
	        });
	
	        // events
	        this.collection.on('remove', function(model) {
	            self._eventRemove(model);
	        });
	
	        // setup info
	        this._updateScreen();
	    },
	
	    //
	    // events triggered by the upload box plugin
	    //
	
	    // a new file has been dropped/selected through the uploadbox plugin
	    _eventAnnounce: function(index, file) {
	        // update counter
	        this.counter.announce++;
	
	        // create if model has not been created yet
	        var new_model = new UploadModel.Model({
	            id          : index,
	            file_name   : file.name,
	            file_size   : file.size,
	            file_mode   : file.mode || 'local',
	            file_path   : file.path,
	            file_data   : file
	        });
	
	        // add model to collection
	        this.collection.add(new_model);
	
	        // create view/model
	        var upload_row = new UploadRow(this, { model: new_model });
	
	        // add upload row element to table
	        this.$('#upload-table > tbody:first').append(upload_row.$el);
	
	        // show on screen info
	        this._updateScreen();
	
	        // render
	        upload_row.render();
	    },
	
	    // progress
	    _eventProgress: function(index, percentage) {
	        // set progress for row
	        var it = this.collection.get(index);
	        it.set('percentage', percentage);
	
	        // update ui button
	        this.ui_button.set('percentage', this._uploadPercentage(percentage, it.get('file_size')));
	    },
	
	    // success
	    _eventSuccess: function(index, message) {
	        // update status
	        var it = this.collection.get(index);
	        it.set('percentage', 100);
	        it.set('status', 'success');
	
	        // update ui button
	        this.ui_button.set('percentage', this._uploadPercentage(100, it.get('file_size')));
	
	        // update completed
	        this.upload_completed += it.get('file_size') * 100;
	
	        // update counter
	        this.counter.announce--;
	        this.counter.success++;
	
	        // update on screen info
	        this._updateScreen();
	
	        // update galaxy history
	        Galaxy.currHistoryPanel.refreshContents();
	    },
	
	    // error
	    _eventError: function(index, message) {
	        // get element
	        var it = this.collection.get(index);
	
	        // update status
	        it.set('percentage', 100);
	        it.set('status', 'error');
	        it.set('info', message);
	
	        // update ui button
	        this.ui_button.set('percentage', this._uploadPercentage(100, it.get('file_size')));
	        this.ui_button.set('status', 'danger');
	
	        // update completed
	        this.upload_completed += it.get('file_size') * 100;
	
	        // update counter
	        this.counter.announce--;
	        this.counter.error++;
	
	        // update on screen info
	        this._updateScreen();
	    },
	
	    // queue is done
	    _eventComplete: function() {
	        // reset queued upload to initial status
	        this.collection.each(function(model) {
	            if(model.get('status') == 'queued') {
	                model.set('status', 'init');
	            }
	        });
	
	        // update running
	        this.counter.running = 0;
	
	        // update on screen info
	        this._updateScreen();
	    },
	
	    //
	    // events triggered by collection
	    //
	
	    // remove model from upload list
	    _eventRemove: function(model) {
	        // update status
	        var status = model.get('status');
	
	        // reduce counter
	        if (status == 'success') {
	            this.counter.success--;
	        } else if (status == 'error') {
	            this.counter.error--;
	        } else {
	            this.counter.announce--;
	        }
	
	        // remove from queue
	        this.uploadbox.remove(model.id);
	
	        // show on screen info
	        this._updateScreen();
	    },
	
	    //
	    // events triggered by this view
	    //
	
	    // [public] display extension info popup
	    showExtensionInfo: function(options) {
	        // initialize
	        var self = this;
	        var $el = options.$el;
	        var extension = options.extension;
	        var title = options.title;
	        var description = _.findWhere(self.list_extensions, {'id': extension});
	
	        // create popup
	        this.extension_popup && this.extension_popup.remove();
	        this.extension_popup = new Popover.View({
	            placement: options.placement || 'bottom',
	            container: $el
	        });
	
	        // add content and show popup
	        this.extension_popup.title(title);
	        this.extension_popup.empty();
	        this.extension_popup.append(this._templateDescription(description));
	        this.extension_popup.show();
	    },
	
	    // show/hide ftp popup
	    _eventFtp: function() {
	        if (!this.ftp.visible) {
	            this.ftp.empty();
	            var self = this;
	            this.ftp.append((new UploadFtp({
	                collection      : this.collection,
	                ftp_upload_site : this.ftp_upload_site,
	                onadd: function(ftp_file) {
	                    self.uploadbox.add([{
	                        mode: 'ftp',
	                        name: ftp_file.path,
	                        size: ftp_file.size,
	                        path: ftp_file.path
	                    }]);
	                },
	                onremove: function(model_index) {
	                    self.collection.remove(model_index);
	                }
	            })).$el);
	            this.ftp.show();
	        } else {
	            this.ftp.hide();
	        }
	    },
	
	    // create a new file
	    _eventCreate: function (){
	        this.uploadbox.add([{
	            name    : 'New File',
	            size    : 0,
	            mode    : 'new'
	        }]);
	    },
	
	    // start upload process
	    _eventStart: function() {
	        // check
	        if (this.counter.announce == 0 || this.counter.running > 0) {
	            return;
	        }
	
	        // reset current size
	        var self = this;
	        this.upload_size = 0;
	        this.upload_completed = 0;
	        // switch icons for new uploads
	        this.collection.each(function(model) {
	            if(model.get('status') == 'init') {
	                model.set('status', 'queued');
	                self.upload_size += model.get('file_size');
	            }
	        });
	
	        // reset progress
	        this.ui_button.set('percentage', 0);
	        this.ui_button.set('status', 'success');
	
	        // update running
	        this.counter.running = this.counter.announce;
	
	        // set current history id
	        this.history_id = this.app.currentHistory();
	
	        // initiate upload procedure in plugin
	        this.uploadbox.start();
	
	        // update on screen info
	        this._updateScreen();
	    },
	
	    // pause upload process
	    _eventStop: function() {
	        // check
	        if (this.counter.running > 0) {
	            // show upload has paused
	            this.ui_button.set('status', 'info');
	
	            // set html content
	            $('#upload-info').html('Queue will pause after completing the current file...');
	
	            // request pause
	            this.uploadbox.stop();
	        }
	    },
	
	    // remove all
	    _eventReset: function() {
	        // make sure queue is not running
	        if (this.counter.running == 0){
	            // reset collection
	            this.collection.reset();
	
	            // reset counter
	            this.counter.reset();
	
	            // remove from queue
	            this.uploadbox.reset();
	
	            // reset value for universal type drop-down
	            this.select_extension.value(this.options.default_extension);
	            this.select_genome.value(this.options.default_genome);
	
	            // reset button
	            this.ui_button.set('percentage', 0);
	
	            // show on screen info
	            this._updateScreen();
	        }
	    },
	
	    // update extension for all models
	    updateExtension: function(extension, defaults_only) {
	        var self = this;
	        this.collection.each(function(model) {
	            if (model.get('status') == 'init' && (model.get('extension') == self.options.default_extension || !defaults_only)) {
	                model.set('extension', extension);
	            }
	        });
	    },
	
	    // update genome for all models
	    updateGenome: function(genome, defaults_only) {
	        var self = this;
	        this.collection.each(function(model) {
	            if (model.get('status') == 'init' && (model.get('genome') == self.options.default_genome || !defaults_only)) {
	                model.set('genome', genome);
	            }
	        });
	    },
	
	    // set screen
	    _updateScreen: function () {
	        /*
	            update on screen info
	        */
	
	        // check default message
	        if(this.counter.announce == 0) {
	            if (this.uploadbox.compatible()) {
	                message = '&nbsp;';
	            } else {
	                message = 'Browser does not support Drag & Drop. Try Firefox 4+, Chrome 7+, IE 10+, Opera 12+ or Safari 6+.';
	            }
	        } else {
	            if (this.counter.running == 0) {
	                message = 'You added ' + this.counter.announce + ' file(s) to the queue. Add more files or click \'Start\' to proceed.';
	            } else {
	                message = 'Please wait...' + this.counter.announce + ' out of ' + this.counter.running + ' remaining.';
	            }
	        }
	
	        // set html content
	        this.$('#upload-info').html(message);
	
	        /*
	            update button status
	        */
	
	        // update reset button
	        if (this.counter.running == 0 && this.counter.announce + this.counter.success + this.counter.error > 0) {
	            this.btnReset.enable();
	        } else {
	            this.btnReset.disable();
	        }
	
	        // update upload button
	        if (this.counter.running == 0 && this.counter.announce > 0) {
	            this.btnStart.enable();
	            this.btnStart.$el.addClass('btn-primary');
	        } else {
	            this.btnStart.disable();
	            this.btnStart.$el.removeClass('btn-primary');
	        }
	
	        // pause upload button
	        if (this.counter.running > 0) {
	            this.btnStop.enable();
	        } else {
	            this.btnStop.disable();
	        }
	
	        // select upload button
	        if (this.counter.running == 0) {
	            this.btnLocal.enable();
	            this.btnFtp.enable();
	            this.btnCreate.enable();
	        } else {
	            this.btnLocal.disable();
	            this.btnFtp.disable();
	            this.btnCreate.disable();
	        }
	
	        // ftp button
	        if (this.ftp_upload_site) {
	            this.btnFtp.$el.show();
	        } else {
	            this.btnFtp.$el.hide();
	        }
	
	        // table visibility
	        if (this.counter.announce + this.counter.success + this.counter.error > 0) {
	            this.$('#upload-table').show();
	            this.$('.upload-helper').hide();
	        } else {
	            this.$('#upload-table').hide();
	            this.$('.upload-helper').show();
	        }
	    },
	
	    // calculate percentage of all queued uploads
	    _uploadPercentage: function(percentage, size) {
	        return (this.upload_completed + (percentage * size)) / this.upload_size;
	    },
	
	    // template for extensions description
	    _templateDescription: function(options) {
	        if (options.description) {
	            var tmpl = options.description;
	            if (options.description_url) {
	                tmpl += '&nbsp;(<a href="' + options.description_url + '" target="_blank">read more</a>)';
	            }
	            return tmpl;
	        } else {
	            return 'There is no description available for this file extension.';
	        }
	    },
	
	    // load html template
	    _template: function() {
	        return  '<div class="upload-view-default">' +
	                    '<div class="upload-top">' +
	                        '<h6 id="upload-info" class="upload-info"/>' +
	                    '</div>' +
	                    '<div id="upload-box" class="upload-box">' +
	                        '<div class="upload-helper"><i class="fa fa-files-o"/>Drop files here</div>' +
	                        '<table id="upload-table" class="ui-table-striped" style="display: none;">' +
	                            '<thead>' +
	                                '<tr>' +
	                                    '<th>Name</th>' +
	                                    '<th>Size</th>' +
	                                    '<th>Type</th>' +
	                                    '<th>Genome</th>' +
	                                    '<th>Settings</th>' +
	                                    '<th>Status</th>' +
	                                    '<th/>' +
	                                '</tr>' +
	                            '</thead>' +
	                            '<tbody/>' +
	                        '</table>' +
	                    '</div>' +
	                    '<div id="upload-footer" class="upload-footer">' +
	                        '<span class="footer-title">Type (set all):</span>' +
	                        '<span id="footer-extension"/>' +
	                        '<span id="footer-extension-info" class="upload-icon-button fa fa-search"/> ' +
	                        '<span class="footer-title">Genome (set all):</span>' +
	                        '<span id="footer-genome"/>' +
	                    '</div>' +
	                    '<div id="upload-buttons" class="upload-buttons"/>' +
	                '</div>';
	    }
	});
	
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! underscore */ 1), __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 51 */
/*!***************************************************!*\
  !*** ./galaxy/scripts/mvc/upload/upload-model.js ***!
  \***************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone) {// dependencies
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_RESULT__ = function() {
	
	// model
	var Model = Backbone.Model.extend({
	    defaults: {
	        extension       : 'auto',
	        genome          : '?',
	        url_paste       : '',
	        status          : 'init',
	        info            : null,
	        file_name       : '',
	        file_mode       : '',
	        file_size       : 0,
	        file_type       : null,
	        file_path       : '',
	        file_data       : null,
	        percentage      : 0,
	        space_to_tab    : false,
	        to_posix_lines  : true,
	        enabled         : true
	    },
	    reset: function(attr) {
	        this.clear().set(this.defaults).set(attr);
	    }
	});
	
	// collection
	var Collection = Backbone.Collection.extend({
	    model: Model
	});
	
	// return
	return {
	    Model: Model,
	    Collection : Collection
	};
	
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2)))

/***/ },
/* 52 */
/*!**********************************************************!*\
  !*** ./galaxy/scripts/mvc/upload/default/default-row.js ***!
  \**********************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone, $) {// dependencies
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(/*! utils/utils */ 21),
	        __webpack_require__(/*! mvc/upload/upload-model */ 51),
	        __webpack_require__(/*! mvc/upload/upload-settings */ 53),
	        __webpack_require__(/*! mvc/ui/ui-popover */ 54),
	        __webpack_require__(/*! mvc/ui/ui-select */ 55)], __WEBPACK_AMD_DEFINE_RESULT__ = function(   Utils,
	                    UploadModel,
	                    UploadSettings,
	                    Popover,
	                    Select
	                ) {
	
	// row view
	return Backbone.View.extend({
	    // states
	    status_classes : {
	        init    : 'upload-icon-button fa fa-trash-o',
	        queued  : 'upload-icon fa fa-spinner fa-spin',
	        running : 'upload-icon fa fa-spinner fa-spin',
	        success : 'upload-icon-button fa fa-check',
	        error   : 'upload-icon-button fa fa-exclamation-triangle'
	    },
	
	    // handle for settings popover
	    settings: null,
	
	    // genome selector
	    select_genome : null,
	
	    // extension selector
	    select_extension : null,
	
	    // render
	    initialize: function(app, options) {
	        // link app
	        this.app = app;
	
	        // link this
	        var self = this;
	
	        // create model
	        this.model = options.model;
	
	        // add upload row
	        this.setElement(this._template(options.model));
	
	        // append popup to settings icon
	        this.settings = new Popover.View({
	            title       : 'Upload configuration',
	            container   : this.$('#settings'),
	            placement   : 'bottom'
	        });
	
	        // initialize default genome through default select field
	        var default_genome = this.app.select_genome.value();
	        
	        // select genomes
	        this.select_genome = new Select.View({
	            css: 'upload-genome',
	            onchange : function(genome) {
	                self.model.set('genome', genome);
	                self.app.updateGenome(genome, true);
	            },
	            data: self.app.list_genomes,
	            container: this.$('#genome'),
	            value: default_genome
	        });
	
	        // initialize genome
	        this.model.set('genome', default_genome);
	
	        // initialize default extension through default select field
	        var default_extension = this.app.select_extension.value();
	        
	        // select extension
	        this.select_extension = new Select.View({
	            css: 'upload-extension',
	            onchange : function(extension) {
	                self.model.set('extension', extension);
	                self.app.updateExtension(extension, true);
	            },
	            data: self.app.list_extensions,
	            container: this.$('#extension'),
	            value: default_extension
	        });
	
	        // initialize extension
	        this.model.set('extension', default_extension);
	        
	        //
	        // ui events
	        //
	
	        // handle click event
	        this.$('#symbol').on('click', function() { self._removeRow(); });
	
	        // handle extension info popover
	        this.$('#extension-info').on('click' , function(e) {
	            self.app.showExtensionInfo({
	                $el         : $(e.target),
	                title       : self.select_extension.text(),
	                extension   : self.select_extension.value()
	            });
	        }).on('mousedown', function(e) { e.preventDefault(); });
	
	        // handle settings popover
	        this.$('#settings').on('click' , function(e) { self._showSettings(); })
	                            .on('mousedown', function(e) { e.preventDefault(); });
	
	        // handle text editing event
	        this.$('#text-content').on('change input', function(e) {
	            self.model.set('url_paste', $(e.target).val());
	            self.model.set('file_size', $(e.target).val().length);
	        });
	
	        //
	        // model events
	        //
	        this.model.on('change:percentage', function() {
	            self._refreshPercentage();
	        });
	        this.model.on('change:status', function() {
	            self._refreshStatus();
	        });
	        this.model.on('change:info', function() {
	            self._refreshInfo();
	        });
	        this.model.on('change:genome', function() {
	            self._refreshGenome();
	        });
	        this.model.on('change:extension', function() {
	            self._refreshExtension();
	        });
	        this.model.on('change:file_size', function() {
	            self._refreshFileSize();
	        });
	        this.model.on('remove', function() {
	            self.remove();
	        });
	        this.app.collection.on('reset', function() {
	            self.remove();
	        });
	    },
	
	    // render
	    render: function() {
	        // read model
	        var file_name   = this.model.get('file_name');
	        var file_size   = this.model.get('file_size');
	        var file_mode   = this.model.get('file_mode');
	
	        // update title
	        this.$('#title').html(file_name);
	
	        // update info
	        this.$('#size').html(Utils.bytesToString (file_size));
	
	        // remove mode class
	        this.$('#mode')
	            .removeClass()
	            .addClass('upload-mode')
	            .addClass('text-primary');
	
	        // activate text field if file is new
	        if (file_mode == 'new') {
	            this.$('#text').css({
	                'width' : this.$el.width() - 16 + 'px',
	                'top'   : this.$el.height() - 8 + 'px'
	            }).show();
	            this.$el.height(this.$el.height() - 8 + this.$('#text').height() + 16);
	            this.$('#mode').addClass('fa fa-edit');
	        }
	
	        // file from local disk
	        if (file_mode == 'local') {
	            this.$('#mode').addClass('fa fa-laptop');
	        }
	
	        // file from ftp
	        if (file_mode == 'ftp') {
	            this.$('#mode').addClass('fa fa-folder-open-o');
	        }
	    },
	
	    // remove
	    remove: function() {
	        // trigger remove event
	        this.select_genome.remove();
	        this.select_extension.remove();
	
	        // call the base class remove method
	        Backbone.View.prototype.remove.apply(this);
	    },
	
	    //
	    // handle model events
	    //
	
	    // update extension
	    _refreshExtension: function() {
	        this.select_extension.value(this.model.get('extension'));
	    },
	    
	    // update genome
	    _refreshGenome: function() {
	        this.select_genome.value(this.model.get('genome'));
	    },
	
	    // progress
	    _refreshInfo: function() {
	        // write error message
	        var info = this.model.get('info');
	        if (info) {
	            this.$('#info').html('<strong>Failed: </strong>' + info).show();
	        } else {
	            this.$('#info').hide();
	        }
	    },
	
	    // progress
	    _refreshPercentage : function() {
	        var percentage = parseInt(this.model.get('percentage'));
	        this.$('.progress-bar').css({ width : percentage + '%' });
	        if (percentage != 100)
	            this.$('#percentage').html(percentage + '%');
	        else
	            this.$('#percentage').html('Adding to history...');
	    },
	
	    // status
	    _refreshStatus : function() {
	        // identify new status
	        var status = this.model.get('status');
	
	        // identify symbol and reset classes
	        this.$('#symbol').removeClass().addClass(this.status_classes[status]);
	
	        // enable/disable model flag
	        this.model.set('enabled', status == 'init');
	
	        // enable/disable row fields
	        var enabled = this.model.get('enabled');
	        this.$('#text-content').attr('disabled', !enabled);
	        if (enabled) {
	            this.select_genome.enable();
	            this.select_extension.enable();
	        } else {
	            this.select_genome.disable();
	            this.select_extension.disable();
	        }
	
	        // success
	        if (status == 'success') {
	            this.$el.addClass('success');
	            this.$('#percentage').html('100%');
	        }
	
	        // error
	        if (status == 'error') {
	            this.$el.addClass('danger');
	            this.$('.progress').remove();
	        }
	    },
	
	    // refresh size
	    _refreshFileSize: function() {
	        var count = this.model.get('file_size');
	        this.$('#size').html(Utils.bytesToString (count));
	    },
	
	    //
	    // handle ui events
	    //
	
	    // remove row
	    _removeRow: function() {
	        // get current status
	        var status = this.model.get('status');
	
	        // only remove from queue if not in processing line
	        if (status == 'init' || status == 'success' || status == 'error') {
	            this.app.collection.remove(this.model);
	        }
	    },
	
	    // attach file info popup
	    _showSettings : function() {
	        // check if popover is visible
	        if (!this.settings.visible) {
	            // show popover
	            this.settings.empty();
	            this.settings.append((new UploadSettings(this)).$el);
	            this.settings.show();
	        } else {
	            // hide popover
	            this.settings.hide();
	        }
	    },
	
	    // template
	    _template: function(options) {
	        return  '<tr id="upload-row-' + options.id + '" class="upload-row">' +
	                    '<td>' +
	                        '<div class="upload-text-column">' +
	                            '<div id="mode"/>' +
	                            '<div id="title" class="upload-title"/>' +
	                            '<div id="text" class="text">' +
	                                '<div class="text-info">You can tell Galaxy to download data from web by entering URL in this box (one per line). You can also directly paste the contents of a file.</div>' +
	                                '<textarea id="text-content" class="text-content form-control"/>' +
	                            '</div>' +
	                        '</div>' +
	                    '</td>' +
	                    '<td>' +
	                        '<div id="size" class="upload-size"/>' +
	                    '</td>' +
	                    '<td>' +
	                        '<div id="extension" class="upload-extension" style="float: left;"/>&nbsp;&nbsp' +
	                        '<div id="extension-info" class="upload-icon-button fa fa-search"/>' +
	                    '</td>' +
	                    '<td>' +
	                        '<div id="genome" class="upload-genome"/>' +
	                    '</td>' +
	                    '<td><div id="settings" class="upload-settings upload-icon-button fa fa-gear"/></td>' +
	                    '<td>' +
	                        '<div id="info" class="upload-info">' +
	                            '<div class="progress">' +
	                                '<div class="progress-bar progress-bar-success"/>' +
	                                '<div id="percentage" class="percentage">0%</div>' +
	                            '</div>' +
	                        '</div>' +
	                    '</td>' +
	                    '<td>' +
	                        '<div id="symbol" class="' + this.status_classes.init + '"/>' +
	                    '</td>' +
	                '</tr>';
	    }
	
	});
	
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 53 */
/*!******************************************************!*\
  !*** ./galaxy/scripts/mvc/upload/upload-settings.js ***!
  \******************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone, $, _) {/** This renders the content of the settings popup, allowing users to specify flags i.e. for space-to-tab conversion **/
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [ __webpack_require__(/*! utils/utils */ 21) ], __WEBPACK_AMD_DEFINE_RESULT__ = function( Utils ) {
	return Backbone.View.extend({
	    options: {
	        class_check     : 'fa-check-square-o',
	        class_uncheck   : 'fa-square-o',
	        parameters      : [{
	            id          : 'space_to_tab',
	            title       : 'Convert spaces to tabs',
	        },{
	            id          : 'to_posix_lines',
	            title       : 'Use POSIX standard'
	        }]
	    },
	
	    initialize: function( options ) {
	        var self = this;
	        this.model = options.model;
	        this.setElement( $( '<div/>' ).addClass( 'upload-settings' ) );
	        this.$el.append( $( '<div/>' ).addClass( 'upload-settings-cover' ) );
	        this.$el.append( $( '<table/>' ).addClass( 'upload-settings-table ui-table-striped' ).append( '<tbody/>' ) );
	        this.$cover = this.$( '.upload-settings-cover' );
	        this.$table = this.$( '.upload-settings-table > tbody' );
	        this.listenTo ( this.model, 'change', this.render, this );
	        this.model.trigger( 'change' );
	    },
	
	    render: function() {
	        var self = this;
	        this.$table.empty();
	        _.each( this.options.parameters, function( parameter ) {
	            var $checkbox = $( '<div/>' ).addClass( 'upload-' + parameter.id + ' upload-icon-button fa' )
	                                         .addClass( self.model.get( parameter.id ) && self.options.class_check || self.options.class_uncheck )
	                                         .on( 'click', function() {
	                                            self.model.get( 'enabled' ) && self.model.set( parameter.id, !self.model.get( parameter.id ) )
	                                         });
	            self.$table.append( $( '<tr/>' ).append( $( '<td/>' ).append( $checkbox ) )
	                                            .append( $( '<td/>' ).append( parameter.title ) ) )
	        });
	        this.$cover[ this.model.get( 'enabled' ) && 'hide' || 'show' ]();
	    }
	});
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! jquery */ 3), __webpack_require__(/*! underscore */ 1)))

/***/ },
/* 54 */
/*!*********************************************!*\
  !*** ./galaxy/scripts/mvc/ui/ui-popover.js ***!
  \*********************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone, _, $) {/**
	 * Popover wrapper
	*/
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [ __webpack_require__(/*! utils/utils */ 21) ], __WEBPACK_AMD_DEFINE_RESULT__ = function( Utils ) {
	var View = Backbone.View.extend({
	    optionsDefault: {
	        with_close  : true,
	        title       : null,
	        placement   : 'top',
	        container   : 'body',
	        body        : null
	    },
	
	    initialize: function ( options ) {
	        this.setElement( this._template() );
	        this.uid = Utils.uid();
	        this.options = _.defaults( options || {}, this.optionsDefault );
	        this.options.container.parent().append( this.el );
	        this.$title = this.$( '.popover-title-label' );
	        this.$close = this.$( '.popover-close' );
	        this.$body  = this.$( '.popover-content' );
	
	        // add initial content
	        this.options.body && this.append( this.options.body );
	
	        // add event to hide if click is outside of popup and not on container
	        var self = this;
	        $( 'body' ).on( 'mousedown.' + this.uid,  function( e ) {
	            // the 'is' for buttons that trigger popups
	            // the 'has' for icons within a button that triggers a popup
	            self.visible && !$( self.options.container ).is( e.target ) && !$( self.el ).is( e.target ) &&
	                $( self.el ).has( e.target ).length === 0 && self.hide();
	        });
	    },
	
	    /**
	     * Render popover
	    */
	    render: function() {
	        this.$title.html( this.options.title );
	        this.$el.removeClass().addClass( 'ui-popover popover fade in' ).addClass( this.options.placement );
	        this.$el.css( this._get_placement( this.options.placement ) );
	
	        // configure close option
	        var self = this;
	        if ( this.options.with_close ) {
	            this.$close.on( 'click', function() { self.hide() } ).show();
	        } else {
	            this.$close.off().hide();
	        }
	    },
	
	    /**
	     * Set the popover title
	     * @params{ String }    newTitle    - New popover title
	    */
	    title: function( newTitle ) {
	        if ( newTitle !== undefined ) {
	            this.options.title = newTitle;
	            this.$title.html( newTitle );
	        }
	    },
	
	    /**
	     * Show popover
	    */
	    show: function() {
	        this.render();
	        this.$el.show();
	        this.visible = true;
	    },
	
	    /**
	     * Hide popover
	    */
	    hide: function() {
	        this.$el.hide();
	        this.visible = false;
	    },
	
	    /**
	     * Append new content to the popover
	     * @params{ Object }  $el - Dom element
	    */
	    append: function( $el ) {
	        this.$body.append( $el );
	    },
	
	    /**
	     * Remove all content
	    */
	    empty: function() {
	        this.$body.empty();
	    },
	
	    /**
	     * Remove popover
	    */
	    remove: function() {
	        $( 'body' ).off( 'mousedown.' + this.uid );
	        this.$el.remove();
	    },
	
	    /**
	     * Improve popover location/placement
	    */
	    _get_placement: function( placement ) {
	        // get popover dimensions
	        var width               = this._get_width( this.$el );
	        var height              = this.$el.height();
	
	        // get container details
	        var $container = this.options.container;
	        var container_width     = this._get_width( $container );
	        var container_height    = this._get_height( $container );
	        var container_position  = $container.position();
	
	        // get position
	        var top  = left = 0;
	        if ([ 'top', 'bottom' ].indexOf( placement ) != -1) {
	            left = container_position.left - width + ( container_width + width ) / 2;
	            switch ( placement ) {
	                case 'top':
	                    top = container_position.top - height - 5;
	                    break;
	                case 'bottom':
	                    top = container_position.top + container_height + 5;
	                    break;
	            }
	        } else {
	            top = container_position.top - height + ( container_height + height ) / 2;
	            switch ( placement ) {
	                case 'right':
	                    left = container_position.left + container_width;
	                    break;
	            }
	        }
	        return { top: top, left: left };
	    },
	
	    /**
	     * Returns padding/margin corrected width
	    */
	    _get_width: function( $el ) {
	        return $el.width() + parseInt( $el.css( 'padding-left' ) ) + parseInt( $el.css( 'margin-left' ) ) +
	                             parseInt( $el.css( 'padding-right' ) ) + parseInt( $el.css( 'margin-right' ) );
	    },
	
	    /**
	     * Returns padding corrected height
	    */
	    _get_height: function( $el ) {
	        return $el.height() + parseInt( $el.css( 'padding-top' ) ) + parseInt( $el.css( 'padding-bottom' ) );
	    },
	
	    /**
	     * Return the popover template
	    */
	    _template: function( options ) {
	        return  '<div class="ui-popover popover fade in">' +
	                    '<div class="arrow"/>' +
	                    '<div class="popover-title">' +
	                        '<div class="popover-title-label"/>' +
	                        '<div class="popover-close fa fa-times-circle"/>' +
	                    '</div>' +
	                    '<div class="popover-content"/>' +
	                '</div>';
	    }
	});
	
	return {
	    View: View
	}
	
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! underscore */ 1), __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 55 */
/*!********************************************!*\
  !*** ./galaxy/scripts/mvc/ui/ui-select.js ***!
  \********************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone) {// dependencies
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(/*! utils/utils */ 21)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Utils) {
	
	/**
	 * A plugin for initializing select2 input items.
	 * Make sure the select2 library itself is loaded beforehand.
	 * Also the element to which select2 will be appended has to 
	 * be created before select2 initialization (and passed as option).
	 */
	var View = Backbone.View.extend(
	{
	    // options
	    optionsDefault: {
	        css                 : '',
	        placeholder         : 'No data available',
	        data                : [],
	        value               : null,
	        multiple            : false,
	        minimumInputLength  : 0,
	        // example format of initial data: "id:name,55:anotherrole@role.com,27:role@role.com"
	        initialData         : ''
	    },
	    
	    // initialize
	    initialize : function(options) {
	        // configure options
	        this.options = Utils.merge(options, this.optionsDefault);
	        
	        // create new element
	        this.setElement(this._template(this.options));
	        
	        // check if container exists
	        if (!this.options.container) {
	            console.log('ui-select::initialize() : container not specified.');
	            return;
	        }
	        
	        // add to dom
	        this.options.container.append(this.$el);
	        
	        // link selection dictionary
	        this.select_data = this.options.data;
	        
	        // refresh
	        this._refresh();
	        
	        if (!this.options.multiple){
	            // initial value
	            if (this.options.value) {
	                this._setValue(this.options.value);
	            }
	            
	            // add change event
	            var self = this;
	            if (this.options.onchange) {
	                this.$el.on('change', function() {
	                    self.options.onchange(self.value());
	                });
	            }
	        }
	    },
	    
	    // value
	    value : function (new_value) {
	        // get current id/value
	        var before = this._getValue();
	        
	        // check if new_value is defined
	        if (new_value !== undefined) {
	            this._setValue(new_value);
	        }
	        
	        // get current id/value
	        var after = this._getValue();
	        
	        // fire onchange
	        if ((after != before && this.options.onchange)) {
	            this.options.onchange(after);
	        }
	            
	        // return current value
	        return after;
	    },
	    
	    // label
	    text : function () {
	        return this.$el.select2('data').text;
	    },
	    
	    // disabled
	    disabled: function() {
	        return !this.$el.select2('enable');
	    },
	
	    // enable
	    enable: function() {
	        this.$el.select2('enable', true);
	    },
	        
	    // disable
	    disable: function() {
	        this.$el.select2('enable', false);
	    },
	    
	    // add
	    add: function(options) {
	        // add options
	        this.select_data.push({
	            id      : options.id,
	            text    : options.text
	        });
	        
	        // refresh
	        this._refresh();
	    },
	    
	    // remove
	    del: function(id) {
	        // search option
	        var index = this._getIndex(id);
	        
	        // check if found
	        if (index != -1) {
	            // remove options
	            this.select_data.splice(index, 1);
	        
	            // refresh
	            this._refresh();
	        }
	    },
	    
	    // remove
	    remove: function() {
	        this.$el.select2('destroy');
	    },
	    
	    // update
	    update: function(options) {
	        // copy options
	        this.select_data = [];
	        for (var key in options.data) {
	            this.select_data.push(options.data[key]);
	        }
	        
	        // refresh
	        this._refresh();
	    },
	    
	    // refresh
	    _refresh: function() {
	        // add select2 data based on type of input
	        if (!this.options.multiple){
	            var selected = this._getValue();
	            var select_opt = {
	                data                : this.select_data,
	                containerCssClass   : this.options.css,
	                placeholder         : this.options.placeholder,
	                dropdownAutoWidth   : true
	            };
	            this.$el.select2(select_opt);
	            // select previous value (if exists)
	            this._setValue(selected);
	        } else {
	            var select_opt = {
	                multiple            : this.options.multiple,
	                containerCssClass   : this.options.css,
	                placeholder         : this.options.placeholder,
	                minimumInputLength  : this.options.minimumInputLength,
	                ajax                : this.options.ajax,
	                dropdownCssClass    : this.options.dropdownCssClass,
	                escapeMarkup        : this.options.escapeMarkup,
	                formatResult        : this.options.formatResult,
	                formatSelection     : this.options.formatSelection,
	                initSelection       : this.options.initSelection,
	                initialData         : this.options.initialData
	            };
	            this.$el.select2(select_opt);
	        }
	    },
	    
	    // get index
	    _getIndex: function(value) {
	        // search index
	        for (var key in this.select_data) {
	            if (this.select_data[key].id == value) {
	                return key;
	            }
	        }
	        
	        // not found
	        return -1;
	    },
	    
	    // get value
	    _getValue: function() {
	        return this.$el.select2('val');
	    },
	    
	    // set value
	    _setValue: function(new_value) {
	        var index = this._getIndex(new_value);
	        if (index == -1) {
	            if (this.select_data.length > 0) {
	                new_value = this.select_data[0].id;
	            }
	        }
	        this.$el.select2('val', new_value);
	    },
	    
	    // element
	    _template: function(options) {
	            return '<input type="hidden" value="' + this.options.initialData + '"/>';
	    }
	});
	
	return {
	    View : View
	};
	
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2)))

/***/ },
/* 56 */
/*!*************************************************!*\
  !*** ./galaxy/scripts/mvc/upload/upload-ftp.js ***!
  \*************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone, $) {/** This renders the content of the ftp popup **/
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(/*! utils/utils */ 21)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Utils) {
	return Backbone.View.extend({
	    // render
	    initialize: function(options) {
	        // link options
	        this.options = Utils.merge(options, {
	            class_add       : 'upload-icon-button fa fa-square-o',
	            class_remove    : 'upload-icon-button fa fa-check-square-o',
	            class_partial   : 'upload-icon-button fa fa-minus-square-o',
	            collection      : null,
	            onchange        : function() {},
	            onadd           : function() {},
	            onremove        : function() {}
	        });
	
	        // link this
	        var self = this;
	
	        // link app
	        this.collection = this.options.collection;
	
	        // set template
	        this.setElement(this._template());
	
	        // list of rows
	        this.rows = [];
	
	        // load extension
	        Utils.get({
	            url     : Galaxy.root + 'api/remote_files',
	            success : function(ftp_files) { self._fill(ftp_files); },
	            error   : function() { self._fill(); }
	        });
	    },
	
	    // fill table
	    _fill: function(ftp_files) {
	        if (ftp_files && ftp_files.length > 0) {
	            // add table
	            this.$el.find('#upload-ftp-content').html($(this._templateTable()));
	
	            // add files to table
	            var size = 0;
	            for (index in ftp_files) {
	                this.rows.push(this._add(ftp_files[index]));
	                size += ftp_files[index].size;
	            }
	
	            // update stats
	            this.$el.find('#upload-ftp-number').html(ftp_files.length + ' files');
	            this.$el.find('#upload-ftp-disk').html(Utils.bytesToString (size, true));
	
	            // add event handler to select/unselect all
	            if (this.collection) {
	                var self = this;
	                this.$('._has_collection').show();
	                this.$select_all = $('#upload-selectall');
	                this.$select_all.addClass(this.options.class_add);
	                this.$select_all.on('click', function() {
	                    var add = self.$select_all.hasClass(self.options.class_add);
	                    for (index in ftp_files) {
	                        var ftp_file = ftp_files[index];
	                        var model_index = self._find(ftp_file);
	                        if(!model_index && add || model_index && !add) {
	                            self.rows[index].trigger('click');
	                        }
	                    }
	                });
	                this._refresh();
	            }
	        } else {
	            this.$el.find('#upload-ftp-content').html($(this._templateInfo()));
	        }
	        this.$el.find('#upload-ftp-wait').hide();
	    },
	
	    // add
	    _add: function(ftp_file) {
	        // link this
	        var self = this;
	
	        // create new item
	        var $it = $(this._templateRow(ftp_file));
	
	        // identify icon
	        var $icon = $it.find('.icon');
	
	        // append to table
	        $(this.el).find('tbody').append($it);
	
	        // collection mode with add/remove triggers
	        if (this.collection) {
	            // find model and set initial 'add' icon class
	            var icon_class = '';
	            if (this._find(ftp_file)) {
	                icon_class = this.options.class_remove;
	            } else {
	                icon_class = this.options.class_add;
	            }
	            $icon.addClass(icon_class);
	
	            // click triggers add/remove events
	            $it.on('click', function() {
	                var model_index = self._find(ftp_file);
	                $icon.removeClass();
	                if (!model_index) {
	                    self.options.onadd(ftp_file);
	                    $icon.addClass(self.options.class_remove);
	                } else {
	                    self.options.onremove(model_index);
	                    $icon.addClass(self.options.class_add);
	                }
	                self._refresh();
	            });
	        } else {
	            // click triggers only change
	            $it.on('click', function() {
	                self.options.onchange(ftp_file);
	            });
	        }
	
	        // return dom handler
	        return $it;
	    },
	
	    // refresh
	    _refresh: function() {
	        var filtered = this.collection.where({file_mode: 'ftp', enabled: true});
	        this.$select_all.removeClass();
	        if (filtered.length == 0) {
	            this.$select_all.addClass(this.options.class_add);
	        } else {
	            if (filtered.length == this.rows.length) {
	                this.$select_all.addClass(this.options.class_remove);
	            } else {
	                this.$select_all.addClass(this.options.class_partial);
	            }
	        }
	    },
	
	    // get model index
	    _find: function(ftp_file) {
	        var item = this.collection.findWhere({
	            file_path   : ftp_file.path,
	            file_mode   : 'ftp',
	            enabled     : true
	        });
	        return item && item.get('id');
	    },
	
	    // template row
	    _templateRow: function(options) {
	        return  '<tr class="upload-ftp-row">' +
	                    '<td class="_has_collection" style="display: none;"><div class="icon"/></td>' +
	                    '<td class="ftp-name">' + options.path + '</td>' +
	                    '<td class="ftp-size">' + Utils.bytesToString(options.size) + '</td>' +
	                    '<td class="ftp-time">' + options.ctime + '</td>' +
	                '</tr>';
	    },
	
	    // load table template
	    _templateTable: function() {
	        return  '<span style="whitespace: nowrap; float: left;">Available files: </span>' +
	                '<span style="whitespace: nowrap; float: right;">' +
	                    '<span class="upload-icon fa fa-file-text-o"/>' +
	                    '<span id="upload-ftp-number"/>&nbsp;&nbsp;' +
	                    '<span class="upload-icon fa fa-hdd-o"/>' +
	                    '<span id="upload-ftp-disk"/>' +
	                '</span>' +
	                '<table class="grid" style="float: left;">' +
	                    '<thead>' +
	                        '<tr>' +
	                            '<th class="_has_collection" style="display: none;"><div id="upload-selectall"></th>' +
	                            '<th>Name</th>' +
	                            '<th>Size</th>' +
	                            '<th>Created</th>' +
	                        '</tr>' +
	                    '</thead>' +
	                    '<tbody/>' +
	                '</table>';
	    },
	
	    // load table template
	    _templateInfo: function() {
	        return  '<div class="upload-ftp-warning warningmessage">' +
	                    'Your FTP directory does not contain any files.' +
	                '</div>';
	    },
	
	    // load html template
	    _template: function() {
	        return  '<div class="upload-ftp">' +
	                    '<div id="upload-ftp-wait" class="upload-ftp-wait fa fa-spinner fa-spin"/>' +
	                    '<div class="upload-ftp-help">This Galaxy server allows you to upload files via FTP. To upload some files, log in to the FTP server at <strong>' + this.options.ftp_upload_site + '</strong> using your Galaxy credentials (email address and password).</div>' +
	                    '<div id="upload-ftp-content"/>' +
	                '<div>';
	    }
	});
	
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 57 */
/*!*******************************************!*\
  !*** ./galaxy/scripts/utils/uploadbox.js ***!
  \*******************************************/
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(jQuery, _) {/*
	    galaxy upload plugins - requires FormData and XMLHttpRequest
	*/
	;(function($){
	    // add event properties
	    jQuery.event.props.push("dataTransfer");
	
	    /**
	        Posts file data to the API
	    */
	    $.uploadpost = function (config) {
	        // parse options
	        var cnf = $.extend({}, {
	            data            : {},
	            success         : function() {},
	            error           : function() {},
	            progress        : function() {},
	            url             : null,
	            maxfilesize     : 2048,
	            error_filesize  : 'File exceeds 2GB. Please use a FTP client.',
	            error_default   : 'Please make sure the file is available.',
	            error_server    : 'Upload request failed.',
	            error_login     : 'Uploads require you to log in.'
	        }, config);
	
	        // link data
	        var data = cnf.data;
	
	        // check errors
	        if (data.error_message) {
	            cnf.error(data.error_message);
	            return;
	        }
	
	        // construct form data
	        var form = new FormData();
	        for (var key in data.payload) {
	            form.append(key, data.payload[key]);
	        }
	
	        // add files to submission
	        var sizes = 0;
	        for (var key in data.files) {
	            var d = data.files[key];
	            form.append(d.name, d.file, d.file.name);
	            sizes += d.file.size;
	        }
	
	        // check file size, unless it's an ftp file
	        if (sizes > 1048576 * cnf.maxfilesize) {
	            cnf.error(cnf.error_filesize);
	            return;
	        }
	
	        // prepare request
	        xhr = new XMLHttpRequest();
	        xhr.open('POST', cnf.url, true);
	        xhr.setRequestHeader('Accept', 'application/json');
	        xhr.setRequestHeader('Cache-Control', 'no-cache');
	        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
	
	        // captures state changes
	        xhr.onreadystatechange = function() {
	            // check for request completed, server connection closed
	            if (xhr.readyState == xhr.DONE) {
	                // parse response
	                var response = null;
	                if (xhr.responseText) {
	                    try {
	                        response = jQuery.parseJSON(xhr.responseText);
	                    } catch (e) {
	                        response = xhr.responseText;
	                    }
	                }
	                // pass any error to the error option
	                if (xhr.status < 200 || xhr.status > 299) {
	                    var text = xhr.statusText;
	                    if (xhr.status == 403) {
	                        text = cnf.error_login;
	                    } else if (xhr.status == 0) {
	                        text = cnf.error_server;
	                    } else if (!text) {
	                        text = cnf.error_default;
	                    }
	                    cnf.error(text + ' (' + xhr.status + ')');
	                } else {
	                    cnf.success(response);
	                }
	            }
	        }
	
	        // prepare upload progress
	        xhr.upload.addEventListener('progress', function(e) {
	            if (e.lengthComputable) {
	                cnf.progress(Math.round((e.loaded * 100) / e.total));
	            }
	        }, false);
	
	        // send request
	        Galaxy.emit.debug('uploadbox::uploadpost()', 'Posting following data.', cnf);
	        xhr.send(form);
	    }
	
	    /**
	        Handles the upload events drag/drop etc.
	    */
	    $.fn.uploadinput = function(options) {
	        // initialize
	        var el = this;
	        var opts = $.extend({}, {
	            ondragover  : function() {},
	            ondragleave : function() {},
	            onchange    : function() {},
	            multiple    : false
	        }, options);
	
	        // append hidden upload field
	        var $input = $('<input type="file" style="display: none" ' + (opts.multiple && 'multiple' || '') + '/>');
	        el.append($input.change(function (e) {
	            opts.onchange(e.target.files);
	            $(this).val('');
	        }));
	
	        // drag/drop events
	        el.on('drop', function (e) {
	            opts.ondragleave(e);
	            if(e.dataTransfer) {
	                opts.onchange(e.dataTransfer.files);
	                e.preventDefault();
	            }
	        });
	        el.on('dragover',  function (e) {
	            e.preventDefault();
	            opts.ondragover(e);
	        });
	        el.on('dragleave', function (e) {
	            e.stopPropagation();
	            opts.ondragleave(e);
	        });
	
	        // exports
	        return {
	            dialog: function () {
	                $input.trigger('click');
	            }
	        }
	    }
	
	    /**
	        Handles the upload queue and events such as drag/drop etc.
	    */
	    $.fn.uploadbox = function(options) {
	        // parse options
	        var opts = $.extend({}, {
	            dragover        : function() {},
	            dragleave       : function() {},
	            announce        : function(d) {},
	            initialize      : function(d) {},
	            progress        : function(d, m) {},
	            success         : function(d, m) {},
	            error           : function(d, m) { alert(m); },
	            complete        : function() {}
	        }, options);
	
	        // file queue
	        var queue = {};
	
	        // queue index/length counter
	        var queue_index = 0;
	        var queue_length = 0;
	
	        // indicates if queue is currently running
	        var queue_running = false;
	        var queue_stop = false;
	
	        // element
	        var uploadinput = $(this).uploadinput({
	            multiple    : true,
	            onchange    : function(files) { add(files); },
	            ondragover  : options.ondragover,
	            ondragleave : options.ondragleave
	        });
	
	        // add new files to upload queue
	        function add(files) {
	            if (files && files.length && !queue_running) {
	                var current_index = queue_index;
	                _.each(files, function(file, key) {
	                    if (file.mode !== 'new' && _.filter(queue, function(f) {
	                        return f.name === file.name && f.size === file.size;
	                    }).length) {
	                        file.duplicate = true;
	                    }
	                });
	                _.each(files, function(file) {
	                    if (!file.duplicate) {
	                        var index = String(queue_index++);
	                        queue[index] = file;
	                        opts.announce(index, queue[index]);
	                        queue_length++;
	                    }
	                });
	                return current_index;
	            }
	        }
	
	        // remove file from queue
	        function remove(index) {
	            if (queue[index]) {
	                delete queue[index];
	                queue_length--;
	            }
	        }
	
	        // process an upload, recursive
	        function process() {
	            // validate
	            if (queue_length == 0 || queue_stop) {
	                queue_stop = false;
	                queue_running = false;
	                opts.complete();
	                return;
	            } else {
	                queue_running = true;
	            }
	
	            // get an identifier from the queue
	            var index = -1;
	            for (var key in queue) {
	                index = key;
	                break;
	            }
	
	            // get current file from queue
	            var file = queue[index];
	
	            // remove from queue
	            remove(index)
	
	            // create and submit data
	            $.uploadpost({
	                url      : opts.url,
	                data     : opts.initialize(index),
	                success  : function(message) { opts.success(index, message); process();},
	                error    : function(message) { opts.error(index, message); process();},
	                progress : function(percentage) { opts.progress(index, percentage); }
	            });
	        }
	
	        /*
	            public interface
	        */
	
	        // open file browser for selection
	        function select() {
	            uploadinput.dialog();
	        }
	
	        // remove all entries from queue
	        function reset(index) {
	            for (index in queue) {
	                remove(index);
	            }
	        }
	
	        // initiate upload process
	        function start() {
	            if (!queue_running) {
	                queue_running = true;
	                process();
	            }
	        }
	
	        // stop upload process
	        function stop() {
	            queue_stop = true;
	        }
	
	        // set options
	        function configure(options) {
	            opts = $.extend({}, opts, options);
	            return opts;
	        }
	
	        // verify browser compatibility
	        function compatible() {
	            return window.File && window.FormData && window.XMLHttpRequest && window.FileList;
	        }
	
	        // export functions
	        return {
	            'select'        : select,
	            'add'           : add,
	            'remove'        : remove,
	            'start'         : start,
	            'stop'          : stop,
	            'reset'         : reset,
	            'configure'     : configure,
	            'compatible'    : compatible
	        };
	    }
	})(jQuery);
	
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! jquery */ 3), __webpack_require__(/*! underscore */ 1)))

/***/ },
/* 58 */
/*!***************************************************************!*\
  !*** ./galaxy/scripts/mvc/upload/composite/composite-view.js ***!
  \***************************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone, _, $) {/** Renders contents of the composite uploader */
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(/*! utils/utils */ 21),
	        __webpack_require__(/*! mvc/upload/upload-model */ 51),
	        __webpack_require__(/*! mvc/upload/composite/composite-row */ 59),
	        __webpack_require__(/*! mvc/ui/ui-popover */ 54),
	        __webpack_require__(/*! mvc/ui/ui-select */ 55),
	        __webpack_require__(/*! mvc/ui/ui-misc */ 22)], __WEBPACK_AMD_DEFINE_RESULT__ = function(   Utils,
	                    UploadModel,
	                    UploadRow,
	                    Popover,
	                    Select,
	                    Ui
	                ) {
	
	return Backbone.View.extend({
	    // extension selector
	    select_extension: null,
	
	    // genome selector
	    select_genome: null,
	
	    // collection
	    collection: new UploadModel.Collection(),
	
	    // initialize
	    initialize: function(app) {
	        // link app
	        this.app                = app;
	        this.options            = app.options;
	        this.list_extensions    = app.list_extensions;
	        this.list_genomes       = app.list_genomes;
	        this.ftp_upload_site    = app.currentFtp();
	
	        // link this
	        var self = this;
	
	        // set element
	        this.setElement(this._template());
	
	        // create button section
	        this.btnStart = new Ui.Button({ title: 'Start', onclick: function() { self._eventStart(); } });
	        this.btnClose = new Ui.Button({ title: 'Close', onclick: function() { self.app.modal.hide(); } });
	
	        // append buttons to dom
	        var buttons = [ this.btnStart, this.btnClose ];
	        for (var i in buttons) {
	            this.$('#upload-buttons').prepend(buttons[i].$el);
	        }
	
	        // select extension
	        this.select_extension = new Select.View({
	            css         : 'footer-selection',
	            container   : this.$('#footer-extension'),
	            data        : _.filter(this.list_extensions, function(ext) { return ext.composite_files }),
	            onchange    : function(extension) {
	                self.collection.reset();
	                var details = _.findWhere(self.list_extensions, { id : extension });
	                if (details && details.composite_files) {
	                    for (var i in details.composite_files) {
	                        var item = details.composite_files[i];
	                        self.collection.add({
	                            id          : self.collection.size(),
	                            file_desc   : item['description'] || item['name']
	                        });
	                    }
	                }
	            }
	        });
	
	        // handle extension info popover
	        this.$('#footer-extension-info').on('click', function(e) {
	            self._showExtensionInfo({
	                $el         : $(e.target),
	                title       : self.select_extension.text(),
	                extension   : self.select_extension.value(),
	                placement   : 'top'
	            });
	        }).on('mousedown', function(e) { e.preventDefault(); });
	
	        // genome extension
	        this.select_genome = new Select.View({
	            css         : 'footer-selection',
	            container   : this.$('#footer-genome'),
	            data        : this.list_genomes,
	            value       : this.options.default_genome
	        });
	
	        // listener for collection triggers on change in composite datatype
	        this.collection.on('add', function (model) {
	            self._eventAnnounce(model);
	        });
	        this.collection.on('change add', function() {
	            self._updateScreen();
	        }).trigger('change');
	
	        // trigger initial onchange event
	        this.select_extension.options.onchange(this.select_extension.value());
	    },
	
	    //
	    // upload events / process pipeline
	    //
	
	    // builds the basic ui with placeholder rows for each composite data type file
	    _eventAnnounce: function(model) {
	        // create view/model
	        var upload_row = new UploadRow(this, { model : model });
	
	        // add upload row element to table
	        this.$('#upload-table > tbody:first').append(upload_row.$el);
	
	        // render
	        upload_row.render();
	
	        // table visibility
	        if (this.collection.length > 0) {
	            this.$('#upload-table').show();
	        } else {
	            this.$('#upload-table').hide();
	        }
	    },
	
	    // start upload process
	    _eventStart: function() {
	        var self = this;
	        this.collection.each(function(model) {
	            model.set('genome', self.select_genome.value());
	            model.set('extension', self.select_extension.value());
	        });
	        $.uploadpost({
	            url      : this.app.options.nginx_upload_path,
	            data     : this.app.toData(this.collection.filter()),
	            success  : function(message) { self._eventSuccess(message); },
	            error    : function(message) { self._eventError(message); },
	            progress : function(percentage) { self._eventProgress(percentage); }
	        });
	    },
	
	    // progress
	    _eventProgress: function(percentage) {
	        this.collection.each(function(it) { it.set('percentage', percentage); });
	    },
	
	    // success
	    _eventSuccess: function(message) {
	        this.collection.each(function(it) {
	            it.set('status', 'success');
	        });
	        Galaxy.currHistoryPanel.refreshContents();
	    },
	
	    // error
	    _eventError: function(message) {
	        this.collection.each(function(it) {
	            it.set('status', 'error');
	            it.set('info', message);
	        });
	    },
	
	    // display extension info popup
	    _showExtensionInfo: function(options) {
	        // initialize
	        var self = this;
	        var $el = options.$el;
	        var extension = options.extension;
	        var title = options.title;
	        var description = _.findWhere(this.list_extensions, { id : extension });
	
	        // create popup
	        this.extension_popup && this.extension_popup.remove();
	        this.extension_popup = new Popover.View({
	            placement: options.placement || 'bottom',
	            container: $el,
	            destroy: true
	        });
	
	        // add content and show popup
	        this.extension_popup.title(title);
	        this.extension_popup.empty();
	        this.extension_popup.append(this._templateDescription(description));
	        this.extension_popup.show();
	    },
	
	    // set screen
	    _updateScreen: function () {
	        // show start button if components have been selected
	        var model = this.collection.first();
	        if (model && model.get('status') == 'running') {
	            this.select_genome.disable();
	            this.select_extension.disable();
	        } else {
	            this.select_genome.enable();
	            this.select_extension.enable();
	        }
	        if (this.collection.where({ status : 'ready' }).length == this.collection.length && this.collection.length > 0) {
	            this.btnStart.enable();
	            this.btnStart.$el.addClass('btn-primary');
	        } else {
	            this.btnStart.disable();
	            this.btnStart.$el.removeClass('btn-primary');
	        }
	
	        // table visibility
	        if (this.collection.length > 0) {
	            this.$('#upload-table').show();
	        } else {
	            this.$('#upload-table').hide();
	        }
	    },
	
	    // template for extensions description
	    _templateDescription: function(options) {
	        if (options.description) {
	            var tmpl = options.description;
	            if (options.description_url) {
	                tmpl += '&nbsp;(<a href="' + options.description_url + '" target="_blank">read more</a>)';
	            }
	            return tmpl;
	        } else {
	            return 'There is no description available for this file extension.';
	        }
	    },
	
	    // load html template
	    _template: function() {
	        return  '<div class="upload-view-composite">' +
	                    '<div id="upload-footer" class="upload-footer">' +
	                        '<span class="footer-title">Composite Type:</span>' +
	                        '<span id="footer-extension"/>' +
	                        '<span id="footer-extension-info" class="upload-icon-button fa fa-search"/> ' +
	                        '<span class="footer-title">Genome/Build:</span>' +
	                        '<span id="footer-genome"/>' +
	                    '</div>' +
	                    '<div id="upload-box" class="upload-box">' +
	                        '<table id="upload-table" class="ui-table-striped" style="display: none;">' +
	                            '<thead>' +
	                                '<tr>' +
	                                    '<th/>' +
	                                    '<th/>' +
	                                    '<th>Description</th>' +
	                                    '<th>Name</th>' +
	                                    '<th>Size</th>' +
	                                    '<th>Settings</th>' +
	                                    '<th>Status</th>' +
	                                '</tr>' +
	                            '</thead>' +
	                            '<tbody></tbody>' +
	                        '</table>' +
	                    '</div>' +
	                    '<div id="upload-buttons" class="upload-buttons"/>' +
	                '</div>';
	    }
	});
	
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! underscore */ 1), __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 59 */
/*!**************************************************************!*\
  !*** ./galaxy/scripts/mvc/upload/composite/composite-row.js ***!
  \**************************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone, $) {// dependencies
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(/*! utils/utils */ 21),
	        __webpack_require__(/*! mvc/upload/upload-settings */ 53),
	        __webpack_require__(/*! mvc/upload/upload-ftp */ 56),
	        __webpack_require__(/*! mvc/ui/ui-popover */ 54),
	        __webpack_require__(/*! mvc/ui/ui-misc */ 22),
	        __webpack_require__(/*! mvc/ui/ui-select */ 55),
	        __webpack_require__(/*! utils/uploadbox */ 57)], __WEBPACK_AMD_DEFINE_RESULT__ = function(   Utils,
	                    UploadSettings,
	                    UploadFtp,
	                    Popover,
	                    Ui,
	                    Select
	                ) {
	
	// renders the composite upload row view
	return Backbone.View.extend({
	    // states
	    status_classes : {
	        init    : 'upload-mode fa fa-exclamation text-primary',
	        ready   : 'upload-mode fa fa-check text-success',
	        running : 'upload-mode fa fa-spinner fa-spin',
	        success : 'upload-mode fa fa-check',
	        error   : 'upload-mode fa fa-exclamation-triangle'
	    },
	
	    // initialize
	    initialize: function(app, options) {
	        // link app
	        this.app = app;
	
	        // link this
	        var self = this;
	
	        // create model
	        this.model = options.model;
	
	        // add upload row
	        this.setElement(this._template(options.model));
	
	        // build upload functions
	        this.uploadinput = this.$el.uploadinput({
	            ondragover: function() {
	                if (self.model.get('enabled')) {
	                    self.$el.addClass('warning');
	                }
	            },
	            ondragleave: function() {
	                self.$el.removeClass('warning');
	            },
	            onchange: function(files) {
	                if (self.model.get('status') != 'running' && files && files.length > 0) {
	                    self.model.reset({
	                        'file_data': files[0],
	                        'file_name': files[0].name,
	                        'file_size': files[0].size,
	                        'file_mode': files[0].mode || 'local'
	                    });
	                    self._refreshReady();
	                }
	            }
	        });
	
	        // source selection popup
	        this.button_menu = new Ui.ButtonMenu({
	            icon        : 'fa-caret-down',
	            title       : 'Select',
	            pull        : 'left'
	        });
	        this.$('#source').append(this.button_menu.$el);
	        this.button_menu.addMenu({
	            icon        : 'fa-laptop',
	            title       : 'Choose local file',
	            onclick     : function() {
	                self.uploadinput.dialog();
	            }
	        });
	        if (this.app.ftp_upload_site) {
	            this.button_menu.addMenu({
	                icon        : 'fa-folder-open-o',
	                title       : 'Choose FTP file',
	                onclick     : function() {
	                    self._showFtp();
	                }
	            });
	        }
	        this.button_menu.addMenu({
	            icon        : 'fa-edit',
	            title       : 'Paste/Fetch data',
	            onclick     : function() {
	                self.model.reset({
	                    'file_mode': 'new',
	                    'file_name': 'New File'
	                });
	            }
	        });
	
	        // add ftp file viewer
	        this.ftp = new Popover.View({
	            title       : 'Choose FTP file:',
	            container   : this.$('#source').find('.ui-button-menu'),
	            placement   : 'right'
	        });
	
	        // append popup to settings icon
	        this.settings = new Popover.View({
	            title       : 'Upload configuration',
	            container   : this.$('#settings'),
	            placement   : 'bottom'
	        });
	
	        //
	        // ui events
	        //
	
	        // handle text editing event
	        this.$('#text-content').on('change input', function(e) {
	            self.model.set('url_paste', $(e.target).val());
	            self.model.set('file_size', $(e.target).val().length);
	            self._refreshReady();
	        });
	
	        // handle settings popover
	        this.$('#settings').on('click' , function(e) { self._showSettings(); })
	                           .on('mousedown', function(e) { e.preventDefault(); });
	
	        //
	        // model events
	        //
	        this.model.on('change:percentage', function() {
	            self._refreshPercentage();
	        });
	        this.model.on('change:status', function() {
	            self._refreshStatus();
	        });
	        this.model.on('change:info', function() {
	            self._refreshInfo();
	        });
	        this.model.on('change:file_name', function() {
	            self._refreshFileName();
	        });
	        this.model.on('change:file_mode', function() {
	            self._refreshMode();
	        });
	        this.model.on('change:file_size', function() {
	            self._refreshFileSize();
	        });
	        this.model.on('remove', function() {
	            self.remove();
	        });
	        this.app.collection.on('reset', function() {
	            self.remove();
	        });
	    },
	
	    // render
	    render: function() {
	        this.$('#file_name').html(this.model.get('file_name') || '-');
	        this.$('#file_desc').html(this.model.get('file_desc') || 'Unavailable');
	        this.$('#file_size').html(Utils.bytesToString (this.model.get('file_size')));
	        this.$('#status').removeClass().addClass(this.status_classes.init);
	    },
	
	    // remove
	    remove: function() {
	        // call the base class remove method
	        Backbone.View.prototype.remove.apply(this);
	    },
	
	    //
	    // handle model events
	    //
	
	    // refresh ready or not states
	    _refreshReady: function() {
	        this.app.collection.each(function(model) {
	            model.set('status', (model.get('file_size') > 0) && 'ready' || 'init');
	        });
	    },
	
	    // refresh mode and e.g. show/hide textarea field
	    _refreshMode: function() {
	        var file_mode = this.model.get('file_mode');
	        if (file_mode == 'new') {
	            this.height = this.$el.height();
	            this.$('#text').css({
	                'width' : this.$el.width() - 16 + 'px',
	                'top'   : this.$el.height() - 8 + 'px'
	            }).show();
	            this.$el.height(this.$el.height() - 8 + this.$('#text').height() + 16);
	            this.$('#text-content').val('').trigger('keyup');
	        } else {
	            this.$el.height(this.height);
	            this.$('#text').hide();
	        }
	    },
	
	    // information
	    _refreshInfo: function() {
	        var info = this.model.get('info');
	        if (info) {
	            this.$('#info-text').html('<strong>Failed: </strong>' + info).show();
	        } else {
	            this.$('#info-text').hide();
	        }
	    },
	
	    // percentage
	    _refreshPercentage : function() {
	        var percentage = parseInt(this.model.get('percentage'));
	        if (percentage != 0) {
	            this.$('.progress-bar').css({ width : percentage + '%' });
	        } else {
	            this.$('.progress-bar').addClass('no-transition');
	            this.$('.progress-bar').css({ width : '0%' });
	            this.$('.progress-bar')[0].offsetHeight;
	            this.$('.progress-bar').removeClass('no-transition');
	        }
	        if (percentage != 100) {
	            this.$('#percentage').html(percentage + '%');
	        } else {
	            this.$('#percentage').html('Adding to history...');
	        }
	    },
	
	    // status
	    _refreshStatus : function() {
	        // identify new status
	        var status = this.model.get('status');
	
	        // identify symbol and reset classes
	        this.$('#status').removeClass().addClass(this.status_classes[status]);
	
	        // enable/disable model flag
	        this.model.set('enabled', status != 'running');
	
	        // enable/disable row fields
	        this.$('#text-content').attr('disabled', !this.model.get('enabled'));
	
	        // remove status classes
	        this.$el.removeClass('success danger warning');
	
	        // set status classes
	        if (status == 'running' || status == 'ready') {
	            this.model.set('percentage', 0);
	        }
	        if (status == 'running') {
	            this.$('#source').find('.button').addClass('disabled');
	        } else {
	            this.$('#source').find('.button').removeClass('disabled');
	        }
	        if (status == 'success') {
	            this.$el.addClass('success');
	            this.model.set('percentage', 100);
	            this.$('#percentage').html('100%');
	        }
	        if (status == 'error') {
	            this.$el.addClass('danger');
	            this.model.set('percentage', 0);
	            this.$('#info-progress').hide();
	            this.$('#info-text').show();
	        } else {
	            this.$('#info-progress').show();
	            this.$('#info-text').hide();
	        }
	    },
	
	    // file name
	    _refreshFileName: function() {
	        this.$('#file_name').html(this.model.get('file_name') || '-');
	    },
	
	    // file size
	    _refreshFileSize: function() {
	        this.$('#file_size').html(Utils.bytesToString (this.model.get('file_size')));
	    },
	
	    // show/hide ftp popup
	    _showFtp: function() {
	        if (!this.ftp.visible) {
	            this.ftp.empty();
	            var self = this;
	            this.ftp.append((new UploadFtp({
	                ftp_upload_site: this.app.ftp_upload_site,
	                onchange: function(ftp_file) {
	                    self.ftp.hide();
	                    if (self.model.get('status') != 'running' && ftp_file) {
	                        self.model.reset({
	                            'file_mode': 'ftp',
	                            'file_name': ftp_file.path,
	                            'file_size': ftp_file.size,
	                            'file_path': ftp_file.path
	                        });
	                        self._refreshReady();
	                    }
	                }
	            })).$el);
	            this.ftp.show();
	        } else {
	            this.ftp.hide();
	        }
	    },
	
	    // show/hide settings popup
	    _showSettings : function() {
	        if (!this.settings.visible) {
	            this.settings.empty();
	            this.settings.append((new UploadSettings(this)).$el);
	            this.settings.show();
	        } else {
	            this.settings.hide();
	        }
	    },
	
	    // template
	    _template: function(options) {
	        return  '<tr id="upload-row-' + options.id + '" class="upload-row">' +
	                    '<td>' +
	                        '<div id="source"/>' +
	                        '<div class="upload-text-column">' +
	                            '<div id="text" class="text">' +
	                                '<div class="text-info">You can tell Galaxy to download data from web by entering URL in this box (one per line). You can also directly paste the contents of a file.</div>' +
	                                '<textarea id="text-content" class="text-content form-control"/>' +
	                            '</div>' +
	                        '</div>' +
	                    '</td>' +
	                    '<td>' +
	                        '<div id="status"/>' +
	                    '</td>' +
	                    '<td>' +
	                        '<div id="file_desc" class="upload-title"/>' +
	                    '</td>' +
	                    '<td>' +
	                        '<div id="file_name" class="upload-title"/>' +
	                    '</td>' +
	                    '<td>' +
	                        '<div id="file_size" class="upload-size"/>' +
	                    '</td>' +
	                    '<td><div id="settings" class="upload-icon-button fa fa-gear"/></td>' +
	                    '<td>' +
	                        '<div id="info" class="upload-info">' +
	                            '<div id="info-text"/>' +
	                            '<div id="info-progress" class="progress">' +
	                                '<div class="progress-bar progress-bar-success"/>' +
	                                '<div id="percentage" class="percentage">0%</div>' +
	                            '</div>' +
	                        '</div>' +
	                    '</td>' +
	                '</tr>';
	    }
	});
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 60 */
/*!**********************************************!*\
  !*** ./galaxy/scripts/apps/history-panel.js ***!
  \**********************************************/
/***/ function(module, exports, __webpack_require__) {

	var RightPanel = __webpack_require__( /*! layout/panel */ 12 ).RightPanel,
	    Ui = __webpack_require__( /*! mvc/ui/ui-misc */ 22 ),
	    historyOptionsMenu = __webpack_require__( /*! mvc/history/options-menu */ 61 );
	    CurrentHistoryView = __webpack_require__( /*! mvc/history/history-view-edit-current */ 64 ).CurrentHistoryView,
	    _l = __webpack_require__( /*! utils/localization */ 7 );
	
	/** the right hand panel in the analysis page that shows the current history */
	var HistoryPanel = RightPanel.extend({
	
	    title : _l( 'History' ),
	
	    initialize : function( options ){
	        RightPanel.prototype.initialize.call( this, options );
	        var self = this;
	
	        // this button re-fetches the history and contents and re-renders the history panel
	        this.refreshButton = new Ui.ButtonLink({
	            id      : 'history-refresh-button',
	            title   : _l( 'Refresh history' ),
	            cls     : 'panel-header-button',
	            icon    : 'fa fa-refresh',
	            onclick : function() {
	                self.historyView.loadCurrentHistory();
	            }
	        });
	        // opens a drop down menu with history related functions (like view all, delete, share, etc.)
	        this.optionsButton = new Ui.ButtonLink({
	            id      : 'history-options-button',
	            title   : _l( 'History options' ),
	            cls     : 'panel-header-button',
	            icon    : 'fa fa-cog',
	        });
	        // goes to a page showing all the users histories in panel form (for logged in users)
	        this.viewMultiButton = null;
	        if( !options.userIsAnonymous ){
	            this.viewMultiButton = new Ui.ButtonLink({
	                id      : 'history-view-multi-button',
	                title   : _l( 'View all histories' ),
	                cls     : 'panel-header-button',
	                icon    : 'fa fa-columns',
	                href    : options.galaxyRoot + 'history/view_multiple'
	            });
	        }
	
	        // build history options menu
	        this.optionsMenu = historyOptionsMenu( this.optionsButton.$el, {
	            anonymous    : options.userIsAnonymous,
	            purgeAllowed : options.allow_user_dataset_purge,
	            root         : options.galaxyRoot
	        });
	
	        // view of the current history
	        this.historyView = new CurrentHistoryView({
	            purgeAllowed    : options.allow_user_dataset_purge,
	            linkTarget      : 'galaxy_main',
	            $scrollContainer: function(){ return this.$el.parent(); }
	        });
	    },
	
	    render : function(){
	        RightPanel.prototype.render.call( this );
	        this.$( '.unified-panel-header' ).addClass( 'history-panel-header' );
	        this.$( '.panel-header-buttons' ).append([
	            this.refreshButton.$el,
	            this.optionsButton.$el,
	            this.viewMultiButton? this.viewMultiButton.$el : null,
	        ]);
	        this.historyView
	            .setElement( this.$( '.history-panel' ) );
	            // causes blink/flash due to loadCurrentHistory rendering as well
	            // .render();
	    },
	
	    _templateBody : function( data ){
	        return [
	            '<div class="unified-panel-body unified-panel-body-background">',
	                '<div id="current-history-panel" class="history-panel"/>',
	            '</div>'
	        ].join('');
	    },
	
	    toString : function(){ return 'HistoryPanel'; }
	});
	
	module.exports = HistoryPanel;

/***/ },
/* 61 */
/*!****************************************************!*\
  !*** ./galaxy/scripts/mvc/history/options-menu.js ***!
  \****************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone, _) {!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	    __webpack_require__(/*! mvc/ui/popup-menu */ 62),
	    __webpack_require__(/*! mvc/history/copy-dialog */ 63),
	    __webpack_require__(/*! mvc/base-mvc */ 5),
	    __webpack_require__(/*! utils/localization */ 7)
	], __WEBPACK_AMD_DEFINE_RESULT__ = function( PopupMenu, historyCopyDialog, BASE_MVC, _l ){
	
	'use strict';
	
	// ============================================================================
	var menu = [
	    {
	        html    : _l( 'History Lists' ),
	        header  : true
	    },
	    {
	        html    : _l( 'Saved Histories' ),
	        href    : 'history/list',
	    },
	    {
	        html    : _l( 'Histories Shared with Me' ),
	        href    : 'history/list_shared'
	    },
	
	    {
	        html    : _l( 'History Actions' ),
	        header  : true,
	        anon    : true
	    },
	    {
	        html    : _l( 'Create New' ),
	        func    : function() {
	            if( Galaxy && Galaxy.currHistoryPanel ){
	                Galaxy.currHistoryPanel.createNewHistory();
	            }
	        },
	    },
	    {
	        html    : _l( 'Copy History' ),
	        func    : function() {
	            historyCopyDialog( Galaxy.currHistoryPanel.model )
	                .done( function(){
	                    Galaxy.currHistoryPanel.loadCurrentHistory();
	                });
	        },
	    },
	    {
	        html    : _l( 'Share or Publish' ),
	        href    : 'history/sharing',
	    },
	    {
	        html    : _l( 'Show Structure' ),
	        href    : 'history/display_structured',
	        anon    : true,
	    },
	    {
	        html    : _l( 'Extract Workflow' ),
	        href    : 'workflow/build_from_current_history',
	    },
	    {
	        html    : _l( 'Delete' ),
	        confirm : _l( 'Really delete the current history?' ),
	        href    : 'history/delete_current',
	    },
	    {
	        html    : _l( 'Delete Permanently' ),
	        confirm : _l( 'Really delete the current history permanently? This cannot be undone.' ),
	        href    : 'history/delete_current?purge=True',
	        purge   : true,
	        anon    : true,
	    },
	
	
	    {
	        html    : _l( 'Dataset Actions' ),
	        header  : true,
	        anon    : true
	    },
	    {
	        html    : _l( 'Copy Datasets' ),
	        href    : 'dataset/copy_datasets',
	    },
	    {
	        html    : _l( 'Dataset Security' ),
	        href    : 'root/history_set_default_permissions',
	    },
	    {
	        html    : _l( 'Resume Paused Jobs' ),
	        href    : 'history/resume_paused_jobs?current=True',
	        anon    : true,
	    },
	    {
	        html    : _l( 'Collapse Expanded Datasets' ),
	        func    : function() {
	            if( Galaxy && Galaxy.currHistoryPanel ){
	                Galaxy.currHistoryPanel.collapseAll();
	            }
	        },
	    },
	    {
	        html    : _l( 'Unhide Hidden Datasets' ),
	        anon    : true,
	        func    : function() {
	            if( Galaxy && Galaxy.currHistoryPanel && confirm( _l( 'Really unhide all hidden datasets?' ) ) ){
	                var filtered = Galaxy.currHistoryPanel.model.contents.hidden();
	                //TODO: batch
	                filtered.ajaxQueue( Backbone.Model.prototype.save, { visible : true })
	                    .done( function(){
	                        Galaxy.currHistoryPanel.renderItems();
	                    })
	                    .fail( function(){
	                        alert( 'There was an error unhiding the datasets' );
	                        console.error( arguments );
	                    });
	            }
	        },
	    },
	    {
	        html    : _l( 'Delete Hidden Datasets' ),
	        anon    : true,
	        func    : function() {
	            if( Galaxy && Galaxy.currHistoryPanel && confirm( _l( 'Really delete all hidden datasets?' ) ) ){
	                var filtered = Galaxy.currHistoryPanel.model.contents.hidden();
	                //TODO: batch
	                // both delete *and* unhide them
	                filtered.ajaxQueue( Backbone.Model.prototype.save, { deleted : true, visible: true })
	                    .done( function(){
	                        Galaxy.currHistoryPanel.renderItems();
	                    })
	                    .fail( function(){
	                        alert( 'There was an error deleting the datasets' );
	                        console.error( arguments );
	                    });
	            }
	        },
	    },
	    {
	        html    : _l( 'Purge Deleted Datasets' ),
	        confirm : _l( 'Really delete all deleted datasets permanently? This cannot be undone.' ),
	        href    : 'history/purge_deleted_datasets',
	        purge   : true,
	        anon    : true,
	    },
	
	
	    {
	        html    : _l( 'Downloads' ),
	        header  : true
	    },
	    {
	        html    : _l( 'Export Tool Citations' ),
	        href    : 'history/citations',
	        anon    : true,
	    },
	    {
	        html    : _l( 'Export History to File' ),
	        href    : 'history/export_archive?preview=True',
	        anon    : true,
	    },
	
	    {
	        html    : _l( 'Other Actions' ),
	        header  : true
	    },
	    {
	        html    : _l( 'Import from File' ),
	        href    : 'history/import_archive',
	    }
	];
	
	function buildMenu( isAnon, purgeAllowed, urlRoot ){
	    return _.clone( menu ).filter( function( menuOption ){
	        if( isAnon && !menuOption.anon ){
	            return false;
	        }
	        if( !purgeAllowed && menuOption.purge ){
	            return false;
	        }
	
	        //TODO:?? hard-coded galaxy_main
	        if( menuOption.href ){
	            menuOption.href = urlRoot + menuOption.href;
	            menuOption.target = 'galaxy_main';
	        }
	
	        if( menuOption.confirm ){
	            menuOption.func = function(){
	                if( confirm( menuOption.confirm ) ){
	                    galaxy_main.location = menuOption.href;
	                }
	            };
	        }
	        return true;
	    });
	}
	
	var create = function( $button, options ){
	    options = options || {};
	    var isAnon = options.anonymous === undefined? true : options.anonymous,
	        purgeAllowed = options.purgeAllowed || false,
	        menu = buildMenu( isAnon, purgeAllowed, Galaxy.root );
	    //console.debug( 'menu:', menu );
	    return new PopupMenu( $button, menu );
	};
	
	
	// ============================================================================
	    return create;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! underscore */ 1)))

/***/ },
/* 62 */
/*!*********************************************!*\
  !*** ./galaxy/scripts/mvc/ui/popup-menu.js ***!
  \*********************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone, $, _, jQuery) {!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	    //jquery
	    //backbone
	], __WEBPACK_AMD_DEFINE_RESULT__ = function(){
	// =============================================================================
	/**
	 * view for a popup menu
	 */
	var PopupMenu = Backbone.View.extend({
	//TODO: maybe better as singleton off the Galaxy obj
	    /** Cache the desired button element and options, set up the button click handler
	     *  NOTE: attaches this view as HTML/jQ data on the button for later use.
	     */
	    initialize: function( $button, options ){
	        // default settings
	        this.$button = $button;
	        if( !this.$button.size() ){
	            this.$button = $( '<div/>' );
	        }
	        this.options = options || [];
	        this.$button.data( 'popupmenu', this );
	
	        // set up button click -> open menu behavior
	        var menu = this;
	        this.$button.click( function( event ){
	            // if there's already a menu open, remove it
	            $( '.popmenu-wrapper' ).remove();
	            menu._renderAndShow( event );
	            return false;
	        });
	    },
	
	    // render the menu, append to the page body at the click position, and set up the 'click-away' handlers, show
	    _renderAndShow: function( clickEvent ){
	        this.render();
	        this.$el.appendTo( 'body' ).css( this._getShownPosition( clickEvent )).show();
	        this._setUpCloseBehavior();
	    },
	
	    // render the menu
	    // this menu doesn't attach itself to the DOM ( see _renderAndShow )
	    render: function(){
	        // render the menu body absolute and hidden, fill with template
	        this.$el.addClass( 'popmenu-wrapper' ).hide()
	            .css({ position : 'absolute' })
	            .html( this.template( this.$button.attr( 'id' ), this.options ));
	
	        // set up behavior on each link/anchor elem
	        if( this.options.length ){
	            var menu = this;
	            //precondition: there should be one option per li
	            this.$el.find( 'li' ).each( function( i, li ){
	                var option = menu.options[i];
	
	                // if the option has 'func', call that function when the anchor is clicked
	                if( option.func ){
	                    $( this ).children( 'a.popupmenu-option' ).click( function( event ){
	                        option.func.call( menu, event, option );
	                        // We must preventDefault otherwise clicking "cancel"
	                        // on a purge or something still navigates and causes
	                        // the action.
	                        event.preventDefault();
	                        // bubble up so that an option click will call the close behavior
	                    });
	                }
	            });
	        }
	        return this;
	    },
	
	    template : function( id, options ){
	        return [
	            '<ul id="', id, '-menu" class="dropdown-menu">', this._templateOptions( options ), '</ul>'
	        ].join( '' );
	    },
	
	    _templateOptions : function( options ){
	        if( !options.length ){
	            return '<li>(no options)</li>';
	        }
	        return _.map( options, function( option ){
	            if( option.divider ){
	                return '<li class="divider"></li>';
	            } else if( option.header ){
	                return [ '<li class="head"><a href="javascript:void(0);">', option.html, '</a></li>' ].join( '' );
	            }
	            var href   = option.href || 'javascript:void(0);',
	                target = ( option.target  )?( ' target="' + option.target + '"' ):( '' ),
	                check  = ( option.checked )?( '<span class="fa fa-check"></span>' ):( '' );
	            return [
	                '<li><a class="popupmenu-option" href="', href, '"', target, '>',
	                    check, option.html,
	                '</a></li>'
	            ].join( '' );
	        }).join( '' );
	    },
	
	    // get the absolute position/offset for the menu
	    _getShownPosition : function( clickEvent ){
	
	        // display menu horiz. centered on click...
	        var menuWidth = this.$el.width();
	        var x = clickEvent.pageX - menuWidth / 2 ;
	
	        // adjust to handle horiz. scroll and window dimensions ( draw entirely on visible screen area )
	        x = Math.min( x, $( document ).scrollLeft() + $( window ).width() - menuWidth - 5 );
	        x = Math.max( x, $( document ).scrollLeft() + 5 );
	        return {
	            top: clickEvent.pageY,
	            left: x
	        };
	    },
	
	    // bind an event handler to all available frames so that when anything is clicked
	    // the menu is removed from the DOM and the event handler unbinds itself
	    _setUpCloseBehavior: function(){
	        var menu = this;
	//TODO: alternately: focus hack, blocking overlay, jquery.blockui
	
	        // function to close popup and unbind itself
	        function closePopup( event ){
	            $( document ).off( 'click.close_popup' );
	            if( window.parent !== window ){
	                try {
	                    $( window.parent.document ).off( "click.close_popup" );
	                } catch( err ){}
	            } else {
	                try {
	                    $( 'iframe#galaxy_main' ).contents().off( "click.close_popup" );
	                } catch( err ){}
	            }
	            menu.remove();
	        }
	
	        $( 'html' ).one( "click.close_popup", closePopup );
	        if( window.parent !== window ){
	            try {
	                $( window.parent.document ).find( 'html' ).one( "click.close_popup", closePopup );
	            } catch( err ){}
	        } else {
	            try {
	                $( 'iframe#galaxy_main' ).contents().one( "click.close_popup", closePopup );
	            } catch( err ){}
	        }
	    },
	
	    // add a menu option/item at the given index
	    addItem: function( item, index ){
	        // append to end if no index
	        index = ( index >= 0 ) ? index : this.options.length;
	        this.options.splice( index, 0, item );
	        return this;
	    },
	
	    // remove a menu option/item at the given index
	    removeItem: function( index ){
	        if( index >=0 ){
	            this.options.splice( index, 1 );
	        }
	        return this;
	    },
	
	    // search for a menu option by its html
	    findIndexByHtml: function( html ){
	        for( var i = 0; i < this.options.length; i++ ){
	            if( _.has( this.options[i], 'html' ) && ( this.options[i].html === html )){
	                return i;
	            }
	        }
	        return null;
	    },
	
	    // search for a menu option by its html
	    findItemByHtml: function( html ){
	        return this.options[( this.findIndexByHtml( html ))];
	    },
	
	    // string representation
	    toString: function(){
	        return 'PopupMenu';
	    }
	});
	/** shortcut to new for when you don't need to preserve the ref */
	PopupMenu.create = function _create( $button, options ){
	    return new PopupMenu( $button, options );
	};
	
	// -----------------------------------------------------------------------------
	// the following class functions are bridges from the original make_popupmenu and make_popup_menus
	// to the newer backbone.js PopupMenu
	
	/** Create a PopupMenu from simple map initial_options activated by clicking button_element.
	 *      Converts initial_options to object array used by PopupMenu.
	 *  @param {jQuery|DOMElement} button_element element which, when clicked, activates menu
	 *  @param {Object} initial_options map of key -> values, where
	 *      key is option text, value is fn to call when option is clicked
	 *  @returns {PopupMenu} the PopupMenu created
	 */
	PopupMenu.make_popupmenu = function( button_element, initial_options ){
	    var convertedOptions = [];
	    _.each( initial_options, function( optionVal, optionKey ){
	        var newOption = { html: optionKey };
	
	        // keys with null values indicate: header
	        if( optionVal === null ){ // !optionVal? (null only?)
	            newOption.header = true;
	
	        // keys with function values indicate: a menu option
	        } else if( jQuery.type( optionVal ) === 'function' ){
	            newOption.func = optionVal;
	        }
	        //TODO:?? any other special optionVals?
	        // there was no divider option originally
	        convertedOptions.push( newOption );
	    });
	    return new PopupMenu( $( button_element ), convertedOptions );
	};
	
	/** Find all anchors in $parent (using selector) and covert anchors into a PopupMenu options map.
	 *  @param {jQuery} $parent the element that contains the links to convert to options
	 *  @param {String} selector jq selector string to find links
	 *  @returns {Object[]} the options array to initialize a PopupMenu
	 */
	//TODO: lose parent and selector, pass in array of links, use map to return options
	PopupMenu.convertLinksToOptions = function( $parent, selector ){
	    $parent = $( $parent );
	    selector = selector || 'a';
	    var options = [];
	    $parent.find( selector ).each( function( elem, i ){
	        var option = {}, $link = $( elem );
	
	        // convert link text to the option text (html) and the href into the option func
	        option.html = $link.text();
	        if( $link.attr( 'href' ) ){
	            var linkHref    = $link.attr( 'href' ),
	                linkTarget  = $link.attr( 'target' ),
	                confirmText = $link.attr( 'confirm' );
	
	            option.func = function(){
	                // if there's a "confirm" attribute, throw up a confirmation dialog, and
	                //  if the user cancels - do nothing
	                if( ( confirmText ) && ( !confirm( confirmText ) ) ){ return; }
	
	                // if there's no confirm attribute, or the user accepted the confirm dialog:
	                switch( linkTarget ){
	                    // relocate the center panel
	                    case '_parent':
	                        window.parent.location = linkHref;
	                        break;
	
	                    // relocate the entire window
	                    case '_top':
	                        window.top.location = linkHref;
	                        break;
	
	                    // relocate this panel
	                    default:
	                        window.location = linkHref;
	                }
	            };
	        }
	        options.push( option );
	    });
	    return options;
	};
	
	/** Create a single popupmenu from existing DOM button and anchor elements
	 *  @param {jQuery} $buttonElement the element that when clicked will open the menu
	 *  @param {jQuery} $menuElement the element that contains the anchors to convert into a menu
	 *  @param {String} menuElementLinkSelector jq selector string used to find anchors to be made into menu options
	 *  @returns {PopupMenu} the PopupMenu (Backbone View) that can render, control the menu
	 */
	PopupMenu.fromExistingDom = function( $buttonElement, $menuElement, menuElementLinkSelector ){
	    $buttonElement = $( $buttonElement );
	    $menuElement = $( $menuElement );
	    var options = PopupMenu.convertLinksToOptions( $menuElement, menuElementLinkSelector );
	    // we're done with the menu (having converted it to an options map)
	    $menuElement.remove();
	    return new PopupMenu( $buttonElement, options );
	};
	
	/** Create all popupmenus within a document or a more specific element
	 *  @param {DOMElement} parent the DOM element in which to search for popupmenus to build (defaults to document)
	 *  @param {String} menuSelector jq selector string to find popupmenu menu elements (defaults to "div[popupmenu]")
	 *  @param {Function} buttonSelectorBuildFn the function to build the jq button selector.
	 *      Will be passed $menuElement, parent.
	 *      (Defaults to return '#' + $menuElement.attr( 'popupmenu' ); )
	 *  @returns {PopupMenu[]} array of popupmenus created
	 */
	PopupMenu.make_popup_menus = function( parent, menuSelector, buttonSelectorBuildFn ){
	    parent = parent || document;
	    // orig. Glx popupmenu menus have a (non-std) attribute 'popupmenu'
	    //  which contains the id of the button that activates the menu
	    menuSelector = menuSelector || 'div[popupmenu]';
	    // default to (orig. Glx) matching button to menu by using the popupmenu attr of the menu as the id of the button
	    buttonSelectorBuildFn = buttonSelectorBuildFn || function( $menuElement, parent ){
	        return '#' + $menuElement.attr( 'popupmenu' );
	    };
	
	    // aggregate and return all PopupMenus
	    var popupMenusCreated = [];
	    $( parent ).find( menuSelector ).each( function(){
	        var $menuElement    = $( this ),
	            $buttonElement  = $( parent ).find( buttonSelectorBuildFn( $menuElement, parent ) );
	        popupMenusCreated.push( PopupMenu.fromDom( $buttonElement, $menuElement ) );
	        $buttonElement.addClass( 'popup' );
	    });
	    return popupMenusCreated;
	};
	
	
	// =============================================================================
	    return PopupMenu;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! jquery */ 3), __webpack_require__(/*! underscore */ 1), __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 63 */
/*!***************************************************!*\
  !*** ./galaxy/scripts/mvc/history/copy-dialog.js ***!
  \***************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(_, jQuery, $) {!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	    __webpack_require__(/*! mvc/ui/ui-modal */ 17),
	    __webpack_require__(/*! utils/localization */ 7)
	], __WEBPACK_AMD_DEFINE_RESULT__ = function( MODAL, _l ){
	
	'use strict';
	
	//==============================================================================
	/**
	 * A dialog/modal that allows copying a user history or 'importing' from user
	 * another. Generally called via historyCopyDialog below.
	 * @type {Object}
	 */
	var CopyDialog = {
	
	    // language related strings/fns
	    defaultName     : _.template( "Copy of '<%- name %>'" ),
	    title           : _.template( _l( 'Copying history' ) + ' "<%- name %>"' ),
	    submitLabel     : _l( 'Copy' ),
	    errorMessage    : _l( 'History could not be copied' ),
	    progressive     : _l( 'Copying history' ),
	    activeLabel     : _l( 'Copy only the active, non-deleted datasets' ),
	    allLabel        : _l( 'Copy all datasets including deleted ones' ),
	    anonWarning     : _l( 'As an anonymous user, unless you login or register, you will lose your current history ' ) +
	                      _l( 'after copying this history. ' ),
	
	    // template for modal body
	    _template : _.template([
	        //TODO: remove inline styles
	        // show a warning message for losing current to anon users
	        '<% if( isAnon ){ %>',
	            '<div class="warningmessage">',
	                '<%- anonWarning %>',
	                _l( 'You can' ),
	                ' <a href="/user/login">', _l( 'login here' ), '</a> ', _l( 'or' ), ' ',
	                ' <a href="/user/create">', _l( 'register here' ), '</a>.',
	            '</div>',
	        '<% } %>',
	        '<form>',
	            '<label for="copy-modal-title">',
	                _l( 'Enter a title for the new history' ), ':',
	            '</label><br />',
	            // TODO: could use required here and the form validators
	            // NOTE: use unescaped here if escaped in the modal function below
	            '<input id="copy-modal-title" class="form-control" style="width: 100%" value="<%= name %>" />',
	            '<p class="invalid-title bg-danger" style="color: red; margin: 8px 0px 8px 0px; display: none">',
	                _l( 'Please enter a valid history title' ),
	            '</p>',
	            // if allowAll, add the option to copy deleted datasets, too
	            '<% if( allowAll ){ %>',
	                '<br />',
	                '<p>', _l( 'Choose which datasets from the original history to include:' ), '</p>',
	                // copy non-deleted is the default
	                '<input name="copy-what" type="radio" id="copy-non-deleted" value="copy-non-deleted" ',
	                    '<% if( copyWhat === "copy-non-deleted" ){ print( "checked" ); } %>/>',
	                '<label for="copy-non-deleted"> <%- activeLabel %></label>',
	                '<br />',
	                '<input name="copy-what" type="radio" id="copy-all" value="copy-all" ',
	                    '<% if( copyWhat === "copy-all" ){ print( "checked" ); } %>/>',
	                '<label for="copy-all"> <%- allLabel %></label>',
	            '<% } %>',
	        '</form>'
	    ].join( '' )),
	
	    // empty modal body and let the user know the copy is happening
	    _showAjaxIndicator : function _showAjaxIndicator(){
	        var indicator = '<p><span class="fa fa-spinner fa-spin"></span> ' + this.progressive + '...</p>';
	        this.modal.$( '.modal-body' ).empty().append( indicator ).css({ 'margin-top': '8px' });
	    },
	
	    // (sorta) public interface - display the modal, render the form, and potentially copy the history
	    // returns a jQuery.Deferred done->history copied, fail->user cancelled
	    dialog : function _dialog( modal, history, options ){
	        options = options || {};
	
	        var dialog = this,
	            deferred = jQuery.Deferred(),
	            // TODO: getting a little byzantine here
	            defaultCopyNameFn = options.nameFn || this.defaultName,
	            defaultCopyName = defaultCopyNameFn({ name: history.get( 'name' ) }),
	            // TODO: these two might be simpler as one 3 state option (all,active,no-choice)
	            defaultCopyWhat = options.allDatasets? 'copy-all' : 'copy-non-deleted',
	            allowAll = !_.isUndefined( options.allowAll )? options.allowAll : true,
	            autoClose = !_.isUndefined( options.autoClose )? options.autoClose : true;
	
	        this.modal = modal;
	
	
	        // validate the name and copy if good
	        function checkNameAndCopy(){
	            var name = modal.$( '#copy-modal-title' ).val();
	            if( !name ){
	                modal.$( '.invalid-title' ).show();
	                return;
	            }
	            // get further settings, shut down and indicate the ajax call, then hide and resolve/reject
	            var copyAllDatasets = modal.$( 'input[name="copy-what"]:checked' ).val() === 'copy-all';
	            modal.$( 'button' ).prop( 'disabled', true );
	            dialog._showAjaxIndicator();
	            history.copy( true, name, copyAllDatasets )
	                .done( function( response ){
	                    deferred.resolve( response );
	                })
	                //TODO: make this unneccessary with pub-sub error or handling via Galaxy
	                .fail( function(){
	                    alert([ dialog.errorMessage, _l( 'Please contact a Galaxy administrator' ) ].join( '. ' ));
	                    deferred.rejectWith( deferred, arguments );
	                })
	                .always( function(){
	                    if( autoClose ){ modal.hide(); }
	                });
	        }
	
	        var originalClosingCallback = options.closing_callback;
	        modal.show( _.extend( options, {
	            title   : this.title({ name: history.get( 'name' ) }),
	            body    : $( dialog._template({
	                    name        : defaultCopyName,
	                    isAnon      : Galaxy.user.isAnonymous(),
	                    allowAll    : allowAll,
	                    copyWhat    : defaultCopyWhat,
	                    activeLabel : this.activeLabel,
	                    allLabel    : this.allLabel,
	                    anonWarning : this.anonWarning,
	                })),
	            buttons : _.object([
	                    [ _l( 'Cancel' ),   function(){ modal.hide(); } ],
	                    [ this.submitLabel, checkNameAndCopy ]
	                ]),
	            height          : 'auto',
	            closing_events  : true,
	            closing_callback: function _historyCopyClose( cancelled ){
	                    if( cancelled ){
	                        deferred.reject({ cancelled : true });
	                    }
	                    if( originalClosingCallback ){
	                        originalClosingCallback( cancelled );
	                    }
	                }
	            }));
	
	        // set the default dataset copy, autofocus the title, and set up for a simple return
	        modal.$( '#copy-modal-title' ).focus().select();
	        modal.$( '#copy-modal-title' ).on( 'keydown', function( ev ){
	            if( ev.keyCode === 13 ){
	                ev.preventDefault();
	                checkNameAndCopy();
	            }
	        });
	
	        return deferred;
	    },
	};
	
	//==============================================================================
	// maintain the (slight) distinction between copy and import
	/**
	 * Subclass CopyDialog to use the import language.
	 */
	var ImportDialog = _.extend( {}, CopyDialog, {
	    defaultName     : _.template( "imported: <%- name %>" ),
	    title           : _.template( _l( 'Importing history' ) + ' "<%- name %>"' ),
	    submitLabel     : _l( 'Import' ),
	    errorMessage    : _l( 'History could not be imported' ),
	    progressive     : _l( 'Importing history' ),
	    activeLabel     : _l( 'Import only the active, non-deleted datasets' ),
	    allLabel        : _l( 'Import all datasets including deleted ones' ),
	    anonWarning     : _l( 'As an anonymous user, unless you login or register, you will lose your current history ' ) +
	                      _l( 'after importing this history. ' ),
	
	});
	
	//==============================================================================
	/**
	 * Main interface for both history import and history copy dialogs.
	 * @param  {Backbone.Model} history     the history to copy
	 * @param  {Object}         options     a hash
	 * @return {jQuery.Deferred}            promise that fails on close and succeeds on copy
	 *
	 * options:
	 *     (this object is also passed to the modal used to display the dialog and accepts modal options)
	 *     {Function} nameFn    if defined, use this to build the default name shown to the user
	 *                          (the fn is passed: {name: <original history's name>})
	 *     {bool} useImport     if true, use the 'import' language (instead of Copy)
	 *     {bool} allowAll      if true, allow the user to choose between copying all datasets and
	 *                          only non-deleted datasets
	 *     {String} allDatasets default initial checked radio button: 'copy-all' or 'copy-non-deleted',
	 */
	var historyCopyDialog = function( history, options ){
	    options = options || {};
	    // create our own modal if Galaxy doesn't have one (mako tab without use_panels)
	    var modal = window.parent.Galaxy.modal || new MODAL.View({});
	    return options.useImport?
	        ImportDialog.dialog( modal, history, options ):
	        CopyDialog.dialog( modal, history, options );
	};
	
	
	//==============================================================================
	    return historyCopyDialog;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! underscore */ 1), __webpack_require__(/*! jquery */ 3), __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 64 */
/*!*****************************************************************!*\
  !*** ./galaxy/scripts/mvc/history/history-view-edit-current.js ***!
  \*****************************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(_, jQuery, $) {!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	    __webpack_require__(/*! mvc/history/history-model */ 65),
	    __webpack_require__(/*! mvc/history/history-view-edit */ 73),
	    __webpack_require__(/*! mvc/base-mvc */ 5),
	    __webpack_require__(/*! utils/localization */ 7)
	], __WEBPACK_AMD_DEFINE_RESULT__ = function( HISTORY_MODEL, HISTORY_VIEW_EDIT, BASE_MVC, _l ){
	
	'use strict';
	
	// ============================================================================
	/** session storage for history panel preferences (and to maintain state)
	 */
	var HistoryViewPrefs = BASE_MVC.SessionStorageModel.extend(
	/** @lends HistoryViewPrefs.prototype */{
	    defaults : {
	        /** should the tags editor be shown or hidden initially? */
	        tagsEditorShown : false,
	        /** should the annotation editor be shown or hidden initially? */
	        annotationEditorShown : false,
	        ///** what is the currently focused content (dataset or collection) in the current history?
	        // *      (the history panel will highlight and scroll to the focused content view)
	        // */
	        //focusedContentId : null
	        /** Current scroll position */
	        scrollPosition : 0
	    },
	    toString : function(){
	        return 'HistoryViewPrefs(' + JSON.stringify( this.toJSON() ) + ')';
	    }
	});
	
	/** key string to store panel prefs (made accessible on class so you can access sessionStorage directly) */
	HistoryViewPrefs.storageKey = function storageKey(){
	    return ( 'history-panel' );
	};
	
	/* =============================================================================
	TODO:
	
	============================================================================= */
	var _super = HISTORY_VIEW_EDIT.HistoryViewEdit;
	// used in root/index.mako
	/** @class View/Controller for the user's current history model as used in the history
	 *      panel (current right hand panel) of the analysis page.
	 *
	 *  The only history panel that:
	 *      will poll for updates.
	 *      displays datasets in reverse hid order.
	 */
	var CurrentHistoryView = _super.extend(
	/** @lends CurrentHistoryView.prototype */{
	
	    /** logger used to record this.log messages, commonly set to console */
	    //logger              : console,
	
	    className           : _super.prototype.className + ' current-history-panel',
	
	    emptyMsg            : _l( "This history is empty. Click 'Get Data' on the left tool menu to start" ),
	    noneFoundMsg        : _l( "No matching datasets found" ),
	
	    /**  */
	    HDCAViewClass       : _super.prototype.HDCAViewClass.extend({
	        foldoutStyle : 'drilldown'
	    }),
	
	    // ......................................................................... SET UP
	    /** Set up the view, set up storage, bind listeners to HistoryContents events */
	    initialize : function( attributes ){
	        attributes = attributes || {};
	
	        // ---- persistent preferences
	        /** maintain state / preferences over page loads */
	        this.preferences = new HistoryViewPrefs( _.extend({
	            id : HistoryViewPrefs.storageKey()
	        }, _.pick( attributes, _.keys( HistoryViewPrefs.prototype.defaults ) )));
	
	        _super.prototype.initialize.call( this, attributes );
	
	        /** sub-views that will overlay this panel (collections) */
	        this.panelStack = [];
	
	        /** id of currently focused content */
	        this.currentContentId = attributes.currentContentId || null;
	        //NOTE: purposely not sent to localstorage since panel recreation roughly lines up with a reset of this value
	    },
	
	    /** Override to cache the current scroll position with a listener */
	    _setUpListeners : function(){
	        _super.prototype._setUpListeners.call( this );
	
	        var panel = this;
	        // reset scroll position when there's a new history
	        this.on( 'new-model', function(){
	            panel.preferences.set( 'scrollPosition', 0 );
	        });
	    },
	
	    // ------------------------------------------------------------------------ loading history/item models
	    /** (re-)loads the user's current history & contents w/ details */
	    loadCurrentHistory : function( attributes ){
	        this.debug( this + '.loadCurrentHistory' );
	        // implemented as a 'fresh start' or for when there is no model (intial panel render)
	        var panel = this;
	        return this.loadHistoryWithDetails( 'current', attributes )
	            .then(function( historyData, contentsData ){
	                panel.trigger( 'current-history', panel );
	            });
	    },
	
	    /** loads a history & contents w/ details and makes them the current history */
	    switchToHistory : function( historyId, attributes ){
	        //this.info( 'switchToHistory:', historyId, attributes );
	        var panel = this,
	            historyFn = function(){
	                // make this current and get history data with one call
	                return jQuery.getJSON( Galaxy.root + 'history/set_as_current?id=' + historyId  );
	                //    method  : 'PUT'
	                //});
	            };
	        return this.loadHistoryWithDetails( historyId, attributes, historyFn )
	            .then( function( historyData, contentsData ){
	                panel.trigger( 'switched-history', panel );
	            });
	    },
	
	    /** creates a new history on the server and sets it as the user's current history */
	    createNewHistory : function( attributes ){
	        if( !Galaxy || !Galaxy.user || Galaxy.user.isAnonymous() ){
	            this.displayMessage( 'error', _l( 'You must be logged in to create histories' ) );
	            return $.when();
	        }
	        var panel = this,
	            historyFn = function(){
	                // create a new history and save: the server will return the proper JSON
	                return jQuery.getJSON( Galaxy.root + 'history/create_new_current'  );
	            };
	
	        // id undefined bc there is no historyId yet - the server will provide
	        //  (no need for details - nothing expanded in new history)
	        return this.loadHistory( undefined, attributes, historyFn )
	            .then(function( historyData, contentsData ){
	                panel.trigger( 'new-history', panel );
	            });
	    },
	
	    /** release/free/shutdown old models and set up panel for new models */
	    setModel : function( model, attributes, render ){
	        _super.prototype.setModel.call( this, model, attributes, render );
	        if( this.model ){
	            this.log( 'checking for updates' );
	            this.model.checkForUpdates();
	        }
	        return this;
	    },
	
	    // ------------------------------------------------------------------------ history/content event listening
	    /** listening for collection events */
	    _setUpCollectionListeners : function(){
	        _super.prototype._setUpCollectionListeners.call( this );
	
	        //TODO:?? may not be needed? see history-view-edit, 369
	        // if a hidden item is created (gen. by a workflow), moves thru the updater to the ready state,
	        //  then: remove it from the collection if the panel is set to NOT show hidden datasets
	        this.listenTo( this.collection, 'state:ready', function( model, newState, oldState ){
	            if( ( !model.get( 'visible' ) )
	            &&  ( !this.storage.get( 'show_hidden' ) ) ){
	                this.removeItemView( model );
	            }
	        });
	    },
	
	    /** listening for history events */
	    _setUpModelListeners : function(){
	        _super.prototype._setUpModelListeners.call( this );
	        // ---- history
	        // re-broadcast any model change events so that listeners don't have to re-bind to each history
	        this.listenTo( this.model, 'change:nice_size change:size', function(){
	            this.trigger( 'history-size-change', this, this.model, arguments );
	        }, this );
	    },
	
	    // ------------------------------------------------------------------------ panel rendering
	    /** override to add a handler to capture the scroll position when the parent scrolls */
	    _setUpBehaviors : function( $where ){
	        $where = $where || this.$el;
	        // we need to call this in _setUpBehaviors which is called after render since the $el
	        // may not be attached to $el.parent and $scrollContainer() may not work
	        var panel = this;
	        _super.prototype._setUpBehaviors.call( panel, $where );
	
	        // cache the handler to remove and re-add so we don't pile up the handlers
	        if( !this._debouncedScrollCaptureHandler ){
	            this._debouncedScrollCaptureHandler = _.debounce( function scrollCapture(){
	                // cache the scroll position (only if visible)
	                if( panel.$el.is( ':visible' ) ){
	                    panel.preferences.set( 'scrollPosition', $( this ).scrollTop() );
	                }
	            }, 40 );
	        }
	
	        panel.$scrollContainer()
	            .off( 'scroll', this._debouncedScrollCaptureHandler )
	            .on( 'scroll', this._debouncedScrollCaptureHandler );
	        return panel;
	    },
	
	    /** In this override, handle null models and move the search input to the top */
	    _buildNewRender : function(){
	        if( !this.model ){ return $(); }
	        var $newRender = _super.prototype._buildNewRender.call( this );
	        //TODO: hacky
	        $newRender.find( '.search' ).prependTo( $newRender.find( '.controls' ) );
	        this._renderQuotaMessage( $newRender );
	        return $newRender;
	    },
	
	    /** render the message displayed when a user is over quota and can't run jobs */
	    _renderQuotaMessage : function( $whereTo ){
	        $whereTo = $whereTo || this.$el;
	        return $( this.templates.quotaMsg( {}, this ) ).prependTo( $whereTo.find( '.messages' ) );
	    },
	
	    /** In this override, add links to open data uploader or get data in the tools section */
	    _renderEmptyMessage : function( $whereTo ){
	        var panel = this,
	            $emptyMsg = panel.$emptyMessage( $whereTo ),
	            $toolMenu = $( '.toolMenuContainer' );
	
	        if( ( _.isEmpty( panel.views ) && !panel.searchFor )
	        &&  ( Galaxy && Galaxy.upload && $toolMenu.size() ) ){
	            $emptyMsg.empty();
	
	            $emptyMsg.html([
	                _l( 'This history is empty' ), '. ', _l( 'You can ' ),
	                '<a class="uploader-link" href="javascript:void(0)">',
	                    _l( 'load your own data' ),
	                '</a>',
	                _l( ' or ' ), '<a class="get-data-link" href="javascript:void(0)">',
	                    _l( 'get data from an external source' ),
	                '</a>'
	            ].join('') );
	            $emptyMsg.find( '.uploader-link' ).click( function( ev ){
	                Galaxy.upload.show( ev );
	            });
	            $emptyMsg.find( '.get-data-link' ).click( function( ev ){
	                $toolMenu.parent().scrollTop( 0 );
	                $toolMenu.find( 'span:contains("Get Data")' )
	                    .click();
	                    //.fadeTo( 200, 0.1, function(){
	                    //    this.debug( this )
	                    //    $( this ).fadeTo( 200, 1.0 );
	                    //});
	            });
	            return $emptyMsg.show();
	        }
	        return _super.prototype._renderEmptyMessage.call( this, $whereTo );
	    },
	
	    /** In this override, get and set current panel preferences when editor is used */
	    _renderTags : function( $where ){
	        var panel = this;
	        // render tags and show/hide based on preferences
	        _super.prototype._renderTags.call( panel, $where );
	        if( panel.preferences.get( 'tagsEditorShown' ) ){
	            panel.tagsEditor.toggle( true );
	        }
	        // store preference when shown or hidden
	        panel.listenTo( panel.tagsEditor, 'hiddenUntilActivated:shown hiddenUntilActivated:hidden',
	            function( tagsEditor ){
	                panel.preferences.set( 'tagsEditorShown', tagsEditor.hidden );
	            }
	        );
	    },
	
	    /** In this override, get and set current panel preferences when editor is used */
	    _renderAnnotation : function( $where ){
	        var panel = this;
	        // render annotation and show/hide based on preferences
	        _super.prototype._renderAnnotation.call( panel, $where );
	        if( panel.preferences.get( 'annotationEditorShown' ) ){
	            panel.annotationEditor.toggle( true );
	        }
	        // store preference when shown or hidden
	        panel.listenTo( panel.annotationEditor, 'hiddenUntilActivated:shown hiddenUntilActivated:hidden',
	            function( annotationEditor ){
	                panel.preferences.set( 'annotationEditorShown', annotationEditor.hidden );
	            }
	        );
	    },
	
	    /** Override to scroll to cached position (in prefs) after swapping */
	    _swapNewRender : function( $newRender ){
	        _super.prototype._swapNewRender.call( this, $newRender );
	        var panel = this;
	        _.delay( function(){
	            var pos = panel.preferences.get( 'scrollPosition' );
	            if( pos ){
	                panel.scrollTo( pos, 0 );
	            }
	        }, 10 );
	        //TODO: is this enough of a delay on larger histories?
	
	        return this;
	    },
	
	    // ------------------------------------------------------------------------ sub-views
	    /** Override to add the current-content highlight class to currentContentId's view */
	    _attachItems : function( $whereTo ){
	        _super.prototype._attachItems.call( this, $whereTo );
	        var panel = this;
	        if( panel.currentContentId ){
	            panel._setCurrentContentById( panel.currentContentId );
	        }
	        return this;
	    },
	
	    /** Override to remove any drill down panels */
	    addItemView : function( model, collection, options ){
	        var view = _super.prototype.addItemView.call( this, model, collection, options );
	        if( !view ){ return view; }
	        if( this.panelStack.length ){ return this._collapseDrilldownPanel(); }
	        return view;
	    },
	
	    // ------------------------------------------------------------------------ collection sub-views
	    /** In this override, add/remove expanded/collapsed model ids to/from web storage */
	    _setUpItemViewListeners : function( view ){
	        var panel = this;
	        _super.prototype._setUpItemViewListeners.call( panel, view );
	
	        // use pub-sub to: handle drilldown expansion and collapse
	        panel.listenTo( view, 'expanded:drilldown', function( v, drilldown ){
	            this._expandDrilldownPanel( drilldown );
	        });
	        panel.listenTo( view, 'collapsed:drilldown', function( v, drilldown ){
	            this._collapseDrilldownPanel( drilldown );
	        });
	
	        // when content is manipulated, make it the current-content
	        // view.on( 'visualize', function( v, ev ){
	        //     this.setCurrentContent( v );
	        // }, this );
	
	        return this;
	    },
	
	    /** display 'current content': add a visible highlight and store the id of a content item */
	    setCurrentContent : function( view ){
	        this.$( '.history-content.current-content' ).removeClass( 'current-content' );
	        if( view ){
	            view.$el.addClass( 'current-content' );
	            this.currentContentId = view.model.id;
	        } else {
	            this.currentContentId = null;
	        }
	    },
	
	    /** find the view with the id and then call setCurrentContent on it */
	    _setCurrentContentById : function( id ){
	        var view = this.viewFromModelId( id ) || null;
	        this.setCurrentContent( view );
	    },
	
	    /** Handle drill down by hiding this panels list and controls and showing the sub-panel */
	    _expandDrilldownPanel : function( drilldown ){
	        this.panelStack.push( drilldown );
	        // hide this panel's controls and list, set the name for back navigation, and attach to the $el
	        this.$( '> .controls' ).add( this.$list() ).hide();
	        drilldown.parentName = this.model.get( 'name' );
	        this.$el.append( drilldown.render().$el );
	    },
	
	    /** Handle drilldown close by freeing the panel and re-rendering this panel */
	    _collapseDrilldownPanel : function( drilldown ){
	        this.panelStack.pop();
	//TODO: MEM: free the panel
	        this.render();
	    },
	
	    // ........................................................................ external objects/MVC
	    listenToGalaxy : function( galaxy ){
	        // TODO: MEM: questionable reference island / closure practice
	        this.listenTo( galaxy, 'galaxy_main:load', function( data ){
	            var pathToMatch = data.fullpath,
	                useToURLRegexMap = {
	                    'display'       : /datasets\/([a-f0-9]+)\/display/,
	                    'edit'          : /datasets\/([a-f0-9]+)\/edit/,
	                    'report_error'  : /dataset\/errors\?id=([a-f0-9]+)/,
	                    'rerun'         : /tool_runner\/rerun\?id=([a-f0-9]+)/,
	                    'show_params'   : /datasets\/([a-f0-9]+)\/show_params/,
	                    // no great way to do this here? (leave it in the dataset event handlers above?)
	                    // 'visualization' : 'visualization',
	                },
	                hdaId = null,
	                hdaUse = null;
	            _.find( useToURLRegexMap, function( regex, use ){
	                var match = pathToMatch.match( regex );
	                if( match && match.length == 2 ){
	                    hdaId = match[1];
	                    hdaUse = use;
	                    return true;
	                }
	                return false;
	            });
	            // need to type mangle to go from web route to history contents
	            hdaId = 'dataset-' + hdaId;
	            this._setCurrentContentById( hdaId );
	        });
	    },
	
	//TODO: remove quota meter from panel and remove this
	    /** add listeners to an external quota meter (mvc/user/user-quotameter.js) */
	    connectToQuotaMeter : function( quotaMeter ){
	        if( !quotaMeter ){
	            return this;
	        }
	        // show/hide the 'over quota message' in the history when the meter tells it to
	        this.listenTo( quotaMeter, 'quota:over',  this.showQuotaMessage );
	        this.listenTo( quotaMeter, 'quota:under', this.hideQuotaMessage );
	
	        // having to add this to handle re-render of hview while overquota (the above do not fire)
	        this.on( 'rendered rendered:initial', function(){
	            if( quotaMeter && quotaMeter.isOverQuota() ){
	                this.showQuotaMessage();
	            }
	        });
	        return this;
	    },
	
	//TODO: this seems more like a per user message than a history message; IOW, this doesn't belong here
	    /** Override to preserve the quota message */
	    clearMessages : function( ev ){
	        var $target = !_.isUndefined( ev )?
	            $( ev.currentTarget )
	            :this.$messages().children( '[class$="message"]' );
	        $target = $target.not( '.quota-message' );
	        $target.fadeOut( this.fxSpeed, function(){
	            $( this ).remove();
	        });
	        return this;
	    },
	
	    /** Show the over quota message (which happens to be in the history panel).
	     */
	    showQuotaMessage : function(){
	        var $msg = this.$( '.quota-message' );
	        if( $msg.is( ':hidden' ) ){ $msg.slideDown( this.fxSpeed ); }
	    },
	
	//TODO: this seems more like a per user message than a history message
	    /** Hide the over quota message (which happens to be in the history panel).
	     */
	    hideQuotaMessage : function(){
	        var $msg = this.$( '.quota-message' );
	        if( !$msg.is( ':hidden' ) ){ $msg.slideUp( this.fxSpeed ); }
	    },
	
	    /** Return a string rep of the history
	     */
	    toString    : function(){
	        return 'CurrentHistoryView(' + (( this.model )?( this.model.get( 'name' )):( '' )) + ')';
	    }
	});
	
	
	//------------------------------------------------------------------------------ TEMPLATES
	CurrentHistoryView.prototype.templates = (function(){
	
	    var quotaMsgTemplate = BASE_MVC.wrapTemplate([
	        '<div class="quota-message errormessage">',
	            _l( 'You are over your disk quota' ), '. ',
	            _l( 'Tool execution is on hold until your disk usage drops below your allocated quota' ), '.',
	        '</div>'
	    ], 'history' );
	    return _.extend( _.clone( _super.prototype.templates ), {
	        quotaMsg : quotaMsgTemplate
	    });
	
	}());
	
	
	//==============================================================================
	    return {
	        CurrentHistoryView        : CurrentHistoryView
	    };
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! underscore */ 1), __webpack_require__(/*! jquery */ 3), __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 65 */
/*!*****************************************************!*\
  !*** ./galaxy/scripts/mvc/history/history-model.js ***!
  \*****************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone, jQuery, _) {
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	    __webpack_require__(/*! mvc/history/history-contents */ 66),
	    __webpack_require__(/*! utils/utils */ 21),
	    __webpack_require__(/*! mvc/base-mvc */ 5),
	    __webpack_require__(/*! utils/localization */ 7)
	], __WEBPACK_AMD_DEFINE_RESULT__ = function( HISTORY_CONTENTS, UTILS, BASE_MVC, _l ){
	
	'use strict';
	
	var logNamespace = 'history';
	//==============================================================================
	/** @class Model for a Galaxy history resource - both a record of user
	 *      tool use and a collection of the datasets those tools produced.
	 *  @name History
	 *  @augments Backbone.Model
	 */
	var History = Backbone.Model
	        .extend( BASE_MVC.LoggableMixin )
	        .extend( BASE_MVC.mixin( BASE_MVC.SearchableModelMixin, /** @lends History.prototype */{
	    _logNamespace : logNamespace,
	
	    // values from api (may need more)
	    defaults : {
	        model_class     : 'History',
	        id              : null,
	        name            : 'Unnamed History',
	        state           : 'new',
	
	        deleted         : false
	    },
	
	    // ........................................................................ urls
	    urlRoot: Galaxy.root + 'api/histories',
	
	    // ........................................................................ set up/tear down
	    /** Set up the model
	     *  @param {Object} historyJSON model data for this History
	     *  @param {Object[]} contentsJSON   array of model data for this History's contents (hdas or collections)
	     *  @param {Object} options     any extra settings including logger
	     */
	    initialize : function( historyJSON, contentsJSON, options ){
	        options = options || {};
	        this.logger = options.logger || null;
	        this.log( this + ".initialize:", historyJSON, contentsJSON, options );
	
	        /** HistoryContents collection of the HDAs contained in this history. */
	        this.log( 'creating history contents:', contentsJSON );
	        this.contents = new HISTORY_CONTENTS.HistoryContents( contentsJSON || [], { historyId: this.get( 'id' )});
	        //// if we've got hdas passed in the constructor, load them
	        //if( contentsJSON && _.isArray( contentsJSON ) ){
	        //    this.log( 'resetting history contents:', contentsJSON );
	        //    this.contents.reset( contentsJSON );
	        //}
	
	        this._setUpListeners();
	
	        /** cached timeout id for the dataset updater */
	        this.updateTimeoutId = null;
	        // set up update timeout if needed
	        //this.checkForUpdates();
	    },
	
	    /** set up any event listeners for this history including those to the contained HDAs
	     *  events: error:contents  if an error occurred with the contents collection
	     */
	    _setUpListeners : function(){
	        this.on( 'error', function( model, xhr, options, msg, details ){
	            this.errorHandler( model, xhr, options, msg, details );
	        });
	
	        // hda collection listening
	        if( this.contents ){
	            this.listenTo( this.contents, 'error', function(){
	                this.trigger.apply( this, [ 'error:contents' ].concat( jQuery.makeArray( arguments ) ) );
	            });
	        }
	        // if the model's id changes ('current' or null -> an actual id), update the contents history_id
	        this.on( 'change:id', function( model, newId ){
	            if( this.contents ){
	                this.contents.historyId = newId;
	            }
	        });
	    },
	
	    //TODO: see base-mvc
	    //onFree : function(){
	    //    if( this.contents ){
	    //        this.contents.free();
	    //    }
	    //},
	
	    /** event listener for errors. Generally errors are handled outside this model */
	    errorHandler : function( model, xhr, options, msg, details ){
	        // clear update timeout on model err
	        this.clearUpdateTimeout();
	    },
	
	    /** convert size in bytes to a more human readable version */
	    nice_size : function(){
	        return UTILS.bytesToString( this.get( 'size' ), true, 2 );
	    },
	
	    /** override to add nice_size */
	    toJSON : function(){
	        return _.extend( Backbone.Model.prototype.toJSON.call( this ), {
	            nice_size : this.nice_size()
	        });
	    },
	
	    /** override to allow getting nice_size */
	    get : function( key ){
	        if( key === 'nice_size' ){
	            return this.nice_size();
	        }
	        return Backbone.Model.prototype.get.apply( this, arguments );
	    },
	
	    // ........................................................................ common queries
	    /** T/F is this history owned by the current user (Galaxy.user)
	     *      Note: that this will return false for an anon user even if the history is theirs.
	     */
	    ownedByCurrUser : function(){
	        // no currUser
	        if( !Galaxy || !Galaxy.user ){
	            return false;
	        }
	        // user is anon or history isn't owned
	        if( Galaxy.user.isAnonymous() || Galaxy.user.id !== this.get( 'user_id' ) ){
	            return false;
	        }
	        return true;
	    },
	
	    /**  */
	    contentsCount : function(){
	        return _.reduce( _.values( this.get( 'state_details' ) ), function( memo, num ){ return memo + num; }, 0 );
	    },
	
	    // ........................................................................ search
	    /** What model fields to search with */
	    searchAttributes : [
	        'name', 'annotation', 'tags'
	    ],
	
	    /** Adding title and singular tag */
	    searchAliases : {
	        title       : 'name',
	        tag         : 'tags'
	    },
	
	    // ........................................................................ updates
	    /** does the contents collection indicate they're still running and need to be updated later?
	     *      delay + update if needed
	     *  @param {Function} onReadyCallback   function to run when all contents are in the ready state
	     *  events: ready
	     */
	    checkForUpdates : function( onReadyCallback ){
	        //this.info( 'checkForUpdates' )
	
	        // get overall History state from collection, run updater if History has running/queued contents
	        //  boiling it down on the client to running/not
	        if( this.contents.running().length ){
	            this.setUpdateTimeout();
	
	        } else {
	            this.trigger( 'ready' );
	            if( _.isFunction( onReadyCallback ) ){
	                onReadyCallback.call( this );
	            }
	        }
	        return this;
	    },
	
	    /** create a timeout (after UPDATE_DELAY or delay ms) to refetch the contents. Clear any prev. timeout */
	    setUpdateTimeout : function( delay ){
	        delay = delay || History.UPDATE_DELAY;
	        var history = this;
	
	        // prevent buildup of updater timeouts by clearing previous if any, then set new and cache id
	        this.clearUpdateTimeout();
	        this.updateTimeoutId = setTimeout( function(){
	            history.refresh();
	        }, delay );
	        return this.updateTimeoutId;
	    },
	
	    /** clear the timeout and the cached timeout id */
	    clearUpdateTimeout : function(){
	        if( this.updateTimeoutId ){
	            clearTimeout( this.updateTimeoutId );
	            this.updateTimeoutId = null;
	        }
	    },
	
	    /* update the contents, getting full detailed model data for any whose id is in detailIds
	     *  set up to run this again in some interval of time
	     *  @param {String[]} detailIds list of content ids to get detailed model data for
	     *  @param {Object} options     std. backbone fetch options map
	     */
	    refresh : function( detailIds, options ){
	        //this.info( 'refresh:', detailIds, this.contents );
	        detailIds = detailIds || [];
	        options = options || {};
	        var history = this;
	
	        // add detailIds to options as CSV string
	        options.data = options.data || {};
	        if( detailIds.length ){
	            options.data.details = detailIds.join( ',' );
	        }
	        var xhr = this.contents.fetch( options );
	        xhr.done( function( models ){
	            history.checkForUpdates( function(){
	                // fetch the history inside onReadyCallback in order to recalc history size
	                this.fetch();
	            });
	        });
	        return xhr;
	    },
	
	    // ........................................................................ ajax
	    /** save this history, _Mark_ing it as deleted (just a flag) */
	    _delete : function( options ){
	        if( this.get( 'deleted' ) ){ return jQuery.when(); }
	        return this.save( { deleted: true }, options );
	    },
	    /** purge this history, _Mark_ing it as purged and removing all dataset data from the server */
	    purge : function( options ){
	        if( this.get( 'purged' ) ){ return jQuery.when(); }
	        return this.save( { deleted: true, purged: true }, options );
	    },
	    /** save this history, _Mark_ing it as undeleted */
	    undelete : function( options ){
	        if( !this.get( 'deleted' ) ){ return jQuery.when(); }
	        return this.save( { deleted: false }, options );
	    },
	
	    /** Make a copy of this history on the server
	     *  @param {Boolean} current    if true, set the copy as the new current history (default: true)
	     *  @param {String} name        name of new history (default: none - server sets to: Copy of <current name>)
	     *  @fires copied               passed this history and the response JSON from the copy
	     *  @returns {xhr}
	     */
	    copy : function( current, name, allDatasets ){
	        current = ( current !== undefined )?( current ):( true );
	        if( !this.id ){
	            throw new Error( 'You must set the history ID before copying it.' );
	        }
	
	        var postData = { history_id  : this.id };
	        if( current ){
	            postData.current = true;
	        }
	        if( name ){
	            postData.name = name;
	        }
	        if( !allDatasets ){
	            postData.all_datasets = false;
	        }
	
	        var history = this,
	            copy = jQuery.post( this.urlRoot, postData );
	        // if current - queue to setAsCurrent before firing 'copied'
	        if( current ){
	            return copy.then( function( response ){
	                var newHistory = new History( response );
	                return newHistory.setAsCurrent()
	                    .done( function(){
	                        history.trigger( 'copied', history, response );
	                    });
	            });
	        }
	        return copy.done( function( response ){
	            history.trigger( 'copied', history, response );
	        });
	    },
	
	    setAsCurrent : function(){
	        var history = this,
	            xhr = jQuery.getJSON( Galaxy.root + 'history/set_as_current?id=' + this.id );
	
	        xhr.done( function(){
	            history.trigger( 'set-as-current', history );
	        });
	        return xhr;
	    },
	
	    // ........................................................................ misc
	    toString : function(){
	        return 'History(' + this.get( 'id' ) + ',' + this.get( 'name' ) + ')';
	    }
	}));
	
	//------------------------------------------------------------------------------ CLASS VARS
	/** When the history has running hdas,
	 *  this is the amount of time between update checks from the server
	 */
	History.UPDATE_DELAY = 4000;
	
	/** Get data for a history then its hdas using a sequential ajax call, return a deferred to receive both */
	History.getHistoryData = function getHistoryData( historyId, options ){
	    options = options || {};
	    var detailIdsFn = options.detailIdsFn || [];
	    var hdcaDetailIds = options.hdcaDetailIds || [];
	    //console.debug( 'getHistoryData:', historyId, options );
	
	    var df = jQuery.Deferred(),
	        historyJSON = null;
	
	    function getHistory( id ){
	        // get the history data
	        if( historyId === 'current' ){
	            return jQuery.getJSON( Galaxy.root + 'history/current_history_json' );
	        }
	        return jQuery.ajax( Galaxy.root + 'api/histories/' + historyId );
	    }
	    function isEmpty( historyData ){
	        // get the number of hdas accrd. to the history
	        return historyData && historyData.empty;
	    }
	    function getContents( historyData ){
	        // get the hda data
	        // if no hdas accrd. to history: return empty immed.
	        if( isEmpty( historyData ) ){ return []; }
	        // if there are hdas accrd. to history: get those as well
	        if( _.isFunction( detailIdsFn ) ){
	            detailIdsFn = detailIdsFn( historyData );
	        }
	        if( _.isFunction( hdcaDetailIds ) ){
	            hdcaDetailIds = hdcaDetailIds( historyData );
	        }
	        var data = {};
	        if( detailIdsFn.length ) {
	            data.dataset_details = detailIdsFn.join( ',' );
	        }
	        if( hdcaDetailIds.length ) {
	            // for symmetry, not actually used by backend of consumed
	            // by frontend.
	            data.dataset_collection_details = hdcaDetailIds.join( ',' );
	        }
	        return jQuery.ajax( Galaxy.root + 'api/histories/' + historyData.id + '/contents', { data: data });
	    }
	
	    // getting these concurrently is 400% slower (sqlite, local, vanilla) - so:
	    //  chain the api calls - getting history first then contents
	
	    var historyFn = options.historyFn || getHistory,
	        contentsFn = options.contentsFn || getContents;
	
	    // chain ajax calls: get history first, then hdas
	    var historyXHR = historyFn( historyId );
	    historyXHR.done( function( json ){
	        // set outer scope var here for use below
	        historyJSON = json;
	        df.notify({ status: 'history data retrieved', historyJSON: historyJSON });
	    });
	    historyXHR.fail( function( xhr, status, message ){
	        // call reject on the outer deferred to allow its fail callback to run
	        df.reject( xhr, 'loading the history' );
	    });
	
	    var contentsXHR = historyXHR.then( contentsFn );
	    contentsXHR.then( function( contentsJSON ){
	        df.notify({ status: 'contents data retrieved', historyJSON: historyJSON, contentsJSON: contentsJSON });
	        // we've got both: resolve the outer scope deferred
	        df.resolve( historyJSON, contentsJSON );
	    });
	    contentsXHR.fail( function( xhr, status, message ){
	        // call reject on the outer deferred to allow its fail callback to run
	        df.reject( xhr, 'loading the contents', { history: historyJSON } );
	    });
	
	    return df;
	};
	
	
	//==============================================================================
	var ControlledFetchMixin = {
	
	    /** Override to convert certain options keys into API index parameters */
	    fetch : function( options ){
	        options = options || {};
	        options.data = options.data || this._buildFetchData( options );
	        // use repeated params for arrays, e.g. q=1&qv=1&q=2&qv=2
	        options.traditional = true;
	        return Backbone.Collection.prototype.fetch.call( this, options );
	    },
	
	    /** These attribute keys are valid params to fetch/API-index */
	    _fetchOptions : [
	        /** model dependent string to control the order of models returned */
	        'order',
	        /** limit the number of models returned from a fetch */
	        'limit',
	        /** skip this number of models when fetching */
	        'offset',
	        /** what series of attributes to return (model dependent) */
	        'view',
	        /** individual keys to return for the models (see api/histories.index) */
	        'keys'
	    ],
	
	    /** Build the data dictionary to send to fetch's XHR as data */
	    _buildFetchData : function( options ){
	        var data = {},
	            fetchDefaults = this._fetchDefaults();
	        options = _.defaults( options || {}, fetchDefaults );
	        data = _.pick( options, this._fetchOptions );
	
	        var filters = _.has( options, 'filters' )? options.filters : ( fetchDefaults.filters || {} );
	        if( !_.isEmpty( filters ) ){
	            _.extend( data, this._buildFetchFilters( filters ) );
	        }
	        return data;
	    },
	
	    /** Override to have defaults for fetch options and filters */
	    _fetchDefaults : function(){
	        // to be overridden
	        return {};
	    },
	
	    /** Convert dictionary filters to qqv style arrays */
	    _buildFetchFilters : function( filters ){
	        var filterMap = {
	            q  : [],
	            qv : []
	        };
	        _.each( filters, function( v, k ){
	            if( v === true ){ v = 'True'; }
	            if( v === false ){ v = 'False'; }
	            filterMap.q.push( k );
	            filterMap.qv.push( v );
	        });
	        return filterMap;
	    },
	};
	
	//==============================================================================
	/** @class A collection of histories (per user).
	 *      (stub) currently unused.
	 */
	var HistoryCollection = Backbone.Collection
	        .extend( BASE_MVC.LoggableMixin )
	        .extend( ControlledFetchMixin )
	        .extend(/** @lends HistoryCollection.prototype */{
	    _logNamespace : logNamespace,
	
	    model   : History,
	
	    /** @type {String} the default sortOrders key for sorting */
	    DEFAULT_ORDER : 'update_time',
	
	    /** @type {Object} map of collection sorting orders generally containing a getter to return the attribute
	     *      sorted by and asc T/F if it is an ascending sort.
	     */
	    sortOrders : {
	        'update_time' : {
	            getter : function( h ){ return new Date( h.get( 'update_time' ) ); },
	            asc : false
	        },
	        'update_time-asc' : {
	            getter : function( h ){ return new Date( h.get( 'update_time' ) ); },
	            asc : true
	        },
	        'name' : {
	            getter : function( h ){ return h.get( 'name' ); },
	            asc : true
	        },
	        'name-dsc' : {
	            getter : function( h ){ return h.get( 'name' ); },
	            asc : false
	        },
	        'size' : {
	            getter : function( h ){ return h.get( 'size' ); },
	            asc : false
	        },
	        'size-asc' : {
	            getter : function( h ){ return h.get( 'size' ); },
	            asc : true
	        }
	    },
	
	    initialize : function( models, options ){
	        options = options || {};
	        this.log( 'HistoryCollection.initialize', arguments );
	
	        // instance vars
	        /** @type {boolean} should deleted histories be included */
	        this.includeDeleted = options.includeDeleted || false;
	        // set the sort order
	        this.setOrder( options.order || this.DEFAULT_ORDER );
	        /** @type {String} encoded id of the history that's current */
	        this.currentHistoryId = options.currentHistoryId;
	        /** @type {boolean} have all histories been fetched and in the collection? */
	        this.allFetched = options.allFetched || false;
	
	        // this.on( 'all', function(){
	        //    console.info( 'event:', arguments );
	        // });
	        this.setUpListeners();
	    },
	
	    urlRoot : Galaxy.root + 'api/histories',
	    url     : function(){ return this.urlRoot; },
	
	    /** returns map of default filters and settings for fetching from the API */
	    _fetchDefaults : function(){
	        // to be overridden
	        var defaults = {
	            order   : this.order,
	            view    : 'detailed'
	        };
	        if( !this.includeDeleted ){
	            defaults.filters = {
	                deleted : false,
	                purged  : false,
	            };
	        }
	        return defaults;
	    },
	
	    /** set up reflexive event handlers */
	    setUpListeners : function setUpListeners(){
	        this.on({
	            // when a history is deleted, remove it from the collection (if optionally set to do so)
	            'change:deleted' : function( history ){
	                // TODO: this becomes complicated when more filters are used
	                this.debug( 'change:deleted', this.includeDeleted, history.get( 'deleted' ) );
	                if( !this.includeDeleted && history.get( 'deleted' ) ){
	                    this.remove( history );
	                }
	            },
	            // listen for a history copy, setting it to current
	            'copied' : function( original, newData ){
	                this.setCurrent( new History( newData, [] ) );
	            },
	            // when a history is made current, track the id in the collection
	            'set-as-current' : function( history ){
	                var oldCurrentId = this.currentHistoryId;
	                this.trigger( 'no-longer-current', oldCurrentId );
	                this.currentHistoryId = history.id;
	            }
	        });
	    },
	
	    /** override to allow passing options.order and setting the sort order to one of sortOrders */
	    sort : function( options ){
	        options = options || {};
	        this.setOrder( options.order );
	        return Backbone.Collection.prototype.sort.call( this, options );
	    },
	
	    /** build the comparator used to sort this collection using the sortOrder map and the given order key
	     *  @event 'changed-order' passed the new order and the collection
	     */
	    setOrder : function( order ){
	        var collection = this,
	            sortOrder = this.sortOrders[ order ];
	        if( _.isUndefined( sortOrder ) ){ return; }
	
	        collection.order = order;
	        collection.comparator = function comparator( a, b ){
	            var currentHistoryId = collection.currentHistoryId;
	            // current always first
	            if( a.id === currentHistoryId ){ return -1; }
	            if( b.id === currentHistoryId ){ return 1; }
	            // then compare by an attribute
	            a = sortOrder.getter( a );
	            b = sortOrder.getter( b );
	            return sortOrder.asc?
	                ( ( a === b )?( 0 ):( a > b ?  1 : -1 ) ):
	                ( ( a === b )?( 0 ):( a > b ? -1 :  1 ) );
	        };
	        collection.trigger( 'changed-order', collection.order, collection );
	        return collection;
	    },
	
	    /** override to provide order and offsets based on instance vars, set limit if passed,
	     *  and set allFetched/fire 'all-fetched' when xhr returns
	     */
	    fetch : function( options ){
	        options = options || {};
	        if( this.allFetched ){ return jQuery.when({}); }
	        var collection = this,
	            fetchOptions = _.defaults( options, {
	                remove : false,
	                offset : collection.length >= 1? ( collection.length - 1 ) : 0,
	                order  : collection.order
	            }),
	            limit = options.limit;
	        if( !_.isUndefined( limit ) ){
	            fetchOptions.limit = limit;
	        }
	
	        return ControlledFetchMixin.fetch.call( this, fetchOptions )
	            .done( function _postFetchMore( fetchData ){
	                var numFetched = _.isArray( fetchData )? fetchData.length : 0;
	                // anything less than a full page means we got all there is to get
	                if( !limit || numFetched < limit ){
	                    collection.allFetched = true;
	                    collection.trigger( 'all-fetched', collection );
	                }
	            }
	        );
	    },
	
	    /** create a new history and by default set it to be the current history */
	    create : function create( data, hdas, historyOptions, xhrOptions ){
	        //TODO: .create is actually a collection function that's overridden here
	        var collection = this,
	            xhr = jQuery.getJSON( Galaxy.root + 'history/create_new_current'  );
	        return xhr.done( function( newData ){
	            collection.setCurrent( new History( newData, [], historyOptions || {} ) );
	        });
	    },
	
	    /** set the current history to the given history, placing it first in the collection.
	     *  Pass standard bbone options for use in unshift.
	     *  @triggers new-current passed history and this collection
	     */
	    setCurrent : function( history, options ){
	        options = options || {};
	        // new histories go in the front
	        this.unshift( history, options );
	        this.currentHistoryId = history.get( 'id' );
	        if( !options.silent ){
	            this.trigger( 'new-current', history, this );
	        }
	        return this;
	    },
	
	    /** override to reset allFetched flag to false */
	    reset : function( models, options ){
	        this.allFetched = false;
	        return Backbone.Collection.prototype.reset.call( this, models, options );
	    },
	
	    toString: function toString(){
	        return 'HistoryCollection(' + this.length + ')';
	    }
	});
	
	//==============================================================================
	return {
	    History           : History,
	    HistoryCollection : HistoryCollection
	};}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! jquery */ 3), __webpack_require__(/*! underscore */ 1)))

/***/ },
/* 66 */
/*!********************************************************!*\
  !*** ./galaxy/scripts/mvc/history/history-contents.js ***!
  \********************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone, _, jQuery) {!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	    __webpack_require__(/*! mvc/history/history-content-model */ 67),
	    __webpack_require__(/*! mvc/history/hda-model */ 69),
	    __webpack_require__(/*! mvc/history/hdca-model */ 71),
	    __webpack_require__(/*! mvc/base-mvc */ 5),
	    __webpack_require__(/*! utils/localization */ 7)
	], __WEBPACK_AMD_DEFINE_RESULT__ = function( HISTORY_CONTENT, HDA_MODEL, HDCA_MODEL, BASE_MVC, _l ){
	
	'use strict';
	
	var logNamespace = 'history';
	//==============================================================================
	/** @class Backbone collection for history content.
	 *      NOTE: history content seems like a dataset collection, but differs in that it is mixed:
	 *          each element can be either an HDA (dataset) or a DatasetCollection and co-exist on
	 *          the same level.
	 *      Dataset collections on the other hand are not mixed and (so far) can only contain either
	 *          HDAs or child dataset collections on one level.
	 *      This is why this does not inherit from any of the DatasetCollections (currently).
	 */
	var HistoryContents = Backbone.Collection
	        .extend( BASE_MVC.LoggableMixin )
	        .extend(/** @lends HistoryContents.prototype */{
	//TODO:?? may want to inherit from some MixedModelCollection
	//TODO:?? also consider inheriting from a 'DatasetList'
	//TODO: can we decorate the mixed models using the model fn below (instead of having them build their own type_id)?
	
	    _logNamespace : logNamespace,
	
	    /** since history content is a mix, override model fn into a factory, creating based on history_content_type */
	    model : function( attrs, options ) {
	//TODO: can we move the type_id stuff here?
	        //attrs.type_id = typeIdStr( attrs );
	
	        if( attrs.history_content_type === "dataset" ) {
	            return new HDA_MODEL.HistoryDatasetAssociation( attrs, options );
	
	        } else if( attrs.history_content_type === "dataset_collection" ) {
	            switch( attrs.collection_type ){
	                case 'list':
	                    return new HDCA_MODEL.HistoryListDatasetCollection( attrs, options );
	                case 'paired':
	                    return new HDCA_MODEL.HistoryPairDatasetCollection( attrs, options );
	                case 'list:paired':
	                    return new HDCA_MODEL.HistoryListPairedDatasetCollection( attrs, options );
	            }
	            // This is a hack inside a hack:
	            // Raise a plain object with validationError to fake a model.validationError
	            // (since we don't have a model to use validate with)
	            // (the outer hack being the mixed content/model function in this collection)
	            return { validationError : 'Unknown collection_type: ' + attrs.history_content_type };
	        }
	        return { validationError : 'Unknown history_content_type: ' + attrs.history_content_type };
	    },
	
	    /** Set up.
	     *  @see Backbone.Collection#initialize
	     */
	    initialize : function( models, options ){
	        options = options || {};
	//TODO: could probably use the contents.history_id instead
	        this.historyId = options.historyId;
	        //this._setUpListeners();
	
	        // backbonejs uses collection.model.prototype.idAttribute to determine if a model is *already* in a collection
	        //  and either merged or replaced. In this case, our 'model' is a function so we need to add idAttribute
	        //  manually here - if we don't, contents will not merge but be replaced/swapped.
	        this.model.prototype.idAttribute = 'type_id';
	
	        this.on( 'all', function(){
	            this.debug( this + '.event:', arguments );
	        });
	    },
	
	    /** root api url */
	    urlRoot : Galaxy.root + 'api/histories',
	    /** complete api url */
	    url : function(){
	        return this.urlRoot + '/' + this.historyId + '/contents';
	    },
	
	    // ........................................................................ common queries
	    /** Get the ids of every item in this collection
	     *  @returns array of encoded ids
	     */
	    ids : function(){
	//TODO: is this still useful since type_id
	        return this.map( function( item ){ return item.get('id'); });
	    },
	
	    /** Get contents that are not ready
	     *  @returns array of content models
	     */
	    notReady : function(){
	        return this.filter( function( content ){
	            return !content.inReadyState();
	        });
	    },
	
	    /** Get the id of every model in this collection not in a 'ready' state (running).
	     *  @returns an array of model ids
	     *  @see HistoryDatasetAssociation#inReadyState
	     */
	    running : function(){
	        var idList = [];
	        this.each( function( item ){
	            var isRunning = !item.inReadyState();
	            if( isRunning ){
	//TODO: is this still correct since type_id
	                idList.push( item.get( 'id' ) );
	            }
	        });
	        return idList;
	    },
	
	    /** Get the model with the given hid
	     *  @param {Int} hid the hid to search for
	     *  @returns {HistoryDatasetAssociation} the model with the given hid or undefined if not found
	     */
	    getByHid : function( hid ){
	        return _.first( this.filter( function( content ){ return content.get( 'hid' ) === hid; }) );
	    },
	
	    //TODO:?? this may belong in the containing view
	    /** Get every 'shown' model in this collection based on show_deleted/hidden
	     *  @param {Boolean} show_deleted are we showing deleted content?
	     *  @param {Boolean} show_hidden are we showing hidden content?
	     *  @returns array of content models
	     *  @see HistoryDatasetAssociation#isVisible
	     */
	    getVisible : function( show_deleted, show_hidden, filters ){
	        filters = filters || [];
	        //this.debug( 'filters:', filters );
	        // always filter by show deleted/hidden first
	        this.debug( 'checking isVisible' );
	        var filteredHdas = new HistoryContents( this.filter( function( item ){
	            return item.isVisible( show_deleted, show_hidden );
	        }));
	
	        _.each( filters, function( filterFn ){
	            if( !_.isFunction( filterFn ) ){ return; }
	            filteredHdas = new HistoryContents( filteredHdas.filter( filterFn ) );
	        });
	        return filteredHdas;
	    },
	
	    /** return a new contents collection of only hidden items */
	    hidden : function(){
	        function filterFn( c ){ return c.hidden(); }
	        return new HistoryContents( this.filter( filterFn ) );
	    },
	
	    /** return a new contents collection of only hidden items */
	    deleted : function(){
	        function filterFn( c ){ return c.get( 'deleted' ); }
	        return new HistoryContents( this.filter( filterFn ) );
	    },
	
	    /** return true if any contents don't have details */
	    haveDetails : function(){
	        return this.all( function( content ){ return content.hasDetails(); });
	    },
	
	    // ........................................................................ ajax
	    /** fetch detailed model data for all contents in this collection */
	    fetchAllDetails : function( options ){
	        options = options || {};
	        var detailsFlag = { details: 'all' };
	        options.data = ( options.data )?( _.extend( options.data, detailsFlag ) ):( detailsFlag );
	        return this.fetch( options );
	    },
	
	    /** using a queue, perform ajaxFn on each of the models in this collection */
	    ajaxQueue : function( ajaxFn, options ){
	        var deferred = jQuery.Deferred(),
	            startingLength = this.length,
	            responses = [];
	
	        if( !startingLength ){
	            deferred.resolve([]);
	            return deferred;
	        }
	
	        // use reverse order (stylistic choice)
	        var ajaxFns = this.chain().reverse().map( function( content, i ){
	            return function(){
	                var xhr = ajaxFn.call( content, options );
	                // if successful, notify using the deferred to allow tracking progress
	                xhr.done( function( response ){
	                    deferred.notify({ curr: i, total: startingLength, response: response, model: content });
	                });
	                // (regardless of previous error or success) if not last ajax call, shift and call the next
	                //  if last fn, resolve deferred
	                xhr.always( function( response ){
	                    responses.push( response );
	                    if( ajaxFns.length ){
	                        ajaxFns.shift()();
	                    } else {
	                        deferred.resolve( responses );
	                    }
	                });
	            };
	        }).value();
	        // start the queue
	        ajaxFns.shift()();
	
	        return deferred;
	    },
	
	    isCopyable : function( contentsJSON ){
	        var copyableModelClasses = [
	            'HistoryDatasetAssociation',
	            'HistoryDatasetCollectionAssociation'
	        ];
	        return ( ( _.isObject( contentsJSON ) && contentsJSON.id )
	              && ( _.contains( copyableModelClasses, contentsJSON.model_class ) ) );
	    },
	
	    /** copy an existing, accessible hda into this collection */
	    copy : function( json ){
	        var id, type, contentType;
	        if( _.isString( json ) ){
	            id = json;
	            contentType = 'hda';
	            type = 'dataset';
	        } else {
	            id = json.id;
	            contentType = ({
	                'HistoryDatasetAssociation' : 'hda',
	                'LibraryDatasetDatasetAssociation' : 'ldda',
	                'HistoryDatasetCollectionAssociation' : 'hdca'
	            })[ json.model_class ] || 'hda';
	            type = ( contentType === 'hdca'? 'dataset_collection' : 'dataset' );
	        }
	        var collection = this,
	            xhr = jQuery.post( this.url(), {
	                content : id,
	                source  : contentType,
	                type    : type
	            })
	            .done( function( response ){
	                collection.add([ response ]);
	            })
	            .fail( function( error, status, message ){
	                collection.trigger( 'error', collection, xhr, {},
	                    'Error copying contents', { type: type, id: id, source: contentType });
	            });
	        return xhr;
	    },
	
	    // ........................................................................ sorting/filtering
	    /** return a new collection of contents whose attributes contain the substring matchesWhat */
	    matches : function( matchesWhat ){
	        return this.filter( function( content ){
	            return content.matches( matchesWhat );
	        });
	    },
	
	    // ........................................................................ misc
	    /** override to ensure type id is set */
	    set : function( models, options ){
	        models = _.isArray( models )? models : [ models ];
	        _.each( models, function( model ){
	            if( !model.type_id || !model.get || !model.get( 'type_id' ) ){
	                model.type_id = HISTORY_CONTENT.typeIdStr( model.history_content_type, model.id );
	            }
	        });
	        Backbone.Collection.prototype.set.call( this, models, options );
	    },
	
	    /** */
	    createHDCA : function( elementIdentifiers, collectionType, name, options ){
	        //precondition: elementIdentifiers is an array of plain js objects
	        //  in the proper form to create the collectionType
	        var contents = this,
	            typeToModel = {
	                list    : HDCA_MODEL.HistoryListDatasetCollection,
	                paired  : HDCA_MODEL.HistoryPairDatasetCollection
	            },
	            hdca = new (typeToModel[ collectionType ])({
	                history_id          : this.historyId,
	                name                : name,
	                // should probably be able to just send in a bunch of json here and restruct per class
	                element_identifiers : elementIdentifiers
	            });
	        // do I even need to use new above, can I just pass the attrs here
	        return hdca.save()
	            .done( function( response ){
	                contents.add( hdca );
	            })
	            .fail( function( xhr, status, message ){
	                contents.trigger( 'error', xhr, status, message );
	            });
	    },
	
	
	    /** In this override, copy the historyId to the clone */
	    clone : function(){
	        var clone = Backbone.Collection.prototype.clone.call( this );
	        clone.historyId = this.historyId;
	        return clone;
	    },
	
	    /** debugging */
	    print : function(){
	        var contents = this;
	        contents.each( function( c ){
	            contents.debug( c );
	            if( c.elements ){
	                contents.debug( '\t elements:', c.elements );
	            }
	        });
	    },
	
	    /** String representation. */
	    toString : function(){
	         return ([ 'HistoryContents(', [ this.historyId, this.length ].join(), ')' ].join( '' ));
	    }
	});
	
	
	//==============================================================================
	    return {
	        HistoryContents : HistoryContents
	    };
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! underscore */ 1), __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 67 */
/*!*************************************************************!*\
  !*** ./galaxy/scripts/mvc/history/history-content-model.js ***!
  \*************************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone, jQuery) {!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	    __webpack_require__(/*! mvc/dataset/states */ 68),
	    __webpack_require__(/*! mvc/base-mvc */ 5),
	    __webpack_require__(/*! utils/localization */ 7)
	], __WEBPACK_AMD_DEFINE_RESULT__ = function( STATES, BASE_MVC, _l ){
	
	'use strict';
	
	var logNamespace = 'history';
	//==============================================================================
	/** How the type_id attribute is built for the history's mixed contents collection */
	var typeIdStr = function _typeIdStr( type, id ){
	    return [ type, id ].join( '-' );
	};
	
	//==============================================================================
	/** @class Mixin for HistoryContents content (HDAs, HDCAs).
	 */
	var HistoryContentMixin = {
	//TODO:?? into true Backbone.Model?
	
	    /** default attributes for a model */
	    defaults : {
	        /** parent (containing) history */
	        history_id          : null,
	        /** some content_type (HistoryContents can contain mixed model classes) */
	        history_content_type: null,
	        /** indicating when/what order the content was generated in the context of the history */
	        hid                 : null,
	        /** whether the user wants the content shown (visible) */
	        visible             : true
	    },
	
	    // ........................................................................ mixed content element
	//TODO: there's got to be a way to move this into HistoryContents - if we can do that, this class might not be needed
	    // In order to be part of a MIXED bbone collection, we can't rely on the id
	    //  (which may collide btwn models of different classes)
	    // Build a new id (type_id) that prefixes the history_content_type so the bbone collection can differentiate
	    idAttribute : 'type_id',
	
	    /** override constructor to build type_id and insert into original attributes */
	    constructor : function( attrs, options ){
	        attrs.type_id = typeIdStr( attrs.history_content_type, attrs.id );
	        this.debug( 'HistoryContentMixin.constructor:', attrs.type_id );
	        Backbone.Model.apply( this, arguments );
	    },
	
	    /** object level fn for building the type_id string */
	    _typeIdStr : function(){
	        return typeIdStr( this.get( 'history_content_type' ), this.get( 'id' ) );
	    },
	
	    /** add listener to re-create type_id when the id changes */
	    initialize : function( attrs, options ){
	        this.on( 'change:id', this._createTypeId );
	    },
	
	    /** set the type_id in the model attributes */
	    _createTypeId : function(){
	        this.set( 'type_id', this._typeIdStr() );
	    },
	
	    /** override because backbone tests boolean( idAttribute ), but it's not an empty string even for new models
	     *  due to our use of type_id.
	     */
	    isNew : function(){
	        return !this.get( 'id' );
	    },
	
	    // ........................................................................ common queries
	    /** the more common alias of visible */
	    hidden : function(){
	        return !this.get( 'visible' );
	    },
	
	    /** based on show_deleted, show_hidden (gen. from the container control),
	     *      would this ds show in the list of ds's?
	     *  @param {Boolean} show_deleted are we showing deleted hdas?
	     *  @param {Boolean} show_hidden are we showing hidden hdas?
	     */
	    isVisible : function( show_deleted, show_hidden ){
	//TODO:?? Another unfortunate name collision
	        var isVisible = true;
	        if( ( !show_deleted )
	        &&  ( this.get( 'deleted' ) || this.get( 'purged' ) ) ){
	            isVisible = false;
	        }
	        if( ( !show_hidden )
	        &&  ( !this.get( 'visible' ) ) ){
	            isVisible = false;
	        }
	        return isVisible;
	    },
	
	    // ........................................................................ ajax
	//TODO: global
	//TODO: these are probably better done on the leaf classes
	    /** history content goes through the 'api/histories' API */
	    urlRoot: Galaxy.root + 'api/histories/',
	
	    /** full url spec. for this content */
	    url : function(){
	        var url = this.urlRoot + this.get( 'history_id' ) + '/contents/'
	             + this.get('history_content_type') + 's/' + this.get( 'id' );
	        return url;
	    },
	
	    /** save this content as not visible */
	    hide : function( options ){
	        if( !this.get( 'visible' ) ){ return jQuery.when(); }
	        return this.save( { visible: false }, options );
	    },
	    /** save this content as visible */
	    unhide : function( options ){
	        if( this.get( 'visible' ) ){ return jQuery.when(); }
	        return this.save( { visible: true }, options );
	    },
	
	    // ........................................................................ misc
	    /** String representation */
	    toString : function(){
	        var nameAndId = this.get( 'id' ) || '';
	        if( this.get( 'name' ) ){
	            nameAndId = this.get( 'hid' ) + ' :"' + this.get( 'name' ) + '",' + nameAndId;
	        }
	        return 'HistoryContent(' + nameAndId + ')';
	    }
	};
	
	
	//==============================================================================
	//TODO: needed?
	/** @class (Concrete/non-mixin) base model for content items.
	 */
	var HistoryContent = Backbone.Model
	        .extend( BASE_MVC.LoggableMixin )
	        .extend( HistoryContentMixin )
	        .extend({ _logNamespace : logNamespace });
	
	
	//==============================================================================
	    return {
	        typeIdStr           : typeIdStr,
	        HistoryContentMixin : HistoryContentMixin,
	        HistoryContent      : HistoryContent
	    };
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 68 */
/*!**********************************************!*\
  !*** ./galaxy/scripts/mvc/dataset/states.js ***!
  \**********************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	], __WEBPACK_AMD_DEFINE_RESULT__ = function(){
	
	'use strict';
	//==============================================================================
	/** Map of possible HDA/collection/job states to their string equivalents.
	 *      A port of galaxy.model.Dataset.states.
	 */
	var STATES = {
	    // NOT ready states
	    /** is uploading and not ready */
	    UPLOAD              : 'upload',
	    /** the job that will produce the dataset queued in the runner */
	    QUEUED              : 'queued',
	    /** the job that will produce the dataset is running */
	    RUNNING             : 'running',
	    /** metadata for the dataset is being discovered/set */
	    SETTING_METADATA    : 'setting_metadata',
	
	    // ready states
	    /** was created without a tool */
	    NEW                 : 'new',
	    /** has no data */
	    EMPTY               : 'empty',
	    /** has successfully completed running */
	    OK                  : 'ok',
	
	    /** the job that will produce the dataset paused */
	    PAUSED              : 'paused',
	    /** metadata discovery/setting failed or errored (but otherwise ok) */
	    FAILED_METADATA     : 'failed_metadata',
	//TODO: not in trans.app.model.Dataset.states - is in database
	    /** not accessible to the current user (i.e. due to permissions) */
	    NOT_VIEWABLE        : 'noPermission',
	    /** deleted while uploading */
	    DISCARDED           : 'discarded',
	    /** the tool producing this dataset failed */
	    ERROR               : 'error'
	};
	
	STATES.READY_STATES = [
	    STATES.OK,
	    STATES.EMPTY,
	    STATES.PAUSED,
	    STATES.FAILED_METADATA,
	    STATES.NOT_VIEWABLE,
	    STATES.DISCARDED,
	    STATES.ERROR
	];
	
	STATES.NOT_READY_STATES = [
	    STATES.UPLOAD,
	    STATES.QUEUED,
	    STATES.RUNNING,
	    STATES.SETTING_METADATA,
	    STATES.NEW
	];
	
	
	//==============================================================================
	    return STATES;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ },
/* 69 */
/*!*************************************************!*\
  !*** ./galaxy/scripts/mvc/history/hda-model.js ***!
  \*************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(_) {!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	    __webpack_require__(/*! mvc/dataset/dataset-model */ 70),
	    __webpack_require__(/*! mvc/history/history-content-model */ 67),
	    __webpack_require__(/*! mvc/base-mvc */ 5),
	    __webpack_require__(/*! utils/localization */ 7)
	], __WEBPACK_AMD_DEFINE_RESULT__ = function( DATASET, HISTORY_CONTENT, BASE_MVC, _l ){
	
	'use strict';
	
	//==============================================================================
	var _super = DATASET.DatasetAssociation,
	    hcontentMixin = HISTORY_CONTENT.HistoryContentMixin;
	/** @class (HDA) model for a Galaxy dataset contained in and related to a history.
	 */
	var HistoryDatasetAssociation = _super.extend( BASE_MVC.mixin( hcontentMixin,
	/** @lends HistoryDatasetAssociation.prototype */{
	
	    /** logger used to record this.log messages, commonly set to console */
	    //logger              : console,
	
	    // because all objects have constructors (as this hashmap would even if this next line wasn't present)
	    //  the constructor in hcontentMixin won't be attached by BASE_MVC.mixin to this model
	    //  - re-apply manually it now
	    /** call the mixin constructor */
	    constructor : function( attrs, options ){
	        hcontentMixin.constructor.call( this, attrs, options );
	    },
	
	    /** default attributes for a model */
	    defaults : _.extend( {}, _super.prototype.defaults, hcontentMixin.defaults, {
	        model_class         : 'HistoryDatasetAssociation'
	    }),
	
	    /** Set up the model, determine if accessible, bind listeners
	     */
	    initialize : function( attributes, options ){
	        _super.prototype.initialize.call( this, attributes, options );
	        hcontentMixin.initialize.call( this, attributes, options );
	    },
	
	    // ........................................................................ misc
	    /** String representation */
	    toString : function(){
	        var nameAndId = this.get( 'id' ) || '';
	        if( this.get( 'name' ) ){
	            nameAndId = this.get( 'hid' ) + ' :"' + this.get( 'name' ) + '",' + nameAndId;
	        }
	        return 'HDA(' + nameAndId + ')';
	    }
	}));
	
	//==============================================================================
	    return {
	        HistoryDatasetAssociation   : HistoryDatasetAssociation
	    };
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! underscore */ 1)))

/***/ },
/* 70 */
/*!*****************************************************!*\
  !*** ./galaxy/scripts/mvc/dataset/dataset-model.js ***!
  \*****************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone, _, jQuery) {!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	    __webpack_require__(/*! mvc/dataset/states */ 68),
	    __webpack_require__(/*! mvc/base-mvc */ 5),
	    __webpack_require__(/*! utils/localization */ 7)
	], __WEBPACK_AMD_DEFINE_RESULT__ = function( STATES, BASE_MVC, _l ){
	'use strict';
	
	var logNamespace = 'dataset';
	//==============================================================================
	var searchableMixin = BASE_MVC.SearchableModelMixin;
	/** @class base model for any DatasetAssociation (HDAs, LDDAs, DatasetCollectionDAs).
	 *      No knowledge of what type (HDA/LDDA/DCDA) should be needed here.
	 *  The DA's are made searchable (by attribute) by mixing in SearchableModelMixin.
	 */
	var DatasetAssociation = Backbone.Model
	        .extend( BASE_MVC.LoggableMixin )
	        .extend( BASE_MVC.mixin( searchableMixin, /** @lends DatasetAssociation.prototype */{
	    _logNamespace : logNamespace,
	
	    /** default attributes for a model */
	    defaults : {
	        state               : STATES.NEW,
	        deleted             : false,
	        purged              : false,
	
	        // unreliable attribute
	        name                : '(unnamed dataset)',
	
	//TODO: update to false when this is correctly passed from the API (when we have a security model for this)
	        accessible          : true,
	
	        // sniffed datatype (sam, tabular, bed, etc.)
	        data_type           : '',
	        file_ext            : '',
	
	        // size in bytes
	        file_size           : 0,
	
	        // array of associated file types (eg. [ 'bam_index', ... ])
	        meta_files          : [],
	
	        misc_blurb          : '',
	        misc_info           : '',
	
	        tags                : []
	        // do NOT default on annotation, as this default is valid and will be passed on 'save'
	        //  which is incorrect behavior when the model is only partially fetched (annos are not passed in summary data)
	        //annotation          : ''
	    },
	
	    /** instance vars and listeners */
	    initialize : function( attributes, options ){
	        this.debug( this + '(Dataset).initialize', attributes, options );
	
	        //!! this state is not in trans.app.model.Dataset.states - set it here -
	        if( !this.get( 'accessible' ) ){
	            this.set( 'state', STATES.NOT_VIEWABLE );
	        }
	
	        /** Datasets rely/use some web controllers - have the model generate those URLs on startup */
	        this.urls = this._generateUrls();
	
	        this._setUpListeners();
	    },
	
	    /** returns misc. web urls for rendering things like re-run, display, etc. */
	    _generateUrls : function(){
	//TODO: would be nice if the API did this
	        var id = this.get( 'id' );
	        if( !id ){ return {}; }
	        var urls = {
	            'purge'         : 'datasets/' + id + '/purge_async',
	            'display'       : 'datasets/' + id + '/display/?preview=True',
	            'edit'          : 'datasets/' + id + '/edit',
	            'download'      : 'datasets/' + id + '/display?to_ext=' + this.get( 'file_ext' ),
	            'report_error'  : 'dataset/errors?id=' + id,
	            'rerun'         : 'tool_runner/rerun?id=' + id,
	            'show_params'   : 'datasets/' + id + '/show_params',
	            'visualization' : 'visualization',
	            'meta_download' : 'dataset/get_metadata_file?hda_id=' + id + '&metadata_name='
	        };
	//TODO: global
	        _.each( urls, function( value, key ){
	            urls[ key ] = Galaxy.root + value;
	        });
	        this.urls = urls;
	        return urls;
	    },
	
	    /** set up any event listeners
	     *  event: state:ready  fired when this DA moves into/is already in a ready state
	     */
	    _setUpListeners : function(){
	        // if the state has changed and the new state is a ready state, fire an event
	        this.on( 'change:state', function( currModel, newState ){
	            this.log( this + ' has changed state:', currModel, newState );
	            if( this.inReadyState() ){
	                this.trigger( 'state:ready', currModel, newState, this.previous( 'state' ) );
	            }
	        });
	        // the download url (currently) relies on having a correct file extension
	        this.on( 'change:id change:file_ext', function( currModel ){
	            this._generateUrls();
	        });
	    },
	
	    // ........................................................................ common queries
	    /** override to add urls */
	    toJSON : function(){
	        var json = Backbone.Model.prototype.toJSON.call( this );
	        //console.warn( 'returning json?' );
	        //return json;
	        return _.extend( json, {
	            urls : this.urls
	        });
	    },
	
	    /** Is this dataset deleted or purged? */
	    isDeletedOrPurged : function(){
	        return ( this.get( 'deleted' ) || this.get( 'purged' ) );
	    },
	
	    /** Is this dataset in a 'ready' state; where 'Ready' states are states where no
	     *      processing (for the ds) is left to do on the server.
	     */
	    inReadyState : function(){
	        var ready = _.contains( STATES.READY_STATES, this.get( 'state' ) );
	        return ( this.isDeletedOrPurged() || ready );
	    },
	
	    /** Does this model already contain detailed data (as opposed to just summary level data)? */
	    hasDetails : function(){
	        //?? this may not be reliable
	        return _.has( this.attributes, 'genome_build' );
	    },
	
	    /** Convenience function to match dataset.has_data. */
	    hasData : function(){
	        return ( this.get( 'file_size' ) > 0 );
	    },
	
	    // ........................................................................ ajax
	    fetch : function( options ){
	        var dataset = this;
	        return Backbone.Model.prototype.fetch.call( this, options )
	            .always( function(){
	                dataset._generateUrls();
	            });
	    },
	
	    //NOTE: subclasses of DA's will need to implement url and urlRoot in order to have these work properly
	    /** save this dataset, _Mark_ing it as deleted (just a flag) */
	    'delete' : function( options ){
	        if( this.get( 'deleted' ) ){ return jQuery.when(); }
	        return this.save( { deleted: true }, options );
	    },
	    /** save this dataset, _Mark_ing it as undeleted */
	    undelete : function( options ){
	        if( !this.get( 'deleted' ) || this.get( 'purged' ) ){ return jQuery.when(); }
	        return this.save( { deleted: false }, options );
	    },
	
	    /** remove the file behind this dataset from the filesystem (if permitted) */
	    purge : function _purge( options ){
	//TODO: use, override model.destroy, HDA.delete({ purge: true })
	        if( this.get( 'purged' ) ){ return jQuery.when(); }
	        options = options || {};
	        //var hda = this,
	        //    //xhr = jQuery.ajax( this.url() + '?' + jQuery.param({ purge: true }), _.extend({
	        //    xhr = jQuery.ajax( this.url(), _.extend({
	        //        type : 'DELETE',
	        //        data : {
	        //            purge : true
	        //        }
	        //    }, options ));
	        //
	        //xhr.done( function( response ){
	        //    hda.debug( 'response', response );
	        //    //hda.set({ deleted: true, purged: true });
	        //    hda.set( response );
	        //});
	        //return xhr;
	
	        options.url = this.urls.purge;
	
	        //TODO: ideally this would be a DELETE call to the api
	        //  using purge async for now
	        var hda = this,
	            xhr = jQuery.ajax( options );
	        xhr.done( function( message, status, responseObj ){
	            hda.set({ deleted: true, purged: true });
	        });
	        xhr.fail( function( xhr, status, message ){
	            // Exception messages are hidden within error page including:  '...not allowed in this Galaxy instance.'
	            // unbury and re-add to xhr
	            var error = _l( "Unable to purge dataset" );
	            var messageBuriedInUnfortunatelyFormattedError = ( 'Removal of datasets by users '
	                + 'is not allowed in this Galaxy instance' );
	            if( xhr.responseJSON && xhr.responseJSON.error ){
	                error = xhr.responseJSON.error;
	            } else if( xhr.responseText.indexOf( messageBuriedInUnfortunatelyFormattedError ) !== -1 ){
	                error = messageBuriedInUnfortunatelyFormattedError;
	            }
	            xhr.responseText = error;
	            hda.trigger( 'error', hda, xhr, options, _l( error ), { error: error } );
	        });
	        return xhr;
	    },
	
	    // ........................................................................ searching
	    // see base-mvc, SearchableModelMixin
	
	    /** what attributes of an HDA will be used in a text search */
	    searchAttributes : [
	        'name', 'file_ext', 'genome_build', 'misc_blurb', 'misc_info', 'annotation', 'tags'
	    ],
	
	    /** our attr keys don't often match the labels we display to the user - so, when using
	     *      attribute specifiers ('name="bler"') in a term, allow passing in aliases for the
	     *      following attr keys.
	     */
	    searchAliases : {
	        title       : 'name',
	        format      : 'file_ext',
	        database    : 'genome_build',
	        blurb       : 'misc_blurb',
	        description : 'misc_blurb',
	        info        : 'misc_info',
	        tag         : 'tags'
	    },
	
	    // ........................................................................ misc
	    /** String representation */
	    toString : function(){
	        var nameAndId = this.get( 'id' ) || '';
	        if( this.get( 'name' ) ){
	            nameAndId = '"' + this.get( 'name' ) + '",' + nameAndId;
	        }
	        return 'Dataset(' + nameAndId + ')';
	    }
	}));
	
	
	//==============================================================================
	/** @class Backbone collection for dataset associations.
	 */
	var DatasetAssociationCollection = Backbone.Collection.extend( BASE_MVC.LoggableMixin ).extend(
	/** @lends HistoryContents.prototype */{
	    _logNamespace : logNamespace,
	
	    model : DatasetAssociation,
	
	    /** root api url */
	    urlRoot : Galaxy.root + 'api/datasets',
	
	    /** url fn */
	    url : function(){
	        return this.urlRoot;
	    },
	
	    // ........................................................................ common queries
	    /** Get the ids of every item in this collection
	     *  @returns array of encoded ids
	     */
	    ids : function(){
	        return this.map( function( item ){ return item.get('id'); });
	    },
	
	    /** Get contents that are not ready
	     *  @returns array of content models
	     */
	    notReady : function(){
	        return this.filter( function( content ){
	            return !content.inReadyState();
	        });
	    },
	
	    /** return true if any datasets don't have details */
	    haveDetails : function(){
	        return this.all( function( dataset ){ return dataset.hasDetails(); });
	    },
	
	    // ........................................................................ ajax
	    /** using a queue, perform ajaxFn on each of the models in this collection */
	    ajaxQueue : function( ajaxFn, options ){
	        var deferred = jQuery.Deferred(),
	            startingLength = this.length,
	            responses = [];
	
	        if( !startingLength ){
	            deferred.resolve([]);
	            return deferred;
	        }
	
	        // use reverse order (stylistic choice)
	        var ajaxFns = this.chain().reverse().map( function( dataset, i ){
	            return function(){
	                var xhr = ajaxFn.call( dataset, options );
	                // if successful, notify using the deferred to allow tracking progress
	                xhr.done( function( response ){
	                    deferred.notify({ curr: i, total: startingLength, response: response, model: dataset });
	                });
	                // (regardless of previous error or success) if not last ajax call, shift and call the next
	                //  if last fn, resolve deferred
	                xhr.always( function( response ){
	                    responses.push( response );
	                    if( ajaxFns.length ){
	                        ajaxFns.shift()();
	                    } else {
	                        deferred.resolve( responses );
	                    }
	                });
	            };
	        }).value();
	        // start the queue
	        ajaxFns.shift()();
	
	        return deferred;
	    },
	
	    // ........................................................................ sorting/filtering
	    /** return a new collection of datasets whose attributes contain the substring matchesWhat */
	    matches : function( matchesWhat ){
	        return this.filter( function( dataset ){
	            return dataset.matches( matchesWhat );
	        });
	    },
	
	    // ........................................................................ misc
	    ///** Convert this ad-hoc collection of hdas to a formal collection tracked
	    //    by the server.
	    //**/
	    //promoteToHistoryDatasetCollection : function _promote( history, collection_type, options ){
	    //},
	
	    /** String representation. */
	    toString : function(){
	         return ([ 'DatasetAssociationCollection(', this.length, ')' ].join( '' ));
	    }
	});
	
	
	//==============================================================================
	    return {
	        DatasetAssociation              : DatasetAssociation,
	        DatasetAssociationCollection    : DatasetAssociationCollection
	    };
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! underscore */ 1), __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 71 */
/*!**************************************************!*\
  !*** ./galaxy/scripts/mvc/history/hdca-model.js ***!
  \**************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(_) {!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	    __webpack_require__(/*! mvc/collection/collection-model */ 72),
	    __webpack_require__(/*! mvc/history/history-content-model */ 67),
	    __webpack_require__(/*! utils/localization */ 7)
	], __WEBPACK_AMD_DEFINE_RESULT__ = function( DC_MODEL, HISTORY_CONTENT, _l ){
	
	'use strict';
	
	/*==============================================================================
	
	Models for DatasetCollections contained within a history.
	
	TODO:
	    these might be compactable to one class if some duplication with
	    collection-model is used.
	
	==============================================================================*/
	var hcontentMixin = HISTORY_CONTENT.HistoryContentMixin,
	    ListDC = DC_MODEL.ListDatasetCollection,
	    PairDC = DC_MODEL.PairDatasetCollection,
	    ListPairedDC = DC_MODEL.ListPairedDatasetCollection;
	
	//==============================================================================
	/** Override to post to contents route w/o id. */
	function buildHDCASave( _super ){
	    return function _save( attributes, options ){
	        if( this.isNew() ){
	            options = options || {};
	            options.url = this.urlRoot + this.get( 'history_id' ) + '/contents';
	            attributes = attributes || {};
	            attributes.type = 'dataset_collection';
	        }
	        return _super.call( this, attributes, options );
	    };
	}
	
	
	//==============================================================================
	/** @class Backbone model for List Dataset Collection within a History.
	 */
	var HistoryListDatasetCollection = ListDC.extend( hcontentMixin ).extend(
	/** @lends HistoryListDatasetCollection.prototype */{
	
	    defaults : _.extend( _.clone( ListDC.prototype.defaults ), {
	        history_content_type: 'dataset_collection',
	        collection_type     : 'list',
	        model_class         : 'HistoryDatasetCollectionAssociation'
	    }),
	
	    initialize : function( model, options ){
	        ListDC.prototype.initialize.call( this, model, options );
	        hcontentMixin.initialize.call( this, model, options );
	    },
	
	    /** Override to post to contents route w/o id. */
	    save : buildHDCASave( ListDC.prototype.save ),
	
	    /** String representation. */
	    toString : function(){
	         return ([ 'HistoryListDatasetCollection(', this.get( 'name' ), ')' ].join( '' ));
	    }
	});
	
	
	//==============================================================================
	/** @class Backbone model for Pair Dataset Collection within a History.
	 *  @constructs
	 */
	var HistoryPairDatasetCollection = PairDC.extend( hcontentMixin ).extend(
	/** @lends HistoryPairDatasetCollection.prototype */{
	
	    defaults : _.extend( _.clone( PairDC.prototype.defaults ), {
	        history_content_type: 'dataset_collection',
	        collection_type     : 'paired',
	        model_class         : 'HistoryDatasetCollectionAssociation'
	    }),
	
	    initialize : function( model, options ){
	        PairDC.prototype.initialize.call( this, model, options );
	        hcontentMixin.initialize.call( this, model, options );
	    },
	
	    /** Override to post to contents route w/o id. */
	    save : buildHDCASave( PairDC.prototype.save ),
	
	    /** String representation. */
	    toString : function(){
	         return ([ 'HistoryPairDatasetCollection(', this.get( 'name' ), ')' ].join( '' ));
	    }
	});
	
	
	//==============================================================================
	/** @class Backbone model for List of Pairs Dataset Collection within a History.
	 *  @constructs
	 */
	var HistoryListPairedDatasetCollection = ListPairedDC.extend( hcontentMixin ).extend(
	/** @lends HistoryListPairedDatasetCollection.prototype */{
	
	    defaults : _.extend( _.clone( ListPairedDC.prototype.defaults ), {
	        history_content_type: 'dataset_collection',
	        collection_type     : 'list:paired',
	        model_class         : 'HistoryDatasetCollectionAssociation'
	    }),
	
	    initialize : function( model, options ){
	        ListPairedDC.prototype.initialize.call( this, model, options );
	        hcontentMixin.initialize.call( this, model, options );
	    },
	
	    /** Override to post to contents route w/o id. */
	    save : buildHDCASave( ListPairedDC.prototype.save ),
	
	    /** String representation. */
	    toString : function(){
	         return ([ 'HistoryListPairedDatasetCollection(', this.get( 'name' ), ')' ].join( '' ));
	    }
	});
	
	
	//==============================================================================
	    return {
	        HistoryListDatasetCollection        : HistoryListDatasetCollection,
	        HistoryPairDatasetCollection        : HistoryPairDatasetCollection,
	        HistoryListPairedDatasetCollection  : HistoryListPairedDatasetCollection
	    };
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! underscore */ 1)))

/***/ },
/* 72 */
/*!***********************************************************!*\
  !*** ./galaxy/scripts/mvc/collection/collection-model.js ***!
  \***********************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(_, Backbone, jQuery) {!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	    __webpack_require__(/*! mvc/dataset/dataset-model */ 70),
	    __webpack_require__(/*! mvc/base-mvc */ 5),
	    __webpack_require__(/*! utils/localization */ 7)
	], __WEBPACK_AMD_DEFINE_RESULT__ = function( DATASET_MODEL, BASE_MVC, _l ){
	
	'use strict';
	
	var logNamespace = 'collections';
	//==============================================================================
	/*
	Notes:
	
	Terminology:
	    DatasetCollection/DC : a container of datasets or nested DatasetCollections
	    Element/DatasetCollectionElement/DCE : an item contained in a DatasetCollection
	    HistoryDatasetCollectionAssociation/HDCA: a DatasetCollection contained in a history
	
	
	This all seems too complex unfortunately:
	
	- Terminology collision between DatasetCollections (DCs) and Backbone Collections.
	- In the DatasetCollections API JSON, DC Elements use a 'Has A' stucture to *contain*
	    either a dataset or a nested DC. This would make the hierarchy much taller. I've
	    decided to merge the contained JSON with the DC element json - making the 'has a'
	    relation into an 'is a' relation. This seems simpler to me and allowed a lot of
	    DRY in both models and views, but may make tracking or tracing within these models
	    more difficult (since DatasetCollectionElements are now *also* DatasetAssociations
	    or DatasetCollections (nested)). This also violates the rule of thumb about
	    favoring aggregation over inheritance.
	- Currently, there are three DatasetCollection subclasses: List, Pair, and ListPaired.
	    These each should a) be usable on their own, b) be usable in the context of
	    nesting within a collection model (at least in the case of ListPaired), and
	    c) be usable within the context of other container models (like History or
	    LibraryFolder, etc.). I've tried to separate/extract classes in order to
	    handle those three situations, but it's proven difficult to do in a simple,
	    readable manner.
	- Ideally, histories and libraries would inherit from the same server models as
	    dataset collections do since they are (in essence) dataset collections themselves -
	    making the whole nested structure simpler. This would be a large, error-prone
	    refactoring and migration.
	
	Many of the classes and heirarchy are meant as extension points so, while the
	relations and flow may be difficult to understand initially, they'll allow us to
	handle the growth or flux dataset collection in the future (w/o actually implementing
	any YAGNI).
	
	*/
	//_________________________________________________________________________________________________ ELEMENTS
	/** @class mixin for Dataset collection elements.
	 *      When collection elements are passed from the API, the underlying element is
	 *          in a sub-object 'object' (IOW, a DCE representing an HDA will have HDA json in element.object).
	 *      This mixin uses the constructor and parse methods to merge that JSON with the DCE attribtues
	 *          effectively changing a DCE from a container to a subclass (has a --> is a).
	 */
	var DatasetCollectionElementMixin = {
	
	    /** default attributes used by elements in a dataset collection */
	    defaults : {
	        model_class         : 'DatasetCollectionElement',
	        element_identifier  : null,
	        element_index       : null,
	        element_type        : null
	    },
	
	    /** merge the attributes of the sub-object 'object' into this model */
	    _mergeObject : function( attributes ){
	        // if we don't preserve and correct ids here, the element id becomes the object id
	        // and collision in backbone's _byId will occur and only
	        _.extend( attributes, attributes.object, { element_id: attributes.id });
	        delete attributes.object;
	        return attributes;
	    },
	
	    /** override to merge this.object into this */
	    constructor : function( attributes, options ){
	        // console.debug( '\t DatasetCollectionElement.constructor:', attributes, options );
	        attributes = this._mergeObject( attributes );
	        this.idAttribute = 'element_id';
	        Backbone.Model.apply( this, arguments );
	    },
	
	    /** when the model is fetched, merge this.object into this */
	    parse : function( response, options ){
	        var attributes = response;
	        attributes = this._mergeObject( attributes );
	        return attributes;
	    }
	};
	
	//TODO: unused?
	/** @class Concrete class of Generic DatasetCollectionElement */
	var DatasetCollectionElement = Backbone.Model
	    .extend( BASE_MVC.LoggableMixin )
	    .extend( DatasetCollectionElementMixin )
	    .extend({ _logNamespace : logNamespace });
	
	
	//==============================================================================
	/** @class Base/Abstract Backbone collection for Generic DCEs. */
	var DCECollection = Backbone.Collection.extend( BASE_MVC.LoggableMixin ).extend(
	/** @lends DCECollection.prototype */{
	    _logNamespace : logNamespace,
	
	    model: DatasetCollectionElement,
	
	    /** logger used to record this.log messages, commonly set to console */
	    //logger              : console,
	
	//TODO: unused?
	    /** Set up.
	     *  @see Backbone.Collection#initialize
	     */
	    initialize : function( attributes, options ){
	        this.debug( this + '(DCECollection).initialize:', attributes, options );
	        options = options || {};
	        //this._setUpListeners();
	    },
	
	    /** String representation. */
	    toString : function(){
	         return ([ 'DatasetCollectionElementCollection(', this.length, ')' ].join( '' ));
	    }
	});
	
	
	//==============================================================================
	/** @class Backbone model for a dataset collection element that is a dataset (HDA).
	 */
	var DatasetDCE = DATASET_MODEL.DatasetAssociation.extend( BASE_MVC.mixin( DatasetCollectionElementMixin,
	/** @lends DatasetDCE.prototype */{
	
	    /** logger used to record this.log messages, commonly set to console */
	    //logger              : console,
	
	    /** url fn */
	    url : function(){
	        // won't always be an hda
	        if( !this.has( 'history_id' ) ){
	            console.warn( 'no endpoint for non-hdas within a collection yet' );
	            // (a little silly since this api endpoint *also* points at hdas)
	            return Galaxy.root + 'api/datasets';
	        }
	        return Galaxy.root + 'api/histories/' + this.get( 'history_id' ) + '/contents/' + this.get( 'id' );
	    },
	
	    defaults : _.extend( {},
	        DATASET_MODEL.DatasetAssociation.prototype.defaults,
	        DatasetCollectionElementMixin.defaults
	    ),
	
	    // because all objects have constructors (as this hashmap would even if this next line wasn't present)
	    //  the constructor in hcontentMixin won't be attached by BASE_MVC.mixin to this model
	    //  - re-apply manually for now
	    /** call the mixin constructor */
	    constructor : function( attributes, options ){
	        this.debug( '\t DatasetDCE.constructor:', attributes, options );
	        //DATASET_MODEL.DatasetAssociation.prototype.constructor.call( this, attributes, options );
	        DatasetCollectionElementMixin.constructor.call( this, attributes, options );
	    },
	
	//TODO: unused?
	    /** set up */
	    initialize : function( attributes, options ){
	        this.debug( this + '(DatasetDCE).initialize:', attributes, options );
	        DATASET_MODEL.DatasetAssociation.prototype.initialize.call( this, attributes, options );
	    },
	
	    /** Does this model already contain detailed data (as opposed to just summary level data)? */
	    hasDetails : function(){
	        // dataset collection api does return genome_build but doesn't return annotation
	        return _.has( this.attributes, 'annotation' );
	    },
	
	    /** String representation. */
	    toString : function(){
	        var objStr = this.get( 'element_identifier' );
	        return ([ 'DatasetDCE(', objStr, ')' ].join( '' ));
	    }
	}));
	
	
	//==============================================================================
	/** @class DCECollection of DatasetDCE's (a list of datasets, a pair of datasets).
	 */
	var DatasetDCECollection = DCECollection.extend(
	/** @lends DatasetDCECollection.prototype */{
	    model: DatasetDCE,
	
	    /** logger used to record this.log messages, commonly set to console */
	    //logger              : console,
	
	//TODO: unused?
	    /** set up */
	    initialize : function( attributes, options ){
	        this.debug( this + '(DatasetDCECollection).initialize:', attributes, options );
	        DCECollection.prototype.initialize.call( this, attributes, options );
	    },
	
	    /** String representation. */
	    toString : function(){
	         return ([ 'DatasetDCECollection(', this.length, ')' ].join( '' ));
	    }
	});
	
	
	//_________________________________________________________________________________________________ COLLECTIONS
	/** @class Backbone model for Dataset Collections.
	 *      The DC API returns an array of JSON objects under the attribute elements.
	 *      This model:
	 *          - removes that array/attribute ('elements') from the model,
	 *          - creates a bbone collection (of the class defined in the 'collectionClass' attribute),
	 *          - passes that json onto the bbone collection
	 *          - caches the bbone collection in this.elements
	 */
	var DatasetCollection = Backbone.Model
	        .extend( BASE_MVC.LoggableMixin )
	        .extend( BASE_MVC.SearchableModelMixin )
	        .extend(/** @lends DatasetCollection.prototype */{
	    _logNamespace : logNamespace,
	
	    /** logger used to record this.log messages, commonly set to console */
	    //logger              : console,
	
	    /** default attributes for a model */
	    defaults : {
	        /* 'list', 'paired', or 'list:paired' */
	        collection_type     : null,
	        //??
	        deleted             : false
	    },
	
	    /** Which class to use for elements */
	    collectionClass : DCECollection,
	
	    /** set up: create elements instance var and (on changes to elements) update them  */
	    initialize : function( model, options ){
	        this.debug( this + '(DatasetCollection).initialize:', model, options, this );
	        //historyContent.HistoryContent.prototype.initialize.call( this, attrs, options );
	        this.elements = this._createElementsModel();
	        this.on( 'change:elements', function(){
	            this.log( 'change:elements' );
	//TODO: prob. better to update the collection instead of re-creating it
	            this.elements = this._createElementsModel();
	        });
	    },
	
	    /** move elements model attribute to full collection */
	    _createElementsModel : function(){
	        this.debug( this + '._createElementsModel', this.collectionClass, this.get( 'elements' ), this.elements );
	//TODO: same patterns as DatasetCollectionElement _createObjectModel - refactor to BASE_MVC.hasSubModel?
	        var elements = this.get( 'elements' ) || [];
	        this.unset( 'elements', { silent: true });
	        this.elements = new this.collectionClass( elements );
	        //this.debug( 'collectionClass:', this.collectionClass + '', this.elements );
	        return this.elements;
	    },
	
	    // ........................................................................ common queries
	    /** pass the elements back within the model json when this is serialized */
	    toJSON : function(){
	        var json = Backbone.Model.prototype.toJSON.call( this );
	        if( this.elements ){
	            json.elements = this.elements.toJSON();
	        }
	        return json;
	    },
	
	    /** Is this collection in a 'ready' state no processing (for the collection) is left
	     *  to do on the server.
	     */
	    inReadyState : function(){
	        var populated = this.get( 'populated' );
	        return ( this.isDeletedOrPurged() || populated );
	    },
	
	    //TODO:?? the following are the same interface as DatasetAssociation - can we combine?
	    /** Does the DC contain any elements yet? Is a fetch() required? */
	    hasDetails : function(){
	//TODO: this is incorrect for (accidentally) empty collections
	        this.debug( 'hasDetails:', this.elements.length );
	        return this.elements.length !== 0;
	    },
	
	    /** Given the filters, what models in this.elements would be returned? */
	    getVisibleContents : function( filters ){
	        // filters unused for now
	        return this.elements;
	    },
	
	    // ........................................................................ ajax
	    /** save this dataset, _Mark_ing it as deleted (just a flag) */
	    'delete' : function( options ){
	        if( this.get( 'deleted' ) ){ return jQuery.when(); }
	        return this.save( { deleted: true }, options );
	    },
	    /** save this dataset, _Mark_ing it as undeleted */
	    undelete : function( options ){
	        if( !this.get( 'deleted' ) || this.get( 'purged' ) ){ return jQuery.when(); }
	        return this.save( { deleted: false }, options );
	    },
	
	    /** Is this collection deleted or purged? */
	    isDeletedOrPurged : function(){
	        return ( this.get( 'deleted' ) || this.get( 'purged' ) );
	    },
	
	    // ........................................................................ searchable
	    /** searchable attributes for collections */
	    searchAttributes : [
	        'name'
	    ],
	
	    // ........................................................................ misc
	    /** String representation */
	    toString : function(){
	        var idAndName = [ this.get( 'id' ), this.get( 'name' ) || this.get( 'element_identifier' ) ];
	        return 'DatasetCollection(' + ( idAndName.join(',') ) + ')';
	    }
	});
	
	
	//==============================================================================
	/** Model for a DatasetCollection containing datasets (non-nested).
	 */
	var ListDatasetCollection = DatasetCollection.extend(
	/** @lends ListDatasetCollection.prototype */{
	
	    /** logger used to record this.log messages, commonly set to console */
	    //logger              : console,
	
	    /** override since we know the collection will only contain datasets */
	    collectionClass : DatasetDCECollection,
	
	//TODO: unused?
	    initialize : function( attrs, options ){
	        this.debug( this + '(ListDatasetCollection).initialize:', attrs, options );
	        DatasetCollection.prototype.initialize.call( this, attrs, options );
	    },
	
	    /** String representation. */
	    toString : function(){
	         return ([ 'ListDatasetCollection(', this.get( 'name' ), ')' ].join( '' ));
	    }
	});
	
	
	//==============================================================================
	/** Model for a DatasetCollection containing fwd/rev datasets (a list of 2).
	 */
	var PairDatasetCollection = ListDatasetCollection.extend(
	/** @lends PairDatasetCollection.prototype */{
	
	    /** logger used to record this.log messages, commonly set to console */
	    //logger              : console,
	
	//TODO: unused?
	    /**  */
	    initialize : function( attrs, options ){
	        this.debug( this + '(PairDatasetCollection).initialize:', attrs, options );
	        ListDatasetCollection.prototype.initialize.call( this, attrs, options );
	    },
	
	    /** String representation. */
	    toString : function(){
	         return ([ 'PairDatasetCollection(', this.get( 'name' ), ')' ].join( '' ));
	    }
	});
	
	
	//_________________________________________________________________________________________________ NESTED COLLECTIONS
	// this is where things get weird, man. Weird.
	//TODO: it might be possible to compact all the following...I think.
	//==============================================================================
	/** @class Backbone model for a Generic DatasetCollectionElement that is also a DatasetCollection
	 *      (a nested collection). Currently only list:paired.
	 */
	var NestedDCDCE = DatasetCollection.extend( BASE_MVC.mixin( DatasetCollectionElementMixin,
	/** @lends NestedDCDCE.prototype */{
	
	    /** logger used to record this.log messages, commonly set to console */
	    //logger              : console,
	
	    // because all objects have constructors (as this hashmap would even if this next line wasn't present)
	    //  the constructor in hcontentMixin won't be attached by BASE_MVC.mixin to this model
	    //  - re-apply manually it now
	    /** call the mixin constructor */
	    constructor : function( attributes, options ){
	        this.debug( '\t NestedDCDCE.constructor:', attributes, options );
	        DatasetCollectionElementMixin.constructor.call( this, attributes, options );
	    },
	
	    /** String representation. */
	    toString : function(){
	        var objStr = ( this.object )?( '' + this.object ):( this.get( 'element_identifier' ) );
	        return ([ 'NestedDCDCE(', objStr, ')' ].join( '' ));
	    }
	}));
	
	
	//==============================================================================
	/** @class Backbone collection containing Generic NestedDCDCE's (nested dataset collections).
	 */
	var NestedDCDCECollection = DCECollection.extend(
	/** @lends NestedDCDCECollection.prototype */{
	
	    /** logger used to record this.log messages, commonly set to console */
	    //logger              : console,
	
	    /** This is a collection of nested collections */
	    model: NestedDCDCE,
	
	//TODO: unused?
	    /** set up */
	    initialize : function( attrs, options ){
	        this.debug( this + '(NestedDCDCECollection).initialize:', attrs, options );
	        DCECollection.prototype.initialize.call( this, attrs, options );
	    },
	
	    /** String representation. */
	    toString : function(){
	         return ([ 'NestedDCDCECollection(', this.length, ')' ].join( '' ));
	    }
	});
	
	
	//==============================================================================
	/** @class Backbone model for a paired dataset collection within a list:paired dataset collection.
	 */
	var NestedPairDCDCE = PairDatasetCollection.extend( BASE_MVC.mixin( DatasetCollectionElementMixin,
	/** @lends NestedPairDCDCE.prototype */{
	//TODO:?? possibly rename to NestedDatasetCollection?
	
	    /** logger used to record this.log messages, commonly set to console */
	    //logger              : console,
	
	    // because all objects have constructors (as this hashmap would even if this next line wasn't present)
	    //  the constructor in hcontentMixin won't be attached by BASE_MVC.mixin to this model
	    //  - re-apply manually it now
	    /** This is both a collection and a collection element - call the constructor */
	    constructor : function( attributes, options ){
	        this.debug( '\t NestedPairDCDCE.constructor:', attributes, options );
	        //DatasetCollection.constructor.call( this, attributes, options );
	        DatasetCollectionElementMixin.constructor.call( this, attributes, options );
	    },
	
	    /** String representation. */
	    toString : function(){
	        var objStr = ( this.object )?( '' + this.object ):( this.get( 'element_identifier' ) );
	        return ([ 'NestedPairDCDCE(', objStr, ')' ].join( '' ));
	    }
	}));
	
	
	//==============================================================================
	/** @class Backbone collection for a backbone collection containing paired dataset collections.
	 */
	var NestedPairDCDCECollection = NestedDCDCECollection.extend(
	/** @lends PairDCDCECollection.prototype */{
	
	    /** logger used to record this.log messages, commonly set to console */
	    //logger              : console,
	
	    /** We know this collection is composed of only nested pair collections */
	    model: NestedPairDCDCE,
	
	//TODO: unused?
	    /** set up */
	    initialize : function( attrs, options ){
	        this.debug( this + '(NestedPairDCDCECollection).initialize:', attrs, options );
	        NestedDCDCECollection.prototype.initialize.call( this, attrs, options );
	    },
	
	    /** String representation. */
	    toString : function(){
	         return ([ 'NestedPairDCDCECollection(', this.length, ')' ].join( '' ));
	    }
	});
	
	
	//==============================================================================
	/** @class Backbone Model for a DatasetCollection (list) that contains DatasetCollections (pairs).
	 */
	var ListPairedDatasetCollection = DatasetCollection.extend(
	/** @lends ListPairedDatasetCollection.prototype */{
	
	    /** logger used to record this.log messages, commonly set to console */
	    //logger              : console,
	
	    /** list:paired is the only collection that itself contains collections */
	    collectionClass : NestedPairDCDCECollection,
	
	//TODO: unused?
	    /** set up */
	    initialize : function( attributes, options ){
	        this.debug( this + '(ListPairedDatasetCollection).initialize:', attributes, options );
	        DatasetCollection.prototype.initialize.call( this, attributes, options );
	    },
	
	    /** String representation. */
	    toString : function(){
	         return ([ 'ListPairedDatasetCollection(', this.get( 'name' ), ')' ].join( '' ));
	    }
	});
	
	
	//==============================================================================
	    return {
	        ListDatasetCollection               : ListDatasetCollection,
	        PairDatasetCollection               : PairDatasetCollection,
	        ListPairedDatasetCollection         : ListPairedDatasetCollection
	    };
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! underscore */ 1), __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 73 */
/*!*********************************************************!*\
  !*** ./galaxy/scripts/mvc/history/history-view-edit.js ***!
  \*********************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(_, $, jQuery) {!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	    __webpack_require__(/*! mvc/history/history-view */ 77),
	    __webpack_require__(/*! mvc/history/history-contents */ 66),
	    __webpack_require__(/*! mvc/dataset/states */ 68),
	    __webpack_require__(/*! mvc/history/hda-model */ 69),
	    __webpack_require__(/*! mvc/history/hda-li-edit */ 88),
	    __webpack_require__(/*! mvc/history/hdca-li-edit */ 93),
	    __webpack_require__(/*! mvc/tag */ 90),
	    __webpack_require__(/*! mvc/annotation */ 91),
	    __webpack_require__(/*! mvc/collection/list-collection-creator */ 74),
	    __webpack_require__(/*! mvc/collection/pair-collection-creator */ 96),
	    __webpack_require__(/*! mvc/collection/list-of-pairs-collection-creator */ 97),
	    __webpack_require__(/*! ui/fa-icon-button */ 78),
	    __webpack_require__(/*! mvc/ui/popup-menu */ 62),
	    __webpack_require__(/*! utils/localization */ 7),
	    __webpack_require__(/*! ui/editable-text */ 92),
	], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	    HISTORY_VIEW,
	    HISTORY_CONTENTS,
	    STATES,
	    HDA_MODEL,
	    HDA_LI_EDIT,
	    HDCA_LI_EDIT,
	    TAGS,
	    ANNOTATIONS,
	    LIST_COLLECTION_CREATOR,
	    PAIR_COLLECTION_CREATOR,
	    LIST_OF_PAIRS_COLLECTION_CREATOR,
	    faIconButton,
	    PopupMenu,
	    _l
	){
	
	'use strict';
	
	/* =============================================================================
	TODO:
	
	============================================================================= */
	var _super = HISTORY_VIEW.HistoryView;
	// base class for history-view-edit-current and used as-is in history/view.mako
	/** @class Editable View/Controller for the history model.
	 *
	 *  Allows:
	 *      (everything HistoryView allows)
	 *      changing the name
	 *      displaying and editing tags and annotations
	 *      multi-selection and operations on mulitple content items
	 */
	var HistoryViewEdit = _super.extend(
	/** @lends HistoryViewEdit.prototype */{
	
	    /** logger used to record this.log messages, commonly set to console */
	    //logger              : console,
	
	    /** class to use for constructing the HistoryDatasetAssociation views */
	    HDAViewClass    : HDA_LI_EDIT.HDAListItemEdit,
	    /** class to use for constructing the HistoryDatasetCollectionAssociation views */
	    HDCAViewClass   : HDCA_LI_EDIT.HDCAListItemEdit,
	
	    // ......................................................................... SET UP
	    /** Set up the view, set up storage, bind listeners to HistoryContents events
	     *  @param {Object} attributes
	     */
	    initialize : function( attributes ){
	        attributes = attributes || {};
	        _super.prototype.initialize.call( this, attributes );
	
	        // ---- set up instance vars
	        /** editor for tags - sub-view */
	        this.tagsEditor = null;
	        /** editor for annotations - sub-view */
	        this.annotationEditor = null;
	
	        /** allow user purge of dataset files? */
	        this.purgeAllowed = attributes.purgeAllowed || false;
	
	        // states/modes the panel can be in
	        /** is the panel currently showing the dataset selection controls? */
	        this.annotationEditorShown  = attributes.annotationEditorShown || false;
	        this.tagsEditorShown  = attributes.tagsEditorShown || false;
	    },
	
	    /** Override to handle history as drag-drop target */
	    _setUpListeners : function(){
	        var panel = this;
	        _super.prototype._setUpListeners.call( panel );
	
	        panel.on( 'drop', function( ev, data ){
	            panel.dataDropped( data );
	            // remove the drop target
	            panel.dropTargetOff();
	        });
	        panel.on( 'view:attached view:removed', function(){
	            panel._renderCounts();
	        });
	    },
	
	    // ------------------------------------------------------------------------ listeners
	    /** listening for collection events */
	    _setUpCollectionListeners : function(){
	        _super.prototype._setUpCollectionListeners.call( this );
	
	        this.listenTo( this.collection, {
	            'change:deleted': this._handleHdaDeletionChange,
	            'change:visible': this._handleHdaVisibleChange,
	            'change:purged' : function( model ){
	                // hafta get the new nice-size w/o the purged model
	                this.model.fetch();
	            }
	        });
	        return this;
	    },
	
	    /** listening for history and HDA events */
	    _setUpModelListeners : function(){
	        _super.prototype._setUpModelListeners.call( this );
	        this.listenTo( this.model, 'change:size', this.updateHistoryDiskSize );
	        return this;
	    },
	
	    // ------------------------------------------------------------------------ panel rendering
	    /** In this override, add tag and annotation editors and a btn to toggle the selectors */
	    _buildNewRender : function(){
	        // create a new render using a skeleton template, render title buttons, render body, and set up events, etc.
	        var $newRender = _super.prototype._buildNewRender.call( this );
	        if( !this.model ){ return $newRender; }
	
	        if( Galaxy && Galaxy.user && Galaxy.user.id && Galaxy.user.id === this.model.get( 'user_id' ) ){
	            this._renderTags( $newRender );
	            this._renderAnnotation( $newRender );
	        }
	        return $newRender;
	    },
	
	    /** override to render counts when the items are rendered */
	    renderItems : function( $whereTo ){
	        var views = _super.prototype.renderItems.call( this, $whereTo );
	        this._renderCounts( $whereTo );
	        return views;
	    },
	
	    /** override to show counts, what's deleted/hidden, and links to toggle those */
	    _renderCounts : function( $whereTo ){
	//TODO: too complicated
	        function toggleLink( _class, text ){
	            return [ '<a class="', _class, '" href="javascript:void(0);">', text, '</a>' ].join( '' );
	        }
	        $whereTo = $whereTo || this.$el;
	        var deleted  = this.collection.where({ deleted: true }),
	            hidden   = this.collection.where({ visible: false }),
	            msgs = [];
	
	        if( this.views.length ){
	            msgs.push( [ this.views.length, _l( 'shown' ) ].join( ' ' ) );
	        }
	        if( deleted.length ){
	            msgs.push( ( !this.showDeleted )?
	                 ([ deleted.length, toggleLink( 'toggle-deleted-link', _l( 'deleted' ) ) ].join( ' ' ))
	                :( toggleLink( 'toggle-deleted-link', _l( 'hide deleted' ) ) )
	            );
	        }
	        if( hidden.length ){
	            msgs.push( ( !this.showHidden )?
	                 ([ hidden.length, toggleLink( 'toggle-hidden-link', _l( 'hidden' ) ) ].join( ' ' ))
	                :( toggleLink( 'toggle-hidden-link', _l( 'hide hidden' ) ) )
	            );
	        }
	        return $whereTo.find( '> .controls .subtitle' ).html( msgs.join( ', ' ) );
	    },
	
	    /** render the tags sub-view controller */
	    _renderTags : function( $where ){
	        var panel = this;
	        this.tagsEditor = new TAGS.TagsEditor({
	            model           : this.model,
	            el              : $where.find( '.controls .tags-display' ),
	            onshowFirstTime : function(){ this.render(); },
	            // show hide sub-view tag editors when this is shown/hidden
	            onshow          : function(){
	                panel.toggleHDATagEditors( true,  panel.fxSpeed );
	            },
	            onhide          : function(){
	                panel.toggleHDATagEditors( false, panel.fxSpeed );
	            },
	            $activator      : faIconButton({
	                title   : _l( 'Edit history tags' ),
	                classes : 'history-tag-btn',
	                faIcon  : 'fa-tags'
	            }).appendTo( $where.find( '.controls .actions' ) )
	        });
	    },
	    /** render the annotation sub-view controller */
	    _renderAnnotation : function( $where ){
	        var panel = this;
	        this.annotationEditor = new ANNOTATIONS.AnnotationEditor({
	            model           : this.model,
	            el              : $where.find( '.controls .annotation-display' ),
	            onshowFirstTime : function(){ this.render(); },
	            // show hide sub-view view annotation editors when this is shown/hidden
	            onshow          : function(){
	                panel.toggleHDAAnnotationEditors( true,  panel.fxSpeed );
	            },
	            onhide          : function(){
	                panel.toggleHDAAnnotationEditors( false, panel.fxSpeed );
	            },
	            $activator      : faIconButton({
	                title   : _l( 'Edit history annotation' ),
	                classes : 'history-annotate-btn',
	                faIcon  : 'fa-comment'
	            }).appendTo( $where.find( '.controls .actions' ) )
	        });
	    },
	
	    /** Set up HistoryViewEdit js/widget behaviours
	     *  In this override, make the name editable
	     */
	    _setUpBehaviors : function( $where ){
	        $where = $where || this.$el;
	        _super.prototype._setUpBehaviors.call( this, $where );
	        if( !this.model ){ return; }
	
	        // anon users shouldn't have access to any of the following
	        if( ( !Galaxy.user || Galaxy.user.isAnonymous() )
	        ||  ( Galaxy.user.id !== this.model.get( 'user_id' ) ) ){
	            return;
	        }
	
	        var panel = this,
	            nameSelector = '> .controls .name';
	        $where.find( nameSelector )
	            .attr( 'title', _l( 'Click to rename history' ) )
	            .tooltip({ placement: 'bottom' })
	            .make_text_editable({
	                on_finish: function( newName ){
	                    var previousName = panel.model.get( 'name' );
	                    if( newName && newName !== previousName ){
	                        panel.$el.find( nameSelector ).text( newName );
	                        panel.model.save({ name: newName })
	                            .fail( function(){
	                                panel.$el.find( nameSelector ).text( panel.model.previous( 'name' ) );
	                            });
	                    } else {
	                        panel.$el.find( nameSelector ).text( previousName );
	                    }
	                }
	            });
	    },
	
	    /** return a new popup menu for choosing a multi selection action
	     *  ajax calls made for multiple datasets are queued
	     */
	    multiselectActions : function(){
	        var panel = this,
	            actions = [
	                {   html: _l( 'Hide datasets' ), func: function(){
	                        var action = HDA_MODEL.HistoryDatasetAssociation.prototype.hide;
	                        panel.getSelectedModels().ajaxQueue( action );
	                    }
	                },
	                {   html: _l( 'Unhide datasets' ), func: function(){
	                        var action = HDA_MODEL.HistoryDatasetAssociation.prototype.unhide;
	                        panel.getSelectedModels().ajaxQueue( action );
	                    }
	                },
	                {   html: _l( 'Delete datasets' ), func: function(){
	                        var action = HDA_MODEL.HistoryDatasetAssociation.prototype['delete'];
	                        panel.getSelectedModels().ajaxQueue( action );
	                    }
	                },
	                {   html: _l( 'Undelete datasets' ), func: function(){
	                        var action = HDA_MODEL.HistoryDatasetAssociation.prototype.undelete;
	                        panel.getSelectedModels().ajaxQueue( action );
	                    }
	                }
	            ];
	        if( panel.purgeAllowed ){
	            actions.push({
	                html: _l( 'Permanently delete datasets' ), func: function(){
	                    if( confirm( _l( 'This will permanently remove the data in your datasets. Are you sure?' ) ) ){
	                        var action = HDA_MODEL.HistoryDatasetAssociation.prototype.purge;
	                        panel.getSelectedModels().ajaxQueue( action );
	                    }
	                }
	            });
	        }
	        actions = actions.concat( panel._collectionActions() );
	        return actions;
	    },
	
	    /**   */
	    _collectionActions : function(){
	        var panel = this;
	        return [
	            {   html: _l( 'Build Dataset List' ), func: function() {
	                    LIST_COLLECTION_CREATOR.createListCollection( panel.getSelectedModels() )
	                        .done( function(){ panel.model.refresh() });
	                }
	            },
	            // TODO: Only show quick pair if two things selected.
	            {   html: _l( 'Build Dataset Pair' ), func: function() {
	                    PAIR_COLLECTION_CREATOR.createPairCollection( panel.getSelectedModels() )
	                        .done( function(){ panel.model.refresh() });
	                }
	            },
	            {   html: _l( 'Build List of Dataset Pairs' ), func: function() {
	                    LIST_OF_PAIRS_COLLECTION_CREATOR.createListOfPairsCollection( panel.getSelectedModels() )
	                        .done( function(){ panel.model.refresh() });
	                }
	            },
	        ];
	    },
	
	    // ------------------------------------------------------------------------ sub-views
	    // reverse HID order
	    /** Override to reverse order of views - newest contents on top */
	    _attachItems : function( $whereTo ){
	        this.$list( $whereTo ).append( this.views.reverse().map( function( view ){
	            return view.$el;
	        }));
	        return this;
	    },
	
	    /** Override to add new contents at the top */
	    _attachView : function( view ){
	        var panel = this;
	        // override to control where the view is added, how/whether it's rendered
	        panel.views.unshift( view );
	        panel.$list().prepend( view.render( 0 ).$el.hide() );
	        panel.trigger( 'view:attached', view );
	        view.$el.slideDown( panel.fxSpeed, function(){
	            panel.trigger( 'view:attached:rendered' );
	        });
	    },
	
	    /** In this override, add purgeAllowed and whether tags/annotation editors should be shown */
	    _getItemViewOptions : function( model ){
	        var options = _super.prototype._getItemViewOptions.call( this, model );
	        _.extend( options, {
	            purgeAllowed            : this.purgeAllowed,
	//TODO: not working
	            tagsEditorShown         : ( this.tagsEditor && !this.tagsEditor.hidden ),
	            annotationEditorShown   : ( this.annotationEditor && !this.annotationEditor.hidden )
	        });
	        return options;
	    },
	
	    ///** Override to alter data in drag based on multiselection */
	    //_setUpItemViewListeners : function( view ){
	    //    var panel = this;
	    //    _super.prototype._setUpItemViewListeners.call( panel, view );
	    //
	    //},
	
	    /** If this item is deleted and we're not showing deleted items, remove the view
	     *  @param {Model} the item model to check
	     */
	    _handleHdaDeletionChange : function( itemModel ){
	        if( itemModel.get( 'deleted' ) && !this.showDeleted ){
	            this.removeItemView( itemModel );
	        }
	        this._renderCounts();
	    },
	
	    /** If this item is hidden and we're not showing hidden items, remove the view
	     *  @param {Model} the item model to check
	     */
	    _handleHdaVisibleChange : function( itemModel ){
	        if( itemModel.hidden() && !this.showHidden ){
	            this.removeItemView( itemModel );
	        }
	        this._renderCounts();
	    },
	
	    /** toggle the visibility of each content's tagsEditor applying all the args sent to this function */
	    toggleHDATagEditors : function( showOrHide ){
	        var args = Array.prototype.slice.call( arguments, 1 );
	        _.each( this.views, function( view ){
	            if( view.tagsEditor ){
	                view.tagsEditor.toggle.apply( view.tagsEditor, args );
	            }
	        });
	    },
	
	    /** toggle the visibility of each content's annotationEditor applying all the args sent to this function */
	    toggleHDAAnnotationEditors : function( showOrHide ){
	        var args = Array.prototype.slice.call( arguments, 1 );
	        _.each( this.views, function( view ){
	            if( view.annotationEditor ){
	                view.annotationEditor.toggle.apply( view.annotationEditor, args );
	            }
	        });
	    },
	
	    // ------------------------------------------------------------------------ panel events
	    /** event map */
	    events : _.extend( _.clone( _super.prototype.events ), {
	        'click .show-selectors-btn'                 : 'toggleSelectors',
	        'click .toggle-deleted-link'                : function( ev ){ this.toggleShowDeleted(); },
	        'click .toggle-hidden-link'                 : function( ev ){ this.toggleShowHidden(); }
	    }),
	
	    /** Update the history size display (curr. upper right of panel).
	     */
	    updateHistoryDiskSize : function(){
	        this.$el.find( '.history-size' ).text( this.model.get( 'nice_size' ) );
	    },
	
	    // ------------------------------------------------------------------------ as drop target
	    /**  */
	    dropTargetOn : function(){
	        if( this.dropTarget ){ return this; }
	        this.dropTarget = true;
	
	        //TODO: to init
	        var dropHandlers = {
	            'dragenter' : _.bind( this.dragenter, this ),
	            'dragover'  : _.bind( this.dragover,  this ),
	            'dragleave' : _.bind( this.dragleave, this ),
	            'drop'      : _.bind( this.drop, this )
	        };
	//TODO: scroll to top
	        var $dropTarget = this._renderDropTarget();
	        this.$list().before([ this._renderDropTargetHelp(), $dropTarget ]);
	        for( var evName in dropHandlers ){
	            if( dropHandlers.hasOwnProperty( evName ) ){
	                //console.debug( evName, dropHandlers[ evName ] );
	                $dropTarget.on( evName, dropHandlers[ evName ] );
	            }
	        }
	        return this;
	    },
	
	    /**  */
	    _renderDropTarget : function(){
	        this.$( '.history-drop-target' ).remove();
	        return $( '<div/>' ).addClass( 'history-drop-target' )
	            .css({
	                'height': '64px',
	                'margin': '0px 10px 10px 10px',
	                'border': '1px dashed black',
	                'border-radius' : '3px'
	            });
	    },
	
	    /**  */
	    _renderDropTargetHelp : function(){
	        this.$( '.history-drop-target-help' ).remove();
	        return $( '<div/>' ).addClass( 'history-drop-target-help' )
	            .css({
	                'margin'        : '10px 10px 4px 10px',
	                'color'         : 'grey',
	                'font-size'     : '80%',
	                'font-style'    : 'italic'
	            })
	            .text( _l( 'Drag datasets here to copy them to the current history' ) );
	    },
	
	    /**  */
	    dropTargetOff : function(){
	        if( !this.dropTarget ){ return this; }
	        //this.log( 'dropTargetOff' );
	        this.dropTarget = false;
	        var dropTarget = this.$( '.history-drop-target' ).get(0);
	        for( var evName in this._dropHandlers ){
	            if( this._dropHandlers.hasOwnProperty( evName ) ){
	                dropTarget.off( evName, this._dropHandlers[ evName ] );
	            }
	        }
	        this.$( '.history-drop-target' ).remove();
	        this.$( '.history-drop-target-help' ).remove();
	        return this;
	    },
	    /**  */
	    dropTargetToggle : function(){
	        if( this.dropTarget ){
	            this.dropTargetOff();
	        } else {
	            this.dropTargetOn();
	        }
	        return this;
	    },
	
	    /**  */
	    dragenter : function( ev ){
	        //console.debug( 'dragenter:', this, ev );
	        ev.preventDefault();
	        ev.stopPropagation();
	        this.$( '.history-drop-target' ).css( 'border', '2px solid black' );
	    },
	    /**  */
	    dragover : function( ev ){
	        ev.preventDefault();
	        ev.stopPropagation();
	    },
	    /**  */
	    dragleave : function( ev ){
	        //console.debug( 'dragleave:', this, ev );
	        ev.preventDefault();
	        ev.stopPropagation();
	        this.$( '.history-drop-target' ).css( 'border', '1px dashed black' );
	    },
	    /**  */
	    drop : function( ev ){
	        ev.preventDefault();
	        //ev.stopPropagation();
	
	        var dataTransfer = ev.originalEvent.dataTransfer;
	        dataTransfer.dropEffect = 'move';
	
	        var panel = this,
	            data = dataTransfer.getData( "text" );
	        try {
	            data = JSON.parse( data );
	
	        } catch( err ){
	            this.warn( 'error parsing JSON from drop:', data );
	        }
	        this.trigger( 'droptarget:drop', ev, data, panel );
	        return false;
	    },
	
	    /**  */
	    dataDropped : function( data ){
	        var panel = this;
	        // HDA: dropping will copy it to the history
	        if( _.isObject( data ) && data.model_class === 'HistoryDatasetAssociation' && data.id ){
	            return panel.model.contents.copy( data.id );
	        }
	        return jQuery.when();
	    },
	
	    // ........................................................................ misc
	    /** Return a string rep of the history */
	    toString    : function(){
	        return 'HistoryViewEdit(' + (( this.model )?( this.model.get( 'name' )):( '' )) + ')';
	    }
	});
	
	//==============================================================================
	    return {
	        HistoryViewEdit : HistoryViewEdit
	    };
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! underscore */ 1), __webpack_require__(/*! jquery */ 3), __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 74 */
/*!******************************************************************!*\
  !*** ./galaxy/scripts/mvc/collection/list-collection-creator.js ***!
  \******************************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone, _, $, jQuery) {
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	    __webpack_require__(/*! mvc/history/hdca-model */ 71),
	    __webpack_require__(/*! mvc/dataset/states */ 68),
	    __webpack_require__(/*! mvc/base-mvc */ 5),
	    __webpack_require__(/*! mvc/ui/ui-modal */ 17),
	    __webpack_require__(/*! utils/natural-sort */ 75),
	    __webpack_require__(/*! utils/localization */ 7),
	    __webpack_require__(/*! ui/hoverhighlight */ 76)
	], __WEBPACK_AMD_DEFINE_RESULT__ = function( HDCA, STATES, BASE_MVC, UI_MODAL, naturalSort, _l ){
	
	'use strict';
	
	var logNamespace = 'collections';
	/*==============================================================================
	TODO:
	    use proper Element model and not just json
	    straighten out createFn, collection.createHDCA
	    possibly stop using modals for this
	    It would be neat to do a drag and drop
	
	==============================================================================*/
	/** A view for both DatasetDCEs and NestedDCDCEs
	 *  (things that implement collection-model:DatasetCollectionElementMixin)
	 */
	var DatasetCollectionElementView = Backbone.View.extend( BASE_MVC.LoggableMixin ).extend({
	    _logNamespace : logNamespace,
	
	//TODO: use proper class (DatasetDCE or NestedDCDCE (or the union of both))
	    tagName     : 'li',
	    className   : 'collection-element',
	
	    initialize : function( attributes ){
	        this.element = attributes.element || {};
	        this.selected = attributes.selected || false;
	    },
	
	    render : function(){
	        this.$el
	            .attr( 'data-element-id', this.element.id )
	            .attr( 'draggable', true )
	            .html( this.template({ element: this.element }) );
	        if( this.selected ){
	            this.$el.addClass( 'selected' );
	        }
	        return this;
	    },
	
	    //TODO: lots of unused space in the element - possibly load details and display them horiz.
	    template : _.template([
	        '<a class="name" title="', _l( 'Click to rename' ), '" href="javascript:void(0)">',
	            '<%- element.name %>',
	        '</a>',
	        '<button class="discard btn btn-sm" title="', _l( 'Remove this dataset from the list' ), '">',
	            _l( 'Discard' ),
	        '</button>',
	    ].join('')),
	
	    /** select this element and pub */
	    select : function( toggle ){
	        this.$el.toggleClass( 'selected', toggle );
	        this.trigger( 'select', {
	            source   : this,
	            selected : this.$el.hasClass( 'selected' )
	        });
	    },
	
	    /** animate the removal of this element and pub */
	    discard : function(){
	        var view = this,
	            parentWidth = this.$el.parent().width();
	        this.$el.animate({ 'margin-right' : parentWidth }, 'fast', function(){
	            view.trigger( 'discard', {
	                source : view
	            });
	            view.destroy();
	        });
	    },
	
	    /** remove the DOM and any listeners */
	    destroy : function(){
	        this.off();
	        this.$el.remove();
	    },
	
	    events : {
	        'click'         : '_click',
	        'click .name'   : '_clickName',
	        'click .discard': '_clickDiscard',
	
	        'dragstart'     : '_dragstart',
	        'dragend'       : '_dragend',
	        'dragover'      : '_sendToParent',
	        'drop'          : '_sendToParent'
	    },
	
	    /** select when the li is clicked */
	    _click : function( ev ){
	        ev.stopPropagation();
	        this.select( ev );
	    },
	
	    /** rename a pair when the name is clicked */
	    _clickName : function( ev ){
	        ev.stopPropagation();
	        ev.preventDefault();
	        var promptString = [ _l( 'Enter a new name for the element' ), ':\n(',
	                             _l( 'Note that changing the name here will not rename the dataset' ), ')' ].join( '' ),
	            response = prompt( _l( 'Enter a new name for the element' ) + ':', this.element.name );
	        if( response ){
	            this.element.name = response;
	            this.render();
	        }
	        //TODO: cancelling with ESC leads to closure of the creator...
	    },
	
	    /** discard when the discard button is clicked */
	    _clickDiscard : function( ev ){
	        ev.stopPropagation();
	        this.discard();
	    },
	
	    /** dragging pairs for re-ordering */
	    _dragstart : function( ev ){
	        if( ev.originalEvent ){ ev = ev.originalEvent; }
	        ev.dataTransfer.effectAllowed = 'move';
	        ev.dataTransfer.setData( 'text/plain', JSON.stringify( this.element ) );
	
	        this.$el.addClass( 'dragging' );
	        this.$el.parent().trigger( 'collection-element.dragstart', [ this ] );
	    },
	
	    /** dragging for re-ordering */
	    _dragend : function( ev ){
	        this.$el.removeClass( 'dragging' );
	        this.$el.parent().trigger( 'collection-element.dragend', [ this ] );
	    },
	
	    /** manually bubble up an event to the parent/container */
	    _sendToParent : function( ev ){
	        this.$el.parent().trigger( ev );
	    },
	
	    /** string rep */
	    toString : function(){
	        return 'DatasetCollectionElementView()';
	    }
	});
	
	
	// ============================================================================
	/** An interface for building collections.
	 */
	var ListCollectionCreator = Backbone.View.extend( BASE_MVC.LoggableMixin ).extend({
	    _logNamespace : logNamespace,
	
	    /** the class used to display individual elements */
	    elementViewClass : DatasetCollectionElementView,
	    /** the class this creator will create and save */
	    collectionClass  : HDCA.HistoryListDatasetCollection,
	    className        : 'list-collection-creator collection-creator flex-row-container',
	
	    /** minimum number of valid elements to start with in order to build a collection of this type */
	    minElements      : 1,
	
	    defaultAttributes : {
	//TODO: remove - use new collectionClass().save()
	        /** takes elements and creates the proper collection - returns a promise */
	        creationFn : function(){ throw new TypeError( 'no creation fn for creator' ); },
	        /** fn to call when the collection is created (scoped to this) */
	        oncreate   : function(){},
	        /** fn to call when the cancel button is clicked (scoped to this) - if falsy, no btn is displayed */
	        oncancel   : function(){},
	        /** distance from list edge to begin autoscrolling list */
	        autoscrollDist  : 24,
	        /** Color passed to hoverhighlight */
	        highlightClr    : 'rgba( 64, 255, 255, 1.0 )'
	    },
	
	    /** set up initial options, instance vars, behaviors */
	    initialize : function( attributes ){
	        this.metric( 'ListCollectionCreator.initialize', attributes );
	        var creator = this;
	        _.each( this.defaultAttributes, function( value, key ){
	            value = attributes[ key ] || value;
	            creator[ key ] = value;
	        });
	
	        /** unordered, original list - cache to allow reversal */
	        creator.initialElements = attributes.elements || [];
	
	        this._instanceSetUp();
	        this._elementsSetUp();
	        this._setUpBehaviors();
	    },
	
	    /** set up instance vars */
	    _instanceSetUp : function(){
	        /** Ids of elements that have been selected by the user - to preserve over renders */
	        this.selectedIds = {};
	        /** DOM elements currently being dragged */
	        this.$dragging = null;
	        /** Used for blocking UI events during ajax/operations (don't post twice) */
	        this.blocking = false;
	    },
	
	    // ------------------------------------------------------------------------ process raw list
	    /** set up main data */
	    _elementsSetUp : function(){
	        //this.debug( '-- _dataSetUp' );
	        /** a list of invalid elements and the reasons they aren't valid */
	        this.invalidElements = [];
	//TODO: handle fundamental problem of syncing DOM, views, and list here
	        /** data for list in progress */
	        this.workingElements = [];
	        /** views for workingElements */
	        this.elementViews = [];
	
	        // copy initial list, sort, add ids if needed
	        this.workingElements = this.initialElements.slice( 0 );
	        this._ensureElementIds();
	        this._validateElements();
	        this._mangleDuplicateNames();
	        this._sortElements();
	    },
	
	    /** add ids to dataset objs in initial list if none */
	    _ensureElementIds : function(){
	        this.workingElements.forEach( function( element ){
	            if( !element.hasOwnProperty( 'id' ) ){
	                element.id = _.uniqueId();
	            }
	        });
	        return this.workingElements;
	    },
	
	    /** separate working list into valid and invalid elements for this collection */
	    _validateElements : function(){
	        var creator = this,
	            existingNames = {};
	        creator.invalidElements = [];
	
	        this.workingElements = this.workingElements.filter( function( element ){
	            var problem = creator._isElementInvalid( element );
	            if( problem ){
	                creator.invalidElements.push({
	                    element : element,
	                    text    : problem
	                });
	            }
	            return !problem;
	        });
	        return this.workingElements;
	    },
	
	    /** describe what is wrong with a particular element if anything */
	    _isElementInvalid : function( element ){
	        if( element.history_content_type !== 'dataset' ){
	            return _l( "is not a dataset" );
	        }
	        if( element.state !== STATES.OK ){
	            if( _.contains( STATES.NOT_READY_STATES, element.state ) ){
	                return _l( "hasn't finished running yet" );
	            }
	            return _l( "has errored, is paused, or is not accessible" );
	        }
	        if( element.deleted || element.purged ){
	            return _l( "has been deleted or purged" );
	        }
	        return null;
	    },
	
	    /** mangle duplicate names using a mac-like '(counter)' addition to any duplicates */
	    _mangleDuplicateNames : function(){
	        var SAFETY = 900,
	            counter = 1,
	            existingNames = {};
	        this.workingElements.forEach( function( element ){
	            var currName = element.name;
	            while( existingNames.hasOwnProperty( currName ) ){
	                currName = element.name + ' (' + counter + ')';
	                counter += 1;
	                if( counter >= SAFETY ){
	                    throw new Error( 'Safety hit in while loop - thats impressive' );
	                }
	            }
	            element.name = currName;
	            existingNames[ element.name ] = true;
	        });
	    },
	
	    /** sort a list of elements */
	    _sortElements : function( list ){
	        // // currently only natural sort by name
	        // this.workingElements.sort( function( a, b ){ return naturalSort( a.name, b.name ); });
	        // return this.workingElements;
	    },
	
	    // ------------------------------------------------------------------------ rendering
	    // templates : ListCollectionCreator.templates,
	    /** render the entire interface */
	    render : function( speed, callback ){
	        //this.debug( '-- _render' );
	        if( this.workingElements.length < this.minElements ){
	            return this._renderInvalid( speed, callback );
	        }
	
	        this.$el.empty().html( this.templates.main() );
	        this._renderHeader( speed );
	        this._renderMiddle( speed );
	        this._renderFooter( speed );
	        this._addPluginComponents();
	        this.$( '.collection-name' ).focus();
	        this.trigger( 'rendered', this );
	        return this;
	    },
	
	
	    /** render a simplified interface aimed at telling the user why they can't move forward */
	    _renderInvalid : function( speed, callback ){
	        //this.debug( '-- _render' );
	        this.$el.empty().html( this.templates.invalidInitial({
	            problems: this.invalidElements,
	            elements: this.workingElements,
	        }));
	        if( typeof this.oncancel === 'function' ){
	            this.$( '.cancel-create.btn' ).show();
	        }
	        this.trigger( 'rendered', this );
	        return this;
	    },
	
	    /** render the header section */
	    _renderHeader : function( speed, callback ){
	        var $header = this.$( '.header' ).empty().html( this.templates.header() )
	            .find( '.help-content' ).prepend( $( this.templates.helpContent() ) );
	        //TODO: should only show once despite calling _renderHeader again
	        if( this.invalidElements.length ){
	            this._invalidElementsAlert();
	        }
	        return $header;
	    },
	
	    /** render the middle including the elements */
	    _renderMiddle : function( speed, callback ){
	        var $middle = this.$( '.middle' ).empty().html( this.templates.middle() );
	        this._renderList( speed );
	        return $middle;
	    },
	
	    /** render the footer, completion controls, and cancel controls */
	    _renderFooter : function( speed, callback ){
	        var $footer = this.$( '.footer' ).empty().html( this.templates.footer() );
	        if( typeof this.oncancel === 'function' ){
	            this.$( '.cancel-create.btn' ).show();
	        }
	        return $footer;
	    },
	
	    /** add any jQuery/bootstrap/custom plugins to elements rendered */
	    _addPluginComponents : function(){
	        this.$( '.help-content i' ).hoverhighlight( '.collection-creator', this.highlightClr );
	    },
	
	    /** build and show an alert describing any elements that could not be included due to problems */
	    _invalidElementsAlert : function(){
	        this._showAlert( this.templates.invalidElements({ problems: this.invalidElements }), 'alert-warning' );
	    },
	
	    /** add (or clear if clear is truthy) a validation warning to the DOM element described in what */
	    _validationWarning : function( what, clear ){
	        var VALIDATION_CLASS = 'validation-warning';
	        if( what === 'name' ){
	            what = this.$( '.collection-name' ).add( this.$( '.collection-name-prompt' ) );
	            this.$( '.collection-name' ).focus().select();
	        }
	        if( clear ){
	            what = what || this.$( '.' + VALIDATION_CLASS );
	            what.removeClass( VALIDATION_CLASS );
	        } else {
	            what.addClass( VALIDATION_CLASS );
	        }
	    },
	
	    _disableNameAndCreate : function( disable ){
	        disable = !_.isUndefined( disable )? disable : true;
	        if( disable ){
	            this.$( '.collection-name' ).prop( 'disabled', true );
	            this.$( '.create-collection' ).toggleClass( 'disabled', true );
	        // } else {
	        //     this.$( '.collection-name' ).prop( 'disabled', false );
	        //     this.$( '.create-collection' ).removeClass( 'disable' );
	        }
	    },
	
	    // ------------------------------------------------------------------------ rendering elements
	    /** conv. to the main list display DOM */
	    $list : function(){
	        return this.$( '.collection-elements' );
	    },
	
	    /** show or hide the clear selected control based on the num of selected elements */
	    _renderClearSelected : function(){
	        if( _.size( this.selectedIds ) ){
	            this.$( '.collection-elements-controls > .clear-selected' ).show();
	        } else {
	            this.$( '.collection-elements-controls > .clear-selected' ).hide();
	        }
	    },
	
	    /** render the elements in order (or a warning if no elements found) */
	    _renderList : function( speed, callback ){
	        //this.debug( '-- _renderList' );
	        var creator = this,
	            $tmp = jQuery( '<div/>' ),
	            $list = creator.$list();
	
	        _.each( this.elementViews, function( view ){
	            view.destroy();
	            creator.removeElementView( view );
	        });
	
	        // if( !this.workingElements.length ){
	        //     this._renderNoValidElements();
	        //     return;
	        // }
	
	        creator.workingElements.forEach( function( element ){
	            var elementView = creator._createElementView( element );
	            $tmp.append( elementView.$el );
	        });
	
	        creator._renderClearSelected();
	        $list.empty().append( $tmp.children() );
	        _.invoke( creator.elementViews, 'render' );
	
	        if( $list.height() > $list.css( 'max-height' ) ){
	            $list.css( 'border-width', '1px 0px 1px 0px' );
	        } else {
	            $list.css( 'border-width', '0px' );
	        }
	    },
	
	    /** create an element view, cache in elementViews, set up listeners, and return */
	    _createElementView : function( element ){
	        var elementView = new this.elementViewClass({
	//TODO: use non-generic class or not all
	            // model : COLLECTION.DatasetDCE( element )
	            element : element,
	            selected: _.has( this.selectedIds, element.id )
	        });
	        this.elementViews.push( elementView );
	        this._listenToElementView( elementView );
	        return elementView;
	    },
	
	    /** listen to any element events */
	    _listenToElementView : function( view ){
	        var creator = this;
	        creator.listenTo( view, {
	            select : function( data ){
	                var element = data.source.element;
	                if( data.selected ){
	                    creator.selectedIds[ element.id ] = true;
	                } else {
	                    delete creator.selectedIds[ element.id ];
	                }
	                creator.trigger( 'elements:select', data );
	            },
	            discard : function( data ){
	                creator.trigger( 'elements:discard', data );
	            }
	        });
	    },
	
	    /** add a new element view based on the json in element */
	    addElementView : function( element ){
	//TODO: workingElements is sorted, add element in appropo index
	        // add element, sort elements, find element index
	        // var view = this._createElementView( element );
	        // return view;
	    },
	
	    /** stop listening to view and remove from caches */
	    removeElementView : function( view ){
	        delete this.selectedIds[ view.element.id ];
	        this._renderClearSelected();
	
	        this.elementViews = _.without( this.elementViews, view );
	        this.stopListening( view );
	    },
	
	    /** render a message in the list that no elements remain to create a collection */
	    _renderNoElementsLeft : function(){
	        this._disableNameAndCreate( true );
	        this.$( '.collection-elements' ).append( this.templates.noElementsLeft() );
	    },
	
	    // /** render a message in the list that no valid elements were found to create a collection */
	    // _renderNoValidElements : function(){
	    //     this._disableNameAndCreate( true );
	    //     this.$( '.collection-elements' ).append( this.templates.noValidElements() );
	    // },
	
	    // ------------------------------------------------------------------------ API
	    /** convert element into JSON compatible with the collections API */
	    _elementToJSON : function( element ){
	        // return element.toJSON();
	        return element;
	    },
	
	    /** create the collection via the API
	     *  @returns {jQuery.xhr Object} the jquery ajax request
	     */
	    createList : function( name ){
	        if( !this.workingElements.length ){
	            var message = _l( 'No valid elements for final list' ) + '. ';
	            message += '<a class="cancel-create" href="javascript:void(0);">' + _l( 'Cancel' ) + '</a> ';
	            message += _l( 'or' );
	            message += ' <a class="reset" href="javascript:void(0);">' + _l( 'start over' ) + '</a>.';
	            this._showAlert( message );
	            return;
	        }
	
	        var creator = this,
	            elements = this.workingElements.map( function( element ){
	                return creator._elementToJSON( element );
	            });
	
	        creator.blocking = true;
	        return creator.creationFn( elements, name )
	            .always( function(){
	                creator.blocking = false;
	            })
	            .fail( function( xhr, status, message ){
	                creator.trigger( 'error', {
	                    xhr     : xhr,
	                    status  : status,
	                    message : _l( 'An error occurred while creating this collection' )
	                });
	            })
	            .done( function( response, message, xhr ){
	                creator.trigger( 'collection:created', response, message, xhr );
	                creator.metric( 'collection:created', response );
	                if( typeof creator.oncreate === 'function' ){
	                    creator.oncreate.call( this, response, message, xhr );
	                }
	            });
	    },
	
	    // ------------------------------------------------------------------------ events
	    /** set up event handlers on self */
	    _setUpBehaviors : function(){
	        this.on( 'error', this._errorHandler );
	
	        this.once( 'rendered', function(){
	            this.trigger( 'rendered:initial', this );
	        });
	
	        this.on( 'elements:select', function( data ){
	            this._renderClearSelected();
	        });
	
	        this.on( 'elements:discard', function( data ){
	            var element = data.source.element;
	            this.removeElementView( data.source );
	
	            this.workingElements = _.without( this.workingElements, element );
	            if( !this.workingElements.length ){
	                this._renderNoElementsLeft();
	            }
	        });
	
	        //this.on( 'all', function(){
	        //    this.info( arguments );
	        //});
	        return this;
	    },
	
	    /** handle errors with feedback and details to the user (if available) */
	    _errorHandler : function( data ){
	        this.error( data );
	
	        var creator = this;
	            content = data.message || _l( 'An error occurred' );
	        if( data.xhr ){
	            var xhr = data.xhr,
	                message = data.message;
	            if( xhr.readyState === 0 && xhr.status === 0 ){
	                content += ': ' + _l( 'Galaxy could not be reached and may be updating.' ) +
	                    _l( ' Try again in a few minutes.' );
	            } else if( xhr.responseJSON ){
	                content += ':<br /><pre>' + JSON.stringify( xhr.responseJSON ) + '</pre>';
	            } else {
	                content += ': ' + message;
	            }
	        }
	        creator._showAlert( content, 'alert-danger' );
	    },
	
	    events : {
	        // header
	        'click .more-help'              : '_clickMoreHelp',
	        'click .less-help'              : '_clickLessHelp',
	        'click .main-help'              : '_toggleHelp',
	        'click .header .alert button'   : '_hideAlert',
	
	        'click .reset'                  : 'reset',
	        'click .clear-selected'         : 'clearSelectedElements',
	
	        // elements - selection
	        'click .collection-elements'    : 'clearSelectedElements',
	
	        // elements - drop target
	        // 'dragenter .collection-elements': '_dragenterElements',
	        // 'dragleave .collection-elements': '_dragleaveElements',
	        'dragover .collection-elements' : '_dragoverElements',
	        'drop .collection-elements'     : '_dropElements',
	
	        // these bubble up from the elements as custom events
	        'collection-element.dragstart .collection-elements' : '_elementDragstart',
	        'collection-element.dragend   .collection-elements' : '_elementDragend',
	
	        // footer
	        'change .collection-name'       : '_changeName',
	        'keydown .collection-name'      : '_nameCheckForEnter',
	        'click .cancel-create'          : function( ev ){
	            if( typeof this.oncancel === 'function' ){
	                this.oncancel.call( this );
	            }
	        },
	        'click .create-collection'      : '_clickCreate'//,
	    },
	
	    // ........................................................................ header
	    /** expand help */
	    _clickMoreHelp : function( ev ){
	        ev.stopPropagation();
	        this.$( '.main-help' ).addClass( 'expanded' );
	        this.$( '.more-help' ).hide();
	    },
	    /** collapse help */
	    _clickLessHelp : function( ev ){
	        ev.stopPropagation();
	        this.$( '.main-help' ).removeClass( 'expanded' );
	        this.$( '.more-help' ).show();
	    },
	    /** toggle help */
	    _toggleHelp : function( ev ){
	        ev.stopPropagation();
	        this.$( '.main-help' ).toggleClass( 'expanded' );
	        this.$( '.more-help' ).toggle();
	    },
	
	    /** show an alert on the top of the interface containing message (alertClass is bootstrap's alert-*) */
	    _showAlert : function( message, alertClass ){
	        alertClass = alertClass || 'alert-danger';
	        this.$( '.main-help' ).hide();
	        this.$( '.header .alert' )
	            .attr( 'class', 'alert alert-dismissable' ).addClass( alertClass ).show()
	            .find( '.alert-message' ).html( message );
	    },
	    /** hide the alerts at the top */
	    _hideAlert : function( message ){
	        this.$( '.main-help' ).show();
	        this.$( '.header .alert' ).hide();
	    },
	
	    // ........................................................................ elements
	    /** reset all data to the initial state */
	    reset : function(){
	        this._instanceSetUp();
	        this._elementsSetUp();
	        this.render();
	    },
	
	    /** deselect all elements */
	    clearSelectedElements : function( ev ){
	        this.$( '.collection-elements .collection-element' ).removeClass( 'selected' );
	        this.$( '.collection-elements-controls > .clear-selected' ).hide();
	    },
	
	    //_dragenterElements : function( ev ){
	    //    //this.debug( '_dragenterElements:', ev );
	    //},
	//TODO: if selected are dragged out of the list area - remove the placeholder - cuz it won't work anyway
	    // _dragleaveElements : function( ev ){
	    //    //this.debug( '_dragleaveElements:', ev );
	    // },
	
	    /** track the mouse drag over the list adding a placeholder to show where the drop would occur */
	    _dragoverElements : function( ev ){
	        //this.debug( '_dragoverElements:', ev );
	        ev.preventDefault();
	
	        var $list = this.$list();
	        this._checkForAutoscroll( $list, ev.originalEvent.clientY );
	        var $nearest = this._getNearestElement( ev.originalEvent.clientY );
	
	        //TODO: no need to re-create - move instead
	        this.$( '.element-drop-placeholder' ).remove();
	        var $placeholder = $( '<div class="element-drop-placeholder"></div>' );
	        if( !$nearest.size() ){
	            $list.append( $placeholder );
	        } else {
	            $nearest.before( $placeholder );
	        }
	    },
	
	    /** If the mouse is near enough to the list's top or bottom, scroll the list */
	    _checkForAutoscroll : function( $element, y ){
	        var AUTOSCROLL_SPEED = 2,
	            offset = $element.offset(),
	            scrollTop = $element.scrollTop(),
	            upperDist = y - offset.top,
	            lowerDist = ( offset.top + $element.outerHeight() ) - y;
	        if( upperDist >= 0 && upperDist < this.autoscrollDist ){
	            $element.scrollTop( scrollTop - AUTOSCROLL_SPEED );
	        } else if( lowerDist >= 0 && lowerDist < this.autoscrollDist ){
	            $element.scrollTop( scrollTop + AUTOSCROLL_SPEED );
	        }
	    },
	
	    /** get the nearest element based on the mouse's Y coordinate.
	     *  If the y is at the end of the list, return an empty jQuery object.
	     */
	    _getNearestElement : function( y ){
	        var WIGGLE = 4,
	            lis = this.$( '.collection-elements li.collection-element' ).toArray();
	        for( var i=0; i<lis.length; i++ ){
	            var $li = $( lis[i] ),
	                top = $li.offset().top,
	                halfHeight = Math.floor( $li.outerHeight() / 2 ) + WIGGLE;
	            if( top + halfHeight > y && top - halfHeight < y ){
	                return $li;
	            }
	        }
	        return $();
	    },
	
	    /** drop (dragged/selected elements) onto the list, re-ordering the internal list */
	    _dropElements : function( ev ){
	        if( ev.originalEvent ){ ev = ev.originalEvent; }
	        // both required for firefox
	        ev.preventDefault();
	        ev.dataTransfer.dropEffect = 'move';
	
	        // insert before the nearest element or after the last.
	        var $nearest = this._getNearestElement( ev.clientY );
	        if( $nearest.size() ){
	            this.$dragging.insertBefore( $nearest );
	        } else {
	            // no nearest before - insert after last element
	            this.$dragging.insertAfter( this.$( '.collection-elements .collection-element' ).last() );
	        }
	        // resync the creator's list based on the new DOM order
	        this._syncOrderToDom();
	        return false;
	    },
	
	    /** resync the creator's list of elements based on the DOM order */
	    _syncOrderToDom : function(){
	        var creator = this,
	            newElements = [];
	        //TODO: doesn't seem wise to use the dom to store these - can't we sync another way?
	        this.$( '.collection-elements .collection-element' ).each( function(){
	            var id = $( this ).attr( 'data-element-id' ),
	                element = _.findWhere( creator.workingElements, { id: id });
	            if( element ){
	                newElements.push( element );
	            } else {
	                console.error( 'missing element: ', id );
	            }
	        });
	        this.workingElements = newElements;
	        this._renderList();
	    },
	
	    /** drag communication with element sub-views: dragstart */
	    _elementDragstart : function( ev, element ){
	        // auto select the element causing the event and move all selected
	        element.select( true );
	        this.$dragging = this.$( '.collection-elements .collection-element.selected' );
	    },
	
	    /** drag communication with element sub-views: dragend - remove the placeholder */
	    _elementDragend : function( ev, element ){
	        $( '.element-drop-placeholder' ).remove();
	        this.$dragging = null;
	    },
	
	    // ........................................................................ footer
	    /** handle a collection name change */
	    _changeName : function( ev ){
	        this._validationWarning( 'name', !!this._getName() );
	    },
	
	    /** check for enter key press when in the collection name and submit */
	    _nameCheckForEnter : function( ev ){
	        if( ev.keyCode === 13 && !this.blocking ){
	            this._clickCreate();
	        }
	    },
	
	    /** get the current collection name */
	    _getName : function(){
	        return _.escape( this.$( '.collection-name' ).val() );
	    },
	
	    /** attempt to create the current collection */
	    _clickCreate : function( ev ){
	        var name = this._getName();
	        if( !name ){
	            this._validationWarning( 'name' );
	        } else if( !this.blocking ){
	            this.createList( name );
	        }
	    },
	
	    // ------------------------------------------------------------------------ templates
	    //TODO: move to require text plugin and load these as text
	    //TODO: underscore currently unnecc. bc no vars are used
	    //TODO: better way of localizing text-nodes in long strings
	    /** underscore template fns attached to class */
	    templates : {
	        /** the skeleton */
	        main : _.template([
	            '<div class="header flex-row no-flex"></div>',
	            '<div class="middle flex-row flex-row-container"></div>',
	            '<div class="footer flex-row no-flex"></div>'
	        ].join('')),
	
	        /** the header (not including help text) */
	        header : _.template([
	            '<div class="main-help well clear">',
	                '<a class="more-help" href="javascript:void(0);">', _l( 'More help' ), '</a>',
	                '<div class="help-content">',
	                    '<a class="less-help" href="javascript:void(0);">', _l( 'Less' ), '</a>',
	                '</div>',
	            '</div>',
	            '<div class="alert alert-dismissable">',
	                '<button type="button" class="close" data-dismiss="alert" ',
	                    'title="', _l( 'Close and show more help' ), '" aria-hidden="true">&times;</button>',
	                '<span class="alert-message"></span>',
	            '</div>',
	        ].join('')),
	
	        /** the middle: element list */
	        middle : _.template([
	            '<div class="collection-elements-controls">',
	                '<a class="reset" href="javascript:void(0);" ',
	                    'title="', _l( 'Undo all reordering and discards' ), '">',
	                    _l( 'Start over' ),
	                '</a>',
	                '<a class="clear-selected" href="javascript:void(0);" ',
	                    'title="', _l( 'De-select all selected datasets' ), '">',
	                    _l( 'Clear selected' ),
	                '</a>',
	            '</div>',
	            '<div class="collection-elements scroll-container flex-row">',
	            '</div>'
	        ].join('')),
	
	        /** creation and cancel controls */
	        footer : _.template([
	            '<div class="attributes clear">',
	                '<div class="clear">',
	                    '<input class="collection-name form-control pull-right" ',
	                        'placeholder="', _l( 'Enter a name for your new collection' ), '" />',
	                    '<div class="collection-name-prompt pull-right">', _l( 'Name' ), ':</div>',
	                '</div>',
	            '</div>',
	
	            '<div class="actions clear vertically-spaced">',
	                '<div class="other-options pull-left">',
	                    '<button class="cancel-create btn" tabindex="-1">', _l( 'Cancel' ), '</button>',
	                    '<div class="create-other btn-group dropup">',
	                        '<button class="btn btn-default dropdown-toggle" data-toggle="dropdown">',
	                              _l( 'Create a different kind of collection' ),
	                              ' <span class="caret"></span>',
	                        '</button>',
	                        '<ul class="dropdown-menu" role="menu">',
	                              '<li><a href="#">', _l( 'Create a <i>single</i> pair' ), '</a></li>',
	                              '<li><a href="#">', _l( 'Create a list of <i>unpaired</i> datasets' ), '</a></li>',
	                        '</ul>',
	                    '</div>',
	                '</div>',
	
	                '<div class="main-options pull-right">',
	                    '<button class="create-collection btn btn-primary">', _l( 'Create list' ), '</button>',
	                '</div>',
	            '</div>'
	        ].join('')),
	
	        /** help content */
	        helpContent : _.template([
	            '<p>', _l([
	                'Collections of datasets are permanent, ordered lists of datasets that can be passed to tools and ',
	                'workflows in order to have analyses done on each member of the entire group. This interface allows ',
	                'you to create a collection and re-order the final collection.'
	            ].join( '' )), '</p>',
	            '<ul>',
	                '<li>', _l([
	                    'Rename elements in the list by clicking on ',
	                    '<i data-target=".collection-element .name">the existing name</i>.'
	                ].join( '' )), '</li>',
	                '<li>', _l([
	                    'Discard elements from the final created list by clicking on the ',
	                    '<i data-target=".collection-element .discard">"Discard"</i> button.'
	                ].join( '' )), '</li>',
	                '<li>', _l([
	                    'Reorder the list by clicking and dragging elements. Select multiple elements by clicking on ',
	                    '<i data-target=".collection-element">them</i> and you can then move those selected by dragging the ',
	                    'entire group. Deselect them by clicking them again or by clicking the ',
	                    'the <i data-target=".clear-selected">"Clear selected"</i> link.'
	                ].join( '' )), '</li>',
	                '<li>', _l([
	                    'Click the <i data-target=".reset">"Start over"</i> link to begin again as if you had just opened ',
	                    'the interface.'
	                ].join( '' )), '</li>',
	                '<li>', _l([
	                    'Click the <i data-target=".cancel-create">"Cancel"</i> button to exit the interface.'
	                ].join( '' )), '</li>',
	            '</ul><br />',
	            '<p>', _l([
	                'Once your collection is complete, enter a <i data-target=".collection-name">name</i> and ',
	                'click <i data-target=".create-collection">"Create list"</i>.'
	            ].join( '' )), '</p>'
	        ].join('')),
	
	        /** shown in list when all elements are discarded */
	        invalidElements : _.template([
	            _l( 'The following selections could not be included due to problems:' ),
	            '<ul><% _.each( problems, function( problem ){ %>',
	                '<li><b><%- problem.element.name %></b>: <%- problem.text %></li>',
	            '<% }); %></ul>'
	        ].join('')),
	
	        /** shown in list when all elements are discarded */
	        noElementsLeft : _.template([
	            '<li class="no-elements-left-message">',
	                _l( 'No elements left! ' ),
	                _l( 'Would you like to ' ), '<a class="reset" href="javascript:void(0)">', _l( 'start over' ), '</a>?',
	            '</li>'
	        ].join('')),
	
	        /** a simplified page communicating what went wrong and why the user needs to reselect something else */
	        invalidInitial : _.template([
	            '<div class="header flex-row no-flex">',
	                '<div class="alert alert-warning" style="display: block">',
	                    '<span class="alert-message">',
	                        '<% if( _.size( problems ) ){ %>',
	                            _l( 'The following selections could not be included due to problems' ), ':',
	                            '<ul><% _.each( problems, function( problem ){ %>',
	                                '<li><b><%- problem.element.name %></b>: <%- problem.text %></li>',
	                            '<% }); %></ul>',
	                        '<% } else if( _.size( elements ) < 1 ){ %>',
	                            _l( 'No datasets were selected' ), '.',
	                        '<% } %>',
	                        '<br />',
	                        _l( 'At least one element is needed for the collection' ), '. ',
	                        _l( 'You may need to ' ),
	                        '<a class="cancel-create" href="javascript:void(0)">', _l( 'cancel' ), '</a> ',
	                        _l( 'and reselect new elements' ), '.',
	                    '</span>',
	                '</div>',
	            '</div>',
	            '<div class="footer flex-row no-flex">',
	                '<div class="actions clear vertically-spaced">',
	                    '<div class="other-options pull-left">',
	                        '<button class="cancel-create btn" tabindex="-1">', _l( 'Cancel' ), '</button>',
	                        // _l( 'Create a different kind of collection' ),
	                    '</div>',
	                '</div>',
	            '</div>'
	        ].join('')),
	    },
	
	    // ------------------------------------------------------------------------ misc
	    /** string rep */
	    toString : function(){ return 'ListCollectionCreator'; }
	});
	
	
	
	//=============================================================================
	/** Create a modal and load its body with the given CreatorClass creator type
	 *  @returns {Deferred} resolved when creator has built a collection.
	 */
	var collectionCreatorModal = function _collectionCreatorModal( elements, options, CreatorClass ){
	
	    var deferred = jQuery.Deferred(),
	        modal = Galaxy.modal || ( new UI_MODAL.View() ),
	        creator;
	
	    options = _.defaults( options || {}, {
	        elements    : elements,
	        oncancel    : function(){
	            modal.hide();
	            deferred.reject( 'cancelled' );
	        },
	        oncreate    : function( creator, response ){
	            modal.hide();
	            deferred.resolve( response );
	        }
	    });
	
	    creator = new CreatorClass( options );
	    modal.show({
	        title   : options.title || _l( 'Create a collection' ),
	        body    : creator.$el,
	        width   : '80%',
	        height  : '100%',
	        closing_events: true
	    });
	    creator.render();
	    window._collectionCreator = creator;
	
	    //TODO: remove modal header
	    return deferred;
	};
	
	/** List collection flavor of collectionCreatorModal. */
	var listCollectionCreatorModal = function _listCollectionCreatorModal( elements, options ){
	    options = options || {};
	    options.title = _l( 'Create a collection from a list of datasets' );
	    return collectionCreatorModal( elements, options, ListCollectionCreator );
	};
	
	
	//==============================================================================
	/** Use a modal to create a list collection, then add it to the given history contents.
	 *  @returns {Deferred} resolved when the collection is added to the history.
	 */
	function createListCollection( contents ){
	    var elements = contents.toJSON(),
	        promise = listCollectionCreatorModal( elements, {
	            creationFn : function( elements, name ){
	                elements = elements.map( function( element ){
	                    return {
	                        id      : element.id,
	                        name    : element.name,
	                        //TODO: this allows for list:list even if the filter above does not - reconcile
	                        src     : ( element.history_content_type === 'dataset'? 'hda' : 'hdca' )
	                    };
	                });
	                return contents.createHDCA( elements, 'list', name );
	            }
	        });
	    return promise;
	}
	
	//==============================================================================
	    return {
	        DatasetCollectionElementView: DatasetCollectionElementView,
	        ListCollectionCreator       : ListCollectionCreator,
	
	        collectionCreatorModal      : collectionCreatorModal,
	        listCollectionCreatorModal  : listCollectionCreatorModal,
	        createListCollection        : createListCollection
	    };
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! underscore */ 1), __webpack_require__(/*! jquery */ 3), __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 75 */
/*!**********************************************!*\
  !*** ./galaxy/scripts/utils/natural-sort.js ***!
  \**********************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_RESULT__ = function(){
	// Alphanumeric/natural sort fn
	function naturalSort(a, b) {
	    // setup temp-scope variables for comparison evauluation
	    var re = /(-?[0-9\.]+)/g,
	        x = a.toString().toLowerCase() || '',
	        y = b.toString().toLowerCase() || '',
	        nC = String.fromCharCode(0),
	        xN = x.replace( re, nC + '$1' + nC ).split(nC),
	        yN = y.replace( re, nC + '$1' + nC ).split(nC),
	        xD = (new Date(x)).getTime(),
	        yD = xD ? (new Date(y)).getTime() : null;
	    // natural sorting of dates
	    if ( yD ) {
	        if ( xD < yD ) { return -1; }
	        else if ( xD > yD ) { return 1; }
	    }
	    // natural sorting through split numeric strings and default strings
	    var oFxNcL, oFyNcL;
	    for ( var cLoc = 0, numS = Math.max(xN.length, yN.length); cLoc < numS; cLoc++ ) {
	        oFxNcL = parseFloat(xN[cLoc]) || xN[cLoc];
	        oFyNcL = parseFloat(yN[cLoc]) || yN[cLoc];
	        if (oFxNcL < oFyNcL) { return -1; }
	        else if (oFxNcL > oFyNcL) { return 1; }
	    }
	    return 0;
	}
	
	return naturalSort;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__))


/***/ },
/* 76 */
/*!*********************************************!*\
  !*** ./galaxy/scripts/ui/hoverhighlight.js ***!
  \*********************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(jQuery, $) {(function (factory) {
	    if (true) {
	        !(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory), __WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ? (__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	    } else {
	        // Browser globals
	        factory(jQuery);
	    }
	
	}(function () {
	//=============================================================================
	
	    jQuery.fn.extend({
	        hoverhighlight : function $hoverhighlight( scope, color ){
	            scope = scope || 'body';
	            if( !this.size() ){ return this; }
	
	            $( this ).each( function(){
	                var $this = $( this ),
	                    targetSelector = $this.data( 'target' );
	
	                if( targetSelector ){
	                    $this.mouseover( function( ev ){
	                        $( targetSelector, scope ).css({
	                            background: color
	                        });
	                    })
	                    .mouseout( function( ev ){
	                        $( targetSelector ).css({
	                            background: ''
	                        });
	                    });
	                }
	            });
	            return this;
	        }
	    });
	}));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! jquery */ 3), __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 77 */
/*!****************************************************!*\
  !*** ./galaxy/scripts/mvc/history/history-view.js ***!
  \****************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(_, $) {!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	    __webpack_require__(/*! mvc/list/list-view */ 79),
	    __webpack_require__(/*! mvc/history/history-model */ 65),
	    __webpack_require__(/*! mvc/history/history-contents */ 66),
	    __webpack_require__(/*! mvc/history/hda-li */ 83),
	    __webpack_require__(/*! mvc/history/hdca-li */ 85),
	    __webpack_require__(/*! mvc/user/user-model */ 9),
	    __webpack_require__(/*! ui/fa-icon-button */ 78),
	    __webpack_require__(/*! mvc/ui/popup-menu */ 62),
	    __webpack_require__(/*! mvc/base-mvc */ 5),
	    __webpack_require__(/*! utils/localization */ 7),
	    __webpack_require__(/*! ui/search-input */ 82)
	], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	    LIST_VIEW,
	    HISTORY_MODEL,
	    HISTORY_CONTENTS,
	    HDA_LI,
	    HDCA_LI,
	    USER,
	    faIconButton,
	    PopupMenu,
	    BASE_MVC,
	    _l
	){
	
	'use strict';
	
	var logNamespace = 'history';
	
	// ============================================================================
	/** session storage for individual history preferences */
	var HistoryPrefs = BASE_MVC.SessionStorageModel.extend(
	/** @lends HistoryPrefs.prototype */{
	//TODO:?? possibly mark as current T/F - have History.currId() (a class method) return that value
	    defaults : {
	//TODO:?? expandedIds to array?
	        expandedIds : {},
	        //TODO:?? move to user?
	        show_deleted : false,
	        show_hidden  : false
	        //TODO: add scroll position?
	    },
	    /** add an hda id to the hash of expanded hdas */
	    addExpanded : function( model ){
	        var key = 'expandedIds';
	//TODO:?? is this right anymore?
	        this.save( key, _.extend( this.get( key ), _.object([ model.id ], [ model.get( 'id' ) ]) ) );
	    },
	    /** remove an hda id from the hash of expanded hdas */
	    removeExpanded : function( model ){
	        var key = 'expandedIds';
	        this.save( key, _.omit( this.get( key ), model.id ) );
	    },
	    toString : function(){
	        return 'HistoryPrefs(' + this.id + ')';
	    }
	});
	// class lvl for access w/o instantiation
	HistoryPrefs.storageKeyPrefix = 'history:';
	
	/** key string to store each histories settings under */
	HistoryPrefs.historyStorageKey = function historyStorageKey( historyId ){
	    if( !historyId ){
	        throw new Error( 'HistoryPrefs.historyStorageKey needs valid id: ' + historyId );
	    }
	    // single point of change
	    return ( HistoryPrefs.storageKeyPrefix + historyId );
	};
	/** return the existing storage for the history with the given id (or create one if it doesn't exist) */
	HistoryPrefs.get = function get( historyId ){
	    return new HistoryPrefs({ id: HistoryPrefs.historyStorageKey( historyId ) });
	};
	/** clear all history related items in sessionStorage */
	HistoryPrefs.clearAll = function clearAll( historyId ){
	    for( var key in sessionStorage ){
	        if( key.indexOf( HistoryPrefs.storageKeyPrefix ) === 0 ){
	            sessionStorage.removeItem( key );
	        }
	    }
	};
	
	
	/* =============================================================================
	TODO:
	
	============================================================================= */
	/** @class  non-editable, read-only View/Controller for a history model.
	 *  Allows:
	 *      changing the loaded history
	 *      displaying data, info, and download
	 *      tracking history attrs: size, tags, annotations, name, etc.
	 *  Does not allow:
	 *      changing the name
	 */
	var _super = LIST_VIEW.ModelListPanel;
	var HistoryView = _super.extend(
	/** @lends HistoryView.prototype */{
	    _logNamespace : logNamespace,
	
	    /** class to use for constructing the HDA views */
	    HDAViewClass        : HDA_LI.HDAListItemView,
	    /** class to use for constructing the HDCA views */
	    HDCAViewClass       : HDCA_LI.HDCAListItemView,
	    /** class to used for constructing collection of sub-view models */
	    collectionClass     : HISTORY_CONTENTS.HistoryContents,
	    /** key of attribute in model to assign to this.collection */
	    modelCollectionKey  : 'contents',
	
	    tagName             : 'div',
	    className           : _super.prototype.className + ' history-panel',
	
	    /** string to display when the collection is empty */
	    emptyMsg            : _l( 'This history is empty' ),
	    /** displayed when no items match the search terms */
	    noneFoundMsg        : _l( 'No matching datasets found' ),
	    /** string used for search placeholder */
	    searchPlaceholder   : _l( 'search datasets' ),
	
	    // ......................................................................... SET UP
	    /** Set up the view, bind listeners.
	     *  @param {Object} attributes optional settings for the panel
	     */
	    initialize : function( attributes ){
	        _super.prototype.initialize.call( this, attributes );
	        // ---- instance vars
	        // control contents/behavior based on where (and in what context) the panel is being used
	        /** where should pages from links be displayed? (default to new tab/window) */
	        this.linkTarget = attributes.linkTarget || '_blank';
	    },
	
	    /** In this override, clear the update timer on the model */
	    freeModel : function(){
	        _super.prototype.freeModel.call( this );
	//TODO: move to History.free()
	        if( this.model ){
	            this.model.clearUpdateTimeout();
	        }
	        return this;
	    },
	
	    /** create any event listeners for the panel
	     *  @fires: rendered:initial    on the first render
	     *  @fires: empty-history       when switching to a history with no contents or creating a new history
	     */
	    _setUpListeners : function(){
	        _super.prototype._setUpListeners.call( this );
	        this.on({
	            error : function( model, xhr, options, msg, details ){
	                this.errorHandler( model, xhr, options, msg, details );
	            },
	            'loading-done' : function(){
	                //TODO:?? if( this.collection.length ){
	                if( !this.views.length ){
	                    this.trigger( 'empty-history', this );
	                }
	            },
	            'views:ready view:attached view:removed' : function( view ){
	                this._renderSelectButton();
	            }
	        });
	        // this.on( 'all', function(){ console.debug( arguments ); });
	    },
	
	    // ------------------------------------------------------------------------ loading history/hda models
	    //NOTE: all the following fns replace the existing history model with a new model
	    // (in the following 'details' refers to the full set of contents api data (urls, display_apps, misc_info, etc.)
	    //  - contents w/o details will have summary data only (name, hid, deleted, visible, state, etc.))
	//TODO: too tangled...
	
	    /** loads a history & contents, getting details of any contents whose ids are stored in sessionStorage
	     *      (but does not make them the current history)
	     */
	    loadHistoryWithDetails : function( historyId, attributes, historyFn, contentsFn ){
	        this.info( 'loadHistoryWithDetails:', historyId, attributes, historyFn, contentsFn );
	        var detailIdsFn = function( historyData ){
	                // will be called to get content ids that need details from the api
	//TODO:! non-visible contents are getting details loaded... either stop loading them at all or filter ids thru isVisible
	                return _.values( HistoryPrefs.get( historyData.id ).get( 'expandedIds' ) );
	            };
	        return this.loadHistory( historyId, attributes, historyFn, contentsFn, detailIdsFn );
	    },
	
	    /** loads a history & contents (but does not make them the current history) */
	    loadHistory : function( historyId, attributes, historyFn, contentsFn, detailIdsFn ){
	        this.info( 'loadHistory:', historyId, attributes, historyFn, contentsFn, detailIdsFn );
	        var panel = this;
	        attributes = attributes || {};
	
	        panel.trigger( 'loading', panel );
	        //this.info( 'loadHistory:', historyId, attributes, historyFn, contentsFn, detailIdsFn );
	        var xhr = HISTORY_MODEL.History.getHistoryData( historyId, {
	                historyFn       : historyFn,
	                contentsFn      : contentsFn,
	                detailIdsFn     : attributes.initiallyExpanded || detailIdsFn
	            });
	
	        return panel._loadHistoryFromXHR( xhr, attributes )
	            .fail( function( xhr, where, history ){
	                // throw an error up for the error handler
	                panel.trigger( 'error', panel, xhr, attributes, _l( 'An error was encountered while ' + where ),
	                    { historyId: historyId, history: history || {} });
	            })
	            .always( function(){
	                // bc _hideLoadingIndicator relies on this firing
	                panel.trigger( 'loading-done', panel );
	            });
	    },
	
	    /** given an xhr that will provide both history and contents data, pass data to set model or handle xhr errors */
	    _loadHistoryFromXHR : function( xhr, attributes ){
	        var panel = this;
	        xhr.then( function( historyJSON, contentsJSON ){
	            panel.JSONToModel( historyJSON, contentsJSON, attributes );
	            panel.render();
	        });
	        xhr.fail( function( xhr, where ){
	            // render anyways - whether we get a model or not
	            panel.render();
	        });
	        return xhr;
	    },
	
	    /** convenience alias to the model. Updates the item list only (not the history) */
	    refreshContents : function( detailIds, options ){
	        if( this.model ){
	            return this.model.refresh( detailIds, options );
	        }
	        // may have callbacks - so return an empty promise
	        return $.when();
	    },
	
	//TODO:?? seems unneccesary
	//TODO: Maybe better in History?
	    /** create a new history model from JSON and call setModel on it */
	    JSONToModel : function( newHistoryJSON, newHdaJSON, attributes ){
	        this.log( 'JSONToModel:', newHistoryJSON, newHdaJSON, attributes );
	        attributes = attributes || {};
	        //this.log( 'JSONToModel:', newHistoryJSON, newHdaJSON.length, attributes );
	
	        var model = new HISTORY_MODEL.History( newHistoryJSON, newHdaJSON, attributes );
	//TODO:?? here?
	        this.setModel( model );
	        return model;
	    },
	
	    /** release/free/shutdown old models and set up panel for new models
	     *  @fires new-model with the panel as parameter
	     */
	    setModel : function( model, attributes ){
	        attributes = attributes || {};
	        _super.prototype.setModel.call( this, model, attributes );
	        if( this.model ){
	            this._setUpWebStorage( attributes.initiallyExpanded, attributes.show_deleted, attributes.show_hidden );
	        }
	    },
	
	    // ------------------------------------------------------------------------ browser stored prefs
	    /** Set up client side storage. Currently PersistanStorage keyed under 'history:<id>'
	     *  @param {Object} initiallyExpanded
	     *  @param {Boolean} show_deleted whether to show deleted contents (overrides stored)
	     *  @param {Boolean} show_hidden
	     *  @see PersistentStorage
	     */
	    _setUpWebStorage : function( initiallyExpanded, show_deleted, show_hidden ){
	        //if( !this.model ){ return this; }
	        //this.log( '_setUpWebStorage', initiallyExpanded, show_deleted, show_hidden );
	        if( this.storage ){
	            this.stopListening( this.storage );
	        }
	
	        this.storage = new HistoryPrefs({
	            id: HistoryPrefs.historyStorageKey( this.model.get( 'id' ) )
	        });
	
	        // expandedIds is a map of content.ids -> a boolean repr'ing whether that item's body is already expanded
	        // store any pre-expanded ids passed in
	        if( _.isObject( initiallyExpanded ) ){
	            this.storage.set( 'expandedIds', initiallyExpanded );
	        }
	
	        // get the show_deleted/hidden settings giving priority to values passed in, using web storage otherwise
	        // if the page has specifically requested show_deleted/hidden, these will be either true or false
	        //  (as opposed to undefined, null) - and we give priority to that setting
	        if( _.isBoolean( show_deleted ) ){
	            this.storage.set( 'show_deleted', show_deleted );
	        }
	        if( _.isBoolean( show_hidden ) ){
	            this.storage.set( 'show_hidden', show_hidden );
	        }
	
	        this.trigger( 'new-storage', this.storage, this );
	        this.log( this + ' (init\'d) storage:', this.storage.get() );
	
	        this.listenTo( this.storage, {
	            'change:show_deleted' : function( view, newVal ){
	                this.showDeleted = newVal;
	            },
	            'change:show_hidden' : function( view, newVal ){
	                this.showHidden = newVal;
	            }
	        }, this );
	        this.showDeleted = ( show_deleted !== undefined )? show_deleted : this.storage.get( 'show_deleted' );
	        this.showHidden  = ( show_hidden  !== undefined )? show_hidden  : this.storage.get( 'show_hidden' );
	
	        return this;
	    },
	
	    // ------------------------------------------------------------------------ panel rendering
	    /** In this override, add a btn to toggle the selectors */
	    _buildNewRender : function(){
	        var $newRender = _super.prototype._buildNewRender.call( this );
	        this._renderSelectButton( $newRender );
	        return $newRender;
	    },
	
	    /** button for starting select mode */
	    _renderSelectButton : function( $where ){
	        $where = $where || this.$el;
	        // do not render selector option if no actions
	        if( !this.multiselectActions().length ){
	            return null;
	        }
	        // do not render (and remove even) if nothing to select
	        if( !this.views.length ){
	            this.hideSelectors();
	            $where.find( '.controls .actions .show-selectors-btn' ).remove();
	            return null;
	        }
	        // don't bother rendering if there's one already
	        var $existing = $where.find( '.controls .actions .show-selectors-btn' );
	        if( $existing.size() ){
	            return $existing;
	        }
	
	        return faIconButton({
	            title   : _l( 'Operations on multiple datasets' ),
	            classes : 'show-selectors-btn',
	            faIcon  : 'fa-check-square-o'
	        }).prependTo( $where.find( '.controls .actions' ) );
	    },
	
	    // ------------------------------------------------------------------------ sub-views
	    /** In this override, since history contents are mixed,
	     *      get the appropo view class based on history_content_type
	     */
	    _getItemViewClass : function( model ){
	        var contentType = model.get( "history_content_type" );
	        switch( contentType ){
	            case 'dataset':
	                return this.HDAViewClass;
	            case 'dataset_collection':
	                return this.HDCAViewClass;
	        }
	        throw new TypeError( 'Unknown history_content_type: ' + contentType );
	    },
	
	    /** in this override, check if the contents would also display based on show_deleted/hidden */
	    _filterItem : function( model ){
	        var panel = this;
	        return ( _super.prototype._filterItem.call( panel, model )
	            && ( !model.hidden() || panel.showHidden )
	            && ( !model.isDeletedOrPurged() || panel.showDeleted ) );
	    },
	
	    /** in this override, add a linktarget, and expand if id is in web storage */
	    _getItemViewOptions : function( model ){
	        var options = _super.prototype._getItemViewOptions.call( this, model );
	        return _.extend( options, {
	            linkTarget      : this.linkTarget,
	            expanded        : !!this.storage.get( 'expandedIds' )[ model.id ],
	            hasUser         : this.model.ownedByCurrUser()
	        });
	    },
	
	    /** In this override, add/remove expanded/collapsed model ids to/from web storage */
	    _setUpItemViewListeners : function( view ){
	        var panel = this;
	        _super.prototype._setUpItemViewListeners.call( panel, view );
	
	        //TODO:?? could use 'view:expanded' here?
	        // maintain a list of items whose bodies are expanded
	        panel.listenTo( view, {
	            'expanded': function( v ){
	                panel.storage.addExpanded( v.model );
	            },
	            'collapsed': function( v ){
	                panel.storage.removeExpanded( v.model );
	            }
	        });
	        return this;
	    },
	
	    // ------------------------------------------------------------------------ selection
	    /** Override to correctly set the historyId of the new collection */
	    getSelectedModels : function(){
	        var collection = _super.prototype.getSelectedModels.call( this );
	        collection.historyId = this.collection.historyId;
	        return collection;
	    },
	
	    // ------------------------------------------------------------------------ panel events
	    /** event map */
	    events : _.extend( _.clone( _super.prototype.events ), {
	        // toggle list item selectors
	        'click .show-selectors-btn'         : 'toggleSelectors',
	        // allow (error) messages to be clicked away
	        'click .messages [class$=message]'  : 'clearMessages'
	    }),
	
	    /** Handle the user toggling the deleted visibility by:
	     *      (1) storing the new value in the persistent storage
	     *      (2) re-rendering the history
	     * @returns {Boolean} new show_deleted setting
	     */
	    toggleShowDeleted : function( show, store ){
	        show = ( show !== undefined )?( show ):( !this.showDeleted );
	        store = ( store !== undefined )?( store ):( true );
	        this.showDeleted = show;
	        if( store ){
	            this.storage.set( 'show_deleted', show );
	        }
	        //TODO:?? to events on storage('change:show_deleted')
	        this.renderItems();
	        this.trigger( 'show-deleted', show );
	        return this.showDeleted;
	    },
	
	    /** Handle the user toggling the hidden visibility by:
	     *      (1) storing the new value in the persistent storage
	     *      (2) re-rendering the history
	     * @returns {Boolean} new show_hidden setting
	     */
	    toggleShowHidden : function( show, store ){
	        show = ( show !== undefined )?( show ):( !this.showHidden );
	        store = ( store !== undefined )?( store ):( true );
	        this.showHidden = show;
	        if( store ){
	            this.storage.set( 'show_hidden', show );
	        }
	        //TODO:?? to events on storage('change:show_deleted')
	        this.renderItems();
	        this.trigger( 'show-hidden', show );
	        return this.showHidden;
	    },
	
	    /** On the first search, if there are no details - load them, then search */
	    _firstSearch : function( searchFor ){
	        var panel = this,
	            inputSelector = '.history-search-input';
	        this.log( 'onFirstSearch', searchFor );
	
	        if( panel.model.contents.haveDetails() ){
	            panel.searchItems( searchFor );
	            return;
	        }
	
	        panel.$el.find( inputSelector ).searchInput( 'toggle-loading' );
	        panel.model.contents.fetchAllDetails({ silent: true })
	            .always( function(){
	                panel.$el.find( inputSelector ).searchInput( 'toggle-loading' );
	            })
	            .done( function(){
	                panel.searchItems( panel.searchFor );
	            });
	    },
	
	//TODO: break this out
	    // ........................................................................ error handling
	    /** Event handler for errors (from the panel, the history, or the history's contents)
	     *  @param {Model or View} model    the (Backbone) source of the error
	     *  @param {XMLHTTPRequest} xhr     any ajax obj. assoc. with the error
	     *  @param {Object} options         the options map commonly used with bbone ajax
	     *  @param {String} msg             optional message passed to ease error location
	     *  @param {Object} msg             optional object containing error details
	     */
	    errorHandler : function( model, xhr, options, msg, details ){
	        this.error( model, xhr, options, msg, details );
	
	        // interrupted ajax
	        if( xhr && xhr.status === 0 && xhr.readyState === 0 ){
	            //TODO: gmail style 'retrying in Ns'
	
	        // bad gateway
	        } else if( xhr && xhr.status === 502 ){
	            //TODO: gmail style 'retrying in Ns'
	
	        // otherwise, show an error message inside the panel
	        } else {
	            // if sentry is available, attempt to get the event id
	            var parsed = this._parseErrorMessage( model, xhr, options, msg, details );
	            // it's possible to have a triggered error before the message container is rendered - wait for it to show
	            if( !this.$messages().is( ':visible' ) ){
	                this.once( 'rendered', function(){
	                    this.displayMessage( 'error', parsed.message, parsed.details );
	                });
	            } else {
	                this.displayMessage( 'error', parsed.message, parsed.details );
	            }
	        }
	    },
	
	    /** Parse an error event into an Object usable by displayMessage based on the parameters
	     *      note: see errorHandler for more info on params
	     */
	    _parseErrorMessage : function( model, xhr, options, msg, details, sentryId ){
	        //if( xhr.responseText ){
	        //    xhr.responseText = _.escape( xhr.responseText );
	        //}
	        var user = Galaxy.user,
	            // add the args (w/ some extra info) into an obj
	            parsed = {
	                message : this._bePolite( msg ),
	                details : {
	                    message : msg,
	                    raven   : ( window.Raven && _.isFunction( Raven.lastEventId) )?
	                                    ( Raven.lastEventId() ):( undefined ),
	                    agent   : navigator.userAgent,
	                    // add ajax data from Galaxy object cache
	                    url     : ( window.Galaxy )?( Galaxy.lastAjax.url ):( undefined ),
	                    data    : ( window.Galaxy )?( Galaxy.lastAjax.data ):( undefined ),
	                    options : ( xhr )?( _.omit( options, 'xhr' ) ):( options ),
	                    xhr     : xhr,
	                    source  : ( _.isFunction( model.toJSON ) )?( model.toJSON() ):( model + '' ),
	                    user    : ( user instanceof USER.User )?( user.toJSON() ):( user + '' )
	                }
	            };
	
	        // add any extra details passed in
	        _.extend( parsed.details, details || {} );
	        // fancy xhr.header parsing (--> obj)
	        if( xhr &&  _.isFunction( xhr.getAllResponseHeaders ) ){
	            var responseHeaders = xhr.getAllResponseHeaders();
	            responseHeaders = _.compact( responseHeaders.split( '\n' ) );
	            responseHeaders = _.map( responseHeaders, function( header ){
	                return header.split( ': ' );
	            });
	            parsed.details.xhr.responseHeaders = _.object( responseHeaders );
	        }
	        return parsed;
	    },
	
	    /** Modify an error message to be fancy and wear a monocle. */
	    _bePolite : function( msg ){
	        msg = msg || _l( 'An error occurred while getting updates from the server' );
	        return msg + '. ' + _l( 'Please contact a Galaxy administrator if the problem persists' ) + '.';
	    },
	
	    // ........................................................................ (error) messages
	    /** Display a message in the top of the panel.
	     *  @param {String} type    type of message ('done', 'error', 'warning')
	     *  @param {String} msg     the message to display
	     *  @param {Object or HTML} modal contents displayed when the user clicks 'details' in the message
	     */
	    displayMessage : function( type, msg, details ){
	        //precondition: msgContainer must have been rendered even if there's no model
	        var panel = this;
	        //this.log( 'displayMessage', type, msg, details );
	
	        this.scrollToTop();
	        var $msgContainer = this.$messages(),
	            $msg = $( '<div/>' ).addClass( type + 'message' ).html( msg );
	        //this.log( '  ', $msgContainer );
	
	        if( !_.isEmpty( details ) ){
	            var $detailsLink = $( '<a href="javascript:void(0)">Details</a>' )
	                .click( function(){
	                    Galaxy.modal.show( panel._messageToModalOptions( type, msg, details ) );
	                    return false;
	                });
	            $msg.append( ' ', $detailsLink );
	        }
	        return $msgContainer.append( $msg );
	    },
	
	    /** convert msg and details into modal options usable by Galaxy.modal */
	    _messageToModalOptions : function( type, msg, details ){
	        // only error is fleshed out here
	        var panel = this,
	            options = { title: 'Details' };
	        if( _.isObject( details ) ){
	
	            details = _.omit( details, _.functions( details ) );
	            var text = JSON.stringify( details, null, '  ' ),
	                pre = $( '<pre/>' ).text( text );
	            options.body = $( '<div/>' ).append( pre );
	
	        } else {
	            options.body = $( '<div/>' ).html( details );
	        }
	
	        options.buttons = {
	            'Ok': function(){
	                Galaxy.modal.hide();
	                panel.clearMessages();
	            }
	            //TODO: if( type === 'error' ){ options.buttons[ 'Report this error' ] = function(){} }
	        };
	        return options;
	    },
	
	    /** Remove all messages from the panel. */
	    clearMessages : function( ev ){
	        var $target = !_.isUndefined( ev )?
	            $( ev.currentTarget )
	            :this.$messages().children( '[class$="message"]' );
	        $target.fadeOut( this.fxSpeed, function(){
	            $( this ).remove();
	        });
	        return this;
	    },
	
	    // ........................................................................ scrolling
	    /** Scrolls the panel to show the content sub-view with the given hid.
	     *  @param {Integer} hid    the hid of item to scroll into view
	     *  @returns {HistoryView} the panel
	     */
	    scrollToHid : function( hid ){
	        return this.scrollToItem( _.first( this.viewsWhereModel({ hid: hid }) ) );
	    },
	
	    // ........................................................................ misc
	    /** Return a string rep of the history */
	    toString : function(){
	        return 'HistoryView(' + (( this.model )?( this.model.get( 'name' )):( '' )) + ')';
	    }
	});
	
	
	//------------------------------------------------------------------------------ TEMPLATES
	HistoryView.prototype.templates = (function(){
	
	    var controlsTemplate = BASE_MVC.wrapTemplate([
	        '<div class="controls">',
	            '<div class="title">',
	                '<div class="name"><%- history.name %></div>',
	            '</div>',
	            '<div class="subtitle"></div>',
	            '<div class="history-size"><%- history.nice_size %></div>',
	
	            '<div class="actions"></div>',
	
	            '<div class="messages">',
	                '<% if( history.deleted && history.purged ){ %>',
	                    '<div class="deleted-msg warningmessagesmall">',
	                        _l( 'This history has been purged and deleted' ),
	                    '</div>',
	                '<% } else if( history.deleted ){ %>',
	                    '<div class="deleted-msg warningmessagesmall">',
	                        _l( 'This history has been deleted' ),
	                    '</div>',
	                '<% } else if( history.purged ){ %>',
	                    '<div class="deleted-msg warningmessagesmall">',
	                        _l( 'This history has been purged' ),
	                    '</div>',
	                '<% } %>',
	
	                '<% if( history.message ){ %>',
	                    // should already be localized
	                    '<div class="<%= history.message.level || "info" %>messagesmall">',
	                        '<%= history.message.text %>',
	                    '</div>',
	                '<% } %>',
	            '</div>',
	
	            // add tags and annotations
	            '<div class="tags-display"></div>',
	            '<div class="annotation-display"></div>',
	
	            '<div class="search">',
	                '<div class="search-input"></div>',
	            '</div>',
	
	            '<div class="list-actions">',
	                '<div class="btn-group">',
	                    '<button class="select-all btn btn-default"',
	                            'data-mode="select">', _l( 'All' ), '</button>',
	                    '<button class="deselect-all btn btn-default"',
	                            'data-mode="select">', _l( 'None' ), '</button>',
	                '</div>',
	                '<div class="list-action-menu btn-group">',
	                '</div>',
	            '</div>',
	        '</div>'
	    ], 'history' );
	
	    return _.extend( _.clone( _super.prototype.templates ), {
	        controls : controlsTemplate
	    });
	}());
	
	
	//==============================================================================
	    return {
	        HistoryView: HistoryView
	    };
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! underscore */ 1), __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 78 */
/*!*********************************************!*\
  !*** ./galaxy/scripts/ui/fa-icon-button.js ***!
  \*********************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function($, _) {(function (root, factory) {
	    if (true) {
	        !(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory), __WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ? (__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	    } else {
	        root.faIconButton = factory();
	    }
	
	}(this, function () {
	//============================================================================
	    /** Returns a jQuery object containing a clickable font-awesome button.
	     *      options:
	     *          tooltipConfig   : option map for bootstrap tool tip
	     *          classes         : array of class names (will always be classed as icon-btn)
	     *          disabled        : T/F - add the 'disabled' class?
	     *          title           : tooltip/title string
	     *          target          : optional href target
	     *          href            : optional href
	     *          faIcon          : which font awesome icon to use
	     *          onclick         : function to call when the button is clicked
	     */
	    var faIconButton = function( options ){
	        options = options || {};
	        options.tooltipConfig = options.tooltipConfig || { placement: 'bottom' };
	
	        options.classes = [ 'icon-btn' ].concat( options.classes || [] );
	        if( options.disabled ){
	            options.classes.push( 'disabled' );
	        }
	
	        var html = [
	            '<a class="', options.classes.join( ' ' ), '"',
	                    (( options.title )?( ' title="' + options.title + '"' ):( '' )),
	                    (( !options.disabled && options.target )?  ( ' target="' + options.target + '"' ):( '' )),
	                    ' href="', (( !options.disabled && options.href )?( options.href ):( 'javascript:void(0);' )), '">',
	                // could go with something less specific here - like 'html'
	                '<span class="fa ', options.faIcon, '"></span>',
	            '</a>'
	        ].join( '' );
	        var $button = $( html ).tooltip( options.tooltipConfig );
	        if( _.isFunction( options.onclick ) ){
	            $button.click( options.onclick );
	        }
	        return $button;
	    };
	
	//============================================================================
	    return faIconButton;
	}));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! jquery */ 3), __webpack_require__(/*! underscore */ 1)))

/***/ },
/* 79 */
/*!**********************************************!*\
  !*** ./galaxy/scripts/mvc/list/list-view.js ***!
  \**********************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone, _, $) {!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	    __webpack_require__(/*! mvc/list/list-item */ 80),
	    __webpack_require__(/*! ui/loading-indicator */ 81),
	    __webpack_require__(/*! mvc/base-mvc */ 5),
	    __webpack_require__(/*! utils/localization */ 7),
	    __webpack_require__(/*! ui/search-input */ 82)
	], __WEBPACK_AMD_DEFINE_RESULT__ = function( LIST_ITEM, LoadingIndicator, BASE_MVC, _l ){
	
	'use strict';
	
	var logNamespace = 'list';
	/* ============================================================================
	TODO:
	
	============================================================================ */
	/** @class View for a list/collection of models and the sub-views of those models.
	 *      Sub-views must (at least have the interface if not) inherit from ListItemView.
	 *      (For a list panel that also includes some 'container' model (History->HistoryContents)
	 *      use ModelWithListPanel)
	 *
	 *  Allows for:
	 *      searching collection/sub-views
	 *      selecting/multi-selecting sub-views
	 *
	 *  Currently used:
	 *      for dataset/dataset-choice
	 *      as superclass of ModelListPanel
	 */
	var ListPanel = Backbone.View.extend( BASE_MVC.LoggableMixin ).extend(/** @lends ListPanel.prototype */{
	    _logNamespace : logNamespace,
	
	    /** class to use for constructing the sub-views */
	    viewClass           : LIST_ITEM.ListItemView,
	    /** class to used for constructing collection of sub-view models */
	    collectionClass     : Backbone.Collection,
	
	    tagName             : 'div',
	    className           : 'list-panel',
	
	    /** (in ms) that jquery effects will use */
	    fxSpeed             : 'fast',
	
	    /** string to display when the collection has no contents */
	    emptyMsg            : _l( 'This list is empty' ),
	    /** displayed when no items match the search terms */
	    noneFoundMsg        : _l( 'No matching items found' ),
	    /** string used for search placeholder */
	    searchPlaceholder   : _l( 'search' ),
	
	    // ......................................................................... SET UP
	    /** Set up the view, set up storage, bind listeners to HistoryContents events
	     *  @param {Object} attributes optional settings for the list
	     */
	    initialize : function( attributes, options ){
	        attributes = attributes || {};
	        // set the logger if requested
	        if( attributes.logger ){
	            this.logger = attributes.logger;
	        }
	        this.log( this + '.initialize:', attributes );
	
	        // ---- instance vars
	        /** how quickly should jquery fx run? */
	        this.fxSpeed = _.has( attributes, 'fxSpeed' )?( attributes.fxSpeed ):( this.fxSpeed );
	
	        /** filters for displaying subviews */
	        this.filters = [];
	        /** current search terms */
	        this.searchFor = attributes.searchFor || '';
	
	        /** loading indicator */
	        this.indicator = new LoadingIndicator( this.$el );
	
	        /** currently showing selectors on items? */
	        this.selecting = ( attributes.selecting !== undefined )? attributes.selecting : true;
	        //this.selecting = false;
	
	        /** cached selected item.model.ids to persist btwn renders */
	        this.selected = attributes.selected || [];
	        /** the last selected item.model.id */
	        this.lastSelected = null;
	
	        /** are sub-views draggable */
	        this.dragItems = attributes.dragItems || false;
	
	        /** list item view class (when passed models) */
	        this.viewClass = attributes.viewClass || this.viewClass;
	
	        /** list item views */
	        this.views = [];
	        /** list item models */
	        this.collection = attributes.collection || ( new this.collectionClass([]) );
	
	        /** filter fns run over collection items to see if they should show in the list */
	        this.filters = attributes.filters || [];
	
	        /** override $scrollContainer fn via attributes - fn should return jq for elem to call scrollTo on */
	        this.$scrollContainer = attributes.$scrollContainer || this.$scrollContainer;
	
	//TODO: remove
	        this.title = attributes.title || '';
	        this.subtitle = attributes.subtitle || '';
	
	        this._setUpListeners();
	    },
	
	    /** free any sub-views the list has */
	    freeViews : function(){
	//TODO: stopListening? remove?
	        _.each( this.views, function( view ){
	            view.off();
	        });
	        this.views = [];
	        return this;
	    },
	
	    // ------------------------------------------------------------------------ listeners
	    /** create any event listeners for the list
	     */
	    _setUpListeners : function(){
	        this.off();
	
	        //TODO: move errorHandler down into list-view from history-view or
	        //  pass to global error handler (Galaxy)
	        this.on({
	            error: function( model, xhr, options, msg, details ){
	                //this.errorHandler( model, xhr, options, msg, details );
	                console.error( model, xhr, options, msg, details );
	            },
	            // show hide the loading indicator
	            loading: function(){
	                this._showLoadingIndicator( 'loading...', 40 );
	            },
	            'loading-done': function(){
	                this._hideLoadingIndicator( 40 );
	            },
	        });
	
	        // throw the first render up as a diff namespace using once (for outside consumption)
	        this.once( 'rendered', function(){
	            this.trigger( 'rendered:initial', this );
	        });
	
	        // debugging
	        if( this.logger ){
	            this.on( 'all', function( event ){
	                this.log( this + '', arguments );
	            });
	        }
	
	        this._setUpCollectionListeners();
	        this._setUpViewListeners();
	        return this;
	    },
	
	    /** listening for collection events */
	    _setUpCollectionListeners : function(){
	        this.log( this + '._setUpCollectionListeners', this.collection );
	        this.collection.off();
	
	        // bubble up error events
	        this.listenTo( this.collection, {
	            error   : function( model, xhr, options, msg, details ){
	                this.trigger( 'error', model, xhr, options, msg, details );
	            },
	            reset   : function(){
	                this.renderItems();
	            },
	            add     : this.addItemView,
	            remove  : this.removeItemView
	        });
	
	        // debugging
	        if( this.logger ){
	            this.listenTo( this.collection, 'all', function( event ){
	                this.info( this + '(collection)', arguments );
	            });
	        }
	        return this;
	    },
	
	    /** listening for sub-view events that bubble up with the 'view:' prefix */
	    _setUpViewListeners : function(){
	        this.log( this + '._setUpViewListeners' );
	
	        // shift to select a range
	        this.on({
	            'view:selected': function( view, ev ){
	                if( ev && ev.shiftKey && this.lastSelected ){
	                    var lastSelectedView = this.viewFromModelId( this.lastSelected );
	                    if( lastSelectedView ){
	                        this.selectRange( view, lastSelectedView );
	                    }
	                } else if( ev && ev.altKey && !this.selecting ){
	                    this.showSelectors();
	                }
	                this.selected.push( view.model.id );
	                this.lastSelected = view.model.id;
	            },
	
	            'view:de-selected': function( view, ev ){
	                this.selected = _.without( this.selected, view.model.id );
	                //this.lastSelected = view.model.id;
	            }
	        });
	    },
	
	    // ------------------------------------------------------------------------ rendering
	    /** Render this content, set up ui.
	     *  @param {Number or String} speed   the speed of the render
	     */
	    render : function( speed ){
	        this.log( this + '.render', speed );
	        var $newRender = this._buildNewRender();
	        this._setUpBehaviors( $newRender );
	        this._queueNewRender( $newRender, speed );
	        return this;
	    },
	
	    /** Build a temp div containing the new children for the view's $el.
	     */
	    _buildNewRender : function(){
	        this.debug( this + '(ListPanel)._buildNewRender' );
	        var $newRender = $( this.templates.el( {}, this ) );
	        this._renderControls( $newRender );
	        this._renderTitle( $newRender );
	        this._renderSubtitle( $newRender );
	        this._renderSearch( $newRender );
	        this.renderItems( $newRender );
	        return $newRender;
	    },
	
	    /** Build a temp div containing the new children for the view's $el.
	     */
	    _renderControls : function( $newRender ){
	        this.debug( this + '(ListPanel)._renderControls' );
	        var $controls = $( this.templates.controls( {}, this ) );
	        $newRender.find( '.controls' ).replaceWith( $controls );
	        return $controls;
	    },
	
	    /**
	     */
	    _renderTitle : function( $where ){
	        //$where = $where || this.$el;
	        //$where.find( '.title' ).replaceWith( ... )
	    },
	
	    /**
	     */
	    _renderSubtitle : function( $where ){
	        //$where = $where || this.$el;
	        //$where.find( '.title' ).replaceWith( ... )
	    },
	
	    /** Fade out the old el, swap in the new contents, then fade in.
	     *  @param {Number or String} speed   jq speed to use for rendering effects
	     *  @fires rendered when rendered
	     */
	    _queueNewRender : function( $newRender, speed ) {
	        speed = ( speed === undefined )?( this.fxSpeed ):( speed );
	        var panel = this;
	        panel.log( '_queueNewRender:', $newRender, speed );
	
	        $( panel ).queue( 'fx', [
	            function( next ){ this.$el.fadeOut( speed, next ); },
	            function( next ){
	                panel._swapNewRender( $newRender );
	                next();
	            },
	            function( next ){ this.$el.fadeIn( speed, next ); },
	            function( next ){
	                panel.trigger( 'rendered', panel );
	                next();
	            }
	        ]);
	    },
	
	    /** empty out the current el, move the $newRender's children in */
	    _swapNewRender : function( $newRender ){
	        this.$el.empty().attr( 'class', this.className ).append( $newRender.children() );
	        if( this.selecting ){ this.showSelectors( 0 ); }
	        return this;
	    },
	
	    /**  */
	    _setUpBehaviors : function( $where ){
	        $where = $where || this.$el;
	        $where.find( '.controls [title]' ).tooltip({ placement: 'bottom' });
	        // set up the pupup for actions available when multi selecting
	        this._renderMultiselectActionMenu( $where );
	        return this;
	    },
	
	    /** render a menu containing the actions available to sets of selected items */
	    _renderMultiselectActionMenu : function( $where ){
	        $where = $where || this.$el;
	        var $menu = $where.find( '.list-action-menu' ),
	            actions = this.multiselectActions();
	        if( !actions.length ){
	            return $menu.empty();
	        }
	
	        var $newMenu = $([
	            '<div class="list-action-menu btn-group">',
	                '<button class="list-action-menu-btn btn btn-default dropdown-toggle" data-toggle="dropdown">',
	                    _l( 'For all selected' ), '...',
	                '</button>',
	                '<ul class="dropdown-menu pull-right" role="menu">', '</ul>',
	            '</div>'
	        ].join(''));
	        var $actions = actions.map( function( action ){
	            var html = [ '<li><a href="javascript:void(0);">', action.html, '</a></li>' ].join( '' );
	            return $( html ).click( function( ev ){
	                ev.preventDefault();
	                return action.func( ev );
	            });
	        });
	        $newMenu.find( 'ul' ).append( $actions );
	        $menu.replaceWith( $newMenu );
	        return $newMenu;
	    },
	
	    /** return a list of plain objects used to render multiselect actions menu. Each object should have:
	     *      html: an html string used as the anchor contents
	     *      func: a function called when the anchor is clicked (passed the click event)
	     */
	    multiselectActions : function(){
	        return [];
	    },
	
	    // ------------------------------------------------------------------------ sub-$element shortcuts
	    /** the scroll container for this panel - can be $el, $el.parent(), or grandparent depending on context */
	    $scrollContainer : function(){
	        // override or set via attributes.$scrollContainer
	        return this.$el.parent().parent();
	    },
	    /**  */
	    $list : function( $where ){
	        return ( $where || this.$el ).find( '> .list-items' );
	    },
	    /** container where list messages are attached */
	    $messages : function( $where ){
	        return ( $where || this.$el ).find( '> .controls .messages' );
	    },
	    /** the message displayed when no views can be shown (no views, none matching search) */
	    $emptyMessage : function( $where ){
	        return ( $where || this.$el ).find( '> .empty-message' );
	    },
	
	    // ------------------------------------------------------------------------ hda sub-views
	    /**
	     *  @param {jQuery} $whereTo what dom element to prepend the sub-views to
	     *  @returns the visible item views
	     */
	    renderItems : function( $whereTo ){
	        $whereTo = $whereTo || this.$el;
	        var panel = this;
	        panel.log( this + '.renderItems', $whereTo );
	
	        var $list = panel.$list( $whereTo );
	//TODO: free prev. views?
	        panel.views = panel._filterCollection().map( function( itemModel ){
	//TODO: creates views each time - not neccessarily good
	//TODO: pass speed here
	                return panel._createItemView( itemModel ).render( 0 );
	            });
	        //panel.debug( item$els );
	        //panel.debug( newViews );
	
	        $list.empty();
	        if( panel.views.length ){
	            panel._attachItems( $whereTo );
	            panel.$emptyMessage( $whereTo ).hide();
	
	        } else {
	            panel._renderEmptyMessage( $whereTo ).show();
	        }
	        panel.trigger( 'views:ready', panel.views );
	
	        return panel.views;
	    },
	
	    /** Filter the collection to only those models that should be currently viewed */
	    _filterCollection : function(){
	        // override this
	        var panel = this;
	        return panel.collection.filter( _.bind( panel._filterItem, panel ) );
	    },
	
	    /** Should the model be viewable in the current state?
	     *     Checks against this.filters and this.searchFor
	     */
	    _filterItem : function( model ){
	        // override this
	        var panel = this;
	        return ( _.every( panel.filters.map( function( fn ){ return fn.call( model ); }) ) )
	            && ( !panel.searchFor || model.matchesAll( panel.searchFor ) );
	    },
	
	    /** Create a view for a model and set up it's listeners */
	    _createItemView : function( model ){
	        var ViewClass = this._getItemViewClass( model ),
	            options = _.extend( this._getItemViewOptions( model ), {
	                    model : model
	                }),
	            view = new ViewClass( options );
	        this._setUpItemViewListeners( view );
	        return view;
	    },
	
	    /** Get the bbone view class based on the model */
	    _getItemViewClass : function( model ){
	        // override this
	        return this.viewClass;
	    },
	
	    /** Get the options passed to the new view based on the model */
	    _getItemViewOptions : function( model ){
	        // override this
	        return {
	            //logger      : this.logger,
	            fxSpeed     : this.fxSpeed,
	            expanded    : false,
	            selectable  : this.selecting,
	            selected    : _.contains( this.selected, model.id ),
	            draggable   : this.dragItems
	        };
	    },
	
	    /** Set up listeners for new models */
	    _setUpItemViewListeners : function( view ){
	        var panel = this;
	        // send all events to the panel, re-namspaceing them with the view prefix
	        this.listenTo( view, 'all', function(){
	            var args = Array.prototype.slice.call( arguments, 0 );
	            args[0] = 'view:' + args[0];
	            panel.trigger.apply( panel, args );
	        });
	
	        // drag multiple - hijack ev.setData to add all selected items
	        this.listenTo( view, 'draggable:dragstart', function( ev, v ){
	            //TODO: set multiple drag data here
	            var json = {},
	                selected = this.getSelectedModels();
	            if( selected.length ){
	                json = selected.toJSON();
	            } else {
	                json = [ v.model.toJSON() ];
	            }
	            ev.dataTransfer.setData( 'text', JSON.stringify( json ) );
	            //ev.dataTransfer.setDragImage( v.el, 60, 60 );
	        }, this );
	
	        // debugging
	        //if( this.logger ){
	        //    view.on( 'all', function( event ){
	        //        this.log( this + '(view)', arguments );
	        //    }, this );
	        //}
	        return panel;
	    },
	
	    /** Attach views in this.views to the model based on $whereTo */
	    _attachItems : function( $whereTo ){
	        //ASSUMES: $list has been emptied
	        this.$list( $whereTo ).append( this.views.map( function( view ){
	            return view.$el;
	        }));
	        return this;
	    },
	
	    /** render the empty/none-found message */
	    _renderEmptyMessage : function( $whereTo ){
	        this.debug( '_renderEmptyMessage', $whereTo, this.searchFor );
	        var text = this.searchFor? this.noneFoundMsg : this.emptyMsg;
	        return this.$emptyMessage( $whereTo ).text( text );
	    },
	
	    /** collapse all item views */
	    expandAll : function(){
	        _.each( this.views, function( view ){
	            view.expand();
	        });
	    },
	
	    /** collapse all item views */
	    collapseAll : function(){
	        _.each( this.views, function( view ){
	            view.collapse();
	        });
	    },
	
	    // ------------------------------------------------------------------------ collection/views syncing
	    /** Add a view (if the model should be viewable) to the panel */
	    addItemView : function( model, collection, options ){
	        this.log( this + '.addItemView:', model );
	        var panel = this;
	        if( !panel._filterItem( model ) ){ return undefined; }
	
	        var view = panel._createItemView( model );
	        // hide the empty message if only view
	        $( view ).queue( 'fx', [
	            //TODO:? could poss. pubsub this
	            function( next ){ panel.$emptyMessage().fadeOut( panel.fxSpeed, next ); },
	            function( next ){
	                panel._attachView( view );
	                next();
	            }
	        ]);
	        return view;
	    },
	
	    /** internal fn to add view (to both panel.views and panel.$list) */
	    _attachView : function( view ){
	        var panel = this;
	        // override to control where the view is added, how/whether it's rendered
	        panel.views.push( view );
	        panel.$list().append( view.render( 0 ).$el.hide() );
	        panel.trigger( 'view:attached', view );
	        view.$el.slideDown( panel.fxSpeed, function(){
	            panel.trigger( 'view:attached:rendered' );
	        });
	    },
	
	    /** Remove a view from the panel (if found) */
	    removeItemView : function( model, collection, options ){
	        this.log( this + '.removeItemView:', model );
	        var panel = this,
	            view = panel.viewFromModel( model );
	        if( !view ){ return undefined; }
	        panel.views = _.without( panel.views, view );
	        panel.trigger( 'view:removed', view );
	
	        // potentially show the empty message if no views left
	        // use anonymous queue here - since remove can happen multiple times
	        $({}).queue( 'fx', [
	            function( next ){ view.$el.fadeOut( panel.fxSpeed, next ); },
	            function( next ){
	                view.remove();
	                panel.trigger( 'view:removed:rendered' );
	                if( !panel.views.length ){
	                    panel._renderEmptyMessage().fadeIn( panel.fxSpeed, next );
	                } else {
	                    next();
	                }
	            }
	        ]);
	        return view;
	    },
	
	    /** get views based on model.id */
	    viewFromModelId : function( id ){
	        for( var i = 0; i < this.views.length; i++ ){
	            if( this.views[i].model.id === id ){
	                return this.views[i];
	            }
	        }
	        return undefined;
	    },
	
	    /** get views based on model */
	    viewFromModel : function( model ){
	        if( !model ){ return undefined; }
	        return this.viewFromModelId( model.id );
	    },
	
	    /** get views based on model properties */
	    viewsWhereModel : function( properties ){
	        return this.views.filter( function( view ){
	            //return view.model.matches( properties );
	//TODO: replace with _.matches (underscore 1.6.0)
	            var json = view.model.toJSON();
	            for( var key in properties ){
	                if( properties.hasOwnProperty( key ) ){
	                    if( json[ key ] !== properties[ key ] ){
	                        return false;
	                    }
	                }
	            }
	            return true;
	        });
	    },
	
	    /** A range of views between (and including) viewA and viewB */
	    viewRange : function( viewA, viewB ){
	        if( viewA === viewB ){ return ( viewA )?( [ viewA ] ):( [] ); }
	
	        var indexA = this.views.indexOf( viewA ),
	            indexB = this.views.indexOf( viewB );
	
	        // handle not found
	        if( indexA === -1 || indexB === -1 ){
	            if( indexA === indexB ){ return []; }
	            return ( indexA === -1 )?( [ viewB ] ):( [ viewA ] );
	        }
	        // reverse if indeces are
	        //note: end inclusive
	        return ( indexA < indexB )?
	            this.views.slice( indexA, indexB + 1 ) :
	            this.views.slice( indexB, indexA + 1 );
	    },
	
	    // ------------------------------------------------------------------------ searching
	    /** render a search input for filtering datasets shown
	     *      (see SearchableMixin in base-mvc for implementation of the actual searching)
	     *      return will start the search
	     *      esc will clear the search
	     *      clicking the clear button will clear the search
	     *      uses searchInput in ui.js
	     */
	    _renderSearch : function( $where ){
	        $where.find( '.controls .search-input' ).searchInput({
	            placeholder     : this.searchPlaceholder,
	            initialVal      : this.searchFor,
	            onfirstsearch   : _.bind( this._firstSearch, this ),
	            onsearch        : _.bind( this.searchItems, this ),
	            onclear         : _.bind( this.clearSearch, this )
	        });
	        return $where;
	    },
	
	    /** What to do on the first search entered */
	    _firstSearch : function( searchFor ){
	        // override to load model details if necc.
	        this.log( 'onFirstSearch', searchFor );
	        return this.searchItems( searchFor );
	    },
	
	    /** filter view list to those that contain the searchFor terms */
	    searchItems : function( searchFor ){
	        this.searchFor = searchFor;
	        this.trigger( 'search:searching', searchFor, this );
	        this.renderItems();
	        this.$( '> .controls .search-query' ).val( searchFor );
	        return this;
	    },
	
	    /** clear the search filters and show all views that are normally shown */
	    clearSearch : function( searchFor ){
	        //this.log( 'onSearchClear', this );
	        this.searchFor = '';
	        this.trigger( 'search:clear', this );
	        this.$( '> .controls .search-query' ).val( '' );
	        this.renderItems();
	        return this;
	    },
	
	    // ------------------------------------------------------------------------ selection
	    /** @type Integer when the number of list item views is >= to this, don't animate selectors */
	    THROTTLE_SELECTORS_AT : 20,
	
	    /** show selectors on all visible itemViews and associated controls */
	    showSelectors : function( speed ){
	        speed = ( speed !== undefined )?( speed ):( this.fxSpeed );
	        this.selecting = true;
	        this.$( '.list-actions' ).slideDown( speed );
	        speed = this.views.length >= this.THROTTLE_SELECTORS_AT? 0 : speed;
	        _.each( this.views, function( view ){
	            view.showSelector( speed );
	        });
	        //this.selected = [];
	        //this.lastSelected = null;
	    },
	
	    /** hide selectors on all visible itemViews and associated controls */
	    hideSelectors : function( speed ){
	        speed = ( speed !== undefined )?( speed ):( this.fxSpeed );
	        this.selecting = false;
	        this.$( '.list-actions' ).slideUp( speed );
	        speed = this.views.length >= this.THROTTLE_SELECTORS_AT? 0 : speed;
	        _.each( this.views, function( view ){
	            view.hideSelector( speed );
	        });
	        this.selected = [];
	        this.lastSelected = null;
	    },
	
	    /** show or hide selectors on all visible itemViews and associated controls */
	    toggleSelectors : function(){
	        if( !this.selecting ){
	            this.showSelectors();
	        } else {
	            this.hideSelectors();
	        }
	    },
	
	    /** select all visible items */
	    selectAll : function( event ){
	        _.each( this.views, function( view ){
	            view.select( event );
	        });
	    },
	
	    /** deselect all visible items */
	    deselectAll : function( event ){
	        this.lastSelected = null;
	        _.each( this.views, function( view ){
	            view.deselect( event );
	        });
	    },
	
	    /** select a range of datasets between A and B */
	    selectRange : function( viewA, viewB ){
	        var range = this.viewRange( viewA, viewB );
	        _.each( range, function( view ){
	            view.select();
	        });
	        return range;
	    },
	
	    /** return an array of all currently selected itemViews */
	    getSelectedViews : function(){
	        return _.filter( this.views, function( v ){
	            return v.selected;
	        });
	    },
	
	    /** return a collection of the models of all currenly selected items */
	    getSelectedModels : function(){
	        return new this.collection.constructor( _.map( this.getSelectedViews(), function( view ){
	            return view.model;
	        }));
	    },
	
	    // ------------------------------------------------------------------------ loading indicator
	//TODO: questionable
	    /** hide the $el and display a loading indicator (in the $el's parent) when loading new data */
	    _showLoadingIndicator : function( msg, speed, callback ){
	        this.debug( '_showLoadingIndicator', this.indicator, msg, speed, callback );
	        speed = ( speed !== undefined )?( speed ):( this.fxSpeed );
	        if( !this.indicator ){
	            this.indicator = new LoadingIndicator( this.$el, this.$el.parent() );
	            this.debug( '\t created', this.indicator );
	        }
	        if( !this.$el.is( ':visible' ) ){
	            this.indicator.show( 0, callback );
	        } else {
	            this.$el.fadeOut( speed );
	            this.indicator.show( msg, speed, callback );
	        }
	    },
	
	    /** hide the loading indicator */
	    _hideLoadingIndicator : function( speed, callback ){
	        this.debug( '_hideLoadingIndicator', this.indicator, speed, callback );
	        speed = ( speed !== undefined )?( speed ):( this.fxSpeed );
	        if( this.indicator ){
	            this.indicator.hide( speed, callback );
	        }
	    },
	
	    // ------------------------------------------------------------------------ scrolling
	    /** get the current scroll position of the panel in its parent */
	    scrollPosition : function(){
	        return this.$scrollContainer().scrollTop();
	    },
	
	    /** set the current scroll position of the panel in its parent */
	    scrollTo : function( pos, speed ){
	        speed = speed || 0;
	        this.$scrollContainer().animate({ scrollTop: pos }, speed );
	        return this;
	    },
	
	    /** Scrolls the panel to the top. */
	    scrollToTop : function( speed ){
	        return this.scrollTo( 0, speed );
	    },
	
	    /**  */
	    scrollToItem : function( view, speed ){
	        if( !view ){ return this; }
	        //var itemTop = view.$el.offset().top;
	        var itemTop = view.el.offsetTop;
	        return this.scrollTo( itemTop, speed );
	    },
	
	    /** Scrolls the panel to show the content with the given id. */
	    scrollToId : function( id, speed ){
	        return this.scrollToItem( this.viewFromModelId( id ), speed );
	    },
	
	    // ------------------------------------------------------------------------ panel events
	    /** event map */
	    events : {
	        'click .select-all'     : 'selectAll',
	        'click .deselect-all'   : 'deselectAll'
	    },
	
	    // ------------------------------------------------------------------------ misc
	    /** Return a string rep of the panel */
	    toString : function(){
	        return 'ListPanel(' + this.collection + ')';
	    }
	});
	
	// ............................................................................ TEMPLATES
	/** underscore templates */
	ListPanel.prototype.templates = (function(){
	//TODO: move to require text! plugin
	
	    var elTemplate = BASE_MVC.wrapTemplate([
	        // temp container
	        '<div>',
	            '<div class="controls"></div>',
	            '<div class="list-items"></div>',
	            '<div class="empty-message infomessagesmall"></div>',
	        '</div>'
	    ]);
	
	    var controlsTemplate = BASE_MVC.wrapTemplate([
	        '<div class="controls">',
	            '<div class="title">',
	                '<div class="name"><%- view.title %></div>',
	            '</div>',
	            '<div class="subtitle"><%- view.subtitle %></div>',
	            // buttons, controls go here
	            '<div class="actions"></div>',
	            // deleted msg, etc.
	            '<div class="messages"></div>',
	
	            '<div class="search">',
	                '<div class="search-input"></div>',
	            '</div>',
	
	            // show when selectors are shown
	            '<div class="list-actions">',
	                '<div class="btn-group">',
	                    '<button class="select-all btn btn-default"',
	                            'data-mode="select">', _l( 'All' ), '</button>',
	                    '<button class="deselect-all btn btn-default"',
	                            'data-mode="select">', _l( 'None' ), '</button>',
	                '</div>',
	                '<div class="list-action-menu btn-group">',
	                '</div>',
	            '</div>',
	        '</div>'
	    ]);
	
	    return {
	        el          : elTemplate,
	        controls    : controlsTemplate
	    };
	}());
	
	
	//=============================================================================
	/** View for a model that has a sub-collection (e.g. History, DatasetCollection)
	 *  Allows:
	 *      the model to be reset
	 *      auto assign panel.collection to panel.model[ panel.modelCollectionKey ]
	 *
	 */
	var ModelListPanel = ListPanel.extend({
	
	    /** key of attribute in model to assign to this.collection */
	    modelCollectionKey : 'contents',
	
	    initialize : function( attributes ){
	        ListPanel.prototype.initialize.call( this, attributes );
	        this.selecting = ( attributes.selecting !== undefined )? attributes.selecting : false;
	
	        this.setModel( this.model, attributes );
	    },
	
	    /** release/free/shutdown old models and set up panel for new models
	     *  @fires new-model with the panel as parameter
	     */
	    setModel : function( model, attributes ){
	        attributes = attributes || {};
	        this.debug( this + '.setModel:', model, attributes );
	
	        this.freeModel();
	        this.freeViews();
	
	        if( model ){
	            var oldModelId = this.model? this.model.get( 'id' ): null;
	
	            // set up the new model with user, logger, storage, events
	            this.model = model;
	            if( this.logger ){
	                this.model.logger = this.logger;
	            }
	            this._setUpModelListeners();
	
	//TODO: relation btwn model, collection becoming tangled here
	            // free the collection, and assign the new collection to either
	            //  the model[ modelCollectionKey ], attributes.collection, or an empty vanilla collection
	            this.collection.off();
	            this.collection = ( this.model[ this.modelCollectionKey ] )?
	                this.model[ this.modelCollectionKey ]:
	                ( attributes.collection || ( new this.collectionClass([]) ) );
	            this._setUpCollectionListeners();
	
	            if( oldModelId && model.get( 'id' ) !== oldModelId  ){
	                this.trigger( 'new-model', this );
	            }
	        }
	        return this;
	    },
	
	    /** free the current model and all listeners for it, free any views for the model */
	    freeModel : function(){
	        // stop/release the previous model, and clear cache to sub-views
	        if( this.model ){
	            this.stopListening( this.model );
	            //TODO: see base-mvc
	            //this.model.free();
	            //this.model = null;
	        }
	        return this;
	    },
	
	    // ------------------------------------------------------------------------ listening
	    /** listening for model events */
	    _setUpModelListeners : function(){
	        // override
	        this.log( this + '._setUpModelListeners', this.model );
	        // bounce model errors up to the panel
	        this.listenTo( this.model, 'error', function(){
	            var args = Array.prototype.slice.call( arguments, 0 );
	            //args.unshift( 'model:error' );
	            args.unshift( 'error' );
	            this.trigger.apply( this, args );
	        }, this );
	        return this;
	    },
	
	    /** Build a temp div containing the new children for the view's $el.
	     */
	    _renderControls : function( $newRender ){
	        this.debug( this + '(ListPanel)._renderControls' );
	        var json = this.model? this.model.toJSON() : {},
	            $controls = $( this.templates.controls( json, this ) );
	        $newRender.find( '.controls' ).replaceWith( $controls );
	        return $controls;
	    },
	
	    // ------------------------------------------------------------------------ misc
	    /** Return a string rep of the panel */
	    toString : function(){
	        return 'ModelListPanel(' + this.model + ')';
	    }
	});
	
	// ............................................................................ TEMPLATES
	/** underscore templates */
	ModelListPanel.prototype.templates = (function(){
	//TODO: move to require text! plugin
	
	    var controlsTemplate = BASE_MVC.wrapTemplate([
	        '<div class="controls">',
	            '<div class="title">',
	//TODO: this is really the only difference - consider factoring titlebar out
	                '<div class="name"><%- model.name %></div>',
	            '</div>',
	            '<div class="subtitle"><%- view.subtitle %></div>',
	            '<div class="actions"></div>',
	            '<div class="messages"></div>',
	
	            '<div class="search">',
	                '<div class="search-input"></div>',
	            '</div>',
	
	            '<div class="list-actions">',
	                '<div class="btn-group">',
	                    '<button class="select-all btn btn-default"',
	                            'data-mode="select">', _l( 'All' ), '</button>',
	                    '<button class="deselect-all btn btn-default"',
	                            'data-mode="select">', _l( 'None' ), '</button>',
	                '</div>',
	                '<div class="list-action-menu btn-group">',
	                '</div>',
	            '</div>',
	        '</div>'
	    ]);
	
	    return _.extend( _.clone( ListPanel.prototype.templates ), {
	        controls : controlsTemplate
	    });
	}());
	
	
	//=============================================================================
	    return {
	        ListPanel      : ListPanel,
	        ModelListPanel : ModelListPanel
	    };
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! underscore */ 1), __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 80 */
/*!**********************************************!*\
  !*** ./galaxy/scripts/mvc/list/list-item.js ***!
  \**********************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone, $, _, jQuery) {!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	    __webpack_require__(/*! mvc/base-mvc */ 5),
	    __webpack_require__(/*! utils/localization */ 7)
	], __WEBPACK_AMD_DEFINE_RESULT__ = function( BASE_MVC, _l ){
	
	'use strict';
	
	var logNamespace = 'list';
	//==============================================================================
	/** A view which, when first rendered, shows only summary data/attributes, but
	 *      can be expanded to show further details (and optionally fetch those
	 *      details from the server).
	 */
	var ExpandableView = Backbone.View.extend( BASE_MVC.LoggableMixin ).extend({
	    _logNamespace : logNamespace,
	
	//TODO: Although the reasoning behind them is different, this shares a lot with HiddenUntilActivated above: combine them
	    //PRECONDITION: model must have method hasDetails
	    //PRECONDITION: subclasses must have templates.el and templates.details
	
	    initialize : function( attributes ){
	        /** are the details of this view expanded/shown or not? */
	        this.expanded   = attributes.expanded || false;
	        this.log( '\t expanded:', this.expanded );
	        this.fxSpeed = attributes.fxSpeed !== undefined? attributes.fxSpeed : this.fxSpeed;
	    },
	
	    // ........................................................................ render main
	    /** jq fx speed */
	    fxSpeed : 'fast',
	
	    /** Render this content, set up ui.
	     *  @param {Number or String} speed   the speed of the render
	     */
	    render : function( speed ){
	        var $newRender = this._buildNewRender();
	        this._setUpBehaviors( $newRender );
	        this._queueNewRender( $newRender, speed );
	        return this;
	    },
	
	    /** Build a temp div containing the new children for the view's $el.
	     *      If the view is already expanded, build the details as well.
	     */
	    _buildNewRender : function(){
	        // create a new render using a skeleton template, render title buttons, render body, and set up events, etc.
	        var $newRender = $( this.templates.el( this.model.toJSON(), this ) );
	        if( this.expanded ){
	            this.$details( $newRender ).replaceWith( this._renderDetails().show() );
	        }
	        return $newRender;
	    },
	
	    /** Fade out the old el, swap in the new contents, then fade in.
	     *  @param {Number or String} speed   jq speed to use for rendering effects
	     *  @fires rendered when rendered
	     */
	    _queueNewRender : function( $newRender, speed ) {
	        speed = ( speed === undefined )?( this.fxSpeed ):( speed );
	        var view = this;
	
	        $( view ).queue( 'fx', [
	            function( next ){ this.$el.fadeOut( speed, next ); },
	            function( next ){
	                view._swapNewRender( $newRender );
	                next();
	            },
	            function( next ){ this.$el.fadeIn( speed, next ); },
	            function( next ){
	                this.trigger( 'rendered', view );
	                next();
	            }
	        ]);
	    },
	
	    /** empty out the current el, move the $newRender's children in */
	    _swapNewRender : function( $newRender ){
	        return this.$el.empty()
	            .attr( 'class', _.isFunction( this.className )? this.className(): this.className )
	            .append( $newRender.children() );
	    },
	
	    /** set up js behaviors, event handlers for elements within the given container
	     *  @param {jQuery} $container jq object that contains the elements to process (defaults to this.$el)
	     */
	    _setUpBehaviors : function( $where ){
	        $where = $where || this.$el;
	        // set up canned behavior on children (bootstrap, popupmenus, editable_text, etc.)
	        //make_popup_menus( $where );
	        $where.find( '[title]' ).tooltip({ placement : 'bottom' });
	    },
	
	    // ......................................................................... details
	    /** shortcut to details DOM (as jQ) */
	    $details : function( $where ){
	        $where = $where || this.$el;
	        return $where.find( '> .details' );
	    },
	
	    /** build the DOM for the details and set up behaviors on it */
	    _renderDetails : function(){
	        var $newDetails = $( this.templates.details( this.model.toJSON(), this ) );
	        this._setUpBehaviors( $newDetails );
	        return $newDetails;
	    },
	
	    // ......................................................................... expansion/details
	    /** Show or hide the details
	     *  @param {Boolean} expand if true, expand; if false, collapse
	     */
	    toggleExpanded : function( expand ){
	        expand = ( expand === undefined )?( !this.expanded ):( expand );
	        if( expand ){
	            this.expand();
	        } else {
	            this.collapse();
	        }
	        return this;
	    },
	
	    /** Render and show the full, detailed body of this view including extra data and controls.
	     *      note: if the model does not have detailed data, fetch that data before showing the body
	     *  @fires expanded when a body has been expanded
	     */
	    expand : function(){
	        var view = this;
	        return view._fetchModelDetails().always( function(){
	                view._expand();
	            });
	    },
	
	    /** Check for model details and, if none, fetch them.
	     *  @returns {jQuery.promise} the model.fetch.xhr if details are being fetched, an empty promise if not
	     */
	    _fetchModelDetails : function(){
	        if( !this.model.hasDetails() ){
	            return this.model.fetch();
	        }
	        return jQuery.when();
	    },
	
	    /** Inner fn called when expand (public) has fetched the details */
	    _expand : function(){
	        var view = this,
	            $newDetails = view._renderDetails();
	        view.$details().replaceWith( $newDetails );
	        // needs to be set after the above or the slide will not show
	        view.expanded = true;
	        view.$details().slideDown({
	            duration : view.fxSpeed,
	            step: function(){
	                view.trigger( 'expanding', view );
	            },
	            complete: function(){
	                view.trigger( 'expanded', view );
	            }
	        });
	    },
	
	    /** Hide the body/details of an HDA.
	     *  @fires collapsed when a body has been collapsed
	     */
	    collapse : function(){
	        this.debug( this + '(ExpandableView).collapse' );
	        var view = this;
	        view.expanded = false;
	        this.$details().slideUp({
	            duration : view.fxSpeed,
	            step: function(){
	                view.trigger( 'collapsing', view );
	            },
	            complete: function(){
	                view.trigger( 'collapsed', view );
	            }
	        });
	    }
	
	});
	
	
	//==============================================================================
	/** A view that is displayed in some larger list/grid/collection.
	 *      Inherits from Expandable, Selectable, Draggable.
	 *  The DOM contains warnings, a title bar, and a series of primary action controls.
	 *      Primary actions are meant to be easily accessible item functions (such as delete)
	 *      that are rendered in the title bar.
	 *
	 *  Details are rendered when the user clicks the title bar or presses enter/space when
	 *      the title bar is in focus.
	 *
	 *  Designed as a base class for history panel contents - but usable elsewhere (I hope).
	 */
	var ListItemView = ExpandableView.extend(
	        BASE_MVC.mixin( BASE_MVC.SelectableViewMixin, BASE_MVC.DraggableViewMixin, {
	
	//TODO: that's a little contradictory
	    tagName     : 'div',
	    className   : 'list-item',
	
	    /** Set up the base class and all mixins */
	    initialize : function( attributes ){
	        ExpandableView.prototype.initialize.call( this, attributes );
	        BASE_MVC.SelectableViewMixin.initialize.call( this, attributes );
	        BASE_MVC.DraggableViewMixin.initialize.call( this, attributes );
	        this._setUpListeners();
	    },
	
	    /** event listeners */
	    _setUpListeners : function(){
	        // hide the primary actions in the title bar when selectable and narrow
	        this.on( 'selectable', function( isSelectable ){
	            if( isSelectable ){
	                this.$( '.primary-actions' ).hide();
	            } else {
	                this.$( '.primary-actions' ).show();
	            }
	        }, this );
	        //this.on( 'all', function( event ){
	        //    this.log( event );
	        //}, this );
	        return this;
	    },
	
	    // ........................................................................ rendering
	    /** In this override, call methods to build warnings, titlebar and primary actions */
	    _buildNewRender : function(){
	        var $newRender = ExpandableView.prototype._buildNewRender.call( this );
	        $newRender.children( '.warnings' ).replaceWith( this._renderWarnings() );
	        $newRender.children( '.title-bar' ).replaceWith( this._renderTitleBar() );
	        $newRender.children( '.primary-actions' ).append( this._renderPrimaryActions() );
	        $newRender.find( '> .title-bar .subtitle' ).replaceWith( this._renderSubtitle() );
	        return $newRender;
	    },
	
	    /** In this override, render the selector controls and set up dragging before the swap */
	    _swapNewRender : function( $newRender ){
	        ExpandableView.prototype._swapNewRender.call( this, $newRender );
	        if( this.selectable ){ this.showSelector( 0 ); }
	        if( this.draggable ){ this.draggableOn(); }
	        return this.$el;
	    },
	
	    /** Render any warnings the item may need to show (e.g. "I'm deleted") */
	    _renderWarnings : function(){
	        var view = this,
	            $warnings = $( '<div class="warnings"></div>' ),
	            json = view.model.toJSON();
	//TODO:! unordered (map)
	        _.each( view.templates.warnings, function( templateFn ){
	            $warnings.append( $( templateFn( json, view ) ) );
	        });
	        return $warnings;
	    },
	
	    /** Render the title bar (the main/exposed SUMMARY dom element) */
	    _renderTitleBar : function(){
	        return $( this.templates.titleBar( this.model.toJSON(), this ) );
	    },
	
	    /** Return an array of jQ objects containing common/easily-accessible item controls */
	    _renderPrimaryActions : function(){
	        // override this
	        return [];
	    },
	
	    /** Render the title bar (the main/exposed SUMMARY dom element) */
	    _renderSubtitle : function(){
	        return $( this.templates.subtitle( this.model.toJSON(), this ) );
	    },
	
	    // ......................................................................... events
	    /** event map */
	    events : {
	        // expand the body when the title is clicked or when in focus and space or enter is pressed
	        'click .title-bar'      : '_clickTitleBar',
	        'keydown .title-bar'    : '_keyDownTitleBar',
	
	        // dragging - don't work, originalEvent === null
	        //'dragstart .dataset-title-bar'  : 'dragStartHandler',
	        //'dragend .dataset-title-bar'    : 'dragEndHandler'
	
	        'click .selector'       : 'toggleSelect'
	    },
	
	    /** expand when the title bar is clicked */
	    _clickTitleBar : function( event ){
	        event.stopPropagation();
	        if( event.altKey ){
	            this.toggleSelect( event );
	            if( !this.selectable ){
	                this.showSelector();
	            }
	        } else {
	            this.toggleExpanded();
	        }
	    },
	
	    /** expand when the title bar is in focus and enter or space is pressed */
	    _keyDownTitleBar : function( event ){
	        // bail (with propagation) if keydown and not space or enter
	        var KEYCODE_SPACE = 32, KEYCODE_RETURN = 13;
	        if( event && ( event.type === 'keydown' )
	        &&( event.keyCode === KEYCODE_SPACE || event.keyCode === KEYCODE_RETURN ) ){
	            this.toggleExpanded();
	            event.stopPropagation();
	            return false;
	        }
	        return true;
	    },
	
	    // ......................................................................... misc
	    /** String representation */
	    toString : function(){
	        var modelString = ( this.model )?( this.model + '' ):( '(no model)' );
	        return 'ListItemView(' + modelString + ')';
	    }
	}));
	
	// ............................................................................ TEMPLATES
	/** underscore templates */
	ListItemView.prototype.templates = (function(){
	//TODO: move to require text! plugin
	
	    var elTemplato = BASE_MVC.wrapTemplate([
	        '<div class="list-element">',
	            // errors, messages, etc.
	            '<div class="warnings"></div>',
	
	            // multi-select checkbox
	            '<div class="selector">',
	                '<span class="fa fa-2x fa-square-o"></span>',
	            '</div>',
	            // space for title bar buttons - gen. floated to the right
	            '<div class="primary-actions"></div>',
	            '<div class="title-bar"></div>',
	
	            // expandable area for more details
	            '<div class="details"></div>',
	        '</div>'
	    ]);
	
	    var warnings = {};
	
	    var titleBarTemplate = BASE_MVC.wrapTemplate([
	        // adding a tabindex here allows focusing the title bar and the use of keydown to expand the dataset display
	        '<div class="title-bar clear" tabindex="0">',
	//TODO: prob. belongs in dataset-list-item
	            '<span class="state-icon"></span>',
	            '<div class="title">',
	                '<span class="name"><%- element.name %></span>',
	            '</div>',
	            '<div class="subtitle"></div>',
	        '</div>'
	    ], 'element' );
	
	    var subtitleTemplate = BASE_MVC.wrapTemplate([
	        // override this
	        '<div class="subtitle"></div>'
	    ]);
	
	    var detailsTemplate = BASE_MVC.wrapTemplate([
	        // override this
	        '<div class="details"></div>'
	    ]);
	
	    return {
	        el          : elTemplato,
	        warnings    : warnings,
	        titleBar    : titleBarTemplate,
	        subtitle    : subtitleTemplate,
	        details     : detailsTemplate
	    };
	}());
	
	
	//==============================================================================
	/** A view that is displayed in some larger list/grid/collection.
	 *  *AND* can display some sub-list of it's own when expanded (e.g. dataset collections).
	 *  This list will 'foldout' when the item is expanded depending on this.foldoutStyle:
	 *      If 'foldout': will expand vertically to show the nested list
	 *      If 'drilldown': will overlay the parent list
	 *
	 *  Inherits from ListItemView.
	 *
	 *  _renderDetails does the work of creating this.details: a sub-view that shows the nested list
	 */
	var FoldoutListItemView = ListItemView.extend({
	
	    /** If 'foldout': show the sub-panel inside the expanded item
	     *  If 'drilldown': only fire events and handle by pub-sub
	     *      (allow the panel containing this item to attach it, hide itself, etc.)
	     */
	    foldoutStyle        : 'foldout',
	    /** Panel view class to instantiate for the sub-panel */
	    foldoutPanelClass   : null,
	
	    /** override to:
	     *      add attributes foldoutStyle and foldoutPanelClass for config poly
	     *      disrespect attributes.expanded if drilldown
	     */
	    initialize : function( attributes ){
	//TODO: hackish
	        if( this.foldoutStyle === 'drilldown' ){ this.expanded = false; }
	        this.foldoutStyle = attributes.foldoutStyle || this.foldoutStyle;
	        this.foldoutPanelClass = attributes.foldoutPanelClass || this.foldoutPanelClass;
	
	        ListItemView.prototype.initialize.call( this, attributes );
	        this.foldout = this._createFoldoutPanel();
	    },
	
	//TODO:?? override to exclude foldout scope?
	    //$ : function( selector ){
	    //    var $found = ListItemView.prototype.$.call( this, selector );
	    //    return $found;
	    //},
	
	    /** in this override, attach the foldout panel when rendering details */
	    _renderDetails : function(){
	//TODO: hackish
	        if( this.foldoutStyle === 'drilldown' ){ return $(); }
	        var $newDetails = ListItemView.prototype._renderDetails.call( this );
	        return this._attachFoldout( this.foldout, $newDetails );
	    },
	
	    /** In this override, handle collection expansion. */
	    _createFoldoutPanel : function(){
	        var model = this.model;
	        var FoldoutClass = this._getFoldoutPanelClass( model ),
	            options = this._getFoldoutPanelOptions( model ),
	            foldout = new FoldoutClass( _.extend( options, {
	                model           : model
	            }));
	        return foldout;
	    },
	
	    /** Stub to return proper foldout panel class */
	    _getFoldoutPanelClass : function(){
	        // override
	        return this.foldoutPanelClass;
	    },
	
	    /** Stub to return proper foldout panel options */
	    _getFoldoutPanelOptions : function(){
	        return {
	            // propagate foldout style down
	            foldoutStyle : this.foldoutStyle,
	            fxSpeed      : this.fxSpeed
	        };
	    },
	
	    /** Render the foldout panel inside the view, hiding controls */
	    _attachFoldout : function( foldout, $whereTo ){
	        $whereTo = $whereTo || this.$( '> .details' );
	        this.foldout = foldout.render( 0 );
	//TODO: hack
	        foldout.$( '> .controls' ).hide();
	        return $whereTo.append( foldout.$el );
	    },
	
	    /** In this override, branch on foldoutStyle to show expanded */
	    expand : function(){
	        var view = this;
	        return view._fetchModelDetails()
	            .always(function(){
	                if( view.foldoutStyle === 'foldout' ){
	                    view._expand();
	                } else if( view.foldoutStyle === 'drilldown' ){
	                    view._expandByDrilldown();
	                }
	            });
	    },
	
	    /** For drilldown, set up close handler and fire expanded:drilldown
	     *      containing views can listen to this and handle other things
	     *      (like hiding themselves) by listening for expanded/collapsed:drilldown
	     */
	    _expandByDrilldown : function(){
	        var view = this;
	        // attachment and rendering done by listener
	        view.listenTo( view.foldout, 'close', function(){
	            view.trigger( 'collapsed:drilldown', view, view.foldout );
	        });
	        view.trigger( 'expanded:drilldown', view, view.foldout );
	    }
	
	});
	
	// ............................................................................ TEMPLATES
	/** underscore templates */
	FoldoutListItemView.prototype.templates = (function(){
	
	//TODO:?? unnecessary?
	    // use element identifier
	    var detailsTemplate = BASE_MVC.wrapTemplate([
	        '<div class="details">',
	            // override with more info (that goes above the panel)
	        '</div>'
	    ], 'collection' );
	
	    return _.extend( {}, ListItemView.prototype.templates, {
	        details : detailsTemplate
	    });
	}());
	
	
	//==============================================================================
	    return {
	        ExpandableView                  : ExpandableView,
	        ListItemView                    : ListItemView,
	        FoldoutListItemView             : FoldoutListItemView
	    };
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! jquery */ 3), __webpack_require__(/*! underscore */ 1), __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 81 */
/*!************************************************!*\
  !*** ./galaxy/scripts/ui/loading-indicator.js ***!
  \************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(jQuery, $) {(function (root, factory) {
	    if (true) {
	        // AMD. Register as an anonymous module.
	        !(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory), __WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ? (__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	    } else {
	        // Browser globals
	        root.LoadingIndicator = factory();
	    }
	
	//============================================================================
	}(this, function () {
	    //TODO: too specific to history panel
	    function LoadingIndicator( $where, options ){
	
	        var self = this;
	        // defaults
	        options = jQuery.extend({
	            cover       : false
	        }, options || {} );
	
	        function render(){
	            var html = [
	                '<div class="loading-indicator">',
	                    '<div class="loading-indicator-text">',
	                        '<span class="fa fa-spinner fa-spin fa-lg"></span>',
	                        '<span class="loading-indicator-message">loading...</span>',
	                    '</div>',
	                '</div>'
	            ].join( '\n' );
	
	            var $indicator = $( html ).hide().css( options.css || {
	                    position    : 'fixed'
	                }),
	                $text = $indicator.children( '.loading-indicator-text' );
	
	            if( options.cover ){
	                $indicator.css({
	                    'z-index'   : 2,
	                    top         : $where.css( 'top' ),
	                    bottom      : $where.css( 'bottom' ),
	                    left        : $where.css( 'left' ),
	                    right       : $where.css( 'right' ),
	                    opacity     : 0.5,
	                    'background-color': 'white',
	                    'text-align': 'center'
	                });
	                $text = $indicator.children( '.loading-indicator-text' ).css({
	                    'margin-top'        : '20px'
	                });
	
	            } else {
	                $text = $indicator.children( '.loading-indicator-text' ).css({
	                    margin              : '12px 0px 0px 10px',
	                    opacity             : '0.85',
	                    color               : 'grey'
	                });
	                $text.children( '.loading-indicator-message' ).css({
	                    margin          : '0px 8px 0px 0px',
	                    'font-style'    : 'italic'
	                });
	            }
	            return $indicator;
	        }
	
	        self.show = function( msg, speed, callback ){
	            msg = msg || 'loading...';
	            speed = speed || 'fast';
	            // remove previous
	            $where.parent().find( '.loading-indicator' ).remove();
	            // since position is fixed - we insert as sibling
	            self.$indicator = render().insertBefore( $where );
	            self.message( msg );
	            self.$indicator.fadeIn( speed, callback );
	            return self;
	        };
	
	        self.message = function( msg ){
	            self.$indicator.find( 'i' ).text( msg );
	        };
	
	        self.hide = function( speed, callback ){
	            speed = speed || 'fast';
	            if( self.$indicator && self.$indicator.size() ){
	                self.$indicator.fadeOut( speed, function(){
	                    self.$indicator.remove();
	                    if( callback ){ callback(); }
	                });
	            } else {
	                if( callback ){ callback(); }
	            }
	            return self;
	        };
	        return self;
	    }
	
	//============================================================================
	    return LoadingIndicator;
	}));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! jquery */ 3), __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 82 */
/*!*******************************************!*\
  !*** ./galaxy/scripts/ui/search-input.js ***!
  \*******************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function($, jQuery) {// from: https://raw.githubusercontent.com/umdjs/umd/master/jqueryPlugin.js
	// Uses AMD or browser globals to create a jQuery plugin.
	(function (factory) {
	    if (true) {
	        //TODO: So...this turns out to be an all or nothing thing. If I load jQuery in the define below, it will
	        //  (of course) wipe the old jquery *and all the plugins loaded into it*. So the define below *is still
	        //  relying on jquery being loaded globally* in order to preserve plugins.
	        !(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory), __WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ? (__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	    } else {
	        // Browser globals
	        factory(jQuery);
	    }
	
	}(function () {
	    var _l = window._l || function( s ){ return s; };
	
	    /** searchInput: (jQuery plugin)
	     *      Creates a search input, a clear button, and loading indicator
	     *      within the selected node.
	     *
	     *      When the user either presses return or enters some minimal number
	     *      of characters, a callback is called. Pressing ESC when the input
	     *      is focused will clear the input and call a separate callback.
	     */
	    function searchInput( parentNode, options ){
	//TODO: consolidate with tool menu functionality, use there
	        var KEYCODE_ESC     = 27,
	            KEYCODE_RETURN  = 13,
	            $parentNode     = $( parentNode ),
	            firstSearch     = true,
	            defaults = {
	                initialVal      : '',
	                name            : 'search',
	                placeholder     : 'search',
	                classes         : '',
	                onclear         : function(){},
	                onfirstsearch   : null,
	                onsearch        : function( inputVal ){},
	                minSearchLen    : 0,
	                escWillClear    : true,
	                oninit          : function(){}
	            };
	
	        // .................................................................... input rendering and events
	        // visually clear the search, trigger an event, and call the callback
	        function clearSearchInput( event ){
	            var $input = $( this ).parent().children( 'input' );
	            //console.debug( this, 'clear', $input );
	            $input.focus().val( '' ).trigger( 'clear:searchInput' );
	            options.onclear();
	        }
	
	        // search for searchTerms, trigger an event, call the appropo callback (based on whether this is the first)
	        function search( event, searchTerms ){
	            //console.debug( this, 'searching', searchTerms );
	            //TODO: I don't think this is classic jq custom event form? search.searchInput?
	            $( this ).trigger( 'search:searchInput', searchTerms );
	            if( typeof options.onfirstsearch === 'function' && firstSearch ){
	                firstSearch = false;
	                options.onfirstsearch( searchTerms );
	            } else {
	                options.onsearch( searchTerms );
	            }
	        }
	
	        // .................................................................... input rendering and events
	        function inputTemplate(){
	            // class search-query is bootstrap 2.3 style that now lives in base.less
	            return [ '<input type="text" name="', options.name, '" placeholder="', options.placeholder, '" ',
	                            'class="search-query ', options.classes, '" ', '/>' ].join( '' );
	        }
	
	        // the search input that responds to keyboard events and displays the search value
	        function $input(){
	            return $( inputTemplate() )
	                // select all text on a focus
	                .focus( function( event ){
	                    $( this ).select();
	                })
	                // attach behaviors to esc, return if desired, search on some min len string
	                .keyup( function( event ){
	                    event.preventDefault();
	                    event.stopPropagation();
	//TODO: doesn't work
	                    if( !$( this ).val() ){ $( this ).blur(); }
	
	                    // esc key will clear if desired
	                    if( event.which === KEYCODE_ESC && options.escWillClear ){
	                        clearSearchInput.call( this, event );
	
	                    } else {
	                        var searchTerms = $( this ).val();
	                        // return key or the search string len > minSearchLen (if not 0) triggers search
	                        if( ( event.which === KEYCODE_RETURN )
	                        ||  ( options.minSearchLen && searchTerms.length >= options.minSearchLen ) ){
	                            search.call( this, event, searchTerms );
	                        } else if( !searchTerms.length ){
	                            clearSearchInput.call( this, event );
	                        }
	                    }
	                })
	                .on( 'change', function( event ){
	                    search.call( this, event, $( this ).val() );
	                })
	                .val( options.initialVal );
	        }
	
	        // .................................................................... clear button rendering and events
	        // a button for clearing the search bar, placed on the right hand side
	        function $clearBtn(){
	            return $([ '<span class="search-clear fa fa-times-circle" ',
	                             'title="', _l( 'clear search (esc)' ), '"></span>' ].join('') )
	            .tooltip({ placement: 'bottom' })
	            .click( function( event ){
	                clearSearchInput.call( this, event );
	            });
	        }
	
	        // .................................................................... loadingIndicator rendering
	        // a button for clearing the search bar, placed on the right hand side
	        function $loadingIndicator(){
	            return $([ '<span class="search-loading fa fa-spinner fa-spin" ',
	                             'title="', _l( 'loading...' ), '"></span>' ].join('') )
	                .hide().tooltip({ placement: 'bottom' });
	        }
	
	        // .................................................................... commands
	        // visually swap the load, clear buttons
	        function toggleLoadingIndicator(){
	            $parentNode.find( '.search-loading' ).toggle();
	            $parentNode.find( '.search-clear' ).toggle();
	        }
	
	        // .................................................................... init
	        // string command (not constructor)
	        if( jQuery.type( options ) === 'string' ){
	            if( options === 'toggle-loading' ){
	                toggleLoadingIndicator();
	            }
	            return $parentNode;
	        }
	
	        // initial render
	        if( jQuery.type( options ) === 'object' ){
	            options = jQuery.extend( true, {}, defaults, options );
	        }
	        //NOTE: prepended
	        return $parentNode.addClass( 'search-input' ).prepend([ $input(), $clearBtn(), $loadingIndicator() ]);
	    }
	
	    // as jq plugin
	    jQuery.fn.extend({
	        searchInput : function $searchInput( options ){
	            return this.each( function(){
	                return searchInput( this, options );
	            });
	        }
	    });
	}));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! jquery */ 3), __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 83 */
/*!**********************************************!*\
  !*** ./galaxy/scripts/mvc/history/hda-li.js ***!
  \**********************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(_) {!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	    __webpack_require__(/*! mvc/dataset/dataset-li */ 84),
	    __webpack_require__(/*! mvc/base-mvc */ 5),
	    __webpack_require__(/*! utils/localization */ 7)
	], __WEBPACK_AMD_DEFINE_RESULT__ = function( DATASET_LI, BASE_MVC, _l ){
	
	'use strict';
	
	//==============================================================================
	var _super = DATASET_LI.DatasetListItemView;
	/** @class Read only view for HistoryDatasetAssociation.
	 *      Since there are no controls on the HDAView to hide the dataset,
	 *      the primary thing this class does (currently) is override templates
	 *      to render the HID.
	 */
	var HDAListItemView = _super.extend(
	/** @lends HDAListItemView.prototype */{
	
	    /** logger used to record this.log messages, commonly set to console */
	    //logger              : console,
	
	    className   : _super.prototype.className + " history-content",
	
	    initialize : function( attributes, options ){
	        _super.prototype.initialize.call( this, attributes, options );
	    },
	
	    // ......................................................................... misc
	    /** String representation */
	    toString : function(){
	        var modelString = ( this.model )?( this.model + '' ):( '(no model)' );
	        return 'HDAListItemView(' + modelString + ')';
	    }
	});
	
	// ............................................................................ TEMPLATES
	/** underscore templates */
	HDAListItemView.prototype.templates = (function(){
	//TODO: move to require text! plugin
	
	    var titleBarTemplate = BASE_MVC.wrapTemplate([
	        // adding the hid display to the title
	        '<div class="title-bar clear" tabindex="0">',
	            '<span class="state-icon"></span>',
	            '<div class="title">',
	                //TODO: remove whitespace and use margin-right
	                '<span class="hid"><%- dataset.hid %></span> ',
	                '<span class="name"><%- dataset.name %></span>',
	            '</div>',
	        '</div>'
	    ], 'dataset' );
	
	    var warnings = _.extend( {}, _super.prototype.templates.warnings, {
	        hidden : BASE_MVC.wrapTemplate([
	            // add a warning when hidden
	            '<% if( !dataset.visible ){ %>',
	                '<div class="hidden-msg warningmessagesmall">',
	                    _l( 'This dataset has been hidden' ),
	                '</div>',
	            '<% } %>'
	        ], 'dataset' )
	    });
	
	    return _.extend( {}, _super.prototype.templates, {
	        titleBar : titleBarTemplate,
	        warnings : warnings
	    });
	}());
	
	
	
	//==============================================================================
	    return {
	        HDAListItemView  : HDAListItemView
	    };
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! underscore */ 1)))

/***/ },
/* 84 */
/*!**************************************************!*\
  !*** ./galaxy/scripts/mvc/dataset/dataset-li.js ***!
  \**************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(jQuery, Backbone, $, _) {!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	    __webpack_require__(/*! mvc/list/list-item */ 80),
	    __webpack_require__(/*! mvc/dataset/states */ 68),
	    __webpack_require__(/*! ui/fa-icon-button */ 78),
	    __webpack_require__(/*! mvc/base-mvc */ 5),
	    __webpack_require__(/*! utils/localization */ 7)
	], __WEBPACK_AMD_DEFINE_RESULT__ = function( LIST_ITEM, STATES, faIconButton, BASE_MVC, _l ){
	'use strict';
	
	var logNamespace = 'dataset';
	/*==============================================================================
	TODO:
	    straighten out state rendering and templates used
	    inaccessible/STATES.NOT_VIEWABLE is a special case
	    simplify button rendering
	
	==============================================================================*/
	var _super = LIST_ITEM.ListItemView;
	/** @class Read only list view for either LDDAs, HDAs, or HDADCEs.
	 *      Roughly, any DatasetInstance (and not a raw Dataset).
	 */
	var DatasetListItemView = _super.extend(
	/** @lends DatasetListItemView.prototype */{
	    _logNamespace : logNamespace,
	
	    className   : _super.prototype.className + " dataset",
	    //TODO:?? doesn't exactly match an hda's type_id
	    id          : function(){
	        return [ 'dataset', this.model.get( 'id' ) ].join( '-' );
	    },
	
	    /** Set up: instance vars, options, and event handlers */
	    initialize : function( attributes ){
	        if( attributes.logger ){ this.logger = this.model.logger = attributes.logger; }
	        this.log( this + '.initialize:', attributes );
	        _super.prototype.initialize.call( this, attributes );
	
	        /** where should pages from links be displayed? (default to new tab/window) */
	        this.linkTarget = attributes.linkTarget || '_blank';
	    },
	
	    /** event listeners */
	    _setUpListeners : function(){
	        _super.prototype._setUpListeners.call( this );
	
	        // re-rendering on any model changes
	        this.listenTo( this.model, 'change', function( model, options ){
	            // if the model moved into the ready state and is expanded without details, fetch those details now
	            if( this.model.changedAttributes().state && this.model.inReadyState()
	            &&  this.expanded && !this.model.hasDetails() ){
	                // will render automatically (due to fetch -> change)
	                this.model.fetch();
	
	            } else {
	                this.render();
	            }
	        });
	    },
	
	    // ......................................................................... expandable
	    /** In this override, only get details if in the ready state, get rerunnable if in other states.
	     *  Note: fetch with no 'change' event triggering to prevent automatic rendering.
	     */
	    _fetchModelDetails : function(){
	        var view = this;
	        if( view.model.inReadyState() && !view.model.hasDetails() ){
	            return view.model.fetch({ silent: true });
	        }
	        return jQuery.when();
	    },
	
	    // ......................................................................... removal
	    /** Remove this view's html from the DOM and remove all event listeners.
	     *  @param {Number or String} speed jq effect speed
	     *  @param {Function} callback      an optional function called when removal is done (scoped to this view)
	     */
	    remove : function( speed, callback ){
	        var view = this;
	        speed = speed || this.fxSpeed;
	        this.$el.fadeOut( speed, function(){
	            Backbone.View.prototype.remove.call( view );
	            if( callback ){ callback.call( view ); }
	        });
	    },
	
	    // ......................................................................... rendering
	    /* TODO:
	        dataset states are the issue primarily making dataset rendering complex
	            each state should have it's own way of displaying/set of details
	            often with different actions that can be applied
	        throw in deleted/purged/visible and things get complicated easily
	        I've considered (a couple of times) - creating a view for each state
	            - but recreating the view during an update...seems wrong
	    */
	    /** Render this HDA, set up ui.
	     *  @param {Number or String} speed jq fx speed
	     *  @returns {Object} this
	     */
	    render : function( speed ){
	        //HACK: hover exit doesn't seem to be called on prev. tooltips when RE-rendering - so: no tooltip hide
	        // handle that here by removing previous view's tooltips
	        //this.$el.find("[title]").tooltip( "destroy" );
	        return _super.prototype.render.call( this, speed );
	    },
	
	    /** In this override, add the dataset state as a class for use with state-based CSS */
	    _swapNewRender : function( $newRender ){
	        _super.prototype._swapNewRender.call( this, $newRender );
	        if( this.model.has( 'state' ) ){
	            this.$el.addClass( 'state-' + this.model.get( 'state' ) );
	        }
	        return this.$el;
	    },
	
	    // ................................................................................ titlebar
	    /** In this override, add the dataset display button. */
	    _renderPrimaryActions : function(){
	        // render just the display for read-only
	        return [ this._renderDisplayButton() ];
	    },
	
	    /** Render icon-button to display dataset data */
	    _renderDisplayButton : function(){
	//TODO:?? too complex - possibly move into template
	        // don't show display if not viewable or not accessible
	        var state = this.model.get( 'state' );
	        if( ( state === STATES.NOT_VIEWABLE )
	        ||  ( state === STATES.DISCARDED )
	        ||  ( !this.model.get( 'accessible' ) ) ){
	            return null;
	        }
	
	        var displayBtnData = {
	            target      : this.linkTarget,
	            classes     : 'display-btn'
	        };
	
	        // show a disabled display if the data's been purged
	        if( this.model.get( 'purged' ) ){
	            displayBtnData.disabled = true;
	            displayBtnData.title = _l( 'Cannot display datasets removed from disk' );
	
	        // disable if still uploading
	        } else if( state === STATES.UPLOAD ){
	            displayBtnData.disabled = true;
	            displayBtnData.title = _l( 'This dataset must finish uploading before it can be viewed' );
	
	        // disable if still new
	        } else if( state === STATES.NEW ){
	            displayBtnData.disabled = true;
	            displayBtnData.title = _l( 'This dataset is not yet viewable' );
	
	        } else {
	            displayBtnData.title = _l( 'View data' );
	
	            // default link for dataset
	            displayBtnData.href  = this.model.urls.display;
	
	            // add frame manager option onclick event
	            var self = this;
	            displayBtnData.onclick = function( ev ){
	                if (Galaxy.frame && Galaxy.frame.active) {
	                    // Add dataset to frames.
	                    Galaxy.frame.addDataset(self.model.get('id'));
	                    ev.preventDefault();
	                }
	            };
	        }
	        displayBtnData.faIcon = 'fa-eye';
	        return faIconButton( displayBtnData );
	    },
	
	    // ......................................................................... rendering details
	    /** Render the enclosing div of the hda body and, if expanded, the html in the body
	     *  @returns {jQuery} rendered DOM
	     */
	    _renderDetails : function(){
	        //TODO: generalize to be allow different details for each state
	
	        // no access - render nothing but a message
	        if( this.model.get( 'state' ) === STATES.NOT_VIEWABLE ){
	            return $( this.templates.noAccess( this.model.toJSON(), this ) );
	        }
	
	        var $details = _super.prototype._renderDetails.call( this );
	        $details.find( '.actions .left' ).empty().append( this._renderSecondaryActions() );
	        $details.find( '.summary' ).html( this._renderSummary() )
	            .prepend( this._renderDetailMessages() );
	        $details.find( '.display-applications' ).html( this._renderDisplayApplications() );
	
	//TODO: double tap
	        this._setUpBehaviors( $details );
	        return $details;
	    },
	
	    /** Defer to the appropo summary rendering fn based on state */
	    _renderSummary : function(){
	        var json = this.model.toJSON(),
	            summaryRenderFn = this.templates.summaries[ json.state ];
	        summaryRenderFn = summaryRenderFn || this.templates.summaries.unknown;
	        return summaryRenderFn( json, this );
	    },
	
	    /** Render messages to be displayed only when the details are shown */
	    _renderDetailMessages : function(){
	        var view = this,
	            $warnings = $( '<div class="detail-messages"></div>' ),
	            json = view.model.toJSON();
	//TODO:! unordered (map)
	        _.each( view.templates.detailMessages, function( templateFn ){
	            $warnings.append( $( templateFn( json, view ) ) );
	        });
	        return $warnings;
	    },
	
	    /** Render the external display application links */
	    _renderDisplayApplications : function(){
	        if( this.model.isDeletedOrPurged() ){ return ''; }
	        // render both old and new display apps using the same template
	        return [
	            this.templates.displayApplications( this.model.get( 'display_apps' ), this ),
	            this.templates.displayApplications( this.model.get( 'display_types' ), this )
	        ].join( '' );
	    },
	
	    // ......................................................................... secondary/details actions
	    /** A series of links/buttons for less commonly used actions: re-run, info, etc. */
	    _renderSecondaryActions : function(){
	        this.debug( '_renderSecondaryActions' );
	        switch( this.model.get( 'state' ) ){
	            case STATES.NOT_VIEWABLE:
	                return [];
	            case STATES.OK:
	            case STATES.FAILED_METADATA:
	            case STATES.ERROR:
	                return [ this._renderDownloadButton(), this._renderShowParamsButton() ];
	        }
	        return [ this._renderShowParamsButton() ];
	    },
	
	    /** Render icon-button to show the input and output (stdout/err) for the job that created this.
	     *  @returns {jQuery} rendered DOM
	     */
	    _renderShowParamsButton : function(){
	        // gen. safe to show in all cases
	        return faIconButton({
	            title       : _l( 'View details' ),
	            classes     : 'params-btn',
	            href        : this.model.urls.show_params,
	            target      : this.linkTarget,
	            faIcon      : 'fa-info-circle'
	        });
	    },
	
	    /** Render icon-button/popupmenu to download the data (and/or the associated meta files (bai, etc.)) for this.
	     *  @returns {jQuery} rendered DOM
	     */
	    _renderDownloadButton : function(){
	//TODO: to (its own) template fn
	        // don't show anything if the data's been purged
	        if( this.model.get( 'purged' ) || !this.model.hasData() ){ return null; }
	
	        // return either: a popupmenu with links to download assoc. meta files (if there are meta files)
	        //  or a single download icon-button (if there are no meta files)
	        if( !_.isEmpty( this.model.get( 'meta_files' ) ) ){
	            return this._renderMetaFileDownloadButton();
	        }
	
	        return $([
	            '<a class="download-btn icon-btn" href="', this.model.urls.download, '" title="' + _l( 'Download' ) + '" download>',
	                '<span class="fa fa-floppy-o"></span>',
	            '</a>'
	        ].join( '' ));
	    },
	
	    /** Render the download button which opens a dropdown with links to download assoc. meta files (indeces, etc.) */
	    _renderMetaFileDownloadButton : function(){
	        var urls = this.model.urls;
	        return $([
	            '<div class="metafile-dropdown dropdown">',
	                '<a class="download-btn icon-btn" href="javascript:void(0)" data-toggle="dropdown"',
	                    ' title="' + _l( 'Download' ) + '">',
	                    '<span class="fa fa-floppy-o"></span>',
	                '</a>',
	                '<ul class="dropdown-menu" role="menu" aria-labelledby="dLabel">',
	                    '<li><a href="' + urls.download + '" download>', _l( 'Download dataset' ), '</a></li>',
	                    _.map( this.model.get( 'meta_files' ), function( meta_file ){
	                        return [
	                            '<li><a href="', urls.meta_download + meta_file.file_type, '">',
	                                _l( 'Download' ), ' ', meta_file.file_type,
	                            '</a></li>'
	                        ].join( '' );
	                    }).join( '\n' ),
	                '</ul>',
	            '</div>'
	        ].join( '\n' ));
	    },
	
	    // ......................................................................... misc
	    events : _.extend( _.clone( _super.prototype.events ), {
	        'click .display-btn'    : function( ev ){ this.trigger( 'display', this, ev ); },
	        'click .params-btn'     : function( ev ){ this.trigger( 'params', this, ev ); },
	        'click .download-btn'   : function( ev ){ this.trigger( 'download', this, ev ); }
	    }),
	
	    // ......................................................................... misc
	    /** String representation */
	    toString : function(){
	        var modelString = ( this.model )?( this.model + '' ):( '(no model)' );
	        return 'DatasetListItemView(' + modelString + ')';
	    }
	});
	
	// ............................................................................ TEMPLATES
	/** underscore templates */
	DatasetListItemView.prototype.templates = (function(){
	//TODO: move to require text! plugin
	
	    var warnings = _.extend( {}, _super.prototype.templates.warnings, {
	        failed_metadata : BASE_MVC.wrapTemplate([
	            // failed metadata is rendered as a warning on an otherwise ok dataset view
	            '<% if( model.state === "failed_metadata" ){ %>',
	                '<div class="warningmessagesmall">',
	                    _l( 'An error occurred setting the metadata for this dataset' ),
	                '</div>',
	            '<% } %>'
	        ]),
	        error : BASE_MVC.wrapTemplate([
	            // error during index fetch - show error on dataset
	            '<% if( model.error ){ %>',
	                '<div class="errormessagesmall">',
	                    _l( 'There was an error getting the data for this dataset' ), ': <%- model.error %>',
	                '</div>',
	            '<% } %>'
	        ]),
	        purged : BASE_MVC.wrapTemplate([
	            '<% if( model.purged ){ %>',
	                '<div class="purged-msg warningmessagesmall">',
	                    _l( 'This dataset has been deleted and removed from disk' ),
	                '</div>',
	            '<% } %>'
	        ]),
	        deleted : BASE_MVC.wrapTemplate([
	            // deleted not purged
	            '<% if( model.deleted && !model.purged ){ %>',
	                '<div class="deleted-msg warningmessagesmall">',
	                    _l( 'This dataset has been deleted' ),
	                '</div>',
	            '<% } %>'
	        ])
	
	        //NOTE: hidden warning is only needed for HDAs
	    });
	
	    var detailsTemplate = BASE_MVC.wrapTemplate([
	        '<div class="details">',
	            '<div class="summary"></div>',
	
	            '<div class="actions clear">',
	                '<div class="left"></div>',
	                '<div class="right"></div>',
	            '</div>',
	
	            // do not display tags, annotation, display apps, or peek when deleted
	            '<% if( !dataset.deleted && !dataset.purged ){ %>',
	                '<div class="tags-display"></div>',
	                '<div class="annotation-display"></div>',
	
	                '<div class="display-applications"></div>',
	
	                '<% if( dataset.peek ){ %>',
	                    '<pre class="dataset-peek"><%= dataset.peek %></pre>',
	                '<% } %>',
	            '<% } %>',
	        '</div>'
	    ], 'dataset' );
	
	    var noAccessTemplate = BASE_MVC.wrapTemplate([
	        '<div class="details">',
	            '<div class="summary">',
	                _l( 'You do not have permission to view this dataset' ),
	            '</div>',
	        '</div>'
	    ], 'dataset' );
	
	//TODO: still toooooooooooooo complex - rework
	    var summaryTemplates = {};
	    summaryTemplates[ STATES.OK ] = summaryTemplates[ STATES.FAILED_METADATA ] = BASE_MVC.wrapTemplate([
	        '<% if( dataset.misc_blurb ){ %>',
	            '<div class="blurb">',
	                '<span class="value"><%- dataset.misc_blurb %></span>',
	            '</div>',
	        '<% } %>',
	
	        '<% if( dataset.file_ext ){ %>',
	            '<div class="datatype">',
	                '<label class="prompt">', _l( 'format' ), '</label>',
	                '<span class="value"><%- dataset.file_ext %></span>',
	            '</div>',
	        '<% } %>',
	
	        '<% if( dataset.metadata_dbkey ){ %>',
	            '<div class="dbkey">',
	                '<label class="prompt">', _l( 'database' ), '</label>',
	                '<span class="value">',
	                    '<%- dataset.metadata_dbkey %>',
	                '</span>',
	            '</div>',
	        '<% } %>',
	
	        '<% if( dataset.misc_info ){ %>',
	            '<div class="info">',
	                '<span class="value"><%- dataset.misc_info %></span>',
	            '</div>',
	        '<% } %>'
	    ], 'dataset' );
	    summaryTemplates[ STATES.NEW ] = BASE_MVC.wrapTemplate([
	        '<div>', _l( 'This is a new dataset and not all of its data are available yet' ), '</div>'
	    ], 'dataset' );
	    summaryTemplates[ STATES.NOT_VIEWABLE ] = BASE_MVC.wrapTemplate([
	        '<div>', _l( 'You do not have permission to view this dataset' ), '</div>'
	    ], 'dataset' );
	    summaryTemplates[ STATES.DISCARDED ] = BASE_MVC.wrapTemplate([
	        '<div>', _l( 'The job creating this dataset was cancelled before completion' ), '</div>'
	    ], 'dataset' );
	    summaryTemplates[ STATES.QUEUED ] = BASE_MVC.wrapTemplate([
	        '<div>', _l( 'This job is waiting to run' ), '</div>'
	    ], 'dataset' );
	    summaryTemplates[ STATES.RUNNING ] = BASE_MVC.wrapTemplate([
	        '<div>', _l( 'This job is currently running' ), '</div>'
	    ], 'dataset' );
	    summaryTemplates[ STATES.UPLOAD ] = BASE_MVC.wrapTemplate([
	        '<div>', _l( 'This dataset is currently uploading' ), '</div>'
	    ], 'dataset' );
	    summaryTemplates[ STATES.SETTING_METADATA ] = BASE_MVC.wrapTemplate([
	        '<div>', _l( 'Metadata is being auto-detected' ), '</div>'
	    ], 'dataset' );
	    summaryTemplates[ STATES.PAUSED ] = BASE_MVC.wrapTemplate([
	        '<div>', _l( 'This job is paused. Use the "Resume Paused Jobs" in the history menu to resume' ), '</div>'
	    ], 'dataset' );
	    summaryTemplates[ STATES.ERROR ] = BASE_MVC.wrapTemplate([
	        '<% if( !dataset.purged ){ %>',
	            '<div><%- dataset.misc_blurb %></div>',
	        '<% } %>',
	        '<span class="help-text">', _l( 'An error occurred with this dataset' ), ':</span>',
	        '<div class="job-error-text"><%- dataset.misc_info %></div>'
	    ], 'dataset' );
	    summaryTemplates[ STATES.EMPTY ] = BASE_MVC.wrapTemplate([
	        '<div>', _l( 'No data' ), ': <i><%- dataset.misc_blurb %></i></div>'
	    ], 'dataset' );
	    summaryTemplates.unknown = BASE_MVC.wrapTemplate([
	        '<div>Error: unknown dataset state: "<%- dataset.state %>"</div>'
	    ], 'dataset' );
	
	    // messages to be displayed only within the details section ('below the fold')
	    var detailMessageTemplates = {
	        resubmitted : BASE_MVC.wrapTemplate([
	            // deleted not purged
	            '<% if( model.resubmitted ){ %>',
	                '<div class="resubmitted-msg infomessagesmall">',
	                    _l( 'The job creating this dataset has been resubmitted' ),
	                '</div>',
	            '<% } %>'
	        ])
	    };
	
	    // this is applied to both old and new style display apps
	    var displayApplicationsTemplate = BASE_MVC.wrapTemplate([
	        '<% _.each( apps, function( app ){ %>',
	            '<div class="display-application">',
	                '<span class="display-application-location"><%- app.label %></span> ',
	                '<span class="display-application-links">',
	                    '<% _.each( app.links, function( link ){ %>',
	                        '<a target="<%- link.target %>" href="<%- link.href %>">',
	                            '<% print( _l( link.text ) ); %>',
	                        '</a> ',
	                    '<% }); %>',
	                '</span>',
	            '</div>',
	        '<% }); %>'
	    ], 'apps' );
	
	    return _.extend( {}, _super.prototype.templates, {
	        warnings    : warnings,
	        details     : detailsTemplate,
	        noAccess    : noAccessTemplate,
	        summaries   : summaryTemplates,
	        detailMessages      : detailMessageTemplates,
	        displayApplications : displayApplicationsTemplate
	    });
	}());
	
	
	// ============================================================================
	    return {
	        DatasetListItemView : DatasetListItemView
	    };
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! jquery */ 3), __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! jquery */ 3), __webpack_require__(/*! underscore */ 1)))

/***/ },
/* 85 */
/*!***********************************************!*\
  !*** ./galaxy/scripts/mvc/history/hdca-li.js ***!
  \***********************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(_) {!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	    __webpack_require__(/*! mvc/dataset/states */ 68),
	    __webpack_require__(/*! mvc/collection/collection-li */ 86),
	    __webpack_require__(/*! mvc/collection/collection-view */ 87),
	    __webpack_require__(/*! mvc/base-mvc */ 5),
	    __webpack_require__(/*! utils/localization */ 7)
	], __WEBPACK_AMD_DEFINE_RESULT__ = function( STATES, DC_LI, DC_VIEW, BASE_MVC, _l ){
	
	'use strict';
	
	//==============================================================================
	var _super = DC_LI.DCListItemView;
	/** @class Read only view for HistoryDatasetCollectionAssociation (a dataset collection inside a history).
	 */
	var HDCAListItemView = _super.extend(
	/** @lends HDCAListItemView.prototype */{
	
	    /** logger used to record this.log messages, commonly set to console */
	    //logger              : console,
	
	    className   : _super.prototype.className + " history-content",
	
	    /** event listeners */
	    _setUpListeners : function(){
	        _super.prototype._setUpListeners.call( this );
	
	        this.listenTo( this.model, {
	            'change:populated change:visible' : function( model, options ){ this.render(); },
	        });
	    },
	
	    /** Override to provide the proper collections panels as the foldout */
	    _getFoldoutPanelClass : function(){
	        switch( this.model.get( 'collection_type' ) ){
	            case 'list':
	                return DC_VIEW.ListCollectionView;
	            case 'paired':
	                return DC_VIEW.PairCollectionView;
	            case 'list:paired':
	                return DC_VIEW.ListOfPairsCollectionView;
	        }
	        throw new TypeError( 'Uknown collection_type: ' + this.model.get( 'collection_type' ) );
	    },
	
	    /** In this override, add the state as a class for use with state-based CSS */
	    _swapNewRender : function( $newRender ){
	        _super.prototype._swapNewRender.call( this, $newRender );
	//TODO: model currently has no state
	        var state = !this.model.get( 'populated' ) ? STATES.RUNNING : STATES.OK;
	        //if( this.model.has( 'state' ) ){
	        this.$el.addClass( 'state-' + state );
	        //}
	        return this.$el;
	    },
	
	    // ......................................................................... misc
	    /** String representation */
	    toString : function(){
	        var modelString = ( this.model )?( this.model + '' ):( '(no model)' );
	        return 'HDCAListItemView(' + modelString + ')';
	    }
	});
	
	/** underscore templates */
	HDCAListItemView.prototype.templates = (function(){
	
	    var warnings = _.extend( {}, _super.prototype.templates.warnings, {
	        hidden : BASE_MVC.wrapTemplate([
	            // add a warning when hidden
	            '<% if( !collection.visible ){ %>',
	                '<div class="hidden-msg warningmessagesmall">',
	                    _l( 'This collection has been hidden' ),
	                '</div>',
	            '<% } %>'
	        ], 'collection' )
	    });
	
	// could steal this from hda-base (or use mixed content)
	    var titleBarTemplate = BASE_MVC.wrapTemplate([
	        // adding the hid display to the title
	        '<div class="title-bar clear" tabindex="0">',
	            '<span class="state-icon"></span>',
	            '<div class="title">',
	                //TODO: remove whitespace and use margin-right
	                '<span class="hid"><%- collection.hid %></span> ',
	                '<span class="name"><%- collection.name %></span>',
	            '</div>',
	            '<div class="subtitle"></div>',
	        '</div>'
	    ], 'collection' );
	
	    return _.extend( {}, _super.prototype.templates, {
	        warnings : warnings,
	        titleBar : titleBarTemplate
	    });
	}());
	
	
	//==============================================================================
	    return {
	        HDCAListItemView : HDCAListItemView
	    };
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! underscore */ 1)))

/***/ },
/* 86 */
/*!********************************************************!*\
  !*** ./galaxy/scripts/mvc/collection/collection-li.js ***!
  \********************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(_, $, jQuery) {!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	    __webpack_require__(/*! mvc/list/list-item */ 80),
	    __webpack_require__(/*! mvc/dataset/dataset-li */ 84),
	    __webpack_require__(/*! mvc/base-mvc */ 5),
	    __webpack_require__(/*! utils/localization */ 7)
	], __WEBPACK_AMD_DEFINE_RESULT__ = function( LIST_ITEM, DATASET_LI, BASE_MVC, _l ){
	
	'use strict';
	//==============================================================================
	var FoldoutListItemView = LIST_ITEM.FoldoutListItemView,
	    ListItemView = LIST_ITEM.ListItemView;
	/** @class Read only view for DatasetCollection.
	 */
	var DCListItemView = FoldoutListItemView.extend(
	/** @lends DCListItemView.prototype */{
	//TODO: may not be needed
	
	    /** logger used to record this.log messages, commonly set to console */
	    //logger              : console,
	
	    className   : FoldoutListItemView.prototype.className + " dataset-collection",
	    id          : function(){
	        return [ 'dataset_collection', this.model.get( 'id' ) ].join( '-' );
	    },
	
	    /** override to add linkTarget */
	    initialize : function( attributes ){
	        this.linkTarget = attributes.linkTarget || '_blank';
	        this.hasUser = attributes.hasUser;
	        FoldoutListItemView.prototype.initialize.call( this, attributes );
	    },
	
	    /** event listeners */
	    _setUpListeners : function(){
	        FoldoutListItemView.prototype._setUpListeners.call( this );
	        // re-rendering on deletion
	        this.listenTo( this.model, 'change', function( model, options ){
	            if( _.isEqual( _.keys( model.changed ), [ 'deleted' ] ) ){
	                this.render();
	            }
	        });
	    },
	
	    // ......................................................................... rendering
	    //TODO:?? possibly move to listItem
	    /** render a subtitle to show the user what sort of collection this is */
	    _renderSubtitle : function(){
	        var $subtitle = $( '<div class="subtitle"></div>' );
	        //TODO: would be good to get this in the subtitle
	        //var len = this.model.elements.length;
	        switch( this.model.get( 'collection_type' ) ){
	            case 'list':
	                return $subtitle.text( _l( 'a list of datasets' ) );
	            case 'paired':
	                return $subtitle.text( _l( 'a pair of datasets' ) );
	            case 'list:paired':
	                return $subtitle.text( _l( 'a list of paired datasets' ) );
	        }
	        return $subtitle;
	    },
	
	    // ......................................................................... foldout
	    /** override to add linktarget to sub-panel */
	    _getFoldoutPanelOptions : function(){
	        var options = FoldoutListItemView.prototype._getFoldoutPanelOptions.call( this );
	        return _.extend( options, {
	            linkTarget  : this.linkTarget,
	            hasUser     : this.hasUser
	        });
	    },
	
	    /** override to not catch sub-panel selectors */
	    $selector : function(){
	        return this.$( '> .selector' );
	    },
	
	    // ......................................................................... misc
	    /** String representation */
	    toString : function(){
	        var modelString = ( this.model )?( this.model + '' ):( '(no model)' );
	        return 'DCListItemView(' + modelString + ')';
	    }
	});
	
	// ............................................................................ TEMPLATES
	/** underscore templates */
	DCListItemView.prototype.templates = (function(){
	
	    var warnings = _.extend( {}, FoldoutListItemView.prototype.templates.warnings, {
	        error : BASE_MVC.wrapTemplate([
	            // error during index fetch - show error on dataset
	            '<% if( model.error ){ %>',
	                '<div class="errormessagesmall">',
	                    _l( 'There was an error getting the data for this collection' ), ': <%- model.error %>',
	                '</div>',
	            '<% } %>'
	        ]),
	        purged : BASE_MVC.wrapTemplate([
	            '<% if( model.purged ){ %>',
	                '<div class="purged-msg warningmessagesmall">',
	                    _l( 'This collection has been deleted and removed from disk' ),
	                '</div>',
	            '<% } %>'
	        ]),
	        deleted : BASE_MVC.wrapTemplate([
	            // deleted not purged
	            '<% if( model.deleted && !model.purged ){ %>',
	                '<div class="deleted-msg warningmessagesmall">',
	                    _l( 'This collection has been deleted' ),
	                '</div>',
	            '<% } %>'
	        ])
	    });
	
	    // use element identifier
	    var titleBarTemplate = BASE_MVC.wrapTemplate([
	        '<div class="title-bar clear" tabindex="0">',
	            '<div class="title">',
	                '<span class="name"><%- collection.element_identifier || collection.name %></span>',
	            '</div>',
	            '<div class="subtitle"></div>',
	        '</div>'
	    ], 'collection' );
	
	    return _.extend( {}, FoldoutListItemView.prototype.templates, {
	        warnings : warnings,
	        titleBar : titleBarTemplate
	    });
	}());
	
	
	//==============================================================================
	/** @class Read only view for DatasetCollectionElement.
	 */
	var DCEListItemView = ListItemView.extend(
	/** @lends DCEListItemView.prototype */{
	//TODO: this might be expendable - compacted with HDAListItemView
	
	    /** logger used to record this.log messages, commonly set to console */
	    //logger              : console,
	
	    /** add the DCE class to the list item */
	    className   : ListItemView.prototype.className + " dataset-collection-element",
	
	    /** set up */
	    initialize  : function( attributes ){
	        if( attributes.logger ){ this.logger = this.model.logger = attributes.logger; }
	        this.log( 'DCEListItemView.initialize:', attributes );
	        ListItemView.prototype.initialize.call( this, attributes );
	    },
	
	    // ......................................................................... misc
	    /** String representation */
	    toString : function(){
	        var modelString = ( this.model )?( this.model + '' ):( '(no model)' );
	        return 'DCEListItemView(' + modelString + ')';
	    }
	});
	
	// ............................................................................ TEMPLATES
	/** underscore templates */
	DCEListItemView.prototype.templates = (function(){
	
	    // use the element identifier here - since that will persist and the user will need it
	    var titleBarTemplate = BASE_MVC.wrapTemplate([
	        '<div class="title-bar clear" tabindex="0">',
	            '<div class="title">',
	                '<span class="name"><%- element.element_identifier %></span>',
	            '</div>',
	            '<div class="subtitle"></div>',
	        '</div>'
	    ], 'element' );
	
	    return _.extend( {}, ListItemView.prototype.templates, {
	        titleBar : titleBarTemplate
	    });
	}());
	
	
	//==============================================================================
	/** @class Read only view for a DatasetCollectionElement that is also an DatasetAssociation
	 *      (a dataset contained in a dataset collection).
	 */
	var DatasetDCEListItemView = DATASET_LI.DatasetListItemView.extend(
	/** @lends DatasetDCEListItemView.prototype */{
	
	    className   : DATASET_LI.DatasetListItemView.prototype.className + " dataset-collection-element",
	
	    /** logger used to record this.log messages, commonly set to console */
	    //logger              : console,
	
	    /** set up */
	    initialize  : function( attributes ){
	        if( attributes.logger ){ this.logger = this.model.logger = attributes.logger; }
	        this.log( 'DatasetDCEListItemView.initialize:', attributes );
	        DATASET_LI.DatasetListItemView.prototype.initialize.call( this, attributes );
	    },
	
	    /** In this override, only get details if in the ready state.
	     *  Note: fetch with no 'change' event triggering to prevent automatic rendering.
	     */
	    _fetchModelDetails : function(){
	        var view = this;
	        if( view.model.inReadyState() && !view.model.hasDetails() ){
	            return view.model.fetch({ silent: true });
	        }
	        return jQuery.when();
	    },
	
	    // ......................................................................... misc
	    /** String representation */
	    toString : function(){
	        var modelString = ( this.model )?( this.model + '' ):( '(no model)' );
	        return 'DatasetDCEListItemView(' + modelString + ')';
	    }
	});
	
	// ............................................................................ TEMPLATES
	/** underscore templates */
	DatasetDCEListItemView.prototype.templates = (function(){
	
	    // use the element identifier here and not the dataset name
	    //TODO:?? can we steal the DCE titlebar?
	    var titleBarTemplate = BASE_MVC.wrapTemplate([
	        '<div class="title-bar clear" tabindex="0">',
	            '<span class="state-icon"></span>',
	            '<div class="title">',
	                '<span class="name"><%- element.element_identifier %></span>',
	            '</div>',
	        '</div>'
	    ], 'element' );
	
	    return _.extend( {}, DATASET_LI.DatasetListItemView.prototype.templates, {
	        titleBar : titleBarTemplate
	    });
	}());
	
	
	//==============================================================================
	/** @class Read only view for a DatasetCollectionElement that is also a DatasetCollection
	 *      (a nested DC).
	 */
	var NestedDCDCEListItemView = DCListItemView.extend(
	/** @lends NestedDCDCEListItemView.prototype */{
	
	    className   : DCListItemView.prototype.className + " dataset-collection-element",
	
	    /** logger used to record this.log messages, commonly set to console */
	    // comment this out to suppress log output
	    //logger              : console,
	
	    /** In this override, add the state as a class for use with state-based CSS */
	    _swapNewRender : function( $newRender ){
	        DCListItemView.prototype._swapNewRender.call( this, $newRender );
	//TODO: model currently has no state
	        var state = this.model.get( 'state' ) || 'ok';
	        //if( this.model.has( 'state' ) ){
	        this.$el.addClass( 'state-' + state );
	        //}
	        return this.$el;
	    },
	
	    // ......................................................................... misc
	    /** String representation */
	    toString : function(){
	        var modelString = ( this.model )?( this.model + '' ):( '(no model)' );
	        return 'NestedDCDCEListItemView(' + modelString + ')';
	    }
	});
	
	
	//==============================================================================
	    return {
	        DCListItemView          : DCListItemView,
	        DCEListItemView         : DCEListItemView,
	        DatasetDCEListItemView  : DatasetDCEListItemView,
	        NestedDCDCEListItemView : NestedDCDCEListItemView
	    };
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! underscore */ 1), __webpack_require__(/*! jquery */ 3), __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 87 */
/*!**********************************************************!*\
  !*** ./galaxy/scripts/mvc/collection/collection-view.js ***!
  \**********************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(_) {!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	    __webpack_require__(/*! mvc/list/list-view */ 79),
	    __webpack_require__(/*! mvc/collection/collection-model */ 72),
	    __webpack_require__(/*! mvc/collection/collection-li */ 86),
	    __webpack_require__(/*! mvc/base-mvc */ 5),
	    __webpack_require__(/*! utils/localization */ 7)
	], __WEBPACK_AMD_DEFINE_RESULT__ = function( LIST_VIEW, DC_MODEL, DC_LI, BASE_MVC, _l ){
	
	'use strict';
	
	var logNamespace = 'collections';
	/* =============================================================================
	TODO:
	
	============================================================================= */
	/** @class non-editable, read-only View/Controller for a dataset collection.
	 */
	var _super = LIST_VIEW.ModelListPanel;
	var CollectionView = _super.extend(
	/** @lends CollectionView.prototype */{
	    //MODEL is either a DatasetCollection (or subclass) or a DatasetCollectionElement (list of pairs)
	    _logNamespace : logNamespace,
	
	    className           : _super.prototype.className + ' dataset-collection-panel',
	
	    /** sub view class used for datasets */
	    DatasetDCEViewClass : DC_LI.DatasetDCEListItemView,
	    /** sub view class used for nested collections */
	    NestedDCDCEViewClass: DC_LI.NestedDCDCEListItemView,
	    /** key of attribute in model to assign to this.collection */
	    modelCollectionKey  : 'elements',
	
	    // ......................................................................... SET UP
	    /** Set up the view, set up storage, bind listeners to HistoryContents events
	     *  @param {Object} attributes optional settings for the panel
	     */
	    initialize : function( attributes ){
	        _super.prototype.initialize.call( this, attributes );
	        this.linkTarget = attributes.linkTarget || '_blank';
	
	        this.hasUser = attributes.hasUser;
	        /** A stack of panels that currently cover or hide this panel */
	        this.panelStack = [];
	        /** The text of the link to go back to the panel containing this one */
	        this.parentName = attributes.parentName;
	        /** foldout or drilldown */
	        this.foldoutStyle = attributes.foldoutStyle || 'foldout';
	    },
	
	    // ------------------------------------------------------------------------ sub-views
	    /** In this override, use model.getVisibleContents */
	    _filterCollection : function(){
	//TODO: should *not* be model.getVisibleContents - visibility is not model related
	        return this.model.getVisibleContents();
	    },
	
	    /** override to return proper view class based on element_type */
	    _getItemViewClass : function( model ){
	        //this.debug( this + '._getItemViewClass:', model );
	//TODO: subclasses use DCEViewClass - but are currently unused - decide
	        switch( model.get( 'element_type' ) ){
	            case 'hda':
	                return this.DatasetDCEViewClass;
	            case 'dataset_collection':
	                return this.NestedDCDCEViewClass;
	        }
	        throw new TypeError( 'Unknown element type:', model.get( 'element_type' ) );
	    },
	
	    /** override to add link target and anon */
	    _getItemViewOptions : function( model ){
	        var options = _super.prototype._getItemViewOptions.call( this, model );
	        return _.extend( options, {
	            linkTarget      : this.linkTarget,
	            hasUser         : this.hasUser,
	//TODO: could move to only nested: list:paired
	            foldoutStyle    : this.foldoutStyle
	        });
	    },
	
	    // ------------------------------------------------------------------------ collection sub-views
	    /** In this override, add/remove expanded/collapsed model ids to/from web storage */
	    _setUpItemViewListeners : function( view ){
	        var panel = this;
	        _super.prototype._setUpItemViewListeners.call( panel, view );
	
	        // use pub-sub to: handle drilldown expansion and collapse
	        panel.listenTo( view, {
	            'expanded:drilldown': function( v, drilldown ){
	                this._expandDrilldownPanel( drilldown );
	            },
	            'collapsed:drilldown': function( v, drilldown ){
	                this._collapseDrilldownPanel( drilldown );
	            }
	        });
	        return this;
	    },
	
	    /** Handle drill down by hiding this panels list and controls and showing the sub-panel */
	    _expandDrilldownPanel : function( drilldown ){
	        this.panelStack.push( drilldown );
	        // hide this panel's controls and list, set the name for back navigation, and attach to the $el
	        this.$( '> .controls' ).add( this.$list() ).hide();
	        drilldown.parentName = this.model.get( 'name' );
	        this.$el.append( drilldown.render().$el );
	    },
	
	    /** Handle drilldown close by freeing the panel and re-rendering this panel */
	    _collapseDrilldownPanel : function( drilldown ){
	        this.panelStack.pop();
	        this.render();
	    },
	
	    // ------------------------------------------------------------------------ panel events
	    /** event map */
	    events : {
	        'click .navigation .back'       : 'close'
	    },
	
	    /** close/remove this collection panel */
	    close : function( event ){
	        this.$el.remove();
	        this.trigger( 'close' );
	    },
	
	    // ........................................................................ misc
	    /** string rep */
	    toString    : function(){
	        return 'CollectionView(' + (( this.model )?( this.model.get( 'name' )):( '' )) + ')';
	    }
	});
	
	
	//------------------------------------------------------------------------------ TEMPLATES
	CollectionView.prototype.templates = (function(){
	
	    var controlsTemplate = BASE_MVC.wrapTemplate([
	        '<div class="controls">',
	            '<div class="navigation">',
	                '<a class="back" href="javascript:void(0)">',
	                    '<span class="fa fa-icon fa-angle-left"></span>',
	                    _l( 'Back to ' ), '<%- view.parentName %>',
	                '</a>',
	            '</div>',
	
	            '<div class="title">',
	                '<div class="name"><%- collection.name || collection.element_identifier %></div>',
	                '<div class="subtitle">',
	//TODO: remove logic from template
	                    '<% if( collection.collection_type === "list" ){ %>',
	                        _l( 'a list of datasets' ),
	                    '<% } else if( collection.collection_type === "paired" ){ %>',
	                        _l( 'a pair of datasets' ),
	                    '<% } else if( collection.collection_type === "list:paired" ){ %>',
	                        _l( 'a list of paired datasets' ),
	                    '<% } %>',
	                '</div>',
	            '</div>',
	        '</div>'
	    ], 'collection' );
	
	    return _.extend( _.clone( _super.prototype.templates ), {
	        controls : controlsTemplate
	    });
	}());
	
	
	
	// =============================================================================
	/** @class non-editable, read-only View/Controller for a dataset collection. */
	var ListCollectionView = CollectionView.extend(
	/** @lends ListCollectionView.prototype */{
	
	    //TODO: not strictly needed - due to switch in CollectionView._getContentClass
	    /** sub view class used for datasets */
	    DatasetDCEViewClass : DC_LI.DatasetDCEListItemView,
	
	    // ........................................................................ misc
	    /** string rep */
	    toString    : function(){
	        return 'ListCollectionView(' + (( this.model )?( this.model.get( 'name' )):( '' )) + ')';
	    }
	});
	
	
	// =============================================================================
	/** @class non-editable, read-only View/Controller for a dataset collection. */
	var PairCollectionView = ListCollectionView.extend(
	/** @lends PairCollectionView.prototype */{
	
	    // ........................................................................ misc
	    /** string rep */
	    toString    : function(){
	        return 'PairCollectionView(' + (( this.model )?( this.model.get( 'name' )):( '' )) + ')';
	    }
	});
	
	
	// =============================================================================
	/** @class non-editable, read-only View/Controller for a dataset collection. */
	var ListOfPairsCollectionView = CollectionView.extend(
	/** @lends ListOfPairsCollectionView.prototype */{
	
	    //TODO: not strictly needed - due to switch in CollectionView._getContentClass
	    /** sub view class used for nested collections */
	    NestedDCDCEViewClass : DC_LI.NestedDCDCEListItemView.extend({
	        foldoutPanelClass : PairCollectionView
	    }),
	
	    // ........................................................................ misc
	    /** string rep */
	    toString    : function(){
	        return 'ListOfPairsCollectionView(' + (( this.model )?( this.model.get( 'name' )):( '' )) + ')';
	    }
	});
	
	
	//==============================================================================
	    return {
	        CollectionView              : CollectionView,
	        ListCollectionView          : ListCollectionView,
	        PairCollectionView          : PairCollectionView,
	        ListOfPairsCollectionView   : ListOfPairsCollectionView
	    };
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! underscore */ 1)))

/***/ },
/* 88 */
/*!***************************************************!*\
  !*** ./galaxy/scripts/mvc/history/hda-li-edit.js ***!
  \***************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(jQuery, _) {!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	    __webpack_require__(/*! mvc/dataset/dataset-li-edit */ 89),
	    __webpack_require__(/*! mvc/history/hda-li */ 83),
	    __webpack_require__(/*! mvc/base-mvc */ 5),
	    __webpack_require__(/*! utils/localization */ 7)
	], __WEBPACK_AMD_DEFINE_RESULT__ = function( DATASET_LI_EDIT, HDA_LI, BASE_MVC, _l ){
	
	'use strict';
	
	//==============================================================================
	var _super = DATASET_LI_EDIT.DatasetListItemEdit;
	/** @class Editing view for HistoryDatasetAssociation.
	 */
	var HDAListItemEdit = _super.extend(
	/** @lends HDAListItemEdit.prototype */{
	
	    /** logger used to record this.log messages, commonly set to console */
	    //logger              : console,
	
	    className   : _super.prototype.className + " history-content",
	
	    /** In this override, only get details if in the ready state, get rerunnable if in other states.
	     *  Note: fetch with no 'change' event triggering to prevent automatic rendering.
	     */
	    _fetchModelDetails : function(){
	        var view = this;
	        if( view.model.inReadyState() && !view.model.hasDetails() ){
	            return view.model.fetch({ silent: true });
	
	        // special case the need for the rerunnable and creating_job attributes
	        // needed for rendering re-run button on queued, running datasets
	        } else if( !view.model.has( 'rerunnable' ) ){
	            return view.model.fetch({ silent: true, data: {
	                // only fetch rerunnable and creating_job to keep overhead down
	                keys: [ 'rerunnable', 'creating_job' ].join(',')
	            }});
	        }
	        return jQuery.when();
	    },
	
	    /** event map */
	    events : _.extend( _.clone( _super.prototype.events ), {
	        'click .unhide-link' : function( ev ){ this.model.unhide(); return false; }
	    }),
	
	    /** string rep */
	    toString : function(){
	        var modelString = ( this.model )?( this.model + '' ):( '(no model)' );
	        return 'HDAListItemEdit(' + modelString + ')';
	    }
	});
	
	
	// ............................................................................ TEMPLATES
	/** underscore templates */
	HDAListItemEdit.prototype.templates = (function(){
	//TODO: move to require text! plugin
	
	    var warnings = _.extend( {}, _super.prototype.templates.warnings, {
	        hidden : BASE_MVC.wrapTemplate([
	            '<% if( !dataset.visible ){ %>',
	                // add a link to unhide a dataset
	                '<div class="hidden-msg warningmessagesmall">',
	                    _l( 'This dataset has been hidden' ),
	                    '<br /><a class="unhide-link" a href="javascript:void(0);">', _l( 'Unhide it' ), '</a>',
	                '</div>',
	            '<% } %>'
	        ], 'dataset' )
	    });
	
	    return _.extend( {}, _super.prototype.templates, {
	        //NOTE: *steal* the HDAListItemView titleBar
	        titleBar : HDA_LI.HDAListItemView.prototype.templates.titleBar,
	        warnings : warnings
	    });
	}());
	
	
	//==============================================================================
	    return {
	        HDAListItemEdit  : HDAListItemEdit
	    };
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! jquery */ 3), __webpack_require__(/*! underscore */ 1)))

/***/ },
/* 89 */
/*!*******************************************************!*\
  !*** ./galaxy/scripts/mvc/dataset/dataset-li-edit.js ***!
  \*******************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(_, $) {!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	    __webpack_require__(/*! mvc/dataset/states */ 68),
	    __webpack_require__(/*! mvc/dataset/dataset-li */ 84),
	    __webpack_require__(/*! mvc/tag */ 90),
	    __webpack_require__(/*! mvc/annotation */ 91),
	    __webpack_require__(/*! ui/fa-icon-button */ 78),
	    __webpack_require__(/*! mvc/base-mvc */ 5),
	    __webpack_require__(/*! utils/localization */ 7)
	], __WEBPACK_AMD_DEFINE_RESULT__ = function( STATES, DATASET_LI, TAGS, ANNOTATIONS, faIconButton, BASE_MVC, _l ){
	
	'use strict';
	//==============================================================================
	var _super = DATASET_LI.DatasetListItemView;
	/** @class Editing view for DatasetAssociation.
	 */
	var DatasetListItemEdit = _super.extend(
	/** @lends DatasetListItemEdit.prototype */{
	
	    /** logger used to record this.log messages, commonly set to console */
	    //logger              : console,
	
	    /** set up: options */
	    initialize  : function( attributes ){
	        _super.prototype.initialize.call( this, attributes );
	//TODO: shouldn't this err if false?
	        this.hasUser = attributes.hasUser;
	
	        /** allow user purge of dataset files? */
	        this.purgeAllowed = attributes.purgeAllowed || false;
	
	        //TODO: move to HiddenUntilActivatedViewMixin
	        /** should the tags editor be shown or hidden initially? */
	        this.tagsEditorShown        = attributes.tagsEditorShown || false;
	        /** should the tags editor be shown or hidden initially? */
	        this.annotationEditorShown  = attributes.annotationEditorShown || false;
	    },
	
	    // ......................................................................... titlebar actions
	    /** In this override, add the other two primary actions: edit and delete */
	    _renderPrimaryActions : function(){
	        var actions = _super.prototype._renderPrimaryActions.call( this );
	        if( this.model.get( 'state' ) === STATES.NOT_VIEWABLE ){
	            return actions;
	        }
	        // render the display, edit attr and delete icon-buttons
	        return _super.prototype._renderPrimaryActions.call( this ).concat([
	            this._renderEditButton(),
	            this._renderDeleteButton()
	        ]);
	    },
	
	//TODO: move titleButtons into state renderers, remove state checks in the buttons
	
	    /** Render icon-button to edit the attributes (format, permissions, etc.) this dataset. */
	    _renderEditButton : function(){
	        // don't show edit while uploading, in-accessible
	        // DO show if in error (ala previous history panel)
	        if( ( this.model.get( 'state' ) === STATES.DISCARDED )
	        ||  ( !this.model.get( 'accessible' ) ) ){
	            return null;
	        }
	
	        var purged = this.model.get( 'purged' ),
	            deleted = this.model.get( 'deleted' ),
	            editBtnData = {
	                title       : _l( 'Edit attributes' ),
	                href        : this.model.urls.edit,
	                target      : this.linkTarget,
	                faIcon      : 'fa-pencil',
	                classes     : 'edit-btn'
	            };
	
	        // disable if purged or deleted and explain why in the tooltip
	        if( deleted || purged ){
	            editBtnData.disabled = true;
	            if( purged ){
	                editBtnData.title = _l( 'Cannot edit attributes of datasets removed from disk' );
	            } else if( deleted ){
	                editBtnData.title = _l( 'Undelete dataset to edit attributes' );
	            }
	
	        // disable if still uploading or new
	        } else if( _.contains( [ STATES.UPLOAD, STATES.NEW ], this.model.get( 'state' ) ) ){
	            editBtnData.disabled = true;
	            editBtnData.title = _l( 'This dataset is not yet editable' );
	        }
	        return faIconButton( editBtnData );
	    },
	
	    /** Render icon-button to delete this hda. */
	    _renderDeleteButton : function(){
	        // don't show delete if...
	        if( ( !this.model.get( 'accessible' ) ) ){
	            return null;
	        }
	
	        var self = this,
	            deletedAlready = this.model.isDeletedOrPurged();
	        return faIconButton({
	                title       : !deletedAlready? _l( 'Delete' ) : _l( 'Dataset is already deleted' ),
	                disabled    : deletedAlready,
	                faIcon      : 'fa-times',
	                classes     : 'delete-btn',
	                onclick     : function() {
	                    // ...bler... tooltips being left behind in DOM (hover out never called on deletion)
	                    self.$el.find( '.icon-btn.delete-btn' ).trigger( 'mouseout' );
	                    self.model[ 'delete' ]();
	                }
	        });
	    },
	
	    // ......................................................................... details
	    /** In this override, add tags and annotations controls, make the ? dbkey a link to editing page */
	    _renderDetails : function(){
	        //TODO: generalize to be allow different details for each state
	        var $details = _super.prototype._renderDetails.call( this ),
	            state = this.model.get( 'state' );
	
	        if( !this.model.isDeletedOrPurged() && _.contains([ STATES.OK, STATES.FAILED_METADATA ], state ) ){
	            this._renderTags( $details );
	            this._renderAnnotation( $details );
	            this._makeDbkeyEditLink( $details );
	        }
	
	//TODO: TRIPLE tap, ugh.
	        this._setUpBehaviors( $details );
	        return $details;
	    },
	
	    /** Add less commonly used actions in the details section based on state */
	    _renderSecondaryActions : function(){
	        var actions = _super.prototype._renderSecondaryActions.call( this );
	        switch( this.model.get( 'state' ) ){
	            case STATES.UPLOAD:
	            case STATES.NEW:
	            case STATES.NOT_VIEWABLE:
	                return actions;
	            case STATES.ERROR:
	                // error button comes first
	                actions.unshift( this._renderErrButton() );
	                return actions.concat([ this._renderRerunButton() ]);
	            case STATES.OK:
	            case STATES.FAILED_METADATA:
	                return actions.concat([ this._renderRerunButton(), this._renderVisualizationsButton() ]);
	        }
	        return actions.concat([ this._renderRerunButton() ]);
	    },
	
	    /** Render icon-button to report an error on this dataset to the galaxy admin. */
	    _renderErrButton : function(){
	        return faIconButton({
	            title       : _l( 'View or report this error' ),
	            href        : this.model.urls.report_error,
	            classes     : 'report-error-btn',
	            target      : this.linkTarget,
	            faIcon      : 'fa-bug'
	        });
	    },
	
	    /** Render icon-button to re-run the job that created this dataset. */
	    _renderRerunButton : function(){
	        var creating_job = this.model.get( 'creating_job' );
	        if( this.model.get( 'rerunnable' ) ){
	            return faIconButton({
	                title       : _l( 'Run this job again' ),
	                href        : this.model.urls.rerun,
	                classes     : 'rerun-btn',
	                target      : this.linkTarget,
	                faIcon      : 'fa-refresh',
	                onclick     : function( ev ) {
	                    ev.preventDefault();
	                    // create webpack split point in order to load the tool form async
	                    // TODO: split not working (tool loads fine)
	                    !/* require */(/* empty */function() { var __WEBPACK_AMD_REQUIRE_ARRAY__ = [ __webpack_require__(/*! mvc/tool/tool-form */ 20) ]; (function( ToolForm ){
	                        var form = new ToolForm.View({ 'job_id' : creating_job });
	                        form.deferred.execute( function(){
	                            Galaxy.app.display( form );
	                        });
	                    }.apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__));}());
	                }
	            });
	        }
	    },
	
	    /** Render an icon-button or popupmenu of links based on the applicable visualizations */
	    _renderVisualizationsButton : function(){
	        //TODO: someday - lazyload visualizations
	        var visualizations = this.model.get( 'visualizations' );
	        if( ( this.model.isDeletedOrPurged() )
	        ||  ( !this.hasUser )
	        ||  ( !this.model.hasData() )
	        ||  ( _.isEmpty( visualizations ) ) ){
	            return null;
	        }
	        if( !_.isObject( visualizations[0] ) ){
	            this.warn( 'Visualizations have been switched off' );
	            return null;
	        }
	
	        var $visualizations = $( this.templates.visualizations( visualizations, this ) );
	        //HACK: need to re-write those directed at galaxy_main with linkTarget
	        $visualizations.find( '[target="galaxy_main"]').attr( 'target', this.linkTarget );
	        // use addBack here to include the root $visualizations elem (for the case of 1 visualization)
	        this._addScratchBookFn( $visualizations.find( '.visualization-link' ).addBack( '.visualization-link' ) );
	        return $visualizations;
	    },
	
	    /** add scratchbook functionality to visualization links */
	    _addScratchBookFn : function( $links ){
	        var li = this;
	        $links.click( function( ev ){
	            if( Galaxy.frame && Galaxy.frame.active ){
	                Galaxy.frame.add({
	                    title       : 'Visualization',
	                    url         : $( this ).attr( 'href' )
	                });
	                ev.preventDefault();
	                ev.stopPropagation();
	            }
	        });
	    },
	
	//TODO: if possible move these to readonly view - but display the owner's tags/annotation (no edit)
	    /** Render the tags list/control */
	    _renderTags : function( $where ){
	        if( !this.hasUser ){ return; }
	        var view = this;
	        this.tagsEditor = new TAGS.TagsEditor({
	            model           : this.model,
	            el              : $where.find( '.tags-display' ),
	            onshowFirstTime : function(){ this.render(); },
	            // persist state on the hda view (and not the editor) since these are currently re-created each time
	            onshow          : function(){ view.tagsEditorShown = true; },
	            onhide          : function(){ view.tagsEditorShown = false; },
	            $activator      : faIconButton({
	                title   : _l( 'Edit dataset tags' ),
	                classes : 'tag-btn',
	                faIcon  : 'fa-tags'
	            }).appendTo( $where.find( '.actions .right' ) )
	        });
	        if( this.tagsEditorShown ){ this.tagsEditor.toggle( true ); }
	    },
	
	    /** Render the annotation display/control */
	    _renderAnnotation : function( $where ){
	        if( !this.hasUser ){ return; }
	        var view = this;
	        this.annotationEditor = new ANNOTATIONS.AnnotationEditor({
	            model           : this.model,
	            el              : $where.find( '.annotation-display' ),
	            onshowFirstTime : function(){ this.render(); },
	            // persist state on the hda view (and not the editor) since these are currently re-created each time
	            onshow          : function(){ view.annotationEditorShown = true; },
	            onhide          : function(){ view.annotationEditorShown = false; },
	            $activator      : faIconButton({
	                title   : _l( 'Edit dataset annotation' ),
	                classes : 'annotate-btn',
	                faIcon  : 'fa-comment'
	            }).appendTo( $where.find( '.actions .right' ) )
	        });
	        if( this.annotationEditorShown ){ this.annotationEditor.toggle( true ); }
	    },
	
	    /** If the format/dbkey/genome_build isn't set, make the display a link to the edit page */
	    _makeDbkeyEditLink : function( $details ){
	        // make the dbkey a link to editing
	        if( this.model.get( 'metadata_dbkey' ) === '?'
	        &&  !this.model.isDeletedOrPurged() ){
	            var editableDbkey = $( '<a class="value">?</a>' )
	                .attr( 'href', this.model.urls.edit )
	                .attr( 'target', this.linkTarget );
	            $details.find( '.dbkey .value' ).replaceWith( editableDbkey );
	        }
	    },
	
	    // ......................................................................... events
	    /** event map */
	    events : _.extend( _.clone( _super.prototype.events ), {
	        'click .undelete-link'  : '_clickUndeleteLink',
	        'click .purge-link'     : '_clickPurgeLink',
	
	        'click .edit-btn'       : function( ev ){ this.trigger( 'edit', this, ev ); },
	        'click .delete-btn'     : function( ev ){ this.trigger( 'delete', this, ev ); },
	        'click .rerun-btn'      : function( ev ){ this.trigger( 'rerun', this, ev ); },
	        'click .report-err-btn' : function( ev ){ this.trigger( 'report-err', this, ev ); },
	        'click .visualization-btn' : function( ev ){ this.trigger( 'visualize', this, ev ); },
	        'click .dbkey a'        : function( ev ){ this.trigger( 'edit', this, ev ); }
	    }),
	
	
	    /** listener for item undelete (in the messages section) */
	    _clickUndeleteLink : function( ev ){
	        this.model.undelete();
	        return false;
	    },
	
	    /** listener for item purge (in the messages section) */
	    _clickPurgeLink : function( ev ){
	//TODO: confirm dialog
	        this.model.purge();
	        return false;
	    },
	
	    // ......................................................................... misc
	    /** string rep */
	    toString : function(){
	        var modelString = ( this.model )?( this.model + '' ):( '(no model)' );
	        return 'HDAEditView(' + modelString + ')';
	    }
	});
	
	
	// ............................................................................ TEMPLATES
	/** underscore templates */
	DatasetListItemEdit.prototype.templates = (function(){
	//TODO: move to require text! plugin
	
	    var warnings = _.extend( {}, _super.prototype.templates.warnings, {
	        failed_metadata : BASE_MVC.wrapTemplate([
	            // in this override, provide a link to the edit page
	            '<% if( dataset.state === "failed_metadata" ){ %>',
	                '<div class="failed_metadata-warning warningmessagesmall">',
	                    _l( 'An error occurred setting the metadata for this dataset' ),
	                    '<br /><a href="<%- dataset.urls.edit %>" target="<%- view.linkTarget %>">',
	                        _l( 'Set it manually or retry auto-detection' ),
	                    '</a>',
	                '</div>',
	            '<% } %>'
	        ], 'dataset' ),
	
	        deleted : BASE_MVC.wrapTemplate([
	            // in this override, provide links to undelete or purge the dataset
	            '<% if( dataset.deleted && !dataset.purged ){ %>',
	                // deleted not purged
	                '<div class="deleted-msg warningmessagesmall">',
	                    _l( 'This dataset has been deleted' ),
	                    '<br /><a class="undelete-link" href="javascript:void(0);">', _l( 'Undelete it' ), '</a>',
	                    '<% if( view.purgeAllowed ){ %>',
	                        '<br /><a class="purge-link" href="javascript:void(0);">',
	                            _l( 'Permanently remove it from disk' ),
	                        '</a>',
	                    '<% } %>',
	                '</div>',
	            '<% } %>'
	        ], 'dataset' )
	    });
	
	    var visualizationsTemplate = BASE_MVC.wrapTemplate([
	        '<% if( visualizations.length === 1 ){ %>',
	            '<a class="visualization-btn visualization-link icon-btn" href="<%- visualizations[0].href %>"',
	                    ' target="<%- visualizations[0].target %>" title="', _l( 'Visualize in' ),
	                    ' <%- visualizations[0].html %>">',
	                '<span class="fa fa-bar-chart-o"></span>',
	            '</a>',
	
	        '<% } else { %>',
	            '<div class="visualizations-dropdown dropdown">',
	                '<a class="visualization-btn icon-btn" data-toggle="dropdown" title="', _l( 'Visualize' ), '">',
	                    '<span class="fa fa-bar-chart-o"></span>',
	                '</a>',
	                '<ul class="dropdown-menu" role="menu">',
	                    '<% _.each( visualizations, function( visualization ){ %>',
	                        '<li><a class="visualization-link" href="<%- visualization.href %>"',
	                                ' target="<%- visualization.target %>">',
	                            '<%- visualization.html %>',
	                        '</a></li>',
	                    '<% }); %>',
	                '</ul>',
	            '</div>',
	        '<% } %>'
	    ], 'visualizations' );
	
	    return _.extend( {}, _super.prototype.templates, {
	        warnings : warnings,
	        visualizations : visualizationsTemplate
	    });
	}());
	
	
	//==============================================================================
	    return {
	        DatasetListItemEdit : DatasetListItemEdit
	    };
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! underscore */ 1), __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 90 */
/*!***********************************!*\
  !*** ./galaxy/scripts/mvc/tag.js ***!
  \***********************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone, _) {!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	    __webpack_require__(/*! mvc/base-mvc */ 5),
	    __webpack_require__(/*! utils/localization */ 7)
	], __WEBPACK_AMD_DEFINE_RESULT__ = function( baseMVC, _l ){
	// =============================================================================
	/** A view on any model that has a 'tags' attribute (a list of tag strings)
	 *      Incorporates the select2 jQuery plugin for tags display/editing:
	 *      http://ivaynberg.github.io/select2/
	 */
	var TagsEditor = Backbone.View
	        .extend( baseMVC.LoggableMixin )
	        .extend( baseMVC.HiddenUntilActivatedViewMixin ).extend({
	
	    tagName     : 'div',
	    className   : 'tags-display',
	
	    /** Set up listeners, parse options */
	    initialize : function( options ){
	        //console.debug( this, options );
	        // only listen to the model only for changes to tags - re-render
	        this.listenTo( this.model, 'change:tags', function(){
	            this.render();
	        });
	        this.hiddenUntilActivated( options.$activator, options );
	    },
	
	    /** Build the DOM elements, call select to on the created input, and set up behaviors */
	    render : function(){
	        var view = this;
	        this.$el.html( this._template() );
	
	        this.$input().select2({
	            placeholder : 'Add tags',
	            width       : '100%',
	            tags : function(){
	                // initialize possible tags in the dropdown based on all the tags the user has used so far
	                return view._getTagsUsed();
	            }
	        });
	
	        this._setUpBehaviors();
	        return this;
	    },
	
	    /** @returns {String} the html text used to build the view's DOM */
	    _template : function(){
	        return [
	            //TODO: make prompt optional
	            '<label class="prompt">', _l( 'Tags' ), '</label>',
	            // set up initial tags by adding as CSV to input vals (necc. to init select2)
	            '<input class="tags-input" value="', this.tagsToCSV(), '" />'
	        ].join( '' );
	    },
	
	    /** @returns {String} the sorted, comma-separated tags from the model */
	    tagsToCSV : function(){
	        var tagsArray = this.model.get( 'tags' );
	        if( !_.isArray( tagsArray ) || _.isEmpty( tagsArray ) ){
	            return '';
	        }
	        return tagsArray.map( function( tag ){
	            return _.escape( tag );
	        }).sort().join( ',' );
	    },
	
	    /** @returns {jQuery} the input for this view */
	    $input : function(){
	        return this.$el.find( 'input.tags-input' );
	    },
	
	    /** @returns {String[]} all tags used by the current user */
	    _getTagsUsed : function(){
	//TODO: global
	        return Galaxy.user.get( 'tags_used' );
	    },
	
	    /** set up any event listeners on the view's DOM (mostly handled by select2) */
	    _setUpBehaviors : function(){
	        var view = this;
	        this.$input().on( 'change', function( event ){
	            // save the model's tags in either remove or added event
	            view.model.save({ tags: event.val }, { silent: true });
	            // if it's new, add the tag to the users tags
	            if( event.added ){
	                //??: solve weird behavior in FF on test.galaxyproject.org where
	                //  event.added.text is string object: 'String{ 0="o", 1="n", 2="e" }'
	                view._addNewTagToTagsUsed( event.added.text + '' );
	            }
	        });
	    },
	
	    /** add a new tag (if not already there) to the list of all tags used by the user
	     *  @param {String} newTag  the tag to add to the list of used
	     */
	    _addNewTagToTagsUsed : function( newTag ){
	//TODO: global
	        var tagsUsed = Galaxy.user.get( 'tags_used' );
	        if( !_.contains( tagsUsed, newTag ) ){
	            tagsUsed.push( newTag );
	            tagsUsed.sort();
	            Galaxy.user.set( 'tags_used', tagsUsed );
	        }
	    },
	
	    /** shut down event listeners and remove this view's DOM */
	    remove : function(){
	        this.$input.off();
	        this.stopListening( this.model );
	        Backbone.View.prototype.remove.call( this );
	    },
	
	    /** string rep */
	    toString : function(){ return [ 'TagsEditor(', this.model + '', ')' ].join(''); }
	});
	
	// =============================================================================
	return {
	    TagsEditor : TagsEditor
	};
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! underscore */ 1)))

/***/ },
/* 91 */
/*!******************************************!*\
  !*** ./galaxy/scripts/mvc/annotation.js ***!
  \******************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone, _) {!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	    __webpack_require__(/*! mvc/base-mvc */ 5),
	    __webpack_require__(/*! utils/localization */ 7),
	    __webpack_require__(/*! ui/editable-text */ 92),
	], __WEBPACK_AMD_DEFINE_RESULT__ = function( baseMVC, _l ){
	// =============================================================================
	/** A view on any model that has a 'annotation' attribute
	 */
	var AnnotationEditor = Backbone.View
	        .extend( baseMVC.LoggableMixin )
	        .extend( baseMVC.HiddenUntilActivatedViewMixin ).extend({
	
	    tagName     : 'div',
	    className   : 'annotation-display',
	
	    /** Set up listeners, parse options */
	    initialize : function( options ){
	        options = options || {};
	        this.tooltipConfig = options.tooltipConfig || { placement: 'bottom' };
	        //console.debug( this, options );
	        // only listen to the model only for changes to annotations
	        this.listenTo( this.model, 'change:annotation', function(){
	            this.render();
	        });
	        this.hiddenUntilActivated( options.$activator, options );
	    },
	
	    /** Build the DOM elements, call select to on the created input, and set up behaviors */
	    render : function(){
	        var view = this;
	        this.$el.html( this._template() );
	        this.$el.find( "[title]" ).tooltip( this.tooltipConfig );
	
	        //TODO: handle empties better
	        this.$annotation().make_text_editable({
	            use_textarea: true,
	            on_finish: function( newAnnotation ){
	                view.$annotation().text( newAnnotation );
	                view.model.save({ annotation: newAnnotation }, { silent: true })
	                    .fail( function(){
	                        view.$annotation().text( view.model.previous( 'annotation' ) );
	                    });
	            }
	        });
	        return this;
	    },
	
	    /** @returns {String} the html text used to build the view's DOM */
	    _template : function(){
	        var annotation = this.model.get( 'annotation' );
	        //if( !annotation ){
	        //    //annotation = [ '<em class="annotation-empty">', _l( 'Click to add an annotation' ), '</em>' ].join( '' );
	        //    annotation = [ '<em class="annotation-empty"></em>' ].join( '' );
	        //}
	        return [
	            //TODO: make prompt optional
	            '<label class="prompt">', _l( 'Annotation' ), '</label>',
	            // set up initial tags by adding as CSV to input vals (necc. to init select2)
	            '<div class="annotation" title="', _l( 'Edit annotation' ), '">',
	                _.escape( annotation ),
	            '</div>'
	        ].join( '' );
	    },
	
	    /** @returns {jQuery} the main element for this view */
	    $annotation : function(){
	        return this.$el.find( '.annotation' );
	    },
	
	    /** shut down event listeners and remove this view's DOM */
	    remove : function(){
	        this.$annotation.off();
	        this.stopListening( this.model );
	        Backbone.View.prototype.remove.call( this );
	    },
	
	    /** string rep */
	    toString : function(){ return [ 'AnnotationEditor(', this.model + '', ')' ].join(''); }
	});
	// =============================================================================
	return {
	    AnnotationEditor : AnnotationEditor
	};
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! underscore */ 1)))

/***/ },
/* 92 */
/*!********************************************!*\
  !*** ./galaxy/scripts/ui/editable-text.js ***!
  \********************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;// from: https://raw.githubusercontent.com/umdjs/umd/master/jqueryPlugin.js
	// Uses AMD or browser globals to create a jQuery plugin.
	(function (factory) {
	    if (true) {
	        //TODO: So...this turns out to be an all or nothing thing. If I load jQuery in the define below, it will
	        //  (of course) wipe the old jquery *and all the plugins loaded into it*. So the define below *is still
	        //  relying on jquery being loaded globally* in order to preserve plugins.
	        !(__WEBPACK_AMD_DEFINE_ARRAY__ = [ __webpack_require__(/*! jquery */ 3) ], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory), __WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ? (__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	    } else {
	        // Browser globals
	        factory(jQuery);
	    }
	
	}(function ( jQuery ) {
	'use_strict';
	
	var $ = jQuery;
	
	// ============================================================================
	/**
	 * Make an element with text editable: (a) when user clicks on text, a textbox/area
	 * is provided for editing; (b) when enter key pressed, element's text is set and on_finish
	 * is called.
	 */
	$.fn.make_text_editable = function(config_dict) {
	    // Get config options.
	    var num_cols = ("num_cols" in config_dict ? config_dict.num_cols : 30),
	        num_rows = ("num_rows" in config_dict ? config_dict.num_rows : 4),
	        use_textarea = ("use_textarea" in config_dict ? config_dict.use_textarea : false),
	        on_finish = ("on_finish" in config_dict ? config_dict.on_finish : null),
	        help_text = ("help_text" in config_dict ? config_dict.help_text : null);
	
	    // Add element behavior.
	    var container = $(this);
	    container.addClass("editable-text").click(function(e) {
	        // If there's already an input element, editing is active, so do nothing.
	        if ($(this).children(":input").length > 0) {
	            return;
	        }
	
	        container.removeClass("editable-text");
	
	        // Handler for setting element text.
	        var set_text = function(new_text) {
	            container.find(":input").remove();
	
	            if (new_text !== "") {
	                container.text(new_text);
	            } else {
	                // No text; need a line so that there is a click target.
	                container.html("<br>");
	            }
	            container.addClass("editable-text");
	
	            if (on_finish) {
	                on_finish(new_text);
	            }
	        };
	
	        // Create input element(s) for editing.
	        var cur_text = ("cur_text" in config_dict ? config_dict.cur_text : container.text() ),
	            input_elt, button_elt;
	
	        if (use_textarea) {
	            input_elt = $("<textarea/>")
	                .attr({ rows: num_rows, cols: num_cols }).text($.trim(cur_text))
	                .keyup(function(e) {
	                    if (e.keyCode === 27) {
	                        // Escape key.
	                        set_text(cur_text);
	                    }
	                });
	            button_elt = $("<button/>").text("Done").click(function() {
	                set_text(input_elt.val());
	                // Return false so that click does not propogate to container.
	                return false;
	            });
	        }
	        else {
	            input_elt = $("<input type='text'/>").attr({ value: $.trim(cur_text), size: num_cols })
	            .blur(function() {
	                set_text(cur_text);
	            }).keyup(function(e) {
	                if (e.keyCode === 27) {
	                    // Escape key.
	                    $(this).trigger("blur");
	                } else if (e.keyCode === 13) {
	                    // Enter key.
	                    set_text($(this).val());
	                }
	
	                // Do not propogate event to avoid unwanted side effects.
	                e.stopPropagation();
	            });
	        }
	
	        // Replace text with input object(s) and focus & select.
	        container.text("");
	        container.append(input_elt);
	        if (button_elt) {
	            container.append(button_elt);
	        }
	        input_elt.focus();
	        input_elt.select();
	
	        // Do not propogate to elements below b/c that blurs input and prevents it from being used.
	        e.stopPropagation();
	    });
	
	    // Add help text if there some.
	    if (help_text) {
	        container.attr("title", help_text).tooltip();
	    }
	
	    return container;
	};
	
	// ============================================================================
	}));


/***/ },
/* 93 */
/*!****************************************************!*\
  !*** ./galaxy/scripts/mvc/history/hdca-li-edit.js ***!
  \****************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	    __webpack_require__(/*! mvc/history/hdca-li */ 85),
	    __webpack_require__(/*! mvc/collection/collection-view-edit */ 94),
	    __webpack_require__(/*! ui/fa-icon-button */ 78),
	    __webpack_require__(/*! utils/localization */ 7)
	], __WEBPACK_AMD_DEFINE_RESULT__ = function( HDCA_LI, DC_VIEW_EDIT, faIconButton, _l ){
	
	'use strict';
	
	//==============================================================================
	var _super = HDCA_LI.HDCAListItemView;
	/** @class Editing view for HistoryDatasetCollectionAssociation.
	 */
	var HDCAListItemEdit = _super.extend(
	/** @lends HDCAListItemEdit.prototype */{
	
	    /** logger used to record this.log messages, commonly set to console */
	    //logger              : console,
	
	    /** Override to return editable versions of the collection panels */
	    _getFoldoutPanelClass : function(){
	        switch( this.model.get( 'collection_type' ) ){
	            case 'list':
	                return DC_VIEW_EDIT.ListCollectionViewEdit;
	            case 'paired':
	                return DC_VIEW_EDIT.PairCollectionViewEdit;
	            case 'list:paired':
	                return DC_VIEW_EDIT.ListOfPairsCollectionViewEdit;
	        }
	        throw new TypeError( 'Uknown collection_type: ' + this.model.get( 'collection_type' ) );
	    },
	
	    // ......................................................................... delete
	    /** In this override, add the delete button. */
	    _renderPrimaryActions : function(){
	        this.log( this + '._renderPrimaryActions' );
	        // render the display, edit attr and delete icon-buttons
	        return _super.prototype._renderPrimaryActions.call( this )
	            .concat([
	                this._renderDeleteButton()
	            ]);
	    },
	
	    /** Render icon-button to delete this collection. */
	    _renderDeleteButton : function(){
	        var self = this,
	            deleted = this.model.get( 'deleted' );
	        return faIconButton({
	            title       : deleted? _l( 'Dataset collection is already deleted' ): _l( 'Delete' ),
	            classes     : 'delete-btn',
	            faIcon      : 'fa-times',
	            disabled    : deleted,
	            onclick     : function() {
	                // ...bler... tooltips being left behind in DOM (hover out never called on deletion)
	                self.$el.find( '.icon-btn.delete-btn' ).trigger( 'mouseout' );
	                self.model[ 'delete' ]();
	            }
	        });
	    },
	
	    // ......................................................................... misc
	    /** string rep */
	    toString : function(){
	        var modelString = ( this.model )?( this.model + '' ):( '(no model)' );
	        return 'HDCAListItemEdit(' + modelString + ')';
	    }
	});
	
	//==============================================================================
	    return {
	        HDCAListItemEdit : HDCAListItemEdit
	    };
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ },
/* 94 */
/*!***************************************************************!*\
  !*** ./galaxy/scripts/mvc/collection/collection-view-edit.js ***!
  \***************************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	    __webpack_require__(/*! mvc/collection/collection-view */ 87),
	    __webpack_require__(/*! mvc/collection/collection-model */ 72),
	    __webpack_require__(/*! mvc/collection/collection-li-edit */ 95),
	    __webpack_require__(/*! mvc/base-mvc */ 5),
	    __webpack_require__(/*! utils/localization */ 7),
	    __webpack_require__(/*! ui/editable-text */ 92),
	], __WEBPACK_AMD_DEFINE_RESULT__ = function( DC_VIEW, DC_MODEL, DC_EDIT, BASE_MVC, _l ){
	
	'use strict';
	/* =============================================================================
	TODO:
	
	============================================================================= */
	/** @class editable View/Controller for a dataset collection.
	 */
	var _super = DC_VIEW.CollectionView;
	var CollectionViewEdit = _super.extend(
	/** @lends CollectionView.prototype */{
	    //MODEL is either a DatasetCollection (or subclass) or a DatasetCollectionElement (list of pairs)
	
	    /** logger used to record this.log messages, commonly set to console */
	    //logger              : console,
	
	    /** sub view class used for datasets */
	    DatasetDCEViewClass : DC_EDIT.DatasetDCEListItemEdit,
	    /** sub view class used for nested collections */
	    NestedDCDCEViewClass: DC_EDIT.NestedDCDCEListItemEdit,
	
	    // ......................................................................... SET UP
	    /** Set up the view, set up storage, bind listeners to HistoryContents events
	     *  @param {Object} attributes optional settings for the panel
	     */
	    initialize : function( attributes ){
	        _super.prototype.initialize.call( this, attributes );
	    },
	
	    /** In this override, make the collection name editable
	     */
	    _setUpBehaviors : function( $where ){
	        $where = $where || this.$el;
	        _super.prototype._setUpBehaviors.call( this, $where );
	        if( !this.model ){ return; }
	
	        // anon users shouldn't have access to any of the following
	        if( !Galaxy.user || Galaxy.user.isAnonymous() ){
	            return;
	        }
	
	        //TODO: extract
	        var panel = this,
	            nameSelector = '> .controls .name';
	        $where.find( nameSelector )
	            .attr( 'title', _l( 'Click to rename collection' ) )
	            .tooltip({ placement: 'bottom' })
	            .make_text_editable({
	                on_finish: function( newName ){
	                    var previousName = panel.model.get( 'name' );
	                    if( newName && newName !== previousName ){
	                        panel.$el.find( nameSelector ).text( newName );
	                        panel.model.save({ name: newName })
	                            .fail( function(){
	                                panel.$el.find( nameSelector ).text( panel.model.previous( 'name' ) );
	                            });
	                    } else {
	                        panel.$el.find( nameSelector ).text( previousName );
	                    }
	                }
	            });
	    },
	
	    // ........................................................................ misc
	    /** string rep */
	    toString    : function(){
	        return 'CollectionViewEdit(' + (( this.model )?( this.model.get( 'name' )):( '' )) + ')';
	    }
	});
	
	
	// =============================================================================
	/** @class non-editable, read-only View/Controller for a dataset collection. */
	var ListCollectionViewEdit = CollectionViewEdit.extend(
	/** @lends ListCollectionView.prototype */{
	
	    //TODO: not strictly needed - due to switch in CollectionView._getContentClass
	    /** sub view class used for datasets */
	    DatasetDCEViewClass : DC_EDIT.DatasetDCEListItemEdit,
	
	    // ........................................................................ misc
	    /** string rep */
	    toString    : function(){
	        return 'ListCollectionViewEdit(' + (( this.model )?( this.model.get( 'name' )):( '' )) + ')';
	    }
	});
	
	
	// =============================================================================
	/** @class Editable, read-only View/Controller for a dataset collection. */
	var PairCollectionViewEdit = ListCollectionViewEdit.extend(
	/** @lends PairCollectionViewEdit.prototype */{
	
	    // ........................................................................ misc
	    /** string rep */
	    toString    : function(){
	        return 'PairCollectionViewEdit(' + (( this.model )?( this.model.get( 'name' )):( '' )) + ')';
	    }
	});
	
	
	// =============================================================================
	/** @class Editable (roughly since these collections are immutable),
	 *  View/Controller for a dataset collection.
	 */
	var NestedPairCollectionViewEdit = PairCollectionViewEdit.extend(
	/** @lends NestedPairCollectionViewEdit.prototype */{
	
	    /** Override to remove the editable text from the name/identifier - these collections are considered immutable */
	    _setUpBehaviors : function( $where ){
	        _super.prototype._setUpBehaviors.call( this, $where );
	    },
	
	    // ........................................................................ misc
	    /** string rep */
	    toString    : function(){
	        return 'NestedPairCollectionViewEdit(' + (( this.model )?( this.model.get( 'name' )):( '' )) + ')';
	    }
	});
	
	
	// =============================================================================
	/** @class non-editable, read-only View/Controller for a dataset collection. */
	var ListOfPairsCollectionViewEdit = CollectionViewEdit.extend(
	/** @lends ListOfPairsCollectionView.prototype */{
	
	    //TODO: not strictly needed - due to switch in CollectionView._getContentClass
	    /** sub view class used for nested collections */
	    NestedDCDCEViewClass : DC_EDIT.NestedDCDCEListItemEdit.extend({
	        foldoutPanelClass : NestedPairCollectionViewEdit
	    }),
	
	    // ........................................................................ misc
	    /** string rep */
	    toString    : function(){
	        return 'ListOfPairsCollectionViewEdit(' + (( this.model )?( this.model.get( 'name' )):( '' )) + ')';
	    }
	});
	
	
	//==============================================================================
	    return {
	        CollectionViewEdit              : CollectionViewEdit,
	        ListCollectionViewEdit          : ListCollectionViewEdit,
	        PairCollectionViewEdit          : PairCollectionViewEdit,
	        ListOfPairsCollectionViewEdit   : ListOfPairsCollectionViewEdit
	    };
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ },
/* 95 */
/*!*************************************************************!*\
  !*** ./galaxy/scripts/mvc/collection/collection-li-edit.js ***!
  \*************************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(jQuery, _) {!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	    __webpack_require__(/*! mvc/collection/collection-li */ 86),
	    __webpack_require__(/*! mvc/dataset/dataset-li-edit */ 89),
	    __webpack_require__(/*! mvc/base-mvc */ 5),
	    __webpack_require__(/*! utils/localization */ 7)
	], __WEBPACK_AMD_DEFINE_RESULT__ = function( DC_LI, DATASET_LI_EDIT, BASE_MVC, _l ){
	
	'use strict';
	//==============================================================================
	var DCListItemView = DC_LI.DCListItemView;
	/** @class Edit view for DatasetCollection.
	 */
	var DCListItemEdit = DCListItemView.extend(
	/** @lends DCListItemEdit.prototype */{
	//TODO: may not be needed
	
	    /** logger used to record this.log messages, commonly set to console */
	    //logger              : console,
	
	    /** override to add linkTarget */
	    initialize : function( attributes ){
	        DCListItemView.prototype.initialize.call( this, attributes );
	    },
	
	    // ......................................................................... misc
	    /** String representation */
	    toString : function(){
	        var modelString = ( this.model )?( this.model + '' ):( '(no model)' );
	        return 'DCListItemEdit(' + modelString + ')';
	    }
	});
	
	
	//==============================================================================
	var DCEListItemView = DC_LI.DCEListItemView;
	/** @class Read only view for DatasetCollectionElement.
	 */
	var DCEListItemEdit = DCEListItemView.extend(
	/** @lends DCEListItemEdit.prototype */{
	//TODO: this might be expendable - compacted with HDAListItemView
	
	    /** logger used to record this.log messages, commonly set to console */
	    //logger              : console,
	
	    /** set up */
	    initialize  : function( attributes ){
	        DCEListItemView.prototype.initialize.call( this, attributes );
	    },
	
	    // ......................................................................... misc
	    /** String representation */
	    toString : function(){
	        var modelString = ( this.model )?( this.model + '' ):( '(no model)' );
	        return 'DCEListItemEdit(' + modelString + ')';
	    }
	});
	
	
	//==============================================================================
	// NOTE: this does not inherit from DatasetDCEListItemView as you would expect
	//TODO: but should - if we can find something simpler than using diamond
	/** @class Editable view for a DatasetCollectionElement that is also an DatasetAssociation
	 *      (a dataset contained in a dataset collection).
	 */
	var DatasetDCEListItemEdit = DATASET_LI_EDIT.DatasetListItemEdit.extend(
	/** @lends DatasetDCEListItemEdit.prototype */{
	
	    /** logger used to record this.log messages, commonly set to console */
	    //logger              : console,
	
	    /** set up */
	    initialize  : function( attributes ){
	        DATASET_LI_EDIT.DatasetListItemEdit.prototype.initialize.call( this, attributes );
	    },
	
	    // NOTE: this does not inherit from DatasetDCEListItemView - so we duplicate this here
	    //TODO: fix
	    /** In this override, only get details if in the ready state.
	     *  Note: fetch with no 'change' event triggering to prevent automatic rendering.
	     */
	    _fetchModelDetails : function(){
	        var view = this;
	        if( view.model.inReadyState() && !view.model.hasDetails() ){
	            return view.model.fetch({ silent: true });
	        }
	        return jQuery.when();
	    },
	
	    /** Override to remove delete button */
	    _renderDeleteButton : function(){
	        return null;
	    },
	
	    // ......................................................................... misc
	    /** String representation */
	    toString : function(){
	        var modelString = ( this.model )?( this.model + '' ):( '(no model)' );
	        return 'DatasetDCEListItemEdit(' + modelString + ')';
	    }
	});
	
	// ............................................................................ TEMPLATES
	/** underscore templates */
	DatasetDCEListItemEdit.prototype.templates = (function(){
	
	    return _.extend( {}, DATASET_LI_EDIT.DatasetListItemEdit.prototype.templates, {
	        titleBar : DC_LI.DatasetDCEListItemView.prototype.templates.titleBar
	    });
	}());
	
	
	//==============================================================================
	/** @class Read only view for a DatasetCollectionElement that is also a DatasetCollection
	 *      (a nested DC).
	 */
	var NestedDCDCEListItemEdit = DC_LI.NestedDCDCEListItemView.extend(
	/** @lends NestedDCDCEListItemEdit.prototype */{
	
	    /** logger used to record this.log messages, commonly set to console */
	    // comment this out to suppress log output
	    //logger              : console,
	
	    // ......................................................................... misc
	    /** String representation */
	    toString : function(){
	        var modelString = ( this.model )?( this.model + '' ):( '(no model)' );
	        return 'NestedDCDCEListItemEdit(' + modelString + ')';
	    }
	});
	
	
	//==============================================================================
	    return {
	        DCListItemEdit          : DCListItemEdit,
	        DCEListItemEdit         : DCEListItemEdit,
	        DatasetDCEListItemEdit  : DatasetDCEListItemEdit,
	        NestedDCDCEListItemEdit : NestedDCDCEListItemEdit
	    };
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! jquery */ 3), __webpack_require__(/*! underscore */ 1)))

/***/ },
/* 96 */
/*!******************************************************************!*\
  !*** ./galaxy/scripts/mvc/collection/pair-collection-creator.js ***!
  \******************************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone, _, jQuery) {!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	    __webpack_require__(/*! mvc/collection/list-collection-creator */ 74),
	    __webpack_require__(/*! mvc/history/hdca-model */ 71),
	    __webpack_require__(/*! mvc/base-mvc */ 5),
	    __webpack_require__(/*! utils/localization */ 7)
	], __WEBPACK_AMD_DEFINE_RESULT__ = function( LIST_CREATOR, HDCA, BASE_MVC, _l ){
	
	'use strict';
	
	var logNamespace = 'collections';
	/*==============================================================================
	TODO:
	    the paired creator doesn't really mesh with the list creator as parent
	        it may be better to make an abstract super class for both
	    composites may inherit from this (or vis-versa)
	    PairedDatasetCollectionElementView doesn't make a lot of sense
	
	==============================================================================*/
	/**  */
	var PairedDatasetCollectionElementView = Backbone.View.extend( BASE_MVC.LoggableMixin ).extend({
	    _logNamespace : logNamespace,
	
	//TODO: use proper class (DatasetDCE or NestedDCDCE (or the union of both))
	    tagName     : 'li',
	    className   : 'collection-element',
	
	    initialize : function( attributes ){
	        this.element = attributes.element || {};
	        this.identifier = attributes.identifier;
	    },
	
	    render : function(){
	        this.$el
	            .attr( 'data-element-id', this.element.id )
	            .html( this.template({ identifier: this.identifier, element: this.element }) );
	        return this;
	    },
	
	    //TODO: lots of unused space in the element - possibly load details and display them horiz.
	    template : _.template([
	        '<span class="identifier"><%- identifier %></span>',
	        '<span class="name"><%- element.name %></span>',
	    ].join('')),
	
	    /** remove the DOM and any listeners */
	    destroy : function(){
	        this.off();
	        this.$el.remove();
	    },
	
	    /** string rep */
	    toString : function(){
	        return 'DatasetCollectionElementView()';
	    }
	});
	
	
	// ============================================================================
	var _super = LIST_CREATOR.ListCollectionCreator;
	
	/** An interface for building collections.
	 */
	var PairCollectionCreator = _super.extend({
	
	    /** the class used to display individual elements */
	    elementViewClass : PairedDatasetCollectionElementView,
	    /** the class this creator will create and save */
	    collectionClass : HDCA.HistoryPairDatasetCollection,
	    className : 'pair-collection-creator collection-creator flex-row-container',
	
	    /** override to no-op */
	    _mangleDuplicateNames : function(){},
	
	    // TODO: this whole pattern sucks. There needs to be two classes of problem area:
	    //      bad inital choices and
	    //      when the user has painted his/her self into a corner during creation/use-of-the-creator
	    /** render the entire interface */
	    render : function( speed, callback ){
	        if( this.workingElements.length === 2 ){
	            return _super.prototype.render.call( this, speed, callback );
	        }
	        return this._renderInvalid( speed, callback );
	    },
	
	    // ------------------------------------------------------------------------ rendering elements
	    /** render forward/reverse */
	    _renderList : function( speed, callback ){
	        //this.debug( '-- _renderList' );
	        //precondition: there are two valid elements in workingElements
	        var creator = this,
	            $tmp = jQuery( '<div/>' ),
	            $list = creator.$list();
	
	        // lose the original views, create the new, append all at once, then call their renders
	        _.each( this.elementViews, function( view ){
	            view.destroy();
	            creator.removeElementView( view );
	        });
	        $tmp.append( creator._createForwardElementView().$el );
	        $tmp.append( creator._createReverseElementView().$el );
	        $list.empty().append( $tmp.children() );
	        _.invoke( creator.elementViews, 'render' );
	    },
	
	    /** create the forward element view */
	    _createForwardElementView : function(){
	        return this._createElementView( this.workingElements[0], { identifier: 'forward' } );
	    },
	
	    /** create the forward element view */
	    _createReverseElementView : function(){
	        return this._createElementView( this.workingElements[1], { identifier: 'reverse' } );
	    },
	
	    /** create an element view, cache in elementViews, and return */
	    _createElementView : function( element, options ){
	        var elementView = new this.elementViewClass( _.extend( options, {
	            element : element,
	        }));
	        this.elementViews.push( elementView );
	        return elementView;
	    },
	
	    /** swap the forward, reverse elements and re-render */
	    swap : function(){
	        this.workingElements = [
	            this.workingElements[1],
	            this.workingElements[0],
	        ];
	        this._renderList();
	    },
	
	    events : _.extend( _.clone( _super.prototype.events ), {
	        'click .swap' : 'swap',
	    }),
	
	    // ------------------------------------------------------------------------ templates
	    //TODO: move to require text plugin and load these as text
	    //TODO: underscore currently unnecc. bc no vars are used
	    //TODO: better way of localizing text-nodes in long strings
	    /** underscore template fns attached to class */
	    templates : _.extend( _.clone( _super.prototype.templates ), {
	        /** the middle: element list */
	        middle : _.template([
	            '<div class="collection-elements-controls">',
	                '<a class="swap" href="javascript:void(0);" title="', _l( 'Swap forward and reverse datasets' ), '">',
	                    _l( 'Swap' ),
	                '</a>',
	            '</div>',
	            '<div class="collection-elements scroll-container flex-row">',
	            '</div>'
	        ].join('')),
	
	        /** help content */
	        helpContent : _.template([
	            '<p>', _l([
	                'Pair collections are permanent collections containing two datasets: one forward and one reverse. ',
	                'Often these are forward and reverse reads. The pair collections can be passed to tools and ',
	                'workflows in order to have analyses done on both datasets. This interface allows ',
	                'you to create a pair, name it, and swap which is forward and which reverse.'
	            ].join( '' )), '</p>',
	            '<ul>',
	                '<li>', _l([
	                    'Click the <i data-target=".swap">"Swap"</i> link to make your forward dataset the reverse ',
	                    'and the reverse dataset forward.'
	                ].join( '' )), '</li>',
	                '<li>', _l([
	                    'Click the <i data-target=".cancel-create">"Cancel"</i> button to exit the interface.'
	                ].join( '' )), '</li>',
	            '</ul><br />',
	            '<p>', _l([
	                'Once your collection is complete, enter a <i data-target=".collection-name">name</i> and ',
	                'click <i data-target=".create-collection">"Create list"</i>.'
	            ].join( '' )), '</p>'
	        ].join('')),
	
	        /** a simplified page communicating what went wrong and why the user needs to reselect something else */
	        invalidInitial : _.template([
	            '<div class="header flex-row no-flex">',
	                '<div class="alert alert-warning" style="display: block">',
	                    '<span class="alert-message">',
	                        '<% if( _.size( problems ) ){ %>',
	                            _l( 'The following selections could not be included due to problems' ),
	                            '<ul><% _.each( problems, function( problem ){ %>',
	                                '<li><b><%- problem.element.name %></b>: <%- problem.text %></li>',
	                            '<% }); %></ul>',
	                        '<% } else if( _.size( elements ) === 0 ){ %>',
	                            _l( 'No datasets were selected' ), '.',
	                        '<% } else if( _.size( elements ) === 1 ){ %>',
	                            _l( 'Only one dataset was selected' ), ': <%- elements[0].name %>',
	                        '<% } else if( _.size( elements ) > 2 ){ %>',
	                            _l( 'Too many datasets were selected' ),
	                            ': <%- _.pluck( elements, "name" ).join( ", ") %>',
	                        '<% } %>',
	                        '<br />',
	                        _l( 'Two (and only two) elements are needed for the pair' ), '. ',
	                        _l( 'You may need to ' ),
	                        '<a class="cancel-create" href="javascript:void(0)">', _l( 'cancel' ), '</a> ',
	                        _l( 'and reselect new elements' ), '.',
	                    '</span>',
	                '</div>',
	            '</div>',
	            '<div class="footer flex-row no-flex">',
	                '<div class="actions clear vertically-spaced">',
	                    '<div class="other-options pull-left">',
	                        '<button class="cancel-create btn" tabindex="-1">', _l( 'Cancel' ), '</button>',
	                        // _l( 'Create a different kind of collection' ),
	                    '</div>',
	                '</div>',
	            '</div>'
	        ].join('')),
	    }),
	
	    // ------------------------------------------------------------------------ misc
	    /** string rep */
	    toString : function(){ return 'PairCollectionCreator'; }
	});
	
	
	//==============================================================================
	/** List collection flavor of collectionCreatorModal. */
	var pairCollectionCreatorModal = function _pairCollectionCreatorModal( elements, options ){
	    options = options || {};
	    options.title = _l( 'Create a collection from a pair of datasets' );
	    return LIST_CREATOR.collectionCreatorModal( elements, options, PairCollectionCreator );
	};
	
	
	//==============================================================================
	/** Use a modal to create a pair collection, then add it to the given history contents.
	 *  @returns {Deferred} resolved when the collection is added to the history.
	 */
	function createPairCollection( contents ){
	    var elements = contents.toJSON(),
	        promise = pairCollectionCreatorModal( elements, {
	            creationFn : function( elements, name ){
	                elements = [
	                    { name: "forward", src: "hda", id: elements[0].id },
	                    { name: "reverse", src: "hda", id: elements[1].id }
	                ];
	                return contents.createHDCA( elements, 'paired', name );
	            }
	        });
	    return promise;
	}
	
	//==============================================================================
	    return {
	        PairCollectionCreator       : PairCollectionCreator,
	        pairCollectionCreatorModal  : pairCollectionCreatorModal,
	        createPairCollection        : createPairCollection,
	    };
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! underscore */ 1), __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 97 */
/*!***************************************************************************!*\
  !*** ./galaxy/scripts/mvc/collection/list-of-pairs-collection-creator.js ***!
  \***************************************************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Backbone, _, jQuery, $) {!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	    __webpack_require__(/*! utils/levenshtein */ 98),
	    __webpack_require__(/*! utils/natural-sort */ 75),
	    __webpack_require__(/*! mvc/collection/list-collection-creator */ 74),
	    __webpack_require__(/*! mvc/base-mvc */ 5),
	    __webpack_require__(/*! utils/localization */ 7),
	    __webpack_require__(/*! ui/hoverhighlight */ 76)
	], __WEBPACK_AMD_DEFINE_RESULT__ = function( levenshteinDistance, naturalSort, LIST_COLLECTION_CREATOR, baseMVC, _l ){
	
	'use strict';
	
	var logNamespace = 'collections';
	/* ============================================================================
	TODO:
	
	
	PROGRAMMATICALLY:
	currPanel.once( 'rendered', function(){
	    currPanel.showSelectors();
	    currPanel.selectAll();
	    _.last( currPanel.actionsPopup.options ).func();
	});
	
	============================================================================ */
	/** A view for paired datasets in the collections creator.
	 */
	var PairView = Backbone.View.extend( baseMVC.LoggableMixin ).extend({
	    _logNamespace : logNamespace,
	
	    tagName     : 'li',
	    className   : 'dataset paired',
	
	    initialize : function( attributes ){
	        this.pair = attributes.pair || {};
	    },
	
	    template : _.template([
	        '<span class="forward-dataset-name flex-column"><%- pair.forward.name %></span>',
	        '<span class="pair-name-column flex-column">',
	            '<span class="pair-name"><%- pair.name %></span>',
	        '</span>',
	        '<span class="reverse-dataset-name flex-column"><%- pair.reverse.name %></span>'
	    ].join('')),
	
	    render : function(){
	        this.$el
	            .attr( 'draggable', true )
	            .data( 'pair', this.pair )
	            .html( this.template({ pair: this.pair }) )
	            .addClass( 'flex-column-container' );
	        return this;
	    },
	
	    events : {
	        'dragstart'         : '_dragstart',
	        'dragend'           : '_dragend',
	        'dragover'          : '_sendToParent',
	        'drop'              : '_sendToParent'
	    },
	
	    /** dragging pairs for re-ordering */
	    _dragstart : function( ev ){
	        ev.currentTarget.style.opacity = '0.4';
	        if( ev.originalEvent ){ ev = ev.originalEvent; }
	
	        ev.dataTransfer.effectAllowed = 'move';
	        ev.dataTransfer.setData( 'text/plain', JSON.stringify( this.pair ) );
	
	        this.$el.parent().trigger( 'pair.dragstart', [ this ] );
	    },
	
	    /** dragging pairs for re-ordering */
	    _dragend : function( ev ){
	        ev.currentTarget.style.opacity = '1.0';
	        this.$el.parent().trigger( 'pair.dragend', [ this ] );
	    },
	
	    /** manually bubble up an event to the parent/container */
	    _sendToParent : function( ev ){
	        this.$el.parent().trigger( ev );
	    },
	
	    /** string rep */
	    toString : function(){
	        return 'PairView(' + this.pair.name + ')';
	    }
	});
	
	
	// ============================================================================
	/** returns an autopair function that uses the provided options.match function */
	function autoPairFnBuilder( options ){
	    options = options || {};
	    options.createPair = options.createPair || function _defaultCreatePair( params ){
	        params = params || {};
	        var a = params.listA.splice( params.indexA, 1 )[0],
	            b = params.listB.splice( params.indexB, 1 )[0],
	            aInBIndex = params.listB.indexOf( a ),
	            bInAIndex = params.listA.indexOf( b );
	        if( aInBIndex !== -1 ){ params.listB.splice( aInBIndex, 1 ); }
	        if( bInAIndex !== -1 ){ params.listA.splice( bInAIndex, 1 ); }
	        return this._pair( a, b, { silent: true });
	    };
	    // compile these here outside of the loop
	    var _regexps = [];
	    function getRegExps(){
	        if( !_regexps.length ){
	            _regexps = [
	                new RegExp( this.filters[0] ),
	                new RegExp( this.filters[1] )
	            ];
	        }
	        return _regexps;
	    }
	    // mangle params as needed
	    options.preprocessMatch = options.preprocessMatch || function _defaultPreprocessMatch( params ){
	        var regexps = getRegExps.call( this );
	        return _.extend( params, {
	            matchTo     : params.matchTo.name.replace( regexps[0], '' ),
	            possible    : params.possible.name.replace( regexps[1], '' )
	        });
	    };
	
	    return function _strategy( params ){
	        this.debug( 'autopair _strategy ---------------------------' );
	        params = params || {};
	        var listA = params.listA,
	            listB = params.listB,
	            indexA = 0, indexB,
	            bestMatch = {
	                score : 0.0,
	                index : null
	            },
	            paired = [];
	        //console.debug( 'params:', JSON.stringify( params, null, '  ' ) );
	        this.debug( 'starting list lens:', listA.length, listB.length );
	        this.debug( 'bestMatch (starting):', JSON.stringify( bestMatch, null, '  ' ) );
	
	        while( indexA < listA.length ){
	            var matchTo = listA[ indexA ];
	            bestMatch.score = 0.0;
	
	            for( indexB=0; indexB<listB.length; indexB++ ){
	                var possible = listB[ indexB ];
	                this.debug( indexA + ':' + matchTo.name );
	                this.debug( indexB + ':' + possible.name );
	
	                // no matching with self
	                if( listA[ indexA ] !== listB[ indexB ] ){
	                    bestMatch = options.match.call( this, options.preprocessMatch.call( this, {
	                        matchTo : matchTo,
	                        possible: possible,
	                        index   : indexB,
	                        bestMatch : bestMatch
	                    }));
	                    this.debug( 'bestMatch:', JSON.stringify( bestMatch, null, '  ' ) );
	                    if( bestMatch.score === 1.0 ){
	                        this.debug( 'breaking early due to perfect match' );
	                        break;
	                    }
	                }
	            }
	            var scoreThreshold = options.scoreThreshold.call( this );
	            this.debug( 'scoreThreshold:', scoreThreshold );
	            this.debug( 'bestMatch.score:', bestMatch.score );
	
	            if( bestMatch.score >= scoreThreshold ){
	                //console.debug( 'autoPairFnBuilder.strategy', listA[ indexA ].name, listB[ bestMatch.index ].name );
	                paired.push( options.createPair.call( this, {
	                    listA   : listA,
	                    indexA  : indexA,
	                    listB   : listB,
	                    indexB  : bestMatch.index
	                }));
	                //console.debug( 'list lens now:', listA.length, listB.length );
	            } else {
	                indexA += 1;
	            }
	            if( !listA.length || !listB.length ){
	                return paired;
	            }
	        }
	        this.debug( 'paired:', JSON.stringify( paired, null, '  ' ) );
	        this.debug( 'autopair _strategy ---------------------------' );
	        return paired;
	    };
	}
	
	
	// ============================================================================
	/** An interface for building collections of paired datasets.
	 */
	var PairedCollectionCreator = Backbone.View.extend( baseMVC.LoggableMixin ).extend({
	    _logNamespace : logNamespace,
	
	    className: 'list-of-pairs-collection-creator collection-creator flex-row-container',
	
	    /** set up initial options, instance vars, behaviors, and autopair (if set to do so) */
	    initialize : function( attributes ){
	        this.metric( 'PairedCollectionCreator.initialize', attributes );
	        //this.debug( '-- PairedCollectionCreator:', attributes );
	
	        attributes = _.defaults( attributes, {
	            datasets            : [],
	            filters             : this.DEFAULT_FILTERS,
	            automaticallyPair   : true,
	            strategy            : 'lcs',
	            matchPercentage     : 0.9,
	            twoPassAutopairing  : true
	        });
	
	        /** unordered, original list */
	        this.initialList = attributes.datasets;
	
	        /** is this from a history? if so, what's its id? */
	        this.historyId = attributes.historyId;
	
	        /** which filters should be used initially? (String[2] or name in commonFilters) */
	        this.filters = this.commonFilters[ attributes.filters ] || this.commonFilters[ this.DEFAULT_FILTERS ];
	        if( _.isArray( attributes.filters ) ){
	            this.filters = attributes.filters;
	        }
	
	        /** try to auto pair the unpaired datasets on load? */
	        this.automaticallyPair = attributes.automaticallyPair;
	
	        /** what method to use for auto pairing (will be passed aggression level) */
	        this.strategy = this.strategies[ attributes.strategy ] || this.strategies[ this.DEFAULT_STRATEGY ];
	        if( _.isFunction( attributes.strategy ) ){
	            this.strategy = attributes.strategy;
	        }
	
	        /** distance/mismatch level allowed for autopairing */
	        this.matchPercentage = attributes.matchPercentage;
	
	        /** try to autopair using simple first, then this.strategy on the remainder */
	        this.twoPassAutopairing = attributes.twoPassAutopairing;
	
	        /** remove file extensions (\.*) from created pair names? */
	        this.removeExtensions = true;
	        //this.removeExtensions = false;
	
	        /** fn to call when the cancel button is clicked (scoped to this) - if falsy, no btn is displayed */
	        this.oncancel = attributes.oncancel;
	        /** fn to call when the collection is created (scoped to this) */
	        this.oncreate = attributes.oncreate;
	
	        /** fn to call when the cancel button is clicked (scoped to this) - if falsy, no btn is displayed */
	        this.autoscrollDist = attributes.autoscrollDist || 24;
	
	        /** is the unpaired panel shown? */
	        this.unpairedPanelHidden = false;
	        /** is the paired panel shown? */
	        this.pairedPanelHidden = false;
	
	        /** DOM elements currently being dragged */
	        this.$dragging = null;
	
	        /** Used for blocking UI events during ajax/operations (don't post twice) */
	        this.blocking = false;
	
	        this._setUpBehaviors();
	        this._dataSetUp();
	    },
	
	    /** map of common filter pairs by name */
	    commonFilters : {
	        illumina        : [ '_1', '_2' ],
	        Rs              : [ '_R1', '_R2' ]
	    },
	    /** which commonFilter to use by default */
	    DEFAULT_FILTERS : 'illumina',
	
	    /** map of name->fn for autopairing */
	    strategies : {
	        'simple'        : 'autopairSimple',
	        'lcs'           : 'autopairLCS',
	        'levenshtein'   : 'autopairLevenshtein'
	    },
	    /** default autopair strategy name */
	    DEFAULT_STRATEGY : 'lcs',
	
	    // ------------------------------------------------------------------------ process raw list
	    /** set up main data: cache initialList, sort, and autopair */
	    _dataSetUp : function(){
	        //this.debug( '-- _dataSetUp' );
	
	        this.paired = [];
	        this.unpaired = [];
	
	        this.selectedIds = [];
	
	        // sort initial list, add ids if needed, and save new working copy to unpaired
	        this._sortInitialList();
	        this._ensureIds();
	        this.unpaired = this.initialList.slice( 0 );
	
	        if( this.automaticallyPair ){
	            this.autoPair();
	            this.once( 'rendered:initial', function(){
	                this.trigger( 'autopair' );
	            });
	        }
	    },
	
	    /** sort initial list */
	    _sortInitialList : function(){
	        //this.debug( '-- _sortInitialList' );
	        this._sortDatasetList( this.initialList );
	    },
	
	    /** sort a list of datasets */
	    _sortDatasetList : function( list ){
	        // currently only natural sort by name
	        list.sort( function( a, b ){ return naturalSort( a.name, b.name ); });
	        return list;
	    },
	
	    /** add ids to dataset objs in initial list if none */
	    _ensureIds : function(){
	        this.initialList.forEach( function( dataset ){
	            if( !dataset.hasOwnProperty( 'id' ) ){
	                dataset.id = _.uniqueId();
	            }
	        });
	        return this.initialList;
	    },
	
	    /** split initial list into two lists, those that pass forward filters & those passing reverse */
	    _splitByFilters : function(){
	        var regexFilters = this.filters.map( function( stringFilter ){
	                return new RegExp( stringFilter );
	            }),
	            split = [ [], [] ];
	
	        function _filter( unpaired, filter ){
	            return filter.test( unpaired.name );
	            //return dataset.name.indexOf( filter ) >= 0;
	        }
	        this.unpaired.forEach( function _filterEach( unpaired ){
	            // 90% of the time this seems to work, but:
	            //TODO: this treats *all* strings as regex which may confuse people - possibly check for // surrounding?
	            //  would need explanation in help as well
	            regexFilters.forEach( function( filter, i ){
	                if( _filter( unpaired, filter ) ){
	                    split[i].push( unpaired );
	                }
	            });
	        });
	        return split;
	    },
	
	    /** add a dataset to the unpaired list in it's proper order */
	    _addToUnpaired : function( dataset ){
	        // currently, unpaired is natural sorted by name, use binary search to find insertion point
	        var binSearchSortedIndex = function( low, hi ){
	            if( low === hi ){ return low; }
	
	            var mid = Math.floor( ( hi - low ) / 2 ) + low,
	                compared = naturalSort( dataset.name, this.unpaired[ mid ].name );
	
	            if( compared < 0 ){
	                return binSearchSortedIndex( low, mid );
	            } else if( compared > 0 ){
	                return binSearchSortedIndex( mid + 1, hi );
	            }
	            // walk the equal to find the last
	            while( this.unpaired[ mid ] && this.unpaired[ mid ].name === dataset.name ){ mid++; }
	            return mid;
	
	        }.bind( this );
	
	        this.unpaired.splice( binSearchSortedIndex( 0, this.unpaired.length ), 0, dataset );
	    },
	
	    // ------------------------------------------------------------------------ auto pairing
	    /** two passes to automatically create pairs:
	     *  use both simpleAutoPair, then the fn mentioned in strategy
	     */
	    autoPair : function( strategy ){
	        // split first using exact matching
	        var split = this._splitByFilters(),
	            paired = [];
	        if( this.twoPassAutopairing ){
	            paired = this.autopairSimple({
	                listA : split[0],
	                listB : split[1]
	            });
	            split = this._splitByFilters();
	        }
	
	        // uncomment to see printlns while running tests
	        //this.debug = function(){ console.log.apply( console, arguments ); };
	
	        // then try the remainder with something less strict
	        strategy = strategy || this.strategy;
	        split = this._splitByFilters();
	        paired = paired.concat( this[ strategy ].call( this, {
	            listA : split[0],
	            listB : split[1]
	        }));
	        return paired;
	    },
	
	    /** autopair by exact match */
	    autopairSimple : autoPairFnBuilder({
	        scoreThreshold: function(){ return 1.0; },
	        match : function _match( params ){
	            params = params || {};
	            if( params.matchTo === params.possible ){
	                return {
	                    index: params.index,
	                    score: 1.0
	                };
	            }
	            return params.bestMatch;
	        }
	    }),
	
	    /** autopair by levenshtein edit distance scoring */
	    autopairLevenshtein : autoPairFnBuilder({
	        scoreThreshold: function(){ return this.matchPercentage; },
	        match : function _matches( params ){
	            params = params || {};
	            var distance = levenshteinDistance( params.matchTo, params.possible ),
	                score = 1.0 - ( distance / ( Math.max( params.matchTo.length, params.possible.length ) ) );
	            if( score > params.bestMatch.score ){
	                return {
	                    index: params.index,
	                    score: score
	                };
	            }
	            return params.bestMatch;
	        }
	    }),
	
	    /** autopair by longest common substrings scoring */
	    autopairLCS : autoPairFnBuilder({
	        scoreThreshold: function(){ return this.matchPercentage; },
	        match : function _matches( params ){
	            params = params || {};
	            var match = this._naiveStartingAndEndingLCS( params.matchTo, params.possible ).length,
	                score = match / ( Math.max( params.matchTo.length, params.possible.length ) );
	            if( score > params.bestMatch.score ){
	                return {
	                    index: params.index,
	                    score: score
	                };
	            }
	            return params.bestMatch;
	        }
	    }),
	
	    /** return the concat'd longest common prefix and suffix from two strings */
	    _naiveStartingAndEndingLCS : function( s1, s2 ){
	        var fwdLCS = '',
	            revLCS = '',
	            i = 0, j = 0;
	        while( i < s1.length && i < s2.length ){
	            if( s1[ i ] !== s2[ i ] ){
	                break;
	            }
	            fwdLCS += s1[ i ];
	            i += 1;
	        }
	        if( i === s1.length ){ return s1; }
	        if( i === s2.length ){ return s2; }
	
	        i = ( s1.length - 1 );
	        j = ( s2.length - 1 );
	        while( i >= 0 && j >= 0 ){
	            if( s1[ i ] !== s2[ j ] ){
	                break;
	            }
	            revLCS = [ s1[ i ], revLCS ].join( '' );
	            i -= 1;
	            j -= 1;
	        }
	        return fwdLCS + revLCS;
	    },
	
	    // ------------------------------------------------------------------------ pairing / unpairing
	    /** create a pair from fwd and rev, removing them from unpaired, and placing the new pair in paired */
	    _pair : function( fwd, rev, options ){
	        options = options || {};
	        this.debug( '_pair:', fwd, rev );
	        var pair = this._createPair( fwd, rev, options.name );
	        this.paired.push( pair );
	        this.unpaired = _.without( this.unpaired, fwd, rev );
	        if( !options.silent ){
	            this.trigger( 'pair:new', pair );
	        }
	        return pair;
	    },
	
	    /** create a pair Object from fwd and rev, adding the name attribute (will guess if not given) */
	    _createPair : function( fwd, rev, name ){
	        // ensure existance and don't pair something with itself
	        if( !( fwd && rev ) || ( fwd === rev ) ){
	            throw new Error( 'Bad pairing: ' + [ JSON.stringify( fwd ), JSON.stringify( rev ) ] );
	        }
	        name = name || this._guessNameForPair( fwd, rev );
	        return { forward : fwd, name : name, reverse : rev };
	    },
	
	    /** try to find a good pair name for the given fwd and rev datasets */
	    _guessNameForPair : function( fwd, rev, removeExtensions ){
	        removeExtensions = ( removeExtensions !== undefined )?( removeExtensions ):( this.removeExtensions );
	        var fwdName = fwd.name,
	            revName = rev.name,
	            lcs = this._naiveStartingAndEndingLCS(
	                fwdName.replace( new RegExp( this.filters[0] ), '' ),
	                revName.replace( new RegExp( this.filters[1] ), '' )
	            );
	        if( removeExtensions ){
	            var lastDotIndex = lcs.lastIndexOf( '.' );
	            if( lastDotIndex > 0 ){
	                var extension = lcs.slice( lastDotIndex, lcs.length );
	                lcs = lcs.replace( extension, '' );
	                fwdName = fwdName.replace( extension, '' );
	                revName = revName.replace( extension, '' );
	            }
	        }
	        return lcs || ( fwdName + ' & ' + revName );
	    },
	
	    /** unpair a pair, removing it from paired, and adding the fwd,rev datasets back into unpaired */
	    _unpair : function( pair, options ){
	        options = options || {};
	        if( !pair ){
	            throw new Error( 'Bad pair: ' + JSON.stringify( pair ) );
	        }
	        this.paired = _.without( this.paired, pair );
	        this._addToUnpaired( pair.forward );
	        this._addToUnpaired( pair.reverse );
	
	        if( !options.silent ){
	            this.trigger( 'pair:unpair', [ pair ] );
	        }
	        return pair;
	    },
	
	    /** unpair all paired datasets */
	    unpairAll : function(){
	        var pairs = [];
	        while( this.paired.length ){
	            pairs.push( this._unpair( this.paired[ 0 ], { silent: true }) );
	        }
	        this.trigger( 'pair:unpair', pairs );
	    },
	
	    // ------------------------------------------------------------------------ API
	    /** convert a pair into JSON compatible with the collections API */
	    _pairToJSON : function( pair, src ){
	        src = src || 'hda';
	        //TODO: consider making this the pair structure when created instead
	        return {
	            collection_type : 'paired',
	            src             : 'new_collection',
	            name            : pair.name,
	            element_identifiers : [{
	                name    : 'forward',
	                id      : pair.forward.id,
	                src     : src
	            }, {
	                name    : 'reverse',
	                id      : pair.reverse.id,
	                src     : src
	            }]
	        };
	    },
	
	    /** create the collection via the API
	     *  @returns {jQuery.xhr Object}    the jquery ajax request
	     */
	    createList : function( name ){
	        var creator = this,
	            url = Galaxy.root + 'api/histories/' + this.historyId + '/contents/dataset_collections';
	
	        //TODO: use ListPairedCollection.create()
	        var ajaxData = {
	            type            : 'dataset_collection',
	            collection_type : 'list:paired',
	            name            : _.escape( name || creator.$( '.collection-name' ).val() ),
	            element_identifiers : creator.paired.map( function( pair ){
	                return creator._pairToJSON( pair );
	            })
	
	        };
	        //this.debug( JSON.stringify( ajaxData ) );
	        creator.blocking = true;
	        return jQuery.ajax( url, {
	            type        : 'POST',
	            contentType : 'application/json',
	            dataType    : 'json',
	            data        : JSON.stringify( ajaxData )
	        })
	        .always( function(){
	            creator.blocking = false;
	        })
	        .fail( function( xhr, status, message ){
	            creator._ajaxErrHandler( xhr, status, message );
	        })
	        .done( function( response, message, xhr ){
	            //this.info( 'ok', response, message, xhr );
	            creator.trigger( 'collection:created', response, message, xhr );
	            creator.metric( 'collection:created', response );
	            if( typeof creator.oncreate === 'function' ){
	                creator.oncreate.call( this, response, message, xhr );
	            }
	        });
	    },
	
	    /** handle ajax errors with feedback and details to the user (if available) */
	    _ajaxErrHandler : function( xhr, status, message ){
	        this.error( xhr, status, message );
	        var content = _l( 'An error occurred while creating this collection' );
	        if( xhr ){
	            if( xhr.readyState === 0 && xhr.status === 0 ){
	                content += ': ' + _l( 'Galaxy could not be reached and may be updating.' )
	                    + _l( ' Try again in a few minutes.' );
	            } else if( xhr.responseJSON ){
	                content += '<br /><pre>' + JSON.stringify( xhr.responseJSON ) + '</pre>';
	            } else {
	                content += ': ' + message;
	            }
	        }
	        creator._showAlert( content, 'alert-danger' );
	    },
	
	    // ------------------------------------------------------------------------ rendering
	    /** render the entire interface */
	    render : function( speed, callback ){
	        //this.debug( '-- _render' );
	        //this.$el.empty().html( PairedCollectionCreator.templates.main() );
	        this.$el.empty().html( PairedCollectionCreator.templates.main() );
	        this._renderHeader( speed );
	        this._renderMiddle( speed );
	        this._renderFooter( speed );
	        this._addPluginComponents();
	        this.trigger( 'rendered', this );
	        return this;
	    },
	
	    /** render the header section */
	    _renderHeader : function( speed, callback ){
	        //this.debug( '-- _renderHeader' );
	        var $header = this.$( '.header' ).empty().html( PairedCollectionCreator.templates.header() )
	            .find( '.help-content' ).prepend( $( PairedCollectionCreator.templates.helpContent() ) );
	
	        this._renderFilters();
	        return $header;
	    },
	    /** fill the filter inputs with the filter values */
	    _renderFilters : function(){
	        return    this.$( '.forward-column .column-header input' ).val( this.filters[0] )
	            .add( this.$( '.reverse-column .column-header input' ).val( this.filters[1] ) );
	    },
	
	    /** render the middle including unpaired and paired sections (which may be hidden) */
	    _renderMiddle : function( speed, callback ){
	        var $middle = this.$( '.middle' ).empty().html( PairedCollectionCreator.templates.middle() );
	
	        // (re-) hide the un/paired panels based on instance vars
	        if( this.unpairedPanelHidden ){
	            this.$( '.unpaired-columns' ).hide();
	        } else if( this.pairedPanelHidden ){
	            this.$( '.paired-columns' ).hide();
	        }
	
	        this._renderUnpaired();
	        this._renderPaired();
	        return $middle;
	    },
	    /** render the unpaired section, showing datasets accrd. to filters, update the unpaired counts */
	    _renderUnpaired : function( speed, callback ){
	        //this.debug( '-- _renderUnpaired' );
	        var creator = this,
	            $fwd, $rev, $prd = [],
	            split = this._splitByFilters();
	        // update unpaired counts
	        this.$( '.forward-column .title' )
	            .text([ split[0].length, _l( 'unpaired forward' ) ].join( ' ' ));
	        this.$( '.forward-column .unpaired-info' )
	            .text( this._renderUnpairedDisplayStr( this.unpaired.length - split[0].length ) );
	        this.$( '.reverse-column .title' )
	            .text([ split[1].length, _l( 'unpaired reverse' ) ].join( ' ' ));
	        this.$( '.reverse-column .unpaired-info' )
	            .text( this._renderUnpairedDisplayStr( this.unpaired.length - split[1].length ) );
	
	        this.$( '.unpaired-columns .column-datasets' ).empty();
	
	        // show/hide the auto pair button if any unpaired are left
	        this.$( '.autopair-link' ).toggle( this.unpaired.length !== 0 );
	        if( this.unpaired.length === 0 ){
	            this._renderUnpairedEmpty();
	            return;
	        }
	
	        // create the dataset dom arrays
	        $rev = split[1].map( function( dataset, i ){
	            // if there'll be a fwd dataset across the way, add a button to pair the row
	            if( ( split[0][ i ] !== undefined )
	            &&  ( split[0][ i ] !== dataset ) ){
	                $prd.push( creator._renderPairButton() );
	            }
	            return creator._renderUnpairedDataset( dataset );
	        });
	        $fwd = split[0].map( function( dataset ){
	            return creator._renderUnpairedDataset( dataset );
	        });
	
	        if( !$fwd.length && !$rev.length ){
	            this._renderUnpairedNotShown();
	            return;
	        }
	        // add to appropo cols
	        //TODO: not the best way to render - consider rendering the entire unpaired-columns section in a fragment
	        //  and swapping out that
	        this.$( '.unpaired-columns .forward-column .column-datasets' ).append( $fwd )
	            .add( this.$( '.unpaired-columns .paired-column .column-datasets' ).append( $prd ) )
	            .add( this.$( '.unpaired-columns .reverse-column .column-datasets' ).append( $rev ) );
	        this._adjUnpairedOnScrollbar();
	    },
	    /** return a string to display the count of filtered out datasets */
	    _renderUnpairedDisplayStr : function( numFiltered ){
	        return [ '(', numFiltered, ' ', _l( 'filtered out' ), ')' ].join('');
	    },
	    /** return an unattached jQuery DOM element to represent an unpaired dataset */
	    _renderUnpairedDataset : function( dataset ){
	        //TODO: to underscore template
	        return $( '<li/>')
	            .attr( 'id', 'dataset-' + dataset.id )
	            .addClass( 'dataset unpaired' )
	            .attr( 'draggable', true )
	            .addClass( dataset.selected? 'selected': '' )
	            .append( $( '<span/>' ).addClass( 'dataset-name' ).text( dataset.name ) )
	            //??
	            .data( 'dataset', dataset );
	    },
	    /** render the button that may go between unpaired datasets, allowing the user to pair a row */
	    _renderPairButton : function(){
	        //TODO: *not* a dataset - don't pretend like it is
	        return $( '<li/>').addClass( 'dataset unpaired' )
	            .append( $( '<span/>' ).addClass( 'dataset-name' ).text( _l( 'Pair these datasets' ) ) );
	    },
	    /** a message to display when no unpaired left */
	    _renderUnpairedEmpty : function(){
	        //this.debug( '-- renderUnpairedEmpty' );
	        var $msg = $( '<div class="empty-message"></div>' )
	            .text( '(' + _l( 'no remaining unpaired datasets' ) + ')' );
	        this.$( '.unpaired-columns .paired-column .column-datasets' ).empty().prepend( $msg );
	        return $msg;
	    },
	    /** a message to display when no unpaired can be shown with the current filters */
	    _renderUnpairedNotShown : function(){
	        //this.debug( '-- renderUnpairedEmpty' );
	        var $msg = $( '<div class="empty-message"></div>' )
	            .text( '(' + _l( 'no datasets were found matching the current filters' ) + ')' );
	        this.$( '.unpaired-columns .paired-column .column-datasets' ).empty().prepend( $msg );
	        return $msg;
	    },
	    /** try to detect if the unpaired section has a scrollbar and adjust left column for better centering of all */
	    _adjUnpairedOnScrollbar : function(){
	        var $unpairedColumns = this.$( '.unpaired-columns' ).last(),
	            $firstDataset = this.$( '.unpaired-columns .reverse-column .dataset' ).first();
	        if( !$firstDataset.size() ){ return; }
	        var ucRight = $unpairedColumns.offset().left + $unpairedColumns.outerWidth(),
	            dsRight = $firstDataset.offset().left + $firstDataset.outerWidth(),
	            rightDiff = Math.floor( ucRight ) - Math.floor( dsRight );
	        //this.debug( 'rightDiff:', ucRight, '-', dsRight, '=', rightDiff );
	        this.$( '.unpaired-columns .forward-column' )
	            .css( 'margin-left', ( rightDiff > 0 )? rightDiff: 0 );
	    },
	
	    /** render the paired section and update counts of paired datasets */
	    _renderPaired : function( speed, callback ){
	        //this.debug( '-- _renderPaired' );
	        this.$( '.paired-column-title .title' ).text([ this.paired.length, _l( 'paired' ) ].join( ' ' ) );
	        // show/hide the unpair all link
	        this.$( '.unpair-all-link' ).toggle( this.paired.length !== 0 );
	        if( this.paired.length === 0 ){
	            this._renderPairedEmpty();
	            return;
	            //TODO: would be best to return here (the $columns)
	        } else {
	            // show/hide 'remove extensions link' when any paired and they seem to have extensions
	            this.$( '.remove-extensions-link' ).show();
	        }
	
	        this.$( '.paired-columns .column-datasets' ).empty();
	        var creator = this;
	        this.paired.forEach( function( pair, i ){
	            //TODO: cache these?
	            var pairView = new PairView({ pair: pair });
	            creator.$( '.paired-columns .column-datasets' )
	                .append( pairView.render().$el )
	                .append([
	                    '<button class="unpair-btn">',
	                        '<span class="fa fa-unlink" title="', _l( 'Unpair' ), '"></span>',
	                    '</button>'
	                ].join( '' ));
	        });
	    },
	    /** a message to display when none paired */
	    _renderPairedEmpty : function(){
	        var $msg = $( '<div class="empty-message"></div>' )
	            .text( '(' + _l( 'no paired datasets yet' ) + ')' );
	        this.$( '.paired-columns .column-datasets' ).empty().prepend( $msg );
	        return $msg;
	    },
	
	    /** render the footer, completion controls, and cancel controls */
	    _renderFooter : function( speed, callback ){
	        var $footer = this.$( '.footer' ).empty().html( PairedCollectionCreator.templates.footer() );
	        this.$( '.remove-extensions' ).prop( 'checked', this.removeExtensions );
	        if( typeof this.oncancel === 'function' ){
	            this.$( '.cancel-create.btn' ).show();
	        }
	        return $footer;
	    },
	
	    /** add any jQuery/bootstrap/custom plugins to elements rendered */
	    _addPluginComponents : function(){
	        this._chooseFiltersPopover( '.choose-filters-link' );
	        this.$( '.help-content i' ).hoverhighlight( '.collection-creator', 'rgba( 64, 255, 255, 1.0 )' );
	    },
	
	    /** build a filter selection popover allowing selection of common filter pairs */
	    _chooseFiltersPopover : function( selector ){
	        function filterChoice( val1, val2 ){
	            return [
	                '<button class="filter-choice btn" ',
	                        'data-forward="', val1, '" data-reverse="', val2, '">',
	                    _l( 'Forward' ), ': ', val1, ', ',
	                    _l( 'Reverse' ), ': ', val2,
	                '</button>'
	            ].join('');
	        }
	        var $popoverContent = $( _.template([
	            '<div class="choose-filters">',
	                '<div class="help">',
	                    _l( 'Choose from the following filters to change which unpaired reads are shown in the display' ),
	                ':</div>',
	                _.values( this.commonFilters ).map( function( filterSet ){
	                    return filterChoice( filterSet[0], filterSet[1] );
	                }).join( '' ),
	            '</div>'
	        ].join(''))({}));
	
	        return this.$( selector ).popover({
	            container   : '.collection-creator',
	            placement   : 'bottom',
	            html        : true,
	            //animation   : false,
	            content     : $popoverContent
	        });
	    },
	
	    /** add (or clear if clear is truthy) a validation warning to what */
	    _validationWarning : function( what, clear ){
	        var VALIDATION_CLASS = 'validation-warning';
	        if( what === 'name' ){
	            what = this.$( '.collection-name' ).add( this.$( '.collection-name-prompt' ) );
	            this.$( '.collection-name' ).focus().select();
	        }
	        if( clear ){
	            what = what || this.$( '.' + VALIDATION_CLASS );
	            what.removeClass( VALIDATION_CLASS );
	        } else {
	            what.addClass( VALIDATION_CLASS );
	        }
	    },
	
	    // ------------------------------------------------------------------------ events
	    /** set up event handlers on self */
	    _setUpBehaviors : function(){
	        this.once( 'rendered', function(){
	            this.trigger( 'rendered:initial', this );
	        });
	
	        this.on( 'pair:new', function(){
	            //TODO: ideally only re-render the columns (or even elements) involved
	            this._renderUnpaired();
	            this._renderPaired();
	
	            // scroll to bottom where new pairs are added
	            //TODO: this doesn't seem to work - innerHeight sticks at 133...
	            //  may have to do with improper flex columns
	            //var $pairedView = this.$( '.paired-columns' );
	            //$pairedView.scrollTop( $pairedView.innerHeight() );
	            //this.debug( $pairedView.height() )
	            this.$( '.paired-columns' ).scrollTop( 8000000 );
	        });
	        this.on( 'pair:unpair', function( pairs ){
	            //TODO: ideally only re-render the columns (or even elements) involved
	            this._renderUnpaired();
	            this._renderPaired();
	            this.splitView();
	        });
	
	        this.on( 'filter-change', function(){
	            this.filters = [
	                this.$( '.forward-unpaired-filter input' ).val(),
	                this.$( '.reverse-unpaired-filter input' ).val()
	            ];
	            this.metric( 'filter-change', this.filters );
	            this._renderFilters();
	            this._renderUnpaired();
	        });
	
	        this.on( 'autopair', function(){
	            this._renderUnpaired();
	            this._renderPaired();
	
	            var message, msgClass = null;
	            if( this.paired.length ){
	                msgClass = 'alert-success';
	                message = this.paired.length + ' ' + _l( 'pairs created' );
	                if( !this.unpaired.length ){
	                    message += ': ' + _l( 'all datasets have been successfully paired' );
	                    this.hideUnpaired();
	                    this.$( '.collection-name' ).focus();
	                }
	            } else {
	                message = _l([
	                    'Could not automatically create any pairs from the given dataset names.',
	                    'You may want to choose or enter different filters and try auto-pairing again.',
	                    'Close this message using the X on the right to view more help.'
	                ].join( ' ' ));
	            }
	            this._showAlert( message, msgClass );
	        });
	
	        //this.on( 'all', function(){
	        //    this.info( arguments );
	        //});
	        return this;
	    },
	
	    events : {
	        // header
	        'click .more-help'                          : '_clickMoreHelp',
	        'click .less-help'                          : '_clickLessHelp',
	        'click .header .alert button'               : '_hideAlert',
	        'click .forward-column .column-title'       : '_clickShowOnlyUnpaired',
	        'click .reverse-column .column-title'       : '_clickShowOnlyUnpaired',
	        'click .unpair-all-link'                    : '_clickUnpairAll',
	        //TODO: this seems kinda backasswards - re-sending jq event as a backbone event, can we listen directly?
	        'change .forward-unpaired-filter input'     : function( ev ){ this.trigger( 'filter-change' ); },
	        'focus .forward-unpaired-filter input'      : function( ev ){ $( ev.currentTarget ).select(); },
	        'click .autopair-link'                      : '_clickAutopair',
	        'click .choose-filters .filter-choice'      : '_clickFilterChoice',
	        'click .clear-filters-link'                 : '_clearFilters',
	        'change .reverse-unpaired-filter input'     : function( ev ){ this.trigger( 'filter-change' ); },
	        'focus .reverse-unpaired-filter input'      : function( ev ){ $( ev.currentTarget ).select(); },
	        // unpaired
	        'click .forward-column .dataset.unpaired'   : '_clickUnpairedDataset',
	        'click .reverse-column .dataset.unpaired'   : '_clickUnpairedDataset',
	        'click .paired-column .dataset.unpaired'    : '_clickPairRow',
	        'click .unpaired-columns'                   : 'clearSelectedUnpaired',
	        'mousedown .unpaired-columns .dataset'      : '_mousedownUnpaired',
	        // divider
	        'click .paired-column-title'                : '_clickShowOnlyPaired',
	        'mousedown .flexible-partition-drag'        : '_startPartitionDrag',
	        // paired
	        'click .paired-columns .dataset.paired'     : 'selectPair',
	        'click .paired-columns'                     : 'clearSelectedPaired',
	        'click .paired-columns .pair-name'          : '_clickPairName',
	        'click .unpair-btn'                         : '_clickUnpair',
	        // paired - drop target
	        //'dragenter .paired-columns'                 : '_dragenterPairedColumns',
	        //'dragleave .paired-columns .column-datasets': '_dragleavePairedColumns',
	        'dragover .paired-columns .column-datasets' : '_dragoverPairedColumns',
	        'drop .paired-columns .column-datasets'     : '_dropPairedColumns',
	
	        'pair.dragstart .paired-columns .column-datasets' : '_pairDragstart',
	        'pair.dragend   .paired-columns .column-datasets' : '_pairDragend',
	
	        // footer
	        'change .remove-extensions'                 : function( ev ){ this.toggleExtensions(); },
	        'change .collection-name'                   : '_changeName',
	        'keydown .collection-name'                  : '_nameCheckForEnter',
	        'click .cancel-create'                      : function( ev ){
	            if( typeof this.oncancel === 'function' ){
	                this.oncancel.call( this );
	            }
	        },
	        'click .create-collection'                  : '_clickCreate'//,
	    },
	
	    // ........................................................................ header
	    /** expand help */
	    _clickMoreHelp : function( ev ){
	        this.$( '.main-help' ).addClass( 'expanded' );
	        this.$( '.more-help' ).hide();
	    },
	    /** collapse help */
	    _clickLessHelp : function( ev ){
	        this.$( '.main-help' ).removeClass( 'expanded' );
	        this.$( '.more-help' ).show();
	    },
	
	    /** show an alert on the top of the interface containing message (alertClass is bootstrap's alert-*)*/
	    _showAlert : function( message, alertClass ){
	        alertClass = alertClass || 'alert-danger';
	        this.$( '.main-help' ).hide();
	        this.$( '.header .alert' ).attr( 'class', 'alert alert-dismissable' ).addClass( alertClass ).show()
	            .find( '.alert-message' ).html( message );
	    },
	    /** hide the alerts at the top */
	    _hideAlert : function( message ){
	        this.$( '.main-help' ).show();
	        this.$( '.header .alert' ).hide();
	    },
	
	    /** toggle between showing only unpaired and split view */
	    _clickShowOnlyUnpaired : function( ev ){
	        //this.debug( 'click unpaired', ev.currentTarget );
	        if( this.$( '.paired-columns' ).is( ':visible' ) ){
	            this.hidePaired();
	        } else {
	            this.splitView();
	        }
	    },
	    /** toggle between showing only paired and split view */
	    _clickShowOnlyPaired : function( ev ){
	        //this.debug( 'click paired' );
	        if( this.$( '.unpaired-columns' ).is( ':visible' ) ){
	            this.hideUnpaired();
	        } else {
	            this.splitView();
	        }
	    },
	
	    /** hide unpaired, show paired */
	    hideUnpaired : function( speed, callback ){
	        this.unpairedPanelHidden = true;
	        this.pairedPanelHidden = false;
	        this._renderMiddle( speed, callback );
	    },
	    /** hide paired, show unpaired */
	    hidePaired : function( speed, callback ){
	        this.unpairedPanelHidden = false;
	        this.pairedPanelHidden = true;
	        this._renderMiddle( speed, callback );
	    },
	    /** show both paired and unpaired (splitting evenly) */
	    splitView : function( speed, callback ){
	        this.unpairedPanelHidden = this.pairedPanelHidden = false;
	        this._renderMiddle( speed, callback );
	        return this;
	    },
	
	    /** unpair all paired and do other super neat stuff which I'm not really sure about yet... */
	    _clickUnpairAll : function( ev ){
	        this.metric( 'unpairAll' );
	        this.unpairAll();
	    },
	
	    /** attempt to autopair */
	    _clickAutopair : function( ev ){
	        var paired = this.autoPair();
	        this.metric( 'autopair', paired.length, this.unpaired.length );
	        this.trigger( 'autopair' );
	    },
	
	    /** set the filters based on the data attributes of the button click target */
	    _clickFilterChoice : function( ev ){
	        var $selected = $( ev.currentTarget );
	        this.$( '.forward-unpaired-filter input' ).val( $selected.data( 'forward' ) );
	        this.$( '.reverse-unpaired-filter input' ).val( $selected.data( 'reverse' ) );
	        this._hideChooseFilters();
	        this.trigger( 'filter-change' );
	    },
	
	    /** hide the choose filters popover */
	    _hideChooseFilters : function(){
	        //TODO: update bootstrap and remove the following hack
	        //  see also: https://github.com/twbs/bootstrap/issues/10260
	        this.$( '.choose-filters-link' ).popover( 'hide' );
	        this.$( '.popover' ).css( 'display', 'none' );
	    },
	
	    /** clear both filters */
	    _clearFilters : function( ev ){
	        this.$( '.forward-unpaired-filter input' ).val( '' );
	        this.$( '.reverse-unpaired-filter input' ).val( '' );
	        this.trigger( 'filter-change' );
	    },
	
	    // ........................................................................ unpaired
	    /** select an unpaired dataset */
	    _clickUnpairedDataset : function( ev ){
	        ev.stopPropagation();
	        return this.toggleSelectUnpaired( $( ev.currentTarget ) );
	    },
	
	    /** Toggle the selection of an unpaired dataset representation.
	     *  @param [jQuery] $dataset        the unpaired dataset dom rep to select
	     *  @param [Boolean] options.force  if defined, force selection based on T/F; otherwise, toggle
	     */
	    toggleSelectUnpaired : function( $dataset, options ){
	        options = options || {};
	        var dataset = $dataset.data( 'dataset' ),
	            select = options.force !== undefined? options.force: !$dataset.hasClass( 'selected' );
	        //this.debug( id, options.force, $dataset, dataset );
	        if( !$dataset.size() || dataset === undefined ){ return $dataset; }
	
	        if( select ){
	            $dataset.addClass( 'selected' );
	            if( !options.waitToPair ){
	                this.pairAllSelected();
	            }
	
	        } else {
	            $dataset.removeClass( 'selected' );
	            //delete dataset.selected;
	        }
	        return $dataset;
	    },
	
	    /** pair all the currently selected unpaired datasets */
	    pairAllSelected : function( options ){
	        options = options || {};
	        var creator = this,
	            fwds = [],
	            revs = [],
	            pairs = [];
	        creator.$( '.unpaired-columns .forward-column .dataset.selected' ).each( function(){
	            fwds.push( $( this ).data( 'dataset' ) );
	        });
	        creator.$( '.unpaired-columns .reverse-column .dataset.selected' ).each( function(){
	            revs.push( $( this ).data( 'dataset' ) );
	        });
	        fwds.length = revs.length = Math.min( fwds.length, revs.length );
	        //this.debug( fwds );
	        //this.debug( revs );
	        fwds.forEach( function( fwd, i ){
	            try {
	                pairs.push( creator._pair( fwd, revs[i], { silent: true }) );
	
	            } catch( err ){
	                //TODO: preserve selected state of those that couldn't be paired
	                //TODO: warn that some could not be paired
	                creator.error( err );
	            }
	        });
	        if( pairs.length && !options.silent ){
	            this.trigger( 'pair:new', pairs );
	        }
	        return pairs;
	    },
	
	    /** clear the selection on all unpaired datasets */
	    clearSelectedUnpaired : function(){
	        this.$( '.unpaired-columns .dataset.selected' ).removeClass( 'selected' );
	    },
	
	    /** when holding down the shift key on a click, 'paint' the moused over datasets as selected */
	    _mousedownUnpaired : function( ev ){
	        if( ev.shiftKey ){
	            var creator = this,
	                $startTarget = $( ev.target ).addClass( 'selected' ),
	                moveListener = function( ev ){
	                    creator.$( ev.target ).filter( '.dataset' ).addClass( 'selected' );
	                };
	            $startTarget.parent().on( 'mousemove', moveListener );
	
	            // on any mouseup, stop listening to the move and try to pair any selected
	            $( document ).one( 'mouseup', function( ev ){
	                $startTarget.parent().off( 'mousemove', moveListener );
	                creator.pairAllSelected();
	            });
	        }
	    },
	
	    /** attempt to pair two datasets directly across from one another */
	    _clickPairRow : function( ev ){
	        //if( !ev.currentTarget ){ return true; }
	        var rowIndex = $( ev.currentTarget ).index(),
	            fwd = $( '.unpaired-columns .forward-column .dataset' ).eq( rowIndex ).data( 'dataset' ),
	            rev = $( '.unpaired-columns .reverse-column .dataset' ).eq( rowIndex ).data( 'dataset' );
	        //this.debug( 'row:', rowIndex, fwd, rev );
	        this._pair( fwd, rev );
	    },
	
	    // ........................................................................ divider/partition
	    /** start dragging the visible divider/partition between unpaired and paired panes */
	    _startPartitionDrag : function( ev ){
	        var creator = this,
	            startingY = ev.pageY;
	        //this.debug( 'partition drag START:', ev );
	        $( 'body' ).css( 'cursor', 'ns-resize' );
	        creator.$( '.flexible-partition-drag' ).css( 'color', 'black' );
	
	        function endDrag( ev ){
	            //creator.debug( 'partition drag STOP:', ev );
	            // doing this by an added class didn't really work well - kept flashing still
	            creator.$( '.flexible-partition-drag' ).css( 'color', '' );
	            $( 'body' ).css( 'cursor', '' ).unbind( 'mousemove', trackMouse );
	        }
	        function trackMouse( ev ){
	            var offset = ev.pageY - startingY;
	            //creator.debug( 'partition:', startingY, offset );
	            if( !creator.adjPartition( offset ) ){
	                //creator.debug( 'mouseup triggered' );
	                $( 'body' ).trigger( 'mouseup' );
	            }
	            creator._adjUnpairedOnScrollbar();
	            startingY += offset;
	        }
	        $( 'body' ).mousemove( trackMouse );
	        $( 'body' ).one( 'mouseup', endDrag );
	    },
	
	    /** adjust the parition up/down +/-adj pixels */
	    adjPartition : function( adj ){
	        var $unpaired = this.$( '.unpaired-columns' ),
	            $paired = this.$( '.paired-columns' ),
	            unpairedHi = parseInt( $unpaired.css( 'height' ), 10 ),
	            pairedHi = parseInt( $paired.css( 'height' ), 10 );
	        //this.debug( adj, 'hi\'s:', unpairedHi, pairedHi, unpairedHi + adj, pairedHi - adj );
	
	        unpairedHi = Math.max( 10, unpairedHi + adj );
	        pairedHi = pairedHi - adj;
	
	        var movingUpwards = adj < 0;
	        // when the divider gets close to the top - lock into hiding the unpaired section
	        if( movingUpwards ){
	            if( this.unpairedPanelHidden ){
	                return false;
	            } else if( unpairedHi <= 10 ){
	                this.hideUnpaired();
	                return false;
	            }
	        } else {
	            if( this.unpairedPanelHidden ){
	                $unpaired.show();
	                this.unpairedPanelHidden = false;
	            }
	        }
	
	        // when the divider gets close to the bottom - lock into hiding the paired section
	        if( !movingUpwards ){
	            if( this.pairedPanelHidden ){
	                return false;
	            } else if( pairedHi <= 15 ){
	                this.hidePaired();
	                return false;
	            }
	
	        } else {
	            if( this.pairedPanelHidden ){
	                $paired.show();
	                this.pairedPanelHidden = false;
	            }
	        }
	
	        $unpaired.css({
	            height  : unpairedHi + 'px',
	            flex    : '0 0 auto'
	        });
	        return true;
	    },
	
	    // ........................................................................ paired
	    /** select a pair when clicked */
	    selectPair : function( ev ){
	        ev.stopPropagation();
	        $( ev.currentTarget ).toggleClass( 'selected' );
	    },
	
	    /** deselect all pairs */
	    clearSelectedPaired : function( ev ){
	        this.$( '.paired-columns .dataset.selected' ).removeClass( 'selected' );
	    },
	
	    /** rename a pair when the pair name is clicked */
	    _clickPairName : function( ev ){
	        ev.stopPropagation();
	        var $name = $( ev.currentTarget ),
	            $pair = $name.parent().parent(),
	            index = $pair.index( '.dataset.paired' ),
	            pair = this.paired[ index ],
	            response = prompt( 'Enter a new name for the pair:', pair.name );
	        if( response ){
	            pair.name = response;
	            // set a flag (which won't be passed in json creation) for manual naming so we don't overwrite these
	            //  when adding/removing extensions
	            //hackish
	            pair.customizedName = true;
	            $name.text( pair.name );
	        }
	    },
	
	    /** unpair this pair */
	    _clickUnpair : function( ev ){
	        //if( !ev.currentTarget ){ return true; }
	        var pairIndex = Math.floor( $( ev.currentTarget ).index( '.unpair-btn' ) );
	        //this.debug( 'pair:', pairIndex );
	        this._unpair( this.paired[ pairIndex ] );
	    },
	
	    // ........................................................................ paired - drag and drop re-ordering
	    //_dragenterPairedColumns : function( ev ){
	    //    this.debug( '_dragenterPairedColumns:', ev );
	    //},
	    //_dragleavePairedColumns : function( ev ){
	    //    //this.debug( '_dragleavePairedColumns:', ev );
	    //},
	    /** track the mouse drag over the paired list adding a placeholder to show where the drop would occur */
	    _dragoverPairedColumns : function( ev ){
	        //this.debug( '_dragoverPairedColumns:', ev );
	        ev.preventDefault();
	
	        var $list = this.$( '.paired-columns .column-datasets' );
	        this._checkForAutoscroll( $list, ev.originalEvent.clientY );
	        //this.debug( ev.originalEvent.clientX, ev.originalEvent.clientY );
	        var $nearest = this._getNearestPairedDatasetLi( ev.originalEvent.clientY );
	
	        $( '.element-drop-placeholder' ).remove();
	        var $placeholder = $( '<div class="element-drop-placeholder"></div>' );
	        if( !$nearest.size() ){
	            $list.append( $placeholder );
	        } else {
	            $nearest.before( $placeholder );
	        }
	    },
	
	    /** If the mouse is near enough to the list's top or bottom, scroll the list */
	    _checkForAutoscroll : function( $element, y ){
	        var AUTOSCROLL_SPEED = 2;
	        var offset = $element.offset(),
	            scrollTop = $element.scrollTop(),
	            upperDist = y - offset.top,
	            lowerDist = ( offset.top + $element.outerHeight() ) - y;
	        //this.debug( '_checkForAutoscroll:', scrollTop, upperDist, lowerDist );
	        if( upperDist >= 0 && upperDist < this.autoscrollDist ){
	            $element.scrollTop( scrollTop - AUTOSCROLL_SPEED );
	        } else if( lowerDist >= 0 && lowerDist < this.autoscrollDist ){
	            $element.scrollTop( scrollTop + AUTOSCROLL_SPEED );
	        }
	    },
	
	    /** get the nearest *previous* paired dataset PairView based on the mouse's Y coordinate.
	     *      If the y is at the end of the list, return an empty jQuery object.
	     */
	    _getNearestPairedDatasetLi : function( y ){
	        var WIGGLE = 4,
	            lis = this.$( '.paired-columns .column-datasets li' ).toArray();
	        for( var i=0; i<lis.length; i++ ){
	            var $li = $( lis[i] ),
	                top = $li.offset().top,
	                halfHeight = Math.floor( $li.outerHeight() / 2 ) + WIGGLE;
	            if( top + halfHeight > y && top - halfHeight < y ){
	                //this.debug( y, top + halfHeight, top - halfHeight )
	                return $li;
	            }
	        }
	        return $();
	    },
	    /** drop (dragged/selected PairViews) onto the list, re-ordering both the DOM and the internal array of pairs */
	    _dropPairedColumns : function( ev ){
	        // both required for firefox
	        ev.preventDefault();
	        ev.dataTransfer.dropEffect = 'move';
	
	        var $nearest = this._getNearestPairedDatasetLi( ev.originalEvent.clientY );
	        if( $nearest.size() ){
	            this.$dragging.insertBefore( $nearest );
	
	        } else {
	            // no nearest before - insert after last element (unpair button)
	            this.$dragging.insertAfter( this.$( '.paired-columns .unpair-btn' ).last() );
	        }
	        // resync the creator's list of paired based on the new DOM order
	        this._syncPairsToDom();
	        return false;
	    },
	    /** resync the creator's list of paired based on the DOM order of pairs */
	    _syncPairsToDom : function(){
	        var newPaired = [];
	        //TODO: doesn't seem wise to use the dom to store these - can't we sync another way?
	        this.$( '.paired-columns .dataset.paired' ).each( function(){
	            newPaired.push( $( this ).data( 'pair' ) );
	        });
	        //this.debug( newPaired );
	        this.paired = newPaired;
	        this._renderPaired();
	    },
	    /** drag communication with pair sub-views: dragstart */
	    _pairDragstart : function( ev, pair ){
	        //this.debug( '_pairDragstart', ev, pair )
	        // auto select the pair causing the event and move all selected
	        pair.$el.addClass( 'selected' );
	        var $selected = this.$( '.paired-columns .dataset.selected' );
	        this.$dragging = $selected;
	    },
	    /** drag communication with pair sub-views: dragend - remove the placeholder */
	    _pairDragend : function( ev, pair ){
	        //this.debug( '_pairDragend', ev, pair )
	        $( '.element-drop-placeholder' ).remove();
	        this.$dragging = null;
	    },
	
	    // ........................................................................ footer
	    toggleExtensions : function( force ){
	        var creator = this;
	        creator.removeExtensions = ( force !== undefined )?( force ):( !creator.removeExtensions );
	
	        _.each( creator.paired, function( pair ){
	            // don't overwrite custom names
	            if( pair.customizedName ){ return; }
	            pair.name = creator._guessNameForPair( pair.forward, pair.reverse );
	        });
	
	        creator._renderPaired();
	        creator._renderFooter();
	    },
	
	    /** handle a collection name change */
	    _changeName : function( ev ){
	        this._validationWarning( 'name', !!this._getName() );
	    },
	
	    /** check for enter key press when in the collection name and submit */
	    _nameCheckForEnter : function( ev ){
	        if( ev.keyCode === 13 && !this.blocking ){
	            this._clickCreate();
	        }
	    },
	
	    /** get the current collection name */
	    _getName : function(){
	        return _.escape( this.$( '.collection-name' ).val() );
	    },
	
	    /** attempt to create the current collection */
	    _clickCreate : function( ev ){
	        var name = this._getName();
	        if( !name ){
	            this._validationWarning( 'name' );
	        } else if( !this.blocking ){
	            this.createList();
	        }
	    },
	
	    // ------------------------------------------------------------------------ misc
	    /** debug a dataset list */
	    _printList : function( list ){
	        var creator = this;
	        _.each( list, function( e ){
	            if( list === creator.paired ){
	                creator._printPair( e );
	            } else {
	                //creator.debug( e );
	            }
	        });
	    },
	
	    /** print a pair Object */
	    _printPair : function( pair ){
	        this.debug( pair.forward.name, pair.reverse.name, ': ->', pair.name );
	    },
	
	    /** string rep */
	    toString : function(){ return 'PairedCollectionCreator'; }
	});
	
	
	//TODO: move to require text plugin and load these as text
	//TODO: underscore currently unnecc. bc no vars are used
	//TODO: better way of localizing text-nodes in long strings
	/** underscore template fns attached to class */
	PairedCollectionCreator.templates = PairedCollectionCreator.templates || {
	
	    /** the skeleton */
	    main : _.template([
	        '<div class="header flex-row no-flex"></div>',
	        '<div class="middle flex-row flex-row-container"></div>',
	        '<div class="footer flex-row no-flex">'
	    ].join('')),
	
	    /** the header (not including help text) */
	    header : _.template([
	        '<div class="main-help well clear">',
	            '<a class="more-help" href="javascript:void(0);">', _l( 'More help' ), '</a>',
	            '<div class="help-content">',
	                '<a class="less-help" href="javascript:void(0);">', _l( 'Less' ), '</a>',
	            '</div>',
	        '</div>',
	        '<div class="alert alert-dismissable">',
	            '<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>',
	            '<span class="alert-message"></span>',
	        '</div>',
	
	        '<div class="column-headers vertically-spaced flex-column-container">',
	            '<div class="forward-column flex-column column">',
	                '<div class="column-header">',
	                    '<div class="column-title">',
	                        '<span class="title">', _l( 'Unpaired forward' ), '</span>',
	                        '<span class="title-info unpaired-info"></span>',
	                    '</div>',
	                    '<div class="unpaired-filter forward-unpaired-filter pull-left">',
	                        '<input class="search-query" placeholder="', _l( 'Filter this list' ), '" />',
	                    '</div>',
	                '</div>',
	            '</div>',
	            '<div class="paired-column flex-column no-flex column">',
	                '<div class="column-header">',
	                    '<a class="choose-filters-link" href="javascript:void(0)">',
	                        _l( 'Choose filters' ),
	                    '</a>',
	                    '<a class="clear-filters-link" href="javascript:void(0);">',
	                        _l( 'Clear filters' ),
	                    '</a><br />',
	                    '<a class="autopair-link" href="javascript:void(0);">',
	                        _l( 'Auto-pair' ),
	                    '</a>',
	                '</div>',
	            '</div>',
	            '<div class="reverse-column flex-column column">',
	                '<div class="column-header">',
	                    '<div class="column-title">',
	                        '<span class="title">', _l( 'Unpaired reverse' ), '</span>',
	                        '<span class="title-info unpaired-info"></span>',
	                    '</div>',
	                    '<div class="unpaired-filter reverse-unpaired-filter pull-left">',
	                        '<input class="search-query" placeholder="', _l( 'Filter this list' ), '" />',
	                    '</div>',
	                '</div>',
	            '</div>',
	        '</div>'
	    ].join('')),
	
	    /** the middle: unpaired, divider, and paired */
	    middle : _.template([
	        // contains two flex rows (rows that fill available space) and a divider btwn
	        '<div class="unpaired-columns flex-column-container scroll-container flex-row">',
	            '<div class="forward-column flex-column column">',
	                '<ol class="column-datasets"></ol>',
	            '</div>',
	            '<div class="paired-column flex-column no-flex column">',
	                '<ol class="column-datasets"></ol>',
	            '</div>',
	            '<div class="reverse-column flex-column column">',
	                '<ol class="column-datasets"></ol>',
	            '</div>',
	        '</div>',
	        '<div class="flexible-partition">',
	            '<div class="flexible-partition-drag" title="', _l( 'Drag to change' ), '"></div>',
	            '<div class="column-header">',
	                '<div class="column-title paired-column-title">',
	                    '<span class="title"></span>',
	                '</div>',
	                '<a class="unpair-all-link" href="javascript:void(0);">',
	                    _l( 'Unpair all' ),
	                '</a>',
	            '</div>',
	        '</div>',
	        '<div class="paired-columns flex-column-container scroll-container flex-row">',
	            '<ol class="column-datasets"></ol>',
	        '</div>'
	    ].join('')),
	
	    /** creation and cancel controls */
	    footer : _.template([
	        '<div class="attributes clear">',
	            '<div class="clear">',
	                '<label class="remove-extensions-prompt pull-right">',
	                    _l( 'Remove file extensions from pair names' ), '?',
	                    '<input class="remove-extensions pull-right" type="checkbox" />',
	                '</label>',
	            '</div>',
	            '<div class="clear">',
	                '<input class="collection-name form-control pull-right" ',
	                    'placeholder="', _l( 'Enter a name for your new list' ), '" />',
	                '<div class="collection-name-prompt pull-right">', _l( 'Name' ), ':</div>',
	            '</div>',
	        '</div>',
	
	        '<div class="actions clear vertically-spaced">',
	            '<div class="other-options pull-left">',
	                '<button class="cancel-create btn" tabindex="-1">', _l( 'Cancel' ), '</button>',
	                '<div class="create-other btn-group dropup">',
	                    '<button class="btn btn-default dropdown-toggle" data-toggle="dropdown">',
	                          _l( 'Create a different kind of collection' ),
	                          ' <span class="caret"></span>',
	                    '</button>',
	                    '<ul class="dropdown-menu" role="menu">',
	                          '<li><a href="#">', _l( 'Create a <i>single</i> pair' ), '</a></li>',
	                          '<li><a href="#">', _l( 'Create a list of <i>unpaired</i> datasets' ), '</a></li>',
	                    '</ul>',
	                '</div>',
	            '</div>',
	
	            '<div class="main-options pull-right">',
	                '<button class="create-collection btn btn-primary">', _l( 'Create list' ), '</button>',
	            '</div>',
	        '</div>'
	    ].join('')),
	
	    /** help content */
	    helpContent : _.template([
	        '<p>', _l([
	            'Collections of paired datasets are ordered lists of dataset pairs (often forward and reverse reads). ',
	            'These collections can be passed to tools and workflows in order to have analyses done on each member of ',
	            'the entire group. This interface allows you to create a collection, choose which datasets are paired, ',
	            'and re-order the final collection.'
	        ].join( '' )), '</p>',
	        '<p>', _l([
	            'Unpaired datasets are shown in the <i data-target=".unpaired-columns">unpaired section</i> ',
	            '(hover over the underlined words to highlight below). ',
	            'Paired datasets are shown in the <i data-target=".paired-columns">paired section</i>.',
	            '<ul>To pair datasets, you can:',
	                '<li>Click a dataset in the ',
	                    '<i data-target=".unpaired-columns .forward-column .column-datasets,',
	                                    '.unpaired-columns .forward-column">forward column</i> ',
	                    'to select it then click a dataset in the ',
	                    '<i data-target=".unpaired-columns .reverse-column .column-datasets,',
	                                    '.unpaired-columns .reverse-column">reverse column</i>.',
	                '</li>',
	                '<li>Click one of the "Pair these datasets" buttons in the ',
	                    '<i data-target=".unpaired-columns .paired-column .column-datasets,',
	                                    '.unpaired-columns .paired-column">middle column</i> ',
	                    'to pair the datasets in a particular row.',
	                '</li>',
	                '<li>Click <i data-target=".autopair-link">"Auto-pair"</i> ',
	                    'to have your datasets automatically paired based on name.',
	                '</li>',
	            '</ul>'
	        ].join( '' )), '</p>',
	        '<p>', _l([
	            '<ul>You can filter what is shown in the unpaired sections by:',
	                '<li>Entering partial dataset names in either the ',
	                    '<i data-target=".forward-unpaired-filter input">forward filter</i> or ',
	                    '<i data-target=".reverse-unpaired-filter input">reverse filter</i>.',
	                '</li>',
	                '<li>Choosing from a list of preset filters by clicking the ',
	                    '<i data-target=".choose-filters-link">"Choose filters" link</i>.',
	                '</li>',
	                '<li>Entering regular expressions to match dataset names. See: ',
	                    '<a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions"',
	                        ' target="_blank">MDN\'s JavaScript Regular Expression Tutorial</a>. ',
	                    'Note: forward slashes (\\) are not needed.',
	                '</li>',
	                '<li>Clearing the filters by clicking the ',
	                    '<i data-target=".clear-filters-link">"Clear filters" link</i>.',
	                '</li>',
	            '</ul>'
	        ].join( '' )), '</p>',
	        '<p>', _l([
	            'To unpair individual dataset pairs, click the ',
	                '<i data-target=".unpair-btn">unpair buttons ( <span class="fa fa-unlink"></span> )</i>. ',
	            'Click the <i data-target=".unpair-all-link">"Unpair all" link</i> to unpair all pairs.'
	        ].join( '' )), '</p>',
	        '<p>', _l([
	            'You can include or remove the file extensions (e.g. ".fastq") from your pair names by toggling the ',
	                '<i data-target=".remove-extensions-prompt">"Remove file extensions from pair names?"</i> control.'
	        ].join( '' )), '</p>',
	        '<p>', _l([
	            'Once your collection is complete, enter a <i data-target=".collection-name">name</i> and ',
	            'click <i data-target=".create-collection">"Create list"</i>. ',
	            '(Note: you do not have to pair all unpaired datasets to finish.)'
	        ].join( '' )), '</p>'
	    ].join(''))
	};
	
	
	//=============================================================================
	/** a modal version of the paired collection creator */
	var pairedCollectionCreatorModal = function _pairedCollectionCreatorModal( datasets, options ){
	
	    var deferred = jQuery.Deferred(),
	        creator;
	
	    options = _.defaults( options || {}, {
	        datasets    : datasets,
	        oncancel    : function(){
	            Galaxy.modal.hide();
	            deferred.reject( 'cancelled' );
	        },
	        oncreate    : function( creator, response ){
	            Galaxy.modal.hide();
	            deferred.resolve( response );
	        }
	    });
	
	    if( !window.Galaxy || !Galaxy.modal ){
	        throw new Error( 'Galaxy or Galaxy.modal not found' );
	    }
	
	    creator = new PairedCollectionCreator( options );
	    Galaxy.modal.show({
	        title   : 'Create a collection of paired datasets',
	        body    : creator.$el,
	        width   : '80%',
	        height  : '800px',
	        closing_events: true
	    });
	    creator.render();
	    window.creator = creator;
	
	    //TODO: remove modal header
	    return deferred;
	};
	
	
	//=============================================================================
	function createListOfPairsCollection( collection ){
	    var elements = collection.toJSON();
	//TODO: validate elements
	    return pairedCollectionCreatorModal( elements, {
	        historyId : collection.historyId
	    });
	}
	
	
	//=============================================================================
	    return {
	        PairedCollectionCreator : PairedCollectionCreator,
	        pairedCollectionCreatorModal : pairedCollectionCreatorModal,
	        createListOfPairsCollection : createListOfPairsCollection
	    };
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! libs/backbone */ 2), __webpack_require__(/*! underscore */ 1), __webpack_require__(/*! jquery */ 3), __webpack_require__(/*! jquery */ 3)))

/***/ },
/* 98 */
/*!*********************************************!*\
  !*** ./galaxy/scripts/utils/levenshtein.js ***!
  \*********************************************/
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	], __WEBPACK_AMD_DEFINE_RESULT__ = function(){
	//=============================================================================
	/**
	(Imported for edit distance algorith. From: https://gist.github.com/andrei-m/982927)
	Copyright (c) 2011 Andrei Mackenzie
	
	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
	documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
	rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit
	persons to whom the Software is furnished to do so, subject to the following conditions:
	
	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
	Software.
	
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
	WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
	COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
	*/
	// Compute the edit distance between the two given strings
	//exports.getEditDistance = function(a, b){
	function levenshteinDistance(a, b){
	  if(a.length === 0){ return b.length; }
	  if(b.length === 0){ return a.length; }
	
	  var matrix = [];
	
	  // increment along the first column of each row
	  var i;
	  for(i = 0; i <= b.length; i++){
	    matrix[i] = [i];
	  }
	
	  // increment each column in the first row
	  var j;
	  for(j = 0; j <= a.length; j++){
	    matrix[0][j] = j;
	  }
	
	  // Fill in the rest of the matrix
	  for(i = 1; i <= b.length; i++){
	    for(j = 1; j <= a.length; j++){
	      if(b.charAt(i-1) === a.charAt(j-1)){
	        matrix[i][j] = matrix[i-1][j-1];
	      } else {
	        matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, // substitution
	                                Math.min(matrix[i][j-1] + 1, // insertion
	                                         matrix[i-1][j] + 1)); // deletion
	      }
	    }
	  }
	
	  //console.debug( '\t\t levenshteinDistance', a, b, matrix[b.length][a.length] );
	  return matrix[b.length][a.length];
	}
	
	//=============================================================================
	    return levenshteinDistance;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }
]);
//# sourceMappingURL=analysis.bundled.js.map