import { useEffect } from "react";

const GENESYS_SCRIPT_ID = "genesys-web-messaging-bootstrap";
const GENESYS_SCRIPT_SRC =
  "https://apps.apse1.pure.cloud/genesys-bootstrap/genesys.min.js";

export default function GenesysWebChat() {
  useEffect(() => {
    const genesys = "Genesys";
    const globalWindow = window as typeof window & Record<string, any>;
    const existingBootstrap = document.querySelector<HTMLScriptElement>(
      'script[src*="/genesys-bootstrap/genesys.min.js"]',
    );
    if (
      document.getElementById(GENESYS_SCRIPT_ID) ||
      existingBootstrap ||
      globalWindow._genesysJs === genesys
    )
      return;

    globalWindow._genesysJs = genesys;
    globalWindow[genesys] =
      globalWindow[genesys] ||
      function (...args: any[]) {
        (globalWindow[genesys].q = globalWindow[genesys].q || []).push(args);
      };
    globalWindow[genesys].t = Date.now();
    globalWindow[genesys].c = {
      environment: "prod-apse1",
      deploymentId: "e70963b2-6d86-45d9-9ba0-24ed999c44e1",
    };

    const script = document.createElement("script");
    script.id = GENESYS_SCRIPT_ID;
    script.async = true;
    script.src = GENESYS_SCRIPT_SRC;
    script.charset = "utf-8";
    document.head.appendChild(script);
  }, []);

  return null;
}
