var ACOFReportingHelper = Class.create();
ACOFReportingHelper.prototype = {
	initialize: function() {
	},
	
	updateReportingItems: function(payload) {
		//gs.log('U1. In updateReportingItems. Domain = ' + payload.domain + ', Staging Table = ' + payload.staging_table + ', Record = ' + payload.record_id + ', Rules count = ' + payload.result.length, 'ACOFReportingHelper');
		
		//gs.log('U2. ' + JSON.stringify(payload), 'ACOFReportingHelper');
		
		var grRI = new GlideRecord('u_acof_reporting_item');
		
		grRI.addQuery('u_staging_table', payload.staging_table);
		grRI.addQuery('u_st_record', payload.record_id);
		grRI.query();
		
		var reportingItemId = '';
		var status = 'Bad';
		
		//Overide the state if the rule failure count is zero
		if(payload.fail_count == 0) {
			status = 'Good';
		}
		
		if(grRI.next()) {
			grRI.u_rule_failure_count = payload.fail_count;
			grRI.u_status = status;
			
			grRI.update();
			
			reportingItemId = grRI.sys_id;
		}
		else {
			var grRI_2 = new GlideRecord('u_acof_reporting_item');
			
			grRI_2.initialize();
			
			grRI_2.u_domain = payload.domain;
			grRI_2.u_rule_failure_count = payload.fail_count;
			grRI_2.u_staging_table = payload.staging_table;
			grRI_2.u_st_record = payload.record_id;
			grRI_2.u_status = status;
			
			reportingItemId = grRI_2.insert();
		}
		
		//Delete all artefacts for this reporting item
		var grRA = new GlideRecord('u_acof_reporting_artefact');
		
		grRA.addQuery('u_reporting_item', reportingItemId);
		grRA.deleteMultiple();
		
		//Process the result for each rule
		for(var rCount = 0; rCount < payload.result.length; rCount++) {
			//gs.log('U3. Creating new artefact. Failure comments = ' + payload.result[rCount].failure_comments + ', Reporting item = ' + reportingItemId + ', Rule id = ' + payload.result[rCount].rule_id + ', Rule passed = ' + payload.result[rCount].rule_passed, 'ACOFReportingHelper');
			
			var grRA_2 = new GlideRecord('u_acof_reporting_artefact');
			
			grRA_2.initialize();
			
			grRA_2.u_failure_comments = payload.result[rCount].failure_comments;
			grRA_2.u_reporting_item = reportingItemId;
			grRA_2.u_rule = payload.result[rCount].rule_id;
			grRA_2.u_rule_passed = payload.result[rCount].rule_passed;
			
			grRA_2.insert();
		}
		
		return reportingItemId;
	},
	
	deleteReportingItems: function(table, record) {
		//gs.log('D1. In deleteReportingItems. Table = ' + table + ', Record = ' + record, 'ACOFReportingHelper');
		
		var gr = new GlideRecord('u_acof_reporting_item');
		
		gr.addQuery('u_staging_table', table);
		gr.addQuery('u_st_record', record);
		
		gr.deleteRecord();
	},
	
	type: 'ACOFReportingHelper'
};var ACOFReportingHelper = Class.create();
ACOFReportingHelper.prototype = {
	initialize: function() {
	},
	
	updateReportingItems: function(payload) {
		//gs.log('U1. In updateReportingItems. Domain = ' + payload.domain + ', Staging Table = ' + payload.staging_table + ', Record = ' + payload.record_id + ', Rules count = ' + payload.result.length, 'ACOFReportingHelper');
		
		//gs.log('U2. ' + JSON.stringify(payload), 'ACOFReportingHelper');
		
		var grRI = new GlideRecord('u_acof_reporting_item');
		
		grRI.addQuery('u_staging_table', payload.staging_table);
		grRI.addQuery('u_st_record', payload.record_id);
		grRI.query();
		
		var reportingItemId = '';
		var status = 'Bad';
		
		//Overide the state if the rule failure count is zero
		if(payload.fail_count == 0) {
			status = 'Good';
		}
		
		if(grRI.next()) {
			grRI.u_rule_failure_count = payload.fail_count;
			grRI.u_status = status;
			
			grRI.update();
			
			reportingItemId = grRI.sys_id;
		}
		else {
			var grRI_2 = new GlideRecord('u_acof_reporting_item');
			
			grRI_2.initialize();
			
			grRI_2.u_domain = payload.domain;
			grRI_2.u_rule_failure_count = payload.fail_count;
			grRI_2.u_staging_table = payload.staging_table;
			grRI_2.u_st_record = payload.record_id;
			grRI_2.u_status = status;
			
			reportingItemId = grRI_2.insert();
		}
		
		//Delete all artefacts for this reporting item
		var grRA = new GlideRecord('u_acof_reporting_artefact');
		
		grRA.addQuery('u_reporting_item', reportingItemId);
		grRA.deleteMultiple();
		
		//Process the result for each rule
		for(var rCount = 0; rCount < payload.result.length; rCount++) {
			//gs.log('U3. Creating new artefact. Failure comments = ' + payload.result[rCount].failure_comments + ', Reporting item = ' + reportingItemId + ', Rule id = ' + payload.result[rCount].rule_id + ', Rule passed = ' + payload.result[rCount].rule_passed, 'ACOFReportingHelper');
			
			var grRA_2 = new GlideRecord('u_acof_reporting_artefact');
			
			grRA_2.initialize();
			
			grRA_2.u_failure_comments = payload.result[rCount].failure_comments;
			grRA_2.u_reporting_item = reportingItemId;
			grRA_2.u_rule = payload.result[rCount].rule_id;
			grRA_2.u_rule_passed = payload.result[rCount].rule_passed;
			
			grRA_2.insert();
		}
		
		return reportingItemId;
	},
	
	deleteReportingItems: function(table, record) {
		//gs.log('D1. In deleteReportingItems. Table = ' + table + ', Record = ' + record, 'ACOFReportingHelper');
		
		var gr = new GlideRecord('u_acof_reporting_item');
		
		gr.addQuery('u_staging_table', table);
		gr.addQuery('u_st_record', record);
		
		gr.deleteRecord();
	},
	
	type: 'ACOFReportingHelper'
};