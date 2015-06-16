# Showgrid API #
RESTful JSON API ignorant of front end.

The API should pull together data surrounding concerts from multiple sources and use the data to provide accurate and readable entries.


### Endpoints ###
Basic Rest endpoints that handle GET requests for users and apps and POST, PUT and DELETE for admins.
    /v1/venue/
    /v1/venue/:id
    /v1/venue/:id/show
    /v1/venue/:id/show/:id
    
    /v1/show/
    /v1/show/:id
    
    /v1/band
    /v1/band/:id


### Models ###
#### Venues ####
* Name (String)
* Address (Object or String?)
* Image (URL, store in S3 Bucket)
* Website (URL)
* Age (Small Integer)
* Primary Color (Hex value, String?)
* Secondary Color (Hex value, String?)

#### Shows ####
* Title (String)
* Headliners (Artists Object array)
* Openers (Artists array)
* Datetime (Datetime Object)
* Venue (Venue Object)
* Price (Integer)
* Ticket (Affiliate URL)
* Soldout (Boolean)
* On Sale Date (Date Object)
* Age (Small Integer)
* People (Users Object)
* Featured (Boolean)
* Banner (URL, store in S3 Bucket)

#### Artists ####
* Name (String)
* Website (URL)
* Song sample (Some Spotify API)
* Picture (URL, store in S3 Bucket)

#### Users ####
* Email (email)
* Password (password)
* Phone # (phone)??
