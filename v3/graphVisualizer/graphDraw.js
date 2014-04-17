var graphDraw = (function() {
    var canvas, context, canvaso, contexto;

    // The active tool instance.
    var tool;
    var tool_default = 'node';

    var lNodes = [];
    var rNodes = [];
    var node_radius = 20;

    var edges = [];

    var nodeColor = 'green';
    var nodeHighlightColor = 'blue';
    var nodeBorderColor = '#003300'

    var edgeColor = 'black';
    var edgeTightColor = 'red';
    var edgeMatchedColor = 'green';
    var edgeAugmentColor = 'purple';

    var weightColor = 'blue';



    var init = function() {
        // Find the canvas element.
        canvaso = document.getElementById('imageView');
        if (!canvaso) {
            alert('Error: I cannot find the canvas element!');
            return;
        }

        if (!canvaso.getContext) {
            alert('Error: no canvas.getContext!');
            return;
        }

        // Get the 2D canvas context.
        contexto = canvaso.getContext('2d');
        if (!contexto) {
            alert('Error: failed to getContext!');
            return;
        }

        // Add the temporary canvas.
        var container = canvaso.parentNode;
        canvas = document.createElement('canvas');
        if (!canvas) {
	    alert('Error: I cannot create a new canvas element!');
	    return;
        }

        canvas.id     = 'imageTemp';
        canvas.width  = canvaso.width;
        canvas.height = canvaso.height;
        container.appendChild(canvas);

        context = canvas.getContext('2d');

        var clear_button = document.getElementById("clear_button");
        clear_button.onclick = function() {
            lNodes.length = 0;
	    rNodes.length = 0;
            edges.length = 0;
	    redrawGraph();
        }

        var tool_radios = document.toolForm.toolRadios;
        for (var i = 0; i < tool_radios.length; ++i)
        {
            if (tool_radios[i].value == tool_default)
            {
                tool_radios[i].checked = true;
            }
            tool_radios[i].onclick = function()
            {
                if (tools[this.value])
                {
                    tool = new tools[this.value]();
                }
            }
        }


        // Activate the default tool.
        if (tools[tool_default]) {
            tool = new tools[tool_default]();
        }

        // Attach the mousedown, mousemove and mouseup event listeners.
        canvas.addEventListener('mousedown', ev_canvas, false);
        canvas.addEventListener('mousemove', ev_canvas, false);
        canvas.addEventListener('mouseup',   ev_canvas, false);
	initCanvas();
    };

    var stop_draw = function() {
        var tool_radios = document.toolForm.toolRadios;
        for (var i = 0; i < tool_radios.length; ++i)
        {
            tool_radios[i].disabled = true;
        }
	tool = new tools['highlight']();
        document.getElementById('clear_button').disabled = true;
        canvas.removeEventListener('mousedown', ev_canvas);
        //canvas.removeEventListener('mousemove', ev_canvas);
        canvas.removeEventListener('mouseup', ev_canvas);
        clearTempCanvas();
    };

    var resume_draw = function() {
        var tool_radios = document.toolForm.toolRadios;
        for (var i = 0; i < tool_radios.length; ++i)
        {
            tool_radios[i].disabled = false;
	    if (tool_radios[i].checked == true)
	    {
		tool = new tools[tool_radios[i].value]();
	    }
        }

        document.getElementById('clear_button').disabled = false;
        canvas.addEventListener('mousedown', ev_canvas, false);
        //canvas.addEventListener('mousemove', ev_canvas, false);
        canvas.addEventListener('mouseup',   ev_canvas, false);
    };

    // The general-purpose event handler. This function just determines the mouse
    // position relative to the canvas element.
    var ev_canvas = function (ev) {
        if (ev.layerX || ev.layerX == 0) { // Firefox
            ev._x = ev.layerX;
            ev._y = ev.layerY;
        } else if (ev.offsetX || ev.offsetX == 0) { // Opera
            ev._x = ev.offsetX;
            ev._y = ev.offsetY;
        }

        // Call the event handler of the tool.
        var func = tool[ev.type];
        if (func) {
            clearTempCanvas();
            func(ev);
        }
    };

    // The event handler for any changes made to the tool selector.
    var ev_tool_change = function (ev) {
        if (tools[this.value]) {
            tool = new tools[this.value]();
        }
    };

    // This function draws the #imageTemp canvas on top of #imageView, after which
    // #imageTemp is cleared. This function is called each time when the user
    // completes a drawing operation.
    var img_update = function () {
	contexto.drawImage(canvas, 0, 0);
	context.clearRect(0, 0, canvas.width, canvas.height);
    };

    // This object holds the implementation of each drawing tool.
    var tools = {};

    // The highlight tool, for use after done drawing
    tools.highlight = function () {
	this.mousemove = function (ev) {
            for (var i = 0; i < edges.length; ++i)
            {
		if (onEdge(edges[i], ev._x, ev._y))
                {
                    drawEdge(edges[i].l, edges[i].r, 'yellow');
		    highlightWeight(i);
                    return;
                }
            }
        };
    };

    // The node tool.
    tools.node = function () {
        this.mousedown = function (ev) {
            if (canDrawNode(ev._x, ev._y))
            {
                drawNode(ev._x, ev._y);
		addNode(ev._x, ev._y);
                img_update();
            }
        };

        this.mousemove = function (ev) {
            if (canDrawNode(ev._x, ev._y))
            {
                drawNode(ev._x, ev._y, '#00ee00', '#00dd00');
            }
            else
            {
                drawX(ev._x, ev._y);
            }
        };
        this.mouseup = function (ev) {
        };
    };


    // The edge tool.
    tools.edge = function () {
        this.l = null;
        this.r = null;

        this.mousedown = function (ev) {
	    var nodes = [];
	    var l = onLeft(ev._x, ev._y);
	    if (l)
	    {
		nodes = lNodes;
	    }
	    else
	    {
		nodes = rNodes;
	    }
            for (var i = 0; i < nodes.length; ++i)
            {
                if (onNode(nodes[i], ev._x, ev._y))
                {
		    if (l)
		    {
			this.l = i;
		    }
		    else
		    {
			this.r = i;
		    }
                    drawNode(nodes[i].x, nodes[i].y, nodeHighlightColor);
                    return;
                }
            }
        };



        this.mousemove = function (ev) {
	    var nearNode = null;
	    if (this.l == null)
	    {
		for (var i = 0; i < lNodes.length; ++i)
		{
                    if (onNode(lNodes[i], ev._x, ev._y))
                    {
			drawNode(lNodes[i].x, lNodes[i].y, 'blue');
			nearNode = i;
			break;
                    }
		}
	    }
	    if (this.r == null)
	    {
		for (var i = 0; i < rNodes.length; ++i)
		{
                    if (onNode(rNodes[i], ev._x, ev._y))
                    {
			drawNode(rNodes[i].x, rNodes[i].y, 'blue');
			nearNode = i;
			break;
                    }
		}
	    }
	    if (this.l == null && this.r == null)
	    {
		return;
	    }

	    var startX = null;
	    var startY = null;
	    if (this.l != null)
	    {
		startX = lNodes[this.l].x;
		startY = lNodes[this.l].y;
	    }
            if (this.r != null)
	    {
		startX = rNodes[this.r].x;
		startY = rNodes[this.r].y;
	    }

            drawNode(startX, startY, 'blue');
            context.beginPath();
            context.moveTo(startX, startY);
	    context.lineTo(ev._x, ev._y);
            context.stroke();
            context.closePath();
        };

        this.mouseup = function (ev) {
            if (this.l == null && this.r == null)
            {
                return;
            }
            if (this.l == null)
            {
                for (var i = 0; i < lNodes.length; ++i)
                {
                    if (onNode(lNodes[i], ev._x, ev._y))
                    {
                        this.l = i;
                        break;
                    }
                }
            }
            if (this.r == null)
            {
                for (var i = 0; i < rNodes.length; ++i)
                {
                    if (onNode(rNodes[i], ev._x, ev._y))
                    {
                        this.r = i;
                        break;
                    }
                }
            }

            if (this.l == null || this.r == null)
            {
                this.l = null;
                this.r = null;
                return;
            }
            drawNode(lNodes[this.l].x, lNodes[this.l].y, 'blue')
            drawNode(rNodes[this.r].x, rNodes[this.r].y, 'blue');
            if (!edgeExists(this.l, this.r))
            {
                var weight = parseFloat(prompt("Edge Weight",0));
                if (isNaN(weight))
                {
                    this.l = null;
                    this.r = null;
                    return;
                }
                clearTempCanvas();
		addEdge(this.l, this.r, weight);
		redrawGraph();
            }
            this.l = null;
            this.r = null;
        };
    };




    // The eraser tool.
    tools.eraser = function () {
        this.mousedown = function (ev) {
	    var nodes = [];
            var l = onLeft(ev._x, ev._y);
	    if (l)
	    {
		nodes = lNodes;
	    }
	    else
	    {
		nodes = rNodes;
	    }
            for (var i = 0; i < nodes.length; ++i)
            {
                if (lineDistance(ev._x, ev._y, nodes[i].x, nodes[i].y) < node_radius)
                {
                    if (l)
                    {
                        removeLNode(i);
                    }
                    else
                    {
                        removeRNode(i);
                    }
                    clearCanvas();
		    redrawGraph();
                    return;
                }
            }
            for (var i = 0; i < edges.length; ++i)
            {
		if (onEdge(edges[i], ev._x, ev._y))
                {
                    edges.splice(i,1);
                    clearCanvas();
		    redrawGraph();
                    return;
                }
            }
        };

        this.mousemove = function (ev) {
            for (var i = 0; i < lNodes.length; ++i)
            {
		if (onNode(lNodes[i], ev._x, ev._y))
                {
                    drawNode(lNodes[i].x, lNodes[i].y, '#aa0000', '#440000');
                    return;
                }
            }
            for (var i = 0; i < rNodes.length; ++i)
            {
		if (onNode(rNodes[i], ev._x, ev._y))
                {
                    drawNode(rNodes[i].x, rNodes[i].y, '#aa0000', '#440000');
                    return;
                }
            }

            for (var i = 0; i < edges.length; ++i)
            {
		if (onEdge(edges[i], ev._x, ev._y))
                {
                    drawEdge(edges[i].l, edges[i].r, 'red');
                    return;
                }
            }
        };

        this.mouseup = function (ev) {
        };
    };

    var initCanvas = function()
    {
        contexto.strokeStyle = 'grey';
        contexto.lineWidth = 1;
        contexto.beginPath();
        contexto.moveTo(canvas.width/2, 0);
        contexto.lineTo(canvas.width/2, canvas.height);
        contexto.stroke();
        contexto.closePath();


        contexto.textAlign='center'
        contexto.font="20px Arial";

        contexto.beginPath();
        contexto.fillStyle = 'black';
        contexto.fillText('U',canvas.width/4,30);
        contexto.fill();
        contexto.closePath();

        contexto.beginPath();
        contexto.fillStyle = 'black';
        contexto.fillText('V',(canvas.width*3)/4,30);
        contexto.fill();
        contexto.closePath();


    };

    var redrawGraph = function()
    {
        clearCanvas();
        clearTempCanvas();
        initCanvas();
        drawNodes();
        drawEdges();
	drawWeights();
        drawPrices();
        img_update();
    }

    var clearTempCanvas = function()
    {
	context.clearRect(0, 0, canvas.width, canvas.height);
    };
    var clearCanvas = function()
    {
	contexto.clearRect(0, 0, canvaso.width, canvaso.height);
    };




    var onLeft = function(x, y)
    {
	return x < canvas.width/2;
    };
    var onNode = function(n, x, y)
    {
	return lineDistance(x, y, n.x, n.y) < node_radius;
    };

    var onEdge = function(e, x, y)
    {
	return (distToSegment({x: x, y:y}, lNodes[e.l], rNodes[e.r]) < node_radius/4)
    };

    var canDrawNode = function(x, y)
    {
	for (var i = 0; i < lNodes.length; ++i)
	{
	    if (lineDistance(x, y, lNodes[i].x, lNodes[i].y) < 2.5 * node_radius)
	    {
		return false;
	    }
	}
	for (var i = 0; i < rNodes.length; ++i)
	{
	    if (lineDistance(x, y, rNodes[i].x, rNodes[i].y) < 2.5 * node_radius)
	    {
		return false;
	    }
	}

	if (x < node_radius || x > canvas.width - node_radius || y < node_radius || y > canvas.height - node_radius)
	{
	    return false;
	}
	if (Math.abs(x - canvas.width/2) < node_radius)
	{
	    return false;
	}
	return true;
    };

    var drawNodes = function()
    {
	for (var i = 0; i < lNodes.length; ++i)
	{
            c = nodeColor;
            if (lNodes[i].highlight) {
                c = nodeHighlightColor;
            }
	    drawNode(lNodes[i].x, lNodes[i].y, c);
	}
        for (var i = 0; i < rNodes.length; ++i)
        {
            c = nodeColor;
            if (rNodes[i].highlight) {
                c = nodeHighlightColor;
            }
            drawNode(rNodes[i].x, rNodes[i].y, c);
        }
    };

    var drawEdges = function()
    {
	for (var i = 0; i < edges.length; ++i)
	{
	    c = edgeColor;
	    if (edges[i].augment)
	    {
		c = edgeAugmentColor;
	    }
	    else if (edges[i].matched)
	    {
		c = edgeMatchedColor;
	    }
            else if (edges[i].tight)
            {
                c = edgeTightColor;
            }
	    drawEdge(edges[i].l, edges[i].r, c);
	}
    };

    var drawNode = function(x, y, color1, color2)
    {
	color1 = typeof color1 !== 'undefined' ? color1 : nodeColor;
	color2 = typeof color2 !== 'undefined' ? color2 : nodeBorderColor;
	context.beginPath();
	context.arc(x, y, node_radius, 0, 2 * Math.PI, false);
	context.fillStyle = color1;
	context.fill();
	context.lineWidth = 2;
	context.strokeStyle = color2;
	context.stroke();
    };

    var drawX = function(x, y)
    {
	context.strokeStyle = 'red';
	context.lineWidth = 1;
	context.beginPath();
	var xLen = 0.8 * node_radius;
	context.moveTo(x-xLen, y-xLen);
	context.lineTo(x+xLen, y+xLen);
	context.stroke();
	context.closePath();
	context.beginPath();
	context.moveTo(x+xLen, y-xLen);
	context.lineTo(x-xLen, y+xLen);
	context.stroke();
	context.closePath();
    };

    var drawEdge = function(i1, i2, color)
    {
	color = typeof color !== 'undefined' ? color : edgeColor;
	var x1 = lNodes[i1].x;
	var y1 = lNodes[i1].y;
	var x2 = rNodes[i2].x;
	var y2 = rNodes[i2].y;
	context.strokeStyle = color;
	context.lineWidth = 5;
	context.beginPath();
	context.moveTo(x1, y1);
	context.lineTo(x2, y2);
	context.stroke();
	context.closePath();
    };

    var addEdge = function(i1, i2, weight)
    {
	edges.push({l: i1, r: i2, w:weight});
    };

    var drawOutlinedText = function(t, x, y, lw, c1, c2)
    {
	context.textAlign='center'
	context.font="15px Arial";
	context.lineWidth = lw;

	context.beginPath();
	context.strokeStyle = c1;
	context.strokeText(t, x, y);
	context.stroke();
	context.closePath();

	context.beginPath();
	context.fillStyle = c2;
	context.fillText(t, x, y);
	context.fill();
	context.closePath();
    };

    var drawPrices = function()
    {
	for (var i = 0; i < lNodes.length; ++i)
	{
	    n = lNodes[i];
	    if (n.p != null)
	    {
		drawOutlinedText(n.p, n.x, n.y+4, 4, 'white', 'purple');
	    }
	}
	for (var i = 0; i < rNodes.length; ++i)
	{
	    n = rNodes[i];
	    if (n.p != null)
	    {
		drawOutlinedText(n.p, n.x, n.y+4, 4, 'white', 'purple');
	    }
	}

    }

    var highlightWeight = function(ind)
    {
	loc = drawWeights(ind);
	
	context.textAlign='center'
	context.font="50px Arial";
	context.lineWidth = 25;

	context.beginPath();
	context.strokeStyle = 'white';
	context.strokeText(edges[ind].w, loc.x, loc.y);
	context.stroke();
	context.closePath();

	context.beginPath();
	context.fillStyle = weightColor;
	context.fillText(edges[ind].w, loc.x, loc.y);
	context.fill();
	context.closePath();
    }

    var drawWeights = function(targetWeight)
    {
	retX = -1;
	retY = -1;
	if (typeof targetWeight === "undefined")
	{
	    targetWeight = -1;
	}
	var intersections = [];
	for (var i = 0; i < edges.length; ++i)
	{
	    for (var j = i+1; j < edges.length; ++j)
	    {
                var p = getIntersection({x1:lNodes[edges[i].l].x,y1:lNodes[edges[i].l].y, x2:rNodes[edges[i].r].x, y2:rNodes[edges[i].r].y}, {x1:lNodes[edges[j].l].x,y1:lNodes[edges[j].l].y, x2:rNodes[edges[j].r].x, y2:rNodes[edges[j].r].y})
                if (p != null)
                {
		    intersections.push(p);
                }
	    }
	}
	for (var i = 0; i < edges.length; ++i)
	{
	    var x1 = lNodes[edges[i].l].x;
	    var x2 = rNodes[edges[i].r].x;
	    var y1 = lNodes[edges[i].l].y;
	    var y2 = rNodes[edges[i].r].y;
	    context.textAlign='center'
	    context.font="15px Arial";
	    xLocation = (x1+x2) * 0.5;
	    yLocation = (y1+y2) * 0.5;

	    var locations = [{x:(x1+x2)*0.5,y:(y1+y2)*0.5}, {x:(x1*0.75+x2*0.25), y:(y1*0.75+y2*0.25)}, {x:(x1*0.25+x2*0.75), y:(y1*0.25+y2*0.75)}];
	    for (var j = 0; j < locations.length; ++j)
	    {
		var blocked = false;
		for (var k = 0; k < intersections.length; ++k)
		{
		    if (lineDistance(locations[j].x, locations[j].y, intersections[k].x, intersections[k].y) < 20)
		    {
			blocked = true;
			break;
		    }
		}
		if (!blocked)
		{
		    xLocation = locations[j].x;
		    yLocation = locations[j].y;
		    break;
		}
	    }
	    drawOutlinedText(edges[i].w, xLocation, yLocation, 7, 'white', weightColor);
	    if (i == targetWeight)
	    {
		retX = xLocation;
		retY = yLocation;
	    }
	}
	return { 'x': retX, 'y': retY };
    };

    var edgeExists = function(in1, in2)
    {
	for (var i = 0; i < edges.length; ++i)
	{
	    if ((edges[i].n1 == in1 && edges[i].n2 == in2) || (edges[i].n1 == in2 && edges[i].n2 == in1))
	    {
		return true;
	    }
	}
	return false;
    };

    var addNode = function(x, y)
    {
	if (onLeft(x,y))
	{
	    lNodes.push({x:x, y:y});
	}
	else
	{
	    rNodes.push({x:x, y:y});
	}
    }
    var removeLNode = function(i)
    {
	lNodes.splice(i, 1);
	for (var j = edges.length-1; j >= 0; --j)
	{
	    if (edges[j].l == i)
	    {
		edges.splice(j,1);
	    }
	    else
	    {
		if (edges[j].l > i)
		{
		    --edges[j].l;
		}
	    }
	}
    };
    var removeRNode = function(i)
    {
	rNodes.splice(i, 1);
	for (var j = edges.length-1; j >= 0; --j)
	{
	    if (edges[j].r == i)
	    {
		edges.splice(j,1);
	    }
	    else
	    {
		if (edges[j].r > i)
		{
		    --edges[j].r;
		}
	    }
	}
    };

    return {
	init: init,
	stop_draw: stop_draw,
        resume_draw: resume_draw,
        redrawGraph: redrawGraph,
	lNodes: lNodes,
	rNodes: rNodes,
	edges: edges
    };
})();















