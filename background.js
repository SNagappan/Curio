var currentSite = null;
var currentTabId = null;
var startTime = null;
var siteRegexp = /^(\w+:\/\/[^\/]+).*$/;
var changedURL = false;

var updateCounterInterval = 1000 * 60;  // 1 minute.

/**
 * Returns just the site/domain from the url. Includes the protocol.
 * chrome://extensions/some/other?blah=ffdf -> chrome://extensions
 * @param {string} url The URL of the page, including the protocol.
 * @return {string} The site, including protocol, but not paths.
 */
function getSiteFromUrl(url) {
  var match = url.match(siteRegexp);
  if (match) {
    return match[1];
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
  var sites = JSON.parse(localStorage.sites);
  if (!sites[site]) {
    sites[site] = 0;
  }
  sites[site] = sites[site] + seconds;
  localStorage.sites = JSON.stringify(sites);
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

  if (!localStorage.paused) {
    localStorage.paused = "false";
  }

  if (localStorage["paused"] == "true") {
    pause();
  }

  // Default is to do idle detection.
  localStorage.idleDetection = "true";

  chrome.webNavigation.onCommitted.addListener(
  function(details) {
    if(localStorage["paused"] == "true" || details.frameId != 0) {
      return;
    }

    url = getSiteFromUrl(details.url);
    console.log("increment visit to " + url);

    var urlToCount = JSON.parse(localStorage.urlToCount);
    if (!urlToCount[url]) {
      urlToCount[url] = 0;
    }

    urlToCount[url]++;
    localStorage.urlToCount = JSON.stringify(urlToCount);
  });

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
      console.log("Window/Tab changed");
      currentTabId = tab.id;
      updateCounter();
    });
  });

  /* Listen for update requests. These come from the popup. */
  chrome.extension.onRequest.addListener(
    function(request, sender, sendResponse) {
      if (request.action == "pause") {
        pause();
      } else if (request.action == "resume") {
        resume();
      } else {
        console.log("Invalid action given.");
      }
    });

  chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
    console.log(changeInfo);
    if (changeInfo && changeInfo.status == "loading" && changeInfo.url) {
      changedURL = true;
      return;
    }
    if (changeInfo && changeInfo.status == "complete" && changedURL) {
      var counts = JSON.parse(localStorage.urlToCount);
      var site = getSiteFromUrl(tab.url);
      var trigger = false;
      var question;
      // question 1
      if (counts[site] > 0 && counts[site] % 2 == 0) {
        trigger = true;
        question = "\"" + "This is the " + counts[site] + "th times you visited " + site + " today. Why are you visiting this site so often?" + "\"";
      }
      // question 2
      // TODO

      // trigger pop-up
      if (trigger) {
        chrome.tabs.executeScript(tabId, {file: "jquery.js"}, function() {
          chrome.tabs.executeScript(tabId, {code: "var jsParams={question:" + question + "}"}, function() {
            chrome.tabs.executeScript(tabId, {file: "dialog.js"}, function() {
              chrome.tabs.executeScript(tabId, {file: "changeQ.js"});
            });
            chrome.tabs.insertCSS(tabId, {file: "dialog.css"});
          });
        });
      }
      changedURL = false;
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

  // Keep track of idle time.
  chrome.idle.queryState(60, checkIdleTime);
  chrome.idle.onStateChanged.addListener(checkIdleTime);
}

initialize();
