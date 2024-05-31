import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const {content} = req.body;
    if(!content || content?.trim()===""){
        throw new ApiError(400,"Content is required")
    }

    const user = req.user?._id
    const tweet = await Tweet.create({
        owner:user,
        content
    })

    return res
    .status(201)
    .json(new ApiResponse(200,{tweet},"Tweet created successfully"))
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const userId = req.params.userId
    const user=await User.findById(userId)

    if(!user){
        throw new ApiError(404,"User not found")
    }

    const userTweets = await Tweet.find(
        {owner:userId}
    ).select("_id content")

    if(userTweets.length===0){
        throw new ApiError(404,"No tweets found for this user")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,{userTweets},"User tweets fetched successfully"))

})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const {tweetId} = req.params
    const {content} = req.body

    const tweet = await Tweet.findById(tweetId)
    if(!tweet){
        throw new ApiError(404,"Tweet not found")
    }

    if(!content || content?.trim()===""){
        throw new ApiError(400,"Content cannot be empty")
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set:{
                content
            }
        },
        {
            new:true
        }
    )

    if(!updatedTweet) throw new ApiError(500,"Something went wrong")

    return res
    .status(200)
    .json(new ApiResponse(200,{updatedTweet},"Tweet updated successfully"))

})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const {tweetId} = req.params
    const tweet = await Tweet.findById(tweetId)
    if(!tweet){
        throw new ApiError(404,"No such tweet was found")
    }
    const deletedTweet=await Tweet.findByIdAndDelete(tweetId)
    if(!deletedTweet){
        throw new ApiError(500,"Something went wrong")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,{},"Tweet deleted successfully"))

})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}