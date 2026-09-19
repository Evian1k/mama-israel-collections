"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ProductColor } from "@/types";

/**
 * Chip editors for product variants — sizes (text chips with quick-add) and
 * colours (name + hex swatch). Both are controlled: value + onChange, so the
 * product form stays the single source of truth.
 */

const COMMON_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

const HEX_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const COLOR_PRESETS: ProductColor[] = [
  { name: "Burgundy", hex: "#7A2235" },
  { name: "Gold", hex: "#B98A4E" },
  { name: "Cream", hex: "#F3EADB" },
  { name: "Espresso", hex: "#4A3728" },
  { name: "Black", hex: "#1C1917" },
  { name: "White", hex: "#FAFAF9" },
];

/* --------------------------------- sizes --------------------------------- */

interface SizeEditorProps {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}

export function SizeEditor({ value, onChange, disabled = false }: SizeEditorProps) {
  const [draft, setDraft] = useState("");

  const addSize = (raw: string) => {
    const trimmed = raw.trim().slice(0, 20);
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setDraft("");
  };

  const removeSize = (size: string) => {
    onChange(value.filter((s) => s !== size));
  };

  const missingQuickSizes = COMMON_SIZES.filter((s) => !value.includes(s));

  return (
    <div className="space-y-3">
      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Available sizes">
          {value.map((size) => (
            <li
              key={size}
              className="flex items-center gap-1 rounded-full border border-border bg-secondary/60 py-1 pl-3 pr-1 text-sm font-medium text-foreground"
            >
              {size}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-5 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Remove size ${size}`}
                disabled={disabled}
                onClick={() => removeSize(size)}
              >
                <X className="size-3" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">No sizes yet — add the sizes this piece comes in.</p>
      )}

      <div className="flex gap-2">
        <Input
          value={draft}
          maxLength={20}
          placeholder="e.g. M"
          aria-label="Add a size"
          disabled={disabled}
          className="h-9 max-w-40"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addSize(draft);
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9"
          disabled={disabled || draft.trim() === "" || value.includes(draft.trim())}
          onClick={() => addSize(draft)}
        >
          <Plus className="size-4" aria-hidden="true" />
          Add
        </Button>
      </div>

      {missingQuickSizes.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Quick add:</span>
          {missingQuickSizes.map((size) => (
            <Button
              key={size}
              type="button"
              variant="secondary"
              size="sm"
              className="h-7 rounded-full px-2.5 text-xs"
              disabled={disabled}
              onClick={() => addSize(size)}
            >
              {size}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------- colours -------------------------------- */

interface ColorEditorProps {
  value: ProductColor[];
  onChange: (next: ProductColor[]) => void;
  disabled?: boolean;
}

export function ColorEditor({ value, onChange, disabled = false }: ColorEditorProps) {
  const [draftName, setDraftName] = useState("");
  const [draftHex, setDraftHex] = useState("#7A2235");

  const hexValid = HEX_PATTERN.test(draftHex);
  const nameValid = draftName.trim().length > 0 && draftName.trim().length <= 40;
  const canAdd = hexValid && nameValid && value.length < 20;

  const addColor = () => {
    if (!canAdd) return;
    const name = draftName.trim();
    if (value.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      return;
    }
    onChange([...value, { name, hex: draftHex.toUpperCase() }]);
    setDraftName("");
    setDraftHex("#7A2235");
  };

  const removeColor = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Available colours">
          {value.map((color, index) => (
            <li
              key={`${color.name}-${color.hex}`}
              className="flex items-center gap-2 rounded-full border border-border bg-secondary/60 py-1 pl-1.5 pr-1 text-sm font-medium text-foreground"
            >
              <span
                aria-hidden="true"
                className="size-4 rounded-full border border-border shadow-xs"
                style={{ backgroundColor: color.hex }}
              />
              {color.name}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-5 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Remove colour ${color.name}`}
                disabled={disabled}
                onClick={() => removeColor(index)}
              >
                <X className="size-3" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">No colours yet — add a swatch for each colourway.</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {/* Native colour picker */}
        <label className="relative inline-flex cursor-pointer items-center" aria-label="Pick a colour">
          <input
            type="color"
            value={hexValid ? draftHex : "#7A2235"}
            onChange={(event) => setDraftHex(event.target.value.toUpperCase())}
            disabled={disabled}
            className="size-9 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
          />
        </label>
        <Input
          value={draftHex}
          maxLength={7}
          placeholder="#7A2235"
          aria-label="Colour hex value"
          disabled={disabled}
          className={cn("h-9 w-28 font-mono text-xs", draftHex !== "" && !hexValid && "border-destructive focus-visible:ring-destructive/30")}
          onChange={(event) => setDraftHex(event.target.value)}
        />
        <Input
          value={draftName}
          maxLength={40}
          placeholder="Colour name, e.g. Burgundy"
          aria-label="Colour name"
          disabled={disabled}
          className="h-9 max-w-48 flex-1"
          onChange={(event) => setDraftName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addColor();
            }
          }}
        />
        <span
          aria-hidden="true"
          className={cn(
            "size-9 shrink-0 rounded-md border border-border shadow-xs",
            !hexValid && "opacity-30"
          )}
          style={{ backgroundColor: hexValid ? draftHex : "transparent" }}
        />
        <Button type="button" variant="outline" size="sm" className="h-9" disabled={!canAdd || disabled} onClick={addColor}>
          <Plus className="size-4" aria-hidden="true" />
          Add
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Presets:</span>
        {COLOR_PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            aria-label={`Use ${preset.name} (${preset.hex})`}
            disabled={disabled}
            title={`${preset.name} ${preset.hex}`}
            onClick={() => {
              setDraftName(preset.name);
              setDraftHex(preset.hex);
            }}
            className="size-6 rounded-full border border-border shadow-xs transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            style={{ backgroundColor: preset.hex }}
          />
        ))}
      </div>
    </div>
  );
}
