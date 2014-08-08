//Global/Shared (Client only) helper functions
(function(window) {
  "using strict";

	function pad(number, length) {
    	var str = '' + number;
    	while (str.length < length) {
        	str = '0' + str;
    	}
    	return str;
	}

  /*
  * Appends specified hours and minutes with a unit label e.g. hours, minutes, h, m
  * param short (boolean) - whether or not to use a shortened unit label (e.g. h instead of hour)
  */
	window.formattimer = function (hours, minutes, short) {
    //set default short value
    if(typeof short === "undefined") short = true;

    var hoursLabel = short ? "h" : "hours";
    var minutesLabel = short ? "m" : "minutes";
	  return hours + hoursLabel + " " + minutes + minutesLabel;
	};

  window.formatDateTime = function (day,hour,minutes) {
    var ampm = (hour >= 12) ? 'pm' : "am";
    
    hour = hour % 12;
    if (hour == 0) {
      hour = 12;
    }
    
    return  DayStrings[day] + " " + hour+":"+pad(minutes,2)+ampm;
  };

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