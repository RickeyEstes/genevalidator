
function show_all_plots(button){

  button.innerHTML = "<i class='icon-bar-chart'></i> &nbsp;&nbsp;<b>Hide all plots</b>"
  button.onclick = function() { 
            hide_all_plots(button) 
        };

  //remove all plots
  var extensions = document.querySelectorAll('div')
  for (var i = 0; i < extensions.length; i++) {
     if(extensions[i].id.search(/toggle*/) == 0){
        d3.select("#".concat(extensions[i].id)).selectAll("svg").remove();
     }
  }

  var pressedButtons = document.querySelectorAll('td')
  var command = "";
  for (var i = 0; i < pressedButtons.length; i++) {
        if(pressedButtons[i].onclick != null){
           var fcts = pressedButtons[i].onclick.toString().match(/addPlot\(.*\);/g)
	   for (var j = 0; j < fcts.length; j++) {
               command = command.concat(fcts[j])
	   }
        }
     }
     eval(command)

     var extensions = document.querySelectorAll('div')
     for (var i = 0; i < extensions.length; i++) {
        if(extensions[i].id.search(/toggle*/) == 0){
           extensions[i].style.display = "block";
        }
     }
     //command = command.concat("showDiv(this, 'toggle1')")

}

function hide_all_plots(button){

  button.innerHTML = "<i class='icon-bar-chart'></i> &nbsp;&nbsp;<b>Show all plots</b>"
  button.onclick = function() { 
            show_all_plots(button) 
        };

     var extensions = document.querySelectorAll('div')
     for (var i = 0; i < extensions.length; i++) {
        if(extensions[i].id.search(/toggle*/) == 0){
           d3.select("#".concat(extensions[i].id)).selectAll("svg").remove();
        }
     }
}

function getElementByAttributeValue(attribute, value)
{
  var allElements = document.getElementsByTagName('*');
  for (var i = 0; i < allElements.length; i++)
   {
    if (allElements[i].getAttribute(attribute) == value)
    {
      return allElements[i];
    }
  }
  return null;
}

function showDiv(source, target){

   var button = document.getElementById(target)

   if(source.status == "pressed"){
     button.style.display = "none";
   }
   else{
     d3.select("#".concat(target)).selectAll("svg").remove();    
     button.style.display = "block";
     var pressedButtons = document.querySelectorAll('td')
     for (var i = 0; i < pressedButtons.length; i++) {
        if(pressedButtons[i].status == "pressed"){
           pressedButtons[i].status = "released"
        }
     }
   }

   if(source.status=="pressed")
     source.status="released"
   else
     source.status="pressed"
}

function addPlot(target, filename, type, title, footer, xtitle, ytitle, aux1, aux2){

        if (footer == '')
          var legend = []
        else
	  var legend = footer.split(";");

	switch(type){
		case "scatter":
		  plot_scatter(filename, target, title, footer, xtitle, ytitle, aux1, aux2)
		  break;
		case "bars":
		  plot_bars(filename, target, title, legend, xtitle, ytitle, aux1)
		  break;
		case "lines":
                  if(aux2 != "")
	              aux2 = aux2.split(",");
 
		  plot_lines(filename, target, title, legend, xtitle, ytitle, aux1, aux2)
		  break;
		default:
		  break;
	}	
}


function color_beautification(color){

   	switch(color){
		case "red":
      			return d3.rgb(189,54,47);
        	case "blue":
			return d3.rgb(58,135,173);
		case "green":
			return d3.rgb(70,136,71);
		case "yellow":
			return d3.rgb(255,255,51);
		case "orange":
			return d3.rgb(248,148,6);
		case "violet":
			return d3.rgb(153,0,153);
		case "gray":
			return d3.rgb(160,160,160);
		default:
		  	return color;
	}

}

