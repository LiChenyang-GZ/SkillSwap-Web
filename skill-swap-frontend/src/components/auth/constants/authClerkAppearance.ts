export const getAuthClerkAppearance = () =>
  ({
    layout: {
      unsafe_disableDevelopmentModeWarnings: true,
    },
    variables: {
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
      socialButtonsBlockButton:
        "h-11 rounded-xl border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 transition",
      socialButtonsBlockButtonText: "text-sm font-medium text-slate-900",
      dividerLine: "bg-slate-300",
      dividerText: "text-slate-500 text-xs",
      formFieldLabel: "text-slate-700 text-sm",
      formFieldInput:
        "h-11 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:border-orange-500 focus:ring-0",
      formButtonPrimary:
        "h-11 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-500 transition",
      identityPreviewText: "text-slate-600",
      formResendCodeLink: "text-orange-600 hover:text-orange-500",
      otpCodeFieldInput:
        "rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-orange-500",
      alertText: "text-rose-600 text-sm",
      formFieldErrorText: "text-rose-600 text-xs",
      footer: "!hidden",
      footerAction: "!hidden",
      formFooterAction: "!hidden",
      formFooterActionText: "!hidden",
      formFooterActionLink: "!hidden",
      footerActionText: "!hidden",
      footerActionLink: "!hidden",
      formFieldSuccessText: "text-emerald-600 text-xs",
    },
  }) as const;
