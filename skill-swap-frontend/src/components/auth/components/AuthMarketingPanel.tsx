interface AuthMarketingPanelProps {
  isDarkMode: boolean;
}

const FOX_MASCOT_SRC = "/brand/fox-mascot.png";

export function AuthMarketingPanel({ isDarkMode }: AuthMarketingPanelProps) {
  return (
    <section className={isDarkMode ? "text-white" : "text-slate-900"}>
      <p
        className={
          isDarkMode
            ? "inline-flex items-center rounded-full border border-orange-300/30 bg-orange-400/15 px-3 py-1 text-xs tracking-wide text-orange-100"
            : "inline-flex items-center rounded-full border border-orange-300/50 bg-orange-100 px-3 py-1 text-xs tracking-wide text-orange-700"
        }
      >
        SKILL SWAP CLUB
      </p>
      <h1 className="mt-4 text-4xl lg:text-5xl font-black leading-tight">
        Learn together,
        <br />
        teach each other.
      </h1>
      <p className={isDarkMode ? "mt-4 max-w-md text-slate-200/90" : "mt-4 max-w-md text-slate-700"}>
        Join workshops, share practical skills, and connect with people who are excited to build with you.
      </p>
      <img
        src={FOX_MASCOT_SRC}
        alt=""
        aria-hidden="true"
        className="mt-8 h-52 w-52 object-contain sm:h-64 sm:w-64"
      />
    </section>
  );
}
