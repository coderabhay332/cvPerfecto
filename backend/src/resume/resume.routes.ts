import express from 'express';
import multer from 'multer';
import { ResumeController } from './resume.controller';
import { fileUploadConfig } from './resume.upload';
import { body } from 'express-validator';
import { validateRequest } from '../common/middleware/validation.middleware';
import { roleAuth } from '../common/middleware/role-auth.middleware';

const router = express.Router();
const resumeController = new ResumeController();

// Configure multer for resume uploads
const upload = multer(fileUploadConfig.getResumeUploadConfig());

/**
 * GET /api/resume/health
 * Health check endpoint for resume optimization service
 * 
 * Response:
 * - Service status and dependencies check
 */
router.get('/health', resumeController.healthCheck);

/**
 * GET /api/resume/formats
 * Get supported file formats and limits
 * 
 * Response:
 * - Supported file types and size limits
 */
router.get('/formats', resumeController.getSupportedFormats);

/**
 * POST /api/resume/optimize
 * Optimizes a resume based on job description using AI
 * 
 * Request:
 * - resume: PDF or DOCX file (multipart/form-data)
 * - jobDescription: text string
 * 
 * Response:
 * - Optimized resume as PDF download
 */
router.post(
    '/optimize',
    roleAuth(['USER', 'ADMIN']),
    upload.single('resume'),
    [
        body('jobDescription')
            .notEmpty()
            .withMessage('Job description is required')
            .isLength({ min: 50, max: 10000 })
            .withMessage('Job description must be between 50 and 10,000 characters')
            .trim()
    ],
    validateRequest,
    resumeController.optimizeResume
);

/**
 * GET /api/resume/my-resumes
 * Get all resumes for the authenticated user
 * 
 * Response:
 * - Array of user's resumes
 */
router.get(
    '/my-resumes',
    roleAuth(['USER', 'ADMIN']),
    resumeController.getUserResumes
);

/**
 * GET /api/resume/:id
 * Get a specific resume by ID
 * 
 * Response:
 * - Resume details
 */
router.get(
    '/:id',
    roleAuth(['USER', 'ADMIN']),
    resumeController.getResumeById
);

export default router;
