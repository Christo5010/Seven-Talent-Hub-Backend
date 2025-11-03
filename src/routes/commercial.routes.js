import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getAllCommercials } from "../Controllers/commercial.controller.js";

const router = Router();

router.route("/").get(verifyJWT, getAllCommercials);

export { router as commercialRouter };


