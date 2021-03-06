(function () {
	"use strict";
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
      if (character.timetillcapped == null) {
        console.log('Updating character ' + character._id);
        var newtimetillcapped = character.labortimestamp + (character.labourcap - character.labor) * 1000 * 60 / LABOR_GEN_PATRON_ON;
        Characters.update(character._id, {$set: {timetillcapped: newtimetillcapped}});
      }
    });
  });

})();