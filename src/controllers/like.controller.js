import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from '../models/video.model.js';
import { Comment } from '../models/comment.model.js';
import { Tweet } from "../models/tweet.model.js"

const toggleLike=async(Model,resourceId,userId) => {
    if (!isValidObjectId(resourceId)) throw new ApiError(400, "Invalid Resource Id");
    if (!isValidObjectId(userId)) throw new ApiError(400, "Invalid UserId");

    const resource = await Model.findById(resourceId)
    if(!resource) throw new ApiError(404,"No resource found")

    const resourceField = Model.modelName.toLowerCase()
    const isLiked = await Like.findOne({[resourceField]:resourceId, likedBy:userId})

    let response;
    try {
        if(isLiked){
            response=await Like.deleteOne({[resourceField]:resourceId, likedBy:userId});
            //await Model.findByIdAndUpdate(resourceId,{$inc:{likes:-1}})
        }else{
            response=await Like.create({[resourceField]:resourceId, likedBy:userId});
            //await Model.findByIdAndUpdate(resourceId,{$inc:{likes:1}})
        }
    } catch (error) {
        console.log(error)
        throw new ApiError(500,error?.message || "Something went wrong in toggleLike")
    }

    const totalLikes = await Like.countDocuments({ [resourceField]: resourceId });

    return { response, isLiked, totalLikes };
}

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video
    const {response , isLiked , totalLikes} = await toggleLike(Video,videoId,req.user?._id)

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {response,totalLikes},
            isLiked?"Removed like successfully":"Liked video successfully"
        )
    )
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment
    const {response , isLiked , totalLikes} = await toggleLike(Comment,commentId,req.user?._id)

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {response,totalLikes},
            isLiked?"Removed like successfully":"Liked comment successfully"
        )
    )

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
    const {response , isLiked , totalLikes} = await toggleLike(Tweet,tweetId,req.user?._id)

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {response,totalLikes},
            isLiked?"Removed like successfully":"Liked tweet successfully"
        )
    )
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const userId=req.user?._id
    const videoPipeline = [
        {
            $match:{
                likedBy:new mongoose.Types.ObjectId(userId),
            }
        },
        {
            $lookup:{
                from:"vidoes",
                localField:"video",
                foreignField:"_id",
                as:"video",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName:1,
                                        userName:1,
                                        avatar:"$avatar.url"
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{ $first:"$owner"},
                            videoFile:"$videoFile.url",
                            thumbNail:"$thumbNail.url"
                        }
                    },
                    {
                        $project:{
                            title:1,
                            description:1,
                            owner:1,
                            videoFile:1,
                            thumbNail:1,
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$video",
        },
        {
            $replaceRoot: {
                newRoot: "$video",
            },
        },
    ]

    try {
        const likedVideos = await Like.aggregate(videoPipeline)
        return res
        .status(200)
        .json(new ApiResponse(200,likedVideos,"Liked videos fetched successfully"))
    } catch (error) {
        console.log(error)
        throw new ApiError(500,"Something went wrong while fetching videos")
    }
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}