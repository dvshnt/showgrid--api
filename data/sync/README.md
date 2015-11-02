sync function takes the passed PARSED documents of types ['venue','event','artist'] and syncs them with the database.

the sync function uses merge.js and match.js to find duplicate entries in the database and merge them the they match.