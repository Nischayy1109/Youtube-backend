import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, sortBy = "_id", sortType = "1", query } = req.query
    //TODO: get all videos based on query, sort, pagination
    const currentUser = req.user
    if(!currentUser) throw new ApiError(404,"Unauthorized access")

    const options={
        page:parseInt(page),
        limit:parseInt(limit),
        sort:{[sortBy]:parseInt(sortType)}
    }

    const pipeline = [
        {
            $match:{
                owner:new mongoose.Types.ObjectId(currentUser._id)
            },
        },
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner"
            }
        },
        {
            $unwind:"$owner"
        },
        {
            $project:{
                "owner.password":0,
                "owner.email":0,
                "owner.createdAt":0,
                "owner.updatedAt":0,
                "owner.__v":0,
                "owner.refreshToken":0,
                "owner.watchHistory":0,
            }
        }
    ]

    if(query){
        pipeline.push({
            $match:{
                $or:[
                    {
                        title:{
                            $regex:query,
                            $options:"i"
                        },
                    },
                    {
                        description:{
                            $regex:query,
                            $options:"i"
                        }
                    }
                ]
            }
        })
    }
    const aggregatePipeline = await Video.aggregate(pipeline)
    const videosByUser = await Video.aggregatePaginate(aggregatePipeline,options)

    if(!videosByUser) throw new ApiError(500,"Something went wrong while fetching user's videos")

    return res.status(200).json(new ApiResponse(200,videosByUser,"All videos fetched"))
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video
    if(
        [title,description].some((field)=>field?.trim()==="")
    ){
        throw new ApiError(400,"Title or description is empty")
    }

    const videoLocalPath = req.files.videoFile[0]?.path
    if(!videoLocalPath){
        throw new ApiError(400,"Video file is required")
    }
    const thumbnailLocalPath = req.files.thumbnail[0]?.path
    if(!thumbnailLocalPath){
        throw new ApiError(400,"Thumbnail is required")
    }
    
    const videoFile = await uploadOnCloudinary(videoLocalPath)
    if(!videoFile) throw new ApiError(500,"Could not upload video file")

    const thumbnailFile = await uploadOnCloudinary(thumbnailLocalPath)
    if(!thumbnailFile) throw new ApiError(500,"Could not upload thumbnail file")

    const user = req.user?._id
    if(!user) throw new ApiError(400,"Not authorized to publish video")

    const video = await Video.create({
        videoFile:videoFile.url,
        thumbnail:thumbnailFile.url,
        duration:videoFile.duration,
        title,
        description,
        isPublished:true,
        owner:user,
    })

    if(!video) throw new ApiError(500,"Could not publish video")

    return res
    .status(200)
    .json(new ApiResponse(200,video,"Video published successfully"))

})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
    if(!isValidObjectId(videoId)) throw new ApiError(404,"No such video found")

    const video = await Video.findById(videoId).populate(
        "owner",
        "-password -email -createdAt -updatedAt -__v -refreshToken -watchHistory"
    )
    if(!video) throw new ApiError(500,"Could not fetch the video for this id")

    return res
    .status(200)
    .json(new ApiResponse(200,video,"Video fetched successfully"));
    
})

const updateVideoDetails = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    if(!isValidObjectId(videoId)) throw new ApiError(404,"No such video found")

    const {title,description} = req.body
    if(!title && !description) throw new ApiError(401,"No content given to update")

    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                ...(title && { title }),           
                ...(description && { description })
            }
        },
        { new: true, runValidators: true }
    );
    if(!video) throw new ApiError(404,"Video not found")

    return res.status(200).json(new ApiResponse(200,video,"Video title and description updated successfully"))

})

const updateVideoThumbnail = asyncHandler(async(req,res) =>{
    const { videoId } = req.params;

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "No video found with given Id");
    }

    const videoOwner = video.owner;
    const currentUser = req.user?._id;

    if (videoOwner.toString() !== currentUser.toString()) {
        throw new ApiError(401, "Unauthorized access to update video");
    }

    const thumbnailLocalPath = req.file?.path;
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail is missing");
    }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    if (!thumbnail) {
        throw new ApiError(500, "Failed to upload thumbnail");
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        { $set: { thumbnail: thumbnail.url } },
        { new: true, runValidators: true }
    );
    
    if (!updatedVideo) {
      throw new ApiError(500, "Failed to update video thumbnail");
    }

    return res
        .status(200)
        .json(new ApiResponse(200,updatedVideo.thumbnail, "Thumbnail updated"));
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
    if(!isValidObjectId(videoId)) throw new ApiError(404,"No such video found")
    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "No video found with given Id");
    }

    const videoOwner = video.owner;
    const currentUser = req.user?._id;

    if (videoOwner.toString() !== currentUser.toString()) {
        throw new ApiError(401, "Unauthorized access to update video");
    }

    await Video.findByIdAndDelete(videoId);
    return res.status(200).json(new ApiResponse(200, "Video deleted"));

})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if(!isValidObjectId(videoId)) throw new ApiError(404,"No such video found")
    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "No video found with given Id");
    }

    const videoOwner = video.owner;
    const currentUser = req.user?._id;

    if (videoOwner.toString() !== currentUser.toString()) {
        throw new ApiError(401, "Unauthorized access to update video");
    }

    video.isPublished = !video.isPublished;
    await video.save();

    return res
        .status(200)
        .json(
        new ApiResponse(
            200,
            "Video publish status updated",
            video.isPublished ? "Published" : "Unpublished"
        )
        );
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideoDetails,
    updateVideoThumbnail,
    deleteVideo,
    togglePublishStatus
}