// Copy this file to `src/data.ts` for local/private customization.
// The real `src/data.ts` is ignored so deployment-specific values stay local.

interface DataConfig {
  SERVER_URL: string;
  SERVER_URL_DEV: string;
  SERVER_URL_2: string;
  SERVER_URL_2_DEV: string;
  IsDev: boolean;
  NativeVersionCode: number;
  AppVersion: string;
  UpdatedDate: string;
  testchannel_actuve: boolean;
  TermsVersion: string;
  ShareUrl: string;
}

const Maindata: DataConfig = {
  // Public-safe example values. Replace them in your local `src/data.ts`.
  SERVER_URL: "server.example.com",
  SERVER_URL_DEV: "dev.example.com",
  SERVER_URL_2: "backup.example.com",
  SERVER_URL_2_DEV: "backup-dev.example.com",
  IsDev: false,
  NativeVersionCode: 2000,
  AppVersion: "2.0.0",
  UpdatedDate: "2026-03-14",
  testchannel_actuve: false,
  TermsVersion: "2026-02-24",
  ShareUrl: "https://github.com/your-org/your-project/releases"
};

export default Maindata;
