/**
 *  Burn Notice JavaScript
 *  @author Andrew Sender
 *  
 */

/******* Global Variables *****************/
/*******     CONTANTS       ***************/
var SELECTABLE_CLASS_ITEM_TYPES = ["routerItem", "switchItem"];
var MAIN_DIV_IDS = ["credentialsDiv", "editRouterDiv", "svgDiv"];
var MAX_NUMBER_ITEMS = 1000;
var MAX_NUMBER_LINKS = 1000;
var MAX_ITEM_ID_WIDTH = 3;
var MAX_LINK_ID_WIDTH = 3;
var MAX_NUM_CARDS =10;
var svgPositionX = 250;
var svgPositionY = 225;

/******* Dynamic Global Variables *********/
var currentMouseX = 0;
var currentMouseY = 0;
var lastRouterId = 0;
var lastSwitchId = 0;
var lastVnmicId  = 0;
var lastLinkId = 0;
var selectedElements = [];
var selectedElementMatrices = [];
var svgMatrix = [];
var globalLinkList = [];
var inLinkMode = 0;

/******* Global Variables *****************/


/*********** Functions ********************/
function pad(number, width, zeroChar) 
{
  zeroChar = zeroChar || '0';
  number = number + '';
  return number.length >= width ? number : new Array(width - number.length + 1).join(zeroChar) + number;
}


/*********** On Load Functions ***************/
function loadSVG(thisElement)
{
   //Initializaitons
   resizeMainDiv();
   initializeEditRouterDiv();
   
   createItem("router");
   
   
   selectAllItems();
   editItem();
   //document.getElementsByName('importFileInput')[0].addEventListener('change', analyzeConfigFile, false);
   /*
   createItem("router");
   createItem("router");
   createItem("router");
   selectAllItems();
   moveItem(selectedElements[1], 400, 400);
   moveItem(selectedElements[2], 0, 400);
   linkItems();
   deselectElements();
   */
}


function initializeEditRouterDiv()
{
    //Copy MDA/1 options to MDA/2
    var options = document.getElementsByName("card1Mda1Type")[0].innerHTML;
    document.getElementsByName("card1Mda2Type")[0].innerHTML = document.getElementsByName("card1Mda1Type")[0].innerHTML;
    
    //Copy Row 1 to Rows 2-MAX_NUM_CARDS + A
    var row1 = document.getElementById("editCard1Row").innerHTML;
    for (var rowIndex = 2; rowIndex <= MAX_NUM_CARDS; rowIndex++)
    {
        insertCardRowInEditRouterDiv(row1, rowIndex);
    }
    insertCardRowInEditRouterDiv(row1, "A");
    insertCardRowInEditRouterDiv(row1, "B");
    
    changeNumCards(document.getElementsByName("numCards")[0]);
    document.getElementsByName("isCardB")[0].checked = false;
    changeCardB(document.getElementsByName("isCardB")[0]);
}

function insertCardRowInEditRouterDiv(row1, rowIndex)
{
    var cardTable = document.getElementById("editRouterCardsTable");
    var newRowHtml = row1;
    newRowHtml = newRowHtml.replace("card1", "card" + rowIndex);
    newRowHtml = newRowHtml.replace("<td>1</td>", "<td>" + rowIndex + "</td>");
    //alert("newRowHtml = " + newRowHtml);
    var newRow = cardTable.insertRow();
    newRow.innerHTML = newRowHtml;
}

