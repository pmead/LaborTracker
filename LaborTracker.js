// All characters for labor tracking
Characters = new Meteor.Collection("characters");

// All timers
Timers = new Meteor.Collection("timers");

// All recipes
Recipes = new Meteor.Collection("recipes");

// How much labor you generate per minute
var LABORGENRATE = 2;

DayStrings = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

//{////////// HELPER FUNCTIONS ////////////////
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
//} END HELPER FUNCTIONS

if (Meteor.isClient) {

  var highestMaxLabor = function () {
    return Characters.findOne({owner: Session.get('sessionid')}, {sort: {labormax: -1}}).labormax;
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
      Meteor.subscribe('recipes');
  });
  
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
  
  Template.main.show_timers = function() {
    //TODO: Make a way for the user to pick which modules are visible
    return true;
  }
  
  Template.main.show_calculator = function() {
    //TODO: Make a way for the user to pick which modules are visible
    return true;
  }
  
  //} END MAIN TEMPLATE
  
  //{//////////// CALCULATOR ///////////////////
  
  Session.setDefault('recipe_selected', null);
  
  var recipeDep = new Deps.Dependency;
  
  var fullRecipe = null;
  
  Template.calculator.recipes = function () {
    return Recipes.find({}, {sort: {name: 1}});
  }
  
  Template.calculator.firstnode = function () {
    recipeDep.depend();
    return fullRecipe;
  }
  
  Template.calculator.selected = function () {
    return Session.get('recipe_selected') == this._id;
  }
  
  Template.treenode.children = function () {
    if (this.recipe) {
      return this.recipe.components;
    } else {
      return null;
    }
  }
  
  Template.treenode.nodename = function () {
    if(this.recipe) {
      return this.recipe.name
    } else {
      if (this.type == 'tree') {
        return this.name + ' (logging)';
      } else {
        return this.name + ' (unknown recipe)';
      }
    }
  }
  
  
  calcProductionTree = function(recipeid) {
    console.log('Calculating new production tree: ' + recipeid);
    var toprecipe = Recipes.findOne({_id: recipeid});
    var tree = {name: toprecipe.product, qtyneeded: 1, qtyexact: 1, recipe: calcChildren(toprecipe, 1, 1)}
    
    console.log(tree);
    return tree;
  }
  
  calcChildren = function(recipe, qtyneeded, qtyexact) {
    $.each(recipe.components, function(i, val) {
      childrecipe = Recipes.findOne({product: val.name})
      
      recipe.components[i].qtyneeded = Math.ceil(qtyneeded / recipe.quantity) * recipe.components[i].quantity;
      recipe.components[i].qtyexact = qtyexact / recipe.quantity * recipe.components[i].quantity;
      if(childrecipe) {
        recipe.components[i].recipe = calcChildren(childrecipe, recipe.components[i].qtyneeded, recipe.components[i].qtyexact);
      } else {
        recipe.components[i].recipe = null;
      }
    });
    
    return recipe;
  };
  
  Template.calculator.events({
    'change .recipeselector' : function (evt, tmpl) {
      Session.set('recipe_selected', evt.target.value);
      fullRecipe = calcProductionTree(evt.target.value);
      recipeDep.changed();
      return true;
    }
  });
  
  //} END CALCULATOR
  
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
    
    // ALL RECIPES
    Recipes.remove({});
    Recipes.insert({name: 'Wrapped Bamboo Fishing Rod', product: 'Wrapped Bamboo Fishing Rod', quantity: 1, type: 'craft', vocation: 'Handicrafts', labor: 100, components: 
      [{name: 'Bamboo Fishing Pole Frame', quantity: 1}, {name: 'Sharp Fishing Hook', quantity: 1}, {name: 'Synthetic Fishing Line 1', quantity: 1}, {name: 'Wooden Reel', quantity: 1}]
    });
    Recipes.insert({name: 'Bamboo Fishing Pole Frame', product: 'Bamboo Fishing Pole Frame', quantity: 1, type: 'craft', vocation: 'Carpentry', labor: 10, components: 
      [{name: 'Bamboo Stalk', quantity: 10}, {name: 'Fabric', quantity: 2}]
    });
    Recipes.insert({name: 'Fabric from Wool', product: 'Fabric', quantity: 1, type: 'craft', vocation: 'Tailoring', labor: 3, components: 
      [{name: 'Wool', quantity: 3}]
    });
    Recipes.insert({name: 'Sharp Fishing Hook', product: 'Sharp Fishing Hook', quantity: 1, type: 'craft', vocation: 'Handicrafts', labor: 5, components: 
      [{name: 'Iron Ingot', quantity: 1}]
    });
    Recipes.insert({name: 'Iron Ingot', product: 'Iron Ingot', quantity: 1, type: 'craft', vocation: 'Metalwork', labor: 3, components: 
      [{name: 'Iron Ore', quantity: 3}]
    });
    Recipes.insert({name: 'Synthetic Fishing Line 1', product: 'Synthetic Fishing Line 1', quantity: 1, type: 'craft', vocation: 'Tailoring', labor: 5, components: 
      [{name: 'Cotton', quantity: 3}, {name: 'Wool', quantity: 3}]
    });
    Recipes.insert({name: 'Wooden Reel', product: 'Wooden Reel', quantity: 1, type: 'craft', vocation: 'Carpentry', labor: 5, components: 
      [{name: 'Lumber', quantity: 2}]
    });
    Recipes.insert({name: 'Lumber', product: 'Lumber', quantity: 1, type: 'craft', vocation: 'Carpentry', labor: 3, components: 
      [{name: 'Log', quantity: 3}]
    });
    Recipes.insert({name: 'Chop Juniper Tree', product: 'Log', quantity: 10, type: 'gather', vocation: 'Logging', labor: 10, components: 
      [{name: 'Juniper Tree', quantity: 1, type: 'tree'}]
    });
    
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