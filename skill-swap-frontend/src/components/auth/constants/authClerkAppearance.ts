export const getAuthClerkAppearance = (isDarkMode: boolean) =>
  ({
    layout: {
      unsafe_disableDevelopmentModeWarnings: true,
    },
    variables: isDarkMode
      ? {
          colorPrimary: "#f59e0b",
          colorBackground: "transparent",
          colorText: "#ffffff",
          colorInputBackground: "rgba(30,41,59,0.95)",
          colorInputText: "#ffffff",
          colorNeutral: "#cbd5e1",
          colorDanger: "#fda4af",
          borderRadius: "0.75rem",
        }
      : {
          colorPrimary: "#ea580c",
          colorBackground: "transparent",
          colorText: "#0f172a",
          colorInputBackground: "rgba(15,23,42,0.03)",
          colorInputText: "#0f172a",
          colorNeutral: "#475569",
          colorDanger: "#e11d48",
          borderRadius: "0.75rem",
        },
    elements: {
      rootBox: "w-full",
      cardBox: "w-full shadow-none",
      card: "w-full bg-transparent shadow-none border-0 p-0",
      headerTitle: "hidden",
      headerSubtitle: "hidden",
      socialButtonsBlockButton: isDarkMode
        ? "h-11 rounded-xl border border-slate-300/60 bg-slate-700 text-white hover:bg-slate-600 transition"
        : "h-11 rounded-xl border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 transition",
      socialButtonsBlockButtonText: isDarkMode ? "text-sm font-medium text-white" : "text-sm font-medium text-slate-900",
      dividerLine: isDarkMode ? "bg-slate-300/50" : "bg-slate-300",
      dividerText: isDarkMode ? "text-slate-100 text-xs" : "text-slate-500 text-xs",
      formFieldLabel: isDarkMode ? "text-slate-100 text-sm font-medium" : "text-slate-700 text-sm",
      formFieldInput: isDarkMode
        ? "h-11 rounded-xl border border-slate-300/60 bg-slate-700 text-white placeholder:text-slate-200/95 focus:border-amber-300 focus:ring-0"
        : "h-11 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:border-orange-500 focus:ring-0",
      formButtonPrimary: isDarkMode
        ? "h-11 rounded-xl bg-amber-400 text-slate-950 font-bold hover:bg-amber-300 transition"
        : "h-11 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-500 transition",
      identityPreviewText: isDarkMode ? "text-slate-300" : "text-slate-600",
      formResendCodeLink: isDarkMode ? "text-orange-300 hover:text-orange-200" : "text-orange-600 hover:text-orange-500",
      otpCodeFieldInput: isDarkMode
        ? "rounded-xl border border-slate-300/60 bg-slate-700 text-white focus:border-amber-300"
        : "rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-orange-500",
      alertText: isDarkMode ? "text-rose-300 text-sm" : "text-rose-600 text-sm",
      formFieldErrorText: isDarkMode ? "text-rose-300 text-xs" : "text-rose-600 text-xs",
      footer: "!hidden",
      footerAction: "!hidden",
      formFooterAction: "!hidden",
      formFooterActionText: "!hidden",
      formFooterActionLink: "!hidden",
      footerActionText: "!hidden",
      footerActionLink: "!hidden",
      formFieldSuccessText: isDarkMode ? "text-emerald-300 text-xs" : "text-emerald-600 text-xs",
    },
  }) as const;