// bars plot
function plot_bars(filename, target, title, footer, xTitle, yTitle, bar){

	var margin = {top: 50, right: 150, bottom: 75, left: 50},
		width = 600 - margin.left - margin.right,
		height = 500 - margin.top - margin.bottom;		
	var legend_width = 15

	var svg = d3.select("#".concat(target)).append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
	  	.append("g")
			.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
		
	svg.append("text")
		.attr("x", (width / 2))             
		.attr("y", -25)
		.attr("text-anchor", "middle")  
		.style("font-size", "16px") 
		.text(title);	
		
	var colors = new Array("orange", "blue", "green", "yellow", "brown");
	var no_colors = colors.length

        var padding = 100

	d3.json(filename, function(error, alldata) {
		
		flattened_data = [].concat.apply([], alldata)			
		var yMax = d3.max(flattened_data, function(d) { return d.value; })
		var y = d3.scale.linear()
                     .domain([0, yMax + yMax/10])
                     .range([height, 0]);

		var xMin = d3.min(flattened_data, function(d) { return d.key; })
                var xMin = Math.min(xMin, bar); 
 
                var xMax = d3.max(flattened_data, function(d) { return d.key; })
		var xMax = Math.max(xMax, bar); 
		var x = d3.scale.linear()
                     .domain([xMin-padding, xMax+padding])
                     .range([0, width]);

		var xAxis = d3.svg.axis()
		        .scale(x)
		        .orient("bottom")
			.ticks(8)

	        var yAxis = d3.svg.axis()
			.scale(y)
			.orient("left")
			.tickFormat(d3.format("d"))
			.ticks(8)

	  	svg.append("g")
			  .attr("class", "x axis")
			  .attr("transform", "translate(0," + height + ")")
			  .call(xAxis)
			.append("text")
			  .attr("class", "label")
			  .attr("x", width/2)
			  .attr("y", 35)
			  .style("text-anchor", "middle")
			  .text(xTitle)

	 	 svg.append("g")
			   .attr("class", "y axis")
			  .call(yAxis)
			.append("text")
			  .attr("class", "label")
			  .attr("transform", "rotate(-90)")
			  .attr("x", -(height+yTitle.length)/2)
			  .attr("y", -40)
			  .style("text-anchor", "start")
			  .text(yTitle)
			  
		alldata.map( function(data, i) {
		 
			color = colors[i % (no_colors - 1)];
			svg.selectAll(".bar")
				.data(data)
				.enter().append("rect")
				  .attr("x", function(d) { return x(d.key); })
				  .attr("width", 2)
				  .attr("y", function(d) { return y(d.value); })
				  .attr("height", function(d) { return height - y(d.value); })
				  .attr("fill", function(d) { if (d.main == true) return color_beautification("red"); return color_beautification("blue");});
		});	

		if(bar!=undefined){
			svg.append("rect")
				.attr("x", x(bar))
				.attr("width", 3)
				.attr("y", y(yMax + yMax/10))
				.attr("height", height - y(yMax + yMax/10))
				.attr("fill", color_beautification("black"));
		}
	
	});

	// add legend   
	var legend = svg.append("g")
	  .attr("class", "legend")
	  .attr("height", 100)
	  .attr("width", 100)
          .attr('transform', 'translate(-20,50)')    
      
    var h = 0
    for (var i = 0; i < footer.length; i++) {
        
	var array = footer[i].split(","); 
	legend
	      .append("rect")
		  .attr("x", width + margin.left)
	      .attr("y", 15*h)
		  .attr("width", 10)
		  .attr("height", 10)
		  .style("fill", color_beautification(array[1].replace(/\s+/g, '')))

	var chunkSize = legend_width
 	var length = array[0].length 
        
	for (var j = 0; j < length; j += chunkSize) {
           var substr = array[0].substring(j, Math.min(length, j + chunkSize));
	   legend
	      .append("text")
		  .attr("x", width + margin.left + 15)
	      .attr("y", 15*h + 9)
		  .text(substr);
            h += 1
    	}
    }

}	


// scatter plot
function plot_scatter(filename, target, title, footer, xTitle, yTitle, yLine, slope){

	var margin = {top: 50, right: 30, bottom: 75, left: 50},
		width = 500 - margin.left - margin.right,
		height = 500 - margin.top - margin.bottom;		

	var x = d3.scale.linear()
		.range([0, width]);
	var y = d3.scale.linear()
		.range([height, 0]);

	var color = d3.scale.category10();

	var xAxis = d3.svg.axis()
		.scale(x)
		.orient("bottom")
		.ticks(8);
	var yAxis = d3.svg.axis()
		.scale(y)
		.orient("left")
		.tickFormat(d3.format("d"))
		.ticks(8);

	var svg = d3.select("#".concat(target)).append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
	  	.append("g")
			.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
		
	svg.append("text")
		.attr("x", (width / 2))             
		.attr("y", -25)
		.attr("text-anchor", "middle")  
		.style("font-size", "16px") 
		.text(title);	

	svg.append("text")
		.attr("x", (width / 2))             
		.attr("y", height+ 55)
		.attr("text-anchor", "middle")  
		.style("font-size", "12px") 
		.text(footer);	

	d3.json(filename, function(error, data) {

          var xMax = d3.max(data, function(d) { return d.x; })
          var yMax = d3.max(data, function(d) { return d.y; })
	  x.domain(d3.extent(data, function(d) { return d.x; })).nice();
	  y.domain(d3.extent(data, function(d) { return d.y; })).nice();

	  svg.append("g")
		  .attr("class", "x axis")
		  .attr("transform", "translate(0," + height + ")")
		  .call(xAxis)
		.append("text")
		  .attr("class", "label")
		  .attr("x", (width-xTitle.length)/2)
		  .attr("y", 35)
		  .style("text-anchor", "start")
		  .text(xTitle)

	  svg.append("g")
		  .attr("class", "y axis")
		  .call(yAxis)
		.append("text")
		  .attr("class", "label")
		  .attr("transform", "rotate(-90)")
		  .attr("x", -(height+yTitle.length)/2)
		  .attr("y", -40)
		  .style("text-anchor", "start")
		  .text(yTitle)

	  svg.selectAll(".dot")
		  .data(data)
		.enter().append("circle")
		  //.attr("class", "dot")
		  .attr("r", 2)
		  .attr("cx", function(d) { return x(d.x); })
		  .attr("cy", function(d) { return y(d.y); })
		  .style("fill", function(d) { return color_beautification("red"); });

	   if(slope!=undefined && yLine!=undefined){
		yLine = parseFloat(yLine.replace(",", "."));
		var yValue = yLine + slope * xMax
		if (yValue > yMax){
 			xMax = (yMax-yLine)/slope
			yValue = yMax
		}
		svg.append("line")
		  .attr("x1", 0)
		  .attr("y1", y(yLine))				  
		  .attr("x2", x(xMax))
		  .attr("y2", y(yValue))				  
		  .attr("stroke-width", 2)
		  .attr("stroke", "black")
	  }

	});
}