function displayMainDiv(showDivId)
{
    for (var divIndex = 0; divIndex < MAIN_DIV_IDS.length; divIndex++)
    {
        var divId = MAIN_DIV_IDS[divIndex];
        if (divId == showDivId)
        {
            document.getElementById(divId).style.display = "";
        }
        else
        {
            document.getElementById(divId).style.display = "none";
        }
    }

}
/*********** Menu Function ***************************/
function createItem(elementType)
{
    var svg = document.getElementById("svgId");
    var newItem = document.createElementNS('http://www.w3.org/2000/svg', "g");
    var newImg = document.createElementNS('http://www.w3.org/2000/svg', "image");
    var newBdr = document.createElementNS('http://www.w3.org/2000/svg', "rect");
    var newText = document.createElementNS('http://www.w3.org/2000/svg', "text");
    var lastItemId = 0;
    svg.appendChild(newItem);
    newItem.appendChild(newImg);
    newItem.appendChild(newBdr);
    newItem.appendChild(newText);
    
    newItem.setAttribute("x", "0");
    newItem.setAttribute("y", "0");
    newItem.setAttribute("transform", "matrix(1 0 0 1 0 0)");
    
    if (elementType == "router")
    {
        newItem.setAttribute("class", "routerItem"); 
        newImg.setAttribute("href", "img/router.png");
        lastItemId = ++lastRouterId;
        newText.innerHTML = "R" + pad(lastItemId, MAX_ITEM_ID_WIDTH);
    }
    else if (elementType == "switch")
    {
        newItem.setAttribute("class", "switchItem"); 
        newImg.setAttribute("href", "img/switch.png");
        lastItemId = ++lastSwitchId;
        newText.innerHTML = "S" + pad(lastItemId, MAX_ITEM_ID_WIDTH);
    }
    else if (elementType == "vmnic")
    {
        newItem.setAttribute("class", "vmnicItem"); 
        newImg.setAttribute("href", "img/vmnic.png");
        lastItemId = ++lastVnmicId;
        newText.innerHTML = "VMNIC" + pad(lastItemId, MAX_ITEM_ID_WIDTH);
    }
    
    
    var sWidth = "225";
    var sHeight = "225";
    newImg.setAttribute("width", sWidth);
    newImg.setAttribute("height", sHeight);
    newImg.setAttribute("onclick", "selectElements(evt)");
    
    newBdr.setAttribute("width", sWidth);
    newBdr.setAttribute("height", sHeight);
    newBdr.setAttribute("style", "fill:none;stroke-width:5px;stroke:rgb(0,0,0);");
    newBdr.setAttribute("onmouseover", "setCursorResize(evt)");
    newBdr.setAttribute("onmousedown", "startResizingElement(evt)");
    newBdr.setAttribute("onmouseout",   "this.style.cursor = ''");
    newBdr.style.display = "none";
    
    newText.style.fontSize = "20pt";
    
    //Shouldn't need to be setting this.
    //Not sure how to fix this buggy.
    if (elementType == "vmnic")
    {
        newText.style.width = "132px";
        
    }
    else
    {
        newText.style.width = "60px";
    }
    newText.style.height = "15px";
    
    newText.setAttribute("x", parseInt(sWidth)/2 -  parseInt(newText.style.width)/2);
    newText.setAttribute("y", parseInt(sHeight)/2 - parseInt(newText.style.height)/2);
    //I want something to make the text look like it's part of the image
    newText.setAttribute("onclick", "selectElements(evt)");
    
    var newItemId =  elementType + pad(lastItemId, MAX_ITEM_ID_WIDTH);
    newItem.setAttribute("id", newItemId);
    
    return newItemId;
}

function deleteItem()
{
    var svg = document.getElementById("svgId");
    for (var selectedIndex = selectedElements.length-1; selectedIndex >= 0; selectedIndex--)
    {
        //Remove connected links
        var connectedLinks = getConnectedLinks(selectedElements[selectedIndex]);
        for (var linkIndex = 0; linkIndex < globalLinkList.length; linkIndex++)
        {
            for (var connectedLinkIndex = 0; connectedLinkIndex < connectedLinks.length; connectedLinkIndex++)
            {
                if (globalLinkList[linkIndex].id == connectedLinks[connectedLinkIndex].id)
                {
                    var removedLink = globalLinkList[linkIndex];
                    globalLinkList.splice(linkIndex,1);
                    svg.removeChild(removedLink);
                }
            }
        }
        svg.removeChild(selectedElements[selectedIndex]);
        selectedElements.pop();
    }
}

function scaleSvg(inout)
{
    var svg = document.getElementById("svgId");
    var currentMatrix = svg.getAttribute("transform").slice(7, -1).split(' ');
    var factor = 1.1;
    if (inout == 'in')
    {
        //factor = 0.5;
    }
    else if (inout == 'out')
    {
        factor = 1/factor;
    }
    else if (inout == 'reset')
    {
        factor = 1/currentMatrix[0];
    }
    else
    {
        alert("ERROR: This should not be happening");
    }
    
    //alert("factor = " + factor);
    currentMatrix[0] *= factor;
    currentMatrix[3] *= factor;
    svg.setAttribute("transform", "matrix(" + currentMatrix.join(' ') + ")");
}

function shiftSvg(shiftDirection)
{
    var svg = document.getElementById("svgId");
    var currentMatrix = svg.getAttribute("transform").slice(7, -1).split(' ');
    var shiftX = 0;
    var shiftY = 0;
    var shiftValue = 100;
    if (shiftDirection == 'left')
    {
        shiftX = shiftValue * -1;
    }
    else if (shiftDirection == 'right')
    {
        shiftX = shiftValue * 1;
    }
    else if (shiftDirection == 'up')
    {
        shiftY = shiftValue * -1;
    }
    else if (shiftDirection == 'down')
    {
        shiftY = shiftValue * 1;
    }
    else if (shiftDirection == 'reset')
    {
        shiftX = - parseInt(currentMatrix[4]);
        shiftY = - parseInt(currentMatrix[5]);
    }
    else
    {
        alert("ERROR: This should not be happening");
    }
    
    currentMatrix[4] = parseInt(currentMatrix[4]) + (shiftX);
    currentMatrix[5] = parseInt(currentMatrix[5]) + (shiftY);
    svg.setAttribute("transform", "matrix(" + currentMatrix.join(' ') + ")");
}

