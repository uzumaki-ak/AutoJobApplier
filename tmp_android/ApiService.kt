package com.aijoboutreach.api

import com.aijoboutreach.api.models.*
import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Part
import retrofit2.http.Path

interface ApiService {

    @POST("/api/extract/image")
    suspend fun extractFromImage(
        @Body request: ExtractImageRequest
    ): ApiResponse<ExtractedJobData>

    @POST("/api/extract/url")
    suspend fun extractFromUrl(
        @Body request: Map<String, String>
    ): ApiResponse<ExtractedJobData>

    @POST("/api/generate/email")
    suspend fun generateEmail(
        @Body request: GenerateEmailRequest
    ): ApiResponse<GeneratedEmailData>

    @GET("/api/profiles")
    suspend fun getProfiles(): ApiResponse<List<ProfileData>>

    @POST("/api/applications")
    suspend fun saveApplication(
        @Body request: SaveApplicationRequest
    ): ApiResponse<SavedApplicationData>

    @GET("/api/applications")
    suspend fun getApplications(): ApiResponse<List<ApplicationData>>

    @POST("/api/emails/draft")
    suspend fun saveDraft(
        @Body request: SaveDraftRequest
    ): ApiResponse<DraftEmailData>

    @POST("/api/email-templates")
    suspend fun saveTemplate(
        @Body request: SaveTemplateRequest
    ): ApiResponse<EmailTemplateData>

    @POST("/api/gmail/send")
    suspend fun sendEmail(
        @Body request: SendEmailRequest
    ): ApiResponse<SentEmailData>

    @Multipart
    @POST("/api/profiles/import")
    suspend fun importResumeFile(
        @Part file: MultipartBody.Part,
        @Part("isDefault") isDefault: RequestBody? = null
    ): ApiResponse<ProfileData>

    @GET("/api/attachments")
    suspend fun getAttachments(): ApiResponse<List<AttachmentData>>

    @Multipart
    @POST("/api/attachments")
    suspend fun uploadAttachment(
        @Part file: MultipartBody.Part,
        @Part("isActive") isActive: RequestBody? = null,
        @Part("linkedProfileId") linkedProfileId: RequestBody? = null
    ): ApiResponse<AttachmentData>

    @PATCH("/api/attachments/{id}")
    suspend fun updateAttachment(
        @Path("id") id: String,
        @Body request: UpdateAttachmentRequest
    ): ApiResponse<AttachmentData>

    @DELETE("/api/attachments/{id}")
    suspend fun deleteAttachment(
        @Path("id") id: String
    ): ApiResponse<AttachmentData>

    @POST("/api/extract/image")
    suspend fun translateScreen(
        @Body request: TranslateRequest
    ): ApiResponse<TranslationData>

    @POST("/api/extract/image")
    suspend fun askAboutScreen(
        @Body request: AskScreenRequest
    ): ApiResponse<AskAnswerData>
}
