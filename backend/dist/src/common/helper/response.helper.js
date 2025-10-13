"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseHelper = exports.createResponse = void 0;
const createResponse = (data, message) => {
    return { data, message, success: true };
};
exports.createResponse = createResponse;
class ResponseHelper {
    static success(res, data, message, statusCode = 200) {
        res.status(statusCode).json({
            success: true,
            message: message || 'Success',
            data: data
        });
    }
    static error(res, message, statusCode = 500, errors) {
        res.status(statusCode).json({
            success: false,
            message: message,
            data: null,
            errors: errors
        });
    }
}
exports.ResponseHelper = ResponseHelper;
