import { model, Schema } from "mongoose";
import { IResume } from "./resume.dto";

const resumeSchema = new Schema<IResume>({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
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

export default model<IResume>("Resume", resumeSchema);
