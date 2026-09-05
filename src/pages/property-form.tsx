import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { Profile, Property } from "@/types";
import { propertiesRepo } from "@/data/service";
import { useAuth } from "@/auth/auth-context";
import {
  FINISHINGS,
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  PURPOSES,
  options,
} from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SectionTitle } from "@/components/ui/feedback";

const schema = z
  .object({
    title: z.string().min(3),
    purpose: z.enum(["sale", "rent"]),
    type: z.enum(PROPERTY_TYPES as [string, ...string[]]),
    status: z.enum(PROPERTY_STATUSES as [string, ...string[]]),
    area_sqm: z.coerce.number().positive().nullable(),
    bedrooms: z.coerce.number().int().min(0).nullable(),
    bathrooms: z.coerce.number().int().min(0).nullable(),
    floor_no: z.coerce.number().int().nullable(),
    total_floors: z.coerce.number().int().nullable(),
    finishing: z.string().nullable(),
    price: z.coerce.number().positive(),
    rent_period: z.string().nullable(),
    governorate: z.string().min(2),
    district: z.string().min(2),
    address: z.string().nullable(),
    images: z.string().nullable(),
    description: z.string().nullable(),
    owner_name: z.string().nullable(),
    owner_phone: z.string().nullable(),
    agent_id: z.string().nullable(),
    featured: z.boolean(),
    notes: z.string().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.purpose === "rent" && !data.rent_period) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rent_period"],
        message: "حدد فترة الإيجار",
      });
    }
  });

type FormValues = z.infer<typeof schema>;

const EMPTY: FormValues = {
  title: "",
  purpose: "sale",
  type: "apartment",
  status: "available",
  area_sqm: null,
  bedrooms: null,
  bathrooms: null,
  floor_no: null,
  total_floors: null,
  finishing: "fully_finished",
  price: 0,
  rent_period: "monthly",
  governorate: "",
  district: "",
  address: "",
  images: "",
  description: "",
  owner_name: "",
  owner_phone: "",
  agent_id: null,
  featured: false,
  notes: "",
};

function toForm(p: Property): FormValues {
  return {
    ...EMPTY,
    ...p,
    images: (p.images ?? []).join("\n"),
    finishing: p.finishing ?? null,
  } as FormValues;
}

