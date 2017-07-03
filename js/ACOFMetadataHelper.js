var ACOFMetadataHelper = Class.create();

ACOFMetadataHelper.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	//Input: Deployment date/time passed by metadata deployment catalog item
	//Returns: Record count of impacted data (JSON encoded) 
	getRecordCount: function() {
		//gs.log('In getRecordCount function, timestamp is ' + this.getParameter('sysparm_timestamp'), 'ACOFMetadataHelper');
		
		var timestamp = this.getParameter('sysparm_timestamp');
		
		var object = {};
		
		object.city_count = this._getCount('u_acof_st_u_cities', timestamp);
		object.country_count = this._getCount('u_acof_st_u_countries', timestamp);
		object.state_count = this._getCount('u_acof_st_u_state_provinces', timestamp);
		
		var json = new JSON();
		var payload = json.encode(object);
		
		return payload;
	},
	
	_getCount: function(table, timestamp) {
		var ts_split = timestamp.split(' ');
		
		var count = 0;
		
		var gr = new GlideAggregate(table);
		
		gr.addEncodedQuery('sys_updated_on>=javascript:gs.dateGenerate(\'' + ts_split[0] + '\',\'' + ts_split[1] + '\')');
		gr.addQuery('u_acof_status', 'Good');
		gr.addAggregate('COUNT');
		gr.query();
		
		//gs.log('Query: https://atosglobaldev.service-now.com/' + table + '_list.do?sysparm_query=' + gr.getEncodedQuery(), 'ACOFMetadataHelper');
		
		if(gr.next()) {
			count = gr.getAggregate('COUNT');
		}
		
		return count;
	},

	type: 'ACOFMetadataHelper'
});