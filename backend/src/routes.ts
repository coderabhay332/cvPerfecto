import express from "express"
import userRoutes from "./user/user.routes"
import resumeRoutes from "./resume/resume.routes"

const router = express.Router();

router.use("/users", userRoutes);
router.use("/resume", resumeRoutes);

export default router;