function moveItem(movingElement, deltaX, deltaY)
{
    var currentMatrix = movingElement.getAttribute("transform").slice(7, -1).split(' ');
    currentMatrix[4] = deltaX;
    currentMatrix[5] = deltaY;
    movingElement.setAttribute("transform", "matrix(" + currentMatrix.join(' ') + ")");
    
    //Update link endpoints
    var connectedLinks = getConnectedLinks(movingElement);
    for (var linkIndex = 0; linkIndex < connectedLinks.length; linkIndex++)
    {
        updateLinkPosition(connectedLinks[linkIndex]);
    }
}

function selectAllItems()
{
    var svg = document.getElementById("svgId");
    deselectElements();
    for (var childIndex = 0; childIndex < svg.children.length; childIndex++)
    {
        var child = svg.children[childIndex];
        //alert("child.getAttribute(class) = " + child.getAttribute("class"));
        if (SELECTABLE_CLASS_ITEM_TYPES.indexOf(child.getAttribute("class")) >= 0)
        {
            //alert("Found selectable item -> Add to selected array.");
            addSelectedElement(child);
        }
    }
}

function doesLinkItemPairExist(itemPairValue)
{
    for (linkIndex = 0; linkIndex < globalLinkList.length; linkIndex++)
    {
        var items = globalLinkList[linkIndex].getAttribute("item-pair").split(",");
        if (itemPairValue.indexOf(items[0]) != -1 && itemPairValue.indexOf(items[1]) != -1)
        {
            return true;
        }
    }
    
    return false;
}

function setCursorResize(evt)
{
    var target = evt.target;
    var matrix = target.parentNode.getAttribute("transform").slice(7, -1).split(' ');
    var relX = evt.clientX + window.pageXOffset - matrix[4] - svgPositionX;
    var relY = evt.clientY + window.pageYOffset - matrix[5] - svgPositionY;
    //alert("relX = " + relX + "\nrelY = " + relY);
    
    percentX = relX / (target.parentNode.firstChild.getAttribute("width") * matrix[0] ) * 100;
    percentY = relY / (target.parentNode.firstChild.getAttribute("height") * matrix[3] ) * 100;
    //alert("percentX = " + percentX + "\npercentY = " + percentY);
    var hiThreshold  = 80;
    if (percentX > hiThreshold && percentY > hiThreshold)
    {
        target.style.cursor = "nw-resize";
    }
    else
    {
        target.style.cursor = "";
    }
}

function toggleLinkMode()
{
    //Determine if user is disabling Link Mode
    //alert("inLinkMode = " + inLinkMode);
    setLinkMode(!inLinkMode);
    if (inLinkMode)
    {
        linkItems();
    }
    else
    {
        //Do nothing?
    }
}

function linkItems()
{
    //Determine way of linked based on the number of selectedElements
    numElements = selectedElements.length;
    if (numElements == 0)
    {
        //Have user select both endpoints
        setLinkMode(true);
    }
    else if (numElements == 1)
    {
        //Connect one end to the current element, and have other endpoint selected by user
        setLinkMode(true);
    }
    else if (numElements == 2)
    {
        //Connect the elements directly to each other
        //Check if link already exists
        var itemPairValue  = selectedElements[0].id + "," + selectedElements[1].id;
        if (doesLinkItemPairExist(itemPairValue))
        {
            alert("Error: Elements are already linked");
        }
        else
        {
            //Connect the elements
            //alert("connecting elements");
            linkTwoItems(itemPairValue)
        }
        
        //disable linking mode
        //setLinkMode(false);
    }
    else
    {
        //3 or more elements connected to a switch
        var newSwitchId = createItem("switch");
        var sumX = 0;
        var sumY = 0;
        for (var selectedIndex = 0; selectedIndex < selectedElements.length; selectedIndex++)
        {
            var selectMatrix = selectedElements[selectedIndex].getAttribute("transform").slice(7, -1).split(' ');
            sumX += parseInt(selectMatrix[4]);
            sumY += parseInt(selectMatrix[5]);
        }
        moveItem(document.getElementById(newSwitchId), Math.round(sumX/selectedElements.length), Math.round(sumY/selectedElements.length));
        for (var selectedIndex = 0; selectedIndex < selectedElements.length; selectedIndex++)
        {
            var itemPairValue  = selectedElements[selectedIndex].id + "," + newSwitchId;
            linkTwoItems(itemPairValue);
        }
        
        //disable linking mode
        //setLinkMode(false);
    }
}


