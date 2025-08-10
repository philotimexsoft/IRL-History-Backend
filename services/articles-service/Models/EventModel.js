const mongoose = require("mongoose");

const EventStructure = new mongoose.Schema(
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
    event_details: {
      start_date: {
        type: Date,
        required: true,
      },
      end_date: {
        type: Date,
      },
      location: {
        type: String,
      },
      participants: [
        {
          group: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Group",
          },
          person: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Person",
          },
        },
      ],
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
    },
    tags: [
      {
        type: String,
        enum: [],
        trim: true,
        lowercase: true,
      },
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
  { timestamps: true }
);

EventStructure.index({
  "basic_info.name": "text",
  "basic_info.description": "text",
  "event_details.location": "text",
  "event_details.media.video_links": "text",
  "event_details.media.web_links": "text",
  "event_details.media.photos": "text",
  "event_details.tags": "text",
  "event_details.socials.twitter": "text",
  "event_details.socials.youtube": "text",
  "event_details.socials.discord": "text",
  "event_details.socials.instagram": "text",
  "event_details.socials.website": "text",
  "event_details.status": "text",
  "event_details.review_notes": "text",
});

const Event = new mongoose.model("Event", EventStructure);

module.exports = Event;
