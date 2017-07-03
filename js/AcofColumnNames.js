var AcofColumnNames = Class.create();  
AcofColumnNames.prototype = Object.extendsObject(AbstractAjaxProcessor, {  
    getAcofColumnNames : function() {  
        var fieldsList = '';
		var tableName = this.getParameter('sysparm_table');
		gs.log("ACOF triggered on table: " + tableName,'AcofColumnNames');
		var itemList = [];
        var tableList = [];
        var tableCount = 0;
        var tableExt = tableName;
        var tableExtends = true;

        while(tableExtends && (tableCount <= 20)){
          tableCount++;
          var grTable = new GlideRecord('sys_db_object');
          var scName = '';
          grTable.addQuery('name',tableExt);
          grTable.query();
          if(grTable.next()){
            if(grTable.super_class !=''){
              scName = grTable.super_class.name.toString();
              tableList.push(scName);
              tableExt = scName;
              gs.print('Found super_class ' + scName);
              tableExtends = true;
            } else {
			  scName = grTable.name.toString();
              tableList.push(scName);
              tableExt = scName;
              tableExtends = false;
            }
          }
        }
		
		for (i = 0; i < tableList.length; i++) {
		  var gr = new GlideRecord("sys_dictionary");
		  gr.addQuery("name", tableList[i]);
		  gs.print("addQuery " + tableList[i]);
		  gr.query();
		  while(gr.next()) {	
            if(gr.element != '' && !gr.element.startsWith("u_acof")){
				  itemList.push(gr.column_label + " ("+ gr.element + ")" + ';' + gr.sys_id + ' '); 
            }
		  }
        }
		return itemList.sort().join('|');
        //return "AAA"+result;  
    }
});  