function promptTextChange(evt)
{
    var textElement = evt.target.parentNode.getElementsByTagName("text")[0];
    var newText     = prompt("Edit Link Name", textElement.innerHTML );
    //alert(" evt.button = " +  evt.button);
    if (newText != null )
    {
        textElement.innerHTML = newText;
    }
}

function linkTwoItems(itemPairValue)
{
    var svg = document.getElementById("svgId");
    var newLinkGroup = document.createElementNS('http://www.w3.org/2000/svg', "g");
    var newLink = document.createElementNS('http://www.w3.org/2000/svg', "path");
    var newText = document.createElementNS('http://www.w3.org/2000/svg', "text");
    newLinkGroup.appendChild(newLink);
    newLinkGroup.appendChild(newText);
    svg.insertBefore(newLinkGroup, svg.firstChild);
    initializeSelectedElementMatrices();

    newLink.setAttribute("stroke", "black");
    newLink.setAttribute("stroke-width", "3");
    newLinkGroup.setAttribute("onclick", "promptTextChange(evt)");
    newText.setAttribute("oncontextmenu", "promptTextChange(evt)");
    //newText.setAttribute("contextmenu", "");
    newText.setAttribute("x", "0");
    newText.setAttribute("y", "0");
    newText.style.fontSize = "20pt";
    newText.setAttribute("transform", "matrix(1 0 0 1 0 0)");
    
    newLinkGroup.setAttribute("class", "linkItem");
    newLinkGroup.setAttribute("item-pair", itemPairValue);
    lastLinkId++;
    var linkId = "link" + pad(lastLinkId, MAX_LINK_ID_WIDTH);
    newLinkGroup.setAttribute("id", linkId);
    newText.innerHTML= linkId;
    
    globalLinkList.push(newLinkGroup);
    updateLinkPosition(newLinkGroup);
}

function setLinkMode(mode)
{
    inLinkMode = mode;
    if (mode)
    {
        document.getElementById("linkModeP").innerHTML = "In Link Mode: Select endpoint."
    }
    else
    {
        document.getElementById("linkModeP").innerHTML = ""
    }
}

function importFile(fileType)
{
    if (fileType == "config")
    {
         if (selectedElements.length == 1 && selectedElements[0].getAttribute("class") == "routerItem")
        {
            var evt = document.createEvent("MouseEvents");
            evt.initEvent("click", true, false);
            document.getElementsByName("importConfigFileInput")[0].dispatchEvent(evt);
        }
        else
        {
            alert("Please select only ONE router item");
        }
    }
    else if (fileType == "svg")
    {
        var evt = document.createEvent("MouseEvents");
        evt.initEvent("click", true, false);
        document.getElementsByName("importSvgFileInput")[0].dispatchEvent(evt);
    }
}

function importSvgFile(fileInput)
{
    //alert("analyze file");
    var files = fileInput.files;
    var file = files[0];           
    var reader = new FileReader();
    //This should be cleaned up to be a single function :(
    reader.onload = function() {importSvg(this.result);}
    reader.readAsText(file);
}

function importSvg(svgText)
{
    parser = new DOMParser();
    var xmlDoc = parser.parseFromString(svgText,"text/xml");
    //alert("innerSvg = " + innerSvg.innerHTML);
    var svg = document.getElementById("svgId");
    svg.innerHTML = xmlDoc.getElementsByTagName("svg")[0].innerHTML;
    svg.setAttribute("transform", xmlDoc.getElementsByTagName("svg")[0].getAttribute("transform"));
    
    //Reset Global Variables
    lastRouterId = 0;
    lastSwitchId = 0;
    lastLinkId = 0;
    globalLinkList = [];
    var svgGroups = document.getElementById("svgId").children;
    for (var groupIndex = 0; groupIndex < svgGroups.length; groupIndex++)
    {
        var svgGroup = svgGroups[groupIndex];
        if (svgGroup.getAttribute("class") == "routerItem")
        {
            lastRouterId++;
        }
        else if (svgGroup.getAttribute("class") == "switchItem")
        {
            lastSwitchId++;
        }
        else if (svgGroup.getAttribute("class") == "linkItem")
        {
            lastLinkId++;
            globalLinkList.push(svgGroup);
        }
    }

    selectAllItems();
    deselectElements();
}