export function PropertyFormDialog({
  open,
  onOpenChange,
  property,
  profiles,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  property: Property | null;
  profiles: Profile[];
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const { profile, isAdmin } = useAuth();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;
    reset(
      property
        ? toForm(property)
        : {
            ...EMPTY,
            agent_id: profile?.id ?? null,
            governorate: profile?.role === "admin" ? "" : "",
          },
    );
  }, [open, property, profile?.id, reset]);

  const purpose = watch("purpose");
  const type = watch("type");
  const noRooms = type === "land" || type === "warehouse" || type === "farm";

  const staffOptions = profiles
    .filter((p) => p.is_active)
    .map((p) => ({ value: p.id, label: p.full_name }));

  async function onSubmit(values: FormValues) {
    const payload = {
      ...values,
      images: (values.images ?? "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      finishing: values.finishing || null,
      agent_id: values.agent_id || null,
      rent_period: values.purpose === "rent" ? values.rent_period : null,
      bedrooms: noRooms ? null : values.bedrooms,
      bathrooms: noRooms ? null : values.bathrooms,
    };

    try {
      if (property) {
        await propertiesRepo.update(property.id, {
          ...payload,
          updated_at: new Date().toISOString(),
        } as Partial<Property>);
      } else {
        await propertiesRepo.create({
          ...payload,
          ref_code: `PR-${Math.floor(1000 + Math.random() * 9000)}`,
          created_by: profile?.id ?? null,
          updated_at: new Date().toISOString(),
        } as never);
      }
      toast.success(t("common.saved"));
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>
            {property ? t("property.edit") : t("property.addNew")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <section className="space-y-3">
            <SectionTitle>{t("property.basicInfo")}</SectionTitle>
            <Field label={t("property.propertyName")} error={errors.title?.message}>
              <Input {...register("title")} placeholder="شقة 180م في التجمع" />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={t("property.purpose")}>
                <SimpleSelect
                  value={watch("purpose")}
                  onValueChange={(v) => setValue("purpose", v as "sale" | "rent")}
                  options={options(t, "purpose", PURPOSES)}
                />
              </Field>
              <Field label={t("property.type")}>
                <SimpleSelect
                  value={watch("type")}
                  onValueChange={(v) => setValue("type", v as never)}
                  options={options(t, "type", PROPERTY_TYPES)}
                />
              </Field>
              <Field label={t("common.status")}>
                <SimpleSelect
                  value={watch("status")}
                  onValueChange={(v) => setValue("status", v as never)}
                  options={options(t, "propertyStatus", PROPERTY_STATUSES)}
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={t("property.price")} error={errors.price?.message}>
                <Input type="number" dir="ltr" {...register("price")} />
              </Field>
              <Field label={t("property.area")} error={errors.area_sqm?.message}>
                <Input type="number" dir="ltr" {...register("area_sqm")} />
              </Field>
              {purpose === "rent" ? (
                <Field label={t("property.rentPeriod")}>
                  <SimpleSelect
                    value={watch("rent_period") ?? "monthly"}
                    onValueChange={(v) => setValue("rent_period", v)}
                    options={[
                      { value: "monthly", label: t("property.monthly") },
                      { value: "yearly", label: t("property.yearly") },
                    ]}
                  />
                </Field>
              ) : null}
            </div>
            <Field label={t("common.description")}>
              <Textarea rows={3} {...register("description")} />
            </Field>
          </section>

          <section className="space-y-3">
            <SectionTitle>{t("property.specs")}</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {!noRooms ? (
                <>
                  <Field label={t("property.bedrooms")}>
                    <Input type="number" dir="ltr" {...register("bedrooms")} />
                  </Field>
                  <Field label={t("property.bathrooms")}>
                    <Input type="number" dir="ltr" {...register("bathrooms")} />
                  </Field>
                </>
              ) : null}
              <Field label={t("property.floor")}>
                <Input type="number" dir="ltr" {...register("floor_no")} />
              </Field>
              <Field label={t("property.totalFloors")}>
                <Input type="number" dir="ltr" {...register("total_floors")} />
              </Field>
              <Field label={t("property.finishing")}>
                <SimpleSelect
                  value={watch("finishing") ?? ""}
                  onValueChange={(v) => setValue("finishing", v)}
                  options={options(t, "finishing", FINISHINGS)}
                />
              </Field>
            </div>
          </section>

          <section className="space-y-3">
            <SectionTitle>{t("property.locationSection")}</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={t("property.governorate")} error={errors.governorate?.message}>
                <Input {...register("governorate")} placeholder="القاهرة" />
              </Field>
              <Field label={t("property.district")} error={errors.district?.message}>
                <Input {...register("district")} placeholder="المقطم" />
              </Field>
              <Field label={t("property.address")}>
                <Input {...register("address")} />
              </Field>
            </div>
            <Field
              label={t("property.images")}
              hint={t("property.imagesHint")}
            >
              <Textarea rows={2} dir="ltr" {...register("images")} />
            </Field>
          </section>

          <section className="space-y-3">
            <SectionTitle>{t("property.ownership")}</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={t("property.ownerName")}>
                <Input {...register("owner_name")} />
              </Field>
              <Field label={t("property.ownerPhone")}>
                <Input dir="ltr" {...register("owner_phone")} />
              </Field>
              <Field label={t("property.agent")}>
                <SimpleSelect
                  value={watch("agent_id") ?? "none"}
                  onValueChange={(v) =>
                    setValue("agent_id", v === "none" ? null : v)
                  }
                  options={[
                    { value: "none", label: t("property.unassigned") },
                    ...staffOptions,
                  ]}
                  disabled={!isAdmin}
                />
              </Field>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[hsl(var(--primary))]"
                {...register("featured")}
              />
              {t("property.featured")}
            </label>
            <Field label={t("common.notes")}>
              <Textarea rows={2} {...register("notes")} />
            </Field>
          </section>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("common.loading") : t("common.save")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


