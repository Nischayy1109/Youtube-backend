import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"
import { Video } from "../models/video.model.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body
    if(!(name || description) || !(name.trim()==="" || description.trim()==="")) throw new ApiError(401,"Content should not be empty")

    const user = await User.findById(req.user?._id)
    if(!user) throw new ApiError(404,"User not registered for creating playlist")

    const playlist = await Playlist.create({
        name,
        description,
        owner:req.user?._id
    })

    if(!playlist) throw new ApiError(500,"Something went wrong while creating playlist")

    return res.status(200).json(new ApiResponse(200,playlist,"Playlist created successfully"))

    //TODO: create playlist
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists
    if(!isValidObjectId(userId)) throw new ApiError(401,"User id not valid")
    const playlist = await Playlist.findOne({owner:userId})
    if(!playlist) throw new ApiError(401,"Could not find playlist")

    const playlistAggregate = await Playlist.aggregate(
        [
            {
                $matchup:{
                    owner: new mongoose.Types.ObjectId(userId)
                }
            },
            {
                $lookup:{
                    from:"videos",
                    localField:"videos",
                    foreignField:"_id",
                    as:"videos",
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
                                            username:1,
                                            avatar:"$avatar.url"
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $addFields:{
                                videoOwner:{
                                    $first:"$owner"
                                }
                            }
                        },
                        {
                            $unset:"owner"
                        },
                        {
                            $addFields: {
                                videoFile: "$videoFile.url",
                                thumbnail: "$thumbnail.url"
                            }
                        }
                    ]
                }
            },
            {
                $unwind:"$videos"
            }
        ]
    )
    if(!playlistAggregate) throw new ApiError(500,"Could not get user's playlist")
    return res.status(200).json(new ApiResponse(200,playlistAggregate,"User's Playlist fetched successfully"))
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id
    if(!playlistId) throw new ApiError(401,"Invalid playlist id")

    const playlist = await Playlist.findById(playlistId)
    if(!playlist) throw new ApiError(404,"Playlist not found")

    const playlistAggregate = await Playlist.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"videos",
                foreignField:"_id",
                as:"videos",
                pipeline:[
                    {
                        $match:{deleted : {$ne:true}}
                    },
                    {
                        $lookup:{
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName:1,
                                        _id:1,
                                        avatar:"$avatar.url",
                                        username:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            videoOwner:{
                                $first:"$owner"
                            }
                        }
                    },
                    {
                        $project:{
                            owner:0
                        }
                    },
                    {
                        $addFields:{
                            videoFile:"$videoFile.url",
                            thumbnail: "$thumbnail.url"
                        }
                    },

                ]
            }
        },
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
                            avatar:"$avatar.url",
                            _id:1,
                            username:1
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
        }
    ])
    if(!playlistAggregate) throw new ApiError(500,"Playlist could not be fetched something went wrong")

    return res.status(200).json(new ApiResponse(200,playlistAggregate,"Playlist fetched successfully"))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    if(!(isValidObjectId(playlistId) || isValidObjectId(videoId))) throw new ApiError(401,"Invalid videoid or playlistid")

    const video = await Video.findById(videoId)
    if(!video) throw new ApiError(404,"Video not found")

    const playlist = await Playlist.findById(playlistId)
    if(!playlist) throw new ApiError(404,"Playlist not found")

    const addtoPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $addToSet:{
                videos:videoId
            }
        },
        {
            new:true
        }
    )
    if(!addtoPlaylist) throw new ApiError(500,"Something went wrong while adding video to playlist")
    return res.status(200).json(new ApiResponse(200,addtoPlaylist,"Video added to playlist"))
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist
    if(!(isValidObjectId(playlistId) || isValidObjectId(videoId))) throw new ApiError(401,"Invalid videoid or playlistid")

    const video = await Video.findById(videoId)
    if(!video) throw new ApiError(404,"Video not found")

    const playlist = await Playlist.findById(playlistId)
    if(!playlist) throw new ApiError(404,"Playlist not found")

    const isVideoInPlaylist = await Playlist.findOne({
        _id: playlistId,
        videos: videoId
    })

    if (!isVideoInPlaylist) throw new ApiError(404, "Video not found in playlist");

    const removefromPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull:{
                videos:videoId
            }
        },
        {
            new:true
        }
    )
    if(!removefromPlaylist) throw new ApiError(500,"Something went wrong while removing video from playlist")
    return res.status(200).json(new ApiResponse(200,addtoPlaylist,"Video removed from playlist"))

})

const deletePlaylist = asyncHandler(async (req, res) => {
    // TODO: delete playlist
    const { playlistId } = req.params;
    if (!isValidObjectId(playlistId)) throw new ApiError(401, "Invalid playlist Id");

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) throw new ApiError(404, "playlist not found");

    const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId);
    if (!deletedPlaylist) throw new ApiError(500, "playlist not deleted");
    return res.status(200)
        .json(new ApiResponse(
            200,
            deletedPlaylist,
            "Playlist deleted successfully"
        ))
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist
    if (!isValidObjectId(playlistId)) throw new ApiError(401, "Invalid playlist Id");

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) throw new ApiError(404, "playlist not found");

    if (!(name || description) || !(name?.trim() !== "" || description?.trim() !== "")) throw new ApiError(400, "name or description required");

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set: {
                name,
                description
            }
        },
        {
            new: true
        }
    )
    if (!updatedPlaylist) throw new ApiError(500, "playlist not updated");
    return res.status(200)
        .json(new ApiResponse(
            200,
            updatedPlaylist,
            "Playlist updated successfully"
        ))
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}