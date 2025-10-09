
import { type Request, type Response } from 'express';
import asyncHandler from "express-async-handler";
import { createResponse } from "../common/helper/response.helper";
import { createUserTokens } from '../common/services/passport-jwt.services';
import { type IUser } from "./user.dto";    
import * as userService from "./user.service";

export const createUser = asyncHandler(async (req: Request, res: Response) => {
    const {email, name} = req.body;
      const result = await userService.createUser(req.body);
  
      const { password, ...user } = result;
      res.send(createResponse(user, "User created successfully"))
  });

  export const login = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as IUser;
    const tokens = createUserTokens(user);
    console.log(tokens)
    res.send(
      createResponse({
        ...tokens,
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          name: user.name,
         
        },
      })
    );
});  
