
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ClerkProvider } from "@clerk/clerk-react";

// importing custom css
import "./index.css";
import "./styles/globals.css";

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPublishableKey) {
	throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const clerkLocalization = {
	unstable__errors: {
		external_account_not_found:
			"This Google account is not linked yet. Please use Sign Up first, then Sign In.",
		oauth_access_denied:
			"Google sign-in was cancelled or denied. Please try again.",
	},
};

createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<ClerkProvider
			publishableKey={clerkPublishableKey}
			localization={clerkLocalization}
		>
			<App />
		</ClerkProvider>
	</React.StrictMode>
);
  
