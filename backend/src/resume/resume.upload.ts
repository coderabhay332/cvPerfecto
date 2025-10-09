import multer from 'multer';
import path from 'path';
import fs from 'fs';

/**
 * Multer configuration for handling file uploads
 * Specifically configured for resume optimization with PDF and DOCX support
 */
export class FileUploadConfig {
    private uploadsDir: string;

    constructor() {
        this.uploadsDir = path.join(process.cwd(), 'uploads');
        this.ensureUploadsDirectory();
    }

    /**
     * Ensures the uploads directory exists
     */
    private ensureUploadsDirectory(): void {
        if (!fs.existsSync(this.uploadsDir)) {
            fs.mkdirSync(this.uploadsDir, { recursive: true });
        }
    }

    /**
     * Configure multer storage for resume files
     * Uses memory storage for processing without saving to disk
     */
    getMemoryStorage(): multer.StorageEngine {
        return multer.memoryStorage();
    }

    /**
     * Configure multer storage for disk storage (alternative option)
     * Saves files to uploads directory with unique names
     */
    getDiskStorage(): multer.StorageEngine {
        return multer.diskStorage({
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
     * File filter function to validate uploaded files
     * Only allows PDF and DOCX files
     */
    fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback): void => {
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
        const fileExtension = path.extname(file.originalname).toLowerCase();
        if (allowedExtensions.includes(fileExtension)) {
            cb(null, true);
            return;
        }

        // Reject file if it doesn't match criteria
        cb(new Error(`Invalid file type. Only PDF and DOCX files are allowed. Received: ${file.mimetype}`));
    };

    /**
     * Get multer configuration for resume uploads
     * Uses memory storage for better performance
     */
    getResumeUploadConfig(): multer.Options {
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
    getDiskUploadConfig(): multer.Options {
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
    cleanupOldFiles(maxAgeHours: number = 24): void {
        const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds
        const now = Date.now();

        try {
            const files = fs.readdirSync(this.uploadsDir);
            
            files.forEach(file => {
                const filePath = path.join(this.uploadsDir, file);
                const stats = fs.statSync(filePath);
                
                if (now - stats.mtime.getTime() > maxAge) {
                    fs.unlinkSync(filePath);
                    console.log(`Deleted old uploaded file: ${file}`);
                }
            });
        } catch (error) {
            console.warn('Failed to cleanup old uploaded files:', error);
        }
    }
}

// Export singleton instance
export const fileUploadConfig = new FileUploadConfig();
