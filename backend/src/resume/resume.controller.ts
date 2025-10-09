import { Request, Response } from 'express';
import { ResumeOptimizationService } from './resume.service';
import { ResponseHelper } from '../common/helper/response.helper';

export class ResumeController {
    private resumeService: ResumeOptimizationService;

    constructor() {
        this.resumeService = new ResumeOptimizationService();
    }

    /**
     * Handles resume optimization request
     * Accepts multipart form-data with resume file and job description
     */
    optimizeResume = async (req: Request, res: Response): Promise<void> => {
        try {
            // Validate request
            if (!req.file) {
                ResponseHelper.error(res, 'Resume file is required', 400);
                return;
            }

            if (!req.body.jobDescription || req.body.jobDescription.trim() === '') {
                ResponseHelper.error(res, 'Job description is required', 400);
                return;
            }

            // Validate file type
            const allowedMimeTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!allowedMimeTypes.includes(req.file.mimetype)) {
                ResponseHelper.error(res, 'Only PDF and DOCX files are supported', 400);
                return;
            }

            // Validate file size (max 10MB)
            const maxFileSize = 10 * 1024 * 1024; // 10MB in bytes
            if (req.file.size > maxFileSize) {
                ResponseHelper.error(res, 'File size too large. Maximum size is 10MB', 400);
                return;
            }

            console.log(`Processing resume optimization request for file: ${req.file.originalname}`);
            console.log(`Job description length: ${req.body.jobDescription.length} characters`);

            // Process the resume optimization
            const result = await this.resumeService.processResumeOptimization({
                resumeFile: req.file,
                jobDescription: req.body.jobDescription.trim()
            });

            if (!result.success) {
                ResponseHelper.error(res, result.error || 'Resume optimization failed', 500);
                return;
            }

            // Send the optimized file as download (PDF or LaTeX)
            const filePath = result.pdfPath!;
            const isPDF = filePath.endsWith('.pdf');
            const fileName = `optimized_resume_${Date.now()}.${isPDF ? 'pdf' : 'ltx'}`;

            if (isPDF) {
                res.setHeader('Content-Type', 'application/pdf');
            } else {
                res.setHeader('Content-Type', 'text/plain');
            }
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            
            // Stream the file to the client
            
            const fs = require('fs');
            const fileStream = fs.createReadStream(filePath);
            
            fileStream.on('error', (error: Error) => {
                console.error('Error streaming file:', error);
                ResponseHelper.error(res, 'Error sending file', 500);
            });

            fileStream.pipe(res);

            // Clean up the file after sending (optional - you might want to keep it for a while)
            fileStream.on('end', () => {
                // Schedule cleanup after a delay to ensure file is sent
                setTimeout(() => {
                    try {
                        fs.unlinkSync(filePath);
                        console.log(`Cleaned up file: ${filePath}`);
                    } catch (error) {
                        console.warn(`Failed to cleanup file: ${filePath}`, error);
                    }
                }, 5000); // 5 second delay
            });

        } catch (error) {
            console.error('Resume optimization controller error:', error);
            ResponseHelper.error(res, 'Internal server error', 500);
        }
    };

    /**
     * Health check endpoint for resume optimization service
     */
    healthCheck = async (req: Request, res: Response): Promise<void> => {
        try {
            // Check if required directories exist
            const fs = require('fs');
            const path = require('path');
            
            const outputDir = path.join(process.cwd(), 'output');
            const uploadsDir = path.join(process.cwd(), 'uploads');
            
            const outputDirExists = fs.existsSync(outputDir);
            const uploadsDirExists = fs.existsSync(uploadsDir);
            
            // Check if pdflatex is available
            const { execSync } = require('child_process');
            let pdflatexAvailable = false;
            
            try {
                execSync('pdflatex --version', { stdio: 'pipe' });
                pdflatexAvailable = true;
            } catch (error) {
                pdflatexAvailable = false;
            }

            const healthStatus = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                services: {
                    directories: {
                        output: outputDirExists,
                        uploads: uploadsDirExists
                    },
                    pdflatex: pdflatexAvailable,
                    perplexity: !!process.env.PERPLEXITY_API_KEY
                }
            };

            ResponseHelper.success(res, healthStatus);
        } catch (error) {
            console.error('Health check error:', error);
            ResponseHelper.error(res, 'Health check failed', 500);
        }
    };

    /**
     * Get supported file types and limits
     */
    getSupportedFormats = async (req: Request, res: Response): Promise<void> => {
        try {
            const supportedFormats = {
                resume: {
                    formats: ['PDF', 'DOCX'],
                    mimeTypes: [
                        'application/pdf',
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                    ],
                    maxSize: '10MB'
                },
                jobDescription: {
                    formats: ['Text'],
                    maxLength: 10000
                }
            };

            ResponseHelper.success(res, supportedFormats);
        } catch (error) {
            console.error('Get supported formats error:', error);
            ResponseHelper.error(res, 'Failed to get supported formats', 500);
        }
    };
}
