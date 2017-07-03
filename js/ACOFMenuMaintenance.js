var ACOFMenuMaintenance = Class.create();
ACOFMenuMaintenance.prototype = {
    initialize: function() {
    },
	
	maintainheadings: function(){
		var applicationName = "ATOS Customer On-Boarding";
			
		var applicationMenu = new GlideRecord('sys_app_application');
		applicationMenu.addQuery('title',applicationName);
		applicationMenu.query();
		if(applicationMenu.next()){
			applicationSysid = applicationMenu.sys_id.toString();
			
			var grouping = new GlideRecord('u_acof_data_grouping');
			grouping.addQuery('u_active',true);
			grouping.query();
			while(grouping.next()){
				var titleString = grouping.u_label + ' Staging Table';
				
				var menuHeading = new GlideRecord('sys_app_module');
				menuHeading.addQuery('application.title',applicationName);
				menuHeading.addQuery('link_type','separator');
				menuHeading.addQuery('title',titleString);
				menuHeading.query();
				if(menuHeading){
					// check the menu heading offset
					if(menuHeading.order != grouping.u_menu_offset){
						menuHeading.order = grouping.u_menu_offset;
						menuHeading.update();
					}
				} else {
					// Menu Heading is missing
					menuHeading
				}
			
			
			}
				
		}
		
	},
	
    type: 'ACOFMenuMaintenance'
};