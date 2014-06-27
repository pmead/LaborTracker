var READONLY = false

// How much labor you generate per minute
var LABORGENRATE = 2;

if (READONLY){
  // This is just for setting up a display-only example of this app
  Characters = new Meteor.Collection(null)
  Timers = new Meteor.Collection(null)
} else {
  Characters = new Meteor.Collection("characters");
  Timers = new Meteor.Collection("timers");
}

DayStrings = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function pad(number, length) {
    var str = '' + number;
    while (str.length < length) {
        str = '0' + str;1
    }
    return str;
}

function formattime(hour, minutes) {
  if (hour >= 12) {
    ampm = 'pm'
  } else {
    ampm = 'am'
  }
  
  hour = hour % 12;
  if (hour == 0) {
    hour = 12;
  }
  
  return hour+":"+pad(minutes,2)+ampm;
}

function parsetimerlength(timerstring) {
  var totaltime = 0;
  
  // Find days
  var re = /(\d+) ?(?:days|day|d)/g;
  var matches = re.exec(timerstring);
  if(matches) {
    totaltime += (Number(matches[1]) * 86400);
  }
  
  // Find hours
  var re = /(\d+) ?(?:hours|hour|h|hr|hrs)/g;
  var matches = re.exec(timerstring);
  if(matches) {
    totaltime += (Number(matches[1]) * 3600);
  }
  
  // Find minutes
  var re = /(\d+) ?(?:minutes|minute|min|m)/g;
  var matches = re.exec(timerstring);
  if(matches) {
    totaltime += (Number(matches[1]) * 60);
  }
  
  // Find seconds
  var re = /(\d+) ?(?:seconds|second|secs|sec|s)/g;
  var matches = re.exec(timerstring);
  if(matches) {
    totaltime += Number(matches[1]);
  }
  
  return totaltime;
}

function maxtime(now, max) {
  return Date.now() + (max - now) * 1000 * 60 / LABORGENRATE;
}

