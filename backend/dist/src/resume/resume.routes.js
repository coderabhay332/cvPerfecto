"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const resume_controller_1 = require("./resume.controller");
const resume_upload_1 = require("./resume.upload");
const express_validator_1 = require("express-validator");
const validation_middleware_1 = require("../common/middleware/validation.middleware");
const role_auth_middleware_1 = require("../common/middleware/role-auth.middleware");
const router = express_1.default.Router();
const resumeController = new resume_controller_1.ResumeController();
// Configure multer for resume uploads
const upload = (0, multer_1.default)(resume_upload_1.fileUploadConfig.getResumeUploadConfig());
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
router.post('/optimize', (0, role_auth_middleware_1.roleAuth)(['USER', 'ADMIN']), upload.single('resume'), [
    (0, express_validator_1.body)('jobDescription')
        .notEmpty()
        .withMessage('Job description is required')
        .isLength({ min: 50, max: 10000 })
        .withMessage('Job description must be between 50 and 10,000 characters')
        .trim()
], validation_middleware_1.validateRequest, resumeController.optimizeResume);
/**
 * GET /api/resume/my-resumes
 * Get all resumes for the authenticated user
 *
 * Response:
 * - Array of user's resumes
 */
router.get('/my-resumes', (0, role_auth_middleware_1.roleAuth)(['USER', 'ADMIN']), resumeController.getUserResumes);
/**
 * GET /api/resume/:id
 * Get a specific resume by ID
 *
 * Response:
 * - Resume details
 */
router.get('/:id', (0, role_auth_middleware_1.roleAuth)(['USER', 'ADMIN']), resumeController.getResumeById);
exports.default = router;
