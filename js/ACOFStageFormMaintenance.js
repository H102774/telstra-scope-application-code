var ACOFStageFormMaintenance = Class.create();
ACOFStageFormMaintenance.prototype = {
    initialize: function() {
        this.debug = gs.getProperty('debug.ACOFStageMaintenance') == 'true';
        this.debugPrefix = '>>>DEBUG: debug.ACOFStageMaintenance: ';
    },

    createElement: function(tableName, type, position, element, section_sys_id){
        var insertForms = new GlideRecord("sys_ui_element");
        insertForms.initialize();
        insertForms.name = tableName;
        insertForms.type = type;
        insertForms.position = position;
        insertForms.element = element;
        insertForms.sys_ui_section = section_sys_id;
        insertForms.insertWithReferences();

        return insertForms.sys_id;
    },

    createSection: function(tableName, caption, title, header, view){
        var insertForms = new GlideRecord("sys_ui_section");
        insertForms.initialize();
        insertForms.name = tableName;
        insertForms.caption = caption;
        insertForms.title = title;
        insertForms.header = header;
        insertForms.view = view;
        insertForms.insertWithReferences();

        return insertForms.sys_id;
    },

    delRecord: function(table, sys_id){
        var del = new GlideRecord(table);
        del.addQuery('sys_id', sys_id);
        del.query();
        del.next();
        del.deleteRecord();
    },

    createSister: function(form, position, section){
        var insertForms = new GlideRecord("sys_ui_form_section");
        insertForms.initialize();
        insertForms.sys_ui_form = form;
        insertForms.position = position;
        insertForms.sys_ui_section = section;
        insertForms.insertWithReferences();
    },

    copySection: function(prodSection, stageName){
        stageSection = this.createSection(stageName, prodSection.caption, prodSection.title, prodSection.header, prodSection.view);
        this.syncElements(prodSection, stageSection);

        return stageSection;

    },

    elementMatch: function(el1, el2){
        return el1.element == el2.element && el1.position == el2.position && el1.type == el2.type;
    },

    sectionMatch: function(s1, s2){
        return s1.caption == s2.caption && s1.header == s2.header && s1.title == s2.title;
    },

    syncSection: function(prodSection, stageSection){
        var update = new GlideRecord('sys_ui_section');
        update.addQuery('sys_id',stageSection);
        update.query();
        update.next();

        update.caption = prodSection.caption;
        update.view = prodSection.view;
        update.title = prodSection.title;
        update.updateWithReferences();

        gs.print('updated:  ' + update.caption);

        this.syncElements(prodSection, update.sys_id);

    },

    syncElements: function(prodSection, stageSection){
        var dataProdElements = new GlideRecord("sys_ui_element");
        dataProdElements.addQuery('sys_ui_section', prodSection.sys_id);
        dataProdElements.orderBy('position');
        dataProdElements.query();

        var dataAcofElements = new GlideRecord("sys_ui_element");
        dataAcofElements.addQuery('sys_ui_section', stageSection);
        dataAcofElements.orderBy('position');
        dataAcofElements.query();

        while(dataProdElements.next()){
            if(dataAcofElements.find('position', dataProdElements.position)){
                if(this.elementMatch(dataAcofElements, dataProdElements)){
                    //complete match -- do nothing
                }else{
                    //this is 'bugged' delete it & create it better
                    this.delRecord('sys_ui_element', dataAcofElements.sys_id);
                    this.createElement(stageSection.name, dataProdElements.type, dataProdElements.position, dataProdElements.element, stageSection);
                }
            }else{
                //it's missing, create it! :)
                this.createElement(stageSection.name, dataProdElements.type, dataProdElements.position, dataProdElements.element, stageSection);
            }
        }

        var dataAcofElements = new GlideRecord("sys_ui_element");
        dataAcofElements.addQuery('sys_ui_section', stageSection);
        dataAcofElements.orderBy('position');
        dataAcofElements.query();

        while(dataAcofElements.next()){
            //If   we can't find the element on the acof table             OR  We find an element out of position                                                                                     OR We just find an element in an non-prod position
            if(!dataProdElements.find('element', dataAcofElements.element) || (dataProdElements.find('position', dataAcofElements.position)) && (dataProdElements.element != dataAcofElements.element) || !(dataProdElements.find('position', dataAcofElements.position)) ){
                //trash it
                this.delRecord('sys_ui_element', dataAcofElements.sys_id);
            }
        }
    },

    cascadeSisterDelete: function(formSection2){
        //This does 'cascade' delete elements & sister sections
        this.delRecord('sys_ui_section', formSection2.sys_ui_section);
    },
	
	checkDomain: function(){
		var test = new GlideRecord('sys_ui_form');
		test.initalize();
		test.name = 'Test';
		testid = test.insert();
		insertDomain = test.sys_domain.name;
		var droptest = new GlideRecord('sys_ui_form');
		droptest.addQuery('sys_id', testid);
		droptest.query();
		droptest.next();
		droptest.deleteRecord();
		
		return insertDomain;
	},

    //destinationTableId -- passed as a sys_id
    maintain: function(destinationTableId){
        // Variables for the function
        var stageName = "";
        var autoMaintain = "";
        var destinationName = "";
        var prodForm = "";

        //Use ACOF Data Stage table to find the sister tables & forms
        var dataStage = new GlideRecord("u_acof_data_stage");
        dataStage.addQuery('u_production_table_name.name', destinationTableId);
        dataStage.query();
        if(dataStage.next()){
            //Check is autoMaintain is on -- if it is proceed.
            autoMaintain = dataStage.u_auto_maintain;
            stageName = dataStage.u_stage_table_name;
            prodForm = dataStage.u_destination_view;
            destinationName = dataStage.u_destination_view.name;
            if(autoMaintain){

                //Log what we're touching!
                gs.print("ACOFStageFormMaintenance: Maintenance Function looking at Stage Table ID - "
                    + destinationTableId
                    + " --> "
                    + stageName, "ACOFStageFormMaintenance");

                //Sync the table!
                return this.sync(autoMaintain, stageName, prodForm, destinationName);

                //Create function ommited as sync 'covers' it :)
            }else{

                //If no autoMaintain -> don't touch it.
                gs.print("ACOFStageFormMaintenance: Auto Maintain is inactive, ignoring Stage Table ID - "
                    + destinationTableId
                    + ":"
                    + stageName, "ACOFStageFormMaintenance");
                //do nothing...?
                //Do nothing vs -- Put something in the log?
                return false;
            }
        }else{
            gs.print('QueryFail -- not able to find anything in the u_acof_data_stage table\n This table is not ACOF supported', "ACOFStageFormMaintenance");
            return false;
        }

    },

    removeDuplicates: function(list) {
        list.sort();
        var out = [];
        var prev = '';

        for (var i = 0; i < list.length; i++) {
            if(list[i] == prev){
            }else{
                out.push(list[i])
            }
            prev = list[i]; 
        }

        return out;
    },

    getOrigs: function(prodView, stageName){
        
        //Get all the elements form the form
        var sections = [];
        
        var section = new GlideRecord("sys_ui_form_section");
        section.addQuery("sys_ui_form", prodView);
        section.orderBy("position");
        section.query();
        while(section.next()){
            sections.push(section.sys_ui_section.toString());
        }


        var checkElements = new GlideRecord("sys_ui_element");
        var orq = checkElements.addQuery("element",'.split');
        for (var sn=0;sn<sections.length;sn++){
            orq.addOrCondition('sys_ui_section',sections[sn]);
        }
        checkElements.addQuery("type",null);
        checkElements.query();

        while(checkElements.next()){
            gs.print(checkElements.element);
        }

        var table = new TableUtils(stageName);
        var parents = table.getTables();

        //get all the dictionary elements that end in _orig (from stage table)
        var dict = new GlideRecord('sys_dictionary');
        dict.addQuery('element', 'ENDSWITH', '_orig');
        var qc = dict.addQuery('name', stageName);
        for (var i = 0; i < parents.size(); i++) {
            qc.addOrCondition('name', parents.get(i));
        }
        dict.query();

        //All reference fields
        var reffs = new GlideRecord('sys_dictionary');
        reffs.addQuery('internal_type', 'reference');
        var qb = reffs.addQuery('name', stageName);
        for (var i = 0; i < parents.size(); i++) {
            qb.addOrCondition('name', parents.get(i));
        }
        reffs.query();

        //Compare the fields on the form to the origs -- leaving only origs of references that appear on the form!
        var formRefOrig = [];
        var formChoxOrig = [];
        while(dict.next()){
            var ref = this.refName(dict.element.toString());
            var ref2 = ref.substring(2, ref.length);
            gs.print('Dictionary entry: ' + ref)
            //we only care about origs that are actually on the form
            if(checkElements.find('element', ref)){
                if(reffs.find('element', ref)){
                    formRefOrig.push(checkElements.element.toString());
                }else{
                    formChoxOrig.push(checkElements.element.toString());
                }
            }else if(checkElements.find('element',ref2)){
                if(reffs.find('element', ref2)){
                    formRefOrig.push(checkElements.element.toString());
                }else{
                    formChoxOrig.push(checkElements.element.toString());
                }
            }else{
                gs.print('Not on form: ' + ref)
            }
        }
        formRefOrig = this.removeDuplicates(formRefOrig);
        formChoxOrig = this.removeDuplicates(formChoxOrig);
        return { formRefOrig: formRefOrig, formChoxOrig: formChoxOrig};
    },

    refName: function(orig){
        return orig.substring(0, orig.length - 5);
    },

    sync: function(autoMaintain, stageName, prodForm, destinationName){
        //compare top level form
        var dataProdForm = new GlideRecord("sys_ui_form");
        dataProdForm.addQuery('name', destinationName);
        dataProdForm.addQuery('view', prodForm.view);
        dataProdForm.query();

        var dataAcofForm = new GlideRecord("sys_ui_form");
        dataAcofForm.addQuery('name', stageName);
        dataAcofForm.query();

        //Cleanup non-default views on ACOF
        while(dataAcofForm.next()){
            if(dataAcofForm.view != prodForm.view){
                dataAcofForm.deleteRecord();
            }
        }

        //requery as updated
        var dataAcofForm = new GlideRecord("sys_ui_form");
        dataAcofForm.addQuery('name', stageName);
        dataAcofForm.query();

        while(dataProdForm.next()){
            //find moves the 'cursor' to that form if it finds it, meaning that the '&&' will be tested on that record (pretty cool!)
            if(dataAcofForm.find('view', dataProdForm.view) && dataAcofForm.name == stageName){
                //donothing
            }else{
                gs.print(stageName)
                var clearSection = new GlideRecord('sys_ui_section');
                clearSection.addQuery('name', stageName);
                clearSection.query();
                while(clearSection.next()){
                    gs.print(clearSection.caption + clearSection.name + clearSection.view)

                    var clearElements = new GlideRecord('sys_ui_element');
                    clearElements.addQuery('sys_ui_section', clearSection)
                    clearElements.query();
                    while(clearElements.next()){
                        gs.print(clearElements.element);
                        clearElements.deleteRecord();
                    }
                }

                clearSection.deleteRecord();

                //If this top level form doesn't exists, just create it.
                var insertForms = new GlideRecord("sys_ui_form");
                insertForms.initialize();
                insertForms.name = stageName;
                insertForms.view = prodForm.view;

                insertForms.insertWithReferences();
            }
        }


        //make sure we have the form 'selected' -- we'll need it later
        var dataAcofForm = new GlideRecord("sys_ui_form");
        dataAcofForm.addQuery('name', stageName);
        dataAcofForm.addQuery('view', prodForm.view);
        dataAcofForm.query();
        dataAcofForm.next();

        //Use this to add a form section to the bottom later...
        //var biggestPos = 0;

        var dataProdFormSections2 = new GlideRecord('sys_ui_form_section');
        dataProdFormSections2.addQuery('sys_ui_form', prodForm);
        dataProdFormSections2.query();

        var dataAcofFormSections2 = new GlideRecord('sys_ui_form_section');
        dataAcofFormSections2.addQuery('sys_ui_form', dataAcofForm.sys_id);
        dataAcofFormSections2.query();

        while(dataProdFormSections2.next()){
            //if(dataProdFormSections2.position > biggestPos){
            //    biggestPos = dataProdFormSections2.position;
            //    gs.log(biggestPos);
            //}

            if(dataAcofFormSections2.find('position', dataProdFormSections2.position)){
                //If we find a match, sync the sections!
                gs.print('updating things... ' + dataAcofFormSections2.position);
                this.syncSection(dataProdFormSections2.sys_ui_section, dataAcofFormSections2.sys_ui_section);
            }else{
                //If there's so sister -- it needs creating!
                gs.print('creating things... ' + dataAcofFormSections2.position);
                this.createSister(dataAcofForm.sys_id, dataProdFormSections2.position, this.copySection(dataProdFormSections2.sys_ui_section, stageName));
            }
        }

        //Requery sister sections, as they've changed
        var dataAcofFormSections2 = new GlideRecord('sys_ui_form_section');
        dataAcofFormSections2.addQuery('sys_ui_form', dataAcofForm.sys_id);
        dataAcofFormSections2.query();

        while(dataAcofFormSections2.next()){
            if(dataAcofFormSections2.position == 0){
                gs.print(dataAcofFormSections2.sys_ui_section.caption + ' position 0!')
                var acofFormSection = new GlideRecord('sys_ui_section');
                acofFormSection.addQuery('sys_id', dataAcofFormSections2.sys_ui_section.sys_id);
                acofFormSection.query();
                if(acofFormSection.next()){
                    acofFormSection.caption = '';
                    acofFormSection.update();
                };
            }
            if(dataProdFormSections2.find('position', dataAcofFormSections2.position) && this.sectionMatch(dataProdFormSections2.sys_ui_section, dataAcofFormSections2.sys_ui_section)){
                //donothing
            }else{
                gs.print('deleting things... ' + dataAcofFormSections2.position);
                this.cascadeSisterDelete(dataAcofFormSections2);
            }
        }

        //Add the ACOF Data Validation Section
        SectionSysID = this.createSection(stageName, 'Data Validation', false, false, prodForm.view);
        this.createSister(dataAcofForm.sys_id, 100, SectionSysID);
        this.createElement(stageName, '', 0, 'u_acof_record_status', SectionSysID);
        this.createElement(stageName, '.split', 1, '.split', SectionSysID);
        this.createElement(stageName, '', 2, 'u_acof_record_status.u_rule_failure_count', SectionSysID);
        this.createElement(stageName, '.end_split', 3, '.end_split', SectionSysID);
        this.createElement(stageName, '', 4, 'u_acof_report_url', SectionSysID);

        //Find all of the Orig Fields
        var origs = this.getOrigs(prodForm, stageName);
        var formRefOrig = origs.formRefOrig;
        var formChoxOrig = origs.formChoxOrig;
        gs.print('All the choice lists: '+ formChoxOrig);
        gs.print('All the reference fields: ' + formRefOrig);
        var roCount = formRefOrig.length;
        var coCount = formChoxOrig.length;
        
        //if odd - true even - false
        var rformmidpoint = Math.floor(roCount/2 + 1);
        gs.print(rformmidpoint + ' mid/r/count ' + roCount);
        var cformmidpoint = Math.floor(coCount/2 + 1);
        gs.print(cformmidpoint + ' mid/c/count ' + coCount);


        SectionSysID = this.createSection(stageName, 'Reference Originals', false, false, prodForm.view);
        this.createSister(dataAcofForm.sys_id, 98, SectionSysID);
        this.createElement(stageName, '.split', rformmidpoint, '.split', SectionSysID);

        var pos = 1;

        for (var i = 0; i < formRefOrig.length; i++) {

           var refField = formRefOrig[i]
           if(refField.startsWith('u_')){
               var origFieldName = refField + '_orig';
           }else{
               var origFieldName = 'u_' + refField + '_orig';
           }
           
           // if we're add the midpoint, need to +1
           if(pos == rformmidpoint){
               pos = pos + 1;
           }
           //this.createElement(stageName,'', pos, refField, SectionSysID);
           this.createElement(stageName,'', pos, origFieldName, SectionSysID);
        gs.print(origFieldName +'//' + pos)
           pos = pos + 1;
        }

        SectionSysID = this.createSection(stageName, 'Choicelist Originals', false, false, prodForm.view);
        this.createSister(dataAcofForm.sys_id, 99, SectionSysID);
        this.createElement(stageName, '.split', cformmidpoint, '.split', SectionSysID);

        pos = 1;

        for (var i = 0; i < formChoxOrig.length; i++) {

           var refField = formChoxOrig[i]
           if(refField.startsWith('u_')){
               var origFieldName = refField + '_orig';
           }else{
               var origFieldName = 'u_' + refField + '_orig';
           }
           
           // if we're add the midpoint, need to +1
           if(pos == cformmidpoint){
               pos = pos + 1;
           }
           //this.createElement(stageName,'', pos, refField, SectionSysID);
           this.createElement(stageName,'', pos, origFieldName, SectionSysID);
           gs.print(origFieldName +'//' + pos)
           pos = pos + 1;
        }



    },
};