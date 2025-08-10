const mongoose = require("mongoose");

const PersonStructure = new mongoose.Schema({
  basic_info: {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
  },
  person_details: {
    nick_names: [
      {
        type: String,
      },
    ],
    is_this_streamer: {
      type: String,
    },
    stream_link:{
        type:String
    },
    current_location:{
        type:String
    },
    previous_location:{
        type:String
    }
  },
  media: {
    video_links: [
      {
        type: String,
      },
    ],
    web_links: [
      {
        type: String,
      },
    ],
    photos: [
      {
        type: String,
      },
    ],
  },
  tags: [
    {
      type: String,
      enum: [],
      trim: true,
      lowercase: true,
    },
  ],
  associated_with:[
    {
        group_name:{
             type: mongoose.Schema.Types.ObjectId,
             ref:"Group"
        }
    }
  ],
   socials: {
      twitter: String,
      youtube: String,
      discord: String,
      instagram: String,
      website: String,
    },
    submitted_by: {
      type: mongoose.Schema.Types.ObjectId,
      required:true
    },
     status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  review_notes: {
    type: String,
  },
   views:{
        type:Number,
        default:0
    }
},{
    timestamps:true
});

PersonStructure.index({
  "basic_info.name": "text",
  "basic_info.description": "text",
  "person_details.nick_names": "text",
  "person_details.current_location": "text",
  "person_details.previous_location": "text",
  tags: "text",
  "socials.twitter": "text",
  "socials.youtube": "text",
  "socials.discord": "text",
  "socials.instagram": "text",
  "socials.website": "text",
  status: "text",
  review_notes: "text",
});


const Person = new mongoose.model("Person", PersonStructure);

module.exports = Person;
