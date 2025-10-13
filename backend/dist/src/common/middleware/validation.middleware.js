"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = void 0;
const express_validator_1 = require("express-validator");
const response_helper_1 = require("../helper/response.helper");
/**
 * Middleware to validate request data using express-validator
 * Checks for validation errors and returns appropriate response
 */
const validateRequest = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => ({
            field: error.type === 'field' ? error.path : 'unknown',
            message: error.msg,
            value: error.type === 'field' ? error.value : undefined
        }));
        response_helper_1.ResponseHelper.error(res, 'Validation failed', 400, errorMessages);
        return;
    }
    next();
};
exports.validateRequest = validateRequest;
