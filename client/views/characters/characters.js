(function() {
  "use strict";

  //Character helper functions
  var highestMaxLabor = function () {
    var highestchar = Characters.findOne({owner: Session.get('sessionid')}, {sort: {labormax: -1}})
    if (highestchar)
      return highestchar.labormax;
    else
      return 1000;
  };


  function maxtime(now, max) {
    return Date.now() + (max - now) * 1000 * 60 / LABORGENRATE;
  }

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

  //{///////// EACH CHARACTER ///////////
  var timerDep = new Deps.Dependency;
  var timerUpdate = function () {
    timerDep.changed();
  };
  Meteor.setInterval(timerUpdate, 60000 / LABORGENRATE);
  
  //} END EACH CHARACTER

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

})();