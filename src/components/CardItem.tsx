/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { BusinessCard } from "../types";
import { 
  Building2, 
  MapPin, 
  Phone, 
  Smartphone, 
  Mail, 
  Calendar, 
  FileText, 
  Trash2, 
} from "lucide-react";

interface CardItemProps {
  key?: string | number;
  card: BusinessCard;
  onDelete: (id: string) => void;
  onSelect: (card: BusinessCard) => void;
}

export default function CardItem({ card, onDelete, onSelect }: CardItemProps) {
  const [copiedField, setCopiedField] = React.useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, text: string, fieldName: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div 
      onClick={() => onSelect(card)}
      id={`card-${card.id}`}
      className="group relative cursor-pointer bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-800 hover:border-emerald-500/60 rounded-2xl overflow-hidden transition-all duration-350 shadow-lg shadow-black/40 hover:shadow-emerald-950/30 flex flex-col h-full transform hover:-translate-y-0.5 backdrop-blur-sm"
    >
      <div className="relative aspect-[1.6/1] w-full bg-black overflow-hidden flex items-center justify-center border-b border-zinc-800">
        {card.imageUrl ? (
          <>
            <img 
              src={card.imageUrl} 
              alt={`${card.name} / ${card.company} 名刺画像`} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-350"
              referrerPolicy="no-referrer"
            />
            <span className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-sm text-emerald-400 text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full z-10 border border-emerald-500/20">
              HQ PHOTO
            </span>
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-zinc-950 p-4 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="h-6 w-6 rounded-md bg-emerald-500/15 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                <Building2 size={12} />
              </div>
              <span className="text-[9px] font-bold text-zinc-600 font-mono tracking-widest uppercase">MOCKUP CARD</span>
            </div>
            
            <div className="text-right">
              <span className="text-[10px] font-bold text-zinc-500 block truncate">{card.company || "---"}</span>
              <span className="text-xs font-black text-zinc-100 block truncate">{card.name || "---"}</span>
            </div>
            
            <div className="absolute inset-0 bg-radial from-transparent to-emerald-950/10 pointer-events-none" />
          </div>
        )}
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start mb-2.5 gap-2">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 min-w-0">
              <Building2 size={12} className="text-emerald-400 flex-shrink-0" />
              <span className="truncate">{card.company || "(会社名未設定)"}</span>
            </span>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(card.id);
              }}
              className="p-1 text-zinc-600 hover:text-red-400 hover:bg-red-950/50 rounded-lg transition-colors opacity-80 sm:opacity-0 group-hover:opacity-100"
              title="削除"
            >
              <Trash2 size={14} />
            </button>
          </div>

          <div className="mb-4">
            {card.nameReading && (
              <span className="text-[9px] text-zinc-600 font-mono block tracking-wide">
                {card.nameReading}
              </span>
            )}
            <h3 className="text-base font-bold text-zinc-100 tracking-tight flex items-baseline gap-1.5">
              <span>{card.name || "(氏名未指定)"}</span>
              {card.title && (
                <span className="text-xs font-normal text-zinc-500 truncate max-w-[120px]">
                  {card.title}
                </span>
              )}
            </h3>
            {card.department && (
              <span className="text-xs text-zinc-500 block mt-0.5">
                {card.department}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2 border-t border-zinc-800 pt-3 text-[11px] text-zinc-400">
          {card.email && (
            <div className="flex items-center justify-between group/field">
              <div className="flex items-center gap-2 min-w-0">
                <Mail size={12} className="text-zinc-600 flex-shrink-0" />
                <span className="truncate">{card.email}</span>
              </div>
              <button
                onClick={(e) => handleCopy(e, card.email, "email")}
                className="text-[9px] bg-zinc-800 px-1 py-0.5 hover:bg-emerald-950/60 text-zinc-500 hover:text-emerald-400 rounded opacity-0 group-hover/field:opacity-100 transition-opacity whitespace-nowrap border border-zinc-700"
              >
                {copiedField === "email" ? "コピー済" : "コピー"}
              </button>
            </div>
          )}

          {(card.phone || card.mobile) && (
            <div className="flex items-center justify-between group/field">
              <div className="flex items-center gap-2 min-w-0">
                {card.mobile ? (
                  <Smartphone size={12} className="text-zinc-600 flex-shrink-0" />
                ) : (
                  <Phone size={12} className="text-zinc-600 flex-shrink-0" />
                )}
                <span className="truncate">{card.mobile || card.phone}</span>
              </div>
              <button
                onClick={(e) => handleCopy(e, card.mobile || card.phone, "phone")}
                className="text-[9px] bg-zinc-800 px-1 py-0.5 hover:bg-emerald-950/60 text-zinc-500 hover:text-emerald-400 rounded opacity-0 group-hover/field:opacity-100 transition-opacity whitespace-nowrap border border-zinc-700"
              >
                {copiedField === "phone" ? "コピー済" : "コピー"}
              </button>
            </div>
          )}

          {card.address && (
            <div className="flex items-center justify-between group/field">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin size={12} className="text-zinc-600 flex-shrink-0" />
                <span className="truncate">{card.address}</span>
              </div>
              <button
                onClick={(e) => handleCopy(e, card.address, "address")}
                className="text-[9px] bg-zinc-800 px-1 py-0.5 hover:bg-emerald-950/60 text-zinc-500 hover:text-emerald-400 rounded opacity-0 group-hover/field:opacity-100 transition-opacity whitespace-nowrap border border-zinc-700"
              >
                {copiedField === "address" ? "コピー済" : "コピー"}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-zinc-950/80 px-5 py-2.5 border-t border-zinc-800 flex justify-between items-center text-[10px] text-zinc-600 font-mono">
        <span className="flex items-center gap-1">
          <Calendar size={10} />
          {new Date(card.scannedAt).toLocaleDateString("ja-JP")}
        </span>
        {card.notes && (
          <span className="flex items-center gap-1 text-emerald-500 max-w-[120px] truncate" title={card.notes}>
            <FileText size={10} />
            メモあり
          </span>
        )}
      </div>
    </div>
  );
}
