var currentSite = null;
var currentTabId = null;
var startTime = null;
var siteRegexp = /^(\w+:\/\/[^\/]+).*$/;
var host = "http://localhost:3000";

var updateCounterInterval = 1000 * 60;  // 1 minute.

var guid = (function() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
               .toString(16)
               .substring(1);
  }
  return function() {
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
           s4() + '-' + s4() + s4() + s4();
  };
})();

/**
 * Returns just the site/domain from the url. Includes the protocol.
 * chrome://extensions/some/other?blah=ffdf -> chrome://extensions
 * @param {string} url The URL of the page, including the protocol.
 * @return {string} The site, including protocol, but not paths.
 */
function getSiteFromUrl(url) {
  var match = url.match(siteRegexp);
  if (match) {
    // check scheme
    var scheme = match[1].split(':')[0];
    if (scheme == 'http' || scheme == 'https') {
      match = match[1].substring(scheme.length + 3);
    } else {
      match = match[1]
    }

    /* Check the ignored list. */
    var ignoredSites = localStorage["ignoredSites"];
    if (!ignoredSites) {
      ignoredSites = [];
    } else {
      ignoredSites = JSON.parse(ignoredSites);
    }
    for (i in ignoredSites) {
      if (ignoredSites[i] == match) {
        console.log("Site is on ignore list: " + match);
        return null;
      }
    }
    console.log(ignoredSites)
    console.log(match)
    return match;
  }
  return null;
}

function checkIdleTime(newState) {
  console.log("Checking idle behavior " + newState);
  if ((newState == "idle" || newState == "locked") &&
      localStorage["paused"] == "false") {
    pause();
  } else if (newState == "active") {
    resume();
  }
}

function pause() {
  console.log("Pausing timers.");
  localStorage["paused"] = "true";
  chrome.browserAction.setIcon({path: 'images/icon_paused.png'});
}

function resume() {
  console.log("Resuming timers.");
  localStorage["paused"] = "false";
  chrome.browserAction.setIcon({path: 'images/icon.png'});
}

/**
* Adds a site to the ignored list.
*/
function addIgnoredSite(site) {
  console.log("Removing " + site);
  site = getSiteFromUrl(site);
  if (!site) {
    return;
  }
  var ignoredSites = localStorage.ignoredSites;
  if (!ignoredSites) {
    ignoredSites = [];
  } else {
    ignoredSites = JSON.parse(ignoredSites);
  }
  ignoredSites.push(site);
  localStorage.ignoredSites = JSON.stringify(ignoredSites);

  var sites = JSON.parse(localStorage.sites);
  delete sites[site];
  localStorage.sites = JSON.stringify(sites);

  var urlToCount = JSON.parse(localStorage.urlToCount);
  delete urlToCount[site];
  localStorage.urlToCount = JSON.stringify(urlToCount);
  console.log("Removing " + site);
}

/**
 * Updates the counter for the current tab.
 */
function updateCounter() {
  /* Don't run if we are paused. */
  if (localStorage["paused"] == "true") {
    currentSite = null;
    return;
  }

  if (currentTabId == null) {
    return;
  }

  chrome.tabs.get(currentTabId, function(tab) {
    /* Make sure we're on the focused window, otherwise we're recording bogus stats. */
    chrome.windows.get(tab.windowId, function(window) {
      if (!window.focused) {
        return;
      }
      var site = getSiteFromUrl(tab.url);
      if (site == null) {
        console.log("Unable to update counter. Malformed url.");
        return;
      }

      /* We can't update any counters if this is the first time visiting any
       * site. This happens on browser startup. Initialize some variables so
       * we can perform an update next time. */
      if (currentSite == null) {
        currentSite = site;
        startTime = new Date();
        return;
      }

      /* Update the time spent for this site by comparing the current time to
       * the last time we were ran. */
      var now = new Date();
      var delta = now.getTime() - startTime.getTime();
      // If the delta is too large, it's because something caused the update interval
      // to take too long. This could be because of browser shutdown, for example.
      // Ignore the delta if it is too large.
      if (delta < (updateCounterInterval + updateCounterInterval / 2)) {
        updateTime(currentSite, delta/1000);
      } else {
        console.log("Delta of " + delta/1000 + " seconds too long; ignored.");
      }

      /* This function could have been called as the result of a tab change,
       * which means the site may have changed. */
      currentSite = site;
      startTime = now;
    });
  });
}

/**
 * Updates the amount of time we have spent on a given site.
 * @param {string} site The site to update.
 * @param {float} seconds The number of seconds to add to the counter.
 */
