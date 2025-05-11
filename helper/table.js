
var default_options = {
  color: '#CAA243',
  border: '#888'
};

export function table(list, headers, passed_options) {
  if (list.length == 0)
    return;
  if (!passed_options)
    passed_options = {};
  var options = {...default_options, ...passed_options}
  var has_headers = headers ? true : false;
  headers = headers? headers : Object.keys(list[0]);
  var style_header = ' style="padding: 2px 7px; text-align: center;';
  var style_cell   = ' style="padding: 2px 7px; text-align: right;';
  var html = `<table style="color: ${options.color};margin-right: auto; border-collapse: collapse; border: 1px solid ${options.border};"><thead><tr>`;
  for (var i = 0; i < headers.length; ++i)
    html += '<td ' + style_header + '">'+(has_headers ? headers[i].t : headers[i])+'</td>';
  html += '</tr></thead><tbody>';
 
  for (var i = 0; i < list.length; ++i) {
    var ex_style = list[i].style ? list[i].style : '';
    if (!has_headers)
      html += '<tr><td' + style_cell + ex_style +'">' + Object.values(list[i]).join('</td><td' + style_cell + ex_style +'">') + '</td></tr>'
    else {
      html += '<tr>';
      for (var m = 0; m < headers.length; ++m) {
        html += '<td' + style_cell + ex_style +'">' + list[i][headers[m].c] + '</td>';
      }
      html += '</tr>';
    }
  }
  html += '</tbody></table><br />';
  
  eval('document').getElementById("terminal").insertAdjacentHTML("beforeend",
    `<li class="jss44 MuiListItem-root MuiListItem-gutters MuiListItem-padding css-1578zj2">
        <p class="jss92 MuiTypography-root MuiTypography-body1 css-cxl1tz">${html}</p></li>`);
}
 