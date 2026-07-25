import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import chatRouter from "./chat";
import sosRouter from "./sos";
import matchRouter from "./match";
import guideRouter from "./guide";
import listingsRouter from "./listings";
import callsRouter from "./calls";
import paymentsRouter from "./payments";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use('/chat', chatRouter);
router.use('/sos', sosRouter);
router.use('/match', matchRouter);
router.use('/guide', guideRouter);
router.use('/listings', listingsRouter);
router.use('/calls', callsRouter);
router.use('/payments', paymentsRouter);

export default router;
