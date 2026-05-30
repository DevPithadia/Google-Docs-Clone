const {Schema, model} = require('mongoose')

const Document = new Schema({
    _id: String,
    title: { type: String, default: "Untitled Document" },
    data: Object
})

module.exports = model("Document", Document)