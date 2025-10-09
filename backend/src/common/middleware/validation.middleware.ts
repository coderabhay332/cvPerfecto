import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ResponseHelper } from '../helper/response.helper';

/**
 * Middleware to validate request data using express-validator
 * Checks for validation errors and returns appropriate response
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => ({
            field: error.type === 'field' ? error.path : 'unknown',
            message: error.msg,
            value: error.type === 'field' ? error.value : undefined
        }));
        
        ResponseHelper.error(res, 'Validation failed', 400, errorMessages);
        return;
    }
    
    next();
};
