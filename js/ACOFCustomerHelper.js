var ACOFCustomerHelper = Class.create();
ACOFCustomerHelper.prototype = {
	initialize: function() {
	},
	
	createStagingReferences: function(domain) {
		//Get the list of generic data stage tables
		var gr = new GlideRecord('u_acof_data_stage_tables');
		
		gr.addQuery('sys_domain', 'global'); //Uniformity
		gr.addQuery('u_data_grouping', '!=', 'meta');
		gr.query();
		
		gs.log('1. Query for u_acof_data_stage_tables: https://' + gs.getProperty('instance_name') + '.service-now.com/u_acof_data_stage_tables_list.do?sysparm_query=' + gr.getEncodedQuery(), 'Generate Customer Staging Tables');
		
		while(gr.next()) {
			//Does the generic stage table exist for this domain?
			var gr2 = new GlideRecord('u_acof_data_stage_tables');
			
			gr2.addQuery('sys_domain', domain);
			gr2.addQuery('u_stage_table_name', gr.u_stage_table_name);
			gr2.query();
			
			gs.log('2. Query for u_acof_data_stage_tables: https://' + gs.getProperty('instance_name') + '.service-now.com/u_acof_data_stage_tables_list.do?sysparm_query=' + gr2.getEncodedQuery(), 'Generate Customer Staging Tables');
			
			if(!gr2.next()) {
				//Create if not found
				var gr3 = new GlideRecord('u_acof_data_stage_tables');
				
				gr3.initialize();
				
				gr3.sys_domain = domain;
				gr3.u_active = true;
				gr3.u_stage_table_name = gr.u_stage_table_name;
				gr3.u_worksheet_order = gr.u_worksheet_order;
				gr3.u_data_grouping = gr.u_data_grouping;
				gr3.u_release_order = gr.u_release_order;
				
				gr3.insert();
			}
		}
	},
	
	type: 'ACOFCustomerHelper'
};