"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

function SettingRow({ id, label, description, defaultChecked = true }: { id: string; label: string; description: string; defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <Label htmlFor={id} className="text-sm font-normal text-foreground">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={setChecked} />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Preferences for alerts, display, and data.</p>
      </div>

      <Card className="p-4">
        <h2 className="text-sm font-semibold">Alert Preferences</h2>
        <div className="divide-y divide-border">
          <SettingRow id="alert-earnings" label="Earnings surprises" description="Notify when actual results beat or miss estimates by a wide margin." />
          <SettingRow id="alert-acceleration" label="Growth & margin acceleration" description="Notify when revenue, profit, or margin trends inflect." />
          <SettingRow id="alert-orders" label="Large order wins" description="Notify on significant new order or contract announcements." />
          <SettingRow id="alert-institutional" label="Institutional activity" description="Notify on notable FII/DII or promoter stake changes." />
          <SettingRow id="alert-score" label="Score changes" description="Notify when a company's Multibagger score moves sharply." />
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-sm font-semibold">Display</h2>
        <div className="divide-y divide-border">
          <SettingRow id="display-compact" label="Compact tables" description="Reduce row height across data tables." defaultChecked={false} />
          <SettingRow id="display-sparklines" label="Show sparklines" description="Show mini trend charts on dashboard metric cards." />
          <SettingRow id="display-disclaimer" label="Show research disclaimers" description="Show the research-signal disclaimer on Multibagger Radar and AI outputs." />
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-sm font-semibold">Data</h2>
        <div className="divide-y divide-border">
          <SettingRow id="data-realtime" label="Real-time price updates" description="Currently using mock data — will apply once a live data feed is connected." defaultChecked={false} />
          <SettingRow id="data-ai" label="AI Research Assistant" description="Allow the AI assistant to answer questions grounded in tracked data." />
        </div>
      </Card>

      <Separator />
      <p className="text-xs text-muted-foreground">
        TradeX is currently running on mock data for interface development. Connect a live market data provider and brokerage/auth layer to move to
        production.
      </p>
    </div>
  );
}
