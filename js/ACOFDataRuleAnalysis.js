var ACOFDataRuleAnalysis = Class.create();
ACOFDataRuleAnalysis.prototype = {
	initialize : function () {
	},
	
	getKeys : function (stageTableName, acofSource, acofTarget, ruleSource) {
		//When the source is transform, i.e. here. We need to give the source record the current list of what has been used by orig
		//If SN recieves a blank field in a transform, it will leave in old data, therefore this field can never be blank, so we put this 'not blank' tag in
		return this.getRules(stageTableName, acofSource, acofTarget, 'transform', 'key_field');
	},
	
	getRules : function (stageTableName, acofSource, acofTarget, ruleSource, specificRule) {
		//Reporting item list - used to store the result of each rule test
		//The entire list will be passed via an event when all rules have finished running
		var reportingItemList = {
			domain: '' + acofSource.sys_domain,
			staging_table: '' + stageTableName,
			record_id: '' + acofSource.sys_id,
			result: []
		};
		
		// Get Rules data analysis function.
		// Requests all the data rule analysis required to score stage records
		// This function is called from business rules on stage record update
		//
		// stageTableName:
		//   type: String
		//   desc: Name of the stage table under analysis
		// acofSource:
		//   type: Object
		//   desc: The source record to be analysed
		// acofTarget:
		//   type: Object
		//   desc: The target record to be analysed
		// ruleSource:
		//   type: String
		//   desc: The source function requesting analysis
		//         Blank assumes Business Rule
		//         A value of 'transform' ACOFDataRuleAnalysishen being called from a transform
		//         ACOFDataRuleAnalysishen using a transform the source item uses different field names
		
		// Skip data analysis
		//return true;
		//Retrieve the Data Rules object for the specified table
		var record_ok = true;
		var failCount = 0;
		var failList = "";
		var failStatus = "";
		var failSeparator = "";
		var scratchpad = {};
		
		/*
		if (acofSource.u_acof_stub == true){
			// Do not process rules for a stub
			acofTarget.u_acof_fail_count = 0;
			acofTarget.u_acof_fail_list = 'This is a stub';
			acofTarget.u_acof_status = "Bad";
			acofTarget.u_acof_analyzer = gs.getUserID();
			acofTarget.u_acof_analyzed = gs.nowDateTime();
			acofTarget.u_acof_scratchpad = 'This ia a stub';
			return record_ok;
		}
		*/
		
		var rules = new GlideRecord('u_acof_data_rule_definition');
		
		//rules.addQuery('u_stage_table_name.name', stageTableName);
        rules.addQuery('u_staging_table', stageTableName);
		
		if (typeof specificRule == 'string' && specificRule.length != 0) {
			rules.addQuery('u_rule_type', specificRule);
		}
		
		rules.addQuery('u_active', true);
		rules.orderBy('u_order');
		rules.query();
		//.log('1. Rules EQ = https://atosglobaldev.service-now.com/u_acof_data_rule_definition_list.do?sysparm_query=' + rules.getEncodedQuery(),'ACOFOrigJDFixRR');
		
		this._debug('1. Rules EQ = https://atosglobaldev.service-now.com/u_acof_data_rule_definition_list.do?sysparm_query=' + rules.getEncodedQuery());
		
		while (rules.next()) {
			var ruleType = rules.u_rule_type;
			//var tableName = rules.u_stage_table_name.name;
            var tableName = rules.u_staging_table;
			//var columnName = rules.u_column_name.element;
			var columnName = rules.u_column;
			//var columnLabel = rules.u_column_name.column_label;
			var columnLabel = rules.u_safe_name;
			var domainName = rules.sys_domain.name;
			var fieldValue = acofSource[columnName];
			var order = rules.u_order.toString();
			
			//var testValue = this[ruleType](fieldValue);
			//
			// Data Rule Function format expect
			// rule_object, source_record, destination_record, scratchpad
			//
				//.log('1.5. Testing rule... ' + tableName + ':' + columnName + ':' + domainName + ':' + ruleType + ':' + JSON.stringify(AnalyzedRule),'ACOFOrigJDFixRR');
				var AnalyzedRule = this[ruleType](rules, acofSource, acofTarget, scratchpad, ruleSource);
				//.log('2. Testing rule... ' + tableName + ':' + columnName + ':' + domainName + ':' + ruleType + ':' + JSON.stringify(AnalyzedRule),'ACOFOrigJDFixRR');
				this._debug('2. Testing rule... ' + tableName + ':' + columnName + ':' + domainName + ':' + ruleType + ':' + JSON.stringify(AnalyzedRule));
				
				var failMessage = '';
				
				if (AnalyzedRule.test == false) {
					failCount++;
					
					failMessage = columnLabel + "(" + ruleType + ':' + AnalyzedRule.message + ")";
					failList = failList + failSeparator + failMessage;
					failSeparator = "\n";
				}
				
				if (AnalyzedRule.reject == true) {
					record_ok = false;
				}
				
				//Update the ACOF reporting table
				var reportingItem = {
					failure_comments: '' + failMessage,
					rule_id: '' + rules.sys_id,
					rule_passed: AnalyzedRule.test
				};
				
				reportingItemList.result.push(reportingItem);
		}
		
		/*
		acofTarget.u_acof_fail_count = failCount;
		acofTarget.u_acof_fail_list = failList;
		acofTarget.u_acof_status = (failCount > 0) ? "Bad" : "Good";
		acofTarget.u_acof_analyzer = gs.getUserID();
		acofTarget.u_acof_analyzed = gs.nowDateTime();
		
		acofTarget.u_acof_scratchpad = JSON.stringify(scratchpad, null, '\t');
		//acofTarget.u_acof_status = log_type;
		*/
		
		//If fail count is zero reset the stub flag
		if(failCount == 0) {
			acofTarget.u_acof_stub = false;
		}
		
		//Fire an event if the staging table record has been updated
		gs.eventQueue("acof.st_record.updated", current, stageTableName , acofSource.sys_id);
		
		//Pass the reporting data to the ACOFReportingHelper script include
		reportingItemList.fail_count = failCount;
		
		this._debug('RI_1. reportingItemList = ' + JSON.stringify(reportingItemList));
		
		var reportingItemId = new ACOFReportingHelper().updateReportingItems(reportingItemList);
		
		acofTarget.u_acof_record_status = reportingItemId;
		acofTarget.u_acof_report_url = 'https://' + gs.getProperty('instance_name') + '.service-now.com/u_acof_reporting_item.do?sys_id=' + reportingItemId;
		
		return record_ok;
	},
	
	transform : function (stageTableName, acofSource, acofTarget) {
		return true;
	},
	
	transformSource : function (label) {
		// Strip the label in the same ACOFDataRuleAnalysisay SN creates column names on template load
		return "u_" + label.toLowerCase()
		.replace(/[^\w]/gi, ' ')
		.trim()
		.replace(/\s\s+/g, ' ', " ")
		.replace(/ /g, "_");
	},
	
	ruleField : function (rule, source) {
		// Get the column name to manipulate in the object
		// Business Rules use the stage record.. element is used for this
		// Transform use the load record.. on source manipulated label is used for this
		var columnName = "";
		
        /*
		if (source != "transform") {
			columnName = columnObject.element.toString();
		} else {
			columnName = this.transformSource(columnObject.column_label.toString());
		}
        */

        var ruleColumn = rule.u_column;
        var stagingTable = rule.u_staging_table;

        //Updated to take account of the column field changing from a reference to a string
        this._debug('RF_1. source = ' + source + ', ruleColumn = ' + ruleColumn + ', stagingTable = ' + stagingTable);

        if (source != "transform") {
            columnName = ruleColumn;
		} else {
			//Get the safe name from the stage item
            var grSI = new GlideRecord('u_acof_data_stage_items');

            grSI.addQuery('u_staging_table', stagingTable);
            grSI.addQuery('u_column', ruleColumn);
            grSI.addQuery();
            grSI.query();

            if(grSI.next()) {
                //Now use the safe name of the stage item to query the dictionary for the load table column
                var loadTable = stagingTable.replace('u_acof_st_', 'u_acof_ld_');

                var grD = new GlideRecord('sys_dictionary');

                grD.addQuery('name', loadTable);
                grD.addQuery('column_label', grSI.u_safe_name);
                grD.query();

                this._debug('RF_2. grD EQ = https://atosglobaldev.service-now.com/sys_dictionary_list.do?sysparm_query=' + grD.getEncodedQuery());
		
                if(grD.next()) {
                    columnName = grD.element;
                }
            }
		}

        this._debug('RF_3. Returning from ruleField function. Column = ' + columnName);
				
		return columnName;
	},
	
	mandatory : function (rule, sRecord, dRecord, scratch, source) {
		this._debug('M_1. In mandatory rule...');
		
		// Mandatory field analysis only checks that content is provided in the specified column
		//var rule_column_name = this.ruleField(rule.u_column_name, source);
        var rule_column_name = this.ruleField(rule, source);
		var scratch_column_name = rule.u_scratchpad_name;
		var response = {
			test : true,
			reject : false,
			message : "",
			value : ""
		};
		
		this._debug('M_2. Checking mandatory: ' + rule_column_name);
		
		var columnType = sRecord[rule_column_name].getED().getInternalType();
		
		this._debug('M_3. columnType: ' + columnType);

		if (columnType == 'boolean' && (sRecord[rule_column_name] == true || sRecord[rule_column_name] == false)){
			response.test = true;
		}
		else if ((typeof sRecord[rule_column_name] == "undefined") || typeof sRecord[rule_column_name] == null || sRecord[rule_column_name] == "") {
			this._debug('M_3a. Mandatory field ' + rule_column_name + ' is empty. Fail');
			
			response.test = false;
		}

		this._debug('M_4. Returning from mandatory rule for ' + rule_column_name + ' = ' + JSON.stringify(response));
		
		return response;
	},
	
	key_field : function (rule, sRecord, dRecord, scratch, source) {
		// Mandatory field analysis only checks that content is provided in the specified column
		//var rule_column_name = this.ruleField(rule.u_column_name, source);
        var rule_column_name = this.ruleField(rule, source);
		//var rule_table_name = rule.u_stage_table_name.name;
        var rule_table_name = rule.u_staging_table;
		var scratch_column_name = rule.u_scratchpad_name;
		var response = {
			test : true,
			reject : false,
			message : "",
			value : ""
		};

        this._debug('KF_1. In key_field... rule_column_name = ' + rule_column_name + ', rule_table_name = ' + rule_table_name);
		
		if (rule_column_name === 'u_domain' ||
			typeof sRecord[rule_column_name] === 'boolean' ||
		(typeof sRecord[rule_column_name] === 'object' &&
		typeof sRecord[rule_column_name].valueOf() === 'boolean')) {
			response.test = true;
			response.reject = false;
			
			this._debug('KF_2. ACOFtrans accept key_field in ' + rule_table_name + ' for column ' + rule_column_name + ' value of ' + sRecord[rule_column_name]);
			
		} else if ((typeof sRecord[rule_column_name] == "undefined") ||
		typeof sRecord[rule_column_name] == null ||
		sRecord[rule_column_name] == "" ||
		sRecord[rule_column_name].length < 1
		) {
			response.test = true;
			response.reject = true;
			
			this._debug('KF_3. ACOFtrans reject key_field in ' + rule_table_name + ' for column ' + rule_column_name + ' value of ' + sRecord[rule_column_name]);
		}
		
		return response;
	},
	
	default_value : function (rule, sRecord, dRecord, scratch, source) {
		// Default field analysis only checks that content is provided in the specified column
		//var rule_column_name = this.ruleField(rule.u_column_name, source);
        var rule_column_name = this.ruleField(rule, source);
		var scratch_column_name = rule.u_scratchpad_name;
		var default_value = rule.u_value_1;
		var response = {
			test : true,
			reject : false,
			message : "",
			value : ""
		};

		this._debug('DV_1. Checking mandatory: ' + rule_column_name);
		
		if (typeof sRecord[rule_column_name] === 'boolean' ||
			(typeof sRecord[rule_column_name] === 'object' &&
		typeof sRecord[rule_column_name].valueOf() === 'boolean')) {
			response.test = true;
		} else if ((typeof sRecord[rule_column_name] == "undefined") ||
		typeof sRecord[rule_column_name] == null ||
		sRecord[rule_column_name] == "") {
			sRecord[rule_column_name] = default_value;
			response.test = true;
		}
		
		// Recheck column to ensure a default value is given
		if ((typeof sRecord[rule_column_name] == "undefined") ||
			typeof sRecord[rule_column_name] == null ||
		sRecord[rule_column_name] == "") {
			response.message = ":Default Value! Not provided";
			response.test = false;
		}
		
		return response;
	},
	
	extract_value : function (rule, sRecord, dRecord, scratch, source) {
		//var rule_column_name = this.ruleField(rule.u_column_name, source);
        var rule_column_name = this.ruleField(rule, source);
		var scratch_column_name = rule.u_scratchpad_name;
		var response = {
			test : true,
			reject : false,
			message : "",
			value : ""
		};
		
		var pattern = rule.u_value_1; //Example: /([^|]*)\|.*/
		
		var testValue = sRecord[rule_column_name];
		
		this._debug('EV_1. Extract column: ' + rule_column_name + ': Scratch: ' + scratch_column_name + ': Pattern: ' + pattern + ': Value: ' + testValue);
		
		//Return if pattern is empty or if column name and scratchpad name are empty
		if(pattern.nil() || (rule_column_name.nil() && scratch_column_name.nil())) {
			return response;
		}
		
		var r = new SNC.Regex(pattern);
		
		var result = r.match(testValue);
		
		this._debug('EV_2. Extract regex: "' + rule.u_value_1 + '" - Value: ' + testValue + ', Result: ' + result);
		
		if(!result.nil()) {
			//dRecord[rule_column_name] = result[1];
			
			if(!scratch_column_name.nil()) {		
				this._debug('EV_3. Extract result: "' + result[1] + '" - ScratchColumnName: ' + scratch_column_name);
				scratch[scratch_column_name] = result[1];
				dRecord.u_acof_scratchpad =  JSON.stringify(scratch);
			}
		}
		else {
			response.test = false;
			response.message = 'could not extract data using pattern';
		}
		
		return response;
	},
	
	relationship_check : function (rule, sRecord, dRecord, scratch, source) {
		//var rule_column_name = this.ruleField(rule.u_column_name, source);
        var rule_column_name = this.ruleField(rule, source);
		var scratch_column_name = rule.u_scratchpad_name;
		var response = {
			test : true,
			reject : false,
			message : "",
			value : ""
		};
		
		var lookupTable = rule.u_value_1.trim();
		var lookupColumn = rule.u_value_2.trim();
		var lookupValue = null;
		var lookupName = null;
		
		if(rule_column_name != "" && rule_column_name != null){
			lookupName = rule_column_name;
			lookupValue = sRecord[rule_column_name];
		} else if(scratch_column_name != ""){
			lookupName = scratch_column_name;
			lookupValue = scratch[scratch_column_name];
		}
		
		this._debug('RC_1. Relationship Check Column: ' + rule_column_name + ': Scratch: ' + scratch_column_name + ': Lookup: ' + lookupTable + ': lookupColumn: ' + lookupColumn);
		
		if(lookupTable != "" && lookupColumn != "" && lookupValue != ""){
			var grRC = new GlideRecord(lookupTable);
			grRC.addQuery(lookupColumn, lookupValue);
			grRC.query();
			
			this._debug('RC_2. Querying ' + lookupTable + ': https://' + gs.getProperty('instance_name') + '.service-now.com/' + lookupTable + '_list.do?sysparm_query=' + grRC.getEncodedQuery());
			
			if(grRC.next()){
				this._debug('RC_3. Querying: ' + lookupValue + ' Found. ' + grRC.sys_id.toString());

				response.test = true; //Value found
			} else {
				this._debug('RC_4. Querying: ' + lookupValue + ' Missing.');

				response.test = false; //Not not found, reject the test
				response.message = lookupName + ' of ' + lookupValue + ' is not in ' + lookupTable ;
			}
			
		} else {
			this._debug('RC_5. Querying: ' + lookupValue + ' Missing search values.');

			response.test = false; //Not not found, reject the test
			response.message = ' No Table, Column in the Rule Values ';
		}
		
		return response;
	},
	
	//Called by a transform map script
	check_stub : function (domain, lookupTable, lookupField, value) {
		/**
		The check stub function will return a sys_id
		
		Firstly it will try to find the related record if found the sys_id is returned
		if not found then a stub will be created and the sysid returned
			
 		**/
		
		//.log('CS_1. Domain: ' + domain + ', Lookup Table: ' + lookupTable + ', Lookup Field: ' + lookupField + ', Value: ' + value, 'ACOFDataRuleAnalysis');
		
		this._debug('CS_1. Domain: ' + domain + ', Lookup Table: ' + lookupTable + ', Lookup Field: ' + lookupField + ', Value: ' + value);
		
		var recordId = '';
		
		if (domain == '' || lookupTable == '' || lookupField == '' || value == '') {
			return recordId;
		}
		
		// Loop through the columns array
		var columns = lookupField.split(',');
		var arrayLength = columns.length;
		for (var i = 0; i < arrayLength; i++) {
			
			var grCS = new GlideRecord(lookupTable);
			grCS.addQuery('sys_domain', domain);
			grCS.addQuery(columns[i], value);
			grCS.query();

			this._debug('CS_2. Querying ' + lookupTable + ': https://' + gs.getProperty('instance_name') + '.service-now.com/' + lookupTable + '_list.do?sysparm_query=' + grCS.getEncodedQuery());
			
			if(grCS.next()) {
				//Record found, return the sys_id
				recordId = '' + grCS.sys_id;
				
				this._debug('CS_3. Found an existing record, returning: ' + recordId);
				
				i = arrayLength;
			}
		}
		
		var checkType = typeof recordId;
		
		this._debug('CS_4. Record Id: ' + checkType);
		
		//if(recordId.nil() || checkType == 'undefined') {
		if(recordId == '' || checkType == 'undefined') {
			//Record not found, create a stub record and return the sys_id
			this._debug('CS_5. Record not found, creating a stub:');
			
			var grCS2 = new GlideRecord(lookupTable);
			
			grCS2.initialize();
			
			grCS2[columns[0]] = value;
			grCS2.u_acof_stub = true;
			grCS2.sys_domain = domain;
			recordId = grCS2.insert();
		}
		
		return recordId;
	},
	
	/*
 	*	Handles the loading of 'multiple relationships'
 	*	For example Location has to be "key'd" from County Country & City
 	*
 	*	tableName - the table where the reference will be found    (i.e. u_acof_st_cmn_location)
 	*	keyList - the list of 'keys' to find the correct field     (i.e. [Orlando, Florida, USA])
 	*	fieldList - the list of fields that need to match the keys (i.e. [City,    State,   Country])
 	*	scratch - scratchpad
 	*	source - the source provided by the template - (probs unused - might remove it)
 	*
 	*/
	relationship_multi_key: function(tableName, keyList, fieldList, scratch, source){
		//placeholder
		//Pass rule by default
		
		//--pseudocode--
		//new gliderecord from tableName
		//for every field we need to fine the key value
		//if there's one value -- return it as a magical thingy
		
		var response = {
			test : true,
			reject : false,
			message : "",
			value : ""
		};
		
		return response;
	},
	
	relationship_stub : function (rule, sRecord, dRecord, scratch, source) {
		//Pass rule by default
		var response = {
			test : true,
			reject : false,
			message : "",
			value : ""
		};
		
		return response;
	},
	
	structure_check : function (rule, sRecord, dRecord, scratch, source) {
		//var rule_column_name = this.ruleField(rule.u_column_name, source);
        var rule_column_name = this.ruleField(rule, source);
		var scratch_column_name = rule.u_scratchpad_name;
		var response = {
			test : true,
			reject : false,
			message : "",
			value : ""
		};
		
		var pattern = rule.u_value_1; //Example: /\d+/
		var testValue = sRecord[rule_column_name];
		
		if(pattern.nil() || testValue.nil()) {
			return response;
		}
		
		var r = new SNC.Regex(pattern);
		
		if(!r.match(testValue)) {
			response.test = false;
			response.message = 'value does not match pattern';
		}
		
		return response;
	},
	
	validate_list : function (rule, sRecord, dRecord, scratch, source) {
		//var rule_column_name = this.ruleField(rule.u_column_name, source);
        var rule_column_name = this.ruleField(rule, source);
		var scratch_column_name = rule.u_scratchpad_name;
		var response = {
			test : true,
			reject : false,
			message : "",
			value : ""
		};
		
		//var stagingTableName = rule.u_stage_table_name.name;
        var stagingTableName = rule.u_staging_table;
		var lookupValue = null;
		var lookupName = null;
		var list = rule.u_list;
		
		if(rule_column_name != "" && rule_column_name != null){
			lookupName = rule_column_name;
			lookupValue = sRecord[rule_column_name];
			this._debug('VL_1. Validate List: Lookup Column ' + rule_column_name);
		} else if(scratch_column_name != ""){
			lookupName = scratch_column_name;
			lookupValue = scratch[scratch_column_name];
			this._debug('VL_1. Validate List: Lookup Scratch ' + rule_column_name);
		}
		
		//Don't run the rule if the lookup value is empty
		if(lookupValue.nil()) {
			return response;
		}
		
		if(list != ""){
			// validate a comma list
			this._debug('VL_1. Validate List: Comma List Check: Column: ' + rule_column_name + ': Scratch: ' + scratch_column_name + ': Lookup: ' + lookupValue);
			
			var listArray =  list.split(',');
			var listLength = listArray.length;
			var listMatch = false;
			
			for (var i = 0; i < listLength; i++) {
				//Check for match
				if(lookupValue == listArray[i]){
					listMatch = true;
				}
			}
			
			
			if(!listMatch) {
				response.test = false; //Choice not found, reject the test
				response.message = lookupName + ' of ' + lookupValue + ' is not a list member' ;
			}
			
		} else {
			// validate a choicelist
			this._debug('VL_2. Validate List: Choice List Check: Column: ' + rule_column_name + ': Scratch: ' + scratch_column_name + ': Lookup: ' + lookupValue);
			
			//Get the choice type from the dictonary
			
			var grSTN = new GlideRecord('sys_dictionary');
			
			grSTN.addQuery('name', stagingTableName);
			grSTN.addQuery('element', rule_column_name);
			grSTN.query();
			
			this._debug('VL_3. Dictionary query: https://atosglobaldev.service-now.com/sys_dictionary_list.do?sysparm_query=' + grSTN.getEncodedQuery());
			
			if(grSTN.next()) {
				if(grSTN.internal_type == 'choice') {
					//Strip the staging table prefix as choice values are on production tables
					var stagingTableName_r = stagingTableName.replace('u_acof_st_', '');
					
					//Choice values are defined on the sys_choice table, filtered by table and field
					var grSC = new GlideRecord('sys_choice');
					
					grSC.addQuery('name', stagingTableName_r);
					grSC.addQuery('element', rule_column_name);
					grSC.addQuery('inactive', false);
					grSC.addQuery('value', lookupValue);
					grSC.query();
					
					this._debug('VL_4. Sys_choice query: https://atosglobaldev.service-now.com/sys_choice_list.do?sysparm_query=' + grSC.getEncodedQuery());
					
					if(!grSC.next()) {
						response.test = false; //Choice not found, reject the test
						response.message = lookupName + ' of ' + lookupValue + ' is not a list member' ;
					}
				}
				else if(grSTN.internal_type == 'string' && !grSTN.choice.nil()) {
					//Choice can be anything except --None--
					//Choice values are stored on an alternative table, and referenced in the dictonary entry
					var grSC_2 = new GlideRecord(grSTN.choice_table);
				
				grSC_2.addQuery(grSTN.choice_field, lookupValue);
				grSC_2.query();
				
				this._debug('VL_5. Sys_choice query: https://atosglobaldev.service-now.com/' + grSTN.choice_table + '_list.do?sysparm_query=' + grSC_2.getEncodedQuery());
				
				if(!grSC_2.next()) {
					response.test = false; //Choice not found, reject the test
					response.message = lookupName + ' of ' + lookupValue + ' is not a list member' ;
				}
			}
		}
	}
	
	return response;
},

boolean_check : function (rule, sRecord, dRecord, scratch, source) {
	//var rule_column_name = this.ruleField(rule.u_column_name, source);
    var rule_column_name = this.ruleField(rule, source);
	var scratch_column_name = rule.u_scratchpad_name;
	var response = {
		test : true,
		reject : false,
		message : "",
		value : ""
	};
	//this._debug('checking boolean: ' + rule_column_name + '(Not Implemented Yet!)');
	
	var resRec = sRecord[rule_column_name].toString().toLowerCase().trim() ;
	if (resRec === true || resRec == 'true' || resRec == 'yes' || resRec == 'y') {
		//acofTarget[rule_column_name] = true;
		dRecord[rule_column_name] = true;
	} else {
		//acofTarget[rule_column_name] = false;
		dRecord[rule_column_name] = false;
	}
	
	
	response.test = true;
	return response;
},

test_bool: function(testValue){
	testValue = testValue.toString().toLowerCase().trim();

	if (testValue === true || testValue == 'true' || testValue == 'yes') {
		return true;
	}

	return false;
},

concatenate_columns : function (rule, sRecord, dRecord, scratch, source) {
	//var rule_column_name = this.ruleField(rule.u_column_name, source);
    var rule_column_name = this.ruleField(rule, source);
	var scratch_column_name = rule.u_scratchpad_name;
	var response = {
		test : true,
		reject : false,
		message : "",
		value : ""
	};
	var concat_list = [];
	var concat_good = true;
	
	// Rule u_parameters_values contains a json object
	var separator = rule.u_separator;
	var columns = rule.u_list.split(',');
	
	// We must expect the valiables separator and columns so test for them
	// Validate rule_params contains separator
	if (typeof separator == "undefined") {
		response.test = false;
		response.message = ":Contact Support! Separator not declared in Rule";
		return response;
	}
	// Validate rule_params contains columns
	if (typeof columns == "undefined") {
		response.test = false;
		response.message = ":Contact Support! Columns not declared in Rule";
		return response;
	}
	// Validate rule_params columns is an array
	if (!this.isArray(columns)) {
		response.test = false;
		response.message = ":Contact Support! Column Array not declared Rule";
		return response;
	}
	
	// Loop through the columns array
	var arrayLength = columns.length;
	for (var i = 0; i < arrayLength; i++) {
		var param = columns[i];
		
		if (param[0] == "[") {
			// [] around param denotes scratchpad object
			// extract it
			var scratch_param = param.substring(1, param.length - 1);
			
			// Check to see if the scratch param object exists
			if (typeof scratch[scratch_param] == "undefined") {
				concat_good = false;
				response.message += ":" + scratch_param + " Undefined";
				concat_list.push("");
			} else if (scratch[scratch_param] == "") {
				concat_good = false;
				response.message += ":" + scratch_param + " Empty";
				concat_list.push("");
			} else {
				concat_list.push(scratch[scratch_param].toString());
			}
			
		} else {
			
			// This is a clever idea to alloACOFDataRuleAnalysis tree ACOFDataRuleAnalysisalking of object. Need understand a more elegant ACOFDataRuleAnalysisay of doing this
			var items = param.split(".");
			
			if (items.length == 1) {
				// Check to see if the param object exists
				var item_1 = sRecord[items[0]];
				if (typeof item_1 == "undefined") {
					concat_good = false;
					response.message += ":" + param + " Undefined";
					concat_list.push("");
				} else if (item_1 == "") {
					concat_good = false;
					response.message += ":" + param + " Empty";
					concat_list.push("");
				} else {
					concat_list.push(item_1.toString());
				}
			} else if (items.length == 2) {
				// Check to see if the param object exists
				var item_2 = sRecord[items[0]][items[1]];
				if (typeof item_2 == "undefined") {
					concat_good = false;
					response.message += ":" + param + " Undefined";
					concat_list.push("");
				} else if (item_2 == "") {
					concat_good = false;
					response.message += ":" + param + " Empty";
					concat_list.push("");
				} else {
					concat_list.push(item_2.toString());
				}
			} else if (items.length == 3) {
				// Check to see if the param object exists
				var item_3 = sRecord[items[0]][items[1]][items[2]];
				if (typeof item_3 == "undefined") {
					concat_good = false;
					response.message += ":" + param + " Undefined";
					concat_list.push("");
				} else if (item_3 == "") {
					concat_good = false;
					response.message += ":" + param + " Empty";
					concat_list.push("");
				} else {
					concat_list.push(item_3.toString());
				}
			}
		}
	}
	
	response.value = concat_list.join(separator);
	
	this._debug('CC_1. concatenate_columns: ' + rule_column_name + ', ' + response.value + ', ' + concat_good);
	
	if (rule_column_name != "" && rule_column_name != null) {
		dRecord[rule_column_name] = response.value.toString();
	}
	if (scratch_column_name != "") {
		scratch[scratch_column_name] = response.value.toString();
	}
	response.test = concat_good;
	return response;
},

conditional : function (rule, sRecord, dRecord, scratch, source) {
	this._debug('CC_2. conditional: entering');	

	//var rule_column_name = this.ruleField(rule.u_column_name, source);
    var rule_column_name = this.ruleField(rule, source);
	var scratch_column_name = rule.u_scratchpad_name;
	var response = {
		test : true,
		reject : false,
		message : "",
		value : ""
	};
	var condition_col = rule.u_condition;
	var value_col = "";
	var condition_good = true;
	
	// Currently this only deals with the column being boolean
	if (sRecord[condition_col]) {
		// Result should be Value 1
		value_col = rule.u_value_1.toString();
	} else {
		// Result should be Value 2
		value_col = rule.u_value_2.toString();
	}
	
	this._debug('CC_3. conditional: ' + rule_column_name + ', ' + condition_col + ', ' + value_col);	
	
	if (value_col[0] == "[") {
		this._debug('CC_4. conditional: scratchpad ' + rule_column_name + ', ' + condition_col + ', ' + value_col);

		// use scratchpad
		var scratch_value = value_col.substring(1, value_col.length - 1);

		this._debug('CC_5. conditional: scratchpad value ' + rule_column_name + ', ' + scratch[scratch_value]);

		// Check to see if the scratch param object exists
		if (typeof scratch[scratch_value] == "undefined") {
			condition_good = false;
			response.message += ":" + scratch_value + " Undefined";
			response.value = "";
		} else if (scratch[scratch_value] == "") {
			condition_good = false;
			response.message += ":" + scratch_value + " Empty";
			response.value = "";
		} else {
			response.value = scratch[scratch_value].toString();
		}
		
	} else {
		this._debug('CC_6. conditional: column ' + rule_column_name + ', ' + condition_col + ', ' + value_col);

		// use source record
		// This is a clever idea to allow tree walking of object. Need understand a more elegant way of doing this
		var items = value_col.split(".");
		
		if (items.length == 1) {
			// Check to see if the param object exists
			var item_1 = sRecord[items[0]];
			if (typeof item_1 == "undefined") {
				condition_good = false;
				response.message += ":" + item_1 + " Undefined";
				response.value = "";
			} else if (item_1 == "") {
				condition_good = false;
				response.message += ":" + item_1 + " Empty";
				response.value = "";
			} else {
				response.value = item_1.toString();
			}
		} else if (items.length == 2) {
			// Check to see if the param object exists
			var item_2 = sRecord[items[0]][items[1]];
			if (typeof item_2 == "undefined") {
				condition_good = false;
				response.message += ":" + item_2 + " Undefined";
				response.value = "";
			} else if (item_2 == "") {
				condition_good = false;
				response.message += ":" + item_2 + " Empty";
				response.value = "";
			} else {
				response.value = item_2.toString();
			}
		} else if (items.length == 3) {
			// Check to see if the param object exists
			var item_3 = sRecord[items[0]][items[1]][items[2]];
			if (typeof item_3 == "undefined") {
				condition_good = false;
				response.message += ":" + item_3 + " Undefined";
				response.value = "";
			} else if (item_3 == "") {
				condition_good = false;
				response.message += ":" + item_3 + " Empty";
				response.value = "";
			} else {
				response.value = item_3.toString();
			}
		}
	}
	
	this._debug('CC_7. conditional: finishing ' + rule_column_name + ', ' + condition_col + ', ' + response.value.toString());

	
	if (rule_column_name != "" && rule_column_name != null) {
		dRecord[rule_column_name] = response.value.toString();
	}
	if (scratch_column_name != "") {
		scratch[scratch_column_name] = response.value.toString();
	}
	
	response.test = condition_good;

	this._debug('CC_8. conditional: returning ' + rule_column_name + ', ' + response.value.toString());	

	return response;
},

get_column : function (rule, sRecord, dRecord, scratch, source) {
	//var rule_column_name = this.ruleField(rule.u_column_name, source);
    var rule_column_name = this.ruleField(rule, source);
	var scratch_column_name = rule.u_scratchpad_name;
	var response = {
		test : true,
		reject : false,
		message : "",
		value : ""
	};
	//this._debug('checking get_column: ' + rule_column_name + '(Not Implemented Yet!)');
	response.test = true;
	return response;
},

get_domain : function (rule, sRecord, dRecord, scratch, source) {
	var response = {
		test : true,
		reject : false,
		message : "",
		value : ""
	};
	var source_company = sRecord.company.name;
	var source_domain = sRecord.company.sys_domain;
	var source_name = sRecord.name;
	//var rule_column_name = this.ruleField(rule.u_column_name, source);
    var rule_column_name = this.ruleField(rule, source);
	var scratch_column_name = rule.u_scratchpad_name;
	// Analysis Rule: Get Domain
	// Definition provides column name for the company
	// Function returns object
	// Test:   true/false
	// Result: Returned Value
	//
	//this._debug('checking ' + source_name + ' get_domain: ' + source_company + ' into ' + rule_column_name);
	
	// Validate source contains company column (This Rule Type expects it)
	if (typeof sRecord.company == "undefined") {
		response.test = false;
		response.message = ":No Company field in this record";
		return response;
	}
	// Validate source company column has a value
	if (sRecord.company == "" || sRecord.company == null) {
		response.test = false;
		response.message = ":Company reference is empty";
		return response;
	}
	// Validate destination contains rule column name
	if (typeof dRecord[rule_column_name] == "undefined") {
		response.test = false;
		response.message = ":No " + rule_column_name + " field in this record";
		return response;
	}
	// Validate source domain column has a value
	if (source_domain == "" || source_domain == null) {
		response.test = false;
		response.message = ":Company domain is empty";
		return response;
	}
	
	if (response.test) {
		response.value = source_domain;
		if (rule_column_name != "" && rule_column_name != null) {
			dRecord[rule_column_name] = response.value.toString();
		}
		if (scratch_column_name != "") {
			scratch[scratch_column_name] = response.value.toString();
		}
	}
	
	return response;
},

forbidden_terms: function (rule, sRecord, dRecord, scratch, source) {
	//var rule_column_name = this.ruleField(rule.u_column_name, source);
    var rule_column_name = this.ruleField(rule, source);
	var scratch_column_name = rule.u_scratchpad_name;
	var response = {
		test : true,
		reject : false,
		message : "",
		value : ""
	};
	
	//Comma seperated list of forbidden terms
	var forbiddenTerms = rule.u_list;
	var lookupValue = sRecord[rule_column_name];
	
	if(forbiddenTerms.nil() || lookupValue.nil()) {
		return response;
	}
	
	var forbiddenTermsArray = forbiddenTerms.split(',');
	
	this._debug('FT_1. List contains: ' + forbiddenTerms + ', Array contains: ' + forbiddenTermsArray.length + ' items');
	this._debug('FT_2. Field value is: ' + sRecord[rule_column_name]);
	
	var au = new ArrayUtil();
	
	if(au.contains(forbiddenTermsArray, lookupValue)) {
		response.test = false;
		response.message = lookupValue;
	}
	
	return response;
	
},

get_ident : function (rule, sRecord, dRecord, scratch, source) {
	this._debug('GI_1. get_ident: entering');

	//var rule_column_name = this.ruleField(rule.u_column_name, source);
    var rule_column_name = this.ruleField(rule, source);
	var scratch_column_name = rule.u_scratchpad_name;
	var response = {
		test : true,
		reject : false,
		message : "",
		value : ""
	};
	var concat_list = [];
	var concat_good = true;
	
	// Validate source contains company column (This Rule Type expects it)
	if (typeof sRecord.company == "undefined") {
		response.test = false;
		response.message = ":No Company field in this record";
		return response;
	}
	// Validate source company column has a value
	if (sRecord.company == "" || sRecord.company == null) {
		response.test = false;
		response.message = ":Company reference is empty";
		return response;
	}
	
	if (sRecord.company.u_is_parent) {
		response.value = sRecord.company.u_customer_ident;
	} else {
		response.value = sRecord.company.parent.u_customer_ident;
	}
	
	if (rule_column_name != "" && rule_column_name != null) {
		dRecord[rule_column_name] = response.value.toString();
	}
	if (scratch_column_name != "") {
		scratch[scratch_column_name] = response.value.toString();
	}
	response.test = true;
	
	this._debug('GI_2. get_ident: returning ' + rule_column_name + ', ' + scratch_column_name + ', ' + response.value);

	return response;
},

//Choicelist retention rule - manages _origs for choicelists
//Doesn't need to use a pooled rule, simply searches for the normal element.
choicelist_retention : function(rule, sRecord, dRecord, scratch, source){
	//var rule_column_name = this.ruleField(rule.u_column_name, source);
    var rule_column_name = this.ruleField(rule, source);
	//.log('Running for ' + rule_column_name,'ACOFCheckCR');
	var scratch_column_name = rule.u_scratchpad_name;
	var response = {
		test : true,
		reject : false,
		message : "",
		value : ""
	};
	var usedOrigs = sRecord.u_acof_uses_original;
	var origName = rule_column_name + '_orig';
	if(!origName.startsWith('u_')){
		origName = 'u_' + origName;
	}

	var lookupValue = sRecord[origName]; //Take the lookup value from the _orig field
	var targetField = rule_column_name;
	var identifier = targetField;
	if(!identifier.startsWith('u_')){
	identifier = 'u_' + identifier;
	}
	
	//If targetField is empty then fail the rule
	if (targetField == '') {
		response.test = false;
		response.message = ":Choicelist retention rule is misconfigured";
		
		return response;
	}

	//If lookupvalue is empty, pass the rule
	if (lookupValue == ''||lookupValue== null){
		response.test = true;
		response.message = ":No value provided from template";

		return response;
	}

	//If the lookup value is not empty, but the reference record is empty, or a stub, then fail the rule
	if(sRecord[rule_column_name] == ''|| sRecord[rule_column_name] == null){
		response.test = false;
		response.message = ":Choicelist retention rule is misconfigured";
		
		return response;
	}

	//Otherwise, pass the rule
	response.test = true;
	response.message = ":Reference field filled";
	
	return response;
},

//Overides choice lists when generating templates - should always pass
choicelist_override : function(rule, sRecord, dRecord, scratch, source){
    var rule_column_name = this.ruleField(rule, source);
	var scratch_column_name = rule.u_scratchpad_name;
	var response = {
		test : true,
		reject : false,
		message : "",
		value : ""
	};

	return response;
},


//Each reference/choice field has a _orig field in addition to its actual field
//Value 1 of the rule should be lookup_table,lookup_column
//Value 2 should be the target field of the staging table record that the answer will be written to
reference_retention : function (rule, sRecord, dRecord, scratch, source) {
	//var rule_column_name = this.ruleField(rule.u_column_name, source);
    var rule_column_name = this.ruleField(rule, source);
	var scratch_column_name = rule.u_scratchpad_name;
	var response = {
		test : true,
		reject : false,
		message : "",
		value : ""
	};
	var usedOrigs = sRecord.u_acof_uses_original;
	var lookupTable = rule.u_rule.u_value_1;
	var lookupField = rule.u_rule.u_value_2;
	var origName = rule_column_name + '_orig';
	if(!origName.startsWith('u_')){
		origName = 'u_' + origName;
	}

	var lookupValue = sRecord[origName]; //Take the lookup value from the _orig field
	var targetField = rule_column_name;
	var identifier = targetField;
	if(!identifier.startsWith('u_')){
	identifier = 'u_' + identifier;
	}
	//If targetField is empty then fail the rule.
	if (targetField == '') {
		response.test = false;
		response.message = ":Reference retention rule is misconfigured";
		
		return response;
	}

	//If lookupvalue is empty, pass the rule
	if (lookupValue == ''||lookupValue== null){
		response.test = true;
		response.message = ":No value provided from template";

		return response;
	}

	//If it's a stub, fail the rule. This is commented out FOR NOW
	//if(sRecord[rule_column_name].u_acof_stub){
	//	response.test = false;
	//	response.message = ":Referencing a stub record";
	//	
	//	return response;
	//}

	//If the lookup value is not empty, but the reference record is empty, then fail the rule
	if(sRecord[rule_column_name] == ''){
		response.test = false;
		response.message = ":Reference is empty";
		
		return response;
	}
	if(sRecord[rule_column_name] == null){
		response.test = false;
		response.message = ":Reference is null";
		
		return response;
	}

	//Otherwise, pass the rule
	response.test = true;
	response.message = ":Reference field filled";
	
	return response;

},

isArray : function (obj) {
	// Check to see if obj is an array
	return (typeof obj != 'undefined' &&
	obj && obj.constructor === Array);
},

_debug : function (msg) {
	if(gs.getProperty('debug.ACOFDataRuleAnalysis') == 'true') {
		gs.log(msg, 'ACOFDataRuleAnalysis');
	}
},

type : 'ACOFDataRuleAnalysis'
};
