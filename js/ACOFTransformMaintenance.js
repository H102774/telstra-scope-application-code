var ACOFTransformMaintenance = Class.create();
ACOFTransformMaintenance.prototype = {
    initialize: function(productionTable) {
		this._debug('In ACOFTransformMaintenance - productionTable = ' + productionTable);
		
		var grTR = new GlideRecord('u_acof_data_stage');
		var foundTR = grTR.get('u_production_table', productionTable);
		
		if(foundTR == true) {
			//Build an object to represent the transform map
			var tmObject = {
				name: 'ACOF TM - ' + grTR.u_stage_table_label,
				active: false,
				source_table: grTR.u_load_table_name,
				target_table: grTR.u_stage_table_name,
				field_mappings: []
			};
			
			//Get a list of stage items for the given table
			var grSI = new GlideRecord('u_acof_data_stage_items');
			//_list.do?sysparm_query=u_stage_table_name%3D0d16c4ae0f8e328058311b1e51050ef8
			
			this._debug('TM object = ' + JSON.stringify(tmObject));
		}
		else {
			this._debug('Could not find a table relationship record for ' + productionTable);
			
			return false;
		}
		
    },
	
	_debug: function(message) {
		if(gs.getProperty('debug.ACOFTransformMaintenance') == 'true') {
			gs.log(new GlideDateTime().getNumericValue() + ': ' + message, 'ACOFTransformMaintenance');
		}
	},

    type: 'ACOFTransformMaintenance'
};