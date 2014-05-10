console.log('loaded');
var file = "/" + jsParams.type + ".html";
var exists = false;
if (jsParams.type == "question1" || jsParams.type == "question2") {
  if ($("#curioQ").length > 0) {
    exists = true;
  }
} else if (jsParams.type == "alert") {
  if ($("#curioA").length > 0) {
    exists = true;
  }
} else if (jsParams.type == "multichoice1") {
  if ($("#curioM1").length > 0) {
    exists = true;
  }
} else if (jsParams.type == "multichoice2") {
  if ($("#curioM2").length > 0) {
    exists = true;
  }
}
if (!exists) {
  $.get(chrome.extension.getURL(file), function(data) {
    $(data).appendTo('body');
  });
}
