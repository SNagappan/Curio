console.log('loaded');
var file = "/" + jsParams.type + ".html";
var exists = false;
if (jsParams.type == "question") {
  if ($("#curioQ").length > 0) {
    exists = true;
  }
} else if (jsParams.type == "alert") {
  if ($("#curioA").length > 0) {
    exists = true;
  }
}
if (!exists) {
  $.get(chrome.extension.getURL(file), function(data) {
    $(data).appendTo('body');
  });
}