function editItem()
{
    if (selectedElements.length != 1)
    {
        alert("Please select only 1 router");
        return;
    }
    
    
    displayMainDiv("editRouterDiv");
}

/*********** File I/O ********************************/
function analyzeConfigFiles(fileInput)
{
    //alert("analyze file");
    var files = fileInput.files;
    var file = files[0];           
    var reader = new FileReader();
    //This should be cleaned up to be a single function :(
    reader.onload = function() {analyzeConfig(this.result);}
    reader.readAsText(file);
}

function analyzeConfig(configText)
{
    //alert("analyzing config here");
    //alert(configText);
    //Convert config file to xml per item
    var lines = configText.split("\r\n");
    var tmp = "";
    var item = selectedElements[0];
    var configurableLine = false;
    var line = "";
    for (var lineIndex = 0; lineIndex < lines.length; lineIndex++)
    {
        line = lines[lineIndex];
        //alert("line = " + line);
        
        //Extract Software
        if (lineIndex == 0)
        {
            parseSoftwareLine(item, line);
        }
        
        //Wait until 'exit all'
        if (line == "exit all")
        {
            configurableLine = !configurableLine;
            if (configurableLine)
            {
                lastNode = item;
            }
            else
            {
                lastNode = null;
            }
            continue;
        }
        
        if (configurableLine)
        {
            parseConfigurableLine(line);
        }
    }
}

function parseSoftwareLine(item, line)
{
    //Extract Config version:
    //TiMOS-MG-C-8.0.R4 cpm/hops64 ALCATEL SR 7750-MG
    //TiMOS-C-14.0.R5 cpm/hops64 Nokia 7750 SR 
    var softwareRegEx = /TiMOS-(MG\-)?C-(\d+)\.(\d+)\.R([\w\-]+) cpm/;
    var softwareArray = softwareRegEx.exec(line);
    //alert("softwareArray = " + softwareArray);

    softwareNode = insertItemElement(item, "software", null, null);
    
    //Build Type
    if (softwareArray[1] == "MG-")
    {
        insertItemElement(softwareNode, "build-type" , null, "SR-OS-MG");
    }
    else
    {
        insertItemElement(softwareNode, "build-type" , null, "SR-OS");
    }
    
    //Versions
    insertItemElement(softwareNode, "major-version" , null, softwareArray[2]);
    insertItemElement(softwareNode, "minor-version" , null, softwareArray[3]);
    insertItemElement(softwareNode, "release-version" , null, softwareArray[4]);
}

var prevSpacing   = "";
var lastNode      = null;
function parseConfigurableLine(line)
{
    //alert("configure line = " + line);    
    
    //ignore comments
    if (line[0] == "#" || line == "")
    {
        return ;
    }
    
    var lineRegEx = /^(\s*)([\w\-]+)(.*)/;
    lineParsedResults = lineRegEx.exec(line);
    //alert("lineParsedResults = " + lineParsedResults);
    
    var currSpacing   = lineParsedResults[1];
    var newContext   = lineParsedResults[2];
    var value = null;
    
    
    //determind context-value
    if (lineParsedResults.length > 2)
    {
        value = lineParsedResults[3].slice(1);
    }
    
    //skip echo
    if (newContext == "echo")
    {
        return;
    }

    var targetNode = lastNode;
    if (targetNode.tagName == "g")
    {
        //stick to targetNode
    }
    else if (prevSpacing.length == currSpacing.length)
    {
        targetNode = lastNode.parentNode;
    }
    else if (prevSpacing.length < currSpacing.length)
    {
        //stick to targetNode = lastNode
    }
    else
    {
        targetNode = lastNode.parentNode.parentNode;
    }
    

    var tagAttributes = null;
    if (value != null && value != "")
    {
        value = value.replace("\"", "'");
        value = value.replace("\"", "'");
        tagAttributes = initializeTagAttributes(targetNode, newContext, value);
        //tagAttributes = {'unknown-values': value};
    }

    lastNode = insertItemElement(targetNode, newContext , tagAttributes, null);

    
    //update prevs
    prevSpacing   = currSpacing;
}

function getXPathToConfigure(node)
{
    var targetNode = node;
    var xpath = "";
    while (targetNode != null && targetNode.tagName != "g")
    {
        xpath = "/" + targetNode.tagName + xpath;
        targetNode = targetNode.parentNode;
    }
    
    return xpath.toLowerCase();
}

function getNodeFromXPath(xpath, startingNode)
{
    
}

function initializeTagAttributes(node, paramContext, valueText)
{
    
    var context = getXPathToConfigure(node) + "/" + paramContext;
    var values = valueText.split(" ");
    var tagAttributes = {'unknown-values': valueText};
    switch (context)
    {
        case "/configure/log/log-id":
            tagAttributes = {'log-id': values[0]};
        break;
        case "/configure/port":
            tagAttributes = {'port-id': values[0]};
        break;
    }
    
    return tagAttributes;
}


function insertItemElement(targetNode, tagName, tagAttributes, innerHTML)
{
    if (targetNode == null)
    {
        //ERROR!
        return;
    }
    
    //Create new element with new attributes and inner HTML
    var newElement = document.createElement(tagName);
    if (innerHTML != null)
        newElement.innerHTML = innerHTML;
    if (tagAttributes != null)
    {
        for (var attribute in tagAttributes)
        {
            newElement.setAttribute(attribute, tagAttributes[attribute]);
        }
    }
    targetNode.appendChild(newElement);
    
    return newElement;
}

/*********** Select & Moving & Resizing Functions ***************/
function selectElements(evt)
{
    //Check if control key is not held down.  Clear it list in this case.
    if (inLinkMode && selectedElements.length == 1)
    {
        addSelectedElement(evt.target.parentNode);
        linkItems();
    }
    
    if (!evt.ctrlKey && selectedElements.length > 0)
    {
        deselectElements();
    }
    
    addSelectedElement(evt.target.parentNode);
}

function addSelectedElement(newElementGroup)
{
    //Check if it's already in the array
    var newElement = newElementGroup.getElementsByTagName("image")[0];
    if (selectedElements.indexOf(newElement) != -1)
    {
        //already in array
        return;
    }
    
    selectedElements.push(newElementGroup);
    //Configure element to look like it's selected
    newElementGroup.children[1].style.display = "";
    
    newElement.setAttribute("onmousedown", "startDraggingElement(evt)");
    newElement.style.cursor = "move";
    //Prevent confusion of dragging as clicking
    newElement.removeAttribute("onclick");
    
    var elementText = newElementGroup.getElementsByTagName("text")[0];
    elementText.setAttribute("onmousedown", "startDraggingElement(evt)");
    elementText.style.cursor = "move"
    elementText.removeAttribute("onclick");
    
}

function startResizingElement(evt)
{
    updateElementChangeEvent(evt);
    
    //Set Mouse Events
    evt.target.setAttribute("onmousemove", "resizeElement(evt)");
    evt.target.setAttribute("onmouseout", "stopResizingElement(evt)");
    evt.target.setAttribute("onmouseup", "stopResizingElement(evt)");
}

function resizeElement(evt)
{
    var dWidth  = (evt.clientX - currentMouseX)/(evt.target.parentNode.firstChild.getAttribute("width"));
    var dHeight = (evt.clientY - currentMouseY)/(evt.target.parentNode.firstChild.getAttribute("height"));
    
    for (var selectedIndex = 0; selectedIndex < selectedElements.length; selectedIndex++)
    {
        selectedElementMatrices[selectedIndex][0] += dWidth;
        selectedElementMatrices[selectedIndex][3] += dHeight;
        selectedElements[selectedIndex].setAttribute("transform", "matrix(" + selectedElementMatrices[selectedIndex].join(' ') + ")");
        
        //Update link endpoints
        var connectedLinks = getConnectedLinks(selectedElements[selectedIndex]);
        for (var linkIndex = 0; linkIndex < connectedLinks.length; linkIndex++)
        {
            updateLinkPosition(connectedLinks[linkIndex]);
        }
    }
    
    currentMouseX = evt.clientX;
    currentMouseY = evt.clientY;
    
}

function stopResizingElement(evt)
{
    evt.target.setAttribute("onmouseover", "setCursorResize(evt)");
    evt.target.setAttribute("onmouseout", "this.style.cursor=''");
    evt.target.removeAttribute("onmouseup");
    evt.target.removeAttribute("onmousemove");
}

function updateElementChangeEvent(evt, myTarget)
{
    //Check that it's in the selectedElements array
    if (selectedElements.indexOf(myTarget.parentNode) == -1)
    {
        return;
    }
    if (evt.preventDefault) evt.preventDefault();
    
    //Bring Item to front of image by swapping to last child
    var svg = document.getElementById("svgId");
    svg.appendChild(myTarget.parentNode);
    
    //Update Current Mouse Position
    currentMouseX = evt.clientX;
    currentMouseY = evt.clientY;
    
    //Initialize element positions
    initializeSelectedElementMatrices()
}

