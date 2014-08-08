//Global/Shared (Client only) helper functions
(function(window) {
  "using strict";

	function pad(number, length) {
    	var str = '' + number;
    	while (str.length < length) {
        	str = '0' + str;1
    	}
    	return str;
	}

	window.formattime = function (hour, minutes) {
	  var ampm = (hour >= 12) ? 'pm' : "am";
	  
	  hour = hour % 12;
	  if (hour == 0) {
	    hour = 12;
	  }
	  
	  return hour+":"+pad(minutes,2)+ampm;
	}

  //{//////// Helpers for in-place editing //////////

  // Returns an event map that handles the "escape" and "return" keys and
  // "blur" events on a text input (given by selector) and interprets them
  // as "ok" or "cancel".
  window.okCancelEvents = function (selector, callbacks) {
    var ok = callbacks.ok || function () {};
    var cancel = callbacks.cancel || function () {};

    var events = {};
    events['keyup '+selector+', keydown '+selector+', focusout '+selector] =
      function (evt) {
        if (evt.type === "keydown" && evt.which === 27) {
          // escape = cancel
          cancel.call(this, evt);

        } else if (evt.type === "keyup" && evt.which === 13 ||
                   evt.type === "focusout") {
          // blur/return/enter = ok/submit if non-empty
          var value = String(evt.target.value || "");
          if (value)
            ok.call(this, value, evt);
          else
            cancel.call(this, evt);
        }
      };
    return events;
  };

  window.activateInput = function (input) {
    input.focus();
    input.select();
  }

})(window);