import React, { useEffect, useState, useCallback } from "react";
import {
  Shield,
  Users,
  Trash2,
  Crown,
  UserPlus,
  Loader2,
  KeyRound,
} from "lucide-react";
import {
  listSubAccounts,
  registerSubAccount,
  transferOwnership,
  revokeCoAdmin,
  listStaff,
  createStaff,
  deleteStaff,
} from "../lib/api/accounts.functions";

interface Props {
  mode: "admin" | "sub_account";
  triggerToast: (msg: string, type?: "success" | "info" | "rose") => void;
}

type SubAccount = {
  userId: string;
  email: string | null;
  displayName: string | null;
  isCoAdmin: boolean;
};

type StaffRow = {
  id: string;
  username: string;
  display_name: string | null;
  created_at: string;
};

export default function AccountsPanel({ mode, triggerToast }: Props) {
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const [newSubEmail, setNewSubEmail] = useState("");
  const [newStaffUsername, setNewStaffUsername] = useState("");
  const [newStaffPassword, setNewStaffPassword] = useState("");
  const [newStaffName, setNewStaffName] = useState("");

  const refreshSubs = useCallback(async () => {
    if (mode !== "admin") return;
    setLoadingSubs(true);
    try {
      const res = await listSubAccounts();
      setSubAccounts(res.subAccounts);
    } catch (e: any) {
      triggerToast(e?.message || "Could not load sub-accounts.", "rose");
    } finally {
      setLoadingSubs(false);
    }
  }, [mode, triggerToast]);

  const refreshStaff = useCallback(async () => {
    setLoadingStaff(true);
    try {
      const res = await listStaff();
      setStaff(res.staff as StaffRow[]);
    } catch (e: any) {
      triggerToast(e?.message || "Could not load staff.", "rose");
    } finally {
      setLoadingStaff(false);
    }
  }, [triggerToast]);

  useEffect(() => {
    refreshSubs();
    refreshStaff();
  }, [refreshSubs, refreshStaff]);

  const handleRegisterSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubEmail.trim()) return;
    setBusy("register-sub");
    try {
      await registerSubAccount({ data: { email: newSubEmail.trim() } });
      setNewSubEmail("");
      triggerToast("Sub-account registered.", "success");
      refreshSubs();
    } catch (e: any) {
      triggerToast(e?.message || "Failed to register sub-account.", "rose");
    } finally {
      setBusy(null);
    }
  };

  const handleTransfer = async (sub: SubAccount) => {
    if (!confirm(`Promote ${sub.email} to co-admin? They will gain full admin access.`))
      return;
    setBusy(`promote-${sub.userId}`);
    try {
      await transferOwnership({ data: { targetUserId: sub.userId } });
      triggerToast(`${sub.email} is now a co-admin.`, "success");
      refreshSubs();
    } catch (e: any) {
      triggerToast(e?.message || "Promotion failed.", "rose");
    } finally {
      setBusy(null);
    }
  };

  const handleRevoke = async (sub: SubAccount) => {
    if (!confirm(`Revoke co-admin from ${sub.email}?`)) return;
    setBusy(`revoke-${sub.userId}`);
    try {
      await revokeCoAdmin({ data: { targetUserId: sub.userId } });
      triggerToast("Co-admin revoked.", "success");
      refreshSubs();
    } catch (e: any) {
      triggerToast(e?.message || "Failed to revoke.", "rose");
    } finally {
      setBusy(null);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("create-staff");
    try {
      await createStaff({
        data: {
          username: newStaffUsername,
          password: newStaffPassword,
          displayName: newStaffName,
        },
      });
      setNewStaffUsername("");
      setNewStaffPassword("");
      setNewStaffName("");
      triggerToast("Staff account created.", "success");
      refreshStaff();
    } catch (e: any) {
      triggerToast(e?.message || "Failed to create staff.", "rose");
    } finally {
      setBusy(null);
    }
  };

  const handleDeleteStaff = async (s: StaffRow) => {
    if (!confirm(`Delete staff "${s.username}"?`)) return;
    setBusy(`del-staff-${s.id}`);
    try {
      await deleteStaff({ data: { id: s.id } });
      triggerToast("Staff removed.", "success");
      refreshStaff();
    } catch (e: any) {
      triggerToast(e?.message || "Failed to delete staff.", "rose");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {mode === "admin" && (
        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
          <header className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                Cloud Sub-Accounts & Ownership Transfer
              </h3>
            </div>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full font-mono">
              {subAccounts.length} linked
            </span>
          </header>

          <form
            onSubmit={handleRegisterSub}
            className="flex flex-col sm:flex-row gap-2 items-stretch"
          >
            <input
              type="email"
              required
              value={newSubEmail}
              onChange={(e) => setNewSubEmail(e.target.value)}
              placeholder="user@example.com (must have signed in once)"
              className="flex-1 px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 font-sans"
            />
            <button
              type="submit"
              disabled={busy === "register-sub"}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              {busy === "register-sub" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <UserPlus className="h-3.5 w-3.5" />
              )}
              Link Sub-Account
            </button>
          </form>

          {loadingSubs ? (
            <p className="text-xs text-slate-400">Loading…</p>
          ) : subAccounts.length === 0 ? (
            <p className="text-xs text-slate-400 py-3">
              No cloud sub-accounts yet. Have the user sign in with Google first, then link
              their email here.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 font-bold border-b border-slate-100">
                    <th className="pb-2.5">Email</th>
                    <th className="pb-2.5">Display Name</th>
                    <th className="pb-2.5">Role</th>
                    <th className="pb-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-600">
                  {subAccounts.map((s) => (
                    <tr key={s.userId} className="hover:bg-slate-50/50">
                      <td className="py-3 font-mono text-[11px]">{s.email}</td>
                      <td className="py-3">{s.displayName}</td>
                      <td className="py-3">
                        {s.isCoAdmin ? (
                          <span className="bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded text-[10px] inline-flex items-center gap-1">
                            <Crown className="h-3 w-3" /> Co-Admin
                          </span>
                        ) : (
                          <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded text-[10px]">
                            Sub-Account
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        {s.isCoAdmin ? (
                          <button
                            onClick={() => handleRevoke(s)}
                            disabled={busy === `revoke-${s.userId}`}
                            className="text-rose-500 hover:text-rose-700 font-bold text-[10px] cursor-pointer disabled:opacity-50"
                          >
                            Revoke
                          </button>
                        ) : (
                          <button
                            onClick={() => handleTransfer(s)}
                            disabled={busy === `promote-${s.userId}`}
                            className="text-amber-600 hover:text-amber-800 font-bold text-[10px] cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                          >
                            <Crown className="h-3 w-3" />
                            Transfer Ownership
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
        <header className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Your Staff (Ordering Access Only)
            </h3>
          </div>
          <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full font-mono">
            {staff.length} active
          </span>
        </header>

        <form
          onSubmit={handleCreateStaff}
          className="grid grid-cols-1 md:grid-cols-4 gap-2"
        >
          <input
            required
            value={newStaffName}
            onChange={(e) => setNewStaffName(e.target.value)}
            placeholder="Display name"
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl font-sans"
          />
          <input
            required
            value={newStaffUsername}
            onChange={(e) => setNewStaffUsername(e.target.value)}
            placeholder="username"
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono"
          />
          <input
            required
            type="password"
            minLength={6}
            value={newStaffPassword}
            onChange={(e) => setNewStaffPassword(e.target.value)}
            placeholder="password (min 6)"
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono"
          />
          <button
            type="submit"
            disabled={busy === "create-staff"}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {busy === "create-staff" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <KeyRound className="h-3.5 w-3.5" />
            )}
            Add Staff
          </button>
        </form>

        {loadingStaff ? (
          <p className="text-xs text-slate-400">Loading…</p>
        ) : staff.length === 0 ? (
          <p className="text-xs text-slate-400 py-3">
            No staff yet. Create one above — they'll sign in with username + password on the
            login screen and only see Ordering.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 font-bold border-b border-slate-100">
                  <th className="pb-2.5">Display Name</th>
                  <th className="pb-2.5">Username</th>
                  <th className="pb-2.5">Created</th>
                  <th className="pb-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-600">
                {staff.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="py-3 font-semibold text-slate-800">
                      {s.display_name}
                    </td>
                    <td className="py-3 font-mono">{s.username}</td>
                    <td className="py-3 text-[10px] text-slate-400 font-mono">
                      {new Date(s.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleDeleteStaff(s)}
                        disabled={busy === `del-staff-${s.id}`}
                        className="text-rose-500 hover:text-rose-700 font-bold text-[10px] cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" /> Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
