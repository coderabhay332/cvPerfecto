"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const initDB = () => __awaiter(void 0, void 0, void 0, function* () {
    return yield new Promise((resolve, reject) => {
        var _a;
        const mongodbUri = (_a = process.env.MONGODB_URI) !== null && _a !== void 0 ? _a : "";
        console.log(mongodbUri);
        if (mongodbUri === "")
            throw new Error("mongod db uri not found!");
        // mongoose.set("debug", true);
        mongoose_1.default.set("strictQuery", false);
        mongoose_1.default
            .connect(mongodbUri)
            .then(() => {
            console.log("DB Connected!");
            resolve(true);
        })
            .catch(reject);
    });
});
exports.initDB = initDB;
