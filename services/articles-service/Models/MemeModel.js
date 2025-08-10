const mongoose = require("mongoose");

const MemeStructure = new mongoose.Schema(
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
    meme_details: {
      original_story: {
        type: String,
      },
      popularity_period: {
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

MemeStructure.index({
  "basic_info.name": "text",
  "basic_info.description": "text",
  "meme_details.original_story": "text",
  "meme_details.popularity_period": "text",
  tags: "text",
  "media.video_links": "text",
  "media.web_links": "text",
  "media.photos": "text",
  status: "text",
  review_notes: "text",
});


const Meme = new mongoose.model("Meme", MemeStructure);

module.exports = Meme;
