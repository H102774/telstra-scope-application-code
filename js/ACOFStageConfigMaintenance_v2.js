var ACOFStageConfigMaintenance_v2 = Class.create();

ACOFStageConfigMaintenance_v2.prototype = {
    initialize: function() {
        this.debug = gs.getProperty('debug.ACOFStageConfigMaintenance_v2') == 'true';
        this.debugPrefix = '>>>DEBUG: debug.ACOFStageConfigMaintenance_v2: ';
    },

    /*
    * Funtion to be called to 'start' this process
    *
    * desinationName - name of the production table to be synced
    */
    maintain: function(destinationName) {
        //Variables for the function
        var stageName = "";
        var stageLabel = "";
        var stageTableSysid = "";
        var stageTableDataGrouping = "";
        var stageAutoMaintain = false;
        var stageDestinationView = "";

        var dataStage = new GlideRecord('u_acof_data_stage');
        
        dataStage.addQuery('u_production_table', destinationName);
        dataStage.query();
        
        if(dataStage.next() && dataStage.u_auto_maintain) {
            stageName = dataStage.u_stage_table_name;
            stageLabel = dataStage.u_stage_table_label;
            dataGrouping = dataStage.u_data_item_grouping;
            destinationView = dataStage.u_destination_view;

            var sid = new GlideRecord('sys_db_object');
            
            sid.get('name', stageName);
            
            stageTableSysid = sid.sys_id;

            this.sync(destinationName, stageName, destinationView, dataGrouping,stageTableSysid, stageLabel);
            
            //this.sortGenericStageItems(stageTableSysid);
            
            this.sortGenericStageItems(stageName);
            
            //this.removeDuplicateGenerericStageItems(stageTableSysid);
            
            this.removeDuplicateGenerericStageItems(stageName);
        }
        else {
            //gs.log("ACOFStageConfigMaintenance: Manually Create Stage Items for " + destinationName,"ACOFStageConfigMaintenance");
        }

    },

    /*
    * Data staging config creation
    * Duplicates existing production table AND adds columns from extra fields table ("u_acof_data_item_columns")
    *
    * stageTableSysid - name of the production table to be synced
    * stageTableDataGrouping -
    */
    createStageConfig: function(stageTableSysid,stageTableDataGrouping, stagingTableName, stageLabel) {
        //gs.log('In createStageConfig. stageTableSysid = ' + stageTableSysid + ', stageTableDataGrouping = ' + stageTableDataGrouping, 'ACOFStageConfigMaintenance_v2 - A');
        
        var stageConfig = new GlideRecord('u_acof_data_stage_tables');

        stageConfig.initialize(); 
        //stageConfig.u_stage_table_name = stageTableSysid;
        stageConfig.u_data_grouping = stageTableDataGrouping;
        stageConfig.u_active = true;
        stageConfig.u_generic = true;
        stageConfig.sys_domain = null;
        stageConfig.u_staging_table = stagingTableName;
        stageConfig.u_staging_table_label = stageLabel;

        gs.print('created stage config stage');
        
        return stageConfig.insert().toString();
    },

    /*
    * Decides if an element should not be on a load sheet, such as sys_ elements, dot walked elements & read_only elements
    * 
    * destinationName - Name of the table for the load sheet
    * elementName - element name to be checked
    * dictionary - a 'dictionary' made up of all the elements that are on the destination table, including it's parents
    *
    */
    
    badElement: function(destinationName, elementName, dictionary){
        if((elementName.startsWith('sys_') && !(elementName =='sys_class_name')) || elementName.contains('.') || (dictionary.find('element', elementName) && dictionary.read_only == true)){
            return true;
        }
        else {
            return false;
        }
    },
    
    /*
    * Adds an ACOF rule into the _rule_definition table
    * 
    * ruleType - The rule type - should be added to the 'switch' if further actions are needed
    * stageTableSysid & columnSysid - The location of the table & column where the rule will be applied
    * info - any additional information needed by this function
    *        for example, relationship_stub's need to know the field they are referencing
    *
    */
    createRuleType: function(ruleType, stageTableSysid, columnSysid, info, stagingTableName, columnName){
        var insertRule = new GlideRecord('u_acof_data_rule_definition');            
        
        insertRule.initialize(); 
        //insertRule.u_stage_table_name = stageTableSysid;
        //insertRule.u_column_name = columnSysid;
        insertRule.u_rule_type = ruleType;
        //insertRule.u_column_order = 0;
        insertRule.u_active = true;
        insertRule.u_generic = true;
        insertRule.u_domain = null;
        insertRule.sys_domain = null;
        insertRule.u_manual_overide = false;
        insertRule.u_staging_table = stagingTableName;
        insertRule.u_column = columnName;

        //More cases should be added in future, when more rules get supported
        switch(ruleType) {
            case 'relationship_stub':
                //Handle the pooled rule assignment
                var dataStage = new GlideRecord('u_acof_data_stage');
                
                dataStage.addQuery('u_production_table', info);
                dataStage.query();
                dataStage.next();
                
                theStageTable = dataStage.u_stage_table_name;

                if(theStageTable == 'u_acof_st_core_company_parent'){
                    theStageTable = 'u_acof_st_core_company';
                }

                var rulePool = new GlideRecord('u_acof_data_rule_pool');
                
                rulePool.addQuery('u_value_1', theStageTable);
                rulePool.addQuery('u_rule_type', 'relationship_stub');
                rulePool.query();
                
                if(rulePool.next()){
                    insertRule.u_pooled_rule = true;
                    insertRule.u_rule = rulePool.sys_id;
                }
                else {
                    //gs.log('Query fail - no supported pooled rules for '+theStageTable+' in the rule pool','ACOFStageConfigMaintenance_v2');
                }

                insertRule.u_order = 10000;

                break;
            case 'reference_retention':
                //Handle the pooled rule assignment
                //I'm allowing it to use relationships defined in the relationship stub rules, they are in the same format [FOR NOW!]
                var dataStage = new GlideRecord('u_acof_data_stage');
                
                dataStage.addQuery('u_production_table', info);
                dataStage.query();
                dataStage.next();
                
                theStageTable = dataStage.u_stage_table_name;

                if(theStageTable == 'u_acof_st_core_company_parent'){
                    theStageTable = 'u_acof_st_core_company';
                }

                var rulePool = new GlideRecord('u_acof_data_rule_pool');
                
                rulePool.addQuery('u_value_1', theStageTable);
                var rp = rulePool.addQuery('u_rule_type', 'relationship_stub');
                rp.addOrCondition('u_rule_type','reference_retention');
                rulePool.query();
                
                if(rulePool.next()){
                    insertRule.u_pooled_rule = true;
                    insertRule.u_rule = rulePool.sys_id;
                }
                else {
                    //gs.log('Query fail - no supported pooled rules for '+theStageTable+' in the rule pool','ACOFStageConfigMaintenance_v2');
                }

                insertRule.u_order = 20000;

                break;

            case 'choicelist_retention':
                insertRule.u_order = 20000;

                break;

            case 'mandatory':
                insertRule.u_order = 30000;

                break;
        }

        insertRule.insertWithReferences();
    },

    /*
    * Adds an ACOF data stage into the _stage_items table
    * 
    * stageTableSysid & columnSysid - The location of the table & column where the rule will be applied
    */  
    createDataStage: function(stageTableSysid, columnSysid, tableName, columnName){
        var insertItem = new GlideRecord('u_acof_data_stage_items');    
        
        insertItem.initialize(); 
        //insertItem.u_stage_table_name = stageTableSysid;
        //insertItem.u_column_name = columnSysid;
        insertItem.u_column_order = 0;
        insertItem.u_manual_overide = false;
        insertItem.u_active = true;
        insertItem.u_generic = true;
        insertItem.u_domain = null;
        insertItem.sys_domain = null;

        insertItem.u_staging_table = tableName;
        insertItem.u_column = columnName;

        //gs.print("inserted datatstage","ACOFStageConfigMaintenance_v2")
        
        return insertItem.insert();
    },

    /*
    * First pass on the data - for every element check it against u_acof_data_stage_items
    * 
    * destinationName - destination table to be copied
    * stageName - stage table for the stage items to be created
    * element - element that we're syncing
    * dict - dictionary of the the destination table
    * stdict - dictionary of the staging table
    *
    */  
    syncElement: function(destinationName, stageName, element, dict, stdict,stageTableSysid){
        //Ingnore all sys_, dot walked & read only elements.
        if(this.badElement(destinationName, element.element, dict)){
            //gs.print('Ignore this element! ' + element.element,'ACOFStageConfigMaintenance_v2.syncElement')
            return false;
        }

        var columnSysid = "";
        var columnReadOnly = false;
        var columnReference = "";
        var name = element.element;
        var isReference = false;
        var isChoiceList = false

        var columnName = "";

        //get rules from dictionary, if it's mandatory or a reference
        //if(dict.find('element', element.element)){
        if(dict.find('element', name)){
            columnMandatory = dict.mandatory;
            
            isReference = (dict.internal_type == 'reference');
            
            columnReference = dict.reference;

            if(dict.choice == 1 | dict.choice == 2){
                isChoiceList = true; 
            }
        }

        //Check the stageItemDictionary for 'things we need'
        if(stdict.find('element', element.element)){
            columnSysid = stdict.sys_id.toString();
            columnName = stdict.element;

            //Now, check the existance of the stage item
            var checkItem = new GlideRecord('u_acof_data_stage_items');
            
            //checkItem.addQuery("u_stage_table_name",stageTableSysid);
            //checkItem.addQuery("u_column_name",columnSysid);

            checkItem.addQuery("u_staging_table", stageName);
            checkItem.addQuery("u_column", columnName);

            checkItem.query();
            //if it exists, knock it into active
            if(checkItem.next()) {
                checkItem.u_active = true;
                checkItem.update();

                //now check the rules associated with it
                //TODO: Function this part of the code, especially for non-pooled rules like mandatory & choicelist origs

                //first - mandatory
                if(columnMandatory){
                    var checkRule = new GlideRecord('u_acof_data_rule_definition');
                    
                    checkRule.addQuery('u_staging_table', stageName);
                    checkRule.addQuery('u_column', columnName);
                    checkRule.addQuery('u_rule_type', "mandatory");
                    checkRule.query();
                    
                    if(checkRule.next()){
                        //if it's there, make sure it's active
                        checkRule.u_active = true;
                        checkRule.update();
                    }
                    else {
                        //if not, create it
                        this.createRuleType("mandatory",stageTableSysid,columnSysid,"", stageName, columnName);
                    }
                }

                //If it's a choicelist
                if(isChoiceList){
                    var checkRule = new GlideRecord('u_acof_data_rule_definition');
                    
                    checkRule.addQuery('u_staging_table', stageName);
                    checkRule.addQuery('u_column', columnName);
                    checkRule.addQuery('u_rule_type', "choicelist_retention");
                    checkRule.query();
                    
                    if(checkRule.next()){
                        //if it's there, make sure it's active
                        checkRule.u_active = true;
                        checkRule.update();
                    }
                    else {
                        //if not, create it
                        this.createRuleType("choicelist_retention",stageTableSysid,columnSysid,"", stageName, columnName);
                    }
                }

                //Next - column references
                if(isReference) {
                    var checkRule = new GlideRecord('u_acof_data_rule_definition');
                    
                    checkRule.addQuery('u_staging_table', stageName);
                    checkRule.addQuery('u_column', columnName);
                    checkRule.addQuery('u_rule_type', "relationship_stub");
                    checkRule.query();
                    
                    if(checkRule.next()) {
                        //if it's there, make sure it's active
                        checkRule.u_active = true;
                        //gs.print(checkRule.u_rule_type);
                        //make sure the pooled rule is right 
                        //This needs functioning at some point...
                        
                        var dataStage = new GlideRecord('u_acof_data_stage');
                        
                        dataStage.addQuery('u_production_table', dict.reference.name);
                        dataStage.query();
                        dataStage.next();
                        
                        theStageTable = dataStage.u_stage_table_name;

                        if(theStageTable == 'u_acof_st_core_company_parent'){
                            theStageTable = 'u_acof_st_core_company';
                        }

                        var rulePool = new GlideRecord('u_acof_data_rule_pool');
                        
                        rulePool.addQuery('u_value_1', theStageTable);
                        rulePool.addQuery('u_rule_type', 'relationship_stub');
                        rulePool.query();
                        
                        if(rulePool.next()) {
                            checkRule.u_pooled_rule = true;
                            checkRule.u_rule = rulePool.sys_id;
                        }
                        else {
                            //gs.log('Query fail - no supported pooled rules for '+theStageTable+' in the rule pool','ACOFStageConfigMaintenance_v2');
                        }
                        checkRule.update();
                    }
                    else {
                        //if not, create it
                        this.createRuleType("relationship_stub",stageTableSysid,columnSysid, dict.reference.name, stageName, columnName);
                    }
                }

                //Now, handle orig support for references
                if(isReference){
                    var checkRule = new GlideRecord('u_acof_data_rule_definition');
                    
                    checkRule.addQuery('u_staging_table', stageName);
                    checkRule.addQuery('u_column', columnName);
                    checkRule.addQuery('u_rule_type', "reference_retention");
                    checkRule.query();
                    
                    if(checkRule.next()) {
                        //if it's there, make sure it's active
                        checkRule.u_active = true;
                        //gs.print(checkRule.u_rule_type);
                        //make sure the pooled rule is right 
                        //This needs functioning at some point...
                        
                        var dataStage = new GlideRecord('u_acof_data_stage');
                        
                        dataStage.addQuery('u_production_table', dict.reference.name);
                        dataStage.query();
                        dataStage.next();
                        
                        theStageTable = dataStage.u_stage_table_name;

                        if(theStageTable == 'u_acof_st_core_company_parent'){
                            theStageTable = 'u_acof_st_core_company';
                        }

                        var rulePool = new GlideRecord('u_acof_data_rule_pool');
                        
                        rulePool.addQuery('u_value_1', theStageTable);
                        var rp = rulePool.addQuery('u_rule_type', 'relationship_stub');
                        rp.addOrCondition('u_rule_type','reference_retention');
                        rulePool.query();
                        
                        if(rulePool.next()) {
                            checkRule.u_pooled_rule = true;
                            checkRule.u_rule = rulePool.sys_id;
                        }
                        else {
                            //gs.log('Query fail - no supported pooled rules for '+theStageTable+' in the rule pool','ACOFStageConfigMaintenance_v2');
                        }
                        checkRule.update();
                    }
                    else {
                        //if not, create it
                        this.createRuleType("reference_retention",stageTableSysid,columnSysid, dict.reference.name, stageName, columnName);
                    }
                }
            }
            else {
                //If it doesn't exist, create the rules & record!
                if(columnMandatory){
                    this.createRuleType("mandatory",stageTableSysid,columnSysid,"", stageName, columnName);
                }

                if(isReference){
                    this.createRuleType("relationship_stub",stageTableSysid,columnSysid, dict.reference.name, stageName, columnName);
                    this.createRuleType("reference_retention",stageTableSysid,columnSysid, dict.reference.name, stageName, columnName);
                }

                if(isChoiceList){
                    this.createRuleType("choicelist_retention",stageTableSysid,columnSysid,"", stageName, columnName);
                }

                this.createDataStage(stageTableSysid,columnSysid, stageName, columnName);
            }
        } else {
            //Not sure what to do here
            //if the column is not in the dictionary we're looking at - there might be a spooky issue
            //gs.log("ACOFStageConfigMaintenance: Column not found " + stageName + " : " + name,"ACOFStageConfigMaintenance");
        }
    },

    syncStageItems: function(dataStageItem, element, stdict, stageName){
        //gs.log('In syncStageItems. dataStageItem = ' + dataStageItem + ', element = ' + element + ', stdict = ' + stdict + ', stageName = ' + stageName, 'syncStageItems - AB');

        //if(element.find('element', dataStageItem.u_column_name.element)) {
        if(element.find('element', dataStageItem.u_column) | dataStageItem.u_column == 'sys_class_name') {
            //do nothing
            //gs.print('found this ' + dataStageItem.u_column_name.element)
        }
        else {
            //deactiveate the stage item
            //gs.print('cant find this ' + dataStageItem.u_column_name.element)
            dataStageItem.u_active = false;
            dataStageItem.update();

            //deactiviate any rules
            if(stdict.find('element', element.element)){
                //columnSysid = stdict.sys_id.toString();
                columnName = stdict.element;

                var checkRule = new GlideRecord('u_acof_data_rule_definition');
                
                checkRule.addQuery('u_staging_table', stageName);
                checkRule.addQuery('u_column', columnName);
                //dectivate all rules!
                //checkRule.addQuery('u_rule_type', "relationship_stub")
                checkRule.query();
                if(checkRule.next()){
                    checkRule.u_active = false;
                    checkRule.update();
                }
            }
        }
    },

    /*
    * Data staging item sort
    * stageTableSysid - sorts existting stage items for this table
    */
    sortGenericStageItems: function(stageTableName){
        //gs.log("ACOFStageConfigMaintenance: Sort Stage Items","ACOFStageConfigMaintenance");
        //gs.log("ACOFStageConfigMaintenance: Sort Stage Items for " + stageTableSysid,"ACOFStageConfigMaintenance");
        
        var count = 0;
        var stageItem = new GlideRecord("u_acof_data_stage_items");
        
        stageItem.addQuery("u_staging_table", stageTableName);
        stageItem.addQuery("u_generic", true);
        stageItem.addQuery("u_manual_overide", false)
        
        stageItem.orderBy("u_safe_name");
        
        stageItem.query();
        
        while(stageItem.next()){
            var ruleItem = new GlideRecord('u_acof_data_rule_definition');
            
            ruleItem.addQuery("u_staging_table", '' + stageItem.u_staging_table);
            ruleItem.addQuery("u_column", '' + stageItem.u_column);
            
            //ruleItem.addQuery("u_rule_type","mandatory");
            
            ruleItem.addEncodedQuery('u_rule_typeINmandatory,key_field');
            ruleItem.query();
            
            if(ruleItem.next()){
                //gs.log("ACOFStageConfigMaintenance: Sort Stage Items for " + stageItem.u_column_name.name,"ACOFStageConfigMaintenance");
                // if it is a mandatory or key field place in the first 1000
                //stageItem.u_column_order = ruleItem.u_order;
                stageItem.u_column_order = count;
            }
            else {
                // if it is not a mandatory or key field place after 1000
                stageItem.u_column_order = 1000 + count;
            }

            stageItem.update();
            count++;
        }
    },

    /*
    * Data stage item remove duplicates
    * stageTableSysid - removes dupes from this table
    */
    removeDuplicateGenerericStageItems: function(stageTableName) {
        var previous = "";
        var prevtable = "";

        var stageItem = new GlideRecord("u_acof_data_stage_items");
        
        stageItem.addQuery("u_staging_table", stageTableName);
        stageItem.addQuery("u_generic", true);
        stageItem.addQuery("u_manual_overide", false)
        
        //stageItem.orderBy("u_column_name.column_label");
        stageItem.orderBy("u_safe_name");
        
        stageItem.query();
        
        while(stageItem.next()) {
            if((stageItem.u_column_name.column_label == previous.column_label) && (stageItem.u_column_name.name == prevtable)) {
                stageItem.u_active = false;
                stageItem.update();
            }

            //previous = stageItem.u_column_name.column_label;
            //prevtable = stageItem.u_column_name.name;
            previous = stageItem.u_safe_name;
            prevtable = stageItem.u_staging_table;
        }
    },

    /*
    *   Sync the stage items for a specific table
    *   destinationName - the table to be synced
    *   stageName - the staging that the stage items link to
    *   destinationView - the form view on the desination table to be analysed
    *   dataGrouping - unused
    *   stageTableSysid - the stage table that the stage items link to
    *
    */
    sync: function(destinationName, stageName, destinationView, dataGrouping, stageTableSysid, stageLabel){
        var stageConfigId = "";

        var dataStageTable = new GlideRecord('u_acof_data_stage_tables');
        
        dataStageTable.addQuery('u_staging_table', stageName);
        dataStageTable.query();

        if(dataStageTable.next()){
            stageConfigId = dataStageTable.sys_id;
        }
         else{
            //stage config missing -- create it!
            stageConfigId = this.createStageConfig(stageTableSysid,dataGrouping, stageName, stageLabel);
        }

        var table = new TableUtils(destinationName);
        var parents = table.getTables();
        var parentsJS = j2js(parents);

        var dict = new GlideRecord('sys_dictionary');
        var qc = dict.addQuery('name', 'IN', parentsJS);
        
        /*
        for (var i = 0; i < parents.size(); i++) {
            qc.addOrCondition('name', parents.get(i));
        }
        */

        dict.query();

        var stagetable = new TableUtils(stageName);
        var stageparents = stagetable.getTables();
        var stageparentsJS = j2js(stageparents);

        //gs.print(stageparents);

        var stdict = new GlideRecord('sys_dictionary');
        var qa = stdict.addQuery('name', 'IN', stageparentsJS);
        
        /*
        for (var i = 0; i < stageparents.size(); i++) {
            qa.addOrCondition('name', stageparents.get(i));
        }
        */
        
        stdict.query();

        var sections = [];
        
        var section = new GlideRecord("sys_ui_form_section");
        
        section.addQuery("sys_ui_form", destinationView);
        section.orderBy("position");
        section.query();
        
        while(section.next()){
            sections.push(section.sys_ui_section.toString());
        }

        for (var sn=0;sn<sections.length;sn++){
            var element = new GlideRecord("sys_ui_element");
            
            element.addQuery("sys_ui_section",sections[sn]);
            element.addQuery("type",null);
            element.query();
            
            while(element.next()){
                this.syncElement(destinationName,stageName,element,dict, stdict,stageTableSysid);
            }
        }

        var checkElements = new GlideRecord("sys_ui_element");
        var orq = checkElements.addQuery("element",'.split');
        
        for (var sn = 0; sn < sections.length; sn++) {
            orq.addOrCondition('sys_ui_section', sections[sn]);
        }

        checkElements.addQuery("type",null);
        checkElements.query();

        //gs.print(checkElements.getRowCount());

        //Second pass, for every u_acof_data_stage_item
        var dataStageItem = new GlideRecord('u_acof_data_stage_items');
        //dataStageItem.addQuery("u_stage_table_name",stageTableSysid);
        dataStageItem.addQuery("u_staging_table", stageName);
        dataStageItem.addQuery("u_manual_overide", false);
        dataStageItem.query();
        while(dataStageItem.next()){
            this.syncStageItems(dataStageItem,checkElements, stdict, stageName);
        }
    },

    type: 'ACOFStageConfigMaintenance_v2'
};