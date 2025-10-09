import mongoose from "mongoose";
import { type IUser } from "./user.dto";
import userSchema from "./user.schema";
require('dotenv').config();
import jwt from "jsonwebtoken";


export const createUser = async (data: IUser) => {
  
    const result = await userSchema.create({ ...data, active: true});
    return result.toObject();
};

export const getUserById = async (id: string) => {
    console.log("ID", id);
    const result = await userSchema.findById(id)
      .select('-password') 
      .lean();
    return result;
  };

export const getUserByEmail = async (email: string, withPassword = false) => {
    if (withPassword) {
        const result = await userSchema.findOne({ email }).select('+password').lean();
        return result;
    }
};

export const generateRefreshToken = (id: string, role: string): string => {
    return jwt.sign({ id, role }, process.env.JWT_REFRESH_SECRET as string, { expiresIn: "7d" });
  };  

