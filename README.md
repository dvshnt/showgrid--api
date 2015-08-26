# Showgrid API #

Showgird API pulls data from different sources and combines it together into one API.

this is more or less how the data tree looks like:
-Venue
  -Event
	-artists

Events are subdocuments of venues, therefore they simply cannot exist without venues.





The update file is pretty much just a configureation file to update different scrapers.
It is located at "ctrl/update" and calls the update function with different scrapers located at
'data/scrapers'.


## API DATA FLOW ##
1. Venues are collected with nested events and artist data from different sources.
2. Venues,Events,Artists are parsed within the scraper file to fit the specified format. 
3. All Documents are passed through to the sync function
4. Documents checked via matchers.
5. If Documents match, they are merged if nesseary.
6. After all checking and merging is completed, the documents are saved in the database.



## ADDING MORE FILLERS ##
When you need to access pre-existing data to fill it up with more data or transform the already existing data based on whats already there, you can add a filler.

1. Create a filler function in the "fillers" folder, its parameter will be one document in the database.

2. Hook the filler to the model in the fillers.js file at the bottom. There you can set up how you want to fill data and which documents you want to go through. 
  a. each fillers has an option called "concurrency", that means how many documents you want to transform asyncrously. Its a good idea when you are going through documents that are not related to each other, but for example, if you are trying to find duplicates based on some obscured method and you need make calls to the database syncronously so that if models are saved, their saves do not overlap. Also the setting is handy for get delays.

3. Call the filler with the default options (concurrency, types) or other custom options.



## ADDING MORE SCRAPERS ##
Adding new scrapers is a very straight-forward process.

1. Add the scraper program to the scrapers folder,
	a. it should contain getter functions for venues and/or artists. getter functions should contain a parameter which is an object that contains settings. Certain fields are nessesary, so make sure to check the models in "data/models".
	b. it should container parser functions for venues and/or artists. NOTICE: dont not parse the data int he getter functions.

2. Hook up the functions in "data/scrapers.js".

3. call and pass extra option parameters the hook names via the global update function.




### scraping bad practices: ###
1. When scraping data it is important to minimize queries and database calls by nesting subdocuments accordingly. For example. scraping events WILL work but if they all must contain venues. Its much better to scrape venues and nest as much events inside the venue object as possible.

2. Try to avoid requests in parser functions, however in some cases extra data must be gathered for each model seperatly. If you dont want to use fillers for that,




## UPDATE CONTROLLER ##

Endpoints are model types that will be scraped, they contain certain options that get passed into the getter.

parameters work from outermost to innermost. for example if the param object outside the endpoints is not empty and has a parameter key/value pair, and if platforms -> eventful has a param object with the same key but different value, the outermost setting will get over ridden with the innermost, in this case platforms -> eventful -> param.


a. Each platform has a params object that effects all of its enpoints.
b. Each platform endpoint key can have a value that is a settings object, if its null outermost settings are passed.



### param keys ###
Most of them are self explanitory, however it is extremly important to set the right parameter options for the scrapers, because if wrong ones are passed the update might FAIL! 


global parameters:
	1. filter_delay: how much time to wait before parsing each object that was gotten
	2. zip: postal code
	3. country:  (tested in US only)
	4. radius:  in miles
	5. query_size: size of query
	6. start_date: this options should be passed to all getter scraper functions (date)
	7. end_date: this options should be passed to all getter scraper functions (date)

endpoint specific:
	1. get_delay:
	2. sort: 'popularity',  
	3. key: most apis have keys that might need to be regularly updated or configured



things to keep in mind:
	1. If scrapers hav an option for start and end date, its a good idea to set that accordingly.
	2. Get delays in production mode should be a bit longer because they will ensure that no errors happen in the getters.
	3. Some apis like evntful have over 9000 venues but are sorted by popularity, its a good idea to only scrape the top 3000 most populare venues, most of those will be unuseable anyway.





### API Routes ###
port is set to 3000.

localhost:3000/api : displays api version.




get venue : /api/venue/id
search for venues : /api/venue
	returns object with data and pagination.

	query parameters:
		cursor - pagination cursor
		full - populate each venue event with artists from the database
		q - name query
		zip - zipcode
		lat - latitude
		lon - longitude
		select - comma seperated fields to give back
		mindate - events that start after, default today
		maxdate - event that start before, default taday+ 604800000 (1 week)
		limit - max amount of results to display per page
		active - has events ?


search for events : /api/event
	returns object with data and pagination. (TODO)

	query parameters:
		cursor - pagination cursor
		zip - zip code to search in 
		lat - latitude to search around 
		lon - longitude to search around 
		radius - radius around that zip code, defaults to 50
		mindate - events that start after, default today
		maxdate - event that start before, default taday+ 604800000 (1 week)
		artists - only display events that have artists

gett artist : /api/venue/id
search for artists /api/artist
	returns object with data and pagination. (TODO)
	query parameters:
		radius


### APIS Used ###
