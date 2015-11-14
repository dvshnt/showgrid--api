all the api and website scrapers are in this folder. they each have basicly 2 export functions with parameters findVenues for finding venues and parseVenue for parsing a raw venue json object into a formated json object that can be then piped down into the sync handler.

Sometimes the parse functions will contain get requests too, for example to fetch extra venue information such as recent events, even though their purpose is really to syncronously parse and reformat the data. This is mainly because I was in a rush to write them.



###notes:###
I found out that facebook limits its search discovery functionality, in order to get facebook data for a venue its a good idea to already have the venue in the database and add a method to find that venue on facebook.

Jambase has a 50 query per day limit, but i think they have an option to set 100 venues per page.

most of these scrapers were written early on, some of the code may seem a bit hectic and messy, but they work.