ctrl (short for control)

any controller function to do specific tasks like...


###schedule-update-all.js###
schedule updating of all venues , events , (and referenced artists)...

###schedule-update-active.js###
schedule updating of active venues , events , (and referenced artists)...

###update-active.js###
update active venues events artists


###update-all.js###
update all venues events artists. this config function will go through a specified radius and download all data from specified apis to the database. those documents will be labeled as inactive by default, so to update them again later via update-active, will need to set the document 'active' field to true.
