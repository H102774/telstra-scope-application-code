gs.include("PrototypeServer");

var ACOFTableDescriptor = Class.create();

ACOFTableDescriptor.prototype = {
	initialize : function(name, label) {
		this.tableName = name;
		this.tableLabel = label;
		
		this.attributes = '';
		this.extendsName = '';
		
		this.create_roles = '';
		this.read_roles = '';
		this.write_roles = '';
		this.delete_roles = '';
		
		this.fields = [];
		this.fieldsSeen = {};
	},
	
	setExtends : function(name) {
		this.extendsName = name;
	},
	
	setAttributes : function(attrs) {
		this.attributes = attrs;
	},
	
	setRoles : function(td) {
		var tableName = td.getName();
		var d = new GlideRecord("sys_dictionary");
		
		d.addQuery("name", tableName);
		d.addNullQuery("element");
		d.query();
		
		if (!d.next()) {
			return;
		}
		
		this.read_roles = d.read_roles.toString();
		this.write_roles = d.write_roles.toString();
		this.create_roles = d.create_roles.toString();
		this.delete_roles = d.delete_roles.toString();
	},
	
	create: function() {
		var doc = new GlideXMLDocument('database');
		var e = doc.createElement('element');
		
		e.setAttribute('name', this.tableName);
		e.setAttribute('label', this.tableLabel);
		e.setAttribute('type', 'collection');
		
		if (this.read_roles) {
			e.setAttribute('read_roles', this.read_roles);
		}
		
		if (this.write_roles) {
			e.setAttribute('write_roles', this.write_roles);
		}
		
		if (this.create_roles) {
			e.setAttribute('create_roles', this.create_roles);
		}
		
		if (this.delete_roles) {
			e.setAttribute('delete_roles', this.delete_roles);
		}
		
		if (this.attributes) {
			e.setAttribute('attributes', this.attributes);
		}
		
		if (this.extendsName != '') {
			e.setAttribute("extends", this.extendsName);
		}
		
		doc.setCurrent(e);
		
		for (var i = 0; i < this.fields.length; i++) {
			var fd = this.fields[i];
			
			fd.toXML(doc);
		}
		
		var boot = new GlideBootstrap(doc.getDocument());
		
		boot.upgradeTables();
	},
	
	copyIndexes: function(source, target) {
		var td = new GlideTableDescriptor(source);
		
		td.getSchema();
		
		var toCreate = new Packages.java.util.ArrayList();
		var indexes = td.getIndexDescriptors();
		
		for (var iter = indexes.values().iterator(); iter.hasNext(); ) {
			var idx = iter.next();
			
			if (idx.isAutomaticallyGenerated() || idx.isPrimary()) {
				continue;
			}
			
			var flds = idx.getFields();
			var idxname = idx.getName();
			var parts = idxname.split("_");
			
			idxname = parts[parts.length-1];
			
			var idx2 = new GlideIndexDescriptor(target, idxname, flds);
			
			toCreate.add(idx2);
		}
		
		td.close();
		
		var dbi = new GlideDBConfiguration.getDBI(target);
		
		new GlideDBIndex(dbi).create(target, toCreate);
		
		dbi.close();
	},
	
	addField: function(fieldDescriptor) {
		var fn = fieldDescriptor.getName();
		
		if (this.fieldsSeen[fn]) {
			return;
		}
		
		this.fieldsSeen[fn] = true;
		this.fields.push(fieldDescriptor);
	},
	
	//Copy the attributes to the new table
	copyAttributes : function(td) {
		var attrs = td.getED().serializeAttributes();
		
		if (!attrs) {
			this._debug('There are no attributes to copy');
			
			return;
		}
		
		this._debug('Attributes = ' + attrs);
		
		if (!td.getED().hasAttribute("no_update")) {
			this.setAttributes(attrs);
			
			return;
		}
		
		if (!td.getElementDescriptor('sys_updated_on')) {
			this.setAttributes(attrs);
			
			return;
		}
		
		this.setAttributes(this.removeAttr(attrs, 'no_update'));
	},
	
	removeAttr: function(attrs, attr) {
		var list = attrs.split(',');
		var answer = [];
		
		for (var i = 0; i < list.length; i++) {
			if (!(list[i].indexOf(attr) == 0)) {
				answer.push(list[i]);
			}
		}
		
		return answer.join(",");
	},
	
	// Copy the fields from current to new table
	setFields : function(tblGr) {
		var fields = tblGr.getFields();
		
		this._debug('In setFields. Size = ' + fields.size());
		
		for (var i = 0; i < fields.size(); i++) {
			this._debug('Field ' + i + ' = ' + fields.get(i).getName());
			
			this._processField(fields.get(i), tblGr.getTableName());
		}
	},
	
	// Get all the details for a field in the current table
	_processField : function (fldObj, targetTable) {
		this._debug('In _processField');
		
		this.currentFieldObject = fldObj;
		
		this._debug('Current field object = ' + fldObj.getName() + ', ' + fldObj.getTableName());
		
		var fieldTable = this.currentFieldObject.getTableName();
		var fieldName = this.currentFieldObject.getName();
		var fieldDescriptorName = this.currentFieldObject.getName();
		var fieldLabel = this.currentFieldObject.sys_meta.label;
		var fieldLength = this.currentFieldObject.getAttribute("max_length");
		var fieldType = this.currentFieldObject.getED().getInternalType();
		
		var loadTable = false;
		var fetchRealField = 'fetchReal';
		
		this._debug('Field name = ' + fieldName);
		this._debug('Set variables = ' + fldObj.getName() + ':' + fieldName);
		
		//Is the new table a load table?
		if (this.tableName.lastIndexOf('u_acof_ld_', 0) === 0) {
			loadTable = true;
			
			//Rename the fieldDescriptorName for load tables
			fieldDescriptorName = 'u_' + fieldLabel.toLowerCase().replace(/[^\w]/gi, ' ')
			.trim()
			.replace(/\s\s+/g, ' ', " ")
			.replace(/ /g, "_");
			
			//Check if we have a Reference or a Boolean in a load table. These need to be strings
			if (fieldType == 'reference' || fieldType == 'date' || fieldType == 'glide_date' || fieldType == 'glide_date_time' || fieldType == 'boolean' || fieldType == 'choice' || fieldType == 'sys_class_name' || fieldType == 'glide_list') {
				fetchRealField = fieldType;
			}
		}
		
		this._debug('Passed load table check = ' + fldObj.getName());
		this._debug('Check fieldTable = ' + fieldTable + ':' + fieldName);
		this._debug('Check targetTable = ' + targetTable + ':' + fieldName);
		
		/*
		if (fieldTable != targetTable) {
			return;
		}
 		*/
		
		this._debug('Checking _ignoreField function for ' + fieldName);
		
		if (this._ignoreField(fieldName)) {
			return;
		}
		
		//Fetch the dictionary element for the table and field we want
		var dict = new GlideRecord('sys_dictionary');
		
		if (fetchRealField == 'reference' || fetchRealField == 'sys_class_name') {
			//Fetch the String from the template table we use
			dict.addQuery('name', 'u_acof_data_item_load_types');
			dict.addQuery('element', 'u_load_reference');
		}
		else if (fetchRealField == 'boolean' || fetchRealField == 'choice') {
			//Fetch the String from the template table we use
			dict.addQuery('name', 'u_acof_data_item_load_types');
			dict.addQuery('element', 'u_load_boolean');
		}
		else if (fetchRealField == 'date' || fetchRealField == 'glide_date' || fetchRealField == 'glide_date_time') {
			//Fetch the String from the template table we use
			dict.addQuery('name', 'u_acof_data_item_load_types');
			dict.addQuery('element', 'u_load_date');
		}
		else if (fetchRealField == 'glide_list') {
			dict.addQuery('name', 'u_acof_data_item_load_types');
			dict.addQuery('element', 'u_load_list');
		}
		else {
			//Fetch the real field from the dictionary for the Table and Field we want
			dict.addQuery('name', fieldTable);
			dict.addQuery('element', fieldName);
		}
		
		dict.query();
		
		if (!dict.hasNext()) {
			return;
		}
		
		dict.next();
		
		if (this.displayName == fieldName) {
			dict.display = true;
		}
		
		// Declare the new field object
		var ca = new FieldDescriptor(fieldDescriptorName);
		
		ca.setPrototype(dict);
		
		ca.setField('label', this.currentFieldObject.sys_meta.label);
		ca.setField('plural', this.currentFieldObject.sys_meta.plural);
		
		this._setReference(ca);
		
		if (this.currentFieldObject.getED().getChoice()) {
			ca.setChoiceTable(targetTable);
			ca.setChoiceField(fieldName);
		}
		
		//if (loadTable){
			
			ca.setField('unique', false);
			ca.setField('mandatory', false);
			ca.setField('default_value', '');
			
			//}
			
			//Remove all references for load tables and override any field length > 4000
			if(loadTable) {
				ca.setField('reference', '');
				
				if(fieldLength > 4000) {
					//ca.setField('max_length', 4000);
					ca.setField('max_length', 100);
					
					}
				}
				
				this.addField(ca);
				
			},
			
			//Ignore the core sys_* fields
			_ignoreField : function (fieldName) {
				this._debug('In _ignoreField function. Field = ' + fieldName);
				
				if (fieldName == 'sys_updated_by') {
					return true;
				}
				
				if (fieldName == 'sys_updated_on') {
					return true;
				}
				
				if (fieldName == 'sys_created_by') {
					return true;
				}
				
				if (fieldName == 'sys_created_on') {
					return true;
				}
				
				if (fieldName == 'sys_mod_count') {
					return true;
				}
				
				return false;
			},
			
			_setReference : function (ca) {
				var ref = this.currentFieldObject.getED().getReference();
				
				if (ref == null || ref == '') {
					return;
				}
				
				ref = 'u_acof_st_' + ref;
				
				ca.setReferenceTable(ref);
			},
			
			_z : function() {
				return "ACOFTableDescriptor";
			},
			
			_debug: function(message) {
				if(gs.getProperty('debug.ACOFTableDescriptor') == 'true') {
					gs.log(new GlideDateTime().getNumericValue() + ': ' + message, 'ACOFTableDescriptor');
				}
			},
		};