if (Meteor.isClient) {

  var highestMaxLabor = function () {
    var highestchar = Characters.findOne({owner: Session.get('sessionid')}, {sort: {labormax: -1}})
    if (highestchar)
      return highestchar.labormax;
    else
      return 1000;
  };
  
  Session.set('sessionid', location.search);

  // When editing a character name, ID of the character
  Session.set('editing_charactername', null);
  
  // When editing current labor, ID of the character
  Session.set('editing_characterlabor', null);
  
  // When editing current labormax, ID of the character
  Session.set('editing_characterlabormax', null);

/* New version
  Deps.autorun(function () {
    Meteor.subscribe("characters");
  });
*/

  Meteor.autosubscribe(function () {
      Meteor.subscribe('characters', {owner: Session.get('sessionid')});
      Meteor.subscribe('timers', {owner: Session.get('sessionid')});
  });

  if (READONLY) {
    // Super duper quickl and dirty hack for creating a read-only version of the app to show as an example from GitHub
    newchar = Characters.insert({name: 'OverloadUT', labor: 4000, labormax: 4320, labortimestamp: Date.now(), maxtime: maxtime(4320, 4000), owner: Session.get('sessionid')});
    newchar = Characters.insert({name: 'DiscoC', labor: 2400, labormax: 1650, labortimestamp: Date.now(), maxtime: maxtime(1650, 2400), owner: Session.get('sessionid')});
    newchar = Characters.insert({name: 'RoughRaptors', labor: 1250, labormax: 5000, labortimestamp: Date.now(), maxtime: maxtime(5000, 1250), owner: Session.get('sessionid')});

    var length = 3600
    var percent = 0.75
    Timers.insert({name: 'Strawberries', starttime: Date.now() - percent * length * 1000, timerlength: length, owner: Session.get('sessionid'), endtime: Date.now() + (1-percent) * length * 1000});
    var length = 3600 * 72
    var percent = 0.10
    Timers.insert({name: 'Pine trees', starttime: Date.now() - percent * length * 1000, timerlength: length, owner: Session.get('sessionid'), endtime: Date.now() + (1-percent) * length * 1000});
    var length = 3600 * 18
    var percent = 0.90
    Timers.insert({name: 'Cows', starttime: Date.now() - percent * length * 1000, timerlength: length, owner: Session.get('sessionid'), endtime: Date.now() + (1-percent) * length * 1000});
    var length = 3600 * 24 * 7
    var percent = 0.5
    Timers.insert({name: 'Pay Taxes', starttime: Date.now() - percent * length * 1000, timerlength: length, owner: Session.get('sessionid'), endtime: Date.now() + (1-percent) * length * 1000});
    var length = 3600 * 7
    var percent = 1.5
    Timers.insert({name: 'Goats', starttime: Date.now() - percent * length * 1000, timerlength: length, owner: Session.get('sessionid'), endtime: Date.now() + (1-percent) * length * 1000});
  }
  
  //{//////// Helpers for in-place editing //////////

  // Returns an event map that handles the "escape" and "return" keys and
  // "blur" events on a text input (given by selector) and interprets them
  // as "ok" or "cancel".
  var okCancelEvents = function (selector, callbacks) {
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

  var activateInput = function (input) {
    input.focus();
    input.select();
  };
  
  //} END IN-PLACE EDITING HELPERS
  
  //{///////// NEED SESSION PAGE ///////////
  Template.needsession.events({
    'click input.sessionnamesubmit' : function () {
      window.location = Meteor.absoluteUrl('?' + $("#sessionname").val())
    }
  });
  
  //} END NEED SESSION PAGE
  
  //{//////////// MAIN TEMPLATE //////////////
  
  Template.main.need_session = function () {
    return Session.get('sessionid') == "" || Session.get('sessionid') == "?undefined" || Session.get('sessionid') == "?";
  };
  
  Template.main.is_readonly = function () {
    return READONLY;
  };
  
  Template.main.show_timers = function() {
    //TODO: Make a way for the user to pick which modules are visible
    
    return true;
  }
  
  //} END MAIN TEMPLATE
  
  //{//////////// TIMERS LIST ///////////////////
  // When editing timer name, ID of the timer
  Session.set('editing_timername', null);
  
  // When editing timer length, ID of the timer
  Session.set('editing_timertimeleft', null);
  
  // Preference to hide seconds from timers
  Session.setDefault('pref_show_seconds', false);
  
  var timersTimerDep = new Deps.Dependency;
  var timersTimerUpdate = function () {
    timersTimerDep.changed();
  };
  Meteor.setInterval(timersTimerUpdate, 1000);
  
  Template.timers.timers = function () {
    return Timers.find({owner: Session.get('sessionid')}, {sort: {endtime: 1}});
  };

  Template.timers.events({
    'click a.add' : function () {
      
      var newtimer = Timers.insert({name: 'Timer', starttime: Date.now(), timerlength: 3600, owner: Session.get('sessionid'), endtime: Date.now() + 3600 * 1000});
      Session.set('editing_timername', newtimer);
      Meteor.flush(); // force DOM redraw, so we can focus the edit field
      activateInput($("#timer-name-input"));
    },
    'click th.timeleft' : function () {
      Session.set('pref_show_seconds', !Session.get('pref_show_seconds'));
    }
  });
  
  //} END TIMERS LIST
  
  //{////////// EACH TIMER //////////////
  Template.timer.displaytimeleft = function() {
    return this.timerlength;
  };
  
  Template.timer.timerdone = function() {
    return (this.endtime <= Date.now())
  };
  
  var format_time_left = function(totalsecondsleft) {
    var daysleft = Math.floor(totalsecondsleft / 60 / 60 / 24);
    var hoursleft = Math.floor(totalsecondsleft / 60 / 60 % 24);
    var minutesleft = Math.floor(totalsecondsleft / 60 % 60);
    var secondsleft = Math.floor(totalsecondsleft % 60);
    
    var timestring = '';
    if(totalsecondsleft > 86400) {
      timestring += daysleft + 'd ';
    }
    if(totalsecondsleft > 3600) {
      timestring += hoursleft + 'h ';
    }
    if(totalsecondsleft > 60) {
      timestring += minutesleft + 'm ';
    }
    if (Session.get('pref_show_seconds')) {
      timestring += secondsleft + 's';
    }
    
    return timestring;
  }
  
  Template.timer.timeleft = function() {
    timersTimerDep.depend();
    
    var totalsecondsleft = Math.abs((this.timerlength*1000 - (Date.now() - this.starttime)) / 1000);
    return format_time_left(totalsecondsleft);
  }
  
  Template.timer.timeleftinput = function() {
    if(this.endtime <= Date.now()) {
      // Timer finished, so show the original timer length
      return format_time_left(this.timerlength);
    } else {
      // Timer not finished, so show the current time left
      var totalsecondsleft = Math.abs((this.timerlength*1000 - (Date.now() - this.starttime)) / 1000);
      return format_time_left(totalsecondsleft);
    }
  }
  
  Template.timer.endtimestring = function() {
    timersTimerDep.depend();
    var date = new Date(this.endtime);
    var hour = date.getHours();
    var minutes = date.getMinutes();
    
    var day = date.getDay();
    
    var hoursleft = Math.floor(Math.abs((this.endtime - Date.now()) / 1000 / 60 / 60))
    var minutesleft = Math.floor(Math.abs((this.endtime - Date.now()) / 1000 / 60 % 60))
    
    return DayStrings[day] + ' ' + formattime(hour,minutes);
  }
  
  Template.timer.percentage = function() {
    timersTimerDep.depend();
    var end = this.starttime + this.timerlength * 1000;
    var now = Date.now();
    
    return Math.min(100,Math.floor((now - this.starttime) / (end - this.starttime) * 100));
  }
  
  Template.timer.events({
    'click a.remove' : function () {
      Timers.remove({_id: this._id});
    },
    'click div.name': function (evt, tmpl) { // start editing list name
      Session.set('editing_timername', this._id);
      Meteor.flush(); // force DOM redraw, so we can focus the edit field
      activateInput(tmpl.find("#timer-name-input"));
    },
    'click div.timeleft': function (evt, tmpl) { // start editing list name
      Session.set('editing_timertimeleft', this._id);
      Meteor.flush(); // force DOM redraw, so we can focus the edit field
      activateInput(tmpl.find("#timer-timeleft-input"));
    }
  });
  
  Template.timer.events(okCancelEvents(
    '#timer-name-input', {
      ok: function (value) {
        Timers.update(this._id, {$set: {name: value}});
        Session.set('editing_timername', null);
      },
      cancel: function () {
        Session.set('editing_timername', null);
      }
    }
  ));
  
  Template.timer.events(okCancelEvents(
    '#timer-timeleft-input', {
      ok: function (value) {
        var timerlength = parsetimerlength(value);
        Timers.update(this._id, {$set: {timerlength: timerlength, starttime: Date.now(), endtime: Date.now() + timerlength * 1000}});
        Session.set('editing_timertimeleft', null);
      },
      cancel: function () {
        Session.set('editing_timertimeleft', null);
      }
    }
  ));

  Template.timer.editingname = function () {
    return Session.equals('editing_timername', this._id);
  };

  Template.timer.editingtimeleft = function () {
    return Session.equals('editing_timertimeleft', this._id);
  };
  
  //} END EACH TIMER

  //{///////// CHARACTERS LIST //////////
  
  // Preference to hide seconds from timers
  Session.setDefault('pref_scale_maxlabor', true);
  Session.setDefault('pref_sort_maxtime', false);

  Template.characters.characters = function () {
    if(Session.get('pref_sort_maxtime')) {
      return Characters.find({owner: Session.get('sessionid')}, {sort: {maxtime: 1}});
    } else {
      return Characters.find({owner: Session.get('sessionid')}, {});
    }
  };

  Template.characters.events({
    'click a.add' : function () {
      var newmaxtime = Date.now() + (this.labormax - this.labor) * 1000 * 60 / LABORGENRATE;
      var newchar = Characters.insert({name: 'NewCharacter', labor: 50, labormax: 1000, labortimestamp: Date.now(), maxtime: newmaxtime, owner: Session.get('sessionid')});
      Session.set('editing_charactername', newchar);
      Meteor.flush(); // force DOM redraw, so we can focus the edit field
      activateInput($("#character-name-input"));
    },
    'click th.labor' : function () {
      Session.set('pref_scale_maxlabor', !Session.get('pref_scale_maxlabor'))
    },
    'click th.maxtime' : function () {
      Session.set('pref_sort_maxtime', !Session.get('pref_sort_maxtime'))
    }
  });
  
  //}
  
  //{///////// EACH CHARACTER ///////////
  var timerDep = new Deps.Dependency;
  var timerUpdate = function () {
    timerDep.changed();
  };
  Meteor.setInterval(timerUpdate, 60000 / LABORGENRATE);
  
  Template.character.currentlabor = function() {
    timerDep.depend();
    var currentlabor = Math.floor((Date.now() - this.labortimestamp) / 1000 / 60 * LABORGENRATE) + this.labor;
    return currentlabor;
  };
  
  Template.character.currentlaborcapped = function() {
    timerDep.depend();
    return Math.min(this.labormax,Math.floor((Date.now() - this.labortimestamp) / 1000 / 60 * LABORGENRATE) + this.labor);
  };
  
  // Returns the percentage of max labor, in integer format (50 for 50%)
  Template.character.percentage = function() {
    timerDep.depend();
    var currentlabor = Math.floor((Date.now() - this.labortimestamp) / 1000 / 60 * LABORGENRATE) + this.labor;
    return Math.min(100,Math.floor(currentlabor / this.labormax * 100))
  };
  
  // Returns the percentage of this character's max labor compared to,
  // the character with the MOST max labor. Integer format (50 for 50%)
  Template.character.percentagemax = function() {
    if(Session.get('pref_scale_maxlabor')) {
      return Math.min(100,Math.floor(this.labormax / highestMaxLabor() * 100))
    } else {
      return 100;
    }
  };
  
  Template.character.laborcapped = function() {
    timerDep.depend();
    var currentlabor = Math.floor((Date.now() - this.labortimestamp) / 1000 / 60 * LABORGENRATE) + this.labor;
 
    return (currentlabor >= this.labormax);
  }
  
  Template.character.laborwaste = function() {
    timerDep.depend();
    var currentlabor = Math.floor((Date.now() - this.labortimestamp) / 1000 / 60 * LABORGENRATE) + this.labor;

    return Math.max(0,currentlabor - this.labormax);
  }
  
  Template.character.maxtimestring = function() {
    var maxtimestamp = this.labortimestamp + (this.labormax - this.labor) * 1000 * 60 / LABORGENRATE;
    var date = new Date(maxtimestamp);
    var hour = date.getHours();
    var minutes = date.getMinutes();
    var day = date.getDay();
    
    var hoursleft = Math.floor(Math.abs((maxtimestamp - Date.now()) / 1000 / 60 / 60))
    var minutesleft = Math.floor(Math.abs((maxtimestamp - Date.now()) / 1000 / 60 % 60))
    
    return DayStrings[day] + " " + formattime(hour,minutes)+" ("+hoursleft+"h "+minutesleft+"m)";
  };
  
  Template.character.events({
    'click a.remove' : function () {
      Characters.remove({_id: this._id});
    },
    'click div.name': function (evt, tmpl) { // start editing list name
      Session.set('editing_charactername', this._id);
      Meteor.flush(); // force DOM redraw, so we can focus the edit field
      activateInput(tmpl.find("#character-name-input"));
    },
    'click div.labor': function (evt, tmpl) { // start editing list name 
      Session.set('editing_characterlabor', this._id);
      Meteor.flush(); // force DOM redraw, so we can focus the edit field
      activateInput(tmpl.find("#character-labor-input"));
    },
    'click div.labormax': function (evt, tmpl) { // start editing list name
      Session.set('editing_characterlabormax', this._id);
      Meteor.flush(); // force DOM redraw, so we can focus the edit field
      activateInput(tmpl.find("#character-labormax-input"));
    }
  });
  
  Template.character.events(okCancelEvents(
    '#character-name-input', {
      ok: function (value) {
        Characters.update(this._id, {$set: {name: value}});
        Session.set('editing_charactername', null);
      },
      cancel: function () {
        Session.set('editing_charactername', null);
      }
    }
  ));
  
  Template.character.events(okCancelEvents(
    '#character-labor-input', {
      ok: function (value) {
        var newmaxtime = Date.now() + (this.labormax - Number(value)) * 1000 * 60 / LABORGENRATE;
        Characters.update(this._id, {$set: {labor: Number(value), labortimestamp: Date.now(), maxtime: newmaxtime}});
        Session.set('editing_characterlabor', null);
      },
      cancel: function () {
        Session.set('editing_characterlabor', null);
      }
    }
  ));
  
  Template.character.events(okCancelEvents(
    '#character-labormax-input', {
      ok: function (value) {
        var newmaxtime = Date.now() + (Number(value) - this.labor) * 1000 * 60 / LABORGENRATE;
        Characters.update(this._id, {$set: {labormax: Number(value), maxtime: newmaxtime}});
        Session.set('editing_characterlabormax', null);
      },
      cancel: function () {
        Session.set('editing_characterlabormax', null);
      }
    }
  ));

  Template.character.editingname = function () {
    return Session.equals('editing_charactername', this._id);
  };

  Template.character.editinglabor = function () {
    return Session.equals('editing_characterlabor', this._id);
  };

  Template.character.editinglabormax = function () {
    return Session.equals('editing_characterlabormax', this._id);
  };
  
  //} END EACH CHARACTER

}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
    
    // Upgrade database from earlier version
    Timers.find({}, {}).fetch().forEach(function(timer) {
      if (timer.endtime == null) {
        console.log('Updating timer ' + timer._id);
        Timers.update(timer._id, {$set: {endtime: timer.starttime + timer.timerlength * 1000}});
      }
    });
    
    // Upgrade database from earlier version
    Characters.find({}, {}).fetch().forEach(function(character) {
      if (character.maxtime == null) {
        console.log('Updating character ' + character._id);
        var newmaxtime = character.labortimestamp + (character.labormax - character.labor) * 1000 * 60 / LABORGENRATE;
        Characters.update(character._id, {$set: {maxtime: newmaxtime}});
      }
    });
  });
}