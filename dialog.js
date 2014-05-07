console.log('loaded');
$.get(chrome.extension.getURL('/dialog.html'), function(data) {
  $(data).appendTo('body');
});

