"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileUploadConfig = exports.FileUploadConfig = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
/**
 * Multer configuration for handling file uploads
 * Specifically configured for resume optimization with PDF and DOCX support
 */
class FileUploadConfig {
    constructor() {
        /**
         * File filter function to validate uploaded files
         * Only allows PDF and DOCX files
         */
        this.fileFilter = (req, file, cb) => {
            // Allowed MIME types
            const allowedMimeTypes = [
                'application/pdf',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ];
            // Allowed file extensions
            const allowedExtensions = ['.pdf', '.docx'];
            // Check MIME type
            if (allowedMimeTypes.includes(file.mimetype)) {
                cb(null, true);
                return;
            }
            // Check file extension as fallback
            const fileExtension = path_1.default.extname(file.originalname).toLowerCase();
            if (allowedExtensions.includes(fileExtension)) {
                cb(null, true);
                return;
            }
            // Reject file if it doesn't match criteria
            cb(new Error(`Invalid file type. Only PDF and DOCX files are allowed. Received: ${file.mimetype}`));
        };
        this.uploadsDir = path_1.default.join(process.cwd(), 'uploads');
        this.ensureUploadsDirectory();
    }
    /**
     * Ensures the uploads directory exists
     */
    ensureUploadsDirectory() {
        if (!fs_1.default.existsSync(this.uploadsDir)) {
            fs_1.default.mkdirSync(this.uploadsDir, { recursive: true });
        }
    }
    /**
     * Configure multer storage for resume files
     * Uses memory storage for processing without saving to disk
     */
    getMemoryStorage() {
        return multer_1.default.memoryStorage();
    }
    /**
     * Configure multer storage for disk storage (alternative option)
     * Saves files to uploads directory with unique names
     */
    getDiskStorage() {
        return multer_1.default.diskStorage({
            destination: (req, file, cb) => {
                cb(null, this.uploadsDir);
            },
            filename: (req, file, cb) => {
                // Generate unique filename with timestamp
                const timestamp = Date.now();
                const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
                const fileName = `${timestamp}_${originalName}`;
                cb(null, fileName);
            }
        });
    }
    /**
     * Get multer configuration for resume uploads
     * Uses memory storage for better performance
     */
    getResumeUploadConfig() {
        return {
            storage: this.getMemoryStorage(),
            fileFilter: this.fileFilter,
            limits: {
                fileSize: 10 * 1024 * 1024, // 10MB limit
                files: 1, // Only one file at a time
                fieldSize: 1024 * 1024, // 1MB for text fields
                fieldNameSize: 100,
                fields: 10 // Maximum number of non-file fields
            }
        };
    }
    /**
     * Get multer configuration for disk storage (alternative)
     * Use this if you prefer to save files to disk first
     */
    getDiskUploadConfig() {
        return {
            storage: this.getDiskStorage(),
            fileFilter: this.fileFilter,
            limits: {
                fileSize: 10 * 1024 * 1024, // 10MB limit
                files: 1, // Only one file at a time
                fieldSize: 1024 * 1024, // 1MB for text fields
                fieldNameSize: 100,
                fields: 10 // Maximum number of non-file fields
            }
        };
    }
    /**
     * Clean up old uploaded files
     * Removes files older than specified hours
     */
    cleanupOldFiles(maxAgeHours = 24) {
        const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds
        const now = Date.now();
        try {
            const files = fs_1.default.readdirSync(this.uploadsDir);
            files.forEach(file => {
                const filePath = path_1.default.join(this.uploadsDir, file);
                const stats = fs_1.default.statSync(filePath);
                if (now - stats.mtime.getTime() > maxAge) {
                    fs_1.default.unlinkSync(filePath);
                    console.log(`Deleted old uploaded file: ${file}`);
                }
            });
        }
        catch (error) {
            console.warn('Failed to cleanup old uploaded files:', error);
        }
    }
}
exports.FileUploadConfig = FileUploadConfig;
// Export singleton instance
exports.fileUploadConfig = new FileUploadConfig();
