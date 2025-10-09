import { type Response, type Request, type NextFunction } from "express";
import expressAsyncHandler from "express-async-handler";

import createHttpError from "http-errors";
const { validationResult } = require("express-validator");
export const catchError = expressAsyncHandler(
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    const isError = errors.isEmpty();
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!isError) {
      const data = { errors: errors.array() };
      console.log(data)
      throw createHttpError(400, {
        message: "Validation error!",
        data,
      });
    } else {
      next();
    }
  }
);
