console.log('loaded');
var file = "/" + jsParams.type + ".html";
var exists = false;
if (jsParams.type == "question1" || jsParams.type == "question2") {
  console.log($("#curioQ").length);
  if ($("#curioQ").length > 0) {
    exists = true;
  }
} else if (jsParams.type == "alert") {
  console.log($("#curioA").length);
  if ($("#curioA").length > 0) {
    exists = true;
  }
} else if (jsParams.type == "multichoice1") {
  console.log($("#curioM1").length);
  if ($("#curioM1").length > 0 || $("#curioM2").length > 0 || $("#curioQ").length > 0) {
    exists = true;
  }
} else if (jsParams.type == "multichoice2") {
  console.log($("#curioM2").length);
  if ($("#curioM2").length > 0) {
    exists = true;
  }
}
if (!exists) {
  $.get(chrome.extension.getURL(file), function(data) {
    $(data).appendTo('body');
  });
}
