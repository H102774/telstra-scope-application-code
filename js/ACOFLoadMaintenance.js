var ACOFLoadMaintenance = Class.create();

ACOFLoadMaintenance.prototype = {
    initialize: function() {
    },
	
	maintain: function(loadTableName, loadTableLabel, productionTableName) {
		this._debug('In maintain function');
		this._debug('loadTableName = ' + loadTableName + ', loadTableLabel = ' + loadTableLabel + ', productionTableName = ' + productionTableName);
		
		//Return false if any of the parameters are empty
		if(loadTableName != '' && loadTableLabel != '' && productionTableName != '') {
			//Check if the Load Table exists
			var loadTable = new GlideRecord(loadTableName);
			
			if (loadTable.isValid()) {
				this._debug('Load table (' + loadTableName + ') already exists. Resyncing...');

				//Resync the load table
				this.sync(productionTableName, loadTableName);
				
				return true;
			}
			else {
				this._debug('Load table (' + loadTableName + ') does not exist. Creating...');
				
				//Create the load table
				var response = this.create(productionTableName, loadTableName, loadTableLabel);
				
				return response;
			}
		} 
		else {
			this._debug('Error, 1+ parameters not provided. Expected loadTableName, loadTableLabel and productionTableName');
			
			//Do nothing
			return false;
		}
	},	
	
	create: function(productionTableName, loadTableName, loadTableLabel) {
		this._debug('In create function');
		
		//Use the production table as a model
		var destinationTable = new GlideRecord(productionTableName);
		
		destinationTable.initialize();
		
		var destinationDescriptor = GlideTableDescriptor.get(productionTableName);
		var displayName = destinationDescriptor.getDisplayName();
		
		//Add the ACOF Extra fields to the model
		var loadExtra = new GlideRecord("u_acof_data_item_columns");
		
		loadExtra.initialize();
		
		var extraDescriptor = GlideTableDescriptor.get("u_acof_data_item_columns");
		
		var creator = new ACOFTableDescriptor(loadTableName, loadTableLabel);

		//Extend sys_import_set_row
		creator.setExtends('sys_import_set_row');
		
		//Copy production fields to load table
		//creator.setFields(destinationTable);

		//Create load table
		this._debug('Creating load table');

		creator.create();
		
		this._createFields(productionTableName, loadTableName);
		
		return true;
	},	
	
	sync: function(productionTableName, loadTableName) {
		//Create the load table fields using the stage items as a template
		this._createFields(productionTableName, loadTableName);
	},

	_debug: function(message) {
		if(gs.getProperty('debug.ACOFLoadMaintenance') == 'true') {
			gs.log(new GlideDateTime().getNumericValue() + ': ' + message, 'ACOFLoadMaintenance');
		}
	},
	
	_createFields: function (productionTableName, loadTableName) {
		//Create the dictionary entries
		var grSI = new GlideRecord('u_acof_data_stage_items');
		
		//grSI.addQuery('u_stage_table_name.name', 'u_acof_st_' + productionTableName);
        grSI.addQuery('u_staging_table', 'u_acof_st_' + productionTableName);
		grSI.query();
		
		this._debug('Getting stage items = https://' + gs.getProperty('instance_name') + '.service-now.com/u_acof_data_stage_items_list.do?sysparm_query=' + grSI.getEncodedQuery(), 'ACOFLoadMaintenance');
		
		while(grSI.next()) {
			//Search for a dictionary entry for the load table
			var grD = new GlideRecord('sys_dictionary');
			
			grD.addQuery('name', loadTableName);
			grD.addQuery('column_label', grSI.u_safe_name);
			grD.query();
			
			this._debug('Dictionary EQ = https://' + gs.getProperty('instance_name') + '.service-now.com/sys_dictionary_list.do?sysparm_query=' + grD.getEncodedQuery());
			
			if(!grD.next()) {
				//Create a new entry - only passing in the load table name and the column safe name. SN will compute column name based on the label
				var grD_2 = new GlideRecord('sys_dictionary');
				
				grD_2.initialize();
				
				grD_2.name = loadTableName;
				grD_2.column_label = grSI.u_safe_name;
				grD_2.max_length = this._getFieldLength(productionTableName, grSI.u_column_name.element);
				grD_2.attributes = 'import_attribute_name=' + grSI.u_safe_name;
				
				grD_2.insert();
			}
		}
		
		
		
		
		
		
		
		
	},
	
	
	
	
	
	_getFieldLength: function(productionTable, fieldName) {
		var maxLength = 40; //Default
		
		var grD = new GlideRecord('sys_dictionary');
		
		grD.addQuery('name', 'IN', this._getParents(productionTable));
		grD.addQuery('element', fieldName);
		grD.query();
		
		this._debug('_getFieldLength EQ = https://' + gs.getProperty('instance_name') + '.service-now.com/sys_dictionary_list.do?sysparm_query=' + grD.getEncodedQuery());
		
		if(grD.next()) {
			//Is it a reference field?
			if(grD.internal_type.name == 'reference') {
				//Get the length of the referenced display value
				var grD_2 = new GlideRecord('sys_dictionary');
				
				grD_2.addQuery('name', 'IN', this._getParents(grD.reference.name));
				grD_2.addEncodedQuery('display=true^ORelement=name^ORelement=u_name');
				grD_2.query();
				
				this._debug('_getFieldLength reference EQ = https://' + gs.getProperty('instance_name') + '.service-now.com/sys_dictionary_list.do?sysparm_query=' + grD_2.getEncodedQuery());
		
				if(grD_2.next()) {
					maxLength = grD_2.max_length;
				}
			}
			else {
				maxLength = grD.max_length;
			}
		}
		
		return maxLength;
	},
	
	_getParents: function(table) {
		var tu = new TableUtils(table);
		var tableList = tu.getTables();
		var tableList_js = j2js(tableList);
		
		return tableList_js;
	},

    type: 'ACOFLoadMaintenance'
};