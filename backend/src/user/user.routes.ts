import { Router } from "express";
import passport from "passport";
import { catchError } from "../common/middleware/catch-error";
import { roleAuth } from "../common/middleware/role-auth.middleware";
import * as userController from "./user.controllers";
import * as userValidator from "./user.validation";


const router = Router();
router
            .post("/register", userValidator.createUser, catchError, userController.createUser)
            .post("/login", userValidator.login, catchError, passport.authenticate('login', { session: false }), userController.login)
     

            export default router;