function addLocalDisplay() {
  var table = document.getElementById("stats");
  var tbody = document.createElement("tbody");
  table.appendChild(tbody);

  var urlToCount = JSON.parse(localStorage.urlToCount);
  console.log("urlToCount");
  console.log(urlToCount);
  var totalVisits = 0;
  for (site in urlToCount) {
   totalVisits += urlToCount[site];
  }

  /* Sort sites by time spent */
  var sites = JSON.parse(localStorage.sites);
  var sortedSites = new Array();
  var totalTime = 0;
  for (site in sites) {
   sortedSites.push([site, sites[site]]);
   totalTime += sites[site];
  }
  sortedSites.sort(function(a, b) {
   return b[1] - a[1];
  });

  /* Show only the top 15 sites by default */
  var max = 15;
  if (document.location.href.indexOf("show=all") != -1) {
   max = sortedSites.length;
  }

  /* Add total row. */
  var row = document.createElement("tr");
  var cell = document.createElement("td");
  cell.innerHTML = "<b>Total</b>";
  row.id = "total";
  row.appendChild(cell);
  cell = document.createElement("td");
  cell.appendChild(document.createTextNode((totalTime / 60).toFixed(2)));
  row.appendChild(cell);
  cell = document.createElement("td");
  cell.appendChild(document.createTextNode(totalVisits));
  row.appendChild(cell);
  tbody.appendChild(row);

  for (var index = 0; ((index < sortedSites.length) && (index < max));
      index++ ){
   var site = sortedSites[index][0];
   row = document.createElement("tr");
   cell = document.createElement("td");
   cell.className = "siteVisited";
   cell.appendChild(document.createTextNode(site));
   row.appendChild(cell);
   cell = document.createElement("td");
   cell.appendChild(document.createTextNode((sites[site] / 60).toFixed(2)));
   row.appendChild(cell);
   cell = document.createElement("td");
   visit = urlToCount[site]
   if (!visit) {
    visit = 0;
   }
   cell.appendChild(document.createTextNode(visit));
   row.appendChild(cell);
   tbody.appendChild(row);
  }

  /* Add an option to show all stats */
  var showAllLink = document.createElement("a");
  showAllLink.onclick = function() {
   chrome.tabs.create({url: "popup.html?show=all"});
  }

  /* Show the "Show All" link if there are some sites we didn't show. */
  if (max < sortedSites.length) {
   showAllLink.setAttribute("href", "javascript:void(0)");
   showAllLink.appendChild(document.createTextNode("Show All"));
   document.getElementById("options").appendChild(showAllLink);
  }
}

function togglePause() {
  console.log("In toggle pause");
  console.log("Value = " + localStorage["paused"]);
  if (localStorage["paused"] == "false") {
   console.log("Setting to Resume");
   chrome.extension.sendRequest({action: "pause"}, function(response) {});
   document.getElementById("toggle_pause").innerHTML = "Resume Timer";
  } else if (localStorage["paused"] == "true"){
   console.log("Setting to Pause");
   chrome.extension.sendRequest({action: "resume"}, function(response) {});
   document.getElementById("toggle_pause").innerHTML = "Pause Timer";
  }
}

function initialize() {
  var stats = document.getElementById("stats");
  if (stats.childNodes.length == 1) {
   stats.removeChild(stats.childNodes[0]);
  }

  if (localStorage["storageType"] == "local") {
   addLocalDisplay();
  }

  var link = document.getElementById("toggle_pause");
  if (localStorage["paused"] == undefined || localStorage["paused"] == "false") {
   localStorage["paused"] = "false";
   link.innerHTML = "Pause Curi.o";
  } else {
   link.innerHTML = "Resume Curi.o";
  }
}

function showComments(e) {
  if(e.target.className == "siteVisited") {
    var uid = localStorage.uid;
    var site = e.target.innerHTML;
    $.get("http://curi-o.herokuapp.com/api/user-responses", 
      {uid: uid, site: site}, function(results) {
      localStorage["currentSite"] = site;
      localStorage["answers"] = JSON.stringify(results);
      chrome.tabs.create({url: "user-response.html"});
    });
  }
}

document.addEventListener("DOMContentLoaded", function() {
  document.getElementById("toggle_pause").addEventListener(
    "click", togglePause); 
  document.querySelector("body").addEventListener(
     "click", showComments); 
  initialize();
});
