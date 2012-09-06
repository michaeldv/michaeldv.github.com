// Dumper.js -- Copyright 2009,2012 by Michael Dvorkin. All Rights Reserved.
//
// Inspired by JWZ (http://www.jwz.org). Modeled after VAX/VMS dump utility.
// Dumper.js uses Vanilla.js framework that comes bundled with any modern browser.
//--------------------------------------------------------------------------------

// Math.rand(256) returns random integer in 0..255 range.
Math.rand = function(limit) {
  return Math.floor(Math.random() * limit);
}

var Dump = function() {

  this.initialize = function() {
    this.offset = -0x0F;
    this.reset();
  }

  this.reset = function() {
    this.hex = this.ascii = "";
    this.uri = null;
  }

  this.store = function(next) {
    this.ascii += this.toChar(next);
    this.hex = this.toHex(next, 2) + " " + this.hex;
  }

  // Returns true for printable ASCII character codes.
  this.printable = function(code) {
    return code > 31 && code < 127;
  }

  // Returns ASCII representation of character code.
  this.toChar = function(code) {
    return this.printable(code) ? String.fromCharCode(code) : ".";
  }

  // toHex(15) returns "0F" (zero padded).
  this.toHex = function(code, padding) {
    hex = code.toString(16).toUpperCase();
    if (hex.length < padding) {
      hex = this.pad(hex, "0", padding);
    }
    return hex;
  }

  this.pad = function(string, filler, size) {
    var limit = size - string.length;
    if (limit == 1) {
      return filler + string;
    } else {
      return "" + new Array(limit).join(filler) + string;
    }
  }

  this.escape = function(str) {
    return str.replace(/&/g,  '&amp;')
              .replace(/</g,  '&lt;')
              .replace(/>/g,  '&gt;')
              .replace(/"/g,  '&quot;')
              .replace(/'/g,  '&#x27;')
              .replace(/\//g, '&#x2F;');
  }

  this.formatAscii = function(next, position, flags) {
    var html;

    if (flags.plain || flags.before) {
      html = this.escape(this.ascii);
    } else {
      html = this.escape(this.ascii.substr(0, this.uri.column));
      if (flags.within && position > this.uri.column) {
        html += "<a href='" + this.uri.url + "'>" + this.uri.name.substr(0, position - this.uri.column) + "</a>";
      } else if (flags.after) {
        html += "<a href='" + this.uri.url + "'>" + this.uri.name + "</a>";
        if (position > this.uri.column + this.uri.name.length) {
          html += this.escape(this.ascii.substr(this.uri.column + this.uri.name.length));
        }
      }
    }
    html += "<span class='c'>" + this.toChar(next) + "</span>";

    return html;
  }

  this.formatHex = function(next, position, flags) {
    var html = this.toHex(next, 2) + " ";

    if (flags.plain || flags.before) {
      html += this.hex;
    } else {
      if (flags.within) {
        html = "<a href='" + this.uri.url + "'>" + html;                // Start with the first link character.
        if (position > this.uri.column) {                               // Append remaining link characters if
          html += this.hex.substr(0, (position - this.uri.column) * 3); // we are in the middle of the link.
        }
        html += "</a>";
      } else if (flags.after) {
        if (position > this.uri.column + this.uri.name.length) {        // Add preceeding non-link characters if any.
          html += this.hex.substr(0, (position - this.uri.column - this.uri.name.length) * 3);
        }
        html += "<a href='" + this.uri.url + "'>" +                     // Append the entire link.
               this.hex.substr(this.hex.length - (this.uri.column + this.uri.name.length) * 3, this.uri.name.length * 3) + 
               "</a>";
      }
      if (this.uri.column > 0) {                                        // Append remaining non-link
        html += this.hex.substr(this.hex.length - this.uri.column * 3); // characters, if any.
      }
    }

    return html;
  }

  this.punch = function(position) {
    var next;
    var flags = {
      plain  : !this.uri,
      before : this.uri && position < this.uri.column,
      after  : this.uri && position >= this.uri.column + this.uri.name.length
    }
    flags.within = (!flags.plain && !flags.before && !flags.after);

    // Generate random character or pick next one from the link name.
    if (!flags.within) {
      next = Math.rand(255);
    } else {
      next = this.uri.name.charCodeAt(position - this.uri.column);
    }

    // Format both sides of the dump.
    var ascii = this.formatAscii(next, position, flags);
    var hex = this.formatHex(next, position, flags);

    this.store(next);

    // Increment offset and create leading/trailing whitespace.
    var offset = this.toHex(this.offset++, 8);
    var leading = new Array(16 - position).join("   ");
    var trailing = new Array(16 - position).join(" ");

    return leading + hex + ascii + trailing + " " + offset;
  }
  
  this.initialize();
};


//--------------------------------------------------------------------------------
var Dumper = function(links) {

  this.initialize = function(links) {
    this.position = 0;
    this.dump = new Dump();
    this.launch(links);
  }

  this.insertAfter = function(el, tag, contents) {
    if (el.nextSibling) {
      el.parentNode.insertBefore("<" + tag + ">" + pocket + "</" + tag + ">", el.nextSibling);
    } else {
      var child = document.createElement(tag);
      child.innerHTML = contents;
      el.parentNode.appendChild(child);
    }
  }

  this.partialLine = function() {
    var line = this.dump.punch(this.position++);
    if (this.position >= 16) {
      this.position = 0;
      this.dump.reset();
    }
    return line;
  }

  this.entireLine = function(name, url) {
    var i, line;
    if (name && url) {
      this.dump.uri = { url: url, name: name }
      this.dump.uri.column = Math.rand(16 - this.dump.uri.name.length)
    }
    for (i = 0;  i < 16;  i++) {
      line = this.partialLine();
    }
    return line.replace(/<span.+?>(.+?)<\/span>/, "$1");
  }

  this.rehash = function(list) {
    var link = list[0].getElementsByTagName("a");
    if (link.length > 1) {
      this.dump.uri = { url: link[1].href, name: link[1].innerHTML }
      this.dump.uri.column = Math.rand(16 - this.dump.uri.name.length)
    }
    new Timer(15, 200, this.cursor.bind(this), { onComplete: function() { this.scroll(); }.bind(this) });

    // Remove top line.
    list[0].parentNode.removeChild(list[0]);

    // Get the bottom line, remove cursor span, and move it one line up.
    var bottom = document.getElementById("cursor").innerHTML.replace(/<span.+?>(.+?)<\/span>/, "$1");
    this.insertAfter(list[list.length-1], "li", bottom);

    // Get the bottom line ready for new contents.
    document.getElementById("cursor").innerHTML = "";
  }

  this.scroll = function() {
    var list = Array.prototype.slice.call(document.getElementsByTagName("li"));
    // TODO: SlideUp(list[0], { duration: 0.4, afterFinish = function() { this.rehash(list) }.bind(this) });
    this.rehash(list);
  }

  this.cursor = function() {
    document.getElementById("cursor").innerHTML = "<pre>" + this.partialLine() + "</pre>";
  }

  this.line = function(name, url) {
    document.getElementById("dump").innerHTML += "<li><pre>" + this.entireLine(name, url) + "</pre></li>";
  }

  this.generate = function(link) {
    if (link) {
      var split = link[0].split("\n");
      if (split.length > 1) {
        this.line(split[0], link[1]);
        link[0] = split[1]
      }
      this.line(link[0], link[1]);
    } else {
      this.line();
    }
  }

  this.launch = function(links) {
    var i, spread = Math.floor(32 / links.length) - Math.rand(3);

    for (i = 1;  i < 32;  i++) {
      if (i % spread == 0 && links.length > 0) {
        this.generate(links.shift());
      } else {
        this.generate();
      }
    }

    new Timer(15, 200, this.cursor.bind(this), { onComplete: function() { this.scroll(); }.bind(this) });
  }

  this.initialize(links);
};


//--------------------------------------------------------------------------------
var Timer = function(ticks, delay, handler, options) {
  this.initialize = function(ticks, delay, handler, options) {
    this.ticks = ticks;
    this.delay = delay;
    this.handler = handler;
    this.options = options || {};
    this.options.afterStart = this.options.afterStart || function() {};
    this.options.afterPause = this.options.afterPause || function() {};
    this.options.onComplete = this.options.onComplete || function() {};
    this.start();
  }

  this.run = function() {
    var result = this.handler(this.ticks);
    if (--this.ticks < 0) {
      this.finish();
    }
    return result;
  }

  this.start = function() {
    this._id = setInterval(this.run.bind(this), this.delay);
    this.options.afterStart(this.ticks);
  }

  this.pause = function() {
    clearInterval(this._id);
    this._id = null;
    this.options.afterPause(this.ticks);
  }

  this.finish = function() {
    clearInterval(this._id);
    this.options.onComplete();
    delete(this);
  }
  
  this.isRunning = function() {
    return this._id != null;
  }

  this.initialize(ticks, delay, handler, options);
};

