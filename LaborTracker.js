

// A history of rolls sent to the Table
Characters = new Meteor.Collection("characters");

// How much labor you generate per minute
var LABORGENRATE = 2

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

if (Meteor.isClient) {

  var highestMaxLabor = function () {
    return Characters.findOne({owner: Session.get('sessionid')}, {sort: {labormax: -1}}).labormax;
  };
  
  Session.set('sessionid', location.search);
  
  // if (!Session.get('sessionid')) {
    // sessionid = Math.floor(Math.random() * 100000000000000)
  // }

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
  });
  
  ////////// Helpers for in-place editing //////////

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
  
  /////////// NEED SESSION PAGE ///////////
  Template.needsession.events({
    'click input.sessionnamesubmit' : function () {
      window.location = Meteor.absoluteUrl('?' + $("#sessionname").val())
    }
  });
  
  ////////////// MAIN TEMPLATE //////////////
  Template.main.characters = function () {
    return Characters.find({owner: Session.get('sessionid')}, {});
  };

  Template.main.events({
    'click input.addcharacter' : function () {
      var newchar = Characters.insert({name: 'NewCharacter', labor: 50, labormax: 1000, labortimestamp: Date.now(), owner: Session.get('sessionid')});
      Session.set('editing_charactername', newchar);
      Meteor.flush(); // force DOM redraw, so we can focus the edit field
      activateInput($("#character-name-input"));
    }
  });
  
  Template.main.need_session = function () {
    return Session.get('sessionid') == "" || Session.get('sessionid') == "?undefined" || Session.get('sessionid') == "?";
  };
  
  ////////////// CHARACTERS ///////////////
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
    timerDep.depend();
    return Math.min(100,Math.floor(this.labormax / highestMaxLabor() * 100))
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
  
  Template.character.maxtime = function() {
    var maxtimestamp = this.labortimestamp + (this.labormax - this.labor) * 1000 * 60 / LABORGENRATE;
    var date = new Date(maxtimestamp);
    var hour = date.getHours();
    var minutes = date.getMinutes();
    
    var hoursleft = Math.floor(Math.abs((maxtimestamp - Date.now()) / 1000 / 60 / 60))
    var minutesleft = Math.floor(Math.abs((maxtimestamp - Date.now()) / 1000 / 60 % 60))
    
    return formattime(hour,minutes)+" ("+hoursleft+"h "+minutesleft+"m)";
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
        Characters.update(this._id, {$set: {labor: Number(value), labortimestamp: Date.now()}});
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
        Characters.update(this._id, {$set: {labormax: Number(value)}});
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

}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}