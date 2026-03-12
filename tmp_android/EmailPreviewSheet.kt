package com.aijoboutreach.ui.components

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Save
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aijoboutreach.api.models.AttachmentData
import com.aijoboutreach.api.models.GeneratedEmailData

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EmailPreviewSheet(
    email: GeneratedEmailData,
    hrEmail: String,
    onSave: (subject: String, body: String, hrEmail: String) -> Unit,
    onSendNow: (subject: String, body: String, hrEmail: String, attachmentId: String?) -> Unit,
    onSaveDraft: (subject: String, body: String) -> Unit,
    onSaveTemplate: (subject: String, body: String) -> Unit,
    onDismiss: () -> Unit,
    isSaving: Boolean = false,
    isSending: Boolean = false,
    isSavingDraft: Boolean = false,
    isSavingTemplate: Boolean = false,
    isSaved: Boolean = false,
    attachments: List<AttachmentData> = emptyList(),
    initialSelectedAttachmentId: String? = null
) {
    val context = LocalContext.current
    var subject by remember { mutableStateOf(email.subject) }
    var body by remember { mutableStateOf(email.body) }
    var currentHrEmail by remember { mutableStateOf(hrEmail) }
    var copied by remember { mutableStateOf(false) }
    var selectedAttachmentId by remember(initialSelectedAttachmentId, attachments) {
        mutableStateOf(initialSelectedAttachmentId)
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = false),
        containerColor = Color(0xFF121212),
        shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
        dragHandle = {
            Box(
                Modifier
                    .padding(top = 12.dp)
                    .size(40.dp, 4.dp)
                    .clip(CircleShape)
                    .background(Color(0x33FFFFFF))
            )
        }
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(horizontal = 24.dp)
                .verticalScroll(rememberScrollState())
        ) {
            Spacer(Modifier.height(12.dp))
            Text(
                "EMAIL PREVIEW",
                style = MaterialTheme.typography.labelLarge.copy(letterSpacing = 1.sp),
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.Black
            )

            Spacer(Modifier.height(12.dp))
            val activeAttachments = attachments.filter { it.isActive }
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, Color(0x1AFFFFFF), RoundedCornerShape(16.dp)),
                color = Color(0x0DFFFFFF),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        text = if (activeAttachments.isNotEmpty()) {
                            "Resume PDF for this email"
                        } else {
                            "No resume PDF available yet"
                        },
                        color = Color.White,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = if (activeAttachments.isNotEmpty()) {
                            "Only the selected PDF below will be attached on SEND NOW."
                        } else {
                            "Upload one from Settings -> Resume Import or Settings -> Email Attachments."
                        },
                        color = Color(0xFF8E8E93),
                        fontSize = 11.sp
                    )

                    if (activeAttachments.isNotEmpty()) {
                        Spacer(Modifier.height(8.dp))

                        ResumeAttachmentOption(
                            title = "No resume attached",
                            subtitle = "Send only the email body",
                            isSelected = selectedAttachmentId == null,
                            onClick = { selectedAttachmentId = null }
                        )

                        activeAttachments.forEach { attachment ->
                            val subtitle = buildString {
                                append("${attachment.fileName} - ${formatAttachmentSize(attachment.sizeBytes)}")
                                if (!attachment.linkedProfileId.isNullOrBlank() && attachment.linkedProfileId == email.usedProfileId) {
                                    append(" - matches selected profile")
                                }
                            }

                            ResumeAttachmentOption(
                                title = attachment.fileName,
                                subtitle = subtitle,
                                isSelected = selectedAttachmentId == attachment.id,
                                onClick = { selectedAttachmentId = attachment.id }
                            )
                        }
                    }
                }
            }

            Spacer(Modifier.height(24.dp))

            GlassInput(
                value = currentHrEmail,
                onValueChange = { currentHrEmail = it },
                label = "RECIPIENT (HR EMAIL)",
                placeholder = "recruiter@company.com"
            )

            Spacer(Modifier.height(20.dp))

            GlassInput(
                value = subject,
                onValueChange = { subject = it },
                label = "SUBJECT"
            )

            Spacer(Modifier.height(20.dp))

            GlassInput(
                value = body,
                onValueChange = { body = it },
                label = "BODY",
                modifier = Modifier.heightIn(min = 240.dp, max = 400.dp),
                singleLine = false
            )

            Spacer(Modifier.height(32.dp))

            if (!isSaved) {
                Button(
                    onClick = { onSave(subject, body, currentHrEmail) },
                    enabled = !isSaving,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(60.dp),
                    shape = RoundedCornerShape(30.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = Color.Black)
                ) {
                    if (isSaving) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp), strokeWidth = 2.dp, color = Color.Black)
                    } else {
                        Icon(Icons.Default.Save, null, Modifier.size(20.dp))
                        Spacer(Modifier.width(10.dp))
                        Text("SAVE TO TRACKER", fontWeight = FontWeight.Black)
                    }
                }
            } else {
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(60.dp),
                    color = MaterialTheme.colorScheme.primary.copy(alpha = 0.15f),
                    shape = RoundedCornerShape(30.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.3f))
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text("SAVED TO TRACKER", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Black)
                    }
                }
            }

            Spacer(Modifier.height(12.dp))

            Button(
                onClick = { onSendNow(subject, body, currentHrEmail, selectedAttachmentId) },
                enabled = !isSending && currentHrEmail.isNotBlank(),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(60.dp),
                shape = RoundedCornerShape(30.dp),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
            ) {
                if (isSending) {
                    CircularProgressIndicator(modifier = Modifier.size(24.dp), strokeWidth = 2.dp, color = Color.Black)
                } else {
                    Icon(Icons.AutoMirrored.Filled.Send, null, Modifier.size(20.dp))
                    Spacer(Modifier.width(10.dp))
                    Text("SEND NOW", fontWeight = FontWeight.Black)
                }
            }

            Spacer(Modifier.height(12.dp))

            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedButton(
                    onClick = { onSaveDraft(subject, body) },
                    enabled = !isSavingDraft,
                    modifier = Modifier
                        .weight(1f)
                        .height(56.dp),
                    shape = RoundedCornerShape(28.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x33FFFFFF)),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White)
                ) {
                    Text(if (isSavingDraft) "SAVING..." else "SAVE DRAFT", fontWeight = FontWeight.Bold)
                }

                OutlinedButton(
                    onClick = { onSaveTemplate(subject, body) },
                    enabled = !isSavingTemplate,
                    modifier = Modifier
                        .weight(1f)
                        .height(56.dp),
                    shape = RoundedCornerShape(28.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x33FFFFFF)),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White)
                ) {
                    Text(if (isSavingTemplate) "SAVING..." else "SAVE TEMPLATE", fontWeight = FontWeight.Bold)
                }
            }

            Spacer(Modifier.height(24.dp))

            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Surface(
                    onClick = {
                        try {
                            val intent = Intent(Intent.ACTION_SENDTO).apply {
                                data = Uri.parse("mailto:")
                                putExtra(Intent.EXTRA_EMAIL, arrayOf(currentHrEmail))
                                putExtra(Intent.EXTRA_SUBJECT, subject)
                                putExtra(Intent.EXTRA_TEXT, body)
                                `package` = "com.google.android.gm"
                            }
                            context.startActivity(intent)
                        } catch (_: Exception) {
                            val fallbackIntent = Intent(Intent.ACTION_SENDTO).apply {
                                data =
                                    Uri.parse(
                                        "mailto:${Uri.encode(currentHrEmail)}?subject=${Uri.encode(subject)}&body=${Uri.encode(body)}"
                                    )
                            }
                            context.startActivity(Intent.createChooser(fallbackIntent, "Choose Email App"))
                        }
                    },
                    modifier = Modifier
                        .weight(1f)
                        .height(56.dp),
                    color = Color(0x1AFFFFFF),
                    shape = RoundedCornerShape(28.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x1AFFFFFF))
                ) {
                    Row(
                        Modifier.fillMaxSize(),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Email, null, Modifier.size(20.dp), tint = Color.White)
                        Spacer(Modifier.width(8.dp))
                        Text("GMAIL APP", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }
                }

                Surface(
                    onClick = {
                        val cm = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                        cm.setPrimaryClip(ClipData.newPlainText("Email", "Subject: $subject\n\n$body"))
                        copied = true
                        Toast.makeText(context, "Copied!", Toast.LENGTH_SHORT).show()
                    },
                    modifier = Modifier
                        .weight(1f)
                        .height(56.dp),
                    color = Color(0x1AFFFFFF),
                    shape = RoundedCornerShape(28.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x1AFFFFFF))
                ) {
                    Row(
                        Modifier.fillMaxSize(),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.ContentCopy, null, Modifier.size(20.dp), tint = Color.White)
                        Spacer(Modifier.width(8.dp))
                        Text(if (copied) "COPIED!" else "COPY", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }
                }
            }

            Spacer(Modifier.height(40.dp))
        }
    }
}

