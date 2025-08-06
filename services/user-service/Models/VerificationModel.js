const mongoose = require('mongoose');
const bcrypt = require("bcryptjs");

const VerificationSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    token: {
        type: String,
        required: true
    },
    isActive:{
        type:Boolean,
        default:true
    },
    expires:{
        type:Date,
        required:true
    }
},{timestamps:true});

VerificationSchema.methods.compareToken = async function(token) {
    return await bcrypt.compare(token, this.token);
}

const VerificationModel = new mongoose.model("Verification", VerificationSchema);

module.exports = VerificationModel;
