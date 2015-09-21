data folder holds any algorithms and features that revolve around data gathering and fetching. 

Go into each folder to find out which types of files it contains.


there are a few files in this directory.
###gps.js###
	Venue gps validation is used to make sure all venue addresses are correct 


###pFactory.js###
	DO NOT USE THE FUNCTIONS IN THIS FILE. they are antipatterns and are part of bluebird promise methods. ( read the docs all the way next time, okay? )


###updateAll.js###
	connector function, no need to bother modifying or refactoring it right now. It essentially combines all the scrapers and uses the parameters passed into update-all controller to scrape data and pipe it to the syncData function located in sync.js


###scrapers.js###
	This file contains hooks to all scraper functions. You will need to edit this file to add new scrapers. 


###fillers.js###
	This file contains hooks to all filler functions. To add new fillers look at the bottom of the file.


###util.js###
	A large portion of this file contains the cache saver feature. The save cache feature (if you dont already know) is enabled in the update-all file and saves all data that is scraped before syncing it. This is handy if sync.js throws an error. 


	Its a good idea to just enable "delete_cache" and "save_cache" adn disable "use_cache" when running the update-all config function in a schedule.
	


	
###data.js###

	(possibly rename this something less vague)

	This file contains functions that are used by the API routes. Pretty much just basic stuff like finding/getting venues with specific query parameters, etc..

	This file also contains references to document models from models folder.


