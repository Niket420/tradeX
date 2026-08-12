"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Company } from "@/lib/types";

interface CompanyComboboxProps {
  companies: Company[];
  value: string;
  onChange: (symbol: string) => void;
  placeholder?: string;
  className?: string;
}

export function CompanyCombobox({ companies, value, onChange, placeholder = "Select a company...", className }: CompanyComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = companies.find((c) => c.symbol === value);

  const q = query.trim().toLowerCase();
  const filtered = (
    q ? companies.filter((c) => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q)) : companies
  ).slice(0, 50);

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setQuery("");
      }}
    >
      <PopoverTrigger render={<Button variant="outline" role="combobox" className={cn("h-8 w-64 justify-between text-xs font-normal", className)} />}>
        <span className="truncate">{selected ? `${selected.name} (${selected.symbol})` : placeholder}</span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search by name or symbol..." value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>No company found.</CommandEmpty>
            <CommandGroup>
              {filtered.map((c) => (
                <CommandItem
                  key={c.symbol}
                  value={c.symbol}
                  onSelect={() => {
                    onChange(c.symbol);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="text-xs"
                >
                  <Check className={cn("h-3.5 w-3.5", value === c.symbol ? "opacity-100" : "opacity-0")} />
                  <span className="font-mono text-muted-foreground">{c.symbol}</span>
                  <span className="truncate">{c.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
