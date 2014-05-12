function addIgnoredSite() {
  var newSite = document.getElementById("new_ignored_site").value;
  chrome.extension.sendRequest(
     {action: "addIgnoredSite", site: newSite},
     function(response) {
       restoreOptions();
     });
}

function removeIgnoredSites() {
  var select = document.getElementById("ignored_sites");
  var ignoredSites = [];
  for (var i = 0; i < select.children.length; i++) {
    var child = select.children[i];
    if (child.selected == false) {
      ignoredSites.push(child.value);
    }
  }
  localStorage['ignoredSites'] = JSON.stringify(ignoredSites);
  restoreOptions();
}

// Restores options from localStorage, if available.
function restoreOptions() {
  var ignoredSites = localStorage['ignoredSites'];
  console.log("restoreOptions")
  console.log(ignoredSites)
  if (!ignoredSites) {
    return;
  }
  ignoredSites = JSON.parse(ignoredSites);
  var select = document.getElementById("ignored_sites");
  select.options.length = 0;

  var removeButton = document.getElementById("removeIgnoredSites");
  if (ignoredSites.length == 0){
    select.style.display = 'none';
    removeButton.style.display = 'none';
  } else {
    select.style.display = 'block';
    removeButton.style.display = 'block';
  }

  for (var i in ignoredSites) {
    var option = document.createElement("option");
    option.text = ignoredSites[i];
    option.value = ignoredSites[i];
    select.appendChild(option);
  }
}

document.addEventListener("DOMContentLoaded", function() {
  restoreOptions();
  document.getElementById("addIgnoredSite").addEventListener("click", addIgnoredSite);
  document.getElementById("removeIgnoredSites").addEventListener("click", removeIgnoredSites);

  var userID = document.createElement("a");
  userID.appendChild(document.createTextNode(localStorage.uid));
  document.getElementById("userID").appendChild(userID);
});