function updateTime(site, seconds) {
  console.log('update time');
  var sites = JSON.parse(localStorage.sites);
  if (!sites[site]) {
    sites[site] = 0;
  }
  sites[site] = sites[site] + seconds;
  localStorage.sites = JSON.stringify(sites);

  var currentData = JSON.parse(localStorage[currentTabId]);
  currentData.activeTime += seconds;
  localStorage[currentTabId] = JSON.stringify(currentData);

  // send data to server
  jQuery.post(host + "/api/active-time", {uid: localStorage.uid, site: site, time: seconds});

  // check if trigger alert
  chrome.tabs.get(currentTabId, function(tab) {
    // switched to another tab, don't show alert
    if (getSiteFromUrl(tab.url) != site) return;

    var time = Math.floor(currentData.activeTime);
    var alert, triggerA = false;
    // alert 1
    if (time > currentData.triggerTime) {
      triggerA = true;
      alert = "\"You've spent on this site about " + Math.floor(time / 60) + " minutes.\"";
      // set next trigger time
      currentData.triggerTime += 30;
    }

    // trigger alert
    if (triggerA) {
      console.log('trigger alert');
      console.log(alert);
      chrome.tabs.executeScript(currentTabId, {file: "jquery.js"}, function() {
        chrome.tabs.executeScript(currentTabId, {code: "var jsParams={type: \"alert\", alert:" + alert + "}"}, function() {
          chrome.tabs.executeScript(currentTabId, {file: "inject.js"}, function() {
            chrome.tabs.executeScript(currentTabId, {file: "changeAlert.js"});
          });
          chrome.tabs.insertCSS(currentTabId, {file: "dialog.css"});
        });
      });
    }
  });
}

function incrementUrlToCount(url) {
  console.log("increment visit to " + url);

  var urlToCount = JSON.parse(localStorage.urlToCount);
  if (!urlToCount[url]) {
    urlToCount[url] = 0;
  }

  urlToCount[url]++;
  localStorage.urlToCount = JSON.stringify(urlToCount);
}

/**
 * Initailized our storage and sets up tab listeners.
 */
