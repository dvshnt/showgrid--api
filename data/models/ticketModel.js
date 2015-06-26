var db = require('mongoose');

var ticketSchema = new db.Schema({
    event: {type:db.Schema.Types.ObjectId, ref: 'Event'},
    price: Number,
    soldout: Boolean,
    total: Number,
    available: Number,
    urls: [{type: String}], //link to sell ticket
    sale: {
        start: Date,
        end: Date,
    },
}); 

var ticket = db.model('Ticket',ticketSchema);

module.exports = ticket;