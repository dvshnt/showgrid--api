# Showgrid API #
RESTful JSON API ignorant of front end.

The API should pull together data surrounding concerts from multiple sources and use the data to provide accurate and readable entries.


### Endpoints ###
Basic Rest endpoints that handle GET requests for users and apps and POST, PUT and DELETE for admins.

 Endpoint        | Action        | Description      
 --------------- | ------------- | -----------------
  */v1/venue/* | POST    | Add Venue
             | GET     | Get all venues (accepts parameters)
  */v1/venue/:id* | GET    | Get venue of :id
                | PUT    | Edit venue of :id
                | DELETE | Delete venue of :id
  */v1/show/* | GET    | Get all shows (accepts parameters)
            | POST   | Add show
  */v1/show/:id*  | GET    | Get show of :id
                | PUT    | Edit show of :id
                | DELETE | Delete show of :id
  */v1/band/* | GET    | Get all bands (accepts parameters)
            | POST   | Add band
  */v1/band/:id*  | GET    | Get band of :id
                | PUT    | Edit band of :id
                | DELETE | Delete band of :id


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


### API Keys ###
##### [Eventful](http://api.eventful.com) #####
* _u_: info@showgrid.com
* _p_: sh0wgr1d
* _k_: dFbgV5SxzLT9djCL

##### [Songkick](https://www.songkick.com/developer) #####
* _u_: info@showgrid.com
* _p_: sh0wgr1d
* _k_: <<< PENDING >>>

##### [Jambase](http://developer.jambase.com) #####
* _u_: info@showgrid.com
* _p_: sh0wgr1d
* _k_: AADDMDRUR2AM379YVXFKGDXS

##### [TicketFly](https://account.shareasale.com) #####
* _u_: showgrid
* _p_: sh0wgr1d
* _k_: <<< PENDING >>>