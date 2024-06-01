import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription
    if(!channelId) throw new ApiError(400,"Invalid channel id")

    if(!req.user?._id) throw new ApiError(401,"Invalid user authorization")
    const subscriberId = req.user?._id
    const isSubscribed = await Subscription.findOne({channel:channelId,subscriber:subscriberId})
    var response;
    try {
        response = isSubscribed 
            ?
            await Subscription.deleteOne({channel:channelId,subscriber:subscriberId })
            :
            await Subscription.create({channel:channelId,subscriber:subscriberId })
    } catch (error) {
        console.log(error)
        throw new ApiError(500,error?.message || "Something went wrong while toggle subscription")
    }

    return res.status(200).json(new ApiResponse(200,response,isSubscribed===null ? "Subscribed successfully":"Unsubscribed successfully"))

})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    if(!isValidObjectId(channelId)) throw new ApiError(401,"Channel id not valid")
    const currentUser=req.user

    const currentChannel = await User.findById({channelId})
    if(!currentChannel) throw new ApiError(404,"Could not find channel")

    if(currentChannel._id.toString()!==currentUser._id.toString()) throw new ApiError(401,"Unauthorized to see subscribers")

    let subscribers = await Subscription.find({channel:currentChannel})
        .select("-channel -__v")
        .populate({
            path:"subscriber",
            select:"username fullName"
        })

    subscribers = subscribers.map((subscriber)=>({
        SubscriptionId:subscriber._id,
        username:subscriber.subscriber.username,
        fullname: subscriber.subscriber.fullname,
        email: subscriber.subscriber.email,
        createdAt: subscriber.createdAt,
        updatedAt: subscriber.updatedAt,
    }))

    return res.status(200).json(new ApiResponse(200,subscribers,"Subscribers of channel"))
    
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
    const subscriber = await User.findById(subscriberId);
    if (!subscriber) {
      throw new ApiError(404, "Subscriber not found");
    }
  
    const currentUser = req.user;
    if (currentUser._id.toString() !== subscriber._id.toString()) {
      throw new ApiError(
        403,
        "You are not authorized to view subscribed channels of this user"
      );
    }
  
    let channels = await Subscription.find({ subscriber: subscriber })
      .select("_id channel createdAt")
      .populate({
        path: "channel",
        select: "_id username",
      });
  
    channels = channels.map((channel) => ({
      channel_Id: channel.channel._id, // Rename _id to channelID
      username: channel.channel.username,
      subscribedAt: channel.createdAt,
    }));
  
    return res
      .status(200)
      .json(new ApiResponse(200, "Channels subscribed by the user", channels));
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}