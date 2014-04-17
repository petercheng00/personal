var graphLogic = (function() {

//--------------- Variables and Initialization ---------------

    var states = Object.freeze({"draw":1, "initialize":2, "tightEdges":3, "augmentPath":4, "updatePrices":5, "done":6});
    var state;
    // these are references
    var lNodes, rNodes, edges;
    var rMatched, minEdgeDiff, solution;
    var augPath = [];
    var lNodesSeen = [];
    var rNodesSeen = [];
    var clear_button, continue_button, back_button;
    var history = [];
    var init = function() {
        continue_button = document.getElementById("continue_button");
	back_button = document.getElementById("back_button");
        clear_button = document.getElementById("clear_button");
	back_button.disabled = true;
	back_button.onclick = goBack;
        window.addEventListener('keydown', doKeyDown, true);
	state = states["draw"];
	setupState();
    };
    
//--------------- Maximum Matching Algorithm ---------------

    var validateGraph = function() {
	graphDraw.stop_draw();
	lNodes = graphDraw.lNodes;
	rNodes = graphDraw.rNodes;
	edges = graphDraw.edges;
        if (lNodes.length < 1) {
            showText("Error - Graph does not have nodes on both sides. Please fix your graph to continue.");
	    history.length = history.length -1;
            graphDraw.resume_draw();
        }
        else if (lNodes.length != rNodes.length) {
            showText("Error - Graph should have same number of nodes on both sides. Please fix your graph to continue.");
	    history.length = history.length -1;
            graphDraw.resume_draw();
        }
        else {addZeroWeightEdges();}
    };

    var addZeroWeightEdges = function() {
	for (var i = 0; i < lNodes.length; ++i)
	{
	    for (var j = 0; j < rNodes.length; ++j)
	    {
		if (getEdge(i, j) == null)
		{
		    edges.push({l:i, r:j, w:0});
		}
	    }
	}
        initVertexCover();
    };
    
    var initVertexCover = function() {
        for (var n = 0; n < rNodes.length; ++n) {
            rNodes[n].p = 0;
            rNodes[n].edges = [];
        }
        for (var n = 0; n < lNodes.length; ++n) {
            var node = lNodes[n];
            node.p = 0;
            node.edges = getTouchingEdges(n);
            for (var e = 0; e < node.edges.length; ++e) {
                if (node.p < node.edges[e].w) {
                    node.p = node.edges[e].w;
                }
                rNodes[node.edges[e].r].edges.push(node.edges[e]);
            }
        }
        advanceState();
    };

    var colorTightEdges = function() {
	for (var e = 0; e < edges.length; ++e)
	{
            if (calcEdgeDiff(edges[e]) == 0) {
                edges[e].tight = true;
            }
            else {
                edges[e].tight = false;
            }
	}
	advanceState();
    };
    
    var findAugment = function() {
        augPath.length = 0;
        lNodesSeen.length = 0;
        rNodesSeen.length = 0;
        var matchedNodes = getMatchedNodes();
        if (matchedNodes[0] >= lNodes.length) {
            completeGraph();
            return;
        }
        for (var n = 0; n < lNodes.length; ++n) {
            if (!matchedNodes[1].hasOwnProperty(n)) {
                if (findAugmentPath(n,true,[])) {
                    advanceState();
                    return;
                }
            }
        }
        highlightNodesSeen();
    };

    var findAugmentPath = function(n,isLeft,edgesSeen) {
        var node;
        if (isLeft) {
            node = lNodes[n];
            lNodesSeen.push(node);
        }
        else {
            node = rNodes[n];
            rNodesSeen.push(node);
        }
        for (var e = 0; e < node.edges.length; ++e) {
            var edge = node.edges[e];
            if (calcEdgeDiff(edge) == 0 && edgesSeen.indexOf(edge) < 0) {
                if (isLeft && !edge.matched) {
                    if (!rMatched.hasOwnProperty(edge.r)) {
                        return augmentEdge(edge);
                    }
                    if (findAugmentPath(edge.r,false,edgesSeen.concat([edge]))) {
                        return augmentEdge(edge);
                    }
                }
                else if (!isLeft && edge.matched) {
                    if (findAugmentPath(edge.l,true,edgesSeen.concat([edge]))) {
                        return augmentEdge(edge);
                    }
                }
            }
        }
        return false;
    };
    
    var augmentEdge = function(edge) {
        edge.augment = true;
        augPath.push(edge);
        return true;
    };
    
    var augmentPath = function() {
        for (var e = 0; e < augPath.length; ++e) {
            augPath[e].augment = false;
            augPath[e].matched = !augPath[e].matched;
        }
        setState("tightEdges");
    };
    
    var highlightNodesSeen = function() {
        minEdgeDiff = Infinity;
        for (var n = 0; n < lNodesSeen.length; ++n) {
            for (var e = 0; e < lNodesSeen[n].edges.length; ++e) {
                var edge = lNodesSeen[n].edges[e];
                if (calcEdgeDiff(edge) < minEdgeDiff && rNodesSeen.indexOf(rNodes[edge.r]) < 0) {
                    minEdgeDiff = calcEdgeDiff(edge);
                }
            }
            lNodesSeen[n].highlight = true;
        }
        for (var n = 0; n < rNodesSeen.length; ++n) {
            rNodesSeen[n].highlight = true;
        }
        setState("updatePrices");
    };
    
    var updatePrices = function() {
        for (var n = 0; n < lNodesSeen.length; ++n) {
            if (lNodesSeen[n].highlight) {
                lNodesSeen[n].p -= minEdgeDiff;
                lNodesSeen[n].highlight = false;
            }
        }
        for (var n = 0; n < rNodesSeen.length; ++n) {
            if (rNodesSeen[n].highlight) {
                rNodesSeen[n].p += minEdgeDiff;
                rNodesSeen[n].highlight = false;
            }
        }
        colorTightEdges();
        setState("tightEdges");
    };
    
    var completeGraph = function() {
        solution = 0;
        for (var e = 0; e < edges.length; ++e) {
            if (edges[e].matched) {
                solution += edges[e].w;
            }
            else {
                edges.splice(e,1);
                e--;
            }
        }
        setState("done");
    };
    
    var newGraph = function() {
        lNodes.length = 0;
	rNodes.length = 0;
	edges.length = 0;
        setState("draw");
    };
    
//--------------- Interaction States ---------------
    
    var setupState = function() {
        graphDraw.redrawGraph();
	console.log("Entering state: " + state);
	switch(state)
	{
	case states["draw"]:
	    showText("Draw your bipartite graph in the area to the left.\nHit the right arrow button below (or use your arrow key) when finished drawing.");
            graphDraw.resume_draw();
	    continue_button.onclick = function(){addToHistory(); validateGraph();}
	    break;
	case states["initialize"]:
	    showText("Zero-weight edges have been added; the graph is now completely connected.\n\n" +
                     "Vertex values (prices) of the nodes on the left side have been initialized to the maximum weight of their incident edges.\n" +
                     "Vertex values on the right side have been initialized to zero.\n\n" +
                     "Constraint: The sum of two vertex prices is always at least the weight of the edge between them.");
	    continue_button.onclick = function(){addToHistory(); colorTightEdges();}
	    break;
	case states["tightEdges"]:
	    showText("Edges that are part of the current matching are shown in green.\nTight edges are red.\nOther edges in black.\n\n" +
                     "A tight edge is one where its weight is exactly equal to the sum of the prices of its two endpoints.");
	    continue_button.onclick = function(){addToHistory(); findAugment();}
	    break;
        case states["augmentPath"]:
	    showText("Find an Augmented Path\nGoal: Reach an unmatched node on the right side, starting from an unmatched node on the left side.\n\n" +
                     "Constraints: Use only unmatched tight edges when going from left to right, and matched edges when going from right to left.\n\n" +
                     "An augmented path (colored in purple) has been found. Next, the matched and unmatched edges in the augmented path will be swapped in order to increase the number of edges in the matching by 1.");
	    continue_button.onclick = function(){addToHistory(); augmentPath();}
	    break;
        case states["updatePrices"]:
	    showText("Nodes in blue can be reached by paths starting from an unmatched node on the left side subjected to the constraints below.\n" +
                     "Constraints: Use only unmatched tight edges when going from left to right, and matched edges when going from right to left.\n\n" +
                     "Lemma: There are no tight edges between blue nodes on left side and green nodes on right side.\n\n" +
                     "Blue nodes will adjust their prices by the minimum difference between the weight of edges linking " +
                     "left blue nodes and right green nodes and the sum of incident node prices for the same edges.\n" +
                     "Blue nodes on the left will decrease their prices by the amount below, while blue nodes on the right " +
                     "will increase their prices by the same amount.\n" +
                     "Minimum Edge Difference: " + minEdgeDiff);
	    continue_button.onclick = function(){addToHistory(); updatePrices();}
	    break;
        case states["done"]:
	    showText("Matching completed - all nodes on the left side are matched to a different node on the right side, with maximum weight across all selected edges.\n" +
                     "Value of the maximum weight matching: " + solution);
	    continue_button.onclick = function(){}
	    break;
	default:
	    showText("Congratulations! You hacked the code. You shouldn't see this.");
	}
    };
    
    var advanceState = function() {
	++state;
	setupState();
    };

    var setState = function(s) {
	state = states[s];
	setupState();
    };
    
    var showText = function(t) {
	document.getElementById("textBox").value = t;
    };
    
//--------------- Helper Functions ---------------

    var doKeyDown = function(evt) {
        switch (evt.keyCode) {
            case 37:
                back_button.click();
                break;
            case 39:
                continue_button.click();
                break;
        }
    };
    
    var getEdge = function(lNode, rNode) {
        for (var e = 0; e < edges.length; ++e)
        {
            if (edges[e].l == lNode && edges[e].r == rNode)
            {
                return edges[e];
            }
        }
	return null;
    };
    
    var getTouchingEdges = function(lNode) {
        var touchingEdges = [];
        for (var e = 0; e < edges.length; ++e)
        {
            if (edges[e].l == lNode)
            {
                touchingEdges.push(edges[e]);
            }
        }
	return touchingEdges;
    };
    
    var calcEdgeDiff = function(edge) {
        return lNodes[edge.l].p + rNodes[edge.r].p - edge.w;
    };
    
    var getMatchedNodes = function() {
        var size = 0;
        var lMatched = {};
        rMatched = {};
        for (var e = 0; e < edges.length; ++e) {
            if (edges[e].matched) {
                size++;
                lMatched[edges[e].l] = true;
                rMatched[edges[e].r] = true;
            }
        }
        return [size, lMatched];
    };
    
//--------------- History ---------------
    
    var goBack = function() {
	if (history.length == 0) {
	    return;
	}
        if (history.length == 1) {
	    back_button.disabled = true;
	}
        var prevHistory = history[history.length-1];
        var toFindAug = false;
        if (prevHistory.state == 4 || prevHistory.state == 5) {
            prevHistory = history[history.length-2];
            toFindAug = true;
        }
        
	state = prevHistory.state;
	lNodes.length = 0;
	rNodes.length = 0;
	edges.length = 0;
        arrayCopy(prevHistory.lNodes, lNodes);
        arrayCopy(prevHistory.rNodes, rNodes);
        arrayCopy(prevHistory.edges, edges);
        for (var n = 0; n < rNodes.length; ++n) {
            rNodes[n].edges = [];
        }
        for (var n = 0; n < lNodes.length; ++n) {
            var node = lNodes[n];
            node.edges = getTouchingEdges(n);
            for (var e = 0; e < node.edges.length; ++e) {
                rNodes[node.edges[e].r].edges.push(node.edges[e]);
            }
        }

	history.length = history.length-1;
        if (toFindAug) {
            findAugment();
        }
        else {
	    setupState();
        }
    };

    var addToHistory = function() {
	console.log("Adding to history");
        var cloneLNodes = [];
        var cloneRNodes = [];
        var cloneEdges = [];
        arrayCopy(graphDraw.lNodes, cloneLNodes);
        arrayCopy(graphDraw.rNodes, cloneRNodes);
        arrayCopy(graphDraw.edges, cloneEdges);
        
	history.push({state:state, lNodes:cloneLNodes, rNodes:cloneRNodes, edges:cloneEdges});
	if (history.length > 0)
	{
	    back_button.disabled = false;
	}
    };

    return {
	init: init,
	state: state,
	history: history,
	showText: showText
    };
})();



function clone(obj) {
    if (obj == null || typeof(obj) != 'object') return obj;
    var copy = obj.constructor();
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
    }
    return copy;
}

function arrayCopy(from, to) {
    for (var i = 0; i < from.length; ++i) {
        to.push(clone(from[i]));
    }
}
