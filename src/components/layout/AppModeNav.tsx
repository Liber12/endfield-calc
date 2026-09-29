import { BookOpenText, Calculator } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export type AppMode = "calculator" | "dictionary";

type AppModeNavProps = {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
};

export default function AppModeNav({ mode, onModeChange }: AppModeNavProps) {
  const { t } = useTranslation("app");

  return (
    <nav
      className="app-mode-nav flex w-fit items-center gap-1 bg-muted p-1"
      aria-label={t("appMode.label", { defaultValue: "Tool mode" })}
    >
      <Button
        type="button"
        size="sm"
        variant={mode === "calculator" ? "secondary" : "ghost"}
        className={mode === "calculator" ? "app-mode-button is-active" : "app-mode-button"}
        aria-current={mode === "calculator" ? "page" : undefined}
        onClick={() => onModeChange("calculator")}
      >
        <Calculator className="h-4 w-4" />
        {t("appMode.calculator", { defaultValue: "Calculator" })}
      </Button>
      <Button
        type="button"
        size="sm"
        variant={mode === "dictionary" ? "secondary" : "ghost"}
        className={mode === "dictionary" ? "app-mode-button is-active" : "app-mode-button"}
        aria-current={mode === "dictionary" ? "page" : undefined}
        onClick={() => onModeChange("dictionary")}
      >
        <BookOpenText className="h-4 w-4" />
        {t("appMode.dictionary", { defaultValue: "Material dictionary" })}
      </Button>
    </nav>
  );
}
