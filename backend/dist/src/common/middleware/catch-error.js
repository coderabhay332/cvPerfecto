"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.catchError = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const http_errors_1 = __importDefault(require("http-errors"));
const { validationResult } = require("express-validator");
exports.catchError = (0, express_async_handler_1.default)((req, res, next) => {
    const errors = validationResult(req);
    const isError = errors.isEmpty();
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!isError) {
        const data = { errors: errors.array() };
        console.log(data);
        throw (0, http_errors_1.default)(400, {
            message: "Validation error!",
            data,
        });
    }
    else {
        next();
    }
});