function initialize() {
  if (!localStorage.sites) {
    localStorage.sites = JSON.stringify({});
  }

  if (!localStorage.urlToCount) {
    localStorage.urlToCount = JSON.stringify({});
  }

  if (!localStorage.lastAnswer) {
    localStorage.lastAnswer = JSON.stringify({});
  }

  if (!localStorage.paused) {
    localStorage.paused = "false";
  }

  if (localStorage["paused"] == "true") {
    pause();
  }

  // Default is to do idle detection.
  localStorage.idleDetection = "true";

  //chrome.webNavigation.onCommitted.addListener(
  //function(details) {
    //if(localStorage["paused"] == "true" || details.frameId != 0) {
      //return;
    //}

    //url = getSiteFromUrl(details.url);
    //console.log("increment visit to " + url);

    //var urlToCount = JSON.parse(localStorage.urlToCount);
    //if (!urlToCount[url]) {
      //urlToCount[url] = 0;
    //}

    //urlToCount[url]++;
    //localStorage.urlToCount = JSON.stringify(urlToCount);
  //});

  /* Add some listeners for tab changing events. We want to update our
  *  counters when this sort of stuff happens. */
  chrome.tabs.onSelectionChanged.addListener(
  function(tabId, selectionInfo) {
    console.log("Tab changed");
    currentTabId = tabId;
    updateCounter();
  });

  chrome.tabs.onUpdated.addListener(
  function(tabId, changeInfo, tab) {
    if (tabId == currentTabId) {
      console.log("Tab updated");
      updateCounter();
    }
  });

  chrome.windows.onFocusChanged.addListener(
  function(windowId) {
    console.log("Detected window focus changed.");
    chrome.tabs.getSelected(windowId,
    function(tab) {
      if (tab == undefined) {
        return;
      }
      console.log("Window/Tab changed");
      currentTabId = tab.id;
      updateCounter();
    });
  });

  /* Listen for update requests. These come from the popup. */
  chrome.extension.onRequest.addListener(
    function(request, sender, sendResponse) {
      if (request.action == "addIgnoredSite") {
        addIgnoredSite(request.site);
        sendResponse({});
      } else if (request.action == "pause") {
        pause();
      } else if (request.action == "resume") {
        resume();
      } else {
        console.log("Invalid action given.");
      }
    });

  chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
    //console.log("############ onupdate ############");
    //console.log(tab.url);
    //console.log(changeInfo);
    if (!changeInfo || changeInfo.status != "complete") {
      return;
    }
    var incCounter = false;
    var url = getSiteFromUrl(tab.url);
    if (localStorage[tab.id] == undefined || JSON.parse(localStorage[tab.id]).url != url) {
      incCounter = true;
      var data = {};
      data.url = url;
      data.activeTime = 0;
      // default 15 mins
      data.triggerTime = 15 * 60;
      localStorage[tab.id] = JSON.stringify(data);
    }
    if (incCounter) {
      // visiting a new site
      incrementUrlToCount(url);
      var urlToCount = JSON.parse(localStorage.urlToCount);

      // send data to server
      jQuery.post(host + "/api/visit-times", {uid: localStorage.uid, site: url});

      if (urlToCount[url] >= 10 && urlToCount[url] % 10 == 2) {
        //trigger multiple question 2
        console.log("trigger multiple question 2");
        chrome.tabs.executeScript(tabId, {file: "jquery.js"}, function() {
          chrome.tabs.executeScript(tabId, {code: "var jsParams={type: \"multichoice1\",uid:\"" + localStorage.uid + "\",site:\"" + url + "\"}"}, function() {
            chrome.tabs.executeScript(tabId, {file: "inject.js"});
            chrome.tabs.insertCSS(tabId, {file: "dialog.css"});
          });
        });
      } else if (urlToCount[url] >= 10 && urlToCount[url] % 2 == 0) {
        // trigger open-ended question
        console.log("trigger open-ended question");
        var lastAnswer = JSON.parse(localStorage.lastAnswer);
        var answer = lastAnswer[url];
        if (answer == undefined) {
          // show open-ended question1
          chrome.tabs.executeScript(tabId, {file: "jquery.js"}, function() {
            chrome.tabs.executeScript(tabId, {code: "var jsParams={type: \"question1\",uid:\"" + localStorage.uid + "\",site:\"" + url + "\"}"}, function() {
              chrome.tabs.executeScript(tabId, {file: "inject.js"});
              chrome.tabs.insertCSS(tabId, {file: "dialog.css"});
            });
          });
        } else {
          // show open-ended question2 with previous answer
          chrome.tabs.executeScript(tabId, {file: "jquery.js"}, function() {
            chrome.tabs.executeScript(tabId, {code: "var jsParams={type: \"question2\",answer:\"" + answer + "\",uid:\"" + localStorage.uid + "\",site:\"" + url + "\"}"}, function() {
              chrome.tabs.executeScript(tabId, {file: "inject.js"}, function() {
                chrome.tabs.executeScript(tabId, {file: "changeAnswer.js"});
              });
              chrome.tabs.insertCSS(tabId, {file: "dialog.css"});
            });
          });
        }
      } else {
        // trigger mutliple question 1
        console.log("trigger multiple question 1");
        chrome.tabs.executeScript(tabId, {file: "jquery.js"}, function() {
          chrome.tabs.executeScript(tabId, {code: "var jsParams={type: \"multichoice1\",uid:\"" + localStorage.uid + "\",site:\"" + url + "\"}"}, function() {
            chrome.tabs.executeScript(tabId, {file: "inject.js"});
            chrome.tabs.insertCSS(tabId, {file: "dialog.css"});
          });
        });
      }
    }
  });

  // receive messages sent from injected code
  chrome.runtime.onMessage.addListener(function(msg, sender, res) {
    console.log(msg);
    if (msg.time) {
      var currentData = JSON.parse(localStorage[sender.tab.id]);
      currentData.triggerTime = parseInt(msg);
      localStorage[sender.tab.id] = JSON.stringify(currentData);
    }
    if (msg.answer) {
      var url = getSiteFromUrl(sender.tab.url);
      var lastAnswer = JSON.parse(localStorage.lastAnswer);
      lastAnswer[url] = msg.answer;
      localStorage.lastAnswer = JSON.stringify(lastAnswer);
    }
  });

  /* Force an update of the counter every minute. Otherwise, the counter
     only updates for selection or URL changes. */
  window.setInterval(updateCounter, updateCounterInterval);

  /* Default is to use local only storage. */
  // if (!localStorage["storageType"]) {
  //  localStorage["storageType"] = "local";
  // }
  localStorage["storageType"] = "local";

  // set uuid
  if (localStorage.uid == undefined) {
    localStorage.uid = guid();
  }

  // Keep track of idle time.
  chrome.idle.queryState(60, checkIdleTime);
  chrome.idle.onStateChanged.addListener(checkIdleTime);

  chrome.alarms.create("clearAlarm", {delayInMinutes: minsTo5AM(), periodInMinutes: 1440} );
  chrome.alarms.onAlarm.addListener(function(alarm) {
    console.log("Clear Alarm Triggered");
    clearData();
  });
}

function clearData() {
  console.log("Clear Data");
  localStorage.sites = JSON.stringify({});
  localStorage.urlToCount = JSON.stringify({});
}

function minsTo5AM() {
    var now = new Date();
    var next = new Date(now);
    next.setDate(next.getDate() + 1);
    next.setHours(5,0,0,0);
    return (next - now)/6e4;
}

initialize();
