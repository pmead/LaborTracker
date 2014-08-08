(function () {
	"use strict";

  Session.set('sessionid', location.search);

  // When editing a character name, ID of the character
  Session.set('editing_charactername', null);
  
  // When editing current labor, ID of the character
  Session.set('editing_characterlabor', null);
  
  // When editing current labormax, ID of the character
  Session.set('editing_characterlabormax', null);

  Meteor.autosubscribe(function () {
      Meteor.subscribe('characters', {owner: Session.get('sessionid')});
      Meteor.subscribe('timers', {owner: Session.get('sessionid')});
  });

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
})();