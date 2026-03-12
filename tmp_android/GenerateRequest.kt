package com.aijoboutreach.api.models

data class ExtractImageRequest(
    val imageBase64: String,
    val mimeType: String = "image/jpeg"
)

data class GenerateEmailRequest(
    val profileId: String = "auto",
    val company: String,
    val role: String,
    val jobDescription: String,
    val recruiterName: String? = null,
    val multiAgent: Boolean = true
)

data class TranslateRequest(
    val imageBase64: String,
    val mimeType: String = "image/jpeg",
    val targetLanguage: String = "English",
    val includeReplyOptions: Boolean = true
)

data class AskScreenRequest(
    val imageBase64: String,
    val mimeType: String = "image/jpeg",
    val question: String
)

data class SaveApplicationRequest(
    val company: String,
    val role: String,
    val hrEmail: String? = null,
    val jobDescription: String? = null,
    val mailSubject: String? = null,
    val mailBody: String? = null,
    val profileId: String? = null,
    val sourceUrl: String? = null,
    val followupAt: String? = null
)

data class SendEmailRequest(
    val applicationId: String,
    val to: String,
    val subject: String,
    val body: String,
    val attachmentId: String? = null,
    val emailType: String = "OUTREACH"
)

data class SaveDraftRequest(
    val applicationId: String,
    val subject: String,
    val body: String,
    val emailType: String = "OUTREACH"
)

data class SaveTemplateRequest(
    val name: String,
    val subject: String,
    val body: String
)

data class UpdateAttachmentRequest(
    val isActive: Boolean
)
