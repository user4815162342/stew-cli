/**
 * Contains some useful objects which are recognized in ./writer.js for
 * writing out results in specific formats.
 * */

var TableFormatter = module.exports.Table = function() {
    
    var columnsByField = {};
    var columns = this.columns = [];
    var rows = this.rows = [];
    var row;
    var showCaptions = this.showCaptions = true;
    
    this.addRow = function(data) {
        row = {};
        rows.push(row);
        if (arguments.length) {
            Object.keys(data).forEach(function(key) {
                this.addCell(key,data[key]);
            }.bind(this));
        }
        
    }
    
    this.addColumn = function(caption,field) {
        if (!columnsByField.hasOwnProperty(field)) {
            var column = {
                field: field,
                caption: caption
            };
            columns.push(column);
            columnsByField[field] = column;
        } else if (columnsByField[field].caption === columnsByField[field].field) {
            // we are providing an alternative caption.
            columnsByField[field].caption = caption;
        }
    }
    
    this.addCell = function(field,value) {
        if (!columnsByField.hasOwnProperty(field)) {
            this.addColumn(field,field);
        }
        row[field] = value;
    }
    
}

