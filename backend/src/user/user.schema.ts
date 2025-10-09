import mongoose, { model, Schema } from "mongoose";
import { type IUser } from "./user.dto";
import bcrypt from "bcrypt";

const hashPassword = async (password: string) => {
    const hash = await bcrypt.hash(password, 12);
    return hash;
  };

const userSchema = new Schema<IUser>({
    name: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
        unique: true,
      },
      password: {
        type: String,
        required: true,
      },
      role: {
        type: String,
        enum: ["USER", "ADMIN"],
        default: "USER",
      },
        refreshToken: {
            type: String,
        }
});
 

userSchema.pre("save", async function (next) {
    if (this.isModified("password")) {
      (this as any).password = await hashPassword((this as any).password);
    }
    next();
  });
  
  export default model<IUser>("User", userSchema);
  