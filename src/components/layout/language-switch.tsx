import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { applyDirection } from "@/i18n";

export function LanguageSwitch() {
  const { i18n, t } = useTranslation();
  const isAr = i18n.language?.startsWith("ar");
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        const next = isAr ? "en" : "ar";
        applyDirection(next);
        void i18n.changeLanguage(next);
      }}
      title={t("settings.language")}
    >
      {isAr ? "EN" : "ع"}
    </Button>
  );
}
