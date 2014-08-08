(function() {
  "use strict";

  // When editing a character name, ID of the character
  Session.set('editing_charactername', null);
  
  // When editing current labor, ID of the character
  Session.set('editing_characterlabor', null);
  
  // When editing current laborcap, ID of the character
  Session.set('editing_characterlaborcap', null);

  //Character helper functions
  var highestlaborcap = function () {
    var highestchar = Characters.findOne({owner: Session.get('sessionid')}, {sort: {laborcap: -1}})
    if (highestchar)
      return highestchar.laborcap;
    else
      return DEFAULT_LABOUR_CAP;
  };

  function captime(now, max) {
    return Date.now() + (max - now) * 1000 * 60 / LABORGENRATE;
  }

  //{///////// CHARACTERS LIST //////////
  
  // Preference to hide seconds from timers
  Session.setDefault('pref_scale_laborcap', true);
  Session.setDefault('pref_sort_captime', false);

  //Character List events
  Template.characters.events({
      //Add new character
      'click a.add' : function () {
        var newcaptime = Date.now() + (this.laborcap - this.labor) * 1000 * 60 / LABORGENRATE;
        var newchar = Characters.insert({name: 'NewCharacter', labor: 50, laborcap: 1000, labortimestamp: Date.now(), captime: newcaptime, owner: Session.get('sessionid')});
        Session.set('editing_charactername', newchar);
        Meteor.flush(); // force DOM redraw, so we can focus the edit field
        activateInput($("#character-name-input"));
      },
      //Toggle bar scale between individual scaling or using the groups largest max labour 100%
      'click th.labor' : function () {
        Session.set('pref_scale_laborcap', !Session.get('pref_scale_laborcap'))
      },
      //Sort Characters by their cap times
      'click th.captime' : function () {
        Session.set('pref_sort_captime', !Session.get('pref_sort_captime'))
      }
    });

  Template.characters.characters = function () {
    if(Session.get('pref_sort_captime')) {
      return Characters.find({owner: Session.get('sessionid')}, {sort: {captime: 1}});
    } else {
      return Characters.find({owner: Session.get('sessionid')}, {});
    }
  };

  //{///////// EACH CHARACTER ///////////
  var timerDep = new Deps.Dependency;
  var timerUpdate = function () {
    timerDep.changed();
  };
  Meteor.setInterval(timerUpdate, UPDATE_TIME);
  
  //} END EACH CHARACTER
  
  /**
  * Simple function for getting the characters current labor based on the cached value and passed time
  */
  function characterLabor(character) {
    return Math.floor((Date.now() - character.labortimestamp) / 60000 * LABORGENRATE) + character.labor;
  }

  Template.character.currentlabor = function() {
    timerDep.depend();
    return characterLabor(this);
  };
  
  Template.character.clampedLabor = function() {
    timerDep.depend();
    return Math.min(this.laborcap,characterLabor(this));
  };
  
  // Returns the percentage of max labor, in integer format (50 for 50%)
  Template.character.percentage = function() {
    timerDep.depend();
    return Math.min(100,Math.floor(characterLabor(this) / this.laborcap * 100))
  };
  
  // Returns the percentage of this character's max labor compared to,
  // the character with the MOST max labor. Integer format (50 for 50%)
  Template.character.percentagemax = function() {
    if(Session.get('pref_scale_laborcap')) {
      return Math.min(100,Math.floor(this.laborcap / highestlaborcap() * 100))
    } else {
      return 100;
    }
  };
  
  Template.character.isLaborWasted = function() {
    timerDep.depend();
 
    return (characterLabor(this) >= this.laborcap);
  }
  
  Template.character.wastedLabor = function() {
    timerDep.depend();

    return Math.max(0,characterLabor(this) - this.laborcap);
  }
  
  Template.character.captimestring = function() {
    var captimestamp = this.labortimestamp + (this.laborcap - this.labor) * 1000 * 60 / LABORGENRATE;
    var date = new Date(captimestamp);
    var hour = date.getHours();
    var minutes = date.getMinutes();
    var day = date.getDay();
    
    var hoursleft = Math.floor(Math.abs((captimestamp - Date.now()) / 1000 / 60 / 60))
    var minutesleft = Math.floor(Math.abs((captimestamp - Date.now()) / 1000 / 60 % 60))
    
    return formatDateTime(day,hour,minutes) + " " + formattimer(hoursleft,minutesleft);
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
    'click div.laborcap': function (evt, tmpl) { // start editing list name
      Session.set('editing_characterlaborcap', this._id);
      Meteor.flush(); // force DOM redraw, so we can focus the edit field
      activateInput(tmpl.find("#character-laborcap-input"));
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
        var newcaptime = Date.now() + (this.laborcap - Number(value)) * UPDATE_TIME;
        Characters.update(this._id, {$set: {labor: Number(value), labortimestamp: Date.now(), captime: newcaptime}});
        Session.set('editing_characterlabor', null);
      },
      cancel: function () {
        Session.set('editing_characterlabor', null);
      }
    }
  ));
  
  Template.character.events(okCancelEvents(
    '#character-laborcap-input', {
      ok: function (value) {
        var newcaptime = Date.now() + (Number(value) - this.labor) * UPDATE_TIME;
        Characters.update(this._id, {$set: {laborcap: Number(value), captime: newcaptime}});
        Session.set('editing_characterlaborcap', null);
      },
      cancel: function () {
        Session.set('editing_characterlaborcap', null);
      }
    }
  ));

  Template.character.editingname = function () {
    return Session.equals('editing_charactername', this._id);
  };

  Template.character.editinglabor = function () {
    return Session.equals('editing_characterlabor', this._id);
  };

  Template.character.editinglaborcap = function () {
    return Session.equals('editing_characterlaborcap', this._id);
  };

})();