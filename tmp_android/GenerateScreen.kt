package com.aijoboutreach.ui.screens

import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.aijoboutreach.api.ApiClient
import com.aijoboutreach.api.models.*
import com.aijoboutreach.ui.components.EmailPreviewSheet
import com.aijoboutreach.ui.components.ProfileDropdown
import com.aijoboutreach.utils.BitmapUtils
import com.aijoboutreach.utils.DataStoreManager
import com.aijoboutreach.utils.ImageUtils
import kotlinx.coroutines.launch
import timber.log.Timber

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GenerateScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val dsManager = remember { DataStoreManager(context) }
    val scope = rememberCoroutineScope()

    var profiles by remember { mutableStateOf<List<ProfileData>>(emptyList()) }
    var selectedProfileId by remember { mutableStateOf("auto") }
    var company by remember { mutableStateOf("") }
    var role by remember { mutableStateOf("") }
    var hrEmail by remember { mutableStateOf("") }
    var recruiterName by remember { mutableStateOf("") }
    var jobDescription by remember { mutableStateOf("") }
    var imageUri by remember { mutableStateOf<Uri?>(null) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var generatedEmail by remember { mutableStateOf<GeneratedEmailData?>(null) }
    var activeAttachments by remember { mutableStateOf<List<AttachmentData>>(emptyList()) }

    var isSaving by remember { mutableStateOf(false) }
    var isSending by remember { mutableStateOf(false) }
    var isSavingDraft by remember { mutableStateOf(false) }
    var isSavingTemplate by remember { mutableStateOf(false) }
    var isSaved by remember { mutableStateOf(false) }
    var applicationId by remember { mutableStateOf<String?>(null) }

    var inputMode by remember { mutableStateOf("text") }

    suspend fun fetchActiveAttachments(): List<AttachmentData> {
        return try {
            val apiUrl = dsManager.getApiUrl()
            val apiKey = dsManager.getApiKey()
            val res = ApiClient.buildService(apiUrl, apiKey).getAttachments()
            if (res.success && res.data != null) {
                res.data.filter { it.isActive }
            } else {
                emptyList()
            }
        } catch (_: Exception) {
            emptyList()
        }
    }

    fun pickDefaultAttachmentId(profileId: String?, attachments: List<AttachmentData>): String? {
        if (attachments.isEmpty()) return null
        val matching = profileId?.let { id ->
            attachments.firstOrNull { it.linkedProfileId == id }?.id
        }
        return matching ?: if (attachments.size == 1) attachments.first().id else null
    }

    suspend fun ensureSavedApplication(email: GeneratedEmailData, subject: String, body: String, to: String): String? {
        if (applicationId != null) return applicationId

        return try {
            val apiUrl = dsManager.getApiUrl()
            val apiKey = dsManager.getApiKey()
            val res = ApiClient.buildService(apiUrl, apiKey).saveApplication(
                SaveApplicationRequest(
                    company = company,
                    role = role,
                    hrEmail = to,
                    jobDescription = jobDescription,
                    mailSubject = subject,
                    mailBody = body,
                    profileId = if (email.usedProfileId.length > 10) email.usedProfileId else null
                )
            )
            if (res.success && res.data != null) {
                applicationId = res.data.id
                isSaved = true
                res.data.id
            } else {
                Toast.makeText(context, res.error ?: "Save failed", Toast.LENGTH_LONG).show()
                null
            }
        } catch (e: Exception) {
            Toast.makeText(context, "Save failed: ${e.message}", Toast.LENGTH_LONG).show()
            null
        }
    }

    val imagePicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let {
            imageUri = it
            scope.launch {
                loading = true
                try {
                    val bitmap = ImageUtils.uriToBitmap(context, it)
                    if (bitmap != null) {
                        val base64 = BitmapUtils.toBase64(bitmap)
                        val apiUrl = dsManager.getApiUrl()
                        val apiKey = dsManager.getApiKey()
                        val res = ApiClient.buildService(apiUrl, apiKey).extractFromImage(
                            ExtractImageRequest(imageBase64 = base64, mimeType = "image/jpeg")
                        )
                        if (res.success && res.data != null) {
                            company = res.data.company
                            role = res.data.role
                            hrEmail = res.data.hrEmail ?: ""
                            recruiterName = res.data.recruiterName ?: ""
                            jobDescription = res.data.jobDescription
                            inputMode = "text"
                        } else {
                            error = res.error ?: "Extraction failed"
                        }
                    }
                } catch (e: Exception) {
                    error = "Image processing error"
                    Timber.e(e)
                } finally {
                    loading = false
                }
            }
        }
    }

    LaunchedEffect(Unit) {
        try {
            val res = ApiClient.buildService(dsManager.getApiUrl(), dsManager.getApiKey()).getProfiles()
            if (res.success && res.data != null) {
                profiles = res.data
                profiles.find { it.isDefault }?.let { selectedProfileId = it.id }
            }
        } catch (_: Exception) {
        }
    }

    LaunchedEffect(generatedEmail) {
        activeAttachments = if (generatedEmail != null) fetchActiveAttachments() else emptyList()
    }

    Scaffold(
        containerColor = Color(0xFF050505),
        topBar = {
            TopAppBar(
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent),
                title = {
                    Text(
                        "GENERATE OUTREACH",
                        style = MaterialTheme.typography.labelLarge.copy(letterSpacing = 1.sp),
                        color = Color.White
                    )
                },
                navigationIcon = {
                    IconButton(
                        onClick = onBack,
                        modifier = Modifier
                            .padding(start = 8.dp)
                            .clip(CircleShape)
                            .background(Color(0x1AFFFFFF))
                    ) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = Color.White)
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, Color(0x1AFFFFFF), RoundedCornerShape(32.dp)),
                color = Color(0x0DFFFFFF),
                shape = RoundedCornerShape(32.dp)
            ) {
                Row(Modifier.padding(6.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    listOf("text" to "TEXT", "image" to "IMAGE").forEach { (mode, label) ->
                        val active = inputMode == mode
                        Surface(
                            onClick = { inputMode = mode },
                            modifier = Modifier.weight(1f),
                            color = if (active) MaterialTheme.colorScheme.primary else Color.Transparent,
                            shape = RoundedCornerShape(28.dp)
                        ) {
                            Text(
                                label,
                                modifier = Modifier.padding(12.dp),
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                fontWeight = FontWeight.Black,
                                fontSize = 12.sp,
                                color = if (active) Color.Black else Color.White
                            )
                        }
                    }
                }
            }

            if (inputMode == "image") {
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, Color(0x1AFFFFFF), RoundedCornerShape(32.dp)),
                    color = Color(0x0DFFFFFF),
                    shape = RoundedCornerShape(32.dp)
                ) {
                    Column(
                        Modifier.padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        if (imageUri != null) {
                            AsyncImage(
                                model = imageUri,
                                contentDescription = null,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(180.dp)
                                    .clip(RoundedCornerShape(20.dp))
                            )
                        } else {
                            Text("Pick a job screenshot", color = Color(0xFF8E8E93))
                        }
                        Button(onClick = { imagePicker.launch("image/*") }, shape = RoundedCornerShape(20.dp)) {
                            Text(if (imageUri != null) "CHANGE IMAGE" else "SELECT FROM GALLERY", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            if (inputMode == "text" || company.isNotBlank()) {
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, Color(0x1AFFFFFF), RoundedCornerShape(32.dp)),
                    color = Color(0x0DFFFFFF),
                    shape = RoundedCornerShape(32.dp)
                ) {
                    Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        GlassField(value = company, onValueChange = { company = it }, label = "COMPANY")
                        GlassField(value = role, onValueChange = { role = it }, label = "ROLE")
                        GlassField(value = hrEmail, onValueChange = { hrEmail = it }, label = "RECRUITER EMAIL")
                        GlassField(value = jobDescription, onValueChange = { jobDescription = it }, label = "JOB DESCRIPTION", minLines = 4)
                    }
                }
            }

            if (profiles.isNotEmpty()) {
                Text("SENDER PROFILE", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, color = Color(0xFF8E8E93))
                ProfileDropdown(profiles = profiles, selectedId = selectedProfileId, onSelect = { selectedProfileId = it })
            }

            if (error.isNotBlank()) {
                Surface(Modifier.fillMaxWidth(), color = Color(0x33FF453A), shape = RoundedCornerShape(16.dp)) {
                    Text(error, modifier = Modifier.padding(16.dp), color = Color(0xFFFF453A), fontSize = 12.sp)
                }
            }

            Button(
                onClick = {
                    if (jobDescription.isBlank()) {
                        error = "Add job details first"
                        return@Button
                    }
                    error = ""
                    scope.launch {
                        loading = true
                        try {
                            val res = ApiClient.buildService(dsManager.getApiUrl(), dsManager.getApiKey()).generateEmail(
                                GenerateEmailRequest(
                                    selectedProfileId,
                                    company.ifBlank { "Hiring Team" },
                                    role.ifBlank { "Candidate" },
                                    jobDescription,
                                    recruiterName
                                )
                            )
                            if (res.success && res.data != null) {
                                generatedEmail = res.data
                                isSaved = false
                                applicationId = null
                            } else {
                                error = res.error ?: "Generation failed"
                            }
                        } catch (_: Exception) {
                            error = "Network error"
                        } finally {
                            loading = false
                        }
                    }
                },
                enabled = !loading,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(64.dp),
                shape = RoundedCornerShape(32.dp)
            ) {
                if (loading) {
                    CircularProgressIndicator(24.dp, Color.Black, 2.dp)
                } else {
                    Text("GENERATE EMAIL", fontWeight = FontWeight.Black, letterSpacing = 1.sp)
                }
            }

            Spacer(Modifier.height(40.dp))
        }
    }

    generatedEmail?.let { email ->
        EmailPreviewSheet(
            email = email,
            hrEmail = hrEmail,
            isSaving = isSaving,
            isSending = isSending,
            isSavingDraft = isSavingDraft,
            isSavingTemplate = isSavingTemplate,
            isSaved = isSaved,
            attachments = activeAttachments,
            initialSelectedAttachmentId = pickDefaultAttachmentId(email.usedProfileId, activeAttachments),
            onDismiss = { generatedEmail = null },
            onSave = { subj, body, to ->
                scope.launch {
                    isSaving = true
                    try {
                        ensureSavedApplication(email, subj, body, to)
                    } finally {
                        isSaving = false
                    }
                }
            },
            onSendNow = { subj, body, to, attachmentId ->
                scope.launch {
                    isSending = true
                    try {
                        val appId = ensureSavedApplication(email, subj, body, to)
                        if (appId != null) {
                            val res = ApiClient.buildService(dsManager.getApiUrl(), dsManager.getApiKey())
                                .sendEmail(SendEmailRequest(appId, to, subj, body, attachmentId = attachmentId))
                            if (res.success) {
                                Toast.makeText(context, "Email sent", Toast.LENGTH_SHORT).show()
                                generatedEmail = null
                            } else {
                                Toast.makeText(context, res.error ?: "Send failed", Toast.LENGTH_LONG).show()
                            }
                        }
                    } catch (e: Exception) {
                        Toast.makeText(context, "Send failed: ${e.message}", Toast.LENGTH_LONG).show()
                    } finally {
                        isSending = false
                    }
                }
            },
            onSaveDraft = { subj, body ->
                scope.launch {
                    isSavingDraft = true
                    try {
                        val appId = ensureSavedApplication(email, subj, body, hrEmail)
                        if (appId != null) {
                            ApiClient.buildService(dsManager.getApiUrl(), dsManager.getApiKey())
                                .saveDraft(SaveDraftRequest(appId, subj, body))
                            Toast.makeText(context, "Draft saved", Toast.LENGTH_SHORT).show()
                        }
                    } catch (e: Exception) {
                        Toast.makeText(context, "Draft save failed: ${e.message}", Toast.LENGTH_LONG).show()
                    } finally {
                        isSavingDraft = false
                    }
                }
            },
            onSaveTemplate = { subj, body ->
                scope.launch {
                    isSavingTemplate = true
                    try {
                        val apiUrl = dsManager.getApiUrl()
                        val apiKey = dsManager.getApiKey()
                        ApiClient.buildService(apiUrl, apiKey).saveTemplate(
                            SaveTemplateRequest("Template: ${company.ifBlank { "Application" }}", subj, body)
                        )
                        Toast.makeText(context, "Template saved", Toast.LENGTH_SHORT).show()
                    } catch (e: Exception) {
                        Toast.makeText(context, "Template save failed: ${e.message}", Toast.LENGTH_LONG).show()
                    } finally {
                        isSavingTemplate = false
                    }
                }
            }
        )
    }
}

@Composable
fun GlassField(value: String, onValueChange: (String) -> Unit, label: String, minLines: Int = 1) {
    Column {
        Text(label, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Black, color = Color(0xFFA0A0A0))
        Spacer(Modifier.height(6.dp))
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = MaterialTheme.colorScheme.primary,
                unfocusedBorderColor = Color(0x1AFFFFFF),
                focusedContainerColor = Color(0x1AFFFFFF),
                unfocusedContainerColor = Color(0x0DFFFFFF)
            ),
            minLines = minLines
        )
    }
}
