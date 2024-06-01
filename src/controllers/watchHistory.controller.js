import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Video } from "../models/video.model.js";
import { WatchHistory } from "../models/watchHistory.model.js";

const getHistory = asyncHandler(async (req, res, next) => {
  const user = req.user;

  const history = await WatchHistory.find({ user }).select("-user -__v").populate("video", "-__v -likes -isPublished -updatedAt -thumbnail");

  if (!history) {
    throw new ApiError(404, "No history found");
  }

  return res.status(200).json(new ApiResponse(200, history, "Watch history"));
});

const addToHistory = asyncHandler(async (req, res, next) => {
  const { videoId } = req.params;
  const user = req.user;

  const video = await Video.findById(videoId);
  if (!video) {
    return next(new ApiError(404, "Video not found"));
  }

  const history = await WatchHistory.create({
    user,
    video,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, history, "Video added to history"));
});

export { getHistory, addToHistory };