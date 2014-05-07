console.log('loaded');
var file = "/" + jsParams.type + ".html";
$.get(chrome.extension.getURL(file), function(data) {
  $(data).appendTo('body');
});

