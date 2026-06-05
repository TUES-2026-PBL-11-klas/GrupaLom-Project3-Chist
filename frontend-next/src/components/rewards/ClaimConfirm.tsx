"use client";

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Reward } from "@/lib/data/rewards";

interface Props {
  reward: Reward | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ClaimConfirm({ reward, onConfirm, onCancel }: Props) {
  const tClaim = useTranslations("Rewards.claim");
  const tCat = useTranslations("RewardCatalog");
  const idKey = reward ? String(reward.id) : "";

  return (
    <Dialog open={reward != null} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent>
        {reward && (
          <>
            <DialogHeader>
              <DialogTitle>{tClaim("confirmTitle")}</DialogTitle>
            </DialogHeader>
            <div className="text-accent-pink"><Star size={24} strokeWidth={1.8} className="fill-current" /></div>
            <div className="text-text-1 text-sm">
              <strong>{tCat(`${idKey}.name` as `${string}.name`)}</strong>
              <p className="mt-1 text-text-2">{tCat(`${idKey}.desc` as `${string}.desc`)}</p>
              <p className="mt-2 text-text-3 text-xs">
                {tClaim("partner", { name: tCat(`${idKey}.partner` as `${string}.partner`) })}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-text-1">
              <Star size={14} strokeWidth={2} /> {tClaim("points", { n: reward.cost.toLocaleString() })}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={onCancel}>{tClaim("cancel")}</Button>
              <Button onClick={onConfirm}>{tClaim("confirm")}</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
