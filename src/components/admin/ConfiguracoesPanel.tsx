"use client";

import { useState } from "react";
import UsersPanel from "./UsersPanel";
import DeliveryZonesPanel from "./DeliveryZonesPanel";
import SettingsPanel from "./SettingsPanel";
import { useAdminAuth } from "@/context/AdminAuthContext";

type Section = "horario" | "zonas" | "usuarios";

const SECTIONS: { id: Section; label: string; adminOnly?: boolean }[] = [
  { id: "horario", label: "Horário de Funcionamento" },
  { id: "zonas",   label: "Zonas de Entrega" },
  { id: "usuarios", label: "Usuários", adminOnly: true },
];

export default function ConfiguracoesPanel() {
  const { user } = useAdminAuth();
  const [section, setSection] = useState<Section>("horario");

  const visibleSections = SECTIONS.filter((s) => !s.adminOnly || user?.role === "admin");

  return (
    <div className="admin-theme">
      {/* Sub-navegação */}
      <div className="mb-6 flex gap-2 border-b border-border pb-4">
        {visibleSections.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              section === s.id
                ? "bg-foreground text-background"
                : "text-muted hover:text-foreground"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === "horario" && <SettingsPanel />}
      {section === "zonas"   && <DeliveryZonesPanel />}
      {section === "usuarios" && user?.role === "admin" && <UsersPanel />}
    </div>
  );
}
