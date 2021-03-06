function DropboxApi () {
  var CONST = {
    APP_KEY : "usjloqq5lagyr0v",  
    PATCH_FOLDER : "translation_patches[DO_NOT_REMOVE]",
    KEY_PATH : "dropbox_parent_folder",
    KEY_FILE : "dropbox_current_file",
  }
  
  this.openFile = function(path, callback){
    if (path == null)
      path = file;
    client.readFile(path, null, function(error, contents, fileInfo, rangeInfo){
      if (error){
        callback(error);
        return;
      }
      versionTag = fileInfo.versionTag;
      saveLastFile(path);
      callback(contents);
    });
  }

  this.openDir = function(obj, filter, callback){
    filter = filter || [];
    path = obj || "/";
    client.readdir(path, null, function(error, simpleList, folderInfo, detailedList){
      if (error){
        callback(error);
        return;
      }
      detailedList = detailedList.filter(function(v){
        return (filter.length < 1) || ($.inArray(v.mimeType, filter) != -1);
      });
      saveParentDir(path);
      callback(detailedList);
    });
  }

  this.save = function(text, callback){
    client.stat(file, null, function(serror, fstat, as){
      if(serror){
        callback(serror);
        return;
      }

      if(fstat.versionTag != versionTag){
        oldTag = versionTag;
        res = new Object();
        res['versionTag'] = fstat.versionTag;
        callback(res);
        return;
      }

      client.writeFile(file, text, null, function(ferror, fileInfo){
        if(ferror){
          callback(ferror);
        } else {
          versionTag = fileInfo.versionTag;
          callback(null);
        }
      });	
    });
  }
  
  this.swapTags = function(){
    versionTag = oldTag;
  }
  
  this.getCurrentPath = function(){
  }
  
  this.getLastFile = function(){
    return file;
  }
  
  var patchesQueue = new Set();
  this.savePatches = function(patches, callback){ 
    if (patches == null || patches.size == 0){
      callback(null);
      return;
    }
    patchdir = getPatchDir();
    for(var key in patches){
      f = patchdir + '/' + key;
      patchesQueue.add(f);
      client.writeFile(f, patches[key], null, function(ferror, fileInfo){
        if(ferror){
          patchesQueue.clear();
          callback(ferror);
        } else
          patchesQueue.delete(fileInfo.path);
          if(patchesQueue.size == 0)
            callback(null);
      });
    }
  }
  
  this.setOnAuthListener = function(callback){
    authCallback = callback;
    authCallback(client.isAuthenticated());
  }
  
  this.signIn = function(){
    if (client.isAuthenticated()) {
      authCallback(true);
      return;
    }
    result = null;
    client.authenticate(function (err) {
			result = client.isAuthenticated();
      if (err)
        result = err;
			authCallback(result);
    });
  }
  
  this.signOut = function(){
    if (!client.isAuthenticated()){
      authCallback(false);
      return;
    }
    client.signOut(function(err){
      authCallback(client.isAuthenticated());
    });
  }
  
  this.isAuthenticated = function(){
    return client.isAuthenticated();
  }
  
  var getPatchDir = function(){
    p = file.substring(0, file.lastIndexOf('/') + 1);
    p += CONST.PATCH_FOLDER;
    return p;
  }
  
  var setCookie = function(key, value) {
    var expires = new Date();
        expires.setTime(expires.getTime() + (365 * 24 * 60 * 60 * 1000));
        document.cookie = key + '=' + value + ';expires=' + expires.toUTCString();
  }
  
  var getCookie = function(key) {
    var keyValue = document.cookie.match('(^|;) ?' + key + '=([^;]*)(;|$)');
        return keyValue ? keyValue[2] : null;
  }
  
  var saveParentDir = function(path) {
    setCookie(CONST.KEY_PATH, path);
    parentDir = path;
  }
  
  var saveLastFile = function(path) {
    setCookie(CONST.KEY_FILE, path);
    file = path;
  }
  
  var parentDir = getCookie(CONST.KEY_PATH);
  if (parentDir == null)
    parentDir = '/';
    
  var file = getCookie(CONST.KEY_FILE);

  var authCallback = function(b){};
  
  var versionTag = null;
  var oldTag = null;
  
  var client = new Dropbox.Client({ key: CONST.APP_KEY });
  client.authDriver(new Dropbox.AuthDriver.Popup({ receiverUrl: window.location.href.split('#')[0] + 'dropbox-callback.html' }));
  client.authenticate({ interactive: false });
}

function CssTree(container){
	root = $("<ol>", {
		class: 'tree'
	}).appendTo("#" + container);

	var currentNode = root;
	var counter = 0;
	
	this.addFolder = function(name, path){
    counter++;
		_li = document.createElement('li');
		currentNode.append(_li);
		$("<label>", { for: counter, text: name, path: path })
    .appendTo(_li)
    .click(function(e){
      _id = $(e.target).prop('for')
      currentNode = $('#ol'+_id);
      folderCallback($(e.target).data("path"));
    }).data("path", path);
		$("<input>", { type: "checkbox", id: counter}).appendTo(_li);
		$("<ol>", {id:"ol"+counter}).appendTo(_li);
	}
  
  this.addFile = function(name, path){
    _li = $("<li>", { class: 'file' }).appendTo(currentNode);
    $('<a>', {href: '#', text: name, path: path})
      .appendTo(_li)
      .click(function(e){
        fileCallback(currentNode, $(e.target).data("path"));
      }).data("path", path);
  }
  
  this.markEmpty = function(){
    parent = currentNode.parent();
    children = parent.children();
    children.each(function(){
      if( $(this).is("label"))
        $(this).unbind().addClass("disabled");
      else
       $(this).remove();
    });
  }
  
  this.isEmpty = function(){
    return root.children().length == 0;
  }
  
  this.removeCallback = function(){
    parent = currentNode.parent();
    parent.find("> label").unbind();
  }

  this.setOnFileClickListener = function(callback){
    fileCallback = callback;
    return this;
  }
  
  this.setOnFolderExpandingListener = function(callback){
    folderCallback = callback;
    return this;
  }
  
  var fileCallback = null;
  var folderCallback = null;
}

function Script(_editor){
  var OFFSET_REGEX = /^0x[0-9a-f]{8}$/;
  var editor = _editor;
  var currentBlock = {
    row: -1,
    offset: null,
    startRow: -1
  };
  var changedBlocks = null; 
  var initialBlocks = null;
  var lastDiff = [];
  
  var errorlog_token = null;
  $( document ).ready(function() {
    $.get( "http://inspirationdriven.com/request_token?p=popotan", function( data ) {
      auth_token = data;
    });
  });
  
  /*this.onTextChanged = function(data){
    if (currentBlock.row == data.range.start.row)
      return;
    row = currentBlock.row = data.range.start.row;
    while(!OFFSET_REGEX.test(editor.session.getLine(--row)))
      if(row < 0)
        return;
    changedBlocks[editor.session.getLine(row)] = row;
  }*/
  
  this.loadScript = function(text, line){
    editor.setValue(text, -1);
    if (line > 1)
      editor.moveCursorTo(line, 0);
      
    initialBlocks = parseScript(editor.getValue());
    lastDiff = [];
  }
  
  this.getScript = function(){
    content = editor.getValue();
    changedBlocks = parseScript(content);
    return content;
  }
  
  this.patchScript = function(newText, patches){
    newBlocks = parseScript(newText);
    newDiff = getDiff(initialBlocks, newBlocks);
    conflictIndices = [];
    for (index in newDiff)
      if ($.inArray(newDiff[index], lastDiff) != -1)
        conflictIndices.push(newDiff[index]);
    if (conflictIndices.length > 0)
      throw "Conflict blocks found. Manual patching required. Conflict indices: " + conflictIndices.join(", ");

    for (var key in patches)
      newBlocks.set(key, patches[key]);
      
    newContent = "[dialog]\r\n";
    for (var key of newBlocks.keys()){
      newContent += key;
      newContent += "\r\n";
      newContent += newBlocks.get(key);
      newContent += "\r\n";
    }
    
    return newContent.substring(0, newContent.length - 2);
  }
  
  this.getPatches = function(){
    lastDiff = getDiff(initialBlocks, changedBlocks);
    patches = {};
    for(i in lastDiff) {
      key = lastDiff[i];
      patches[key] = changedBlocks.get(key);
      //patches[key] += "\r\n";
    }
    return patches;  
  }
  
  var getDiff = function(map1, map2){
    changedIndices = [];
    for(var key of map1.keys()){
      if (map1.get(key) != map2.get(key))
        changedIndices.push(key);
    }
    return changedIndices;
  }
  
  var parseScript = function(text){
    //States
    START = /\[dialog\]/;
    TEXT = /^(?!0x[0-9a-f]{8}).+$/;
    OFFSET = OFFSET_REGEX;
    BLANK_LINE= /^$/;

    state = START;
    tokens = text.split(/\r\n/);
    start = 0;
    if (START.test(tokens[0]))
      start++;
    
    blocks = new Map();
    currentIndex = null
      
    for (line = start; line < tokens.length; line++) {
      token = tokens[line];
      
      switch(state){
        case START:
          expectation = OFFSET;
          break;
        case OFFSET:
          expectation = TEXT;
          currentIndex = tokens[line - 1];
          blocks.set(currentIndex, '');
          break;
        case BLANK_LINE:
          expectation = OFFSET;
          break;
        case TEXT:
          expectation = TEXT;
          str = blocks.get(currentIndex);
          str += tokens[line - 1];
          str += '\r\n';
          blocks.set(currentIndex, str);
          break;
      }

      result = expectation.test(token);
      if (!result && expectation == TEXT && state == TEXT){
        expectation = BLANK_LINE;
        result = expectation.test(token);
      }

      if (!result) {
        if (expectation == OFFSET)
          expected = "offset";
        else if (expectation == TEXT)
          expected = "text";
        else if (expectation == BLANK_LINE)
          expected = ["text", "newline"];
              
        throw {"line": line, "expected": expected, "got": token};
      }
            
      state = expectation;
    }

    return blocks;
  }
}
