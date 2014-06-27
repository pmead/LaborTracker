LaborTracker
============
A tool for the MMORPG video game [ArcheAge](http://archeagegame.com) to keep track of your character(s)' labor, as well as provide convenient timers for various tasks you want to keep track of.

Demo Version
==========
There is a read-only demo version running at [http://labor.greglaabs.com](http://labor.greglaabs.com). You can fully interact with it, but nothing will be saved between browser refreshes.

Screenshot
========
![Screenshot](//dl.dropboxusercontent.com/u/26620/AA/labortracker.png "test")

Installing/Developing
===============
LaborTracker runs in the [Meteor framework](https://www.meteor.com/). Getting your own version up and running should be as simple as:

    curl https://install.meteor.com/ | sh
    git clone https://github.com/OverloadUT/LaborTracker.git
    cd LaborTracker
    meteor

And then you should be able to see it running at http://localhost:3000

Limitations
========
The current version of LaborTracker runs 100% **insecure**. This means that anybody can read or delete all of the Characters, Timers, etc. at any time. This is the reason that I am only running a read-only version as a demonstration. This was originally developed for just a couple friends and I to use and so I never added any sort of authentication.
