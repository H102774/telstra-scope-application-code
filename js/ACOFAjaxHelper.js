var ACOFAjaxHelper = Class.create();
ACOFAjaxHelper.prototype = Object.extendsObject(AbstractAjaxProcessor, {
    getStageTables: function () {
        var tableList = [];
        var gr = new GlideRecord('u_acof_data_stage_tables');
        gr.addQuery('sys_domain', 'global');
        gr.orderBy('u_staging_table_label');
        gr.query();
        while (gr.next()) {
            var tableLabel = '' + gr.u_staging_table_label;
            tableLabel = tableLabel.replace(/\s+\(.* Table\)/, '');
            var tableItem = {
                label: tableLabel + ' [' + gr.u_staging_table + ']',
                name: '' + gr.u_staging_table
            };
            tableList.push(tableItem);
        }
        var payload = JSON.stringify(tableList);
        return payload;
    },
    getStageItems: function () {
        var itemList = [];
        var gr = new GlideRecord('u_acof_data_stage_items');
        gr.addQuery('sys_domain', 'global');
        gr.addQuery('u_staging_table', this.getParameter('sysparm_table'));
        gr.addNotNullQuery('u_safe_name');
        gr.orderBy('u_safe_name');
        gr.query();
        while (gr.next()) {
            var item = {
                label: gr.u_safe_name + ' [' + gr.u_column + ']',
                name: '' + gr.u_column
            };
            itemList.push(item);
        }
        var payload = JSON.stringify(itemList);
        return payload;
    },
    type: 'ACOFAjaxHelper'
});