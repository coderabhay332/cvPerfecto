import { Request, Response } from 'express';
import { ResumeOptimizationService } from './resume.service';
import { ResponseHelper } from '../common/helper/response.helper';
import { Types } from 'mongoose';

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
            // Get user ID from authenticated request
            const userId = (req as any).user?.id;
            if (!userId) {
                ResponseHelper.error(res, 'User not authenticated', 401);
                return;
            }

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
                jobDescription: req.body.jobDescription.trim(),
                userId: new Types.ObjectId(userId)
            });

            if (!result.success) {
                ResponseHelper.error(res, result.error || 'Resume optimization failed', 500);
                return;
            }

            // Return the resume data as JSON
            ResponseHelper.success(res, {
                message: 'Resume optimized successfully',
                resume: result.resume
            });

        } catch (error) {
            console.error('Resume optimization controller error:', error);
            ResponseHelper.error(res, 'Internal server error', 500);
        }
    };

    /**
     * Get all resumes for the authenticated user
     */
    getUserResumes = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user?.id;
            if (!userId) {
                ResponseHelper.error(res, 'User not authenticated', 401);
                return;
            }

            const resumes = await this.resumeService.getUserResumes(new Types.ObjectId(userId));
            ResponseHelper.success(res, resumes);
        } catch (error) {
            console.error('Get user resumes error:', error);
            ResponseHelper.error(res, 'Failed to get resumes', 500);
        }
    };

    /**
     * Get a specific resume by ID
     */
    getResumeById = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user?.id;
            if (!userId) {
                ResponseHelper.error(res, 'User not authenticated', 401);
                return;
            }

            const { id } = req.params;
            if (!id) {
                ResponseHelper.error(res, 'Resume ID is required', 400);
                return;
            }

            const resume = await this.resumeService.getResumeById(id, new Types.ObjectId(userId));
            if (!resume) {
                ResponseHelper.error(res, 'Resume not found', 404);
                return;
            }

            ResponseHelper.success(res, resume);
        } catch (error) {
            console.error('Get resume by ID error:', error);
            ResponseHelper.error(res, 'Failed to get resume', 500);
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
