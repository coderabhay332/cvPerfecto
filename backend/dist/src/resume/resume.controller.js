"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResumeController = void 0;
const resume_service_1 = require("./resume.service");
const response_helper_1 = require("../common/helper/response.helper");
const mongoose_1 = require("mongoose");
class ResumeController {
    constructor() {
        /**
         * Handles resume optimization request
         * Accepts multipart form-data with resume file and job description
         */
        this.optimizeResume = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Get user ID from authenticated request
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    response_helper_1.ResponseHelper.error(res, 'User not authenticated', 401);
                    return;
                }
                // Validate request
                if (!req.file) {
                    response_helper_1.ResponseHelper.error(res, 'Resume file is required', 400);
                    return;
                }
                if (!req.body.jobDescription || req.body.jobDescription.trim() === '') {
                    response_helper_1.ResponseHelper.error(res, 'Job description is required', 400);
                    return;
                }
                // Validate file type
                const allowedMimeTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
                if (!allowedMimeTypes.includes(req.file.mimetype)) {
                    response_helper_1.ResponseHelper.error(res, 'Only PDF and DOCX files are supported', 400);
                    return;
                }
                // Validate file size (max 10MB)
                const maxFileSize = 10 * 1024 * 1024; // 10MB in bytes
                if (req.file.size > maxFileSize) {
                    response_helper_1.ResponseHelper.error(res, 'File size too large. Maximum size is 10MB', 400);
                    return;
                }
                console.log(`Processing resume optimization request for file: ${req.file.originalname}`);
                console.log(`Job description length: ${req.body.jobDescription.length} characters`);
                // Process the resume optimization
                const result = yield this.resumeService.processResumeOptimization({
                    resumeFile: req.file,
                    jobDescription: req.body.jobDescription.trim(),
                    userId: new mongoose_1.Types.ObjectId(userId)
                });
                if (!result.success) {
                    response_helper_1.ResponseHelper.error(res, result.error || 'Resume optimization failed', 500);
                    return;
                }
                // Return the resume data as JSON
                response_helper_1.ResponseHelper.success(res, {
                    message: 'Resume optimized successfully',
                    resume: result.resume
                });
            }
            catch (error) {
                console.error('Resume optimization controller error:', error);
                response_helper_1.ResponseHelper.error(res, 'Internal server error', 500);
            }
        });
        /**
         * Get all resumes for the authenticated user
         */
        this.getUserResumes = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    response_helper_1.ResponseHelper.error(res, 'User not authenticated', 401);
                    return;
                }
                const resumes = yield this.resumeService.getUserResumes(new mongoose_1.Types.ObjectId(userId));
                response_helper_1.ResponseHelper.success(res, resumes);
            }
            catch (error) {
                console.error('Get user resumes error:', error);
                response_helper_1.ResponseHelper.error(res, 'Failed to get resumes', 500);
            }
        });
        /**
         * Get a specific resume by ID
         */
        this.getResumeById = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    response_helper_1.ResponseHelper.error(res, 'User not authenticated', 401);
                    return;
                }
                const { id } = req.params;
                if (!id) {
                    response_helper_1.ResponseHelper.error(res, 'Resume ID is required', 400);
                    return;
                }
                const resume = yield this.resumeService.getResumeById(id, new mongoose_1.Types.ObjectId(userId));
                if (!resume) {
                    response_helper_1.ResponseHelper.error(res, 'Resume not found', 404);
                    return;
                }
                response_helper_1.ResponseHelper.success(res, resume);
            }
            catch (error) {
                console.error('Get resume by ID error:', error);
                response_helper_1.ResponseHelper.error(res, 'Failed to get resume', 500);
            }
        });
        /**
         * Health check endpoint for resume optimization service
         */
        this.healthCheck = (req, res) => __awaiter(this, void 0, void 0, function* () {
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
                }
                catch (error) {
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
                response_helper_1.ResponseHelper.success(res, healthStatus);
            }
            catch (error) {
                console.error('Health check error:', error);
                response_helper_1.ResponseHelper.error(res, 'Health check failed', 500);
            }
        });
        /**
         * Get supported file types and limits
         */
        this.getSupportedFormats = (req, res) => __awaiter(this, void 0, void 0, function* () {
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
                response_helper_1.ResponseHelper.success(res, supportedFormats);
            }
            catch (error) {
                console.error('Get supported formats error:', error);
                response_helper_1.ResponseHelper.error(res, 'Failed to get supported formats', 500);
            }
        });
        this.resumeService = new resume_service_1.ResumeOptimizationService();
    }
}
exports.ResumeController = ResumeController;
