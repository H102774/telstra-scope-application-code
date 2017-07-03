var ACOFDeploymentHelper = Class.create();
ACOFDeploymentHelper.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	//Returns: Domain type of current users selected domain
	getDomainId: function() {
		var domainId = gs.getUser().getDomainID();
		
		var gr = new GlideRecord('domain');
		var found = gr.get(domainId);
		
		var object = {};
		
		object.domain_name = '';
		object.domain_type = '';
		
		if(found == true) {
			object.domain_name = '' + gr.name;
			object.domain_type = '' + gr.type;
		}
		
		var json = new JSON();
		var payload = json.encode(object);
		
		return payload;
	},
	
	//Called by ACOF Deployment Request (Record Producer) Client Script
	countArtefacts: function() {
		var payload = JSON.parse(this.getParameter('sysparm_payload'));
		
		var tableList = [];
		var tableCount = 0;
		
		//gs.log(payload.tables.length, 'ACOFDeploymentHelper');
		//gs.log(JSON.stringify(payload), 'ACOFDeploymentHelper');
		
		if(payload.individual_tables == 'true') {
			var tables = payload.tables;
			
			tableList = tables.split(',');
			tableCount = tableList.length;
		}
		else {
			var grST = new GlideRecord('u_acof_data_stage_tables');
			
			grST.addQuery('sys_domain', 'global');
			grST.addQuery('u_active', true);
			grST.addQuery('u_data_grouping', payload.data_type);
			grST.query();
			
			while(grST.next()) {
				tableList.push('' + grST.sys_id);
			}
			
			tableCount = tableList.length;
		}
		
		return '' + tableCount;
	},
	
	type: 'ACOFDeploymentHelper'
});