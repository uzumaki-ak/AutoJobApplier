package com.aijoboutreach.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Work
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aijoboutreach.api.ApiClient
import com.aijoboutreach.api.models.*
import com.aijoboutreach.ui.components.EmailPreviewSheet
import com.aijoboutreach.utils.DataStoreManager
import kotlinx.coroutines.launch
import timber.log.Timber

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TrackerScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val dsManager = remember { DataStoreManager(context) }
    val scope = rememberCoroutineScope()

    var apps by remember { mutableStateOf<List<ApplicationData>>(emptyList()) }
    var isRefreshing by remember { mutableStateOf(false) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf("") }
    
    var selectedApp by remember { mutableStateOf<ApplicationData?>(null) }
    var activeAttachments by remember { mutableStateOf<List<AttachmentData>>(emptyList()) }
    
    var isSending by remember { mutableStateOf(false) }
    var isSavingDraft by remember { mutableStateOf(false) }
    var isSavingTemplate by remember { mutableStateOf(false) }

    val loadApps = {
        scope.launch {
            isRefreshing = true
            error = ""
            try {
                val apiUrl = dsManager.getApiUrl()
                val apiKey = dsManager.getApiKey()
                val res = ApiClient.buildService(apiUrl, apiKey).getApplications()
                if (res.success && res.data != null) {
                    apps = res.data
                } else {
                    error = res.error ?: "Failed to load"
                }
            } catch (e: Exception) {
                error = "Connection failed"
                Timber.e(e)
            } finally {
                loading = false
                isRefreshing = false
            }
        }
    }

    LaunchedEffect(Unit) { loadApps() }
    LaunchedEffect(selectedApp?.id) {
        if (selectedApp == null) {
            activeAttachments = emptyList()
        } else {
            activeAttachments = try {
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
    }

    fun pickDefaultAttachmentId(app: ApplicationData?, attachments: List<AttachmentData>): String? {
        if (app == null || attachments.isEmpty()) return if (attachments.size == 1) attachments.first().id else null
        val matching = app.profileId?.let { profileId ->
            attachments.firstOrNull { it.linkedProfileId == profileId }?.id
        }
        return matching ?: if (attachments.size == 1) attachments.first().id else null
    }

    Scaffold(
        containerColor = Color(0xFF050505),
        topBar = {
            TopAppBar(
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent),
                title = { 
                    Text("MY APPLICATIONS", style = MaterialTheme.typography.labelLarge.copy(letterSpacing = 1.sp), color = Color.White) 
                },
                navigationIcon = {
                    IconButton(
                        onClick = onBack,
                        modifier = Modifier.padding(start = 8.dp).clip(CircleShape).background(Color(0x1AFFFFFF))
                    ) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = Color.White) }
                },
                actions = {
                    IconButton(
                        onClick = { loadApps() },
                        modifier = Modifier.padding(end = 8.dp).clip(CircleShape).background(Color(0x1AFFFFFF))
                    ) { Icon(Icons.Default.Refresh, "Refresh", tint = Color.White) }
                }
            )
        }
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = isRefreshing,
            onRefresh = { loadApps() },
            modifier = Modifier.fillMaxSize().padding(padding)
        ) {
            if (loading && apps.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = MaterialTheme.colorScheme.primary) }
            } else if (error.isNotBlank() && apps.isEmpty()) {
                Box(Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) { Text(error, color = Color(0xFFFF453A)) }
            } else if (apps.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text("No applications found.", color = Color(0xFF8E8E93)) }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(20.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    items(apps) { app ->
                        ApplicationCard(app, onClick = { selectedApp = app })
                    }
                }
            }
        }
    }

    // Reuse EmailPreviewSheet logic stays functional but with updated UI tokens
    selectedApp?.let { app ->
        EmailPreviewSheet(
            email = GeneratedEmailData(
                subject = app.mailSubject ?: "",
                body = app.mailBody ?: "",
                usedProfileId = app.profileId ?: "",
                usedProfileName = "Saved Application"
            ),
            hrEmail = app.hrEmail ?: "",
            isSaved = true,
            isSending = isSending,
            isSavingDraft = isSavingDraft,
            isSavingTemplate = isSavingTemplate,
            attachments = activeAttachments,
            initialSelectedAttachmentId = pickDefaultAttachmentId(app, activeAttachments),
            onDismiss = { selectedApp = null },
            onSave = { _, _, _ -> },
            onSendNow = { subj, body, to, attachmentId ->
                scope.launch {
                    isSending = true
                    try {
                        val apiUrl = dsManager.getApiUrl()
                        val apiKey = dsManager.getApiKey()
                        val res = ApiClient.buildService(apiUrl, apiKey)
                            .sendEmail(SendEmailRequest(app.id, to, subj, body, attachmentId = attachmentId))
                        if (res.success) {
                            Toast.makeText(context, "Sent Successfully", Toast.LENGTH_SHORT).show()
                            selectedApp = null
                            loadApps()
                        } else {
                            Toast.makeText(context, res.error ?: "Failed", Toast.LENGTH_LONG).show()
                        }
                    } catch (e: Exception) {
                        Toast.makeText(context, "Error: ${e.message}", Toast.LENGTH_LONG).show()
                    } finally { isSending = false }
                }
            },
            onSaveDraft = { subj, body ->
                scope.launch {
                    isSavingDraft = true
                    try {
                        val apiUrl = dsManager.getApiUrl()
                        val apiKey = dsManager.getApiKey()
                        ApiClient.buildService(apiUrl, apiKey).saveDraft(SaveDraftRequest(app.id, subj, body))
                        Toast.makeText(context, "Draft Saved", Toast.LENGTH_SHORT).show()
                    } catch (e: Exception) { } finally { isSavingDraft = false }
                }
            },
            onSaveTemplate = { subj, body ->
                scope.launch {
                    isSavingTemplate = true
                    try {
                        val apiUrl = dsManager.getApiUrl()
                        val apiKey = dsManager.getApiKey()
                        ApiClient.buildService(apiUrl, apiKey).saveTemplate(SaveTemplateRequest("Template: ${app.company}", subj, body))
                        Toast.makeText(context, "Template Saved", Toast.LENGTH_SHORT).show()
                    } catch (e: Exception) { } finally { isSavingTemplate = false }
                }
            }
        )
    }
}

@Composable
fun ApplicationCard(app: ApplicationData, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, Color(0x1AFFFFFF), RoundedCornerShape(28.dp)),
        color = Color(0xCC1C1C1E),
        shape = RoundedCornerShape(28.dp)
    ) {
        Row(Modifier.padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .size(52.dp)
                    .clip(CircleShape)
                    .background(Color(0x1AFFFFFF)), 
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.Work, null, Modifier.size(24.dp), tint = MaterialTheme.colorScheme.primary)
            }
            Spacer(Modifier.width(16.dp))
            Column(Modifier.weight(1f)) {
                Text(app.company, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.ExtraBold, color = Color.White)
                Text(app.role, style = MaterialTheme.typography.bodySmall, color = Color(0xFF8E8E93))
            }
            Surface(
                color = if (app.status.lowercase() == "sent") Color(0xFF34C759).copy(0.15f) else Color(0xFFFF8C00).copy(0.15f),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text(
                    app.status.uppercase(),
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                    style = MaterialTheme.typography.labelSmall,
                    color = if (app.status.lowercase() == "sent") Color(0xFF34C759) else Color(0xFFFF8C00),
                    fontWeight = FontWeight.Black
                )
            }
        }
    }
}