function startDraggingElement(evt)
{
    var myTarget = evt.target;
    if (myTarget.tagName != "image")
    {
        //alert("change to image")
        var myParent = myTarget.parentNode
        myParent.insertBefore(myTarget, myParent.firstChild);
        myTarget = myTarget.parentNode.getElementsByTagName("image")[0];
    }
    updateElementChangeEvent(evt, myTarget);
    
    //update global SVG Matrix
    svgMatrix = document.getElementById("svgId").getAttribute("transform").slice(7, -1).split(' ');
    
    //Set Mouse Events
    myTarget.setAttribute("onmousemove", "moveElement(evt)");
    myTarget.setAttribute("onmouseout", "stopDraggingElement(evt)");
    myTarget.setAttribute("onmouseup", "stopDraggingElement(evt)");
}

function stopDraggingElement(evt)
{
    //alert("evt.target.tagName = " + evt.target.tagName);
    evt.target.removeAttribute("onmousemove");
    evt.target.removeAttribute("onmouseout");
    evt.target.removeAttribute("onmouseup");
    
    var myParent = evt.target.parentNode
    var textElement = myParent.getElementsByTagName("text")[0];
    myParent.appendChild(textElement);
}

function updateSelectedElementLinks()
{
    for (var selectedIndex = 0; selectedIndex < selectedElements.length; selectedIndex++)
    {
        var connectedLinks = getConnectedLinks(selectedElements[selectedIndex]);
        for (var linkIndex = 0; linkIndex < connectedLinks.length; linkIndex++)
        {
            updateLinkPosition(connectedLinks[linkIndex]);
        }
    }
}

function initializeSelectedElementMatrices()
{
    for (var selectedIndex = 0; selectedIndex < selectedElements.length; selectedIndex++)
    {
        selectedElementMatrices[selectedIndex] = selectedElements[selectedIndex].getAttribute("transform").slice(7, -1).split(' ');
        for (var i = 0; i < selectedElementMatrices[selectedIndex].length; i++)
        {
            selectedElementMatrices[selectedIndex][i] = parseFloat(selectedElementMatrices[selectedIndex][i]);
        }
    }
}

function getConnectedLinks(selectedElement)
{
    var connectedLinks = [];
    //alert("globalLinkList.length = " + globalLinkList.length);
    for (var linkIndex = 0; linkIndex < globalLinkList.length; linkIndex++)
    {
        var linkElement = globalLinkList[linkIndex];
        if (linkElement.getAttribute("item-pair").indexOf(selectedElement.id) != -1)
        {
            connectedLinks.push(linkElement);
        }
    }
    
    return connectedLinks;
}

function updateLinkPosition(linkElementGroup)
{
    var linkElement = linkElementGroup.getElementsByTagName("path")[0];
    var itemIds = linkElementGroup.getAttribute("item-pair").split(",");
    var firstItem  = document.getElementById(itemIds[0]);
    var secondItem = document.getElementById(itemIds[1]);
    var linkText = linkElementGroup.children[1];
    var firstItemMatrix  = firstItem.getAttribute("transform").slice(7, -1).split(' ');
    var secondItemMatrix = secondItem.getAttribute("transform").slice(7, -1).split(' ');
    var x1 = (parseFloat(firstItemMatrix[4])  + parseFloat(firstItem.getElementsByTagName("image")[0].getAttribute("width") /2));
    var y1 = (parseFloat(firstItemMatrix[5])  + parseFloat(firstItem.getElementsByTagName("image")[0].getAttribute("height") /2));
    var x2 = (parseFloat(secondItemMatrix[4]) + parseFloat(secondItem.getElementsByTagName("image")[0].getAttribute("width")/2));
    var y2 = (parseFloat(secondItemMatrix[5]) + parseFloat(secondItem.getElementsByTagName("image")[0].getAttribute("height")/2));
    //move to first (x,y) //line to second (x,y)sa
    var dValue = "M " + x1 + " " + y1 + " L " + x2 + " " + y2;
    linkElement.setAttribute("d", dValue);
    linkText.setAttribute("transform", "matrix(1 0 0 1 " + (x1+x2)/2 + " " + (y1+y2)/2 + ")");
}

function moveElement(evt) {
    var dx = evt.clientX - currentMouseX;
    var dy = evt.clientY - currentMouseY;
    var xscale = parseFloat(svgMatrix[0]);
    var yscale = parseFloat(svgMatrix[3]);

    for (var selectedIndex = 0; selectedIndex < selectedElements.length; selectedIndex++)
    {
        selectedElementMatrices[selectedIndex][4] += dx/xscale;
        selectedElementMatrices[selectedIndex][5] += dy/yscale;
        selectedElements[selectedIndex].setAttribute("transform", "matrix(" + selectedElementMatrices[selectedIndex].join(' ') + ")");
        
        //Update link endpoints
        var connectedLinks = getConnectedLinks(selectedElements[selectedIndex]);
        for (var linkIndex = 0; linkIndex < connectedLinks.length; linkIndex++)
        {
            updateLinkPosition(connectedLinks[linkIndex]);
        }
    }
    
    currentMouseX = evt.clientX;
    currentMouseY = evt.clientY;
}

