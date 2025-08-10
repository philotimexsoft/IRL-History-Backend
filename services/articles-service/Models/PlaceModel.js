const mongoose = require("mongoose");

const PlaceStructure = new mongoose.Schema(
  {
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
    place_details: {
      address: {
        type: String,
      },
      coordinates: {
        type: String,
      },
      place_type: {
        type: String,
      },
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
    submitted_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
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
  },
  {
    timestamps: true,
  }
);

PlaceStructure.index({
  "basic_info.name": "text",
  "basic_info.description": "text",
  "place_details.address": "text",
  "place_details.coordinates": "text",
  "place_details.place_type": "text",
  tags: "text",
  "media.video_links": "text",
  "media.web_links": "text",
  "media.photos": "text",
  status: "text",
  review_notes: "text",
});


const Place = new mongoose.model("Place", PlaceStructure);

module.exports = Place;
