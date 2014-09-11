/**
 * Contains some useful objects which are recognized in ./writer.js for
 * writing out results in specific formats.
 * */

/**
 * Can be used to create a tabular format. 
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

/**
 * Can be used to apply text styles on a value to be written.
 * 
 * The styles object has three properties:
 * - "text-style": an array containing one or more of the following:
 *   bold
 *   italic
 *   underline
 * - "text-color": either an object containing an 'r', 'g', and 'b' members
 *   with values from 0-256, or an integer representing the RGB in #xxxxxx
 *   format, or one of the following strings:
 *   "white","grey","black","blue","cyan","green","magenta","red"
 * - "background-color": same type of value as text-color.
 * 
 * */
var StyledFormatter = module.exports.Style = function(styles,value) {
    this.data = value;
    this.styles = styles;
    
}
