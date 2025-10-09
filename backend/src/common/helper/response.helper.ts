import { Response } from 'express';

interface IResponse {
    success: boolean;
    message?: string;
    data: object | null | any;
    errors?: any[];
}

export type ErrorResponse = IResponse & {
    error_code: number;
};

export const createResponse = (
    data: IResponse["data"],
    message?: string
): IResponse => {
    return { data, message, success: true } as IResponse;
};

export class ResponseHelper {
    static success(res: Response, data: any, message?: string, statusCode: number = 200): void {
        res.status(statusCode).json({
            success: true,
            message: message || 'Success',
            data: data
        });
    }

    static error(res: Response, message: string, statusCode: number = 500, errors?: any[]): void {
        res.status(statusCode).json({
            success: false,
            message: message,
            data: null,
            errors: errors
        });
    }
}
  