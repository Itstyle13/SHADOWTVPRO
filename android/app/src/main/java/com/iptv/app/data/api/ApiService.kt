package com.iptv.app.data.api

import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

data class LoginRequest(val username: String, val password: String)
data class LoginResponse(val token: String, val user_info: UserInfo, val server_info: ServerInfo)
data class UserInfo(val username: String, val status: String, val exp_date: String)
data class ServerInfo(val url: String, val port: String)

interface ApiService {
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @GET("api/categories/{type}")
    suspend fun getCategories(@Path("type") type: String): Response<List<Any>>
    
    suspend fun getStreams(
        @Path("type") type: String,
        @Query("category_id") categoryId: String?
    ): Response<List<Any>>

    @GET("api/series/{id}")
    suspend fun getSeriesInfo(@Path("id") id: String): Response<Any>
}
