
const { body, checkExact } = require('express-validator');

import * as userService from './user.service';


export const login = checkExact([
    body('email').notEmpty().withMessage('Email is required').isEmail().withMessage('Email must be valid'),
    body('password').notEmpty().withMessage('Password is required').isString().withMessage('Password must be a string'),
]);

export const createUser = checkExact([
    body('name').notEmpty().withMessage('Name is required').isString().withMessage('Name must be a string'),
    body('email')
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Email must be valid')
        .custom(async (value: string) => {
            const user = await userService.getUserByEmail(value)
            if (user) throw new Error("Email is already exist.")
            return true
        }),
    body('password').notEmpty().withMessage('Password is required').isString().withMessage('Password must be a string'),
    body('confirmPassword').custom((value: any, { req }: any) => {
        if (value !== req.body.password) {
            throw new Error('Password confirmation does not match password');
        }
        return true;
    })
]);

export const updateUser = checkExact([
    body('name').notEmpty().withMessage('Name is required').isString().withMessage('Name must be a string'),
    body('email').notEmpty().withMessage('Email is required').isEmail().withMessage('Email must be valid'),
    body('active').isBoolean().withMessage('active must be a boolean'),
    body('password').notEmpty().withMessage('Password is required').isString().withMessage('Password must be a string'),
]);

export const editUser = [
    body('name').isString().withMessage('Name must be a string'),
    body('email').isEmail().withMessage('Email must be valid'),
    body('active').isBoolean().withMessage('active must be a boolean'),
    body('password').isString().withMessage('Password must be a string'),
];

export const refreshToken = [
    body("refreshToken").notEmpty().withMessage("Refresh token is required"),
]
