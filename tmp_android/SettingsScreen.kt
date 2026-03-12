package com.aijoboutreach.ui.screens

import android.net.Uri
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
import androidx.compose.material.icons.filled.AttachFile
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.documentfile.provider.DocumentFile
import com.aijoboutreach.api.ApiClient
import com.aijoboutreach.api.models.AttachmentData
import com.aijoboutreach.api.models.UpdateAttachmentRequest
import com.aijoboutreach.utils.DataStoreManager
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(onBack: () -> Unit, onLogout: () -> Unit) {
    val context = LocalContext.current
    val dsManager = remember { DataStoreManager(context) }
    val scope = rememberCoroutineScope()

    val userEmail by dsManager.userEmail.collectAsState(initial = "")
    val userName by dsManager.userName.collectAsState(initial = "")
    val apiUrl by dsManager.apiUrl.collectAsState(initial = "")

    var editApiUrl by remember { mutableStateOf("") }
    var urlSaved by remember { mutableStateOf(false) }
    var showLogoutDialog by remember { mutableStateOf(false) }

    var resumeUploading by remember { mutableStateOf(false) }
    var resumeStatus by remember { mutableStateOf<String?>(null) }

    var attachments by remember { mutableStateOf<List<AttachmentData>>(emptyList()) }
    var attachmentsLoading by remember { mutableStateOf(false) }
    var attachmentUploading by remember { mutableStateOf(false) }
    var attachmentStatus by remember { mutableStateOf<String?>(null) }
    var busyAttachmentId by remember { mutableStateOf<String?>(null) }

    suspend fun refreshAttachments() {
        val apiUrlValue = dsManager.getApiUrl()
        val apiKey = dsManager.getApiKey()
        if (apiUrlValue.isBlank()) {
            attachments = emptyList()
            return
        }

        attachmentsLoading = true
        try {
            val res = ApiClient.buildService(apiUrlValue, apiKey).getAttachments()
            if (res.success && res.data != null) {
                attachments = res.data
            } else {
                attachmentStatus = res.error ?: "Could not load attachments"
            }
        } catch (e: Exception) {
            attachmentStatus = "Could not load attachments: ${e.message}"
        } finally {
            attachmentsLoading = false
        }
    }

    suspend fun autoAttachPdf(
        apiUrlValue: String,
        apiKey: String,
        fileName: String,
        bytes: ByteArray,
        linkedProfileId: String? = null
    ): String? {
        val service = ApiClient.buildService(apiUrlValue, apiKey)
        val existingRes = service.getAttachments()
        if (existingRes.success && existingRes.data != null) {
            existingRes.data
                .filter { it.fileName.equals(fileName, ignoreCase = true) }
                .forEach { service.deleteAttachment(it.id) }
        }

        val mediaType = "application/pdf".toMediaType()
        val body = bytes.toRequestBody(mediaType)
        val part = MultipartBody.Part.createFormData("file", fileName, body)
        val activeBody = "true".toRequestBody("text/plain".toMediaType())
        val profileBody = linkedProfileId
            ?.takeIf { it.isNotBlank() }
            ?.toRequestBody("text/plain".toMediaType())
        val uploadRes = service.uploadAttachment(part, activeBody, profileBody)
        return if (uploadRes.success) null else (uploadRes.error ?: "Attachment upload failed")
    }

    val resumePicker = rememberLauncherForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            scope.launch {
                resumeUploading = true
                resumeStatus = null
                try {
                    val apiUrlValue = dsManager.getApiUrl()
                    val apiKey = dsManager.getApiKey()
                    val bytes = context.contentResolver.openInputStream(it)?.use { stream -> stream.readBytes() }
                    if (bytes == null) {
                        resumeStatus = "Could not read resume file"
                    } else {
                        val fileName = DocumentFile.fromSingleUri(context, it)?.name ?: "resume.pdf"
                        val mediaType = "application/pdf".toMediaType()
                        val body = bytes.toRequestBody(mediaType)
                        val part = MultipartBody.Part.createFormData("file", fileName, body)
                        val isDefault = "true".toRequestBody("text/plain".toMediaType())
                        val res = ApiClient.buildService(apiUrlValue, apiKey).importResumeFile(part, isDefault)
                        if (res.success) {
                            val attachmentError = autoAttachPdf(apiUrlValue, apiKey, fileName, bytes, res.data?.id)
                            refreshAttachments()
                            resumeStatus = if (attachmentError == null) {
                                "Resume imported and ready to preselect in Send Now"
                            } else {
                                "Resume imported, but resume selection setup failed: $attachmentError"
                            }
                        } else {
                            resumeStatus = res.error ?: "Import failed"
                        }
                    }
                } catch (e: Exception) {
                    resumeStatus = "Import failed: ${e.message}"
                } finally {
                    resumeUploading = false
                }
            }
        }
    }

    val attachmentPicker = rememberLauncherForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            scope.launch {
                attachmentUploading = true
                attachmentStatus = null
                try {
                    val apiUrlValue = dsManager.getApiUrl()
                    val apiKey = dsManager.getApiKey()
                    val bytes = context.contentResolver.openInputStream(it)?.use { stream -> stream.readBytes() }
                    if (bytes == null) {
                        attachmentStatus = "Could not read attachment file"
                    } else {
                        val fileName = DocumentFile.fromSingleUri(context, it)?.name ?: "attachment.pdf"
                        val mediaType = "application/pdf".toMediaType()
                        val body = bytes.toRequestBody(mediaType)
                        val part = MultipartBody.Part.createFormData("file", fileName, body)
                        val activeBody = "true".toRequestBody("text/plain".toMediaType())
                        val res = ApiClient.buildService(apiUrlValue, apiKey).uploadAttachment(part, activeBody, null)
                        if (res.success) {
                            attachmentStatus = "Attachment uploaded. Select it from the email preview when needed."
                            refreshAttachments()
                        } else {
                            attachmentStatus = res.error ?: "Attachment upload failed"
                        }
                    }
                } catch (e: Exception) {
                    attachmentStatus = "Attachment upload failed: ${e.message}"
                } finally {
                    attachmentUploading = false
                }
            }
        }
    }

    LaunchedEffect(apiUrl) {
        if (editApiUrl.isBlank()) {
            editApiUrl = apiUrl
        }
        if (apiUrl.isNotBlank()) {
            refreshAttachments()
        }
    }

    Scaffold(
        containerColor = Color(0xFF050505),
        topBar = {
            TopAppBar(
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent),
                title = {
                    Text(
                        "SETTINGS",
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
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Color.White)
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
                .padding(horizontal = 20.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            SectionLabel("ACCOUNT")
            GlassCard {
                Row(
                    modifier = Modifier.padding(20.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(56.dp)
                            .clip(CircleShape)
                            .background(Color(0x1AFFFFFF)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.Person,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(28.dp)
                        )
                    }
                    Column {
                        Text(
                            userName ?: "User",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color.White
                        )
                        Text(
                            userEmail ?: "Not connected",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFF8E8E93)
                        )
                    }
                }
            }

            SectionLabel("CONNECTION")
            GlassCard {
                Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Column {
                        Text(
                            "APP URL",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFFA0A0A0)
                        )
                        Spacer(Modifier.height(8.dp))
                        OutlinedTextField(
                            value = editApiUrl,
                            onValueChange = {
                                editApiUrl = it
                                urlSaved = false
                            },
                            modifier = Modifier.fillMaxWidth(),
                            placeholder = { Text("https://your-app.vercel.app", color = Color(0x4DFFFFFF)) },
                            shape = RoundedCornerShape(16.dp),
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = MaterialTheme.colorScheme.primary,
                                unfocusedBorderColor = Color(0x1AFFFFFF),
                                focusedContainerColor = Color(0x1AFFFFFF),
                                unfocusedContainerColor = Color(0x0DFFFFFF),
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White
                            )
                        )
                    }

                    Button(
                        onClick = {
                            scope.launch {
                                dsManager.saveApiUrl(editApiUrl.trim())
                                urlSaved = true
                                refreshAttachments()
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        shape = RoundedCornerShape(26.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (urlSaved) Color(0xFF34C759) else MaterialTheme.colorScheme.primary
                        )
                    ) {
                        Text(if (urlSaved) "SAVED" else "SAVE URL", fontWeight = FontWeight.Black)
                    }
                }
            }

            SectionLabel("RESUME IMPORT")
            GlassCard {
                Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Text(
                        "Upload your latest resume PDF to refresh the AI profile. That same PDF will be preselected in the email preview when it matches the chosen profile.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFF8E8E93)
                    )
                    Button(
                        onClick = { resumePicker.launch("application/pdf") },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        shape = RoundedCornerShape(26.dp),
                        enabled = !resumeUploading
                    ) {
                        if (resumeUploading) {
                            androidx.compose.material3.CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                color = Color.Black,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Text("UPLOAD RESUME PDF", fontWeight = FontWeight.Black)
                        }
                    }
                    resumeStatus?.let {
                        Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                    }
                }
            }

            SectionLabel("EMAIL ATTACHMENTS")
            GlassCard {
                Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Text(
                        "Upload PDFs once, then choose exactly one in the email preview before sending. Matching resumes are preselected automatically when possible.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFF8E8E93)
                    )

                    Button(
                        onClick = { attachmentPicker.launch("application/pdf") },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        shape = RoundedCornerShape(26.dp),
                        enabled = !attachmentUploading
                    ) {
                        if (attachmentUploading) {
                            androidx.compose.material3.CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                color = Color.Black,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Text("UPLOAD ATTACHMENT PDF", fontWeight = FontWeight.Black)
                        }
                    }

                    if (attachmentsLoading) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.Center
                        ) {
                            androidx.compose.material3.CircularProgressIndicator(
                                modifier = Modifier.size(22.dp),
                                color = MaterialTheme.colorScheme.primary,
                                strokeWidth = 2.dp
                            )
                        }
                    } else if (attachments.isEmpty()) {
                        Text(
                            "No stored attachments yet.",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFF8E8E93)
                        )
                    } else {
                        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            attachments.forEach { attachment ->
                                Surface(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .border(1.dp, Color(0x1AFFFFFF), RoundedCornerShape(20.dp)),
                                    color = Color(0x0DFFFFFF),
                                    shape = RoundedCornerShape(20.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.padding(14.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(42.dp)
                                                .clip(CircleShape)
                                                .background(
                                                    if (attachment.isActive) MaterialTheme.colorScheme.primary.copy(alpha = 0.18f)
                                                    else Color(0x1AFFFFFF)
                                                ),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Icon(
                                                Icons.Default.AttachFile,
                                                contentDescription = null,
                                                tint = if (attachment.isActive) MaterialTheme.colorScheme.primary else Color(0xFF8E8E93)
                                            )
                                        }

                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                attachment.fileName,
                                                color = Color.White,
                                                fontWeight = FontWeight.Bold,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                            Text(
                                                "${formatBytes(attachment.sizeBytes)} - ${if (attachment.isActive) "Available in picker" else "Hidden from picker"}",
                                                color = Color(0xFF8E8E93),
                                                fontSize = 12.sp
                                            )
                                        }

                                        Switch(
                                            checked = attachment.isActive,
                                            enabled = busyAttachmentId == null,
                                            onCheckedChange = { checked ->
                                                scope.launch {
                                                    busyAttachmentId = attachment.id
                                                    try {
                                                        val apiUrlValue = dsManager.getApiUrl()
                                                        val apiKey = dsManager.getApiKey()
                                                        val res = ApiClient.buildService(apiUrlValue, apiKey)
                                                            .updateAttachment(attachment.id, UpdateAttachmentRequest(checked))
                                                        if (!res.success) {
                                                            attachmentStatus = res.error ?: "Could not update attachment"
                                                        }
                                                        refreshAttachments()
                                                    } catch (e: Exception) {
                                                        attachmentStatus = "Could not update attachment: ${e.message}"
                                                    } finally {
                                                        busyAttachmentId = null
                                                    }
                                                }
                                            }
                                        )

                                        IconButton(
                                            onClick = {
                                                scope.launch {
                                                    busyAttachmentId = attachment.id
                                                    try {
                                                        val apiUrlValue = dsManager.getApiUrl()
                                                        val apiKey = dsManager.getApiKey()
                                                        val res = ApiClient.buildService(apiUrlValue, apiKey).deleteAttachment(attachment.id)
                                                        if (res.success) {
                                                            attachmentStatus = "Attachment removed"
                                                        } else {
                                                            attachmentStatus = res.error ?: "Could not remove attachment"
                                                        }
                                                        refreshAttachments()
                                                    } catch (e: Exception) {
                                                        attachmentStatus = "Could not remove attachment: ${e.message}"
                                                    } finally {
                                                        busyAttachmentId = null
                                                    }
                                                }
                                            },
                                            enabled = busyAttachmentId == null
                                        ) {
                                            Icon(
                                                Icons.Default.DeleteOutline,
                                                contentDescription = "Delete attachment",
                                                tint = Color(0xFFFF8C00)
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    attachmentStatus?.let {
                        Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                    }
                }
            }

            SectionLabel("APP INFO")
            GlassCard {
                Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    SettingRow("Version", "1.0.0")
                    SettingRow("Engine", "LLaMA 3.3 and Gemini")
                    SettingRow("Status", "Pro Account")
                }
            }

            Button(
                onClick = { showLogoutDialog = true },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                shape = RoundedCornerShape(28.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0x1AFF453A))
            ) {
                Text("SIGN OUT AND RESET", color = Color(0xFFFF453A), fontWeight = FontWeight.Black)
            }

            Spacer(Modifier.height(40.dp))
        }
    }

    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            containerColor = Color(0xFF1C1C1E),
            title = { Text("Sign Out?", color = Color.White) },
            text = { Text("This will clear your connection and local cache.", color = Color(0xFF8E8E93)) },
            confirmButton = {
                TextButton(onClick = {
                    showLogoutDialog = false
                    onLogout()
                }) {
                    Text("SIGN OUT", color = Color(0xFFFF453A), fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) {
                    Text("CANCEL", color = Color.White)
                }
            }
        )
    }
}

@Composable
private fun SectionLabel(text: String) {
    Text(
        text,
        style = MaterialTheme.typography.labelLarge,
        fontWeight = FontWeight.Bold,
        color = Color(0xFF8E8E93),
        modifier = Modifier.padding(start = 4.dp)
    )
}

@Composable
private fun GlassCard(content: @Composable ColumnScope.() -> Unit) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, Color(0x1AFFFFFF), RoundedCornerShape(32.dp)),
        color = Color(0x0DFFFFFF),
        shape = RoundedCornerShape(32.dp),
        content = { Column(content = content) }
    )
}

@Composable
private fun SettingRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, color = Color(0xFF8E8E93), fontSize = 14.sp)
        Text(value, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
    }
}

private fun formatBytes(bytes: Long): String {
    if (bytes <= 0) return "0 KB"
    val kb = bytes / 1024.0
    return if (kb >= 1024) {
        String.format("%.1f MB", kb / 1024.0)
    } else {
        String.format("%.0f KB", kb)
    }
}