// line plot
function plot_lines(filename, target, title, footer, xTitle, yTitle, no_lines, yValues){

	var margin = {top: 50, right: 170, bottom: 75, left: 50},
		width = 600 - margin.left - margin.right,
		height = 500 - margin.top - margin.bottom;		
        var legend_width = 17   

	var x = d3.scale.linear()
		.range([0, width]);
	var y = d3.scale.linear()
		.range([height, 0]);

	var color = d3.scale.category10();

	var xAxis = d3.svg.axis()
		.scale(x)
		.orient("bottom")
		.ticks(5);

	var yAxis = d3.svg.axis()
		.scale(y)
		.orient("left")
		.ticks(5)

	var svg = d3.select("#".concat(target)).append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
	  	.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
		
	svg.append("text")
		.attr("x", (width / 2))             
		.attr("y", -35)
		.attr("text-anchor", "middle")  
		.style("font-size", "16px") 
		.text(title);	

	d3.json(filename, function(error, data) {

	  var idx = -1

	  x.domain([0, d3.max(data, function(d) { return d.stop; })]);
	  y.domain(d3.extent(data, function(d) { return d.y; })).nice();

	  svg.append("g")
		  .attr("class", "x axis")
		  .attr("transform", "translate(0," + (height+30) + ")")
		  .call(xAxis)
		.append("text")
		  .attr("class", "label")
		  .attr("x", width/2)
		  .attr("y", 35)
		  .style("text-anchor", "middle")
		  .text(xTitle)
		  
          if(yValues != ""){
		  svg.append("g")
			  .attr("class", "y axis")
			  .call(yAxis
		                .ticks(yValues.length)
				.tickFormat(function (d) {		               
		                   idx = idx + 1;
				   return yValues[idx];
	    			}))
			.append("text")
			  .attr("class", "label")
			  .attr("transform", "rotate(-90)")
			  .attr("x", -(height+yTitle.length)/2)
			  .attr("y", -40)
			  .style("text-anchor", "start")
			  .text(yTitle)
	  }
	  else{
		  svg.append("g")
			  .attr("class", "y axis")
			  .call(yAxis)
			.append("text")
			  .attr("class", "label")
			  .attr("transform", "rotate(-90)")
			  .attr("x", -(height+yTitle.length)/2)
			  .attr("y", -40)
			  .style("text-anchor", "start")
			  .text(yTitle)
	  }

	  svg.selectAll(".dot")
		  .data(data)
		.enter().append("line")
				  .attr("x1", function(d) { return x(d.start); })
				  .attr("y1", function(d) { return y(d.y); })				  
				  .attr("x2", function(d) { return x(d.stop); })
				  .attr("y2", function(d) { return y(d.y); })				  
				  .attr("stroke-width", height/no_lines)
				  .attr("stroke", function(d) { return color_beautification(d.color); })


	});

	// add legend   
	var legend = svg.append("g")
	  .attr("class", "legend")
	  .attr("height", 100)
	  .attr("width", 100)
          .attr('transform', 'translate(-20,50)')    
      
    var h = 0

    for (var i = 0; i < footer.length; i++) {
        
	var array = footer[i].split(","); 
	legend
	      .append("rect")
		  .attr("x", width + margin.left)
	      .attr("y", 15*h)
		  .attr("width", 10)
		  .attr("height", 10)
		  .style("fill", color_beautification(array[1].replace(/\s+/g, '')))

	var chunkSize = legend_width
 	var length = array[0].length 
        
	for (var j = 0; j < length; j += chunkSize) {
           var substr = array[0].substring(j, Math.min(length, j + chunkSize));
	   legend
	      .append("text")
		  .attr("x", width + margin.left + 15)
	      .attr("y", 15*h + 9)
		  .text(substr);
            h += 1
    	}
    }

}

