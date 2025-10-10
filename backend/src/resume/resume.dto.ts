import { BaseSchema } from "../common/dto/base.dto";
import { Types } from "mongoose";

export interface IResume extends BaseSchema {
    user: Types.ObjectId;
    originalFileName: string;
    jobDescription: string;
    extractedText?: string;
    extractedContacts?: {
        email?: string;
        phone?: string;
        linkedin?: string;
        github?: string;
        leetcode?: string;
        website?: string;
        twitter?: string;
    };
    optimizedLatex?: string;
    status: 'processing' | 'completed' | 'failed';
    error?: string;
}
