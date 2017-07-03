var ACOFSecurityHelper = Class.create();
ACOFSecurityHelper.prototype = {
	initialize: function() {
	},
	
	isStagingTableLocked: function(recordId, stagingTable, domain) {
		var response = false; //Lock by default
		
		//gs.log('Record id: ' + recordId + ', Table: ' + stagingTable + ', Domain: ' + domain, 'ACOFSecurityHelper');
		
		//Check if the staging table is locked for this domain
		var gr = new GlideRecord('u_acof_data_stage_tables');
		
		gr.addQuery('sys_domain', ''+domain).addOrCondition('sys_domain', "global");
		//gr.addQuery('u_stage_table_name.name', stagingTable);
		gr.addQuery('u_staging_table', stagingTable);
		gr.query();
		
		//gs.log('EQ: https://atosglobaldev.service-now.com/u_acof_data_stage_tables_list.do?sysparm_query=' + gr.getEncodedQuery(), 'ACOFSecurityHelper');
		
		if(gr.next()) {
			if(gr.u_locked == false) {
				response = true;
			}
		}
		
		//gs.log('ACL response for ' + recordId + ' = ' + response, 'ACOFSecurityHelper');
		
		return response;
	},
		
		type: 'ACOFSecurityHelper'
	};