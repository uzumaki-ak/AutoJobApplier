"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EmailPreview } from "@/components/generate/email-preview";

interface ApplicationEmailActionsProps {
  applicationId: string;
  company: string;
  role: string;
  hrEmail: string;
  jobDescription: string;
  subject: string;
  body: string;
  profileId: string;
  profileName: string;
}

export function ApplicationEmailActions(props: ApplicationEmailActionsProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-sm font-medium hover:opacity-90"
      >
        Edit / Send Draft
      </button>

      {open && (
        <EmailPreview
          email={{
            subject: props.subject,
            body: props.body,
            usedProfileId: props.profileId,
            usedProfileName: props.profileName,
            autoSelectedReason: "Tracked draft",
          }}
          company={props.company}
          role={props.role}
          hrEmail={props.hrEmail}
          jobDescription={props.jobDescription}
          existingApplicationId={props.applicationId}
          onClose={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
