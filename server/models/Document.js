const {Schema, model} = require('mongoose')

const Document = new Schema({
    _id: String,
    title: { type: String, default: "Untitled Document" },
    data: Object,
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true }
})

module.exports = model("Document", Document)