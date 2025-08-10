const mongoose = require("mongoose");

const GroupStructure = new mongoose.Schema(
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
    group_details: {
      member_count: {
        type: Number,
        default: 0,
      },
      founded: {
        type: String,
        default: "NA",
      },
      status: {
        type: String,
        enum: ["active", "inactive", "disbanded", "unkwon"],
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
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
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

GroupStructure.index({
  "basic_info.name": "text",
  "basic_info.description": "text",
  "group_details.founded": "text",
  "group_details.status": "text",
  tags: "text",
  "socials.twitter": "text",
  "socials.youtube": "text",
  "socials.discord": "text",
  "socials.instagram": "text",
  "socials.website": "text",
  status: "text",
  review_notes: "text",
});

const Group = new mongoose.model("Group", GroupStructure);

module.exports = Group;
