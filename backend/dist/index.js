// "use strict";
// var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
//     function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
//     return new (P || (P = Promise))(function (resolve, reject) {
//         function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
//         function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
//         function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
//         step((generator = generator.apply(thisArg, _arguments || [])).next());
//     });
// };
// var __importDefault = (this && this.__importDefault) || function (mod) {
//     return (mod && mod.__esModule) ? mod : { "default": mod };
// };
// var _a;
// Object.defineProperty(exports, "__esModule", { value: true });
// require("dotenv/config");
// const body_parser_1 = __importDefault(require("body-parser"));
// const cookie_parser_1 = __importDefault(require("cookie-parser"));
// const cors_1 = __importDefault(require("cors"));
// const express_1 = __importDefault(require("express"));
// const helmet_1 = __importDefault(require("helmet"));
// const http_1 = __importDefault(require("http"));
// const morgan_1 = __importDefault(require("morgan"));
// const error_handler_1 = __importDefault(require("./src/common/middleware/error.handler"));
// const database_services_1 = require("./src/common/services/database.services");
// const passport_jwt_services_1 = require("./src/common/services/passport-jwt.services");
// const routes_1 = __importDefault(require("./src/routes"));
// const port = (_a = Number(process.env.PORT)) !== null && _a !== void 0 ? _a : 5000;
// const app = (0, express_1.default)();
// app.use(express_1.default.json()); // Parses JSON bodies
// app.use((0, cors_1.default)({
//     origin: 'http://localhost:3000', // specify exact origin
//     credentials: true // allow credentials
// }));
// app.use((0, helmet_1.default)());
// app.use((0, cookie_parser_1.default)());
// app.use(body_parser_1.default.json());
// app.use(body_parser_1.default.urlencoded({ extended: false }));
// app.use(express_1.default.json());
// app.use((0, morgan_1.default)("dev"));
// const initApp = () => __awaiter(void 0, void 0, void 0, function* () {
//     // init mongodb
//     yield (0, database_services_1.initDB)();
//     // await perplexitySearch(["what is the full form of cv","what is the full form of ai"]);
//     // passport init
//     (0, passport_jwt_services_1.initPassport)();
//     // set base path to /api
//     app.use("/api", routes_1.default);
//     app.get("/", (req, res) => {
//         res.send({ status: "ok" });
//     });
//     // error handler
//     app.use(error_handler_1.default);
//     http_1.default.createServer(app).listen(port, () => {
//         console.log("Server is runnuing on port", port);
//     });
// });
// void initApp();


"use strict";
require("dotenv/config");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");

const errorHandler = require("./src/common/middleware/error.handler");
const { initDB } = require("./src/common/services/database.services");
const { initPassport } = require("./src/common/services/passport-jwt.services");
const routes = require("./src/routes");

const app = express();

// Middleware setup
app.use(express.json());
app.use(
  cors({
    origin: "*", // Change this to your frontend URL when ready
    credentials: true,
  })
);
app.use(helmet());
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(morgan("dev"));

// Initialize and configure app
(async () => {
  try {
    // Connect to MongoDB
    await initDB();

    // Initialize passport authentication
    initPassport();

    // Define API routes
    app.use("/api", routes);

    // Root route for testing
    app.get("/", (req, res) => {
      res.send({ status: "ok", message: "Backend running on Vercel" });
    });

    // Global error handler
    app.use(errorHandler);
  } catch (err) {
    console.error("Initialization error:", err);
  }
})();

// ✅ IMPORTANT: Export app instead of starting a server
module.exports = app;

