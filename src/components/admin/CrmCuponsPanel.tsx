"use client";

import { useState } from "react";
import CrmPanel from "./CrmPanel";
import CouponsPanel from "./CouponsPanel";

type Section = "crm" | "cupons";

export default function CrmCuponsPanel() {
  const [section, setSection] = useState<Section>("crm");

  return (
    <div className="admin-theme">
      <div className="mb-6 flex gap-2 border-b border-border pb-4">
        {(["crm", "cupons"] as Section[]).map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              section === s
                ? "bg-foreground text-background"
                : "text-muted hover:text-foreground"
            }`}
          >
            {s === "crm" ? "Campanhas WhatsApp" : "Cupons"}
          </button>
        ))}
      </div>

      {section === "crm"    && <CrmPanel />}
      {section === "cupons" && <CouponsPanel />}
    </div>
  );
}
