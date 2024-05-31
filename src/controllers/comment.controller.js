import mongoose, { isValidObjectId } from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    if(!isValidObjectId(videoId)) throw new ApiError(400,"Invalid video id")
    const options={
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        customLabels: {
            docs: "comments",
            totalDocs: "totalComments",
        }
    }
    const video = await Video.findById(videoId)
    if(!video) throw new ApiError("Video not found")

    const aggregatePipeline = [
        {
            $match:{
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"video",
                pipeline:[
                    {
                        $project:{
                            _id:1,
                            username:1,
                            avatar:"$avatar.url"
                        }
                    }
                ]
            }
        },
        {
            $addFields:{
                owner:{
                    $first:"$owner"
                }
            }
        },{
            $sort:{
                createdAt:-1
            }
        }
    ]
    try {
        const allComments=await Comment.aggregatePaginate(
            Comment.aggregate(aggregatePipeline),
            options
        )

        if(allComments.comments.length===0){
            return res.status(200).json(new ApiResponse(200,[],"No comments found"))
        }

        return res.status(200).json(new ApiResponse(200,allComments,"Comments fetched successfully"))

    } catch (error) {
        console.log(error)
        throw new ApiError(500,"Something went wrong while fetching comments")
    }

})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const {videoId}=req.params
    if(!isValidObjectId(videoId)) throw new ApiError(400,"Invalid video id")

    const {content} = req.body
    if(!content || content?.trim()==="") throw new ApiError(400,"Comment is empty")

    const [video,user] = await Promise.all([
        Video.findById(videoId),
        User.findById(req.user?._id)
    ])
    if(!video) throw new ApiError("Video not found")
    if(!user) throw new ApiError("User not found")

    const comment= await Comment.create({
        content,
        video : videoId,
        owner : req.user?._id
    })

    if(!comment) throw new ApiError(500,"Something went wrong while creating comment")

    return res
    .status(200)
    .json( new ApiResponse(200,comment,"Comment added successfully"))
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const {commentId} = req.params;
    if(!isValidObjectId(commentId)) throw new ApiError(404,"Comment not found")

    const {content} = req.body
    if(!content || content?.trim()==="") throw new ApiError(400,"Content is required")

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set:{
                content
            }
        },
        {
            new:true
        }
    )

    if(!updatedComment) throw new ApiError(500,"Something went wrong while updating comment")

    return res
    .status(200)
    .json( new ApiResponse(200,updatedComment,"Comment added successfully"))

})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const {commentId} = req.params;
    if(!isValidObjectId(commentId)) throw new ApiError(404,"Comment not found")

    const deletedComment = await Comment.findByIdAndDelete(
        commentId,
        {
            new:true
        }
    )

    if(!deletedComment) throw new ApiError(500,"Something went wrong while deleting comment")

    return res
    .status(200)
    .json( new ApiResponse(200,{},"Comment deleted successfully"))
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }