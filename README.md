# Showgrid API #
RESTful JSON API ignorant of front end.

The API should pull together data surrounding concerts from multiple sources and use the data to provide accurate and readable entries.

### Routes ###





### Update Function ###
# save_cache # : save all fetched raw data in database as cache;
# use_cache # : only use cached data to create entries in the database;
## Update Function Parameters ##
Applies to some endpoints.
## Endpoints: ##

zip: ( works as default for all )
gps : ( does not work for many, easier to convert to zip..)
country: 'US', ( default, dont know if works for others )
radius: ( miles )
query_size: ( == or < amount of venues in radius )
sort: 'popularity', (default, only applies to a few)
start_date: (mainly for event queries)
end_date (mainly for event queries)

  Eventful:

    zip: 

    country: 

    radius: (miles)

    query_size: optional query size

    sort: 'popularity',


  Facebook:

    zip:

    gps:

    country: 

    radius: (miles)

    query_size: q_size,
    
  Reverbnation:
    venue
      zip
      country: 
      radius: (miles)
      query_size:
      sort: 'popularity',
  Jambase:
    venue:
      zip
      country: 
      radius: (miles)
      query_size: 
    event:
      zip
      country: 
      radius: (miles)
      query_size: 
      start_date:
      end_date:     
  Ticketfly: (USA only)
    venue
      zip
      radius: (miles)
      query_size: 
    event
      zip
      radius: (miles)
      query_size: 
      start_date: 
      end_date: 



### Public Routes ###
localhost:3000/api/[endpoint = (venue|artist|event)]/[parameters]

##api/venue##
#/[id]# find a venue by its id

id=[id]

get venue by id

##api/event##
get event by id

##api/artist##
get artists by id

  



### APIS Used ###
