var ACOFStageMaintenance = Class.create();
ACOFStageMaintenance.prototype = {
	initialize: function() {
		this.debug = gs.getProperty('debug.ACOFStageMaintenance') == 'true';
		this.debugPrefix = '>>>DEBUG: debug.ACOFStageMaintenance: ';
	},
	
	maintain: function(destinationTableId) {
		
		// Define variables for the function
		var stageName = "";
		var stageLabel = "";
		var destinationName ="";
		
		// Everything I need to check for a stage
		//   Destination Table sys_id
		//
		//   Expecting the sys_id for the u_acof_data_stage record
		//   Fetch the data stage record
		//
		var dataStage = new GlideRecord("u_acof_data_stage");
		dataStage.addQuery('sys_id', destinationTableId);
		dataStage.query();
		if (dataStage.next()){
			stageName = dataStage.u_stage_table_name;
			gs.log("ACOFStageMaintenance: Maintenance Function looking at Stage Table ID - "
			+ destinationTableId
			+ " : "
			+ stageName,"ACOFStageMaintenance");
			
			destinationName = dataStage.u_production_table;
			stageLabel = dataStage.u_stage_table_label;
			
			gs.log("ACOFStageMaintenance: Stage Label = " + stageLabel,"ACOFStageMaintenance");
			
			
			// Check if the Stage Table exists
			var stageTable = new GlideRecord(stageName);
			if (stageTable.isValid()) {
				// Stage Table does exist... maintain it
				//
				//   If it does not exist use the update function
				//     this.update();
				gs.log("ACOFStageMaintenance: Staging table already exists!","ACOFStageMaintenance");
				if (!dataStage.u_stage_table_name){
					dataStage.u_stage_table_name = stageName;
				}
				// Maintain the stage items
				// !!
				// Need to itterate through the destination.
				// Sync the stage
				// Create new fields
				//
				gs.log("ACOFStageMaintenance: Staging table needs to be synced!","ACOFStageMaintenance");
				this.sync(stageName, stageLabel);
			} else {
				//Stage Table does not exist... Create it
				//   If it does not exist use create function
				gs.log("ACOFStageMaintenance: Staging table needs to be created!","ACOFStageMaintenance");
				this.create(destinationName,stageName,stageLabel);
			}
			
		} else {
			// No Table Relationship (u_acof_data_stage)
			//   - sys_id was not passed here or could not be found
			//   - do nothing
			//
			gs.log("ACOFStageMaintenance: Maintenance Function looking at Stage Table ID - " + destinationTableId + " : Record Not Found in u_acof_data_stage. This is a Problem","ACOFStageMaintenance");
			return false;
		}
		
	},
	
	create: function(destinationName,stageName,stageLabel) {
		// Create a stage table from the u_acof_data_stage table entry
		gs.log("ACOFStageMaintenance: Create Function for " + stageName + " from " + destinationName,"ACOFStageMaintenance");
		
		/*
 		* Data Staging Table creation
 		* Duplicates existing production table AND adds columns from extra fields table ("u_acof_data_item_columns")
 		*/
		
		// Initialise a production table object to use as a model
		var destinationTable = new GlideRecord(destinationName);
		destinationTable.initialize();
		var destinationDescriptor = GlideTableDescriptor.get(destinationName);
		var displayName = destinationDescriptor.getDisplayName();
		
		// Initialise an acof extra fields object to add to the model
		var stageExtra = new GlideRecord("u_acof_data_item_columns");
		stageExtra.initialize();
		var extraDescriptor = GlideTableDescriptor.get("u_acof_data_item_columns");
		
		//var creator = new ACOFTableDescriptor(stageName, stageLabel);
		var creator = new ACOFTableDescriptor(stageName, stageLabel);
		
		//Copy production fields to staging table
		creator.setFields(destinationTable);
		creator.copyAttributes(destinationDescriptor);
		
		//Set the table extention
		gs.log("TE1: Destination table = " + destinationName, "ACOFStageMaintenance");
		
		var tu = new TableUtils(destinationName);
		var tableList = tu.getTables();
		
		//tableList contains a Java ArrayList so convert it to its JS array
		gs.include("j2js");
		
		var tableList_js = j2js(tableList);
		
		//Get the current table relationship record
		var grTRC = new GlideRecord('u_acof_data_stage');
		var foundTRC = grTRC.get('u_production_table', destinationName);
		
		//Store the data grouping
		var dataGrouping = grTRC.u_data_item_grouping;
		
		//Get the first parent of the current table - this will be skipped if it is a standalone table
		if(tableList_js[1] != null) {
			gs.log("TE2: Got parent = " + tableList_js[1], "ACOFStageMaintenance");
			
			var parentST = 'u_acof_st_' + tableList_js[1];
			
			//Get the parent from the ACOF Table Relationships table
			var grTR = new GlideRecord('u_acof_data_stage');
			var foundTR = grTR.get('u_production_table', tableList_js[1]);
			
			if(foundTR == true) {
				gs.log("TE3: Found table relationship record for " + tableList_js[1], "ACOFStageMaintenance");
				
				creator.setExtends(parentST);
			}
			else {
				//Create a new table relationships record
				gs.log("TE4: Could not find table relationship record for " + tableList_js[1] + ". Creating...", "ACOFStageMaintenance");
				
				//Get the parent table data from sys_db_object
				var grDBO = new GlideRecord('sys_db_object');
				var foundDBO = grDBO.get('name', tableList_js[1]);
				
				if(foundDBO == true) {
					var grTR_2 = new GlideRecord('u_acof_data_stage');
					
					grTR_2.initialize();
					
					grTR_2.u_stage_table_name = parentST;
					grTR_2.u_production_table_name = grDBO.sys_id;
					grTR_2.u_stage_table_label = grDBO.label + ' (Stage Table)';
					grTR_2.u_name = grDBO.label + ' (Stage Table)';
					grTR_2.u_data_item_grouping = dataGrouping;
					grTR_2.u_load_table_label = 'Load Table - ' + grDBO.label;
					grTR_2.u_load_table_name = 'u_acof_ld_' + tableList_js[1];
					
					grTR_2.insert();
					
					creator.setExtends(parentST);
				}
				else {
					return false;
				}
			}
		}
		
		//Copy extra fields to staging table
		creator.setFields(stageExtra);
		creator.copyAttributes(extraDescriptor);
		creator.setRoles(destinationDescriptor);
		
		
		//Create staging table
		// Lets wait on this one!!!
		creator.create();
		
		
		//Copy indexes to newly created (so existing) staging table
		creator.copyIndexes(destinationName, stageName);
		
		//Create original value fields for reference fields
		var grD = new GlideRecord('sys_dictionary');
		
		grD.addQuery('name', stageName);
		grD.addQuery('active', true);
		grD.addQuery('internal_type.name', 'IN', 'reference,choice');
		grD.addQuery('element', 'NOT LIKE', '_orig');
		grD.addQuery('element', 'NOT LIKE', 'u_acof_');
		grD.query();
		
		//gs.log('https://' + gs.getProperty('instance_name') + '.service-now.com/sys_dictionary_list.do?sysparm_query=' + grD.getEncodedQuery(), 'ACOFStageMaintenance');
		
		while(grD.next()) {
			var grD2 = new GlideRecord('sys_dictionary');
			
			grD2.initialize();
			
			grD2.column_label = grD.column_label + ' (Orig)';
			grD2.element = grD.element + '_orig';
			grD2.internal_type = 'string';
			grD2.max_length = 100;
			grD2.name = stageName;
			grD2.read_only = true;
			
			grD2.insert();
		}
		
		//Update variables in dataStage record of configuration table
		return true;
		
	},
	
	sync: function(stagingTableName, stagingTableLabel) {
		//Sync the production table to the stage - if the field is missing it should be added. If it no longer exists it should be disabled
		var productionTable = stagingTableName.replace('u_acof_st_', '');
		
		//Define the creator
		var creator = new ACOFTableDescriptor(stagingTableName, stagingTableLabel);
		
		//Query the production table for the attributes
		var grP = new GlideRecord(productionTable);
		
		//Initialize a new record on the production table
		grP.initialize();
		
		//Set the fields using the production table as a model
		creator.setFields(grP);	
		creator.create();
		
		//Sync the active flag
		var grD = new GlideRecord('sys_dictionary');
		
		grD.addQuery('name', 'IN', '' + this._getParentTables(stagingTableName));
		grD.addQuery('element', 'NOT LIKE', 'sys_');
		grD.addQuery('element', 'NOT LIKE', 'u_acof_');
		grD.addQuery('element', 'NOT LIKE', 'u_load_reference');
		grD.query();
		
		while(grD.next()) {
			//Query against the production table dictionary entry
			var grD_2 = new GlideRecord('sys_dictionary');
			
			var sTable = '' + grD.name;
			var pTable = sTable.replace('u_acof_st_', '');
			
			grD_2.addQuery('name', pTable);
			grD_2.addQuery('element', '' + grD.element);
			grD_2.query();
			
			gs.log(grD_2.getEncodedQuery(), 'ACOFStageMaintenance');
			
			if(grD_2.next()) {
				grD.active = grD_2.active;
			}
			else {
				//Field no longer exists on the production table, deactivate the staging table field
				grD.active = false;
			}
			
			grD.update();
		}
					 
		//TODO: Do we need to sync the stage items here? Using the existing Sync Config button may be acceptable
	},
	
	_getParentTables: function(table) {
		var tu = new TableUtils(table);
		var tableList = tu.getTables();
		var tableListJS = j2js(tableList);
		
		return tableListJS;
	},
	
	
	type: 'ACOFStageMaintenance'
};