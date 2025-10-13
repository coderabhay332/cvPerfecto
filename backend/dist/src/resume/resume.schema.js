"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const resumeSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    originalFileName: { type: String, required: true },
    jobDescription: { type: String, required: true },
    extractedText: { type: String, required: false, default: '' },
    extractedContacts: {
        email: { type: String },
        phone: { type: String },
        linkedin: { type: String },
        github: { type: String },
        leetcode: { type: String },
        website: { type: String },
        twitter: { type: String }
    },
    optimizedLatex: { type: String, required: false, default: '' },
    status: {
        type: String,
        enum: ['processing', 'completed', 'failed'],
        default: 'processing',
        required: true
    },
    error: { type: String }
}, {
    timestamps: true
});
exports.default = (0, mongoose_1.model)("Resume", resumeSchema);
