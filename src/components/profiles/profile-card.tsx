// [F53] src/components/profiles/profile-card.tsx — Display single resume profile

"use client";

import { useState } from "react";
import type { Profile } from "@/types/profile";
import { ProfileForm } from "./profile-form";
import { Trash2, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export function ProfileCard({ profile }: { profile: Profile }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  async function handleDelete() {
    if (!confirm(`Delete profile "${profile.name}"?`)) return;
    setLoading(true);
    try {
      await fetch(`/api/profiles/${profile.id}`, { method: "DELETE" });
      toast({ title: "Profile deleted" });
      router.refresh();
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-sm font-bold text-[var(--color-foreground)]">{profile.name}</h3>
            {profile.isDefault && <Star size={14} className="text-yellow-400 fill-yellow-400" />}
          </div>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">{profile.title}</p>
        </div>
        <div className="flex items-center gap-2">
          <ProfileForm mode="edit" profile={profile} />
          <button
            onClick={handleDelete}
            disabled={loading}
            className="p-1.5 rounded-lg text-[var(--color-muted-foreground)] hover:text-[var(--color-destructive)] hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {profile.skills.slice(0, 8).map((skill) => (
          <span
            key={skill}
            className="text-xs px-2 py-0.5 rounded-lg bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
          >
            {skill}
          </span>
        ))}
        {profile.skills.length > 8 && (
          <span className="text-xs text-[var(--color-muted-foreground)]">+{profile.skills.length - 8}</span>
        )}
      </div>

      <div className="text-xs text-[var(--color-muted-foreground)] flex items-center justify-between">
        <span>{profile.experienceLevel}</span>
        <span className="capitalize">Tone: {profile.tonePreference}</span>
      </div>
    </div>
  );
}
