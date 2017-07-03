var ACOFEventManager = Class.create();
ACOFEventManager.prototype = {
    initialize: function() {
		this.debug = gs.getProperty('debug.ACOFEventManager') == 'true';
		this.debugPrefix = '>>>DEBUG: debug.ACOFEventManager: ';
    },
	
	dictionaryACOFEvent: function(current) {
		// Update the stage table from the u_acof_data_stage table entry
		//
		// Expecting a sys_dictionary record in 'current'
		//

		var object = {};
		object.tablename = current.name.toString();
		object.column = current.element.toString();
		object.operation = current.operation().toString();
				
		var json = new JSON();
		var payload = json.encode(object);
		
		//gs.log("dictionaryACOFEvent " + object.tablename + " : " + object.column + " - " + object.operation,"ACOFEventManager");
		
		
		if (object.operation == 'insert' || object.operation == 'delete' || object.operation == 'update') {
			gs.eventQueue("acof.dictionary", null, object.operation, payload);
		}

		return true;
	},	
	
	elementACOFEvent: function(current) {
		// Update the stage table from the u_acof_data_stage table entry
		//
		// Expecting a sys_ui_element record in 'current'
		//
		// Event received for every update against a form element
		//

		var object = {};
		object.tablename = current.sys_ui_section.name.toString();
		object.column = current.element.toString();
		object.operation = current.operation().toString();
				
		var json = new JSON();
		var payload = json.encode(object);
		
		//gs.log("elementACOFEvent " + object.tablename + " : " + object.column + " - " + object.operation,"ACOFEventManager");

		if (object.operation == 'insert' || object.operation == 'delete') {
			//gs.eventQueue("acof.ui_element", null, object.operation, payload);
			this.elementACOFEventProcess(object.operation,object.tablename,object.column);
		
		}
		
		return true;
	},
	
	elementACOFEventProcess: function(operation, tablename, columnname) {
		// Process the element event
		//
				
		var acofTable = new GlideRecord('u_acof_data_stage');
		acofTable.addQuery('u_production_table', tablename);
		acofTable.query();
		while (acofTable.next()){
			// Entry for this table does exist. ACOF is interested. Process the event
			//gs.log("elementACOFEventProcess " + tablename + " : " + columnname + " - " + operation,"ACOFEventManager");
			var stageName = acofTable.u_stage_table_name.toString();

			// Fetch the Stage Table sys_id
			var stageTable = new GlideRecord('sys_db_object');
			stageTable.addQuery('name',stageName);
			stageTable.query();
			if(stageTable.next()){

				var stageTableSysid = stageTable.sys_id.toString();
				var stageConfig = new ACOFStageConfigMaintenance();
				
				if(operation == 'delete'){
					stageConfig.deleteStageItem(stageTableSysid,stageName,columnname);
				}
			
				if(operation == 'insert'){
					stageConfig.insertStageItem(stageTableSysid,stageName,columnname);
				}

			}	
		}
		
		return true;
	},
	
		
	dictionaryACOFEventProcess: function(operation, tablename, columnname) {
		// Process the dictionary event
		//
		
		gs.log("elementACOFEventProcess " + tablename + " : " + columnname + " - " + operation,"ACOFEventManager");
		
		return true;
	},
	
    type: 'ACOFEventManager'
};