@Composable
private fun ResumeAttachmentOption(
    title: String,
    subtitle: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 8.dp),
        color = if (isSelected) MaterialTheme.colorScheme.primary.copy(alpha = 0.16f) else Color(0x14000000),
        shape = RoundedCornerShape(14.dp),
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (isSelected) MaterialTheme.colorScheme.primary.copy(alpha = 0.45f) else Color(0x1AFFFFFF)
        )
    ) {
        Column(Modifier.padding(horizontal = 12.dp, vertical = 10.dp)) {
            Text(
                text = title,
                color = Color.White,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = subtitle,
                color = Color(0xFF8E8E93),
                fontSize = 11.sp
            )
        }
    }
}

private fun formatAttachmentSize(bytes: Long): String {
    if (bytes <= 0) return "0 KB"
    val kb = bytes / 1024.0
    return if (kb >= 1024) {
        String.format("%.1f MB", kb / 1024.0)
    } else {
        String.format("%.0f KB", kb)
    }
}

@Composable
fun GlassInput(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    placeholder: String = "",
    singleLine: Boolean = true
) {
    Column(modifier) {
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Black,
            color = Color(0xFF8E8E93)
        )
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text(placeholder, color = Color(0x4DFFFFFF)) },
            shape = RoundedCornerShape(16.dp),
            singleLine = singleLine,
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
}
