import { Router } from 'express';
import {
    getHistory,
    addToHistory,
  } from "../controllers/watchHistory.controller.js";
import {verifyJWT} from "../middlewares/auth.middleware.js"

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/:videoId").post(addToHistory);
router.route("/").get(getHistory);

export default router