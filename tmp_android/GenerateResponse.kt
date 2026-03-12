package com.aijoboutreach.api.models

data class ApiResponse<T>(
    val success: Boolean,
    val data: T? = null,
    val error: String? = null
)

data class ExtractedJobData(
    val company: String = "",
    val role: String = "",
    val hrEmail: String? = null,
    val recruiterName: String? = null,
    val jobDescription: String = "",
    val location: String? = null,
    val skills: List<String> = emptyList()
)

data class GeneratedEmailData(
    val subject: String,
    val body: String,
    val usedProfileId: String,
    val usedProfileName: String,
    val autoSelectedReason: String = ""
)

data class ApplicationData(
    val id: String,
    val company: String,
    val role: String,
    val status: String,
    val mailSubject: String? = null,
    val mailBody: String? = null,
    val hrEmail: String? = null,
    val profileId: String? = null,
    val createdAt: String? = null
)

data class ProfileData(
    val id: String,
    val name: String,
    val title: String,
    val skills: List<String>,
    val isDefault: Boolean,
    val tonePreference: String
)

data class SavedApplicationData(
    val id: String
)

data class DraftEmailData(
    val id: String
)

data class SentEmailData(
    val messageId: String
)

data class EmailTemplateData(
    val id: String,
    val name: String,
    val subject: String,
    val body: String
)

data class TranslationData(
    val originalText: String = "",
    val translatedText: String = "",
    val detectedLanguage: String = "",
    val suggestedReply: String? = null,
    val replyInOriginalLang: String? = null
)

data class AskAnswerData(
    val question: String = "",
    val answer: String = ""
)

data class AttachmentData(
    val id: String,
    val fileName: String,
    val mimeType: String,
    val sizeBytes: Long = 0,
    val isActive: Boolean = true,
    val linkedProfileId: String? = null,
    val createdAt: String = ""
)
