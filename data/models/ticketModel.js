

var ticketSchema = new db.Schema({
    event: {type:db.Schema.Types.ObjectId, ref: 'Event'},
    price: Number,
    soldout: Boolean,
    total: Number,
    available: Number,
    url: String, //link to sell ticket
    sale: {
        start: Date,
        end: Date,
    },
}); 

module.exports = db.model('Ticket',ticketSchema);