function lineDistance( x1, y1, x2, y2 )
{
    var xs = 0;
    var ys = 0;

    xs = x2 - x1;
    xs = xs * xs;

    ys = y2 - y1;
    ys = ys * ys;

    return Math.sqrt( xs + ys );
}

function sqr(x) { return x * x }
function dist2(v, w) { return sqr(v.x - w.x) + sqr(v.y - w.y) }
function distToSegmentSquared(p, v, w) {
    var l2 = dist2(v, w);
    if (l2 == 0) return dist2(p, v);
    var t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    if (t < 0) return dist2(p, v);
    if (t > 1) return dist2(p, w);
    return dist2(p, { x: v.x + t * (w.x - v.x),
                      y: v.y + t * (w.y - v.y) });
}
function distToSegment(p, v, w) { return Math.sqrt(distToSegmentSquared(p, v, w)); }

function getIntersection(l1, l2) {
    var x1 = l1.x1;
    var x2 = l1.x2;
    var x3 = l2.x1;
    var x4 = l2.x2;
    var y1 = l1.y1;
    var y2 = l1.y2;
    var y3 = l2.y1;
    var y4 = l2.y2;
    var denom = ((x1-x2)*(y3-y4)-(y1-y2)*(x3-x4));
    if (denom == 0)
    {
	return null;
    }
    var px = ((x1*y2-y1*x2)*(x3-x4)-(x1-x2)*(x3*y4-y3*x4))/denom;
    var py = ((x1*y2-y1*x2)*(y3-y4)-(y1-y2)*(x3*y4-y3*x4))/denom;
    if ((px <= x1 && px >= x2) || (px >= x1 && px <= x2))
    {
	return {x: px, y: py};
    }
    return null;
};

