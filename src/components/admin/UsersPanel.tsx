"use client";

import { useEffect, useState, FormEvent } from "react";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { AdminRole } from "@/lib/adminAuth";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  active: boolean;
  created_at: string;
};

const ROLE_LABELS: Record<AdminRole, string> = {
  admin: "Admin",
  gerente: "Gerente",
  operador: "Operador",
};

const ROLE_COLORS: Record<AdminRole, string> = {
  admin: "bg-purple-100 text-purple-700",
  gerente: "bg-blue-100 text-blue-700",
  operador: "bg-gray-100 text-gray-600",
};

type Modal =
  | { type: "create" }
  | { type: "edit"; user: UserRow }
  | null;

export default function UsersPanel() {
  const { user: me } = useAdminAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Modal>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const { users } = await res.json();
      setUsers(users);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (u: UserRow) => {
    if (u.id === me?.id) return; // guard — servidor também rejeita
    await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !u.active }),
    });
    await load();
  };

  if (loading) {
    return <p className="text-center text-muted py-16">Carregando usuários...</p>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">{users.length} usuário(s) cadastrado(s)</p>
        <button
          onClick={() => setModal({ type: "create" })}
          className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-white transition hover:bg-gold-soft"
        >
          + Novo usuário
        </button>
      </div>

      <div className="space-y-3">
        {users.map((u) => (
          <div
            key={u.id}
            className={`flex items-center justify-between gap-4 rounded-xl border bg-background-elevated px-5 py-4 ${
              !u.active ? "opacity-50" : "border-border"
            }`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-foreground truncate">{u.name}</p>
                {u.id === me?.id && (
                  <span className="rounded-full bg-gold/10 px-2 py-0.5 text-xs text-gold">você</span>
                )}
              </div>
              <p className="text-sm text-muted truncate">{u.email}</p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${ROLE_COLORS[u.role]}`}>
                {ROLE_LABELS[u.role]}
              </span>
              <span className={`text-xs font-medium ${u.active ? "text-green-600" : "text-red-400"}`}>
                {u.active ? "Ativo" : "Inativo"}
              </span>
              <button
                onClick={() => setModal({ type: "edit", user: u })}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted transition hover:border-gold hover:text-gold"
              >
                Editar
              </button>
              <button
                onClick={() => toggleActive(u)}
                disabled={u.id === me?.id}
                className={`rounded-full border px-3 py-1 text-xs transition disabled:cursor-not-allowed disabled:opacity-30 ${
                  u.active
                    ? "border-red-200 text-red-500 hover:bg-red-50"
                    : "border-green-200 text-green-600 hover:bg-green-50"
                }`}
              >
                {u.active ? "Desativar" : "Reativar"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <UserModal
          modal={modal}
          onClose={() => setModal(null)}
          onSaved={async () => { setModal(null); await load(); }}
        />
      )}
    </div>
  );
}

function UserModal({
  modal,
  onClose,
  onSaved,
}: {
  modal: Exclude<Modal, null>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = modal.type === "edit" ? modal.user : null;

  const [name, setName] = useState(editing?.name ?? "");
  const [email, setEmail] = useState(editing?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminRole>(editing?.role ?? "operador");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    let res: Response;
    if (editing) {
      const body: Record<string, unknown> = { name, role };
      if (password) body.password = password;
      res = await fetch(`/api/admin/users/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
    }

    setSaving(false);

    if (!res.ok) {
      const { error } = await res.json();
      setError(error ?? "Erro ao salvar.");
      return;
    }

    onSaved();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-2xl border border-border bg-background-elevated p-6 shadow-2xl sm:rounded-2xl"
      >
        <h2 className="mb-5 text-xl font-semibold text-foreground">
          {editing ? "Editar usuário" : "Novo usuário"}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gold">Nome</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-gold"
            />
          </div>

          {!editing && (
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gold">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-gold"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gold">
              {editing ? "Nova senha (deixe em branco para manter)" : "Senha"}
            </label>
            <input
              type="password"
              required={!editing}
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={editing ? "••••••••" : "Mínimo 8 caracteres"}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-gold"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gold">Cargo</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as AdminRole)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-gold"
            >
              <option value="admin">Admin — acesso total</option>
              <option value="gerente">Gerente — sem aba Usuários</option>
              <option value="operador">Operador — somente Pedidos</option>
            </select>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-semibold text-muted transition hover:border-foreground hover:text-foreground"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-xl bg-gold px-4 py-3 text-sm font-semibold text-white transition hover:bg-gold-soft disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}
