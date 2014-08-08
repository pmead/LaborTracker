(function() {
  "use strict";

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
})();