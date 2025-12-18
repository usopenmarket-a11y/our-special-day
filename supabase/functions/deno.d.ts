// Minimal ambient declarations to help TypeScript in editors recognize Deno and std/http
declare module "https://deno.land/std@0.168.0/http/server.ts" {
  // Handler may return a Response or a Promise<Response>
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// Provide atob/btoa and basic Web Crypto types if not present
declare function atob(data: string): string;
declare function btoa(data: string): string;

declare const crypto: Crypto;
