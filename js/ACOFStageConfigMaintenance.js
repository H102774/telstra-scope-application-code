var ACOFStageConfigMaintenance = Class.create();
ACOFStageConfigMaintenance.prototype = {
    initialize: function() {
		this.debug = gs.getProperty('debug.ACOFStageConfigMaintenance') == 'true';
		this.debugPrefix = '>>>DEBUG: debug.ACOFStageConfigMaintenance: ';
    },
	
	maintain: function(destinationTableId) {
		
		// Define variables for the function
		var stageName = "";
		var stageLabel = "";
		var destinationName ="";
		var stageTableSysid = "";
		var stageTableDataGrouping = "";
		var stageConfigId = "";
		var stageAutoMaintain = false;
		var stageDestinationView = "";
		
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
			destinationName = dataStage.u_production_table;
			stageLabel = dataStage.u_stage_table_label;
			stageTableDataGrouping = dataStage.u_data_item_grouping;
			stageAutoMaintain = dataStage.u_auto_maintain;
			stageDestinationView = dataStage.u_destination_view.toString();
			//gs.log("ACOFStageConfigMaintenance: Maintenance Function looking at Stage Table ID - " 
			//		   + destinationTableId 
			//		   + " : " 
			//		   + stageName,"ACOFStageConfigMaintenance");

			// We need the sys_id of the stage table
			var stageTable = new GlideRecord('sys_db_object');
			stageTable.addQuery("name",stageName);
			stageTable.query();
			if (stageTable.next()){
				// Keep the sys_id of the Stage Table
				stageTableSysid = stageTable.sys_id.toString();
			} else {
				gs.log("ACOFStageConfigMaintenance: No Stage Table :" 
					+ " I will not create Stage Table Config. This is a Problem","ACOFStageConfigMaintenance");
				return false;
			}
	
			// Check if the Stage Table Config entry exists
			// 
			var stageConfig = new GlideRecord('u_acof_data_stage_tables');
			stageConfig.addQuery("u_stage_table_name",stageTableSysid);

			gs.log("ACOFStageConfigMaintenance: Stage Config = " + stageLabel + " sys_id " + stageTableSysid,"ACOFStageConfigMaintenance");

			stageConfig.query();
			if (stageConfig.next()){
				// Stage Table Config exists. No action needed
				gs.log("ACOFStageConfigMaintenance: Found Stage Table Entry = " + stageName + " looking no further","ACOFStageConfigMaintenance");
				gs.log("ACOFStageConfigMaintenance: Stage Table Sys ID = " + stageTableSysid,"ACOFStageConfigMaintenance");
				gs.log("ACOFStageConfigMaintenance: Stage Destination View = " + stageDestinationView,"ACOFStageConfigMaintenance");
				gs.log("ACOFStageConfigMaintenance: Stage Label = " + stageLabel,"ACOFStageConfigMaintenance");
				this.createStageItems(stageTableSysid,stageName,stageDestinationView,stageLabel);
			} else {
				// Stage Table Config missing. Create it.
				//
				stageConfigId = this.createStageConfig(stageTableSysid,stageTableDataGrouping,stageLabel);
				
				gs.log("ACOFStageConfigMaintenance: Auto Create Stage Items ? " + stageAutoMaintain,"ACOFStageConfigMaintenance");
				
				// Check auto creation of Stage Items
				if (stageAutoMaintain){
					gs.log("ACOFStageConfigMaintenance: Auto Create Stage Items for " + stageLabel,"ACOFStageConfigMaintenance");
					this.createStageItems(stageTableSysid,stageName,stageDestinationView,stageLabel);
				} else {
					gs.log("ACOFStageConfigMaintenance: Manually Create Stage Items for " + stageLabel,"ACOFStageConfigMaintenance");
				}

			}
			
		} else {
			// No Table Relationship (u_acof_data_stage)
			//   - sys_id was not passed here or could not be found
			//   - do nothing
			//
			gs.log("ACOFStageConfigMaintenance: Maintenance Function looking at Stage Table ID - " + destinationTableId + " : Record Not Found in u_acof_data_stage. This is a Problem","ACOFStageConfigMaintenance");
			return false;
		}
		
	},	
	
	createStageItems: function(stageTableSysid,stageName,stageDestinationView,stageLabel){
		// Create stage table item from the form specified in u_acof_data_stage
		gs.log("ACOFStageConfigMaintenance: Creating Stage Items for " + stageLabel,"ACOFStageConfigMaintenance");

		var sections = [];
		
		var section = new GlideRecord("sys_ui_form_section");
		section.addQuery("sys_ui_form",stageDestinationView);
		section.orderBy("position");
		section.query();
		while(section.next()){
			sections.push(section.sys_ui_section.toString());
		}
		
		for (var sn=0;sn<sections.length;sn++){
			var element = new GlideRecord("sys_ui_element");
			element.newRecord();
			element.addQuery("sys_ui_section",sections[sn]);
			element.addQuery("type",null);
			element.query();
			while(element.next()){
				this.insertStageItem(stageTableSysid,stageName,element.element);
			}
		}

		this.sortGenericStageItems(stageTableSysid);
		
	},
	
	sortGenericStageItems: function(stageTableSysid){
		/*
		* Data Staging Item Sort
		* Sorts Existing Stage Items
		*/
		gs.log("ACOFStageConfigMaintenance: Sort Stage Items","ACOFStageConfigMaintenance");
		gs.log("ACOFStageConfigMaintenance: Sort Stage Items for " + stageTableSysid,"ACOFStageConfigMaintenance");
		var count = 0;
		var stageItem = new GlideRecord("u_acof_data_stage_items");
		stageItem.addQuery("u_stage_table_name",stageTableSysid);
		stageItem.addQuery("u_generic",true);
		stageItem.orderBy("u_column_name.column_label");
		stageItem.query();
		while(stageItem.next()){
			var ruleItem = new GlideRecord('u_acof_data_rule_definition');
			ruleItem.addQuery("u_stage_table_name",stageItem.u_stage_table_name.sys_id.toString());
			ruleItem.addQuery("u_column_name",stageItem.u_column_name.sys_id.toString());
			//ruleItem.addQuery("u_rule_type","mandatory");
			ruleItem.addEncodedQuery('u_rule_typeINmandatory,key_field');
			ruleItem.query();
			if(ruleItem.next()){
				gs.log("ACOFStageConfigMaintenance: Sort Stage Items for " + stageItem.u_column_name.name,"ACOFStageConfigMaintenance");
				// if it is a mandatory or key field place in the first 1000
				stageItem.u_column_order = ruleItem.u_order;
			}else{
				// if it is a mandatory or key field place after 1000
				stageItem.u_column_order = 1000 + count;
			}
			stageItem.update();
			count++;
		}
		
	},
	
	insertStageItem: function(stageTableSysid,stageName,name){
		// Insert a stage item entry
		gs.log("ACOFStageConfigMaintenance: Insert Stage Item " + stageName + " : " + name,"ACOFStageConfigMaintenance");
		
		//Ignore system fields
		if(name.startsWith('sys_')) return;
		
		/*
		* Data Staging Config creation
		* Duplicates existing production table AND adds columns from extra fields table ("u_acof_data_item_columns")
		*/
		
		var columnSysid = "";
		var columnMandatory = false;
		
		var checkStageColumn = new GlideRecord('sys_dictionary');
		checkStageColumn.addQuery("name",stageName);
		checkStageColumn.addQuery("element",name);
		checkStageColumn.query();
		if(checkStageColumn.next()){
			columnSysid = checkStageColumn.sys_id.toString();
			columnMandatory = checkStageColumn.mandatory;
		} else {
			gs.log("ACOFStageConfigMaintenance: Column not found " + stageName + " : " + name,"ACOFStageConfigMaintenance");
			return false;
		}
		
		var checkItem = new GlideRecord('u_acof_data_stage_items');
		checkItem.addQuery("u_stage_table_name",stageTableSysid);
		checkItem.addQuery("u_column_name",columnSysid);
		checkItem.query();
		if(checkItem.next()){
			gs.log("ACOFStageConfigMaintenance: " + stageTableSysid + " Item " + checkItem.sys_id.toString() + " already exists " + name,"ACOFStageConfigMaintenance");
			return checkItem.sys_id.toString();
		} else {
			
			// Insert a mandatory rule		
			if(columnMandatory){
				gs.log("ACOFStageConfigMaintenance: Creating Rule " + columnMandatory + " item "  + name,"ACOFStageConfigMaintenance");

				var insertRule = new GlideRecord('u_acof_data_rule_definition');			
				insertRule.initialize(); 
				insertRule.u_stage_table_name = stageTableSysid;
				insertRule.u_column_name = columnSysid;
				insertRule.u_rule_type = "mandatory";
				insertRule.u_column_order = 0;
				insertRule.u_active = true;
				insertRule.u_generic = true;
				insertRule.u_domain = null;
				insertRule.sys_domain = null;
				insertRule.insert().toString();
			}
			
			gs.log("ACOFStageConfigMaintenance: Creating Item " + stageTableSysid + " item "  + name,"ACOFStageConfigMaintenance");
			// Insert the stage item
			var insertItem = new GlideRecord('u_acof_data_stage_items');	
		
			insertItem.initialize(); 
			insertItem.u_stage_table_name = stageTableSysid;
			insertItem.u_column_name = columnSysid;
			insertItem.u_column_order = 0;
			insertItem.u_active = true;
			insertItem.u_generic = true;
			insertItem.u_domain = null;
			insertItem.sys_domain = null;
			var itemSysid = insertItem.insert().toString();

			this.sortGenericStageItems(stageTableSysid);
			
			return itemSysid;
			
		}
		
	},
	
	deleteStageItem: function(stageTableSysid,stageName,name){
		// Insert a stage item entry
		//gs.log("ACOFStageConfigMaintenance: Delete Stage Item " + stageName + " : " + name,"ACOFStageConfigMaintenance");
		
		//Ignore system fields
		if(name.startsWith('sys_')) return;

		/*
		* Data Staging Config creation
		* Duplicates existing production table AND adds columns from extra fields table ("u_acof_data_item_columns")
		*/
		var columnSysid = "";
		var columnMandatory = false;
		
		var checkStageColumn = new GlideRecord('sys_dictionary');
		checkStageColumn.addQuery("name",stageName);
		checkStageColumn.addQuery("element",name);
		checkStageColumn.query();
		if(checkStageColumn.next()){
			columnSysid = checkStageColumn.sys_id.toString();
			columnMandatory = checkStageColumn.mandatory;
		} else {
			gs.log("ACOFStageConfigMaintenance: Column not found " + name,"ACOFStageConfigMaintenance");
			return false;
		}
		
		var checkItem = new GlideRecord('u_acof_data_stage_items');
		checkItem.addQuery("u_stage_table_name",stageTableSysid);
		checkItem.addQuery("u_column_name",columnSysid);
		checkItem.query();
		if(checkItem.next()){
			if (checkItem.u_manual_overide){
				gs.log("deleteStageItem: " + stageName + "." + name + " has overide","ACOFStageConfigMaintenance");				
			} else {
				gs.log("deleteStageItem: " + stageName + "." + name + " exists. Deleting! ","ACOFStageConfigMaintenance");
				checkItem.deleteRecord();	
			}
		}

		this.sortGenericStageItems(stageTableSysid);
		
		return true;	

	},
	
	createStageConfig: function(stageTableSysid,stageTableDataGrouping,stageLabel) {
		// Create a stage table from the u_acof_data_stage table entry
		gs.log("ACOFStageConfigMaintenance: Creating Stage Items for " + stageLabel,"ACOFStageConfigMaintenance");
		
		/*
		* Data Staging Config creation
		* Duplicates existing production table AND adds columns from extra fields table ("u_acof_data_item_columns")
		*/
		
		var stageConfig = new GlideRecord('u_acof_data_stage_tables');

		stageConfig.initialize(); 
		stageConfig.u_stage_table_name = stageTableSysid;
		stageConfig.u_data_grouping = stageTableDataGrouping;
		stageConfig.u_active = true;
		stageConfig.u_generic = true;
		stageConfig.sys_domain = null;
		
		return stageConfig.insert().toString();
		
	},
	
	sync: function() {
		// Update the stage table from the u_acof_data_stage table entry
		
	},

    type: 'ACOFStageConfigMaintenance'
};