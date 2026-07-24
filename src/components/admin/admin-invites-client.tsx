'use client';

import { format, parseISO } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export type InviteRow = {
  id: string;
  code: string;
  max_uses: number;
  use_count: number;
  expires_at: string | null;
  revoked: boolean;
  created_at: string;
};

type AdminInvitesClientProps = {
  initialInvites: InviteRow[];
  origin: string;
};

export function AdminInvitesClient({
  initialInvites,
  origin,
}: AdminInvitesClientProps) {
  const router = useRouter();
  const [invites, setInvites] = useState(initialInvites);
  const [code, setCode] = useState('');
  const [maxUses, setMaxUses] = useState('1');
  const [expiresAt, setExpiresAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim() || undefined,
          max_uses: Number(maxUses) || 1,
          expires_at: expiresAt || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Failed to create invite');
      setInvites((prev) => [data.invite as InviteRow, ...prev]);
      setCode('');
      setMaxUses('1');
      setExpiresAt('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  async function handleRevoke(id: string) {
    setError(null);
    const res = await fetch(`/api/admin/invites/${id}/revoke`, {
      method: 'PATCH',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? 'Failed to revoke');
      return;
    }
    setInvites((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, revoked: true } : inv))
    );
    router.refresh();
  }

  async function copyLink(inv: InviteRow) {
    const url = `${origin}/login?invite=${encodeURIComponent(inv.code)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(inv.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      setError('Could not copy link');
    }
  }

  return (
    <div className="mt-6">
      <form
        onSubmit={(e) => void handleCreate(e)}
        className="rounded-2xl border border-ld-border bg-ld-surface p-4"
      >
        <div className="mb-3 text-[13px] font-bold text-ld-text">
          Create invite
        </div>
        <div className="mb-3 grid grid-cols-2 gap-2.5">
          <label className="block">
            <span className="mb-1 block text-[11px] text-ld-text-muted">
              Code (optional)
            </span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Auto-generated"
              className="w-full rounded-xl border border-ld-border bg-ld-surface-high px-3 py-2.5 text-[14px] text-ld-text outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-ld-text-muted">
              Max uses
            </span>
            <input
              type="number"
              min={1}
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              className="w-full rounded-xl border border-ld-border bg-ld-surface-high px-3 py-2.5 text-[14px] text-ld-text outline-none"
            />
          </label>
        </div>
        <label className="mb-3 block">
          <span className="mb-1 block text-[11px] text-ld-text-muted">
            Expires (optional)
          </span>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full rounded-xl border border-ld-border bg-ld-surface-high px-3 py-2.5 text-[14px] text-ld-text outline-none"
          />
        </label>
        {error && (
          <p className="mb-2 text-[12px] text-ld-red" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-ld-orange py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
        >
          {saving ? 'Creating…' : 'Create invite'}
        </button>
      </form>

      <div className="mt-5 flex flex-col gap-2.5">
        {invites.length === 0 ? (
          <p className="text-[13px] text-ld-text-sub">No invites yet.</p>
        ) : (
          invites.map((inv) => (
            <div
              key={inv.id}
              className="rounded-2xl border border-ld-border bg-ld-surface px-4 py-3.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-mono text-[14px] font-bold text-ld-text">
                    {inv.code}
                  </div>
                  <div className="mt-1 text-[11px] text-ld-text-sub">
                    {inv.use_count}/{inv.max_uses} uses
                    {inv.expires_at
                      ? ` · expires ${format(parseISO(inv.expires_at), 'MMM d, yyyy')}`
                      : ''}
                    {` · ${format(parseISO(inv.created_at), 'MMM d')}`}
                  </div>
                  {inv.revoked && (
                    <div className="mt-1 text-[11px] font-bold text-ld-red">
                      Revoked
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => void copyLink(inv)}
                    className="rounded-lg border border-ld-border px-2.5 py-1.5 text-[11px] font-bold text-ld-text"
                  >
                    {copiedId === inv.id ? 'Copied' : 'Copy link'}
                  </button>
                  {!inv.revoked && (
                    <button
                      type="button"
                      onClick={() => void handleRevoke(inv.id)}
                      className="rounded-lg border border-ld-border px-2.5 py-1.5 text-[11px] font-bold text-ld-red"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
