document.addEventListener("DOMContentLoaded", function() { 
	var answers = JSON.parse(localStorage["answers"]);
	console.log(answers);
	
	document.getElementById('title').innerHTML = "My purposes of visiting ";
	var siteName = document.createElement('span');
	siteName.id = "siteName";
	document.getElementById('title').appendChild(siteName);
	siteName.innerHTML = localStorage["currentSite"]+":";
	// answers.sort(function(x,y) {return x.time - y.time});
	
	var containers = document.getElementsByClassName("container");
	if(answers.length == 0) {
		var row = document.createElement("div");
		row.className = "row";
		var col = document.createElement("div");
		col.className = "col-xs-12";
		col.innerHTML = "You have no responses.";
		row.appendChild(col);
		containers[0].appendChild(row);
	} else {
		for (response in answers) {
		  if (answers[response].answer.trim().length == 0) {
        continue;
      }
			var row = document.createElement("div");
			row.className = "row";
			var col = document.createElement("div");
			col.className = "col-xs-12";
			var date = new Date(answers[response].time);
			var dateElem = document.createElement("div");
			dateElem.innerHTML = date.toLocaleTimeString()+" "+date.toDateString();
			dateElem.className = "time";
			console.log(dateElem.innerHTML);
			containers[0].appendChild(dateElem);

			console.log(col);
			col.innerHTML = answers[response].answer;
			console.log(col.innerHTML);
			row.appendChild(col);
			containers[0].appendChild(row);
		}
	}
});