function deselectElements() 
{
    for (var selectedIndex = selectedElements.length-1; selectedIndex >= 0; selectedIndex--)
    {
        var selectedElementImg = selectedElements[selectedIndex].getElementsByTagName("image")[0];
        var selectedElementTxt = selectedElements[selectedIndex].getElementsByTagName("text")[0];
        selectedElements[selectedIndex].getElementsByTagName("rect")[0].style.display = "none";
        
        selectedElementImg.removeAttribute("onmousedown");
        selectedElementImg.setAttribute("onclick", "selectElements(evt)");
        selectedElementImg.style.cursor = "";
        
        selectedElementTxt.removeAttribute("onmousedown");
        selectedElementTxt.setAttribute("onclick", "selectElements(evt)");
        selectedElementTxt.style.cursor = "";
        
        selectedElements.pop();
    }
}


function determineDeselect(evt)
{
    if (selectedElements.length == 0)
    {
        //Nothing to do here
        
    }
    else if (evt.target.tagName == "svg" && selectedElements.length != 0)
    {
        deselectElements();
    }
    else
    {
        //Keep Selection -> Do Nothing
    }
}

function resizeMainDiv()
{
    //alert("resize svg");
    var w = window.innerWidth;
    var h = window.innerHeight;
    var buffer = 50;
    //alert("Width: " + w + "<br>Height: " + h);
    for (var divIndex=0; divIndex < MAIN_DIV_IDS.length; divIndex++)
    {
        var credentialsDiv = document.getElementById(MAIN_DIV_IDS[divIndex]);
        credentialsDiv.style.width  = (w - svgPositionX - buffer) + "px";
        credentialsDiv.style.height = (h - svgPositionY - buffer) + "px";
    }
    
    var svg = document.getElementById("svgId");
    svg.setAttribute("width",  w - svgPositionX - buffer);
    svg.setAttribute("height", h - svgPositionY - buffer);

    document.getElementById("bottomDiv").style.top = h + "px";
}

function configureCards()
{
    var table = document.getElementById("editRouterCardsTable");
    var numCards = document.getElementsByName("numCards")[0].value;
    var routerSelected = selectedElements[0];
    //insertItemElement(routerSelected, "/configure/card", null, "");
    
}

function changeNumCards(numCardsInput)
{
    var table = document.getElementById("editRouterCardsTable");
    var numCards = numCardsInput.value;
    //Always includer header row.
    for (var rowIndex = 1; rowIndex <= MAX_NUM_CARDS; rowIndex++)
    {
        if (rowIndex <= numCards)
        {
            table.rows[rowIndex].style.display = "";
        }
        else
        {
            table.rows[rowIndex].style.display = "none";
        }
    }
    
    configureCards();
}

function changeCardB(cardBCheckBox)
{
    var table = document.getElementById("editRouterCardsTable");
    var rowB =  table.rows[table.rows.length-1];
    if (cardBCheckBox.checked)
    {
        rowB.style.display = "";
    }
    else
    {
        rowB.style.display = "none";
    }
}

function changeCardType(cardSelect)
{

}

function changeMdaType(mdaSelect)
{

}

function submitForm(submissionType)
{
    document.getElementsByName("submissionType")[0].value = submissionType;
    var svg = document.getElementById("svgId");
    var svgValue = svg.innerHTML;
    svgValue = "<svg"+ " width=\"" + svg.getAttribute("width") + "\" height=\"" + svg.getAttribute("height") + "\" xmlns=\"" + svg.getAttribute("xmlns") + "\" transform=\"" + svg.getAttribute("transform") + "\">" + svgValue + "</svg>";
    document.getElementsByName("svgInput")[0].value = svgValue; ;
    
    //Check password
    if (document.getElementsByName("esxiPass")[0].value == "" && submissionType == 'deploy')
    {
        displayMainDiv("credentialsDiv");
        alert("Error: password has not been fill in");
        return;
    }
    
    //alert("deploy!")
    //alert("document.getElementsByName(submissionType)[0].value = " + document.getElementsByName("submissionType")[0].value);
    //alert("document.getElementsByName(svgInput)[0].value = " + document.getElementsByName("svgInput")[0].value);
    document.getElementById("svgForm").submit();
}

